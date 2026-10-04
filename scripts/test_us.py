#!/usr/bin/env python3
"""Tests for scripts/fetch_us.py: how the federal landscape is assembled and checked.

  python scripts/test_us.py

No network. Every person, committee, and agency below is made up.
"""
import importlib.util, io, os, sys, unittest

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


def svc(k, ctype, court, title="Judge", pres="Patrick Q. Prez", senior="", end="", chief_begin="", chief_end=""):
    return {f"Court Type ({k})": ctype, f"Court Name ({k})": court, f"Appointment Title ({k})": title, f"Appointing President ({k})": pres, f"Commission Date ({k})": "2010-05-01",
            f"Senior Status Date ({k})": senior, f"Termination Date ({k})": end, f"Service as Chief Judge, Begin ({k})": chief_begin, f"Service as Chief Judge, End ({k})": chief_end}


def judge(nid, first, last, *services, middle="", suffix=""):
    row = {"nid": str(nid), "First Name": first, "Middle Name": middle, "Last Name": last, "Suffix": suffix}
    for i, sv in enumerate(services, 1):
        row.update(sv(i))
    return row


S6 = "U.S. Court of Appeals for the Sixth Circuit"
SC = "Supreme Court of the United States"
NOH = "U.S. District Court for the Northern District of Ohio"
JUDGES = [
    judge(1, "Una", "Upper", lambda k: svc(k, "U.S. Court of Appeals", S6, pres="Patrick Q. Prez", end="2012-01-01"), lambda k: svc(k, "Supreme Court", SC, "Associate Justice", "Patrick Q. Prez")),
    judge(2, "Cora", "Circuit", lambda k: svc(k, "U.S. Court of Appeals", S6, "Chief Judge", "Patrick Q. Prez", chief_begin="2020-01-01")),
    judge(3, "Dana", "District", lambda k: svc(k, "U.S. District Court", NOH, pres="Quinn Prez")),
    judge(4, "Sol", "Senior", lambda k: svc(k, "U.S. District Court", NOH, senior="2020-01-01")),
    judge(5, "Rae", "Retired", lambda k: svc(k, "U.S. District Court", NOH, end="2015-01-01")),
    judge(6, "Dee", "Capital", lambda k: svc(k, "U.S. District Court", "U.S. District Court for the District of Columbia", pres="Quinn Prez")),
    judge(7, "Gus", "Guam", lambda k: svc(k, "U.S. District Court", "U.S. District Court for the District of the Northern Mariana Islands")),
    judge(8, "Tracy", "Trade", lambda k: svc(k, "Other", "U.S. Court of International Trade")),
]
PEOPLE = [
    {"id": {"bioguide": "P1"}, "name": {"first": "Patrick", "middle": "Q.", "last": "Prez"}, "terms": [{"type": "prez", "start": "2009-01-20", "end": "2017-01-20", "party": "Old"}]},
    {"id": {}, "name": {"first": "Quinn", "middle": "Arthur", "last": "Prez"}, "terms": [{"type": "prez", "start": "2025-01-20", "end": "2029-01-20", "party": "New"}]},
    {"id": {"bioguide": "V1"}, "name": {"first": "Vic", "last": "Vice"}, "terms": [{"type": "viceprez", "start": "2025-01-20", "end": "2029-01-20", "party": "New"}]},
    {"id": {"bioguide": "X1"}, "name": {"first": "Xan", "last": "Unrelated"}, "terms": [{"type": "prez", "start": "1901-01-01", "end": "1905-01-01", "party": "Gone"}]},
]


CABINET_HTML = """<main>
<h2 class="wp-block-heading has-text-align-center"><strong><strong>Ann Alpha</strong></strong></h2> <hr class="wp-block-separator" /> <h3 class="wp-block-heading has-text-align-center"><strong>Secretary of State</strong></h3>
<p>A long biography with <h2>not a person</h2> headings that have no title heading after them.</p>
<h2 class="wp-block-heading has-text-align-center">Bo B&eacute;ta, Jr.</h2>
<hr class="wp-block-separator has-alpha-channel-opacity" />
<h3 class="wp-block-heading has-text-align-center"><strong>Attorney General</strong></h3>
<h2 class="wp-block-heading">Cy Gamma</h2><hr><h3 class="wp-block-heading">Secretary of the Treasury</h3>
</main>"""


class Cabinet(unittest.TestCase):
    def test_each_person_is_a_name_heading_then_a_title_heading(self):
        got = us.parse_cabinet(CABINET_HTML)
        self.assertEqual([(g["name"], g["title"]) for g in got], [("Ann Alpha", "Secretary of State"), ("Bo B\u00e9ta, Jr.", "Attorney General"), ("Cy Gamma", "Secretary of the Treasury")])
        self.assertEqual(got[0]["id"], "secretary-of-state")

    def test_a_page_that_changed_shape_is_not_trusted(self):
        self.assertTrue(us.cabinet_problems([]))   # nothing parsed
        three = us.parse_cabinet(CABINET_HTML)
        self.assertTrue(any("expected 12" in p for p in us.cabinet_problems(three)))   # a real cabinet is not three people
        many = [{"id": f"t{i}", "name": f"First{i} Last{i}", "title": "Secretary of State | Attorney General | Secretary of the Treasury" if i == 0 else f"Role {i}"} for i in range(15)]
        self.assertEqual(us.cabinet_problems(many), [])
        many[1]["name"] = many[0]["name"]
        self.assertTrue(any("twice" in p for p in us.cabinet_problems(many)))
        many[1]["name"] = "Oneword"
        self.assertTrue(any("name" in p for p in us.cabinet_problems(many)))

    def test_the_cabinet_rides_in_the_executive_part_and_is_not_linked_to_agencies(self):
        cab = [{"id": "secretary-of-state", "name": "Ann Alpha", "title": "Secretary of State"}]
        s = us.build(LEGS, COMMS, MEMB, AGS, COUNTS, "2026-10-03T00:00:00+00:00", "2024-10-01", PEOPLE, JUDGES, "2026-10-03", cab)
        self.assertEqual(s["executive"]["cabinet"], cab)
        self.assertEqual(s["counts"]["cabinet"], 1)
        self.assertEqual(sorted(s["executive"]["cabinet"][0]), ["id", "name", "title"])   # no agency, no party, no rating
        s2 = us.build(LEGS, COMMS, MEMB, AGS, COUNTS, "2026-10-03T00:00:00+00:00", "2024-10-01", PEOPLE, JUDGES, "2026-10-03")
        self.assertNotIn("cabinet", s2["executive"])


class Judiciary(unittest.TestCase):
    def test_a_judge_sits_on_the_court_of_their_latest_service_and_retired_judges_are_left_out(self):
        courts, judges = us.build_judiciary(JUDGES)
        by = {j["last"]: j for j in judges}
        self.assertEqual(sorted(by), ["Capital", "Circuit", "District", "Guam", "Trade", "Upper"])   # senior and retired are not listed
        self.assertEqual(by["Upper"]["court_id"], "supreme-court-of-the-united-states")   # not the circuit court they left
        self.assertEqual(by["Upper"]["title"], "Associate Justice")

    def test_courts_count_active_and_senior_judges_apart(self):
        courts, _ = us.build_judiciary(JUDGES)
        oh = next(c for c in courts if c["name"] == NOH)
        self.assertEqual((oh["active_judges"], oh["senior_judges"]), (1, 1))
        self.assertEqual(courts[0]["type"], "supreme")   # the Supreme Court first, then appeals, then district, then the rest
        self.assertEqual(courts[-1]["type"], "other")

    def test_a_district_court_belongs_to_the_circuit_for_its_state(self):
        courts, _ = us.build_judiciary(JUDGES)
        by = {c["name"]: c for c in courts}
        self.assertEqual(by[NOH]["circuit"], us.slug(S6))
        self.assertIsNone(by["U.S. Court of International Trade"]["circuit"])
        self.assertIsNone(by["U.S. District Court for the District of Columbia"]["circuit"])   # this sample has no D.C. Circuit judge, so there is no court to point at
        self.assertEqual(us.circuit_of("U.S. District Court for the District of the Northern Mariana Islands", "district"), "Ninth")
        self.assertEqual(us.circuit_of("U.S. District Court for the Eastern District of North Carolina", "district"), "Fourth")
        self.assertEqual(us.circuit_of("U.S. District Court for the District of Columbia", "district"), "District of Columbia")

    def test_every_state_is_in_exactly_one_circuit(self):
        states = [x for v in us.CIRCUIT_STATES.values() for x in v]
        self.assertEqual(len(states), len(set(states)))
        self.assertEqual(len(us.CIRCUIT_STATES), 12)   # eleven numbered circuits and the D.C. Circuit; the Federal Circuit has no districts

    def test_chief_judges_are_the_ones_with_an_open_chief_service(self):
        _, judges = us.build_judiciary(JUDGES)
        self.assertEqual([j["last"] for j in judges if j["chief"]], ["Circuit"])

    def test_names_join_first_middle_last_and_suffix(self):
        _, judges = us.build_judiciary([judge(9, "Ann", "Bee", lambda k: svc(k, "U.S. District Court", "U.S. District Court for the District of Maine"), middle="C.", suffix="Jr.")])
        self.assertEqual(judges[0]["name"], "Ann C. Bee Jr.")

    def test_the_president_is_found_by_date_and_the_old_ones_are_kept_only_if_they_appointed_a_sitting_judge(self):
        _, judges = us.build_judiciary(JUDGES)
        ex = us.build_executive(PEOPLE, "2026-10-03", [j["appointed_by"] for j in judges])
        self.assertEqual((ex["president"]["name"], ex["vice_president"]["name"]), ("Quinn Arthur Prez", "Vic Vice"))
        self.assertEqual(sorted(p["name"] for p in ex["presidents"]), ["Patrick Q. Prez", "Quinn Arthur Prez"])   # the unrelated old President is not carried
        self.assertTrue(next(p for p in ex["presidents"] if p["name"].startswith("Quinn"))["current"])
        self.assertTrue(ex["president"]["id"].startswith("P-"))   # no Bioguide ID in the file: a stable one is made from the name
        self.assertEqual(us.build_executive(PEOPLE, "2012-06-01", [])["president"]["name"], "Patrick Q. Prez")   # the same file answers for another day

    def test_the_snapshot_links_each_judge_to_the_president_who_appointed_them(self):
        s = us.build(LEGS, COMMS, MEMB, AGS, COUNTS, "2026-10-03T00:00:00+00:00", "2024-10-01", PEOPLE, JUDGES, "2026-10-03")
        ids = {p["id"] for p in s["executive"]["presidents"]}
        self.assertTrue(all(j["appointed_by_id"] in ids for j in s["judiciary"]["judges"]))
        self.assertEqual((s["counts"]["justices"], s["counts"]["judges"]), (1, 6))
        for j in s["judiciary"]["judges"]:
            self.assertEqual(sorted(j), ["appointed_by", "appointed_by_id", "chief", "commissioned", "court_id", "id", "last", "name", "title"])   # no party, no rating, no score
        self.assertTrue(any("justices" in p for p in us.check(s)))   # one justice is not a Supreme Court

    def test_a_president_name_that_fits_two_people_is_left_unmatched(self):
        both = PEOPLE + [{"id": {"bioguide": "P2"}, "name": {"first": "Patrick", "middle": "R.", "last": "Prez"}, "terms": [{"type": "prez", "start": "1990-01-01", "end": "1994-01-01", "party": "Old"}]}]
        rows = [judge(1, "A", "A", lambda k: svc(k, "U.S. District Court", "U.S. District Court for the District of Maine", pres="Patrick Prez"))]
        s = us.build(LEGS, COMMS, MEMB, AGS, COUNTS, "2026-10-03T00:00:00+00:00", "2024-10-01", both, rows, "2026-10-03")
        self.assertIsNone(s["judiciary"]["judges"][0]["appointed_by_id"])   # two Presidents fit "Patrick Prez": match neither, and the safety check will say so

    def test_the_old_snapshot_shape_still_builds_without_the_new_sources(self):
        s = us.build(LEGS, COMMS, MEMB, AGS, COUNTS, "2026-10-03T00:00:00+00:00", "2024-10-01")
        self.assertNotIn("judiciary", s)


import fetch_portraits as fp


class Portraits(unittest.TestCase):
    def test_wanted_ids_are_members_and_presidents_with_a_bioguide_id_only(self):
        snap = {"members": [{"id": "B1"}, {"id": "A1"}],
                "executive": {"president": {"id": "P-donald-j-trump"}, "vice_president": {"id": "V1"}, "presidents": [{"id": "O1"}, {"id": "P-george-walker-bush"}, {"id": "A1"}]}}
        self.assertEqual(fp.wanted_ids(snap), ["A1", "B1", "O1", "V1"])   # sorted, no repeats, and no stand-in ids made from a name
        self.assertEqual(fp.wanted_ids({"members": [{"id": "Z"}]}), ["Z"])   # a snapshot with no executive still works

    def test_a_missing_folder_is_not_a_problem_and_a_mostly_empty_one_is_a_warning(self):
        snap = {"members": [{"id": str(i)} for i in range(20)]}
        self.assertEqual(fp.check(snap, "no-such-folder"), [])
        import tempfile
        with tempfile.TemporaryDirectory() as d:
            self.assertTrue(any("no picture" in p for p in fp.check(snap, d)))
            for i in range(19):
                open(os.path.join(d, f"{i}.webp"), "wb").close()
            self.assertEqual(fp.check(snap, d), [])

    @unittest.skipUnless(importlib.util.find_spec("PIL"), "Pillow is not installed")
    def test_a_photo_shrinks_to_a_small_webp_of_the_set_size(self):
        from PIL import Image
        src = io.BytesIO()
        Image.new("RGB", (225, 275), (120, 90, 60)).save(src, "JPEG")
        out = fp.shrink(src.getvalue(), Image)
        im = Image.open(io.BytesIO(out))
        self.assertEqual((im.format, im.size), ("WEBP", (fp.WIDTH, fp.HEIGHT)))
        self.assertLess(len(out), 6000)

    @unittest.skipUnless(importlib.util.find_spec("PIL"), "Pillow is not installed")
    def test_a_photo_of_another_shape_is_cropped_not_squeezed(self):
        from PIL import Image
        for size in ((180, 225), (300, 200), (200, 400)):   # the Congress directory's shape, a wide one, and a tall one
            src = io.BytesIO()
            Image.new("RGB", size, (120, 90, 60)).save(src, "JPEG")
            self.assertEqual(Image.open(io.BytesIO(fp.shrink(src.getvalue(), Image))).size, (fp.WIDTH, fp.HEIGHT))
        # a left half red, right half blue wide picture keeps its middle after the sides are trimmed
        wide = Image.new("RGB", (400, 200)); wide.paste((255, 0, 0), (0, 0, 200, 200)); wide.paste((0, 0, 255), (200, 0, 400, 200))
        src = io.BytesIO(); wide.save(src, "JPEG")
        out = Image.open(io.BytesIO(fp.shrink(src.getvalue(), Image))).convert("RGB")
        self.assertGreater(out.getpixel((10, 100))[0], 200)                       # still red on the left
        self.assertGreater(out.getpixel((fp.WIDTH - 10, 100))[2], 200)            # still blue on the right



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
