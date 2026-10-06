# Plan: votes, actions, and positions on every record, for the city, wards, county, and courts

Status: phases 1 to 3 built on Oct 6, 2026 (on a branch, not released); see the Status section at the end. Written 2026-10-06 for Brent and the team. It builds on what the city record already does (the "Votes & actions" timeline on a legislation record, the City Record roll calls) and extends the same idea to the county and the courts, with the same rules. It sits beside `docs/plan-profiles.md` (people pages), `docs/plan-city-hall-page.md` (meetings) and `docs/plan-explain-committees-and-seats.md` (what bodies and roles are).

## The goal in one paragraph

For any record a resident opens (a city ordinance, a county resolution, a court opinion), the page says in plain order what was done to it and by whom: introduced, sent to committee, voted on, signed or vetoed, ruled on. Each person or body that acted has a link to their own page, and each action links to its official source and its date. Where a person or body has stated a position on the record, that is shown separately, with who said it, when, and a link. Nothing is scored, ranked, or summed into a grade, and a missing record is never shown as a "no".

## What exists today (measured Oct 6, 2026)

- **City legislation:** 1,393 matters in `data/legistar-2026.json` (Ceremonial Resolution 465, Emergency Ordinance 411, Communication 240, Item 168, Emergency Resolution 101, Ordinance 8). By status: Passed 451, Filed 446, Agenda Ready 438, Administrative Review 20, In Committee 18, other 20.
- **City votes:** `data/votes-2026.json` has member-by-member Yea, Nay or Absent for 434 files, read from 39 City Record issues. A vote to suspend the rules prints only a tally and is not stored. Of the 451 passed matters, 417 have names and 34 do not (27 emergency ordinances, 3 ordinances, 3 emergency resolutions, 1 communication); 17 files with names are not marked Passed. The page already says "A missing record is not a no."
- **City people:** `data/people-2026.json` holds 16 office records (15 Council members and the Mayor). Wards come from each member's seat.
- **Meetings and agenda items:** `data/meetings-2026.json`, 141 meetings, 1,838 agenda items with outcomes (the At City Hall page).
- **Positions:** only "Why supporters backed it", 23 summaries in `data/reasons-2026.json` with a person-reviewed list. There is no general place for what a person said about a record.
- **County:** nothing on county legislation or votes. The county's Council posts minutes and legislation on its own site (the Issue 12 to 14 stories read the Aug. 4 and Sept. 1 minutes by hand, with roll calls listed by name).
- **Courts:** federal judges only (the Federal Judicial Center list on the United States map). No Cleveland or Cuyahoga court records, and no rulings anywhere.

## What "Votes & actions" and "positions" mean here

- **Action:** something an office or body did to a record, from an official source: introduced, referred to a committee, committee vote, amended, held, passed, adopted, signed, vetoed, filed, withdrawn; for a court, filed, argued, decided, affirmed or reversed.
- **Vote:** a member's Yea, Nay, Abstain, Absent or Not voting on one question, in the source's own words.
- **Position:** what a person or body says about a record, as opposed to what they did. Two kinds, always shown apart:
  1. **Official positions** that are part of the record: a sponsor's name, the whereas clauses and stated purpose in the legislation's own text, a committee report, a mayor's signature statement, a court's written opinion and any dissent.
  2. **Stated positions** from outside the record: a quoted statement, a letter, a testimony, an editorial. These are interpretive. They enter only through a person, with a dated source link, the way the levy and issue stories work, and are marked until reviewed.

## Rules that never change

- Receipts, not scores. No ranking of members, no "voting record" percentage, no "most active", no "agrees with".
- Sponsorship is not a vote. Not voting, absent and abstain are not a no. A missing record is not a no.
- Official records update by themselves. News and any quoted statement wait for a person. Never automate news into `data/`.
- Private people are never targeted. Court records are limited to published opinions and orders of the court itself and the court's public calendar; no case dockets of private parties, no names of people who are not public officials or parties to a published opinion.
- Every action and position shows its source, its date, and when it was pulled.
- Plain English, no dashes, both styles and layouts, light and dark, English and Spanish (official titles stay English).
- Nothing about the viewer leaves the browser.

## One shape for every record

A record page has the same four parts, whichever body it came from:

1. **What it is.** The title in plain words and its number, with the body and date.
2. **Votes & actions.** A dated list, oldest first. Each row: the date, what happened, who acted (linked), and the source. A vote row opens to every member's recorded position with the record's own word, and a count line ("14 Yea, 0 Nay, 1 Absent"). If the source has no names, the row says so in one sentence.
3. **Positions.** Two folds: "In the record" (sponsors, the legislation's own stated purpose, committee reports, opinions) and "Stated outside the record" (hidden when empty; each entry has who, when, a short quote or paraphrase marked as such, and the link).
4. **Where to read it.** The official page and, where there is one, the video or minutes.

A person's page (Councilmember, County Councilmember, County Executive, Mayor, judge) gets a "Votes & actions" list of their own, by date, filterable by policy area, with counts per area and no overall number. A ward page gets the ward's member's list plus records that name the ward.

## What each body needs

### City (Council, committees, Mayor)
- Close the gaps in names: for the passed files that have no member-by-member vote today, find whether Legistar's own vote detail has it (probe the API for roll calls per item; record what it returns) and whether committee votes are available. Where a source has names, ingest them through `scripts/refresh.py`; where none exists, the page says so.
- Committee actions: referred to, heard, reported out, from the meetings data.
- Mayor: signed, vetoed, with dates where the record has them.
- Ceremonial resolutions (465) get a short row, not a full page, to keep the record readable.

### Wards
- A ward is a place, not a body. The ward view lists: what the ward's Council member sponsored and voted on, and city records that name the ward (the same "names Ward N" matching the City Hall page uses, with the matching word shown). Nothing is inferred about a resident's own ward beyond what they choose on the device.

### County (Cuyahoga County Council and County Executive)
- Source: the County Council's own legislation and minutes pages. Probe what is machine-readable (legislation list, status, minutes PDFs with roll calls by name). Register the sources in `scripts/us_sources.py` style with terms status. Ingest through a new fetcher run by `refresh.py`, with the same rule as the City Record: a vote that does not add up is held back, never fixed by hand.
- The Executive's actions: signed, vetoed, appointments the Council confirmed.
- The Issue 12 to 14 stories already read this by hand; this makes it systematic so a resident can open any county item.

### Courts
- Scope to decide (see below). Recommended first: the published opinions of the Eighth District Court of Appeals (Cuyahoga County) and the Ohio Supreme Court, plus the federal Northern District of Ohio and Sixth Circuit published opinions, from official court sources; each opinion shows the panel, who wrote it, the disposition, any dissent, and a link. A judge's page lists opinions they wrote or joined by date.
- Local trial courts (Common Pleas, Municipal, Housing) are mostly individual case dockets with private parties. Leave them out by default; show only the court's own published administrative orders and public calendars if a source allows it.
- A court "position" is its written reasoning; we link to it and give one plain sentence of what was decided, written between markers and flagged until a person reads it. We never say who "won".

## Where it shows up

- Record pages (city now; county and courts after), the map's profile pages (a person's "Votes & actions"), the ward view, the At City Hall page (the meeting's items link to the same record page), the Jump box (search by file number or case number), and the Index views.
- A "Votes & actions" feed per body ("Latest from City Council", "Latest from County Council"), by date, never by importance.

## Phases (each ends with the full gate and a screenshot review)

0. **Decisions** (below). No code.
1. **Inventory and probes.** For each body, what official data exists, how it is published, its terms, and how complete it is (a table in `docs/source-notes-votes.md`). Report coverage numbers, for example "417 of 451 passed city files have member names." A person confirms terms.
2. **City complete.** Fill name gaps where a source exists; add committee actions and Mayor actions; one shared "record" component with the four parts. Unit tests that every vote adds up and every action has a source and a date.
3. **People and wards.** Each person's and ward's "Votes & actions" list, with per-area counts and no overall number.
4. **County.** Fetcher, data file, record pages, the Executive's actions, county people pages.
5. **Positions.** The "In the record" fold for city and county (sponsors, stated purpose, reports); the "Stated outside the record" fold with a person-added entry format and a review command, like `--mark-levies-reviewed`.
6. **Courts.** The chosen court set, opinions, judge pages.
7. **Spanish, light, color-vision, phone, desktop, checks.** Checks fail if any record shows a vote with no source, a count that does not add up, a missing record shown as a no, a score or ranking word, or a position with no source and date.
8. **Review.** A person reads the plain sentences and stated positions against their sources and runs the review commands.

## Risks

- **Looks like a scorecard.** A list of every vote by every member invites "who votes most with whom". We never compute across records; counts are per area and per record only.
- **Completeness.** If one body publishes names and another does not, the pages look uneven. We show the gap in words and report coverage openly.
- **Stated positions can mislead.** Quotes need a dated link and a person's approval; the section stays hidden until it has a reviewed entry; and each entry says who chose to include it.
- **Court records and privacy.** Opinions can name private individuals. Only published opinions are used, nothing beyond the opinion's own text, and a person reviews wording.
- **Source terms and stability.** County and court sites change layout; every fetcher is guarded the way the City Record one is (hash check, hold back on mismatch) and the nightly job reports gaps instead of guessing.
- **Size.** City records alone are 1,393; county and court records add more. Load per record lazily; never at first paint.

## Decisions (made 2026-10-06)

1. **Courts:** the published opinions of the Eighth District Court of Appeals, the Ohio Supreme Court, and the federal Northern District of Ohio and Sixth Circuit. Local trial courts (Common Pleas, Municipal, Housing) are left out.
2. **County:** both the County Council's legislation and votes and the County Executive's actions.
3. **Positions:** official positions first ("In the record"). The "Stated outside the record" fold is built but stays empty and hidden until a named person adds and reviews entries.
4. **Ceremonial resolutions:** short rows only, no full pages.
5. **Ward view:** best practice, chosen by me: the ward's Council member's own actions and votes, plus city records that name the ward (with the matching word shown). Nothing about the viewer's ward is inferred; a resident chooses a ward on the device.
6. **Order:** city complete, then people and wards, then county, then official positions, then courts.
7. **Reviewer:** Brent. He reads the plain sentences and any stated positions against their sources and runs the review commands himself. Until he does, everything ships with the "A person has not reviewed this" notice.

## Status (Oct 6, 2026: phases 1 to 3 built, on a branch, not released)

**Phase 1, inventory and probes.** `docs/source-notes-votes.md` holds the city's numbers and why the gap was there, what Legistar's own endpoints
return (with an example), the committee and Mayor's actions the record has, and a read-only probe of the Cuyahoga County Council (legislation and
minutes), the County Executive, the Eighth District Court of Appeals, the Supreme Court of Ohio, and the federal Northern District of Ohio and
Sixth Circuit, each with its address, the day read, what is machine-readable, the terms found, completeness, and risks. Nine sources are registered
in `scripts/us_sources.py` as `review_required` (Brent confirms terms): `city_record_actions`, `council_legistar_votes`, `county_council_legislation`,
`county_council_minutes`, `county_executive_actions`, `ohio_8th_district_appeals_opinions`, `ohio_supreme_court_opinions`, `federal_ndohio_opinions`,
`federal_6th_circuit_opinions`. Congress.gov still answers scripts with a 403 challenge page.

**Coverage of the city's member-by-member votes.** Before: 417 of 451 passed 2026 files had names; 34 did not. After: **451 of 451**.
- 33 files passed on Sept. 28, 2026: their roll calls are in the City Record of Oct. 2, 2026, which every nightly run since Oct 2 refused because
  file 1044-2026 prints a "Recusal" list the parser did not know. The parser now reads it (stored as `recused`, its printed count checked, never a no).
- 4-2026, the Rules of Order: the City Record prints its vote as a sentence; the names come from Council's Legistar record (`legistar_votes`; 14 Yea,
  1 Nay, the same as the sentence), and the record says so.
- Passed files with no names: none today. If one appears, `no_names` in `data/votes-2026.json` gives its reason (`issue_not_out`, `legistar_held`, or
  `not_printed`) and the record says it in a sentence; the build and `refresh.py --check` fail if a passed file has neither names nor a reason.
- Legistar holds member votes for 164 Council agenda items at 11 meetings (Jan. 5 to May 18); 156 match the City Record exactly, 5 do not (all
  May 18, Joseph T. Jones: Yea in Legistar, Absent in the City Record, whose printed tally agrees with Absent). The City Record's vote is shown and the
  record names the difference. Committee votes by name exist in no source read.

**Phase 2, city complete.** `scripts/fetch_cityrecord.py` (parser 2, run by `python scripts/refresh.py --votes` and by the nightly refresh) reads
40 City Record issues into `data/votes-2026.json`: 467 roll calls on passage or adoption, 11 other votes, and, new, 300 referrals ("Referred to the
Directors of ...; Committees on ..."), 260 committee and department approvals printed before a final vote, and 429 effective dates ("Passed ...
Effective ..."), each tied to its entry and meeting with the issue as its source; 4 lines that could not be tied to one file are held and listed.
A second run of the fetcher wrote the identical file. `scripts/council_record.py` builds the dated actions for 1,165 files (the Clerk's agendas and
outcomes, the action histories, and the City Record's lines; 210 KB, about 11 KB compressed) into `site/council/record-2026.json`, loaded only when
a record or a list first needs it (in the offline file, a block read only then). Mayor's actions: neither record prints a signature or a veto; the
"Took effect" row gives the City Record's effective date and says it does not say who signed. One shared record component (`ext/cx-record.jsx`):
what it is; Votes & actions, oldest first, each row with its date, what happened (our plain words and the record's own word), who acted (sponsors and
members linked to their profiles), and its source with the day pulled, a vote row with every member under the printed word and a count line; Positions,
"In the record" (sponsors with "Sponsorship is not a vote", the record's own title as its stated purpose, and the reports printed before the final
vote) and "Stated outside the record" (built, hidden while `CX_STATED` is empty); and where to read it. It is the phone's record sheet (`CxmLeg`,
`CxmLegHistory`), the Explore record's Votes & actions and Positions tabs, the desktop record page (`?panel=leg&file=906-2026`, new; the phone opens
the same link), and the map drawer's tabs for the six city files on the map. Jump to finds a file by its number. A ceremonial resolution is one
line (date, title, outcome, and the vote count line if any), on its own sheet or page and in every list. Search and At City Hall open records as before.

**Phase 3, people and wards.** Every profile (15 council members and the Mayor, desktop page and phone sheet) has Votes & actions: a dated list,
newest first, of sponsorships ("Sponsorship: the first name on the file", "joined as a co-sponsor", "signed for a city department"), votes in the
record's word (Yea, Nay, Absent, Recusal) with the question and the count line, and for the Mayor what the administration sent, with the plain
statement that the record prints no signature or veto dates. The list is built only when opened, 20 rows at a time. Council's record has no policy
areas, so it filters by kind of record, type of legislation, and year, and says so; counts are per kind and type only, never a total, never on
"All" or the year, and nothing is ordered by a count. The ward view (My place on the phone, My local context on a computer) shows, for the ward
chosen on the device, the ward member's list and the city records that name the ward, using At City Hall's matcher ("Names Ward 7", "Ward 7 in the
ordinance text", "Address in Ward 7: ..."); with no ward it says what to set. The ward never goes into the address, storage, a cookie, or a request.

**Hidden or waiting.**
- The plain words between the VOTES-TEXT markers (`ext/cx-votes-text.jsx`): Brent reads them against the record and runs
  `python build.py --mark-votes-text-reviewed "Name"`. Until then every record and list says a person has not reviewed them.
- Stated positions: none; the fold appears when a named person adds and reviews an entry.
- The terms of every source in `docs/source-notes-votes.md`; which record is right for the five May 18 votes; a Spanish speaker for the new Spanish
  (`i18n/review-notes.md`).
- WHEREAS clauses are captured for only 23 files (`data/reasons-2026.json`) and are not shown; the record's title is its stated purpose here.
- County (phase 4), positions entry and review (phase 5), and courts (phase 6) are not started; the probes say what each source allows.

**Checks.** New `votes-actions` browser check (a record's names under each printed word and a count line that adds up, a file with no names says why and shows no nay, sponsorship rows say sponsorship, no overall number or ranking word in a list, the ward view with and without a ward and the ward in no address, storage, or request, ceremonial lines, lazy loading, Jump to, Spanish, light in both styles), `scripts/test_votes_actions.py` (17 tests), and 15 new tests in `scripts/test_cityrecord.py`. On the final build all 51 browser checks, the light passes in both styles, the Spanish layout passes, every unit test, and `refresh.py --check` pass. Two clean builds gave the same single file, `b0e8e7131d8a2afda377d5ba198df31bcc2e268777d01cb3ef6a4fed4ba4b1ae`, and `site/index.html` `fdbe8a004f376f6017a3dd2175e423ed5b109db7859b832dc5582c7c4435ce31`.
