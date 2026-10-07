#!/usr/bin/env python3
"""Records: one list of every dated official record we hold, newest first (docs/plan-records-feed.md, phase 1).

A pure function of four snapshots in data/ (it reads nothing else and fetches nothing): Council's Legistar record (legistar-2026.json), the Clerk's
meeting record (meetings-2026.json), the action histories, ward money, and geocoded title addresses (place-2026.json), and the City Record
(votes-2026.json: roll calls, referrals, and effective dates).

Three kinds of row, each with the same parts:
  legislation  one per file in Council's 2026 record, dated by its latest dated action (the action is named: "approved", "referred", ...)
  meeting      one per meeting of Council or a committee on the Clerk's calendar, dated by the meeting day
  vote         one per roll call (passage, adoption, or laying on the table), dated by the meeting day; it names its file, and the file's row
               names the same file, so each can lead to the other
Every row has: type, id, date, title (the record's own words), the ward ties with their reason, and its source (src, the source's name; url,
its address) with the time that source was pulled (pulled). Words for what happened stay in the record's own words here ("approved", "Passed",
"Passage"); the page turns them into plain English from the reviewed words in ext/cx-votes-text.jsx.

A ward tie is [ward, "names"] (the title names the ward), [ward, "money"] (the ordinance text ties ward money to it), or [ward, "address", the
address] (an address in the title lies in the ward): the shared ward matcher, cxWardTie in ext/cx-live.jsx, which scripts/test_records.py runs
on the same record to prove the two agree. Ceremonial resolutions get no ward tie (as in the ward view and At City Hall's For you). Sponsorship
by a ward's member is never a ward tie, and no name of a member, sponsor, or voter is copied into a row: a vote row carries its counts only.

Nothing here is a score: rows are in date order only, and counts are counts of rows.

build.py writes the result to site/records/records-2026.json (fetched only when Records or Today's Latest needs it) and into the single offline
file as a block that is read only then. scripts/test_records.py tests it.
"""
import datetime, json, os, re

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
TYPES = ("legislation", "meeting", "vote")
WORDS = ("yea", "nay", "absent", "recused", "abstain")


def load(name):
    with open(os.path.join(ROOT, "data", name), encoding="utf-8") as f:
        return json.load(f)


def et_day(iso):
    """The day in Cleveland (Eastern time) of an ISO time, with the United States daylight saving rules (since 2007), so no time-zone library
    is needed and every machine gives the same answer."""
    t = datetime.datetime.fromisoformat(iso.replace("Z", "+00:00")).astimezone(datetime.timezone.utc)
    y = t.year

    def nth_sunday(month, n):
        d = datetime.datetime(y, month, 1, tzinfo=datetime.timezone.utc)
        first = d + datetime.timedelta(days=(6 - d.weekday()) % 7)
        return first + datetime.timedelta(weeks=n - 1)
    start = nth_sunday(3, 2) + datetime.timedelta(hours=7)    # 2 a.m. Eastern standard time, in UTC
    end = nth_sunday(11, 1) + datetime.timedelta(hours=6)     # 2 a.m. Eastern daylight time, in UTC
    return (t - datetime.timedelta(hours=4 if start <= t < end else 5)).date().isoformat()


MONTHS = ("January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December")


def long_date(iso):
    """"September 30, 2026", as cxLongDate writes it"""
    y, m, d = iso[:10].split("-")
    return f"{MONTHS[int(m) - 1]} {int(d)}, {y}"


def issue_name(label):
    """The City Record's issue label ("Record - Sept. 25, 2026") as the app names it (cxIssueName in ext/cx-votes.jsx)"""
    s = re.sub(r"^Record\s*-\s*", "", str(label))
    s = re.sub(r"^([A-Za-z]+),\s+(\d)", r"\1 \2", s)
    return f"City Record, {s}"


# ---------- the ward matcher, the same as cxWardsIn and cxWardTie in ext/cx-live.jsx ----------
# JavaScript's \s, written out, so a title with a no-break space reads the same in both; \d and \b are ASCII in both (re.ASCII)
JS_SPACE = "[\\t\\n\\v\\f\\r \\u00a0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000\\ufeff]"
WARDS_RX = re.compile(r"\bWards?" + JS_SPACE + r"+(\d{1,2}(?!\d)(?:" + JS_SPACE + r"*(?:," + JS_SPACE + r"*and|,|and|&)" + JS_SPACE + r"*\d{1,2}(?!\d))*)", re.I | re.A)


def wards_in(title):
    out = set()
    for g in WARDS_RX.finditer(str(title or "")):
        for n in re.findall(r"[0-9]+", g.group(1)):
            if 1 <= int(n) <= 15:
                out.add(int(n))
    return out


def ward_tie(file, title, ward, place):
    if ward in wards_in(title):
        return ["names"]
    fund = (place.get("funds") or {}).get(file) or {}
    if ward in (fund.get("wards") or []):
        return ["money"]
    for addr, r in (place.get("addresses") or {}).items():
        if r.get("ward2026") == ward and file in (r.get("files") or []):
            return ["address", addr]
    return None


def ward_ties(file, title, place):
    out = []
    for w in range(1, 16):
        t = ward_tie(file, title, w, place)
        if t:
            out.append([w] + t)
    return out


# ---------- ordering: newest first; on one day, legislation, then its roll calls, then the meetings; then by number, newest file first ----------
TYPE_RANK = {"legislation": 0, "vote": 1, "meeting": 2}


def file_key(f):
    m = re.match(r"^(\d+)-(\d{4})$", f or "")
    return (int(m.group(2)), int(m.group(1)), f) if m else (0, 0, f or "")


def clock(t):
    m = re.match(r"^(\d{1,2}):(\d{2}) ?([AP])M$", (t or "").strip(), re.I)
    if not m:
        return -1
    h = int(m.group(1)) % 12 + (12 if m.group(3).upper() == "P" else 0)
    return h * 60 + int(m.group(2))


def order_key(r):
    k = (clock(r.get("time")), r.get("mid", 0), r["title"] or "") if r["type"] == "meeting" else file_key(r.get("file") or r["id"]) + ((r.get("question") or ""), )
    return (r["date"], -TYPE_RANK[r["type"]], k)


def build(leg, meetings, place, votes):
    pulled = {"legistar": leg["retrieved_at"], "meetings": meetings["retrieved_at"], "place": place["retrieved_at"], "city_record": votes["retrieved_at"],
              "legistar_votes": (votes.get("legistar") or {}).get("read_at") or votes["retrieved_at"]}
    day = {k: et_day(v) for k, v in pulled.items()}
    matters = {m["file"]: m for m in leg["matters"]}
    issues = {i["url"]: i["label"] for i in votes.get("issues", [])}

    def city_record(anchor):
        u = anchor["url"]
        return (issue_name(issues[u]) if u in issues else issue_name(anchor.get("locator", "").split(",")[0])), u

    # every action the meeting record lists for a file, with its meeting
    on = {}
    for mt in meetings["meetings"]:
        for f, a in mt["items"]:
            on.setdefault(f, []).append((mt, a or ""))

    rows = []
    # ---------- legislation: one row per file, dated by its latest dated action (nothing after the day its source was pulled) ----------
    for m in leg["matters"]:
        f = m["file"]
        cand = []   # (date, rank, n, act, body, src, url, pulled)
        lg_src = f"Council's Legistar record, {f}"
        cand.append((m["intro"], 0, len(cand), "introduced", None, lg_src, m["url"], pulled["legistar"]))
        for r in (votes.get("referrals") or {}).get(f, []):
            label, u = city_record(r["anchor"])
            cand.append((r["date"], 1, len(cand), "referred", "City Council", label, u, pulled["city_record"]))
        seen = set()
        for mt, a in on.get(f, []):
            seen.add((mt["date"], mt["body"], a))
            if not a:
                continue   # on an agenda with no action recorded: nothing happened yet
            u = mt.get("minutes") or mt.get("agenda") or mt.get("page")
            label = f"{'Minutes' if mt.get('minutes') else 'Agenda'}, {mt['body']}, {long_date(mt['date'])}"
            cand.append((mt["date"], 3 if mt["body"] == "City Council" else 2, len(cand), a, mt["body"], label, u, pulled["meetings"]))
        for d, a, b in (place.get("histories") or {}).get(f, []):
            if (d, b, a) not in seen and a:   # an action the meeting record does not list (as in scripts/council_record.py)
                cand.append((d, 3 if b == "City Council" else 2, len(cand), a, b, lg_src, m["url"], pulled["place"]))
        if m.get("passed"):
            cand.append((m["passed"], 2.5, len(cand), "passed", "City Council", lg_src, m["url"], pulled["legistar"]))
        e = (votes.get("effective") or {}).get(f)
        if e:
            label, u = city_record(e["anchor"])
            cand.append((e["effective"], 5, len(cand), "effective", None, label, u, pulled["city_record"]))
        src_day = {pulled[k]: day[k] for k in pulled}
        cand = [c for c in cand if c[0] and c[0] <= src_day[c[7]]]
        d, _, _, act, body, label, u, pl = max(cand, key=lambda c: (c[0], c[1], c[2]))
        short = m["type"] == "Ceremonial Resolution"
        rows.append({"type": "legislation", "id": f, "file": f, "date": d, "act": act, "body": body, "title": m["title"], "kind": m["type"],
                     "status": m["status"], "passed": m.get("passed") or None, "short": short,
                     "wards": [] if short else ward_ties(f, m["title"], place), "src": label, "url": u, "pulled": pl})
    # ---------- meetings: one row per meeting on the Clerk's calendar ----------
    for mt in meetings["meetings"]:
        if mt.get("minutes"):
            label, u = f"Minutes, {mt['body']}, {long_date(mt['date'])}", mt["minutes"]
        elif mt.get("agenda"):
            label, u = f"Agenda, {mt['body']}, {long_date(mt['date'])}", mt["agenda"]
        else:
            label, u = f"Meeting page, {mt['body']}, {long_date(mt['date'])}", mt.get("page")
        rows.append({"type": "meeting", "id": f"meeting-{mt['id']}", "mid": mt["id"], "date": mt["date"], "time": mt.get("time") or None, "title": mt["body"],
                     "place": mt.get("place") or None, "items": len(mt["items"]), "acted": sum(1 for _, a in mt["items"] if a),
                     "agenda": mt.get("agenda") or None, "minutes": mt.get("minutes") or None, "page": mt.get("page") or None,
                     "wards": [], "src": label, "url": u, "pulled": pulled["meetings"]})
    # ---------- roll calls: one row each, from the City Record (and Council's Legistar record where the City Record prints no names) ----------
    slug = {"Passage": "passage", "Adoption": "adoption", "Laid on the table": "table"}

    def vote_row(f, v, label, u, pl):
        m = matters.get(f)
        count = {w: sum(1 for x in v["members"].values() if x == w) for w in WORDS}
        short = bool(m) and m["type"] == "Ceremonial Resolution"
        return {"type": "vote", "id": f"vote-{f}-{slug[v['question']]}-{v['date']}", "file": f, "date": v["date"], "question": v["question"],
                "table": v["question"] == "Laid on the table", "title": m["title"] if m else None, "count": count,
                "wards": ward_ties(f, m["title"], place) if m and not short else [], "src": label, "url": u, "pulled": pl}
    for f, v in (votes.get("votes") or {}).items():
        label, u = city_record(v["anchor"])
        rows.append(vote_row(f, v, label, u, pulled["city_record"]))
    for v in votes.get("other") or []:
        label, u = city_record(v["anchor"])
        rows.append(vote_row(v["file"], v, label, u, pulled["city_record"]))
    for f, v in (votes.get("legistar_votes") or {}).items():
        rows.append(vote_row(f, v, f"Council's Legistar record, file {f}", v["anchor"]["url"], pulled["legistar_votes"]))

    rows.sort(key=order_key, reverse=True)
    counts = {t: sum(1 for r in rows if r["type"] == t) for t in TYPES}
    counts["all"] = len(rows)
    return {
        "about": "Every dated official record the app holds for 2026, newest first: Council's legislation (dated by its latest dated action), the meetings "
                 "on the Clerk's calendar, and the roll calls the City Record prints. Each row names its source and when that source was pulled. "
                 "Words are the record's own. A ward tie says why: the title names the ward, the ordinance text ties ward money to it, or an address "
                 "in the title is in the ward. Sponsorship is not a vote, and a missing record is not a no. Nothing is ranked or scored.",
        "made_from": pulled,
        "counts": counts,
        "rows": rows,
    }


def latest(feed, n=10):
    """The front of the same list, for Today's Latest: every row dated after the day the records were pulled (meetings on the Clerk's calendar), then
    the first n rows dated on or before it. Today reads this small file after it has drawn; the whole list waits until Records opens."""
    last = max(et_day(v) for v in feed["made_from"].values())
    out, past = [], 0
    for r in feed["rows"]:
        if r["date"] <= last:
            if past >= n:
                break
            past += 1
        out.append(r)
    return {"about": "The newest rows of records-2026.json, in the same order, for Today's Latest. The whole list is records-2026.json.",
            "made_from": feed["made_from"], "counts": feed["counts"], "rows": out}


def build_from_data():
    return build(load("legistar-2026.json"), load("meetings-2026.json"), load("place-2026.json"), load("votes-2026.json"))


if __name__ == "__main__":
    r = build_from_data()
    body = json.dumps(r, ensure_ascii=False, separators=(",", ":"))
    print(f"{r['counts']['all']} rows: {r['counts']['legislation']} legislation, {r['counts']['meeting']} meetings, {r['counts']['vote']} roll calls; "
          f"{sum(1 for x in r['rows'] if x['wards'])} with a ward tie; {len(body)} bytes; newest {r['rows'][0]['date']}")
