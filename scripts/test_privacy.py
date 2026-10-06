#!/usr/bin/env python3
"""The privacy policy names exactly what the app saves in the browser, and says nothing a machine can see is untrue.

  python scripts/test_privacy.py

No browser and no network. It reads every place the app's code touches browser storage: our code (ext/*.jsx), the scripts build.py
writes into the page and the service worker, and the compiled Sep 23 app inside inputs/ (the three chunks build.py bundles). It reads the
policy's own list (CX_POLICY in ext/cx-privacy.jsx, strict JSON between the PRIVACY-TEXT markers) and fails if:
  - the code saves something under a name the policy does not list (so a new key fails until the page names it), or in another place
    (local storage, session storage, the cache) than the policy says;
  - the policy lists something the code never saves (an item marked "old" must be one the code only reads or deletes);
  - the code reads a name it never saves that is not listed below in READ_ONLY with the reason;
  - anything touches cookies, IndexedDB, Web SQL, or the cookie store;
  - the policy has a dash or a legal promise word, its short version is not three lines that lead with no accounts, no cookies, and
    no analytics, or it types the remembered place's limits by hand instead of reading them from the code;
  - /privacy is not sent to the app by vercel.json;
  - docs/privacy-claims.md leaves a part of the policy without a row, or names a check or test that does not exist.
The privacy-policy browser check (scripts/checks/run.js) runs the app through its flows and compares what it really writes.
"""
import json, os, re, sys, tarfile, unittest

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
EXT = os.path.join(ROOT, "ext")
CHUNKS = ("CivicAtlas-ramPAjr5.js", "framework-D_rUT4EX.js", "rolldown-runtime-C60lm6uB.js")   # what build.py bundles from the compiled app
# names the code reads but never saves: each needs a reason, and none is shown to residents because nothing is kept under it
READ_ONLY = {"cx-i18n-debug": "a switch only scripts/i18n/crawl.js sets, so the Spanish crawl can ask the translator what it missed; the app never saves it"}
LEGAL = re.compile(r"\b(guarantee[sd]?|ensures?|ensured|assures?|warrant(y|ies|s)?|compliant|compliance|certif(y|ied|ies)|GDPR|CCPA|COPPA|HIPAA|promises?|liab(le|ility)|indemnif\w*|fully secure|bank.level|military.grade)\b|100 ?%", re.I)
STORE = re.compile(r"\b(localStorage|sessionStorage)\s*\.\s*(setItem|getItem|removeItem)\(\s*([^,)]+?)\s*[,)]")
PUT = re.compile(r"\bcxmPut\(\s*([^,)]+?)\s*,")
GET = re.compile(r"\bcxmStore\(\s*([^,)]+?)\s*,")


def read(p):
    with open(p, encoding="utf-8") as f:
        return f.read()


def sources():
    """(label, text) for every piece of code that runs in the page or its service worker."""
    out = [(f"ext/{n}", read(os.path.join(EXT, n))) for n in sorted(os.listdir(EXT)) if n.endswith((".jsx", ".js"))]
    out.append(("build.py", read(os.path.join(ROOT, "build.py"))))
    with tarfile.open(os.path.join(ROOT, "inputs", "Cleveland-Civic-Graph-Agentic-Bench-Source.tar.gz")) as t:
        for m in t.getmembers():
            if os.path.basename(m.name) in CHUNKS:
                out.append((f"compiled {os.path.basename(m.name)}", t.extractfile(m).read().decode("utf-8")))
    return out


def resolve(arg, text, at, compiled):
    """The storage name a call uses: a string in the call; or the last string given to that name before the call in the same code; or,
    for a name our code borrows from the compiled app (Sm, Cm), the one string the compiled app gives it."""
    arg = arg.strip()
    m = re.fullmatch(r"[`'\"]([^`'\"$]+)[`'\"]", arg)
    if m:
        return m.group(1)
    if re.fullmatch(r"[A-Za-z_$][\w$]*", arg):
        rx = re.compile(r"(?<![\w$.])" + re.escape(arg) + r"\s*=\s*[`'\"]([^`'\"$]+)[`'\"]")
        defs = [d for d in rx.finditer(text) if d.start() < at]
        if defs:
            return defs[-1].group(1)
        there = {d.group(1) for c in compiled for d in rx.finditer(c)}
        if len(there) == 1:
            return there.pop()
    return None


def storage_uses():
    """{name: {"where": set of local/session, "ops": set of set/get/remove, "at": [places]}} and a list of uses that could not be read."""
    uses, unknown = {}, []
    src = sources()
    compiled = [t for label, t in src if label.startswith("compiled ")]
    for label, text in src:
        for m in STORE.finditer(text):
            area = "local" if m.group(1) == "localStorage" else "session"
            op = {"setItem": "set", "getItem": "get", "removeItem": "remove"}[m.group(2)]
            key = resolve(m.group(3), text, m.start(), compiled)
            if key is None:
                # the two helpers that pass a name through (cxmPut, cxmStore) are read at their callers instead
                fn = re.findall(r"function (\w+)\(", text[:m.start()])
                if fn and fn[-1] in ("cxmPut", "cxmStore"):
                    continue
                unknown.append(f"{label}: {m.group(0)}")
                continue
            u = uses.setdefault(key, {"where": set(), "ops": set(), "at": []})
            u["where"].add(area); u["ops"].add(op); u["at"].append(label)
        for rx, op in ((PUT, "set"), (GET, "get")):
            for m in rx.finditer(text):
                if text[max(0, m.start() - 9):m.start()] == "function ":
                    continue
                key = resolve(m.group(1), text, m.start(), compiled)
                if key is None:
                    unknown.append(f"{label}: {m.group(0)}")
                    continue
                u = uses.setdefault(key, {"where": set(), "ops": set(), "at": []})
                u["where"].add("local"); u["ops"].add(op); u["at"].append(label)
    return uses, unknown


def policy():
    src = read(os.path.join(EXT, "cx-privacy.jsx"))
    block = re.search(r"/\* PRIVACY-TEXT-START.*?PRIVACY-TEXT-END \*/", src, re.S).group(0)
    return json.loads(re.search(r"const CX_POLICY = (\{.*?\n\});\n", block, re.S).group(1)), src


def words(p):
    """Every sentence the policy shows, as one string per piece."""
    out = list(p["short"]) + [c[1] for c in p["changed"]]
    for s in p["sections"]:
        out.append(s["heading"])
        for b in s["body"]:
            out.append(b if isinstance(b, str) else b.get("text") or b.get("report") or "")
    for x in p["stored"]:
        out += [x["title"], x["text"], x["note"]]
    return [w for w in out if w]


class TheListIsWhatTheCodeSaves(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.uses, cls.unknown = storage_uses()
        cls.p, cls.src = policy()
        cls.listed = {x["key"]: x for x in cls.p["stored"]}

    def test_every_storage_call_names_what_it_saves(self):
        self.assertEqual(self.unknown, [], "a storage call whose name this test cannot read: give the name a constant")

    def test_found_the_known_names(self):
        # a guard on the reader itself: if it stops finding these, it is broken, not the app
        for k in ("cx-lang", "cx-place", "cleveland-practice-ballot-2026-v1", "cleveland-civic-values-v2", "cx-es-note", "cx-easy"):
            self.assertIn(k, self.uses)

    def test_every_saved_name_is_on_the_page(self):
        bad = []
        for k, u in sorted(self.uses.items()):
            if "set" not in u["ops"]:
                continue
            if k not in self.listed:
                bad.append(f"the code saves {k!r} ({', '.join(sorted(set(u['at'])))}) but the privacy policy does not list it")
            elif self.listed[k]["where"] not in u["where"]:
                bad.append(f"{k!r} is saved in {'/'.join(sorted(u['where']))} storage but the policy says {self.listed[k]['where']}")
        self.assertEqual(bad, [], "\n  " + "\n  ".join(bad))

    def test_every_name_on_the_page_is_saved_or_marked_old(self):
        bad = []
        for k, x in self.listed.items():
            if x["where"] == "cache":
                continue
            u = self.uses.get(k)
            if u is None:
                bad.append(f"the policy lists {k!r}, but no code touches it")
            elif x["where"] == "old" and "set" in u["ops"]:
                bad.append(f"{k!r} is marked old (no longer saved) but the code saves it")
            elif x["where"] != "old" and "set" not in u["ops"]:
                bad.append(f"the policy lists {k!r}, but the code never saves it")
        self.assertEqual(bad, [], "\n  " + "\n  ".join(bad))

    def test_a_name_that_is_only_read_has_a_reason(self):
        bad = [k for k, u in sorted(self.uses.items()) if "set" not in u["ops"] and k not in self.listed and k not in READ_ONLY]
        self.assertEqual(bad, [], "the code reads these but never saves them: list each on the page as old, or in READ_ONLY here with the reason")

    def test_the_cache_is_the_service_worker_and_is_listed(self):
        b = read(os.path.join(ROOT, "build.py"))
        sw = b[b.index('SERVICE_WORKER = """'):b.index('"""', b.index('SERVICE_WORKER = """') + 20)]
        self.assertIn('const V = "cx-__ID__";', sw)
        self.assertEqual(re.findall(r"caches\.open\((\w+)\)", sw), ["V"] * len(re.findall(r"caches\.open\(", sw)))
        cache = [x for x in self.p["stored"] if x["where"] == "cache"]
        self.assertEqual([x["key"] for x in cache], ["cx-"], "the policy should list the site's saved copy once, by its name cx-")
        for label, text in sources():
            if label != "build.py":
                self.assertNotRegex(text, r"\bcaches\.open\(", f"{label} opens a cache the policy does not describe")

    def test_no_cookies_no_databases(self):
        for label, text in sources():
            for bad in (r"document\.cookie", r"\bindexedDB\b", r"\bcookieStore\b", r"\bopenDatabase\("):
                self.assertNotRegex(text, bad, f"{label} uses {bad}; the policy says the site sets no cookies and lists every place it saves")


class ThePageSaysItPlainly(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.p, cls.src = policy()
        cls.all = words(cls.p)

    def test_no_dash(self):
        for w in self.all:
            self.assertNotRegex(w, "[\u2013\u2014]", f"a dash in the policy: {w}")

    def test_no_legal_promise_words(self):
        for w in self.all:
            self.assertIsNone(LEGAL.search(w), f"a legal promise word in the policy: {w}")

    def test_the_short_version_leads(self):
        s = self.p["short"]
        self.assertEqual(len(s), 3)
        self.assertRegex(s[0], r"No accounts\. No cookies\. No analytics\.")
        self.assertRegex(s[1], r"never leave your device")
        self.assertRegex(s[2], r"Remember this device")

    def test_the_place_limits_come_from_the_code(self):
        place = " ".join(b for s in self.p["sections"] if s["id"] == "place" for b in s["body"] if isinstance(b, str))
        self.assertIn("{days}", place)
        self.assertIn("{last}", place)
        self.assertNotRegex(" ".join(self.all), r"\b120\b|November 10", "the place's limits are typed by hand; use {days} and {last}")
        core = read(os.path.join(EXT, "cxm-core.jsx"))
        self.assertRegex(core, r"const CX_PLACE_KEEP_DAYS = \d+;")
        self.assertRegex(core, r"const CX_PLACE_LAST_DAY = `\d{4}-\d{2}-\d{2}`;")

    def test_it_is_dated_and_says_it_is_a_draft_until_approved(self):
        self.assertRegex(self.p["changed"][0][0], r"^\d{4}-\d{2}-\d{2}$")
        self.assertEqual(self.p["changed"], sorted(self.p["changed"], reverse=True), "the changes are listed newest first")
        self.assertIn("This policy is a draft. A person has not yet approved it.", self.src)
        self.assertIn("CX_PRIVACY_REVIEW", self.src)

    def test_no_email_address_on_the_page(self):
        self.assertNotRegex(" ".join(self.all), r"[\w.+-]+@[\w-]+\.[\w.]+", "a contact address is Brent's to choose; until then the page offers only the GitHub issue")

    def test_every_part_has_a_heading_and_an_id(self):
        ids = [s["id"] for s in self.p["sections"]]
        self.assertEqual(len(ids), len(set(ids)))
        for s in self.p["sections"]:
            self.assertTrue(s["heading"] and s["body"])


class TheAddressAndTheClaims(unittest.TestCase):
    def test_privacy_is_sent_to_the_app(self):
        v = json.loads(read(os.path.join(ROOT, "vercel.json")))
        rw = {r["source"]: r["destination"] for r in v.get("rewrites", [])}
        self.assertEqual(rw.get("/privacy"), "/index.html")
        for s in rw:
            self.assertRegex(s, r"^/[a-z/]*$", "the check server copies only exact-path rewrites; keep them exact")

    def test_every_part_of_the_policy_has_a_row_in_the_claims_table(self):
        p, _ = policy()
        doc = read(os.path.join(ROOT, "docs", "privacy-claims.md"))
        rows = [r for r in doc.splitlines() if r.startswith("| `")]
        parts = {re.match(r"\| `([\w-]+)`", r).group(1) for r in rows}
        for s in ["short"] + [s["id"] for s in p["sections"]]:
            self.assertIn(s, parts, f"docs/privacy-claims.md has no row for the {s!r} part of the policy")
        run = read(os.path.join(ROOT, "scripts", "checks", "run.js"))
        checks = set(re.findall(r"^  async '([\w-]+)'\(\)", run, re.M)) | set(re.findall(r"^  async ([\w]+)\(\)", run, re.M)) | set(re.findall(r"CHECKS\['([\w-]+)'\]", run))
        self.assertIn("privacy-policy", checks)
        for r in rows:
            cells = [c.strip() for c in r.strip("|").split("|")]
            self.assertEqual(len(cells), 4, f"a claims row needs four cells: {r[:80]}")
            backed = cells[3]
            names = re.findall(r"`([^`]+)`", backed)
            self.assertTrue(names or "reading" in backed, f"a claim with no check, test, or 'reading': {r[:100]}")
            for n in names:
                ok = n in checks or os.path.exists(os.path.join(ROOT, n))
                self.assertTrue(ok, f"docs/privacy-claims.md names {n!r}, which is not a browser check or a file")


if __name__ == "__main__":
    unittest.main(verbosity=1)
