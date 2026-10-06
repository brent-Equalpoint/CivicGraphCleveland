#!/usr/bin/env python3
"""Tests for what each committee handles (docs/plan-explain-committees-and-seats.md): the official words in data/us-explainers-2026.json,
how scripts/fetch_explainers.py reads them, and (from phase 3) our plain lines in ext/cx-us-text.jsx.

  python scripts/test_us_explainers.py

No network. The made-up pages below stand for the real sources; the data tests read the files in the repository.
"""
import copy, json, os, re, sys, unittest

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, ".."))
sys.path.insert(0, HERE)
import fetch_explainers as fx
import us_explainer_config as C

LAND = json.load(open(os.path.join(ROOT, "data", "us-landscape-2026.json"), encoding="utf-8"))
DATA = json.load(open(os.path.join(ROOT, "data", "us-explainers-2026.json"), encoding="utf-8"))


class TheFile(unittest.TestCase):
    """data/us-explainers-2026.json against the federal record it explains."""

    def test_the_file_passes_its_own_checks(self):
        self.assertEqual(fx.check(DATA, LAND), [])

    def test_every_committee_and_subcommittee_in_the_record_has_a_row_and_no_row_is_extra(self):
        ids = {c["id"] for c in LAND["committees"]} | {s["id"] for c in LAND["committees"] for s in c["subcommittees"]}
        self.assertEqual(set(DATA["committees"]), ids)
        self.assertEqual(len([r for r in DATA["committees"].values() if r["kind"] == "committee"]), len(LAND["committees"]))
        self.assertEqual(len([r for r in DATA["committees"].values() if r["kind"] == "subcommittee"]), sum(len(c["subcommittees"]) for c in LAND["committees"]))

    def test_a_row_has_official_text_with_its_source_or_says_none_on_file(self):
        for k, r in DATA["committees"].items():
            if r.get("text"):
                self.assertTrue(r["text"].strip(), k)
                for f in ("source", "url", "cite", "pulled"):
                    self.assertTrue(r.get(f), f"{k} has text but no {f}")
                self.assertIn(r["source"], DATA["sources"], k)
                self.assertTrue(r["url"].startswith("https://"), k)
            else:
                self.assertIsNone(r.get("text"), k)
                self.assertEqual(r.get("note"), "No description on file", k)
                self.assertTrue(r.get("checked"), f"{k} says none on file but not what was checked")

    def test_every_row_is_for_the_congress_in_the_record(self):
        self.assertEqual(DATA["congress"], LAND["congress"])
        self.assertTrue(all(r["congress"] == LAND["congress"] for r in DATA["committees"].values()))

    def test_every_role_word_in_the_record_has_a_note_with_official_words(self):
        words = {x["role"] for m in LAND["members"] for x in m["committees"]}
        covered = {w: k for k, v in DATA["roles"].items() for w in v["words"]}
        self.assertEqual(sorted(w for w in words if w not in covered), [])
        for k, v in DATA["roles"].items():
            self.assertTrue(any(t.get("text") for t in v["texts"]), k)
            for t in v["texts"]:
                if t.get("text"):
                    self.assertTrue(t["url"].startswith("https://") and t["cite"] and t["pulled"], k)

    def test_each_step_of_a_committees_work_has_official_words(self):
        self.assertEqual(sorted(DATA["process"]), sorted(["referral", "hearing", "markup", "report", "floor"]))
        for k, v in DATA["process"].items():
            self.assertTrue(any(t.get("text") for t in v), k)

    def test_the_chamber_rules_give_every_standing_committee_its_subjects(self):
        rows = DATA["committees"]
        for k, spec in C.COMMITTEES.items():
            if spec[0] == "rule_x":
                self.assertRegex(rows[k]["cite"], r"^House Rule X, clause 1\([a-z]\)$", k)
                self.assertTrue(rows[k]["text"].startswith(f"Committee on {spec[1]}."), k)
            if spec[0] == "rule_xxv":
                self.assertRegex(rows[k]["cite"], r"^Senate Rule XXV, paragraph 1\([a-z]\)$", k)
                self.assertIn(f"Committee on {spec[1]}, to which committee shall be referred", rows[k]["text"], k)
        self.assertIn("Revenue measures generally", rows["HSWM"]["text"])
        self.assertIn("Food stamp programs", rows["SSAF"]["text"])

    def test_official_text_has_no_em_or_en_dash_and_no_page_markers(self):
        for k, r in DATA["committees"].items():
            self.assertNotRegex(r.get("text") or "", "[–—]|\\[\\[Page", k)

    def test_the_counts_add_up(self):
        n = DATA["counts"]
        self.assertEqual(n["with_text"] + n["none_on_file"], n["committees"] + n["subcommittees"])
        self.assertEqual(n["with_text"], sum(1 for r in DATA["committees"].values() if r.get("text")))


RULES = """<html><body><pre>
Committees and their legislative jurisdictions
  1. <<NOTE: \x06714. Number and jurisdiction of standing
committees.>> There shall be in the House the following standing
committees, each of which shall have the jurisdiction. All bills shall be
referred to those committees, as follows:

  Annotation about history (IV, 4149).

  (a) Committee on Agriculture.
      (1) <<NOTE: Sec. 715. Agriculture.>> Adulteration of seeds, insect
pests, and protection of birds.
      (2) Agriculture generally.

  This committee was established in 1820 (IV, 4149).

  (b) Committee on Ethics.
  The Code of Official Conduct.

  Annotation.
Temporary absence of chair
  (d) A member of the majority party on each standing committee or
subcommittee thereof shall be designated by the chair of the full
committee as the vice chair.

  Paragraphs (b), (c), and (d) were first adopted in 1931.
</pre></body></html>"""

SENATE = 'x = [{"question":"STANDING COMMITTEES\\r\\n","answer":"<ol><li><p>The following standing committees shall be appointed:</p><ol><li><p><strong>(1)</strong> <strong>Committee on Agriculture, Nutrition, and Forestry,</strong> to which committee shall be referred all proposed legislation relating primarily to the following subjects:</p><ol><li>Agricultural economics and research.</li><li>Individuals with disabilities. 15</li></ol><p><strong>(2)</strong> Such committee shall also study food.</p></li><li><p><strong>(1) 12 Committee on the Budget</strong>, to which committee shall be referred all concurrent resolutions on the budget.</p></li></ol><p><strong>(2) 20</strong> Except as otherwise provided by paragraph 4 of this rule, each committee:</p></li></ol>"}]'


class Reading(unittest.TestCase):
    """How official pages become rows: no network, made-up pages in the real shapes."""

    def test_house_rule_x_gives_a_committees_numbered_subjects_without_the_notes(self):
        t, cite = fx.rule_x(fx.manual_text(RULES), "Agriculture")
        self.assertEqual(cite, "House Rule X, clause 1(a)")
        self.assertEqual(t, "Committee on Agriculture.\n(1) Adulteration of seeds, insect pests, and protection of birds.\n(2) Agriculture generally.")
        t, cite = fx.rule_x(fx.manual_text(RULES), "Ethics")
        self.assertEqual(t, "Committee on Ethics.\nThe Code of Official Conduct.")
        self.assertEqual(fx.rule_x(fx.manual_text(RULES), "Rules"), (None, None))

    def test_a_rule_passage_stops_where_the_parliamentarians_notes_begin(self):
        mt = fx.manual_text(RULES)
        self.assertEqual(fx.cut(mt, r"\(d\) (?=A member of the majority party)", r"\n\n"), "A member of the majority party on each standing committee or subcommittee thereof shall be designated by the chair of the full committee as the vice chair.")
        self.assertNotIn("NOTE", mt)

    def test_senate_rule_xxv_gives_a_committees_subjects_and_drops_note_numbers(self):
        st = fx.senate_rule_text(SENATE, "STANDING COMMITTEES")
        t, cite = fx.rule_xxv(st, "Agriculture, Nutrition, and Forestry")
        self.assertEqual(cite, "Senate Rule XXV, paragraph 1(a)")
        self.assertIn("Individuals with disabilities.\n(2) Such committee shall also study food.", t)
        self.assertNotIn("Budget", t)
        t, cite = fx.rule_xxv(st, "the Budget")
        self.assertEqual((t, cite), ("(1) Committee on the Budget, to which committee shall be referred all concurrent resolutions on the budget.", "Senate Rule XXV, paragraph 1(b)"))

    def test_a_passage_with_a_missing_marker_gives_nothing_rather_than_the_wrong_text(self):
        text = "Jurisdiction\nIt handles farms.\nMembers\nA. Person"
        self.assertEqual(fx.cut(text, r"Jurisdiction\n", r"\nMembers"), "It handles farms.")
        self.assertIsNone(fx.cut(text, r"Responsibilities\n", r"\nMembers"))
        self.assertIsNone(fx.cut(text, r"Jurisdiction\n", r"\nHearings"))

    def test_lines_broken_inside_a_sentence_are_joined_and_items_keep_their_own_line(self):
        self.assertEqual(fx.flow("The subcommittee shall have\njurisdiction over farms.\n(A) Grain\nand seed.\n(B) Dairy."), "The subcommittee shall have jurisdiction over farms.\n(A) Grain and seed.\n(B) Dairy.")

    def test_dashes_and_page_markers_are_tidied_and_the_words_are_kept(self):
        self.assertEqual(fx.tidy("Department of Defense — Military [[Page H371]] 2023–2024"), "Department of Defense -- Military 2023-2024")

    def test_a_page_without_its_heading_or_body_is_not_read_as_text(self):
        self.assertEqual(fx.page_text("<html><nav>Menu</nav><main><h2>Jurisdiction</h2><p>Farm  credit.</p></main><footer>Privacy</footer></html>"), "Jurisdiction\nFarm credit.")


class RunningTwice(unittest.TestCase):
    """Safe to run again (docs/plan-idempotency.md): the same pages give the same file, and an unchanged row keeps the day it was first pulled."""

    def test_with_no_pages_every_row_keeps_its_last_good_text_and_date(self):
        snap, warn = fx.build(LAND, {}, DATA, "2099-01-01", C)
        self.assertEqual(snap["committees"], DATA["committees"])
        self.assertEqual(snap["roles"], DATA["roles"])
        self.assertEqual(snap["process"], DATA["process"])
        self.assertEqual(snap["updated"], DATA["updated"])
        self.assertTrue(warn)   # it says which pages did not answer

    def test_twice_from_the_same_inputs_is_byte_for_byte_the_same(self):
        a, _ = fx.build(LAND, {}, DATA, "2099-01-01", C)
        b, _ = fx.build(LAND, {}, a, "2099-02-02", C)
        self.assertEqual(json.dumps(a, sort_keys=True), json.dumps(b, sort_keys=True))

    def test_a_new_committee_in_the_record_gets_a_none_on_file_row_and_a_gone_one_loses_its_row(self):
        land = copy.deepcopy(LAND)
        land["committees"].append({"id": "HSXX", "name": "House Committee on Something New", "chamber": "house", "url": None, "chair": None, "members": 3,
                                   "subcommittees": [{"id": "HSXX01", "name": "New Subcommittee", "chair": None, "members": 2}]})
        gone = land["committees"].pop(0)
        snap, _ = fx.build(land, {}, DATA, "2099-01-01", C)
        self.assertEqual(snap["committees"]["HSXX"]["note"], "No description on file")
        self.assertIsNone(snap["committees"]["HSXX01"]["text"])
        self.assertNotIn(gone["id"], snap["committees"])
        self.assertEqual(fx.check(snap, land), [])


TEXT_SRC = open(os.path.join(ROOT, "ext", "cx-us-text.jsx"), encoding="utf-8").read()
BLOCK = re.search(r"/\* US-TEXT-START.*?US-TEXT-END \*/", TEXT_SRC, re.S).group(0)
LINES = json.loads(re.search(r"const CX_US_LINES = (\{.*?\n\});\n", BLOCK, re.S).group(1))
ROLE_TEXT = {k: dict(re.findall(r"(words|what|why|same): (`[^`]*`|\[[^\]]*\])", body))
             for k, body in re.findall(r"\n  (\w+): \{ (words: \[.*?) \},", BLOCK)}
HOW = re.findall(r"\{ k: `([^`]*)`, big: `([^`]*)`, small: `([^`]*)`, step: `(\w+)` \}", BLOCK)
RANKING = re.compile(r"\b(powerful|important|importance|top|best|most|leading|key|major|critical|vital|crucial|influential|biggest|largest)\b", re.I)
PARTY = re.compile(r"\b(Republican|Democrat|Democratic|GOP|conservative|liberal)\b", re.I)


def n_words(s):
    return len(s.split())


class OurLines(unittest.TestCase):
    """The plain lines in ext/cx-us-text.jsx (phases 3 and 4): two short lines each, grounded, never a ranking, no dash, flagged for review."""

    def test_every_line_is_for_a_committee_in_the_record_that_has_official_words(self):
        for k in LINES:
            self.assertIn(k, DATA["committees"], k)
            self.assertTrue(DATA["committees"][k].get("text"), f"{k} has lines but no official words on file to rest on")

    def test_every_committee_has_its_two_lines_and_most_subcommittees_do(self):
        for c in LAND["committees"]:
            self.assertIn(c["id"], LINES, c["id"])
        with_text = [k for k, r in DATA["committees"].items() if r["kind"] == "subcommittee" and r.get("text")]
        self.assertGreaterEqual(sum(1 for k in with_text if k in LINES), len(with_text) - 5)

    def test_each_pair_is_one_short_sentence_each_within_the_limits(self):
        for k, (what, why) in LINES.items():
            self.assertLessEqual(n_words(what), 20, f"{k} what: {what}")
            self.assertLessEqual(n_words(why), 15, f"{k} why: {why}")
            self.assertLessEqual(n_words(what) + n_words(why), 35, k)
            for s in (what, why):
                self.assertTrue(s.endswith("."), f"{k}: {s}")
                self.assertNotRegex(s, "[–—]|--", k)
                self.assertNotRegex(s, RANKING, k)
                self.assertNotRegex(s, PARTY, k)

    def test_the_role_notes_cover_every_role_word_in_the_record(self):
        self.assertEqual(sorted(ROLE_TEXT), sorted(DATA["roles"]))
        words = {w.lower() for v in ROLE_TEXT.values() for w in re.findall(r"`([^`]*)`", v["words"])}
        for m in LAND["members"]:
            for x in m["committees"]:
                self.assertIn(x["role"].lower(), words, x["role"])

    def test_each_role_note_is_two_short_lines_with_no_ranking_and_no_dash(self):
        for k, v in ROLE_TEXT.items():
            what, why, same = (v[f].strip("`") for f in ("what", "why", "same"))
            self.assertLessEqual(n_words(what), 20, k)
            self.assertLessEqual(n_words(why), 15, k)
            self.assertLessEqual(n_words(what) + n_words(why), 35, k)
            for s in (what, why, same):
                self.assertNotRegex(s, "[–—]", k)
                self.assertNotRegex(s, RANKING, k)
        self.assertIn("Chair, Chairman, and Chairwoman are the same post", ROLE_TEXT["chair"]["same"])

    def test_how_a_committee_works_is_five_steps_and_the_rule_each_on_official_words(self):
        self.assertEqual([h[3] for h in HOW], ["referral", "hearing", "markup", "report", "floor", "floor"])
        self.assertEqual(HOW[-1][1], "A committee's vote is not the chamber's vote.")
        for k, big, small, step in HOW:
            self.assertTrue(any(t.get("text") for t in DATA["process"][step]), step)
            self.assertNotRegex(big + small, "[–—]")

    def test_the_lines_are_reviewed_only_through_the_build_command(self):
        with open(os.path.join(ROOT, "build.py"), encoding="utf-8") as fh:
            build = fh.read()
        self.assertIn("--mark-us-text-reviewed", build)
        self.assertIn("US-TEXT-START", TEXT_SRC)
        rv = os.path.join(ROOT, "data", "us-text-reviewed.json")
        if os.path.exists(rv):   # if a person has marked them, the record names who
            with open(rv, encoding="utf-8") as fh:
                self.assertTrue(json.load(fh).get("by"))


class TheCheckCatches(unittest.TestCase):
    """The checks fail on what they are for, or a clean result means nothing."""

    def test_a_missing_row_fails(self):
        d = copy.deepcopy(DATA); d["committees"].pop("HSWM01")
        self.assertTrue(any("no row for HSWM01" in b for b in fx.check(d, LAND)))

    def test_empty_text_without_the_note_fails(self):
        d = copy.deepcopy(DATA); d["committees"]["HSAG"]["text"] = ""; d["committees"]["HSAG"].pop("note", None)
        self.assertTrue(any("HSAG has no text" in b for b in fx.check(d, LAND)))

    def test_a_different_congress_fails(self):
        d = copy.deepcopy(DATA); d["committees"]["SSFI"]["congress"] = 118
        self.assertTrue(any("SSFI is for Congress 118" in b for b in fx.check(d, LAND)))

    def test_a_role_word_with_no_note_fails(self):
        d = copy.deepcopy(DATA); d["roles"]["cochair"]["words"] = []
        self.assertTrue(any("Cochairman" in b for b in fx.check(d, LAND)))


if __name__ == "__main__":
    unittest.main(verbosity=1)
