# Master plan: the United States graph, rebuilt on the relationship-map template

Status: phases 1 to 6 built on branches (2026-10-05), not yet reviewed or released; phases 7 to 10 not started (phase 7's tall phone map and hover card are in). Written 2026-10-05 for Brent and the team.
What exists: the kit's map pieces vendored in `vendor/relationship-map-kit/` (README has origin, fingerprint, owner, credit); the adapter and physics in `ext/cx-us-map.jsx` (`cxUsMapModel`, `cxUsMapSim`, `cxUsMapLabels`), tested by `scripts/test_us_map.js`; the d3 force and zoom parts bundled from `ext/cx-d3.js`; the settled map written at build time by `scripts/us_map.js` to `site/us/map-2026.json`; the page `CX_UsMap` on the desktop United States page and the phone's People > Graph; browser checks `us-map`, `us-map-touch`, `us-map-sheet`, `us-map-narrow`, and a rewritten `us-graph`. The old Sky (`CX_UsGraph` in `ext/cx-us.jsx`) is off the page and still in the code (phase 9). The profile page (phase 6) is `cxUsProfile` (its words, pure, tested by `scripts/test_us_map.js`) and `CX_UsProfile` with its corner map `CX_UsCorner`, in `ext/cx-us-map.jsx`; the sheet's Open profile, the Index, the Tree, the Linked view, and a link open it. Browser checks `us-profile` and `us-map-chrome` (the Show panel beside the menu, Settings on the map). This is the top plan. `docs/plan-us-graph-rebuild.md` holds the technical detail of the map itself (physics, labels, touch, the kit), and `docs/plan-federal-map.md` holds the data and the earlier history. Where they disagree, this plan wins.

## The goal in one paragraph

A resident opens the United States graph and sees one big map, about 90% of the page, shaped by gravity so the Senate, the House, the executive branch, the courts and the committees find their own places. Names are on the map. Tap a person and lines run to everyone they are connected to, with every name readable. A panel on the side says in plain words who they are and what they are tied to, with buttons to open their profile, look at them alone, or see them in the list. The profile page is a clear, calm page with big numbers, a small map of their corner, and the record laid out as label and value. Everything is a receipt from an official record. Nothing is a score.

## The examples to keep in mind

These two screens are the VC Fest 26 network guide, which the kit builds. They show the feel we want. For each, what to take, what to translate, and what not to copy.

### Example 1: the Network screen

What it shows: a left menu (Network, Matches, People, Agenda). A top bar with the guide's name, a one-line description ("247 startups and 77 investors. Tap anyone to see who fits them."), a search box with a "/" key hint, and four views as pills: Sky, Index, Linked, Tree. A floating Show panel with toggles, filter chips, and a Motion choice (Still, Calm, Live). A "Solo" picker at the top of the map. The map fills the middle. A side panel on the right has a big name, a sentence, a short list of the most connected, a list of members, and three buttons along the bottom: Open profile, Solo, Explore in Index.

| What the example does | What we do |
| --- | --- |
| The map is the screen. Controls float over it and the details sit beside it. | Same. The map is at least 90% of the visible area, the rest is floating controls and a side sheet that slides over it on a phone. |
| Hubs with members gathered around them by gravity, faint rings around hubs, dim members until focused. | Hubs: Senate, House, Executive, Courts, and committees. Members are pulled to their chamber and to their committees. The shape is found by the simulation. |
| Focus one node and its connections light up, with a line to each and a name on each. | Same, with the names on the map, as you asked. Connections are drawn as lines and every name that fits is labeled. |
| Show panel: toggles for what appears (Startups, Investors, Industries), a color toggle, line toggles, "Strong matches only". | Show: People, Committees, Agencies, Courts. Lines: Sits on, Heads or leads, Appointed by, Funds or oversees. No "strong only" toggle and no color-by-party. |
| Stage chips (Pre-Seed, Seed, Series A) as filters. | Filter chips: Senate, House, a state, a policy area. Party is a dated, sourced fact on a profile; it is not a color or a filter unless you decide otherwise (open question). |
| Motion: Still, Calm, Live. | Keep exactly. Still is the default on a phone and when the device asks for less motion. |
| Solo: pick one group and see only it. | Solo a chamber, a committee, a state delegation, or a policy area. We already have a Solo; it moves into this shell. |
| Keyboard hints: ] [ move, Enter select, Esc clear, S solo, arrows pan, + - zoom, / search. | Same keys, listed on the Show panel. |
| Side panel: big name with a full stop, one plain sentence, a bold highlight line, lists with a quiet sub-line, a Done button. | Same shape. The highlight line is a fact ("Sits on 4 committees"), not a verdict. |
| Four views of the same data: Sky, Index, Linked, Tree. | Keep our four views (we already have Sky, Index, Linked, Tree); all four read one model. |

Do not copy: the green "strong fit" language, "Strong matches only", color by sector (we do not color by party), and the colored dots beside the toggles (the house style says no dots next to labels; use small shapes, which also helps color-blind readers).

### Example 2: the profile page

What it shows: a "Back to Network" bar. Overlapping initials circles. A small capital line ("INVESTOR AT VC FEST 26, CLEVELAND, OH"). A huge name ending in a full stop. A plain sentence about who they are. A bold green line ("Strong fit with 44 startups"). Two outline buttons (Show in sky, Explore in Index). "Their corner of the room": a small dark map of only their connections with counts on the groups, and a caption ("Drag the dots. Tap a group to jump to it."). On the right: "At a glance" with three big numbers and short labels; "Their checklist" as a label-and-value table; a long list of who to meet, each with a quiet sub-line and a right-aligned word.

| What the example does | What we do |
| --- | --- |
| Big name, small capitals kicker, one human sentence. | Same. Kicker: "SENATOR, OHIO" or "COMMITTEE, HOUSE". Sentence from the record: "Serves Ohio in the Senate since January 2025 and sits on 4 committees." |
| A bold highlight line. | A fact line from the record (never a rating): "Voted on 269 bills this Congress." |
| Mini map of their corner with draggable dots and group counts. | The same small map for any person, committee, or agency: only their own connections, with counts on the groups, drag to play, tap a group to jump. |
| At a glance: three big numbers with plain labels. | Three big blue numbers: for a member, votes recorded, committees, bills sponsored (words to be chosen from what the record supports). |
| Their checklist: label and value table. | "From the record": Chamber, State, Term, Party as of a date, Committees, Policy areas voted in, Official page. Each row links to its source and shows when it was pulled. |
| A long list with a right-aligned word ("Strong"). | A list of connections with the record's own word on the right: "Chair", "Member", "Yea", "Nay", "Not voting", "Sponsor". Never "Strong". |
| A line that says what is not known ("We don't guess anyone's identity..."). | The same honesty: "Not voting is not a no." "A missing record is not a no." Sentence kept short and placed where the gap shows. |

Do not copy: the strength words, ordering by fit, the Draft intro, and anything that ranks people against each other. Lists are alphabetical or by the record's own order (seniority, date).

## The shape of the whole feature

Four places, all reading one model:

1. **Map.** Full-bleed, gravity-shaped, named, with Show panel, Solo, search, Motion. Views: Sky, Index, Linked, Tree.
2. **Side sheet.** Opens when you focus a node. On desktop it sits to the right; on a phone it slides up and can be pulled up. Buttons: Open profile, Solo, Explore in Index.
3. **Profile page.** Full page, opened from the sheet, with the mini corner map. Reachable by link, so a person can be shared by name (the link holds the person, never the viewer).
4. **Votes by topic.** The existing topic explorer, moved into the same shell as another place in the left menu (the "Matches" slot). It stays counts and records, no ranking.

The left menu on desktop: Network, People, Votes by topic, and a place for the later "how you line up" mode (see the alignment plan). On a phone the same four become the tabs inside People, as today (Profiles, Constellation, Graph).

## Rules that never change

- Receipts, not scores. No match percentages, rankings, ideology labels, or strength words.
- Sponsorship is not a vote. A missing record is not a no. Not voting is not a no.
- No party colors. Kinds are told apart by shape and label as well as color. The color-vision check must pass.
- Nothing personal leaves the browser. The viewer's state or district never goes into a link.
- Official records update by themselves. News and interpretation wait for a person.
- Plain English. No dashes. No colored dots next to labels. No left stripes on cards.
- Both styles (Bento and Original), both layouts, English and Spanish, light and dark.
- The text version stays. Everything on the map is also in the Index, Linked and Tree views, and the keyboard reaches all of it.

## Phases

Each phase ends with the full gate passing and a screenshot review before the next begins. Nothing is pushed half done.

0. **Decisions** (this plan, below). No code.
1. **Vendor the kit and adapt the data.** Copy the kit into `vendor/relationship-map-kit/` with its fingerprint. Write the adapter that turns our federal record into the kit's three slots. Unit test the graph it makes.
2. **Shell.** Full-bleed map, floating Show panel, search, view pills, side sheet, left menu. Old Sky removed from the page, not yet from the code.
3. **Physics.** Hubs, pulls, collision, settle, fit. Tune on the real data until the shape looks natural. Motion modes.
4. **Names and lines.** Priority labels with no overlap, hubs always named, more at zoom, lines on focus.
5. **Side sheet and Solo.** Sentence, fact line, lists, buttons. Solo from the sheet and the picker.
6. **Profile page.** Big name, fact line, mini corner map, At a glance, From the record, connection list. Shareable by name.
7. **Phone.** Touch (tap, hold, drag, pinch, glide), pull-up sheet, small-screen and large-text passes, Reduce Motion.
8. **Checks.** Port the kit's assertions into `scripts/checks/run.js`. Add: map fills at least 90% of the viewport; no overlapping labels; no name that appears only on hover; no scores or strength words anywhere in the text; sheet closes four ways; Spanish; light; color-vision; axe; a real-phone pass.
9. **Retire the old Sky** once the new one passes, so there is one map. Update the docs and the build record.
10. **Later:** the alignment mode, planned separately in `docs/plan-alignment.md`, which must use the same sheet and profile and still show no score. (Oct 6: step 1 is built as Compare members, the fourth item in the left menu, and as "In your policy areas" on a member's sheet and profile; step 2 is built and hidden until a person reviews its questions. `ext/cx-align.jsx`.)

## Risks

- **Size and speed.** About 540 people plus committees, agencies and courts, all moving. The kit handles a similar count (324 plus industries) on a phone. We test on a mid-range phone and keep Still the default there.
- **Page weight.** The kit inlines d3. Our page allows inline scripts only by hash; `build.py` already computes the hashes. We include only the force, zoom and timer parts of d3.
- **Looks like a scoreboard.** Gravity makes "closer" feel like "better". The sheet says in words what distance means here (shared recorded ties), and a hub's size shows how many members it holds, nothing more. A person reviews the wording.
- **Shape is a surprise.** Natural shapes vary from run to run. The simulation uses a fixed random seed, so the same data opens the same way every time.
- **Spanish.** Every new line needs Spanish. Names from official records stay as they are.
- **Two maps for a while.** Keep the old one reachable until the new one passes, then remove it.

## Decisions (made 2026-10-05)

1. Hover (changed 2026-10-05, Brent): on a computer with a mouse, pointing at a person, committee, court, or agency shows a small card beside it with the kicker, the name, the fact line, and "Click for their connections and profile." The card never covers what it points at, never catches the pointer, goes away when the pointer leaves or on Escape, and never shows party or a score. Everything on it is also in the side sheet after a click, and the Index, Linked, and Tree views and the keyboard reach the same facts. A phone has no hover: a tap selects, and the sheet holds Open profile. Hub totals are drawn in the hub's own label and in the side sheet. (Was: nothing appears on hover.)
2. Hubs: Senate, House, Executive, Courts, and committees. Not policy areas.
3. Who is shown and named (changed 2026-10-05, Brent): everyone is drawn at once, but at rest only the main things are named: the four branches with their totals, the committees, the Supreme Court and the courts of appeals, and the departments if they fit. On a phone at rest: the four largest committees of each chamber and the Supreme Court, with more as you zoom in. No person is named at rest. People are named around a pick (the one picked and everything tied to it), when zoomed in so far that 40 or fewer people are on the screen, and in the hover card. (Was: everyone at once, with names by priority and more as you zoom.)
4. Party: a dated, sourced fact on the profile only. Never a color, never on the map, not a filter.
5. Physics: add the force and zoom parts of d3, as the template does.
6. Left menu on desktop: yes, Network, People, Votes by topic, replacing the current federal entry points.
7. The kit: vendor a copy into `vendor/relationship-map-kit/`; Futureland owns it, Equalpoint is credited as builder.
8. Order: the map first (phases 1 to 5), then the profile page.
9. Shapes by tier (2026-10-05, Brent): the branches are rings (the biggest), committees and courts are hexagons (a committee filled, in the green family; a court outlined and lightly tinted, in pink), agencies are squares, and people are circles (the smallest). The pentagon is gone. The key says each kind in words, so color is never the only signal.
10. A phone held upright gets a tall map (2026-10-05): the same physics and seed, started in three rows, so the map fills the screen instead of leaving bands above and below. The build writes both shapes to `site/us/map-2026.json` (`xy` and `tall`).
11. The profile page (2026-10-05): a link names the person by a readable name (`?panel=us&who=bernie-moreno`), never the viewer. Bills sponsored are not in our record, so a member's third number is subcommittees, and the page says sponsored bills are not in the record yet.
