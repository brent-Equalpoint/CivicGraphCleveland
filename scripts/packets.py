#!/usr/bin/env python3
"""Civic Intelligence Bench, research side: shadow candidates from the official record.

  python scripts/packets.py            rebuild bench/shadow/ from data/ (deterministic; safe to rerun)
  python scripts/packets.py --summary  print the verdict counts without writing

One bounded journey (Implementation v1, "start here"): for each 2026 ordinance or resolution,
"Who authorized this, and what was the recorded vote?" Everything comes from the two snapshots the
nightly refresh already keeps: data/legistar-2026.json (the index record and sponsors) and
data/place-2026.json (the committee and Council action history). Nothing is fetched here.

For each file this writes one candidate packet (Data Contracts v1): the entities it names, atomic
claims with exact source anchors, typed edges, the operations a commit would perform, and a frozen
hash. A deterministic examiner then checks anchor coverage, identity, chronology, and edge legality
and records a verdict. Packets are shadow only: nothing here reaches the app.

What this does not do, on purpose:
  * It never claims a member's vote. Legistar records that Council approved a file; it does not
    publish each member's vote (the roll call is in the City Record, not registered here yet). The
    roll call claim is `missing`. A missing record is not a no.
  * It never resolves a person by name alone. Council members are resolved by office, ward and term
    from the oath record (file 1-2026). Two members with the same name would both be quarantined.
    A sponsor who is not on that roster stays `unreviewed` and needs a person to resolve.
  * There is no Skeptic here. The named reviewer records dissent or an explicit no-dissent review
    in approve.py. The Skeptic seat is still to be built.
"""
import os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bench_common import (ROOT, JURISDICTION, EDGE_TYPES, canon, sha, short_id, load_json, write_json,
                          packet_hash, paths)

LEGISTAR = "https://webapi.legistar.com/v1/cityofcleveland"
COUNCIL = "Cleveland City Council"
COUNCIL_BODY = "City Council"  # how the Legistar action history names Council
SUBSTANTIVE = {"Ordinance", "Emergency Ordinance", "Resolution", "Emergency Resolution"}
ROSTER_FILE = "1-2026"  # Oaths of Office for the 2026-2029 term: the official ward roster
# A body's recorded decision on a file (becomes a `vote` edge from the body). Referral is procedure, not a decision.
DECISIONS = {"approved", "approved as amended", "adopted", "adopted as amended", "recommended for approval",
             "recommended for denial", "tabled", "passed on second reading", "withdrawn"}
PASSING = {"approved", "approved as amended", "adopted", "adopted as amended"}
OFFICE_LABELS = {"By Departmental Request": "Legistar's sponsor label for legislation submitted by a city department",
                 "Mayor's Administration": "Legistar's sponsor label for legislation submitted by the Mayor's administration"}


def slug(text):
    return re.sub(r"[^a-z0-9]+", "_", text.lower()).strip("_")


def name_key(name):
    """First and last name, lower case, ignoring middle initials and punctuation. Used only inside one body and term."""
    toks = re.sub(r"[^\w\s'-]", "", name).split()
    return (toks[0].lower(), toks[-1].lower()) if toks else ("", "")


# ---------------------------------------------------------------- sources, snapshots, entities

def sources():
    def src(path, record_type, note):
        return {"source_id": short_id("src_", LEGISTAR + path), "owner": "Cleveland City Council (Granicus Legistar)",
                "canonical_url": LEGISTAR + path, "jurisdiction_id": JURISDICTION, "record_type": record_type,
                "access_method": "api", "license_status": "public_record", "refresh_policy": "daily",
                "fetched_by": "scripts/refresh.py", "note": note}
    return {
        "matters": src("/matters", "legislation_index", "File number, type, status, title, introduced and passed dates. Snapshot: data/legistar-2026.json"),
        "sponsors": src("/matters/{id}/sponsors", "sponsor_list", "Sponsors in sequence. Sponsorship is not a vote. Snapshot: data/legistar-2026.json"),
        "histories": src("/matters/{id}/histories", "action_history", "Committee and Council actions with dates. No per-member roll call is published. Snapshot: data/place-2026.json"),
    }


def snapshot(reg, source_id, record, locator_prefix, retrieved_at, url):
    """Per-record snapshot: the same record content always gets the same snapshot ID and keeps the time it was
    first seen, so a quiet night changes nothing a reviewer approved. `last_seen_at` moves every night."""
    sid = short_id("snap_", source_id, record)
    prev = reg.get("_prev", {}).get(sid)
    reg.setdefault(sid, {"snapshot_id": sid, "source_id": source_id, "record": locator_prefix, "content_sha256": sha(canon(record)),
                         "first_seen_at": prev["first_seen_at"] if prev else retrieved_at, "last_seen_at": retrieved_at, "url": url,
                         "storage_ref": "data/ (normalized record, not raw HTTP bytes)", "parser_version": "v1"})
    return sid


def roster(leg):
    m = next((x for x in leg["matters"] if x["file"] == ROSTER_FILE), None)
    if not m:
        sys.exit(f"packets: file {ROSTER_FILE} (oaths of office) is not in data/legistar-2026.json")
    term = re.search(r"(\d{4})-(\d{4}) term", m["title"])
    rows = re.findall(r"Ward (\d+) - (.+)", m["title"])
    if not term or len(rows) != 15:
        sys.exit(f"packets: could not read 15 wards and a term from file {ROSTER_FILE}")
    return m, term.group(0), [(int(w), n.strip()) for w, n in rows]


def build_entities(leg, hist, reg, srcs):
    """Council, committees, the 15 members (from the oath record), and every file in scope."""
    ents = {}

    def put(e):
        ents[e["entity_id"]] = e
        return e["entity_id"]

    council = put({"entity_id": short_id("entity_", "body", JURISDICTION, COUNCIL), "kind": "body", "display_name": COUNCIL,
                   "canonical_identifier": None, "jurisdiction_id": JURISDICTION, "aliases": [COUNCIL_BODY], "valid_from": None, "valid_to": None,
                   "resolution_state": "resolved", "resolution_evidence": ["Legistar action body name"]})
    bodies = {COUNCIL_BODY: council}
    for rows in hist.values():
        for _, _, body in rows:
            if body and body not in bodies:
                bodies[body] = put({"entity_id": short_id("entity_", "body", JURISDICTION, body), "kind": "body", "display_name": body,
                                    "canonical_identifier": None, "jurisdiction_id": JURISDICTION, "aliases": [], "valid_from": None,
                                    "valid_to": None, "parent_id": council, "resolution_state": "resolved",
                                    "resolution_evidence": ["Legistar action body name"]})
    rm, term, rows = roster(leg)
    snap = snapshot(reg, srcs["matters"]["source_id"], rm, f"MatterId {rm['id']} (file {rm['file']})", leg["retrieved_at"], rm["url"])
    keys = {}
    for w, n in rows:
        keys.setdefault(name_key(n), []).append(w)
    members, collisions = {}, set()
    for w, n in rows:
        eid = short_id("entity_", "person", JURISDICTION, COUNCIL, f"Ward {w}", term)
        amb = len(keys[name_key(n)]) > 1
        if amb:
            collisions.add(name_key(n))
        members[eid] = ents[put({"entity_id": eid, "kind": "person", "display_name": n, "canonical_identifier": None, "jurisdiction_id": JURISDICTION,
                            "aliases": [], "office": f"Council Member, Ward {w}", "ward": w, "term": term, "valid_from": rm["intro"], "valid_to": None,
                            "resolution_state": "ambiguous" if amb else "resolved",
                            "resolution_evidence": [{"snapshot_id": snap, "locator": f"MatterId {rm['id']}, title line 'Ward {w} - {n}'", "url": rm["url"]}]
                            + (["Another member of the same body and term has the same first and last name"] if amb else [])})]
    return ents, bodies, members, collisions


def resolve_sponsor(name, ents, members, collisions):
    """A sponsor name becomes an entity only through office, ward and term. Otherwise it stays unreviewed."""
    key = name_key(name)
    hits = [m for m in members.values() if name_key(m["display_name"]) == key]
    if len(hits) == 1 and key not in collisions:
        return hits[0]["entity_id"]
    if name in OFFICE_LABELS:
        eid = short_id("entity_", "office", JURISDICTION, name)
        ents.setdefault(eid, {"entity_id": eid, "kind": "office", "display_name": name, "canonical_identifier": None, "jurisdiction_id": JURISDICTION,
                              "aliases": [], "valid_from": None, "valid_to": None, "resolution_state": "unreviewed",
                              "resolution_evidence": [OFFICE_LABELS[name]]})
        return eid
    if len(hits) > 1 or key in collisions:
        eid = short_id("entity_", "person", JURISDICTION, "sponsor-name-collision", name)
        ents.setdefault(eid, {"entity_id": eid, "kind": "person", "display_name": name, "canonical_identifier": None, "jurisdiction_id": JURISDICTION,
                              "aliases": [], "valid_from": None, "valid_to": None, "resolution_state": "ambiguous",
                              "resolution_evidence": [f"Matches more than one member of {COUNCIL}: " + ", ".join(sorted(h["office"] for h in hits))]})
        return eid
    eid = short_id("entity_", "person", JURISDICTION, "unresolved-sponsor", name)
    ents.setdefault(eid, {"entity_id": eid, "kind": "person", "display_name": name, "canonical_identifier": None, "jurisdiction_id": JURISDICTION,
                          "aliases": [], "valid_from": None, "valid_to": None, "resolution_state": "unreviewed",
                          "resolution_evidence": ["Sponsor name in Legistar; not on the Council roster. No registered record establishes this person's office."]})
    return eid


# ---------------------------------------------------------------- claims and packets

def member_vote_state(member, action_date):
    """What a member's vote record can be on a date: `not_applicable` outside their term, otherwise `missing`
    until a roll call source is registered. Never `abstained`, never a no."""
    start, end = member.get("valid_from"), member.get("valid_to")
    if (start and action_date < start) or (end and action_date > end):
        return {"state": "not_applicable", "reason": f"Not in office on {action_date} (term {start or '?'} to {end or 'present'})"}
    return {"state": "missing", "reason": "Legistar does not publish each member's vote; the roll call is in the City Record, which is not registered as a source yet"}


def member_states(members, action_date):
    """Compact per-member view for one roll call: who is `missing` (record not registered) and who is `not_applicable` (and why)."""
    out = {"missing": [], "not_applicable": {}}
    for eid, mem in sorted(members.items()):
        st = member_vote_state(mem, action_date)
        if st["state"] == "missing":
            out["missing"].append(eid)
        else:
            out["not_applicable"][eid] = st["reason"]
    return out


def build_packet(m, rows, leg, hist_meta, ents, members, collisions, bodies, reg, srcs, prev_graph):
    council = bodies[COUNCIL_BODY]
    mid = short_id("entity_", "law", JURISDICTION, "legistar", m["id"])
    label = f"File {m['file']}"
    ents.setdefault(mid, {"entity_id": mid, "kind": "law", "display_name": label, "canonical_identifier": f"legistar:cityofcleveland:matter:{m['id']}",
                          "jurisdiction_id": JURISDICTION, "aliases": [], "valid_from": m["intro"], "valid_to": None,
                          "resolution_state": "resolved", "resolution_evidence": ["Legistar MatterId"]})
    snap_m = snapshot(reg, srcs["matters"]["source_id"], m, f"MatterId {m['id']} (file {m['file']})", leg["retrieved_at"], m["url"])
    snap_s = snapshot(reg, srcs["sponsors"]["source_id"], {"id": m["id"], "sponsors": m["sponsors"]}, f"/matters/{m['id']}/sponsors", leg["retrieved_at"], m["url"])
    snap_h = snapshot(reg, srcs["histories"]["source_id"], {"id": m["id"], "file": m["file"], "rows": rows}, f"/matters/{m['id']}/histories",
                      hist_meta["retrieved_at"], m["url"]) if rows is not None else None
    claims, edges, nodes = [], [], {mid: ents[mid], council: ents[council]}

    def claim(statement, subject, predicate, obj, anchors, state, reason, valid_from=None, extra=None):
        c = {"claim_id": short_id("claim_", subject, predicate, obj, valid_from, [a["locator"] for a in anchors]), "statement": statement,
             "subject_id": subject, "predicate": predicate, "object_id": obj, "jurisdiction_id": JURISDICTION, "valid_from": valid_from,
             "valid_to": None, "observed_at": reg[anchors[0]["snapshot_id"]]["first_seen_at"], "evidence_state": state, "confidence_reason": reason, "anchors": anchors,
             "counterevidence_ids": [], "reviewed_at": None, "review_due_at": None, "supersedes_claim_id": None}
        if extra:
            c.update(extra)
        claims.append(c)
        return c["claim_id"]

    def edge(rtype, subject, obj, claim_ids, valid_from):
        assert rtype in EDGE_TYPES
        edges.append({"edge_id": short_id("edge_", rtype, subject, obj), "subject_id": subject, "relationship_type": rtype, "object_id": obj,
                      "jurisdiction_id": JURISDICTION, "valid_from": valid_from, "valid_to": None, "claim_ids": claim_ids})

    claim(f"{label} ({m['type']}) was introduced to {COUNCIL} on {m['intro']}.", mid, "introduced_to", council,
          [{"snapshot_id": snap_m, "locator": f"MatterId {m['id']}, field MatterIntroDate", "url": m["url"]}], "verified",
          "The official Legistar index record gives the introduction date.", m["intro"])
    for i, s in enumerate(m["sponsors"]):
        eid = resolve_sponsor(s, ents, members, collisions)
        nodes[eid] = ents[eid]
        term_note = ""
        mem = members.get(eid)
        if mem and m["intro"] < mem["valid_from"]:
            term_note = f" The sponsor's term began {mem['valid_from']}, after the introduction date; a person must check this record."
        cid = claim(f"{ents[eid]['display_name']} sponsored {label}.", eid, "sponsored", mid,
                    [{"snapshot_id": snap_s, "locator": f"/matters/{m['id']}/sponsors, MatterSponsorSequence {i + 1}, MatterSponsorName '{s}'", "url": m["url"]}],
                    "contested" if term_note else "verified",
                    "Legistar lists this sponsor on the file. Sponsorship is a formal act of putting a file forward; it is not a vote." + term_note, m["intro"])
        edge("sponsorship", eid, mid, [cid], m["intro"])
    for date, action, body in (rows or []):
        bid = bodies.get(body) or council
        nodes[bid] = ents[bid]
        cid = claim(f"{body} {action} {label} on {date}.", bid, slug(action) or "acted_on", mid,
                    [{"snapshot_id": snap_h, "locator": f"/matters/{m['id']}/histories, MatterHistoryActionDate {date}, MatterHistoryActionName '{action}', MatterHistoryActionBodyName '{body}'", "url": m["url"]}],
                    "verified", "The official Legistar action history records this action by this body on this date.", date)
        if action in DECISIONS:
            edge("vote", bid, mid, [cid], date)
    if m["passed"]:
        council_pass = [d for d, a, b in (rows or []) if b == COUNCIL_BODY and a in PASSING]
        if m["passed"] in council_pass:
            state, reason = "verified", f"The index record's passed date matches a recorded {COUNCIL} action on {m['passed']}."
        elif rows is None:
            state, reason = "partial", f"The index record gives a passed date of {m['passed']}, but no action history is registered for this file."
        else:
            state, reason = "partial", f"The index record gives a passed date of {m['passed']}, but the registered action history has no {COUNCIL} approval on that date."
        claim(f"{COUNCIL} passed {label}; the record's passed date is {m['passed']}.", council, "passed", mid,
              [{"snapshot_id": snap_m, "locator": f"MatterId {m['id']}, field MatterPassedDate", "url": m["url"]}], state, reason, m["passed"])
        claim(f"The roll call on {label}: how each member of {COUNCIL} voted.", council, "roll_call", mid,
              [{"snapshot_id": snap_h or snap_m, "locator": f"/matters/{m['id']}/histories, MatterHistoryRollCallFlag 0, no vote records", "url": m["url"]}],
              "missing", "Legistar records that Council approved this file and does not publish each member's vote. The roll call is in the City Record minutes, "
              "which are not registered as a source yet. A missing record is not a no.", m["passed"],
              {"member_states": member_states(members, m["passed"])})
    ops = [f"upsert_node:{mid}"] + [f"upsert_node:{n}" for n in sorted(nodes) if n != mid] + [f"upsert_edge:{e['edge_id']}" for e in edges]
    owned = [mid] + [e["edge_id"] for e in edges]
    prev = (prev_graph or {}).get("records", {})
    return {"candidate_id": short_id("packet_", "matter", m["id"]), "operation": "upsert",
            "question": f"Who authorized {label}, and what was the recorded vote?", "jurisdiction_id": JURISDICTION,
            "matter": {"file": m["file"], "legistar_id": m["id"], "type": m["type"], "status": m["status"], "title": m["title"], "url": m["url"],
                       "introduced": m["intro"], "passed": m["passed"]},
            "nodes": nodes, "claims": claims, "edges": edges, "operations": ops,
            "graph_precondition": {rid: (prev.get(rid) or {}).get("revision_id") for rid in owned}}


# ---------------------------------------------------------------- examiner (deterministic, stage 5 in part)

def examine(p, reg, examined_at):
    """Independent of how the packet was built: it sees only the packet and the registry."""
    notes, verdicts = [], {}
    claim_by_id = {c["claim_id"]: c for c in p["claims"]}
    if len(claim_by_id) != len(p["claims"]):
        notes.append("duplicate claim IDs")
    for c in p["claims"]:
        v = "verified"
        if not c["anchors"] or any(a["snapshot_id"] not in reg or not a.get("locator") for a in c["anchors"]):
            v = "unsupported"
            notes.append(f"{c['claim_id']}: no registered source anchor")
        elif c["evidence_state"] in ("partial", "missing", "stale", "not_applicable"):
            v = "verified_with_limits"
        elif c["evidence_state"] == "contested":
            v = "contested"
        for side in ("subject_id", "object_id"):
            n = p["nodes"].get(c[side])
            if n and n["kind"] == "person" and n["resolution_state"] == "ambiguous":
                v = "needs_specialist_review"
                notes.append(f"{c['claim_id']}: identity collision on {n['display_name']}")
            elif n and n["kind"] == "person" and n["resolution_state"] == "unreviewed" and v in ("verified", "verified_with_limits"):
                v = "needs_specialist_review"
                notes.append(f"{c['claim_id']}: {n['display_name']} is not resolved to an office")
        if c["predicate"] == "roll_call" and c["evidence_state"] == "verified":
            v = "unsupported"
            notes.append(f"{c['claim_id']}: a roll call cannot be verified from the action history alone")
        verdicts[c["claim_id"]] = v
    intro = p["matter"]["introduced"]
    for c in p["claims"]:
        if c["valid_from"] and c["valid_from"] < intro and c["predicate"] != "introduced_to":
            verdicts[c["claim_id"]] = "unsupported"
            notes.append(f"{c['claim_id']}: dated before introduction ({c['valid_from']} < {intro})")
        if c["valid_from"] and c["valid_from"] > examined_at[:10]:
            verdicts[c["claim_id"]] = "unsupported"
            notes.append(f"{c['claim_id']}: dated in the future")
    for e in p["edges"]:
        cited = [claim_by_id.get(i) for i in e["claim_ids"]]
        if e["relationship_type"] not in EDGE_TYPES:
            notes.append(f"{e['edge_id']}: relationship type '{e['relationship_type']}' is not in the ontology")
        elif any(c is None for c in cited):
            notes.append(f"{e['edge_id']}: cites a claim that is not in the packet")
        elif e["relationship_type"] == "vote" and any(c["predicate"] == "sponsored" for c in cited):
            notes.append(f"{e['edge_id']}: a vote edge cannot rest on a sponsorship claim")
        elif e["relationship_type"] == "sponsorship" and any(c["predicate"] != "sponsored" for c in cited):
            notes.append(f"{e['edge_id']}: a sponsorship edge may cite only sponsorship claims")
        elif e["relationship_type"] == "vote" and any(p["nodes"].get(c["subject_id"], {}).get("kind") != "body" for c in cited):
            notes.append(f"{e['edge_id']}: only a body's recorded action is a vote here; no per-member vote source is registered")
    edge_problems = [n for n in notes if n.startswith("edge_")]
    vs = set(verdicts.values())
    if edge_problems or "unsupported" in vs or "duplicate claim IDs" in notes:
        verdict = "BLOCK"
    elif any("identity collision" in n for n in notes):
        verdict = "QUARANTINE"
    elif "needs_specialist_review" in vs or "contested" in vs:
        verdict = "HUMAN_REQUIRED"
    else:
        verdict = "MERGE"
    return {"examined_at": examined_at, "method": "deterministic checks: anchor coverage, identity, chronology, edge legality (scripts/packets.py)",
            "claim_verdicts": verdicts, "structural_verdict": verdict, "notes": notes}


STATE = {"MERGE": "examined", "HUMAN_REQUIRED": "examined", "BLOCK": "blocked", "QUARANTINE": "quarantined"}


def build(data_dir=None, bench_dir=None):
    data_dir = data_dir or os.path.join(ROOT, "data")
    P = paths(bench_dir)
    leg = load_json(os.path.join(data_dir, "legistar-2026.json"))
    place = load_json(os.path.join(data_dir, "place-2026.json"))
    prev = load_json(P["packets"], {"packets": {}})["packets"]
    prev_graph = load_json(P["graph"])
    srcs = sources()
    reg = {"_prev": load_json(P["registry"], {"snapshots": {}})["snapshots"]}  # carried forward for first_seen_at only
    ents, bodies, members, collisions = build_entities(leg, place["histories"], reg, srcs)
    packets = {}
    for m in sorted(leg["matters"], key=lambda x: x["id"]):
        if m["type"] not in SUBSTANTIVE:
            continue
        p = build_packet(m, place["histories"].get(m["file"]), leg, place, ents, members, collisions, bodies, reg, srcs, prev_graph)
        h = packet_hash(p)
        old = prev.get(p["candidate_id"])
        if old and old["candidate_sha256"] == h:
            p["version"], p["created_at"] = old["version"], old["created_at"]
        else:
            p["version"], p["created_at"] = (old["version"] + 1 if old else 1), leg["retrieved_at"]
            if old:
                p["supersedes_sha256"] = old["candidate_sha256"]
        p["candidate_sha256"] = h
        p["examiner"] = examine(p, reg, leg["retrieved_at"])
        p["state"] = STATE[p["examiner"]["structural_verdict"]]
        packets[p["candidate_id"]] = p
    del reg["_prev"]
    scope = {"journey": "Who authorized a named city decision, and what was the recorded vote?",
             "included": sorted(SUBSTANTIVE), "excluded": "Ceremonial resolutions, communications and agenda items (no authority chain to trace)",
             "as_of": leg["retrieved_at"], "history_as_of": place["retrieved_at"]}
    return {"registry": {"about": "Registered sources and per-record snapshots behind every claim anchor. Written by scripts/packets.py.",
                         "sources": {s["source_id"]: s for s in srcs.values()}, "snapshots": reg},
            "entities": {"about": "Entities the packets name, with how each was resolved. Written by scripts/packets.py.", "entities": ents},
            "packets": {"about": "Shadow candidates. Not public. Written by scripts/packets.py; approved by a person in approve.py; applied by commit.py.",
                        "scope": scope, "packets": packets}}


def summary(packets):
    from collections import Counter
    sv = Counter(p["examiner"]["structural_verdict"] for p in packets.values())
    cv = Counter(v for p in packets.values() for v in p["examiner"]["claim_verdicts"].values())
    es = Counter(c["evidence_state"] for p in packets.values() for c in p["claims"])
    return (f"{len(packets)} packets: " + ", ".join(f"{k} {v}" for k, v in sorted(sv.items())) + "\n"
            f"claims by verdict: " + ", ".join(f"{k} {v}" for k, v in sorted(cv.items())) + "\n"
            f"claims by evidence state: " + ", ".join(f"{k} {v}" for k, v in sorted(es.items())))


def write_out(out, bench_dir=None):
    P = paths(bench_dir)
    for k in ("registry", "entities", "packets"):
        write_json(P[k], out[k])
        with open(P[k], "rb") as f:
            print(f"wrote {os.path.relpath(P[k], ROOT)}  {sha(f.read())}")


def main():
    out = build()
    print(summary(out["packets"]["packets"]))
    if "--summary" not in sys.argv:
        write_out(out)


if __name__ == "__main__":
    main()
