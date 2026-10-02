#!/usr/bin/env python3
"""Tests for scripts/fetch_cityrecord.py: how Council roll calls are read from the City Record and checked.

  python scripts/test_cityrecord.py

No network. Every member below is a made-up surname, in the shape the City Record prints. A wrong vote shown for a named
official is the worst failure this code can have, so most tests are about what must be refused.
"""
import os, sys, unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fetch_cityrecord as cr

ROS = {n: f"{n} {n}son" for n in ("Ash", "Birch", "Cedar", "Dogwood", "Elm")}  # five sitting members, made up
ALL = ["Ash", "Birch", "Cedar", "Dogwood", "Elm"]

HEAD = """The City Record
Official Proceedings � City Council
                                       Cleveland, Ohio
                                    Monday, September 21, 2026
"""


def entry(num, by="By Council Member: Ash", kind="Ordinance", gap="\n", result="Read third time in full. Passed. Yeas 5. Nays 0.", names=None):
    names = names or "Voting Yea: Ash, Birch, Cedar, Dogwood, Elm.\nVoting Nay: None.\nAbsent: None.\n"
    return f"{kind} No. {num}\n{gap}{by}\n\nAn ordinance about something.\n\nThe rules were suspended. Yeas 5. Nays 0.\n\nRead second time.\n{result}\n\n{names}\n"


def run(text):
    return cr.parse_issue(HEAD + text, ROS)


class Parse(unittest.TestCase):
    def test_a_unanimous_vote(self):
        votes, problems, _ = run(entry("10-2026"))
        self.assertEqual(problems, [])
        self.assertEqual(len(votes), 1)
        v = votes[0]
        self.assertEqual((v["file"], v["date"], v["question"], v["tally"]), ("10-2026", "2026-09-21", "Passage", {"yea": 5, "nay": 0}))
        self.assertEqual(set(v["members"].values()), {"yea"})
        self.assertEqual(v["members"]["Ash Ashson"], "yea")

    def test_a_vote_to_suspend_the_rules_is_not_a_roll_call(self):
        votes, _, _ = run(entry("10-2026"))
        self.assertEqual(len(votes), 1)  # the entry has a suspension tally and a passage vote; only the second prints names

    def test_a_split_vote_and_an_absence(self):
        names = "Voting Yea: Ash, Birch, Dogwood.\nVoting Nay: Cedar.\nAbsent: Elm\n"
        votes, problems, _ = run(entry("11-2026", result="Read third time in full. Passed. Yeas 3. Nays 1.", names=names))
        self.assertEqual(problems, [])
        m = votes[0]["members"]
        self.assertEqual((m["Cedar Cedarson"], m["Elm Elmson"], m["Ash Ashson"]), ("nay", "absent", "yea"))

    def test_a_list_that_wraps_over_a_page_break(self):
        names = ("Voting Yea: Ash, Birch,\nOfficial Proceedings � City Council\nSeptember 25, 2026   The City Record      285\n"
                 "Second Reading Emergency Ordinances Passed  Ord. No. 12-2026\nCedar, Dogwood, Elm.\n\nVoting Nay: None.\nAbsent: None.\n")
        votes, problems, _ = run(entry("12-2026", names=names))
        self.assertEqual(problems, [])
        self.assertEqual(len(votes[0]["members"]), 5)

    def test_a_missing_comma_in_the_print_is_read_and_checked_by_the_tally(self):
        names = "Voting Yea: Ash Birch, Cedar, Dogwood, Elm.\nVoting Nay: None.\nAbsent: None.\n"
        votes, problems, _ = run(entry("13-2026", names=names))
        self.assertEqual(problems, [])
        self.assertEqual(len(votes[0]["members"]), 5)

    def test_headings_with_a_blank_line_a_colon_or_as_amended(self):
        for kw in ({"gap": "\n"}, {"by": "By: Mayor Bibb"}, {"num": "14-2026 AS AMENDED"}):
            args = {"num": "14-2026", **kw}
            votes, problems, _ = run(entry(args.pop("num"), **args))
            self.assertEqual((problems, [v["file"] for v in votes]), ([], ["14-2026"]), kw)

    def test_resolutions_are_adopted(self):
        votes, _, _ = run(entry("15-2026", kind="Resolution", result="Read third time in full. Adopted. Yeas 5. Nays 0."))
        self.assertEqual(votes[0]["question"], "Adoption")

    def test_laying_a_file_on_the_table_is_its_own_question(self):
        votes, _, _ = run(entry("16-2026", result="Laid on the table. Yeas 5. Nays 0."))
        self.assertEqual(votes[0]["question"], "Laid on the table")


class Refuse(unittest.TestCase):
    def test_names_that_do_not_match_the_tally(self):
        names = "Voting Yea: Ash, Birch, Cedar.\nVoting Nay: None.\nAbsent: Dogwood, Elm\n"
        votes, problems, _ = run(entry("20-2026", names=names))  # the tally says 5 yeas
        self.assertEqual(votes, [])
        self.assertIn("do not match the tally", problems[0])

    def test_a_name_that_is_not_a_sitting_member(self):
        names = "Voting Yea: Ash, Birch, Cedar, Dogwood, Fir.\nVoting Nay: None.\nAbsent: None.\n"
        votes, problems, _ = run(entry("21-2026", names=names))
        self.assertEqual(votes, [])
        self.assertIn("Fir", problems[0])

    def test_a_member_on_two_lists(self):
        names = "Voting Yea: Ash, Birch, Cedar, Dogwood.\nVoting Nay: None.\nAbsent: Ash\n"
        votes, problems, _ = run(entry("22-2026", result="Read third time in full. Passed. Yeas 4. Nays 0.", names=names))
        self.assertEqual(votes, [])
        self.assertIn("two lists", problems[0])

    def test_lists_that_leave_a_sitting_member_out(self):
        names = "Voting Yea: Ash, Birch, Cedar, Dogwood.\nVoting Nay: None.\nAbsent: None.\n"
        votes, problems, _ = run(entry("23-2026", result="Read third time in full. Passed. Yeas 4. Nays 0.", names=names))
        self.assertEqual(votes, [])
        self.assertIn("4 of 5", problems[0])

    def test_a_vote_with_no_file_or_no_meeting_is_not_guessed(self):
        votes, problems, _ = cr.parse_issue("Read third time in full. Passed. Yeas 5. Nays 0.\nVoting Yea: Ash, Birch, Cedar, Dogwood, Elm.\nVoting Nay: None.\nAbsent: None.\n", ROS)
        self.assertEqual(votes, [])
        self.assertIn("could not tie", problems[0])

    def test_two_votes_on_one_file_in_one_issue_are_held_for_a_person(self):
        votes, problems, _ = run(entry("24-2026") + entry("24-2026"))
        self.assertEqual(votes, [])
        self.assertIn("none are stored", problems[0])

    def test_a_heading_inside_the_text_of_a_law_does_not_start_an_entry(self):
        fake = "Ordinance No. 30-2026\nan amendment to Ordinance No. 99-2020, passed March 1, 2020\n"
        vote = "Read third time in full. Passed. Yeas 5. Nays 0.\n\nVoting Yea: Ash, Birch, Cedar, Dogwood, Elm.\nVoting Nay: None.\nAbsent: None.\n"
        votes, problems, _ = run(fake + vote)  # a vote after only a stray heading must not be filed under it
        self.assertEqual(votes, [])
        self.assertIn("could not tie", problems[0])
        votes, problems, _ = run(fake + entry("31-2026"))
        self.assertEqual((problems, [v["file"] for v in votes]), ([], ["31-2026"]))


class Misprint(unittest.TestCase):
    matters = {"40-2026": {"passed": "2026-09-21"}}

    def vote(self, file="40-2025", date="2026-09-21"):
        return [{"file": file, "date": date, "question": "Passage", "members": {}, "tally": {"yea": 0, "nay": 0}}]

    def test_corrected_when_all_three_records_agree(self):
        v = cr.reconcile(self.vote(), {"40-2026"}, self.matters)
        self.assertEqual((v[0]["file"], v[0]["misprint"]), ("40-2026", "40-2025"))

    def test_not_corrected_when_the_page_headers_do_not_say_so(self):
        self.assertEqual(cr.reconcile(self.vote(), set(), self.matters)[0]["file"], "40-2025")

    def test_not_corrected_when_the_2026_file_passed_on_another_date(self):
        self.assertEqual(cr.reconcile(self.vote(date="2026-09-14"), {"40-2026"}, self.matters)[0]["file"], "40-2025")

    def test_not_corrected_when_the_2025_file_is_known(self):
        self.assertEqual(cr.reconcile(self.vote(), {"40-2026"}, {**self.matters, "40-2025": {}})[0]["file"], "40-2025")


def snapshot_issue(votes, label="Record - Sept. 25, 2026", problems=()):
    return {"url": "https://example.invalid/r.pdf", "label": label, "bytes": 1, "modified": "", "sha256": "x", "votes": votes, "problems": list(problems)}


def v(file, date, question="Passage", yea=5):
    return {"file": file, "date": date, "question": question, "members": {n: "yea" for n in ROS.values()}, "tally": {"yea": yea, "nay": 0}}


class Assemble(unittest.TestCase):
    def test_table_votes_go_in_other_and_passage_in_votes(self):
        s = cr.assemble([snapshot_issue([v("1-2026", "2026-09-21"), v("2-2026", "2026-09-21", "Laid on the table")])])
        self.assertEqual(list(s["votes"]), ["1-2026"])
        self.assertEqual([o["file"] for o in s["other"]], ["2-2026"])

    def test_a_later_vote_on_a_file_is_its_roll_call_and_the_earlier_one_stays_visible(self):
        s = cr.assemble([snapshot_issue([v("1-2026", "2026-09-14")], "Record - Sept. 18, 2026"), snapshot_issue([v("1-2026", "2026-09-21")])])
        self.assertEqual(s["votes"]["1-2026"]["date"], "2026-09-21")
        self.assertEqual([(o["file"], o["date"]) for o in s["other"]], [("1-2026", "2026-09-14")])

    def test_two_issues_with_the_same_vote_are_held_for_a_person(self):
        s = cr.assemble([snapshot_issue([v("1-2026", "2026-09-21")], "A"), snapshot_issue([v("1-2026", "2026-09-21")], "B")])
        self.assertTrue(any("two issues" in p for p in s["skipped"]))

    def test_each_vote_points_to_the_issue_it_came_from(self):
        s = cr.assemble([snapshot_issue([v("1-2026", "2026-09-21")])])
        self.assertEqual(s["votes"]["1-2026"]["anchor"]["url"], "https://example.invalid/r.pdf")
        self.assertIn("file 1-2026", s["votes"]["1-2026"]["anchor"]["locator"])

    def test_a_skipped_vote_is_reported_never_dropped_quietly(self):
        s = cr.assemble([snapshot_issue([], problems=["9-2026 on 2026-09-21: names do not match the tally"])])
        self.assertEqual(s["counts"]["skipped"], 1)
        self.assertTrue(cr.check(s, {}))


class Check(unittest.TestCase):
    def snap(self, d):
        return cr.assemble([snapshot_issue([v("1-2026", d)])])

    def real_roster(self):
        return cr.roster()

    def test_the_meeting_date_must_match_councils_passage_date(self):
        s = self.snap("2026-09-21")
        ros = self.real_roster()
        s["votes"]["1-2026"]["members"] = {n: "yea" for n in ros.values()}
        s["votes"]["1-2026"]["tally"] = {"yea": len(ros), "nay": 0}
        self.assertEqual(cr.check(s, {"1-2026": {"passed": "2026-09-21"}}), [])
        self.assertTrue(any("passed on 2026-09-14" in b for b in cr.check(s, {"1-2026": {"passed": "2026-09-14"}})))

    def test_a_file_from_the_last_term_is_kept_without_a_date_check(self):
        s = self.snap("2026-09-21")
        s["votes"]["1-2025"] = s["votes"].pop("1-2026")
        ros = self.real_roster()
        s["votes"]["1-2025"]["members"] = {n: "yea" for n in ros.values()}
        s["votes"]["1-2025"]["tally"] = {"yea": len(ros), "nay": 0}
        self.assertEqual(cr.check(s, {}), [])

    def test_names_that_do_not_match_the_tally_fail_the_check(self):
        s = self.snap("2026-09-21")
        s["votes"]["1-2026"]["members"] = {}
        self.assertTrue(cr.check(s, {"1-2026": {"passed": "2026-09-21"}}))


class StoredData(unittest.TestCase):
    """The snapshot in data/ as it stands: what the app shows must add up."""

    @classmethod
    def setUpClass(cls):
        import json
        with open(os.path.join(cr.DATA, "votes-2026.json"), encoding="utf-8") as f:
            cls.d = json.load(f)

    def test_it_passes_its_own_check(self):
        self.assertEqual(cr.check(self.d), [])

    def test_every_vote_names_every_sitting_member_once(self):
        ros = set(cr.roster().values())
        for f, x in list(self.d["votes"].items()) + [(o["file"], o) for o in self.d["other"]]:
            self.assertEqual(set(x["members"]), ros, f)
            self.assertTrue(set(x["members"].values()) <= {"yea", "nay", "absent"}, f)

    def test_every_vote_points_to_a_city_record_issue(self):
        for f, x in self.d["votes"].items():
            self.assertTrue(x["anchor"]["url"].startswith("https://www.clevelandcitycouncil.gov/"), f)
            self.assertIn(f, x["anchor"]["locator"])


if __name__ == "__main__":
    unittest.main()
