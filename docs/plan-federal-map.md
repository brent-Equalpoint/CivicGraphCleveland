# Plan: a knowledge map of how the federal government is connected

Written Oct 3, 2026. Nothing here is built. It is a plan to pick up when we choose to, in the same form as the other plans.

The goal: someone can see who is connected to whom in the federal government, open any person, committee, or agency, and read
why it is connected, in plain words, with the record behind it. The picture is one way in. The list, the linked view, and the
tree are the others, so nobody has to use the picture.

## Where we stand

- The Federal tab in People (v5.17) shows a state's two senators and a district's representative as profiles.
- "Explore Congress as a graph" opens `CX_UsGraph` (`ext/cx-us.jsx`, 485 lines): Sky, Index, Linked, Tree, and Topics.
- Sky is a hand-written canvas, not D3. Its layout is fixed and computed from the data (golden-angle spirals around three hubs),
  with no physics, so it never moves, never settles, and cannot be pulled. That is why it feels flat next to the reference
  screenshots: no clusters you can read, no solo, no motion, no side panel that explains what you tapped.
- Data we have: 539 members, 49 committees with 181 subcommittees, 260 federal agencies (Federal Register), policy areas, recorded votes.
- Data we do not have: the President and the cabinet, the federal courts, which agency handles which committee's topic (that map
  needs a person's review first), who sponsored what. "How everyone is connected in the federal government" is larger than
  Congress, so the executive and judicial layers are a data question (phase 1), not a drawing question.

## Status

- **Phase 2 done (Oct 3, 2026).** `ext/cx-us-model.jsx` holds the model: the five doors with counts, one short note for each of the 4,376 connections, and the structure as a tree. The Index is now the five doors (members, committees, agencies, policy areas, states); Linked reads its notes from the model; Tree reads the model and says on screen that the President, the cabinet, and the courts are not in our record yet. `scripts/test_us_model.js` checks that every door adds up to the record, that no note reads as a score, and that every committee and agency appears once in the tree.
- It also fixed a drop: an agency under a sub-agency (the First Responder Network Authority) was missing from the Sky picture and the tree, because both only handled two levels.
- Next: phase 3 (Sky rebuilt on the model). Phase 1 (executive and judicial data) waits on the scope decision.

## About the aicanvas component

The "AI Knowledge Map" on aicanvas.me is a Premium product: React, TypeScript, Framer Motion, Tailwind, an orb that sends light
down wires to five category cards. Its source is for subscribers only, and it is not the Sky/Index/Linked/Tree map in your
screenshots (that looks like your own VC Fest 26 network). So the plan is to borrow the ideas, not the code:

| Idea | In our version |
| --- | --- |
| One center, five doors with a count ring each | "Five ways into the government": Members, Committees, Agencies, Policy areas, States. Rings show counts of what is inside, never a score |
| Light travels the wires | A pulse along the edges of the selected node, to show a recorded connection, not influence |
| Solo a sector | Pick a committee, an agency, or a policy area and show only it and its neighbors |
| Motion Still / Calm / Live | Same three settings. Reduced-motion users start on Still |
| Side panel with "Open profile / Solo / Explore in Index" | The same three actions, using our shared profile card words |

If you hold a Premium license and want its source in the repo, say so: it would bring Tailwind, TypeScript, and Framer Motion into
a build that has none of them (see Decisions).

## Rules this keeps

Receipts, not scores (no "strong fit", no ranking of members, no influence size). A connection is a recorded relationship, not
control. Party is a sourced, dated field and never a color or a grouping. A missing record is not a no. Nothing personal leaves
the browser. Plain English, no em dashes, no left accent stripes. Both styles, both layouts, English and Spanish, color-blind
safe, light mode (desktop maps stay dark by decision). The canvas is never the only way in: Index, Linked, and Tree carry
the same facts as text, and every node is reachable by keyboard.

## Phases

| # | Phase | Done when | Size |
| --- | --- | --- | --- |
| 0 | **Decide** the questions below (license, scope, motion library) | answers written at the top of this file | a conversation |
| 1 | **Data for the whole government.** Add the executive and judicial layers to `data/` through `scripts/refresh.py` only, from official public sources (President, cabinet departments, Article III courts), each with a source and a date. Interpretive links (agency to policy area) wait for a person's review | `data/us-landscape` has the new nodes and sources; `test_us.py` covers them; nothing hand-edited | a session |
| 2 | **The five doors.** One model that every view reads: groups, counts, and a connection list with a plain sentence per edge. Replaces the separate lists each view builds today | one `cxUsModel()`; the Index shows the five doors with count rings and pages of names | a session |
| 3 | **Sky, rebuilt.** Clusters you can read (chamber, committee, agency family), solo picker, show toggles, side panel with the three actions, drag to pull a node and its neighbors, fit and zoom controls. Still draws on one canvas | the map reads at a glance; a unit test fixes the layout for a given data set | two sessions |
| 4 | **Motion.** Calm drift and the edge pulse, written by us (a small spring and a requestAnimationFrame loop, seeded so a screenshot is repeatable). Off under reduced motion; pauses when the tab is hidden or the map is off screen | a frame-time check on a mid phone; `prefers-reduced-motion` opens on Still | a session |
| 5 | **Linked and Tree.** Linked shows the selected node and every neighbor with its sentence; Tree is the structure as nested, keyboard-friendly lists (Federal government, then Legislative, Executive, Judicial). Both open and close with the same motion | every node in Sky is reachable in both; expand and collapse by keyboard | a session |
| 6 | **Phone.** The Federal tab already starts with profiles. The map opens in a sheet; tap selects, hold shows details, the panel becomes a bottom card | `us-map` check passes at 390px with no sideways scroll | a session |
| 7 | **Checks, Spanish, color-vision.** A `us-map` browser check; the new text in Spanish; node and edge colors as meaning groups in `design/tokens.json`; axe, no-bleed, targets | all checks green, including `CHECK_LANG=es` and `CHECK_MODE=light` | half a session |

## Decisions to make first

1. **The aicanvas component.** Our recommendation: borrow the ideas, write our own. Using theirs needs a Premium license, and its
   stack does not fit ours.
2. **Scope.** Congress only (what the data supports now) or the whole federal government. The second needs phase 1 and a person to
   review any link we infer.
3. **Motion library.** `ext/*.jsx` has no imports: every file is compiled into one shared scope with the old app, so Framer Motion or
   d3-force would need a vendoring step in `build.py` (a pinned, hashed file, like the fonts) and adds weight to a 4 MB offline
   file. We recommend CSS transitions plus a small loop of our own. d3-force is the one library worth reconsidering if the clusters
   do not settle well by hand.
4. **Names.** "Linked" and "Tree" are your words from the reference. We can keep them, or use plain ones ("Connections", "Structure").

## What to watch

- **Hairballs.** 539 members, 230 committees and subcommittees, and 260 agencies draw a dense picture. Solo, fit-to-selection, and showing only a
  node's neighbors by default keep it readable.
- **Motion that implies influence.** A pulse or a bigger dot must mean something recorded (seats held, votes cast), or be plain
  decoration that the legend says is decoration.
- **A hash that moves.** Layout is computed from the data at build or load time with a fixed seed, so two clean builds stay
  identical and `design-look` snapshots are stable.

## Rules that apply

Everything in `CLAUDE.md`. Data only through `scripts/refresh.py`. The look only through `design/tokens.json`. Update
`STATE-OF-BUILD.md` and the design-system components list when a phase ships.
