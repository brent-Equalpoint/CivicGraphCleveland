# Speed

How fast the Cleveland Civic Graph opens and moves, measured, and what was changed to make it faster without changing anything a
resident sees or reads. Rules in `CLAUDE.md` still hold: nothing personal leaves the browser, every inline script is allowed only by
its hash, the offline single file works with no network.

## How it is measured

```
node scripts/perf/measure.js                    every scenario, 3 runs each, medians, against site/
node scripts/perf/measure.js --site <folder>    another build (a saved copy of the old site/, for a before and after)
node scripts/perf/measure.js --only today,us-phone --runs 5 --json out.json
node scripts/perf/measure.js --profile          adds a CPU profile of the map while panning, zoomed in
```

- **The host, imitated.** The tool serves the folder like Vercel does: brotli (quality 11) when the browser asks for it, an ETag and a 304
  for an unchanged file, and the cache rules in `vercel.json`. Every page opens in a fresh browser profile (nothing cached). Page requests
  skip the service worker so every byte is counted.
- **Phone:** 390 by 844 at 3x pixels, touch, a 4x slower processor, and Slow 4G with Lighthouse's numbers (562.5 ms latency, 1.44 Mbit/s
  down, 675 kbit/s up). **Desktop:** 1280 by 900, no slowdown.
- **Marks.** First paint is the browser's own. "Ready" is the first frame in which the screen's main content is on the page: the stories
  row on Today (`.cxm-story-btn`), the room tabs on the desktop (`.atlas-workspace`), the map's first drawing with names on it, or the
  phone tabs reading "Hoy" in Spanish. "Interactive" is the end of the last task over 50 ms before 3 quiet seconds. "Blocking" adds up
  each long task's time over 50 ms after first paint.
- **Map frames.** Every animation-frame callback is timed, and a frame's cost is the script time spent in it (the map draws in one). Headless
  Chrome runs frames faster than a 60 Hz screen, so the number of frames is not meaningful; the cost of one frame is.
- **Timings belong to the machine.** Compare runs from the same machine only. The byte counts do not depend on the machine. The numbers
  below are from one Windows 11 laptop, Chrome 154, Oct 5, 2026, with the before and the after measured back to back.

## Before (commit 5ffdab3, `site/index.html` SHA-256 `c1fc53801bc4d1e0682c70fc5668c35f215bf5c92ace2b9ea434f7b42d01ab5f`)

### Files

| File | Raw | gzip | brotli |
| --- | --- | --- | --- |
| `index.html` (the whole app) | 2,666.5 KB | 643.4 KB | 493.6 KB |
| of which inline CSS | 600.7 KB | | about 79 KB |
| of which the app script | 2,061.6 KB | | |
| `us/votes-2026.json` | 1,608.1 KB | 136.5 KB | 79.6 KB |
| `districts/districts-2026.json` | 1,204.4 KB | 263.8 KB | 187.4 KB |
| `us/landscape-2026.json` | 715.1 KB | 93.3 KB | 74.0 KB |
| `i18n/es.json` | 589.9 KB | 188.4 KB | 144.5 KB |
| `meetings/meetings-2026.json` | 159.2 KB | 13.2 KB | 8.6 KB |
| `us/map-2026.json` | 25.6 KB | 9.6 KB | 8.4 KB |
| `sw.js` | 2.6 KB | 1.2 KB | 0.9 KB |
| 542 federal portraits (`portraits/us/`) | 1,819.6 KB | | already compressed |
| 16 council and mayor portraits | 200.0 KB | | already compressed |
| 9 font files | 197.2 KB | | already compressed |

Inside the app script, about 1 MB is records written as code: Council's 2026 items (`CX_LEG`, 613 KB), the roll calls (`CX_VOTES`),
the place histories (`CX_PL`, 82 KB), the ward maps (`CX_GEO`, 47 KB), and What's new (`CX_UPDATES`).

### Opening a screen (median of 3)

| Screen | First paint | Ready | Interactive | Long tasks | Blocking | JS heap | Sent |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Phone, Today, first visit | 656 ms | 4,018 ms | 4,219 ms | 3, 780 ms, longest 391 | 630 ms | 5.42 MB | 592.4 KB |
| Phone, Today in Spanish | 668 ms | 5,850 ms (in Spanish) | 5,850 ms | 3, 768 ms | 618 ms | 6.54 MB | 785.3 KB |
| Phone, People > Graph link (`?panel=us&view=graph`) | 664 ms | 5,967 ms (map drawn) | 5,967 ms | 5, 925 ms | 675 ms | 6.63 MB | 666.4 KB |
| Desktop, home | 116 ms | 211 ms | 211 ms | 2, 156 ms | 29 ms | 6.79 MB | 619.0 KB |
| Desktop, United States map | 124 ms | 345 ms (map drawn) | 345 ms | 3, 228 ms | 21 ms | 9.31 MB | 751.6 KB |

On the phone link to the map, the federal record arrived at 5,462 ms and the first drawing came 505 ms after it. On the desktop map,
147 ms after it. On the Spanish phone, the page showed in English from 4,027 ms and switched to Spanish at 5,850 ms.

### The United States map at work (script time per frame, median of 3 runs)

| | Desktop median | Desktop p95 | Phone (4x slower) median | Phone p95 |
| --- | --- | --- | --- | --- |
| Opening glide (the first 1.2 s) | 0.6 ms | 0.8 ms | 2.5 ms | 3.0 ms |
| Calm, the physics settling after a pan | 6.9 ms | 8.6 ms | 30.3 ms | 35.4 ms |
| Live | 6.9 ms | 7.3 ms | 30.5 ms | 35.0 ms |
| Pan, still | 0.7 ms | 0.9 ms | 2.3 ms | 3.6 ms |
| Zoom (8 wheel steps) | 1.0 ms | 2.5 ms | 1.6 ms | 1.9 ms |
| Pan, zoomed in (every name on screen is a candidate) | 0.7 ms | 1.0 ms | 1.8 ms | 2.5 ms |
| Picking the Senate (lines to 121 connections) | 1.4 ms | 2.1 ms | 4.8 ms | 5.1 ms |

### What is biggest or slowest

1. **The phone's first load waits on the network.** The page is 494 KB with brotli and takes about 3.4 s to arrive on Slow 4G; the
   boot line shows at 0.66 s, and the app draws about 0.6 s after the last byte. Its records are needed on Today, so the bytes cannot
   drop much without splitting the app (see `docs/plan-optimization.md`, phases 3 and 6).
2. **Start-up on a slow phone: 0.78 s of long tasks.** Reading and compiling the 2 MB script (about 0.4 s in one task), then drawing the
   first screen. In the CPU profile, one date helper (`cxShortDate`) spent 78 ms of its own time: it built a new date formatter for every
   date in What's new and the council questions.
3. **Opening the United States map: 505 ms after its data arrives on a slow phone.** About 300 ms of it was the old Sky's fixed layout
   (`cxUsPlace`, 60 passes of nudging 1,400 people and 845 judges apart), which ran every time the federal record loaded although only
   the old Sky, no longer on any screen, reads those positions. Another 54 ms was date formatting.
4. **A deep link waits twice.** On `?panel=us`, and for a reader who chose Spanish, the second download (the federal record, or the
   Spanish dictionary) only started after the app had drawn, so it was paid in full after the page.
5. **The map's frames are cheap except the physics.** Still, panning, zooming, and names cost under 1 ms a frame on a computer and under
   5 ms on the slow phone. Calm (while settling) and Live cost about 7 ms a frame on a computer and 30 ms on the slow phone, which
   halves the phone's frame rate; about 80% of it is d3's many-body and collision forces. Label placement is under 0.2 ms a frame even
   zoomed in, so a spatial grid would not show.
6. **Idle is quiet.** Today sitting still runs only the banner drawings: about 4 ms of main-thread work in 3 s.

## What changed (nothing a resident sees or reads)

1. **The old Sky's layout runs only for the old Sky** (`ext/cx-us.jsx`). `cxUsGraph` builds the federal record without it, and `cxUsSky(g)`
   places it once when the old Sky is drawn (its sheet is still registered, though nothing opens it). The new map, the Index, the profiles,
   and Easy mode never read those positions. Proven the same: the old Sky's positions, rings, and clusters from the new code equal the
   committed code's, value for value; building the record went from 117 ms to 4 ms in Node; `scripts/test_us_model.js` now also fails if
   building the record lays out the old Sky again. `site/us/map-2026.json` is byte for byte the same (`ce0d604b...`).
2. **Dates are worked out once** (`cxShortDate`, `cxDayET`, `cxClockET` in `ext/cx-live.jsx`, `cxmDate` in `ext/cxm-core.jsx`, `cxVoteDate`
   in `ext/cx-us.jsx`). Each keeps one `Intl.DateTimeFormat` and remembers the answer for a day it has seen, on the function itself (a
   `const` cache in a later file would not exist yet when an earlier file calls these at load time). In Chrome, the formatter gives
   exactly what `toLocaleDateString` gave for every day from 2020 to 2030 and every time of 2026 (13,265 cases, 0 different).
3. **Records travel as JSON, not as code** (`build.py`, `js_data`). Council's items, roll calls, place histories, ward maps, and What's new
   are one `<script type="application/json" id="cx-data">` block, read once with `JSON.parse` and then removed. Writing them as
   `JSON.parse('...')` inside the code was tried first: as fast, but it kept the text in memory beside the data (+1.4 MB of heap); the
   block does not (heap 5.44 MB against 5.42 MB before). A data block never runs, so the Content-Security-Policy needs no new hash.
4. **The CSS loses its spaces and comments** (`build.py`, esbuild `--minify-whitespace`, nothing else): about 44 KB less CSS to read and
   6.5 KB less to download. Every rule, value, and selector stays in its order; `design-look` (four looks, 47 parts of 9 screens) is unchanged.
5. **The hosted copies of the federal record and the meetings file lose their indentation** (`build.py`): 63 KB and 11 KB less to read.
6. **A link starts its second download right away** (`build.py`, `EARLY_FETCH`, hosted site only). A small script in the head preloads the
   federal record and the map's places when the address opens the United States page (the map file only where the map shows, by the same
   rule as `cxmWantPhone`), and the Spanish dictionary when this browser chose Spanish. Same files, same site, nothing personal in them.

## Before and after (median of 3, back to back on the same machine)

| | Before | After | Change |
| --- | --- | --- | --- |
| `index.html`, brotli (what a visitor downloads) | 493.6 KB | 487.6 KB | -6.0 KB |
| `index.html`, raw | 2,666.5 KB | 2,652.3 KB | -14.2 KB |
| `us/landscape-2026.json`, raw | 715.1 KB | 652.6 KB | -62.5 KB |
| Phone, Today: ready | 4,015 ms | 3,896 ms | -119 ms |
| Phone, Today: long tasks | 783 ms (longest 386) | 707 ms (longest 345) | -10% |
| Phone, Today: blocking | 633 ms | 557 ms | -12% |
| Phone, Today: largest paint | 4,940 ms | 4,836 ms | -104 ms |
| Phone, Today: JS heap | 5.42 MB | 5.44 MB | same |
| Phone, Spanish: page in Spanish | 5,857 ms | 5,021 ms | -836 ms |
| Phone, Spanish: English shown first, for | 1,831 ms | 313 ms | |
| Phone, link to People > Graph: map drawn | 5,929 ms | 4,605 ms | -1,324 ms (-22%) |
| Phone, link to People > Graph: long tasks | 914 ms | 529 ms | -42% |
| Desktop, home: ready | 217 ms | 200 ms | -17 ms |
| Desktop, United States map: drawn | 351 ms | 281 ms | -70 ms (-20%) |
| Desktop, United States map: long tasks | 234 ms | 146 ms | -38% |
| Phone, map's first drawing after its data (opened from inside the app) | 496 ms | about 185 ms | -63% |
| Map frames (still, pan, zoom, pick, Calm, Live) | see above | the same within 0.5 ms | no change |

The phone map figure "opened from inside the app" is from the runs between changes (`?panel=us&view=graph` before the early download was
added: 489 ms before, 183 to 186 ms after), because with the early download the data now arrives before the app has started.

**Trade-offs, honestly.** On a link to the map, the app's first drawing (the "Loading the federal record" screen) comes 0.38 s later,
because the page and the federal record share the connection; the map itself comes 1.3 s sooner. For a Spanish reader, the English
page draws 0.68 s later and, in 2 of 3 runs, one more long task (the page laid out again when its fonts arrive) ends about 0.1 s after
the old finish; the page reads in Spanish 0.84 s sooner. A reader in English on Today pays nothing for either.

## Tried or considered, and not kept

- **A spatial grid for map labels, cached label boxes, batched canvas paths, fewer allocations per frame.** Labels and drawing cost under
  1 ms a frame on a computer and under 3 ms on the slow phone; there was nothing to win that would show. Batching paths by color would
  also change how overlapping see-through shapes blend, which residents could see.
- **Making Calm and Live cheaper.** About 80% of a moving frame is d3's physics. Fewer collision passes, a coarser Barnes-Hut, or ticking
  every other frame would change how the map moves. Not done. (Calm also never moves by itself after the map opens; see Traps in
  `docs/how-it-fits.md`.)
- **Skipping the 30 ms pause before the map's first drawing** and **the opening glide that moves nothing**: small, and each changes a
  moment on screen (the "Arranging the map" line, or Calm starting to drift at open).
- **Preloading the fonts.** They arrive after the app draws and are swapped in (the largest paint on Today is that swap). Preloading would
  make the page itself arrive about 0.5 s later on Slow 4G. Not measured on a real HTTP/2 host; left alone.
- **`content-visibility` on Today's lower sections** to skip their first layout (172 ms on the slow phone). It changes how the page
  scrolls before those parts are laid out. Not done.
- **Lazy portraits.** Today shows few, and they are on the first screen.
- **Taking the records out of the page, and a separate phone build** (`docs/plan-optimization.md`, phases 3 and 6). These are the only
  large wins left for the phone's first load (it waits about 3.4 s for 488 KB on Slow 4G), and each needs its own session.

## The budget (`perf-budget` in `scripts/checks/run.js`)

Recorded Oct 5, 2026 in `scripts/checks/perf-budget.json` (bytes are gzip -9 of the files in `site/`): the app's code in the page
494.1 KB (fails past +3%); its records 142.6 KB (fails past +60%, a year of Council records); Today's first load on a phone, 7 files,
738.9 KB (fails past +25%, and fails at once if it asks for the federal record, the votes, the district list, or in English the Spanish
dictionary); the map's two files 101.8 KB (fails past +25%); the map's first drawing, 10,154 canvas shape calls (fails past +10%; the
same in every run). When the map's first drawing is done (about 250 to 300 ms after the page starts on the checks' server) is printed,
and only warns past twice that. Proven: 40 KB of incompressible text added to the CSS fails it (code 524.5 KB); a page that makes
Today download the federal votes fails it; the real build passes, in English and in Spanish.

Re-recorded on purpose Oct 6, 2026 (`docs/plan-explain-committees-and-seats.md`, phases 3 and 4): the app's code is 542,395 bytes gzip. Main
was already at 537,347 (2.9% over the Oct 5 record, after the desktop strip); what a committee does adds 5.0 KB gzip (the six role notes,
"How a committee works", and the sheet, profile, note, and story parts in `ext/cx-us-text.jsx`). The 218 committee lines and the official
words (`site/us/explainers-2026.json`, about 80 KB gzip) are not in the page: they load the first time a committee, a subcommittee, a role's
official words, or the Index, Linked, or Tree view needs them, never when the app or the map opens (the `us-explain` check fails if they do).
