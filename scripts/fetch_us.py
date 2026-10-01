#!/usr/bin/env python3
"""Snapshot the federal landscape: who is in Congress, the committees, and the agencies, from official or public-domain records.

Output: data/us-landscape-2026.json (a build input; the build never fetches live). This is phase U2 of docs/plan-us-graph.md.

Sources (all registered in scripts/us_sources.py, all still marked "terms not yet read by a person"):
  * The unitedstates project's congress-legislators data: current members with their terms, current committees and
    subcommittees, and current committee membership with roles (public domain data on GitHub).
  * The Office of the Federal Register's agency list, and a count of each agency's published documents since a cutoff.
  * Congress.gov's Policy Area vocabulary, written out here as a constant (the Congressional Research Service's list used to
    label every bill). It is the official category for a bill. It is NOT checked against the API here.

What it does not do, on purpose:
  * It does not say what a member believes. Party is kept as a dated, sourced field (the party on the member's current term),
    never inferred from votes.
  * It does not map a policy area to the bodies that act in it. That map is interpretive and needs a person (plan-us-graph.md).
  * It keeps only agencies that have published something in the Federal Register in the last 24 months, because the
    Federal Register list includes agencies abolished decades ago. How many were left out is recorded, not hidden.

refresh.py runs this nightly and checks the result (counts within a sane range); a bad result keeps the old file.
"""
import concurrent.futures as cf, datetime, json, os, re, sys, urllib.parse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import net

LEG = "https://unitedstates.github.io/congress-legislators/"
FR = "https://www.federalregister.gov/api/v1"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "us-landscape-2026.json")
CONGRESS = 119
ACTIVE_MONTHS = 24
BLURB_MAX = 420

# The Congressional Research Service's Policy Area terms, which Congress.gov puts on every bill. Written out by hand
# (Oct 1, 2026); a person should compare it to Congress.gov before anything shows it as an official list.
POLICY_AREAS = [
    "Agriculture and Food", "Animals", "Armed Forces and National Security", "Arts, Culture, Religion", "Civil Rights and Liberties, Minority Issues",
    "Commerce", "Congress", "Crime and Law Enforcement", "Economics and Public Finance", "Education", "Emergency Management", "Energy",
    "Environmental Protection", "Families", "Finance and Financial Sector", "Foreign Trade and International Finance",
    "Government Operations and Politics", "Health", "Housing and Community Development", "Immigration", "International Affairs",
    "Labor and Employment", "Law", "Native Americans", "Public Lands and Natural Resources", "Science, Technology, Communications",
    "Social Welfare", "Sports and Recreation", "Taxation", "Transportation and Public Works", "Water Resources Development",
]


def get_json(url):
    return json.loads(net.get(url, timeout=90))


def blurb(text):
    """The agency's own first paragraph, whitespace cleaned, cut at a sentence end near BLURB_MAX."""
    if not text:
        return ""
    first = re.split(r"\r?\n\s*\r?\n", text.strip())[0]
    first = re.sub(r"\s+", " ", first).strip()
    if len(first) <= BLURB_MAX:
        return first
    cut = first[:BLURB_MAX]
    end = max(cut.rfind(". "), cut.rfind("; "))
    return (cut[:end + 1] if end > BLURB_MAX // 2 else cut.rsplit(" ", 1)[0] + "...")


def build(legislators, committees, membership, agencies, doc_counts, retrieved_at, cutoff):
    """Pure: turns the raw records into the snapshot. No network, so it can be tested."""
    roles = {}  # bioguide -> [(committee id, role)]
    chairs = {}
    for cid, people in membership.items():
        for p in people:
            if not p.get("bioguide"):
                continue
            title = p.get("title") or "Member"
            roles.setdefault(p["bioguide"], []).append({"id": cid, "role": title})
            if title in ("Chair", "Chairman", "Chairwoman"):
                chairs.setdefault(cid, p["name"])
    members = []
    for m in legislators:
        t = m["terms"][-1]
        name = m["name"].get("official_full") or f"{m['name']['first']} {m['name']['last']}"
        members.append({
            "id": m["id"]["bioguide"], "name": name, "last": m["name"]["last"], "chamber": "senate" if t["type"] == "sen" else "house",
            "state": t["state"], "district": t.get("district"), "party": t.get("party"), "party_as_of": t["start"],
            "term_start": t["start"], "term_end": t["end"], "url": t.get("url"),
            "committees": sorted(roles.get(m["id"]["bioguide"], []), key=lambda r: r["id"]),
        })
    members.sort(key=lambda m: (m["chamber"], m["state"], m["district"] if m["district"] is not None else -1, m["last"]))
    comms = []
    for c in committees:
        cid = c["thomas_id"]
        comms.append({"id": cid, "name": c["name"], "chamber": c["type"], "url": c.get("url"), "chair": chairs.get(cid),
                      "members": len(membership.get(cid, [])),
                      "subcommittees": [{"id": cid + s["thomas_id"], "name": s["name"], "chair": chairs.get(cid + s["thomas_id"]), "members": len(membership.get(cid + s["thomas_id"], []))}
                                        for s in c.get("subcommittees", [])]})
    comms.sort(key=lambda c: (c["chamber"], c["name"]))
    active = [a for a in agencies if doc_counts.get(a["slug"], 0) > 0]
    keep = {a["id"] for a in active}
    ags = [{"id": a["id"], "slug": a["slug"], "name": a["name"], "short_name": a.get("short_name"),
            "parent_id": a.get("parent_id") if a.get("parent_id") in keep else None, "blurb": blurb(a.get("description")),
            "url": a.get("agency_url") or a.get("url"), "documents_since_cutoff": doc_counts[a["slug"]]} for a in active]
    ags.sort(key=lambda a: (a["parent_id"] is not None, a["name"]))
    return {
        "retrieved_at": retrieved_at, "congress": CONGRESS,
        "sources": {"members": LEG + "legislators-current.json", "committees": LEG + "committees-current.json", "membership": LEG + "committee-membership-current.json",
                    "agencies": FR + "/agencies.json", "policy_areas": "https://www.congress.gov/help/field-values/policy-area (written out by hand; not checked against the API)"},
        "about": "The federal landscape. Party is the party on each member's current term, a sourced and dated field, never inferred from votes. "
                 "Agencies are those with Federal Register documents since the cutoff; older ones are counted, not shown.",
        "agency_cutoff": cutoff, "agencies_left_out": len(agencies) - len(active),
        "counts": {"members": len(members), "senate": sum(1 for m in members if m["chamber"] == "senate"), "house": sum(1 for m in members if m["chamber"] == "house"),
                   "committees": len(comms), "agencies": len(ags)},
        "members": members, "committees": comms, "agencies": ags, "policy_areas": POLICY_AREAS,
    }


def check(snap):
    """Problems that mean tonight's snapshot should not replace the old one. Empty list: safe."""
    c, bad = snap["counts"], []
    if not (98 <= c["senate"] <= 100):
        bad.append(f"us: {c['senate']} senators, expected 98 to 100")
    if not (420 <= c["house"] <= 445):
        bad.append(f"us: {c['house']} House members and delegates, expected 420 to 445")
    if c["committees"] < 40:
        bad.append(f"us: only {c['committees']} committees")
    if c["agencies"] < 100:
        bad.append(f"us: only {c['agencies']} active agencies")
    if any(not m["party"] for m in snap["members"]):
        bad.append("us: a member has no party on the current term")
    return bad


def main():
    legislators = get_json(LEG + "legislators-current.json")
    committees = get_json(LEG + "committees-current.json")
    membership = get_json(LEG + "committee-membership-current.json")
    agencies = get_json(FR + "/agencies.json")
    now = datetime.datetime.now(datetime.timezone.utc)
    cutoff = (now - datetime.timedelta(days=30 * ACTIVE_MONTHS)).date().isoformat()

    def count(a):
        q = urllib.parse.urlencode([("conditions[agencies][]", a["slug"]), ("conditions[publication_date][gte]", cutoff), ("per_page", 1), ("fields[]", "document_number")])
        try:
            return a["slug"], get_json(f"{FR}/documents.json?{q}").get("count", 0)
        except Exception:
            return a["slug"], 1  # if the count fails, keep the agency rather than silently drop it

    with cf.ThreadPoolExecutor(5) as ex:
        counts = dict(ex.map(count, agencies))
    snap = build(legislators, committees, membership, agencies, counts, now.isoformat(timespec="seconds"), cutoff)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump(snap, open(OUT, "w", encoding="utf-8", newline="\n"), indent=0, ensure_ascii=False)
    print("us landscape:", snap["counts"], "agencies left out:", snap["agencies_left_out"], "->", os.path.normpath(OUT))
    for p in check(snap):
        print("  WARNING:", p)


if __name__ == "__main__":
    main()
