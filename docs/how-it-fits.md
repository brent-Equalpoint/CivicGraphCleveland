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
| How you line up (questions, counts) | `ext/cx-align-text.jsx` (between the markers), `ext/cx-align.jsx` | `node scripts/test_alignment.js`, `--only alignment`; a person runs `python build.py --mark-alignment-reviewed "Name"` |
| Votes, actions, and positions on a city record, a person's list, a ward | `ext/cx-record.jsx` (shared by both layouts), its plain words in `ext/cx-votes-text.jsx` between the VOTES-TEXT markers; the roll calls and the City Record's actions in `scripts/fetch_cityrecord.py` (`python scripts/refresh.py --votes`); the dated actions file in `scripts/council_record.py` (a pure function of `data/`, written by `build.py` to `site/council/record-2026.json`) | `python scripts/test_votes_actions.py`, `python scripts/test_cityrecord.py`, `--only votes-actions`; a person runs `python build.py --mark-votes-text-reviewed "Name"` |
| Anything saved in the browser (a new `localStorage` or `sessionStorage` name, a cache) | the code, then its line in the privacy policy's list (`ext/cx-privacy.jsx`) and a row in `docs/privacy-claims.md` | `python scripts/test_privacy.py`, `--only privacy-policy`; the policy's words need a person's approval again |
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
- **Both layouts rewrite the address and drop what they do not know.** The compiled desktop app replaces the address 180 ms after a change of its own (and after every back step), and the phone shell (`cxmToUrl`) rewrites it when a tab or sheet changes. A profile link's `who=` survives because `CX_UsMap` reads it in its first render and puts it back while a profile is open, and `cxmToUrl` keeps it in the graph view. A new address parameter on the map needs the same care, and it must only ever name a record, never the viewer.
- **The United States map has two shapes.** `wide` for computers and `tall` for a phone held upright (`CX_USM_SHAPES` in `ext/cx-us-map.jsx`: the same forces and seed, a different start and centering). The build writes both (`xy`, `tall`) to `site/us/map-2026.json`; Solo and Calm pass the same shape, or the map drifts back toward the other one.
- **A CSS comment is part of the next selector to `bento.py` and `light.py`.** Their parser keeps a comment that comes right before a rule or an
  `@media` in that rule's selector: a commented `@media` block is never turned into its Bento or light version, and a comment with a comma in it
  breaks the generated selector. Put the comment inside the block, before a rule with no color in it (the desktop strip block in `ext/cx.css` does).
  A comment before a selector that starts with `html[...]` also breaks it: `light.py` cannot merge the two `html` parts and writes
  `html[data-cx-mode=light] html[data-cx-theme] ...`, which never matches (the desktop `.sp p` rule did this; profiles hid it because they also match
  `.sp-page p`, and the privacy page showed white text on a light page). Inside a rule's own block, a comment goes after the last declaration:
  `light.py` splits the block on `;` and reads the property name before the first `:`, so a comment in front of `color:` hides the color.
  Two more selectors still have this shape (`html[data-cx-theme] .ledger-summary span` and `html[data-cx-theme=bento] .atlas-header` in the light layer).
- **Everything saved in the browser is on the privacy policy.** A new `localStorage` or `sessionStorage` name fails `scripts/test_privacy.py`
  until `CX_POLICY.stored` in `ext/cx-privacy.jsx` names it (and the `privacy-policy` check runs the app and compares what it really writes).
  Name a storage key with a string or a constant the test can read, never one built at run time.
- **CSS class names are shared by every file.** `.cx-more` already existed (a "more" section), and `.cx-pages-menu` was both a wrapper and a menu
  for a moment. Grep a class name in `ext/*.css` and `ext/*.jsx` before using it, the same as a function name.
- **An animation switched off and on again plays again.** Turning a page's entrance off with an attribute on `<html>` while a key was down, and back on
  at the next click, replayed the 4 px rise under the pointer and the United States map's click landed on the wrong person (`us-map` caught it).
  Decide once, when the thing appears (`CX_DeskStrip` does it before the first paint).
- **The desktop strip's rooms are the compiled Radix tabs.** `build.py` hides the other places' tabs (`data-cx-off`) and sets `aria-selected` and
  `data-state` itself; arrows only move the focus (`activationMode: manual`). Keep `?room=` and `?panel=` working through `CX_NAV`, not new state.
- **Row one of the desktop strip holds places and main tabs in one tablist.** `CX_DeskFolders` draws the six places, a gap (`.cx-folder-gap`,
  `aria-hidden`), and the main tabs from `CX_MAIN_PAGES` (`us`, `ballot`, `learn`), which open through `CX_NAV.panel` like every page. A main page is
  either a tab or in `CX_PAGE_GROUPS` (the My pages menu), never both; Jump to reads both lists. Anything in a sideways row that is drawn only for the
  eye must be `aria-hidden`, or the "n more" buttons count it as a hidden tab (`cxRowItems`). The tabs get closer below 1440 and 1280 px (media
  queries in `ext/cx.css`); a longer label or a new tab needs the widths measured again at 1100 and 1280 px in both languages (`nav-desktop`).
- **The United States map covers the strip on a computer** (`.usm` is fixed over the window and makes everything behind it `inert`). Its left
  menu's "Cleveland" button (`CX_NAV.panel('')`) is the way back to the strip, and its "needs the hosted site" message has Back to Cleveland;
  any new full-window state of the map needs the same, or the main tabs become a dead end.
- **The committee lines are not in the page.** `ext/cx-us-text.jsx` holds them between the US-TEXT markers as strict JSON (`CX_US_LINES`); `build.py`
  takes the table out before compiling, checks each line rests on official words in `data/us-explainers-2026.json`, and serves both as
  `site/us/explainers-2026.json`, which `cxUsxLoad()` fetches the first time a committee, a subcommittee, a role's official words, or a text view needs it.
  Read a line with `cxUsxWhat(id)`; a component that shows lines uses `useCxUsx()` so it draws again when they arrive. Editing anything between the
  markers clears the review mark (`--mark-us-text-reviewed`).
- **A hidden span can make a fixed frame scroll.** The map's sheet had a "(opens in a new tab)" span (absolutely positioned, 1 px) far down a long
  list; its nearest positioned ancestor was the map's stage, so the stage grew 1,100 px taller than the window and the no-bleed check saw the whole
  map as cut off. The sheet's scrolling body is `position: relative`, which keeps such spans inside it.
- **A note or story over the map takes its own step in history** (`openX`/`closeX` in `CX_UsMap`), checked first in `onPop`, so the back gesture closes
  it and never the profile under it. The desktop app rewrites the address after that step, so the profile's `who=` is put back when a note closes.
- **How you line up has two steps, and the second is hidden.** `ext/cx-align.jsx` holds step 1 (what a member voted on in the policy areas you pick:
  Compare members, and the counts on a member's sheet and profile) and step 2 (the sample questions and the per-area lines). The questions sit between
  the ALIGN-TEXT markers in `ext/cx-align-text.jsx` as strict JSON; `build.py` checks every vote they name against `data/us-votes-2026.json` (in the
  record, deciding, the right chamber, the bill's only deciding vote there), takes the table out of the page, and serves it as `site/us/align-2026.json`,
  fetched only when step 2 is on and opens. Step 2 is on only when `CX_ALIGN_REVIEW.ok` (a person ran `--mark-alignment-reviewed "Name"` and the text
  has not changed since) or when a browser check sets `window.__cxAlignPreview` before the page loads; nothing in the app sets it, and
  `scripts/test_alignment.js` fails if anything does. The policy areas (`CX_US_AREAS`) and the answers (`CX_ALIGN_ANS`) live in memory only. Never
  add a number across areas, an order by any count, or a color or size on the map that depends on an answer: `test_alignment.js` and the
  `alignment` check fail on each.
- **The translator takes a comma that follows a number.** "Yea 6, Nay 0" masks as "Yea {n} Nay {n}" with "6," captured, because a number may have
  thousands commas. Write such a pattern in `i18n/manual.json` without the comma after `{n}`, in English and Spanish (the counts on Compare members do).
- **A new printed word in the City Record stops every vote, by design.** `fetch_cityrecord.py` refuses the whole snapshot when one vote does not
  add up, and the nightly run only warns ("Council votes were not updated"). From Oct 2 to Oct 6, 2026 the word was "Recusal" (file 1044-2026), so the
  33 files passed on Sept. 28 showed no names for four days. Read the warning in the nightly log, teach the parser the word with its printed count
  checked, add a test, and raise `PARSER` so every stored issue is read again once. Never edit `data/votes-2026.json` by hand.
- **Two records of one vote can disagree.** Council's Legistar record has member votes for 11 meetings (Jan. 5 to May 18, 2026); the City Record is
  the printed vote with a tally. The City Record's vote is shown; Legistar fills a file only where the City Record prints no names (`legistar_votes`),
  and every difference is listed in `differs` and said on the record. "How they voted" on a profile counts the City Record only; the Votes & actions
  list shows every roll call with its source.
- **A count on a filter can become an overall number.** With one year in the record, a count on the year choice equals the whole list. In a person's
  Votes & actions, counts go only on kinds and types of legislation, never on "All" or the year (`votes-actions` fails on either).
- **The dated actions load when needed.** `site/council/record-2026.json` (and, in the offline file, the `cx-council-rec` block, read once and removed)
  is fetched the first time a record or a list needs it (`useCxRec()`); until then a record shows the action history the page already carries.
  `votes-actions` fails if Today asks for it.
- **The United States map is settled at build time.** `scripts/us_map.js` runs the same physics and seed as the page and writes `site/us/map-2026.json`; the page uses it only when it was made from the same record (`cxUsmIds`). Change the physics in `ext/cx-us-map.jsx`, rebuild, and `scripts/test_us_map.js` checks the file matches a fresh run. d3 comes only from `ext/cx-d3.js`, bundled by `build.py` from the pinned packages; never load it from a CDN (the Content-Security-Policy would block it).
