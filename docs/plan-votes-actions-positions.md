# Plan: votes, actions, and positions on every record, for the city, wards, county, and courts

Status: proposed, nothing built. Written 2026-10-06 for Brent and the team. It builds on what the city record already does (the "Votes & actions" timeline on a legislation record, the City Record roll calls) and extends the same idea to the county and the courts, with the same rules. It sits beside `docs/plan-profiles.md` (people pages), `docs/plan-city-hall-page.md` (meetings) and `docs/plan-explain-committees-and-seats.md` (what bodies and roles are).

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
