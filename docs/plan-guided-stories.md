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
4. One idea per frame. Short sentences. Plain English, no em dashes.
5. Nothing personal leaves the browser. Ward and answers stay local.
6. Each phase ends with a clean build, a browser check at phone and desktop widths in both Bento and Original, and a commit.

## Phases, in the order to spend your limit

**Phase 1: share the engine (small, no visible change).**
Move the story builders out of `ext/cxm-today.jsx` into a shared file loaded by both layouts. Keep the
frame shape: kicker, big line, small line, plus a new `source` and `next` field on every frame. The
phone must look identical afterward; the hash of the phone behavior is the check.

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

- Phases 1 and 2 are the core. Do them first, in one or two sessions, and stop there if needed.
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
