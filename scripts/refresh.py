#!/usr/bin/env python3
"""Nightly refresh of the official records, then a record of what changed.

  python scripts/refresh.py          fetch all three sources, check them, log the changes
  python scripts/refresh.py --check  only run the safety checks on data/ as it stands

Steps:
  1. keep a copy of today's data/*.json
  2. run fetch_legistar.py, fetch_reasons.py, fetch_place.py, fetch_people.py (each retries with growing pauses)
  3. safety checks: if the new snapshot looks broken (far fewer items than before, missing
     histories or ward maps), put the old files back and stop with an error, so a bad night
     never replaces good data. GitHub then emails the repository owner.
  4. append the differences to data/changes-2026.json (scripts/changes.py)

Official records only. News never enters through this script: news items need a person's
approval (see the Rules in CLAUDE.md) and are not part of this pipeline.
"""
import datetime, json, os, shutil, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
DATA = os.path.join(HERE, "..", "data")
FILES = ("legistar-2026.json", "reasons-2026.json", "place-2026.json", "geo-2026.json", "people-2026.json")


def load(d, name):
    return json.load(open(os.path.join(d, name), encoding="utf-8"))


def check(old_dir, new_dir):
    """Return a list of problems with the new snapshot (empty = safe to publish)."""
    bad = []
    nl = load(new_dir, "legistar-2026.json")
    if nl["count"] != len(nl["matters"]):
        bad.append("legistar: count does not match the list")
    if old_dir:
        ol = load(old_dir, "legistar-2026.json")
        if nl["count"] < 0.95 * ol["count"]:
            bad.append(f"legistar: {nl['count']} items, down from {ol['count']} (more than 5% fewer)")
        op, np_ = load(old_dir, "place-2026.json"), load(new_dir, "place-2026.json")
        if len(np_["histories"]) < 0.9 * len(op["histories"]):
            bad.append(f"place: {len(np_['histories'])} histories, down from {len(op['histories'])}")
        orr, nr = load(old_dir, "reasons-2026.json"), load(new_dir, "reasons-2026.json")
        lost = [f for f, r in orr["items"].items() if r.get("whereas") and not nr["items"].get(f, {}).get("whereas")]
        if lost:
            bad.append(f"reasons: lost the official text for {', '.join(lost)}")
    pp = load(new_dir, "people-2026.json")
    n_council = sum(1 for x in pp["people"] if x["title"] == "Council Member")
    n_mayor = sum(1 for x in pp["people"] if x["title"] == "Mayor")
    if n_council != 15 or n_mayor != 1:
        bad.append(f"people: {n_council} council members and {n_mayor} mayor, expected 15 and 1")
    g = load(new_dir, "geo-2026.json")
    for k, want in (("wards2026", 15), ("wards2014", 17)):
        n = len(g["layers"].get(k, {}).get("features", []))
        if n != want:
            bad.append(f"geo: {k} has {n} wards, expected {want}")
    if not all(m.get("url") and m.get("file") for m in nl["matters"]):
        bad.append("legistar: some items have no file number or link")
    return bad


def main():
    if "--check" in sys.argv:
        bad = check(None, DATA)
        print("\n".join(bad) or "data/ passes the safety checks")
        sys.exit(1 if bad else 0)
    keep = tempfile.mkdtemp(prefix="civic-prev-")
    for f in FILES:
        shutil.copy(os.path.join(DATA, f), keep)

    def restore(why):
        for f in FILES:
            shutil.copy(os.path.join(keep, f), DATA)
        sys.exit(f"REFRESH STOPPED, previous data kept: {why}")

    import fetch_legistar, fetch_reasons, fetch_place, fetch_people, changes
    try:
        fetch_legistar.main()
        fetch_reasons.main()
        fetch_place.main()
        fetch_people.main()
    except Exception as e:  # network or source failure after all retries
        restore(f"{type(e).__name__}: {e}")
    bad = check(keep, DATA)
    if bad:
        restore("; ".join(bad))
    _, entry = changes.update(keep, DATA)
    try:  # weekly source-link check; a problem here must never stop the data refresh
        import check_links
        if datetime.date.today().weekday() == 0 or os.environ.get("CX_LINKS"):
            check_links.run()
    except Exception as e:
        print(f"link check skipped: {type(e).__name__}: {e}")
    print(f"changes {entry['from']} -> {entry['at']}: {changes.summary(entry)}")
    shutil.rmtree(keep, ignore_errors=True)


if __name__ == "__main__":
    main()
