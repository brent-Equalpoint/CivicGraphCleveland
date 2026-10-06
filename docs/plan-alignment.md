# Plan: how you line up with your members of Congress, by policy

Written Oct 3, 2026. It is the methodology plan that `docs/plan-federal-map.md` ("Later: an alignment mode") said would come first.

**Status (Oct 6, 2026):** Step 1 is built in the new map and shown to residents. Step 2 (phases A2 and A3) is built and tested but **hidden** until a named person reviews the question set. See "What was built (Oct 6, 2026)" at the end.

The goal: a resident can see, on the record, where their own views and a member of Congress's recorded votes line up and where they do not, one policy area at a time, without the app ever telling them who to like or giving anyone a grade.

## Why this needs care

Showing how a person "lines up" with an office holder is the easiest feature to turn into a score, and a score is the one thing this project does not do. `CLAUDE.md` says: receipts, not scores; no match percentages, rankings, or ideology labels; a missing record is not a no. So this plan starts from what we are not allowed to do, and builds the most useful thing that is left.

## What already exists

The Constellation on the phone and desktop (`rh()` in the compiled app, shown in `ext/cxm-people.jsx`) already compares a resident's yes and no answers with a documented record:

- it counts only questions the resident answered yes or no, and only candidates with a documented record for that question;
- it reports `same`, `total`, and `missing`, never a rating ("a fraction is not an overall rating");
- "It depends", "Still learning", and missing records are excluded, never counted as disagreement;
- a person's distance from "You" has no direction and no meaning beyond more or fewer agreeing answers;
- party and ballot choice do not affect distance; everyone stays visible; answers stay in the browser.

Congress is the same idea on a larger record: 1,591 recorded votes on 511 bills in the 119th Congress so far (`data/us-votes-2026.json`), each with a Congressional Research Service policy area, and every member's Yea, Nay, Present, or Not voting.

## What is different about Congress

| Cleveland Constellation | Congress |
| --- | --- |
| A small set of questions written by us, each tied to one documented record | Thousands of votes; most are procedural (rules, motions, amendments, nominations, cloture) and say nothing about a policy |
| The resident answers our question | There is no question until someone writes one in plain English, and a plain-English summary of a bill is interpretive |
| One office at a time | 539 members, who each voted on a different subset of votes (terms, chamber, absences) |

So the hard parts are not the arithmetic. They are choosing which votes count, who writes the plain-English question, and how to show the result without it reading as a ranking.

## Two steps, the smaller first

### Step 1: "What they voted on in your areas" (no agreement at all)

The resident picks up to five policy areas they care about (the same idea as My priorities). For any member, the app shows, per area, counts of what the record says:

> Energy: 12 votes that decided a bill or a nominee. Yea 8, Nay 4, Not voting 0.

- No comparison with the resident, so nothing can be read as a match or a mismatch.
- Each row links to the official roll call and the bill on Congress.gov.
- This already exists per member in "How they voted" (a topic filter and counts). Step 1 is mostly putting it in the Sky's side panel, scoped to the resident's chosen areas, and letting the resident see it for several members side by side.

It is cheap, safe, and answers most of "how do they vote on what I care about".

### Step 2: "Where you and they answered the same" (agreement, on curated questions)

The resident answers yes or no to a short list of plain-English questions about specific bills that reached a final vote. For each member the app shows, per policy area:

> Energy: you and Husted answered the same on 2 of the 3 bills you answered that he voted on. 1 you answered that he did not vote on.

- **Counts per area, never one number across areas.** No overall line, no percentage, no sorting by agreement, no "best match".
- **Missing is shown, not hidden.** A member who did not vote is "not in the roll for this vote", and is never counted as a no. The count of questions the resident answered with no vote on record is shown next to the count that agree.
- **Position does not move.** The Sky does not recolor, resize, or reorder by agreement. The agreement counts live in the side panel and in a table a person can read, not in the picture.
- **Everyone stays visible**, ordered by name or by state, never by agreement.
- **Party is not an input and not a color.**

## The rules for "the same question"

These decide whether a vote counts, and they have to be written down and reviewed before any data is chosen:

1. **Only votes that decided something.** Final passage of a bill or resolution, or confirmation of a nominee. Not rules, motions, amendments, cloture, or tabling. The record already marks these (`final`).
2. **A vote is one question.** A Yea on passage of a bill is a Yea on that bill, and nothing else. The resident's question must be about the thing voted on, in the same direction (support or oppose it).
3. **A member's Yea or Nay only.** Present, Not voting, and "voted for a named person" are not agreement or disagreement. They are shown as "no vote on this" and never as a no.
4. **A resident's "It depends" and "Still learning" are excluded**, like the Constellation.
5. **The Senate and House record are separate.** A senator is compared only on Senate votes, a representative on House votes. A bill both chambers voted on gives two rows, one each, only for the members of that chamber.
6. **A term boundary is respected.** A member is compared only on votes held while they were in office (already how `cxMemberVotes` works).

## Who writes the questions

A plain-English question is a summary of a bill, and a summary can mislead. So, like the "Why supporters backed it" summaries and the Levies text:

- a person writes each question from the official bill title and summary, with the source linked;
- the question never says how to vote, shows what the bill does and what it does not do, and has no loaded words;
- the set is small and stated openly (for example 3 to 5 bills per policy area), and the page says it is a sample, not everything;
- after a person reads each question against its sources, a command (like `python build.py --mark-reviewed`) records who read it and when; until then the feature says no person has reviewed the questions;
- the question text lives in `ext/` with markers, and the bill it maps to is checked against `data/us-votes-2026.json` by a test, so a question can never point at a vote that does not exist.

## Privacy

Nothing a resident answers goes into a link, a cookie, or a request. Answers stay in the page's memory for the visit, like Place and priorities. The Sky never sends a policy choice anywhere.

## Phases

| # | Phase | Done when |
| --- | --- | --- |
| A0 | **Decide** the questions at the end of this file | answers written here |
| A1 | **Step 1.** Pick up to five areas; the Sky side panel and a "compare members" table show per-area counts from the record | `us-graph` check covers it; no word like score, match, rank, or percent can appear (a test scans the text) |
| A2 | **The question set.** A person writes and reviews the questions; a test maps each to a real final vote | review command exists; test passes; unreviewed state is shown |
| A3 | **Step 2.** Answer questions; per-area same/total/missing counts per member, in the panel and a table | the same checks, plus a test that no composite across areas exists in the model |
| A4 | **Spanish, color-vision, light mode, phone.** | all checks green, Spanish read by a person (see `i18n/review-notes.md`) |

## What would make us stop

- If the counts cannot be shown without a reader taking them as a grade (test with real readers), step 2 does not ship and step 1 stays.
- If a question cannot be written without leaning one way, it is dropped, not softened.
- If a vote's direction is ambiguous (a bill with both good and bad parts to different people), it is not used.

## Decisions taken (Oct 3, 2026)

Asked to move through these in order, the recommendations below were adopted as the working defaults. They are not final until a named person confirms them in this file.

1. Step 1 ships alone first. Step 2 waits for a reviewed question set.
2. The question set will be written and reviewed by a named person, with sources, the way the Levies guide is handled. Not yet assigned.
3. 3 to 5 questions per area, stated as a sample.
4. The counts live in the side panel and in tables, never in the picture.
5. No overall view.

Status (Oct 3): Step 1 (phase A1) is built. Steps A2 and A3 wait on item 2.

6. (Oct 6, Brent's recorded default) Step 2 is built and tested now, but hidden in the live app until a named person reviews the question set and runs `python build.py --mark-alignment-reviewed "Name"`. Item 2 still stands: nobody has been named, and no review has been recorded.

## Open decisions (as first asked)

1. **Do we ship Step 1 alone first?** Recommendation: yes. It needs no new interpretive text and answers most of the need.
2. **Who writes and reviews the question set?** A named person, with sources, the way the Levies guide is handled.
3. **How many questions per area?** Recommendation: 3 to 5, stated as a sample.
4. **Where does it live?** Recommendation: the Sky's side panel and a table; never the picture itself.
5. **Do we ever want an overall view?** Recommendation: no. If the answer is yes, it needs its own review, because it is exactly the thing the rules rule out.

## What was built (Oct 6, 2026)

### Step 1 before, and where it lives now
On the old Sky (`CX_UsGraph` in `ext/cx-us.jsx`), Step 1 was a "My policy areas" picker (up to five, memory only, `CX_US_AREAS`) and a table of counts (`CX_UsAreaPicker`, `CX_UsAreaCounts`) in two places: the old Sky's side panel for a picked member, and the People page under "Your members". When the new map replaced the old Sky, the side-panel copy went off the page with it; only the People page kept the table. It is now re-homed in the new map, in `ext/cx-align.jsx`, reusing the same picker state and storage behavior (memory only; nothing new is saved; the place picker writes `CX_US_PLACE` and saves only if the person opted in to "Remember my place", as before):
- **A member's sheet and profile:** "In your policy areas". Choose up to five areas; each row reads, for example, "Energy. 6 votes that decided a bill or a nominee. Yea 6, Nay 0, Not voting 0." (Present is added only when there is one), and opens to every one of those votes with "The official record" (the Senate or House roll call) and "The bill on Congress.gov".
- **Compare members:** a fourth item in the desktop left menu (the place the master plan reserved), a button in the phone map's Show panel, a row on the phone's People > Federal ("Compare members by policy area"), and a link from the People page. Who: your members (your state and district), a state, the Senate, or the House; order: by name (last name) or by state, never by a count; 25 rows at a time. A table on a computer, one card per member on a phone.
- The People page now points to Compare members instead of carrying its own copy of the table. The old functions stay in `ext/cx-us.jsx` for the old Sky until it is retired (master plan phase 9).

### Step 2 (A2 and A3): built, hidden until reviewed
- **Hidden:** step 2 is on only when `CX_ALIGN_REVIEW.ok`, which `build.py` sets when `data/alignment-reviewed.json` holds the fingerprint of the current question text (written by `python build.py --mark-alignment-reviewed "Name"`; any edit between the ALIGN-TEXT markers hides it again). Nobody has run it. Until then residents see step 1 only: no question, no answer button, no count, and the question file `site/us/align-2026.json` is never fetched. The browser check turns it on with `window.__cxAlignPreview = true`, set in the page before it loads; nothing in the app sets it, and it is never read from a link, storage, or a cookie (`scripts/test_alignment.js` fails if it is).
- **To turn it on:** a named person reads every question below against its linked sources (and the "what it does not do" lines), changes what is wrong in `ext/cx-align-text.jsx`, runs `python build.py --mark-alignment-reviewed "Their Name"`, rebuilds, and commits `data/alignment-reviewed.json` with the rebuilt `site/`.
- **What it shows, when on:** "How you line up on what you picked" on a member's sheet and profile, and a second line in each cell of Compare members: "You answered the same on 2 of 3 questions you answered that this member voted on." and, always, "Questions you answered that this member did not vote on: 1." A senator is compared only on Senate votes and a representative only on House votes; a question voted on only in the other chamber is listed as not compared. Each question you answered opens to "You: Yes, I support it. This member: Nay." with the roll call. Present and Not voting read "no vote on this"; a member missing from a roll call reads "Not in the roll for this vote"; neither is counted. It depends and Still learning are left out. The review state ("A person has not reviewed these questions yet.") and "This is a sample of 24 questions in 8 policy areas, not everything Congress voted on." show every time step 2 does.
- **What it never does:** no number across areas (the model returns one entry per area and nothing else, and a test asserts it), no percent, no ordering by agreement (the table keeps its order when you answer; a check asserts it), no change to the map (a check compares every node's place, size, color, and shape, and the drawn picture, before and after answering), no party, and nothing in a link, storage, a cookie, or a request (a check compares all of them before and after answering, and records every request).

### Decisions taken while building (for a person to confirm)
1. **Threshold:** an area gets questions only if `data/us-votes-2026.json` has at least **20** votes that decided a bill in it (final passage, or agreeing to a joint or concurrent resolution). Nine areas qualify. **Economics and Public Finance** qualifies but is skipped: nearly all its votes are appropriations, continuing resolutions, budget resolutions, and the reconciliation act, and only one single-subject bill was left (H.R. 4, rescissions), short of 3. **Nominations** have no policy area and are about a person, so they are not used. Below the threshold, and so skipped: International Affairs (18), Immigration (15), Science, Technology, Communications (13), Education (10), Taxation (9), Transportation and Public Works (9), Emergency Management (8), Foreign Trade and International Finance (8), Labor and Employment (6), Health (5), Law (5), and every area with 4 or fewer.
2. **3 questions in each of 8 areas, 24 in all.** Bills voted on in both chambers first, so senators have questions too (14 of the 24 have a Senate vote; Commerce and Armed Forces and National Security have House votes only); single-subject bills only; not chosen by how close the vote was or how anyone voted.
3. **Dropped, and why:** S. 1318 (the House-passed version replaced its text with a surveillance law extension and a ban on a central bank digital currency); H.R. 6047 (expands veterans benefits and raises some home loan fees); the defense authorization acts (H.R. 8800, S. 1071, S. 2296, H.R. 3838); H.R. 471 (many parts); H.R. 21 (we could not write it in words both sides would accept as plain); H.R. 9238 (a second short surveillance extension in the same area); S.J.Res. 82 (no Congressional Research Service summary yet); H.J.Res. 139 (pairs a spending limit with a two-thirds vote for tax increases).
4. **Sources:** every question is written only from the Congressional Research Service summary on govinfo.gov (the bulk BILLSUM files; Congress.gov answers automated reads with 403), read Oct 6, 2026. Where the summary is of the introduced bill and the House voted on its own text, the House-passed text on govinfo.gov was read too and is linked ("The text as the House passed it"); H.R. 1041's passed text adds two sections the introduced summary lacks, and the question says so. Resolutions under the Congressional Review Act carry one shared, linked note (5 U.S.C. 801(b)(2)): a rule overturned this way cannot be issued again in substantially the same form unless a later law allows it.
5. **Leaning words** (`LEANING` in `scripts/test_alignment.js`; none may appear in a question, what it does, or what it does not do): should, must, ought, good, bad, better, worse, best, worst, harmful, helpful, dangerous, safe, unsafe, fight, protect (and protects, protecting, protection, protections), attack, radical, extreme, extremist, common sense, commonsense, sensible, crisis, scheme, scam, rip-off, giveaway, handout, job-killing, woke, illegal alien, slash, gut, war on, freedom, patriot, un-American, so-called, reckless, outrageous, disastrous, burden, burdensome, red tape, overreach, bureaucrats, loophole, big oil, polluters, greedy, elite, weaponize, surveillance state, finally, obviously, clearly, simply, massive, huge. Official names that contain one (the Environmental Protection Agency, the Consumer Financial Protection Bureau) are not our words and are taken out before the scan. Words that would read as a score (score, match, rank, percent, %, best, worst, overall, in total, grade, agreed with you) may not appear anywhere in the feature, in English or Spanish.
6. **Answers:** Yes, I support it; No, I oppose it; It depends; Still learning. A yea is support for what the bill does, a nay is opposition; every question is written as "Do you support [what it does]?", so the direction never flips.

### The question set, for the reviewer
Each row maps to the bill's only deciding vote in each chamber that voted on it (`build.py` and `scripts/test_alignment.js` both refuse anything else). The full text, including "what it does" and "what it does not do", is in `ext/cx-align-text.jsx`.

**Energy**

| # | Question (id) | Bill | Recorded votes it maps to | Written from |
| --- | --- | --- | --- | --- |
| 1 | Do you support overturning the Energy Department's 2024 efficiency standard for gas-fired tankless water heaters used in homes? (`energy-water-heaters`) | H.J.Res. 20 | Senate `s-119-1-207`, 2025-04-10, On the Joint Resolution: Joint Resolution Passed (53 to 44); House `h-119-1-53`, 2025-02-27, On Passage: Passed (221 to 198) | [Congressional Research Service summary, as the law was enacted](https://www.govinfo.gov/bulkdata/BILLSUM/119/hjres/BILLSUM-119hjres20.xml) |
| 2 | Do you support overturning the 2022 management plan for the National Petroleum Reserve in Alaska, which closed nearly half of the reserve to oil and gas leasing? (`energy-alaska-reserve`) | S.J.Res. 80 | Senate `s-119-1-599`, 2025-10-30, On the Joint Resolution: Joint Resolution Passed (52 to 45); House `h-119-1-296`, 2025-11-18, On Passage: Passed (216 to 209) | [Congressional Research Service summary, as the law was enacted](https://www.govinfo.gov/bulkdata/BILLSUM/119/sjres/BILLSUM-119sjres80.xml) |
| 3 | Do you support overturning the 2024 decision that made about 1.2 million acres of the Arctic National Wildlife Refuge's coastal plain unavailable for oil and gas leasing? (`energy-arctic-refuge`) | H.J.Res. 131 | Senate `s-119-1-632`, 2025-12-04, On the Joint Resolution: Joint Resolution Passed (49 to 45); House `h-119-1-295`, 2025-11-18, On Passage: Passed (217 to 209) | [Congressional Research Service summary, as the law was enacted](https://www.govinfo.gov/bulkdata/BILLSUM/119/hjres/BILLSUM-119hjres131.xml) |

**Environmental Protection**

| # | Question (id) | Bill | Recorded votes it maps to | Written from |
| --- | --- | --- | --- | --- |
| 4 | Do you support revoking the federal waiver that let California enforce its Advanced Clean Cars II rules for low-emission and zero-emission vehicles? (`env-california-cars`) | H.J.Res. 88 | Senate `s-119-1-277`, 2025-05-22, On the Joint Resolution: Joint Resolution Passed (51 to 44); House `h-119-1-114`, 2025-05-01, On Passage: Passed (246 to 164) | [Congressional Research Service summary, as the law was enacted](https://www.govinfo.gov/bulkdata/BILLSUM/119/hjres/BILLSUM-119hjres88.xml) |
| 5 | Do you support overturning the Environmental Protection Agency's 2024 rule on the yearly charge for oil and gas facilities whose methane emissions go over set limits? (`env-methane-charge`) | H.J.Res. 35 | Senate `s-119-1-97`, 2025-02-27, On the Joint Resolution: Joint Resolution Passed (52 to 47); House `h-119-1-52`, 2025-02-26, On Passage: Passed (220 to 206) | [Congressional Research Service summary, as the law was enacted](https://www.govinfo.gov/bulkdata/BILLSUM/119/hjres/BILLSUM-119hjres35.xml) |
| 6 | Do you support overturning the Environmental Protection Agency's 2024 limits on hazardous air pollutants from rubber processing at tire plants? (`env-tire-plants`) | H.J.Res. 61 | Senate `s-119-1-232`, 2025-05-06, On the Joint Resolution: Joint Resolution Passed (55 to 45); House `h-119-1-58`, 2025-03-05, On Passage: Passed (216 to 202) | [Congressional Research Service summary, as the law was enacted](https://www.govinfo.gov/bulkdata/BILLSUM/119/hjres/BILLSUM-119hjres61.xml) |

**Public Lands and Natural Resources**

| # | Question (id) | Bill | Recorded votes it maps to | Written from |
| --- | --- | --- | --- | --- |
| 7 | Do you support reopening about 225,500 acres of national forest land in northeastern Minnesota, near the Boundary Waters Canoe Area Wilderness, to mineral and geothermal leasing? (`lands-boundary-waters`) | H.J.Res. 140 | Senate `s-119-2-84`, 2026-04-16, On the Joint Resolution: Joint Resolution Passed (50 to 49); House `h-119-2-38`, 2026-01-21, On Passage: Passed (214 to 208) | [Congressional Research Service summary, as the law was enacted](https://www.govinfo.gov/bulkdata/BILLSUM/119/hjres/BILLSUM-119hjres140.xml) |
| 8 | Do you support overturning the 2024 plan change that ended new federal coal leasing in the Bureau of Land Management's Buffalo Field Office area in Wyoming? (`lands-wyoming-coal`) | H.J.Res. 130 | Senate `s-119-1-623`, 2025-11-20, On the Joint Resolution: Joint Resolution Passed (51 to 43); House `h-119-1-294`, 2025-11-18, On Passage: Passed (214 to 212) | [Congressional Research Service summary, as the House passed it](https://www.govinfo.gov/bulkdata/BILLSUM/119/hjres/BILLSUM-119hjres130.xml) |
| 9 | Do you support overturning the National Park Service's 2025 rule that limited off-road vehicles in parts of Glen Canyon National Recreation Area? (`lands-glen-canyon`) | H.J.Res. 60 | Senate `s-119-1-239`, 2025-05-08, On the Joint Resolution: Joint Resolution Passed (50 to 43); House `h-119-1-110`, 2025-04-29, On Passage: Passed (219 to 205) | [Congressional Research Service summary, as the law was enacted](https://www.govinfo.gov/bulkdata/BILLSUM/119/hjres/BILLSUM-119hjres60.xml) |

**Crime and Law Enforcement**

| # | Question (id) | Bill | Recorded votes it maps to | Written from |
| --- | --- | --- | --- | --- |
| 10 | Do you support permanently placing fentanyl-related substances, as a class, in Schedule I of the Controlled Substances Act? (`crime-fentanyl-class`) | S. 331 | Senate `s-119-1-127`, 2025-03-14, On Passage of the Bill: Bill Passed (84 to 16); House `h-119-1-166`, 2025-06-12, On Passage: Passed (321 to 104) | [Congressional Research Service summary, as the law was enacted](https://www.govinfo.gov/bulkdata/BILLSUM/119/s/BILLSUM-119s331.xml) |
| 11 | Do you support requiring the Justice Department to publish its unclassified records on the investigation and prosecution of Jeffrey Epstein? (`crime-epstein-records`) | H.R. 4405 | House `h-119-1-289`, 2025-11-18, On Motion to Suspend the Rules and Pass: Passed (427 to 1) | [Congressional Research Service summary, as the law was enacted](https://www.govinfo.gov/bulkdata/BILLSUM/119/hr/BILLSUM-119hr4405.xml) |
| 12 | Do you support letting qualified active and retired law enforcement officers carry concealed firearms in more places, including school zones, national parks, and property open to the public? (`crime-officer-carry`) | H.R. 2243 | House `h-119-1-128`, 2025-05-14, On Passage: Passed (229 to 193) | [Congressional Research Service summary, as introduced](https://www.govinfo.gov/bulkdata/BILLSUM/119/hr/BILLSUM-119hr2243.xml); [The text as the House passed it](https://www.govinfo.gov/content/pkg/BILLS-119hr2243eh/html/BILLS-119hr2243eh.htm) |

**Finance and Financial Sector**

| # | Question (id) | Bill | Recorded votes it maps to | Written from |
| --- | --- | --- | --- | --- |
| 13 | Do you support creating federal rules for payment stablecoins, digital assets that the issuer has to exchange back for a fixed amount of money? (`fin-stablecoins`) | S. 1582 | Senate `s-119-1-318`, 2025-06-17, On Passage of the Bill: Bill Passed (68 to 30); House `h-119-1-200`, 2025-07-17, On Passage: Passed (308 to 122) | [Congressional Research Service summary, as the law was enacted](https://www.govinfo.gov/bulkdata/BILLSUM/119/s/BILLSUM-119s1582.xml) |
| 14 | Do you support overturning the Consumer Financial Protection Bureau's 2024 rule on overdraft charges at very large financial institutions? (`fin-overdraft-charges`) | S.J.Res. 18 | Senate `s-119-1-153`, 2025-03-27, On the Joint Resolution: Joint Resolution Passed (52 to 48); House `h-119-1-96`, 2025-04-09, On Passage: Passed (217 to 211) | [Congressional Research Service summary, as the law was enacted](https://www.govinfo.gov/bulkdata/BILLSUM/119/sjres/BILLSUM-119sjres18.xml) |
| 15 | Do you support overturning the Consumer Financial Protection Bureau's 2024 rule that put large payment apps under its supervision? (`fin-payment-apps`) | S.J.Res. 28 | Senate `s-119-1-106`, 2025-03-05, On the Joint Resolution: Joint Resolution Passed (51 to 47); House `h-119-1-95`, 2025-04-09, On Passage: Passed (219 to 211) | [Congressional Research Service summary, as the law was enacted](https://www.govinfo.gov/bulkdata/BILLSUM/119/sjres/BILLSUM-119sjres28.xml) |

**Commerce**

| # | Question (id) | Bill | Recorded votes it maps to | Written from |
| --- | --- | --- | --- | --- |
| 16 | Do you support requiring sellers of tickets to concerts, games, and other events to show the total price, with all fees, from the first time a ticket is shown? (`com-ticket-prices`) | H.R. 1402 | House `h-119-1-107`, 2025-04-29, On Motion to Suspend the Rules and Pass: Passed (409 to 15) | [Congressional Research Service summary, as introduced](https://www.govinfo.gov/bulkdata/BILLSUM/119/hr/BILLSUM-119hr1402.xml); [The text as the House passed it](https://www.govinfo.gov/content/pkg/BILLS-119hr1402eh/html/BILLS-119hr1402eh.htm) |
| 17 | Do you support making safety standards for the lithium-ion batteries and electrical systems in e-bikes and e-scooters mandatory federal rules? (`com-ebike-batteries`) | H.R. 973 | House `h-119-1-103`, 2025-04-28, On Motion to Suspend the Rules and Pass: Passed (365 to 42) | [Congressional Research Service summary, as introduced](https://www.govinfo.gov/bulkdata/BILLSUM/119/hr/BILLSUM-119hr973.xml); [The text as the House passed it](https://www.govinfo.gov/content/pkg/BILLS-119hr973eh/html/BILLS-119hr973eh.htm) |
| 18 | Do you support banning consumer products in which sodium nitrite is one tenth or more of the weight? (`com-sodium-nitrite`) | H.R. 1442 | House `h-119-1-108`, 2025-04-29, On Motion to Suspend the Rules and Pass, as Amended: Passed (378 to 42) | [Congressional Research Service summary, as introduced](https://www.govinfo.gov/bulkdata/BILLSUM/119/hr/BILLSUM-119hr1442.xml); [The text as the House passed it](https://www.govinfo.gov/content/pkg/BILLS-119hr1442eh/html/BILLS-119hr1442eh.htm) |

**Government Operations and Politics**

| # | Question (id) | Bill | Recorded votes it maps to | Written from |
| --- | --- | --- | --- | --- |
| 19 | Do you support requiring documentary proof of U.S. citizenship, such as a valid U.S. passport or a REAL ID that shows citizenship, to register to vote in federal elections? (`gov-voter-citizenship`) | H.R. 22 | House `h-119-1-102`, 2025-04-10, On Passage: Passed (220 to 208) | [Congressional Research Service summary, as introduced](https://www.govinfo.gov/bulkdata/BILLSUM/119/hr/BILLSUM-119hr22.xml); [The text as the House passed it](https://www.govinfo.gov/content/pkg/BILLS-119hr22eh/html/BILLS-119hr22eh.htm) |
| 20 | Do you support overturning a 2025 District of Columbia law that kept several tax changes from the 2025 federal reconciliation act out of the District's tax law? (`gov-dc-tax-law`) | H.J.Res. 142 | Senate `s-119-2-37`, 2026-02-12, On the Joint Resolution: Joint Resolution Passed (49 to 47); House `h-119-2-56`, 2026-02-04, On Passage: Passed (215 to 210) | [Congressional Research Service summary, as the law was enacted](https://www.govinfo.gov/bulkdata/BILLSUM/119/hjres/BILLSUM-119hjres142.xml) |
| 21 | Do you support letting Congress overturn several federal rules in one vote when the rules were sent to it late in the final year of a President's term? (`gov-midnight-rules`) | H.R. 77 | House `h-119-1-41`, 2025-02-12, On Passage: Passed (212 to 208) | [Congressional Research Service summary, as introduced](https://www.govinfo.gov/bulkdata/BILLSUM/119/hr/BILLSUM-119hr77.xml); [The text as the House passed it](https://www.govinfo.gov/content/pkg/BILLS-119hr77eh/html/BILLS-119hr77eh.htm) |

**Armed Forces and National Security**

| # | Question (id) | Bill | Recorded votes it maps to | Written from |
| --- | --- | --- | --- | --- |
| 22 | Do you support extending the government's foreign intelligence surveillance powers under Title VII of the Foreign Intelligence Surveillance Act, including Section 702, until June 12, 2026? (`def-fisa-702`) | S. 4465 | House `h-119-2-155`, 2026-04-30, On Motion to Suspend the Rules and Pass: Passed (261 to 111) | [Congressional Research Service summary, as the law was enacted](https://www.govinfo.gov/bulkdata/BILLSUM/119/s/BILLSUM-119s4465.xml) |
| 23 | Do you support barring the Department of Veterans Affairs from sending a veteran's information to the federal gun background check system solely because the VA pays their benefits to a fiduciary? (`def-va-gun-checks`) | H.R. 1041 | House `h-119-2-190`, 2026-05-21, On Passage: Passed (216 to 201) | [Congressional Research Service summary, as introduced](https://www.govinfo.gov/bulkdata/BILLSUM/119/hr/BILLSUM-119hr1041.xml); [The text as the House passed it](https://www.govinfo.gov/content/pkg/BILLS-119hr1041eh/html/BILLS-119hr1041eh.htm) |
| 24 | Do you support authorizing the Department of Veterans Affairs to carry out a major medical facility project in St. Louis, Missouri, in fiscal year 2026? (`def-st-louis-va`) | S. 2393 | House `h-119-2-180`, 2026-05-20, On Motion to Suspend the Rules and Pass: Passed (405 to 5) | [Congressional Research Service summary, as the law was enacted](https://www.govinfo.gov/bulkdata/BILLSUM/119/s/BILLSUM-119s2393.xml) |
