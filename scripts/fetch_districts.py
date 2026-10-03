#!/usr/bin/env python3
"""Build the street-address index that lets the app tell someone their districts without the address ever leaving their device.

  python scripts/refresh.py --districts      (this is how it is run; refresh.py is the only writer of data/)
  python scripts/fetch_districts.py          the same, directly
  python scripts/fetch_districts.py --check  only check data/districts-2026.json as it stands

Not part of the nightly refresh: the districts change when maps are redrawn (every ten years, or by a court), not every night.
It needs the `shapely` package (pip install shapely); the app itself needs nothing.

What it does
  1. Download the district maps (public records):
       U.S. House, Ohio Senate, Ohio House    Census Bureau TIGERweb, the current-year legislative layers
       County Council                         Cuyahoga County GIS, "County Council Districts 2021 effective 2022-2032"
       Cleveland wards                        data/geo-2026.json (the City's ward map, already in the repository)
       City, village, or township; school     Census Bureau TIGERweb (incorporated places, county subdivisions, unified/elementary/secondary
       district                               school districts)
  2. Download the Census Bureau's TIGER/Line address ranges for Cuyahoga County (every block face: street name, the lowest and highest
     house number on each side, odd or even, ZIP).
  3. For every block face and each side of it, find the districts at three points along it, 15 metres off the street on that side
     (a district line often runs down the middle of a street, so each side is answered separately).
  4. Write data/districts-2026.json: a table of the distinct combinations of districts, an index of streets with their house-number
     ranges, and where all three points do not agree, the list of combinations so the app can say "this block is on a boundary".
No address is stored or sent anywhere; this file is the whole of what the app knows, and it holds streets and numbers, not people.
"""
import io, json, math, os, re, struct, sys, urllib.parse, zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import net

ROOT = os.path.join(HERE, "..")
OUT = os.path.join(ROOT, "data", "districts-2026.json")
BBOX = (-81.98, 41.26, -81.36, 41.66)             # Cuyahoga County, a little wider
TIGERWEB = "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb"
ADDRFEAT = "https://www2.census.gov/geo/tiger/TIGER{y}/ADDRFEAT/tl_{y}_39035_addrfeat.zip"
COUNCIL = "https://services7.arcgis.com/GXM8JipKyc0m6HBi/arcgis/rest/services/County_Council_Districts_2021_effective_2022-2032/FeatureServer/0"
OFFSET_M = 15.0
M_LAT = 111_200.0


def esri(url, fields, where="1=1", extra=""):
    q = {"where": where, "outFields": fields, "geometry": ",".join(str(x) for x in BBOX), "geometryType": "esriGeometryEnvelope", "inSR": "4326",
         "spatialRel": "esriSpatialRelIntersects", "outSR": "4326", "returnGeometry": "true", "geometryPrecision": "6", "f": "geojson"}
    data = json.loads(net.get(f"{url}/query?{urllib.parse.urlencode(q)}{extra}", timeout=180))
    return data["features"]


def layer(name, feats, key):
    """feats -> [(label, shapely geometry)]"""
    from shapely.geometry import shape
    out = []
    for f in feats:
        label = key(f["properties"])
        if label is not None and f.get("geometry"):
            out.append((label, shape(f["geometry"]).buffer(0)))
    if not out:
        raise SystemExit(f"districts: the {name} layer came back empty")
    return out


def load_layers():
    L = {}
    L["cd"] = layer("U.S. House", esri(f"{TIGERWEB}/Legislative/MapServer/0", "BASENAME,STATE", "STATE='39'"), lambda p: p["BASENAME"])
    L["sldu"] = layer("Ohio Senate", esri(f"{TIGERWEB}/Legislative/MapServer/1", "BASENAME,STATE", "STATE='39'"), lambda p: p["BASENAME"])
    L["sldl"] = layer("Ohio House", esri(f"{TIGERWEB}/Legislative/MapServer/2", "BASENAME,STATE", "STATE='39'"), lambda p: p["BASENAME"])
    L["council"] = layer("County Council", esri(COUNCIL, "Council_Dist_text"), lambda p: str(p.get("Council_Dist_text") or "").strip() or None)
    geo = json.load(open(os.path.join(ROOT, "data", "geo-2026.json"), encoding="utf-8"))
    from shapely.geometry import shape
    L["ward"] = [(str(f["id"]), shape(f["geometry"]).buffer(0)) for f in geo["layers"]["wards2026"]["features"]]
    L["place"] = layer("cities and villages", esri(f"{TIGERWEB}/Places_CouSub_ConCity_SubMCD/MapServer/4", "NAME,STATE", "STATE='39'"), lambda p: re.sub(r" (city|village|CDP)$", "", p["NAME"]))
    L["subdiv"] = layer("townships", esri(f"{TIGERWEB}/Places_CouSub_ConCity_SubMCD/MapServer/1", "NAME,STATE,COUNTY", "STATE='39' AND COUNTY='035'"), lambda p: p["NAME"])
    L["school"] = layer("school districts", esri(f"{TIGERWEB}/School/MapServer/0", "NAME,STATE", "STATE='39'"), lambda p: p["NAME"])
    return L


# ---------- the Census address ranges (a minimal reader for the shapefile and its table, so no other package is needed) ----------
def read_addrfeat(zbytes):
    z = zipfile.ZipFile(io.BytesIO(zbytes))
    base = next(n for n in z.namelist() if n.endswith(".dbf"))[:-4]
    dbf, shp = z.read(base + ".dbf"), z.read(base + ".shp")
    n, hl, rl = struct.unpack("<xxxxIHH", dbf[:12])
    fields, off = [], 32
    while dbf[off] != 0x0D:
        fields.append((dbf[off:off + 11].split(b"\0")[0].decode(), dbf[off + 16]))
        off += 32
    rows = []
    for i in range(n):
        rec, p, row = dbf[hl + i * rl:hl + (i + 1) * rl], 1, {}
        for name, ln in fields:
            row[name] = rec[p:p + ln].decode("latin1").strip(); p += ln
        rows.append(row)
    geoms, pos = [], 100
    while pos < len(shp):
        clen = struct.unpack(">i", shp[pos + 4:pos + 8])[0] * 2
        body = shp[pos + 8:pos + 8 + clen]
        pos += 8 + clen
        st = struct.unpack("<i", body[:4])[0]
        if st != 3:
            geoms.append(None); continue
        nparts, npts = struct.unpack("<ii", body[36:44])
        parts = struct.unpack(f"<{nparts}i", body[44:44 + 4 * nparts])
        pts = struct.unpack(f"<{2 * npts}d", body[44 + 4 * nparts:44 + 4 * nparts + 16 * npts])
        line = [(pts[2 * k], pts[2 * k + 1]) for k in range(npts)]
        geoms.append(line)
    if len(geoms) != len(rows):
        raise SystemExit("districts: the address table and its shapes do not line up")
    return rows, geoms


def along(line, f):
    """point at fraction f of the line and the unit direction there, in degrees (x east, y north)"""
    seg = [math.hypot((b[0] - a[0]) * math.cos(math.radians(a[1])), b[1] - a[1]) for a, b in zip(line, line[1:])]
    tot = sum(seg) or 1e-12
    want, acc = f * tot, 0.0
    for (a, b), s in zip(zip(line, line[1:]), seg):
        if acc + s >= want or s is seg[-1]:
            t = 0 if s == 0 else (want - acc) / s
            t = max(0.0, min(1.0, t))
            return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t), (b[0] - a[0], b[1] - a[1])
        acc += s
    return line[-1], (line[-1][0] - line[-2][0], line[-1][1] - line[-2][1])


def offset(pt, d, side):
    """a point OFFSET_M metres to the left (side=1) or right (side=-1) of travel"""
    m_lon = M_LAT * math.cos(math.radians(pt[1]))
    dx, dy = d[0] * m_lon, d[1] * M_LAT
    ln = math.hypot(dx, dy) or 1.0
    nx, ny = -dy / ln * side, dx / ln * side
    return (pt[0] + nx * OFFSET_M / m_lon, pt[1] + ny * OFFSET_M / M_LAT)


# ---------- street names: the same rules the app uses (ext/cx-districts.jsx, cxDistNorm) ----------
DIRS = {"north": "n", "south": "s", "east": "e", "west": "w", "northeast": "ne", "northwest": "nw", "southeast": "se", "southwest": "sw"}
TYPES = {"street": "st", "avenue": "ave", "av": "ave", "road": "rd", "boulevard": "blvd", "drive": "dr", "court": "ct", "place": "pl", "lane": "ln", "parkway": "pkwy",
         "terrace": "ter", "circle": "cir", "highway": "hwy", "trail": "trl", "square": "sq", "way": "way", "alley": "aly", "expressway": "expy", "turnpike": "tpke",
         "pike": "pike", "route": "rte", "freeway": "fwy", "plaza": "plz", "crossing": "xing", "heights": "hts", "center": "ctr", "park": "park"}
ORD = {1: "st", 2: "nd", 3: "rd"}


def ordinal(tok):
    if tok.isdigit():
        n = int(tok)
        return tok + ("th" if 10 <= n % 100 <= 20 else ORD.get(n % 10, "th"))
    return tok


def norm(s):
    s = re.sub(r"[.,#'’]", " ", s.lower().replace("&", " and "))
    toks = [t for t in re.split(r"[\s]+", s.replace("-", " ")) if t]
    out = []
    for t in toks:
        t = DIRS.get(t, TYPES.get(t, t))
        out.append(ordinal(t) if t.isdigit() else t)
    return " ".join(out)


def core(key):
    toks = key.split(" ")
    while len(toks) > 1 and toks[0] in DIRS.values():
        toks = toks[1:]
    if len(toks) > 1 and toks[-1] in DIRS.values():
        toks = toks[:-1]
    if len(toks) > 1 and toks[-1] in set(TYPES.values()):
        toks = toks[:-1]
    return " ".join(toks)


def build():
    import numpy as np
    from shapely import points as mkpoints
    from shapely.strtree import STRtree
    print("districts: downloading the district maps...")
    L = load_layers()
    year = None
    for y in (2026, 2025, 2024):
        try:
            zb = net.get(ADDRFEAT.format(y=y), timeout=300); year = y; break
        except Exception:
            continue
    if not year:
        raise SystemExit("districts: could not download the Census address ranges")
    print(f"districts: Census TIGER/Line {year} address ranges for Cuyahoga County")
    rows, geoms = read_addrfeat(zb)

    # every (edge, side, range) with three sample points
    jobs, pts = [], []
    for r, g in zip(rows, geoms):
        if not g or len(g) < 2 or not r["FULLNAME"]:
            continue
        for side, sd, (fh, th, par, zp) in ((1, "L", ("LFROMHN", "LTOHN", "PARITYL", "ZIPL")), (-1, "R", ("RFROMHN", "RTOHN", "PARITYR", "ZIPR"))):
            a, b = r[fh], r[th]
            if not a or not b or not re.fullmatch(r"\d+", a) or not re.fullmatch(r"\d+", b):
                continue
            lo, hi = sorted((int(a), int(b)))
            samples = []
            for f in (0.15, 0.5, 0.85):
                p, d = along(g, f)
                samples.append(offset(p, d, side))
            jobs.append((norm(r["FULLNAME"]), lo, hi, r[par] or "B", r[zp], len(pts)))
            pts.extend(samples)
    print(f"districts: {len(jobs)} block-face sides, {len(pts)} points to place")
    P = mkpoints(np.array(pts))
    names = {}
    labels = {}
    for key, geoms_ in L.items():
        tree = STRtree([g for _, g in geoms_])
        ix = tree.query(P, predicate="intersects")           # pairs (point index, polygon index)
        lab = [None] * len(pts)
        for pi, gi in zip(ix[0], ix[1]):
            lab[pi] = geoms_[gi][0]
        labels[key] = lab
        print(f"  {key}: {sum(1 for x in lab if x)} of {len(pts)} points inside")

    def tup(i):
        place = labels["place"][i] or (labels["subdiv"][i] and re.sub(r" (township|Township)$", "", labels["subdiv"][i]) + " Township")
        return (labels["cd"][i], labels["sldu"][i], labels["sldl"][i], labels["council"][i], labels["ward"][i], place, labels["school"][i])

    tuples, tindex = [], {}
    def tid(t):
        if t not in tindex:
            tindex[t] = len(tuples); tuples.append(t)
        return tindex[t]

    splits, sindex = [], {}
    streets = {}
    for key, lo, hi, par, zp, i in jobs:
        ids = sorted({tid(tup(i + k)) for k in range(3)})
        if len(ids) == 1:
            val = ids[0]
        else:
            tk = tuple(ids)
            if tk not in sindex:
                sindex[tk] = len(splits); splits.append(list(tk))
            val = -1 - sindex[tk]
        streets.setdefault(key, []).append([lo, hi, par, zp, val])
    # merge touching ranges with the same answer
    for key, rs in streets.items():
        rs.sort(key=lambda r: (r[2], r[3], r[4], r[0]))
        merged = []
        for r in rs:
            if merged and merged[-1][2:5] == r[2:5] and r[0] <= merged[-1][1] + 2:
                merged[-1][1] = max(merged[-1][1], r[1])
            else:
                merged.append(list(r))
        streets[key] = merged
    cores = {}
    for key in streets:
        cores.setdefault(core(key), []).append(key)

    # strings are shared: places and schools by index
    place_names = sorted({t[5] for t in tuples if t[5]}); school_names = sorted({t[6] for t in tuples if t[6]})
    pn = {n: i for i, n in enumerate(place_names)}; sn = {n: i for i, n in enumerate(school_names)}
    ttab = [[t[0], t[1], t[2], t[3], t[4], pn.get(t[5], -1), sn.get(t[6], -1)] for t in tuples]
    out = {
        "meta": {
            "about": "Street address ranges for Cuyahoga County with the districts on each side of each block. Built by scripts/fetch_districts.py from public records; it holds streets and house-number ranges, never people. A block on a boundary lists more than one answer.",
            "retrieved_at": __import__("datetime").date.today().isoformat(),
            "address_ranges": f"U.S. Census Bureau TIGER/Line {year}, address ranges (ADDRFEAT), Cuyahoga County",
            "congress_and_legislature": "U.S. Census Bureau TIGERweb, current legislative district layers (U.S. House, Ohio Senate, Ohio House)",
            "county_council": "Cuyahoga County GIS, County Council Districts 2021 effective 2022-2032",
            "city_wards": "City of Cleveland ward map (data/geo-2026.json)",
            "places": "U.S. Census Bureau TIGERweb, incorporated places and county subdivisions; unified school districts",
            "offset_metres": OFFSET_M, "fields": ["congress", "ohio_senate", "ohio_house", "county_council", "cleveland_ward", "place", "school_district"],
        },
        "places": place_names, "schools": school_names, "tuples": ttab, "splits": splits,
        "cores": {c: sorted(v) for c, v in sorted(cores.items())}, "streets": {k: streets[k] for k in sorted(streets)},
    }
    return out


def check(d):
    bad = []
    if not d.get("streets") or len(d["streets"]) < 2000:
        bad.append("districts: too few streets")
    if len(d.get("tuples", [])) < 20:
        bad.append("districts: too few distinct district combinations")
    return bad


def main():
    d = build()
    bad = check(d)
    if bad:
        raise SystemExit("\n".join(bad))
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False, separators=(",", ":"))
    print(f"districts: wrote {OUT} ({os.path.getsize(OUT):,} bytes; {len(d['streets'])} streets, {len(d['tuples'])} district combinations, {len(d['splits'])} boundary cases)")


if __name__ == "__main__":
    if "--check" in sys.argv:
        bad = check(json.load(open(OUT, encoding="utf-8")))
        print("\n".join(bad) or "districts: ok")
        sys.exit(1 if bad else 0)
    main()
