#!/usr/bin/env python3
"""Snapshot who holds each Council seat and the Mayor's office, from Legistar's office records.

Output: data/people-2026.json (a build input; the build never fetches live).
Source: https://webapi.legistar.com/v1/cityofcleveland (Granicus Legistar, public), the
/officerecords and /persons endpoints.

What it keeps, per person: the office record's person ID, name, title, body, start and end dates,
and the address of the person's own page in Legistar. That is all Legistar says. It lists Council
membership and the Mayor but not committee seats, and it holds no phone number, email, or address
for these people, so none of that is invented or copied here. Committee assignments and contact
details are on Council's own website, and profiles link there.

refresh.py checks the result: 15 Council Members and 1 Mayor must be present, or the old file stays.
"""
import json, os, sys, datetime, urllib.parse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import net

B = "https://webapi.legistar.com/v1/cityofcleveland"
SITE = "https://cityofcleveland.legistar.com"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "people-2026.json")
TERM_START = "2026-01-05"  # the 2026 to 2029 term began this day (file 1-2026, oaths of office)


def get(path, **q):
    url = B + path + ("?" + urllib.parse.urlencode(q) if q else "")
    return json.loads(net.get(url, timeout=60))


def main():
    recs = get("/officerecords", **{"$filter": f"OfficeRecordEndDate ge datetime'{TERM_START}'", "$top": "500"})
    persons = {p["PersonId"]: p for p in get("/persons", **{"$top": "500"})}
    people = []
    for r in recs:
        title = (r.get("OfficeRecordTitle") or "").strip()
        body = r.get("OfficeRecordBodyName") or ""
        council = body == "City Council" and title == "Council Member"
        mayor = title == "Mayor"
        if not (council or mayor):
            continue
        if (r["OfficeRecordStartDate"] or "")[:10] < TERM_START:
            continue  # a record from an earlier term that happens to run past the start date
        p = persons.get(r["OfficeRecordPersonId"], {})
        pid = r["OfficeRecordPersonId"]
        people.append({
            "person_id": pid, "name": (r["OfficeRecordFullName"] or "").strip(), "title": title, "body": body,
            "start": r["OfficeRecordStartDate"][:10], "end": r["OfficeRecordEndDate"][:10],
            "url": f"{SITE}/PersonDetail.aspx?ID={pid}&GUID={p['PersonGuid']}" if p.get("PersonGuid") else None,
        })
    people.sort(key=lambda x: (x["title"] != "Mayor", x["name"].split()[-1].lower()))
    snap = {"source": B, "retrieved_at": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
            "filter": f"office records ending on or after {TERM_START}, Council Member and Mayor only", "count": len(people), "people": people}
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump(snap, open(OUT, "w", encoding="utf-8", newline="\n"), indent=1, ensure_ascii=False)
    print("people:", len(people), "->", os.path.normpath(OUT))


if __name__ == "__main__":
    main()
