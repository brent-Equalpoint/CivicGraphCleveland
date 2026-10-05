# Plan: a knowledge map of how the federal government is connected

> Update 2026-10-05: the map itself is being rebuilt on the relationship-map template, full page and shaped by gravity. The top plan is `docs/plan-us-graph-master.md` and the technical detail is `docs/plan-us-graph-rebuild.md`. Where they disagree with the Sky phases below, those two win.

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
- Data we did not have, and now do (Oct 3, 2026): the President and Vice President, the Presidents who appointed sitting judges, the Supreme Court, the 13 courts of appeals, the district courts, and the 845 judges who sit now, each with the President who appointed them (phase 1, below).
- Data we still do not have: bankruptcy and magistrate judges and other courts, the agency each cabinet title leads, which agency handles which committee's topic (that map
  needs a person's review first), who sponsored what. "How everyone is connected in the federal government" is larger than
  Congress, so the executive and judicial layers are a data question (phase 1), not a drawing question.

## Status

- **Phase 2 done (Oct 3, 2026).** `ext/cx-us-model.jsx` holds the model: the five doors with counts, one short note for each of the 4,376 connections, and the structure as a tree. The Index is now the five doors (members, committees, agencies, policy areas, states); Linked reads its notes from the model; Tree reads the model and says on screen that the President, the cabinet, and the courts are not in our record yet. `scripts/test_us_model.js` checks that every door adds up to the record, that no note reads as a score, and that every committee and agency appears once in the tree.
- It also fixed a drop: an agency under a sub-agency (the First Responder Network Authority) was missing from the Sky picture and the tree, because both only handled two levels.
- **Phases 3 and 4 done (Oct 3, 2026).** The Sky is rebuilt on the model: three clusters (Senate and House with their committees on the rim and members inside, placed toward the committees they sit on; the executive agencies in their own disc; the joint committees as a labeled row), a Solo picker (a committee, an agency family, or a state), a side panel with Profile, Solo, and In words, and folder tabs for the views. On desktop the map fills the page, and a Full button uses the browser's full screen. Motion is our own small engine (`cxUsStep`, in the model): Still, Calm (slow drift, and a pulled node brings its connections along on springs), and Live (looser, with a push between nodes that get too close). Everything has a home and returns to it. A phone, or anyone who asked their device for less motion, starts on Still. The loop pauses when the tab is hidden or the map is off screen. `scripts/test_us_model.js` pins the layout, Solo, and the motion (still holds, calm stays within a few pixels, live settles back after a pull, nothing becomes a bad number).
- **Phase 1 done for the President and the courts (Oct 3, 2026).** `scripts/fetch_us.py` now also reads the unitedstates project's `executive.json` and the Federal Judicial Center's `judges.csv`, and keeps: the President and Vice President on today's date; every President who appointed a sitting judge (matched by first name, middle initials, and last name, and left empty when a spelling fits two people); the courts that have a sitting judge (the Supreme Court, 13 courts of appeals, the district courts, the Court of International Trade), with active and senior counts and their circuit; and the sitting judges (latest service has no end date; senior judges are counted, not listed). The circuit for each district court comes from a table of 28 U.S.C. 41 written out by hand in `fetch_us.py`; a person should compare it with the statute. The safety check refuses a snapshot with no President, other than 9 justices, fewer than 600 judges, a district court with no circuit, or a judge whose appointing President is not matched. Tests: `scripts/test_us.py`. Both sources are in `scripts/us_sources.py` as terms not yet read by a person.
- **The map uses it.** A fourth cluster (Federal judges) sits beside the executive agencies; the President, the Vice President, and the former Presidents sit in a ring at the center of the agencies; a judge sits beside their court, and selecting a President lights every judge they appointed. The Index has six doors (Members, Committees, Executive branch, Courts and judges, Policy areas, States); Linked, Tree, Solo, and search read the same model. Party is shown only for the current President and Vice President, as a dated sourced field, and never for a judge.
- **The cabinet is in too (Oct 3, 2026).** The White House cabinet page has no data file, so `scripts/fetch_us.py` reads it by structure (a name heading, then a title heading) and refuses a page that does not look like a cabinet (12 to 40 people, a Secretary of State, an Attorney General, a Secretary of the Treasury, no repeats). If the page changes shape the last good list is kept and a warning printed, so this one source cannot stop the refresh. Each cabinet member is tied to the President and to nothing else: which agency a title leads is interpretive and waits for a person.
- Still open: bankruptcy, magistrate, and other courts and judges; the link from each cabinet title to the agency it leads (needs a person); and the source-terms sign-off in `docs/source-terms-review.md`.
- **Graph is a People view on the phone (Oct 3, 2026).** People now reads Profiles | Constellation | Graph. Graph opens the Sky with the map first and search and filters below it; the Federal tab's "Explore Congress as a graph" row switches to it. The link is `?panel=us&view=graph`, so the desktop (which reads `panel=us`) is unchanged.
- **Pinch to zoom (Oct 3, 2026).** On a touch screen, two fingers zoom the map and pan it together with the point between the fingers staying put; one finger pans (or pulls a node in Calm and Live); a pinch never selects anything. The Federal browser check sends a real two-finger gesture and reads the map's zoom.
- Next: phase 5 is mostly done by the Index, Linked, and Tree work; what remains is the edge pulse and a pass on the phone Sky. Phase 1 (executive and judicial data) waits on the scope decision. The alignment mode (below) gets its own methodology plan first.

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

## Later: an alignment mode ("how you line up with them, by policy")

Asked for Oct 3, 2026. The methodology plan is `docs/plan-alignment.md` (a draft, with decisions for a person to make); no code until those are answered. What is already settled, because the project's rules decide it:

- **It is the Constellation idea applied to Congress, so it keeps the Constellation's limits.** Show counts on documented records, per policy area ("you and this member answered the same on 6 of the 9 recorded votes in Energy that you answered"), never one overall number, never a percentage, a rank, a "best match", or an ideology label. Position or color never means "closer is better".
- **Only recorded things.** Votes the member cast (Yea, Nay) and answers the resident gave. A vote the member did not cast is "not in the roll", and not voting is not a no. Procedural votes (rules, motions) are left out of agreement unless the question is the same as the resident's.
- **Everyone stays visible.** A member with few comparable records is shown with that count, not hidden or sorted last.
- **On the device only.** The resident's answers never go into a link or a request, like Place and priorities today.
- **Party is not an input and not a color.**
- **Open questions for the methodology plan:** which policy areas and which votes count as "the same question"; how a resident answers (their own yes or no on the bill, as the Constellation does); how to show the numbers on the map without implying a ranking (for example, a ring of counts in the side panel instead of recoloring the sky); how to word it so nobody reads a fraction as a rating; and who reviews the wording before it ships.

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
