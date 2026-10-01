#!/usr/bin/env python3
"""Civic Intelligence Bench: the mistake-report desk.

  python scripts/corrections.py --issue 12 --disposition confirmed --page "Profile of ..." --note "..." --reviewer "Name"
  python scripts/corrections.py --list

A resident reports a mistake with the GitHub form (.github/ISSUE_TEMPLATE/mistake.yml). A person checks
it against the official record and records what happened here, in plain words:

  confirmed     the report was right; a corrected packet follows and the old version is kept
  unconfirmed   the official record does not support the report (the note says what it does say)
  duplicate     already reported (--duplicate-of says which)
  out_of_scope  not about a fact in the app

Nothing a reporter sends is stored here: only the issue number, the page, and what the reviewer decided.
The note is public, so it is refused if it looks like it holds an email address or a phone number.
In real use this runs in the "Record a correction" workflow (.github/workflows/correction.yml) with
--actions: the reviewer is the GitHub account that started the run, must be in bench/reviewers.json, and
the entry is signed like an approval. A correction never edits the graph: a confirmed one starts a new
packet and goes through review like anything else.

Writes bench/corrections.jsonl (append only) and bench/approved/corrections-2026.json (what the app shows).
"""
import argparse, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bench_common import (load_json, load_jsonl, append_jsonl, write_json, short_id, now_utc, paths, attest, attestation_ok, load_reviewers, APPROVAL_KEY_ENV)

DISPOSITIONS = {"confirmed", "unconfirmed", "duplicate", "out_of_scope"}
PERSONAL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+|(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}")
REPO = "brent-Equalpoint/CivicGraphCleveland"


def public_list(P, key):
    """Latest decision per issue. With a key present (CI), only signed entries count."""
    latest = {}
    for r in load_jsonl(P["corrections"]):
        if key and not attestation_ok(r, key):
            continue
        latest[r["issue"]] = r
    names = {p["github"].lower(): p.get("name", p["github"]) for p in load_json(P["reviewers"], {"people": []}).get("people", [])}
    items = [{"issue": r["issue"], "url": r["issue_url"], "page": r["page"], "disposition": r["disposition"], "note": r["note"], "packet": r.get("packet"),
              "duplicate_of": r.get("duplicate_of"), "decided_at": r["decided_at"], "by": names.get(str(r["decided_by"]).lower(), r["decided_by"])}
             for r in sorted(latest.values(), key=lambda r: r["decided_at"], reverse=True)]
    return {"about": "What a person decided about each mistake report. Written by scripts/corrections.py. Reporters are never named.",
            "count": len(items), "confirmed": sum(1 for i in items if i["disposition"] == "confirmed"), "corrections": items}


def main(argv=None, bench_dir=None):
    ap = argparse.ArgumentParser(description="Record what a person decided about a mistake report.")
    ap.add_argument("--issue", type=int)
    ap.add_argument("--disposition", choices=sorted(DISPOSITIONS))
    ap.add_argument("--page", help="where the mistake was seen, e.g. Profile of Ward 8")
    ap.add_argument("--note", help="what was found, in plain words; public")
    ap.add_argument("--packet", help="the packet that fixes it, if confirmed")
    ap.add_argument("--duplicate-of", type=int)
    ap.add_argument("--reviewer")
    ap.add_argument("--actions", action="store_true")
    ap.add_argument("--list", action="store_true")
    args = ap.parse_args(argv)
    P = paths(bench_dir)
    key = os.environ.get(APPROVAL_KEY_ENV)
    if args.list:
        for i in public_list(P, key)["corrections"]:
            print(f"#{i['issue']:<4} {i['disposition']:12s} {i['page']}  ({i['decided_at'][:10]}, {i['by']})")
        return
    if not (args.issue and args.disposition and args.page and args.note):
        sys.exit("corrections: --issue, --disposition, --page and --note are required")
    if PERSONAL.search(args.note) or PERSONAL.search(args.page):
        sys.exit("corrections: the note is public and looks like it holds an email address or phone number; take that out")
    if args.disposition == "duplicate" and not args.duplicate_of:
        sys.exit("corrections: a duplicate needs --duplicate-of")
    reviewer, identity = args.reviewer, None
    if args.actions:
        actor = os.environ.get("GITHUB_ACTOR")
        if os.environ.get("GITHUB_ACTIONS") != "true" or not actor or not key:
            sys.exit(f"corrections: --actions needs to run inside GitHub Actions with the {APPROVAL_KEY_ENV} secret set")
        if not load_reviewers(P["reviewers"]).get(actor.lower()):
            sys.exit(f"corrections: {actor} is not in bench/reviewers.json")
        reviewer = actor
        identity = {"method": "github-actions", "actor": actor, "run_id": os.environ.get("GITHUB_RUN_ID")}
    if not reviewer:
        sys.exit("corrections: --reviewer is required")
    rec = {"correction_id": short_id("corr_", args.issue, args.disposition, now_utc()), "issue": args.issue, "issue_url": f"https://github.com/{REPO}/issues/{args.issue}",
           "page": args.page.strip(), "disposition": args.disposition, "note": args.note.strip(), "packet": args.packet, "duplicate_of": args.duplicate_of,
           "decided_by": reviewer, "decided_at": now_utc()}
    if identity:
        rec["identity"] = identity
    if key:
        rec["attestation"] = {"method": "hmac-sha256", "hmac": attest(rec, key)}
    append_jsonl(P["corrections"], rec)
    pub = public_list(P, key)
    write_json(P["corrections_public"], pub)
    print(f"recorded #{args.issue} as {args.disposition}; {pub['count']} correction(s) listed, {pub['confirmed']} confirmed")


if __name__ == "__main__":
    main()
