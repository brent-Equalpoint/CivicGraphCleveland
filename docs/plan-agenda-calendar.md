# Plan: a live agenda for Council meetings

Status: proposed, nothing built, written 2026-10-06 for Brent and the team. It builds on `docs/plan-city-hall-page.md` (the At City Hall page, built on the phone, no desktop page yet; since Oct 7 it is the Meetings folder of the phone's Records tab, `docs/plan-mobile-restructure.md` step 2, so "the At City Hall full page" below means that folder) and on the Agenda tab of the VC Fest 26 guide, which we own and can port into `ext/`.

## Brent's ask

"A calendar for council meetings but built differently. Like a live calendar like this." The screenshot is the guide's Agenda tab on a phone: a big day heading with a small tag, then one card per session with a time column on the left and, on the right, a kind label in color with a status ("Panel · Ended"), a bold title, the room and length, and for panels the people with photos.

## The goal in one paragraph

At City Hall becomes an agenda. Days are headings. Each meeting is a card with a time column, the body's name as a kind label in words and shape, a status worked out from the clock in Eastern time, what is on it, who sits on it, and its official links. Everything comes from records we already pull, plus two things the City Record prints that we do not read yet: who sits on each committee, and when each Council meeting was called to order and adjourned. "Live" means only that the scheduled time is now, and the page says so.

## What the kit's Agenda tab does (read 2026-10-06)

Source: `Relationship Map Kit/relationship-map-kit/src/flx-vcfest.template.html` (agenda code at lines 2640 to 2865, styles 789 to 881) and `samples/agenda.sample.json`. The index and tree kits hold no agenda code, and no "ask-no-one" kit was found on this computer.

| Part | What the kit does | Do we adopt it |
|---|---|---|
| Day heading | An `h2` per day, "Tuesday, September 29", in New York time, and the day's label from the data ("DAY 1") in small capitals. Not sticky. | Yes. Our tag is our own (below). |
| Time column | Short weekday, the start time large, AM or PM, and "to 11:00 AM" only when the session has an end time. | Yes, with the end line only when the record has an end. |
| Kind label | The session type as a colored word (Panel, Keynote, 1:1 meetings, Showcase, Networking, Arrive), eight color pairs, the word always shown. | Yes, as a word plus a shape, colors from the tokens. |
| Status | Ended when the clock passes the end; "Happening now" between start and end; "Up next" on the next session; nothing on other upcoming ones. A session with no end shows Ended the moment it starts. | The idea, not that rule (see Status). |
| Ticking | Redraws the whole list every 60 s while the tab is visible. Focus inside the list is lost each time. | A tick, but it changes only the status words and never moves focus. |
| Auto scroll | On first open, picks the day of the live or next session and scrolls its row into view. A link from a profile scrolls to the row and rings it for 1.8 s. | Yes. Instant with reduced motion, a still tint instead of the ring. |
| Filters | Search, a day switch ("Both days", "Tue 29"), List, Calendar, Map, and a rail of checkboxes with counts (type, room, with speakers, food, still to come). | Day switch, kind filter with counts, "Still to come", search (our Look it up). |
| People | Speakers with a 32 px round photo, name, "title, organization", and a text link "On this list" or "Company on this list" that opens their profile. | Yes: the committee's members from the City Record, with a Profile link. |
| Place and length | The room is an underlined button that opens a floor map; the length is plain text in minutes ("120 min"). | Place as plain text; length only when the record gives it. |
| Add to calendar | A Google Calendar link with the session in the address. | No. That sends the choice to Google. We make an .ics file on the device. |
| States | Past cards take the page's background and muted text; now is a green tint and border; next an amber tint and border. No pulse. | Tints from the tokens, always with the word. No stripes. |
| Accessibility | A section and `h2` per day, an ordered list of rows, an `h3` per title. No live region, so status changes are silent. | Yes, plus a polite live region only when the person asks for a refresh. |

Kit habits we do not copy: focus lost every minute, Ended at the start of a session with no end, "Up next" worked out over everything instead of what is shown, a mini month hard-coded to September, and the Google Calendar link.

## What our record holds (measured 2026-10-06)

From `data/meetings-2026.json` (the Clerk's Legistar calendar, pulled 2026-10-05 19:27 UTC):

- 141 meetings from Jan. 5 to Oct. 8, on 80 days, at most 4 in one day. Mondays 66, Tuesdays 31, Wednesdays 31, Thursdays 10, Fridays 3, weekends none.
- 16 bodies: Finance 26, City Council 22, Safety 16, Development 11, Health 9, Transportation 9, Municipal Services 9, Utilities 7, Workforce 6, Zoning 6, Mayor's Appointments 6, Caucus 4, Committee Chairs 4, Committee of the Whole 3, Operations 2, Council event 1.
- Every meeting has a date, a start time as the Clerk typed it ("7:00 PM", Eastern), the body, the room, an agenda link, the meeting page, and the Clerk's notice. 10 have minutes. 104 have agenda items, 1,840 in all; 552 items of past meetings have no action recorded.
- **No end time.** Legistar has no end field.
- **No video address.** Legistar reports a video status ("Public") but the address is empty (event 3928, checked 2026-10-06). The notice names YouTube and Cleveland TV Channel 20.
- **The calendar looks only a few days ahead.** On Oct. 5 the last posted meeting was Oct. 8. A week two weeks out is usually empty.
- **Committee seats are not in Legistar.** Its bodies list gives a member count (Finance 9, most committees 7, Mayor's Appointments 5) but no names for 2026.

From the City Record (Oct. 2 issue, read 2026-10-06):

- **Who sits on each committee.** The "Permanent Schedule" of the standing committees for the 2026 to 2029 term (page 221) gives each committee's regular day and time, its Chair, its Vice Chair, and its members. Each count equals Legistar's member count (Finance 9, Development 7, and so on). Council's website shows the same on each committee page.
- **Who came.** "Council Committee Meetings" lists, for each committee meeting held that week, "Present" (with Chair and Vice Chair marked) and "Also Present".
- **How long Council met.** "The meeting of the Council was called to order at 7:03 p.m." and "The Council Meeting adjourned at 8:19 p.m." (Sept. 28 meeting); the Sept. 25 issue gives 7:02 to 8:32 p.m. No adjournment time is printed for committee meetings.
- It also has misprints: the Oct. 2 schedule prints the Utilities Committee's time as "10:0 a.m.". A parser must hold back what does not add up, as `fetch_cityrecord.py` already does for votes.

## Status, honestly

The clock is the device's, read in Eastern time (the app's `cxTodayET` and a minutes-of-day helper beside it). Nothing tells us a meeting is in progress.

| Word | When it shows |
|---|---|
| Upcoming | The start time is later. The next meeting among those shown also gets "Up next". |
| Live now | Only between the start time and the end of its window. A window exists only where the record gives a length: for City Council it runs from the scheduled start for as long as the longest Council meeting the City Record printed this year (from call to order to adjournment). A fold under the page says: "Live now means the meeting's scheduled time is now. We have no signal that it is in session." |
| Started at 9:30 a.m. | A meeting with no window (every committee), from its start until the end of that day. Never "Live now"; "Ended" only once the record shows it. |
| Ended | Only with a record that it ended: an adjournment time in the City Record, outcomes on its items, or minutes. |
| No outcome recorded yet | A past meeting with none of those. A missing record is not a no, and not proof it did not meet. |

Length: a past Council meeting shows "Met 7:03 to 8:19 p.m." with the City Record linked. An upcoming one shows no length unless Brent chooses the range line (decision 2). Committees show no length.

## What we adopt, card by card

**Day heading.** "Tuesday, October 6" and a small tag in sentence case (the kit sets its tag in capitals; our standard has no all-caps labels). Recommended tag: "Today", "Tomorrow", or "Yesterday" when it applies, then the count, "2 meetings". The alternative, "Meeting day 78 of 2026", is true but tells a resident little (decision 4).

**Time column.** "Tue", "9:30", "a.m.", and the "to" line only for a past Council meeting with printed times.

**Kind label.** One word or two for the body, by a fixed table: Council, Finance, Safety, Development, Zoning, Health, Transportation, Municipal Services, Utilities, Workforce, Appointments, Caucus, Committee chairs, Whole Council (Committee of the Whole), Operations, Council event. The title under it is the body's official name, unchanged. Shape by tier, reusing the United States map's shapes: City Council and the Committee of the Whole a ring, committees a filled hexagon, caucus and chairs a square, an event an outline. Color by tier only (three colors, a new "meeting kinds" meaning group in `design/tokens.json`, carried by word and shape), never sixteen colors.

**Status.** After the kind label, as in the kit: "Finance · Upcoming".

**Title and place.** The official body name in bold, then "Committee Room 217" or "Council Chambers". Items count: "4 items: 3 ordinances, 1 resolution" (the existing `cxMtgMix`).

**People.** "Who sits on it": the chair, the vice chair, then members, each with the official portrait (the 16 we ship), the name, the role in the City Record's word, the ward, and a Profile link. Council shows "15 members" as a folded row of faces. The member for the ward set on the device gets "Your ward", worked out on the device. Attendance ("Present" from the City Record) is stored but not shown until Brent decides (decision 3), because it reads as a record of absence.

**Links.** Agenda, Meeting page, Minutes once posted, How to watch (the notice's own words and, where the notice gives it, the Council channel), and for a past Council meeting the City Record issue. Add to my calendar.

**Items.** "Show what is on it" opens the agenda grouped as now (ordinances, resolutions, everything else, ceremonial last), the first five and "Show all N", with outcomes on past meetings. Each item opens the shared record (`ext/cx-record.jsx`).

**For you.** A "For you" filter and a quiet line on a card ("Names Ward 7", "Housing: rent"), from the ward and priorities set on the device, with the existing `cxMtgForYou`. Never in a link, storage it does not already have, or a request.

## Getting around

- **The week.** A bar: Previous week, the week's dates, Next week, and Today. Under it, day tabs "Week, Mon 5, Tue 6, Wed 7, Thu 8, Fri 9" (folder tabs, the chosen one solid blue with white text). "Week" shows all five days with headings, like the kit's "Both days"; a day shows that day. Saturday and Sunday appear only when a meeting is on them (none in 2026 so far).
- **Auto scroll.** On open, the week of today, scrolled to the live or next meeting, under the sticky bar. Only on open and on Today, never on a tick.
- **Empty weeks.** "The Clerk has not posted meetings for this week yet. Meetings are usually posted a few days ahead." Optionally the regular schedule from the City Record, as one labeled line per committee, never as cards (decision 8).
- **Views.** Phone: the list. Desktop: List (cards on the left, the chosen meeting's items, people, and links on the right), Week (five columns, cards in time order, no hour scale, since we have no end times and an hour grid would draw a length we do not have), and Month (a grid with the number of meetings on each day; a tap goes to that day). Month replaces "Earlier this year" on the desktop; the phone keeps the month folds.
- **Filters.** Kind (All, Council, committees by name) with counts, Still to come, For you. Search is the existing Look it up.

## Add to my calendar

A button on each card, and "Add this week" for the whole week. The page writes an .ics file in memory and hands it to the browser as a download (a `Blob`, an object address, a link with `download`, the address released after the click). Nothing is sent and nothing is saved by the app; it works in the offline file.

The file: `BEGIN:VCALENDAR`, a `VTIMEZONE` for America/New_York with its daylight saving rules, and a `VEVENT` with a stable `UID` (the Legistar event id), `DTSTART;TZID=America/New_York:20261008T100000`, the official body name as `SUMMARY`, the room and "Cleveland City Hall, 601 Lakeside Avenue" as `LOCATION`, the meeting page as `URL`, and a `DESCRIPTION` with the agenda link and "The Clerk does not publish an end time. The agenda can change; check the meeting page." No `DTEND` unless the record gives an end, which today it never does for a meeting still to come (an event with only a start is valid); no alarm (the person sets their own). On an iPhone the file opens the Add to Calendar sheet.

Not done: the Google Calendar link, push notifications, or reminders (no accounts). A subscription feed that updates itself (a nightly `site/meetings/council-2026.ics`) is possible; the host would then see a calendar app's periodic requests, and the privacy policy would say so (decision 6).

## Where it lives

- **Phone.** The At City Hall full page becomes the agenda. `?panel=meetings` keeps working. The Today card shows the next meeting with its status word and item count. The story stays.
- **Desktop.** A new At City Hall page (the plan always had one), `?panel=meetings`, in My pages under Today, and found by Jump to ("meeting", "council", "agenda", a committee's name). It can become a main tab later if it is used (decision 5); a tenth tab on row one must still fit at 1100 px in English and 1280 px in Spanish.
- **Profiles.** A council member's profile gets "On the agenda": their committees' next meetings, linking to the card (the kit's `agGo` pattern).

## What we keep from today's At City Hall, and what changes

| Today | In the agenda |
|---|---|
| Next up tile | Kept, with the status word. |
| Day tabs, Mon to Fri | Kept, with "Week" first and previous and next week. |
| What is on it (grouped, first five) | Moves inside each card. |
| For you | Kept as a filter and a card line. |
| Just decided | Kept below the week, unchanged. |
| Look it up | Kept as the search. |
| Earlier this year folds | Kept on the phone; Month view on the desktop. |
| Two-line footer | Kept: the source, when it was pulled, no testimony. |

## Refresh

The record is pulled nightly (6:17 a.m. Eastern). The page computes status from the clock every minute while visible and changes nothing else. Under the week bar: "Clerk's calendar pulled Oct. 6, 6:20 a.m. Changes made after that show after the next pull, early tomorrow." A small "Check for a newer record" reloads the meetings file from our own site and says the result in a polite live region; that is the only live region. A pull more often on weekdays (a small separate job for meetings only) would show new agendas and cancellations within an hour (decision 7). We have not seen how the Clerk marks a cancelled meeting; until we do, a card cannot say Cancelled, and a deleted meeting disappears at the next pull.

## Rules it keeps

- Receipts, not scores: counts of what the record says, nothing ranked, no "busiest" committee.
- A missing record is not a no; absent is not a no.
- Nothing personal leaves the device: For you, the ward match, and the .ics are all made on the device.
- Selected tabs, day tabs, view switches, and filter chips are solid blue with white text, weight 600, never an accent line (`tab-blue`).
- Both styles, light and dark, phone and desktop, English and Spanish. Official names stay English; status words, kind labels, and the .ics description follow the page language.
- No dashes in text, no left stripes, 44 px targets.

## Accessibility

One `h1`, an `h2` per day, an ordered list of cards, an `h3` per meeting. The time column reads in order ("Tuesday, 9:30 a.m."). Status is a word, never only a tint. The minute tick is silent and keeps focus and scroll. Arrows move along the day tabs and stop at the ends. Reduced motion: instant scroll and a still tint. Color-vision: kinds by word and shape, status by word.

## Word budget

At City Hall is recorded at 403 words (`scripts/checks/text-budget.json`). Cards start folded (items and people closed), so a typical week stays at or under 400 words before anything opens. If a busy week needs more, the record changes on purpose and the change says why.

## Wireframes

Phone, 390 px:

```
| < Back                                   ES |
| At City Hall                                |
| Clerk's calendar pulled Oct 6, 6:20 a.m.    |
| < Prev week    Oct 5 to 9    Next week >    |
| [Today]                                     |
| [Week] [Mon 5] [Tue 6] [Wed 7] [Thu 8]      |
| [All kinds v] [Still to come] [For you]     |
|                                             |
| Tuesday, October 6       Today . 1 meeting  |
| +=========================================+ |
| | Tue   | (hex) Development . Started 9:30 | |
| | 9:30  | Development, Planning and        | |
| | a.m.  | Sustainability Committee         | |
| |       | Committee Room 217 . 2 items     | |
| |       | (o)(o)(o) Santana, Chair ... +4  | |
| |       | Agenda  Meeting page  Add to cal | |
| |       | Show what is on it            +  | |
| +=========================================+ |
| Wednesday, October 7  Tomorrow . 1 meeting  |
| ...                                         |
| Just decided  |  Look it up  |  Earlier     |
```

Desktop, 1440 px, Week view:

```
At City Hall                          [List] [Week] [Month]
Clerk's calendar pulled Oct 6, 6:20 a.m.
< Previous week   Week of Oct 5   Next week >   [Today]   [All kinds v] [For you]
+=============+=============+=============+=============+=============+
| Mon, Oct 5  | Tue, Oct 6  | Wed, Oct 7  | Thu, Oct 8  | Fri, Oct 9  |
| 7:00 p.m.   | 9:30 a.m.   | 9:30 a.m.   | 10:00 a.m.  | No meetings |
| (ring) Cncl | (hex) Dev.  | (hex) Trans.| (hex) Util. | posted yet  |
| No outcome  | Started     | Upcoming    | Upcoming    |             |
| recorded yet| 9:30 a.m.   | Up next     |             |             |
+=============+=============+=============+=============+=============+
| The chosen meeting: items by kind, who sits on it, links, Add to my calendar |
```

## Checks to add

- **`agenda`** (browser, with a fake clock as `date-states` does): the status word at 10 times across a Council meeting and a committee meeting; no "Live now" without a window; "Ended" only with evidence; "Up next" is the next of those shown; the tick changes no focus, scroll, or other text; auto scroll on open and Today only; reduced motion; empty week wording; past and future weeks; Spanish; light in both styles.
- **.ics**: made with no request; parses; `TZID=America/New_York`; a Nov. 2 meeting after daylight saving ends lands at the right instant; no `DTEND` where none is known; a planted Google Calendar link fails `security-policy`.
- `color-vision` (kinds by word and shape), `tab-blue` (day tabs, view switch, chips), `targets`, `axe`, `no-bleed`, `text-overlap`, `text-budget`, `design-look`, `nav-desktop` (the desktop page in My pages and Jump to), and the existing `city-hall`.
- Unit: `scripts/test_agenda.js` (status, windows, the .ics text) and new cases in `scripts/test_cityrecord.py` (rosters equal Legistar's member counts, every name a sitting member, call to order before adjournment on a date Council met, the "10:0 a.m." misprint held back).

## Phases (each ends with the full gate and screenshots)

Each phase can be handed to a build agent as written: the agent, the files, and what "done" means.

1. **First slice: the agenda card on the data we have (frontend agent, about 2 days).** Files: `ext/cx-meetings.jsx` (new pure helpers `cxMtgStatus(m, now)` and `cxMtgDayTag(iso, today)`, new `CxMtgCard`, `CxMtgWeekBar`; `CX_Meetings` rearranged into day sections), `ext/cxm.css`, `i18n/manual.json`. Port the kit's layout from `flx-vcfest.template.html` (agenda lines 2794 to 2865, styles 789 to 881) into our own components; no list redrawn by `innerHTML`. No people yet, no length except "Started at". Done when: a new `agenda` browser check (fake clock, statuses, tick keeps focus, auto scroll on open only, reduced motion, empty week) and the existing `city-hall` pass in dark and light, both styles, and Spanish; `tab-blue`, `targets`, `axe`, `no-bleed`, and `text-budget` pass; screenshots at 390 and 320 px.
2. **Rosters and Council times (backend agent, about 1.5 days).** Files: `scripts/fetch_cityrecord.py` (parser 3: the permanent schedule, committee attendance, Council's call to order and adjournment), new `data/council-bodies-2026.json`, `scripts/refresh.py`, `scripts/us_sources.py` (register as `review_required`), `scripts/test_cityrecord.py`. Done when: every committee in the schedule has its chair, vice chair, members, and regular day and time; each count equals Legistar's member count; every Council meeting printed in the 40 issues has its two times; the "10:0 a.m." misprint is held back with its reason; two runs write the same bytes; `refresh.py --check` passes.
3. **People and lengths on the card (frontend agent, about 1 day).** Files: `ext/cx-meetings.jsx` (`CxMtgPeople` with the 16 official portraits through `cxmAsset`), `ext/cx-seat.jsx` ("On the agenda" on a profile). Done when: `agenda` also checks the roster against `data/council-bodies-2026.json`, "Live now" appears only for Council inside its window, and "Your ward" never reaches an address, storage, or a request.
4. **Add to my calendar (frontend agent, about 1 day).** Files: `ext/cx-meetings.jsx` (`cxMtgIcs`), new `scripts/test_agenda.js`, `ext/cx-privacy.jsx` (one line; this resets the policy's review). Done when: the .ics tests pass (time zone, the Nov. 2 case, no `DTEND` where none is known), `privacy-policy` passes, and no request is made during the download.
5. **Desktop page (frontend agent, about 2.5 days).** Files: `ext/cx-meetings.jsx` (`CX_MeetingsPage` with List, Week, Month), `ext/cx.css`, `ext/cx-nav.jsx` (My pages entry and Jump to words), `build.py` (mount `?panel=meetings` on the desktop). Done when: `nav-desktop`, the desktop cases of `agenda`, and `design-look` (new parts recorded on purpose) pass.
6. **Optional (devops agent):** the weekday meetings pull (half a day) and the subscription feed (1 day), each after its decision.

Total about 9 to 10 days. **First slice that ships value fastest: phase 1,** about 2 days, on data we already pull.

## Risks

- A device with a wrong clock shows the wrong status. The words are about the schedule, not the room.
- The City Record is a PDF; its layout or misprints can change. Held back, never fixed by hand, like the votes.
- The calendar is thin ahead of time; a resident may read an empty week as no meetings. The empty week says why.
- Showing who sits on a committee next to its agenda can read as "these people decide this". The card says who sits on it, nothing more; votes stay on the record.
- Terms: the City Record states no terms of reuse and Council's site says "Copyright ©. All Rights Reserved." Names and roles are facts, but a person confirms.

## Decisions needed

1. "Live now": only where a length is on record (Council), with committees saying "Started at 9:30 a.m." (recommended), or a fixed two hour window for every meeting, labeled as assumed.
2. An upcoming Council meeting's length: show "Recent Council meetings ran 76 to 90 minutes (City Record)", or nothing (recommended until the parser has the whole year).
3. Attendance from the City Record ("Present", "Also Present"): show on past meetings, or keep stored and hidden (recommended until you decide the absence question from the roll calls).
4. Day tag: "Today" or "Tomorrow" plus the number of meetings (recommended), or "Meeting day 78 of 2026".
5. Desktop placement: My pages under Today (recommended), or a main tab now.
6. A calendar subscription feed: yes or no.
7. A weekday pull of the meetings record during business hours: yes or no.
8. The regular schedule line for empty weeks: show, or leave weeks empty with the explanation.
9. Terms of the City Record and Council's committee pages: Brent confirms they may be shown.
10. Reviewer: Brent reads the kind label table and the status fold before release.
