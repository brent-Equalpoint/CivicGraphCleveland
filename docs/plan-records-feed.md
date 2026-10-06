# Plan: one Records feed

Status: proposed, nothing built, written 2026-10-06 for Brent and the team. It sits beside `docs/plan-agenda-calendar.md` (meetings), `docs/plan-permits-property-business.md` (permits, property, business, development), `docs/plan-votes-actions-positions.md` (the record page), and `docs/plan-mobile-restructure.md` (where it lives on a phone).

## Brent's ask

"I do like their organization of how they have things. Ours can be a little clunky but we're working on it." He means urbynai.com's Cleveland records page.

## What makes their page feel organized (read only, 2026-10-06)

Pages read: urbynai.com/cleveland/records, the same with `?view=desktop` and `?section=development`, urbynai.com/cleveland (their dashboard), and urbynai.com/dashboard/map. We used none of their data.

1. **One flat feed, one card.** Permits, legislation, and meetings sit in one list, and every row has the same parts in the same order: a type label (Permit, Legislation, Meeting), the date, a name or number, the place (a ward), a one-line summary, a dollar figure on permits, and "View Details" that opens in place.
2. **Three filters, no more.** Time (Last 7 Days, Last 30 Days, All Time), type (on the dashboard the same three are called Government Activity, Laws & Policy, Development), and ward.
3. **One sort.** Newest first or oldest first.
4. **Counts in one line.** "4,253 Active Records", "4,253 Filtered", "Showing 50 of 4253".
5. **Pages of 50**, numbered (1, 2, up to 86), with "Fetch more records".
6. **Details open in place**, so the list never loses your spot.
7. **The same records three ways:** the list, a dashboard (counts per type, a table per type, a 26 week permit chart), and a map. An "Export Dataset" button (its format is not stated on the page).
8. **On a phone** the table becomes cards with the same fields.

What we should not copy:

- No row says where it came from or when it was pulled; the records page has no update time (the dashboard says "Permits · updated 3× daily").
- Listings show the names of private people (for example a homeowner's fence permit).
- "Spotlight" and "Things to watch" pick records by dollar value ("high-value permits lacking published stories"). That is a ranking.
- News stories sit beside the records.
- A dollar figure as the first thing on a card invites ranking projects by size.

## Our app today, and three clunky parts

A city record can be reached in at least eight places, each with its own list and its own filters: the 17 rooms (records as dots on a topic map, opened in a drawer), What's new, At City Hall (phone only), Who decides here?, My local context and the ward view, the Decision ledger, a person's Votes & actions, and the record page itself (`?panel=leg&file=906-2026`). There is no single list of everything, newest first, no counts in one place, and no download.

Three concrete problems, from the code:

1. **"Ward" means two different things.** On the desktop What's new page, choosing "Ward 7" shows what the Ward 7 member sponsored (`ext/cx-live.jsx`, the ward list is built from the sponsors at line 152). On At City Hall and in the ward view, Ward 7 means the record names Ward 7, its ordinance text gives Ward 7 money, or its address is in Ward 7 (`cxMtgForYou`, `ext/cx-meetings.jsx` line 152). The same word on two screens gives two different lists. The time filters differ too: What's new offers "the last 7 days" or "the last 45 days" (`ext/cx-live.jsx` line 312), At City Hall folds by month, and Votes & actions filters by year.
2. **Three search boxes find three different things.** Jump to finds rooms, pages, and a file by its number, but "words alone never search the 1,393 titles here (Search does)" (`ext/cx-nav.jsx` line 283). The header Search finds titles. At City Hall's Look it up finds titles, file numbers, addresses, and meetings. A resident has to know which box to use.
3. **My pages is a 16 entry menu with look-alike pages** (`CX_PAGE_GROUPS`, `ext/cx-nav.jsx` line 122): "Who decides here?" and "My local context" both under Where I live, "My leaders" and "Profiles" both under People, "Stories" and "What's new" both under Today. To find "what Council did this week near me", a resident must guess between What's new, Who decides here?, My local context, and a room.

## The proposal: Records

One place that lists every dated official record we hold, in one feed, with one card.

### What is in it

| Type | Rows today | One row is | Dated by | Source on the row |
|---|---|---|---|---|
| Legislation | 1,393 | a file (ordinance, resolution, communication) | its latest dated action, which the row names ("Passed Sept. 28") | Legistar file page, pulled date |
| Meeting | 141 | a Council or committee meeting | the meeting date | Legistar meeting page and agenda |
| Roll call | 467 | a vote on passage or adoption, by name | the meeting date | the City Record issue |
| Later: permit, property sale, business, development | see the permits plan | one official record | its own date | its own agency |

A roll call is its own row because it has its own source and date; it links to its file, and the file's row links back. Ceremonial resolutions are one short line, as everywhere else.

### The card (the same parts for every type, in this order)

1. Kind in words ("Legislation", "Meeting", "Roll call"), with the tier's shape.
2. The date, and what happened on it ("Passed Sept. 28, 2026").
3. The headline (the rule-written `cxHeadline`, never cut; the official title one tap away).
4. The number (906-2026, the meeting's body, the City Record page).
5. Place chips: the ward and the neighborhood, each with why ("Names Ward 7", "Address in Ward 7: 4242 Lorain Avenue"), only when the record gives one.
6. Status in words. For a roll call, the count line ("14 Yea, 0 Nay, 1 Absent").
7. Source and pulled date, always, as one short line ("Legistar, pulled Oct. 6").
8. Details opens in place: the shared record (`ext/cx-record.jsx`: what it is, Votes & actions, Positions, where to read it) or the meeting's agenda card. "Open the full record" goes to its page.

No dollar figure leads a card. Where a record has an amount from its own text, it is in the details with its source.

### Filters, sort, counts

- **Time:** Last 7 days, Last 30 days, This year. Days are counted in Eastern time from the row's date.
- **Type:** Legislation, Meetings, Roll calls (later Permits, Property, Business, Development), each with its count.
- **Ward:** 1 to 15, one meaning everywhere: the record names the ward, its text ties money to the ward, or its address is in the ward, with the reason shown. "Sponsored by the ward's member" is a separate, labeled filter ("Member: Ward 7"), so the two are never mixed again. What's new and the ward view change to the same words.
- **Topic (our addition):** Council's record has no policy areas. A topic here is a word match from the priority rules My priorities already uses, and the card shows the word that matched ("Housing: rent"). Labeled as a word match, never a category (decision 3).
- **My ward, on this device:** one switch that uses the ward set on the device. It is never written into the address, storage, or a request.
- **Changed in the latest pull:** from `data/changes-2026.json`, what changed between the last two pulls of the record. "What changed since you last looked" would need the app to remember what you saw, so it is left out.
- **Sort:** Newest first, Oldest first. Never by amount, count, or "importance".
- **Counts:** "2,001 records · 612 shown", and per type. A count of what is listed, never a score.
- **Paging:** 20 cards then "Show 20 more" on a phone (focus moves to the first new card); pages of 50 with page numbers on a computer.
- **Search:** one box, the same index as At City Hall's Look it up (titles, file numbers, addresses, meetings). Jump to hands words it cannot place to Records ("Search all records for 'liquor'").

Filters are not put in the link. A shared link opens Records with no filters, because a ward or a topic in a link can say where a person lives.

### Map view

The same filtered list on the ward map we already draw (`data/geo-2026.json`): a point for each record with a geocoded address (58 today), ward lines and neighborhood names, a number on a cluster. Records that name a ward but have no address are listed beside the map by ward, in words. No shading of wards by count, no "hot" areas, no trend.

### Download

"Download this list (CSV)" writes the filtered list on the device and hands it to the browser (a `Blob` and a `download` link). Columns: kind, date, what happened, number, headline, official title, status, wards, why each ward, neighborhood, source name, source address, pulled at. Every row carries its source and pulled time. Nothing is sent; it works in the offline file.

### What it is not

No dashboard of totals over time, no "Spotlight", no "Things to watch", no news, no photos, no ranking of members, wards, or projects.

## Where it fits

**Desktop.** Row one today is six places and three main tabs (United States, My ballot, Voter education; `CX_MAIN_PAGES`). Records is a fourth main tab, first among them (decision 1). The design rule says row one must show every tab at 1100 px in English and 1280 px in Spanish, so `nav-desktop` measures it; after Election Day, Voter education can move into My pages and free the room. What's new, Who decides here?, and My local context stay in My pages and each gets a "See these in Records" link with its filter set; later, What's new can become Records' "Changed in the latest pull" (decision 4).

**Phone.** See `docs/plan-mobile-restructure.md`. In short: Records is a full page from Today, Explore, and Search first; it may become a tab when the bottom tabs are regrouped.

**What it links to.** The 17 rooms stay (they explain who decides); a room's records open in Records with that room's records shown. A legislation card opens the same record page as today. A meeting card opens At City Hall at that meeting.

## Rules it keeps

- Receipts, not scores. Every row has a source link and a pulled date. No ranking, no sort by value, no "hot".
- Sponsorship is not a vote: a sponsor appears as "Sponsor", and roll calls are separate rows.
- A missing record is not a no: a passed file with no names says why (`no_names`).
- Nothing personal leaves the device: My ward, Topic, the map, and the CSV are made on the device, and filters stay out of links.
- Private people are never targeted: when permits and property arrive, the privacy rules in the permits plan apply to every card and the CSV.
- Plain English, no dashes; both styles, light and dark, phone and desktop, English and Spanish (official titles stay English). Selected filters and tabs are solid blue with white text, never an accent line.

## Word budget

A list screen gets 250 words before anything opens (`docs/plan-plain-text.md`). Records: the header, filters, and counts in 50 words or fewer; 10 cards at about 20 words each on the first phone screen; record it at about 260 in `scripts/checks/text-budget.json` and hold it there.

## Checks to add

- **`records`** (browser): every type's card has the same parts in the same order; every row has a source link and a pulled date; type counts add up to the total; the time filter's edges in Eastern time; the ward filter equals the shared matcher and "Member: Ward N" equals sponsorship; newest and oldest first; no other sort; Show more moves focus; Details opens in place; the CSV is made with no request and its rows equal the list; no filter in the address, storage, a cookie, or a request; no score or ranking word; Spanish; light in both styles.
- `tab-blue` (filter chips and the view switch), `targets`, `axe`, `no-bleed`, `text-overlap`, `text-budget`, `color-vision` (kinds by word and shape), `nav-desktop` (the new main tab fits), `perf-budget` (the feed loads only when Records opens).
- Unit: `scripts/test_records.py` for the feed builder (every row has a kind, a date, a source, and a pulled time; roll call counts equal `data/votes-2026.json`; ward reasons equal the matcher).

## Phases (each ends with the full gate and screenshots)

Each phase can be handed to a build agent as written.

1. **Feed builder (backend agent, about 1 day).** Files: new `scripts/records_feed.py` (a pure function of `data/`), `build.py` (write `site/records/records-2026.json` and a block in the offline file read only when needed; log its hash), new `scripts/test_records.py`. Move the ward matcher (`cxMtgWardsIn`, `CX_MTG_LOOK`) from `ext/cx-meetings.jsx` to `ext/cx-live.jsx` so every screen shares it. Done when: about 2,000 rows, each with a kind, a date, what happened, a source address, and a pulled time; roll call counts equal `data/votes-2026.json`; ward reasons equal the matcher; two builds give the same hash.
2. **Phone page, first slice (frontend agent, about 2 days).** Files: new `ext/cx-records.jsx` (`cxRecFilter`, `cxRecCard`, `CX_Records`), `ext/cxm.css`, `ext/cxm-core.jsx` (`?panel=records` opens it as a full page, like At City Hall), `i18n/manual.json`. Legislation and meetings only; filters for time, type, and ward; newest or oldest; counts; Show 20 more; Details in place through `ext/cx-record.jsx`. Done when: a new `records` browser check passes (same card parts for every type, a source and date on every row, counts add up, no filter in the address, storage, or a request) in dark and light, both styles, and Spanish; `tab-blue`, `targets`, `axe`, `no-bleed`, `text-budget` (recorded at about 260) pass.
3. **Roll calls, Topic, and search (frontend agent, about 1 day).** Done when: roll call rows link to their files and back, Topic shows the matched word, and Jump to hands words to Records.
4. **Desktop main tab (frontend agent, about 2 days).** Files: `ext/cx-records.jsx`, `ext/cx.css`, `ext/cx-nav.jsx` (`CX_MAIN_PAGES`), `build.py`. Done when: `nav-desktop` shows every tab on row one at 1100 px in English and 1280 px in Spanish, and pages of 50 work by keyboard.
5. **Download (frontend agent, about half a day).** Done when: the CSV equals the filtered list, every row has its source and pulled time, and no request is made.
6. **Map view (frontend agent, about 2 days).** Points and ward lines on the existing ward map. Done when: `color-vision` and `axe` pass on the map and no ward is shaded by a count.
7. **Bridges (frontend agent, about 1 day).** What's new, Who decides here?, and rooms link in with their filter; "Member: Ward N" is the only sponsorship filter, and What's new uses the same words.
8. **Later:** permits, property, business, and development rows (the permits plan).

Total about 10 days. **First slice that ships value fastest: phases 1 and 2,** about 3 days, legislation and meetings only.

## Decisions needed

1. Desktop placement: a Records main tab now (recommended), or a button on the rooms row until after the election.
2. Phone placement: see the mobile plan.
3. Topic as a labeled word match: yes or no.
4. Fold What's new into Records' "Changed in the latest pull", or keep both.
5. Roll calls as their own rows (recommended), or only inside the file's row.
6. Map: points and ward lines only, no shading (recommended).
7. CSV column names in the page's language, or always English.
8. A row's date for legislation: its latest dated action (recommended) or the day it was introduced.
