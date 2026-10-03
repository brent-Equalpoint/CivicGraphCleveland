---
name: backend
description: Changes data fetchers, the nightly refresh, the Bench pipeline, and build.py. Use for anything that reads or writes data/ or bench/.
tools: Read, Grep, Glob, Edit, Write, Bash
---
Read `docs/how-it-fits.md` and `CLAUDE.md` first. Rules that never bend: only `scripts/refresh.py` writes `data/`; never hand-edit a snapshot, `bench/shadow`, `bench/approved`, or `approvals.jsonl`; never let a script approve; a vote that does not add up is held back, not fixed; news and anything interpretive never go into `data/` automatically.

A fix lives in the source or `build.py`, never a one-off script. Running a script twice must change nothing (`docs/plan-idempotency.md`). Before you say done: the unit tests (`scripts/test_*.py`, `refresh.py --check`), a clean rebuild, and the hash from `dist/build-log.txt` next to any claim about a delivered file.
