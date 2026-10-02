#!/usr/bin/env python3
"""Tests for the Spanish dictionary, i18n/es.json: what must be true of every entry before the app may use it.

  python scripts/test_i18n.py

No network. The dictionary is a draft that a Spanish-speaking reviewer has not read yet; these tests cannot judge the Spanish, but they stop
the mistakes a machine can see: a placeholder dropped or added, a bold or link tag out of order, a dash (the project writes none), an entry
that is the English unchanged, a changed number, and a civic term that the glossary fixes (ward, ballot, levy, Council...) rendered another way.
"""
import json, os, re, sys, unittest

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
PATH = os.path.join(ROOT, "i18n", "es.json")
PH = re.compile(r"\{[nfdt$*]\}")
TAG = re.compile(r"</?\d+>")


def load():
    with open(PATH, encoding="utf-8") as f:
        return json.load(f)


def entries(d):
    for k, v in d["exact"].items():
        yield "exact", k, v
    for k, v in d["masked"].items():
        yield "masked", k, v


def nums(s):
    return re.findall(r"\d+(?:[.,]\d+)*", PH.sub("", s))


# glossary rules that are safe to check by machine: if the English has the word, the Spanish must use the glossary's word.
# (English pattern, Spanish pattern, name). Only whole words; "forward", "toward", "warden" are not "ward".
GLOSSARY = [
    (r"\bwards?\b", r"distrito", "ward -> distrito"),
    (r"\bballots?\b", r"boleta|votaci|papeleta", "ballot -> boleta"),
    (r"\blev(y|ies)\b", r"gravamen|impuesto", "levy -> gravamen"),
    (r"\bordinances?\b", r"ordenanza", "ordinance -> ordenanza"),
    (r"\bBoard of Elections\b", r"Junta Electoral", "Board of Elections -> Junta Electoral"),
    (r"\bCity Council\b", r"Concejo", "City Council -> Concejo"),
]
# an English phrase that carries a rule must keep its meaning; these exact Spanish phrases are required wherever the English appears whole.
RULES = [
    (r"sponsorship is not a vote", r"patroc\w+ .*no es votar|no es lo mismo que votar|patrocinio no es un voto", "sponsorship is not a vote"),
    (r"missing record is not a no", r"falta de un registro|un registro faltante|registro que falta|sin registro", "a missing record is not a no"),
]


class Structure(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.d = load()

    def test_it_has_the_four_parts(self):
        for k in ("meta", "exact", "masked", "keep"):
            self.assertIn(k, self.d)
        self.assertIsInstance(self.d["keep"], list)

    def test_it_says_it_is_a_draft_until_a_person_has_reviewed_it(self):
        self.assertRegex(self.d["meta"]["status"], r"(?i)draft|reviewed by")

    def test_every_pattern_is_a_valid_regular_expression(self):
        for en in self.d["masked"]:
            body = re.escape(en.lstrip("~"))
            body = re.sub(r"\\\{[nfdt$*]\\\}", ".*?", body)
            re.compile("^" + body + "$")

    def test_a_pattern_has_enough_fixed_words_not_to_match_everything(self):
        for en in self.d["masked"]:
            fixed = re.sub(r"[^A-Za-z]", "", TAG.sub("", PH.sub("", en)))
            self.assertGreaterEqual(len(fixed), 3, f"too loose: {en}")


class Entries(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.d = load()
        cls.rows = list(entries(cls.d))

    def test_no_entry_is_empty_or_the_english_unchanged(self):
        for kind, en, es in self.rows:
            self.assertTrue(es.strip(), f"empty: {en}")
            if re.search(r"[A-Za-z]{4,}", PH.sub("", en)) and es == en:
                # a sentence that happens to be the same in both languages is not a sign of a missing translation
                self.assertLess(len(en.split()), 3, f"unchanged: {en}")

    def test_placeholders_match_in_number_and_kind(self):
        for kind, en, es in self.rows:
            for ph in ("{*}", "{n}", "{$}", "{f}", "{d}", "{t}"):
                self.assertEqual(en.count(ph), es.count(ph), f"{ph} in: {en}  /  {es}")

    def test_bold_and_link_tags_match_in_order(self):
        for kind, en, es in self.rows:
            self.assertEqual("".join(TAG.findall(en)), "".join(TAG.findall(es)), f"tags in: {en}")

    def test_numbers_are_not_changed(self):
        for kind, en, es in self.rows:
            self.assertEqual(nums(en), nums(es), f"numbers in: {en}")

    def test_no_em_or_en_dashes(self):
        for kind, en, es in self.rows:
            self.assertNotRegex(es, "[—–]", f"dash in: {es}")

    def test_no_leftover_english_markers(self):
        for kind, en, es in self.rows:
            self.assertNotRegex(es, r"\bTODO:|\?\?\?|\bFIXME\b", f"unfinished: {es}")   # "todo" is also Spanish for "all"

    def test_the_glossary_terms_are_used(self):
        misses = []
        for kind, en, es in self.rows:
            for ep, sp, name in GLOSSARY:
                if re.search(ep, en, re.I) and not re.search(sp, es, re.I) and len(en.split()) >= 3:
                    misses.append((name, en[:70], es[:70]))
        # a small number is expected (a sentence can say "ballot" once and the Spanish can reasonably avoid repeating it);
        # a wave of them means a translator ignored the glossary.
        limit = max(25, len(self.rows) // 40)
        self.assertLess(len(misses), limit, "\n".join(f"{n}: {e} / {s}" for n, e, s in misses[:15]))

    def test_the_rules_that_carry_meaning_keep_it(self):
        for kind, en, es in self.rows:
            for ep, sp, name in RULES:
                if re.search(ep, en, re.I):
                    self.assertRegex(es, "(?i)" + sp, f"{name}: {en[:80]} / {es[:80]}")


class Keep(unittest.TestCase):
    def test_nothing_is_both_kept_in_english_and_translated(self):
        d = load()
        both = set(d["keep"]) & (set(d["exact"]) | set(d["masked"]))
        self.assertEqual(both, set(), "kept and translated: " + ", ".join(sorted(both)[:5]))


if __name__ == "__main__":
    unittest.main()
