#!/usr/bin/env python3
"""Acceptance cases for the Civic Intelligence Bench (Implementation v1, "Minimum acceptance cases").

  python scripts/test_bench.py

Each test builds a small fictitious record in a temporary folder, so nothing here touches data/ or
bench/. The names and files below are made up and must never be read as Cleveland facts.
"""
import copy, io, json, os, shutil, sys, tempfile, unittest
from contextlib import redirect_stdout

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import packets, approve, commit
from bench_common import paths, load_json, load_jsonl, write_json, packet_hash

NAMES = [f"{first} {last}" for first, last in zip(
    ["Ada", "Ben", "Cora", "Dev", "Eli", "Fay", "Gus", "Hana", "Ivo", "Jun", "Kai", "Lia", "Mo", "Nia", "Ozzie"],
    ["Amber", "Birch", "Cedar", "Dune", "Elm", "Fern", "Gale", "Heath", "Iris", "Jade", "Kelp", "Lark", "Moss", "Nettle", "Oak"])]
RETRIEVED = "2026-10-01T11:45:30+00:00"


def fixture(root, names=None, matters=None, histories=None, retrieved=RETRIEVED):
    names = names or NAMES
    title = "Oaths of Office for Members of Cleveland City Council, for 2026-2029 term.\r\n" + "\r\n".join(f"Ward {i} - {n}" for i, n in enumerate(names, 1))
    roster = {"id": 1, "file": "1-2026", "type": "Communication", "status": "Filed", "title": title, "intro": "2026-01-05", "passed": "2026-01-05",
              "url": "https://example.invalid/1", "sponsors": []}
    if matters is None:
        matters = [
            {"id": 27, "file": "27-2026", "type": "Emergency Ordinance", "status": "Passed", "title": "Example ordinance A", "intro": "2026-01-09",
             "passed": "2026-03-23", "url": "https://example.invalid/27", "sponsors": [names[8]]},
            {"id": 28, "file": "28-2026", "type": "Ordinance", "status": "In Committee", "title": "Example ordinance B", "intro": "2026-02-01",
             "passed": None, "url": "https://example.invalid/28", "sponsors": ["By Departmental Request"]},
        ]
    if histories is None:
        histories = {"27-2026": [["2026-01-12", "read and referred to administrative review", "City Council"],
                                 ["2026-03-10", "recommended for approval", "Safety Committee"],
                                 ["2026-03-23", "approved", "City Council"]]}
    data = os.path.join(root, "data")
    os.makedirs(data, exist_ok=True)
    write_json(os.path.join(data, "legistar-2026.json"), {"source": packets.LEGISTAR, "retrieved_at": retrieved, "count": 1 + len(matters), "matters": [roster] + matters})
    write_json(os.path.join(data, "place-2026.json"), {"retrieved_at": retrieved, "sources": {}, "histories": histories, "addresses": {}, "funds": {}})
    return data


def quiet(fn, *a, **kw):
    buf = io.StringIO()
    with redirect_stdout(buf):
        r = fn(*a, **kw)
    return r, buf.getvalue()


class Bench(unittest.TestCase):
    def setUp(self):
        self.root = tempfile.mkdtemp(prefix="cx-bench-test-")
        self.bench = os.path.join(self.root, "bench")
        self.P = paths(self.bench)
        self.data = fixture(self.root)

    def tearDown(self):
        shutil.rmtree(self.root, ignore_errors=True)

    def build(self, **kw):
        if kw:
            self.data = fixture(self.root, **kw)
        out, _ = quiet(packets.build, self.data, self.bench)
        quiet(packets.write_out, out, self.bench)
        return out["packets"]["packets"]

    def by_file(self, ps, f):
        return next(p for p in ps.values() if p["matter"]["file"] == f)

    def approve(self, *ids, reviewer="Test Reviewer", extra=()):
        return quiet(approve.main, ["--reviewer", reviewer, "--approve", *ids, "--reason", "test", "--no-dissent", *extra], self.bench)[1]

    def commit(self, dry=False):
        return quiet(commit.main, ["--dry-run"] if dry else [], self.bench)[1]

    # --- research and examination

    def test_quiet_night_keeps_hash_and_version(self):
        a1 = self.by_file(self.build(), "27-2026")
        self.assertEqual(a1["examiner"]["structural_verdict"], "MERGE")
        ms = copy.deepcopy(load_json(os.path.join(self.data, "legistar-2026.json"))["matters"][1:])
        ms[1]["title"] = "Example ordinance B, retitled"  # a change elsewhere in the source
        a2 = self.by_file(self.build(matters=ms, retrieved="2026-10-02T11:45:30+00:00"), "27-2026")
        self.assertEqual(a1["candidate_sha256"], a2["candidate_sha256"])
        self.assertEqual((a2["version"], a2["created_at"]), (1, RETRIEVED))

    def test_changed_record_makes_a_new_version(self):
        a1 = self.by_file(self.build(), "27-2026")
        ms = copy.deepcopy(load_json(os.path.join(self.data, "legistar-2026.json"))["matters"][1:])
        ms[0]["sponsors"].append(NAMES[2])
        a2 = self.by_file(self.build(matters=ms), "27-2026")
        self.assertNotEqual(a1["candidate_sha256"], a2["candidate_sha256"])
        self.assertEqual(a2["version"], 2)
        self.assertEqual(a2["supersedes_sha256"], a1["candidate_sha256"])

    def test_same_name_collision_is_quarantined(self):
        names = list(NAMES)
        names[3] = names[8]  # two wards, one name
        ms = copy.deepcopy(load_json(os.path.join(self.data, "legistar-2026.json"))["matters"][1:])
        ps = self.build(names=names, matters=ms)
        a = self.by_file(ps, "27-2026")
        self.assertEqual(a["examiner"]["structural_verdict"], "QUARANTINE")
        ents = load_json(self.P["entities"])["entities"]
        amb = [e for e in ents.values() if e["kind"] == "person" and e["resolution_state"] == "ambiguous"]
        self.assertEqual(len(amb), 3)  # both roster entries and the sponsor name stay separate
        self.assertEqual(len({e["entity_id"] for e in amb}), 3)

    def test_member_not_in_office_is_not_applicable(self):
        m = {"valid_from": "2026-01-05", "valid_to": "2026-06-30"}
        self.assertEqual(packets.member_vote_state(m, "2026-09-01")["state"], "not_applicable")
        self.assertIn("2026-06-30", packets.member_vote_state(m, "2026-09-01")["reason"])
        self.assertEqual(packets.member_vote_state(m, "2026-03-01")["state"], "missing")
        self.assertNotIn("abstain", packets.member_vote_state(m, "2026-03-01")["reason"])

    def test_roll_call_is_missing_and_sponsorship_is_not_a_vote(self):
        a = self.by_file(self.build(), "27-2026")
        roll = [c for c in a["claims"] if c["predicate"] == "roll_call"]
        self.assertEqual(len(roll), 1)
        self.assertEqual(roll[0]["evidence_state"], "missing")
        self.assertEqual(len(roll[0]["member_states"]["missing"]), 15)
        self.assertEqual(roll[0]["member_states"]["not_applicable"], {})
        for e in a["edges"]:
            preds = {c["predicate"] for c in a["claims"] if c["claim_id"] in e["claim_ids"]}
            if "sponsored" in preds:
                self.assertEqual(e["relationship_type"], "sponsorship")
            if e["relationship_type"] == "vote":
                self.assertEqual(a["nodes"][e["subject_id"]]["kind"], "body")
        self.assertEqual(sorted(e["relationship_type"] for e in a["edges"]), ["sponsorship", "vote", "vote"])

    def test_examiner_blocks_illegal_edges_and_verified_roll_calls(self):
        a = copy.deepcopy(self.by_file(self.build(), "27-2026"))
        reg = load_json(self.P["registry"])["snapshots"]
        bad = copy.deepcopy(a)
        for e in bad["edges"]:
            if e["relationship_type"] == "sponsorship":
                e["relationship_type"] = "vote"
        self.assertEqual(packets.examine(bad, reg, RETRIEVED)["structural_verdict"], "BLOCK")
        bad = copy.deepcopy(a)
        for c in bad["claims"]:
            if c["predicate"] == "roll_call":
                c["evidence_state"] = "verified"
        self.assertEqual(packets.examine(bad, reg, RETRIEVED)["structural_verdict"], "BLOCK")
        bad = copy.deepcopy(a)
        bad["edges"][0]["relationship_type"] = "ownership_by_proximity"
        self.assertEqual(packets.examine(bad, reg, RETRIEVED)["structural_verdict"], "BLOCK")
        bad = copy.deepcopy(a)
        bad["claims"][0]["anchors"] = []
        self.assertEqual(packets.examine(bad, reg, RETRIEVED)["structural_verdict"], "BLOCK")

    def test_unresolved_person_and_contested_claim_need_a_human(self):
        ms = copy.deepcopy(load_json(os.path.join(self.data, "legistar-2026.json"))["matters"][1:])
        ms[1]["sponsors"] = ["Pat Example"]
        ps = self.build(matters=ms)
        self.assertEqual(self.by_file(ps, "28-2026")["examiner"]["structural_verdict"], "HUMAN_REQUIRED")
        a = copy.deepcopy(self.by_file(ps, "27-2026"))
        a["claims"][1]["evidence_state"] = "contested"
        self.assertEqual(packets.examine(a, load_json(self.P["registry"])["snapshots"], RETRIEVED)["structural_verdict"], "HUMAN_REQUIRED")

    def test_passed_date_without_matching_action_is_partial(self):
        ps = self.build(histories={"27-2026": [["2026-03-20", "approved", "City Council"]]})
        passed = [c for c in self.by_file(ps, "27-2026")["claims"] if c["predicate"] == "passed"][0]
        self.assertEqual(passed["evidence_state"], "partial")

    def test_unknown_action_dated_before_introduction_is_blocked(self):
        ps = self.build(histories={"27-2026": [["2025-12-01", "approved", "City Council"]]})
        self.assertEqual(self.by_file(ps, "27-2026")["examiner"]["structural_verdict"], "BLOCK")

    # --- approval and commit

    def test_approve_commit_replay(self):
        ps = self.build()
        a = self.by_file(ps, "27-2026")
        self.assertIn("1 of 1", self.approve(a["candidate_id"]))
        self.assertIn("1 committed", self.commit())
        with open(self.P["graph"], "rb") as f:
            g1 = f.read()
        self.assertIn("0 committed", self.commit())
        with open(self.P["graph"], "rb") as f:
            self.assertEqual(g1, f.read())
        graph = load_json(self.P["graph"])
        self.assertEqual(graph["graph_version"], 1)
        law = next(r for r in graph["records"].values() if r["type"] == "law")
        self.assertIn(NAMES[8], law["plain_summary"])
        self.assertIn("A missing record is not a no.", law["plain_summary"])
        self.assertNotIn("abstain", law["plain_summary"].lower())
        self.assertEqual(law["evidence_state"], "partial")
        self.assertTrue(all(r["revision_id"].startswith("rev_") for r in graph["records"].values()))
        # a rebuild after the commit sees the precondition, keeps the hash, and commit has nothing to do
        ps2 = self.build()
        a2 = self.by_file(ps2, "27-2026")
        self.assertEqual(a2["candidate_sha256"], a["candidate_sha256"])
        self.assertEqual(a2["graph_precondition"][law["id"]], law["revision_id"])
        self.assertIn("0 committed, 0 refused", self.commit())

    def test_changed_packet_invalidates_approval(self):
        a = self.by_file(self.build(), "27-2026")
        self.approve(a["candidate_id"])
        ms = copy.deepcopy(load_json(os.path.join(self.data, "legistar-2026.json"))["matters"][1:])
        ms[0]["title"] = "Example ordinance A, amended title"
        self.build(matters=ms)
        out = self.commit()
        self.assertIn("approval_mismatch", out)
        self.assertFalse(os.path.exists(self.P["graph"]))
        self.assertEqual(load_jsonl(self.P["receipts"])[0]["result"], "refused")

    def test_rejected_and_expired_never_commit(self):
        a = self.by_file(self.build(), "27-2026")
        quiet(approve.main, ["--reviewer", "R", "--reject", a["candidate_id"], "--reason", "no"], self.bench)
        self.assertIn("0 committed, 0 refused", self.commit())
        self.approve(a["candidate_id"], extra=("--expires-hours", "-1"))
        self.assertIn("expired", self.commit())
        self.assertFalse(os.path.exists(self.P["graph"]))

    def test_blocked_cannot_be_approved_and_approval_needs_dissent_record(self):
        ps = self.build(histories={"27-2026": [["2025-12-01", "approved", "City Council"]]})
        a = self.by_file(ps, "27-2026")
        self.assertIn("skip", self.approve(a["candidate_id"]))
        self.assertEqual(load_jsonl(self.P["approvals"]), [])
        with self.assertRaises(SystemExit):
            quiet(approve.main, ["--reviewer", "R", "--approve", a["candidate_id"], "--reason", "x"], self.bench)
        with self.assertRaises(SystemExit):
            quiet(approve.main, ["--approve", a["candidate_id"], "--reason", "x", "--no-dissent"], self.bench)

    def test_human_required_can_be_approved_with_a_reason(self):
        ms = copy.deepcopy(load_json(os.path.join(self.data, "legistar-2026.json"))["matters"][1:])
        ms[1]["sponsors"] = ["Pat Example"]
        b = self.by_file(self.build(matters=ms), "28-2026")
        self.assertIn("1 of 1", self.approve(b["candidate_id"]))
        self.assertIn("1 committed", self.commit())
        person = next(r for r in load_json(self.P["graph"])["records"].values() if r["type"] == "person")
        self.assertEqual(person["evidence_state"], "partial")

    def test_precondition_and_scope_are_enforced(self):
        a = self.by_file(self.build(), "27-2026")
        self.approve(a["candidate_id"])
        law_id = next(i for i, n in a["nodes"].items() if n["kind"] == "law")
        write_json(self.P["graph"], {"graph_version": 7, "as_of": None, "records": {law_id: {"id": law_id, "revision_id": "rev_someoneelse"}}})
        self.assertIn("precondition_failed", self.commit())
        os.remove(self.P["graph"])
        lines = load_jsonl(self.P["approvals"])
        lines[-1]["scope"] = lines[-1]["scope"][:-1]
        with open(self.P["approvals"], "w", encoding="utf-8", newline="\n") as f:
            f.write("".join(json.dumps(l, sort_keys=True) + "\n" for l in lines))
        self.assertIn("scope_mismatch", self.commit())

    def test_all_merge_skips_decided_and_non_merge(self):
        ms = copy.deepcopy(load_json(os.path.join(self.data, "legistar-2026.json"))["matters"][1:])
        ms[1]["sponsors"] = ["Pat Example"]
        self.build(matters=ms)
        out = quiet(approve.main, ["--reviewer", "R", "--approve", "--all-merge", "--reason", "ok", "--no-dissent"], self.bench)[1]
        self.assertIn("1 of 1", out)
        with self.assertRaises(SystemExit):
            quiet(approve.main, ["--reviewer", "R", "--approve", "--all-merge", "--reason", "ok", "--no-dissent"], self.bench)

    def test_hash_covers_claims_edges_and_label_only(self):
        a = self.by_file(self.build(), "27-2026")
        b = copy.deepcopy(a)
        b["graph_precondition"] = {"x": "rev_y"}
        b["examiner"]["structural_verdict"] = "BLOCK"
        self.assertEqual(packet_hash(a), packet_hash(b))
        b["claims"][0]["statement"] += " (changed)"
        self.assertNotEqual(packet_hash(a), packet_hash(b))


if __name__ == "__main__":
    unittest.main(verbosity=1)
