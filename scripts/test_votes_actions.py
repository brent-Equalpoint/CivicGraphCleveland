#!/usr/bin/env python3
"""Tests for votes, actions, and positions on city records (docs/plan-votes-actions-positions.md, phases 2 and 3).

  python scripts/test_votes_actions.py

No network. Reads data/ as it stands and the source of the new screens. What must hold:
  * every stored vote adds up to its tally (City Record roll calls, other votes, and the ones read from Council's Legistar record);
  * every named vote is a real Council member in data/people-2026.json, and the vote falls inside that member's seat dates;
  * every action on a record (scripts/council_record.py) has a date and a source;
  * a passed file with no named vote says why, with a known reason, never an empty value;
  * no score, rank, or percentage word in the new text, in English or Spanish; sponsorship rows say sponsorship and are never called a vote.
"""
import json, os, re, sys, unittest

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, ".."))
sys.path.insert(0, HERE)
import council_record, fetch_cityrecord as cr


def load(name):
    with open(os.path.join(ROOT, "data", name), encoding="utf-8") as f:
        return json.load(f)


def read(rel):
    with open(os.path.join(ROOT, rel), encoding="utf-8") as f:
        return f.read()


VOTES, LEG, PEOPLE = load("votes-2026.json"), load("legistar-2026.json"), load("people-2026.json")
MATTERS = {m["file"]: m for m in LEG["matters"]}
WORDS = {"yea", "nay", "absent", "recused", "abstain"}
SCORE_EN = re.compile(r"\b(score[sd]?|scoring|rank(s|ed|ing)?|rating|grades?|percent(age)?|most active|least active|agrees? with|agreement|voting record|leaderboard|top \d+|how often)\b|%", re.I)
SCORE_ES = re.compile(r"(puntuaci|puntaje|calificaci|clasificaci|ranking|porcentaje|m[aá]s activ|r[eé]cord de votaci)", re.I)


def all_votes():
    rows = [(f, v, "city_record") for f, v in VOTES["votes"].items()]
    rows += [(o["file"], o, "city_record") for o in VOTES["other"]]
    rows += [(f, v, "legistar") for f, v in VOTES.get("legistar_votes", {}).items()]
    return rows


class VotesAddUp(unittest.TestCase):
    def test_every_vote_adds_up_to_its_tally(self):
        self.assertGreater(len(all_votes()), 400)
        for f, v, src in all_votes():
            c = {w: sum(1 for x in v["members"].values() if x == w) for w in WORDS}
            for w in ("yea", "nay", "recused"):
                self.assertEqual(c[w], v["tally"].get(w, 0), f"{f} ({src}): {c[w]} {w} named, tally says {v['tally'].get(w, 0)}")
            self.assertTrue(set(v["members"].values()) <= WORDS, f)

    def test_every_vote_names_every_sitting_member_once(self):
        council = {p["name"] for p in PEOPLE["people"] if p["title"] == "Council Member"}
        for f, v, src in all_votes():
            self.assertEqual(set(v["members"]), council, f"{f} ({src})")

    def test_every_named_vote_is_a_member_in_their_seat_on_that_day(self):
        seats = {p["name"]: p for p in PEOPLE["people"] if p["title"] == "Council Member"}
        for f, v, src in all_votes():
            for name in v["members"]:
                p = seats.get(name)
                self.assertIsNotNone(p, f"{f}: {name} is not a council member in data/people-2026.json")
                self.assertTrue(p["start"] <= v["date"] <= p["end"], f"{f}: {name} voted on {v['date']}, outside the seat dates {p['start']} to {p['end']}")

    def test_every_vote_has_a_source_and_a_date(self):
        for f, v, src in all_votes():
            self.assertRegex(v["date"], r"^20\d\d-\d\d-\d\d$", f)
            self.assertTrue(v["anchor"]["url"].startswith("https://"), f)
            self.assertIn(f, v["anchor"]["locator"])

    def test_a_vote_from_legistar_only_where_the_city_record_prints_no_names(self):
        for f in VOTES.get("legistar_votes", {}):
            self.assertNotIn(f, VOTES["votes"])
            self.assertEqual(MATTERS[f]["passed"], VOTES["legistar_votes"][f]["date"], f)

    def test_where_the_two_records_differ_both_words_are_kept(self):
        for d in VOTES.get("differs", []):
            self.assertIn(d["file"], VOTES["votes"])   # the City Record's vote is the one shown
            for name, w in d["members"].items():
                self.assertNotEqual(w["city_record"], w["legistar"], name)


class NoNameSaysWhy(unittest.TestCase):
    def test_every_passed_file_has_names_or_a_reason(self):
        named = set(VOTES["votes"]) | set(VOTES.get("legistar_votes", {}))
        why = VOTES.get("no_names")
        self.assertIsNotNone(why, "data/votes-2026.json has no no_names section")
        for f, m in MATTERS.items():
            if m["status"] != "Passed" or f in named:
                continue
            self.assertIn(f, why, f"{f} passed, has no named vote, and gives no reason")
            self.assertIn(why[f]["reason"], ("issue_not_out", "legistar_held", "not_printed"), f)

    def test_the_reason_is_worked_out_from_the_record_never_left_empty(self):
        snap = {"votes": {}, "other": [], "legistar_votes": {}, "legistar": {"held": []}, "counts": {}}
        out = cr.add_no_names(snap, {"9-2026": {"status": "Passed", "passed": "2026-09-28"}})["no_names"]
        self.assertEqual(out["9-2026"]["reason"], "issue_not_out")

    def test_coverage_as_measured(self):
        passed = [f for f, m in MATTERS.items() if m["status"] == "Passed"]
        named = set(VOTES["votes"]) | set(VOTES.get("legistar_votes", {}))
        print(f"\n  coverage: {sum(1 for f in passed if f in named)} of {len(passed)} passed files have member names; "
              f"{len(VOTES.get('no_names', {}))} without, each with a reason")


class ActionsHaveSourcesAndDates(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.R = council_record.build_from_data()

    def test_every_action_has_a_date_and_a_source(self):
        R = self.R
        for mtg in R["meetings"]:
            self.assertRegex(mtg[0], r"^2026-\d\d-\d\d$")
            self.assertTrue(any(u and u.startswith("https://") for u in mtg[2:5]), f"meeting {mtg} has no agenda, page, or minutes link")
        for f, x in R["files"].items():
            self.assertIn(f, MATTERS, f)
            for mi, a in x.get("m", []):
                self.assertLess(mi, len(R["meetings"]))
            for d, a, bi in x.get("h", []):
                self.assertRegex(d, r"^2026-\d\d-\d\d$")
            for kind in ("r", "p"):
                for d, text, i in x.get(kind, []):
                    self.assertRegex(d, r"^2026-\d\d-\d\d$", f)
                    self.assertTrue(text.strip(), f)
                    self.assertTrue(R["issues"][i][1].startswith("https://www.clevelandcitycouncil.gov/"), f)
            if "e" in x:
                word, on, eff, i = x["e"]
                self.assertIn(word, ("passed", "adopted"))
                self.assertTrue(on <= eff, f"{f}: took effect before it passed")
                self.assertTrue(R["issues"][i][1].startswith("https://www.clevelandcitycouncil.gov/"), f)
        for k in ("legistar", "meetings", "histories", "city_record"):
            self.assertTrue(R["pulled"][k], k)

    def test_the_record_builder_is_a_pure_function_of_data(self):
        self.assertEqual(json.dumps(self.R, sort_keys=True), json.dumps(council_record.build_from_data(), sort_keys=True))

    def test_an_effective_date_agrees_with_councils_passed_date(self):
        for f, x in self.R["files"].items():
            if "e" in x and MATTERS[f].get("passed"):
                self.assertEqual(x["e"][1], MATTERS[f]["passed"], f)


def visible_text(path, block=None):
    """String literals and JSX text of a source file, with comments taken out (a comment may say what the rules forbid)."""
    src = read(path)
    if block:
        m = re.search(block, src, re.S)
        src = m.group(0) if m else src
    src = re.sub(r"/\*.*?\*/", "", src, flags=re.S)
    src = re.sub(r"(?m)^\s*//.*$|\s//\s.*$", "", src)
    return src


class Words(unittest.TestCase):
    FILES = ("ext/cx-record.jsx", "ext/cx-votes-text.jsx")

    def test_no_score_or_ranking_word_in_the_new_text(self):
        for f in self.FILES:
            text = visible_text(f)
            for s in re.findall(r"`([^`]*)`", text) + re.findall(r">([^<>{}]+)<", text):
                self.assertIsNone(SCORE_EN.search(s), f"{f}: {s!r}")

    def test_no_dash_in_the_new_text(self):
        for f in self.FILES + ("docs/source-notes-votes.md", "scripts/council_record.py"):
            self.assertIsNone(re.search("[–—]", read(f)), f)

    def test_the_spanish_keeps_the_rules(self):
        es = json.loads(read("i18n/manual.json"))
        ours = set()
        for f in self.FILES:
            text = visible_text(f)
            ours |= {s.strip() for s in re.findall(r"`([^`$]*)`", text) if len(s.strip()) > 3}
        for en, tr in list(es.get("exact", {}).items()) + list(es.get("masked", {}).items()):
            if en in ours or any(k in en for k in ("Sponsorship", "sponsorship", "Recusal", "Votes & actions", "In the record")):
                self.assertIsNone(SCORE_ES.search(tr), f"{en!r} -> {tr!r}")
                self.assertIsNone(re.search("[–—]", tr), tr)
                if re.search(r"Sponsorship is not a vote", en):
                    self.assertRegex(tr, r"(?i)patrocin.*no es (un )?vot")
                if re.search(r"not a no", en):
                    self.assertRegex(tr, r"(?i)no (es|son|significa)")

    def test_sponsorship_rows_say_sponsorship_and_never_vote(self):
        src = read("ext/cx-record.jsx")
        roles = re.search(r"const CX_PERSON_ROLE = \{(.*?)\};", src, re.S).group(1)
        for label in re.findall(r"`([^`]*)`", roles):
            self.assertTrue(label.startswith("Sponsorship"), label)
            self.assertNotIn("vote", label.lower(), label)

    def test_no_overall_number_in_a_persons_list(self):
        src = visible_text("ext/cx-record.jsx")
        body = re.search(r"function CX_PersonRecord.*?\n}\n", src, re.S).group(0)
        self.assertNotRegex(body, r"all\.length")   # a count of everything in the list would be an overall number
        self.assertNotRegex(body, r"sort\(\(a, b\) => [^)]*(length|count)")


if __name__ == "__main__":
    unittest.main()
