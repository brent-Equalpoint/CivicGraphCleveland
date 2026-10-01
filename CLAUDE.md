# Cleveland Civic Graph (Equalpoint, Project Gotham)

A plain-English map of who decides what in Cleveland. One app, two layouts (desktop and phone), built
from a compiled Sep 23 release plus our own source in `ext/`. Read `STATE-OF-BUILD.md` before changing anything.

## How to build

```
npm ci              # once, or after package.json changes
python build.py     # wipes build/, dist/, site/ and rebuilds everything
```

Outputs: `dist/Cleveland-Civic-Graph-v5.html` (offline, one file), `site/` (what Vercel serves),
`dist/build-log.txt` (a SHA-256 for every input and output). Two clean builds must give the same hash.

## Where changes go

- App code: `ext/*.jsx` and `ext/*.css`. Shared desktop and phone logic: `ext/cx-live.jsx`. Phone: `ext/cxm-*.jsx`.
- Changes to the compiled app: an exact-match `patch()` in `build.py`. Never edit `inputs/` or `build/`.
- Data: only `scripts/refresh.py` writes `data/`. Never hand-edit a snapshot.
- The Bench (agent pipeline, `bench/`): `scripts/packets.py` writes `bench/shadow/` from `data/`; a named
  person decides with `scripts/approve.py`; `scripts/commit.py` writes `bench/approved/`. Never hand-edit
  either folder, and never let a script approve. Design docs: `docs/civic-agent/`. Tests: `scripts/test_bench.py`.
- After editing a "Why supporters backed it" summary in `ext/cx-reasons.jsx`, re-read it against
  `data/reasons-2026.json`, then run `python build.py --mark-reviewed <file numbers>`.

## Rules

- Receipts, not scores. No match percentages, rankings, or ideology labels.
- Sponsorship is not a vote. A missing record is not a no.
- Official records update automatically; news and anything interpretive need a person's approval. Never automate news into `data/`.
- Nothing personal leaves the browser. Place, answers, and priorities never go into links or requests.
- Plain English. No em dashes anywhere. No left accent stripes on cards or alerts; use dots or tinted backgrounds.
- Both styles (Bento and Original) and both layouts keep working.
- A fix lives in the source or `build.py`, never in a one-off script. Rebuild from clean, re-check in a browser,
  and put the output hash next to any claim about a delivered file. Write docs from `dist/build-log.txt`.

## Working with GitHub

- The nightly Action commits `data/` and `site/` every morning. Pull (Sync) before you start editing.
- If a pull conflicts on `site/` or `data/`, keep the incoming data, run `python build.py`, then commit.
- Commit message: what changed for a resident, in one line.
