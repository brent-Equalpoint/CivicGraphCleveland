#!/usr/bin/env python3
"""What each committee and subcommittee of Congress handles, in its own official words, and what the committee roles mean
(docs/plan-explain-committees-and-seats.md, phase 2; the sources and their terms: docs/source-notes-committees.md).

Output: data/us-explainers-2026.json (a build input; the build never fetches live). refresh.py runs this; nothing else writes it.

  * one row for every committee (49) and subcommittee (181) in data/us-landscape-2026.json, keyed by the record's id (HSWM, HSWM01):
    the official text, the source and its address, what part of it (the rule and clause), the Congress, and the day it was pulled.
    A committee or subcommittee with no official text gets {"text": null, "note": "No description on file"} and says what was checked.
  * one row for each committee role (Chair, Ranking Member, Vice Chair, Ex Officio, Cochair, Member) with the official words that say
    what the post is, and the record's own words for it.
  * the official words behind each step of "How a committee works".

Where the text is read from is scripts/us_explainer_config.py. Official text is quoted, never rewritten: the only changes are spaces and line
breaks, the parliamentarian's margin notes left out of the House rules, and an em dash written as two hyphens (an en dash as one), the way
the Government Publishing Office prints them in plain text, because the app prints no em or en dash.

Safe to run again: a row whose text did not change keeps the day it was first pulled, so a second run writes the same file. If a page does
not answer or has changed shape, its row keeps its last good text and the run prints a warning; nothing is guessed.
  python scripts/refresh.py --explainers   fetch and write (the nightly refresh also runs it on Mondays, or when the committees change)
  python scripts/fetch_explainers.py --check   the file's own checks, no network
"""
import concurrent.futures as cf, datetime, hashlib, html as _html, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
DATA = os.path.normpath(os.path.join(HERE, "..", "data"))
OUT = os.path.join(DATA, "us-explainers-2026.json")
LANDSCAPE = os.path.join(DATA, "us-landscape-2026.json")
NONE_NOTE = "No description on file"
MAX_TEXT = 7000


# ---------- text helpers (pure) ----------
def page_text(raw):
    """An HTML page as plain text: scripts, styles, navigation, headers, footers, and forms removed; one line per block; spaces collapsed."""
    b = re.sub(r"(?is)<!--.*?-->", " ", raw)
    b = re.sub(r"(?is)<(script|style|noscript|svg|nav|header|footer|form|select|template|iframe)\b[^>]*>.*?</\1\s*>", " ", b)
    b = re.sub(r"(?i)<br\s*/?>|</?(p|div|li|ul|ol|h[1-6]|tr|td|th|dd|dt|dl|section|article|main|aside|table|tbody|blockquote|figure|figcaption)\b[^>]*>", "\n", b)
    t = _html.unescape(re.sub(r"<[^>]+>", " ", b)).replace(" ", " ").replace("​", "")
    lines = [" ".join(x.split()) for x in t.split("\n")]
    return "\n".join(x for x in lines if x)


def cut(text, start, end):
    """The passage after the first match of `start` and before the first match of `end` that follows it (regular expressions).
    Returns None when either marker is missing, so a page that changed shape gives no text rather than the wrong text."""
    a = re.search(start, text)
    if not a:
        return None
    b = re.search(end, text[a.end():]) if end else None
    if end and not b:
        return None
    s = text[a.end():a.end() + b.start()] if b else text[a.end():]
    paras = [" ".join(p.split()) for p in s.split("\n")]
    s = "\n".join(p for p in paras if p).strip()
    return s or None


ITEM = re.compile(r"^(\(\w{1,5}\)|[A-Z]\.|\d+\.|[•·])\s")


def flow(text):
    """Join lines that a page broke inside a sentence (a printed page's fixed width); a numbered or lettered item starts its own line."""
    out = []
    for line in text.split("\n"):
        if out and not ITEM.match(line) and not re.search(r"[.:;!?]$", out[-1]):
            out[-1] += " " + line
        else:
            out.append(line)
    return "\n".join(out)


def tidy(text):
    """Official words as stored: GPO page markers out, an em dash as two hyphens and an en dash as one, spaces collapsed."""
    if text is None:
        return None
    t = re.sub(r"\[\[Page [A-Z]?\d+\]\]", " ", text).replace("—", "--").replace("–", "-").replace("­", "")
    t = "\n".join(" ".join(x.split()) for x in t.split("\n"))
    t = "\n".join(x for x in t.split("\n") if x).strip()
    return t or None


def manual_text(raw):
    """The House Rules and Manual (one <pre> page) as paragraphs, one per line: a line that starts with spaces starts a paragraph, a line
    that does not continues the one before, and a blank line (the end of a rule's text, before the parliamentarian's notes) stays blank."""
    m = re.search(r"(?is)<pre>(.*)</pre>", raw)
    t = m.group(1) if m else raw
    t = re.sub(r"(?s)<<NOTE:.*?>>", " ", t)
    t = re.sub(r"<greek-l>|\x06", " ", t)
    t = _html.unescape(t)
    paras, blank = [], False
    for line in t.split("\n"):
        if not line.strip():
            if paras and paras[-1] != "":
                paras.append("")
            continue
        if line[:1] in (" ", "\t") or not paras or paras[-1] == "":
            paras.append(" ".join(line.split()))
        else:
            paras[-1] += " " + " ".join(line.split())
    return "\n".join(paras)


def rule_x(mt, name):
    """House Rule X, clause 1: "(x) Committee on <name>." and its numbered subjects, up to the blank line before the notes."""
    a = re.search(r"\n\(([a-z])\) Committee on " + re.escape(name) + r"\.\n", mt)
    if not a:
        return None, None
    b = mt.find("\n\n", a.end())
    body = mt[a.end():b if b > 0 else None].strip()
    if not body:
        return None, None
    return tidy(f"Committee on {name}.\n{body}"), f"House Rule X, clause 1({a.group(1)})"


def senate_rule_text(raw, title):
    """One of the Standing Rules of the Senate from the Rules Committee's page: the page carries each rule as HTML inside its data."""
    for m in re.finditer(r'"question":"((?:[^"\\]|\\.)*)"', raw):
        if json.loads('"' + m.group(1) + '"').strip() != title:
            continue
        a = re.compile(r'"answer":"((?:[^"\\]|\\.)*)"').search(raw, m.end())
        if a:
            return page_text(json.loads('"' + a.group(1) + '"'))
    return None


def rule_xxv(st, name):
    """Senate Rule XXV, paragraph 1: "(1) Committee on <name>, to which committee shall be referred ..." and its subjects."""
    lines = st.split("\n")
    head = re.compile(r"^\(1\) (?:\d+ )?Committee on (.+?) ?, to which")
    for i, line in enumerate(lines):
        h = head.match(line)
        if not h or h.group(1) != name:
            continue
        body = [re.sub(r"^\(1\) \d+ ", "(1) ", line).replace(" , to which", ", to which")]
        for nxt in lines[i + 1:]:
            if head.match(nxt) or re.match(r"^\(2\) \d+ Except as otherwise provided by paragraph 4", nxt):
                break
            body.append(re.sub(r"(?<=[.;:]) \d{1,2}$", "", nxt))   # a note number printed after an item ("Individuals with disabilities. 15")
        letter = "abcdefghijklmnopqrstuvwxyz"[sum(1 for x in lines[:i] if head.match(x))]
        return tidy("\n".join(body)), f"Senate Rule XXV, paragraph 1({letter})"
    return None, None


# ---------- fetching ----------
def fetch_all(urls, get=None):
    """Each address once, four at a time. Returns {url: text or an Exception}."""
    if get is None:
        import net
        get = lambda u: net.get(u, timeout=60, headers={"Accept": "text/html,application/xhtml+xml,*/*"}).decode("utf-8", "replace")
    out = {}

    def one(u):
        try:
            return u, get(u)
        except Exception as e:  # a page that does not answer keeps its rows' last good text
            return u, e
    with cf.ThreadPoolExecutor(4) as ex:
        for u, r in ex.map(one, sorted(set(urls))):
            out[u] = r
    return out


def urls_needed(C):
    us = {C.SOURCES["us_house_rules"]["url"], C.SOURCES["us_senate_rules"]["url"]}
    us |= {u for _, u in C.PAGES.values()}
    us |= {v["url"] for v in C.SUBCOMMITTEES.values() if v.get("url")}
    return us


# ---------- the file (pure: pages in, rows out) ----------
def passage(C, pages, spec):
    """(text, cite, url, source key) for one row of the config, or (None, ...) when it cannot be read."""
    kind = spec[0]
    hr, sr = C.SOURCES["us_house_rules"]["url"], C.SOURCES["us_senate_rules"]["url"]
    if kind == "rule_x":
        raw = pages.get(hr)
        if isinstance(raw, str):
            t, cite = rule_x(manual_text(raw), spec[1])
            return t, cite, hr, "us_house_rules"
        return None, None, hr, "us_house_rules"
    if kind == "manual":
        raw = pages.get(hr)
        t = cut(manual_text(raw), spec[1], spec[2]) if isinstance(raw, str) else None
        return tidy(t), spec[3], hr, "us_house_rules"
    if kind in ("rule_xxv", "senate_rules"):
        raw = pages.get(sr)
        st = senate_rule_text(raw, "STANDING COMMITTEES") if isinstance(raw, str) else None
        if not st:
            return None, None, sr, "us_senate_rules"
        if kind == "rule_xxv":
            t, cite = rule_xxv(st, spec[1])
            return t, cite, sr, "us_senate_rules"
        return tidy(cut(st, spec[1], spec[2])), spec[3], sr, "us_senate_rules"
    if kind == "page":
        src, url = C.PAGES[spec[1]]
        raw = pages.get(url)
        t = cut(page_text(raw), spec[2], spec[3]) if isinstance(raw, str) else None
        if t and url.startswith("https://www.govinfo.gov/content/pkg/BILLS"):
            t = flow(t)
        return tidy(t), spec[4], url, src
    raise ValueError(f"unknown kind {kind}")


def sub_passage(pages, spec):
    raw = pages.get(spec["url"])
    t = cut(page_text(raw), spec["start"], spec.get("end")) if isinstance(raw, str) else None
    if t and spec.get("flow"):
        t = flow(t)
    t = tidy(t)
    return t if t and len(t) <= MAX_TEXT else None


def fp(text):
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:16] if text else None


def build(landscape, pages, previous, today, C=None):
    """The whole file from the landscape record, the fetched pages ({url: text or Exception}), and the last file (or None).
    Pure, so it can be tested and run twice: a row whose text is unchanged keeps the day it was first pulled."""
    if C is None:
        import us_explainer_config as C
    prev_rows = (previous or {}).get("committees", {})
    prev_roles = (previous or {}).get("roles", {})
    prev_proc = (previous or {}).get("process", {})
    warnings = []

    def failed(url):
        return not isinstance(pages.get(url), str)

    def keep(row, old, url):
        """The new row, or the last good one when the page did not answer or changed shape (and it said the same thing before)."""
        if row.get("text"):
            if old and old.get("text") == row["text"] and old.get("pulled"):
                row["pulled"] = old["pulled"]
            return row
        if old and old.get("text"):
            warnings.append(f"{row['id']}: {'the page did not answer' if failed(url) else 'the passage was not found'} ({url}); kept the text pulled {old.get('pulled')}")
            return old
        return row

    rows = {}
    for c in landscape["committees"]:
        chamber = c["chamber"]
        spec = C.COMMITTEES.get(c["id"])
        base = {"id": c["id"], "kind": "committee", "chamber": chamber, "name": c["name"], "congress": C.CONGRESS}
        if not spec:
            row = {**base, "text": None, "note": NONE_NOTE, "checked": "No official source is set for this committee in scripts/us_explainer_config.py."}
            warnings.append(f"{c['id']}: no source set")
        else:
            t, cite, url, src = passage(C, pages, spec)
            if t:
                row = {**base, "text": t, "cite": cite, "source": src, "url": url, "pulled": today}
                if c["id"] in getattr(C, "COMMITTEE_NOTES", {}):
                    nt, ncite, _, _ = passage(C, pages, C.COMMITTEE_NOTES[c["id"]])
                    if nt:
                        row["rule_note"] = {"text": nt, "cite": ncite}
            else:
                row = {**base, "text": None, "note": NONE_NOTE, "checked": f"{url} did not answer or no longer has the passage."}
        rows[c["id"]] = keep(row, prev_rows.get(c["id"]), (spec and passage(C, {}, spec)[2]) or "")
        for s in c["subcommittees"]:
            sp = C.SUBCOMMITTEES.get(s["id"])
            sbase = {"id": s["id"], "kind": "subcommittee", "parent": c["id"], "chamber": chamber, "name": s["name"], "congress": C.CONGRESS}
            if not sp:
                row = {**sbase, "text": None, "note": NONE_NOTE, "checked": "No official source is set for this subcommittee yet."}
                warnings.append(f"{s['id']}: no source set")
            elif sp.get("none"):
                row = {**sbase, "text": None, "note": NONE_NOTE, "checked": sp["none"]}
            else:
                t = sub_passage(pages, sp)
                row = {**sbase, "text": t, "cite": sp.get("what") or "The committee's own page", "source": "us_committee_pages", "url": sp["url"], "pulled": today} if t else {
                    **sbase, "text": None, "note": NONE_NOTE, "checked": f"{sp['url']} did not answer or no longer has the passage."}
            rows[s["id"]] = keep(row, prev_rows.get(s["id"]), (sp or {}).get("url", ""))

    def texts(key, specs, prev):
        out = []
        for k, spec in enumerate(specs):
            t, cite, url, src = passage(C, pages, spec)
            old = (prev or [])[k] if prev and k < len(prev) else None
            row = {"text": t, "cite": cite, "source": src, "url": url, "pulled": today}
            if t and old and old.get("text") == t:
                row["pulled"] = old.get("pulled") or today
            if not t:
                if old and old.get("text"):
                    warnings.append(f"{key} {k + 1}: kept the text pulled {old.get('pulled')} ({url})")
                    row = old
                else:
                    row = {"text": None, "note": NONE_NOTE, "cite": spec[-1], "source": src, "url": url}
            out.append(row)
        return out

    roles = {k: {"words": v["words"], "texts": texts(k, v["texts"], (prev_roles.get(k) or {}).get("texts"))} for k, v in C.ROLES.items()}
    process = {k: texts(k, v, prev_proc.get(k)) for k, v in C.PROCESS.items()}
    dated = [r.get("pulled") for r in rows.values()] + [t.get("pulled") for r in roles.values() for t in r["texts"]] + [t.get("pulled") for r in process.values() for t in r]
    snap = {
        "about": "What each committee and subcommittee of Congress handles, in its own official words, with what the committee roles mean and the steps of a committee's work. "
                 "Each row quotes one official source, with the part of it, the Congress, and the day it was pulled. A row with no official text says \"No description on file\" "
                 "and what was checked. Spaces and line breaks are tidied and an em dash is written as two hyphens; the words are the source's own. Our plain-English lines are "
                 "not in this file: they are in ext/cx-us-text.jsx, and a person has to review them.",
        "congress": C.CONGRESS,
        "updated": max([d for d in dated if d] or [today]),
        "sources": {k: {**v, "registry": k} for k, v in C.SOURCES.items()},
        "site_terms": C.SITE_TERMS,
        "counts": {"committees": sum(1 for r in rows.values() if r["kind"] == "committee"), "subcommittees": sum(1 for r in rows.values() if r["kind"] == "subcommittee"),
                   "with_text": sum(1 for r in rows.values() if r.get("text")), "none_on_file": sum(1 for r in rows.values() if not r.get("text"))},
        "committees": rows,
        "roles": roles,
        "process": process,
    }
    return snap, warnings


def role_words(landscape):
    return sorted({x["role"] for m in landscape["members"] for x in m["committees"]})


def check(snap, landscape):
    """Problems with the explainers file against the landscape record. Empty list: it is whole."""
    bad = []
    ids = {c["id"] for c in landscape["committees"]} | {s["id"] for c in landscape["committees"] for s in c["subcommittees"]}
    rows = snap.get("committees", {})
    if snap.get("congress") != landscape.get("congress"):
        bad.append(f"explainers: Congress {snap.get('congress')} is not the record's {landscape.get('congress')}")
    miss, extra = sorted(ids - set(rows)), sorted(set(rows) - ids)
    if miss:
        bad.append(f"explainers: no row for {', '.join(miss[:8])}{' and more' if len(miss) > 8 else ''}")
    if extra:
        bad.append(f"explainers: rows for committees not in the record: {', '.join(extra[:8])}")
    for k, r in rows.items():
        if r.get("congress") != landscape.get("congress"):
            bad.append(f"explainers: {k} is for Congress {r.get('congress')}")
        if r.get("text"):
            if not (r.get("url") and r.get("source") and r.get("pulled") and r.get("cite")):
                bad.append(f"explainers: {k} has text but no source, address, part, or pulled day")
            if re.search("[–—]", r["text"]):
                bad.append(f"explainers: {k} has an em or en dash")
        elif r.get("note") != NONE_NOTE:
            bad.append(f"explainers: {k} has no text and does not say \"{NONE_NOTE}\"")
    covered = {w for v in snap.get("roles", {}).values() for w in v.get("words", [])}
    for w in role_words(landscape):
        if w not in covered:
            bad.append(f"explainers: the role word \"{w}\" has no note")
    for k, v in snap.get("roles", {}).items():
        if not any(t.get("text") for t in v.get("texts", [])):
            bad.append(f"explainers: the role {k} has no official text")
    for k, v in snap.get("process", {}).items():
        if not any(t.get("text") for t in v):
            bad.append(f"explainers: the step {k} has no official text")
    return bad


def write(snap):
    tmp = OUT + ".tmp"
    with open(tmp, "w", encoding="utf-8", newline="\n") as f:
        json.dump(snap, f, indent=1, ensure_ascii=False)
        f.write("\n")
    os.replace(tmp, OUT)


def reconcile(landscape, previous, today):
    """Without the network: a row for every committee in the record (none on file for a new one), none for one that is gone."""
    return build(landscape, {}, previous, today)


def main(offline=False):
    import us_explainer_config as C
    landscape = json.load(open(LANDSCAPE, encoding="utf-8"))
    previous = json.load(open(OUT, encoding="utf-8")) if os.path.exists(OUT) else None
    today = datetime.datetime.now(datetime.timezone.utc).date().isoformat()
    pages = {} if offline else fetch_all(urls_needed(C))
    snap, warnings = build(landscape, pages, previous, today, C)
    for w in warnings:
        print(f"::warning title=Committee explainers::{w}")
    bad = check(snap, landscape)
    if bad:
        raise RuntimeError("; ".join(bad))
    write(snap)
    n = snap["counts"]
    print(f"explainers: {n['committees']} committees, {n['subcommittees']} subcommittees, {n['with_text']} with official text, {n['none_on_file']} none on file -> {OUT}")
    return snap


def stale():
    """True when the file is missing or does not cover the committees now in the record (the nightly run then refreshes it)."""
    if not os.path.exists(OUT):
        return True
    try:
        return bool(check(json.load(open(OUT, encoding="utf-8")), json.load(open(LANDSCAPE, encoding="utf-8"))))
    except Exception:
        return True


if __name__ == "__main__":
    if "--check" in sys.argv:
        b = check(json.load(open(OUT, encoding="utf-8")), json.load(open(LANDSCAPE, encoding="utf-8")))
        print("\n".join(b) or "data/us-explainers-2026.json passes its checks")
        sys.exit(1 if b else 0)
    main(offline="--offline" in sys.argv)
