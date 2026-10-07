# Plan: a designed state for every outcome, on every screen

Written Oct 7, 2026, for Brent. **Planning only: nothing in `ext/`, `data/`, `site/` or the checks has changed.** This builds on
`docs/plan-screen-states.md` (Oct 1, v5.16), which got the app a 404 page, a start-up timeout, bad-link notices, helpful empty results,
print styles, a blocked-storage message and an offline banner. That plan covered the first nine kinds of trouble. This one covers every
state a resident can land in, on every screen, and makes the list a check so it cannot drift.

Brent's request: "Create states for every possible outcome. We should probably do that overall for the app, so plan it in stages."
The meaning: for every screen and component, every state a resident can land in is designed on purpose and checked, not left to chance.

What was read: `CLAUDE.md`; `docs/design-standards.md` (sections 2 to 6 and the checks that enforce them); `STATE-OF-BUILD.md` items 40 to 57;
`scripts/checks/run.js` (`screen-states` at line 428, `date-states` at 1316, `AXE_PAGES` at 3872, `open()` at 73, the agenda `agStatus` at 5153),
`scripts/checks/lists.js` and `changed.js`; and the screens in `ext/cxm-*.jsx` and `ext/cx-*.jsx`. There is no check named `empty`: empty results are
asserted inside `screen-states`. `docs/plan-candidate-records.md` does not exist in the repo (see Stage 5). The place design review from earlier in this
session was not on disk where I could read it; its findings are used as Brent summarized them, and each one was re-checked against the code and a
headless run (section 2.4).

## 0. The short version

1. **One standard list of 24 named states** (section 1): 18 about the data or the person's input, 6 about how the screen is shown. Each has a
   plain name, a rule for how every screen shows it, and the words it uses.
2. **Where we stand** (section 2): 48 screens against 14 data states. Of 164 cells that apply, **100 are ok, 55 are weak, 9 are missing**. Against the 7
   display conditions, 28 are ok, 8 weak, 14 missing. The worst places are: loading that never ends or never says it failed (People > Federal, the
   Index, the Tree, the Bench), offline and could-not-load on the federal screens, and the place flow (no way to change or clear a place, no
   confirmation, silent choices).
3. **Fix the design once** (section 3): six small shared components built from the pieces the app already has (`CxmEmpty`, `.cxm-status-line`, `.cxm-notice`,
   the Records error and empty states), a `data-cx-state` marker on each, one loading hook with a timeout, and the rule that every empty or failed state names
   a next step. No new color, size, radius or weight.
4. **One browser check, `states`** (section 4): walks a list of screens by forced states (hang or fail a request, set the clock, go offline, seed or
   clear a place, plant a fault) and asserts each shows a named state with words and a next step, 44 px targets and axe, in dark Bento by default and
   in light, Spanish and Original through the existing lists.
5. **Ten stages** (section 5), about 29 working days in all, each shippable alone with the full gate. Recommended order: 1, then 4 (My place, the most
   visible), then 2, 3, 5 to 10.
6. **Seven decisions for Brent** (section 6).

## 1. The standard states

Every state has one plain name, used the same way in the code (`data-cx-state="..."`), the check list, the docs, and, where a resident reads a word,
the page. The six evidence words the Bench already uses (`SP_STATE` in `ext/cx-seat.jsx:333`, `CX_EVIDENCE_STATES` in `ext/cx-data.jsx:457`: Checked,
Partly checked, Not in the record, Records disagree, May be out of date, Does not apply) are kept and reused as lead words, so a resident meets the same
words on a profile, a vote and a feed card.

Rules that hold for all of them (from `CLAUDE.md` and `docs/design-standards.md`): plain English; no dashes; receipts, not scores; sponsorship is not a vote;
**a missing record is not a no**; nothing personal in a link or request; no left accent stripes; a status is words, not a colored dot; color is never the only signal.

### 1.1 Data and input states (18)

| # | Name | When it applies | How every screen shows it | Never |
| --- | --- | --- | --- | --- |
| 1 | **First run** | Nothing is set yet (place, priorities, answers). | The screen says what it will show once set and offers the one step to set it, in the place the answer is used. Not a pop-up. Skipping is allowed. | Show someone else's example as if it were theirs. |
| 2 | **Loading** | A file or step is under way. | One line of words, `role="status"`, named for what is loading. No spinner and no skeleton, so reduced motion has nothing to turn off. Leaves "loading" within 8 seconds: it becomes **Slow**, then **Could not load**. | Stay on "Loading" with no limit. |
| 3 | **Slow** | Loading passed 8 seconds. | "This is taking longer than usual." with **Try again**. | Hide that something is still pending. |
| 4 | **Ready** | The data is here. | The screen as designed. The only state with no state words. | |
| 5 | **Partial** | Some of the data is missing. | Say how much is shown, which part is missing, why, and where to look. | Show a partial list as if it were the whole. |
| 6 | **Empty** | A search or filter has no results. | Title says what was looked for, the body says why nothing came up, and **one next step button** (Clear the filters, Try a shorter word). | End on a bare blank or on words with no step. |
| 7 | **No record found** | We looked and our sources hold none. | "Not in the record" lead, the sentence "A missing record is not a no.", and the official source to check. | Read as a no, a zero, or "nothing happened". |
| 8 | **Not yet reviewed** | Interpretive text no person has read against its sources. | One line near the text: "A person has not reviewed this yet. It was made from {source}." After review: "Read against its sources by {name} on {date}." | Hide the notice, or word it differently on each screen. |
| 9 | **Stale** | The data is 3 or more days old. | The Updated strip (every screen, `cxm-fresh`, already built) plus, on a screen with its own pull time, one status line "These records were pulled {n} days ago. Newer actions may be on the {official site}." | Claim to be fresher than the pull. |
| 10 | **Offline** | The device has no connection (`navigator.onLine` is false). | What is already open keeps working. A screen that needs a file says "You are offline." with **Try again**. The hosted site's banner says the same. | Blame the website for a lost connection. |
| 11 | **Could not load** | A fetch failed or a file did not arrive while online. | "{What} could not be loaded", the cause in one sentence, **Try again** that asks again (never reloads the whole page), and after two failures also **Reload the page**. | Say "needs the hosted site" when the site is hosted. Show an error code or a stack. |
| 12 | **Held back** | We have the record, a check failed, and we do not show it. | "We are not showing this one", why in one sentence (the existing `legistar_held` wording is the model), "A missing record is not a no.", and a link to the source. | Fix the record by hand. |
| 13 | **Blocked** | A source we are not allowed to show (its terms say no, or a person has not cleared it). | "{Source} cannot be shown here" and a link to read it on their site. | Show a stand-in as if it were the source. (No source is blocked today; the words and the check are made ahead of the first one.) |
| 14 | **Not set** and **Set** | Place, priorities, answers, Remember. | Not set is state 1. Set says what is set in one line, with **Change** and **Clear** within one tap of where the choice is used. | A place that cannot be changed or cleared. A default that looks like a choice. |
| 15 | **Changed or cleared** | The person just set, changed or cleared something. | A notice that says what changed and offers **Undo** (`cxm-notice` with a second button). Announced to screen readers. | A silent change. |
| 16 | **Before, during, after** | A date or event (election phases; meeting Upcoming, Live now, Ended, No outcome recorded). | The phase is computed by one function per domain (`cxElectionPhase`, `agStatus`), never by copy. Each phase has its own words and a next step ("Official results", "Read the minutes"). "No outcome recorded yet" says it is not a sign the meeting did not happen. | Leave a past event's "next" words on screen. |
| 17 | **Over limit** | More than the allowed number (the five priorities, the five policy areas). | The count line says it ("5 of 5 chosen. Skip one to add another.") in the same row as the counter, in view without scrolling; a disabled control says why (`aria-describedby`). | A message below the fold. A disabled box with no reason. |
| 18 | **Conflict** | Two official records disagree (the five May 18 votes). | Lead "Records disagree", then which source says what, which one we show and why, both linked. | Pick a side without saying so. |

### 1.2 Display conditions (6)

These are how a state is shown, so each state above must also hold under them. They are the columns of the second table in section 2.

| # | Name | Rule for every screen | Checked by |
| --- | --- | --- | --- |
| 19 | **Large text and 320 px** | Nothing wider than the screen, nothing cut off, state boxes wrap, 44 px targets. The app's Larger text switch (`cxm-large`) and a 320 px wide screen. | `no-bleed`, `targets`, `states` (matrix pass) |
| 20 | **Reduced motion** | State components have no motion of their own. Anything animated stays still. | `states` (matrix pass), `banners`, `explore-bubble` |
| 21 | **Light and dark** | Every state reads in both, from the generated light look. | `LIGHT` list, `states` |
| 22 | **Bento and Original** | Both styles. | `CHECK_THEME=original`, `states` |
| 23 | **English and Spanish draft** | Every state word has a Spanish entry, labeled a draft. | `SPANISH` list, `test_i18n.py`, `states` |
| 24 | **Print** | State boxes print; Try again and other controls do not. | `print`, `states` (matrix pass) |

## 2. Inventory

### 2.1 How it was done

Code first (file and line), then a headless run of the built `site/` served locally with Chrome through the same tricks `run.js` uses: a fake clock
(`Date` shifted, as `date-states` does), request interception to fail or hang a file (as `open(..., { mock })` does), offline mode, and seeded or empty
storage. Probes are in the session scratchpad (`probe/probe.js`), not in the repo. **One thing the next person must know:** the hosted page installs a
service worker, and it answers requests before the browser's interception sees them. Failing a file only works with the worker bypassed
(`Network.setBypassServiceWorker` through a CDP session). `open()` in `run.js` does not do this today, so the walker must (section 4).

Marks: **ok** = designed, has words and a next step where one is needed; **weak** = exists but unclear, wrong, hidden, or no next step;
**missing** = no state designed. `-` = does not apply. Columns: U first run or not set, L loading, P partial, E empty, N no record found,
R not yet reviewed, S stale, O offline, X could not load, H held back or blocked, D date phase, M over limit, C conflict, K set, changed, cleared.
Ready is not a column: every screen has it, and the existing checks cover it. Cells marked from the code alone are read, not run; the probe
confirmations are listed in 2.3.

### 2.2 Screens by state

| Area | Screen | U | L | P | E | N | R | S | O | X | H | D | M | C | K |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Phone | Today (stories row, place row, countdown, next meeting card) | ok | - | - | - | - | - | ok | - | - | - | ok | - | - | - |
| Phone | Today > Latest (three newest records) | - | weak | - | weak | - | weak | ok | weak | ok | - | - | - | - | - |
| Phone | Today > stories (ring and frames) | - | - | ok | - | - | ok | - | - | - | - | ok | - | - | - |
| Phone | Updated strip | - | - | - | - | - | - | ok | - | - | - | - | - | - | - |
| Phone | What's new (?panel=news) | - | - | - | ok | ok | - | ok | - | - | - | - | - | - | - |
| Phone | Ledger | - | - | - | ok | ok | - | - | - | - | - | - | - | - | - |
| Phone | Search sheet and Dictionary | - | - | - | ok | - | - | - | - | - | - | - | - | - | - |
| Phone | Records > Latest | - | weak | - | ok | - | ok | ok | weak | ok | - | - | - | - | - |
| Phone | Records > Meetings (Next up, week, Look it up) | - | weak | ok | ok | ok | - | weak | weak | weak | - | ok | - | - | - |
| Phone | Agenda calendar (week, status chips) | - | - | ok | ok | ok | - | weak | - | - | - | ok | - | - | - |
| Phone | Records > Rooms and room record sheets | - | - | - | - | ok | - | - | - | - | - | - | - | - | - |
| Phone | Record sheet (?panel=leg) | - | weak | ok | - | ok | ok | - | - | weak | ok | - | - | weak | - |
| Phone | My place (tab) | weak | - | ok | - | ok | - | - | - | - | - | - | - | - | weak |
| Phone | Home picker sheet (set, change, clear) | ok | - | weak | - | - | - | - | - | - | - | - | - | - | **missing** |
| Phone | Ward record (My place) | ok | - | ok | ok | ok | - | - | - | - | - | - | - | - | - |
| Phone | Remember this device (three places) | - | - | - | - | - | - | - | - | ok | - | - | - | - | weak |
| Phone | People > Cleveland (My leaders cards) | ok | - | ok | ok | ok | - | - | - | - | - | - | - | - | - |
| Phone | Profile sheet (Cleveland) | - | - | ok | - | weak | ok | - | - | - | - | - | - | - | - |
| Phone | My priorities sheet | ok | - | - | - | - | - | - | - | weak | - | - | weak | - | weak |
| Phone | People > Common ground | ok | - | - | - | ok | - | - | - | - | - | - | - | - | weak |
| Phone | People > Federal | ok | weak | ok | - | ok | - | weak | **missing** | **missing** | - | - | - | - | - |
| Phone | Federal member sheet | - | weak | - | - | weak | - | - | - | **missing** | - | - | - | - | - |
| Phone | United States map | - | ok | ok | - | - | ok | weak | weak | weak | - | - | - | - | - |
| Phone | United States Index | - | weak | ok | - | - | ok | - | **missing** | **missing** | - | - | - | - | - |
| Phone | United States Tree | - | weak | ok | - | - | ok | - | **missing** | **missing** | - | - | - | - | - |
| Phone | Compare members | ok | weak | - | - | - | ok | - | - | weak | - | - | weak | - | - |
| Phone | Ballot (dates, districts, contests list) | ok | - | - | - | - | - | - | - | - | - | weak | - | - | - |
| Phone | Address finder (districts) | ok | ok | ok | - | ok | - | - | - | ok | - | - | - | - | ok |
| Phone | Contest sheet and choices | ok | - | ok | - | - | - | - | - | - | - | - | - | - | weak |
| Phone | Issue sheet and levy stories | - | - | weak | - | - | ok | - | - | - | - | - | - | - | - |
| Phone | Candidate record sheet | - | - | ok | - | weak | weak | - | - | - | - | weak | - | - | - |
| Phone | Review and worksheet | weak | - | - | - | - | - | - | - | - | - | - | - | - | - |
| Phone | Settings (You sheet) | - | - | - | - | - | - | - | - | ok | - | - | - | - | weak |
| Phone | How this is built (Bench) | - | weak | - | - | - | - | - | - | **missing** | - | - | - | - | - |
| Phone | Privacy policy page | - | - | - | - | - | ok | - | - | - | - | - | - | - | - |
| Phone | Easy mode | ok | ok | - | - | - | - | - | - | weak | - | - | - | - | - |
| Phone | Error boundary (any screen) | - | - | - | - | - | - | - | - | ok | - | - | - | - | - |
| Phone | Bad link and 404 page | - | - | - | - | ok | - | - | - | - | - | - | - | - | - |
| Phone | Hosted shell (slow start, offline banner, blocked storage) | - | ok | - | - | - | - | - | ok | ok | - | - | - | - | - |
| Desktop | Home (map and rooms) | - | - | - | - | ok | - | - | - | - | - | - | - | - | - |
| Desktop | Ledger and Dictionary | - | - | - | ok | ok | - | - | - | - | - | - | - | - | - |
| Desktop | Place page | weak | - | ok | - | - | - | - | - | - | - | - | - | - | weak |
| Desktop | Leaders and Profiles | ok | - | - | - | weak | ok | - | - | - | - | - | - | - | - |
| Desktop | Ballot and levies | ok | - | - | - | - | ok | - | - | - | - | weak | - | - | - |
| Desktop | What's new | - | - | - | ok | - | - | ok | - | - | - | - | - | - | - |
| Desktop | United States (map, Index, Tree) | - | ok | ok | - | - | ok | weak | weak | weak | - | - | - | - | - |
| Desktop | Record page (?panel=leg) | - | weak | ok | - | ok | ok | - | - | weak | ok | - | - | weak | - |
| Desktop | Story reader | - | - | - | - | - | ok | - | - | - | - | ok | - | - | - |

**Counts: 48 screens, 164 applicable cells: 100 ok, 55 weak, 9 missing.**
By column (ok / weak / missing): U 14/3/0, L 5/11/0, P 18/2/0, E 10/1/0, N 16/4/0, R 15/2/0, S 6/5/0, O 1/5/3, X 7/8/5, H 2/0/0, D 5/3/0, M 0/2/0, C 0/2/0, K 1/7/1.
Plainly: what we do well is **partial, no record found, not yet reviewed and empty** (the honesty rules are built in). What is weak is **loading, could not
load, offline, and set/changed/cleared**. No screen shows an over-limit sentence where the person is looking, and conflict has no name.

Display conditions, by group of screens (a check exists and passes, weak = some screens, missing = none; `-` = does not apply):

| Group | Large text | 320 px | Reduced motion | Light and dark | Bento and Original | English and Spanish | Print |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Today and stories | missing | weak | weak | ok | ok | ok | missing |
| Records (Latest, Meetings, Rooms) | missing | ok | ok | ok | ok | ok | weak |
| My place and its sheets | missing | missing | - | ok | ok | ok | missing |
| People (Cleveland, Common ground, Federal) | missing | missing | - | ok | ok | ok | missing |
| Ballot, candidates, address finder | missing | weak | - | ok | ok | ok | missing |
| United States map, Index, Tree | weak | ok | ok | ok | ok | ok | missing |
| Sheets and overlays (record, profile, What's new, ledger, search, settings) | missing | missing | - | ok | ok | ok | weak |
| Desktop pages | - | - | weak | ok | ok | ok | weak |

**Counts: 56 cells, 28 ok, 8 weak, 14 missing, 6 not applicable.** The cause is plain: layout checks run at 390 px and desktop width; 320 px runs on
three phone pages, the Tree and the issue stories; the in-app Larger text is exercised only on the map; print is checked on Profiles and the Ledger.
Light, dark, both styles and Spanish are well covered because `LIGHT` and `SPANISH` in `scripts/checks/lists.js` run over `AXE_PAGES`.

### 2.3 What is wrong or weak, with evidence

Probe results are marked **(run)**; the rest are read in the code.

**Loading that never ends, or never says it failed**
- People > Federal stays on "Loading the people in Washington..." if the landscape file fails (`ext/cxm-federal.jsx:21`; no failure branch; `cxUsLoad()` returns null and nothing reads it). **(run: blocked file, 2.5 seconds later it still says Loading.)**
  The member sheet does the same at `cxm-federal.jsx:122`.
- The Index shows "Loading the votes..." in the Policy areas group with no failure path (`ext/cx-us-index.jsx:78`, `:448`), as do the Tree and
  Compare members (`ext/cx-align.jsx:131`, `:210`): a failed votes file reads as loading forever.
- No loader has a time limit. `cxRecsGet` (`ext/cx-records.jsx:25`), `cxMtgLoad` (`ext/cx-meetings.jsx:13`), `cxUsLoad`/`cxUsVotesLoad`
  (`ext/cx-us.jsx:14`, `:22`) and `cxRecLoad` (`ext/cx-record.jsx:25`) call `fetch` with no timeout. **(run: a hung records file still says "Loading the records." after 10 seconds.)**
- The Bench (`useBench`, `ext/cx-seat.jsx:328`) shows nothing while loading and nothing on failure, so a person sees an empty Bench section.

**Could not load, offline and the wrong cause**
- Records > Meetings, when the hosted file fails, says "The meeting record needs the hosted site. It is not part of the offline file." (`ext/cx-meetings.jsx:629`)
  with no button. That sentence is true only for the single offline file. **(run: shows on the hosted site with the file failed.)** The United States
  screens (`cx-us.jsx:730`, `cx-us-map.jsx:1650`) and Easy mode (`cxm-easy.jsx:185`) do the same.
- Records > Latest does it well: title, cause, **Try again** that asks again (`cx-records.jsx:214-217`). **(run.)** This is the model for the shared component.
- Today > Latest says "could not be loaded" both when the file failed and when the file loaded with no rows that qualify (`ext/cxm-today.jsx:30`): the empty case
  is worded as a failure. Its failure words and the "See all records" step are fine. **(run: failed fetch gives "The latest records could not be loaded here. See all records to try again.")**
- The Record sheet and the desktop record page show the legislation record without names when the votes file fails (`ext/cx-record.jsx:136-141`): the
  votes section is silently thinner, with no "could not load" and no retry.
- Offline after load: the hosted banner appears and says the right words **(run: offline mode shows "You appear to be offline...")**, but a screen that then
  tries to load a file shows the same text as any failure, with no mention of being offline.

**Stale**
- The Updated strip appears at 3 days or more **(run: "Updated Oct 7 · 4 days ago  Newer records may exist")** and is the only freshness signal for every
  dataset. It is read from one date (`CX_UPDATES.updated`, `ext/cx-live.jsx:57`). The meeting record, the records file, the votes file and the federal files have their own pull times.
  Meetings shows its pull time only in the footer (`ext/cx-meetings.jsx:649`), and its Upcoming, Live now and Ended chips are worked out from the clock against a file that
  may be days old. **(run: 4 days old, the Records and Meetings pages show no stale line of their own.)**

**Set, changed, cleared (the place and priorities review, re-checked)**
- No way to change or clear a place once set. The home picker (`ext/cxm-core.jsx:666`) opens from Today's "Set your neighborhood" row, My place's
  "Set this as my place", the ward record, and Meetings > For you, and each of those shows only while no place is set (`cxm-today.jsx:116`, `cxm-place.jsx:64`). The only
  "Clear my place" lives inside the picker (`cxm-core.jsx:697`). **(run: after choosing Downtown the Today row is gone and nothing says how to change it.)**
  A person with a ward set can change it only by using the My place tab's neighborhood list, which changes the place by itself (item 52).
- No confirmation after choosing: the sheet closes at once (`cxm-core.jsx:682`) and nothing says what was set. **(run: no status text, sheet gone.)**
- Split-ward neighborhoods set silently: `cxmHoodWard` (`cxm-core.jsx:102`) takes the ward with the largest share and sets it, with no word that the
  neighborhood spans wards. My place shows the "it's complicated" line only when browsing (`cxm-place.jsx:70`).
- Priorities limit message is hidden: `setLevel` returns "Choose up to five priorities. Change or skip one before adding another." (`cxm-core.jsx:157`), but it is
  drawn after the whole list of tiles (`cxm-more.jsx:223`). **(run: the sixth pick puts the message 2,658 px down a 844 px screen, 1,800 px below the tile that was tapped.)**
  The counter row at the top says "5 of 5 priorities selected" and nothing else. Compare members disables the other checkboxes at five (`cx-align.jsx:137`) with no sentence beside them.
- Two Remember switches: "Remember this device" for the place (`CxmRememberPlace`, `cxm-core.jsx:275`, shown in the picker, Settings and People > Federal) and "Remember on
  this device" for priorities (`cxm-more.jsx:238`). The success message is for screen readers only; only a failure is drawn (`cxm-core.jsx:287`). In Settings the place switch
  shows with no place set.
- My place shows Downtown as if it were yours: `const hood = placeHood || home?.hood || 'Downtown'` (`cxm-place.jsx:40`; the desktop page defaults the same, `cx-place.jsx:143`). **(run: no place set,
  My place opens with the heading "Downtown." and a "Set this as my place" link.)**

**Dates and phases**
- Election phases are handled on Today (countdown reads "Done"), the Ballot dates (Passed, Today, Next, Has begun) and the Register story; `date-states` forces the clock for the
  dates. The rest of the Ballot is not phase-aware **(run, 30 days after: the kicker still says "Tuesday, Nov. 3 · Polls open 6:30 a.m. to 7:30 p.m." and the lede "Take your
  time.")**; "Set my districts" and the practice-ballot choices read the same after the election, and a candidate record has no phase.
- The meeting statuses (Upcoming, Live now, Ended, No outcome recorded yet) are the best-designed date state in the app (`ext/cx-meetings.jsx:456-487`, with a "How the status works" drop-down). Their
  checks (`agenda-calendar`) force the clock. They lack the stale caveat above.

**Candidates**
- "No reviewed policy record loaded yet." (`ext/cxm-ballot.jsx:373`) reads as a loading problem ("loaded"), and it sits under the heading "Evidence, then possibilities" with a paragraph
  that promises examples. The truth is "no record on file", which is the No record found state (state 7), plus a next step (the official candidate entry, already linked below it). There is no
  not-found state in the app for a missing candidate. "A detailed plain-language review is not loaded for this issue" (`cxm-ballot.jsx:208`) has the same wording problem.

**Not found, with no next step**
- "We could not find that seat." (`ext/cx-seat.jsx:116`, `ext/cxm-easy.jsx:28`) and "We could not find that member." (`ext/cxm-federal.jsx:123`) are bare paragraphs. A bad profile seat in a link
  (`?panel=profiles&seat=ward-99`) opens People with no notice at all (`cxm-core.jsx:202` falls through to the table).

**Conflict**
- The five files where the City Record and Legistar disagree (652, 655, 660, 663 and 667-2026 on May 18: Joseph T. Jones is Absent in the City Record and Yea in Legistar) show a quiet line
  after the names (`ext/cx-record.jsx:129`, words at `ext/cx-votes-text.jsx:43`). The words are good; there is no lead word and no label that tells a resident this is a disagreement between records.

**Done well, to keep and copy**
- Records > Latest (loading words, failure with retry, empty with Clear the filters, review line, per-card pull date and source); the address finder (`ext/cx-districts.jsx:130-188`: loading, not found,
  bad input, pick, error, each with a sentence and a step); the meeting statuses; the held-back vote words; the error boundary (`CxBoundary`, `ext/cx-live.jsx:238`: names the part, says choices are safe, four ways out);
  the hosted shell (404 page, slow start, offline banner, blocked storage: `build.py:410-466`); the review notices on levies, offices, votes, the US text and the privacy policy; the "No record is not a no"
  lines on What's new, the ward record and the profile cards. All nine existing empty states carry an action (counted: 9 of 9).

### 2.4 Headless runs, in one place

All against the built `site/` at 390 by 844, dark Bento, English. Results are quoted above. Not run: light, Original, Spanish, 320 px, large text, or a real phone.
The probes found one thing worth fixing in the harness itself: **request interception does not reach the hosted page while its service worker is in
control**, so a "failed file" test passes silently unless the worker is bypassed. That is a trap for the new check, and it is built into section 4.

## 3. The fix, once

### 3.1 Principle

Six shared components in `ext/cx-live.jsx` (shared desktop and phone logic, and where `CxBoundary` already lives; it loads before every `cxm-*` file, so no
change to the file list in `build.py`). They are thin wrappers over what exists. `CxmEmpty` (`cxm-core.jsx:705`) and `CX_Empty` (`cx-ui.jsx:830`) become aliases of one
`CxState`, so no call site has to change in Stage 1, and the two markups stay (`.cxm-empty` on the phone, `.cx-empty` on the desktop) so no screen is redrawn.
**No finished visual moves** (`dont-change-what-is-beautiful`): `design-look` must pass unchanged for every existing screen in Stage 1.

| Component | What it is | Built from | `data-cx-state` |
| --- | --- | --- | --- |
| `CxState({ state, title, body, actions })` | The base: a titled box with words and buttons, `role="status"`. | `.cxm-empty` / `.cx-empty` | the state's name |
| `CxEmpty` | Empty results: what was looked for, why, one step. | `CxmEmpty` as it is | `empty` |
| `CxNotFound({ what, next })` | No record, page, member or seat: "We could not find {what}", "A missing record is not a no" where it applies, one step. | `CxmEmpty` | `notfound` |
| `CxFail({ what, retry })` | Could not load, Slow and Offline in one: picks its words from `navigator.onLine` and the elapsed time. **Try again** calls `retry`. | Records' error box (`cx-records.jsx:214`) | `failed`, `slow` or `offline` |
| `CxStale({ ago, source, href })` | One status line for a dataset's age. | `.cxm-status-line` (`cxm-live.jsx:72`) | `stale` |
| `CxNote({ text, undo })` | A short notice that says what just changed, with optional **Undo**. | `.cxm-notice` (`cxm.css:852`), second button in the same style | `note` |

Smaller pieces on the same pattern, same markup, no new look: `CxReview` (the one review line, in place of nine hand-built ones; it keeps each feature's words and the review flag it reads),
`CxHeld` and `CxBlocked` (status lines with the Held back and Blocked words), and `CxConflict` (status line with the Records disagree lead).

**One loading hook, `useCxLoad(store)`**, in the same file. `store` is the `{ p, v, done }` object each loader already has (`CX_RECS`, `CX_MTG`, `CX_US`, `CX_USV`, `CX_REC`).
It returns `loading`, `slow`, `ready`, `failed` or `offline`. The 8-second limit is its own timer (a test can set `globalThis.__cxLoadTimeout` to shorten it). Retry is
`store.retry()`: each loader gains a retry function that resets `p` and `done` and asks again, the way Records' button already does by hand. The loaders themselves gain an `AbortController`
timeout at 12 seconds so a hung request ends as a failure (these are the only changed `fetch` lines).

### 3.2 The rule

**Every empty, failed, not-found, offline, held-back and blocked state names the next step.** Enforced two ways: `scripts/test_states.js` scans `ext/*.jsx` and fails if a `CxEmpty`,
`CxmEmpty`, `CX_Empty`, `CxNotFound`, `CxFail`, `CxHeld` or `CxBlocked` is used without `actions` (today: 9 of 9 pass), and the `states` check asserts a button or link inside the state box
in the browser. A state box also has a title and a body of six or more words.

### 3.3 The words

All plain English, no dashes, no scores. `{x}` are placeholders for the translator. Each is one string, so Spanish can reorder it. "Next step" is the button or link.

| State | Title or lead | Body | Next step |
| --- | --- | --- | --- |
| First run | none | "{What you will see once this is set}. {Why we ask}." Example (exists): "See your ward, council member, and receipts." | "Set your neighborhood", "Choose priorities" |
| Loading | none | "Loading {what}." | none |
| Slow | "This is taking longer than usual" | "Your connection may be slow." | "Try again" |
| Partial | "Partly shown" | "{n} of {total} {things} are shown. {Why the rest are not}. A missing record is not a no." | "See where we looked" (link) |
| Empty | "No {things} match {what was chosen}" | "{What was looked at}. That is not the same as nothing happening." | "Clear the filters" or "Try a shorter word" |
| No record found | "Not in the record" | "We found no {record} for {who}. Our sources hold none. That is not the same as no. A missing record is not a no." | "Check the official source" (link, source named) |
| Not yet reviewed | none | "A person has not reviewed this yet. It was made from {source}." After review (exists): "Read against its sources by {name} on {date}." | the source link |
| Stale | none | "These records were pulled {n} days ago. Newer actions may be on the {official site}." (exists) | the official site |
| Offline | "You are offline" | "This needs a connection. What you have already opened still works." | "Try again" |
| Could not load | "{What} could not be loaded" | "This page reads {what} from this website, and it did not arrive. Check your connection, then try again." (exists) | "Try again"; after two failures also "Reload the page" |
| Held back | "We are not showing this one" | "We have a record for it, but a check did not pass, so it is held back. A missing record is not a no." | "Read it at the source" |
| Blocked | "{Source} cannot be shown here" | "{Source} does not let us show {what}. You can read it on their site." | "Open {source}" |
| Set | none | "Your place is {Hough, Ward 8}." | "Change", "Clear" |
| Changed or cleared | none (a notice) | "Your place is now {Hough, Ward 8}." or "Your place is cleared." | "Undo" |
| Date phase | "{Event} is {in n days, today, over}" | per domain; "No outcome recorded yet. That is not a sign it did not happen." | "Official results", "Read the minutes" |
| Over limit | none (the count line) | "{n} of {n} chosen. Skip one to add another." | none (the controls are right there) |
| Conflict | "Records disagree" | "{Source A} lists {X}. {Source B} lists {Y}. We show {A}, and say so." | both sources linked |

Lead words come from the Bench's six where one fits (Not in the record, Records disagree, May be out of date, Partly checked). The text that stays interpretive (Held back,
Conflict, No record found) is new copy and needs Brent's review. **Keep new state words outside the marker blocks** in `cx-votes-text.jsx`, `cx-offices-text.jsx`, `cx-seat.jsx`
(OFFICE-TEXT) and `cx-us-text.jsx`: editing between a marker resets that text's review flag and would need a new `--mark-*-reviewed`. State words live with the components.

### 3.4 Tokens

None new. The components use what the app has: card `--tile2` (`.cxm-empty`), status `--tile` (`.cxm-status-line`), notice `--tile2` (`.cxm-notice`), radius 14, text 17 and 16 and 14 px, weight 600 on the lead and the
buttons, `.cxm-btn2` for buttons, 44 px targets (`target.min`), `--mut` for quiet text. A status is words with no dot, per the design rule; the existing amber dot on the Updated strip stays as it is (it is
the strip's own, with words beside it). Contrast, color vision and `design-look` are the proof: `node scripts/design/audit.js` must pass with no change to `design/tokens.json`.

## 4. The check strategy: `states`

### 4.1 The marker

Every state component stamps `data-cx-state="<name>"` on its box (the names in 1.1: `loading`, `slow`, `empty`, `notfound`, `review`, `stale`, `offline`, `failed`, `held`, `blocked`, `unset`,
`set`, `note`, `phase-*`, `limit`, `conflict`). The marker is an attribute, so it draws nothing and changes no look. Screens that already show a state by hand are moved onto the components as their stage runs; until then their row in the
list carries a text matcher instead of a marker (so the check can start in Stage 1 on screens that are not converted yet).

### 4.2 The list, in one file

`scripts/checks/states.js` exports `STATES`, one row per screen:

```
{ id: 'records-latest', url: '/?panel=records#phone', open: { mobile: true, easy: false },
  states: {
    loading: { hang: ['/records/records-2026.json'], timeout: 1500, expect: ['loading'], then: ['slow', 'failed'] },
    failed:  { block: ['/records/records-2026.json'], expect: ['failed'], retry: true },
    offline: { offline: true, expect: ['offline'] },
    empty:   { act: 'wardOneLast7', expect: ['empty'] },
    stale:   { clock: '+4d', expect: ['stale'] },
  },
  matrix: ['w320', 'large', 'reduced', 'print'] }
```

Forcing tools, all already in `run.js` or one line from it: `hang`, `block` and a `status` option added to `open()` next to `mock` (with the service worker bypassed, 2.4); `clock` (the fake-`Date` helper `date-states`
and `AG_AT` use, moved to one shared function); `offline` (`page.setOfflineMode`, then trigger a load); `seed` (localStorage, as `VA_WARD7_PRE`); `act` (named steps, like `AXE_AFTER`); `timeout` (sets
`globalThis.__cxLoadTimeout` before the page starts, so a hang is seen to leave `loading` in 1.5 s, not 8). The list is also where a state is declared **not applicable** (`na: 'static data'`) so every cell of the table in section 2 is either a row or a reason.

### 4.3 What it asserts, for every screen by state

1. **A named state.** Exactly the expected `data-cx-state` is present in the screen's region, and for `loading` it is gone, replaced by `slow` or `failed`, within the timeout. Not blank (the screen has at least 40 characters of its own words beyond the tab bar), not "loading" forever, not an unexplained box.
2. **Words.** A title or lead; a body of six or more words for empty, failed, offline, notfound, held, blocked; no em dash or en dash; no score or ranking word (`RF_SCORE`, `RF_SCORE_ES`); "A missing record is not a no" where the state is notfound, partial or held.
3. **A next step.** A button or link inside the box for empty, notfound, failed, offline, slow, held, blocked, and a working one: clicking Try again calls the loader again (the request count rises, and when the block is lifted the screen becomes ready).
4. **No error text.** No stack, file name, line, "undefined", "NaN", "[object", "Error:", "TypeError", or raw status code in the screen; the error boundary shows its sentence only.
5. **Look.** Buttons at least 44 by 44 px; no left accent stripe on the box (border-left width equals the others); `axeBad(p)` limited to the box's region (reuse `axeBad`); no sideways scroll; `pageExpect` (no console errors from the page, no request to another site, no CSP report).
6. **Announced.** `role="status"` (or `alert` for the boundary); focus is not stolen except where Show more moves it on purpose.
7. **Set and changed states.** After the action, a `note` with an Undo shows; Undo restores the earlier value; the **Change** and **Clear** doors exist; nothing personal reaches the address, storage (beyond what Remember allows), or a request (reuse the `records-feed` and `remember-place` comparisons).
8. **Over limit.** After the sixth pick, the limit sentence is inside the viewport (`getBoundingClientRect().top` between 0 and `innerHeight`) and the other controls say why they are off.
9. **Phases.** For each clock in the list, the phase word the domain function names appears; for the agenda, the four statuses are read from `agStatus` run on the record, never typed in.
10. **Conflict.** On the five May 18 files: the lead "Records disagree", both sources named, the shown one named; the record's `differs` list read from `data/votes-2026.json`, so a sixth difference needs no edit.

### 4.4 Where it runs

- **Default:** dark Bento, 390 by 844, English. About 140 forced states across the screens at the end of Stage 9, each about 3 seconds: shard by area (`states-records`, `states-place`, `states-people`, `states-ballot`, `states-us`, `states-desktop`) so the pool (`scripts/checks/pool.js`) runs them side by side in under 3 minutes. Each shard is a name in `run.js` and in `lists.js`.
- **Light, Bento and Original:** add `states` (the shards) to `LIGHT` in `lists.js`.
- **Spanish:** add them to `SPANISH`; the check also asserts every state word is in `i18n/es.json` (no English left in the box) using the dictionary the Spanish layout checks already load.
- **Matrix pass** (`CHECK_STATES=matrix`, run by the full gate and not the fast lane): the rows that declare `matrix` rerun at 320 by 640, with Larger text on (`cxm-large`), with reduced motion (`prefers-reduced-motion`), and in print emulation (`emulateMediaType('print')`: the state box prints, Try again does not).
- **Fast lane:** `changed.js` maps `.cxm-empty`, `.cx-empty`, `.cxm-notice`, `cxm-status-line` and `data-cx-state` to the shards, so a CSS or wording change to a state runs exactly them.

### 4.5 Keeping it honest

- **The list covers every screen, enforced.** `scripts/test_states.js` (a unit test, in `release.py` and CI) reads the screens from the code (`CXM_SHEETS` keys, the phone's tabs and folders, the `?panel=` table in `cxmFromUrl`, `CX_PANELS_KNOWN`) and fails if any has no row in `STATES`
  and no `na:` reason, and fails if a state name used in `ext/*.jsx` is not in the standard list in 1.1, or if a state in 1.1 appears in no row. A new screen cannot ship without a state row, which is the rule "a bug becomes a check" made automatic.
- **Plant a fault.** `STATES_PLANT=<fault>` mutates the page just before the assertions, and `node scripts/checks/run.js --only states-records --selftest` runs every plant and requires each to fail: `blank` (empties the box), `forever` (re-adds `loading` after the timeout), `noaction` (removes the buttons), `stack` (writes "TypeError at cx.js:12" in the box), `dash` (adds an em dash), `score` (adds "ranked"), `small` (sets a button to 30 px), `stripe` (adds a left border), `norecover` (makes Try again do nothing). The same pattern the `records-feed`, `explore-bubble` and `alignment` checks already use ("failed on a planted off-by-one day").
- **A bug found later is one new row**, plus a plant if it shows a new kind of miss.

## 5. The stages

Each stage is shippable alone with the full gate (`python scripts/release.py`, about 12 minutes plus the new shard). Effort is working days for one builder with the gate waits included, not calendar time.
**The fast lane is not available for any whole stage**: every stage adds rows to `scripts/checks/states.js`, and `changed.js` refuses anything under `scripts/checks/` (the gate checks itself). Pieces that can use it are named per stage, and only after the rows are in main. A changed line with `fetch(` or storage (`PRIVATE_LINE`) also always takes the full gate.
Recommended order: **1, 4, 2, 3, 5, 6, 7, 8, 9, 10** (the numbers follow the areas in Brent's request; My place is second in time because it is the most visible and the least finished).

### Stage 1: shared components and the `states` harness, on two screens (4 days)
- **Scope.** `CxState` and its five siblings and `useCxLoad` in `ext/cx-live.jsx`; `CxmEmpty` and `CX_Empty` become aliases; `data-cx-state` on every existing empty and failed box; the loader retry and 12-second timeout in `cx-records.jsx`, `cx-us.jsx`, `cx-meetings.jsx`, `cx-record.jsx`; the check: `scripts/checks/states.js`, the runner and the new `open()` options in `run.js` (hang, block, status, service worker bypass, offline, clock), `scripts/test_states.js`, the plants, the shard names in `lists.js`, `changed.js` rules; a new section in `docs/design-standards.md` ("States": the list in 1.1, the rule in 3.2) and the standard list from this plan moved into it. Two screens as proof: **Records > Latest** (already good: proves nothing moves) and **People > Federal** (the worst loading failure: proves the fix).
- **States added.** Records > Latest: slow and offline words (it already has loading, failed, empty, stale through the strip). People > Federal: slow, could not load, offline, with Try again, and its member sheet.
- **Checks.** `states` (2 rows, about 12 forced states), `test_states.js`, the plants, `design-look` unchanged (the proof of no redraw), `screen-states` (still passes: the phone empty search wording is unchanged), `text-budget` (a few words, recorded on purpose), `perf-budget` (re-recorded; the hook is small), `axe`, `no-bleed`, `targets` in light and Spanish.
- **Spanish.** About 16 strings (the table in 3.3, minus those that exist). Add to `i18n/manual.json`; `inventory.js`, `merge.js`, `test_i18n.py`, `crawl.js`. Draft until a Spanish speaker reads it.
- **Risks.** The service worker (above) makes forced failures look like they work when they do not: the harness must assert the request was really blocked. A new `fetch` timeout could abort a slow but good load on a poor connection: 12 seconds, retry is one tap, and the old behavior (never time out) is what leaves people stuck. The alias step must not change a pixel.
- **Brent reviews.** The state list and names (1.1), the words (3.3), and the two screens on a phone: Records, and People > Federal with the connection cut (airplane mode on the live page works for this).

### Stage 2: Records and Latest (3 days)
- **Scope.** Today > Latest, Records > Latest, What's new, Ledger, Search, the Record sheet (and the desktop record page it shares code with), the Updated strip.
- **States added.** Today > Latest: separate empty (no qualifying rows) from could not load; slow and offline words; a review line (the cards say the words are ours; Today shows none). Record sheet: **partial with retry** when the votes file fails ("The votes for this record could not be loaded", **Try again**), and a clear **No record found** where `cxRecNoNames` explains an empty vote. **Conflict:** the lead "Records disagree" and a link to both readings on the five May 18 files. **Stale:** a status line on Records and the Record sheet with the records file's own pull time (`data.retrieved_at`).
- **Checks.** Rows for each; the conflict row reads the five from `data/votes-2026.json`; `records-feed`, `records-changed`, `votes-actions` and `council-votes` still pass; `text-budget` re-recorded.
- **Spanish.** About 14 strings. The conflict lead and the partial words are interpretive-adjacent: put them outside the `cx-votes-text.jsx` markers.
- **Risks.** Records is the most-checked screen: `records-tab`, `records-feed` and `people-tabs` assert exact structure, and `design-look` the exact look, so every edit must keep them green. The stale line must not duplicate the Updated strip: the strip stays global, the line appears only on a screen with its own pull time.
- **Brent reviews.** The conflict wording (it is about a named member's votes: it says what each record lists and does not judge), and the partial and stale words.

### Stage 3: Meetings and the calendar (2 days)
- **Scope.** Records > Meetings, the agenda calendar, the Today next-meeting card, At City Hall story.
- **States added.** The hosted-failure sentence is replaced by Could not load with **Try again** (the "needs the hosted site" sentence stays only for the offline file, chosen by `location.protocol`); offline; **stale with the Live now caveat** ("As of the pull on {date}. Statuses are worked out from the clock.") when the meeting file is 3 or more days old; loading with a limit; the four meeting statuses are brought into the list by forcing the clock (the `AG_AT` helper) once per status, reading `agStatus` from the record.
- **Checks.** `states-records` rows; `city-hall`, `agenda-calendar`, `records-tab` still pass.
- **Spanish.** About 8 strings.
- **Risks.** The `agenda-calendar` and `city-hall` checks are large and exact; the change is in the load branch and one status line. "Live now" is a window we assume (two hours): the stale line must not make that look more certain.
- **Brent reviews.** The stale and Live now sentence.

### Stage 4: My place, and the place and priorities sheets (5 days)
This stage settles the findings of the "make this yours" review. **Needs decisions 1, 2 and 3 first.**
- **Scope.** Today's place row, My place tab, the home picker, Settings, the priorities sheet, Remember, Common ground answers, People > Cleveland; the desktop place page follows in Stage 9.
- **States added.**
  - **First run on My place:** with no place set, the tab says "Pick your neighborhood to see who decides there" with the picker, and shows the browsing view only after a choice, or labels the default honestly ("Showing Downtown as an example. This is not your place yet.", with **Set my place**). (Decision 3.)
  - **Set, with Change and Clear:** after a place is set, Today's row becomes "Your place: {Hough, Ward 8}. Change" (the row stays, quieter, so the door never disappears), My place shows the same line at the top, and the picker has **Clear my place** reachable from both.
  - **Changed or cleared:** the picker no longer closes silently: a `CxNote` "Your place is now {Hough, Ward 8}" with **Undo**; clearing says "Your place is cleared" with **Undo**. Focus returns to the control that opened the sheet.
  - **Split-ward neighborhoods:** when a neighborhood spans wards (`CX_GEO.overlap`), the note and My place say so: "Part of {Hough} is in Ward 9. We set Ward 8, the larger share. Check your address with the Board of Elections." with the existing lookup link (Decision 1).
  - **Over limit:** the counter row at the top of priorities reads "5 of 5 chosen. Skip one to add another." and stays in view (the progress row becomes sticky inside the sheet); the message under the list is kept for screen readers; Compare members explains its disabled boxes with a sentence beside the counter.
  - **Remember:** one explanation line wherever a Remember switch shows ("Saved only on this device. Turn off to delete."), a visible success message, the place switch hidden or disabled with a reason when no place is set (Decision 2 decides whether the two switches become one).
- **Checks.** Rows for each, with seeded and empty places, and the over-limit row; **`remember-place`, `privacy-policy`, `security-policy` and `districts` (the ALWAYS list) stay green and are the tripwires**: nothing new is stored or sent, the place never goes into an address, link or request. `place-dropdown`, `today-order`, `settings-sheet`, `sheet-pull`, `design-look` (only for the screens that change on purpose; update the snapshot and read the diff).
- **Spanish.** About 22 strings.
- **Risks.** This touches storage code and the privacy policy text, so it is **full gate only**, `privacy-claims.md` and `test_privacy.py` must still match the code, and the policy page (`cx-privacy.jsx`) may need an edit that Brent reads and marks (`--mark-privacy-reviewed`). Item 52 made the My place neighborhood list set your place; Decision 3 may reverse part of that on purpose. The sticky progress row must not cover content at 320 px or large text.
- **Brent reviews.** All of it on a phone: set a place, change it, clear it, undo each; pick a neighborhood in two wards; pick six priorities; the privacy policy sentences if edited.

### Stage 5: Ballot and candidates (3 days)
- **Scope.** The Ballot tab, contests, issues, candidate record, address finder (already good), review and worksheet, the levy stories' hand-offs.
- **States added.** **Election phases** on the whole Ballot, driven by `cxElectionPhase`: before (as now), election day ("Polls are open 6:30 a.m. to 7:30 p.m. today. Find your polling place." with the official link), and after (kicker and lede change to "The November 3 election is over" and "Your practice ballot stays here to look back on", "Set my districts" and practice choices say they are for looking back, the "Take your time" lede goes). **Candidate record:** the "No reviewed policy record loaded yet" box becomes **No record found** ("No policy record on file for {name}. The official list names this candidate, but no vote or policy statement has been reviewed here. A missing record is not a no. No alignment is inferred.") with the official candidate entry as the next step, and the heading and paragraph above adapt; a candidate with some records and none reviewed is **Partial**. "A detailed review is not loaded for this issue" becomes **Not yet reviewed** wording. Review sheet with zero choices: **First run** ("No choices yet. Open a race to practice."), download disabled with a reason.
- **`docs/plan-candidate-records.md`** is not in the repo. If it is written later, it plugs in here: every candidate record state in it maps to a state in 1.1 (the box above is its Partial and No record found), and its screens become rows in `states-ballot`. Until then this stage uses the box as it is (`recs` empty or not).
- **Checks.** Rows for the three clocks (before, election day, after; the `date-states` clocks), a candidate with and without records, a review with no choices; `date-states`, `levies`, `story-fit` (issue stories at 320), `districts` still pass.
- **Spanish.** About 18 strings (official ballot wording stays English).
- **Risks.** After-election words must not tell anyone how they should have voted; the page never says what to do, only what happened. The election date is a constant: the `states` clocks read it from `CX_ELECTION`.
- **Brent reviews.** The candidate no-record sentence and the after-election words; whether a result link belongs on the Ballot tab.

### Stage 6: People and Profiles (3 days)
- **Scope.** People > Cleveland, the profile sheet, People > Common ground, People > Federal and the member sheet (Stage 1 fixes the loading failures; this stage finishes the rest), Compare members.
- **States added.** Profile and member **not found** become `CxNotFound` with a step ("Go to My leaders"); a bad `seat=` in a link gets the standard notice instead of silence; Common ground gets **Set and Clear** for answers (answer count line, **Clear my answers** with Undo; today only priorities has a clear); Compare members gets the over-limit sentence and a could-not-load with retry (Stage 1's hook); the federal pages get a stale line from the federal data's own date.
- **Checks.** Rows; `people-tabs`, `profiles`, `alignment`, `us-graph` still pass.
- **Spanish.** About 12 strings.
- **Risks.** Common ground answers are kept in memory only: **Undo must hold them in memory only**, no new storage. Compare members' text sits near the step 2 text that is hidden until a person reviews it (`CX_ALIGN_REVIEW`): do not touch the ALIGN-TEXT markers.
- **Brent reviews.** Common ground clear and undo behavior; the not-found words.

### Stage 7: the United States map, Index and Tree (3 days)
- **Scope.** The phone and desktop map, the Index, the Tree, their sheets and profiles.
- **States added.** Could not load (not "needs the hosted site" while hosted) with Back and Try again; offline; loading limits for the votes inside the Index, Tree and map facts, ending as "The votes could not be loaded. Policy areas need them." with retry, so a failed votes file stops reading as loading; the empty and partial words for a name with no recorded vote ("No recorded vote on a bill is in our record yet": already good, kept); stale from the federal files' pull date; blocked and held back are defined here and used when the first source is cleared or held (`docs/source-terms-review.md`).
- **Checks.** Rows for map, Index, Tree on phone and desktop; the existing `us-*` checks (about 12) must stay green; 320 and Larger text rows for the map (the map already runs Larger text once).
- **Spanish.** About 10 strings.
- **Risks.** These are Brent's kits (`brent-owns-the-kits`): ported code, own conventions, and the heaviest checks. Edit the load branches and add components; do not touch the layout code. The map draws on a canvas: a state box must sit over it without covering the tab strip or Back (the `usm-wait` pattern already does).
- **Brent reviews.** The Index and Tree failure screens on a phone with the connection cut.

### Stage 8: Today and stories (1.5 days)
- **Scope.** Today as a whole, the stories ring and frames, the moment cards, the story notice (`Got it`), the next-meeting card when there is none.
- **States added.** First run versus set on Today (the place row's two forms from Stage 4); a story with a missing frame source says so on that frame (the US story's "What isn't public here yet" is the pattern); the Today notice for a bad link becomes a `CxNote`; a missing next meeting reads as No record found (it does: "No meetings are on the Clerk's calendar yet") and is just brought into the list.
- **Checks.** Rows; `today-order`, `banners`, `stories-*`, `story-fit` stay green.
- **Spanish.** About 5 strings.
- **Risks.** Low. Stories are Brent's finished work: no change to frames or rings.
- **Brent reviews.** Today on a phone, set and unset. **Fast lane** possible for the wording-only pieces after the rows are in.

### Stage 9: Desktop (3 days)
- **Scope.** Every desktop page and the desktop sheets and drawers: Home map, My pages (Ledger, Dictionary, Place, Leaders, Profiles, Ballot, Levies, Bench, What's new, Privacy), the United States page (Stage 7's components), the Record page, the story reader.
- **States added.** The desktop place page gets the Stage 4 behavior (unset first run, Change, Clear, Undo; today it defaults to Downtown and has no clear); desktop notices (`CX_LinkNotice`, `CX_StorageNotice`, the yellow `.cx-notice` toast) move to `CxNote` markup and words; stale and offline lines for the desktop pages that load files; not found for profile and record.
- **Checks.** Rows in `states-desktop` at 1280; `nav-desktop`, `screen-states`, `shell`, `profiles` stay green.
- **Spanish.** About 6 strings (most are shared with the phone).
- **Risks.** The desktop `.cx-notice` is a fixed toast in the legacy yellow (`#ffd36b`), which is not a token: moving it to the notice look is a visible change and needs a `design-look` update on purpose (Decision 7). The desktop's three-tier navigation must keep its way back on every state screen.
- **Brent reviews.** The desktop pages on a laptop, set and unset.

### Stage 10: close the display matrix (2 days)
- **Scope.** The cells that are still missing in the second table of section 2: 320 px, Larger text, print and reduced motion for every group, using the `matrix` flag the walker already has.
- **Added.** `@media print` rules for the sheets and the state boxes (Try again hidden, the lead and the body printed), the Larger-text pass on the phone shell, 320 px rows for My place, People and the sheets, reduced-motion rows for Today and stories.
- **Checks.** `CHECK_STATES=matrix` joins the full gate; `print` widens to the sheets.
- **Spanish.** None new.
- **Risks.** 320 px and Larger text will find real overflow in screens built for 390 px; each finding is a fix in that screen's CSS (small) or a note here. Print may be mostly "does not apply" for interactive screens: write that in the list rather than forcing it.
- **Brent reviews.** One printed or saved page of a record and a profile.

**Totals.** 4 + 3 + 2 + 5 + 3 + 3 + 3 + 1.5 + 3 + 2 = **29.5 working days**, about 110 new Spanish strings, 10 gate runs. Stages 1 and 4 carry the risk; stages 6 to 10 are mostly adopting what 1 to 5 built.

## 6. The decisions Brent must make

1. **Split-ward neighborhoods (Stage 4).** When a neighborhood spans wards: (a) set the larger share and say so with the Board of Elections link (**recommended**: one tap, honest, the person still owns the correction), or (b) ask which ward before setting (more honest, one more step, a new screen).
2. **One Remember switch or two (Stage 4).** Today the place and the priorities each have a switch, in three places. (a) Keep two storage keys but show **one** switch in Settings, "Remember my place and priorities on this device", with a plain line under each choice screen saying whether it is remembered (**recommended**: the policy needs one sentence updated, and Brent reads it), or (b) keep two switches and only explain them better. (a) changes what a switch means, so it needs the privacy policy re-read and `--mark-privacy-reviewed` by Brent.
3. **My place before a place is set (Stage 4).** Item 52 made the neighborhood list on My place set your place. That is why browsing shows "Downtown" as if yours. Choose: (a) browsing and setting are separate: the tab opens on "Pick your neighborhood", browsing another neighborhood changes nothing, and **Make this my place** is a button (**recommended**; reverses the one-tap behavior of item 52 on purpose), or (b) keep one-tap setting and label the default "Showing Downtown as an example".
4. **Reuse the Bench's evidence words as lead words (Stages 2, 5, 7).** Not in the record, Records disagree, May be out of date, Partly checked. Yes keeps one vocabulary across profiles, votes and feeds; no means inventing a second set. Recommended: yes.
5. **The conflict note (Stage 2).** Put "Records disagree" in front of the existing sentence on the five May 18 votes, naming both sources, or leave the quiet line. The new lead is one more thing about a named member, so it is yours to read.
6. **The eight-second limit and Try again (Stage 1).** A request that takes more than 8 seconds reads as Slow, and 12 seconds as failed, with Try again. Longer is kinder on a slow connection; shorter is clearer. Recommended: 8 and 12. Say if you want different numbers.
7. **The desktop notice look (Stage 9).** The yellow toast (`.cx-notice`, `#ffd36b`) is a legacy color not in the tokens. Move it to the phone's tile notice (a visible change, recorded on purpose) or keep it and register it as a token.

Not asked, but worth knowing: no stage adds a "Tell us what is wrong" button. That waits for the correction intake (`plan-screen-states.md`, Later). And `docs/plan-candidate-records.md`: write it before Stage 5 starts if candidate records are about to get richer, because it will add states this list should hold.

## 7. Rules this plan keeps

Receipts, not scores. Sponsorship is not a vote. A missing record is not a no. Nothing personal leaves the browser: no state, note, undo or retry puts a place, answer or
priority into a link or a request, and Undo holds values in memory only. Plain English, no dashes. No left accent stripes; a state box is a tinted tile. No new color, size, radius or weight.
Both styles and both layouts. English and a Spanish draft. A clean rebuild with the hash recorded after each stage. Nothing here runs `release.py` or any `--mark-*-reviewed` command: Brent runs the reviews himself.
