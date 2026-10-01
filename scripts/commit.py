#!/usr/bin/env python3
"""Civic Intelligence Bench, commit side: a deterministic publisher with no judgment in it.

  python scripts/commit.py                    apply every valid, signed approval that has not been applied yet
  python scripts/commit.py --dry-run          say what would happen, write nothing
  python scripts/commit.py --allow-unattested local testing only: also accept unsigned decisions

For each approval with decision=approved, in the order recorded, this checks that:
  1. it carries the approval workflow's signature (HMAC with BENCH_APPROVAL_KEY) and was made by an
     account that is a publisher in bench/reviewers.json. With no key in the environment, unsigned
     decisions are refused unless --allow-unattested says this is a test;
  2. the candidate still exists with the same version and the same hash (a changed packet
     invalidates its approval: approval_mismatch);
  3. the approval has not expired and has not already been applied (a receipt exists);
  4. the examiner verdict is not BLOCK or QUARANTINE, and a Skeptic veto, if any, was overridden in
     writing by the approver;
  5. the records this packet owns are at the revision the packet saw (graph precondition);
  6. every operation the packet would perform is inside the approved scope.
If any check fails, nothing from that packet is written and the reason goes in the receipt log.
If they all pass, the packet's public projection records are written to bench/approved/graph-2026.json
in one atomic replace, the exact source records the reviewer approved are copied to
bench/approved/evidence/ (so the evidence survives even if the source later changes), and a receipt
with the new graph version is appended. A compact public file (bench/approved/public-2026.json) is
rebuilt for the app. Running it twice changes nothing the second time.

This writes only bench/approved/. It interprets nothing: the plain-English text comes from the
approved claim set, word for word from the packet.
"""
import os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bench_common import (ROOT, canon, sha, short_id, load_json, load_jsonl, write_json, append_jsonl, now_utc, paths,
                          attestation_ok, load_reviewers, APPROVAL_KEY_ENV)


def revision(record):
    return "rev_" + sha(canon({k: v for k, v in record.items() if k != "revision_id"}))[:12]


def project(p, approval=None, commit_id=None, committed_at=None):
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
    member_votes = None
    if roll:
        rec_votes = (roll.get("member_states") or {}).get("recorded") or {}
        if rec_votes:
            member_votes = [{"name": name(e), "ward": nodes[e].get("ward"), "vote": v} for e, v in sorted(rec_votes.items(), key=lambda kv: nodes[kv[0]].get("ward") or 0)]
            lines.append("Each member's recorded vote is listed below from the roll call record." + (" Members with no entry are not shown as a no." if roll["evidence_state"] == "partial" else ""))
        else:
            lines.append("Each member's vote: not published in Legistar. The roll call is in the City Record. A missing record is not a no.")
    records = {}
    anchors = [dict(a, claim_id=c["claim_id"], evidence_state=c["evidence_state"]) for c in claims for a in c["anchors"]]
    matter_id = next(i for i, n in nodes.items() if n["kind"] == "law")
    records[matter_id] = {"id": matter_id, "type": "law", "label": f"File {m['file']}", "file": m["file"], "title": m["title"], "url": m["url"], "plain_summary": " ".join(lines),
                          "jurisdiction": p["jurisdiction_id"], "geography": None, "as_of": max(c["observed_at"] for c in claims),
                          "evidence_state": overall, "source_anchors": anchors, "validity": {"from": m["introduced"], "to": None},
                          "related_ids": sorted(set(i for i in nodes if i != matter_id)),
                          "claims": [{"id": c["claim_id"], "statement": c["statement"], "evidence_state": c["evidence_state"],
                                      "confidence_reason": c["confidence_reason"], "date": c["valid_from"]} for c in claims],
                          "member_vote_states": roll["member_states"] if roll else None, "member_votes": member_votes,
                          "next_step": f"Read the record: {m['url']}" + (". Ask the Clerk of Council for the roll call in the City Record." if roll and not member_votes else ""),
                          "accessibility_text": " ".join(lines), "status": m["status"], "candidate_id": p["candidate_id"], "candidate_sha256": p["candidate_sha256"]}
    if approval:
        sk = approval.get("skeptic_review") or {}
        records[matter_id]["reviewed"] = {"by": approval["reviewer_id"], "at": approval["decided_at"], "approval_id": approval["approval_id"], "commit_id": commit_id,
                                          "committed_at": committed_at, "dissent": sk.get("dissent"), "no_dissent": bool(sk.get("no_dissent")),
                                          "skeptic_notes": sk.get("skeptic_notes_seen", []), "veto_overridden": bool(sk.get("veto_overridden")),
                                          "override_reason": sk.get("override_reason"), "signed": bool(approval.get("attestation"))}
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


def public_file(graph, names=None):
    """What the app reads: one compact record per approved file, keyed by file number. Sources, the review, and the limits are all in it."""
    out = {}
    for r in graph["records"].values():
        if r.get("type") != "law" or not r.get("reviewed"):
            continue
        seen, srcs = set(), []
        for a in r["source_anchors"]:
            k = (a["url"], a["locator"])
            if k not in seen:
                seen.add(k)
                srcs.append({"url": a["url"], "locator": a["locator"], "state": a["evidence_state"]})
        out[r["file"]] = {"file": r["file"], "title": r["title"], "url": r["url"], "status": r["status"], "as_of": r["as_of"], "evidence_state": r["evidence_state"],
                          "summary": r["plain_summary"], "claims": [[c["date"], c["evidence_state"], c["statement"], c["confidence_reason"]] for c in r["claims"]],
                          "sources": srcs, "reviewed": dict(r["reviewed"], by_name=(names or {}).get(str(r["reviewed"]["by"]).lower(), r["reviewed"]["by"])),
                          "member_votes": r.get("member_votes"), "revision": r["revision_id"]}
    return {"about": "Records a named publisher approved after checking them against their sources. Written by scripts/commit.py; read by the app.",
            "graph_version": graph["graph_version"], "as_of": graph["as_of"], "count": len(out), "records": out}


def check(p, a, graph, receipts, now, key, reviewers, allow_unattested):
    if any(r["approval_id"] == a["approval_id"] and r["result"] == "committed" for r in receipts):
        return "already_committed"
    if key:
        if not attestation_ok(a, key):
            return "unattested: this decision was not signed by the approval workflow"
        actor = (a.get("identity") or {}).get("actor") or a["reviewer_id"]
        if "publisher" not in reviewers.get(str(actor).lower(), set()):
            return f"not_a_publisher: {actor} is not a publisher in bench/reviewers.json"
    elif not allow_unattested:
        return f"unattested: no {APPROVAL_KEY_ENV} in this environment, so no decision can be verified (use --allow-unattested only for a test)"
    if p is None or p["version"] != a["candidate_version"] or p["candidate_sha256"] != a["candidate_sha256"]:
        return "approval_mismatch: the candidate changed (or vanished) after it was approved"
    if a["expires_at"] and now > a["expires_at"]:
        return "expired: the approval's expiry passed before commit"
    if p["examiner"]["structural_verdict"] in ("BLOCK", "QUARANTINE"):
        return f"blocked: examiner verdict {p['examiner']['structural_verdict']}"
    sk = p.get("skeptic") or {}
    if sk.get("veto") and not (a.get("skeptic_review") or {}).get("veto_overridden"):
        return "vetoed: the Skeptic's veto was not overridden in the approval"
    recs = graph["records"]
    for rid, rev in p["graph_precondition"].items():
        have = (recs.get(rid) or {}).get("revision_id")
        if have != rev:
            return f"precondition_failed: {rid} is at {have}, the packet saw {rev}"
    if set(p["operations"]) - set(a["scope"]):
        return "scope_mismatch: the packet would perform operations outside the approved scope"
    return None


def main(argv=None, bench_dir=None):
    argv = argv if argv is not None else sys.argv[1:]
    dry, allow = "--dry-run" in argv, "--allow-unattested" in argv
    key = os.environ.get(APPROVAL_KEY_ENV)
    P = paths(bench_dir)
    shadow = load_json(P["packets"]) or sys.exit("commit: no shadow packets; run scripts/packets.py first")
    packets = shadow["packets"]
    registry = load_json(P["registry"], {"snapshots": {}})["snapshots"]
    reviewers = load_reviewers(P["reviewers"])
    names = {p["github"].lower(): p.get("name", p["github"]) for p in load_json(P["reviewers"], {"people": []}).get("people", [])}
    approvals = [a for a in load_jsonl(P["approvals"]) if a["decision"] == "approved"]
    graph = load_json(P["graph"], {"about": "Approved public projection of the Civic Intelligence Bench. Written only by scripts/commit.py.",
                                   "graph_version": 0, "as_of": None, "records": {}})
    receipts = load_jsonl(P["receipts"])
    now = now_utc()
    done, refused, new_receipts, evidence = 0, [], [], {}
    for a in approvals:
        p = packets.get(a["candidate_id"])
        why = check(p, a, graph, receipts + new_receipts, now, key, reviewers, allow)
        if why == "already_committed":
            continue
        rec = {"commit_id": short_id("commit_", a["approval_id"], now), "approval_id": a["approval_id"], "candidate_id": a["candidate_id"],
               "candidate_sha256": a["candidate_sha256"], "reviewer_id": a["reviewer_id"], "committed_at": now}
        if why:
            rec.update(result="refused", reason=why)
            refused.append(rec)
            if not any(r["approval_id"] == a["approval_id"] and r.get("reason") == why for r in receipts):  # say it once, not every night
                new_receipts.append(rec)
            continue
        projected = project(p, a, rec["commit_id"], now)
        for rid, r in projected.items():
            graph["records"][rid] = r
        snaps = sorted({x["snapshot_id"] for c in p["claims"] for x in c["anchors"]})
        for sid in snaps:
            if sid in registry:
                evidence[sid] = registry[sid]
        graph["graph_version"] += 1
        graph["as_of"] = now
        rec.update(result="committed", graph_version=graph["graph_version"], operations=p["operations"],
                   revisions={rid: r["revision_id"] for rid, r in projected.items()}, evidence=snaps, signed=bool(key))
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
        for sid, e in evidence.items():  # the exact records the reviewer approved, kept even if the source changes later
            write_json(os.path.join(P["evidence"], f"{sid}.json"), e)
    if done or not os.path.exists(P["public"]):
        write_json(P["public"], public_file(graph, names))
    for r in new_receipts:
        append_jsonl(P["receipts"], r)


if __name__ == "__main__":
    main()
