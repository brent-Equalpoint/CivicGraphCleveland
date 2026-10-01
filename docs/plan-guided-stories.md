# Plan: guided stories on phone and desktop

Written Oct 1, 2026. Status Oct 1, 2026 (v5.16): Phase 1 (shared engine), Phase 1b on the phone (quiet text), the 404 page, start-up timeout and phone bad-link notice from Phase 1d, and a simple desktop Stories page from Phase 2 are built. Easy mode (1c), the desktop landing-page Stories row, Phases 3 to 7, and the rest of 1d are not.

## Goal

A resident who opens the Civic Graph on a phone, with no prior knowledge, can be led through it one
small step at a time, see where each fact comes from, and choose to go deeper. The story style is a
feature of both layouts, not a phone extra.

## What exists today

- **Phone:** the Today tab has tap-through stories (your ward, Council, the Mayor, the ballot, your
  neighborhood). Code: `cxmStories()` and `CxmStory` in `ext/cxm-today.jsx`. Frames are built from the
  same records the desktop uses, so they are always current.
- **Desktop:** no stories. There is a 4-step guided view per room (Start, Meaning, Power, Proof) in
  `ext/cx-ui.jsx`, and a "Read the full story" button on leader profiles.
- **Gap:** the story builders live inside a phone-only file, so the desktop cannot use them. Past
  Today, the phone puts most things in bottom sheets with no clear path between them.

## Principles

1. One story engine, two presentations. Frames are data; phone and desktop only differ in how they show them.
2. Every frame carries its source link. Receipts, not scores (CLAUDE.md).
3. Every story ends with a next step into the Explore rooms, never a dead end.
4. One idea per frame. Short, warm, direct sentences in plain English, no em dashes. See Voice and quiet text.
5. Nothing personal leaves the browser. Ward and answers stay local.
6. Each phase ends with a clean build, a browser check at phone and desktop widths in both Bento and Original, and a commit.

## Voice and quiet text

Today the phone app has about 37 small uppercase labels (the "kicker" above a heading, in a 11.5px
monospace face and faint grey), 60 "fine print" lines in faint grey, and 77 muted grey lines. The
desktop has 17 more eyebrow labels. Stories open every frame with one, such as "LEFT ON READ" or
"WHAT WE WON'T SHOW". Together they make every screen read as a stack of labels before the answer.

Rules for the cleanup:

1. **The answer comes first.** Each screen opens with the plain sentence, not a label above it.
2. **Cut labels that only repeat the heading.** Keep one only where it tells the person where they are
   (a ward number, a step like "Step 2 of 4") or when it is the only way to say what a number is.
3. **No small grey text for anything a person needs.** Dates, sources, and "what to do next" use full
   ink color at normal size. Grey is for true fine print only, and a screen gets one such line at most.
4. **Warm and direct.** Talk to the person: "Your council member", not "Ward representative". Short
   sentences, everyday words, one idea each. Say what to do: "Tap to see who voted", not "View record".
5. **Sentence case, not capitals.** No all-caps labels and no monospace outside real code or file numbers.
6. **Contrast.** Anything that stays grey must still pass 4.5:1 against its background in Bento and Original.
7. **Keep every receipt.** Plainer words never remove a source link or a "not found" statement.

Before and after, as the model for the rewrite:

| Today | Plainer |
| --- | --- |
| LEFT ON READ, then "3 items were tabled." | "Council set 3 items aside this year." |
| WHAT WE WON'T SHOW, then "Votes we can't prove." | "How each member voted isn't public yet. Here is what is." |
| WARD 5 · 2026, then the headline | The headline, with "Ward 5, this year" in normal-size ink beneath it |

## Accessibility: what we have, what we do not

Checked in the source on Oct 1, 2026. Nothing here has been tested with a screen reader or on a real
device, and no WCAG conformance is claimed (README, "Known limits").

Have today:
- Labeled controls throughout (about 57 labels, 48 roles), dialogs marked as dialogs, 7 live regions, Escape closes sheets and stories.
- Visible keyboard focus styles and reduced-motion styles in the stylesheets.
- A Text view that states every map connection in words, so the map is never the only route.
- Phone buttons at 46 to 56px high, bottom tabs at 56px. A "Larger text" switch on the phone.
- Story tap zones are real buttons with names ("Previous", "Next").
- Portraits and decorative icons are marked so screen readers skip the decoration.

Missing:
- No read-aloud. No high-contrast mode, and the page ignores the system contrast and light/dark settings.
- Stories have no text version and do not announce a new frame to a screen reader.
- No plain "easy" way in: a first-time visitor sees five tabs, a search bar, a dictionary, and a profile at once.
- No Spanish. No testing with VoiceOver, TalkBack, NVDA, switch or voice control, or with disabled residents.
- Some small controls (36px) and grey small text fall under the target and contrast goals.

## Easy mode

A switch offered on first open, and always available on the You sheet and desktop header: "Easy" or "Full".
Remembered on this device only. Nothing about the choice leaves the browser.

What Easy mode does:
1. **One thing at a time.** One question or one story frame per screen, with one big button.
2. **Only the guided path.** Three starter journeys and a plain "Start over". Explore, Audit, the map,
   the dictionary tab, and settings sit behind a single "More" button.
3. **Big and clear.** Text at 20px or larger, buttons at least 56px, full-strength ink on plain backgrounds, no grey fine print, no motion.
4. **Everyday words.** Jargon is replaced by the dictionary's own plain definitions, shown in place.
5. **Always a way back.** "Back" and "Start over" are on every screen, in the same place.
6. **Read it to me.** A button on every screen reads the screen aloud using the browser's built-in
   voice. It works offline and sends nothing anywhere.
7. **Take it with you.** "Save or print this page" for people who prefer paper, and a plain list of the
   official source links.

## Blind, low-vision, and motor-access work

- Every story has a "Read as text" view listing all frames, and each new frame is announced politely.
- A real heading outline and landmarks on every screen. The first control is a visible "Skip to content".
- Visible text matches the control's accessible name, so voice control ("tap Next") works.
- No action needs dragging, hovering, or a double tap. Everything works by one tap or one key.
- A high-contrast option, and respect for the system contrast, reduced-motion, and text-size settings.
- Targets at least 44px everywhere, including the 36px small buttons.
- Test with VoiceOver on iPhone and TalkBack on Android, then NVDA on desktop, then switch and voice
  control. Record each result as passed, failed, or not tested. Claim nothing until it is tested.

## Phases, in the order to spend your limit

**Phase 1: share the engine (small, no visible change).**
Move the story builders out of `ext/cxm-today.jsx` into a shared file loaded by both layouts. Keep the
frame shape: kicker, big line, small line, plus a new `source` and `next` field on every frame. The
phone must look identical afterward; the hash of the phone behavior is the check.

**Phase 1b: quiet the text (do with Phase 1; mostly CSS and copy, no logic).**
Apply the rules above. Start with the phone Today tab and the story frames, since people see them
first, then the room headers on both layouts. Mechanically: drop most `cxm-kicker` and `atlas-eyebrow`
uses, raise the color and size of `cxm-fine` and `cxm-mut` where they carry real information, and
rewrite the story frame copy. Check Bento and Original at phone and desktop widths.

**Phase 1c: Easy mode (after 1b, before desktop stories).**
Build the Easy/Full switch and the one-screen-at-a-time shell on the phone first, using the story
engine as its content. Add the read-aloud button and the print/save page. Desktop gets the same switch
once stories are on the desktop.

**Phase 1e: map hover card fixes (small, mostly copy and timing; found Oct 1, 2026 from screenshots of Ward 8).**

Problem 1, wrong information on every council member. Hover over any council member on the map and the
card lists "15-ward map maps → this" and "Residents elects → this". The same two lines appear on all 15
members, because one edge from the 15-ward map and one from Residents is drawn to each of them. It reads
as if the whole 15-ward map belongs to that one person, and "ward 15" shows on every member next to
Ward 8, Ward 5, and the rest. The member's own ward ("Cleveland Ward 8") is the only ward fact that is
specific to them.

- Fix: on a council member's hover card, show only facts that belong to that person: their name, office, their own ward, and "serves on City Council". Drop the "15-ward map maps → this" line. Decision for you: also drop "Residents elects → this", since it is identical for all 15; the plan assumes yes.
- Where: the edge list is built from the room's data in the compiled Sep 23 app; the card is `CX_HoverCard` in `ext/cx-live.jsx`. The change is a filter in the card (hide a relationship when the same one is drawn to every sibling node), so no source data is edited.
- Also check the record drawer and the Text view's "Connections, in words" for the same repeated line, and give the Council room one plain sentence once, at the top: "Each of Cleveland's 15 wards elects one council member."
- Done when: no council member's card or drawer mentions the 15-ward map as a connection to them, in both layouts and both styles, and a person with two wards in the data (none today) would still show correctly.
- Tell the Council: this is a note to flag to whoever owns the Council room content. It is a labeling problem in how the connections are drawn, not an error in any member's ward.

Problem 2, the card appears too fast. It pops up the instant the pointer touches a node, so sweeping
across the map flashes cards at every node.

- Fix: wait about 300 ms of hovering before showing the card, then fade it in over about 250 ms with an ease-out. Moving from one node to a neighbor while a card is open swaps content without restarting the wait. Keyboard focus shows the card after the same short delay so it never flickers while tabbing.
- Where: `cxHoverNode` and `cxHoverSet` in `ext/cx-live.jsx` (the timer), and `.cx-hovercard` in `ext/cx.css` (the fade).
- Keep: the reduced-motion rule that already turns the animation off. With reduced motion on, keep the short wait but skip the fade.
- Done when: sweeping the pointer across the map shows no cards, a pause shows one smoothly, and keyboard and touch (long press) behave the same way.

**Phase 2: stories on the desktop (the biggest win).**
- A "Stories" row at the top of the chamber landing, same five stories as the phone.
- A reader opens in the right panel (the existing slide-out), not a full screen. Arrow keys and
  buttons move between frames; no auto-advance.
- The last frame hands off to that room's 4-step guided view, so the two guided styles become one path.

**Phase 3: a clear first-visit path on the phone.**
- First open shows three starter journeys instead of five tabs worth of choices: "Who represents me",
  "What is on my ballot", "What did Council do this year".
- Each journey is a story, ends with "Go deeper" into the matching room or record, and remembers
  progress locally so "Continue" appears next time.
- Replace jargon in tab and sheet labels using the dictionary's own plain terms.

**Phase 4: connect story to Explore on both layouts.**
Every frame's "Go deeper" opens the matching room, record, or panel using the links that already exist
(`?room=`, `?node=`, `?panel=`). Add a visible "Back to the story" so people do not get lost.

**Phase 5: accessibility pass.**
Do everything under "Blind, low-vision, and motor-access work" above. Stories get a text version and
announce each frame; focus moves into the reader and returns on close; high contrast and 44px targets
land everywhere. Then test on real devices and record what was and was not tested.

**Phase 6: watch real people.**
Five residents, phone in hand, one task each ("find who represents you"). Fix what stalls them. Only
then add more stories.

## Cost guidance for a limited weekly limit

- Phases 1, 1b, 1c, and 2 are the core. Do them first, in one or two sessions, and stop there if needed.
- Use Sonnet for the build work. Keep the larger model for one final review before a release.
- Do not re-read the whole app each session: the files that matter are `cxm-today.jsx`, `cxm-core.jsx`,
  `cx-ui.jsx`, and the new shared story file.
- Build and browser-check once per phase, not after every edit.

## Decisions (taken as the working answer; change any of them before the phase it affects)

1. The desktop reader opens in the right panel, matching the record drawer. Affects Phase 2.
2. The three starter journeys are "Who represents me", "What is on my ballot", and "What did Council do this year". Affects Phase 1c.
3. Spanish is in scope, as Phase 7. To keep it cheap, Phase 1 stores every story and Easy mode string as
   data, not inline text, so translating later means adding a file, not rewriting screens. Spanish copy
   needs review by a Spanish-speaking resident before it ships.
4. Easy mode is the default for first-time visitors, with "Full" one tap away. Affects Phase 1c.

## Roadmap

A session is one sitting of focused work ending in a clean build, a browser check, and a commit.
Phases are ordered so each one is useful on its own and you can stop after any of them.

| # | Phase | Done when | Size |
| --- | --- | --- | --- |
| 1 | Share the story engine; strings stored as data | Phone looks and behaves the same; both layouts can import the builders | 1 session |
| 1b | Quiet the text and rewrite in warm, direct words | Phone Today, stories, and room headers have no all-caps labels; every kept grey line passes 4.5:1 in Bento and Original | 1 session |
| 1e | Map hover card: remove the repeated 15-ward map line from council members, slow the card down | No member card mentions the 15-ward map; cards need a pause to appear and fade in; reduced motion respected | under 1 session |
| 1c | Easy mode on the phone, with read-aloud and print/save | A first-time visitor reaches "who represents me" in 3 taps with no jargon; every screen reads aloud; choice persists locally | 2 sessions |
| 2 | Stories and Easy mode on the desktop | Stories row on the landing page; reader in the right panel; last frame hands off to the room guide; keyboard works | 2 sessions |
| 3 | Connect stories to Explore both ways | Every frame has Go deeper and Back to the story; deep links round-trip | 1 session |
| 4 | Text version and announcements for stories | Every story has a Read as text view; a screen reader announces each frame; focus moves in and back out | 1 session |
| 5 | Access pass across the app | Skip link, heading outline, landmarks; labels match names; no drag or hover needed; 44px targets; high-contrast option; follows system contrast, motion, and text size | 2 sessions |
| 6 | Device and resident testing | VoiceOver, TalkBack, NVDA, switch, and voice control each recorded as passed, failed, or not tested; five residents, one task each, fixes made | 2 sessions plus people's time |
| 7 | Spanish | Reviewed Spanish for stories, Easy mode, and navigation; language choice persists locally; screen readers switch voice | 2 sessions plus a reviewer |

Rules that apply to every phase: both styles (Bento and Original), both layouts, receipts not scores,
no em dashes, no left accent stripes, nothing personal in links or requests, a clean rebuild with the
hash recorded next to any claim, and an updated STATE-OF-BUILD.md.

## What to claim, and when

Until Phase 6 is done, the app says only what is true: it has keyboard support, a text view, and
reduced motion, and it has not been tested with assistive technology. After Phase 6, publish what
passed and what did not. A WCAG 2.2 AA claim waits for the manual tests the Implementation doc lists.

## Not in this plan

Anonymous insights (needs the board decisions in its own doc), the Bench connecting to the app
(stage 8), and any new data source.
