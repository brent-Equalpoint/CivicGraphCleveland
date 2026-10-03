# Plan: make the app lighter, faster to update, and safer to change

Written Oct 2, 2026. Nothing here is built. It is a plan to pick up when we choose to, kept in the same form as the other plans.
The numbers are measured from the shipped build (`site/index.html`, commit 1c36ec5), not estimated.

The goal: residents download less, a nightly data refresh stops forcing everyone to download the whole app again, and a change
to the code is harder to get wrong. No change to how anything looks or reads: `design-look`, `story-fit`, `no-bleed`, `axe`, and
the rest must pass exactly as they do now after every step.

## Where we stand (measured)

| Part | Raw | Sent over the network (gzip) | Notes |
| --- | --- | --- | --- |
| `index.html` (the whole app) | 2.48 MB | about 583 KB | one file; the offline copy is about 3.67 MB because it also carries the fonts, portraits, and Spanish |
| JavaScript | 1.90 MB | about 486 KB | the compiled desktop app is the smaller part; our own code plus **embedded data** is about 1.47 MB of it |
| CSS | 575 KB | about 95 KB | about 250 KB of it is the saved desktop stylesheets; the generated Bento layer (about 42 KB) and the generated light layers (about 130 KB) are copies of the same rules in other colors |
| Data written into the JavaScript | about 1.3 MB | | Council items, votes, places, reasons, ward maps, people (`CX_LEG`, `CX_VOTES`, `CX_PL`, `CX_GEO`, and others) |
| Spanish dictionary | 526 KB | loaded only on request | already lazy on the hosted site |
| Checks | about 10 minutes, one after another | | and long runs sometimes lose their Chrome session |

The costs that matter to a resident:

1. **Every morning the whole app changes.** The nightly refresh rewrites the data inside the JavaScript, so the page's hash changes
   and every returning visitor downloads about 583 KB again, code and all, for a data-only change.
2. **Start-up parses 1.9 MB of JavaScript**, 1.3 MB of which is data written as code rather than as data. Parsing a data file is
   faster than parsing the same thing as code.
3. **The CSS repeats itself** for each style and each mode.

The costs that matter to us:

4. All app files are joined into one scope, so two files can quietly define the same name.
5. `build.py` carries many exact-match text patches against the compiled desktop app; each is a place a harmless-looking change
   can break the build or, worse, not break it and change nothing.
6. Nothing stops the page from growing.

## Phases

Each phase is useful on its own and can be the last one.

| # | Phase | Done when | Size |
| --- | --- | --- | --- |
| 1 | **A size budget.** A check that fails when the page, the JavaScript, the CSS, or the transferred size grows past a limit set from today's numbers (with a small margin), and prints the biggest contributors | `size-budget` runs in the suite and in `release.py`; a deliberate 50 KB addition fails it | half a session |
| 2 | **A name-clash check.** Fail the build if two app files declare the same top-level name (they share one scope) | the check lists every duplicate; today's count is zero or fixed | half a session |
| 3 | **Data out of the code.** Build each dataset as its own JSON file (cached by the service worker, loaded with the app, parsed as data). The app shell keeps the same hash from night to night; only the data files change | the nightly refresh changes `site/data/*.json` and not `index.html`; the offline single file still carries everything; start-up measured faster on the throttled-phone test; every check passes | 1 to 2 sessions |
| 4 | **Colors as variables, not copies.** Move the Bento and light rules from "re-emit every rule in new colors" to a small set of custom properties, area by area, with `design-look` proving each move changed nothing; then retire the legacy color list in `design/legacy.json` | the generated Bento and light layers shrink to the variables plus the exceptions; CSS under about 350 KB; `design-look` unchanged | 2 to 3 sessions |
| 5 | **Unused CSS.** Using the coverage the crawl already records (which rules ever match on any screen in any state), drop rules that never match; keep a list of rules that are kept on purpose (error states, print) | CSS smaller again with every check passing; a rule can come back by adding it to the keep list | 1 session |
| 6 | **Phone and desktop split.** Only load the layout a visitor is using (the compiled desktop app is the part a phone never needs, and our phone screens are the part a desktop never needs). Shared code stays shared | a phone's first load skips the desktop app; the offline file still holds both | 2 sessions; the riskiest |
| 7 | **Checks in parallel.** Run the browser checks in groups, each with its own fresh browser; keep a single-run mode | the full suite takes about a third of the time; no more lost sessions | 1 session |
| 8 | **Retire the compiled desktop app, page by page.** Every desktop page we have rewritten (stories, profiles, levies, the U.S. graph, the leaders mosaic) already replaced a piece of it. Keep going with the pages that remain, and delete the matching `build.py` patches as each one goes | `build.py` has fewer exact-match patches each time; the compiled app is smaller | open-ended |

## What to watch

- **Order matters.** 1 and 2 first (they make the rest safer). 3 is the biggest win. 4 and 5 depend on `design-look` being trustworthy;
  it is. 6 touches how the app starts, so it goes after 3 and is done last of the loading changes.
- **The offline single file must keep working** with no network and with the exact build hash recorded. Anything that loads a file
  at run time needs an embedded fallback in the offline build.
- **The service worker is the risk in 3.** A wrong cache rule can pin an old data file. The existing `update-wins` and
  `offline-shell` checks cover the shell; a data-version check is added with phase 3.
- **Nothing changes for residents** except speed. If a phase changes what a screen shows, it was done wrong.
- **Measure before and after** on the same throttled phone the earlier loading numbers came from (loading line in 0.3 s, usable in
  4.6 s), and record the numbers next to the hash in `STATE-OF-BUILD.md`.

## Rules that apply

Everything in `CLAUDE.md`: the fix lives in the source or `build.py`, a clean rebuild from scratch, the hash recorded beside any
claim, `STATE-OF-BUILD.md` updated, both styles, both modes, both layouts, English and Spanish.
