#!/usr/bin/env python3
"""Snapshot the federal landscape: who is in Congress, the committees, and the agencies, from official or public-domain records.

Output: data/us-landscape-2026.json (a build input; the build never fetches live). This is phase U2 of docs/plan-us-graph.md.

Sources (all registered in scripts/us_sources.py, all still marked "terms not yet read by a person"):
  * The unitedstates project's congress-legislators data: current members with their terms, current committees and
    subcommittees, and current committee membership with roles (public domain data on GitHub).
  * The Office of the Federal Register's agency list, and a count of each agency's published documents since a cutoff.
  * The unitedstates project's executive.json: the President and Vice President on today's date, and every President's terms.
  * The Federal Judicial Center's Biographical Directory of Article III Federal Judges (judges.csv): the Supreme Court, the courts
    of appeals, the district courts, and who sits on them now, with the President who appointed each judge. A judge counts as
    sitting when their latest service has no termination date; senior status is counted separately.
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
EXEC = LEG + "executive.json"
FJC = "https://www.fjc.gov/sites/default/files/history/judges.csv"
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


# Which states each court of appeals covers (28 U.S.C. 41), written out by hand (Oct 3, 2026). A person should compare it to the statute
# before anything shows a district court's circuit as official. The test makes sure every district court lands in exactly one circuit.
CIRCUIT_STATES = {
    "First": ["Maine", "Massachusetts", "New Hampshire", "Rhode Island", "Puerto Rico"],
    "Second": ["Connecticut", "New York", "Vermont"],
    "Third": ["Delaware", "New Jersey", "Pennsylvania", "Virgin Islands"],
    "Fourth": ["Maryland", "North Carolina", "South Carolina", "Virginia", "West Virginia"],
    "Fifth": ["Louisiana", "Mississippi", "Texas"],
    "Sixth": ["Kentucky", "Michigan", "Ohio", "Tennessee"],
    "Seventh": ["Illinois", "Indiana", "Wisconsin"],
    "Eighth": ["Arkansas", "Iowa", "Minnesota", "Missouri", "Nebraska", "North Dakota", "South Dakota"],
    "Ninth": ["Alaska", "Arizona", "California", "Guam", "Hawaii", "Idaho", "Montana", "Nevada", "Northern Mariana Islands", "Oregon", "Washington"],
    "Tenth": ["Colorado", "Kansas", "New Mexico", "Oklahoma", "Utah", "Wyoming"],
    "Eleventh": ["Alabama", "Florida", "Georgia"],
    "District of Columbia": ["District of Columbia"],
}
COURT_TYPES = {"Supreme Court": "supreme", "U.S. Court of Appeals": "appeals", "U.S. District Court": "district"}


def slug(text):
    out = "".join(c if c.isalnum() else "-" for c in text.lower())
    return "-".join(p for p in out.split("-") if p)


def name_key(text):
    """Names compared without spaces, dots, or case, so 'George H.W. Bush' and 'George H. W. Bush' are the same person."""
    return "".join(c for c in (text or "").lower() if c.isalnum())


def district_state(court_name):
    tail = court_name.split(" for the ", 1)[1] if " for the " in court_name else court_name
    for w in ("Northern ", "Southern ", "Eastern ", "Western ", "Middle ", "Central "):
        if tail.startswith(w):
            tail = tail[len(w):]
    if tail == "District of Columbia":
        return tail
    state = tail[len("District of "):] if tail.startswith("District of ") else None
    return state[4:] if state and state.startswith("the ") else state


def circuit_of(court_name, ctype):
    """The circuit label a court belongs to ('Sixth', 'District of Columbia', ...), or None."""
    if ctype == "district":
        state = district_state(court_name)
        for label, states in CIRCUIT_STATES.items():
            if state in states:
                return label
    return None


def build_judiciary(rows):
    """Pure: the sitting Article III judges and the courts they sit on, from the Federal Judicial Center's directory rows.
    A judge sits now when their latest service has no termination date. Senior status is counted apart from active judges."""
    judges, courts = [], {}
    for r in rows:
        live = None
        for k in range(1, 7):
            name = (r.get(f"Court Name ({k})") or "").strip()
            if not name:
                continue
            if not (r.get(f"Termination Date ({k})") or "").strip():
                live = k
        if live is None:
            continue
        g = lambda f: (r.get(f"{f} ({live})") or "").strip()
        ctype = COURT_TYPES.get(g("Court Type"), "other")
        cname = g("Court Name")
        c = courts.setdefault(cname, {"id": slug(cname), "name": cname, "type": ctype, "circuit_label": circuit_of(cname, ctype), "active_judges": 0, "senior_judges": 0})
        senior = bool(g("Senior Status Date"))
        c["senior_judges" if senior else "active_judges"] += 1
        if senior:
            continue
        full = " ".join(x for x in [(r.get("First Name") or "").strip(), (r.get("Middle Name") or "").strip(), (r.get("Last Name") or "").strip(), (r.get("Suffix") or "").strip()] if x)
        judges.append({"id": "J" + (r.get("nid") or "").strip(), "name": full, "last": (r.get("Last Name") or "").strip(), "court_id": slug(cname), "title": g("Appointment Title"),
                       "appointed_by": g("Appointing President"), "commissioned": g("Commission Date"),
                       "chief": bool(g("Service as Chief Judge, Begin")) and not g("Service as Chief Judge, End")})
    appeals = {label: c["id"] for c in courts.values() if c["type"] == "appeals" for label in [c["name"].replace("U.S. Court of Appeals for the ", "").replace(" Circuit", "")]}
    out = []
    for c in courts.values():
        label = c.pop("circuit_label")
        c["circuit"] = appeals.get(label) if label else None
        out.append(c)
    out.sort(key=lambda c: ({"supreme": 0, "appeals": 1, "district": 2}.get(c["type"], 3), c["name"]))
    judges.sort(key=lambda j: (j["court_id"], j["last"], j["name"]))
    return out, judges


def president_keys(n):
    """Every way a President's name may be spelled by the other source: first + middle initials + last, first + last, and the full official name."""
    first, last, mid = (n.get("first") or ""), (n.get("last") or ""), (n.get("middle") or "")
    initials = "".join(w[0] for w in mid.replace(".", " ").split() if w)
    keys = {name_key(first + initials + last), name_key(first + last)}
    if n.get("official_full"):
        keys.add(name_key(n["official_full"]))
    return keys


def build_executive(people, today, appointer_names):
    """Pure: the President and Vice President on `today`, and the Presidents who appointed a sitting judge (or who serve now), with their terms.
    Each President carries "keys", the spellings other sources may use; the caller matches on them and drops them."""
    def full(n):
        return n.get("official_full") or " ".join(x for x in [n.get("first"), n.get("middle"), n.get("last")] if x)
    def pid(p):   # some Presidents have no Bioguide ID in the file, so they get a stable one made from their name
        return p["id"].get("bioguide") or "P-" + slug(full(p["name"]))
    cur = {}
    wanted = {name_key(n) for n in appointer_names if n}
    presidents = []
    for p in people:
        for t in p["terms"]:
            if t["type"] in ("prez", "viceprez") and t["start"] <= today <= t["end"]:
                cur[t["type"]] = {"id": pid(p), "name": full(p["name"]), "party": t.get("party"), "term_start": t["start"], "term_end": t["end"],
                                  "url": "https://bioguide.congress.gov/search/bio/" + p["id"]["bioguide"] if p["id"].get("bioguide") else None}
        pres = [t for t in p["terms"] if t["type"] == "prez"]
        keys = president_keys(p["name"])
        if pres and (keys & wanted or any(t["start"] <= today <= t["end"] for t in pres)):
            presidents.append({"id": pid(p), "name": full(p["name"]), "keys": sorted(keys),
                               "terms": [{"start": t["start"], "end": t["end"]} for t in pres], "current": any(t["start"] <= today <= t["end"] for t in pres)})
    return {"president": cur.get("prez"), "vice_president": cur.get("viceprez"), "presidents": presidents}


def build(legislators, committees, membership, agencies, doc_counts, retrieved_at, cutoff, executive_people=None, judge_rows=None, today=None):
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
    extra = {}
    if judge_rows is not None and executive_people is not None:
        courts, judges = build_judiciary(judge_rows)
        ex = build_executive(executive_people, today or retrieved_at[:10], [j["appointed_by"] for j in judges])
        seen = {}
        for p in ex["presidents"]:
            for k in p["keys"]:
                seen.setdefault(k, set()).add(p["id"])
        for p in ex["presidents"]:
            p.pop("keys")
        for j in judges:   # a spelling that fits two Presidents matches neither: it is left empty, and the safety check says so
            ids = seen.get(name_key(j["appointed_by"]), set())
            j["appointed_by_id"] = next(iter(ids)) if len(ids) == 1 else None
        extra = {"executive": ex, "judiciary": {"courts": courts, "judges": judges,
                 "about": "Article III judges who sit now (latest service has no end date), from the Federal Judicial Center. Senior judges are counted on each court, not listed. "
                          "A court's circuit follows 28 U.S.C. 41 as written out in scripts/fetch_us.py. A connection is a recorded relationship, not control."}}
    out = {
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
    if extra:
        out.update(extra)
        out["sources"]["executive"] = EXEC
        out["sources"]["judges"] = FJC
        out["counts"].update({"courts": len(extra["judiciary"]["courts"]), "judges": len(extra["judiciary"]["judges"]),
                              "justices": sum(1 for j in extra["judiciary"]["judges"] if j["title"] in ("Chief Justice", "Associate Justice"))})
    return out


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
    if "judiciary" in snap:
        if not (snap.get("executive") or {}).get("president"):
            bad.append("us: no President on today's date")
        if not (snap.get("executive") or {}).get("vice_president"):
            bad.append("us: no Vice President on today's date")
        if c.get("justices") != 9:
            bad.append(f"us: {c.get('justices')} sitting justices, expected 9")
        if c.get("judges", 0) < 600:
            bad.append(f"us: only {c.get('judges')} sitting judges")
        if sum(1 for x in snap["judiciary"]["courts"] if x["type"] == "appeals") < 13:
            bad.append("us: fewer than 13 courts of appeals")
        if any(x["type"] == "district" and not x["circuit"] for x in snap["judiciary"]["courts"]):
            bad.append("us: a district court has no circuit (add its state to CIRCUIT_STATES)")
        if any(not j["appointed_by_id"] for j in snap["judiciary"]["judges"]):
            bad.append("us: a sitting judge's appointing President is not in executive.json")
    return bad


def main():
    legislators = get_json(LEG + "legislators-current.json")
    committees = get_json(LEG + "committees-current.json")
    membership = get_json(LEG + "committee-membership-current.json")
    agencies = get_json(FR + "/agencies.json")
    executive_people = get_json(EXEC)
    import csv, io
    judge_rows = list(csv.DictReader(io.StringIO(net.get(FJC, timeout=180).decode("utf-8-sig"))))
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
    snap = build(legislators, committees, membership, agencies, counts, now.isoformat(timespec="seconds"), cutoff, executive_people, judge_rows, now.date().isoformat())
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump(snap, open(OUT, "w", encoding="utf-8", newline="\n"), indent=0, ensure_ascii=False)
    print("us landscape:", snap["counts"], "agencies left out:", snap["agencies_left_out"], "->", os.path.normpath(OUT))
    for p in check(snap):
        print("  WARNING:", p)


if __name__ == "__main__":
    main()
