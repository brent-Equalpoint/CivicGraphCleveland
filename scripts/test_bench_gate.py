#!/usr/bin/env python3
"""Tests for the Bench's approval gate and the features around it.

  python scripts/test_bench_gate.py

Covers: Legistar person IDs, the Skeptic's veto, signed approvals and who may sign, tampering,
the evidence copies, member-by-member votes, and the status file. Every name, key, file number,
and address here is made up. Nothing touches data/ or bench/.
"""
import copy, json, os, shutil, sys, tempfile, unittest
from unittest import mock

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import approve, commit, corrections, packets
from bench_common import paths, load_json, load_jsonl, write_json, canon, sha
from test_bench import fixture, quiet, NAMES, RETRIEVED

KEY = "a-test-key-that-is-not-a-secret"
ENV = {"GITHUB_ACTIONS": "true", "GITHUB_ACTOR": "alice", "GITHUB_RUN_ID": "42", "GITHUB_REPOSITORY": "x/y", "BENCH_APPROVAL_KEY": KEY}


def people(names, mayor=("Max Mayor", 900)):
    ppl = [{"person_id": 101 + i, "name": n, "title": "Council Member", "body": "City Council", "start": "2026-01-05", "end": "2029-12-31"} for i, n in enumerate(names)]
    ppl.insert(0, {"person_id": mayor[1], "name": mayor[0], "title": "Mayor", "body": "Sponsors - Mayor", "start": "2026-01-05", "end": "2029-12-31"})
    return {"source": "x", "retrieved_at": RETRIEVED, "count": len(ppl), "people": ppl}


def matters(**over):
    a = {"id": 27, "file": "27-2026", "type": "Emergency Ordinance", "status": "Passed", "title": "Example ordinance A", "intro": "2026-01-09",
         "passed": "2026-03-23", "url": "https://example.invalid/27", "sponsors": [NAMES[8]], "sponsor_ids": [109]}
    a.update(over)
    return [a]


HIST = {"27-2026": [["2026-01-12", "read and referred to administrative review", "City Council"], ["2026-03-10", "recommended for approval", "Safety Committee"],
                    ["2026-03-23", "approved", "City Council"]]}


class Gate(unittest.TestCase):
    def setUp(self):
        self.root = tempfile.mkdtemp(prefix="cx-gate-test-")
        self.bench = os.path.join(self.root, "bench")
        self.P = paths(self.bench)
        self.data = fixture(self.root, matters=matters(), histories=copy.deepcopy(HIST))
        write_json(os.path.join(self.data, "people-2026.json"), people(NAMES))
        write_json(self.P["reviewers"], {"people": [{"github": "alice", "roles": ["reviewer", "publisher"]}, {"github": "bob", "roles": ["reviewer"]}]})

    def tearDown(self):
        shutil.rmtree(self.root, ignore_errors=True)

    def build(self, **fx):
        if fx:
            ppl = fx.pop("_people", None)
            self.data = fixture(self.root, **fx)
            write_json(os.path.join(self.data, "people-2026.json"), ppl or people(NAMES))
        out, _ = quiet(packets.build, self.data, self.bench)
        quiet(packets.write_out, out, self.bench)
        return out["packets"]["packets"]

    def only(self, ps, f="27-2026"):
        return next(p for p in ps.values() if p["matter"]["file"] == f)

    def approve_signed(self, actor, *ids, extra=()):
        env = dict(ENV, GITHUB_ACTOR=actor)
        with mock.patch.dict(os.environ, env):
            return quiet(approve.main, ["--actions", "--approve", *ids, "--reason", "ok", "--no-dissent", *extra], self.bench)[1]

    def commit(self, env=None, extra=()):
        with mock.patch.dict(os.environ, env if env is not None else {"BENCH_APPROVAL_KEY": KEY}, clear=False):
            return quiet(commit.main, list(extra), self.bench)[1]

    # ---- Legistar person IDs
    def test_mayor_resolves_by_id_and_a_stranger_does_not(self):
        ms = matters(sponsors=["Max Mayor"], sponsor_ids=[900])
        ps = self.build(matters=ms, histories=copy.deepcopy(HIST), _people=people(NAMES))
        p = self.only(ps)
        self.assertEqual(p["examiner"]["structural_verdict"], "MERGE")
        mayor = next(n for n in p["nodes"].values() if n["kind"] == "person")
        self.assertEqual(mayor["office"], "Mayor of Cleveland")
        self.assertEqual(mayor["canonical_identifier"], "legistar:cityofcleveland:person:900")
        no_ids = self.build(matters=matters(sponsors=["Max Mayor"], sponsor_ids=[]), histories=copy.deepcopy(HIST), _people=people(NAMES))
        self.assertEqual(self.only(no_ids)["examiner"]["structural_verdict"], "HUMAN_REQUIRED")  # no ID: only a name, so a person must look

    def test_id_that_contradicts_the_name_is_quarantined_and_vetoed(self):
        ps = self.build(matters=matters(sponsors=[NAMES[8]], sponsor_ids=[101]), histories=copy.deepcopy(HIST), _people=people(NAMES))  # 101 is NAMES[0]
        p = self.only(ps)
        self.assertEqual(p["examiner"]["structural_verdict"], "QUARANTINE")
        self.assertTrue(p["skeptic"]["veto"])
        self.assertIn("ambiguous", " ".join(p["skeptic"]["veto_reasons"]))

    def test_members_carry_their_legistar_person_id(self):
        p = self.only(self.build())
        mem = next(n for n in p["nodes"].values() if n["kind"] == "person")
        self.assertEqual(mem["canonical_identifier"], "legistar:cityofcleveland:person:109")

    # ---- the Skeptic
    def tabled_after_passing(self):
        h = copy.deepcopy(HIST)
        h["27-2026"].append(["2026-03-30", "tabled", "City Council"])
        return self.build(matters=matters(), histories=h, _people=people(NAMES))

    def test_skeptic_vetoes_a_record_that_contradicts_itself(self):
        p = self.only(self.tabled_after_passing())
        self.assertTrue(p["skeptic"]["veto"])
        self.assertIn("Passed", p["skeptic"]["veto_reasons"][0])
        self.assertIn("not a no", " ".join(p["skeptic"]["dissent"]))  # it always says the roll call is missing, and that missing is not a no

    def test_veto_blocks_approval_until_overridden_in_writing(self):
        p = self.only(self.tabled_after_passing())
        out = quiet(approve.main, ["--reviewer", "R", "--approve", p["candidate_id"], "--reason", "x", "--no-dissent"], self.bench)[1]
        self.assertIn("vetoed it", out)
        self.assertEqual(load_jsonl(self.P["approvals"]), [])
        quiet(approve.main, ["--reviewer", "R", "--approve", p["candidate_id"], "--reason", "x", "--no-dissent", "--override-veto", "Council re-passed it; the history is behind"], self.bench)
        rec = load_jsonl(self.P["approvals"])[0]
        self.assertTrue(rec["skeptic_review"]["veto_overridden"])
        self.assertIn("re-passed", rec["skeptic_review"]["override_reason"])
        # a record edited to drop the override is refused at commit
        rec["skeptic_review"]["veto_overridden"] = False
        with open(self.P["approvals"], "w", encoding="utf-8", newline="\n") as f:
            f.write(json.dumps(rec, sort_keys=True) + "\n")
        self.assertIn("vetoed", self.commit(env={}, extra=("--allow-unattested",)))

    def test_all_merge_skips_vetoed_packets(self):
        self.tabled_after_passing()
        with self.assertRaises(SystemExit) as c:  # the only packet is vetoed, so "approve everything clean" has nothing to approve
            quiet(approve.main, ["--reviewer", "R", "--approve", "--all-merge", "--reason", "x", "--no-dissent"], self.bench)
        self.assertIn("nothing to approve", str(c.exception))
        self.assertEqual(load_jsonl(self.P["approvals"]), [])

    # ---- signing, and who may sign
    def test_signed_approval_publishes_and_names_the_reviewer(self):
        p = self.only(self.build())
        self.assertIn("1 of 1", self.approve_signed("alice", p["candidate_id"]))
        rec = load_jsonl(self.P["approvals"])[0]
        self.assertEqual(rec["reviewer_id"], "alice")
        self.assertEqual(rec["identity"]["method"], "github-actions")
        self.assertTrue(rec["attestation"]["hmac"])
        self.assertIn("1 committed", self.commit())
        pub = load_json(self.P["public"])
        self.assertEqual(pub["count"], 1)
        r = pub["records"]["27-2026"]
        self.assertEqual(r["reviewed"]["by"], "alice")
        self.assertTrue(r["reviewed"]["signed"])
        self.assertTrue(r["reviewed"]["no_dissent"])
        self.assertIn("A missing record is not a no", r["summary"])
        self.assertTrue(r["sources"] and all(s["url"].startswith("https://example.invalid") for s in r["sources"]))

    def test_a_reviewer_cannot_approve_and_a_stranger_cannot_decide(self):
        p = self.only(self.build())
        with self.assertRaises(SystemExit) as c:
            self.approve_signed("bob", p["candidate_id"])
        self.assertIn("not a publisher", str(c.exception))
        with self.assertRaises(SystemExit) as c:
            self.approve_signed("mallory", p["candidate_id"])
        self.assertIn("not in bench/reviewers.json", str(c.exception))
        self.assertEqual(load_jsonl(self.P["approvals"]), [])
        with mock.patch.dict(os.environ, dict(ENV, GITHUB_ACTOR="bob")):  # a reviewer may reject
            quiet(approve.main, ["--actions", "--reject", p["candidate_id"], "--reason", "wrong"], self.bench)
        self.assertEqual(load_jsonl(self.P["approvals"])[0]["decision"], "rejected")

    def test_the_workflow_flag_does_nothing_outside_the_workflow(self):
        p = self.only(self.build())
        with mock.patch.dict(os.environ, {"GITHUB_ACTIONS": "", "GITHUB_ACTOR": "", "BENCH_APPROVAL_KEY": ""}, clear=False):
            with self.assertRaises(SystemExit):
                quiet(approve.main, ["--actions", "--approve", p["candidate_id"], "--reason", "x", "--no-dissent"], self.bench)

    def test_tampering_with_a_signed_decision_is_refused(self):
        p = self.only(self.build())
        self.approve_signed("alice", p["candidate_id"])
        rec = load_jsonl(self.P["approvals"])[0]
        rec["reviewer_id"] = "someone-else"  # change who approved it
        with open(self.P["approvals"], "w", encoding="utf-8", newline="\n") as f:
            f.write(json.dumps(rec, sort_keys=True) + "\n")
        out = self.commit()
        self.assertIn("unattested", out)
        self.assertFalse(os.path.exists(self.P["graph"]))

    def test_an_unsigned_decision_is_refused_where_a_key_exists_or_where_none_does(self):
        p = self.only(self.build())
        quiet(approve.main, ["--reviewer", "typed name", "--approve", p["candidate_id"], "--reason", "x", "--no-dissent"], self.bench)
        self.assertIn("unattested", self.commit())  # with the key: not signed
        self.assertIn("unattested", self.commit(env={"BENCH_APPROVAL_KEY": ""}))  # with no key and no flag: nothing can be verified
        self.assertFalse(os.path.exists(self.P["graph"]))

    def test_a_refusal_is_logged_once_not_every_night(self):
        p = self.only(self.build())
        quiet(approve.main, ["--reviewer", "typed name", "--approve", p["candidate_id"], "--reason", "x", "--no-dissent"], self.bench)
        for _ in range(3):
            self.commit()
        self.assertEqual(len([r for r in load_jsonl(self.P["receipts"]) if r["result"] == "refused"]), 1)

    def test_a_changed_packet_invalidates_a_signed_approval(self):
        p = self.only(self.build())
        self.approve_signed("alice", p["candidate_id"])
        self.build(matters=matters(title="Retitled after approval"), histories=copy.deepcopy(HIST), _people=people(NAMES))
        self.assertIn("approval_mismatch", self.commit())

    # ---- evidence kept, status reported
    def test_the_exact_approved_source_records_are_kept(self):
        p = self.only(self.build())
        self.approve_signed("alice", p["candidate_id"])
        self.commit()
        rec = load_jsonl(self.P["receipts"])[0]
        self.assertTrue(rec["evidence"])
        for sid in rec["evidence"]:
            e = load_json(os.path.join(self.P["evidence"], sid + ".json"))
            self.assertEqual(sha(canon(e["body"])), e["content_sha256"])  # the kept copy matches the hash the reviewer saw

    def test_status_file_counts_what_is_waiting(self):
        ps = self.build()
        st = load_json(self.P["status"])
        self.assertEqual(st["packets"], 1)
        self.assertEqual(st["counts"]["awaiting_review"], 1)
        p = self.only(ps)
        self.approve_signed("alice", p["candidate_id"])
        self.build()
        self.assertEqual(load_json(self.P["status"])["counts"]["approved_current"], 1)
        self.build(matters=matters(title="changed"), histories=copy.deepcopy(HIST), _people=people(NAMES))
        st = load_json(self.P["status"])
        self.assertEqual(st["counts"]["approved_stale"], 1)  # approved an older version: needs a person again
        self.assertEqual(st["files"]["approved_stale"], ["27-2026"])

    # ---- member-by-member votes, when a source is registered
    def votes(self, drop=None, forged_elsewhere=False):
        members = {n: "yea" for n in NAMES}
        members[NAMES[3]] = "nay"
        if drop:
            members.pop(drop)
        return {"source": "a made-up roll call source", "retrieved_at": RETRIEVED,
                "votes": {"27-2026": {"date": "2026-03-23", "question": "Passage", "members": members,
                                      "anchor": {"url": "https://example.invalid/roll/27", "locator": "page 2, roll call on 27-2026"}}}}

    def test_a_complete_roll_call_becomes_verified_member_votes(self):
        write_json(os.path.join(self.data, "votes-2026.json"), self.votes())
        p = self.only(self.build())
        roll = next(c for c in p["claims"] if c["predicate"] == "roll_call")
        self.assertEqual(roll["evidence_state"], "verified")
        self.assertEqual(len(roll["member_states"]["recorded"]), 15)
        self.assertEqual(sum(1 for e in p["edges"] if e["relationship_type"] == "vote" and p["nodes"][e["subject_id"]]["kind"] == "person"), 15)
        self.assertEqual(p["examiner"]["structural_verdict"], "MERGE")
        self.approve_signed("alice", p["candidate_id"])
        self.commit()
        mv = load_json(self.P["public"])["records"]["27-2026"]["member_votes"]
        self.assertEqual(len(mv), 15)
        self.assertEqual([v["vote"] for v in mv].count("nay"), 1)
        self.assertEqual(mv[0]["ward"], 1)

    def test_a_member_missing_from_the_roll_call_is_missing_not_a_no(self):
        write_json(os.path.join(self.data, "votes-2026.json"), self.votes(drop=NAMES[5]))
        p = self.only(self.build())
        roll = next(c for c in p["claims"] if c["predicate"] == "roll_call")
        self.assertEqual(roll["evidence_state"], "partial")
        self.assertEqual(len(roll["member_states"]["missing"]), 1)
        self.assertEqual(len(roll["member_states"]["recorded"]), 14)
        self.assertNotIn("nay", [c["predicate"] for c in p["claims"] if "voted_" in c["predicate"] and NAMES[5] in c["statement"]])

    def test_a_member_vote_that_does_not_rest_on_the_roll_call_source_is_blocked(self):
        write_json(os.path.join(self.data, "votes-2026.json"), self.votes())
        p = copy.deepcopy(self.only(self.build()))
        reg = load_json(self.P["registry"])["snapshots"]
        other = next(sid for sid, s in reg.items() if s["source_id"] != packets.VOTES_SOURCE_ID)
        for c in p["claims"]:
            if c["predicate"].startswith("voted_"):
                c["anchors"] = [{"snapshot_id": other, "locator": "histories", "url": "https://example.invalid/27"}]
        self.assertEqual(packets.examine(p, reg, RETRIEVED)["structural_verdict"], "BLOCK")


class Corrections(unittest.TestCase):
    def setUp(self):
        self.root = tempfile.mkdtemp(prefix="cx-corr-test-")
        self.bench = os.path.join(self.root, "bench")
        self.P = paths(self.bench)
        write_json(self.P["reviewers"], {"people": [{"github": "alice", "roles": ["reviewer", "publisher"], "name": "Alice Example"}]})

    def tearDown(self):
        shutil.rmtree(self.root, ignore_errors=True)

    def rec(self, *extra, env=None):
        base = ["--issue", "7", "--disposition", "confirmed", "--page", "Profile of Ward 8", "--note", "The record shows a different date."]
        with mock.patch.dict(os.environ, env or {"BENCH_APPROVAL_KEY": ""}):
            return quiet(corrections.main, base + list(extra), self.bench)[1]

    def test_a_decision_is_listed_and_names_no_reporter(self):
        self.rec("--reviewer", "typed")
        pub = load_json(self.P["corrections_public"])
        self.assertEqual((pub["count"], pub["confirmed"]), (1, 1))
        self.assertEqual(pub["corrections"][0]["issue"], 7)
        self.assertEqual(sorted(pub["corrections"][0]), ["by", "decided_at", "disposition", "duplicate_of", "issue", "note", "packet", "page", "url"])  # nothing about the reporter is kept

    def test_the_latest_decision_on_an_issue_wins(self):
        self.rec("--reviewer", "typed")
        quiet(corrections.main, ["--issue", "7", "--disposition", "unconfirmed", "--page", "Profile of Ward 8", "--note", "On a second look the official record agrees with the app.", "--reviewer", "typed"], self.bench)
        pub = load_json(self.P["corrections_public"])
        self.assertEqual((pub["count"], pub["confirmed"]), (1, 0))
        self.assertEqual(pub["corrections"][0]["disposition"], "unconfirmed")

    def test_personal_details_in_a_public_note_are_refused(self):
        for bad in ("Call me at 216-555-0100", "email pat@example.com about it"):
            with self.assertRaises(SystemExit):
                quiet(corrections.main, ["--issue", "8", "--disposition", "confirmed", "--page", "x", "--note", bad, "--reviewer", "t"], self.bench)
        self.assertEqual(load_jsonl(self.P["corrections"]), [])

    def test_in_the_workflow_only_signed_entries_from_listed_people_count(self):
        env = dict(ENV, GITHUB_ACTOR="alice")
        self.rec("--actions", env=env)
        entry = load_jsonl(self.P["corrections"])[0]
        self.assertTrue(entry["attestation"]["hmac"])
        self.assertEqual(load_json(self.P["corrections_public"])["corrections"][0]["by"], "Alice Example")
        with self.assertRaises(SystemExit):  # not in bench/reviewers.json
            self.rec("--actions", env=dict(ENV, GITHUB_ACTOR="mallory"))
        entry["note"] = "tampered"  # an edited entry no longer counts where the key exists
        with open(self.P["corrections"], "w", encoding="utf-8", newline="\n") as f:
            f.write(json.dumps(entry, sort_keys=True) + "\n")
        with mock.patch.dict(os.environ, {"BENCH_APPROVAL_KEY": KEY}):
            self.assertEqual(corrections.public_list(self.P, KEY)["count"], 0)

    def test_a_duplicate_names_its_original(self):
        with self.assertRaises(SystemExit):
            quiet(corrections.main, ["--issue", "9", "--disposition", "duplicate", "--page", "x", "--note", "Already reported.", "--reviewer", "t"], self.bench)


if __name__ == "__main__":
    unittest.main(verbosity=1)
