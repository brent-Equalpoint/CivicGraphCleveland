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

## People and operations

These roles are not named yet. The Bench design needs them, and nothing else here is safe without them.

| Role | Why it matters | Named |
| --- | --- | --- |
| Accountable editor for sources and wording | Owns what the app claims and the source list | Not yet |
| Second reviewer | A different person from whoever wrote a claim | Not yet |
| Publisher | The only person who approves a change to approved records | Not yet |
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

**Gap to close first:** the browser checks and the audit currently live outside the repository, in a
scratch folder. Move them into `scripts/`, make them runnable with one command, and run them in the
nightly job so a bad deploy is caught by a machine as well as a person.

## Plans still to write

- Bench stage 8: how approved records reach the app, and how a correction works.
- People and operations: the roles above, the on-call routine, and what happens after any busy period.
- The "Tell us what is wrong" feature and the correction intake behind it.
- The anonymous insights policy, rewritten for Equalpoint, with the board decisions and counsel review it needs.
- A test and release plan: automated checks for the app, a weekly check for broken source links, and the release routine above as a script.
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
