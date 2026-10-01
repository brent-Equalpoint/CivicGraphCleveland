# Plan: guided stories on phone and desktop

Written Oct 1, 2026. A plan only; nothing in the app has changed.

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
Every story gets a plain text version (all frames as a list, no tapping). Focus moves into the reader
and returns on close. Reduced motion turns off the rise animation. Tap zones also work by keyboard.
Targets 44px. Test with VoiceOver or TalkBack on a real phone; record what was and was not tested.

**Phase 6: watch real people.**
Five residents, phone in hand, one task each ("find who represents you"). Fix what stalls them. Only
then add more stories.

## Cost guidance for a limited weekly limit

- Phases 1, 1b, and 2 are the core. Do them first, in one or two sessions, and stop there if needed.
- Use Sonnet for the build work. Keep the larger model for one final review before a release.
- Do not re-read the whole app each session: the files that matter are `cxm-today.jsx`, `cxm-core.jsx`,
  `cx-ui.jsx`, and the new shared story file.
- Build and browser-check once per phase, not after every edit.

## Decisions for you

1. Should the desktop reader open in the right panel (recommended, matches the record drawer) or full screen like the phone?
2. Which three starter journeys on the phone? The three above are the suggestion.
3. Is Spanish in scope for the first release? It changes how frames are written, so decide before Phase 1.

## Not in this plan

Anonymous insights (needs the board decisions in its own doc), the Bench connecting to the app
(stage 8), and any new data source.
