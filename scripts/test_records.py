#!/usr/bin/env python3
"""Tests for Records, the one list of every dated record (scripts/records_feed.py; docs/plan-records-feed.md, phase 1).

  python scripts/test_records.py

No network, no browser. Builds the list from data/ as it stands and checks:
  * every row has a type, a date, a title or a reason it has none, a source name and a secure source address, and the time its source was pulled;
  * the counts equal the record: one legislation row per file in Council's 2026 record, one meeting row per meeting on the Clerk's calendar, and
    one vote row per roll call in data/votes-2026.json (the City Record, its other votes, and the ones read from Council's Legistar record);
  * a legislation row is dated by its latest dated action, never later than the day its source was pulled, and never earlier than it was introduced;
  * a vote row carries counts only, and its counts are the members' recorded words;
  * the ward ties equal the shared ward matcher in ext/cx-live.jsx (cxWardTie), run by Node on the same record, for every file and every ward;
  * no row carries a person's name outside the record's own title, and no field is a score, a rank, or an order of importance;
  * newest first, the same list from the same data every time, and Today's small file is the front of the same list.
"""
import json, os, re, subprocess, sys, unittest

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, ".."))
sys.path.insert(0, HERE)
import records_feed as RF


def load(name):
    with open(os.path.join(ROOT, "data", name), encoding="utf-8") as f:
        return json.load(f)


LEG, MEET, PLACE, VOTES, PEOPLE = load("legistar-2026.json"), load("meetings-2026.json"), load("place-2026.json"), load("votes-2026.json"), load("people-2026.json")
FEED = RF.build(LEG, MEET, PLACE, VOTES)
ROWS = FEED["rows"]
MATTERS = {m["file"]: m for m in LEG["matters"]}
ISO_DAY = re.compile(r"^\d{4}-\d{2}-\d{2}$")
ISO_TIME = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(\+00:00|Z)$")
# the fields each kind of row may have: a new field (a score, a rank, a sponsor's name) fails here until it is thought about
FIELDS = {
    "legislation": {"type", "id", "file", "date", "act", "body", "title", "kind", "status", "passed", "short", "wards", "src", "url", "pulled"},
    "meeting": {"type", "id", "mid", "date", "time", "title", "place", "items", "acted", "agenda", "minutes", "page", "wards", "src", "url", "pulled"},
    "vote": {"type", "id", "file", "date", "question", "table", "title", "count", "wards", "src", "url", "pulled"},
}
SCORE = re.compile(r"(score|rank|rating|grade|percent|weight|importan|priority|popular|trend|hot|best|top|strong|order)", re.I)


class EveryRow(unittest.TestCase):
    def test_every_row_has_a_type_a_date_a_source_and_a_pulled_time(self):
        self.assertGreater(len(ROWS), 1900)
        for r in ROWS:
            self.assertIn(r["type"], RF.TYPES, r)
            self.assertRegex(r["date"], ISO_DAY, r["id"])
            self.assertTrue(isinstance(r["src"], str) and len(r["src"]) > 5, f"{r['id']}: no source name")
            self.assertRegex(r["url"] or "", r"^https://", f"{r['id']}: no secure source address")
            self.assertRegex(r["pulled"] or "", ISO_TIME, f"{r['id']}: no pulled time")
            self.assertIn(r["pulled"], FEED["made_from"].values(), f"{r['id']}: pulled at a time no snapshot was pulled")
            self.assertTrue(r["title"] or (r["type"] == "vote" and r["file"] not in MATTERS), f"{r['id']}: no title")

    def test_ids_are_unique_and_rows_hold_only_known_fields(self):
        ids = [r["id"] for r in ROWS]
        self.assertEqual(len(ids), len(set(ids)))
        for r in ROWS:
            self.assertEqual(set(r), FIELDS[r["type"]], f"{r['id']}: fields {sorted(set(r) ^ FIELDS[r['type']])}")

    def test_no_field_is_a_score_or_a_rank(self):
        for t, fields in FIELDS.items():
            for k in fields:
                self.assertNotRegex(k, SCORE, f"{t}.{k}")
        for k in FEED:
            self.assertNotRegex(k, SCORE)


class CountsEqualTheRecord(unittest.TestCase):
    def test_one_legislation_row_per_file(self):
        rows = [r for r in ROWS if r["type"] == "legislation"]
        self.assertEqual(len(rows), len(LEG["matters"]))
        self.assertEqual({r["file"] for r in rows}, set(MATTERS))
        self.assertEqual(FEED["counts"]["legislation"], LEG["count"])

    def test_one_meeting_row_per_meeting(self):
        rows = [r for r in ROWS if r["type"] == "meeting"]
        self.assertEqual(len(rows), len(MEET["meetings"]))
        self.assertEqual(FEED["counts"]["meeting"], MEET["counts"]["meetings"])
        by = {m["id"]: m for m in MEET["meetings"]}
        for r in rows:
            m = by[r["mid"]]
            self.assertEqual((r["date"], r["title"], r["items"]), (m["date"], m["body"], len(m["items"])))
            self.assertEqual(r["acted"], sum(1 for _, a in m["items"] if a))

    def test_one_vote_row_per_roll_call(self):
        rows = [r for r in ROWS if r["type"] == "vote"]
        want = len(VOTES["votes"]) + len(VOTES["other"]) + len(VOTES.get("legistar_votes", {}))
        self.assertEqual(len(rows), want)
        self.assertEqual(FEED["counts"]["vote"], want)
        self.assertEqual(len([r for r in rows if r["src"].startswith("City Record")]), VOTES["counts"]["files"] + VOTES["counts"]["other"])

    def test_the_counts_add_up(self):
        c = FEED["counts"]
        self.assertEqual(c["all"], len(ROWS))
        self.assertEqual(c["all"], sum(c[t] for t in RF.TYPES))


class Legislation(unittest.TestCase):
    def test_dated_by_its_latest_dated_action_and_never_after_its_source_was_pulled(self):
        days = {v: RF.et_day(v) for v in FEED["made_from"].values()}
        for r in (x for x in ROWS if x["type"] == "legislation"):
            m = MATTERS[r["file"]]
            self.assertGreaterEqual(r["date"], m["intro"], r["id"])
            self.assertLessEqual(r["date"], days[r["pulled"]], f"{r['id']}: dated after its source was pulled")
            if m.get("passed"):
                self.assertGreaterEqual(r["date"], m["passed"], f"{r['id']}: an older action than its passing")
            hist = [d for d, a, b in PLACE["histories"].get(r["file"], []) if a and d <= days[PLACE["retrieved_at"]]]
            if hist:
                self.assertGreaterEqual(r["date"], max(hist), f"{r['id']}: an action history row is later than the row's date")
            acted = [mt["date"] for mt in MEET["meetings"] for f, a in mt["items"] if f == r["file"] and a and mt["date"] <= days[MEET["retrieved_at"]]]
            if acted:
                self.assertGreaterEqual(r["date"], max(acted), f"{r['id']}: a meeting acted on it later than the row's date")

    def test_what_happened_is_the_records_own_word(self):
        known = {"introduced", "referred", "passed", "effective"} | {a for mt in MEET["meetings"] for _, a in mt["items"] if a} | {a for h in PLACE["histories"].values() for _, a, _ in h}
        for r in (x for x in ROWS if x["type"] == "legislation"):
            self.assertIn(r["act"], known, r["id"])
            self.assertEqual(r["status"], MATTERS[r["file"]]["status"])
            self.assertEqual(r["title"], MATTERS[r["file"]]["title"])

    def test_a_ceremonial_resolution_is_a_short_row_with_no_ward_tie(self):
        cer = [r for r in ROWS if r["type"] == "legislation" and r["kind"] == "Ceremonial Resolution"]
        self.assertGreater(len(cer), 0)
        self.assertTrue(all(r["short"] and r["wards"] == [] for r in cer))
        self.assertTrue(all(not r["short"] for r in ROWS if r["type"] == "legislation" and r["kind"] != "Ceremonial Resolution"))


class Votes(unittest.TestCase):
    def test_a_vote_row_carries_counts_only_and_they_are_the_recorded_words(self):
        src = [(f, v) for f, v in VOTES["votes"].items()] + [(o["file"], o) for o in VOTES["other"]] + list(VOTES.get("legistar_votes", {}).items())
        by = {}
        for f, v in src:
            by.setdefault((f, v["date"], v["question"]), []).append(v)
        for r in (x for x in ROWS if x["type"] == "vote"):
            v = by[(r["file"], r["date"], r["question"])][0]
            want = {w: sum(1 for x in v["members"].values() if x == w) for w in RF.WORDS}
            self.assertEqual(r["count"], want, r["id"])
            self.assertEqual(sum(r["count"].values()), len(v["members"]), r["id"])
            self.assertEqual(r["table"], r["question"] == "Laid on the table")


class NoNames(unittest.TestCase):
    def test_no_person_is_named_outside_the_records_own_title(self):
        names = {p["name"] for p in PEOPLE["people"]} | {s for m in LEG["matters"] for s in m["sponsors"]}
        names |= {n for v in VOTES["votes"].values() for n in v["members"]}
        for r in ROWS:
            rest = json.dumps({k: v for k, v in r.items() if k not in ("title",)}, ensure_ascii=False)
            for n in names:
                if len(n) > 6 and n not in ("By Departmental Request",):
                    self.assertNotIn(n, rest, f"{r['id']}: names {n} outside the record's own title")
            self.assertNotRegex(rest, r"\b(Mr|Mrs|Ms|Dr)\.\s", f"{r['id']}: a personal name pattern outside the title")


class WardsEqualTheMatcher(unittest.TestCase):
    def test_every_ward_tie_equals_cxWardTie_in_ext_cx_live(self):
        with open(os.path.join(ROOT, "ext", "cx-live.jsx"), encoding="utf-8") as f:
            live = f.read()
        part = live[live.index("/* ---------- the ward matcher"):live.index("/* ---------- end of the ward matcher")]
        files = [[m["file"], m["title"]] for m in LEG["matters"] if m["type"] != "Ceremonial Resolution"]
        js = ("const fs = require('fs'), vm = require('vm');\n"
              "const input = JSON.parse(fs.readFileSync(0, 'utf8'));\n"
              "const ctx = vm.createContext({ CX_PL: input.place, cxMatch: () => ({}) });\n"
              "vm.runInContext(input.part + '\\n;this.api = { cxWardTie };', ctx);\n"
              "const out = {};\n"
              "for (const [f, t] of input.files) { const ties = []; for (let w = 1; w <= 15; w++) { const x = ctx.api.cxWardTie(f, t, w); if (x) ties.push([w, ...x]); } out[f] = ties; }\n"
              "process.stdout.write(JSON.stringify(out));\n")
        pl = {"funds": PLACE["funds"], "addresses": PLACE["addresses"]}
        res = subprocess.run(["node", "-e", js], input=json.dumps({"part": part, "files": files, "place": pl}), capture_output=True, text=True, encoding="utf-8", cwd=ROOT)
        self.assertEqual(res.returncode, 0, res.stderr[:400])
        want = json.loads(res.stdout)
        got = {r["file"]: r["wards"] for r in ROWS if r["type"] == "legislation" and not r["short"]}
        self.assertEqual(set(got), set(want))
        diff = [f for f in want if got[f] != want[f]]
        self.assertEqual(diff, [], f"{len(diff)} files differ from the shared matcher, for example {diff[:3]}: {[(got[f], want[f]) for f in diff[:2]]}")
        self.assertGreater(sum(1 for f in want if want[f]), 100, "the matcher found almost nothing: the record or the matcher changed")
        for r in (x for x in ROWS if x["type"] == "vote" and x["file"] in got):
            self.assertEqual(r["wards"], got[r["file"]], f"{r['id']}: a roll call's ward ties are not its file's")

    def test_the_python_matcher_reads_titles_as_javascript_does(self):
        self.assertEqual(RF.wards_in("New License Application, C1. Luxe Eatstation 815 Superior Ave. (Ward 3)"), {3})
        self.assertEqual(RF.wards_in("from the Neighborhood Equity Fund of Wards 1, 2 and 14"), {1, 2, 14})
        self.assertEqual(RF.wards_in("Ward 123 and Ward 16 and Rewards 4"), set())
        self.assertEqual(RF.wards_in("Ward 7 and WARDS 8 & 9"), {7, 8, 9})


class OrderAndRepeat(unittest.TestCase):
    def test_newest_first(self):
        self.assertTrue(all(ROWS[i]["date"] >= ROWS[i + 1]["date"] for i in range(len(ROWS) - 1)))

    def test_the_same_data_gives_the_same_bytes(self):
        a = json.dumps(RF.build(LEG, MEET, PLACE, VOTES), ensure_ascii=False, separators=(",", ":"))
        b = json.dumps(RF.build(load("legistar-2026.json"), load("meetings-2026.json"), load("place-2026.json"), load("votes-2026.json")), ensure_ascii=False, separators=(",", ":"))
        self.assertEqual(a, b)

    def test_latest_is_the_front_of_the_same_list(self):
        L = RF.latest(FEED)
        n = len(L["rows"])
        self.assertEqual(L["rows"], ROWS[:n])
        last = max(RF.et_day(v) for v in FEED["made_from"].values())
        self.assertGreaterEqual(sum(1 for r in L["rows"] if r["date"] <= last), 3, "Today's Latest needs at least three rows dated by the day the records were pulled")
        self.assertLess(len(json.dumps(L)), 30000, "the file Today reads is no longer small")

    def test_eastern_time_turns_at_two_in_the_morning(self):
        self.assertEqual(RF.et_day("2026-10-06T03:59:00+00:00"), "2026-10-05")   # 11:59 p.m. Oct. 5, daylight time
        self.assertEqual(RF.et_day("2026-10-06T04:00:00+00:00"), "2026-10-06")
        self.assertEqual(RF.et_day("2026-12-01T04:30:00+00:00"), "2026-11-30")   # standard time
        self.assertEqual(RF.et_day("2026-12-01T05:00:00+00:00"), "2026-12-01")


if __name__ == "__main__":
    unittest.main(verbosity=1)
