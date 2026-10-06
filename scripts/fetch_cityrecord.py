#!/usr/bin/env python3
"""Snapshot how each member of Cleveland City Council voted, from the City Record, and what else each entry records.

Output: data/votes-2026.json (a build input; the build never fetches live). The Bench registers it as the roll call source
`council_roll_call` (format in bench/README.md; the source note is in docs/civic-agent/votes-source-research.md). The Bench
reads `votes` and `other` only.

Source: The City Record, the official publication of the Council of the City of Cleveland, published weekly by the City
Clerk, Clerk of Council. The issues are listed at clevelandcitycouncil.gov/legislation-laws/city-record. For a vote on passing
an ordinance, adopting a resolution, or laying a file on the table, an issue prints the tally and then "Voting Yea",
"Voting Nay", and "Absent" lists of surnames (and "Recusal" when a member recused). The page states no terms of reuse, and a
person has not yet read them (see the source note).

What a vote record keeps, and what it does not:
  * Only the votes that print names. A vote to suspend the rules prints a tally and no names, so it is not stored.
  * A member is `yea`, `nay`, `absent`, or `recused` as the City Record prints it (Voting Yea, Voting Nay, Absent, Recusal).
    A member in office who is not printed is left out, which the app reads as "no record", never a no. Nothing is scored,
    ranked, or totaled across votes.
  * A vote is on one question ("Passage", "Adoption", "Laid on the table"). A file's roll call in `votes` is its vote on
    passage or adoption. A file's vote to lay it on the table is kept in `other`.
  * Every stored vote must add up: the names must equal the printed tally (yeas, nays, and recusals), every name must be a
    sitting member, nobody may be on two lists, and the lists must cover all sitting members. A vote that does not add up is
    not stored; it is listed in `skipped` with the reason, and refresh.py keeps the old file when anything was skipped, so a
    mis-read page never shows a wrong vote.
  * A vote is tied to a file by the "Ordinance No." or "Resolution No." heading that opens each entry. It is checked against
    Council's own record: when the file is in data/legistar-2026.json, its passage date there must be the meeting date
    printed here. Files from the last term (numbered 2023 to 2025) are not in that record; their votes are kept, and the
    app shows a vote only where it has a title to show.
  * One misprint is corrected, narrowly: when a heading prints a 2025 number whose 2026 twin passed on this very meeting
    date and the issue's own page headers print that twin, the vote is kept under the 2026 number and says so in its locator.

The record grows: an issue already stored is fetched again only when its size or modified date changed (the Clerk reissues
some issues as REVISED), or when the parser has learned to read something new (PARSER below; every issue is read again once).
A run that finds nothing new writes the same bytes (the retrieval time is kept when nothing else changed).

Parser 2 (Oct 6, 2026, docs/plan-votes-actions-positions.md):
  * "Recusal": the Oct. 2 issue prints "Passed. Yeas 13. Nays 0. Recusal 1." and a "Recusal: Griffin." list (file 1044-2026).
    The parser did not know the word, so the lists named 13 of 15 members and every nightly run from Oct 2 held the whole
    snapshot back (by design). A recusal is stored as `recused`, its printed count must equal its list, and it is never a no.
  * What else each entry prints, kept as dated actions with the issue as their source: "Referred to the Directors of ...;
    Committees on ..." at a first reading (`referrals`), "Approved by the Directors of ...; Committee on ..." before a final
    vote (`approvals`, the committee and department reports in the record), and "Passed <date>. Effective <date>." where the
    issue prints the law's full text (`effective`). Each is tied to its entry's heading and the meeting the issue reports; a
    line that cannot be tied to one file and one date is not stored (`actions_held`) and never blocks the roll calls.
  * Mayor's actions: the City Record prints no signature or veto entries. Any line that mentions a veto is kept in the
    issue's `veto_lines` for a person to read; nothing is inferred from it.

Second source, Council's Legistar record (Granicus Web API, /events/{id}/eventitems and /eventitems/{id}/votes): the Clerk
entered member-by-member votes there for some Council meetings (Jan. 5 to May 18, 2026). They are read for every City
Council agenda item with an action and:
  * fill a file's roll call only where the City Record prints no names for it (`legistar_votes`; on Oct 6, 2026 one file,
    4-2026, the Rules of Order, whose vote the City Record prints as a sentence instead of lists), and only when every
    sitting member has exactly one recorded word, the item is the file's passage or adoption, and the meeting is the file's
    passed date;
  * are compared with the City Record wherever both have the same file, meeting, and question; a difference is listed in
    `differs` with both readings, and the City Record (with its printed tally) stays the vote shown;
  * are best effort: if Legistar does not answer, the City Record votes still publish and the last Legistar reading stays.
"""
import concurrent.futures as cf, datetime, hashlib, json, os, re, subprocess, sys, tempfile, urllib.parse, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import net

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "data")
OUT = os.path.join(DATA, "votes-2026.json")
SITE = "https://www.clevelandcitycouncil.gov"
INDEX = SITE + "/legislation-laws/city-record"
YEAR = 2026
SOURCE = "The City Record, official publication of the Council of the City of Cleveland, published weekly by the City Clerk, Clerk of Council"
PARSER = 2  # bump when parse_issue or parse_actions learns to read something new: every stored issue is then read again once
LEGISTAR = "https://webapi.legistar.com/v1/cityofcleveland"
COUNCIL_BODY = 183  # City Council's body id in Council's Legistar record

MONTHS = {m: i + 1 for i, m in enumerate("January February March April May June July August September October November December".split())}
NOISE = re.compile(r"^(Official Proceedings\b|[A-Z][a-z]+\.? \d{1,2}, \d{4}\s+The City Record\b|(First|Second|Third) Reading\b.*\b(Ord|Res)\. No\.|Adopted Resolutions and Passed Ordinances\b)")
HEADER = re.compile(r"(?:First|Second|Third) Reading .*?(?:Ord|Res)\. No\. (\d+-\d{4})")  # the running header at the top of each page
ENTRY = re.compile(r"^(Ordinance|Resolution) No\. (\d+-\d{4})( AS AMENDED)?$")
OTHER_HEAD = re.compile(r"^(File|Ordinance|Resolution) No\. [\w-]+(\s+AS AMENDED)?(\s{3,}.*)?$")   # a heading on its own line ends the entry before it (not "Ordinance No. 812-2024 relating to ..." inside a law's text)
BYLINE = re.compile(r"^By\b")
RESULT = re.compile(r"^(Read third time in full\. )?(Passed|Adopted|Laid on the table)\.? Yeas (\d+)\. Nays (\d+)\.(?: Recusals? (\d+)\.)?")
MEETING = re.compile(r"^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday), ([A-Z][a-z]+) (\d{1,2}), (\d{4})$")
FIELD = re.compile(r"^(Voting Yea|Voting Nay|Absent|Recusals?)\s*:\s*(.*)$")
QUESTION = {"Passed": "Passage", "Adopted": "Adoption", "Laid on the table": "Laid on the table"}
SENTENCE = re.compile(r"^(Referred to|Approved by) the\b")   # the referral at a first reading, the reports before a final vote
DATED = re.compile(r"^(Passed|Adopted|Effective) ([A-Z][a-z]+)\.? (\d{1,2}), (\d{4})\.$")   # where an issue prints a law's full text
VETO = re.compile(r"\bveto", re.I)
LEGISTAR_WORD = {"Yea": "yea", "Nay": "nay", "Absent": "absent", "Recused": "recused", "Recusal": "recused", "Abstain": "abstain"}
LEGISTAR_QUESTION = {"approved": "Passage", "approved as amended": "Passage", "adopted": "Adoption", "adopted as amended": "Adoption", "tabled": "Laid on the table"}


def roster(people=None):
    """Sitting council members: {surname as the City Record prints it: full name as Council's record spells it}."""
    if people is None:
        people = load_people()
    out = {}
    for p in people["people"]:
        if p["title"] != "Council Member":
            continue
        last = p["name"].replace(" Jr.", "").split()[-1]
        if last in out:
            raise ValueError(f"two council members share the surname {last}")
        out[last] = p["name"]
    return out


def load_people():
    with open(os.path.join(DATA, "people-2026.json"), encoding="utf-8") as f:
        return json.load(f)


def names_in(text, ros):
    """Surnames in a printed list: (those that are sitting members, anything else). The City Record sometimes drops a comma
    ("Bishop Conwell"), so a space also splits; the tally check catches a bad split."""
    text = text.strip().rstrip(".")
    if not text or text.lower() == "none":
        return [], []
    got, bad = [], []
    for t in re.split(r"\s*,\s*|\s*;\s*|\s+and\s+|\s+", text):
        t = t.strip().rstrip(".")
        if t:
            (got if t in ros else bad).append(t)
    return got, bad


def iso(month, day, year):
    return datetime.date(int(year), MONTHS[month], int(day)).isoformat() if month in MONTHS else None


def parse_issue(text, ros):
    """Votes with names from one issue's text: (votes, problems, headers). A vote that does not add up goes in problems, not votes.
    headers is the set of file numbers in the issue's running page headers (used to check a misprinted heading)."""
    lines = [l.strip() for l in text.splitlines()]
    headers = {m.group(1) for m in (HEADER.search(l) for l in lines) if m}
    votes, problems = [], []
    entry, meeting, prev = None, None, ""
    i = 0
    while i < len(lines):
        ln = lines[i]
        m = ENTRY.match(ln)
        if m:  # an entry opens with its heading, then a "By Council Member ..." line (a blank line may come between)
            nxt = next((l for l in lines[i + 1:i + 4] if l), "")
            if BYLINE.match(nxt):
                entry = m.group(2)
        m = MEETING.match(ln)
        if m and prev == "Cleveland, Ohio" and m.group(2) in MONTHS:
            meeting = iso(m.group(2), m.group(3), m.group(4))
        if ln:
            prev = ln
        r = RESULT.match(ln)
        if not r:
            i += 1
            continue
        verb, yeas, nays, recs = r.group(2), int(r.group(3)), int(r.group(4)), int(r.group(5) or 0)
        fields, cur, j, in_absent = {"Voting Yea": "", "Voting Nay": "", "Absent": "", "Recusal": ""}, None, i + 1, False
        while j < len(lines) and j < i + 40:  # the lists can wrap and a page break can fall inside them
            l = lines[j]
            fm = FIELD.match(l)
            if fm:
                cur = "Recusal" if fm.group(1).startswith("Recusal") else fm.group(1)
                in_absent = in_absent or cur == "Absent"
                fields[cur] += " " + fm.group(2)
            elif not l:
                if in_absent:
                    break
            elif NOISE.match(l):
                pass
            elif cur and not names_in(l, ros)[1]:
                fields[cur] += " " + l
            else:
                break
            j += 1
        where = f"{entry or '?'} on {meeting or '?'} ({verb} {yeas}-{nays}{f', recusal {recs}' if recs else ''})"
        if cur is None or not entry or not meeting:
            problems.append(f"{where}: could not tie the vote to a file or a meeting")
            i += 1
            continue
        yea, bad1 = names_in(fields["Voting Yea"], ros)
        nay, bad2 = names_in(fields["Voting Nay"], ros)
        ab, bad3 = names_in(fields["Absent"], ros)
        rec, bad4 = names_in(fields["Recusal"], ros)
        err = None
        if bad1 or bad2 or bad3 or bad4:
            err = f"names that are not sitting members: {sorted(set(bad1 + bad2 + bad3 + bad4))}"
        elif len(yea) != yeas or len(nay) != nays or len(rec) != recs:
            err = f"names do not match the tally (printed {len(yea)} yea, {len(nay)} nay, {len(rec)} recusal)"
        elif len(set(yea + nay + ab + rec)) != len(yea + nay + ab + rec):
            err = "a member is on two lists"
        elif len(yea + nay + ab + rec) != len(ros):
            err = f"the lists name {len(yea + nay + ab + rec)} of {len(ros)} members"
        if err:
            problems.append(f"{where}: {err}")
        else:
            members = {ros[s]: "yea" for s in yea}
            members.update({ros[s]: "nay" for s in nay})
            members.update({ros[s]: "absent" for s in ab})
            members.update({ros[s]: "recused" for s in rec})
            tally = {"yea": yeas, "nay": nays, **({"recused": recs} if recs else {})}
            votes.append({"file": entry, "date": meeting, "question": QUESTION[verb], "members": dict(sorted(members.items())), "tally": tally})
        i = j if j > i else i + 1
    seen = {}
    for v in votes:  # one issue prints one vote per file and question; two means an entry was missed or a vote was repeated
        seen.setdefault((v["file"], v["question"], v["date"]), []).append(v)
    for (f, q, d), vs in seen.items():
        if len(vs) > 1:
            problems.append(f"{f} on {d}: {len(vs)} votes on {q.lower()} in one issue, so none are stored until a person looks")
            votes = [v for v in votes if v not in vs]
    return votes, problems, headers


def parse_actions(text):
    """What else the entries of one issue record, beside the roll calls: {referrals, approvals, effective, held, veto}.
    referrals and approvals are the printed sentences ("Referred to the Directors of ...; Committees on ...", "Approved by the
    Directors of ...; Committee on ..."), each tied to the entry it sits in and the meeting the issue reports. effective is
    the "Passed <date>." and "Effective <date>." pair printed after a law's full text. Anything that cannot be tied to one file
    and one date goes in held with the reason; it is never guessed."""
    lines = [l.strip() for l in text.splitlines()]
    out = {"referrals": [], "approvals": [], "effective": [], "held": [], "veto": []}
    entry, entry_at, meeting, prev, pending = None, -1, None, "", None
    i = 0
    while i < len(lines):
        ln = lines[i]
        if ENTRY.match(ln):
            nxt = next((l for l in lines[i + 1:i + 4] if l), "")
            if BYLINE.match(nxt):
                entry, entry_at, pending = ENTRY.match(ln).group(2), i, None
            else:
                entry, pending = None, None   # a heading with no byline (a number inside a law's text): no entry to tie lines to
        elif OTHER_HEAD.match(ln):
            entry, pending = None, None
        m = MEETING.match(ln)
        if m and prev == "Cleveland, Ohio" and m.group(2) in MONTHS:
            meeting = iso(m.group(2), m.group(3), m.group(4))
        if ln:
            prev = ln
        if VETO.search(ln) and len(out["veto"]) < 5:
            out["veto"].append(re.sub(r"\s+", " ", ln))
        s = SENTENCE.match(ln)
        if s:
            parts, j = [ln], i + 1
            while not " ".join(parts).rstrip().endswith(".") and j < len(lines) and j < i + 16:   # a sentence may wrap and cross a page break
                l = lines[j]
                if l and not NOISE.match(l):
                    if OTHER_HEAD.match(l) or SENTENCE.match(l):
                        break
                    parts.append(l)
                j += 1
            sent = re.sub(r"\s+", " ", " ".join(parts)).strip()
            kind = "referrals" if s.group(1) == "Referred to" else "approvals"
            if not sent.endswith("."):
                out["held"].append(f"{entry or '?'}: a '{s.group(1)}' sentence that does not end within 16 lines")
            elif not entry or not meeting or i - entry_at > 3000:
                out["held"].append(f"{entry or '?'} on {meeting or '?'}: a '{s.group(1)}' sentence that could not be tied to one file and one meeting")
            else:
                out[kind].append({"file": entry, "date": meeting, "text": sent})
            i = j
            continue
        d = DATED.match(ln)
        if d:
            day = iso(d.group(2), d.group(3), d.group(4))
            if not entry or not day:
                out["held"].append(f"{entry or '?'}: '{ln}' could not be tied to one file")
            elif d.group(1) in ("Passed", "Adopted"):
                pending = {"file": entry, "word": d.group(1).lower(), "on": day}
            elif pending and pending["file"] == entry:
                out["effective"].append({"file": entry, pending["word"]: pending["on"], "effective": day})
                pending = None
            else:
                out["held"].append(f"{entry}: 'Effective {day}' with no passed or adopted date before it")
        i += 1
    return out


def committees_in(sentence):
    """The committees a printed sentence names, as printed: "...; Committees on Safety; and Finance, Diversity, Equity and Inclusion." gives
    ["Safety", "Finance, Diversity, Equity and Inclusion"]."""
    m = re.search(r"\bCommittees? on (.*?)\.?$", sentence)
    if not m:
        return []
    return [re.sub(r"^and\s+", "", p.strip()).strip() for p in m.group(1).split(";") if p.strip()]


def reconcile(votes, headers, matters):
    """Fix the one known misprint (a 2025 heading for a 2026 file) only when all three records agree; otherwise change nothing."""
    for v in votes:
        num, _, yr = v["file"].partition("-")
        twin = f"{num}-{YEAR}"
        m = matters.get(twin)
        if yr != str(YEAR) and v["file"] not in matters and m and m.get("passed") == v["date"] and twin in headers:
            v["misprint"] = v["file"]
            v["file"] = twin
    return votes


def pdf_text(data):
    with tempfile.TemporaryDirectory() as d:
        p = os.path.join(d, "x.pdf")
        open(p, "wb").write(data)
        return subprocess.run(["pdftotext", "-layout", p, "-"], capture_output=True, text=True, encoding="utf-8", errors="replace", check=True).stdout


def list_issues():
    """The year's issues on the City Record page: [{label, path}] newest first."""
    html = net.get(INDEX).decode("utf-8", "replace")
    seen, out = set(), []
    for href, label in re.findall(r'<a[^>]*href="([^"]*sites/default/files/20[^"]*\.pdf)"[^>]*>(.*?)</a>', html, re.S):
        label = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", label)).strip()
        path = urllib.parse.unquote(href.split("file=")[-1])
        if str(YEAR) in label and path not in seen:
            seen.add(path)
            out.append({"label": label, "path": path})
    return out


def head(url):
    req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": net.UA})
    r = urllib.request.urlopen(req, timeout=60)
    return {"bytes": int(r.headers.get("Content-Length") or 0), "modified": r.headers.get("Last-Modified") or ""}


def legistar_matters():
    with open(os.path.join(DATA, "legistar-2026.json"), encoding="utf-8") as f:
        return {m["file"]: m for m in json.load(f)["matters"]}


def stored_votes(old):
    """The votes already stored, grouped by the issue they came from."""
    by_url = {}
    for f, v in list(old.get("votes", {}).items()) + [(o["file"], o) for o in old.get("other", [])]:
        rec = {"file": f, "date": v["date"], "question": v["question"], "members": v["members"], "tally": v["tally"]}
        if v.get("misprint"):
            rec["misprint"] = v["misprint"]
        by_url.setdefault(v["anchor"]["url"], []).append(rec)
    return by_url


def stored_actions(old):
    """The actions already stored, grouped by the issue they came from, in parse_actions' shape."""
    by_url = {}
    for kind in ("referrals", "approvals"):
        for f, rows in old.get(kind, {}).items():
            for r in rows:
                by_url.setdefault(r["anchor"]["url"], {"referrals": [], "approvals": [], "effective": []})[kind].append({"file": f, "date": r["date"], "text": r["text"]})
    for f, r in old.get("effective", {}).items():
        rec = {"file": f, "effective": r["effective"], **{k: r[k] for k in ("passed", "adopted") if k in r}}
        by_url.setdefault(r["anchor"]["url"], {"referrals": [], "approvals": [], "effective": []})["effective"].append(rec)
    return by_url


def build(old, matters):
    """Fetch what is new or changed (or read by an older parser), keep what is not, and return the parsed issues."""
    ros = roster()
    listed = list_issues()
    if not listed:
        raise RuntimeError("the City Record page lists no issues for 2026")
    prev = {i["url"]: i for i in old.get("issues", [])}
    held = stored_votes(old)
    held_acts = stored_actions(old)
    issues = []
    for it in listed:
        url = SITE + urllib.parse.quote(it["path"])
        meta = head(url)
        p = prev.get(url)
        if p and p.get("bytes") == meta["bytes"] and p.get("modified") == meta["modified"] and not p.get("problems") and p.get("parser") == PARSER:
            acts = held_acts.get(url, {"referrals": [], "approvals": [], "effective": []})
            rec = dict(p, votes=held.get(url, []), acts={**acts, "held": p.get("held", []), "veto": p.get("veto_lines", [])})
        else:
            raw = net.get(url, timeout=180)
            text = pdf_text(raw)
            votes, problems, headers = parse_issue(text, ros)
            votes = reconcile(votes, headers, matters)
            rec = {"url": url, "label": it["label"], **meta, "sha256": hashlib.sha256(raw).hexdigest(), "votes": votes, "problems": problems, "acts": parse_actions(text)}
        rec["label"] = it["label"]
        issues.append(rec)
    return issues


def tie_actions(issues, matters):
    """The issues' actions as the snapshot keeps them, each with its issue as the anchor. An effective date is kept only when the
    printed passed or adopted date is the file's passed date in Council's record (when the file is in it); otherwise it is held."""
    refs, apps, eff, held = {}, {}, {}, []
    for rec in issues:
        a = rec.get("acts") or {}
        held += [f"{rec['label']}: {h}" for h in a.get("held", [])]
        for kind, into in (("referrals", refs), ("approvals", apps)):
            for r in a.get(kind, []):
                row = {"date": r["date"], "text": r["text"], "committees": committees_in(r["text"]),
                       "anchor": {"url": rec["url"], "locator": f"{rec['label']}, file {r['file']}, council meeting of {r['date']}"}}
                if row not in into.setdefault(r["file"], []):
                    into[r["file"]].append(row)
        for r in a.get("effective", []):
            said = r.get("passed") or r.get("adopted")
            m = matters.get(r["file"])
            if m and m.get("passed") and m["passed"] != said:
                held.append(f"{rec['label']}: {r['file']} printed as passed {said}, but Council's record says {m['passed']}")
                continue
            row = {"effective": r["effective"], **{k: r[k] for k in ("passed", "adopted") if k in r},
                   "anchor": {"url": rec["url"], "locator": f"{rec['label']}, full text of file {r['file']}"}}
            if r["file"] in eff and eff[r["file"]]["effective"] != row["effective"]:
                held.append(f"{rec['label']}: {r['file']} printed with a second effective date ({row['effective']}, before {eff[r['file']]['effective']})")
                continue
            eff.setdefault(r["file"], row)
    srt = lambda d: {f: sorted(v, key=lambda r: (r["date"], r["text"])) for f, v in sorted(d.items())}
    return srt(refs), srt(apps), dict(sorted(eff.items())), sorted(set(held))


def assemble(issues, retrieved_at=None, matters=None):
    """The Bench-format snapshot. The vote on passage or adoption is the file's roll call; a vote to lay it on the table goes in `other`."""
    votes, other, problems = {}, [], []
    for rec in issues:
        problems += [f"{rec['label']}: {p}" for p in rec["problems"]]
    for rec, v in sorted(((r, v) for r in issues for v in r["votes"]), key=lambda rv: (rv[1]["date"], rv[1]["file"])):
        note = f", heading printed as {v['misprint']} (page headers and Council's record say {v['file']})" if v.get("misprint") else ""
        entry = {"date": v["date"], "question": v["question"], "members": v["members"], "tally": v["tally"],
                 "anchor": {"url": rec["url"], "locator": f"{rec['label']}, roll call on file {v['file']}, council meeting of {v['date']}{note}"}}
        if v.get("misprint"):
            entry["misprint"] = v["misprint"]
        if v["question"] == "Laid on the table":
            other.append({"file": v["file"], **entry})
            continue
        earlier = votes.get(v["file"])
        if earlier and earlier["date"] == v["date"]:
            problems.append(f"{v['file']} on {v['date']}: two issues each print a vote on passage")  # a reissue replaces an issue, it does not add to it
        elif earlier:  # the file was voted on at a later meeting too: that vote is its roll call, and the earlier one stays visible
            other.append({"file": v["file"], **earlier})
        if not earlier or earlier["date"] != v["date"]:
            votes[v["file"]] = entry
    votes = dict(sorted(votes.items(), key=lambda kv: (kv[1]["date"], kv[0])))
    other.sort(key=lambda o: (o["date"], o["file"]))
    refs, apps, eff, held = tie_actions(issues, matters or {})
    return {
        "source": SOURCE,
        "retrieved_at": retrieved_at or datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
        "parser": PARSER,
        "about": "How each member of Council voted where the City Record prints names: yea, nay, absent, or recused (printed as Recusal). A member in office who is not listed has no record here, and no record is not a no. A vote to suspend the rules prints only a tally and is not stored. Nothing is scored. "
                 "Also kept, each with the issue it came from: the referral printed at a first reading, the approvals printed before a final vote, and the effective date printed with a law's full text. "
                 "legistar_votes fills a roll call from Council's Legistar record only where the City Record prints no names; differs lists where the two records disagree.",
        "issues": [{k: i[k] for k in ("url", "label", "bytes", "modified", "sha256")} | {"parser": PARSER, "votes": len(i["votes"]), "problems": i["problems"],
                    "held": (i.get("acts") or {}).get("held", []), "veto_lines": (i.get("acts") or {}).get("veto", [])} for i in issues],
        "votes": votes,
        "other": other,
        "referrals": refs,
        "approvals": apps,
        "effective": eff,
        "actions_held": held,
        "skipped": problems,
        "counts": {"issues": len(issues), "files": len(votes), "other": len(other), "skipped": len(problems),
                   "referrals": sum(len(v) for v in refs.values()), "approvals": sum(len(v) for v in apps.values()), "effective": len(eff), "actions_held": len(held)},
    }


# ---------------------------------------------------------------- Council's Legistar record, the second source

def legistar_get(path):
    return json.loads(net.get(LEGISTAR + path.replace(" ", "%20"), timeout=90))


def legistar_items():
    """Every City Council agenda item of the year that has an action, with the member-by-member words Legistar holds for it
    (most have none): [[event item id, file, meeting date, action, {person id: word as Legistar prints it}]]."""
    q = f"EventBodyId eq {COUNCIL_BODY} and EventDate ge datetime'{YEAR}-01-01' and EventDate lt datetime'{YEAR + 1}-01-01'"
    events = legistar_get(f"/events?$filter={q}")
    items = []
    with cf.ThreadPoolExecutor(4) as ex:
        for e, its in ex.map(lambda e: (e, legistar_get(f"/events/{e['EventId']}/eventitems")), events):
            for x in its:
                if x.get("EventItemMatterFile") and x.get("EventItemActionName"):
                    items.append((x["EventItemId"], x["EventItemMatterFile"], e["EventDate"][:10], x["EventItemActionName"]))
    out = []
    with cf.ThreadPoolExecutor(4) as ex:
        for (eid, f, d, a), vs in zip(items, ex.map(lambda it: legistar_get(f"/eventitems/{it[0]}/votes"), items)):
            if vs:
                out.append([eid, f, d, a, {str(v["VotePersonId"]): v.get("VoteValueName") for v in vs}])
    return sorted(out)


def legistar_reading(items, people):
    """Legistar's votes as {(file, date, question): (members by name, problem or None, event item id)}. A reading is usable only when
    every sitting member has exactly one word the code knows; otherwise the problem says why and it is not used."""
    ids = {str(p["person_id"]): p["name"] for p in people["people"] if p["title"] == "Council Member"}
    out = {}
    for eid, f, d, action, by in items:
        q = LEGISTAR_QUESTION.get(action)
        if not q:
            continue   # a vote on something other than passage, adoption, or tabling (for example a referral) is not a roll call here
        members, bad = {}, None
        for pid, word in by.items():
            if pid not in ids:
                bad = f"a vote by person {pid}, who is not a sitting member"
            elif LEGISTAR_WORD.get(word) is None:
                bad = f"no recorded word for {ids[pid]}"
            else:
                members[ids[pid]] = LEGISTAR_WORD[word]
        if not bad and set(members) != set(ids.values()):
            bad = f"Legistar names {len(members)} of {len(ids)} members"
        out[(f, d, q)] = (dict(sorted(members.items())), bad, eid)
    return out


def add_legistar(snap, items, matters, people, read_at, note=None):
    """legistar_votes (roll calls the City Record does not print with names), differs (where the two records disagree), and what was read."""
    reading = legistar_reading(items, people)
    cr = {(f, v["date"], v["question"]): v for f, v in snap["votes"].items()}
    cr.update({(o["file"], o["date"], o["question"]): o for o in snap["other"]})
    fill, differs, held = {}, [], []
    for (f, d, q), (members, bad, eid) in sorted(reading.items()):
        c = cr.get((f, d, q))
        if c:
            if not bad and members != c["members"]:
                differs.append({"file": f, "date": d, "question": q, "members": {n: {"city_record": c["members"].get(n), "legistar": members.get(n)}
                                                                                 for n in sorted(set(members) | set(c["members"])) if members.get(n) != c["members"].get(n)}})
            continue
        m = matters.get(f)
        if f in snap["votes"] or q == "Laid on the table" or not m:
            continue
        if bad:
            held.append(f"{f} on {d}: {bad}")
        elif m.get("passed") != d:
            held.append(f"{f} on {d}: Council's record says it passed on {m.get('passed')}")
        else:
            tally = {w: sum(1 for x in members.values() if x == w) for w in ("yea", "nay")}
            tally.update({w: n for w in ("recused", "abstain") for n in [sum(1 for x in members.values() if x == w)] if n})
            fill[f] = {"date": d, "question": q, "members": members, "tally": tally,
                       "anchor": {"url": m["url"], "locator": f"Council's Legistar record, file {f}: the votes recorded for agenda item {eid} at the City Council meeting of {d}"}}
    snap["legistar_votes"] = dict(sorted(fill.items()))
    snap["differs"] = differs
    snap["legistar"] = {"source": LEGISTAR + " (/events/{id}/eventitems, /eventitems/{id}/votes)", "read_at": read_at, "items": items,
                        "meetings": sorted({i[2] for i in items}), "held": sorted(held), **({"note": note} if note else {})}
    snap["counts"].update({"legistar_items": len(items), "legistar_votes": len(fill), "differs": len(differs)})
    return snap


def add_no_names(snap, matters):
    """Every file Council's record marks Passed that has no named vote in either record gets a reason, never an empty value:
    issue_not_out (it passed after the meeting the newest City Record issue reports), legistar_held (Legistar's votes for it do not
    add up), or not_printed (the issues read print no named vote for it and Legistar has none)."""
    named = set(snap["votes"]) | set(snap.get("legistar_votes", {}))
    latest = max([v["date"] for v in snap["votes"].values()] + [o["date"] for o in snap["other"]] or [""])
    held = {h.split(" on ")[0]: h for h in (snap.get("legistar") or {}).get("held", [])}
    out = {}
    for f, m in sorted(matters.items()):
        if m.get("status") != "Passed" or f in named:
            continue
        if m.get("passed") and m["passed"] > latest:
            out[f] = {"passed": m["passed"], "reason": "issue_not_out", "latest_meeting": latest}
        elif f in held:
            out[f] = {"passed": m.get("passed"), "reason": "legistar_held", "note": held[f]}
        else:
            out[f] = {"passed": m.get("passed"), "reason": "not_printed", "latest_meeting": latest}
    snap["no_names"] = out
    snap["counts"]["no_names"] = len(out)
    return snap


def check(snap, matters=None):
    """Problems with a snapshot (empty = safe to publish)."""
    bad = [f"votes: not stored, {s}" for s in snap["skipped"][:5]]
    if matters is None:
        matters = legistar_matters()
    if "no_names" in snap:   # a passed file with no named vote must say why
        named = set(snap["votes"]) | set(snap.get("legistar_votes", {})) | set(snap["no_names"])
        missing = [f for f, m in matters.items() if m.get("status") == "Passed" and f not in named]
        if missing:
            bad.append(f"votes: {len(missing)} passed files have no named vote and no reason, for example {missing[:3]}")
        if any(r.get("reason") not in ("issue_not_out", "legistar_held", "not_printed") for r in snap["no_names"].values()):
            bad.append("votes: a passed file without a named vote has no known reason")
    ros = roster()
    words = {"yea", "nay", "absent", "recused", "abstain"}
    rows = list(snap["votes"].items()) + [(o["file"], o) for o in snap["other"]] + list(snap.get("legistar_votes", {}).items())
    for f, v in rows:
        m = matters.get(f)
        if m and v["question"] != "Laid on the table" and m.get("passed") and m["passed"] != v["date"]:
            bad.append(f"votes: {f} passed on {m['passed']} in Council's record but the vote is dated {v['date']}")
        c = {s: sum(1 for x in v["members"].values() if x == s) for s in ("yea", "nay", "recused")}
        t = {s: v["tally"].get(s, 0) for s in ("yea", "nay", "recused")}
        if c != t or set(v["members"]) - set(ros.values()) or not set(v["members"].values()) <= words:
            bad.append(f"votes: {f} names do not match its tally or the roster")
    for f in snap.get("legistar_votes", {}):
        if f in snap["votes"]:
            bad.append(f"votes: {f} has a City Record roll call and a Legistar one; only the City Record's is shown")
        if set(snap["legistar_votes"][f]["members"]) != set(ros.values()):
            bad.append(f"votes: the Legistar vote on {f} does not name every sitting member once")
    for kind in ("referrals", "approvals"):
        for f, rs in snap.get(kind, {}).items():
            if any(not (r.get("date") and r.get("text") and r.get("anchor", {}).get("url")) for r in rs):
                bad.append(f"{kind}: {f} has a row with no date, text, or source")
    for f, r in snap.get("effective", {}).items():
        if not (r.get("effective") and r.get("anchor", {}).get("url")):
            bad.append(f"effective: {f} has no date or source")
    return bad


def same_but_time(a, b):
    """True when two snapshots differ only in when they were read."""
    strip = lambda s: {k: (v if k != "legistar" else {kk: vv for kk, vv in v.items() if kk != "read_at"}) for k, v in s.items() if k != "retrieved_at"}
    return strip(a) == strip(b)


def main():
    old = {}
    if os.path.exists(OUT):
        with open(OUT, encoding="utf-8") as f:
            old = json.load(f)
    matters = legistar_matters()
    people = load_people()
    snap = assemble(build(old, matters), matters=matters)
    now = snap["retrieved_at"]
    try:
        items, note = legistar_items(), None
    except Exception as e:  # best effort: the City Record votes publish without it, and the last reading stays
        items, note = (old.get("legistar") or {}).get("items", []), f"not read on {now[:10]} ({type(e).__name__}); the reading of {(old.get('legistar') or {}).get('read_at', 'an earlier day')} is used"
        print(f"::warning title=Council's Legistar votes were not read::{type(e).__name__}: {e}")
    add_legistar(snap, items, matters, people, now if note is None else (old.get("legistar") or {}).get("read_at"), note)
    add_no_names(snap, matters)
    bad = check(snap, matters)
    if bad:  # keep the old file: a vote we could not read must not replace votes we could
        raise RuntimeError("; ".join(bad))
    if old and same_but_time(snap, old):
        snap["retrieved_at"] = old["retrieved_at"]   # nothing changed: the same bytes as before
        snap["legistar"]["read_at"] = old.get("legistar", {}).get("read_at", snap["legistar"]["read_at"])
    tmp = OUT + ".tmp"
    json.dump(snap, open(tmp, "w", encoding="utf-8", newline="\n"), indent=1, ensure_ascii=False)
    os.replace(tmp, OUT)
    c = snap["counts"]
    print(f"votes-2026.json: {c['files']} files with a City Record roll call, {c['legistar_votes']} from Council's Legistar record, {c['other']} other votes, "
          f"{c['issues']} issues; {c['referrals']} referrals, {c['approvals']} approvals, {c['effective']} effective dates, {c['actions_held']} lines held; "
          f"{c['differs']} votes where the two records differ; {c['no_names']} passed files with no named vote (each with its reason)")


if __name__ == "__main__":
    main()
