#!/usr/bin/env python3
"""Tests for the review stamp on the words for five offices (ext/cx-offices-text.jsx), with no browser and no network.

  python scripts/test_offices.py

  - the fingerprint covers exactly what is between the OFFICES-TEXT markers: a change inside changes it, a change outside does not
  - an em or en dash between the markers stops the build; a missing marker stops it
  - the review command refuses an empty name, writes the day and the fingerprint, and a review goes stale the moment the text changes
  - these tests write only into a temporary folder; the real data/offices-text-reviewed.json is never touched, and only
    build.py's mark_offices_reviewed writes that file (nothing else in the repository does)
"""
import contextlib, importlib, io, json, os, re, shutil, sys, tempfile, unittest

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, ROOT)
build = importlib.import_module("build")


def slurp(path):
    with open(path, encoding="utf-8", errors="replace") as f:
        return f.read()


SRC = slurp(os.path.join(ROOT, "ext", "cx-offices-text.jsx"))


class Stamp(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        os.makedirs(os.path.join(self.tmp, "ext"))
        os.makedirs(os.path.join(self.tmp, "data"))
        self.saved = (build.ROOT, build.EXT)
        build.ROOT, build.EXT = self.tmp, os.path.join(self.tmp, "ext")
        self.put(SRC)

    def tearDown(self):
        build.ROOT, build.EXT = self.saved
        shutil.rmtree(self.tmp, ignore_errors=True)

    def put(self, text):
        with open(os.path.join(self.tmp, "ext", "cx-offices-text.jsx"), "w", encoding="utf-8", newline="\n") as f:
            f.write(text)

    def test_the_real_file_has_its_markers_and_no_dash(self):
        fp = None
        build.ROOT, build.EXT = self.saved   # the real file, read only
        try:
            fp = build.offices_text_fp()
        finally:
            build.ROOT, build.EXT = self.tmp, os.path.join(self.tmp, "ext")
        self.assertRegex(fp, r"^[0-9a-f]{16}$")

    def test_a_change_between_the_markers_changes_the_fingerprint(self):
        a = build.offices_text_fp()
        self.put(SRC.replace("The term is four years.", "The term is four years, as the code says.", 1))
        self.assertNotEqual(a, build.offices_text_fp())

    def test_a_change_outside_the_markers_does_not(self):
        a = build.offices_text_fp()
        self.put(SRC.replace("function cxOfficeInfo(c) {", "function cxOfficeInfo(c) { /* a note */", 1))
        self.assertEqual(a, build.offices_text_fp())

    def test_a_dash_between_the_markers_stops_the_build(self):
        self.put(SRC.replace("The term is four years.", "The term is four years — no more.", 1))
        with self.assertRaises(SystemExit) as c:
            build.offices_text_fp()
        self.assertIn("dash", str(c.exception))

    def test_missing_markers_stop_the_build(self):
        self.put(SRC.replace("OFFICES-TEXT-END", "OFFICES-TEXT-STOP"))
        with self.assertRaises(SystemExit) as c:
            build.offices_text_fp()
        self.assertIn("markers are missing", str(c.exception))

    def test_the_command_needs_a_name_and_writes_the_day_and_the_fingerprint(self):
        path = os.path.join(self.tmp, "data", "offices-text-reviewed.json")
        with self.assertRaises(SystemExit) as c:
            build.mark_offices_reviewed("")
        self.assertIn("--mark-offices-reviewed", str(c.exception))
        self.assertFalse(os.path.exists(path))
        with contextlib.redirect_stdout(io.StringIO()):
            build.mark_offices_reviewed("Test Reviewer")
        r = json.loads(slurp(path))
        self.assertEqual(r["by"], "Test Reviewer")
        self.assertEqual(r["fp"], build.offices_text_fp())
        self.assertRegex(r["checked"], r"^\d{4}-\d{2}-\d{2}$")

    def test_a_review_goes_stale_when_the_text_changes(self):
        with contextlib.redirect_stdout(io.StringIO()):
            build.mark_offices_reviewed("Test Reviewer")
        r = json.loads(slurp(os.path.join(self.tmp, "data", "offices-text-reviewed.json")))
        self.assertEqual(r["fp"], build.offices_text_fp())   # reviewed while the text is what was read
        self.put(SRC.replace("chief law officer", "main law officer", 1))
        self.assertNotEqual(r["fp"], build.offices_text_fp())   # the page would say a person has not reviewed it


class Wiring(unittest.TestCase):
    def test_the_build_compares_the_stamp_with_the_text_and_passes_it_to_the_page(self):
        b = slurp(os.path.join(ROOT, "build.py"))
        self.assertIn('of5.get("fp") == offices_text_fp()', b)
        self.assertIn("const CX_OFFICES_REVIEW = ", b)
        self.assertIn('sys.argv[1] == "--mark-offices-reviewed"', b)

    def test_only_the_review_command_writes_the_review_file(self):
        writers = []
        for top in ("scripts", ".github"):
            for base, _, files in os.walk(os.path.join(ROOT, top)):
                for f in files:
                    if not f.endswith((".py", ".js", ".yml")) or f in ("test_offices.py", "test_offices.js"):
                        continue
                    p = os.path.join(base, f)
                    for line in slurp(p).splitlines():
                        if "offices-text-reviewed" in line and re.search(r"writeFileSync|write_text|\.write\(|open\([^)]*[\"']w", line):
                            writers.append(os.path.relpath(p, ROOT).replace("\\", "/"))
        # build.py writes it (mark_offices_reviewed); the browser check and the release plan only read it
        self.assertEqual(writers, [])
        self.assertIn('"data", "offices-text-reviewed.json"', slurp(os.path.join(ROOT, "build.py")))

    def test_the_words_are_not_marked_reviewed_in_the_repository_by_this_work(self):
        # a person marks the words reviewed, never a script or an agent: the stamp file is absent until Brent runs the command
        p = os.path.join(ROOT, "data", "offices-text-reviewed.json")
        if os.path.exists(p):
            r = json.loads(slurp(p))
            self.assertTrue(r.get("by") and r.get("by") not in ("Test Reviewer", "Claude"), r)


if __name__ == "__main__":
    unittest.main()
