#!/usr/bin/env python3
"""Weekly check that the public source links the app points to still answer.

  python scripts/check_links.py            check, update data/links-2026.json, print a short report
  python scripts/check_links.py --dry-run  check and print, write nothing

What is checked, in this order: every https address written into the app's source (ext/*.jsx and
build.py), the person pages in data/people-2026.json, and a rotating sample of 40 Legistar legislation
pages (a different 40 each week, so every page is reached over time without hammering the server).

A link is "broken" only after it has failed on two checks in a row, so one slow night never puts a
warning in front of a resident. A 403, 405, 429, or similar answer means the site is refusing a robot,
not that the page is gone, so it is recorded as "uncertain" and never shown to residents.

refresh.py runs this on Mondays and after any manual run. Failures here never block the data refresh.
The build embeds only the broken list (data/links-2026.json -> CX_LINKS); the profile shows a notice
next to a broken source link and says the record may have moved.
"""
import datetime, glob, hashlib, json, os, re, sys, time, urllib.error, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, ".."))
OUT = os.path.join(ROOT, "data", "links-2026.json")
UA = "ClevelandCivicGraph/5.16 (Equalpoint; weekly source-link check)"
SAMPLE = 40
URL = re.compile(r"https?://[A-Za-z0-9._~:/?#\[\]@!$&'()*+,;=%-]+")
SKIP = ("example.invalid", "localhost", "w3.org", "fonts.googleapis.com", "fonts.gstatic.com", "openapi.vercel.sh", "github.com/LibraryOfCongress")


def clean(u):
    u = u.rstrip(".,;:'\")`")
    return u if "${" not in u and "{" not in u and not any(s in u for s in SKIP) else None


def collect():
    where = {}
    files = sorted(glob.glob(os.path.join(ROOT, "ext", "*.jsx"))) + [os.path.join(ROOT, "build.py")]
    OLD = re.compile(r"patch\(src,\s*[\"`]https?://[^\"`]+[\"`]")  # the first argument of a patch() is an old address being replaced
    for f in files:
        for m in URL.finditer(OLD.sub("", open(f, encoding="utf-8").read())):
            u = clean(m.group(0))
            if u:
                where.setdefault(u, set()).add(os.path.basename(f))
    pp = os.path.join(ROOT, "data", "people-2026.json")
    if os.path.exists(pp):
        for p in json.load(open(pp, encoding="utf-8"))["people"]:
            if p.get("url"):
                where.setdefault(p["url"], set()).add("data/people-2026.json")
    lp = os.path.join(ROOT, "data", "legistar-2026.json")
    if os.path.exists(lp):
        week = datetime.date.today().isocalendar()[:2]
        ms = json.load(open(lp, encoding="utf-8"))["matters"]
        ms = sorted(ms, key=lambda m: hashlib.sha256(f"{week}{m['file']}".encode()).hexdigest())[:SAMPLE]
        for m in ms:
            where.setdefault(m["url"], set()).add("data/legistar-2026.json")
    return where


def probe(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            r.read(2048)
            return r.status
    except urllib.error.HTTPError as e:
        return e.code
    except Exception:
        return 0  # timeout, DNS, reset


def classify(status):
    if 200 <= status < 400:
        return "ok"
    if status in (404, 410):
        return "gone"
    if status in (401, 403, 405, 406, 429, 451, 999):
        return "uncertain"
    return "unreachable"  # 0, 5xx, other


def run(dry=False):
    where = collect()
    prev = {}
    if os.path.exists(OUT):
        prev = {b["url"]: b for b in json.load(open(OUT, encoding="utf-8")).get("broken", [])}
    today = datetime.date.today().isoformat()
    broken, uncertain, ok = [], [], 0
    last_host, last_t = None, 0.0
    for url in sorted(where):
        host = url.split("/")[2]
        if host == last_host and time.time() - last_t < 0.6:
            time.sleep(0.6)
        status = probe(url)
        last_host, last_t = host, time.time()
        kind = classify(status)
        if kind == "ok":
            ok += 1
        elif kind == "uncertain":
            uncertain.append({"url": url, "status": status})
        else:
            p = prev.get(url)
            broken.append({"url": url, "status": status, "kind": kind, "since": p["since"] if p else today,
                           "consecutive": (p["consecutive"] + 1) if p else 1, "where": sorted(where[url])})
    snap = {"checked_at": today, "checked": len(where), "ok": ok, "uncertain": len(uncertain),
            "about": "Weekly check of public source links (scripts/check_links.py). A link is shown to residents as broken only after it failed on two checks in a row.",
            "broken": broken}
    print(f"links: {len(where)} checked, {ok} ok, {len(uncertain)} refused a robot, {len(broken)} failing")
    for b in broken:
        print(f"  {b['kind']:11s} {b['status']:>3}  x{b['consecutive']}  {b['url']}  ({', '.join(b['where'])})")
    if not dry:
        json.dump(snap, open(OUT, "w", encoding="utf-8", newline="\n"), indent=1, ensure_ascii=False)
    return snap


if __name__ == "__main__":
    run("--dry-run" in sys.argv)
