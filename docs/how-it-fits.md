# How it fits

One page for anyone (person or agent) about to change something. Rules are in `CLAUDE.md`; what exists is in `STATE-OF-BUILD.md`.
This page says how the parts connect and what has gone wrong before. Add a line to Traps whenever something bites.

## The path

```
inputs/ (compiled Sep 23 app, never edited)
   + ext/*.jsx, ext/*.css   our code, compiled by esbuild into ONE shared scope with the app
   + build.py patch()       exact-match edits to the compiled app
   + bento.py, light.py     generate the Bento and light layers from the CSS
   + data/, i18n/es.json    records and the Spanish dictionary, embedded
        -> build.py (wipes build/, dist/, site/)
        -> dist/Cleveland-Civic-Graph-v5.html (offline), site/ (Vercel), dist/build-log.txt (hashes)
```

Who writes what: only `scripts/refresh.py` writes `data/`; `i18n/es.json` is built by `node scripts/i18n/merge.js` from `i18n/manual.json`
(hand) and `i18n/work/translations.json`; `design/tokens.json` is the one source for the look and `docs/design-system.md` is generated from it;
`bench/shadow`, `bench/approved` are written by scripts only. The nightly Action commits `data/` and `site/`: pull before editing.

## Where a change goes

| Change | Edit | Prove it with |
| --- | --- | --- |
| Phone screen | `ext/cxm-*.jsx`, `ext/cxm.css` | `node scripts/checks/run.js --only <check>` |
| Desktop or shared logic | `ext/cx-*.jsx`, `ext/cx-live.jsx` | same, plus `CHECK_THEME=original` |
| Compiled app | `patch()` in `build.py` | the build log lists every patch ok |
| New or changed text | the component, then `i18n/manual.json` | `node scripts/i18n/crawl.js`, `python scripts/test_i18n.py` |
| A color, size, radius, weight | `design/tokens.json` first | `node scripts/design/audit.js`, `cvd.js`, `DESIGN_UPDATE=1 ... --only design-look` and read the diff |
| Data or a fetcher | `scripts/fetch_*.py`, run by `refresh.py` | `python scripts/refresh.py --check`, the unit tests |
| Ship | commit (one line, what changed for a resident) | `python scripts/release.py --push` |

Both styles (Bento, Original), both layouts, dark and light, English and Spanish must keep working. Checks run dark by default:
`CHECK_MODE=light`, `CHECK_THEME=original`, `CHECK_LANG=es`.

## Traps (each one cost time)

- **One shared scope.** Every `ext/*.jsx` becomes one scope. A function name that already exists breaks the build. Grep before naming (`cxmInitials` did).
- **`build.py` wipes `build/`, `dist/`, `site/`.** Keep logs and screenshots elsewhere. Never rebuild while a browser check is running.
- **Backslashes.** Heredocs and some writers eat `\` and turn `\b` into a backspace. Check with `grep -c $'\x08'` after writing regex-heavy files.
- **Dates change results.** "Updated 2 days ago" had no Spanish; yesterday it said "yesterday". A check can fail with no code change. Use today's date when reasoning.
- **Spanish pattern rules.** A pattern needs at least 3 fixed words (`test_i18n.py`). Dynamic text is split into separate text nodes or masked ({n} number, {d} date, {t} time, {*} anything).
- **The Updated chip and similar must wrap**, not ellipsize, or Spanish fails `no-bleed`.
- **Release step 5 needs everything committed.** Commit first. A full pass is saved per exact input and day, so the rerun after committing is quick (`--fresh` forces all).
- **Chrome "Session with given id not found"** is a browser hiccup, not the app. `run.js` retries opening a page once for that message; `changed.js` reruns a check that failed only that way. A check that ends only in a crash is run once more; an assertion that failed is never retried. Any other error is real.
- **Run the right checks while working.** `node scripts/checks/changed.js` runs only the checks your changed files can affect (`--plan` shows them, `--thorough` adds light and Spanish). A shared file, or one it does not know, runs everything. It never replaces `release.py`.
- **Sheets and overlays are registered by name** (`CXM_SHEETS`, `overlay.type` in `cxm-core.jsx`); the URL map `P` there must keep old `?panel=` links working.
- **A backtick path that starts `/portraits/` is rewritten by the build** (`asset paths`, expected 18). Build a new portrait path by joining strings, as `CxFace` does.
- **Photos need Pillow** (`pip install pillow`). `fetch_portraits.py` skips with a warning without it, and the nightly job installs it.
- **CI is Linux; your machine is not.** The nightly job and the Checks workflow run on Ubuntu, where the default font is narrower than Windows', so a control can measure under 44 px there and not here (the skip link did). Give a tap target an explicit `min-height: 44px`. A test that imports something only your machine already loaded (`importlib.util`) will also fail in CI; import what you use. Look at CI after a push: `gh run list --limit 4`.
- **Receipts, not scores.** No percentages, rankings, or labels. A missing record is not a no. Nothing personal in a link or request.
