# Plan: At City Hall as a page, not a sheet

Status: proposed, nothing built except the bug fix below. Written 2026-10-05 for Brent and the team.

## What went wrong today

Opening "City Council meets tomorrow" slid the sheet sideways on an iPhone. Cause: the "Also this week" strip holds a hidden line of text for screen readers. That line was not clipped by the strip, so the sheet became 1,624 px wide inside a 390 px screen, and Safari lets a wider sheet be dragged sideways. Fix: the strip now clips its own contents. The `city-hall` check now fails if the sheet is wider than the screen (it failed before the fix and passes after). Every other sheet and page measured exactly screen width.

## Why a page, and why it is not enough to patch the sheet

A sheet is for a quick look. City Hall is something people come back to: when does Council meet, what is on it, did it pass, does it touch my ward. Today the sheet answers the first question and then buries the rest (a sideways strip, nine folded months, a long source line). The ask is a page that works like a front page, not a drawer.

## What the data can honestly support

From the Clerk's record (Legistar), already in `data/meetings-2026.json`:

- 141 meetings in 2026 across Council and its committees (Finance 26, Council 22, Safety 16, Development 11, Health 9, Transportation 9, and others).
- 104 meetings have a list of agenda items, 1,838 items in all, each linked to its legislation record.
- Every meeting has an agenda link. 10 have minutes. Every meeting has a Clerk's notice.
- Each item has an outcome once the meeting has happened (passed, introduced, referred, held).

It cannot support, and the page will say so: testimony, public comment, who spoke, video, and hearings that are not on a Council agenda.

## What people need, in order

1. When is the next meeting, and where do I watch or go?
2. What is on it that matters, in plain words?
3. What happened last time?
4. Does anything touch my ward or my priorities?
5. How do I take part, or reach my member?
6. Can I look something up (a file number, a word, an address)?

## The page

A full screen with a back arrow, not a sheet. Opens from the Today card, the story, and an Explore door. `?panel=meetings` keeps working.

1. **Banner** (kept): the illustration and "At City Hall."
2. **Next up** lead tile: date, time, body, place, and one line on how to watch, taken from the Clerk's notice. Buttons: Agenda, Meeting page. Two sentences at most.
3. **The week** as day tabs (Mon to Fri, folder-tab look), replacing the sideways strip. Tap a day to see that day's meetings. No horizontal scrolling anywhere on the page.
4. **What is on it**: items grouped by kind (ordinances, resolutions, then everything else, ceremonial last), the first five shown, "Show all N" for the rest. Each item is one line plus its status.
5. **For you** (only when a ward or priorities are set): items that name your ward in the record, and items matching your priorities. Never shown as a score, never a percentage. Empty state says what to set.
6. **Just decided**: the last meeting's outcomes as counts with chips (passed, held, referred), then the items.
7. **Take part**: how to watch, how to reach your ward member (links into the profile's Write action), and where public comment rules are stated. Official links only. A person confirms the wording before it ships.
8. **Look it up**: search by file number, word, or address. Results are meetings and legislation records.
9. **Earlier this year**: months folded, as now, but one fold per month rather than nine on the page.
10. **Footer**: two lines. Where the record comes from and when it was pulled, and that it holds no testimony.

Word budget: 400 words showing before anything is opened (today it is 722). The `text-budget` check holds it there.

## Rules the page keeps

- Receipts, not scores. No rankings of members or of items.
- Sponsorship is not a vote. A missing record is not a no.
- Nothing about the person leaves the browser. The ward and priorities used in "For you" stay on the device and never go into a link.
- Both styles and both layouts. Spanish for every new line (the Clerk's own titles stay English).
- No dashes in text. No left accent stripes. Tap targets 44 px.

## Order of work

1. **Done:** the sideways slide, with a check.
2. **Shell and week (about two days):** full-screen page, back arrow, lead tile, day tabs, grouped items. Remove the sideways strip.
3. **For you (about one day):** ward and priority matching from the legislation record the app already holds.
4. **Look it up and earlier months (about one day).**
5. **Take part (a person needed):** official links and the comment rules, verified against the Clerk's and Council's own pages before they are written.
6. **Desktop page (about two days):** a sidebar panel through `build.py`, same sections, same data.
7. **Checks throughout:** extend `city-hall` to cover the day tabs, "For you" with and without a ward, sheet and page width, Spanish, and light mode.

## Decisions needed from you

1. Full screen with a back arrow on top of the tabs, or a sixth bottom tab called City Hall? The plan recommends the back-arrow page, and promoting it to a tab if it gets used.
2. Is "For you" by ward and priorities the right filter, or do you want a topic row (housing, safety, money) as well?
3. For "Take part": who confirms the public comment wording, and from which official page?
4. Should the Today card show the next meeting only, or the next meeting plus what was just decided?
