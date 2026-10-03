# Plan: how you line up with your members of Congress, by policy

Written Oct 3, 2026. A draft for a person to decide on. Nothing here is built, and nothing should be until the open decisions at the end are answered. It is the methodology plan that `docs/plan-federal-map.md` ("Later: an alignment mode") said would come first.

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

Status: Step 1 (phase A1) is built. Steps A2 and A3 wait on item 2.

## Open decisions (as first asked)

1. **Do we ship Step 1 alone first?** Recommendation: yes. It needs no new interpretive text and answers most of the need.
2. **Who writes and reviews the question set?** A named person, with sources, the way the Levies guide is handled.
3. **How many questions per area?** Recommendation: 3 to 5, stated as a sample.
4. **Where does it live?** Recommendation: the Sky's side panel and a table; never the picture itself.
5. **Do we ever want an overall view?** Recommendation: no. If the answer is yes, it needs its own review, because it is exactly the thing the rules rule out.
