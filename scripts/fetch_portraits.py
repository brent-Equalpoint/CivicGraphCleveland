#!/usr/bin/env python3
"""Official portraits of the people in the federal record: members of Congress, the Vice President, and any President who served in Congress.

Output: data/portraits-us/<bioguide>.webp (small) and data/portraits-us/index.json (which people have one). The build copies them to site/portraits/us/.

Sources: the Congress Biographical Directory (bioguide.congress.gov), the Member Guide itself, for anyone the archive below does not have yet (a member who joined recently); and the unitedstates project's images repository (https://github.com/unitedstates/images). Its photographs come from the Government Publishing
Office's Member Guide; the project says the GPO assured it that all of them are public domain, and the repository is dedicated under CC0 1.0. The
terms are registered in scripts/us_sources.py as "not yet read by a person", like every other source.

What it does and does not do:
  * It fetches the 225x275 JPEG for each person who has a Bioguide ID and shrinks it to a small WebP (about 3 KB), so 540 faces cost about 1.5 MB.
  * It never fetches a picture twice: a face already in data/portraits-us/ is kept. A person no longer in the record loses their file.
  * Judges, the justices, and Presidents who never served in Congress have no picture in this source. They show their initials. Nothing is guessed or
    taken from a source whose license is unclear.
  * It needs Pillow (pip install pillow). Without it the step prints a warning and does nothing, so a machine without Pillow never stops a refresh.

refresh.py runs this after fetch_us.py, best effort: a failure here leaves the faces already saved and never stops the other records.
"""
import concurrent.futures as cf, io, json, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import net

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
LANDSCAPE = os.path.join(ROOT, "data", "us-landscape-2026.json")
OUT = os.path.join(ROOT, "data", "portraits-us")
BASE = "https://unitedstates.github.io/images/congress/225x275/"
BIOGUIDE = "https://bioguide.congress.gov/photo/"   # the Congress directory's own photo, tried only when the archive has none
WIDTH, HEIGHT, QUALITY = 168, 205, 72   # twice the largest size the app shows (84 px), so it stays sharp on a phone
JPEG_START = bytes([0xFF, 0xD8])


def wanted_ids(snap):
    """Pure: the Bioguide IDs of everyone in the record who could have a portrait, sorted. People without a Bioguide ID (some Presidents) are left out."""
    ids = {m["id"] for m in snap["members"]}
    ex = snap.get("executive") or {}
    for p in [ex.get("president"), ex.get("vice_president")] + list(ex.get("presidents") or []):
        if p and p.get("id") and not str(p["id"]).startswith("P-"):
            ids.add(p["id"])
    return sorted(ids)


def shrink(jpeg, Image):
    """Pure given Pillow: a JPEG's bytes in, a small WebP's bytes out."""
    im = Image.open(io.BytesIO(jpeg)).convert("RGB")
    w, h = im.size
    want = WIDTH / HEIGHT
    if w / h > want + 0.01:   # wider than ours: trim the sides evenly, so a different source's shape is cropped, not squeezed
        cut = int((w - h * want) / 2)
        im = im.crop((cut, 0, w - cut, h))
    elif w / h < want - 0.01:
        cut = int((h - w / want) / 2)
        im = im.crop((0, 0, w, h - 2 * cut))   # keep the top: a face sits high in the frame
    im = im.resize((WIDTH, HEIGHT), Image.LANCZOS)
    out = io.BytesIO()
    im.save(out, "WEBP", quality=QUALITY, method=6)
    return out.getvalue()


def main():
    try:
        from PIL import Image
    except ImportError:
        print("portraits: Pillow is not installed (pip install pillow); skipped")
        return
    snap = json.load(open(LANDSCAPE, encoding="utf-8"))
    ids = wanted_ids(snap)
    os.makedirs(OUT, exist_ok=True)
    have = {f[:-5] for f in os.listdir(OUT) if f.endswith(".webp")}
    for stale in sorted(have - set(ids)):
        os.remove(os.path.join(OUT, stale + ".webp"))
    todo = [i for i in ids if i not in have]

    def get(i):
        for url in (BASE + i + ".jpg", BIOGUIDE + i + ".jpg"):
            try:
                raw = net.get(url, timeout=60)
            except Exception:
                continue   # no picture in this source for that person; try the next
            if raw[:2] == JPEG_START:
                return i, shrink(raw, Image)
        return i, None

    got = 0
    with cf.ThreadPoolExecutor(6) as ex:
        for i, data in ex.map(get, todo):
            if data:
                open(os.path.join(OUT, i + ".webp"), "wb").write(data)
                got += 1
    present = sorted(f[:-5] for f in os.listdir(OUT) if f.endswith(".webp"))
    json.dump({"source": "https://github.com/unitedstates/images and https://bioguide.congress.gov (U.S. Government Publishing Office Member Guide; the archive says public domain, CC0 1.0)",
               "size": [WIDTH, HEIGHT], "ids": present, "without": sorted(set(ids) - set(present))},
              open(os.path.join(OUT, "index.json"), "w", encoding="utf-8", newline="\n"), indent=0)
    print(f"portraits: {len(present)} of {len(ids)} people have one ({got} new)")


def check(snap=None, folder=OUT):
    """Problems worth a warning (never a failed refresh): most of the current members should have a portrait."""
    try:
        snap = snap or json.load(open(LANDSCAPE, encoding="utf-8"))
        have = {f[:-5] for f in os.listdir(folder) if f.endswith(".webp")}
    except OSError:
        return []
    mem = [m["id"] for m in snap["members"]]
    miss = [i for i in mem if i not in have]
    return [f"portraits: {len(miss)} of {len(mem)} members have no picture"] if len(miss) > len(mem) * 0.1 else []


if __name__ == "__main__":
    main()
