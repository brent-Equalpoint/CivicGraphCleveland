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

## v5.16 changes (stories everywhere, quieter text, not-found page)

- **Shared story engine.** The story builders moved out of the phone file into `ext/cx-story.jsx`, so the phone and the desktop read the same stories from the same records. Every story now names where its facts come from.
- **Desktop Stories page.** A new Stories entry in the sidebar (address `?panel=stories`) opens one story at a time with Back and Next, arrow keys, a screen reader announcement for each step, and "Read this story as text" for the whole story at once.
- **Quieter text.** About 50 small all-caps grey labels across the phone app are now plain sentence-case words in readable ink, and fine print is 14px at full reading contrast. Story copy was rewritten in warmer, shorter words ("Council set aside 2 items this year", "How each member voted isn't public yet").
- **Page not found.** `site/404.html` offers the start, who decides where I live, my ballot, and what Council is doing. A link to a room or record that does not exist now shows a short "We could not find that page" notice on the phone.
- **Start-up message.** If the app has not drawn after 12 seconds, the loading screen says so in plain words and offers Try again.
- **Tab icon, print, offline notice.** The site and the single file now have a small network-mark tab icon (`site/favicon.svg`). Printing a story, a record, or a phone sheet gives plain black text on white with each link's address written out, and no menus or buttons. The hosted site shows "You appear to be offline" if the connection drops; the single file never does, since it is built to work offline. If a visitor is already offline before the first load, the browser's own error page shows, because there is no cached copy yet.
- **Map cards in plain sentences.** The hover card (desktop) and the preview card (phone) now write each connection as a sentence with real names, such as "Stephanie D. Howse-Jones serves on Cleveland City Council.", with no arrows and never the word "this". A fact the map draws to all 15 council members the same way (Residents elect them, the ward map covers them) no longer repeats on each member's card, since it read as that one person's own fact. The Text view says it once for the whole group. The desktop card now waits about a third of a second before it appears and fades in more slowly, so sweeping across the map shows no cards; the lit lines still respond at once, and reduced motion still skips the fade.
- **Easy mode (phone).** A first-time visitor on a phone now starts in Easy mode: one question at a time, 20 px or larger type, buttons at least 56 px tall, full-strength text with no grey fine print, and no motion. Three starter questions (Who represents me, What is on my ballot, What did City Council do this year) each run as short steps with Back and Next, a source line, and Start over and Full app always at the top. "Read it to me" uses the phone's built-in voice, which works offline and sends nothing anywhere; "Save or print this page" uses the print styles. The ward story asks for a neighborhood or ward first (kept in this visit's memory only, as before) and ends with a way into the full profile. The Easy or Full choice is saved on the device only (`cx-easy`). A link to a specific room, record, or panel opens the full app instead. The You sheet has an Easy mode row to switch back. Desktop has no Easy mode yet. Tested in headless Chrome at phone width; not tested with a screen reader or on a real phone.
- **Clearer screen states.** An empty search, dictionary lookup, ledger filter, or local-issue search now says what was looked for and offers one next step (clear the search, show every word, clear the filters, or open the official sample ballot lookup), on both the phone and the desktop ledger and dictionary. A link to a room, record, or panel that does not exist shows "We could not find that page, so here is the start" (or "that record, so here is the room") on the desktop too. If the browser will not save anything (private browsing), the You sheet says that settings start over each time. Copy and share confirmations were already announced to screen readers. The compiled app's own search box and dictionary are unchanged.
- **Formal profiles.** A neutral fact sheet for each of the 15 council members and the Mayor, in the same order every time: header with portrait and "Official source", at a glance (office, area, term, leadership role, official pages), what the office does, this year's record (proposals led, joined, and signed for a department, as counts and lists, never grades), money and decisions tied to the seat, how they voted (stated honestly as not published in Council's database), the ward's neighborhoods with land-area shares, and every source with its pull date. Open it from Profiles in the desktop sidebar (`?panel=profiles`, and `&seat=ward-8` on first load), from "Read the formal profile" on a My leaders card, from the phone People tab, or at the end of the Easy mode ward story. The term and the link to each person's page come from Legistar's office records (`scripts/fetch_people.py`, part of the nightly refresh, which now also checks that 15 members and 1 mayor are present). Committee seats are deliberately not shown: Legistar does not list them, and the page says so and links to Council's website. Phone: a bottom sheet. A council member's profile includes the 2026 ward map with their ward highlighted; its text equivalent is the neighborhood list beside it and the map's spoken description. In the desktop map, selecting a council member or the Mayor shows a "Read the formal profile" button in the record drawer. The Profiles page is also the Council list, in ward order. Not yet: a Spanish version, a reviewed-by-a-person office description, a hover-card shortcut (the card cannot take clicks), and a way to report a mistake.
- **Accessibility pass.** An automated axe-core audit (WCAG 2.2 AA rules plus best practices) was run on about 20 desktop and phone screens in both styles, and what it found was fixed: buttons wrongly marked as list items (story pickers, ledger, pipeline steps) now sit in named groups; heading levels that skipped a step are set with `aria-level` so styling is unchanged; accessible names of map nodes, the ballot evidence buttons, the header brand, the navigation toggle, and the updated strip now contain the words people can see, so voice control works; links inside running text are underlined; low-contrast greys on the ledger and white-on-orange buttons were lifted to at least 4.5:1 (the accent is now #c2410c); Easy mode has proper landmarks; the phone app has a Skip to content link; phone controls are at least 44 px and desktop controls are at least 44 px on touch screens; the app now responds to prefers-contrast, forced-colors (Windows high contrast), and reduced motion. Result: no axe violations on the desktop ledger, news, place, ballot, leaders, profiles, stories, learn, and context screens, or on the phone Easy, ballot, place, and profile screens. Left, and why: 15 or so name-mismatch warnings that are false positives (SVG map and diagram labels whose line breaks join words, and decorative initials on story buttons). **Not tested with a screen reader, switch control, voice control, or on a real phone, so no WCAG conformance is claimed.**
- **Easy mode on desktop.** The header now has an Easy mode button (next to Resident check). It opens the same one-question-at-a-time screens as the phone, in a centered column up to 760 px wide. The choice is remembered on this device; "Full site" returns to the desktop site, and the end-of-journey buttons open the ballot, the formal profile, or What's new in the desktop site. Unlike the phone, desktop visitors are not placed in Easy mode by default, and a link to a specific room, record, or panel always opens the full site.
- **Release safety.** The browser checks and the accessibility audit moved into the repo: `node scripts/checks/run.js` runs 12 checks (stories, map cards, Easy mode on both layouts, screen states, profiles, reviewed records, shell, print, touch targets, and an axe-core audit of 22 screens) against `site/` and exits 1 on any failure. A new Checks workflow runs the unit tests, builds twice and compares hashes, requires the committed `site/` to match the build, and runs the browser checks on every push. The nightly refresh now runs the same checks before it publishes anything, and opens a GitHub issue when it fails so everyone watching the repository is told. `python scripts/release.py` does the whole shipping routine, and `--push` also confirms Vercel and the live hash.
- **Weekly link check.** `scripts/check_links.py` (run by the Monday refresh) checks every source address in the app, the people list, and a rotating 40 Legistar pages. It found that all 16 person-page links on profiles returned HTTP 410 (Cleveland's Legistar no longer serves them); those links were replaced with the People list page. A source link that fails two weekly checks in a row gets a plain notice on the profile.
- **The review gate.** Approvals now count only when made in the "Approve Bench packets" workflow by an account in `bench/reviewers.json` with the publisher role, and are signed with a secret key; a typed or edited decision is refused. A rule-based Skeptic can veto a packet (for example, a file marked Passed whose latest action is Tabled) until a publisher overrides it in writing. Sponsors are matched by Legistar's stable person ID, so the Mayor now resolves and a mismatched ID is quarantined. The exact source records a reviewer approved are kept in `bench/approved/evidence/`. The nightly job rebuilds packets and applies signed approvals.
- **Reviewed records in the app.** Profiles show a Reviewed mark beside any item a named publisher approved, with who checked it, the claims and their limits, the Skeptic's notes, any override, and the sources, and say plainly when nothing on the page has been reviewed. "How this is built" shows live review counts and a Corrections list. Nothing is marked Reviewed yet: no packet has been approved.
- **Mistake reports.** Each profile links to a GitHub form (a free GitHub account is needed, and reports are public). A reviewer records the decision with the "Record a correction" workflow; it is signed, listed publicly without naming the reporter, and refuses notes that look like they hold an email address or phone number.
- **Profile text review.** The office descriptions and leadership roles now sit in one block that `build.py` fingerprints. Profiles say a person has not reviewed them until someone reads them against their sources and runs `python build.py --mark-office-reviewed "Name"`; changing the text clears the mark.
- **Member votes.** The Bench can show a member-by-member roll call when a source is registered in `data/votes-2026.json` (format in `bench/README.md`). Legistar has none, so every roll call is still missing; see `docs/civic-agent/votes-source-research.md`.
- **Stories you can follow by ear and by text, and a way deeper.** A phone story has a Read as text view (every step in order), announces each step to a screen reader, and ends with a Go deeper button (a council member's or the Mayor's profile, What's new, the ballot, or My place). After going deeper a Back to the story chip returns to the same step; on desktop the reader remembers where you were.
- **Easy mode profile.** The end of the Easy mode ward story offers a short profile in five parts (the job, this year's counts, the ward, how they voted, sources) with the full profile one tap away.
- **Desktop blocked-storage notice** and a **Mayor profile with depth**: the city bodies in the app's data, each linked to the source the app holds (several are the general contact page, and the page says so), and the executive order in the record, with a link to the Mayor's own complete list. Also fixed: the profile's "Portrait and role" source line had never shown because it read the wrong field name.
- **Opens with no signal.** The hosted site now installs a small service worker (`site/sw.js`, named for its build). A page load and the `/bench/` data files always try the network first, so an online visitor gets the newest version; the saved copy is used only when the network fails or takes more than 8 seconds. Fonts, portraits, and record PDFs are saved the first time. Each build has its own cache and deletes the older ones. Two checks prove it: the site opens with the server shut down, and after a simulated deploy an online reload shows the new page and discards the old cache. The single-file copy is unchanged.
- **United States graph (preview, desktop).** A new United States entry in the sidebar (`?panel=us`) opens a graph of the 119th Congress, its committees, and the federal agencies, built from `data/us-landscape-2026.json` (`scripts/fetch_us.py`, part of the nightly refresh, with its own safety check: roughly 100 senators, 420 to 445 House members and delegates, 40 or more committees, 100 or more agencies, and a party on every member). It has the four ways in the plan promised: Sky (a canvas of 848 nodes with a fixed, deterministic layout and no physics), Index (a table), Linked (every connection as a sentence with names), and Tree (nested lists). Keyboard: `]` and `[` move between nodes, arrows pan, `+` and `-` zoom, Escape clears, `/` searches. Filters: members, committees, agencies, chamber, and a state to highlight. Party is shown only as a dated, sourced field and is never used to color or group; nothing ranks or scores anyone. The Federal Register list includes agencies abolished decades ago, so only the 260 that published in the last 24 months are kept (213 are counted as left out). The page says its source terms have not been read by a person. It loads its data from the hosted site, so the offline file and the phone app say it is not available there.
- **Your members of Congress.** The United States page opens with a Your members view: pick a state and, if it has more than one, a district, and see your two senators and your representative with their dated party, their term, the committees they serve on, and a link to their official website. The place is kept in memory only and is never put in a link. Easy mode has the same question ("Who represents me in Washington?") as a fourth starting question, in the same one-step-at-a-time shape, and says how they voted is not shown yet. It does not find your district from an address: it links to the House's own lookup. Not built: votes by category, the reviewed policy-area map, and a phone layout for the graph.
- **Not done yet from the plans:** and the rest of the screen-state and accessibility passes (see `docs/plan-*.md`).
- Checked in headless Chrome at phone (390 px) and desktop (1280 px) widths in Bento and Original: no console errors; two clean builds gave the same hash. Not tested with a screen reader or on a real phone.

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

## Roadmap

`docs/ROADMAP.md` is the one page that ties the plans together: where things stand, the order of work, the people and operations still to name, and what "shipped" means.

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
