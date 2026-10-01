# Plan: a United States graph, built from official records

Written Oct 1, 2026. A plan only; nothing in the app has changed.

## What it is

Two layers on one graph, both pointing back to the resident:

1. **The landscape.** The federal government as a map: the branches, departments, agencies,
   commissions, courts, and Congress with its committees and members. For each one: what it does, which
   category of work it belongs to, who leads it, and who it answers to.
2. **What is being voted on.** Bills and roll call votes in Congress, sorted into the same categories,
   each tied to the resident's own two senators and representative. A resident can start from a topic
   ("housing") and see which bodies handle it and what is moving now, or start from their place and see
   what their members are voting on.

It lives in the same app as the Cleveland graph, as a second scope ("United States" beside "Cleveland"),
so it shares the stories, Easy mode, dictionary, text view, and the Bench review gates. The Cleveland
graph and the US graph are one graph at two levels, linked where authority passes down (for example, a
federal grant that a Cleveland ordinance accepts).

## About graph.civlab.org/us

Their public page describes 482 organizations, positions, people, and relationships across the federal
government, and says automated agents monitor official sources. It shows no license, API, download, or
code. So we do not copy their data or code. We build our own from the same kind of official sources,
and credit them as an inspiration only if you want to. Their model (organizations, positions, people,
relationships) already matches our Data Contracts. One question for you: STATE-OF-BUILD.md records this
app as built from the Sep 23 ChatGPT release, with no mention of CivLab. If CivLab is a real source,
tell me, and we should record it and check what they permit.

## What the vcfest.app walk showed (your own site, Oct 1, 2026)

I entered the code in a headless Chrome once and looked at the result. The code is not recorded here.

- **Rendering:** one canvas for the graph, with SVG only for icons. Canvas is the right call at this
  size (about 330 people and companies plus industry hubs) and is what we need for Congress (535 members
  plus hundreds of bodies plus bills).
- **Views:** Sky (force layout, hub circles for categories), Index (a list), Linked (connections for the
  selected node), Tree (a hierarchy). Four ways into the same data is the pattern to copy.
- **Controls:** a Show panel (toggle node and edge kinds), stage filters, color by category, a Solo
  picker that isolates one category, Still / Calm / Live motion, zoom, fit, and a list button.
- **Interaction:** tap a node for its connections, drag to pull neighbors, double tap for the profile,
  long press on a phone, and full keyboard control (bracket keys to move, Enter, Esc, S to solo, arrows to pan, plus and minus to zoom, slash to search).
- **Access:** a skip link, landmarks, live regions, and an Access panel for text size, motion, and contrast.
- **Phone:** bottom tabs, a Filters sheet, and the graph in a smaller field with the same controls.

I could not see its source from outside. If its repo is on this machine or on GitHub, tell me where and
I will reuse the graph component directly instead of rebuilding it from screenshots.

## The data, from official records only

Each source goes in the Bench source registry first (owner, URL, cadence, license, access terms). Access
terms must be checked before we build on each. Nothing interpretive is automated (CLAUDE.md).

| Layer | Official source | What it gives |
| --- | --- | --- |
| Members, terms, committees | The unitedstates project's congress-legislators data (public domain) | 535 members, offices, terms, parties as a dated sourced field, committee seats |
| Bills and their categories | Congress.gov API (free key from api.data.gov) | Bills, sponsors, actions, and the Congressional Research Service policy area, which is the official category for each bill |
| Roll call votes | House Clerk and Senate roll call records | How each member voted, with the vote ID, date, and question. Unlike Council's record, these do show each member's vote |
| What each body does | The United States Government Manual (GovInfo) and Federal Register agency list | Official one-paragraph descriptions of each agency's role |
| Who leads | OPM Plum Book and agency pages | Appointed positions |
| Money (later) | USAspending | Awards by agency, for the "where does it go" layer |

The API key stays in a GitHub secret and is used only by the nightly job. It never reaches the browser.

## Categories

Use the official ones, so we are not inventing a taxonomy: the Congressional Research Service policy
areas for bills (about thirty, such as Health, Housing and Community Development, Energy, Education),
and the branch and body type for the landscape (legislative, executive, judicial, independent;
department, agency, commission, court, committee). One map from policy area to the bodies that act in it,
written by a person and reviewed, because it is interpretive. That map is what powers "start from a topic".

## The graph

- **Nodes:** branch, body (department, agency, commission, court, committee), member, bill, category.
- **Edges:** the Bench relationship types already defined: legal_authority, appointment, oversight,
  administration, funding, sponsorship, vote, membership. A bill's category is a labeled link, not an authority claim.
- **A vote is a vote and a sponsorship is not.** A missing vote stays missing, and a member who was not
  in office shows not applicable with term dates. Receipts, not scores: no ideology labels, rankings, or
  match percentages, and party is a sourced, dated field that is never inferred from votes.
- **Views:** Landscape (tree by branch, then category, then body), Sky (force layout with category
  hubs), Linked (connections for the selected node), Voting now (bills and votes by category), and a
  plain List for screen readers and Easy mode. Every view reads the same record.
- **Rendering:** D3 for the force layout, zoom, and hit testing; React for panels and controls; canvas
  for drawing. Past about a thousand nodes it loads by category rather than all at once. The list view
  and text connections always exist, so the canvas is never the only route.

## Pointing back to the resident

- The resident picks a state and district from a list on the device. Nothing goes in a link or a
  request. For Cleveland we can precompute the wards-to-district table from the city's open data we
  already hold; we do not send an address anywhere.
- "Your members" shows two senators and one representative, their recent votes by category, and a link
  to the official record for each vote.
- Stories (same engine as the Cleveland ones): "Who represents me in Washington", "What Congress voted
  on this week", "Who decides housing", with the same quiet, warm language and Easy mode.
- Practice choices stay local and private, as in the practice ballot.

## Where it lives and how big it gets

The current file is about 2.7 MB and embeds its data. Federal data is far larger, so it is not embedded.
The hosted site loads federal files on demand from the site folder, split by category. The single
offline file carries only a compact landscape, and says what it leaves out. Decision for you below.

## Phases

| # | Phase | Done when | Size |
| --- | --- | --- | --- |
| U0 | Get vcfest.app's graph source, confirm what we reuse | Component in hand or a decision to rebuild; CivLab status recorded | 0.5 session |
| U1 | Register federal sources in the Bench; check access terms and get the Congress.gov key | Each source has owner, terms, cadence, and a test fetch | 1 session |
| U2 | Landscape data: bodies, members, committees, categories, plus the reviewed policy-area map | data/us files written only by a refresh script; counts reconcile with the official sources | 2 sessions |
| U3 | The graph component: Sky, Linked, Tree, Index, filters, Solo, motion, keyboard, text alternative | Works with the Cleveland data too, in both layouts and both styles | 2 sessions |
| U4 | Bills and votes by category; member links | A bill shows its category, sponsors, and recorded votes with links; missing and not applicable shown honestly | 2 sessions |
| U5 | Place and stories: state and district picker, Your members, three federal stories | A resident reaches "who represents me" in three taps; nothing personal leaves the device | 1 session |
| U6 | Nightly refresh and Bench packets for federal records | Action runs, safety checks hold, changes show in What's new | 1 session |
| U7 | Access and testing | Same bar as the Cleveland plan: screen reader, keyboard, switch, voice, and residents | with phase 6 of that plan |

Every phase keeps the project rules: both styles, both layouts, no em dashes, no left accent stripes,
a clean rebuild with the hash recorded, and an updated STATE-OF-BUILD.md.

## Order against the other plan

Do phases 1, 1b, and 1c of the guided-stories plan first, because the federal stories and Easy mode
reuse them. U0 and U1 can start at any time since they are research and registration, not app changes.
U3 is also the place to give Cleveland its own node-edge view, so the two graphs arrive together.

## Decisions for you

1. Is vcfest.app's source available to reuse, and where is it?
2. Is CivLab a source for this app, or only an inspiration?
3. The offline single file: carry only a compact landscape (recommended), or drop the US scope from it?
4. Scope of the first release: landscape plus Your members and votes for the current Congress only, with
   history and money later (recommended)?
