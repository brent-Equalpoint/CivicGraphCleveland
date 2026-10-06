# Plan: restructure the phone app

Status: proposed, nothing built, written 2026-10-06 for Brent and the team. It decides where the new pieces live on a phone: the Records feed (`docs/plan-records-feed.md`), the live agenda (`docs/plan-agenda-calendar.md`), and permits, property, and development (`docs/plan-permits-property-business.md`). Line numbers below are from `main` at e20f3f3.

## Brent's ask

A possible plan to restructure mobile, using the organizing ideas he likes on urbynai.com's records page: one consistent card, simple filters (time, type, ward), counts, a map view, and an export.

## The phone today

Five bottom tabs (`TABS`, `ext/cxm-core.jsx` line 365): Today, Explore, My place, People, Ballot. A header with Search, the language button, Aa (dictionary), and Settings, and the Updated strip under it. 25 kinds of bottom sheet (`CXM_SHEETS`, line 421) and seven full screen layers (story, moment, keypad, districts, crush, At City Hall, privacy).

| Tab | What is on it, in order |
|---|---|
| Today | Stories ring (At City Hall's story, Register, Council, Ballot, six issue stories, your ward and neighborhood when set); Set your neighborhood; the election countdown; What's new (3 rows); At City Hall card; City Hall receipts (four groups of up to 4 rows); Close to home; the Easy mode link |
| Explore | "Scroll down to zoom out, from your block all the way to Washington" (`ext/cxm-explore.jsx` line 149); a search bar that opens Search; seven doors (At City Hall, five rooms, the Decision ledger); Resident check; 17 rooms as tiles in six levels with the rail and the guide |
| My place | Who decides here? for one neighborhood (Downtown unless one is set, `ext/cxm-place.jsx` line 40), its own picker, two ward maps, local cards, eight folds |
| People | Profiles, Constellation, Graph; under Profiles, Cleveland and Federal folders; each Cleveland card has Full Story, Profile, and Write |
| Ballot | Register card, dates, Set my districts, levy and issue stories, contests, issues, practice ballot, outcomes, review, Voter education |

## What is clunky, with evidence

1. **City Council records are in four blocks on Today and in many places elsewhere.** Today has What's new, the At City Hall card, City Hall receipts, and Close to home, and three of them are lists of Council files that open the same record sheet. Receipts' "Newest" means the last 30 days (`ext/cxm-today.jsx` line 28) while What's new offers 7 or 45 days. About 19 places open the record sheet. A person cannot tell which list is the one to read.
2. **One thing, many doors; one person, four renderings.** What's new has five doors and At City Hall four. A council member appears as the People card, Full Story (a sheet, not a story), Profile (the neutral fact sheet), and the council room's record, and the labels collide: "Profiles" is the personal card, "Profile" the neutral sheet (the opposite of `docs/plan-profiles.md`, where Profile is neutral and My leaders personal). One legislation file has two different sheets (a room record and the record sheet).
3. **Things are deeper than they should be.** The profile plan's goal is "Every member and the Mayor reachable in two taps" (`docs/plan-profiles.md` line 95); on the phone that holds only for the member shown first (any other member is People, a face, Profile: 3 taps). The ward's Votes & actions is behind a closed fold (2 taps with a ward set, 4 without). A record inside a room is 3 taps.
4. **The tabs do not match how people ask.** "What did Council do?" lives on Today, Explore, My place, and People. Explore is organized by distance, not by topic: the Voting room sits under County and courts while voting is also a tab, and "Ohio and the nation" holds one room while the federal people live under People. My place shows Downtown to someone who never chose it, and there are four place pickers (Today, My place, the ward record, At City Hall).
5. **Ballot is seasonal and the tab bar is not.** Election Day is Nov. 3, 28 days away. Afterwards the Ballot tab keeps its slot, its kicker still reads "Tuesday, Nov. 3", and the levy stories stay in the ring.
6. **Heavy screens.** Words showing before anything opens (`scripts/checks/text-budget.json`): Ballot 902, Today 493, Explore 472, At City Hall 403, My place 371. The plain text plan's ceiling for a list screen is 250.
7. **Links do not work the same on both layouts.** The phone ignores `seat` (the ward record's link address is `?panel=profiles&seat=ward-7`, `ext/cx-record.jsx` line 429, so a copied link loses the member), knows no `profile`, and never writes an address for Settings, Search, a contest, Full Story, Profile, or a letter. The desktop knows `stories`, the phone does not; the phone knows `meetings` and `settings`, the desktop does not.
8. **Small bugs found while reading** (not fixed here): the Register story still leads the ring after the Oct. 5 deadline, because `cxmDaysTo(CX_REG_DATE) <= 7` is also true for every day after it (`ext/cxm-today.jsx` line 135); a `us` sheet is registered but nothing opens it; tapping the Explore tab does not close an open room.

The plans already said it: "Past Today, the phone puts most things in bottom sheets with no clear path between them" (`docs/plan-guided-stories.md` line 19).

## What we borrow from urbynai's records page

One card for every kind of record; three filters (time, type, ward); newest or oldest first; counts in one line; details that open in place; the same list as a map; a download. What we do not borrow is listed in `docs/plan-records-feed.md` (no sources on rows, private names, a "Spotlight" chosen by dollar value).

## Option A: same five slots, regrouped (recommended now)

Bottom tabs: **Today, Records, My place, People, Ballot.**

- **Today:** the stories ring; the next meeting card with its status ("Finance · Upcoming"); **Latest**, three Records cards and "See all records" (replaces What's new and City Hall receipts); Close to home. Two of the four Council blocks go.
- **Records** (Explore's slot): folder tabs at the top, **Latest | Meetings | Rooms**, the chosen one solid blue with white text.
  - Latest: the Records feed (legislation, meetings, roll calls; later permits, property, development), the same card, filters for time, type, and ward, newest or oldest first, counts, Map, and Download.
  - Meetings: the live agenda. At City Hall stops being a separate full page and lives here.
  - Rooms: Explore exactly as it is (the rail, six levels, 17 rooms, the guide). Nothing about the rooms changes.
- **My place:** the same content, plus Map (records near you on the ward map). It opens on your saved place or asks for one, never on Downtown by default; the ward's Votes & actions fold opens by itself when a ward is set.
- **People:** the same three views. The face strip opens a member's Profile in one tap (two from anywhere). Labels follow the profile plan: Profile is the neutral page, My leaders the personal card; "Full Story" becomes "Their record".
- **Ballot:** unchanged until after the election (decision 4).

Where the new pieces live: Records feed, Records > Latest; live agenda, Records > Meetings; At City Hall, Records > Meetings (`?panel=meetings` keeps working); permits, property, and development, Records > Latest as types and a "Building and land" filter, and "Records at this address" on any record.

Cost: about 6 days after the Records feed and the agenda exist. Risk: low. Four of five slots keep their place and name; the rooms are one tap further in (Records, then Rooms), so the Records tab remembers the last folder for the visit (in memory only).

## Option B: Today, Records, Map, People, Ballot (bigger, later)

- **Records:** Latest | Meetings | Who decides (the 17 rooms as a topic list, not by distance).
- **Map:** My place and Explore's zoom levels merged. The map is the screen, starting at your block and zooming out to your ward, the city, the county, Ohio, and the nation (Explore's six levels are already a zoom); records are points; Who represents, ward money, liquor permits, and the ward's record sit in a sheet for the place in view; Find my districts lives here.
- **My place** as a tab goes away; its folds move into Map's place sheet.
- After the election, Ballot can give its slot to whichever tab people use most, decided by watching residents, since we have no analytics by design.

Cost: about 12 to 15 days. Risk: high. The Explore rail and its `explore-bubble` check are rebuilt, My place's eight folds move, muscle memory breaks for two tabs, and many Spanish strings change.

## Screen map, Option A

- Header: Search, ES or EN, Aa, Settings (unchanged); the Updated strip opens Records > Latest with "Changed in the latest pull" on.
- Today
  - Stories ring
  - Next meeting card, to Records > Meetings at that meeting
  - Latest: 3 cards, to Records > Latest
  - Close to home
- Records
  - Latest: filters, counts, cards, Map, Download
  - Meetings: week bar, day tabs, agenda cards, Just decided, Look it up, earlier months
  - Rooms: rail, six levels, 17 rooms, doors (the Decision ledger, Resident check)
- My place: place, ward maps, Map, folds (the ward's record open when a ward is set)
- People: Profiles (Cleveland, Federal), Constellation, Graph
- Ballot: as now

## Moving without breaking links

- Every `?panel=` value the phone reads today keeps working (`ext/cxm-core.jsx` lines 177 to 204): `meetings` opens Records > Meetings; `news` opens Records > Latest with "Changed in the latest pull"; `ledger` opens its sheet over Records > Rooms; `?room=` opens Records > Rooms on that room; `place` and `context` open My place; `leg&file=` opens the record over the current tab. New: `?panel=records`.
- The internal tab id stays `explore` in step 2, so stored state, the rail, and the checks that look for it keep working; only the label changes. It is renamed in code only after every check passes.
- While here, the phone learns `seat` and `profile` (and the desktop `meetings`), so the ward record's profile link and the profile plan's links open the same page on both layouts.
- Nothing personal is added to any address: filters, the ward, and priorities stay out of links.

## Spanish, looks, and rules

New labels (Records, Latest, Meetings, Rooms, Their record) get Spanish in `i18n/manual.json` and stay a draft until a Spanish speaker reads them. Selected tabs and folders are solid blue with white text in both styles, light and dark, never an accent line (`tab-blue`). Receipts, not scores; nothing personal leaves the device; plain English, no dashes.

## Checks to update or add

`shell` and `spanish-switch` (tab names), `tab-blue` (the Records folders), `explore-bubble` (the rail inside Records > Rooms), `city-hall` (a view, not a layer; `?panel=meetings` still lands on it), `people-tabs` (labels, one tap Profile), `stories-deeper` (the At City Hall story's last step), `text-budget` (Today shrinks to about 400; Records gets its own record), `screen-states`, `easy-phone`, `remember-place` (no Downtown default), `design-look` (Today's recorded parts), and the `axe`, `no-bleed`, `text-overlap`, and `targets` page lists. A new check: every `?panel=` value in a fixed list opens the same screen before and after the move.

## Steps, smallest first (each ends with the full gate and screenshots)

Each step can be handed to a frontend agent as written.

1. **Prove it on Today, about 2 days (needs the records plan's phases 1 and 2).** Files: `ext/cxm-today.jsx` (What's new box and City Hall receipts replaced by `CxmLatest`: three `cxRecCard` cards and "See all records"), `ext/cxm-live.jsx`, `scripts/checks/text-budget.json` (recorded lower on purpose). Nothing else moves. Done when: Today's words fall from 493 to about 400, `shell`, `screen-states`, `design-look`, `axe`, and `no-bleed` pass, and `?panel=news` still opens What's new.
2. **Records takes Explore's slot, about 3 days.** Files: `ext/cxm-core.jsx` (the `TABS` label, the `?panel=` table at lines 177 to 222, `?panel=records`), `ext/cxm-explore.jsx` (the room list and rail mounted as the Rooms folder, unchanged inside), `ext/cx-meetings.jsx` (`CxmHall` becomes the Meetings folder), `ext/cxm-live.jsx` (the Updated strip opens Latest). Keep the internal id `explore`. Done when: the new link check (every old `?panel=` and `?room=` lands on the same content), `explore-bubble`, `city-hall`, `tab-blue`, `spanish-switch`, and `stories-deeper` pass.
3. **Fixes that need no decision, about 1 day.** The Register story's lead (`ext/cxm-today.jsx` line 135), My place's Downtown default (`ext/cxm-place.jsx` line 40), one tap Profile from the face strip (`ext/cxm-people.jsx`), `seat` and `profile` read by the phone (`ext/cxm-core.jsx`), and the Explore tap closing an open room. Each gets a check that fails before the fix.
4. **People labels, about 1 day, after decision 3.** `ext/cxm-people.jsx`, `i18n/manual.json`; `people-tabs` updated.
5. **After the election:** decide Ballot's slot and whether to try Option B, with five residents each doing one task on each layout (`docs/plan-guided-stories.md` phase 6).

## Order across the plans

The order that ships value fastest, smallest first:

| # | What | From | About |
|---|---|---|---|
| 1 | The live agenda card, status, week bar, and auto scroll, on data we already pull | agenda plan, phase 1 | 2 days |
| 2 | Latest on Today and Records as a full page (legislation and meetings) | records plan, phases 1 and 2; this plan, step 1 | 3 days |
| 3 | City project applications and demolitions, and "Records at this address" | permits plan, first slice | 2.5 days |
| 4 | Records takes Explore's slot | this plan, step 2 | 3 days |
| 5 | Committee rosters, people on cards, Add to my calendar, the desktop agenda | agenda plan, phases 2 to 5 | 6 days |
| 6 | Development timelines | permits plan, phase 3 | 3 days |
| 7 | County sales and abatements, after the county answers | permits plan, phase 4 | 3 days |
| 8 | After Nov. 3: Ballot's slot and Option B | this plan, step 5 | to decide |

## Decisions needed

1. Option A now and B considered after the election (recommended), or B now, or neither.
2. The tab's name: Records (recommended, Brent's own word), City Hall, or Decisions.
3. People labels: Profile for the neutral page, My leaders for the personal card, "Their record" for Full Story.
4. Ballot after the election: keep the tab in its after-the-election mode until Nov. 10 (when remembered places expire), then give the slot to Records' Map or My place; or keep Ballot until the next election cycle.
5. The At City Hall story and card: keep both (recommended; they are the front door to Meetings), or keep only the card.
6. Approve the first step (Latest on Today) as the proof before anything moves.
