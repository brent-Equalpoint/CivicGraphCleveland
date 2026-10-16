# Plan: Government, Places, and Ballot as the desktop's three doors

Status: proposed, nothing built. Written 2026-10-13 for Brent and the team; updated the same day with Brent's answers (Local includes the county and courts, State ships with real content, how far the matching may go, which races first) and a bias audit. It follows the text and navigation audit of the same day (nine tabs, a room strip, a 13-link "My pages" menu, and seven header buttons on desktop) and `docs/plan-plain-text.md` (how much text, in what words). It uses `docs/plan-alignment.md` for the matching rules, `docs/plan-permits-property-business.md` for "what's being built", and `docs/plan-mobile-restructure.md` for the phone.

## What Brent asked for

- A **Government** dropdown with three entries: Federal, State, Local. Each is its own page with its own categories: cities, politicians, committees, legislation, and so on.
- **Places** shows the local government that affects you. Pick a neighborhood or ward and see who your council member is, what is happening near you and why, what legislation is moving, which meetings are coming up, and what is being built.
- **Ballot** shows the same local picture, plus a better way to line yourself up with the candidates and issues on your ballot. That needs deeper research: connecting articles, votes, and legislation to what a candidate believes or backs. My priorities and My constellation move in here.
- Cut the redundant explainer text on the way.

## Where each thing lives today and where it goes

| Today | Goes to |
| --- | --- |
| United States tab (the federal map, profiles, committees, 1,591 recorded votes) | Government > Federal |
| Rooms: Mayor & services, Council & wards, Budget & contracts, Courts & justice, Cities & municipalities, and the rest | Government > Local |
| County, state & federal room (text only) | Government > Local (county) and Government > State |
| Your block, Your ward, Your city (the place tabs) | Places (one lens, picked by neighborhood or ward) |
| Who decides here?, My local context, Find my districts, At City Hall (phone) | Places |
| My leaders, Profiles (council members) | Places for your own member, Government > Local for everyone |
| My ballot, Voter education, Levies and taxes | Ballot |
| My priorities, My constellation, alignment | Ballot |
| Stories, What's new, Decision ledger, How this is built, Privacy policy, Dictionary, Resident check | An "About" menu and the header, not "My pages" |

The tab and menu names that the audit found confusing ("County and courts" opening on elections, "My constellation" and "My priorities" sharing a heading, "My pages" holding public pages) go away with this.

## Government

One page per level, the same categories on each so a resident learns the pattern once.

| Category | Federal | State | Local (city, county, schools, transit) |
| --- | --- | --- | --- |
| People | President, VP, cabinet, 539 members of Congress | Governor, statewide offices, General Assembly | Mayor, 15 council members, county executive and council, board members |
| Committees | 49 committees and 181 subcommittees, with what each does | Not in the record | Council committees |
| Legislation | Bills and roll calls | Not in the record | Ordinances, resolutions, roll calls |
| Courts | 106 courts, 845 judges | Not in the record | Municipal and common pleas, text only |
| Agencies and bodies | 260 agencies | Not in the record | Departments, boards, authorities |
| Cities and municipalities | Not applicable | Not applicable | Cities in the county |

**Status.** Federal is built and has data. Local is built for Cleveland (people, legislation, roll calls from the City Record, meetings, wards) and thinner for the county and other bodies. **State has no data of its own yet.** There is nothing in `data/` for Ohio legislators, bills, or committees. See "State" below for what it holds, how it is built, and what ships first. Local includes Cuyahoga County and the courts that hear Cleveland's cases (decided by Brent, Oct 13).

## State

Brent's scope: the people who represent Ohio (both U.S. senators, the U.S. House members from Ohio, the governor), the people who could run for those offices in this election, and the things that happen at the state level that reach Cleveland and Cuyahoga County: legislation, permits, and laws being introduced.

### What the State page holds

The same categories as Federal and Local, filtered to Ohio and, wherever the record allows, to Cleveland and Cuyahoga County.

| Category | What it shows | Where it comes from today |
| --- | --- | --- |
| Overview | Who represents you at the state and federal level, what is on your ballot, and what is moving that reaches Cleveland | Built from the pieces below |
| People | Ohio's two U.S. senators and its U.S. House members; the governor and the other statewide officers; the Ohio senator and representative for your address; the candidates for these offices on the Nov 3 ballot | Members and districts: `data/us-landscape-2026.json` and `data/districts-2026.json` (already filtered by `state` and matched by address). Candidates: the practice ballot's candidate catalogue (entries dated Sep 17). New: the General Assembly's members |
| Legislation | Bills in the Ohio General Assembly, with sponsors, committee, status, and each step with its date; a filter for "reaches Cleveland or Cuyahoga County" | New |
| Committees | Ohio House and Senate committees, with what each handles | New, same two-line pattern as the federal committees (`docs/plan-explain-committees-and-seats.md`) |
| Agencies and boards | The state bodies whose decisions land in Cleveland (see "Things to add") | New |
| Permits and filings | State permits and approvals for sites in Cuyahoga County | New |
| Courts | The Ohio Supreme Court and the Eighth District Court of Appeals, which covers Cuyahoga County | Text only today |

I added two things Brent did not name, because a Cleveland resident needs them: the **Ohio senator and representative for your address** (the Find my districts match already knows the districts), and the **statewide offices and judges** on the ballot.

### How it is built

One record shape for every level, so Federal, State, and Local share the same page components and a person learns the pattern once.

| Kind | Examples | State file (proposed) |
| --- | --- | --- |
| Person and office | A legislator, the governor, a candidate | `data/oh-landscape-2026.json` |
| Body | A committee, a board, a court | `data/oh-landscape-2026.json` |
| Measure | A bill, a resolution, a rule | `data/oh-measures-2026.json` |
| Action | A vote, a hearing, a status change, each with a date | `data/oh-votes-2026.json` |
| Filing or permit | A state permit or approval | `data/oh-permits-2026.json` |
| Candidate | A person running, the office, the district | `data/oh-candidates-2026.json` |

Rules that carry over from the existing data:

- Only `scripts/refresh.py` writes `data/`, through new fetchers (the pattern of `scripts/fetch_cityrecord.py`). Nothing is hand-edited. Every row carries its source, its link, and the day it was pulled. A record that does not add up is held back, never fixed by hand.
- Every source is read for its terms first (the pattern in `docs/source-terms-review.md`). Official records update automatically. News never does.
- Places join through the district keys already in `data/districts-2026.json` (ward, Ohio House, Ohio Senate, U.S. House, county council). One chain from a person's place to their members, shared by Places, Ballot, and State.

**"Reaches Cleveland" is a receipt, not a score.** It is decided by rules a script can apply and a person can read: the measure names Cleveland or Cuyahoga County, names a body that serves them (the Regional Transit Authority, the school district, a county office), or changes a section of law that applies to a city, a charter city, or a county. The page shows the reason and the quote: "Names Cuyahoga County in section 4." It never ranks measures by importance and never says how much something affects anyone. Where a person writes a plain-English line about a measure, it is interpretive, so it waits for a named reviewer like every other interpretive text.

### What ships first

1. People: Ohio's federal delegation and the governor, from data we already hold, plus the Nov 3 candidates for those offices from the ballot catalogue. No new fetcher.
2. The Ohio legislators for your address.
3. Bills that name Cleveland or Cuyahoga County, then committees.
4. Agencies, boards, and permits, one source at a time, each after its terms are read.

### Things to add

- **PUCO dockets** (the Public Utilities Commission of Ohio): electric and gas rate cases that decide what Clevelanders pay.
- **Ohio EPA permits and enforcement** near Cleveland sites.
- **ODOT projects** on state routes and interstates in the county.
- **Controlling Board approvals**, which release state money for local projects.
- **State spending that lands in Cleveland**, from the state's own spending transparency site (what the state pays Cleveland entities).
- **Capital budget lines** for Cuyahoga County projects.
- **Agency rules in review** (the legislative committee that reviews state agency rules), so a rule change is visible before it takes effect.
- **State campaign finance and lobbying filings**, as funding records, labeled "a funding record, not a position".
- **Statewide ballot issues** and the state judges on the ballot.
- **Ohio Supreme Court and Eighth District decisions** that involve Cleveland or the county.
- **Liquor and other state-issued permits** for Cleveland addresses.
- **Redistricting**: which new district lines apply to your address.

Each item is a candidate source. None is confirmed available or open to reuse until its terms are read.

## Places

The local lens, one resident and one place. The place stays in the browser, never in a link or a request (the Find my districts rule).

| Wanted | What exists | What is missing |
| --- | --- | --- |
| Pick a neighborhood or ward | Phone: My place. Desktop: Who decides here?, Find my districts | One shared picker on both layouts |
| Your council member | My leaders, Profiles | None |
| What is happening near you | "City records that name Ward n" on the phone | A desktop view of the same |
| Why | "Why supporters backed it", for the reviewed bills only | More reviewed summaries (person-read) |
| Legislation moving | Legistar rows by ward | None |
| Meetings coming up | At City Hall, from the Clerk | A desktop view |
| What is being built | A plan only. The city publishes permits, demolitions, and project applications as open map layers already tagged with ward and neighborhood | The fetchers and the data |

### How wards voted (Brent, Oct 13)

A detail, not a feature that does anything: for any race or issue that has been decided, show how each ward voted next to the citywide and county results. It is anonymous (the app collects nothing from the person looking), it counts toward nothing, and it never touches the matching, My priorities, or anything a person answered.

- **Official results only.** The count and the share for each side of an issue, or for each candidate as the ballot listed them, with turnout beside it. Turnout is not optional: a majority of the people who voted is not a majority of the ward.
- **About the area, not the person.** The page says "Ward 7" and never "people like you". There is no input for race, income, or education, and the app does not predict how anyone will vote.
- **Compared on the same footing.** One row per ward, in ward order, with the city and the county as reference rows. Not sorted by who voted which way, and not colored by party or by "lean". No label for a ward.
- **Shown by choice.** It sits behind "How wards voted before", not above the question, so it does not nudge a person before they decide.
- **The 2025 ward redraw.** Council went from 17 wards to 15 for 2026. Results before 2026 were counted in the old wards. The page shows them in the old wards, labeled, and only re-adds precincts into the new wards where a precinct sits wholly in one new ward. A precinct that straddles two wards is shown as split, never divided by guess.
- **Data needed.** Results by precinct from the Cuyahoga County Board of Elections (confirm they publish them, in what format, and on what terms), and a precinct-to-ward key. `data/geo-2026.json` has the current wards and neighborhoods; the old 17-ward map and the precinct key are new. Written by `scripts/refresh.py` only, with source and the day pulled on every row.
- **Small numbers.** Where a ward or precinct has few votes, show the counts and say the number is small, not a share that looks exact.

**Checked on Oct 13: is the data there?** Read only; nothing was saved to `data/`.

- **The county's "official results" PDFs are totals, but it also publishes by-precinct reports.** The two 2025 and two 2023 official reports I opened (by contest and by category) give one total per contest for the whole county, split by how people voted, with no precinct rows. A separate "Unofficial Results by Precinct" report exists: I downloaded the one for the Aug 8, 2023 special election (153 pages, 967 precincts). It has one block per precinct with that precinct's registered voters, ballots, turnout, and votes on each contest. **The ward is in the precinct's name:** "Precinct 0118 CLEVELAND -01-A" is Ward 1, precinct A, so the precinct-to-ward key for that year is built in. That report used the 17 wards. I could not find the by-precinct files for Nov 2022, 2024, or 2025: the file names I guessed returned 404, and the page that lists the files loads with a script. Whether they exist is unconfirmed.
- **Others have already mapped parts of it.** Nothing I found covers Cleveland's own contests by the new 15 wards. What exists:
  - **Cuyahoga County Open Data (ArcGIS Hub)** carries a "Voting Precincts" layer from the Board of Elections' own GIS department, described as the most current version, with district and polling-place assignments. I found the layer itself on the county's ArcGIS service (`services7.arcgis.com/GXM8JipKyc0m6HBi`), and it is open. **"Voting_Precincts_region"** has 923 current precincts, each with a Ward field and its congressional, Ohio Senate, Ohio House, county council, and school districts, and a voter count. **"Cleveland_New_Precincts_2025_region"** has the 279 Cleveland precincts drawn for the 15 wards. There are also layers for the May 2025 precincts, polling locations, and election wards. The layer pages carry no license text, so reuse terms are still unverified, and the county's disclaimer applies.
  - **A Cleveland-area contributor's GitHub gist** has the Aug 2023 Issue 1 results by precinct as a CSV, parsed from that same county PDF. One election, no license. It shows the PDF parses cleanly.
  - **MIT Election Data and Science Lab** publishes precinct-level returns for every state from 2016 on (2022 and 2024 releases) on Harvard Dataverse. Its license for the Ohio files is unverified.
  - **The Redistricting Data Hub and the Voting and Election Science Team** publish Ohio precinct shapefiles with results for 2016, 2018, 2020, and 2024, with results from the Secretary of State. Their shapes follow Census voting districts, which approximate precincts, and the Hub's readme gives no license.
  - **OpenElections** has an Ohio results repository for 2000 to 2020. Whether Cuyahoga is in it is unconfirmed. No license is listed.
  - **The City of Cleveland's open data** (the same ArcGIS service our ward maps already come from) has both ward maps: the 17 old wards ("Wards") and the 15 new ones ("City of Cleveland Wards (2026)"). It also has "ward_characteristics", Census survey figures by ward with margins of error. I searched its 211 layers by name and found **no precinct layer and no election results**. So the precinct-to-ward join has to come from the county's precinct layer, laid over the city's ward polygons, with any precinct that straddles two wards flagged as split. The portal's terms, read on Oct 6 for the permits plan, say the data is under the Open Database License (ODbL).
  - **Overlap check (Oct 13, in a scratch folder, nothing added to `data/`):** I laid the county's 279 Cleveland precincts over the city's 15-ward map. Every precinct's Ward field matches the ward holding most of its area (279 of 279). 277 sit wholly inside one ward (at least 98% of their area). Two sit slightly across a line: precinct 1D.02 (94% in Ward 1, with a second ward touching it) and 15A.02 (97% in Ward 15). The county's own "Split" flag is set on 50 precincts; I have not confirmed what it means. This covers only the 2025 precinct set. Results from 2022 to 2024 need the precincts of those years, so the archived layers are still part of the records request.
  - These cover statewide and federal contests at best. None of them is the source for Cleveland's mayor, ward races, or county levies by precinct. The county's own reports are.
- **The Ohio Secretary of State publishes precinct-level results** for each county, back to the 2016 primary, according to its own data pages and to the Redistricting Data Hub, which republishes the 2024 general election by precinct from that source. The Secretary of State's site refuses scripts (a 403, also for our own fetch helper), so I could not confirm the file formats, whether local contests and county issues are included, or the terms. Someone has to open the page in a browser.
- **The precincts changed.** Cleveland went from 17 wards to 15 in 2025, and voters got new precinct assignments. The county had 967 precincts in 2023 and 896 in 2025. Results from before 2025 cannot be laid onto the new wards without the precinct-to-ward key for each year. The county's Maps and Data page says the new ward maps with voting locations are published there.
- **Terms.** The county's disclaimer says its web information is a public service and not the official record. Its public records policy says the Board is a public office under the Ohio Public Records Act, so precinct files can be requested in writing. I found no license that permits or forbids reuse.

**Verdict:** likely possible, not confirmed. Statewide and congressional contests are probably available by precinct through the Secretary of State. The open question is Cleveland's own contests and county issues and levies, which are the ones residents would most want by ward.

**Next steps, in order:**
1. In a browser, open the Secretary of State's 2024 and 2025 results pages. Note the file format, whether local contests are in the precinct files, and any terms.
2. Ask the Board of Elections (electioninfo@cuyahogacounty.gov, 216-443-8683) for precinct-level results for 2022 to 2025 and the precinct-to-ward key for each year, as a public records request.
3. Only then write a fetcher, and add it to `scripts/refresh.py`.

## Ballot

Everything in Places, scoped to the candidates and issues on your ballot, plus the matching.

### What the rules allow

`CLAUDE.md`: receipts, not scores; no match percentages, rankings, or ideology labels; sponsorship is not a vote; a missing record is not a no; news and anything interpretive need a person's approval, and news never goes into `data/` automatically; nothing personal leaves the browser.

So the matching is **itemized receipts next to your answers**, one question at a time:

> You said yes. Candidate A voted yes on this bill (source, date). Candidate B has no recorded vote on it.

It shows counts of questions that agree out of questions both of you have a record for, plus how many are missing, as the Constellation does today. It never shows an overall match, never orders candidates by agreement (ballot order, or alphabetical), and never treats "no record" as disagreement. For a levy or issue it shows both sides with named, quoted voices, and says when a side has none.

### Evidence a candidate can have

| Kind | Example | Updates | Needs a person |
| --- | --- | --- | --- |
| Recorded votes | Council roll calls, Congress roll calls | Automatically from official records | The plain-English question wording |
| Legislation they sponsored or led | Legistar | Automatically | Never reads as a vote |
| Who funds them | Board of Elections finance filings | Automatically | Labeled a funding record, not a position |
| Endorsements | Organizations' own pages | By hand | Yes, with source and date |
| Their own words | Questionnaires, filings, their site, quoted | By hand | Yes, with the quote and link |
| Articles connecting the above | News coverage | Never automatic | Yes, each link read and approved |

A challenger with no votes has only the lower rows. The page says so instead of padding.

### How the research gets in

**Correction (Oct 13): the Bench cannot carry this yet.** Today it makes exactly five kinds of claim, all about Council legislation (introduced on a date, a named sponsor, a recorded action, passed, and the roll call; see `bench/README.md`). It has no claim for a candidate's statement, an endorsement, a funding record, or an article, and no source rule for them. Candidate evidence there needs new claim kinds, each with an exact source anchor, a verdict rule, and a signed decision. That is a design job of its own (`docs/civic-agent/`) and will not be done in 21 days.

So there are two routes, and the plan uses both:

1. **Before Nov 3: hand-written, sourced, person-reviewed text in `ext/`**, the way the levies guide and "Why supporters backed it" already work. Each entry carries its quote, link, and the day it was read. The text sits between markers, the page says "A person has not reviewed this yet" until Brent reads it against the sources and runs a `--mark-...-reviewed` command, and a change after review hides it again. Nothing from news goes into `data/`. I prepare the entries and the review packet, and Brent reads and runs the command.
2. **After Nov 3: extend the Bench** with candidate claim kinds, so the next cycle runs through packets, the Examiner and Skeptic checks, and signed approval like Council records do. Recorded votes and sponsored legislation for officeholders can use the existing packets first.

**Race drafts written Oct 14** (`docs/research/ballot-2026/`, drafts only, not in the app): `governor.md`, `us-senate.md`, `us-house-11.md`, `ohio-senate-21.md`, and `ohio-senate-23.md`. Each follows the six evidence kinds, gives every candidate the same categories, and ends with a "Needs a person" list. Patterns across all five that a reviewer has to handle:

- **The Ohio Secretary of State site refused every request (403)**, so funding totals come from news reports or third-party trackers and most stop at June 30, 2026. They are labeled "a funding record, not a position".
- **Evidence is uneven because records are uneven.** A sitting legislator has votes and bills; a challenger often has only a website. The page has to say that, so a gap is not read as a verdict.
- **Recorded votes were chosen by subject, not exhaustively.** A person decides the final set and writes the plain-English question for each.
- **Applied Oct 14:** the proposed answers to the eight decisions in the review packet. Federal drafts use one fixed list of 24 recorded votes for every candidate; Ohio races stay provisional until Ohio data exists. The unsupported governor pilot claim was fixed in the app (a `build.py` patch with Spanish), built and checked, not yet released. The in-app race entries are not built; they wait for review of the drafts.
- **One live claim is unsupported.** The app's governor pilot says Amy Acton's campaign supports free school meals for all public-school students and Ohio funding; her page says less. Fix or confirm before Nov 3.
- **Some quotes are about other races or years** and should be dropped or labeled.

**Already done for the issues.** The levies guide (`ext/cx-levies.jsx`, between the LEVY-TEXT markers) already holds sourced entries for State Issue 3 and county Issues 10, 11, 12, 13, and 14, each with the official wording, what happens if it passes or fails, and both sides with named, quoted voices. They were written from sources read on Oct 5, 2026. **No one has reviewed them**: there is no `data/levies-reviewed.json`, so the page says "A person has not reviewed this yet". For the issues, the work before Nov 3 is the review (Brent reads each against its sources and runs `python build.py --mark-levies-reviewed "Name"`), not new writing. The candidate races are the new work.

What a packet or an entry holds is the same either way: the claim, the exact quote, the link, the day it was retrieved, the kind of evidence (from the table above), and who read it.

### Best practice for showing a match (Brent's question 4)

Show the record, not a verdict. In order of importance:

1. **Receipts per question, side by side.** Your answer, their recorded position, the source, the date, in one row. The reader does the comparing.
2. **Counts with their size, in words.** "You answered the same on 3 of the 5 questions you both have a record for. 4 have no record for them." Always show the second number and the missing ones. Never a percentage, a bar, a grade, or one number for the whole person.
3. **Missing is not a no.** A question with no record is listed as "no record", not counted against anyone, and never fills a gap with a guess.
4. **No ordering by agreement.** Candidates appear in ballot order or alphabetically, and the order of questions changes between visits.
5. **Say how the questions were chosen**, on the page, where the match shows (see the audit below: today every sampled measure passed).
6. **Both sides for issues**, with named, quoted voices, and a plain line when a side has none.
7. **Answers stay in the browser.** Nothing learned from your answers is used for anything until you confirm it, and what you stated always wins over what the app inferred.
8. **Test with real people** before it is shown (the last list in the audit).

## Bias audit

Brent added the FLX bias audit (the `flx-bias-audit` skill) as the check for the question set. It is built for the FLX question bank and its pairs. Here its question rules (W1 to W11) and its list of what still needs real people apply to the app's own questions. Its pair rules and its pair script do not apply, because this app has no this-or-that pairs. Bias can be reduced, never removed, so the audit ends with what only people can check.

### Run on the sample that exists (24 questions, 8 policy areas, `ext/cx-align-text.jsx`)

Read only. Nothing in the question set was changed, because it is interpretive text that waits for a named reviewer.

| Rule | Result | Label |
| --- | --- | --- |
| Selection | **All 24 measures passed** in both chambers. Saying "yes" to every question means agreeing with the winning side every time. No measure that failed is in the set | Fix first |
| W5 Do not assume a want | **11 of 24 ask whether you support cancelling a rule** ("overturning", "revoking"), so "yes" means undo. 10 of those start with "overturning" | Fix first |
| W9 Examples steer | 3 questions carry examples: officers carrying "including school zones, national parks…", proof of citizenship "such as a valid U.S. passport or a REAL ID", and the intelligence-surveillance question | Tidy |
| W10 Plain words | "VA" and "Title VII" are not spelled out in 2 questions | Tidy |
| Length | Median 26 words, longest 31. The plain-text plan asks for 22 or fewer where possible | Tidy |
| W1 Ask what is true now | All 24 ask "Do you support…" | Passes |
| W2 One question, one thing | 9 contain "and"; all 9 join items in a list, and none asks two things | Passes |
| W6 and W7 A middle and an exit | The answers are Yes, No, It depends, Still learning | Passes |
| W8 Time frame, W11 Personal questions | Not relevant: the questions are about bills, and none asks anything personal | Not applicable |

**Before and after for the first two.** Before: 24 measures, all of which passed. After (proposed): add measures that a recorded vote rejected, where the record has enough of them, so a "no" sometimes matches the winning side too, and say on the page which kind each question is. If the record does not have enough rejected measures, keep the set and say plainly under the questions: "All of these measures passed." For the second, keep the undo wording where the measure really is a cancellation (a person who says "yes" should know that is what they are backing), and cap how many such questions sit in a row.

### Not covered

- The "what the measure does" sentences under each federal question, and tone.
- **The Cleveland questions were audited on Oct 14** (`docs/bias-audit-cleveland-questions-2026-10-14.md`): 50 questions, 45 break at least one rule, 24 with a Fix first finding. The largest: 27 of the 29 constellation questions have only "yes" records, so a "no" can never match anyone; the short-term rental question leans through "enacted" and bundles two things; and "Still deciding" on the priorities takes one of the five slots. The audit also notes two features that touch the matching rules above: the constellation places people by how closely their records match yours, and My leaders has a "Most common ground first" sort. Both are an order by agreement. Brent to decide.
- Tone. The checks read wording only.

### What still needs real people

The live app must not collect answers (nothing personal leaves the browser), so these come from a small consented test, not from the site.

1. **Yes-rate per question.** A question nearly everyone answers the same way gets a second look at its wording.
2. **A repeated question, flipped.** If someone's answer changes when the same question is asked the other way round, the first answer followed the wording.
3. **A read by a few real people, including someone outside the team**, on whether either answer sounds like the "right" one.
4. **Whether each answer feels equally respectable** to the people who would choose it.
5. **A read by a person with a Spanish-speaking background** on the Spanish questions, once they exist.

Never: a score, a streak, a countdown, a ranking, a photo or a face next to an answer, a label for a person, or using an answer to overwrite what someone said.

### Nov 3 shortlist (draft for Brent to confirm)

Built from the app's ballot catalogue (48 contests and 105 issues, candidate entries from Sep 17) and the county's precinct layer, which shows which districts cover Cleveland's 279 precincts. Applying the rule in "Decision 3, explained". Check the candidate entries against the Board of Elections' current candidate list before any research starts.

Which districts reach Cleveland (precincts of 279, from the county layer): U.S. House 11 (all 279). Ohio Senate 23 (169), 21 (67), and also 24 (36) and 18 (7), which are not on this ballot. Ohio House 20 (95), 13 (49), 22 (43), 16 (25), 15 (20), 14 (16), 18 (15), 21 (9), 19 (7). County Council 7 (86), 3 (63), 8 (44), 2 (30), 9 (29), 10 (27); of these, 3, 7, and 9 are on this ballot.

**Group 1: offices whose holders vote on, sign, or run things that apply in Cleveland and the county (18 contests).** In ballot order:

| # | Contest | On the ballot (and others listed) |
| --- | --- | --- |
| 1 | Governor and Lieutenant Governor | 3 (and 4 write-ins) |
| 6 | U.S. Senator (unexpired term ending 1/3/29) | 4 (and 3 write-ins) |
| 8 | U.S. Representative, District 11 | 2 |
| 9 | Ohio Senate, District 21 | 2 |
| 10 | Ohio Senate, District 23 | 2 (1 removed) |
| 11, 12, 13, 14 | Ohio House, Districts 13, 14, 15, 16 | 2 each |
| 16, 17, 18, 19 | Ohio House, Districts 18, 19, 20, 21 | 2, 2, 1 (1 withdrawn, 1 removed), 2 |
| 20 | Ohio House, District 22 | 1 |
| 22 | County Executive | 1 (and 1 write-in; 2 entries removed) |
| 24, 26, 27 | County Council, Districts 3, 7, 9 | 1 each (unopposed) |

Six of the 18 have one candidate on the ballot (Ohio House 20 and 22, County Executive, and County Council 3, 7, and 9), so there is nothing to compare; they get the official record only. Candidate statuses come from the Board of Elections list as of Sep 17 and must be rechecked.

**Group 2: judges who hear Cleveland's and the county's cases (20 contests).** Ohio Supreme Court (2), the Eighth District Court of Appeals, which covers Cuyahoga County (5), and the Court of Common Pleas, general, domestic relations, and probate divisions (13). Most have one or two candidates. Judicial candidates are limited in what they may say about cases, so there is little for the matching to use. I would show the official facts only (the court, the division, the term, what it handles) and no matching questions. Confirm this limit with the Code of Judicial Conduct before relying on it.

**Group 3: issues (12 of the 105).**

| # | Issue | Reaches |
| --- | --- | --- |
| 3 | Photo identification to vote (proposed constitutional amendment) | Everyone in Ohio |
| 10 | Developmental disabilities levy (additional) | Every home in the county |
| 11 | Health and human services levy (renewal and increase) | Every home in the county |
| 12, 13, 14 | County charter amendments | Every voter in the county |
| 33 to 38 | Local liquor option, Sunday sales, in six Cleveland precincts (3-Q, 4-P, 7-C, 11-L, 13-C, 14-N) | Only voters in those precincts |

Issues 10 and 11 are already in the levies guide. The other 93 issues are other cities' and school districts' (for example Cleveland Heights and University Heights schools, an East Cleveland income tax). They stay visible with the official wording and say "research not added yet".

**Group 4: everything else (10 contests).** The statewide row offices (Attorney General, Auditor of State, Secretary of State, Treasurer of State), U.S. House District 7, Ohio House Districts 17 and 23, and County Council Districts 1, 5, and 11. The four statewide offices reach every Ohioan, so promoting them is Brent's call.

**A first reading list for the 21 days, in ballot order:** Governor, U.S. Senator, U.S. Representative 11, Ohio Senate 21 and 23, then Issues 3, 10, 11, 12, 13, and 14. That is 5 contests and 6 issues. County Executive has one candidate on the ballot, so it gets the official record only. The Ohio House races follow as time allows, starting with District 20, which covers the most Cleveland precincts.

## The explainer cuts that ride along

Done as each page moves, so the text is not written twice. From the audit (`Civic-Graph-Text-Audit`, published Oct 13):

- The room guide card (`CX_SimpleGuide`, `ext/cx-ui.jsx`): remove "YOUR GUIDED VIEW", "Take this one step at a time", "Pick one doorway. We keep the relevant path in view.", "or choose a starting point below", and "Each word opens the civic dictionary with an example and where it fits." Keep the question, the answer, the four step names, and "Suggested stops, not a chain of command." Show the room's question directly under the heading.
- Leads over two sentences (10 of 20 screens), and lines that describe the screen.
- Repeats: What's new says "Passed by City Council" on all 45 rows under a "Passed" heading; My leaders explains led, joined, and signed three ways; Levies repeats "We have not yet written what supporters and critics say" on five cards.
- Internal words on resident pages: "atlas", "packet", "Examiner", "Skeptic", "Honest status".
- The last two "plain" phrases: the Dictionary lead ("Plain words first.", compiled app, needs a `build.py` patch) and "plain-language definitions" in `ext/cx-ui.jsx`.

## The phone

The phone already has five tabs that roughly match this: Today, Records, My place, People, Ballot. Both layouts have to keep working, so the new structure needs a phone answer before it ships: My place becomes Places, People and Records become Government, Ballot stays. That is a separate small plan, not part of the desktop work.

## Order, and the Nov 3 election

Election Day is Nov 3, 21 days from this plan. A navigation change is a full-gate release (the browser checks run about 12 minutes; 61 places in `scripts/checks/run.js` name the current tabs and menu; the Spanish labels and the Jump to list change too). The ballot research is what residents use before Nov 3, so it goes first.

1. **Before Nov 3: ballot evidence.** Choose the races (decision 3 below). Define the evidence kinds above. Write packets for the first races. Fix the question set's selection (the audit's two "Fix first" items) before step 2 of the matching is shown, since it is hidden until a person reviews it anyway. Make the copy cuts that need no structure change (fast lane, only when Brent is reviewing live).
2. **State, first slice, in parallel.** People from data we already hold, then the Ohio legislators for your address. No new fetcher until a source's terms are read.
3. **A clickable mock** of Government, Places, and Ballot (no code in `ext/`) to judge the grouping.
4. **Government shell** with Federal, State, and Local, moving the United States map and the Cleveland rooms. State opens with the people and the ballot, and says plainly which categories are still to come.
5. **Places** on both layouts, from one shared picker. "How wards voted" follows once the Board of Elections' precinct results are confirmed and read for terms.
6. **Ballot** absorbing My ballot, Voter education, Levies, My priorities, My constellation, and the matching.
7. **State bills, agencies, and permits**, one source at a time.
8. **What's being built**, from the permits plan, after Places exists.

## Decisions

Made by Brent on Oct 13:

1. **Local includes the county and the courts.** Yes.
2. **State ships.** Include the senators, U.S. House members, and governor who represent Ohio, the people who could run for those offices this election, and the state-level things that reach Cleveland (legislation, permits, laws being introduced). It needs a good information architecture and data architecture: see "State". The list of more things to add is under "Things to add".
3. **Which races and issues get the deep research first.** Decided by one rule (below). **The shortlist as drafted was confirmed on Oct 13**: Group 1 (18 contests), Group 2 judges (official facts only), Group 3 (12 issues), and the first reading list. The four statewide row offices stay in Group 4 unless Brent moves them up.
4. **How far the matching may go.** Brent asked what best practice is and added the bias audit. See "Best practice for showing a match" and "Bias audit".

### Decision 3, explained

Each connection between a candidate and an article, a vote, or a bill is read by a named person before it shows. That reading is the limit: the ballot has far more races and issues than a person can read before Nov 3. So the question is only **what to read first**, and the answer is a rule that is not about who is running:

**Read first what decides something that applies in Cleveland and Cuyahoga County.**

1. **Offices whose holders vote on, sign, or run things that apply here.** The governor. The Ohio senator and representative for Cleveland addresses. The U.S. House seats and the U.S. Senate seat that cover Ohio. Cuyahoga County's elected offices and council seats on this ballot.
2. **Judges who hear Cleveland's and the county's cases.**
3. **Countywide and Cleveland issues and levies**, both sides, with names (the levy rule already requires this).
4. **Everything else on the ballot.**

Within a group the order is the order on the ballot, never by who is ahead, who is well known, or who we think matters. This is an order of work, not a ranking of anyone, and the page can say so. Races outside Cleveland and Cuyahoga stay visible with the official record and say "research not added yet".

Brent to confirm: is this the right rule, and which specific races are in group 1 for this ballot? The ballot catalogue lists 48 county contests and 105 issues, and the practice ballot shows 33 choices, so a short list is needed.

Still open:

5. After Nov 3, does the Ballot page keep the matching for officeholders' records (still true between elections), or wait for the next cycle?
6. Where do Stories, What's new, and the Decision ledger live: About, or under Government > Local?
7. Spanish: who reads the Spanish questions, and when? The matching questions need a Spanish-speaking reviewer before they are shown in Spanish.
