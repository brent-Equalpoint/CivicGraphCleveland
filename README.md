# Cleveland Civic Graph v5: standalone rebuild

Built 2026-10-01 (UTC) from the files in `Civic Intelligence`, with Council's record pulled Oct 1, 7:45 AM ET. Output hash, from the clean run in `BUILD-LOG.txt`:

`ed1514345dfb30e8722bcb4cca80ca816cd2f47d713cc812b60251dba40e104f  Cleveland-Civic-Graph-v5.html` (2,757,338 bytes, v5.15)

On a phone the same file opens as the phone app (760px wide or narrower, or a touch screen whose short side is 500px or less). `#phone` or `#desktop` at the end of the address forces either layout.

Open `Cleveland-Civic-Graph-v5.html` in any modern browser. It is one file and runs offline: React, the app, the styles, the 16 official portraits, and both Board of Elections record PDFs are inside it. The only network requests are optional webfonts; without them the page uses the system font. The hosted version lives in `build-source/site/` and serves its own fonts.

## Where each part came from

| Part | Source | How it got into v5 |
| --- | --- | --- |
| The full working app (civic chamber, Simple / Explore / Audit, map and text views, record drawer, 15 wards, energy and education maps, dictionary, practice ballot, constellation, priorities, voter education) | `Civ_Intel_ag.Arch.04/Cleveland-Civic-Graph-Agentic-Bench-Source.tar.gz` (compiled Sep 23 release) | Used as-is, then patched |
| Look and feel of the Sep 24 version | `Cleveland Civic Graph 32_files/*.css` (saved stylesheets) | Used as the stylesheet |
| Sep 24 features whose code was lost (the ChatGPT-hosted site now returns 401): 4-step guided view, Resident check, My local context, Cities & municipalities, Local decisions, contract ledger, inline definitions, dictionary categories and featured term, text-view connections, research-preview card, larger text | Saved v32 page markup and its CSS class names as the spec | Rebuilt in `ext/cx-ui.jsx` and `ext/cx-data.jsx` |
| Civic ecosystem room (22 institutions) | `Cleveland-Civic-Graph-Ecosystem-Architecture-v1.html` | Data ported into a chamber room |
| How this is built (pipeline, 16 seats, states, review gates, delivery stages 0 to 10, acceptance cases, evidence states) | `docs/civic-agent/Civic-Intelligence-*-v1.md` and the Bench doc | Rebuilt as an in-app page; the first running stages live in `bench/` (see `bench/README.md`) |

## v5.1 additions

- **Plain-English priority guides.** Each of the 8 choices in My priorities now opens "What choosing this means in Cleveland": what it means, a short comparison to everyday life, 3 to 4 sourced Cleveland facts, who decides, what people weigh, and questions to ask. A guide opens automatically when you pick that priority. Facts were checked against the linked sources on 2026-09-24.
- **My leaders.** Compares your chosen priorities with each council member's 2026 sponsorship record and the administration's departmental requests, from Cleveland's official Legistar database (`data/legistar-2026.json`, 1,319 items retrieved 2026-09-25 by `scripts/fetch_legistar.py`). Items are matched to priorities by visible title keywords. There is no score, no match percentage, and no ranking.
- **Letter drafts.** For any member, the page drafts a letter from your priorities and their record for you to edit, copy, and send yourself.
- **Not included yet:** individual roll-call votes. Legistar records that Council approved a measure, not each member's vote; those votes are in the City Record minutes.

## v5.2 changes

- My leaders now reads in plain language: each member shows how many proposals they **led**, **joined**, and **signed for a city department**, a one-paragraph summary, and their own proposals grouped by what they do, each with a "What this means for you" line. Department requests are collapsed and explained as routine.
- Keyword matching tightened (for example, "port" now means the Port of Cleveland, and "sustainable services" no longer counts as environment).

## v5.3 changes

- My leaders cards show bars again, one per chosen priority, split by role: orange for Led, purple for Joined, gray for Signed for a city department.
- Selecting a card opens a slide-out panel on the right with the plain-English explanation. Escape, the X, or a click outside closes it.

## v5.4 changes

- My leaders opens on one leader profile at a time in blue bento tiles, with a "Common ground" count, their main focus, Led/Joined/Signed counts, a priority list, and a featured proposal you can heart into your letter. "See everyone" keeps the bar grid; the slide-out panel holds the full story.
- Ward order by default; "Most common ground first" is an optional sort.

## v5.5 changes

- **Bento Blue design system across the whole app:** dark frame, charcoal tiles, blue accent instead of orange, big grotesk headings, mono labels.
- **Style switch** in the header flips between Bento (default) and Original. The choice is remembered in that browser.
- `bento.py` generates the color swap from the original stylesheets (463 rules), scoped so Original is untouched. Map sector and evidence-label colors keep their meaning.

## v5.6 changes

- Simple mode on wide screens (1180px and up) places the guided view to the right of the map; the map stays in view while the guide scrolls. With a record panel open, or on narrower screens, the page stacks as before.

## v5.15 changes (live updates)

Think of v5.15 as giving the app a morning newspaper route. Every night it walks to City Hall's public record, compares what it finds with yesterday, and leaves a short list of what changed on the doorstep.

- **Nightly official-records refresh.** `scripts/refresh.py` pulls Council's Legistar record, the ordinance texts behind the constellation questions, and the ward maps and action histories. Safety checks keep yesterday's data if tonight's looks broken. `.github/workflows/refresh.yml` runs it every morning at 6:17 Eastern, rebuilds, and commits; Vercel deploys the commit (`vercel.json`). Only official records travel this route; news waits for a person's approval.
- **Updated on every screen.** A strip under the phone header and a chip in the desktop header show when the record was pulled, and turn amber if the data is 3 or more days old.
- **What's new.** Changes between two snapshots, in plain English and grouped: passed, paused or stopped, moved forward, new, routine. On Today, as its own panel and desktop page, and as **Latest** on every leader profile and record. First comparison (Sep 25 to Oct 1): 34 new items and 49 status changes.
- **Summaries are checked against their source.** Each hand-written "Why supporters backed it" summary carries a fingerprint of its source; a changed source flags the summary until it is re-read (`python3 build.py --mark-reviewed <files>`). 1031-2026 and 931-2026 were re-read today; 1031-2026 now cites the city's new executive summary.
- **All 17 audit findings fixed.** Error boundaries (one bad record can no longer blank the app), a calendar that knows today's date and an after-the-election mode, a header that fits 320px phones, phones that stay phones when turned sideways, links that open the same room or record on phone and desktop, an instant loading line, a 16px letter box, four replaced links, current sample-ballot copy, desktop contrast and tab fixes (axe: 0 violations), a Windows-safe build with LF line endings, retries with growing pauses, self-hosted fonts on the website, and shims for older Safari.
- **Hover cards, portraits, motion.** Hover a desktop map node to see who or what it is, where, how well it is sourced, and what it points to, with its lines drawing out as arrows. Phone maps show leader portraits; tap once to preview, twice to open. Council and mayor faces replace dots in the constellation. Motion respects the reduced-motion setting.

## v5.14 changes (the phone app)

- **A real phone app inside the same file.** Five tabs (Today, Explore, My place, People, Ballot), a You sheet, search, and the dictionary. It reads the same data and functions as the desktop app, so the information matches: every room and record, the guided steps and proof, Who decides here? and My local context, all 16 profiles with the full story and letters, the constellation for Council, Mayor, Governor, and U.S. House (with "Why supporters backed it"), every race and issue with candidate records, "What might your choices affect?", review and the private worksheet, voter education, My priorities with the real-decision lens, the Decision ledger, and How this is built.
- **Made for one hand.** Tap-through stories for your ward, the council, the mayor, and the ballot; City Hall receipts with plain-English relationship statuses; moments that zoom from you to your ward to the city; a county levy calculator; a guide (Erie, Terry, or Cuy) on the Explore rail.
- **Nothing drifts.** Numbers and text both layouts need live in one place (`cxPlaceData`, `cxLocalCards`, `CX_DOORWAYS`, `CX_DATES`, `CX_WHO_DOES`). The desktop's text is unchanged from v5.13 across the home view and every sidebar view.
- **Rules kept.** No scores or percentages. "Common ground" says "Sponsorship is not a vote." A missing record is never a no. Your place, answers, and priorities stay in the browser; neighbor counts are off.

## v5.13 changes

- New page "Who decides here?": pick a neighborhood to see before-and-after ward maps, 2026 decisions tied to it by lever, liquor permit objections and withdrawals, how fast decisions moved, ward money with amounts from the ordinance text, and what the record shows (and does not show) about votes. Built from `data/geo-2026.json` and `data/place-2026.json` (`scripts/fetch_place.py`).

## v5.12 changes

- After you answer a constellation question, "Why supporters backed it" explains the official reasons in plain English, with links to the ordinance text, the city's Legislative Summary, and the Council record. Built from `data/reasons-2026.json` (`scripts/fetch_reasons.py`).

## v5.11 changes

- The mayor's constellation now has 15 questions (8 added from 2026 administration legislation).

## v5.10 changes

- My constellation adds "Mayor Bibb · proposals his administration sent": 7 yes/no questions from 2026 legislation his administration sent to Council. Tap the mayor to open his profile.

## v5.9 changes

- My constellation adds "Cleveland City Council · proposals they backed": answer 8 real 2026 council proposals yes or no and see all 15 members placed by how often the proposals they sponsored match your answers. Not sponsoring counts as no record, never a no. Tap a member to open their profile.

## v5.8 changes

- In Simple mode's side-by-side layout, a selected record slides out inside the map instead of pushing the guided view above it.

## v5.7 changes (ballot audit)

- Fixed: the ballot's "Record & role" panel opened off-screen; it now slides in from the right.
- Statewide races and Issue 3 say "Statewide"; county items say "Countywide"; issues show plain titles in Review.
- The U.S. House hint points to "Set my districts"; one sidebar highlight at a time.
- A ward chosen in My local context opens My leaders on that member (this visit only).

## Evidence rules the rebuild keeps

- New records carry a public source and a conservative label. Aggregates that are not fully loaded (other Cuyahoga County communities, the arts network, neighborhood networks) are labeled `Record needed` or `Interpretation`.
- Private and nonprofit institutions in the ecosystem room are labeled `Organization source`, not `Official source`.
- The ledger reuses only records already in the app. Individual roll calls stay "Not published on the reviewed page." No money is totaled and no one is scored.
- The architecture page states plainly that agents, polling, the review console, and publishing are designed but not running.
- Record PDFs are verified against `records/manifest.json` SHA-256 values on every build.

## Rebuild from clean

```
npm ci                               # installs pinned prettier 3.9.9, esbuild 0.28.2, and the three font packages
python3 scripts/refresh.py           # optional: refresh every official-record snapshot and log what changed
python3 build.py                     # wipes build/, dist/, and site/, then rebuilds
```

Works the same on Windows, Mac, and Linux (`.gitattributes` keeps LF line endings so hashes match). `build.py` prettifies the compiled app chunk, compiles `ext/*.jsx` into the same module scope, checks summaries against their fingerprints, generates the Bento layer, applies 66 exact-match patches, including the asset-path rewrite and the phone/desktop switch; each must match its expected count or the build stops, bundles to one script, embeds assets, and prints a SHA-256 for every input and the output. Two clean runs produced the identical output hash above.

Note for future patches: inside the main component, single-letter names such as `O`, `L`, and `ie` are state setters, not icons. Patches reference icons through `CXI.*` to avoid that collision.

## Known limits

- Precinct matching, full roll calls, contract terms, and most candidates' records remain unloaded, as in the Sep 23 release. The UI says so where it matters.
- The Sep 24 feature set was rebuilt from its saved markup and styles; behavior was reconstructed, not recovered line for line.
- Accessibility follows the original foundation (keyboard, text view, reduced motion, larger text). No WCAG conformance is claimed; screen-reader and device testing remain open.
