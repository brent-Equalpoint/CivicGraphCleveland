# Cleveland Civic Graph: State of the Build

**Saved:** October 1, 2026 (updated for v5.16: stories on desktop, quieter text, 404 page)
**Version:** v5.16 (v5.15 plus: shared story engine and a desktop Stories page, sentence-case labels and readable fine print, a page-not-found page, a start-up timeout message, a notice for bad links on the phone, a tab icon, print styles, an offline notice on the hosted site, plainer, slower map cards, Easy mode on the phone, clearer empty, blocked-storage, and bad-link screens, formal profiles for all 15 council members and the Mayor, an accessibility pass, Easy mode on desktop, machine-run release checks, a signed approval gate, and reviewed records on profiles)
**Project:** Project Gotham / Civic Intelligence (an Equalpoint product)
**Owner:** Future (Alysha Ellis Montgomery)

This file freezes the build at a known-good state. Anyone picking this up later, whether a person or an AI assistant, should read it first, confirm the hash below, and change nothing until they have. It is the memory of where we are.

---

## 1. The one file that matters

```
Cleveland-Civic-Graph-v5/Cleveland-Civic-Graph-v5.html
SHA-256  a5e3c6c6ecf2f9715434b9f13365662e830184c6c41dffd79ce096762cf4c9f2
Size     2,863,727 bytes
Data     Council record pulled Oct 1, 2026, 7:45 AM ET (1,353 items in 2026)
```

- One file, two layouts. Phones get the phone app: any screen 760px wide or narrower, and any touch screen whose short side is 500px or less (so turning a phone sideways keeps the phone app). Wider screens get the desktop app. Add `#phone` or `#desktop` to force either one. Room, record, and panel links (`?room=`, `?node=`, `?panel=`) open the same place in both layouts.
- Opens in any modern browser, fully offline. React, the app, styles, 16 official portraits, and both Board of Elections record PDFs are inside the file. Small shims cover browsers older than Safari 15.4 (`Array.at`, `Object.hasOwn`); older Safari has not been device-tested.
- The only outside request is the optional webfonts. Without them, the page uses the system font. The hosted site (below) serves the fonts itself.
- Two clean builds produced the identical hash. If a rebuilt file does not match this hash, something in the inputs, data, or tools changed. A nightly data refresh changes the hash every night; that is expected.

**The hosted site** is the same app split for the web: `build-source/site/` (`index.html` SHA-256 `827a8aff2ae30da82253594a28deda7c435241e8c78e9b654797e8caa2af175a`, 2,226,220 bytes, plus `404.html` SHA-256 `579c339e4cde6bf55a02f2cb2f731381af2feda9f58ffe327a510d23af927301`, plus 16 portraits, 2 record PDFs, and 9 font files). Vercel serves `site/` (see `vercel.json`); the nightly GitHub Action refreshes `data/` and `site/`. On a simulated mid-range phone (4x slower CPU, Fast 3G, compressed) the loading line shows in 0.3 s and the app is usable in 4.6 s (v5.14: blank screen, 6.7 s).

**To confirm the saved state** (Windows PowerShell, in the `Cleveland-Civic-Graph-v5` folder):

```
Get-FileHash .\Cleveland-Civic-Graph-v5.html -Algorithm SHA256
```

**Published copy:** a private Claude artifact, "Cleveland Civic Graph" (https://claude.ai/artifact/Tz9RyPcECL8PEXtcz5uJV8). It is **behind the local file**: since v5.12 the publish check rejects the page (it flags it as an oversized "review page"), so the live copy is version 15, equal to v5.11 plus corrected question wording. The local HTML above is complete. The current artifact build is `dist/Cleveland-Civic-Graph-v5.artifact.html` (SHA-256 `ede0e74b7e528e90eb7111af19379cdaf2c2b34d99c24549befe2b44a80397d5`). The hosted Vercel site replaces the artifact as the public copy. Download and export buttons do nothing in the published copy; they work in the local file.

---

## 2. How we got here, in order

1. **Sep 21 to 23:** The app was built in ChatGPT and hosted at `cleveland-civic-graph.vikaden.chatgpt.site`. The Sep 23 "Agentic Bench" release was exported as a compiled bundle (`Civ_Intel_ag.Arch.04/Cleveland-Civic-Graph-Agentic-Bench-Source.tar.gz`).
2. **Sep 24:** More features were added there ("Cleveland Civic Graph 32"). Only the saved page and its stylesheets survived. The hosted site now refuses access (HTTP 401), so that version's code is gone.
3. **Sep 24, v5:** The Sep 23 compiled app was recovered and made to run offline as one file. The Sep 24 features were rebuilt from the saved page markup and CSS. The Civic Ecosystem map and the agentic architecture were added as views.
4. **Sep 24, v5.1:** Added plain-English Cleveland guides for each priority, the **My leaders** page comparing priorities with council sponsorship records, and letter drafts.
5. **Sep 24, v5.2:** Rewrote My leaders in plain language. Bars and raw counts were replaced with three roles (Led, Joined, Signed for a city department), a one-paragraph summary per member, proposals grouped by what they do (liquor permits, street events, landmarks, public positions, law changes, spending), and a "What this means for you" line for each group. Tightened keyword matching.
6. **Sep 24, v5.3:** Brought back the bars on each council card, now split by role (orange = led, purple = joined, gray = signed for a city department). Selecting a card opens a slide-out panel on the right with the plain-English explanation, the priorities breakdown, the grouped proposals, and the letter draft. Escape or the X closes it and returns focus to the card.
7. **Sep 25, v5.4:** My leaders opens on one profile at a time, dating-app style, in blue bento tiles: big name, portrait, a "Common ground" tile (how many of your priorities show up in what they led or joined), their main focus, Led/Joined/Signed counts, a priority-by-priority list, and one featured proposal with an "Ask about this" heart that adds it to your letter. Arrows, swipe, arrow keys, and a portrait strip move between profiles. Ward order is the default; "Most common ground first" is optional. "See everyone" keeps the bar grid. Display font Schibsted Grotesk, labels IBM Plex Mono.
8. **Sep 25, v5.5:** A whole-app design system called Bento Blue: dark frame, charcoal tiles, blue accent in place of orange, big grotesk headings, mono labels. A "Style" switch in the header flips between Bento (the default) and Original, and the choice is remembered in that browser (`localStorage` key `cx-theme`). The color swap is generated by `bento.py` from the original stylesheets, so Original is never edited. Map sector colors and evidence-label colors keep their meaning in both styles.
9. **Sep 25, v5.6:** In Simple mode on screens 1180px and wider, the guided view sits to the right of the map, and the map stays in view while the guide scrolls. Topic doorways show as one column there. If a record panel is open, the guide is collapsed, or the screen is narrower, the page stacks as before. Applies in both styles.
10. **Sep 25, v5.7 (ballot audit fixes):** The ballot's "Record & role" panel opened off-screen (Tailwind centering used the `translate` property, which the old `transform:none` did not cancel); it now slides in from the right on desktop and phone. Statewide races and Issue 3 now say "Statewide" instead of the county catalogue's "County Wide District"; county items say "Countywide"; "8Th District" capitalization fixed. Review lists issues by plain title. The U.S. House hint now points to "Set my districts." Only one sidebar item is highlighted when a personal page is open. Choosing a ward in My local context now opens My leaders on that member, marked "your ward" (this visit only).
11. **Sep 25, v5.8:** In the Simple side-by-side layout, a selected record slides out inside the map (over its right side) instead of pushing the guided view above the map. Explore mode keeps its drawer beside the map.
12. **Sep 25, v5.9:** City Council joins My constellation. "Compare an office" now includes "Cleveland City Council · proposals they backed": 8 real 2026 member-led proposals (556, 561, 114, 975, 240, 107, 239, 111-2026), each asked as a plain yes/no question. A member who sponsored a proposal is recorded as backing it; a member who did not has no record (never a no). Answers place all 15 members on the constellation by surname; tapping one opens their My leaders profile. Questions and records live in `ext/cx-leaders.jsx` (`CX_COUNCIL_Q`) and are built from `data/legistar-2026.json` at load.
13. **Sep 25, v5.10:** Mayor Bibb joins My constellation. "Compare an office" adds "Mayor Bibb · proposals his administration sent": 7 plain yes/no questions from 2026 legislation his administration sent to Council (557, 683, 605, 1031, 620, 117, 931-2026). A record means the official file lists the mayor's administration as sponsor or says "By Departmental Request." Tapping the mayor opens his My leaders profile. Questions live in `CX_MAYOR_Q` in `ext/cx-leaders.jsx`.
14. **Sep 25, v5.11:** The mayor's view grows from 7 to 15 questions, adding 664, 245, 615, 622, 624, 765, 938, and 31-2026 (Brook Park land deal, parking meter fund, East Side TIF district, permit fee waiver, lead water lines, weapons scanners, violence prevention, summer youth jobs).
15. **Sep 25, v5.12:** "Why supporters backed it." After you answer any constellation question (Yes, No, It depends, or Still learning), a panel shows the official reasons in plain English, with links to the ordinance text, the city's Legislative Summary when one exists, and the Council record. Evidence: `data/reasons-2026.json` from `scripts/fetch_reasons.py` (WHEREAS clauses and summaries for all 23 council and mayor proposals). Summaries are hand-written in `ext/cx-reasons.jsx`; the build fails if a summary cites a document that was not captured. Governor and House questions show the sourced candidate statements instead. Four proposals (1031, 117, 765, 938) give no reasons in the record, and the panel says so. Question wording for 557, 683, 664, and 245 was corrected against the full text (Playhouse Square DORA; Flock renewal amended to six months; Brook Park settlement terms; parking fund purpose).
16. **Sep 25, v5.13: "Who decides here?"** (sidebar, under Civic Intelligence). Pick any of 34 neighborhoods: (1) side-by-side ward maps, 2014-2025 vs 2026, with each ward's share of the neighborhood by land area and the current member; (2) 2026 decisions tied to the place by a geocoded street address in the title or a named place, sorted by lever (liquor permits, tax deals, land, loans and grants, streets, zoning, ward money, events), with who signed first, whether the city or a member wrote it, and emergency status; (3) liquor permit objections and withdrawals in the covering wards; (4) days from introduction to final vote and the committees passed through, with a citywide median; (5) Neighborhood Equity Fund and casino-revenue items with amounts from the ordinance text, counting only money the text ties to that ward and listing council-wide fund rules separately; (6) what the record shows about votes (outcomes and committee recommendations), stating that member-by-member roll calls are not published in Legistar or the 2026 City Record, plus citywide items that were recommended for denial or tabled. Finding: by land area, the Downtown neighborhood is now 43% Ward 7, 38% Ward 8, and 19% Ward 5 (before: 75% Ward 3).
17. **Sep 26, v5.14: the phone app.** The same file now opens as a phone app on small screens. It is not a separate prototype: it lives in the same module, reads the same data (rooms, records, ballot, constellation, priorities, Legistar, ward maps, reasons), and calls the same functions the desktop uses. Five tabs: **Today** (your ward's story, the council, the mayor, the ballot, your neighborhood as tap-through stories; City Hall receipts; "moments" that zoom from you to your ward to the city), **Explore** (scroll to zoom out from your block to Washington, with a guide on the rail; every room with its map, text view, proof, guided steps, dated records, and every record), **My place** (everything in "Who decides here?" plus My local context), **People** (council and mayor profiles with the full story and letters; the constellation for Council, Mayor, Governor, and U.S. House), and **Ballot** (dates, districts, every race and issue, candidate records, what your choices might affect, review and private worksheet, county levy calculator, voter education). The **You** sheet holds My priorities with the real-decision lens, letters, the guide (Erie by default; Terry and Cuy also available), style, larger text, Resident check, the Decision ledger, and How this is built. Shared pieces moved to one place so the two layouts cannot drift: `cxPlaceData`/`cxPlWardMoney` (place numbers), `cxLocalCards` (local context), `CX_DOORWAYS` (topic doorways), `CX_DATES` (election dates) and `CX_WHO_DOES` (voter guide), the last two patched into the compiled desktop guide. Check: desktop text for the home view and every sidebar view (29 captures) is identical to v5.13 (0 lines differ); the phone was walked at 390x844 through every tab, sheet, story, keypad, and the constellation, and a text crawl of 1,888 phone screens was compared line by line with the desktop, with no page errors.

18. **Oct 1, v5.15: live updates and the audit fixes.**
    - **Official records refresh every night.** `scripts/refresh.py` pulls Council's Legistar record, the ordinance texts behind the 23 constellation questions, and the ward maps, action histories, addresses, and ward money; runs safety checks (if the new data has 5% fewer items, lost histories or texts, or the wrong number of wards, the old files stay and the run fails); then `scripts/changes.py` writes what changed to `data/changes-2026.json` (45 days kept). Requests retry with growing pauses (`scripts/net.py`). `.github/workflows/refresh.yml` runs it at 6:17 AM Eastern, rebuilds, and commits `data/` and `site/`, which Vercel deploys. News never enters this pipeline; it needs a person's approval.
    - **Updated time on every screen.** Phone: a strip under the header ("Updated today, 7:45 a.m. · 64 changes this week"), amber with "Newer records may exist" when the data is 3 or more days old. Desktop: an "Updated" chip in the header and the footer stamp.
    - **What's new.** Built only from the difference between two snapshots: passed, paused or stopped (held, tabled, withdrawn, recommended for denial), moved forward (committee or Council action, status change), new proposals, ceremonial and routine (collapsed). Phone: a card on Today (your council member's changes first) and a full panel. Desktop: a "What's new" page in the sidebar with filters by ward or the mayor's administration and 7 or 45 days. Profiles and records get a **Latest** line. First run, Sep 25 to Oct 1: 34 new items, 49 status changes; 33 passed, 26 moved, 3 new proposals, 2 paused or stopped, 24 routine.
    - **Summaries cannot drift silently.** `data/reasons-reviewed.json` stores a fingerprint of the source each hand-written summary was checked against. If a refresh changes the source, the build flags it (log, `dist/review-needed.json`, and a note on the summary in the app). Re-check, then `python3 build.py --mark-reviewed <files>`. Re-checked today: 1031-2026 (the city published an executive summary; its committee withdrew the item Sep 29) and 931-2026 (amended text, same $1,122,824.02; now held). Question explanations now compute their status line from the record instead of saying "when this record was saved."
    - **Audit fixes (all 17).** Error boundaries around every tab, panel, overlay, desktop page, and the whole app (a friendly card with Try again, Go to the start, Reload, and switch layout); election dates mark themselves passed, today, and next in Eastern time, with an after-the-election mode on both layouts and "Today is Election Day" wording; the phone header fits at 320px; turning a phone sideways keeps the phone app and its state; phone reads and writes room, record, and panel links, and Share sends the current screen; an instant loading line replaces the blank screen; the letter box is 16px (no iPhone zoom); four moved links replaced (CMSD CEO, Community Relations Board, FirstEnergy companies, NRC Perry); sample-ballot copy updated (the county now lists a ballot for every precinct); desktop contrast and tab ARIA fixed (axe: 0 violations on 11 phone and desktop screens); the build runs on Windows (`.cmd` tools, UTF-8, LF line endings, `.gitattributes`); fetch retries back off; the hosted site serves its own fonts (no request goes to Google); shims for older Safari.
    - **Map hover cards and portraits.** Desktop: hover or focus a node to see its name, category, kind, place, evidence label, portrait, and what it points to; its lines light up and draw out as arrows, and unrelated nodes dim. Phone room maps show leader portraits; the first tap previews a node (lit arrows plus a card with its connections), the second tap opens the record. Council and mayor portraits replace dots in the constellation on both layouts; candidates keep initials (no official portraits loaded).
    - **Motion.** Arrows draw from the acting node to what it acts on, cards and pages rise in, constellation faces settle in place, buttons give a small press response, and the Updated dot pings once. Everything turns off with the device's reduced-motion setting.
    - Check: two clean builds, identical hashes; phone regressions (m4, m5, m6, m10, m11: 66 screens plus export and worksheet, 0 errors); desktop text compared with v5.14 on 30 views, differing only where intended (Updated chip, footer, What's new, refreshed data, Latest); stress run 45 s, 0 errors, 13 MB heap; time-travel runs for Oct 4, Oct 5, Oct 6, Nov 2, Nov 3, Nov 4, Nov 5, and Jan 15; storage blocked; 7 malformed links on both layouts; links: 183 of 197 sampled return 200, and the other 14 are the data API address (not a link), sites that block automated checks, and the Ohio Legislature site, which returned errors during the check.

---

## 3. What is in the app right now

**Rooms in the civic chamber (left sidebar, top list):** Your government, Cities & municipalities*, Local decisions*, Voting & elections, Mayor & services, Council & wards, Courts & justice, Energy & utilities, Schools & education, Housing & land, Public safety, Budget & contracts, Transit & streets, Health & environment, County/state & federal, History & change, Civic ecosystem*.

**Personal tools (left sidebar, bottom):** My priorities, My constellation, My leaders*, My ballot, Voter education, My local context*.

**Civic Intelligence tools:** What's new (v5.15), Decision ledger*, How this is built*, Who decides here?.

**Header:** Updated chip (v5.15), Style switch (Bento / Original)*, Search, Dictionary (80 plain-language terms with categories*), Resident check*, Share view.

**In every room:** Simple / Explore / Audit modes, Map / Text views, record drawer (Overview, Votes & actions, Positions, Sources), 4-step guided view* (Start, Meaning, Power, Proof), inline dictionary terms*, "Connections, in words" in Text view*, research-preview card in Audit*, Larger text option*.

*\* = rebuilt or added in v5 / v5.1. Everything else is the original Sep 23 compiled app, unchanged in behavior.*

**Phone app (v5.14, phones and screens 760px and narrower, or `#phone`):** bottom tabs Today, Explore, My place, People, Ballot; top bar Search, Dictionary (Aa), You; the Updated strip under it opens What's new. Everything opens in bottom sheets. "Desktop view" in the You sheet (or `#desktop`) switches back. Relationship statuses on receipts are plain-English labels for the record's status: Committed = passed, Talking stage = still in review, Left on read = tabled, On pause = held.

### Data inside it

| Data | Source | As of |
| --- | --- | --- |
| Officials, wards, departments, courts, legislation records, energy and education maps | Sep 23 compiled release | Reviewed Sep 22, 2026 |
| Practice ballot: 48 contests, 105 issues, candidate list | Cuyahoga County Board of Elections PDFs (hash-checked) | Candidates Sep 17; issues for Nov 3, 2026 |
| Civic ecosystem: 22 institutions | Ecosystem Architecture v1 prototype | Sep 24, 2026 |
| Cities & municipalities: Bratenahl, East Cleveland, NEORSD, NOACA, County Land Bank | Official sites, checked Sep 24 | Sep 24, 2026 |
| Priority guides: 8 priorities, 3 to 4 Cleveland facts each | City, county, NEORSD, Ideastream, Signal Cleveland, Axios, Court News Ohio, and others (linked in the app) | Checked Sep 24, 2026 |
| Council sponsorships and statuses: 1,353 items introduced in 2026 | Cleveland Legistar Web API | Pulled Oct 1, 2026, 11:45 UTC (nightly from here on) |
| Action histories (510 proposals), 57 geocoded title addresses, 42 ward-money items, ward maps | Legistar, Census geocoder, City of Cleveland open data | Pulled Oct 1, 2026 |
| What's new: changes between snapshots | `data/changes-2026.json` from `scripts/changes.py` | First comparison Sep 25 to Oct 1, 2026 |

---

## 4. Rules this build keeps (do not break these)

- **Receipts, not scores.** No ideology scores, no match percentages, no rankings of officials. Members are listed by ward.
- **Sponsorship is not a vote.** Cleveland's Legistar database records that Council approved a measure, not each member's vote. Votes are not shown until they are pulled from the City Record minutes.
- **Labels stay honest.** Official source, Recorded action, Organization source, Interpretation, and Record needed mean different things. Private and nonprofit groups are never labeled "Official."
- **Missing stays missing.** Gaps are shown, never filled with plausible text.
- **Nothing personal leaves the browser.** Priorities, ballot choices, and local context stay on the device. Letters are drafted for the resident to send themselves.
- **The architecture page says what is true:** agents, source polling, the review console, and publishing are designed but not running.
- **Writing style:** plain English, no em dashes, no left accent stripes on cards or alerts (use dots and tinted backgrounds).
- **Both styles stay working.** Bento rules are scoped to `html[data-cx-theme="bento"]`; nothing edits the Original look. Semantic colors (teal official, purple recorded, yellow interpretation, red/coral council and errors) are never remapped.
- **Council backing is sponsorship.** In the constellation, a council member's record means they sponsored the proposal. Not sponsoring is missing, never a no. Replace with roll-call votes once the City Record minutes are loaded. The mayor's record means his administration sent the proposal; his public statements are not loaded.
- **Reasons are the sponsors' case.** "Why supporters backed it" restates the official record in plain English and says so on screen. Every line must trace to `data/reasons-2026.json`; if the record gives no reasons, say that.
- **Place pages show records, not verdicts.** "Who decides here?" ties decisions to a neighborhood only by a geocoded title address or a place named in the title, labels shares as land area, counts ward money only when the text ties it to that ward, and states that member-by-member votes are not published.
- **Common ground, not match.** Profiles default to ward order. The optional "Most common ground first" sort is labeled as a sort, never as a recommendation.
- **One app, two layouts.** The phone app reads the same data and helper functions as the desktop. When both need the same text or numbers, it lives in one place (`CX_DATES`, `CX_WHO_DOES`, `CX_DOORWAYS`, `cxPlaceData`, `cxLocalCards`). A change to the desktop must not change the desktop's text unless intended; compare against the last release before shipping.
- **Two lanes for updates.** Official records update automatically, and only after the safety checks pass. News, statements, and anything interpretive never publish without a person's approval.
- **What's new states facts, not motives.** Each line is a change between two snapshots of the official record (introduced, status, committee action, sponsor added). Plain-English labels are ours; the official status is on the record.
- **A summary is checked against its source.** If the source changes, the summary is flagged until someone re-reads it and runs `--mark-reviewed`.
- **The phone's warm voice keeps the rules.** "Common ground" means you said yes and they sponsored or sent the proposal; it says "Sponsorship is not a vote" on screen. No percentages. Neighbor counts stay off: nothing about your answers leaves the browser.

---

## 5. Where the files live

**Working copy (from Oct 1, 2026):** `C:\Users\Jesia\Documents\Civic Graph` on the local disk, outside OneDrive. It is the `build-source/` folder below, plus `CLAUDE.md`, `README.md`, this file, the nightly workflow already in `.github/workflows/refresh.yml`, and the offline app in `dist/` (Git ignores `dist/`; `python build.py` regenerates it). This is the folder to open in VS Code. Its GitHub home is `https://github.com/brent-Equalpoint/CivicGraphCleveland` (public, empty until the first push on Oct 1, 2026). The OneDrive folder below stays as the v5.15 snapshot.

```
Civic Intelligence/
  Cleveland-Civic-Graph-v5/
    Cleveland-Civic-Graph-v5.html     <- the app (open this)
    STATE-OF-BUILD.md                 <- this file
    README.md                         <- what changed and why
    BUILD-LOG.txt                     <- hashes of every input and output from the last clean build
    build-source/                     <- this folder is the GitHub repository
      build.py                        <- the one build script (python3 build.py; --mark-reviewed <files>)
      vercel.json                     <- Vercel serves site/, no install or build step, cache and security headers
      .github/workflows/refresh.yml   <- nightly records refresh, rebuild, commit (Vercel deploys the commit).
                                         On this computer it is saved as setup/github-workflow-refresh.yml, because
                                         the file tools cannot write inside .github. Move it before the first push.
      .gitattributes, .gitignore      <- LF line endings everywhere; build/, dist/, node_modules/ stay out of Git
      site/                           <- generated: the hosted app (index.html, portraits/, records/, fonts/)
      bento.py                        <- generates the Bento Blue color layer from the original CSS
      package.json, package-lock.json <- pinned tools: prettier 3.9.9, esbuild 0.28.2, @fontsource 5.3.0 (Inter, Schibsted Grotesk, IBM Plex Mono)
      inputs/
        Cleveland-Civic-Graph-Agentic-Bench-Source.tar.gz   (compiled Sep 23 app)
        index.BXQ1IHcf.css, CivicAtlas.BP15NF1x.css         (saved Sep 24 styles)
      ext/
        cx-data.jsx      rooms, dictionary terms, ledger, architecture content
        cx-ui.jsx        guided view, resident check, local context, ledger, bench, dictionary
        cx-leaders.jsx   priority guides, My leaders, letter drafts, keyword rules
        cx.css           styles for everything added
        cx-reasons.jsx   plain-English reasons behind each council and mayor proposal, with sources
        cx-place.jsx     "Who decides here?": ward maps, decisions by lever, liquor permits, speed, ward money, votes
        cx-live.jsx      v5.15 shared live layer: Updated time, What's new rows, date-aware calendar, error boundary, desktop hover card, portrait faces
        cx-bento.css     Bento Blue type, shape, and blue accents (hand-set)
        cxm-core.jsx     phone app: desktop/phone switch, shell, sheets, shared building blocks, CX_DATES, CX_WHO_DOES
        cxm-today.jsx    phone Today: stories, receipts, moments, common-ground reveal
        cxm-explore.jsx  phone Explore: zoom levels, guide rail, rooms, room maps, records, resident check
        cxm-place.jsx    phone My place: Who decides here? and local context
        cxm-people.jsx   phone People: profiles, full story, letters, constellation
        cxm-ballot.jsx   phone Ballot: districts, races, issues, candidate records, outcomes, review, levy keypad
        cxm-more.jsx     phone sheets: legislation, search, dictionary, You, priorities, decision lens, ledger, bench
        cxm-live.jsx     phone Updated strip, What's new card and panel, Latest, date-aware ballot dates
        cxm.css          phone styles (scoped to .cxm, outside the Bento remap)
      scripts/
        refresh.py          the nightly job: runs the three fetches, safety checks, then changes.py (--check to test data/)
        changes.py          diffs two snapshots into data/changes-2026.json for What's new
        net.py              shared HTTP with retries and growing pauses
        fetch_legistar.py   refreshes the council legislation snapshot
        fetch_reasons.py    captures the official reasons (WHEREAS clauses, legislative summaries)
        fetch_place.py      captures ward maps, neighborhood boundaries, action histories, title addresses (geocoded), ward-money amounts
      data/
        legistar-2026.json  the snapshot the build uses (never fetched live during a build)
        reasons-2026.json   official reasons for the 23 constellation proposals
        geo-2026.json       2014 and 2026 ward maps + neighborhood boundaries (City of Cleveland open data) with overlap shares
        place-2026.json     action histories for 510 proposals, 57 geocoded title addresses, 42 ward-money items
        changes-2026.json   what changed at each nightly check (45 days kept)
        reasons-reviewed.json  fingerprint and date each hand-written summary was checked against
```

The original folders (`Civ_Intel_ag.Arch.04`, `Cleveland Civic Graph 32_files`, the older HTML files, `references`) were not changed.

### Input fingerprints from the last clean build

| File | SHA-256 |
| --- | --- |
| Cleveland-Civic-Graph-Agentic-Bench-Source.tar.gz | `cd04be3394a3d4e15a099f680b9093ca755cbd948993182e3a1cd1fbc28cd00d` |
| index.BXQ1IHcf.css | `137d4dd18922479dec9b6c56d2e0b8dc405aad21c5d81bc052805ef094a68b29` |
| CivicAtlas.BP15NF1x.css | `245565124b372ba6f744ee23658dc2526eec7555341c04f8e7ab12614e7cdcae` |
| ext/cx-bento.css | `2dda54e6f1c0049644e562e2191f0959c6903074c0ac60636d2bf27df0031893` |
| ext/cx-data.jsx | `fc50fa60e14ef0d303158a6bbc86840bd144c359bf0abc5385fa7095494f38a5` |
| ext/cx-leaders.jsx | `8305a8ef910c9408b69898b47f10e56d7702311455a89ca68694fb99e3c3270e` |
| ext/cx-live.jsx | `62978aa9d57d813b091e67ec9dd1454ce428e73f1ad8dd22f1c2c705ba0224be` |
| ext/cx-place.jsx | `e2294b9071fddf549cbe190b2e7b5965cbe20fa2628db2f3bd4b0fd50183a145` |
| ext/cx-reasons.jsx | `29c3809a79f530e5c64a3e58ce73fa4797d3baebc43b0ffbdabee17ba64a8d85` |
| ext/cx-ui.jsx | `79461f8c0aad2abc6a4ecf1076b04643d5d4c544fe248dd8ce8fe98ca9774fb9` |
| ext/cx.css | `718ec501632ad57f2a38846de7a17e92fd15570ac02fd82dbc8026ac77a436f9` |
| ext/cxm-ballot.jsx | `0ecca052990f33bda5e141b28c472555ba15da873db53f5f3f33ada6e0ecfd3c` |
| ext/cxm-core.jsx | `2c18f520fe8359a2c2b9df2d3bc92584d389e4141ada02b860ada31234e02a70` |
| ext/cxm-explore.jsx | `406ccfc104361a1ed0f313ba9363724ac4b2905c6720c8273babde1f9c9c1dc4` |
| ext/cxm-live.jsx | `242e1405b95ad181bfc77fe1fe49c48c996b7e6bc0e78e94964feb9a31f43da3` |
| ext/cxm-more.jsx | `9a9721a1e15cf67c1532b61b93741bc3948e2fa7c4c42dc39439df55e084b69d` |
| ext/cxm-people.jsx | `3c95dae392b854acb5ab372f9e0cee35efed3aacf91089553efdcf389472b2a0` |
| ext/cxm-place.jsx | `7e0551907f5b7c01579f401e46762c8ec4d3e09d54ac5c6a4d76641ea26da81a` |
| ext/cxm-today.jsx | `3c468df5cd1112200a166488b6ab159745ae527da7cfffaef0477f5c0b3e8158` |
| ext/cxm.css | `537e1ee980d1c5f94cd3e7dda2efd1cf6e5a6e2ff825540d442daaccfbddc0a6` |
| data/legistar-2026.json | `5493aa215c78efd29b34881964680f584a19044be45fbf18096428eb12427a6d` |
| data/reasons-2026.json | `da5e6307d54114c89c41cfde54c736f772cd397127a08db842c3bd095b2ab3ae` |
| data/changes-2026.json | `a0c81d6fd91629183ab092ee862c9397bf9353e6bc593a3b973b790eaa80456b` |
| data/geo-2026.json | `235ddc0773928c8e4c62f93eba92a85d34ab63b39f664c10e754840ea1ef3eff` |
| data/place-2026.json | `62cf4585e159433eee5b15769f81240ed90406f20da942762ff75582e26887ac` |

--- | --- |
| Cleveland-Civic-Graph-Agentic-Bench-Source.tar.gz | `cd04be3394a3d4e15a099f680b9093ca755cbd948993182e3a1cd1fbc28cd00d` |
| index.BXQ1IHcf.css | `137d4dd18922479dec9b6c56d2e0b8dc405aad21c5d81bc052805ef094a68b29` |
| CivicAtlas.BP15NF1x.css | `245565124b372ba6f744ee23658dc2526eec7555341c04f8e7ab12614e7cdcae` |
| ext/cx-bento.css | `2dda54e6f1c0049644e562e2191f0959c6903074c0ac60636d2bf27df0031893` |
| ext/cx-data.jsx | `5b97cf8ebe3e78626502fa4d7c5a9c476f1fcbba55b4f1479b7a732f6ae1199c` |
| ext/cx-leaders.jsx | `015b8057bbfbbc0f90eac935a2dffaf4b52fa8c6fbfd2e7a9f1b7f0cdf18473d` |
| ext/cx-place.jsx | `e2294b9071fddf549cbe190b2e7b5965cbe20fa2628db2f3bd4b0fd50183a145` |
| ext/cx-reasons.jsx | `b220fa7f138c5215eefa00efa980141ae7794faa6ab4d6c970c4351ef3e7f499` |
| ext/cx-ui.jsx | `79461f8c0aad2abc6a4ecf1076b04643d5d4c544fe248dd8ce8fe98ca9774fb9` |
| ext/cx.css | `1e912b8b3aa820429f75ec8e09b7b54e6107a7067a410f8dd8d620442dd4e264` |
| ext/cxm-ballot.jsx | `2fcbd841051a66317f045f75ace08ff736929e37d8902f0159dd71fce334d605` |
| ext/cxm-core.jsx | `e650c1108fe62402fcddd2ee43badf6363745a3d077a2df1a860231b9dc1b345` |
| ext/cxm-explore.jsx | `ca4c4e0004f77c440eee1fa81f22f661e344060ca341164787a06b59b571499c` |
| ext/cxm-more.jsx | `2c530cfca53e22aef6c493bc7b2b71c21442cf9cedf1b2835dde0524ce364bd4` |
| ext/cxm-people.jsx | `288bbc6f5df15754bbb8ae64fc4d359df7a9b2bfee709e0c0e5bda520854605c` |
| ext/cxm-place.jsx | `7e0551907f5b7c01579f401e46762c8ec4d3e09d54ac5c6a4d76641ea26da81a` |
| ext/cxm-today.jsx | `88fa56b0f1160acbe8956037542ad246d2251e28c2ab0b62e665ec33fea2924d` |
| ext/cxm.css | `b59bc2de4c31a9000861f4453a0b4ed2e5bf7759e4893c090c57a029fe617105` |
| data/geo-2026.json | `d69040471de9e58d0f5f629954f383d26cb1702de8f4222b790db53e913b27da` |
| data/place-2026.json | `2c260db669d8be994647a3acda21614f9dac7974bb89ed17257af85d3f415523` |
| data/reasons-2026.json | `1218186ffe8b8dfd4923c30857acf814c6b8331cf690984f6fda6798b6ccfa5c` |
| data/legistar-2026.json | `4d2c7c84984badadb179e5a56d687e8497cff73361b1daaec764ec7d4c2b1a4f` |

---

## 6. How to rebuild or change it safely

Think of the build like a recipe card. The compiled Sep 23 app is the base ingredient, which we never edit by hand. The `ext/` files are our additions. `build.py` is the recipe that combines them the same way every time.

**Step 1. Set up (once).** Install Node.js and Python 3. In `build-source/`, run:
```
npm ci
```

**Step 2. Rebuild from clean.**
```
python3 build.py
```
This wipes `build/`, `dist/`, and `site/`, prettifies the compiled app, compiles `ext/*.jsx` into it, checks every summary against its fingerprint, embeds the change log, generates the Bento layer, applies 66 exact-match patches (v5.15 adds the date-aware calendar, map hover cards and drawn arrows, constellation faces, the post-election heading, link and copy fixes, and the tab ARIA fix; the election dates and "Who does what?" are checked word for word against the compiled guide), bundles everything into one script, and writes `dist/Cleveland-Civic-Graph-v5.html` (offline, everything inside), the artifact variant, `site/` (hosted), and `dist/build-log.txt`. With unchanged inputs, the output hash must equal `ed151434...104f`.

**Step 3. Make a change.** Edit files in `ext/` (or add a patch in `build.py`), rebuild, open the file, and check the page. Every patch must match its expected count or the build stops with `PATCH FAILED`, which is the signal that something shifted.

**Step 4. Refresh the official records.** The GitHub Action does this every night. By hand (needs `pip install shapely`, `pdftotext`, and LibreOffice's `soffice`):
```
python3 scripts/refresh.py
python3 build.py
```
The output hash changes because the data changed. If the build log says `REVIEW NEEDED`, read those summaries in `ext/cx-reasons.jsx` against `data/reasons-2026.json`, fix them if needed, then run `python3 build.py --mark-reviewed 931-2026` (with the file numbers you checked).

**Step 5. Record the new state.** Update section 1 of this file with the new hash, date, and a one-line note of what changed. Copy `dist/build-log.txt` to `BUILD-LOG.txt`.

### Gotchas that already cost us time

- Inside the main app component, short names like `O`, `L`, and `ie` are **state setters, not icons**. Using one as an icon causes an endless refresh loop. Always use icons through `CXI.*` (for example `CXI.File`).
- In JSX, tag names starting with a lowercase letter become plain HTML. The dialog parts are aliased as `CXD.Root`, `CXD.Content`, and so on for that reason.
- The build rewrites exactly 18 `/portraits/` and `/records/` paths. New code must not write those paths as a single literal string, or the count check fails.
- To change the Bento look, edit `ext/cx-bento.css` for shape and accents, or the hue rules in `bento.py` for the color swap. Never edit the input stylesheets.
- A web font link must not block page load (it uses `media="print" onload`), or the offline file hangs without internet.
- New phone code uses the `Cxm`, `cxm`, and `CXM_` prefixes so it never collides with the compiled app's short names. The app's default export is `CX_Root`, which picks `CxmApp` (phone) or `Qh` (desktop).
- Phone CSS resets use `:where()` (for example `.cxm :where(button)`), so any class rule beats them. A plain `.cxm button` reset silently wiped padding and backgrounds on every button card.
- The old scroll offset trap: in Explore, measure level positions with `offsetTop` against `.cxm-main` (it is `position: relative`).
- Prettier 3 skips any file listed in `.gitignore`, even when named directly, and returns it unchanged. `build/` is ignored, so the build feeds Prettier through stdin. If "prettified CivicAtlas" ever reports under 20,000 lines, that is what happened.
- The HTML page in `build.py` is a Python f-string: CSS braces in it must be doubled (`{{ }}`).
- Functions called at load time from `cx-leaders.jsx` (like `cxStatusSentence`) can live in later files only because they are function declarations, which are hoisted. A `const` there would fail.
- A news item must never be written into `data/` by a script. Only official records go through `refresh.py`.

---

## 7. What is not done yet (next steps, in suggested order)

1. **Go live.** Open `Documents\Civic Graph` in VS Code (the workflow is already in `.github/workflows/`; `setup/` holds a spare copy you can delete). Push it to `brent-Equalpoint/CivicGraphCleveland`, connect it to Vercel (Framework "Other"; `vercel.json` sets everything else), add the Equalpoint domain you choose for it, then run the Action once by hand (Actions, "Nightly records refresh", Run workflow) and confirm a commit and a deploy. GitHub pauses scheduled workflows after 60 days without repository activity; the nightly commits count as activity.
2. **Phone testing on real devices.** Checked in phone-size Chromium only. Try an iPhone and an Android phone (Safari and Chrome), including turning sideways, the keypad, swipes, sheets, and the map previews.
3. **Pending choices:** which guide leads (Erie is the default), and whether to ever show anonymous neighbor counts (off).
4. **News lane.** The review queue for news (fixed outlet list, human approval) is designed in the "Anonymous Insights" and live-updates notes; it is not built. Nothing in v5.15 publishes news.
5. **Legal review before public launch:** the Governor and U.S. House candidate views and the data policy, under Equalpoint. 501(c)(3) rules come into play only if Futureland takes part (funds, hosts, or promotes it).
6. **Council roll-call votes** from the City Record minutes for key decisions, shown separately from sponsorships.
7. **Local review of new facts**, **tighter topic matching**, an optional **leader questionnaire**, **Spanish**, and **screen-reader testing** (NVDA, VoiceOver, TalkBack) remain as before.
8. **The agentic system itself** (source registry, evidence store, review console, publisher) remains a design, except for the nightly official-records refresh, which now runs.

---

## 8. Quick prompt for picking this up later

> Read `Civic Intelligence/Cleveland-Civic-Graph-v5/STATE-OF-BUILD.md` first. Confirm the HTML hash matches section 1 (or, after nightly refreshes, that `build-source/BUILD-LOG` inputs match). Work only in `build-source/ext/`, `build.py`, and `scripts/`, rebuild from clean with `python3 build.py`, and follow the rules in section 4. Then update section 1 with the new hash.
