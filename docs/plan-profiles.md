# Plan: formal profiles for every seat, including the Mayor

Written Oct 1, 2026. Status after v5.16: P1 and P2 are built, and the phone sheet and several entry points from P3 and P4 came with them. Findings from P1: Legistar's office records give each member's person ID and the 2026 to 2029 term, plus the Mayor's term, and nothing else. It has no committee seats and no contact details, so committees are left out and contact is a link to the official pages (decisions 1 and 2 below, as recommended). Also built since: the ward map with a text description, a Read the formal profile button in the map's record drawer, and the Profiles page doubling as the Council list in ward order. The hover card itself cannot take clicks, so the drawer button is the way in. Still open: the Easy mode version, reviewed office text (P5), a check of the leadership roles against Council's site, and testing (P6).

## What this is, and how it differs from My leaders

A **profile** is a neutral fact sheet for one seat: the 15 council members and the Mayor. Every visitor
sees the same page, in the same order, with the same sections. It is formal, dated, sourced, and short
enough to read in about two minutes.

**My leaders** is personal: it uses your chosen priorities, shows common ground, lets you heart a
proposal, and drafts a letter. The two stay separate. A profile never changes with your answers, and
My leaders links to the profile for the facts. The profile links back with "Write a letter" as a
secondary action.

## What the app already has to build from

- 16 official portraits (15 members and the Mayor) and a ward for each member.
- Every 2026 item each member led, joined, or signed for a department (Legistar sponsors).
- Ward money from ordinance text, liquor-permit objections by ward, committee and Council action histories.
- Ward and neighborhood shares from the city's 2014 and 2026 maps, and ward map shapes.
- The Mayor's administration items and the executive orders in the room data.
- Bench roster records: each member's office, ward, and term from the oath record (file 1-2026).

## What a profile contains

The same order for every seat, so people compare by reading, never by a score.

1. **Header.** Portrait with a credit line and descriptive alt text, name, office, ward or citywide,
   term, an "Official source" chip, and an "as of" date.
2. **At a glance.** Five plain facts: office, area served, term, committees (and chair or vice chair
   when recorded), and a link to the official page for contact details.
3. **What this office does.** Two or three plain sentences from the City Charter and codified ordinances,
   written once per office and reviewed by a person. Council members share one text; the Mayor has their own.
4. **This year's record.** Counts of proposals led, joined, and signed for a department, each with a
   link to the list. No grades, no rankings, no comparison to other members.
5. **Money and decisions tied to the seat.** Ward money items, liquor-permit objections, and the five
   most recent actions with status and date, each linking to Council's record.
6. **How they voted.** Stated honestly: Council's database does not publish each member's vote; the roll
   call is in the City Record. A missing record is not a no.
7. **Ward and neighborhoods.** A small map of the ward and which neighborhoods it covers, with the
   2025 to 2026 change in plain words. Not shown for the Mayor, who serves citywide.
8. **Sources and corrections.** Every source with its retrieval date, and a "Report a mistake" link once
   the correction intake exists.

The Mayor's page swaps sections 5 and 7 for: requests the administration sent to Council this year,
executive orders (from the room data), and the departments the Mayor leads, each sourced.

## Rules this plan keeps

- Receipts, not scores: no match percentages, rankings, or ideology labels. Sponsorship is not a vote.
- Party is shown only as a sourced, dated field. Council is nonpartisan, so it is omitted unless a source says otherwise.
- Names, not pronouns. Plain English, no em dashes, no left accent stripes, no all-caps labels.
- Nothing personal in links: a profile address names a seat (`?panel=profile&seat=ward-8`), never a visitor.
- Anything interpretive (what the office does, any biography) needs a person's approval, using the same
  review step as the "Why supporters backed it" summaries. Official records refresh nightly on their own.

## Where it appears

- A "Profile" button on the map hover card and in the record drawer for every council member and the Mayor.
- The end of each ward story and the Mayor story, in both layouts.
- The Council room, as a list of all 15 in ward order (not ranked).
- A link at the top of each My leaders card ("Read the profile").
- A federal use later: the same template serves members of Congress in the US graph, so the layout is
  designed for any seat, not only Cleveland's.

## Layouts and modes

- **Desktop:** a full panel in the sidebar pattern, with the sections as a short contents list at the left. Prints cleanly (print styles exist).
- **Phone:** a bottom sheet that opens full height, one section at a time with a sticky "Jump to" row.
- **Easy mode:** five sentences and one button, with "Read it to me".
- **Text first:** every section is real text with headings, so a screen reader can move by heading. The map has a text equivalent.

## Data and sources to add

| Need | Source | Status |
| --- | --- | --- |
| Office descriptions | Cleveland City Charter and codified ordinances | Register the source; a person writes and reviews the text |
| Committee seats, chairs | Legistar people and committee-seat endpoints | To verify in the API before building |
| Contact and official bio | Each member's page on Council's official website | Link only at first; do not copy text |
| Term dates | Oath record (file 1-2026), already in the Bench roster | Ready |
| Mayor's term and departments | City of Cleveland official pages | To register |
| Executive orders | Already in the room data | Ready; add source anchors |

Each fact gets a source anchor and an "as of" date, so these pages can later read from the Bench's
approved records instead of the snapshots.

## Phases

| # | Phase | Done when | Size |
| --- | --- | --- | --- |
| P1 | Confirm sections, wording, and sources; verify committee data in the API | A one-page spec for each section with its source, and a sample profile written for one member and the Mayor | 0.5 session |
| P2 | Shared profile component and the desktop panel | Ward 8 and the Mayor render in both styles with every section, print cleanly, and pass a keyboard check | 1 to 2 sessions |
| P3 | Phone sheet and Easy mode version | Same content on the phone with a jump row; the Easy version reads aloud | 1 session |
| P4 | Entry points: hover card, drawer, stories, Council room list, My leaders link | Every member and the Mayor reachable in two taps from any of them | 1 session |
| P5 | Reviewed office text and committee seats | A person has approved the text; a rebuild flags it for review if its source changes | 1 session plus reviewer time |
| P6 | Accessibility check and resident test | Screen reader, keyboard, and five residents asked to find "who represents me and what do they do" | with phase 6 of the stories plan |

Do P1 and P2 after phase 1e (the hover card fixes), since the card gets the Profile button. Profiles are
a good first use of the shared story engine's source line, and they reuse the print styles already built.

## Decisions for you

1. Contact details: link to the official page only (recommended), or also show phone and email once sourced?
2. Committees: show them only when the Legistar data confirms them (recommended), or leave them out of the first release?
3. Photos: the existing 16 official portraits with a credit line, or write to Council for current ones?
4. Order of the Council list: by ward number (recommended), never by activity.
5. Who approves the "what this office does" text before it goes live?
