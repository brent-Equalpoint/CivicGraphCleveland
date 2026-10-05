# Plan: rebuild the United States graph on the relationship-map template

Status: proposed, nothing built. Written 2026-10-05 for Brent and the team. The top plan is `docs/plan-us-graph-master.md` (screens, examples to keep in mind, phases, decisions); this one is the technical detail under it. This plan replaces the "Sky" phases in `docs/plan-federal-map.md` where they disagree.

## What you asked for

1. The graph takes up about 90% of the page, so it can be read and explored.
2. Its shape comes from physics and gravity, found naturally, not placed by hand.
3. Names are on the map, not in a box that pops up when you hover.
4. It is built from the relationship-map template (the VC Fest 26 kit), not from our own one-off canvas.

## Where the current graph differs

The federal Sky (`ext/cx-us.jsx`, `ext/cx-us-model.jsx`) places its clusters with fixed positions: the Senate, House, executive and courts hubs sit at set points (`CX_US_LAYOUT`), committees are spaced around a ring, and people are nudged apart in a fixed order (`cxUsPlace`). Our small motion engine (Still, Calm, Live) only wobbles things around those places. So the shape is drawn, not found. It also shares the page with panels and controls, so the map is a part of the screen, not the screen.

## What the template does that we want

The kit's map (`src/flx-vcfest.template.html`, the `skyBuild` function and the label code) is a real force simulation on a canvas:

- **Hubs and members.** The groups are big hub nodes (VC Fest: industries). Every member is pulled toward the hub or hubs it belongs to by a link whose strength says how tightly. Strongly tied members sit close; loosely tied ones drift.
- **Forces.** Hubs repel each other strongly, members repel lightly, nothing overlaps (collision), and a gentle pull to the center keeps the whole map together. The result is clouds of members around their hubs, and the hubs find their own spacing. Nobody sets a position.
- **Settled start.** The simulation runs ahead before the first draw, so the map opens already formed, then fits itself to the screen. On a device that asks for less motion it stays still.
- **Names on the map.** When a person is focused, that person and the people they connect to get labels drawn on the canvas, chosen by priority and kept from overlapping (a box test, at most about 90 labels). Hubs are labeled. Zooming in labels more. This is the screenshot you shared: every connected name is readable at once, with lines out to each.
- **Touch.** Tap to focus, hold to peek, drag to move one node, two-finger pinch, and a glide after a swipe. These are already tested in the kit (`test_phone_sky.py`, `test_momentum.py`, `test_sheet_pull.py`).
- **Sheets.** A details panel that pulls up, glides, and moves the map with it. Every sliding screen has a Done button, closes on tap outside, swipes down, and closes on the back gesture (`test_exits.py`).
- **Small screens and settings.** Checks at 320 and 260 wide, Larger Text, Reduce Motion, Increase Contrast (`test_narrow.py`).

## The page

- **Size.** The graph is the page: it fills at least 90% of the visible area, edge to edge on a phone and on a desktop window. The header and the tab bar stay, controls float over the map and fold away, and the details open as a sheet over the map. A full-screen button stays for people who want the rest hidden.
- **Natural shape.** Hubs: Senate, House, Executive branch, Courts, and the committees as smaller hubs members are pulled toward. Members are pulled to their chamber hub, and to the committees they sit on, with lighter ties for committees than for the chamber. Agencies are pulled to the executive hub and to the cabinet member that heads them when that link is on record. The map is allowed to look uneven. That is the point.
- **Names.** Names are drawn on the map. For the focused person: their name, then every connected name that fits, by priority. Hubs always have their names. At high zoom more members are named. There are no names that appear only in a hover box. (Open question below about the one-line hover note for hub totals.)
- **Lines.** Focusing someone draws a line to each connection, as in the screenshot. A line means a recorded relationship, not control. The text version (Index, Linked, Tree) stays as the accessible twin of the map and must always say the same things.

## Rules the rebuild keeps

- Receipts, not scores. No match percentages, rankings, or ideology labels. The kit's candidate version uses the words "Strong, Some, Light alignment"; those words are not used here, and no distance on this map means "more like you". Distance here only shows how many recorded ties two things share.
- Sponsorship is not a vote. A missing record is not a no. Not voting is not a no.
- No party colors. Chamber, committee and agency kinds are told apart by shape and label as well as color, and the color-vision check passes.
- Nothing about the person leaves the browser. A place the person chooses to find their own senators and representative stays on the device and never goes into a link.
- Official records update by themselves; news and interpretation wait for a person.
- No dashes in text. No colored dots next to labels (the kit's house style says the same). Both styles, both layouts, English and Spanish.
- Every source stays registered in `scripts/us_sources.py` with its terms status.

## How we use the kit

1. Copy the kit into the repo as vendored source, not edited in place: `vendor/relationship-map-kit/` with its README, so the origin and fingerprint (`e58ee28385f7` for the first version) are on record. Futureland owns the kit; Equalpoint is credited as the builder. Confirm that is how you want it recorded.
2. Take only the map pieces: the force simulation and label code, the touch handling, the sheet behavior, and the tests that go with them. Not the match engine, the code screen, the intro drafts, the agenda, or the venue map.
3. Our data feeds the template's three slots instead of VC Fest's: groups on the map are the chamber and committee hubs; members are the people; agencies and courts are their own kinds. We write a small data adapter in `scripts/` so the page reads the same shape the kit does.
4. d3: the kit inlines `d3.min.js`. Our Content-Security-Policy allows inline scripts only by hash, and `build.py` already computes hashes, so inlining works; it adds file size to the hosted page (the full d3 is large). Preferred: include only the force, zoom and timer pieces.
5. Our motion modes (Still, Calm, Live) map to the kit's: Still runs ahead and stops; Calm settles; Live keeps a faint drift.
6. Port the kit's tests into `scripts/checks/run.js` (the kit's are Python and Playwright; ours are Node and puppeteer), keeping what they assert.

## Order of work

1. **Decide the open questions below.**
2. **Vendor the kit and write the data adapter,** with a unit test on the graph it produces (counts of hubs, members, links; every link has a source).
3. **Page shell:** full-bleed map at 90% or more, floating controls, sheet for details. Remove the old fixed layout.
4. **Physics:** hubs, pull strengths, collision, settle, fit to screen. Tune until the shape looks natural with the real data (about 540 people plus committees, agencies and courts).
5. **Names and lines:** priority labels for the focus and its connections, hubs always named, zoom reveals more.
6. **Touch and keyboard:** tap, hold, drag, pinch, glide; arrow keys and Enter on the text twin; sheets that close the four ways.
7. **Checks:** map fills at least 90% of the viewport on phone and desktop; labels never overlap; no names appear only on hover; no horizontal scroll; Still when the device asks for less motion; Spanish; light mode; color-vision; axe. Browser checks for pinch and drag with simulated touch, and one pass on a real phone.
8. **Remove the old Sky code** once the new one passes, so there is one map.

## Decisions (made 2026-10-05; the full list is in `docs/plan-us-graph-master.md`)

Hub totals on the hub's label and in the sheet, no hover box. Hubs are the chambers, executive, courts and committees. Everyone shown at once. Party only as a dated fact on a profile. d3 force and zoom added. Kit vendored with Futureland as owner and Equalpoint credited.
