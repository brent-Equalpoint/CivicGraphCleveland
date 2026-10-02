# Roadmap: how the Cleveland Civic Graph gets built

Written Oct 1, 2026. This is the one page that ties the other plans together. It points to them and does
not repeat them. It assumes no project deadline. Election dates inside the app are content for voters, so
they matter for accuracy, and they do not set the order of the work.

## Where things stand

**Live now** at https://clecivic.vercel.app (Vercel project, repo `brent-Equalpoint/CivicGraphCleveland`).
The nightly job refreshes Council's public record at about 6:17 AM Eastern, commits, and Vercel deploys it.

| Area | State | Detail |
| --- | --- | --- |
| The map, rooms, ballot, constellation, My leaders | Live | `STATE-OF-BUILD.md` |
| Stories (phone and desktop) | Live | `plan-guided-stories.md` |
| Easy mode (phone, and desktop from a header button) | Live | `plan-guided-stories.md` |
| Formal profiles for 15 council members and the Mayor | Live, text not yet reviewed by a person | `plan-profiles.md` |
| Empty, error, not found, offline, and print screens | Live | `plan-screen-states.md` |
| Accessibility fixes from an automated audit | Live, not tested with people | `plan-guided-stories.md`, Phase 5 |
| Nightly official-records refresh | Live and proven once by hand | `.github/workflows/refresh.yml` |
| Bench stages 1 to 7 (packets, approval, commit) | Built and tested, not connected to the app | `bench/README.md` |
| Federal source list and API key | Built (U1) | `plan-us-graph.md` |

**Planned but not built:** the federal graph (U0, U2 to U7), Spanish, real-device and resident testing,
the rest of the screen states, an Easy mode version of profiles.

**Not planned yet:** see "Plans still to write" below.

## Order of work

By dependency and value, not by date. Each step says what "done" means.

1. **Make what exists trustworthy.** A person reviews the profile office text and the three leadership
   roles against Council's own site. Two named reviewers exist for any content that states a fact about a
   person or an election. Someone reads the terms of each federal source. Done when each of these has a
   name and a date next to it in `STATE-OF-BUILD.md`.
2. **Test with people.** VoiceOver on iPhone, TalkBack on Android, NVDA on desktop, switch and voice
   control, and five residents each asked to find "who represents me and what do they do". Pay disabled
   testers. Done when each result is recorded as passed, failed, or not tested, and failures have owners.
3. **Connect the Bench to the app (stage 8).** Run packets nightly, let a named person approve them, and
   have the app read the approved records so "reviewed" means something residents can see. Done when one
   approved packet shows in the app with its sources, its approval date, and its reviewer, and an
   unapproved packet cannot.
4. **Federal graph.** Landscape data, the graph view, votes by category, "Your members" by state and
   district, then the nightly refresh. Done when each phase in `plan-us-graph.md` meets its own check.
5. **Spanish.** Reviewed by a Spanish-speaking resident, then added for stories, Easy mode, and
   navigation. Done when a reviewer signs off and a screen reader switches voice correctly.
6. **More places.** Research state legislature and other city sources first, and write nothing until the
   terms are known. Done when a short source-and-terms note exists for each candidate place.

Steps 1 and 2 can run beside any build work, since they are people and calendar time.

## Every build still needed

**Status, Oct 1, 2026, federal graph:** D2 is built as data (`scripts/fetch_us.py`, nightly, with a safety check) except the reviewed policy-area map, which needs a person. D3 is built for desktop as a preview page (Sky, Index, Linked, Tree, filters, keyboard, text version, axe-clean). D1 was not needed because the component was written fresh, so the question about vcfest.app's source can be dropped unless you want its look matched. D5 (your members, with an Easy mode question) is built. D4 is built for current-Congress votes: member-by-member roll calls from the House Clerk and the Senate, grouped by the CRS policy area of the bill, shown in Your members and in the Easy question (`scripts/fetch_votes.py`, `scripts/test_votes.py`). A Votes by topic view (topic to bills and votes, with your members' casts) is built too. Not built: sponsors on a bill, the topic-to-bodies map (needs a person to write and review it), history before the 119th Congress, D6 (federal packets in the Bench), D7 (testing), the phone layout, and Cleveland on the same component. Source terms are still unread, so the page is labeled a preview.

**Status, Oct 1, 2026, after path C work:** built are C1 (phone story text, announcements, Go deeper, Back to the story), C2 (Easy mode short profile), C3 (desktop blocked-storage notice; the compiled search already says what to do), and C5 (the Mayor's departments and executive order). C4 (offline app shell, with a test that a deploy replaces the saved copy) is built too. Open in path C: C6 (contact details, needs a decision) and C7 (Spanish, needs a reviewer).

**Status, Oct 1, 2026 (paths A and B):** built and tested are A1 to A5, B1 to B4, B6, B8, and B9. Built in part:
B5 (done on Oct 1, 2026: the City Record is the roll call source, `scripts/fetch_cityrecord.py` reads it nightly, and 434 files have a
roll call; a person still has to read the City Record's terms, see `docs/civic-agent/votes-source-research.md`), B7 (the exact approved source
records are kept; raw HTTP bytes are not), and B10 (a rule-based Skeptic is built; agents that read documents
are not). Things that only start working once the workflows are on GitHub: the Checks workflow, the nightly
packets and checks, the failure issue, and the approval and correction workflows. Things that need a person: add
reviewers and publishers to `bench/reviewers.json`, set branch protection, and make the first approvals.
The tables below are the original inventory.

Sizes: S is under one session, M is one to two, L is three or more. "Needs" lists what must exist first.
Nothing here has a date. Items that only a person can do are in the sections below, not in this table.

**A. Release safety**

| # | Build | Size | Needs |
| --- | --- | --- | --- |
| A1 | Move the browser checks and the accessibility audit into `scripts/`, runnable with one command | S | nothing |
| A2 | Run the checks and a two-build hash comparison on every push, and in the nightly job | S | A1 |
| A3 | A release script that performs the seven "shipped" steps | S | A1 |
| A4 | A weekly check that every source link still works, and what a record page says when its source disappears | S | nothing |
| A5 | A "last good update" line, and failure alerts to more than the repository owner | S | nothing |

**B. Trust and review (the Bench)**

| # | Build | Size | Needs |
| --- | --- | --- | --- |
| B1 | Stage 8: the app reads approved records and shows sources, approval date, and reviewer | L | B3 |
| B2 | Run packets in the nightly job, keep approvals, and surface what awaits a decision | S | nothing |
| B3 | A real approval gate: reviewer identity proven by signed commits or an approved pull request, replacing a typed name | M | named reviewers |
| B4 | A small review console for approving, rejecting, and recording dissent | M | B3 |
| B5 | Register the City Record and parse member-by-member votes into packets, so "how they voted" can show real data. Built Oct 1, 2026; terms of reuse still to be read by a person | L | B1 |
| B6 | Keep Legistar's stable person IDs in the snapshot, and use them to resolve people | S | nothing |
| B7 | Store raw source snapshots with hashes where the source allows it | M | nothing |
| B8 | The mistake-report feature ("Tell us"), the intake behind it, and a public correction history | M | B3 |
| B9 | A reviewed-by-a-person step for profile office text, like the existing summary review | S | nothing |
| B10 | Automated Examiner and Skeptic seats that read sources in separate sessions | L | B1, B3 |

**C. Resident experience**

| # | Build | Size | Needs |
| --- | --- | --- | --- |
| C1 | Phone stories: a read-as-text view, a spoken announcement for each frame, and Go deeper and Back to the story links | M | nothing |
| C2 | An Easy mode version of profiles | S | nothing |
| C3 | Empty-result messages in the compiled app's own search box and dictionary, and a blocked-storage message on desktop | S | nothing |
| C4 | A cached app shell so the hosted site opens with no signal, built so no visitor gets an old version after a deploy | M | A2 |
| C5 | Mayor profile depth: the departments the Mayor leads and a sourced list of executive orders | M | nothing |
| C6 | Contact details on profiles, if you decide to show them | S | a decision |
| C7 | Spanish: reviewed copy, a language choice that persists, and screen readers that switch voice | L | a reviewer |

**D. Federal graph** (details in `plan-us-graph.md`)

| # | Build | Size | Needs |
| --- | --- | --- | --- |
| D1 | Get vcfest.app's graph source, or decide to rebuild it, and record CivLab's status | S | an answer from you |
| D2 | Landscape data: bodies, members, committees, categories, and a reviewed policy-area map | L | source terms read |
| D3 | The graph component (Sky, Linked, Tree, Index, filters, keyboard, text version), also giving Cleveland its own node-edge view | L | D1 |
| D4 | Bills and votes by category, with member links | L | D2, D3 |
| D5 | Place picker, "Your members", and three federal stories | M | D2 |
| D6 | Nightly refresh and Bench packets for federal records | M | D2, B2 |
| D7 | Accessibility and testing for the federal views | M | D3 |

**E. Anonymous insights**

| # | Build | Size | Needs |
| --- | --- | --- | --- |
| E1 | The opt-in switch, fixed menu, on-device coin flip, count-only function, public dashboard, privacy notice, and changelog | L | the policy rewritten for Equalpoint, board decisions, counsel review |

**F. Beyond Cleveland and Washington**

| # | Build | Size | Needs |
| --- | --- | --- | --- |
| F1 | Research state legislature and other city sources, terms first | S | nothing |
| F2 | A state graph | L | F1 |
| F3 | A second city | L | F1 |

Totals: 33 builds. Thirteen are small, ten are medium, and ten are large.
C2, C3, C5, and F1 can start any time. D1 can start as soon as you answer it. A and B are built (see the status above).

## People and operations

These roles are not named yet. The Bench design needs them, and nothing else here is safe without them.

| Role | Why it matters | Named |
| --- | --- | --- |
| Accountable editor for sources and wording | Owns what the app claims and the source list | Not yet |
| Second reviewer | A different person from whoever wrote a claim | Not yet |
| Publisher | The only person who approves a change to approved records (`bench/reviewers.json`) | One account is listed: the repository owner. Add the second reviewer there. |
| Correction triage | Decides what happens to a reported mistake | Not yet |
| Maintainer | Keeps the build, the nightly job, and the keys healthy | Not yet |
| Privacy policy steward | Owns the data policy and its yearly review | Not yet |

Today a failed nightly run emails only the repository owner, and the site shows a stale warning after
three days. Decide who else is told, and what they do.

## What "shipped" means

A change counts as shipped only when every step below is done, in this order:

1. Pull first (the nightly job commits to `main`).
2. Build twice from clean and confirm the two hashes match.
3. Run the browser checks and the accessibility audit and read the results.
4. Commit with a one-line message that says what changed for a resident.
5. Push, wait for the Vercel deploy to report success.
6. Confirm the live page has the same hash as the built one.
7. Update `STATE-OF-BUILD.md` with the new hashes, from `dist/build-log.txt`.

`python scripts/release.py` does steps 1 to 6 (and `--push` does 7). The browser checks and the audit are now in `scripts/checks/run.js`. They run on every push (the Checks workflow) and in the nightly job before anything is published.

## Plans still to write

- People and operations: the roles above, the on-call routine, and what happens after any busy period.
- The anonymous insights policy, rewritten for Equalpoint, with the board decisions and counsel review it needs.
- Branch protection and who has write access, since the approval signature is only as strong as the repository's access rules.
- Choosing a member-by-member vote source (B5 needs a person's decision, not code).
- Expansion beyond Cleveland and Washington: states and other cities, after the research step.

## Decisions waiting for you

1. What rules apply to Equalpoint for the practice ballot and the member comparisons? This needs counsel, not a guess.
2. Contact details on profiles: link only (current), or show a sourced phone and email?
3. Easy mode on desktop: opt in (current), or the default for first-time visitors?
4. First federal release: the landscape plus current-Congress votes for your members, with history and money later?
5. Is Spanish required for the first federal release, or after it?
6. Which second place comes after Cleveland, if any?

## Rules that apply to every item

Receipts, not scores. Sponsorship is not a vote, and a missing record is not a no. Official records update
automatically, and anything interpretive needs a person's approval. Nothing personal leaves the browser.
Plain English, no em dashes, no left accent stripes. Both styles and both layouts keep working. A fix lives
in the source or `build.py`, and a delivered file carries its build hash.

## Where everything lives

| Document | What it covers |
| --- | --- |
| `STATE-OF-BUILD.md` | The current build, its hashes, and how to rebuild |
| `README.md` | What each release added |
| `CLAUDE.md` | The rules for working in this repo |
| `docs/plan-guided-stories.md` | Stories, Easy mode, quiet text, accessibility, testing, Spanish |
| `docs/plan-screen-states.md` | Empty, error, old-data, and not-found screens |
| `docs/plan-profiles.md` | Formal profiles for each seat |
| `docs/plan-us-graph.md` | The federal graph |
| `docs/civic-agent/` | The agent pipeline design and the data policy draft |
| `bench/README.md` | What the Bench runs today |
