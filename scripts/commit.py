#!/usr/bin/env python3
"""Civic Intelligence Bench, commit side: a deterministic publisher with no judgment in it.

  python scripts/commit.py            apply every valid approval that has not been applied yet
  python scripts/commit.py --dry-run  say what would happen, write nothing

For each approval with decision=approved, in the order recorded, this checks that:
  1. the candidate still exists with the same version and the same hash (a changed packet
     invalidates its approval: approval_mismatch);
  2. the approval has not expired and has not already been applied (a receipt exists);
  3. the examiner verdict on the candidate is not BLOCK or QUARANTINE;
  4. the records this packet owns are at the revision the packet saw (graph precondition);
  5. every operation the packet would perform is inside the approved scope.
If any check fails, nothing from that packet is written and the reason goes in the receipt log.
If they all pass, the packet's public projection records are written to bench/approved/graph-2026.json
in one atomic replace, and a receipt with the new graph version is appended. Running it twice
changes nothing the second time.

This writes only bench/approved/. The app does not read it yet (stage 8). It interprets nothing:
the plain-English text comes from the approved claim set, word for word from the packet.
"""
import datetime, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bench_common import ROOT, canon, sha, short_id, load_json, load_jsonl, write_json, append_jsonl, now_utc, paths


def revision(record):
    return "rev_" + sha(canon({k: v for k, v in record.items() if k != "revision_id"}))[:12]


def project(p):
    """Public projection records (Data Contracts v1) from one approved packet. Text comes only from the claims."""
    m, nodes = p["matter"], p["nodes"]
    name = lambda i: nodes[i]["display_name"] if i in nodes else i
    claims = p["claims"]
    by_pred = {}
    for c in claims:
        by_pred.setdefault(c["predicate"], []).append(c)
    states = {c["evidence_state"] for c in claims}
    overall = "verified" if states == {"verified"} else ("contested" if "contested" in states else "partial")
    sponsors = [name(c["subject_id"]) for c in by_pred.get("sponsored", [])]
    lines = [f"{m['type']} introduced {m['introduced']}" + (f", sponsored by {', '.join(sponsors)}" if sponsors else "") + "."]
    for c in claims:
        if c["subject_id"] in nodes and nodes[c["subject_id"]]["kind"] == "body" and c["predicate"] not in ("passed", "roll_call"):
            lines.append(c["statement"])
    for c in by_pred.get("passed", []):
        lines.append(c["statement"] + ("" if c["evidence_state"] == "verified" else f" ({c['evidence_state']}: {c['confidence_reason']})"))
    roll = by_pred.get("roll_call", [None])[0]
    if roll:
        lines.append("Each member's vote: not published in Legistar. The roll call is in the City Record. A missing record is not a no.")
    records = {}
    anchors = [dict(a, claim_id=c["claim_id"], evidence_state=c["evidence_state"]) for c in claims for a in c["anchors"]]
    matter_id = next(i for i, n in nodes.items() if n["kind"] == "law")
    records[matter_id] = {"id": matter_id, "type": "law", "label": f"File {m['file']}", "title": m["title"], "plain_summary": " ".join(lines),
                          "jurisdiction": p["jurisdiction_id"], "geography": None, "as_of": max(c["observed_at"] for c in claims),
                          "evidence_state": overall, "source_anchors": anchors, "validity": {"from": m["introduced"], "to": None},
                          "related_ids": sorted(set(i for i in nodes if i != matter_id)),
                          "claims": [{"id": c["claim_id"], "statement": c["statement"], "evidence_state": c["evidence_state"],
                                      "confidence_reason": c["confidence_reason"], "date": c["valid_from"]} for c in claims],
                          "member_vote_states": roll["member_states"] if roll else None,
                          "next_step": f"Read the record: {m['url']}" + (". Ask the Clerk of Council for the roll call in the City Record." if roll else ""),
                          "accessibility_text": " ".join(lines), "status": m["status"], "candidate_id": p["candidate_id"], "candidate_sha256": p["candidate_sha256"]}
    for i, n in nodes.items():
        if i == matter_id:
            continue
        records[i] = {"id": i, "type": n["kind"], "label": n["display_name"], "plain_summary": n.get("office") or n["display_name"],
                      "jurisdiction": n["jurisdiction_id"], "geography": {"ward": n["ward"]} if n.get("ward") else None, "as_of": None,
                      "evidence_state": "verified" if n["resolution_state"] == "resolved" else "partial",
                      "source_anchors": [a for a in n["resolution_evidence"] if isinstance(a, dict)], "validity": {"from": n["valid_from"], "to": n["valid_to"]},
                      "related_ids": [], "next_step": None, "accessibility_text": f"{n['display_name']}, {n.get('office') or n['kind']}", "resolution_state": n["resolution_state"]}
    for e in p["edges"]:
        cited = [c for c in claims if c["claim_id"] in e["claim_ids"]]
        records[e["edge_id"]] = {"id": e["edge_id"], "type": "edge", "relationship_type": e["relationship_type"], "subject_id": e["subject_id"], "object_id": e["object_id"],
                                 "label": f"{name(e['subject_id'])} {e['relationship_type']} {name(e['object_id'])}",
                                 "plain_summary": " ".join(c["statement"] for c in cited), "jurisdiction": e["jurisdiction_id"], "geography": None,
                                 "as_of": max(c["observed_at"] for c in cited), "evidence_state": min((c["evidence_state"] for c in cited), key=lambda s: s == "verified"),
                                 "source_anchors": [a for c in cited for a in c["anchors"]], "validity": {"from": e["valid_from"], "to": e["valid_to"]},
                                 "related_ids": [e["subject_id"], e["object_id"]], "next_step": None, "accessibility_text": " ".join(c["statement"] for c in cited)}
    for r in records.values():
        r["revision_id"] = revision(r)
    return records


def check(p, a, graph, receipts, now):
    if p is None or p["version"] != a["candidate_version"] or p["candidate_sha256"] != a["candidate_sha256"]:
        return "approval_mismatch: the candidate changed (or vanished) after it was approved"
    if a["expires_at"] and now > a["expires_at"]:
        return "expired: the approval's expiry passed before commit"
    if any(r["approval_id"] == a["approval_id"] and r["result"] == "committed" for r in receipts):
        return "already_committed"
    if p["examiner"]["structural_verdict"] in ("BLOCK", "QUARANTINE"):
        return f"blocked: examiner verdict {p['examiner']['structural_verdict']}"
    recs = graph["records"]
    for rid, rev in p["graph_precondition"].items():
        have = (recs.get(rid) or {}).get("revision_id")
        if have != rev:
            return f"precondition_failed: {rid} is at {have}, the packet saw {rev}"
    if set(p["operations"]) - set(a["scope"]):
        return "scope_mismatch: the packet would perform operations outside the approved scope"
    return None


def main(argv=None, bench_dir=None):
    dry = "--dry-run" in (argv if argv is not None else sys.argv[1:])
    P = paths(bench_dir)
    shadow = load_json(P["packets"]) or sys.exit("commit: no shadow packets; run scripts/packets.py first")
    packets = shadow["packets"]
    approvals = [a for a in load_jsonl(P["approvals"]) if a["decision"] == "approved"]
    graph = load_json(P["graph"], {"about": "Approved public projection of the Civic Intelligence Bench. Written only by scripts/commit.py.",
                                   "graph_version": 0, "as_of": None, "records": {}})
    receipts = load_jsonl(P["receipts"])
    now = now_utc()
    done, refused, new_receipts = 0, [], []
    for a in approvals:
        p = packets.get(a["candidate_id"])
        why = check(p, a, graph, receipts + new_receipts, now)
        if why == "already_committed":
            continue
        rec = {"commit_id": short_id("commit_", a["approval_id"], now), "approval_id": a["approval_id"], "candidate_id": a["candidate_id"],
               "candidate_sha256": a["candidate_sha256"], "reviewer_id": a["reviewer_id"], "committed_at": now}
        if why:
            rec.update(result="refused", reason=why)
            refused.append(rec)
            new_receipts.append(rec)
            continue
        projected = project(p)
        for rid, r in projected.items():
            graph["records"][rid] = r
        graph["graph_version"] += 1
        graph["as_of"] = now
        rec.update(result="committed", graph_version=graph["graph_version"], operations=p["operations"],
                   revisions={rid: r["revision_id"] for rid, r in projected.items()})
        new_receipts.append(rec)
        done += 1
    print(f"commit: {done} committed, {len(refused)} refused, {len(approvals) - done - len(refused)} already applied; graph version {graph['graph_version']}, {len(graph['records'])} records")
    for r in refused:
        print(f"  refused {r['candidate_id']}: {r['reason']}")
    if dry:
        print("dry run: nothing written")
        return
    if done:
        write_json(P["graph"], graph)
    for r in new_receipts:
        append_jsonl(P["receipts"], r)


if __name__ == "__main__":
    main()
