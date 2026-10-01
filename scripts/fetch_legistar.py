#!/usr/bin/env python3
"""Snapshot Cleveland City Council 2026 legislation and sponsors from the public Legistar Web API.

Output: data/legistar-2026.json (committed as a build input; the build never fetches live).
Run again to refresh; the file records its retrieval time and a hash is logged by build.py.
Source: https://webapi.legistar.com/v1/cityofcleveland (Granicus Legistar, public).
"""
import json, os, sys, urllib.parse, datetime, concurrent.futures as cf

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import net

B = "https://webapi.legistar.com/v1/cityofcleveland"
OUT = os.path.join(os.path.dirname(__file__), "..", "data", "legistar-2026.json")


def get(path, **q):
    url = B + path + ("?" + urllib.parse.urlencode(q) if q else "")
    return json.loads(net.get(url, timeout=60))  # retries with growing pauses (scripts/net.py)


def main():
    matters, skip = [], 0
    while True:
        page = get("/matters", **{"$filter": "MatterIntroDate ge datetime'2026-01-01'", "$top": "1000", "$skip": str(skip), "$orderby": "MatterId"})
        matters += page
        if len(page) < 1000:
            break
        skip += 1000
    print("matters:", len(matters))

    def sponsors(m):
        return m["MatterId"], [s["MatterSponsorName"] for s in sorted(get(f"/matters/{m['MatterId']}/sponsors"), key=lambda s: s["MatterSponsorSequence"])]

    sp = {}
    with cf.ThreadPoolExecutor(12) as ex:
        for mid, names in ex.map(sponsors, matters):
            sp[mid] = names
    rows = []
    for m in matters:
        rows.append({
            "id": m["MatterId"], "file": m["MatterFile"], "type": m["MatterTypeName"], "status": m["MatterStatusName"],
            "title": (m["MatterTitle"] or m["MatterName"] or "").strip(),
            "intro": (m["MatterIntroDate"] or "")[:10], "passed": (m["MatterPassedDate"] or "")[:10] or None,
            "url": f"https://cityofcleveland.legistar.com/LegislationDetail.aspx?ID={m['MatterId']}&GUID={m['MatterGuid']}",
            "sponsors": sp.get(m["MatterId"], []),
        })
    snap = {"source": B, "retrieved_at": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
            "filter": "MatterIntroDate >= 2026-01-01", "count": len(rows), "matters": rows}
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump(snap, open(OUT, "w", encoding="utf-8", newline="\n"), indent=0, ensure_ascii=False)
    print("wrote", OUT, len(rows))


if __name__ == "__main__":
    main()
