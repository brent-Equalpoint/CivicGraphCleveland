#!/usr/bin/env python3
"""Civic Intelligence Bench, human side: a named person decides on frozen candidates.

  python scripts/approve.py --list                                   what awaits a decision, by verdict
  python scripts/approve.py --show packet_x                          one review bundle, in full
  python scripts/approve.py --reviewer "Name" --approve packet_x packet_y --reason "..." --no-dissent
  python scripts/approve.py --reviewer "Name" --approve --all-merge --reason "..." --no-dissent
  python scripts/approve.py --reviewer "Name" --reject packet_x --reason "..."
  python scripts/approve.py --reviewer "Name" --revise packet_x --reason "..."

A decision binds the exact candidate ID, version and hash, the operations it may perform, and an
expiry (24 hours unless --expires-hours says otherwise). If the packet changes afterwards, the
approval no longer matches and commit.py refuses it. Every approval also records the reviewer's
dissent note or an explicit no-dissent review (the Skeptic seat is not automated yet).

Blocked and quarantined packets cannot be approved here. A HUMAN_REQUIRED packet can, because a
person looking at it and saying why is exactly what that verdict asks for.

This script appends to bench/shadow/approvals.jsonl and writes nothing else. Approving publishes
nothing: commit.py applies approved packets, and the app does not read the Bench yet (stage 8).
"""
import argparse, datetime, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bench_common import ROOT, load_json, load_jsonl, append_jsonl, short_id, now_utc, paths


def latest_decisions(approvals):
    """The most recent decision per candidate hash (a later decision on the same hash supersedes an earlier one)."""
    out = {}
    for a in approvals:
        out[(a["candidate_id"], a["candidate_sha256"])] = a
    return out


def main(argv=None, bench_dir=None):
    ap = argparse.ArgumentParser(description="Decide on Bench candidates (a named human only).")
    ap.add_argument("--reviewer", help="your name, recorded on the decision")
    g = ap.add_mutually_exclusive_group()
    g.add_argument("--approve", nargs="*", metavar="PACKET")
    g.add_argument("--reject", nargs="+", metavar="PACKET")
    g.add_argument("--revise", nargs="+", metavar="PACKET", help="request changes")
    g.add_argument("--list", action="store_true")
    g.add_argument("--show", metavar="PACKET")
    ap.add_argument("--all-merge", action="store_true", help="with --approve: every packet the examiner marked MERGE that has no current decision")
    ap.add_argument("--reason", help="why, in a sentence; recorded on the decision")
    ap.add_argument("--no-dissent", action="store_true", help="you looked for counterevidence and found none to record")
    ap.add_argument("--dissent", metavar="TEXT", help="counterevidence or doubt to keep on the record")
    ap.add_argument("--expires-hours", type=float, default=24)
    args = ap.parse_args(argv)
    P = paths(bench_dir)
    shadow = load_json(P["packets"])
    if not shadow:
        sys.exit("approve: no bench/shadow/packets-2026.json; run scripts/packets.py first")
    packets = shadow["packets"]
    approvals = load_jsonl(P["approvals"])
    current = latest_decisions(approvals)

    def decided(p):
        return current.get((p["candidate_id"], p["candidate_sha256"]))

    if args.list or not any((args.approve is not None, args.reject, args.revise, args.show)):
        from collections import Counter
        rows = Counter()
        for p in packets.values():
            d = decided(p)
            rows[(p["examiner"]["structural_verdict"], d["decision"] if d else "undecided")] += 1
        for (v, d), n in sorted(rows.items()):
            print(f"{n:5d}  {v:15s} {d}")
        for p in packets.values():
            if p["examiner"]["structural_verdict"] != "MERGE" and not decided(p):
                print(f"  {p['candidate_id']}  file {p['matter']['file']}  {p['examiner']['structural_verdict']}: " + "; ".join(p["examiner"]["notes"]))
        return
    if args.show:
        import json
        p = packets.get(args.show) or sys.exit(f"approve: no packet {args.show}")
        bundle = {k: p[k] for k in ("candidate_id", "version", "candidate_sha256", "question", "matter", "operations", "graph_precondition", "examiner", "state")}
        bundle["claims"] = [{"id": c["claim_id"], "state": c["evidence_state"], "statement": c["statement"], "why": c["confidence_reason"],
                             "anchors": c["anchors"]} for c in p["claims"]]
        bundle["edges"] = [f"{p['nodes'][e['subject_id']]['display_name']} --{e['relationship_type']}--> {p['nodes'][e['object_id']]['display_name']}" for e in p["edges"]]
        bundle["decision_so_far"] = decided(p)
        print(json.dumps(bundle, indent=1, ensure_ascii=False))
        return

    if not args.reviewer or not args.reason:
        sys.exit("approve: --reviewer and --reason are required for a decision")
    if args.approve is not None:
        decision, ids = "approved", list(args.approve)
        if args.all_merge:
            ids += [p["candidate_id"] for p in packets.values() if p["examiner"]["structural_verdict"] == "MERGE" and not decided(p)]
        if not ids:
            sys.exit("approve: nothing to approve")
        if not (args.no_dissent or args.dissent):
            sys.exit("approve: an approval needs --no-dissent or --dissent TEXT (the record keeps either)")
    else:
        decision, ids = ("rejected", args.reject) if args.reject else ("revision_requested", args.revise)
    decided_at = now_utc()
    expires = (datetime.datetime.fromisoformat(decided_at) + datetime.timedelta(hours=args.expires_hours)).isoformat()
    written = 0
    for cid in ids:
        p = packets.get(cid)
        if not p:
            print(f"skip {cid}: not in the shadow packets"); continue
        v = p["examiner"]["structural_verdict"]
        if decision == "approved" and v in ("BLOCK", "QUARANTINE"):
            print(f"skip {cid}: examiner verdict {v}; fix the packet or its sources first"); continue
        rec = {"approval_id": short_id("approval_", cid, p["candidate_sha256"], decided_at, args.reviewer), "candidate_id": cid,
               "candidate_version": p["version"], "candidate_sha256": p["candidate_sha256"], "scope": list(p["operations"]),
               "examiner_verdict_seen": v, "decision": decision, "reviewer_id": args.reviewer, "decided_at": decided_at,
               "expires_at": expires if decision == "approved" else None, "reason": args.reason}
        if decision == "approved":
            rec["skeptic_review"] = {"review_id": short_id("skeptic_", cid, p["candidate_sha256"], decided_at), "reviewer_id": args.reviewer,
                                     "dissent": args.dissent, "no_dissent": bool(args.no_dissent) and not args.dissent}
        append_jsonl(P["approvals"], rec)
        written += 1
    print(f"{decision}: {written} of {len(ids)} packet(s) recorded by {args.reviewer} at {decided_at}"
          + (f"; approvals expire {expires}. Apply them with: python scripts/commit.py" if decision == "approved" else ""))


if __name__ == "__main__":
    main()
