#!/usr/bin/env python3
"""Tests for the street-address index behind "Find my districts" (data/districts-2026.json, built by scripts/fetch_districts.py).

  python scripts/test_districts.py

The page matches an address against this file on the device, so what must be true of the file itself is checked here: the street-name
rules agree with the page's (scripts/fixtures/dist-norm.json, checked from the other side by scripts/test_districts.js), the shape is
what the page expects, every answer points at a real combination of districts, and the file holds streets and numbers and nothing that
could name a person. No network. (Needs nothing beyond the standard library: the mapping tools are only needed to rebuild the file.)
"""
import json, os, re, sys, unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import fetch_districts as fd

ROOT = os.path.join(HERE, "..")
D = json.load(open(os.path.join(ROOT, "data", "districts-2026.json"), encoding="utf-8"))


class Rules(unittest.TestCase):
    def test_street_names_normalize_the_way_the_page_expects(self):
        for c in json.load(open(os.path.join(HERE, "fixtures", "dist-norm.json"), encoding="utf-8")):
            self.assertEqual(fd.norm(c["in"]), c["norm"], c["in"])
            self.assertEqual(fd.core(c["norm"]), c["core"], c["in"])


class Shape(unittest.TestCase):
    def test_the_parts_the_page_reads_are_there(self):
        for k in ("meta", "places", "schools", "tuples", "splits", "cores", "streets"):
            self.assertIn(k, D)
        self.assertGreater(len(D["streets"]), 2000)
        self.assertGreater(len(D["tuples"]), 20)

    def test_every_answer_points_at_a_real_combination(self):
        n, s = len(D["tuples"]), len(D["splits"])
        for key, rs in D["streets"].items():
            for lo, hi, par, zp, val in rs:
                self.assertLessEqual(lo, hi, key)
                self.assertIn(par, ("E", "O", "B"), key)
                if val >= 0:
                    self.assertLess(val, n, key)
                else:
                    self.assertLess(-1 - val, s, key)
        for sp in D["splits"]:
            self.assertGreater(len(sp), 1)
            for t in sp:
                self.assertLess(t, n)
        for t in D["tuples"]:
            self.assertEqual(len(t), 7)
            self.assertLess(t[5], len(D["places"]))
            self.assertLess(t[6], len(D["schools"]))

    def test_every_street_is_reachable_by_its_core_name(self):
        for core, keys in D["cores"].items():
            for k in keys:
                self.assertIn(k, D["streets"])
                self.assertEqual(fd.core(k), core)
        indexed = {k for ks in D["cores"].values() for k in ks}
        self.assertEqual(indexed, set(D["streets"]))

    def test_the_known_districts_are_the_ones_on_the_ballot(self):
        cds = {t[0] for t in D["tuples"] if t[0]}
        self.assertTrue({"07", "11"} <= {c.zfill(2) for c in cds}, cds)


class NoPeople(unittest.TestCase):
    def test_the_file_holds_streets_and_numbers_only(self):
        text = json.dumps(D)
        self.assertNotRegex(text, r"@[a-z0-9-]+\.[a-z]{2,}", "an email address")
        self.assertNotRegex(text, r"\b\d{3}[-.]\d{3}[-.]\d{4}\b", "a phone number")
        for key in D["streets"]:
            self.assertRegex(key, r"^[a-z0-9 ]+$", "a street name with odd characters: " + key)
        self.assertEqual(set(D["meta"]) - {"about", "retrieved_at", "address_ranges", "congress_and_legislature", "county_council", "city_wards", "places", "offset_metres", "fields"}, set())

    def test_no_dashes_in_what_a_resident_could_read(self):
        self.assertNotRegex(json.dumps(D["meta"], ensure_ascii=False), "[\u2013\u2014]")


if __name__ == "__main__":
    unittest.main()
