# Plan: running anything twice changes nothing the second time

Written Oct 2, 2026. Nothing here is built. It is a plan to pick up when we choose to, kept in the same form as the other plans.

The goal: every script that builds, fetches, publishes, or records something can be run again, by a person after a failure or by a
nightly job that overlaps or retries, and the second run changes no file and adds no record. That makes a retry always safe, makes
a release that stopped halfway safe to run again, and makes a public record (approvals, corrections, the change log) free of
duplicates.

"Idempotent" here means the second run leaves the repository byte for byte as the first run left it. A script may take longer
the second time, but it may not write anything new.

## Where we stand (checked Oct 2, 2026)

Already true, with the evidence:

| Part | Why it holds | How we know |
| --- | --- | --- |
| The build | two clean builds give the same hash | `release.py` step 2 requires it, every release |
| Spanish dictionary merge | pure function of its inputs | ran twice, identical `i18n/es.json` |
| Light-mode layer (`light.py`) | pure function of the CSS | ran twice, identical output |
| District street list (`fetch_districts.py`) | sorted output, fixed sampling | rebuilt from the live sources, byte-identical to the committed file |
| The nightly refresh | `changes.py` skips a snapshot it has already compared; the workflow queues runs (`cancel-in-progress: false`) and commits only when something changed | read in `scripts/changes.py` and `.github/workflows/refresh.yml` |
| Bench `commit.py` | a receipt exists for every applied approval; a second run answers "already_committed" | `scripts/commit.py` |
| Bench `packets.py` | deterministic, "safe to rerun" | its own header |
| Corrections | the log is append only and the app reads the latest decision per issue | `scripts/corrections.py` |
| The app | it sends nothing to any server, so a resident cannot submit anything twice; "Use these on my ballot" sets, it does not add; switching Spanish off restores the exact English | `spanish-switch`, `districts`, no POST in `ext/` or `build.py` |
| `release.py` | stops before the push on any failure; safe to run again. The saved pass names its lane: a full pass stands for `--fast`, a fast pass (with the checks it ran) never stands for the full gate | run twice on Oct 2; both lanes rerun on Oct 6 |
| The browser checks side by side | each check runs in its own process, Chrome, profile, and server port; the report is in the table's order whatever finishes first | three full runs at 4 at a time gave the same results as one at a time (Oct 6) |

Not true, or not checked:

1. **Approving twice records twice.** `approve.py --approve packet_x` run again appends a second approval for the same candidate at
   the same hash. `commit.py` applies only the first, so nothing is wrong in the published graph, but the public approval log gets a
   duplicate.
2. **Recording the same correction twice appends a second line**, with a new id built from the time.
3. **`fetch_districts.py` writes today's date** as `retrieved_at`, so a rebuild on another day changes the file even when nothing in
   the sources changed. The same is true of any fetch that stamps a date.
4. **`build.py --mark-reviewed`, `--mark-office-reviewed`, and `--mark-levies-reviewed` rewrite the review date** on every run.
   That date is meant to be the day a person looked, so this is by design, but a rerun on another day is a change.
5. **Nothing tests it.** No test in the repository runs a script twice and compares. The properties above hold by habit and by
   the header comments.

## Phases

| # | Phase | Done when | Size |
| --- | --- | --- | --- |
| 1 | **Say what the rule is.** Add "running it again changes nothing" to `CLAUDE.md` and `docs/design-standards.md` as a rule for every script that writes, and list the scripts that are allowed to differ (a stamped date, an append-only log) and why | the rule and the allowed list are written; each script's header says which kind it is | a few lines |
| 2 | **Fix the three writers.** (a) `approve.py` skips a packet that already has a live approval at the same hash and prints that it did; (b) `corrections.py` skips an identical entry (same issue, disposition, page, note) and says so; (c) fetch scripts that stamp a date keep the old date when the content hash is unchanged | each fix has a test that runs it twice and finds the second run wrote nothing | half a session |
| 3 | **A test that runs things twice.** `scripts/test_idempotency.py` runs each pure generator and each writer twice in a scratch copy of the repository and fails if the second run changes any file: Spanish merge, light layer, `packets.py`, `approve.py`, `commit.py`, `corrections.py`, the district builder (from a saved sample, so it needs no network), and the refresh's change log with the same snapshot | the test runs in `release.py` and CI; planting a dated stamp or a duplicate append makes it fail | half a session |
| 4 | **Retries that cannot double.** Check every place the nightly job retries (`net.py` retries reads only) and every place a person or a workflow can start the same job twice (approve and correction workflows): give each a key so that the same request twice is one record | the approve and correction workflows record "already done" instead of a second entry | half a session |
| 5 | **Releases that can resume.** `release.py` already stops safely; add a line to its output saying which step it stopped at and that the same command is safe to run again, and make the push step skip when the commit is already deployed and live | a release run after a successful one reports "already live" and changes nothing | a few lines |

## What to watch

- **Order matters little here;** phases 2 and 3 go together, because each fix comes with its test.
- **Appending is not the enemy.** Logs that only grow (the corrections log, the change log) are fine as long as the same event is not
  recorded twice. The test compares what was written, not whether the file grew.
- **Dates are the usual way an idempotent script stops being one.** The rule: a date that says when something happened is data; a date
  that says when the script last ran is noise and is written only when something else changed.
- **Never make a check weaker to pass.** If the test finds a script that is not idempotent, the script is fixed or listed with its
  reason in the allowed list in phase 1.

## Rules that apply

Everything in `CLAUDE.md`: only `scripts/refresh.py` writes `data/`; never hand-edit the Bench folders; never let a script approve;
the hash recorded beside any claim; `STATE-OF-BUILD.md` updated.
