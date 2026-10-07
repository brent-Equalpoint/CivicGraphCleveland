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
| What an office can do on the candidate record and the contest page (the offices the compiled app has no words for) | the words between the OFFICES-TEXT markers in `ext/cx-offices-text.jsx` (keyed by contest name); `qm()` in the compiled app asks `cxOfficeInfo()` first through one patch in `build.py`, and `CxOfficeNote` puts the unreviewed notice under them; sources in `docs/source-notes-offices.md` | `node scripts/test_offices.js`, `python scripts/test_offices.py`, `--only office-text`, plus `CHECK_MODE=light`, `CHECK_THEME=original`, `CHECK_LANG=es`; a person runs `python build.py --mark-offices-reviewed "Name"` |
| Records and Today's Latest (one list of every dated record: legislation, meetings, roll calls) | the list in `scripts/records_feed.py` (a pure function of `data/`, written by `build.py` to `site/records/records-2026.json` and its front rows to `site/records/latest-2026.json`); the page in `ext/cx-records.jsx` (`cxRecFilter`, `cxRecCard`, `CX_Records`, the phone's Latest folder `CxmRecords` at `?panel=records`), Latest in `ext/cxm-today.jsx` (`CxmRecLatest`), styles `.rf-` in `ext/cxm.css`; a ward tie comes from the shared matcher in `ext/cx-live.jsx` (`cxWardTie`) | `python scripts/test_records.py` (it runs the matcher from `ext/cx-live.jsx` against the Python one), `--only records-feed`, plus `CHECK_MODE=light`, `CHECK_THEME=original`, `CHECK_LANG=es` |
| The phone's Records tab (the second tab, Explore's slot; still `explore` in the code): folder tabs Latest, Meetings, Rooms | `ext/cx-records.jsx` (`CXM_REC_FOLDERS`, `CxmRecBar`, the folder row as a `<nav>` above the list; `CxmRecTab`, the panel), the folder state and every way in in `ext/cxm-core.jsx` (`recFolder`, `openRecords(folder)`, the `?panel=` table `P` and `cxmToUrl`); Meetings is `CxmHall` (`ext/cx-meetings.jsx`), Rooms is `CxmExplore` (`ext/cxm-explore.jsx`); styles `.cxm-recbar`, `.cxm-recpanel` in `ext/cxm.css` | `--only records-tab` (and `explore-bubble`, `city-hall`, `records-feed`), plus `CHECK_MODE=light`, `CHECK_THEME=original`, `CHECK_LANG=es` |
| The agenda calendar in Records > Meetings (a week of day cards, the status from the clock, City Council's roster, the .ics) | `ext/cx-meetings.jsx` between the "agenda calendar" comment and `CX_Meetings` (`cxAgStatus`, `cxAgWeek`, `cxAgIcs`, `CxAgenda`; `CX_AG_WINDOW` is the assumed length of a meeting), styles `.ag-` in `ext/cxm.css`; it sits under For you and the parts above it are not changed; the plan is `docs/plan-agenda-calendar.md` | `--only agenda-calendar` (its fixed clock, `AG_AT`), `city-hall`, `records-tab`, plus `CHECK_MODE=light`, `CHECK_THEME=original`, `CHECK_LANG=es` |
| The United States Index (groups, pages, rows, the globe) | `ext/cx-us-index.jsx` (the pages are built from the map's model when opened), styles in `ext/cxm.css` (`.usi-`); its history steps live in `CX_UsMap` (`ix`, `ixR`) | `--only us-index`, plus `CHECK_MODE=light`, `CHECK_THEME=original`, `CHECK_LANG=es` |
| The United States Tree (branches, lists, drawers, the details card) | `ext/cx-us-tree.jsx` (built from the Index's pages, `cxUsiPage`, when the Tree opens), styles in `ext/cxm.css` (`.ust-`); its history steps live in `CX_UsMap` (`trR`), its card is `openX({ type: 'tree' })` | `--exact us-tree`, plus `CHECK_MODE=light`, `CHECK_THEME=original`, `CHECK_LANG=es` |
| Anything saved in the browser (a new `localStorage` or `sessionStorage` name, a cache) | the code, then its line in the privacy policy's list (`ext/cx-privacy.jsx`) and a row in `docs/privacy-claims.md` | `python scripts/test_privacy.py`, `--only privacy-policy`; the policy's words need a person's approval again |
| A color, size, radius, weight | `design/tokens.json` first | `node scripts/design/audit.js`, `cvd.js`, `DESIGN_UPDATE=1 ... --only design-look` and read the diff |
| Data or a fetcher | `scripts/fetch_*.py`, run by `refresh.py` | `python scripts/refresh.py --check`, the unit tests |
| Ship | commit (one line, what changed for a resident) | `python scripts/release.py --push` (the full gate), or `--fast --push` for a change the reviewer reads live (below) |

Both styles (Bento, Original), both layouts, dark and light, English and Spanish must keep working. Checks run dark by default:
`CHECK_MODE=light`, `CHECK_THEME=original`, `CHECK_LANG=es` (or `run.js --light`, `--spanish` for the named lists in `scripts/checks/lists.js`).

## Shipping: the full gate and the fast lane

`python scripts/release.py` is the full gate: two clean builds with the same hash, every unit test and `refresh.py --check` (side by side),
every browser check plus the light-mode list in Bento and in Original (all in one pool, `--jobs N` or `CHECK_JOBS`, default min(4, half the
processors)), the committed-site check, and with `--push` the live-site check. `--no-push` never pushes.

`python scripts/release.py --fast --push` is for changes Brent reviews on the live site himself: copy, small UI and CSS tweaks, interpretive
text with its notice, a data refresh, docs. It never skips the builds, the unit tests, `refresh.py --check`, the committed-site check, or the
browser checks in `ALWAYS` (`security-policy`, `privacy-policy`, `remember-place`, `districts`, `shell`, `offline-shell`, `update-wins`). Beyond
those it runs what `node scripts/checks/changed.js --release --since origin/main` plans from the diff since the last release: the checks the
change can affect, light mode only when the look can have changed (a stylesheet, `bento.py`, `light.py`, a color or inline style in `ext/`,
or `--fresh`), Spanish when `i18n/` changed; records and docs need no extra check. It refuses, and says why, for `build.py` (the patches and
`with_csp`), `refresh.py` and the fetchers, `design/tokens.json`, the Spanish pipeline, `vercel.json`, the privacy and storage paths (and any
changed line in `ext/` that saves in the browser or asks a server), the gate and workflows, the packages, or more than 25 changed files
(site/, docs, and photos not counted). After a fast push, the Checks workflow runs the full gate on GitHub in three parts; if anything fails
the commit is red and the issue "Checks failed on main" names the failing checks (it closes itself when main passes again).

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
- **Checks run side by side.** `run.js` runs several checks at once, each in its own process with its own Chrome, profile, and server port,
  and prints the results in the table's order. A check must not write a shared file or need a quiet machine; one that cannot share goes in
  `SERIAL` in `scripts/checks/lists.js`, with the reason. `--jobs 1` runs them one by one in one process, as before.
- **On Windows, a Chrome told to close can take two minutes to exit** when several run at once (three were seen waiting and then exiting at
  the same moment). With one Chrome per check that held each job long after its result, and a 10-minute suite took 16. `closeChrome` in
  `run.js` waits 8 seconds for a clean close, then ends Chrome's processes and removes its temporary profile. The results are printed first.
- **`axe`, `text-overlap`, and `no-bleed` share their page loads** when they run together (`TOGETHER` in `lists.js`): each page of
  `AXE_PAGES` is opened once, read by the spill scan, then axe, then the overlap scan (which scrolls, so it goes last). A page is added to
  `AXE_PAGES` once for all three; a check's own extra screens stay in its own function.
- **A new kind of file needs a line in `changed.js`** for the fast lane: in `REFUSE` if it needs the full gate, in `FAST_RULES` or `RULES`
  for the checks it can affect. A file nothing there knows runs every check, and `scripts/test_release_plan.js` holds the plans to their word.
- **Sheets and overlays are registered by name** (`CXM_SHEETS`, `overlay.type` in `cxm-core.jsx`); the URL map `P` there must keep old `?panel=` links working. At City Hall and Records are no longer overlays: they are the Meetings and Latest folders of the Records tab (`openRecords`), and a story that opens one leaves "Back to the story" (`storyBack`), which Escape also follows.
- **A backtick path that starts `/portraits/` is rewritten by the build** (`asset paths`, expected 18). Build a new portrait path by joining strings, as `CxFace` does.
- **esbuild joins backtick pieces before the asset step reads them.** `` `/` + `portraits/ward-` `` became `` `/portraits/ward-` `` and the asset step counted 19, not 18. Join the pieces of a portrait path with double quotes, as `cxLegIndex` does (`"/" + "portraits/ward-"`).
- **Programmatic clicks in one task are batched.** A check that clicks Next week 40 times in one `evaluate` sees one week move, because React redraws after the task; and a real double tap before a redraw would have done the same until the handler used `setShift((x) => ...)`. Use the functional form in a handler that adds to state, and `await` a tick between clicks in a check.
- **A fake clock must be told where the page's time is read.** `AG_AT` in `scripts/checks/run.js` replaces `Date`, lists the page's `setInterval` timers in `window.__ticks`, and keeps the Blob the .ics is made from in `window.__ics`, so a check can move the clock, run the minute timer, and read the file without saving anything to the computer.
- **Photos need Pillow** (`pip install pillow`). `fetch_portraits.py` skips with a warning without it, and the nightly job installs it.
- **CI is Linux; your machine is not.** The nightly job and the Checks workflow run on Ubuntu, where the default font is narrower than Windows', so a control can measure under 44 px there and not here (the skip link did). Give a tap target an explicit `min-height: 44px`. A test that imports something only your machine already loaded (`importlib.util`) will also fail in CI; import what you use. Look at CI after a push: `gh run list --limit 4`.
- **Headless Chrome on GitHub's Linux runners has no mouse.** With no display and no input device, a computer-sized page there matched
  `(hover: none)` and `(pointer: none)`; on Windows it matches `(hover: hover)` and `(pointer: fine)`. The map's hover card (`canHover` in
  `ext/cx-us-map.jsx`) and every hover style never appeared, so `us-map` and `us-explain` failed only on GitHub (Oct 6). `run.js` starts Chrome
  with Blink's own pointer settings (`DESK_MOUSE`) and stops at once, with the reason, if a computer-sized page does not report a mouse. A phone
  page still gets `(pointer: coarse)` from puppeteer's touch emulation. `Emulation.setEmulatedMedia` cannot change `hover` or `pointer`.
- **The frame rate changes where a moving thing is.** Headless Chrome draws about 150 frames a second on Windows and 60 on Linux, and the
  force layouts move one step a frame. A dot let go on the corner map springs back and swings past its start, so 600 ms later it was 26 px away
  on Windows and 15 px on Linux (`us-profile` wanted more than 15). Read a dragged thing while the button is held, or wait for it to rest.
- **The nightly checks the build it publishes.** `.github/workflows/refresh.yml` refreshes and builds on one machine, packs `data/`, `site/`,
  `bench/`, and `dist/`, and checks that exact build on three machines (`--shard k/3`, 2 at a time); the publish job commits only when every part
  passed (`git add -A data site bench`). A new built file under `site/` is published with no change here; one anywhere else needs a line in
  the publish step. "Run workflow" with "dry run" ticked runs everything on any branch except the publish and the issue.
- **Do not use regex lookbehind (`(?<=...)`) in `ext/`.** Safari before 16.4 cannot parse it, and a parse error breaks the whole bundle. Split with `match(/[^.!?]+[.!?]*/g)` instead.
- **Make dynamic sentences translatable by splitting them.** A sentence glued from a name, a verb, and a date is one text node and cannot be translated well. Render the name, the verb phrase ("meets Monday."), and the date as separate spans, and add each piece to `i18n/manual.json` (the pieces, not the whole sentence). `CxMtgHead` does this.
- **An office with no words of its own showed one generic line.** `qm()` (the compiled app) has words for Governor, Congress, judges, the General Assembly, and County Council; Attorney General, Auditor of State, Secretary of State, Treasurer of State, and County Executive fell through to "A detailed authority summary has not yet been reviewed for this office." The five now come from `ext/cx-offices-text.jsx`, matched by exact contest name; a new office on the ballot with a new name falls through again until a line is added there (`office-text` lists the five; add the name to it too).
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
- **A state rule loses to the generated light rule for its base.** `light.py` writes `html[data-cx-mode=light] .cxm-tick i { background: ... }`
  for a dark base rule with a color, and the extra `html[...]` outranks the dark `.cxm-tick.on i { background: var(--acc2) }`. In light the Explore
  rail's fill, current tick, and current ring were the track's pale gray. Restore the state in `ext/cx-light.css` (never by editing dark), and
  look at the current state, not only the idle one, in a light screenshot.
- **Words that must be in the reader's language from their first frame** (the guide's bubble on Explore) are drawn already translated
  (`cxUsmTr`) on an element marked `data-no-translate`; without the mark the translator takes the Spanish for new English, marks it `lang="en"`,
  and lists it as a gap. Words the translator swaps after drawing show English for about 50 ms.
- **Explore's "where you are" is one value.** `CXM_RAIL.level` is the level of the card on the reading line (45% down the list); the lit
  tick, the highlighted heading, the highlighted card, and the guide's bubble all read it. A second way to work out the level (the old bubble
  used the pinned heading) disagreed with the card on a third of the rests. The rail's ticks are evenly spaced 44 px targets and the guide
  moves piecewise in step with the scroll (`cxmRailY`), so it passes a tick exactly when that level takes the reading line.
- **Chrome moves a tap near a button onto the button.** On a touch screen a tap a few pixels off a rail tick lands on the tick (touch
  adjustment), so test "a bare tap does nothing" with the mouse, and make a drag handle a hit target of its own: the guide is drawn above the
  ticks, or a drag that starts on the guide where it sits on a tick would only press the tick.
- **A history step cannot be read back on a computer.** The compiled desktop app rewrites the entry a back step lands on, 180 ms later, with an
  empty state. So the map counts its own steps (profiles, notes, the sheet, and the Index's names in `ixR`) instead of trusting `history.state`;
  the Index also writes its depth (`cxUsi`) on its entries again after each step (`ixStamp`), so Forward can tell itself from Back.
- **A step taken while another is being removed is lost.** `history.back()` and `history.go(-k)` finish later; a `pushState` made in the same
  moment lands first, and the step back then removes it. Anything that opens a new step right after closing one (Explore in Index from the
  sheet, a card's buttons, Show on the map from the Index) closes first and goes on in its `then`: `closeX(then)`, `sheetThen(then)`, `ixLeave(then)`.
  Leaving the Index takes its steps out of history (`ixLeave`); a step of an Index that is no longer showing is passed quietly on the way back.
- **`textContent` glues words together.** The text of two neighbouring elements comes out as one word ("mapStrong"), so a word pattern with `\b`
  never sees the second word. A check that scans text for words joins the text nodes with spaces (`us-index` did not catch a planted "Strong"
  until it did).
- **The map's phone sheet opens part way and clips its body until it is pulled up.** That suits the map's sheet; a sheet that is the whole
  content (the Index's details card) opens all the way (`CX_UsMapSheet tall`), or `no-bleed` sees cut-off text.
- **A built page cannot be edited to plant a fault.** The Content-Security-Policy allows the page's inline scripts only by their hash, so a copy of
  `site/` with one word changed opens with no app at all. Plant the fault in `ext/`, rebuild, run the check, put the source back, and rebuild.
- **esbuild keeps comments.** Every comment in `ext/*.jsx` is in the page's code and counts toward `perf-budget` (the Tree's file compiles to 45 KB).
- **A link styled as a button takes the desktop app's link color.** `.atlas-shell a` outranks `.usm-btn`, so an `<a className="usm-btn">` in the
  map's sheet is orange in Original, 4.39:1 on the button's tint in light Original (axe fails). Set its color on `a.usm-btn` where it is used.
- **A ResizeObserver reports every element it starts watching, at once.** The Tree first watched everything again after each render and laid
  out again on each report, which cut every slide short after one frame (no check caught it until `us-tree` looked at a drawer mid-slide).
  Watch only new elements, compare with the sizes the layout used, and wait for a move to end.
- **The Tree's steps in history are passed quietly when empty.** Opening something is a step (`trR.push`); closing it by hand takes it out of
  the steps (`trR.drop`), and the newest empty steps leave history at once. A step left empty further down is passed on the way back, so no
  back press does nothing. Leaving the Tree (a pill, the menu, Show on the map, Explore in Index) takes its steps out first (`trLeave`).
- **`/records/` is two things on the hosted site.** It held only the two ballot PDFs (cached a day, saved once by the service worker); it now also
  holds Records' lists, which change every night. The lists have their own `Cache-Control` rule in `vercel.json` (after the folder's) and go to the
  network first in the service worker. In `ext/`, name the folder from parts (`CX_RECS_DIR` in `ext/cx-records.jsx`): a written-out path that starts
  `/records/` is rewritten by the build's asset step, whose count (18) then fails.
- **"Ward" has one meaning, in one place.** `cxWardsIn`, `CX_WARD_LOOK`, and `cxWardTie` live in `ext/cx-live.jsx` between the "ward matcher" comments;
  At City Hall's For you, the ward view, and Records call them, and `scripts/records_feed.py` does the same in Python. `scripts/test_meetings.js`, the
  `city-hall` check, and `scripts/test_records.py` read that part of the file, so keep the two comments. Sponsorship by a ward's member is never a tie.
- **`CxmLatest` was taken.** A leader's latest changes are `CxmLatest` (and `.cxm-latest`) in `ext/cxm-live.jsx`, so Today's Latest is `CxmRecLatest`
  with `.rf-latest`. Grep a name before using it.
- **Today reads only the front of Records.** `useCxRecs(true)` asks for `latest-2026.json` (about 10 KB, 3 KB sent) 250 ms after Today draws; the
  whole list (about 1.2 MB, 140 KB sent) waits until Records opens. `perf-budget` allows the small file on Today and fails on the large one.
- **A row outside `<main>` and the tab bar is outside every landmark.** The Records folder tabs sit between the Updated strip and the list, so
  axe's `region` rule failed on every Records screen until the row became a `<nav aria-label="Records">`, as the tab bar is a `<nav>`. Anything
  new placed between the header and the list needs a landmark.
- **A full page left Today drawn under it.** At City Hall and Records were full pages over the Today tab, so `document.querySelector('.bn-hall')`
  or `'.rf-card'` found Today's next-meeting card and Latest first, and a comparison of the two builds said the page had changed when it had not.
  Scope a selector to the page (`.mt-page`, `.rf-page`, or `#rf-folder-panel`) when comparing or checking a screen.
- **The rail measures the list, not the header.** `CxmRail` sets its top from `.cxm-main`'s `offsetTop` (plus 10 px), so a row added above the
  list moves the rail by itself; the rail got 59 px shorter under the Records folder tabs and nothing in the rail changed. Do not give the rail
  a fixed top for a header; add the header outside the list and let the measurement follow.
- **Records is one tab with three addresses.** Latest writes `?panel=records`, Meetings `?panel=meetings`, and a record opened over either keeps
  that address (they come before `leg` in `cxmToUrl`); Rooms writes nothing, or `?room=`, as Explore did, so a reload of Rooms opens Today.
  `?panel=explore` is read (it opens Rooms) but never written; the desktop does not know it and shows its "could not find that page" notice,
  as it already did for `?panel=records` and `?panel=meetings`.
- **A check run "on the old build" may run on the new one.** `run.js --site <dir>` only takes effect with `--jobs 1`, because `pool.js` does not
  pass it to its child jobs; side by side, every job reads `site/`. To prove a new assertion fails on the old build, run it with `--jobs 1`.
- **The strip claims no number.** The phone's Updated strip says when the records were pulled and "What's new", and opens What's new (it once counted
  the latest pull's changes and opened a "Changed in the latest pull" list; both were removed). What's new reads the change log in `data/changes-2026.json`.
- **The desktop's drawer makes every link a block.** The compiled `.practice-drawer a { display: block; margin: 15px 0 }` outranks `.cxm-src`, so a `CxmSrc` link inside the ballot's record drawer put its arrow icon on a second line. `.practice-drawer .cxm-src` in `ext/cx.css` sets it back to `inline-flex`. Look at a phone component in the desktop drawer before you reuse it there.
- **A ticket is one contest, two offices.** The Governor and Lieutenant Governor contest (`contest-1`) keeps the compiled `qm()` words (the governor's) and the Lieutenant Governor's line comes from `CX_OFFICE_TICKETS` in `ext/cx-offices-text.jsx`, shown by `CxOfficeNote` (right after the words) or by `CxOfficeTicket` (after the governor's own source link, where the record has one; those callers pass `skipTicket` to `CxOfficeNote`). It is looked up by contest id, not name, and `cxOfficeInfo()` stays null for that contest so the governor's words cannot change. `office-text` checks the order: the governor's words, the governor's link, the Lieutenant Governor line, its link, then the notice once.
- **A failed-file test passes silently while the hosted page's service worker is in control.** The worker answers a request before the browser's
  interception sees it, so `setRequestInterception` alone fails nothing and the page happily loads the real file. `open(url, { net: { '/us/landscape-2026.json': 'abort' | 'hang' | 503 } })`
  in `scripts/checks/run.js` turns the worker off for that page first (`Network.setBypassServiceWorker` through a CDP session), counts how often each file was asked for
  (`p.netHits`), and lets a test lift the failure by setting `p.net[path] = null`. A check that forces a failure asserts `netHits` is at least 1, or it proves nothing
  (`load-states` does). A test of the single offline file opens `dist/Cleveland-Civic-Graph-v5.html` over `file://` instead; it has no server, so it has no Try again.
- **A file that has not arrived has three words, not one: Loading, Still loading (8 seconds), could not load (12 seconds or the request ends with nothing).** `useCxWait(over)` and `CxFail`
  (`ext/cx-live.jsx`) draw them on top of `CxmEmpty` (which takes a `state` and stamps `data-cx-state`), and every one has Try again. A loader that is asked for again must forget
  its cached promise (`cxUsLoad(true)`, `cxMtgRetry()`), and an older request that ends later must not undo a newer one. "Needs the hosted site" is true only for the single offline file:
  choose the words with `cxIsWeb()`, never by guessing. The timers are real (8 and 12 seconds), so `load-states` waits about 15 seconds on its hung-file case.
- **After the election the Ballot's top lines come from `cxElectionPhase()`.** `CxmBallot` (`ext/cxm-ballot.jsx`) drops "Polls open" and "Take your time" once the phase is `after`; the dates list
  below it (`CxmDates`) already carries the election-is-over line and the official results link. On Election Day itself and before, the old lines stay. `load-states` forces the clock to each of the three.
- **A candidate with no record is a coverage line, not a load failure.** The words must not say "loaded" (`load-states`). The desktop twin in the compiled app ("No reviewed policy record loaded yet",
  `CivicAtlas.pretty.js` around line 14822, and "No reviewed candidate-specific policy record is loaded" around 15594) has no `build.py` patch yet and still reads that way.
- **The United States map is settled at build time.** `scripts/us_map.js` runs the same physics and seed as the page and writes `site/us/map-2026.json`; the page uses it only when it was made from the same record (`cxUsmIds`). Change the physics in `ext/cx-us-map.jsx`, rebuild, and `scripts/test_us_map.js` checks the file matches a fresh run. d3 comes only from `ext/cx-d3.js`, bundled by `build.py` from the pinned packages; never load it from a CDN (the Content-Security-Policy would block it).
