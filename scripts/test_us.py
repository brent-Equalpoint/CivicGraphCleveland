#!/usr/bin/env python3
"""Tests for scripts/fetch_us.py: how the federal landscape is assembled and checked.

  python scripts/test_us.py

No network. Every person, committee, and agency below is made up.
"""
import os, sys, unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fetch_us as us


def leg(bio, first, last, typ, state, party, district=None, start="2025-01-03"):
    t = {"type": typ, "start": start, "end": "2031-01-03", "state": state, "party": party, "url": f"https://{last.lower()}.example.invalid"}
    if district is not None:
        t["district"] = district
    return {"id": {"bioguide": bio}, "name": {"first": first, "last": last, "official_full": f"{first} {last}"}, "terms": [dict(t, party="Old Party", start="2019-01-03"), t]}


LEGS = [leg("A1", "Ann", "Alder", "sen", "OH", "Party One"), leg("B1", "Bo", "Birch", "rep", "OH", "Party Two", 3), leg("C1", "Cy", "Cedar", "rep", "OH", "Party One", 11)]
COMMS = [{"type": "house", "name": "House Committee on Trees", "thomas_id": "HSTR", "url": "https://trees.example.invalid",
          "subcommittees": [{"name": "Oaks", "thomas_id": "01"}, {"name": "Elms", "thomas_id": "02"}]},
         {"type": "senate", "name": "Senate Committee on Rivers", "thomas_id": "SSRV"}]
MEMB = {"HSTR": [{"name": "Bo Birch", "bioguide": "B1", "title": "Chairman", "rank": 1}, {"name": "Cy Cedar", "bioguide": "C1", "rank": 2}],
        "HSTR01": [{"name": "Cy Cedar", "bioguide": "C1", "title": "Chair", "rank": 1}],
        "SSRV": [{"name": "Ann Alder", "bioguide": "A1", "rank": 1}]}
AGS = [{"id": 1, "slug": "dept-of-a", "name": "Department of A", "short_name": "A", "parent_id": None, "description": "First paragraph of A.\r\n\r\nSecond paragraph.", "agency_url": "https://a.example.invalid", "url": "https://fr.example.invalid/a"},
       {"id": 2, "slug": "bureau-b", "name": "Bureau of B", "short_name": None, "parent_id": 1, "description": "B " * 400, "agency_url": "", "url": "https://fr.example.invalid/b"},
       {"id": 3, "slug": "old-agency", "name": "Old Agency", "short_name": None, "parent_id": 1, "description": "Abolished in 1971.", "agency_url": "", "url": "https://fr.example.invalid/o"},
       {"id": 4, "slug": "orphan-child", "name": "Child of Old", "short_name": None, "parent_id": 3, "description": "", "agency_url": "", "url": "https://fr.example.invalid/c"}]
COUNTS = {"dept-of-a": 12, "bureau-b": 3, "old-agency": 0, "orphan-child": 2}


class Landscape(unittest.TestCase):
    def snap(self):
        return us.build(LEGS, COMMS, MEMB, AGS, COUNTS, "2026-10-01T00:00:00+00:00", "2024-10-01")

    def test_members_carry_a_dated_sourced_party_and_their_committees(self):
        s = self.snap()
        b = next(m for m in s["members"] if m["id"] == "B1")
        self.assertEqual((b["chamber"], b["state"], b["district"], b["party"]), ("house", "OH", 3, "Party Two"))  # the CURRENT term, not the 2019 one
        self.assertEqual(b["party_as_of"], "2025-01-03")
        self.assertEqual(b["committees"], [{"id": "HSTR", "role": "Chairman"}])
        c = next(m for m in s["members"] if m["id"] == "C1")
        self.assertEqual({x["id"]: x["role"] for x in c["committees"]}, {"HSTR": "Member", "HSTR01": "Chair"})
        self.assertEqual(s["counts"], {"members": 3, "senate": 1, "house": 2, "committees": 2, "agencies": 3})

    def test_no_ideology_or_score_fields_exist(self):
        s = self.snap()
        for m in s["members"]:
            self.assertEqual(sorted(m), ["chamber", "committees", "district", "id", "last", "name", "party", "party_as_of", "state", "term_end", "term_start", "url"])

    def test_committees_know_their_chairs_and_subcommittees(self):
        s = self.snap()
        t = next(c for c in s["committees"] if c["id"] == "HSTR")
        self.assertEqual((t["chair"], t["members"], len(t["subcommittees"])), ("Bo Birch", 2, 2))
        self.assertEqual(t["subcommittees"][0]["id"], "HSTR01")
        self.assertEqual(t["subcommittees"][0]["chair"], "Cy Cedar")
        self.assertIsNone(next(c for c in s["committees"] if c["id"] == "SSRV")["chair"])  # no chair recorded: say so, do not guess

    def test_only_agencies_that_still_publish_are_kept_and_the_rest_are_counted(self):
        s = self.snap()
        self.assertEqual([a["name"] for a in s["agencies"]], ["Child of Old", "Department of A", "Bureau of B"])  # top-level first, then those with a parent
        self.assertEqual(s["agencies_left_out"], 1)
        by = {a["id"]: a for a in s["agencies"]}
        self.assertEqual(by[2]["parent_id"], 1)
        self.assertIsNone(by[4]["parent_id"])  # its parent was left out, so it stands alone rather than pointing at nothing

    def test_agency_text_is_the_first_paragraph_and_is_cut_cleanly(self):
        s = self.snap()
        by = {a["id"]: a for a in s["agencies"]}
        self.assertEqual(by[1]["blurb"], "First paragraph of A.")
        self.assertLessEqual(len(by[2]["blurb"]), us.BLURB_MAX + 3)
        self.assertNotIn("\r", by[1]["blurb"])

    def test_the_safety_check_refuses_a_broken_snapshot(self):
        s = self.snap()
        self.assertTrue(any("senators" in p for p in us.check(s)))  # three made-up members are not a Congress
        good = {"counts": {"senate": 100, "house": 439, "committees": 49, "agencies": 260}, "members": [{"party": "x"}]}
        self.assertEqual(us.check(good), [])
        good["members"].append({"party": None})
        self.assertTrue(any("no party" in p for p in us.check(good)))

    def test_policy_areas_are_a_plain_list_with_no_duplicates(self):
        self.assertEqual(len(us.POLICY_AREAS), len(set(us.POLICY_AREAS)))
        self.assertIn("Housing and Community Development", us.POLICY_AREAS)


if __name__ == "__main__":
    unittest.main(verbosity=1)
