#!/usr/bin/env python3
"""Snapshot the public data behind "Who decides here?".

Writes two build inputs (the build never fetches live):
  data/geo-2026.json    ward maps (2014-2025 and 2026+) and neighborhood (SPA) boundaries from the
                        City of Cleveland's open data (ArcGIS), simplified, plus overlap shares
  data/place-2026.json  for 2026 legislation: committee path and dates (Legistar histories),
                        street addresses found in titles and where they fall (Census geocoder +
                        point-in-polygon), and Neighborhood Equity Fund / casino-revenue amounts
                        read from the ordinance text
Needs: shapely, pdftotext, soffice (for .doc). Sources are recorded in each file.
"""
import json, os, re, io, sys, zipfile, datetime, urllib.request, urllib.parse, concurrent.futures as cf
from shapely.geometry import shape, Point, mapping
from shapely.ops import unary_union

sys.path.insert(0, os.path.dirname(__file__))
from fetch_reasons import to_text, get  # same document readers as the reasons snapshot

ROOT = os.path.join(os.path.dirname(__file__), "..")
B = "https://webapi.legistar.com/v1/cityofcleveland"
AGS = "https://services3.arcgis.com/dty2kHktVXHrqO8i/arcgis/rest/services"
LAYERS = {
    "wards2026": ("Cleveland_Wards_1_2_25_Topocleaned_pop20", "City of Cleveland Wards (2026), approved by Ord. No. 1-2025"),
    "wards2014": ("Wards", "City of Cleveland Wards (2014-2025)"),
    "spa": ("Cleveland_SPA_Neighborhoods_Salesforce", "Cleveland SPA Neighborhoods (Statistical Planning Areas)"),
}
GEOCODER = "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress"
SUBSTANTIVE = {"Ordinance", "Emergency Ordinance", "Resolution", "Emergency Resolution"}
ADDR = re.compile(r"(\d{1,5})(?:\s*[-–]\s*\d{1,5})?(?:\s*½)?\s+((?:East|West|North|South)\s+)?"
                  r"((?:\d+(?:st|nd|rd|th)|[A-Z][A-Za-z\.']*)(?:\s+[A-Z][A-Za-z\.']*){0,3}?)\s+"
                  r"(Street|Avenue|Road|Boulevard|Drive|Court|Place|Square|Parkway|Lane|Terrace)\b")


def jget(url):
    return json.loads(get(url))


def layer(name):
    q = urllib.parse.urlencode({"where": "1=1", "outFields": "*", "outSR": "4326", "f": "geojson"})
    return jget(f"{AGS}/{name}/FeatureServer/0/query?{q}")


def area_km(g):
    # equal-area enough for shares at Cleveland's latitude: scale lon by cos(41.48)
    from shapely.affinity import scale
    return scale(g, xfact=0.7494 * 111.32, yfact=110.57, origin=(0, 0)).area


def main():
    now = datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds")
    # ---------- geography ----------
    geo = {"retrieved_at": now, "source": AGS, "layers": {}, "overlap": {}}
    shapes = {}
    for key, (svc, label) in LAYERS.items():
        fc = layer(svc)
        feats = []
        for f in fc["features"]:
            p = f["properties"]
            g = shape(f["geometry"]).buffer(0)
            if key.startswith("wards"):
                wid = int(p.get("Ward") or p.get("WARD"))
                name, member = f"Ward {wid}", p.get("CouncilMember") or p.get("COUNCILMEMBER") or ""
            else:
                wid, name, member = p["SPANM"], p["SPANM"], ""
                if g.is_empty:
                    continue
            shapes.setdefault(key, []).append((wid, g))
            simp = g.simplify(0.0004, preserve_topology=True)
            feats.append({"id": wid, "name": name, "member": member,
                          "geometry": json.loads(json.dumps(mapping(simp), default=float), parse_float=lambda s: round(float(s), 5))})
        geo["layers"][key] = {"label": label, "url": f"{AGS}/{svc}/FeatureServer/0", "features": feats}
        print(key, len(feats))
    # merge SPA pieces that share a name
    spa = {}
    for n, g in shapes["spa"]:
        spa[n] = unary_union([spa[n], g]) if n in spa else g
    for wkey in ("wards2014", "wards2026"):
        rows = {}
        for wid, wg in shapes[wkey]:
            wa = area_km(wg)
            parts = []
            for n, ng in spa.items():
                inter = wg.intersection(ng)
                if inter.is_empty:
                    continue
                a = area_km(inter)
                if a / wa >= 0.02 or a / area_km(ng) >= 0.10:
                    parts.append({"hood": n, "share_of_ward": round(a / wa, 3), "share_of_hood": round(a / area_km(ng), 3)})
            rows[str(wid)] = sorted(parts, key=lambda r: -r["share_of_ward"])
        geo["overlap"][wkey] = rows
    geo["downtown"] = {}
    dt = spa.get("Downtown")
    for wkey in ("wards2014", "wards2026"):
        geo["downtown"][wkey] = sorted([{"ward": wid, "share_of_downtown": round(area_km(wg.intersection(dt)) / area_km(dt), 3)}
                                         for wid, wg in shapes[wkey] if wg.intersects(dt) and area_km(wg.intersection(dt)) / area_km(dt) >= 0.01],
                                        key=lambda r: -r["share_of_downtown"])
    json.dump(geo, open(os.path.join(ROOT, "data", "geo-2026.json"), "w", encoding="utf-8", newline="\n"), separators=(",", ":"))

    # ---------- legislation ----------
    leg = json.load(open(os.path.join(ROOT, "data", "legistar-2026.json"), encoding="utf-8"))["matters"]
    subs = [m for m in leg if m["type"] in SUBSTANTIVE]
    place = {"retrieved_at": now, "sources": {"legistar": B, "geocoder": GEOCODER, "geo": "data/geo-2026.json"}, "histories": {}, "addresses": {}, "funds": {}}

    def hist(m):
        h = jget(f"{B}/matters/{m['id']}/histories")
        return m["file"], [[x["MatterHistoryActionDate"][:10], x["MatterHistoryActionName"] or "", x["MatterHistoryActionBodyName"] or ""]
                           for x in sorted(h, key=lambda x: (x["MatterHistoryActionDate"] or "", x["MatterHistoryId"]))]
    with cf.ThreadPoolExecutor(10) as ex:
        for f, rows in ex.map(hist, subs):
            place["histories"][f] = rows
    print("histories", len(place["histories"]))

    # addresses in titles -> geocode -> ward / neighborhood
    want = {}
    for m in subs:
        for mt in ADDR.finditer(m["title"]):
            num, d, name, suf = mt.group(1), (mt.group(2) or "").strip(), mt.group(3).strip(), mt.group(4)
            if name.lower() in {"the", "of", "and"}:
                continue
            a = " ".join(x for x in (num, d, name, suf) if x)
            want.setdefault(a, []).append(m["file"])

    def geocode(a):
        q = urllib.parse.urlencode({"address": a + ", Cleveland, OH", "benchmark": "Public_AR_Current", "format": "json"})
        try:
            r = jget(f"{GEOCODER}?{q}")["result"]["addressMatches"]
        except Exception:
            r = []
        if not r:
            return a, None
        c = r[0]["coordinates"]
        return a, (round(c["x"], 6), round(c["y"], 6), r[0]["matchedAddress"])
    with cf.ThreadPoolExecutor(6) as ex:
        coded = dict(ex.map(geocode, list(want)))

    def locate(pt, key):
        for wid, g in shapes[key]:
            if g.contains(pt):
                return wid
        return None
    for a, files in want.items():
        c = coded.get(a)
        rec = {"files": sorted(set(files)), "matched": None, "lon": None, "lat": None, "ward2026": None, "ward2014": None, "hood": None}
        if c:
            pt = Point(c[0], c[1])
            rec.update(matched=c[2], lon=c[0], lat=c[1], ward2026=locate(pt, "wards2026"), ward2014=locate(pt, "wards2014"),
                       hood=next((n for n, g in spa.items() if g.contains(pt)), None))
        place["addresses"][a] = rec
    print("addresses", len(want), "geocoded", sum(1 for v in coded.values() if v))

    # Neighborhood Equity Fund and casino-revenue ward money: amounts from the ordinance text
    fund_ms = [m for m in subs if re.search(r"Neighborhood Equity Fund|Casino Revenue", m["title"], re.I)]

    def fund(m):
        atts = jget(f"{B}/matters/{m['id']}/attachments")
        texts = [a for a in atts if not re.search(r"summary|presentation|city record|a file", a["MatterAttachmentName"], re.I)
                 and re.search(r"\.(docx?|pdf)$", a["MatterAttachmentHyperlink"], re.I)]
        pref = [a for a in texts if re.search(r"final|as amended", a["MatterAttachmentName"], re.I)] or texts
        rec = {"file": m["file"], "text_url": None, "amounts": [], "limit": None}
        for a in pref[::-1]:
            t = to_text(a["MatterAttachmentHyperlink"], get(a["MatterAttachmentHyperlink"]))
            if not t.strip():
                continue
            t = re.sub(r"\s+", " ", t)
            rec["text_url"] = a["MatterAttachmentHyperlink"]
            rec["amounts"] = sorted({float(x.replace(",", "")) for x in re.findall(r"\$\s?([\d,]+(?:\.\d{2})?)", t) if x.replace(",", "").replace(".", "").isdigit()})
            lim = re.findall(r"(?:not to exceed|in the amount of|in an amount of|amount not to exceed|up to)\s+\$\s?([\d,]+(?:\.\d{2})?)", t, re.I)
            rec["limit"] = float(lim[0].replace(",", "")) if lim else None
            rec["wards"] = sorted({int(w) for grp in re.findall(r"Wards?\s+((?:\d+(?:,\s*|\s+and\s+|\s*&\s*)?)+)", t) for w in re.findall(r"\d+", grp) if 0 < int(w) <= 17})
            break
        return m["file"], rec
    with cf.ThreadPoolExecutor(6) as ex:
        for f, rec in ex.map(fund, fund_ms):
            place["funds"][f] = rec
    print("funds", len(place["funds"]), "with amount", sum(1 for r in place["funds"].values() if r["limit"] or len(r["amounts"]) == 1))
    json.dump(place, open(os.path.join(ROOT, "data", "place-2026.json"), "w", encoding="utf-8", newline="\n"), indent=0, ensure_ascii=False)


if __name__ == "__main__":
    main()
