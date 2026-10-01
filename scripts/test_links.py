#!/usr/bin/env python3
"""Tests for scripts/check_links.py: how an answer is classified, and the two-checks-in-a-row rule.

  python scripts/test_links.py

No network. The probe is replaced with a fake, and the output goes to a temporary folder.
"""
import json, os, sys, tempfile, unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import check_links as cl


class Links(unittest.TestCase):
    def test_classify(self):
        self.assertEqual(cl.classify(200), "ok")
        self.assertEqual(cl.classify(301), "ok")
        self.assertEqual(cl.classify(404), "gone")
        self.assertEqual(cl.classify(410), "gone")
        self.assertEqual(cl.classify(403), "uncertain")  # a site refusing a robot is not a dead link
        self.assertEqual(cl.classify(429), "uncertain")
        self.assertEqual(cl.classify(0), "unreachable")
        self.assertEqual(cl.classify(503), "unreachable")

    def test_two_in_a_row(self):
        d = tempfile.mkdtemp()
        cl.OUT = os.path.join(d, "links.json")
        cl.collect = lambda: {"https://a.example/ok": {"x"}, "https://a.example/dead": {"x"}, "https://b.example/robot": {"x"}}
        cl.time.sleep = lambda s: None
        answers = {"https://a.example/ok": 200, "https://a.example/dead": 404, "https://b.example/robot": 403}
        cl.probe = lambda u: answers[u]
        s1 = cl.run()
        self.assertEqual([b["consecutive"] for b in s1["broken"]], [1])
        self.assertEqual(s1["uncertain"], 1)
        s2 = cl.run()  # still dead a week later
        self.assertEqual(s2["broken"][0]["consecutive"], 2)
        self.assertEqual(s2["broken"][0]["since"], s1["broken"][0]["since"])
        answers["https://a.example/dead"] = 200  # it comes back
        s3 = cl.run()
        self.assertEqual(s3["broken"], [])

    def test_patch_old_addresses_are_ignored(self):
        import re
        text = 'src = patch(src, "https://old.example/gone", "https://new.example/here", label="x")'
        kept = [m.group(0) for m in cl.URL.finditer(re.sub(r"patch\(src,\s*[\"`]https?://[^\"`]+[\"`]", "", text))]
        self.assertEqual([cl.clean(u) for u in kept], ["https://new.example/here"])


if __name__ == "__main__":
    unittest.main(verbosity=1)
