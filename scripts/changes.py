#!/usr/bin/env python3
"""Work out what changed between two snapshots of the public record, for "What's new".

Compares the previous and current data/legistar-2026.json (and the committee history in
data/place-2026.json) and appends one entry to data/changes-2026.json:

  {"at": <new retrieval time>, "from": <previous retrieval time>, "count": <items now>,
   "changes": [{"f": file, "new": true?, "st": [was, now]?, "sp": [sponsors added]?,
                "steps": [[date, action, body], ...]?, "gone": true?}, ...]}

Only facts that appear in the two snapshots are recorded: a new file number, a status that
changed, a sponsor added, a committee or Council action added to the history. Nothing is
inferred. The log keeps 45 days of updates, so a few quiet nights do not empty the list.

Run directly to compare two folders:  python scripts/changes.py OLD_DIR NEW_DIR
refresh.py calls update() after each nightly fetch.
"""
import datetime, json, os, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
LOG = os.path.join(ROOT, "data", "changes-2026.json")
KEEP_DAYS = 45


def _load(d, name):
    p = os.path.join(d, name)
    return json.load(open(p, encoding="utf-8")) if os.path.exists(p) else None


def diff(old_leg, new_leg, old_hist=None, new_hist=None):
    old = {m["file"]: m for m in old_leg["matters"]}
    new = {m["file"]: m for m in new_leg["matters"]}
    old_hist, new_hist = old_hist or {}, new_hist or {}
    out = []
    for f, m in new.items():
        rec = {"f": f}
        o = old.get(f)
        if not o:
            rec["new"] = True
        else:
            if o["status"] != m["status"]:
                rec["st"] = [o["status"], m["status"]]
            added = [s for s in m["sponsors"] if s not in o["sponsors"]]
            if added:
                rec["sp"] = added
        h0 = [tuple(r) for r in old_hist.get(f, [])]
        steps = [r for r in new_hist.get(f, []) if tuple(r) not in h0]
        if steps:  # for a brand-new item this is its whole history so far: where it went first
            rec["steps"] = steps[-4:]
        if len(rec) > 1:
            out.append(rec)
    for f in old:
        if f not in new:
            out.append({"f": f, "gone": True, "t": old[f]["title"][:160]})
    # newest activity first: a step's date, else the item's own dates
    def when(r):
        m = new.get(r["f"]) or old.get(r["f"]) or {}
        ds = [s[0] for s in r.get("steps", [])] + [m.get("passed") or "", m.get("intro") or ""]
        return max(d for d in ds if d is not None)
    out.sort(key=lambda r: (when(r), r["f"]), reverse=True)
    return out


def update(old_dir, new_dir, log_path=LOG):
    ol, nl = _load(old_dir, "legistar-2026.json"), _load(new_dir, "legistar-2026.json")
    op, np_ = _load(old_dir, "place-2026.json"), _load(new_dir, "place-2026.json")
    if not ol or not nl:
        raise SystemExit("changes: both snapshots need legistar-2026.json")
    entry = {"at": nl["retrieved_at"], "from": ol["retrieved_at"], "count": nl["count"],
             "changes": diff(ol, nl, (op or {}).get("histories"), (np_ or {}).get("histories"))}
    log = json.load(open(log_path, encoding="utf-8")) if os.path.exists(log_path) else {
        "about": "What changed between snapshots of Cleveland City Council's public Legistar record. "
                 "Written by scripts/changes.py; read by build.py for What's new.",
        "source": nl["source"], "updates": []}
    if any(u["at"] == entry["at"] for u in log["updates"]):
        return log, entry  # this snapshot was already compared
    log["updates"].append(entry)
    cutoff = (datetime.datetime.fromisoformat(entry["at"]) - datetime.timedelta(days=KEEP_DAYS)).isoformat()
    log["updates"] = [u for u in log["updates"] if u["at"] >= cutoff]
    json.dump(log, open(log_path, "w", encoding="utf-8", newline="\n"), indent=1, ensure_ascii=False)
    return log, entry


def summary(entry):
    c = entry["changes"]
    return (f"{sum(1 for r in c if r.get('new'))} new, {sum(1 for r in c if r.get('st'))} status changes, "
            f"{sum(1 for r in c if r.get('steps') and not r.get('new'))} with new actions, "
            f"{sum(1 for r in c if r.get('sp'))} with added sponsors, {sum(1 for r in c if r.get('gone'))} removed")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    _, e = update(sys.argv[1], sys.argv[2])
    print(f"{e['from']} -> {e['at']}: {summary(e)}")
