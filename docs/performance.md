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
