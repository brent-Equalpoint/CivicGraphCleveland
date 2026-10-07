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

## What the Index is now (Oct 6)

The Index view is Brent's VC Fest Index kit, ported into our own source (`ext/cx-us-index.jsx`, styles in `ext/cxm.css`; the kit is not vendored).
The front page lists six groups with their counts from the record: Members of Congress, Committees, Executive branch, Courts and judges, Policy
areas, and States. Pick a group, then a name: that name moves to the middle with every group the record ties to it, and you can keep going.
Every node of `cxUsMapModel` has a page, built when it is opened from the same model as the map (nothing is baked); a state and a policy area have
pages too. A senator's groups are Committees, Subcommittees, State, and Chamber; a committee's are Chair and leaders, Senate members, House
members, Subcommittees, and Chamber; an agency's are Part of, Agencies under it, and Led by (not in our record yet, and it says so); a court's are
Judges, Its appeals go to, Hears appeals from, and Appointed by; a state's are Senators and Representatives; a policy area's are the members who
cast a deciding vote in it, as Solo shows. Each row carries the record's own word (Chair, Ranking member, Member, Ex officio, Appointed by,
Judge); the ring by the title is a plain count ("5 committees"). Groups are in the record's order and names alphabetical by last name or in the
record's order, never by count. A subcommittee, which has no page, opens a details card in the map's own sheet (what it does and why it matters,
why it is linked, who sits on it, the committee's website and profile). Every page has Open profile (a state: no profile) and Show on the map
(a state or a policy area: Solo).

- **Computers:** the name sits on the left as a slowly turning globe (still under Still or Reduce Motion), its groups in a column, and the chosen
  group's names fan out on the right on curved lines, a page at a time ("and 55 more · page 1 of 5"). Crumbs at the top, Back to the start two
  steps in.
- **Phones:** one column, the full width of the screen: the globe and the name, the groups as buttons that wrap (no sideways scroll), then the
  list, 60 at a time with Show more.
- **Moving:** each name opened is a step in the browser's history (`ix` and `ixR` in `CX_UsMap`), so Back, the back gesture, Escape, and
  Backspace step back one name at a time, to the same group, list page, and scroll; Forward goes back in. Leaving the Index takes its steps
  out of history first. The search box works in the Index too. Explore in Index (the sheet, a profile) opens the Index on that page.
- **Changed from the kit on purpose:** no strength words or rings (the kit's "Strong fit" and its strength ring), no row dots (the kind's own
  shape instead), group names with a count instead of a strength mix, a chosen group shown solid in the accent, 44 px names (the kit's are 34),
  names that wrap instead of being cut, the map's color families and shapes, no `#id` link (a link to a person still opens their profile),
  the map's Show filters do not hide anything in the Index (it holds the whole record), and the kit's own top bar, menu, About, and
  Accessibility screens are the app's (Settings on the map).
- **Checked by** `us-index` (and the Index pages in `axe`, `no-bleed`, `text-overlap`, `color-vision`).

## What the Tree is now (Oct 6)

The Tree view is Brent's VC Fest Tree kit, ported into our own source (`ext/cx-us-tree.jsx`, styles in `ext/cxm.css` under `.ust-`; the kit is
not vendored). It replaces the nested outline (`CX_UsTree` stays only for the old Sky, which is off the page). A top-down picture: "The United
States federal government" in a light card at the top with its counts from the record (members of Congress, committees, agencies, courts); the
three branches as columns under it on curved lines, each in its color from the map's key (the Senate's blue, the executive's amber, the
courts' pink), with its title, its counts ("5 lists · 539 members · 49 committees"), and a round toggle; each branch's lists as cards; a list
opens as a drawer of names, each with the record's own word.

- **The lists.** Legislative: Senate, House (members, alphabetical by last name, with their state or district), Senate committees, House
  committees, Joint committees (each committee opens its leaders and members with the record's role word, and starts with what it does).
  Executive: President and Vice President, Cabinet (the record's order and titles, with the note that which agency a title leads is not linked
  yet), Departments, Other agencies (each opens the agencies under it, at any depth), Former Presidents (each opens the judges they appointed).
  Judicial: Supreme Court, each of the 13 courts of appeals in the order of 28 U.S.C. 41 (with its judges), District courts (by circuit, each
  closed until opened), Other courts, and every judge (with the old Tree's note on what is not in our record). "Other agencies" rather than
  "Independent agencies": the record does not say which agencies are independent.
- **A name** opens a details card in the map's own sheet: what it is, where it sits in the Tree, why it is linked (the record's word), a
  committee's two plain lines with their review notice, Open profile, Show on the map, Explore in Index, and the record's own website.
- **Moving.** Open all, Close all, zoom out, zoom in, Fit, a mouse drag, Ctrl with the wheel (and a trackpad's pinch), and a pinch on a phone;
  the picture scrolls inside its frame and the page never scrolls sideways. On a phone each branch is a column a little narrower than the
  screen, so the next one peeks in. Each opening is a step in history (`trR` in `CX_UsMap`): Back and the back gesture close what was opened
  last, Forward opens it again, and leaving the Tree takes its steps out first. The search box finds a name in the Tree and points to it.
- **Keyboard.** Tab goes through the picture in its order; up and down move inside a column, left and right to the nearest thing in the next
  column, Home and End to the top and bottom of a column; Enter and Space open and close; Escape closes the card.
- **Changed from the kit on purpose:** no strength words or colors, the record's word instead; 44 px rows that wrap; the map's shapes and color
  families with each group's heading as the word; no party; lists in the record's order or alphabetical, never by count; a long list shows 60
  names at a time with Show more; the app's top bar, Settings, and sheet instead of the kit's menu, About, and Accessibility; no `#id` link (a
  link to a person still opens their profile, and the search box points to a name in the Tree); drag, pinch, and the wheel as well as the buttons.
- **Checked by** `us-tree` (and the Tree's pages in `axe`, `no-bleed`, `text-overlap`, `color-vision`).

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
12. The Index (2026-10-06, Brent): Brent owns the VC Fest Index kit, so its layout and interactions are ported straight into our source with a one-line note of where the design comes from; no vendored copy, README, or owner credit. It replaces the old list of category cards and one long list (`CX_UsDoors` stays only for the old Sky, which is off the page). See "What the Index is now" above.
13. The Tree (2026-10-06, Brent): the same for Brent's VC Fest Tree kit, ported into `ext/cx-us-tree.jsx` with a one-line note of where the design comes from. It replaces the nested outline (`CX_UsTree` stays only for the old Sky). See "What the Tree is now" above.
