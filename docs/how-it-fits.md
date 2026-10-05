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
- **Do not use regex lookbehind (`(?<=...)`) in `ext/`.** Safari before 16.4 cannot parse it, and a parse error breaks the whole bundle. Split with `match(/[^.!?]+[.!?]*/g)` instead.
- **Make dynamic sentences translatable by splitting them.** A sentence glued from a name, a verb, and a date is one text node and cannot be translated well. Render the name, the verb phrase ("meets Monday."), and the date as separate spans, and add each piece to `i18n/manual.json` (the pieces, not the whole sentence). `CxMtgHead` does this.
- **Receipts, not scores.** No percentages, rankings, or labels. A missing record is not a no. Nothing personal in a link or request.
- **Words drawn on a canvas are not page text.** The translator cannot see them, and the layout checks cannot either. The United States map translates its own canvas words with `cxUsmTr` and exposes what it drew on the canvas element as `cxMap` (names and their boxes, the focus, the zoom) so `us-map` can check names that are not in the DOM.
- **A canvas that is mounted again starts at 300 by 150.** When the map came back from a text view, the size check compared only with the old size, so the new canvas stayed at the browser's default and the map was drawn cropped. Compare the canvas's own size too (`us-graph` catches it).
- **Records travel in a data block, not in the code.** `build.py` puts Council's items, the roll calls, the place histories, the ward maps, and What's new in one `<script type="application/json" id="cx-data">` that `cxDataBlock()` reads once with `JSON.parse` and then removes (much faster on a slow phone than the same data written as code, and the text is not kept twice). A new large dataset goes through `js_data(key, obj)`; read it from its constant (`CX_LEG` and the rest), never from the element, which is gone. `perf-budget` fails if the block disappears.
- **Speed has a budget.** `perf-budget` fails if the app's code in the page grows past its record by 3%, if Today's first load asks for a file it does not need yet (the federal record, votes, districts, Spanish), or if the map's first drawing makes 10% more canvas calls. A bigger app on purpose: `PERF_BUDGET_UPDATE=1 node scripts/checks/run.js --only perf-budget`, and say why in the commit. Measure with `node scripts/perf/measure.js` (see `docs/performance.md`).
- **The old Sky's layout is on demand.** `cxUsGraph` builds the federal record without the old Sky's positions (about 0.3 s on a slow phone); `cxUsSky(g)` places it, once, for the old Sky only. Anything that needs `x`, `hx`, or `clusters` from it must call `cxUsSky` first.
- **Calm does not move by itself after the map opens.** The opening glide (860 ms, from each place to the same place) blocks the physics, and when it ends nothing asks for another frame, so the physics runs only after a pan, a zoom, or a pick. Removing the glide would make Calm drift at open, which residents would see.
- **The United States map is settled at build time.** `scripts/us_map.js` runs the same physics and seed as the page and writes `site/us/map-2026.json`; the page uses it only when it was made from the same record (`cxUsmIds`). Change the physics in `ext/cx-us-map.jsx`, rebuild, and `scripts/test_us_map.js` checks the file matches a fresh run. d3 comes only from `ext/cx-d3.js`, bundled by `build.py` from the pinned packages; never load it from a CDN (the Content-Security-Policy would block it).
