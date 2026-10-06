# Plan: explain every committee, and every position or seat someone holds

Status: phases 1 to 4 built on a branch (2026-10-05), not yet reviewed or released; phase 5 (positions and seats) not started. Our lines carry the
"A person has not reviewed" notice until someone runs `python build.py --mark-us-text-reviewed "Name"`. Sources and their terms: `docs/source-notes-committees.md`.
What was built: `scripts/fetch_explainers.py` and `scripts/us_explainer_config.py` (the official words, into `data/us-explainers-2026.json`), `ext/cx-us-text.jsx`
(our lines, the role notes, and the story, between the US-TEXT markers), the browser check `us-explain`, and `scripts/test_us_explainers.py`. Written 2026-10-05 for Brent and the team. It sits under `docs/plan-us-graph-master.md` (the map, the side sheet, the profile page) and follows `docs/plan-plain-text.md` (how much text, in what words).

## The problem in one picture

Open "House Committee on Ways and Means" on the map. The sheet says "A House committee with 45 listed members. Chair: Jason Smith." It does not say what the committee does, why a resident would care, what "Chair" or "Ranking Member" means, or what its subcommittees are for. The same gap is everywhere a person holds a position: a Speaker, a whip, a cabinet secretary, a chief judge, a senator in a class that is up in 2028.

## What the record already holds (from `data/us-landscape-2026.json`, pulled by `scripts/refresh.py`)

- 49 committees: 23 House, 21 Senate, 5 joint. Each has a name, a website, a chair, a member count.
- 181 subcommittees, each with a name, a chair and a member count.
- Every member's seats, each with the record's own word: Member (3,280 seats), Ranking Member (219), Chairman (145), Chair (79), Ex Officio (118), Vice Chair (36), Vice Chairman (12), Chairwoman (4), Vice Chairwoman (1), Cochairman (1).
- Each member's chamber, state, district, term dates, and party as a dated field.
- The President, Vice President, 21 cabinet members with titles, 260 agencies with a short description, 106 courts and 845 judges.

## What it cannot say today

1. What a committee or subcommittee handles (its jurisdiction), in any words.
2. What the working words mean: Chair, Ranking Member, Vice Chair, Ex Officio, Cochair, markup, hearing, jurisdiction, conference.
3. Leadership posts that are not committee seats: Speaker, Majority and Minority Leader, Whips, President pro tempore, the Vice President's role as President of the Senate. None of these are in the data.
4. What kind of seat a person holds: a Senate class and why it is up when it is, a House district, an at-large seat, a non-voting delegate, a cabinet post, a circuit judgeship, senior status.
5. What changed since January: committee jurisdictions are set by each chamber's rules for each Congress, and leadership changes mid-term.

## Principle: official words first, our words second, and a person reads ours

Every explanation is one of two kinds, and the page always shows which.

- **From an official source.** The chamber's own rules (House Rule X, Senate Rule XXV), the committee's own "about" or "jurisdiction" page, the House Clerk and Senate leadership pages, the Government Manual. Pulled by `scripts/refresh.py`, written to `data/`, with the source, the Congress, and the date pulled on every row. Quoted, linked, never paraphrased by the nightly job.
- **Our plain-English version.** A short rewrite of that wording for a resident. This is interpretive, so it follows the same rule as the levy guide and the office text: it sits in the app between markers (`US-TEXT-START` / `US-TEXT-END`), it never ranks or recommends, and the page says "A person has not reviewed this" until someone reads it against its source and runs `python build.py --mark-us-text-reviewed "Name"`. Where there is no official description, the page says so ("No description on file") and shows nothing invented.

The official wording sits one tap below our sentence ("The committee's own words"), the same way the ballot's official wording does.

## What each explanation looks like

**Short on purpose: two lines, what it does and why.** Every committee, subcommittee, role and position gets the same two lines and nothing more by default, about 35 words in all. Longer detail is one tap down.

- **What it does.** One sentence, 20 words at most. ("Handles taxes, tariffs, Social Security and Medicare.")
- **Why it matters.** One sentence on what it decides for a resident, 15 words at most, stated as a fact about the job and not as a judgment of importance. ("Tax and benefit bills start here before the full House votes.")

Then the facts we already have, as small rows: chair, ranking member, size, subcommittees (each with its own two short lines when opened). Committees are listed alphabetically or in the chamber's own order, never by "importance" or "power". No "most powerful committees" anywhere. The "why" line must come from the official text or the chamber's own rules, so it is a receipt as well, with its source one tap down.

**A role word.** Every Chair, Ranking Member, Vice Chair, Ex Officio and Cochair on the page is tappable and opens one short note: what the post is, what it can do, who chooses it, how long it lasts. One note per word, reused everywhere (sheet, profile, hover card). The record's own word stays on the row ("Chairman" stays "Chairman"); the note says that Chair, Chairman and Chairwoman are the same post.

**A position that is not a committee seat.** The same two lines (what it does, why it matters) for: Speaker, Majority and Minority Leader, Majority and Minority Whip, conference and caucus chairs, President pro tempore, Vice President (President of the Senate), the President, a cabinet secretary, an agency head, a Chief Justice, an Associate Justice, a chief judge of a circuit, a district judge, a judge on senior status. One tap down: how you get it and how long it lasts, from the Constitution or statute, linked.

**A seat.** One line on the kind of seat in the From the record table: "Senate, Class 3. Elected statewide for six years. Next election November 2028." "House, District 11. Elected from one district for two years. Next election November 2026." "House, at large." "Delegate, non-voting in the full House." Every figure comes from the record's dates; the Senate class comes from the term dates, not from a typed list.

**One general page.** "How a committee works" in plain words, in five short steps (a bill is sent to a committee, a hearing, a markup, a vote to report it, then the floor), with the rule that a committee's vote is not the chamber's vote. It is the first thing the committee sheet links to, and it is a story in the same engine as the ballot stories, so it can be read on a phone one step at a time.

## Where it shows up

- **Side sheet on the map:** the two lines under the big name, and the official wording one tap down.
- **Hover card on the computer:** the "what it does" line only.
- **Profile page:** a committee page gets the two lines at the top and a "Subcommittees" list with the "what it does" line each; a person's page gets a one-line meaning beside each seat in "From the record" and the seat line in the table.
- **Index, Linked and Tree views:** the "what it does" line in the quiet sub-line, so the text twin says what the map says.
- **Role words anywhere:** tap for the note.
- **Votes by topic:** each topic links to the committees that handle it, using the same jurisdiction words, so a resident can go from "Housing" to "who handles this".
- **Phone and desktop:** same words, same data, one shared component.

## Data and refresh

- New sources registered in `scripts/us_sources.py` with their terms status: `us_house_rules` (jurisdiction of each standing committee), `us_senate_rules`, `us_committee_pages` (each committee's own about or jurisdiction text), `us_house_leadership` and `us_senate_leadership` (the officers and leaders, with the date), and the Constitution and Code for how posts are filled.
- `scripts/refresh.py` fetches them into `data/us-explainers-2026.json` (one row per committee, subcommittee, and post: official text, source, Congress, pulled date) and `data/us-leadership-2026.json`. A committee or post with no text gets an explicit "none on file" row, never an empty one. Nothing is hand-edited in `data/`.
- Leadership and chairs refresh nightly, because they change mid-term. Jurisdiction text refreshes when a new Congress's rules appear (January), and the page shows which Congress the text is from.
- Committee names are matched by the committee's id (`HSWM`), not by name, so a rename does not break the link. A committee in the explainer file that is not in the landscape file (or the reverse) fails the unit test, so nothing silently goes without an explanation.

## Phases (each ends with the full gate and a screenshot review)

0. **Decisions** (below). No code.
1. **Sources.** Probe each source, record its terms, register it, and read a sample of 10 committees against it. Stop and report anything we are not allowed to republish. (Small. One person must confirm the terms.)
2. **Data and tests.** Fetch into `data/`, the adapter, and unit tests: every one of the 49 committees and 181 subcommittees has an official text or an explicit "none on file"; every role word in the record has a note; every leadership post has a name and a date. (Medium.)
3. **Role notes and "How a committee works."** Write the notes and the five-step story, between the markers, flagged unreviewed. (Small, but a person must read it.)
4. **Committee text, in the app.** The plain-English line for each committee and subcommittee, written from the official text, in the sheet, hover card, profile, Index, Linked and Tree. The `text-budget` check keeps it short. (Medium.)
5. **Positions and seats.** Leadership posts, the executive branch (President, Vice President, cabinet, agency heads), the courts (Chief Justice, justices, chief judges, senior status), and the seat line for every member. (Medium.)
6. **Spanish.** Our lines translated as a draft; the official wording stays English, as it does for the ballot. (Small.)
7. **Checks.** A check that fails if any committee, subcommittee, role word or post shows no text and no "none on file"; that no explanation contains a ranking word ("powerful", "important", "top", "best"); that every explanation names its source and date; that no "what it does" line passes 20 words, no "why it matters" line passes 15, and no pair passes 35; and that the sheet, profile, hover card and Index say the same thing. (Small.)
8. **Review.** A person reads all our lines against the official text and runs `--mark-us-text-reviewed`. Until then the unreviewed notice shows. (Needs a person; I estimate under two hours for the 49 committees and about 40 posts, plus the subcommittees.)

## Rules this keeps

- Receipts, not scores. No ranking of committees, no "powerful" or "important", no ordering by influence.
- Sponsorship is not a vote. A committee's vote to report a bill is not the chamber's vote. A missing record is not a no. A missing description is not "nothing".
- Official text is quoted and linked; our rewrite is flagged until a person reviews it.
- Party stays a dated fact on a person's profile only. A committee explanation never mentions party except to say who the chair and ranking member are, in the record's own words and with their dates.
- Plain English, no dashes, no jargon without a tap-to-explain, no left stripes, no dots beside labels, both styles and layouts, light and dark, English and Spanish.
- Nothing about the viewer is sent or saved.

## Risks

- **Legalese.** The rules' wording is dense. Any rewrite is interpretive, which is why it is flagged and reviewed. We keep the official wording one tap down so a reader can check us.
- **Stale text.** Jurisdiction is set per Congress and leadership changes. The dated source line and the nightly refresh for leadership are the guard; a check fails if the Congress in the text is not the current one.
- **Length.** 49 committees plus 181 subcommittees is a lot to read. Most people open one or two. The default view shows only the first line; everything else is one tap away.
- **Looks like a ranking.** Listing "who leads it" at the top can read as "who matters". Lists stay alphabetical or in the chamber's own order, and the role note says what a post is, not how important it is.
- **Select and special committees.** Some bodies (select committees, commissions) are not in the standing list. They show what is on file and say the rest is not.
- **Terms of use.** A person confirms each source's terms before anything ships (phase 1).

## Decisions needed from Brent

1. **Depth.** All 49 committees and 181 subcommittees, or committees first and subcommittees later? Recommendation: committees and the role notes first, subcommittees in phase 4 behind a "Subcommittees" tap.
2. **Which positions count as a "seat" in version one?** Recommendation: committee roles, congressional leadership, the President, Vice President, cabinet and the court posts. Agency heads below cabinet later.
3. **Our wording or only official wording?** Recommendation: both, with ours first and flagged, the official one tap down.
4. **Who reviews the text?** A named person must run the review step. Without one, everything ships with the "not reviewed" notice.
5. **Spanish.** Draft our lines only, official wording stays English. Confirm.
6. **Build order.** Recommendation: phases 1 to 4 first (committees and role notes), then positions and seats.
