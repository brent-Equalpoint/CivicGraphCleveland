#!/usr/bin/env python3
"""What was done to each piece of city legislation, by whom, when, and where it is written down: the dated actions behind every record page
(docs/plan-votes-actions-positions.md, phase 2).

A pure function of four snapshots in data/ (it reads nothing else and fetches nothing): Council's Legistar record (legistar-2026.json: introduced
dates and links), the Clerk's meeting record (meetings-2026.json: every agenda a file was on and what happened to it there), the action histories
(place-2026.json, for any action the meeting record does not list), and the City Record (votes-2026.json: the referral printed at a first reading,
the approvals printed before a final vote, and the effective date printed with a law's full text). The roll calls themselves travel in the page
(CX_VOTES), not here.

build.py writes the result to site/council/record-2026.json (fetched only when a record or a person's list first needs it) and into the single
offline file as a block that is read only then. scripts/test_votes_actions.py tests it.

Every action has a date and a source; nothing is inferred. A file with no action in any record has only its introduced date.
"""
import json, os

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))


def load(name):
    with open(os.path.join(ROOT, "data", name), encoding="utf-8") as f:
        return json.load(f)


def build(leg, meetings, place, votes):
    """{about, pulled, bodies, meetings, issues, files}. Indexes keep the file small:
      meetings  [[date, body index, agenda url or None, meeting page or None, minutes url or None]]
      issues    [[label, url]] (City Record issues)
      files     {file: {"m": [[meeting index, the Clerk's action word or ""]], "h": [[date, action, body index]] (history rows no meeting lists),
                        "r": [[date, printed sentence, issue index]] (referrals), "p": [[date, printed sentence, issue index]] (approvals),
                        "e": [passed or adopted, that date, effective date, issue index]}}"""
    bodies, body_ix = [], {}

    def body(name):
        if name not in body_ix:
            body_ix[name] = len(bodies)
            bodies.append(name)
        return body_ix[name]

    files = {}
    known = {m["file"] for m in leg["matters"]}
    mtg_rows = []
    seen_on = {}
    for m in meetings["meetings"]:
        rows = [(f, a) for f, a in m["items"] if f in known]
        if not rows:
            continue
        mi = len(mtg_rows)
        mtg_rows.append([m["date"], body(m["body"]), m.get("agenda") or None, m.get("page") or None, m.get("minutes") or None])
        for f, a in rows:
            files.setdefault(f, {}).setdefault("m", []).append([mi, a or ""])
            seen_on.setdefault(f, set()).add((m["date"], m["body"], a or ""))
    for f, hist in sorted(place.get("histories", {}).items()):
        if f not in known:
            continue
        for d, a, b in hist:
            if (d, b, a) not in seen_on.get(f, set()):   # an action the meeting record does not list (the meeting record is the same Legistar data, so this is rare)
                files.setdefault(f, {}).setdefault("h", []).append([d, a, body(b)])
    issues, issue_ix = [], {}

    def issue(anchor):
        u = anchor["url"]
        if u not in issue_ix:
            label = next((i["label"] for i in votes["issues"] if i["url"] == u), anchor.get("locator", "").split(",")[0])
            issue_ix[u] = len(issues)
            issues.append([label, u])
        return issue_ix[u]

    for key, kind in (("referrals", "r"), ("approvals", "p")):
        for f, rows in sorted(votes.get(key, {}).items()):
            if f in known:
                files.setdefault(f, {})[kind] = [[r["date"], r["text"], issue(r["anchor"])] for r in rows]
    for f, r in sorted(votes.get("effective", {}).items()):
        if f in known:
            word = "passed" if "passed" in r else "adopted"
            files.setdefault(f, {})["e"] = [word, r[word], r["effective"], issue(r["anchor"])]
    files = {f: {k: v[k] for k in sorted(v)} for f, v in sorted(files.items(), key=lambda kv: (int(kv[0].split("-")[1]), int(kv[0].split("-")[0])))}
    return {
        "about": "Dated actions on each 2026 city file, each with its source: the Clerk's meeting record (agendas and what happened), Council's Legistar action histories, "
                 "and the City Record (referrals, approvals, effective dates). Roll calls are in the page. Nothing is inferred.",
        "pulled": {"legistar": leg["retrieved_at"], "meetings": meetings["retrieved_at"], "histories": place["retrieved_at"], "city_record": votes["retrieved_at"]},
        "bodies": bodies, "meetings": mtg_rows, "issues": issues, "files": files,
    }


def build_from_data():
    return build(load("legistar-2026.json"), load("meetings-2026.json"), load("place-2026.json"), load("votes-2026.json"))


if __name__ == "__main__":
    r = build_from_data()
    print(f"{len(r['files'])} files with actions, {len(r['meetings'])} meetings, {len(r['bodies'])} bodies, {len(r['issues'])} City Record issues, "
          f"{sum(len(v.get('h', [])) for v in r['files'].values())} history rows no meeting lists")
