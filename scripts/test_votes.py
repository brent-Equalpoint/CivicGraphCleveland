#!/usr/bin/env python3
"""Tests for scripts/fetch_votes.py: how roll call records are read, joined, and checked.

  python scripts/test_votes.py

No network. Every member and bill below is made up, in the shape of the official files.
"""
import os, sys, unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fetch_votes as fv

HOUSE = """<?xml version="1.0" encoding="utf-8"?>
<rollcall-vote><vote-metadata><congress>119</congress><session>2nd</session><rollcall-num>7</rollcall-num>
<legis-num>H R 12</legis-num><vote-question>On Passage</vote-question><vote-result>Passed</vote-result>
<action-date>24-Feb-2026</action-date><vote-desc>The Don�t Panic Act</vote-desc>
<vote-totals><totals-by-vote><yea-total>1</yea-total><nay-total>1</nay-total></totals-by-vote></vote-totals></vote-metadata>
<vote-data>
<recorded-vote><legislator name-id="A1" party="D" state="OH" role="legislator">Alder</legislator><vote>Aye</vote></recorded-vote>
<recorded-vote><legislator name-id="B1" party="R" state="OH" role="legislator">Birch</legislator><vote>No</vote></recorded-vote>
<recorded-vote><legislator name-id="C1" party="R" state="OH" role="legislator">Cedar</legislator><vote>Not Voting</vote></recorded-vote>
</vote-data></rollcall-vote>"""

SENATE = """<?xml version="1.0" encoding="UTF-8"?><roll_call_vote><congress>119</congress><session>2</session>
<vote_date>September 30, 2026,  01:41 PM</vote_date><question>On the Nomination</question><vote_result>Confirmed</vote_result>
<vote_title>Confirmation: Pat Poplar to be Secretary of Trees</vote_title>
<document><document_name>PN9</document_name><document_title>Pat Poplar to be Secretary of Trees</document_title></document>
<count><yeas>1</yeas><nays>1</nays></count>
<members>
<member><lis_member_id>S1</lis_member_id><vote_cast>Yea</vote_cast></member>
<member><lis_member_id>S2</lis_member_id><vote_cast>Nay</vote_cast></member>
<member><lis_member_id>S999</lis_member_id><vote_cast>Not Voting</vote_cast></member>
</members></roll_call_vote>"""


class Parse(unittest.TestCase):
    def test_house_vote(self):
        rec, v = fv.parse_house(HOUSE, 2026, 7)
        self.assertEqual(v, {"A1": "Y", "B1": "N", "C1": "X"})
        self.assertEqual((rec["id"], rec["date"], rec["bill"], rec["yea"], rec["nay"]), ("h-119-2-7", "2026-02-24", "hr12", 1, 1))
        self.assertEqual(rec["desc"], "The Don't Panic Act")
        self.assertEqual(rec["url"], "https://clerk.house.gov/Votes/20267")

    def test_a_missing_file_is_not_a_vote(self):
        self.assertIsNone(fv.parse_house("Not found", 2026, 999))
        self.assertIsNone(fv.parse_senate("Not found", 2, 1, {}))

    def test_senate_vote_matches_ids_and_reports_the_rest(self):
        rec, v, lost = fv.parse_senate(SENATE, 2, 9, {"S1": "A1", "S2": "B1"})
        self.assertEqual(v, {"A1": "Y", "B1": "N"})
        self.assertEqual(lost, ["S999"])
        self.assertEqual((rec["id"], rec["date"], rec["bill"], rec["legis"]), ("s-119-2-9", "2026-09-30", None, "PN9"))
        self.assertEqual(fv.kind_of(rec), "nomination")

    def test_codes(self):
        self.assertEqual([fv.code_of(x) for x in ("Aye", "Yea", "No", "Nay", "Present", "Not Voting", "Johnson (LA)", "")], list("YYNNPXO-"))

    def test_bill_keys(self):
        for text, want in (("H R 4626", "hr4626"), ("H.R. 4626", "hr4626"), ("H RES 1075", "hres1075"), ("S.J.Res. 4", "sjres4"), ("S 12", "s12"),
                           ("H CON RES 2", "hconres2"), ("PN1129", None), ("QUORUM", None), ("", None), ("S.Amdt. 5", None)):
            self.assertEqual(fv.bill_key(text), want, text)
        self.assertEqual(fv.label_of("sjres4"), "S.J.Res. 4")

    def test_final_is_read_from_the_question_text(self):
        for q in ("On Passage", "On Passage of the Bill", "On the Nomination", "On Motion to Suspend the Rules and Pass", "On Agreeing to the Conference Report"):
            self.assertTrue(fv.FINAL.match(q), q)
        for q in ("On the Cloture Motion", "On the Motion to Proceed", "On Agreeing to the Resolution", "On the Amendment", "On Motion to Recommit"):
            self.assertFalse(fv.FINAL.match(q), q)


class Build(unittest.TestCase):
    def snap(self, old=None, extra=()):
        h, hv = fv.parse_house(HOUSE, 2026, 7)
        s, sv, _ = fv.parse_senate(SENATE, 2, 9, {"S1": "A1", "S2": "S2B"})
        bills = {"hr12": {"label": "H.R. 12", "title": "Don't Panic", "policy_area": "Health"}}
        return fv.build(old, [(h, hv), (s, sv)] + list(extra), bills, "2026-10-01T00:00:00+00:00")

    def test_codes_line_up_with_the_member_list(self):
        snap = self.snap()
        pos = {b: i for i, b in enumerate(snap["members"])}
        vote = {v["id"]: v for v in snap["votes"]}
        self.assertEqual(vote["h-119-2-7"]["codes"][pos["A1"]], "Y")
        self.assertEqual(vote["h-119-2-7"]["codes"][pos["C1"]], "X")
        self.assertEqual(vote["h-119-2-7"]["codes"][pos["S2B"]], "-")  # a senator is not in a House roll
        self.assertEqual(vote["s-119-2-9"]["codes"][pos["S2B"]], "N")
        self.assertEqual(fv.check(dict(snap, counts=dict(snap["counts"], house=200, senate=200))), [])

    def test_votes_sort_newest_first_and_carry_the_category(self):
        snap = self.snap()
        self.assertEqual([v["id"] for v in snap["votes"]], ["s-119-2-9", "h-119-2-7"])
        self.assertEqual(snap["bills"]["hr12"]["policy_area"], "Health")
        self.assertEqual(snap["counts"]["with_policy_area"], 1)
        self.assertTrue(snap["votes"][1]["final"] and snap["votes"][0]["final"])

    def test_a_new_member_pads_old_votes_with_not_in_the_roll(self):
        first = self.snap()
        h2 = {"id": "h-119-2-8", "chamber": "house", "session": 2, "number": 8, "date": "2026-03-01", "question": "On the Motion", "result": "Agreed to", "desc": "", "bill": None, "legis": None, "yea": 1, "nay": 0, "url": "u"}
        second = fv.build(first, [(h2, {"Z9": "Y"})], {}, "later")
        self.assertEqual(len(second["votes"]), 3)
        self.assertTrue(all(len(v["codes"]) == len(second["members"]) for v in second["votes"]))
        old = next(v for v in second["votes"] if v["id"] == "h-119-2-7")
        self.assertEqual(old["codes"][second["members"].index("Z9")], "-")
        self.assertEqual(old["codes"][:len(first["members"])], next(v for v in first["votes"] if v["id"] == "h-119-2-7")["codes"])

    def test_a_stored_vote_is_not_added_twice(self):
        first = self.snap()
        again = self.snap(first)
        self.assertEqual(len(again["votes"]), 2)

    def test_a_bill_whose_lookup_failed_keeps_its_label_and_no_category(self):
        h, hv = fv.parse_house(HOUSE, 2026, 7)
        snap = fv.build(None, [(h, hv)], {"hr12": None}, "now")
        self.assertEqual(snap["bills"]["hr12"], {"label": "H.R. 12", "title": None, "policy_area": None})
        self.assertEqual(snap["counts"]["with_policy_area"], 0)

    def test_check_catches_a_broken_snapshot(self):
        snap = self.snap()
        self.assertTrue(any("only 1 House" in p for p in fv.check(snap)))
        snap["counts"].update(house=200, senate=200)
        snap["votes"][0]["codes"] = snap["votes"][0]["codes"][:-1]
        self.assertTrue(any("does not match" in p for p in fv.check(snap)))
        snap = self.snap()
        snap["counts"].update(house=200, senate=200)
        snap["votes"][0]["codes"] = "-" * len(snap["members"])
        self.assertTrue(any("no member" in p for p in fv.check(snap)))
        snap = self.snap()
        snap["counts"].update(house=200, senate=200)
        snap["votes"].append(dict(snap["votes"][0]))
        self.assertTrue(any("twice" in p for p in fv.check(snap)))
        snap = self.snap()
        snap["counts"].update(house=200, senate=200)
        snap["votes"][0]["yea"] += 1  # the official tally says one more yea than the members add up to
        self.assertTrue(any("official tally" in p for p in fv.check(snap)))


if __name__ == "__main__":
    unittest.main(verbosity=1)
