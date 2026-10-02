#!/usr/bin/env python3
"""Snapshot how members of Congress voted in the current Congress, from the official roll call records.

Output: data/us-votes-2026.json (a build input; the build never fetches live). This is phase D4 of docs/ROADMAP.md.

Sources (registered in scripts/us_sources.py, terms not yet read by a person):
  * House: the Clerk's roll call XML, one file per vote, member by member (clerk.house.gov/evs/YEAR/rollNNN.xml).
  * Senate: the Secretary of the Senate's vote menu and one XML file per vote, senator by senator. Senators there carry a
    Senate ID, which is matched to the official Bioguide ID through the congress-legislators data.
  * Congress.gov API (needs CONGRESS_API_KEY): the Congressional Research Service policy area of a bill. This is the
    official category. Without the key every vote still arrives, only without categories, and categories already
    stored are kept.

What a vote record keeps, and what it does not:
  * Each member's code for each vote: Y (yea or aye), N (nay or no), P (present), X (not voting), O (voted for a named
    person, as in the election of the Speaker), - (not in the roll: not yet in office, already gone, or a vacancy).
  * Not voting is not a no, and a missing record is not a vote. Nothing here is a score. No percentage, rank, or
    "how often they agree with" is computed, here or in the app.
  * A vote is on one question. A yea on a rule, a motion, or cloture is not the same as a yea on the bill. The official
    question text is kept, and `final` is true only when that text says the vote was on passing a measure or confirming
    a nominee. That is read from the text by a fixed pattern (see FINAL), not judged.
  * Nominations have no policy area. They are kept with policy_area null.
  * Every stored vote must add up: the member-by-member yeas and nays must equal the official tally for that vote, or the
    snapshot is refused. That catches a senator we could not match and a file that was cut short.

The record grows: votes already stored are not fetched again, new members are added at the end of the member list, and old
codes are padded with "-" so every code string is as long as the member list. refresh.py runs this nightly and checks the
result; a bad result keeps the old file.
"""
import concurrent.futures as cf, datetime, json, os, re, sys, time, urllib.error, urllib.parse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import net

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "data", "us-votes-2026.json")
CONGRESS = 119
SESSIONS = {1: 2025, 2: 2026}  # session number -> calendar year, for the 119th Congress
LEG = "https://unitedstates.github.io/congress-legislators/"
CLERK = "https://clerk.house.gov/evs/{year}/roll{n:03d}.xml"
SEN_MENU = "https://www.senate.gov/legislative/LIS/roll_call_lists/vote_menu_{c}_{s}.xml"
SEN_VOTE = "https://www.senate.gov/legislative/LIS/roll_call_votes/vote{c}{s}/vote_{c}_{s}_{n:05d}.xml"
SEN_PAGE = "https://www.senate.gov/legislative/LIS/roll_call_votes/vote{c}{s}/vote_{c}_{s}_{n:05d}.htm"
CLERK_PAGE = "https://clerk.house.gov/Votes/{year}{n}"
API = "https://api.congress.gov/v3"
DESC_MAX = 240
SENATE_PAUSE = 0.6      # seconds between Senate requests
SENATE_BUDGET = 400     # Senate votes fetched per run; the rest wait for the next night
CODES = "YNPXO-"

# Official question text that means "this vote decides the measure or the nominee" (not a rule, a motion, cloture, or an amendment).
FINAL = re.compile(r"^(on passage|on the nomination|on the joint resolution|on the concurrent resolution|on agreeing to the (conference report|concurrent resolution|joint resolution)"
                   r"|on motion to suspend the rules and (pass|agree)|on motion to concur|on the conference report)", re.I)

BILL_TYPES = {"hr": "H.R.", "s": "S.", "hjres": "H.J.Res.", "sjres": "S.J.Res.", "hconres": "H.Con.Res.", "sconres": "S.Con.Res.", "hres": "H.Res.", "sres": "S.Res."}
API_TYPE = {k: k for k in BILL_TYPES}


def tag(text, name):
    """The text of the first <name>...</name>, tags inside it dropped. Empty if absent."""
    m = re.search(r"<%s(?:\s[^>]*)?>(.*?)</%s>" % (name, name), text, re.S)
    return re.sub(r"<[^>]+>", "", m.group(1)).strip() if m else ""


def clean(text):
    return re.sub(r"\s+", " ", (text or "").replace("�", "'")).strip()


def bill_key(text):
    """'H RES 1075', 'H.R. 4626', 'S.J.Res. 4' -> 'hres1075', 'hr4626', 'sjres4'. None for nominations, quorum calls, and the rest."""
    m = re.match(r"^(HR|S|HJRES|SJRES|HCONRES|SCONRES|HRES|SRES)(\d+)$", re.sub(r"[\s.]", "", text or "").upper())
    return m.group(1).lower() + m.group(2) if m else None


def code_of(v):
    v = (v or "").strip().lower()
    if v in ("aye", "yea"):
        return "Y"
    if v in ("no", "nay"):
        return "N"
    if v == "present":
        return "P"
    if v == "not voting":
        return "X"
    return "O" if v else "-"


def iso_house(s):
    return datetime.datetime.strptime(s.strip(), "%d-%b-%Y").date().isoformat()


def iso_senate(s):
    return datetime.datetime.strptime(s.split(",  ")[0].strip(), "%B %d, %Y").date().isoformat()


def parse_house(xml, year, n):
    """One Clerk roll call file -> (record without codes, {bioguide: code}). None if the text is not a roll call."""
    if "<rollcall-vote" not in xml:
        return None
    meta = xml.split("<vote-data>")[0]
    legis = clean(tag(meta, "legis-num"))
    totals = re.search(r"<totals-by-vote>(.*?)</totals-by-vote>", xml, re.S)
    t = totals.group(1) if totals else ""
    votes = {}
    for m in re.finditer(r"<recorded-vote>\s*<legislator\s[^>]*name-id=\"(\w+)\"[^>]*>.*?</legislator>\s*<vote>(.*?)</vote>", xml, re.S):
        votes[m.group(1)] = code_of(m.group(2))
    session = 1 if year == SESSIONS[1] else 2
    rec = {"id": f"h-{CONGRESS}-{session}-{n}", "chamber": "house", "session": session, "number": n,
           "date": iso_house(tag(meta, "action-date")), "question": clean(tag(meta, "vote-question")), "result": clean(tag(meta, "vote-result")),
           "desc": clean(tag(meta, "vote-desc"))[:DESC_MAX], "bill": bill_key(legis), "legis": legis or None,
           "yea": int(tag(t, "yea-total") or 0), "nay": int(tag(t, "nay-total") or 0),
           "url": CLERK_PAGE.format(year=year, n=n)}
    return rec, votes


def parse_senate(xml, session, n, lis_to_bio):
    """One Senate roll call file -> (record without codes, {bioguide: code}, [Senate IDs we could not match])."""
    if "<roll_call_vote" not in xml:
        return None
    doc = xml.split("<members>")[0]
    name = clean(tag(doc, "document_name"))
    votes, lost = {}, []
    for m in re.finditer(r"<member>(.*?)</member>", xml, re.S):
        lis, cast = tag(m.group(1), "lis_member_id"), tag(m.group(1), "vote_cast")
        bio = lis_to_bio.get(lis)
        if bio:
            votes[bio] = code_of(cast)
        else:
            lost.append(lis)
    year = SESSIONS[session]
    rec = {"id": f"s-{CONGRESS}-{session}-{n}", "chamber": "senate", "session": session, "number": n,
           "date": iso_senate(tag(xml, "vote_date")), "question": clean(tag(xml, "question")), "result": clean(tag(xml, "vote_result")),
           "desc": clean(tag(xml, "vote_title") or tag(doc, "document_title"))[:DESC_MAX], "bill": bill_key(name), "legis": name or None,
           "yea": int(tag(xml, "yeas") or 0), "nay": int(tag(xml, "nays") or 0),
           "url": SEN_PAGE.format(c=CONGRESS, s=session, n=n)}
    return rec, votes, lost


def kind_of(rec):
    if rec["bill"]:
        return "bill"
    if re.match(r"^PN\d+", rec.get("legis") or ""):
        return "nomination"
    return "other"


def build(old, new, bills, retrieved_at):
    """Pure. old: the previous snapshot or None. new: [(record, {bioguide: code})]. bills: {key: {label,title,policy_area}} newly looked up.
    Returns the snapshot with every code string as long as the member list."""
    members = list(old["members"]) if old else []
    pos = {b: i for i, b in enumerate(members)}
    for _, v in new:
        for b in sorted(v):
            if b not in pos:
                pos[b] = len(members)
                members.append(b)
    votes = []
    for rec in (old["votes"] if old else []):
        rec = dict(rec)
        rec["codes"] = rec["codes"].ljust(len(members), "-")
        votes.append(rec)
    have = {v["id"] for v in votes}
    for rec, v in new:
        if rec["id"] in have:
            continue
        rec = dict(rec)
        arr = ["-"] * len(members)
        for b, c in v.items():
            arr[pos[b]] = c
        rec["codes"] = "".join(arr)
        rec["kind"] = kind_of(rec)
        rec["final"] = bool(FINAL.match(rec["question"]))
        votes.append(rec)
    allbills = dict(old["bills"]) if old else {}
    allbills.update({k: v for k, v in bills.items() if v})
    for rec in votes:  # a bill whose lookup failed earlier is still named by its label
        if rec["bill"] and rec["bill"] not in allbills:
            allbills[rec["bill"]] = {"label": label_of(rec["bill"]), "title": None, "policy_area": None}
    votes.sort(key=lambda r: (r["date"], r["chamber"], r["number"]), reverse=True)
    areas = sorted({b["policy_area"] for b in allbills.values() if b.get("policy_area")})
    return {
        "retrieved_at": retrieved_at, "congress": CONGRESS,
        "sources": {"house": "https://clerk.house.gov/evs/ (roll call XML)", "senate": "https://www.senate.gov/legislative/LIS/roll_call_lists/ (roll call XML)",
                    "policy_area": API + "/bill (Congress.gov API, the Congressional Research Service policy area)"},
        "about": "How each member voted on each recorded vote of the current Congress, from the official roll call records. Y yea, N nay, P present, X not voting, "
                 "O voted for a named person, - not in the roll. Not voting is not a no. A vote is on one question, and a yea on a rule or a motion is not a yea on the bill. "
                 "No scores, no rankings, no percentages.",
        "codes": {"Y": "Yea", "N": "Nay", "P": "Present", "X": "Not voting", "O": "Voted for a named person", "-": "Not in the roll"},
        "members": members, "bills": allbills, "votes": votes,
        "counts": {"votes": len(votes), "house": sum(1 for v in votes if v["chamber"] == "house"), "senate": sum(1 for v in votes if v["chamber"] == "senate"),
                   "members": len(members), "bills": len(allbills), "with_policy_area": sum(1 for v in votes if v["bill"] and allbills.get(v["bill"], {}).get("policy_area")),
                   "policy_areas": len(areas)},
    }


def label_of(key):
    m = re.match(r"^([a-z]+)(\d+)$", key)
    return f"{BILL_TYPES[m.group(1)]} {m.group(2)}"


def check(snap):
    """Problems that mean tonight's snapshot should not replace the old one. Empty list: safe."""
    bad, n = [], len(snap["members"])
    c = snap["counts"]
    if c["house"] < 100:
        bad.append(f"votes: only {c['house']} House votes")
    if c["senate"] < 100:
        bad.append(f"votes: only {c['senate']} Senate votes")
    ids = [v["id"] for v in snap["votes"]]
    if len(ids) != len(set(ids)):
        bad.append("votes: a vote appears twice")
    for v in snap["votes"]:
        if len(v["codes"]) != n or any(ch not in CODES for ch in v["codes"]):
            bad.append(f"votes: {v['id']} has a code string that does not match the member list")
            break
        if v["codes"].count("-") == n:
            bad.append(f"votes: {v['id']} has no member in the roll")
            break
        if v["codes"].count("Y") != v["yea"] or v["codes"].count("N") != v["nay"]:
            bad.append(f"votes: {v['id']} has {v['codes'].count('Y')} yeas and {v['codes'].count('N')} nays by member but the official tally is {v['yea']} and {v['nay']}")
            break
    return bad


def fetch_lis():
    """Senate ID -> Bioguide ID, from the current and the historical congress-legislators files."""
    m = {}
    for f in ("legislators-current.json", "legislators-historical.json"):
        m.update({p["id"]["lis"]: p["id"]["bioguide"] for p in json.loads(net.get(LEG + f, timeout=180)) if p["id"].get("lis")})
    return m


def get_text(url):
    return net.get(url).decode("utf-8", errors="replace")


def house_votes(have, year, session):
    """Fetch House roll calls for one session that are not stored yet. Stops at the first number the Clerk has no file for."""
    out, n = [], 1
    while True:
        batch = [i for i in range(n, n + 24) if f"h-{CONGRESS}-{session}-{i}" not in have]
        skip = 24 - len(batch)

        def one(i):
            try:
                return i, parse_house(get_text(CLERK.format(year=year, n=i)), year, i)
            except Exception as e:
                if getattr(e, "code", None) == 404:
                    return i, None
                raise

        with cf.ThreadPoolExecutor(6) as ex:
            res = list(ex.map(one, batch))
        gone = [i for i, r in res if r is None]
        out += [r for i, r in res if r is not None and (not gone or i < min(gone))]
        if gone:
            return out
        n += 24
        if n > 3000:
            return out


def polite_get(url, tries=5):
    """senate.gov sits behind a rate limiter that answers 403 to a burst. One request at a time, a short pause between, and a long wait after a 403."""
    time.sleep(SENATE_PAUSE)
    for i in range(tries):
        try:
            return get_text(url)
        except urllib.error.HTTPError as e:
            if e.code != 403 or i == tries - 1:
                raise
            time.sleep(45 * (i + 1))


def senate_votes(have, session, lis, budget):
    """Newest first, at most `budget` votes not stored yet. Returns (new votes, unmatched Senate IDs, how many still wait for a later night)."""
    menu = polite_get(SEN_MENU.format(c=CONGRESS, s=session))
    nums = sorted({int(x) for x in re.findall(r"<vote_number>(\d+)</vote_number>", menu)}, reverse=True)
    todo = [i for i in nums if f"s-{CONGRESS}-{session}-{i}" not in have]
    out, lost = [], []
    for i in todo[:budget]:
        r = parse_senate(polite_get(SEN_VOTE.format(c=CONGRESS, s=session, n=i)), session, i, lis)
        if r:
            out.append((r[0], r[1]))
            lost += r[2]
    return out, lost, max(0, len(todo) - budget)


def lookup_bill(key, key_secret):
    m = re.match(r"^([a-z]+)(\d+)$", key)
    j = json.loads(net.get(f"{API}/bill/{CONGRESS}/{API_TYPE[m.group(1)]}/{m.group(2)}?format=json", headers={"X-Api-Key": key_secret}))["bill"]
    pa = (j.get("policyArea") or {}).get("name")
    title = clean(j.get("title"))[:200] or None
    return {"label": label_of(key), "title": title, "policy_area": pa, "url": f"https://www.congress.gov/bill/{CONGRESS}th-congress/{m.group(1)}/{m.group(2)}"}


def main():
    sys.path.insert(0, HERE)
    import us_sources
    old = json.load(open(OUT, encoding="utf-8")) if os.path.exists(OUT) else None
    have = {v["id"] for v in old["votes"]} if old else set()
    lis = fetch_lis()  # current and former members, so a senator who left mid-Congress still matches
    new = []
    for s, year in SESSIONS.items():
        new += house_votes(have, year, s)
    senate, lost, pending = [], [], 0
    budget = SENATE_BUDGET
    stopped = None
    for s in sorted(SESSIONS, reverse=True):
        try:
            a, b, p = senate_votes(have, s, lis, budget)
        except Exception as e:  # senate.gov refused or timed out: keep the House votes and what we have, try again tomorrow
            stopped = f"{type(e).__name__}: {e}"
            print("votes: the Senate stopped answering, so tonight has no new Senate votes:", stopped)
            break
        senate += a
        lost += b
        pending += p
        budget = max(0, budget - len(a))
    new += senate
    key = us_sources.load_env()
    known = dict(old["bills"]) if old else {}
    want = sorted({r["bill"] for r, _ in new if r["bill"]} | {k for k, b in known.items() if not b.get("policy_area")})
    found = {}
    if key and want:
        def one(k):
            try:
                return k, lookup_bill(k, key)
            except Exception:
                return k, None  # tried again tomorrow
        with cf.ThreadPoolExecutor(5) as ex:
            found = dict(ex.map(one, want))
    elif want:
        print("votes: no CONGRESS_API_KEY, so new bills have no policy area tonight")
    snap = build(old, new, found, datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"))
    snap["senate_waiting"] = pending
    if lost:
        snap["unmatched_senate_ids"] = sorted(set(lost))
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump(snap, open(OUT, "w", encoding="utf-8", newline="\n"), separators=(",", ":"), ensure_ascii=False)
    print("us votes:", snap["counts"], "new tonight:", len(new), "->", os.path.normpath(OUT))
    for p in check(snap):
        print("  WARNING:", p)


if __name__ == "__main__":
    main()
