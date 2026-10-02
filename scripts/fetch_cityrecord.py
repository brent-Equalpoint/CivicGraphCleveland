#!/usr/bin/env python3
"""Snapshot how each member of Cleveland City Council voted, from the City Record.

Output: data/votes-2026.json (a build input; the build never fetches live). The Bench registers it as the roll call source
`council_roll_call` (format in bench/README.md; the source note is in docs/civic-agent/votes-source-research.md).

Source: The City Record, the official publication of the Council of the City of Cleveland, published weekly by the City
Clerk, Clerk of Council. The issues are listed at clevelandcitycouncil.gov/legislation-laws/city-record. For a vote on passing
an ordinance, adopting a resolution, or laying a file on the table, an issue prints the tally and then "Voting Yea",
"Voting Nay", and "Absent" lists of surnames. The page states no terms of reuse, and a person has not yet read them (see the
source note).

What a vote record keeps, and what it does not:
  * Only the votes that print names. A vote to suspend the rules prints a tally and no names, so it is not stored.
  * A member is `yea`, `nay`, or `absent` as the City Record prints it. A member in office who is not printed is left out,
    which the app reads as "no record", never a no. Nothing is scored, ranked, or totaled across votes.
  * A vote is on one question ("Passage", "Adoption", "Laid on the table"). A file's roll call in `votes` is its vote on
    passage or adoption. A file's vote to lay it on the table is kept in `other`.
  * Every stored vote must add up: the names must equal the printed tally, every name must be a sitting member, nobody may
    be on two lists, and the lists must cover all sitting members. A vote that does not add up is not stored; it is listed
    in `skipped` with the reason, and refresh.py keeps the old file when anything was skipped, so a mis-read page never
    shows a wrong vote.
  * A vote is tied to a file by the "Ordinance No." or "Resolution No." heading that opens each entry. It is checked against
    Council's own record: when the file is in data/legistar-2026.json, its passage date there must be the meeting date
    printed here. Files from the last term (numbered 2023 to 2025) are not in that record; their votes are kept, and the
    app shows a vote only where it has a title to show.
  * One misprint is corrected, narrowly: when a heading prints a 2025 number whose 2026 twin passed on this very meeting
    date and the issue's own page headers print that twin, the vote is kept under the 2026 number and says so in its locator.

The record grows: an issue already stored is fetched again only when its size or modified date changed (the Clerk reissues
some issues as REVISED).
"""
import datetime, hashlib, json, os, re, subprocess, sys, tempfile, urllib.parse, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import net

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "data")
OUT = os.path.join(DATA, "votes-2026.json")
SITE = "https://www.clevelandcitycouncil.gov"
INDEX = SITE + "/legislation-laws/city-record"
YEAR = 2026
SOURCE = "The City Record, official publication of the Council of the City of Cleveland, published weekly by the City Clerk, Clerk of Council"

MONTHS = {m: i + 1 for i, m in enumerate("January February March April May June July August September October November December".split())}
NOISE = re.compile(r"^(Official Proceedings\b|[A-Z][a-z]+\.? \d{1,2}, \d{4}\s+The City Record\b|(First|Second|Third) Reading\b.*\b(Ord|Res)\. No\.)")
HEADER = re.compile(r"(?:First|Second|Third) Reading .*?(?:Ord|Res)\. No\. (\d+-\d{4})")  # the running header at the top of each page
ENTRY = re.compile(r"^(Ordinance|Resolution) No\. (\d+-\d{4})( AS AMENDED)?$")
BYLINE = re.compile(r"^By\b")
RESULT = re.compile(r"^(Read third time in full\. )?(Passed|Adopted|Laid on the table)\.? Yeas (\d+)\. Nays (\d+)\.")
MEETING = re.compile(r"^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday), ([A-Z][a-z]+) (\d{1,2}), (\d{4})$")
FIELD = re.compile(r"^(Voting Yea|Voting Nay|Absent)\s*:\s*(.*)$")
QUESTION = {"Passed": "Passage", "Adopted": "Adoption", "Laid on the table": "Laid on the table"}


def roster(people=None):
    """Sitting council members: {surname as the City Record prints it: full name as Council's record spells it}."""
    if people is None:
        with open(os.path.join(DATA, "people-2026.json"), encoding="utf-8") as f:
            people = json.load(f)
    out = {}
    for p in people["people"]:
        if p["title"] != "Council Member":
            continue
        last = p["name"].replace(" Jr.", "").split()[-1]
        if last in out:
            raise ValueError(f"two council members share the surname {last}")
        out[last] = p["name"]
    return out


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
            meeting = datetime.date(int(m.group(4)), MONTHS[m.group(2)], int(m.group(3))).isoformat()
        if ln:
            prev = ln
        r = RESULT.match(ln)
        if not r:
            i += 1
            continue
        verb, yeas, nays = r.group(2), int(r.group(3)), int(r.group(4))
        fields, cur, j, in_absent = {"Voting Yea": "", "Voting Nay": "", "Absent": ""}, None, i + 1, False
        while j < len(lines) and j < i + 40:  # the lists can wrap and a page break can fall inside them
            l = lines[j]
            fm = FIELD.match(l)
            if fm:
                cur = fm.group(1)
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
        where = f"{entry or '?'} on {meeting or '?'} ({verb} {yeas}-{nays})"
        if cur is None or not entry or not meeting:
            problems.append(f"{where}: could not tie the vote to a file or a meeting")
            i += 1
            continue
        yea, bad1 = names_in(fields["Voting Yea"], ros)
        nay, bad2 = names_in(fields["Voting Nay"], ros)
        ab, bad3 = names_in(fields["Absent"], ros)
        err = None
        if bad1 or bad2 or bad3:
            err = f"names that are not sitting members: {sorted(set(bad1 + bad2 + bad3))}"
        elif len(yea) != yeas or len(nay) != nays:
            err = f"names do not match the tally (printed {len(yea)} yea, {len(nay)} nay)"
        elif len(set(yea + nay + ab)) != len(yea + nay + ab):
            err = "a member is on two lists"
        elif len(yea + nay + ab) != len(ros):
            err = f"the lists name {len(yea + nay + ab)} of {len(ros)} members"
        if err:
            problems.append(f"{where}: {err}")
        else:
            members = {ros[s]: "yea" for s in yea}
            members.update({ros[s]: "nay" for s in nay})
            members.update({ros[s]: "absent" for s in ab})
            votes.append({"file": entry, "date": meeting, "question": QUESTION[verb], "members": dict(sorted(members.items())), "tally": {"yea": yeas, "nay": nays}})
        i = j if j > i else i + 1
    seen = {}
    for v in votes:  # one issue prints one vote per file and question; two means an entry was missed or a vote was repeated
        seen.setdefault((v["file"], v["question"], v["date"]), []).append(v)
    for (f, q, d), vs in seen.items():
        if len(vs) > 1:
            problems.append(f"{f} on {d}: {len(vs)} votes on {q.lower()} in one issue, so none are stored until a person looks")
            votes = [v for v in votes if v not in vs]
    return votes, problems, headers


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


def build(old, matters):
    """Fetch what is new or changed, keep what is not, and return the parsed issues."""
    ros = roster()
    listed = list_issues()
    if not listed:
        raise RuntimeError("the City Record page lists no issues for 2026")
    prev = {i["url"]: i for i in old.get("issues", [])}
    held = stored_votes(old)
    issues = []
    for it in listed:
        url = SITE + urllib.parse.quote(it["path"])
        meta = head(url)
        p = prev.get(url)
        if p and p.get("bytes") == meta["bytes"] and p.get("modified") == meta["modified"] and not p.get("problems"):
            rec = dict(p, votes=held.get(url, []))
        else:
            raw = net.get(url, timeout=180)
            votes, problems, headers = parse_issue(pdf_text(raw), ros)
            votes = reconcile(votes, headers, matters)
            rec = {"url": url, "label": it["label"], **meta, "sha256": hashlib.sha256(raw).hexdigest(), "votes": votes, "problems": problems}
        rec["label"] = it["label"]
        issues.append(rec)
    return issues


def assemble(issues, retrieved_at=None):
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
    return {
        "source": SOURCE,
        "retrieved_at": retrieved_at or datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
        "about": "How each member of Council voted where the City Record prints names: yea, nay, or absent. A member in office who is not listed has no record here, and no record is not a no. A vote to suspend the rules prints only a tally and is not stored. Nothing is scored.",
        "issues": [{k: i[k] for k in ("url", "label", "bytes", "modified", "sha256")} | {"votes": len(i["votes"]), "problems": i["problems"]} for i in issues],
        "votes": votes,
        "other": other,
        "skipped": problems,
        "counts": {"issues": len(issues), "files": len(votes), "other": len(other), "skipped": len(problems)},
    }


def check(snap, matters=None):
    """Problems with a snapshot (empty = safe to publish)."""
    bad = [f"votes: not stored, {s}" for s in snap["skipped"][:5]]
    if matters is None:
        matters = legistar_matters()
    ros = roster()
    for f, v in list(snap["votes"].items()) + [(o["file"], o) for o in snap["other"]]:
        m = matters.get(f)
        if m and v["question"] != "Laid on the table" and m.get("passed") and m["passed"] != v["date"]:
            bad.append(f"votes: {f} passed on {m['passed']} in Council's record but the City Record's vote is dated {v['date']}")
        c = {s: sum(1 for x in v["members"].values() if x == s) for s in ("yea", "nay")}
        if (c["yea"], c["nay"]) != (v["tally"]["yea"], v["tally"]["nay"]) or set(v["members"]) - set(ros.values()):
            bad.append(f"votes: {f} names do not match its tally or the roster")
    return bad


def main():
    old = {}
    if os.path.exists(OUT):
        with open(OUT, encoding="utf-8") as f:
            old = json.load(f)
    matters = legistar_matters()
    snap = assemble(build(old, matters))
    bad = check(snap, matters)
    if bad:  # keep the old file: a vote we could not read must not replace votes we could
        raise RuntimeError("; ".join(bad))
    json.dump(snap, open(OUT, "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    print(f"votes-2026.json: {snap['counts']['files']} files with a roll call, {snap['counts']['other']} other votes, {snap['counts']['issues']} issues")


if __name__ == "__main__":
    main()
