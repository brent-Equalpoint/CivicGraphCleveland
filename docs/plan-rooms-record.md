# Plan: every room says what its bodies have voted on, done and said, and how it reaches people

Status: plan only, written Oct 7, 2026 for Brent and the team, from code read in this repository and sources probed the same day. No app code, no `data/`, no `site/`, no `build.py`, no release gate and no `--mark-*-reviewed` command was run or changed. It adds to the rooms and does not restyle them. It follows `CLAUDE.md`, `docs/design-standards.md` and `docs/plan-states.md`, and it finishes the parts of `docs/plan-votes-actions-positions.md` (county, positions, courts) that the rooms need.

## 0. The short version

Brent, looking at the room "Mayor & services": "we don't explain votes and actions or positions in any of these categories ... Not as helpful." Then, as a requirement for the whole plan: "we also need to have an explainer of what it affects what, where, and why and how it affects people. My main mission is to get people at the center of how these decisions affect them." And: "easy flow of understanding, education, and simple digestible text that doesn't overwhelm."

What is true today, measured in the code and the data (section 1): of the 129 different nodes spread over the 17 rooms (293 places a node appears), exactly 6 show a vote and action list (the six Council files on the map). Nearly every other node (120 of them) answers "Individual vote records have not been loaded for this item", the same sentence for a department, a court, a person and a federal agency. For 55 nodes that sentence misleads, because our own data already holds records for them. For the rest it does not help, because it does not say whether a record exists elsewhere, is refused to our software, or belongs to something that never votes.

What this plan does, in one line each:

1. **Every node answers.** Each node gets a section "What this has done" (votes, actions, positions, each with its source and the day pulled) or a named honest empty state with a reason, a next step and the official link. No node ends on a blank or on a sentence that reads as a "no".
2. **People first.** Every room and node leads with "What this means for you and your block", then the body. If a ward or neighborhood is set on the device (never sent), it shows what the record says for that place. If not, it says what to set.
3. **How it reaches people.** Every node gets a short card that answers four plain questions: what it affects, where, why it works that way (which law, charter section or budget line), and what a resident might notice. A small path shows the chain: decision, body, rule or money, service, you. Where we cannot show it yet, it says so and links the official source.
4. **Small and layered.** One plain line first (about 15 words), four one sentence answers on a tap (80 words at most), the official wording and sources one more tap down. A guided path for first-timers and a quick view for people who know the subject. Word budgets and a reading level are enforced by a unit test and the browser checks (section 4.1).
5. **Eleven stages**, each shippable alone with the full gate, about 53 working days in all (several shared with the candidate and votes plans), recommended order in section 6. **Stage 1 alone** moves the rooms from 6 nodes with a record to 58 nodes with a record or a dated item, and gives all 129 a named state, using only data we already hold and no new fetcher.

Numbers, from the code and `data/` (section 2): **129 nodes: 55 have real records today, 3 have one dated item inside the app's own text, 1 sits in a source we already fetch (the Board of Control in the City Record), 17 have an official source that worked on Oct 7 but no fetcher yet, 8 are refused to scripts or need clearance first, 22 are not bodies that vote (laws, places, people, private groups), 5 are out of scope by an earlier decision, 15 are not yet probed, and 3 are the resident.** That is 58 of 129 with a record or a dated item to show on the first day of Stage 1, 3 that show the resident's own panel, and a named honest empty for the other 68.

Eight decisions that matter are in section 9, each with a recommendation. Three are about people: who clears the terms of new sources, who writes to the school district and the state utility commission, and who reads the new plain lines (Brent, about 5 hours in all, spread over the stages).

## 1. What Brent sees today, measured

From `ext/cxm-explore.jsx` (the phone), `ext/cx-data.jsx` (three of the rooms), `build/work/CivicAtlas.pretty.js` (the compiled room data, `Uh`) and `build.py` (the desktop drawer patches):

- **17 rooms**: 14 in the compiled app (Your government, Voting & elections, Mayor & services, Council & wards, Courts & justice, Energy & utilities, Schools & education, Housing & land, Public safety, Budget & contracts, Transit & streets, Health & environment, County state & federal, History & change) and 3 spliced in by `build.py` from `ext/cx-data.jsx` (Cities & municipalities, Local decisions, Civic ecosystem). `?room=` and `?node=` links open them on both layouts.
- **A node tells what it IS**: `summary`, `region` ("where it applies"), `layer`, `evidence` (official, recorded, organization, missing), one `source` and `url`, and connected records. The phone's record sheet (`CxmRecord`) has four tabs, Overview, Votes & actions, Positions and Sources. The desktop drawer has the same four.
- **Votes & actions and Positions show records for only the six Council files on the map** (`leg-561-2026`, `leg-556-2026`, `leg-522-2026`, `leg-117-2026`, `leg-605-2026`, `leg-620-2026`), through `CxmLegHistory` and `CX_DrawerRecord`. Three more nodes have hand written activity lines (`people`, `mayor`, `council`). For the other 120 nodes the tab says "Individual vote records have not been loaded for this item. An institution's decision does not establish each member's vote." and the Positions tab says "No sourced position statements are attached here yet." Those words never name the body, the reason, or where the record is.
- **Wards**: the 15 ward nodes show only a button "See what they sponsored in 2026", while the phase 3 work of `docs/plan-votes-actions-positions.md` already built each member's full dated list (`CX_PersonRecord`, `CX_WardRecord`). The Mayor's node is the same.
- **Nothing says how a decision reaches a person.** The only resident facing sentences are the room `answer` lines and, in the Civic ecosystem room, one "Residents connect through ..." line per organization (22).

So what Brent describes is exactly right, and it is mostly a gap of presentation, not of data: our nightly refresh already holds 1,393 Council files, 467 roll calls with every member's word, 300 referrals, 259 approvals, 429 effective dates, 141 meetings with 1,838 agenda items, 1,591 federal votes, and the Mayor's sponsorship list. The rooms do not use them.

## 2. Inventory: the 17 rooms and every node

### 2.1 How to read the classes

Every node is in exactly one class. The class decides which state the resident sees (section 4.6).

| Class | Meaning | Resident sees |
| --- | --- | --- |
| **A, real record** | Our data holds votes or actions by the body, or Council actions on the node's own matter, tied by the record's own words | The list: newest first, each row dated and sourced |
| **AC, one dated item** | One dated, sourced item exists only inside the app's own text | That item, then "Partly shown" |
| **B1, source in hand** | The record is in a source we already fetch every night but the parser does not read it yet | Honest empty, "not added yet", with the official link |
| **B, source works** | The official source answered on Oct 7, 2026 and holds the votes or documents, but there is no fetcher | Honest empty, "not added yet", with the official link |
| **BB, refused or needs clearance** | The source refuses scripts, or it names scrapers in its robots file, or its terms need a person first | "Cannot be shown here" or "Not added yet, a person must ask first" |
| **C, not a voting body** | A person, a law's text, a place, a private organization | A plain explanation of what it is, and where to read it |
| **CS, out of scope** | Excluded by an earlier decision (trial court dockets name private people; other cities' councils) | A plain sentence of why, and the official link |
| **NP, not yet probed** | Not read in this plan | Honest empty with the official link; probed in Stage 10 |
| **P, the resident** | "People of Cleveland", ratepayers, students and families | The person first panel (section 4.2), not an empty state |

### 2.2 The 17 rooms

Counts are node places (a node can sit in several rooms). Columns: A, AC and B1 together are "has something or is in hand"; B, BB, NP are "official source exists, not shown"; C and CS are "not a voting body or out of scope"; P is the resident.

| Room (id) | Question it answers | Nodes | A | AC | B1 | B | BB | NP | C | CS | P |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Your government (`overview`) | Who makes decisions that affect my life? | 75 | 49 | 1 | 1 | 13 | 0 | 2 | 5 | 3 | 1 |
| Voting & elections (`voting`) | Who is on my ballot, and where do I vote? | 20 | 16 | 0 | 0 | 2 | 0 | 0 | 1 | 0 | 1 |
| Mayor & services (`administration`) | Which city office can help me? | 17 | 13 | 0 | 1 | 0 | 0 | 1 | 1 | 0 | 1 |
| Council & wards (`council`) | Who represents my neighborhood? | 34 | 32 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 1 |
| Courts & justice (`courts`) | Which court handles my problem? | 7 | 1 | 0 | 0 | 1 | 0 | 0 | 1 | 3 | 1 |
| Energy & utilities (`energy`) | Who controls my electricity? | 14 | 4 | 0 | 0 | 0 | 2 | 2 | 5 | 0 | 1 |
| Schools & education (`education`) | Who shapes my child's school? | 12 | 0 | 2 | 0 | 0 | 4 | 3 | 2 | 0 | 1 |
| Housing & land (`housing`) | Who can help with a housing problem? | 7 | 5 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 1 |
| Public safety (`safety`) | Who decides how safety services work? | 8 | 5 | 0 | 0 | 0 | 0 | 1 | 0 | 1 | 1 |
| Budget & contracts (`money`) | Where does public money go? | 6 | 4 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Transit & streets (`transport`) | Who controls my bus or street? | 6 | 3 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 1 |
| Health & environment (`health`) | Who handles a public health or pollution concern? | 6 | 4 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 1 |
| County, state & federal (`state-federal`) | Which level of government can change this? | 13 | 3 | 0 | 0 | 7 | 0 | 0 | 2 | 0 | 1 |
| History & change (`history`) | What changed, and who made the decision? | 7 | 3 | 1 | 0 | 1 | 0 | 0 | 1 | 0 | 1 |
| Local decisions (`local-decisions`) | How does a local decision actually get made? | 21 | 18 | 0 | 1 | 0 | 0 | 0 | 1 | 0 | 1 |
| Cities & municipalities (`municipalities`) | Is my address in Cleveland, and who governs it? | 17 | 2 | 0 | 0 | 7 | 1 | 1 | 2 | 3 | 1 |
| Civic ecosystem (`ecosystem`) | Beyond City Hall, who shapes daily life here? | 23 | 2 | 0 | 0 | 3 | 1 | 7 | 9 | 0 | 1 |
| **All places** | | **293** | **164** | **4** | **4** | **37** | **8** | **17** | **31** | **11** | **17** |

Node places by class sum to 293; the 129 distinct nodes by class are in section 2.4.

### 2.3 The node register: all 129 nodes

"Rooms" lists the rooms a node sits in (`ov` overview, `vo` voting, `ad` administration, `co` council, `cr` courts, `en` energy, `ed` education, `ho` housing, `sa` safety, `mo` money, `tr` transport, `he` health, `sf` state-federal, `hi` history, `ld` local decisions, `mu` municipalities, `ec` ecosystem). "What it decides" is the node's own summary, shortened. "In our record today" is what the data holds, measured Oct 7, 2026. A "Council file that names it" means the department or body is in the file's title or in its printed referral line ("Referred to the Directors of ..."), not that it decided. The routing line "Referred to the Directors of Finance; and Law" is printed on almost every file (276 and 300 of 300 referrals), so it is never counted as Finance or Law acting; only titles that name them are.

**The resident (class P)**

| Node | Kind | Rooms | What it is | In our record today | Class |
| --- | --- | --- | --- | --- | --- |
| People of Cleveland (`people`) | people | ov vo ad co cr ho sa mo tr he sf hi ld mu ec | The source of municipal electoral authority | Not a body. The person first panel | P |
| Cleveland residents and ratepayers (`ratepayers`) | people | en | Residents who pay for electric service | Not a body. The person first panel | P |
| Cleveland students and families (`students-families`) | people | ed | Families who use the school system | Not a body. The person first panel | P |

**City government: branches, the Mayor, Council, committees, wards (class A)**

| Node | Kind | Rooms | What it decides | In our record today | Class |
| --- | --- | --- | --- | --- | --- |
| Executive and Administration (`executive`) | branch | ov ad | The mayor leads the executive branch and directs departments | 296 Council files came "By Departmental Request" (247 passed). The record prints no signature or veto, only a "took effect" date (429 rows) | A |
| Mayor Justin M. Bibb (`mayor`) | official | ov ad sa mu ld | Chief executive; may issue executive orders | 2 files sponsored by Bibb, 3 by "Mayor's Administration", 36 files whose title names the Mayor's nominations or appointments, 429 "took effect" dates. No signature or veto is printed | A |
| Office of the Mayor (`mayor-energy`) | office | en | Leads city administration | Same records as the Mayor | A |
| Legislative (`legislative`) | branch | ov co ld | The 119th Council: 15 members, 15 wards | All of Council's record, see Council | A |
| Cleveland City Council (`council`) | institution | ov vo co ho sa mo tr he hi ld mu | Considers ordinances, approves spending, votes as a full council | 1,393 files, 467 roll calls with every member's word, 141 meetings | A |
| Cleveland City Council (`city-council-energy`) | office | en | Council's role in utility ordinances | Same records as Council; 17 files name Cleveland Public Power (10 passed) | A |
| Ward 1 to Ward 15 (`ward-1` to `ward-15`, 15 nodes) | official | ov vo co | One council member per ward | Each member's sponsorships and votes, newest first (phase 3, built, not yet shown in the room drawer) | A |
| Development, Planning and Sustainability (`committee-1`) | committee | ov co he | Reviews legislation in its subject | 17 meetings (with the Zoning committee) and 44 agenda items with outcomes. Committee votes by name exist in no source read | A |
| Finance, Diversity, Equity and Inclusion (`committee-2`) | committee | ov co | Same | 26 meetings, 168 agenda items | A |
| Health, Human Services and the Arts (`committee-3`) | committee | ov co he | Same | 9 meetings, 12 agenda items | A |
| Municipal Services and Properties (`committee-4`) | committee | ov co | Same | 9 meetings, 49 agenda items | A |
| Safety (`committee-5`) | committee | ov co sa | Same | 16 meetings, 28 agenda items | A |
| Utilities (`committee-6`) | committee | ov co | Same | 7 meetings, 45 agenda items | A |
| Workforce, Education, Training and Youth Development (`committee-7`) | committee | ov co | Same | 6 meetings, 18 agenda items | A |
| Transportation and Mobility (`committee-8`) | committee | ov co | Same | 9 meetings, 13 agenda items | A |

**City departments (class A, partial: Council files that name them; their own decisions are not in our record)**

| Node | Kind | Rooms | What it decides | In our record today | Class |
| --- | --- | --- | --- | --- | --- |
| Department of Finance (`dept-finance`) | department | ov ad mo | Public funds, accounting, budgeting, procurement | 36 files name it in the title (32 passed) | A |
| Department of Law (`dept-law`) | department | ov ad | Legal counsel for the City | 3 files name it in the title (0 passed) | A |
| Department of Public Safety (`dept-public-safety`) | department | ov ad sa | Police, fire, emergency and safety administration | 49 files name it (36 passed, 33 with a roll call) | A |
| Department of Public Works (`dept-public-works`) | department | ov ad tr | Facilities, waste, streets, recreation support | 34 files (22 passed) | A |
| Department of Public Utilities (`dept-utilities`) | department | ov ad | Water, power, water pollution control | 50 files (36 passed, 35 with a roll call) | A |
| Public Utilities (`dpu-energy`) | office | en | Manages city owned utilities including Cleveland Public Power | Same 50 files | A |
| Department of Public Health (`dept-health`) | department | ov ad he | Public health programs, regulation, data | 20 files (15 passed) | A |
| Building and Housing (`dept-building`) | department | ov ad ho | Permits, inspections, housing code, lead safe work | 6 files (3 passed) | A |
| Community Development (`dept-community-development`) | department | ov ad | Housing and neighborhood development programs | 44 files (38 passed) | A |
| Economic Development (`dept-economic-development`) | department | ov ad | Business, development, grants | 39 files (27 passed) | A |
| Parks and Recreation (`dept-parks`) | department | ov ad | Parks, recreation, youth programs | 34 files (22 passed); 8 tie to a ward | A |
| Innovation and Technology (`dept-innovation`) | department | ov ad | Technology, systems, 311, analytics | 24 files (4 passed) | A |
| Cleveland Public Power (`cpp`) | utility | en | City owned electric utility, about 74,000 customers | 17 files name it (10 passed), for example tree trimming and substation upkeep | A |
| City Planning Commission (`board-planning`) | board | ov ho | Reviews planning, zoning, design, land use | 75 files carry its approval in the printed approval line (62 passed). Its weekly agendas are PDFs on the city site, not read | A |

**Boards, laws and orders**

| Node | Kind | Rooms | What it decides | In our record today | Class |
| --- | --- | --- | --- | --- | --- |
| Board of Control (`board-control`) | board | ov ad mo ld | Approves certain contracts and administrative actions | Nothing in `data/`. Its minutes, with a roll call per resolution, print in the weekly City Record (the Oct. 2 issue, pages 130 to 132, holds resolutions 275-26 and 276-26 of Sept. 30) | B1 |
| Civil Service Commission (`board-civil-service`) | board | ov ad | Oversees classified city employees | 1 oath of office file. Its own minutes not found by script | NP |
| Community Police Commission (`board-police`) | board | ov sa | Oversight and review of police misconduct and reform | 5 files name it or the Civilian Police Review Board (an oath, a tabled grant ordinance, a budget hearing). Its own actions not found | NP |
| Municipal Cabinet for Children and Youth (`cabinet-youth`) | board | ov | Created by Executive Order 2025-01 | A cabinet, not a voting board. The order is its record | C |
| Executive Order 2025-01 (`eo-2025-01`) | law | ov hi | Creates the cabinet | One dated action, March 20, 2025, with the city's order page. The city lists 6 orders in all (2022-01, 2023-01, 2024-01, 2024-02, 2024-03, 2025-01) and none in 2026 | AC |
| Charter of the City of Cleveland (`law-charter`) | law | ov ad sf ld | The founding law of city offices | Law text, not a body. Text on the city's code site, which refuses scripts | C |
| Codified Ordinances (`law-code`) | law | ov co cr ho ld | Permanent and general ordinances | 35 Council files name the Codified Ordinances in their title; each one that amends it is a dated action on the code | A |
| Ohio municipal court law (`ohio-court-law`) | law | cr | Ohio Revised Code 1901.01 | Law text, not a body | C |
| City of Cleveland (`cleveland`) | jurisdiction | ov sf | The municipal corporation | A place and a legal entity. Points to the Charter and to Council | C |
| 15 ward map (`geography-wards`) | geography | ov vo co hi | The 2026 ward lines | A map, not a body. Points to Find my ward | C |

**The six Council files on the map (class A)**

| Node | Kind | Rooms | What it decides | In our record today | Class |
| --- | --- | --- | --- | --- | --- |
| Ordinance 561-2026, short term rentals (`leg-561-2026`) | legislation | ov co ho hi ld | Code sections on short term rentals and the transient occupancy tax | Passed 2026-06-01, 14 Yea 1 Nay, took effect 2026-07-01, full dated action list | A |
| Emergency Ordinance 556-2026, data center moratorium (`leg-556-2026`) | legislation | ov co ld | A moratorium on review and issuing of certain zoning permits | Passed 2026-07-15, 14 Yea 1 Nay, took effect 2026-07-20 | A |
| Emergency Ordinance 522-2026, paid parking (`leg-522-2026`) | legislation | ov co tr hi ld | Amends parking code sections | Passed 2026-06-01, 13 Yea 2 Nay, no effective date printed | A |
| Emergency Ordinance 117-2026, 2026 operating budget (`leg-117-2026`) | legislation | ov co mo ld | Appropriations for all municipal departments, Jan. 1 to Dec. 31, 2026 | Passed 2026-03-23, 11 Yea 3 Nay, "approved as amended", took effect 2026-03-26 | A |
| Emergency Ordinance 605-2026, dangerous dog law (`leg-605-2026`) | legislation | ov co sa ld | Repeals and replaces Chapter 604 | Passed 2026-06-01, 15 Yea 0 Nay, took effect 2026-06-02 | A |
| Emergency Ordinance 620-2026, solar facilities (`leg-620-2026`) | legislation | ov co mo ld | Public improvement of solar generation construction | Passed 2026-06-01, 15 Yea 0 Nay, took effect 2026-06-02 | A |

**Elections, county, state, federal**

| Node | Kind | Rooms | What it decides | In our record today | Class |
| --- | --- | --- | --- | --- | --- |
| 2025 Cleveland Municipal Election (`election-2025`) | election | ov vo hi | Selected a mayor and council for 2026 | No certified totals loaded. The Board of Elections posts results (page answered Oct 7) | B |
| Cuyahoga County Board of Elections (`boe`) | institution | ov vo mu | Runs elections, voter records, ballot lists | Nothing in `data/`. Its page lists 2026 agendas, packets and minutes as PDFs, 17 meetings (the Oct. 7 agenda is posted) | B |
| Cuyahoga County Council (`county-council`) | institution | ov sf mu | The county's legislative branch | Nothing in `data/`. 232 resolutions for 2026 in a grid, each a PDF with Yeas and Nays by surname | B |
| Cuyahoga County Executive (`county-executive`) | office | ov sf mu | Leads county administration | Nothing in `data/`. Executive orders page lists 2 for 2026 (earlier probe) | B |
| Cuyahoga County government (`county`) | institution | ov sf mu | County services | Nothing in `data/` | B |
| Ohio House (`ohio-house`), Ohio Senate (`ohio-senate`), Ohio General Assembly (`ohio-legislature`) | institution | ov sf | State bills | Nothing in `data/`. Floor votes are on legislature.ohio.gov bill pages (HB 96 votes page answered) | B |
| Office of the Ohio Governor (`ohio-governor`) | office | ov sf | Signs or vetoes passed bills | Nothing in `data/`. Bill status pages show signature | B |
| U.S. House (`us-house`), U.S. Senate (`us-senate`), U.S. Congress (`congress`) | institution | ov sf | Federal laws | 1,591 recorded votes of the 119th Congress, 556 members, each member's word (United States map) | A |

**Courts**

| Node | Kind | Rooms | What it decides | In our record today | Class |
| --- | --- | --- | --- | --- | --- |
| Municipal Courts and Review (`judicial`) | branch | ov cr | Courts and review bodies | Case dockets name private people | CS |
| Cleveland Municipal Court (`municipal-court`) | court | ov cr sa mu | Cases within Ohio law's municipal jurisdiction | Not listed: cases name private people | CS |
| Cleveland Housing Court (`housing-court`) | court | ov cr ho | Housing, building and related cases | Not listed, same reason | CS |
| Eighth District Court of Appeals (`appeals`) | court | ov cr mu | Appeals within its district | Nothing in `data/`. Weekly decision list and opinions on its site (earlier probe); planned in phase 6 of the votes plan | B |

**Transit**

| Node | Kind | Rooms | What it decides | In our record today | Class |
| --- | --- | --- | --- | --- | --- |
| Greater Cleveland RTA (`rta`) | transport | ov tr mu | Runs the regional transit system | Council role only: 7 files name it, among them the Mayor's nominations of three trustees (395, 396, 397-2026) and the Mayor's Appointments Committee approval of one (485-2026). The authority's own votes: resolutions list answered Oct 7 | B |
| RTA Board of Trustees (`rta-board`) | board | ov tr | Sets policy, oversees management, approves the budget | Same Council records. The board's resolutions (1974 to now, with a status such as ADOPTED) are searchable on its site; the 2027 tax budget PDF is dated July 7, 2026 | B |

**Health and environment**

| Node | Kind | Rooms | What it decides | In our record today | Class |
| --- | --- | --- | --- | --- | --- |
| Ohio EPA (`ohio-epa`) | regulator | ov he | State environmental programs and permits | Nothing in `data/`. Permit documents sit in a search portal (answered Oct 7); the agency's main site answers scripts with a generic not found page | B |

**Energy and utilities**

| Node | Kind | Rooms | What it decides | In our record today | Class |
| --- | --- | --- | --- | --- | --- |
| The Illuminating Company (`illuminating`) | utility | en | Distribution service in Northeast Ohio, regulated by the state | Rates are PUCO cases. The PUCO case system answers (HTML pages by case number) but its robots file names scrapers; a person must ask first | BB |
| Public Utilities Commission of Ohio (`puco`) | regulator | en | Ohio's utility regulator | Same | BB |
| American Municipal Power (`amp`) | market | en | A public power partner | A private nonprofit. No public vote record to find | C |
| PJM Interconnection (`pjm`) | market | en | Wholesale market and grid reliability | Not a Cleveland body. FERC and PJM publish; not read | C |
| Perry (`perry`) and Davis-Besse (`davis-besse`) | plant | en | Nuclear plants | Plants, regulated by the NRC; no vote record | C |
| CPP power purchase records (`cpp-contract`) | contract | en | Contract inventory (missing) | No inventory exists in our record. The 17 Council files that name CPP are equipment and services, not power purchases (read by title) | C |
| FERC (`ferc`), NRC (`nrc`) | regulator | en | Federal energy and nuclear oversight | FERC's robots file answered; dockets not read | NP |

**Schools and education**

| Node | Kind | Rooms | What it decides | In our record today | Class |
| --- | --- | --- | --- | --- | --- |
| Cleveland Metropolitan School District (`cmsd`) | district | ed | The public school district | Council role only: ordinance 558-2026 (land exchange with the district's Board of Education, passed June 1). The board's own records refused to scripts | BB |
| CMSD Board of Education (`cmsd-board`) | board | ed | Governs the district | Agendas, minutes and votes are on BoardDocs, which answers scripts with 403 "Request blocked" (even for robots.txt). The board page also links only a YouTube playlist | BB |
| Teachers and labor contracts (`labor-contracts`), Facilities and vendors (`facilities-vendors`) | partner | ed | Contracts that the board approves | Live in the same blocked board records | BB |
| Dr. Warren Morgan, CEO (`cmsd-ceo`) | leader | ed | Leads daily administration | A person. Decisions he makes are board records | C |
| Levy, bond and school decisions (`school-decisions`) | decision | ed | Public finance decisions | One thing in hand: the official ballot wording for the school district levies on the Nov. 3 ballot is in the app (for other districts, for example Strongsville, 6.7 mills, $235 per $100,000, five years). None found for Cleveland's district in the wording read | AC |
| Mayor and school board appointment path (`mayor-school-board`) | decision | ed | The mayor appoints the nine voting members from nominees | One dated item from the city's news release in the room's text | AC |
| Ohio Department of Education and Workforce (`ohio-dew`), U.S. Department of Education (`us-education`), Federal education programs (`federal-programs`) | agency | ed | State and federal education roles | Not read | NP |
| Ohio community schools (`community-schools`) | partner | ed | Independent public schools | A set of private operators. No single vote record | C |

**Cities, regional bodies and the Civic ecosystem room**

| Node | Kind | Rooms | What it decides | In our record today | Class |
| --- | --- | --- | --- | --- | --- |
| Village of Bratenahl (`cx-bratenahl`), City of East Cleveland (`cx-east-cleveland`) | municipality | mu | Separate governments | Other cities' councils are not in this plan | CS |
| Other Cuyahoga communities (`cx-other-municipalities`) | municipality | mu | Many separate governments | A list that is not loaded | C |
| Northeast Ohio Regional Sewer District (`cx-neorsd`, `eco-neorsd`) | department | mu ec | Wastewater and stormwater | Nothing in `data/`. Its site links a board minutes archive | B |
| NOACA (`cx-noaca`) | board | mu | Regional transport planning | Its board page answers scripts with "Access Denied" | BB |
| County Land Bank (`cx-county-landbank`, `eco-landbank`), City Land Bank (`eco-city-landbank`) | board | mu ec | Returns vacant property to use | Not read | NP |
| City of Cleveland (`eco-city`), Cleveland City Council (`eco-council`) | institution | ec | The city and Council | Same records as Council | A |
| Greater Cleveland RTA (`eco-rta`), Port of Cleveland (`eco-port`) | institution | ec | Transit; a public port authority | RTA as above. The Port posts board minutes as PDFs (2026: Feb. 12, Mar. 12, Apr. 9 and more) | B |
| Cleveland Public Library (`eco-cpl`), Cuyahoga Arts and Culture (`eco-cac`), MetroHealth (`eco-metrohealth`), Cleveland State (`eco-csu`), Tri-C (`eco-tric`) | institution | ec | Public bodies with boards | Not read. The library's robots file allows search and reference but not AI training | NP |
| CMSD in the ecosystem (`eco-schools`) | district | ec | The school district | Same blocked board records | BB |
| Cleveland Open Data (`eco-opendata`), Cleveland Clinic (`eco-clinic`), University Hospitals (`eco-uh`), Case Western (`eco-cwru`), arts institutions (`eco-arts`), Ideastream (`eco-ideastream`), Greater Cleveland Partnership (`eco-gcp`), Cleveland Foundation (`eco-foundation`), neighborhood networks (`eco-networks`) | organization | ec | Private or nonprofit organizations, or a data portal | No public vote record exists to find. The node says what the organization is and who it answers to | C |

### 2.4 Count by class, 129 distinct nodes

| Class | Nodes | Which |
| --- | --- | --- |
| A, real record | 55 | 15 wards, Council and its two echoes, the Mayor and its echo, Executive, Legislative, 8 committees, 13 departments and Cleveland Public Power, the City Planning Commission, Codified Ordinances, the 6 Council files, the 3 federal chambers, the city in the ecosystem room |
| AC, one dated item | 3 | Executive Order 2025-01, the mayor and school board path, levy and school decisions |
| B1, source in hand | 1 | Board of Control |
| B, source works | 17 | Elections 2025, Board of Elections, 3 county, 4 state, Eighth District, 2 RTA nodes and the RTA in the ecosystem, the Port, 2 sewer district nodes, Ohio EPA |
| BB, refused or needs clearance | 8 | School district, school board, teachers' contracts, facilities and vendors, and the district in the ecosystem room (5); PUCO and The Illuminating Company (2); NOACA (1) |
| C, not a voting body | 22 | Charter, court law, the city as a place, the ward map, the youth cabinet, the CEO, AMP, PJM, 2 plants, CPP contracts, community schools, other communities, 9 private groups |
| CS, out of scope | 5 | Judicial branch, Municipal Court, Housing Court, Bratenahl, East Cleveland |
| NP, not yet probed | 15 | Civil Service Commission, Community Police Commission, FERC, NRC, 3 education agencies, the 3 land bank nodes, library, arts fund, MetroHealth, Cleveland State, Tri-C |
| P, the resident | 3 | People of Cleveland, ratepayers, students and families |
| **Total** | **129** | |

**Today** 6 nodes show a vote list. **After Stage 1** 58 show a record or a dated item (55 A plus 3 AC), 3 show the person panel, and 68 show a named empty state with a reason and the official link. **If every source clears** (sections 3 and 6) up to 99 nodes can show their own record, and 27 never will, by design (22 not voting bodies and 5 out of scope), where the page says why in plain words.

## 3. Where each body's votes, actions and positions are officially published, and what the probes found

All fetches were made on **Oct 7, 2026** with the project's own user agent, `ClevelandCivicGraph/5.15 (Equalpoint; nightly public-records refresh)` (`scripts/net.py`), from `curl`, with no key, no browser disguise and no retry against a refusal. Where a robots file existed it was read first. A refusal is written down as a refusal and is not worked around. "Terms" is what the site itself says; where no terms page was found that is the finding. **Every new source below is `review_required`**, the same state as the 31 sources in `scripts/us_sources.py`: nobody has read its terms yet, and nothing is shown to residents from it until a named person has. Recommended person: Brent, one source at a time, in stage order (decision 3).

### 3.1 Evidence table

| # | Source | Address (pattern) | Result on Oct 7 | Terms and robots | Format | How often it changes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Cleveland Legistar Web API | `https://webapi.legistar.com/v1/cityofcleveland/bodies` | 200, JSON, 11,531 bytes: 22 bodies (City Council, 19 committees of which 14 are active, 2 caucus or event bodies) | No robots file on `cityofcleveland.legistar.com` (404). Registered already as `council_legistar_votes` | JSON | With each meeting |
| 2 | The City Record (weekly) | `https://www.clevelandcitycouncil.gov/legislation-laws/city-record` and PDFs like `/sites/default/files/2026-10/City%20Record%2010-2-26.pdf` | 200; 1,624 PDF links; the Oct. 2 issue is 2,838,766 bytes, 9,369 lines of text through `pdftotext`; it holds the roll calls we already read AND a "Board of Control" section (pp. 130 to 132) with Yeas, Nays and Absent by title, plus agendas of the Board of Zoning Appeals and of the Board of Building Standards and Building Appeals | Council site robots: Drupal defaults only (`/core/`, `/admin/`, `/search`). Registered already as `city_record_actions` | PDF | Weekly, Fridays |
| 3 | Mayor's executive orders | `https://www.clevelandohio.gov/mayor/executive-orders` | 200, 207,027 bytes. Six orders named (2022-01, 2023-01, 2024-01, 2024-02, 2024-03, 2025-01), none in 2026, each a PDF (for example `/sites/clevelandohio/files/mayor/eo/EO2023-01-OpenDataPolicy.pdf`). The page quotes the Charter: "the executive and administrative powers of City shall be vested in the Mayor" | City site robots: Drupal defaults. No terms page read | HTML plus PDF | Rarely (about one a year) |
| 4 | City boards page | `https://www.clevelandohio.gov/city-hall/boards-commissions` and `/civil-service-commission`, `/planning`, `/planning/zoning-appeals` | 200 for each. The site's navigation names "Board of Control Minutes" and points it at the City Record page above. A guessed page `/board-control` is 404 (it does not exist; the minutes are in the City Record). The Civil Service Commission page has no minutes link a script could find. The Board of Zoning Appeals lists 2026 weekly agenda PDFs. The Department of Public Health page (200, 160,317 bytes) has no board or minutes page; Cleveland's own health department publishes through Council files | Same | HTML plus PDF | Weekly for the Board of Zoning Appeals |
| 5 | City Charter and Codified Ordinances | `https://www.clevelandcitycouncil.gov/legislation-laws/charter-codified-ordinances` (200, 38,206 bytes) which links to `https://codelibrary.amlegal.com/codes/cleveland/latest/cleveland_oh/0-0-0-1` | The Council page answers. The code library (American Legal Publishing) answers a script with **403**, 5,756 bytes | Not readable | HTML | Each ordinance that amends the code |
| 6 | Cleveland Water rates | `https://www.clevelandwater.com/customer-service/water-rates/rates-fees` (200, 43,448 bytes) and `/where-your-dollar-goes`, `/water-review-board` (200) | A rate table by meter size for 2025, 2026, 2027, 2028, 2029 (the 5/8 to 1 inch fixed charge: $9.85 in 2025, $9.90 for 2026 to 2029), the rule that the consumption charge is "determined by the distance and elevation of your property from Lake Erie", a link to the "Water Rates & Billing Ordinance" on the code library, a statement that it serves "80 communities", and a Water Review Board for bill disputes | No terms read | HTML | When the ordinance changes |
| 7 | City budget | `https://www.clevelandohio.gov/city-hall/departments/finance/budget-portal` (200, 136,942 bytes) leading to `https://clevelandoh.financial-engage.com/home` (200, 58,842 bytes) | An interactive portal; no download or data feed found. The 2026 operating budget ordinance (117-2026) is in Legistar | Portal robots 404 | Interactive web app | Yearly |
| 8 | Police oversight | `https://www.clevelandpolicemonitor.net/` (the .com redirects; 200, 174,473 bytes), `/resources-reports` | The monitor's reports page. The Community Police Commission's own page was not found at the address in the room data; the city site lists a "Police Accountability Team" page | Monitor robots: some paths disallowed; not the report pages | HTML plus PDF | Periodic |
| 9 | Cuyahoga County Council | `POST https://cuyahogacounty.gov/council/resolutions/CouncilResolution_read/` with `sort=&page=1&pageSize=300&group=&filter=&year=2026`; page forms for `/council/ordinances`, `/pending-legislation`, `/motions` | 200, JSON, 159,626 bytes, **232 resolutions** (R2026-0001 to R2026-0263), each with its text and a PDF address on `cuyahogacms.blob.core.windows.net`. 41 descriptions mention a budget or appropriations; 25 mention ARPA grants. Ordinances for 2026: "No items to display" | County robots file: development rules only, `User-agent: *` allowed. The site's `/disclaimer`: no guarantee of accuracy or timeliness. No reuse license | JSON plus PDF | Weekly meeting cadence |
| 10 | County Executive and the Fiscal Officer | `https://cuyahogacounty.gov/executive/news/executive-orders` (200, 79,856 bytes); `https://cuyahogacounty.gov/fiscal-officer` (200, 55,982 bytes) | Two executive orders in 2026 (the earlier probe). The Fiscal Officer page answered; the budget book is not at `/fiscal-office/budget` or `/budget` (404): a person must find its address | Same | HTML plus PDF | Rarely; yearly |
| 11 | Cuyahoga County Board of Health | `https://ccbh.net/board-minutes-agenda/` (200, 607,331 bytes) and `/board-members-1/` (200) | Monthly agendas and minutes as PDFs: minutes for Jan. 28, Feb. 25, Apr. 1, Apr. 22, May 27, Jun. 24, Jul. 22 and Aug. 26, 2026; the Sept. 23 agenda; board and committee schedules. Documents only; each vote is inside the PDF | robots: `/NewDev` and `/livebkpsite` only | HTML plus PDF | Monthly |
| 12 | Cuyahoga Board of Elections | `https://boe.cuyahogacounty.gov/about-us/board-meeting-documents` (200, 136,584 bytes) and `/elections/election-results` (200, 31,664 bytes) | 17 meetings listed for 2026, each with an agenda, a packet and (after approval) minutes as PDFs; the Oct. 7 agenda and packet are posted | robots: the development block is commented out, so `*` has no rule; named bots are disallowed | HTML plus PDF | Each meeting |
| 13 | Greater Cleveland RTA | `https://www.riderta.com/board` (200, 87,653 bytes), `/board/resos` (200, 107,721 bytes), `/board/archive` (200), `/budget/2027` (200) | A searchable list of board resolutions from 1974 to now, each with a number, title and status (ADOPTED, AMENDED, FAILED, TABLED and others) and a PDF (the newest is 2026-066), a meeting archive by date, the 2027 Tax Budget (dated July 7, 2026) | robots: Drupal defaults. No terms read | HTML plus PDF | Each board meeting |
| 14 | Port of Cleveland | `https://www.portofcleveland.com/about/board-meetings/` (200, 449,807 bytes) | 2026 meeting dates and minutes PDFs for the meetings held (Feb. 12, Mar. 12, Apr. 9 and more); some canceled | robots: `Disallow:` empty (all allowed) | HTML plus PDF | Monthly |
| 15 | Northeast Ohio Regional Sewer District | `https://www.neorsd.org/` (200, 137,053 bytes) | The page links a "Board meeting minutes archive" (a document library) and a 2026 meeting schedule PDF; a guessed board page was 404 | robots: `/wordpress/wp-admin/` only | HTML plus PDF | Monthly |
| 16 | Cleveland Metropolitan School District | `https://www.clevelandmetroschools.org/board-of-education` (200, 78,816 bytes); BoardDocs `https://www.boarddocs.com/oh/cmsd/Board.nsf/Public` | The district page links BoardDocs and a YouTube playlist of board meetings (video, no text). **BoardDocs answers 403 "Request blocked" (CloudFront) to a script, even for `/robots.txt`.** The district's own robots file sets a 5 second crawl delay and refuses named AI crawlers | Not readable | HTML (BoardDocs) | Each board meeting |
| 17 | PUCO case system | `https://dis.puc.state.oh.us/CaseRecord.aspx?CaseNo=24-0020-EL-RDR` | 200, HTML. A docket page loads by case number (the lookup keys on the year and number, so `24-0020-...` returns case 24-0020). The case system's own `robots.txt` (1,045 bytes) lists named AI and scraper crawlers with `Disallow: /`; our agent is not named. FirstEnergy's own site (`https://www.firstenergycorp.com/` answers 302) holds no docket: the docket is the record. `https://puco.ohio.gov/` and `https://opsb.ohio.gov/` return a generic "404 Error Page" (S3, CloudFront) to a script, which a home page cannot honestly be: treated as refused | Needs a person to ask before any copy | HTML | With each filing |
| 18 | Ohio EPA | `https://edocpub.epa.ohio.gov/publicportal/` (200, 49,751 bytes); `https://epa.ohio.gov/` answers 404 to a script like the PUCO host | A search portal for permit documents; main site refused | robots 404 | HTML (search) | Daily |
| 19 | Ohio Department of Health | `https://odh.ohio.gov/` | Generic 404 page to a script (same pattern as the state sites above): refused | Not readable | n/a | n/a |
| 20 | Ohio General Assembly | `https://www.legislature.ohio.gov/legislation/136/hb96` (200, 50,764 bytes) and `/votes` (200, 165,700 bytes) | HB 96 (the budget bill) page and its recorded votes answer to `curl`. Our own weekly link check flagged `legislature.ohio.gov` unreachable on Oct 5 (the earlier probe found the site's certificate chain incomplete; Node and Python fail, Windows curl works) | robots: `Disallow:` empty (all allowed) | HTML | Each session day |
| 21 | Federal Congress votes | already in `data/us-votes-2026.json` from the House Clerk and Senate XML | 1,591 recorded votes, 556 members, 119th Congress | Registered as federal sources, `review_required` | JSON | Nightly |
| 22 | Courts | `https://clevelandmunicipalcourt.org/` (200), `https://www.clevelandhousingcourt.org/` (200); Eighth District per `docs/plan-candidate-records.md` | Trial court pages answer; case lists name private parties. Appeals opinions: see the candidate plan, row on the Eighth District | Municipal Court robots: `User-agent: *`, no rule | HTML | Daily |
| 23 | Library | `https://www.cpl.org/robots.txt` (200) | The library states `Content-Signal: search=yes,ai-train=no,use=reference` for all agents. We would be reading it as a reference, not training; a person decides. The board page address was not found | Stated in robots | n/a | n/a |
| 24 | NOACA | `https://www.noaca.org/about-us/board` | **403 "Access Denied"** (Akamai) | Not readable | n/a | n/a |
| 25 | Not found by a guess | Cleveland Metroparks board, MetroHealth board, CMHA board, Civilian Police Review Board | Guessed addresses returned 404; the right addresses must be found by a person | n/a | n/a | n/a |

### 3.2 What worked, what is refused, what needs a person

- **Worked and fetchable under our rules, once terms are cleared:** Legistar and the City Record (already running), the Board of Control section of the City Record (same files, a parser change), the County Council grid and PDFs, the County Executive's orders page, the Board of Health, Board of Elections, RTA, Port and sewer district pages, the Ohio General Assembly bill pages (with the certificate fix: pinned intermediate certificate, never `verify=False`), the Cleveland Water rates page (as a cited fact, not a feed).
- **Refused to scripts, not worked around:** BoardDocs for the school board (403), the Charter and Codified Ordinances on the code library (403), NOACA (403), the Ohio state sites that answer a script with a generic 404 (PUCO, OPSB, Ohio EPA main site, Ohio Department of Health). For each, the room shows a plain "cannot be shown here" or "not added yet" with the official link, and a person asks (section 9, decision 3).
- **Unclear terms:** every source. No site read today states a reuse license. The County and the library state limits (accuracy disclaimer; no AI training). The PUCO case system names scrapers. This is a gate for each stage, not a footnote.
- **Needs a person:** clearing each source's terms; finding the right address for the bodies marked 25; confirming which communities each health district serves; confirming the Charter and code sections that give a body its power (the code library is refused to scripts, so a person reads them by hand); confirming the current Illuminating Company rate case number (a scripted lookup keys only on the case number and I could not find the case by guessing, so it is not named here).

### 3.3 Where each room's bodies publish, in one place

| Room | Bodies and offices | Where votes, actions and positions are officially published | Today in our record |
| --- | --- | --- | --- |
| Mayor & services | Mayor, departments, Board of Control, Civil Service Commission, Charter | Council's Legistar file pages (departments appear as "Referred to the Directors of ..." and in titles); the weekly City Record (Board of Control minutes with roll calls); the Mayor's executive orders page; the Charter on the code library | Legistar and City Record: yes. Board of Control: in the file, not parsed. Orders: 6 named, none in 2026. Civil Service: no minutes found. Charter: refused |
| Council & wards | Council, 8 committees, 15 wards | Legistar and the City Record | Yes, complete for 2026 (467 roll calls; committee votes by name exist in no source read) |
| Budget & contracts | Council, Finance, Board of Control, the budget ordinance | Legistar (117-2026 and the budget hearings are agenda items 1135 and 1146); the Interactive Budget Portal; the City Record (Board of Control); County: the Council grid and the Fiscal Officer; schools: the district's budget (not found); state: HB 96 on legislature.ohio.gov; RTA: its tax budget PDF | City: yes. Others: not built |
| Energy & utilities | Cleveland Public Power, Public Utilities, Council, The Illuminating Company, PUCO, FERC, NRC, Ohio Power Siting Board | Legistar for Council's utility ordinances; the PUCO case system for rate cases; FERC and NRC dockets; OPSB | Council: yes. PUCO: refused or needs a person. OPSB, FERC, NRC: not read |
| Schools & education | District, board, CEO, mayor's appointments, state and federal agencies | BoardDocs (refused); the city's news page for appointments; Council's Legistar for land exchanges; Ohio DEW and the U.S. Department of Education (not read) | Appointments and land exchange: yes. Board: refused |
| Health & environment | Department of Public Health, Council committees, Ohio EPA, the County Board of Health | Legistar for grants and leases (32 health titled files passed); CCBH agendas and minutes; the Ohio EPA document portal | City: yes. County board: documents list not built. EPA: portal not built |
| Housing & land | Building and Housing, City Planning Commission, Housing Court, Council | Legistar; City Record (Board of Zoning Appeals, Board of Building Standards: dockets name private owners, out of scope); Planning Commission agendas | Planning Commission approvals in the City Record lines: yes |
| Public safety | Public Safety, Community Police Commission, Municipal Court, the consent decree monitor | Legistar; the monitor's reports; the federal court's docket for the consent decree (not probed: it is a court case with filings; a person decides whether to link it) | Council files: yes. Commission and docket: no |
| Transit & streets | Public Works, RTA, RTA board | Legistar (Public Works); RTA resolutions list and meeting archive; Mayor's nominations to the RTA board are Council files | Council: yes. RTA: not built |
| Courts & justice | Municipal and Housing courts, Eighth District | Courts' own sites; the Ohio Revised Code | Not listed (private parties); opinions planned |
| Voting & elections | Board of Elections, wards | The board's agendas, packets and minutes; results page | Not built |
| County, state & federal | County Council and Executive, Ohio General Assembly, Governor, Congress | County grid; legislature.ohio.gov; the House Clerk and Senate XML | Federal: yes. County and state: not built |
| History & change | Dated records | Legistar | Four dated items in the app's text |
| Local decisions, Cities & municipalities, Civic ecosystem | Council files; neighboring governments; boards and private groups | As above; neighbors' own sites; Port, RTA, sewer district pages | As above |

Parks, libraries and ports have no node of their own in the rooms today apart from the Port and Library in the ecosystem room, Parks & Recreation as a department, and the Land Banks. Eight bodies Brent named have no node anywhere (Cleveland Metroparks, the Cuyahoga Metropolitan Housing Authority, the Cuyahoga County Board of Health, the Civilian Police Review Board, the Ohio Power Siting Board, the Ohio Department of Health, the county Fiscal Officer's budget, and the consent decree monitor). Decision 6 in section 9 asks whether to add them.

### 3.4 Terms: what must be cleared, and by whom

| New source (stage) | State today | What is needed before it ships | Who |
| --- | --- | --- | --- |
| The City Record, Board of Control section (3) | `city_record_actions` is registered, `review_required` | Brent reads the City Record's terms of reuse once (already open in STATE-OF-BUILD "left to do"); this section is the same files | Brent |
| County Council grid and PDFs, executive orders (4) | `county_council_legislation`, `county_executive_actions` registered, `review_required` | Brent reads the county's disclaimer and terms; confirms the member surname list | Brent |
| Board of Health, Board of Elections, RTA, Port, sewer district pages (5) | Not registered | Register each in `scripts/us_sources.py` style with owner, cadence, access and `review_required`; Brent reads each site's terms; the rate limit is 1 request every 5 seconds | Brent |
| Ohio General Assembly bill pages (6) | Not registered for rooms; the candidate plan registers them | Brent reads the terms (none found); certificate fix reviewed | Brent |
| PUCO case system, OPSB, Ohio EPA portal (7) | Not registered | A short written request from Equalpoint to PUCO asking permission to copy docket titles and status; a reply before any fetch. Robots file names scrapers | Equalpoint writes; Brent decides |
| CMSD BoardDocs (8) | Refused to scripts | A short written request from Equalpoint to the district asking for a data feed or permission; nothing is fetched until the district answers | Equalpoint writes; Brent decides |
| NOACA, the Charter on the code library | Refused to scripts | A person reads by hand; links only | Brent or a named reader |
| Eighth District opinions (9) | In the candidate plan | As there | Brent |

A source is never fetched, and nothing from it is shown, until the line in `scripts/us_sources.py` says who read the terms and when. Each new source also gets a terms note in `docs/source-notes-rooms.md` (owner, address, what was read on what day, the terms found, completeness, risks), the same shape as `docs/source-notes-votes.md`.

## 4. What a resident sees

Wireframes for the desktop and the phone are being drawn by a separate design agent and live in the session scratchpad under `place-review/rooms-wire` (they are not copied into the repo). This section describes every screen in words so the wireframes and the plan agree. Where they differ, the words here win until Brent says otherwise.

Everything below keeps the rules: receipts, not scores; sponsorship is not a vote; a missing record is not a no; plain English, no dashes; no left accent stripes (a tinted tile or a dot instead); both styles, both layouts, light and dark, English and a Spanish draft. **Nothing already finished is restyled**: the ward maps and captions, stories, the Explore rail and Cuy, profiles, the United States map, Index and Tree, the ballot and levy stories keep their look. The new parts are new sections inside the room page and the record sheet, built from tiles, rows and buttons the app already has, with no new color, size, radius or weight (`node scripts/design/audit.js` must pass with `design/tokens.json` unchanged).

### 4.1 Reading and flow: firm rules

These are the rules for every new piece of text on a room or a node. They are enforced, not hoped for (the tests are in sections 5, 6 and 7).

**Rule 1. Layers, not walls of text.**

| Layer | What it holds | How it opens | Limit |
| --- | --- | --- | --- |
| **1. Always showing** | A headline, then one plain line | Nothing to tap | Headline 12 words or fewer. Plain line about 15 words, never over 18 |
| **2. One tap: "How this reaches you"** | Four answers, one sentence each: what you might notice, what it covers, where, why it works this way | A closed disclosure under the plain line | Each sentence 20 words or fewer. The whole open card 80 words or fewer |
| **3. One more tap: "The official wording and sources"** | The official text quoted, each source with the day it was read, the review notice, the longer description the node already has | A second closed disclosure | The record's own words, unchanged |

Nothing longer than layer 1 is open by default. The person first tile (section 4.2) is part of layer 1 and is two sentences at most.

**Rule 2. Word budgets per piece.**

| Piece | Limit |
| --- | --- |
| Headline | 12 words |
| Plain line (layer 1) | about 15, never over 18 |
| Each of the four answers | one sentence, 20 words |
| The whole open "How this reaches you" card | 80 words |
| "What this means for you and your block" | 25 words, two sentences at most |
| An empty state | title 8 words, body 35 words, next step 6 words |
| A record row | the date, what happened in 15 words, the source name |
| A word note (jargon tap) | 20 words |
| Words showing on a room page with nothing opened | 300 |
| Words showing on a node sheet with nothing opened | 350 |

The last two follow `docs/plan-plain-text.md` (lead of two sentences and 35 words, sentence of 22 words or fewer, 250 words on a list screen, 350 on a detail screen); the sentence limit here is stricter (20) because these lines are the heart of Brent's mission.

**Rule 3. A clear order, every time.** What it is, then who is affected, then where, then why it works this way, then where to read more. On the screen that is: the plain line (what it is); "What you might notice" (who is affected, in terms of a bill, a permit, a bus, a school, a clinic, a park); "What it covers"; "Where"; "Why it works this way"; and "Read more" (links and official next steps only, never advice on how to vote). The labels are fixed words and never change from node to node, so a reader learns the pattern once.

**Rule 4. A reading level, measured.** Target about grade 7 to 8. How it is measured: a new unit test, `scripts/test_reading.js`, with a plain function and no library: grade = 0.39 times (words per sentence) plus 11.8 times (syllables per word) minus 15.59, with syllables counted by vowel groups and a silent e rule. It reads every line between the `ROOMS-TEXT` markers (our own sentences only; quoted official wording, names, numbers and file numbers are skipped). It fails if the average grade is over 8.0, if any one line is over 10.5, if any sentence has more than 20 words, or if a line has no sentence-ending period. It prints the ten worst lines so the writer can fix them. It sits beside the `text-budget` browser check, which counts words showing on the screen with nothing opened and stays in `scripts/checks/text-budget.json` (two new entries recorded on purpose in Stage 1: "Records: a room", 300, and "Records: a node", 350). The unit test guards the source text; `text-budget` guards what a resident actually sees. This is the "simple formula in the audit" that `docs/plan-plain-text.md` already asks for.

**Rule 5. Jargon is a tap.** Any term that is not everyday English (ordinance, appropriation, requirement contract, bid, mill, levy, docket, rate case, consent decree, tax increment financing, referral, roll call, Board of Control, took effect) is tappable and opens a note of 20 words or fewer with an example from our own record. This reuses two things that exist: `CX_Definable` with `cxFindTerm` (rooms already wrap their `answer` text with it) and the role-word note pattern of `docs/plan-explain-committees-and-seats.md` (one note per word, reused everywhere). New words are added to the Dictionary (`CX_DICT_EXTRA` in `ext/cx-data.jsx`). A unit test holds a list of jargon patterns and fails if one appears in layers 1 or 2 without a dictionary entry.

**Rule 6. A guided path and a quick view.** For a first-timer, a button "Walk me through it" runs the chain of effect (section 4.3) one step at a time in the existing story engine (`cxmStories`, `CxmStory`; frames of a big line and a small line, each with its source). For a person who already knows the subject, the same facts are in the quick view: the card and the stepper on one screen. Both are always on offer; the app remembers nothing about which was used.

**Rule 7. Never.** No forecast ("will lower your bill"), no advice ("you should"), no score or ranking, no judgment of importance, no dash, no "no" for a missing record. A sentence that says what the record says is allowed ("The ballot wording states a cost of $196 for each $100,000 of market value"). A sentence that says what will happen to a person is not.

### 4.2 Person first: "What this means for you and your block"

Every room page and every node sheet leads with a tinted tile, above the body's org chart, map and tabs. It has a heading and two sentences of 25 words or fewer in all. It reuses what the app has; it invents no second system.

- **With a place set on the device** (the home picker, remembered only if the person turned that on; never in a link, a request or storage beyond what Remember allows): the tile says the place and then what the record says for it. The place comes from `cxStoryHome()`; ties come from the shared ward matcher (`cxWardsIn`, `CX_WARD_LOOK`, `cxWardTie` in `ext/cx-live.jsx`, with the reason shown: "Names Ward 8", "Ward 8 in the ordinance text", "Address in Ward 8").
- **With no place**: "Set your neighborhood to see what this means for your block. It stays on this device." and the existing button "Set your neighborhood" (the home picker). The room still reads in full for the whole city.
- **Where the body is not tied to wards** (a school district, a county council district, the Ohio House): the tile says so and offers the existing "Find my districts" door; if the person ran it in this visit, the result is read from memory only (that feature never saves the address). The tile never guesses a district from a ward.
- **Priorities and the ledger**: if the person chose priorities (up to five, kept as the app keeps them), a node whose subject matches one shows "Matches your priority: Housing" as a plain label. It is a label, not a score, and nothing is ordered by it. The same node links to the Decision ledger entry when one exists. The three lenses of Today's receipts, "Your ward", "Cleveland" and "Who decided this?" (`ext/cxm-today.jsx`), are the three small words under the tile: each opens What's new at that lens. Nothing new is built for them.

Worked wording, with the real numbers behind it (the matcher run on the record, Oct 7, 2026):

| Case | Tile says |
| --- | --- |
| Public Utilities, place set to Hough, Ward 8 | "You are in Ward 8 (Hough). None of the 43 Council files that name Public Utilities in 2026 names a ward, so utility services are citywide." |
| Parks and Recreation, a ward with a tied file (8 wards each have one) | "You are in Ward 7. One Council file this year names Ward 7 and Parks and Recreation. Open it." |
| Public Utilities, no place set | "Set your neighborhood to see what this means for your block. It stays on this device." |
| Cuyahoga County Council, no districts run | "County Council districts are not wards. Find my districts shows yours. It never leaves this device." |
| Board of Control, any place | "These contracts are citywide. The record names no ward." |

The honest "citywide" answer is itself a finding: of the 43 Council files that name Public Utilities in a title, none ties to a ward by name, ward money or address in our data. The plan never invents a local effect for a citywide body.

### 4.3 "How this reaches people": four answers and a chain

**The four answers**, in fixed order, each one sentence of 20 words or fewer, each with its source one tap down:

1. **What you might notice** (HOW): what a resident might see in daily life, stated as what the record says the body covers. A bill, a permit, a bus, a school, a clinic, a park. Never a forecast.
2. **What it covers** (WHAT): the service, rule, money or place the decision or body affects.
3. **Where** (WHERE): which ward or neighborhood, citywide, county, school district or a named place, from the record or the matcher. If the record names no place, it says "Citywide" or "The record names no ward".
4. **Why it works this way** (WHY): the law, Charter section, ordinance or budget line that gives the body the power, and one thing it cannot do alone. Each cites its source. Where the source is refused to scripts (the Charter, the code library), a person reads it by hand and the line says "read by a person on {date}" once reviewed.

**The chain of effect** is a small linked path of five steps: **Decision, Body, Rule or money, Service, You**. Each step is a short label (5 words or fewer) and one tap target:

- Decision: what is being decided ("A rate ordinance or a contract").
- Body: the node or nodes that decide (taps open that node in the same room, from the existing map nodes and edges).
- Rule or money: the ordinance, Charter section or budget line, with its link.
- Service: the department, utility or program that carries it out (taps open that node).
- You: the person or place (the resident node, or the ward or neighborhood from section 4.2).

On the phone it is a vertical stepper of five numbered rows, each a tinted tile with the step name and its label; the row you are on has a darker tint (no left stripe), and each row is a button that opens that node or source. On the desktop it is five chips in a row joined by arrows, with the chosen step's one sentence under the row; the room map highlights the chain's nodes with the same path highlight the room already uses for its guided view (the room's `path` array). Where a step is not in the record, the row says "Not in our record yet" and links the official source.

**Every claim traces to a receipt**: an ordinance's own title or purpose, a budget line, the Charter, a program page or a published minute. Interpretive plain English lines sit between markers (section 5.4) with the unreviewed notice and a review command Brent runs.

**The empty state for effect** (never implies no effect): "We do not have a record of how this reaches people yet. That does not mean it has none. Start with {the official page}." (27 words). It is shown for every node that has no reviewed line yet, so the check "a node shows a person centered line or this state" always passes honestly.

### 4.4 "What this has done": votes, actions, positions

A section named **What this has done** appears on the room page (a summary by body) and inside each node's sheet (the full list), placed in the existing Votes & actions and Positions tabs so the tabs, their order and their look do not change. On the desktop it fills the same two tabs of the drawer (the patches around `CX_DrawerRecord`).

**Votes** (a body that votes: Council, a committee's agenda outcomes, Board of Control, County Council, RTA board): newest first, 20 at a time. A row is the date, what happened in the record's own word, the file or resolution number and the source with the day pulled; a ceremonial item is one short line. Opening a row shows every member under the record's own word (Yea, Nay, Absent, Recusal and so on) and a count line ("14 Yea, 0 Nay, 1 Absent"), exactly as `CX_RecVote` does for Council. No total across members, no ranking, no percent, no party. A vote that does not add up is held back with the existing "We are not showing this one" words.

**Actions** (everything else the record shows): referred to a committee, approved by the Directors of Finance, passed, took effect, the Mayor's nomination received, the appointment approved without objection, a meeting held, a document posted. Each row is dated and sourced. Order is newest first, never by count. The Mayor's list says what the record prints (the administration sent it, it took effect) and says plainly that no signature or veto date is printed.

**Positions** (two kinds, always apart, as in `docs/plan-votes-actions-positions.md`): "In the record" (sponsors, the record's own title as its purpose, a committee report, a body's own stated purpose) and "Stated outside the record" (a quote, a letter, a testimony). The second is built but hidden until a named person has added and reviewed an entry. For a body with none, the Positions tab says so in words (section 4.6).

**For a body that does not vote**: a department does not vote. Its section is headed "Council files that name this department" and the first line says so. A body that publishes only documents (a health board's agendas and minutes, the Board of Elections, the Port) is headed "Meetings and documents", lists date, kind (agenda, packet, minutes) and link, and says "We list the meetings and link the minutes. We have not read each vote."

**Counts** are per kind and per body only, in a sentence ("36 Council files that name this department passed in 2026"). Never a total across bodies, never a figure used to order bodies or members.

### 4.5 The screens, in words

**Phone, Records > Rooms > a room** (`CxmRoom`). Top to bottom: Back to all rooms; the kicker (region); the room name; the lede with the question and answer (unchanged, with its tappable terms). **New: the person first tile** (4.2). The map or text view and the guided Start, Meaning, Power, Proof steps (unchanged). **New: "What this room has done"**: one row per body in the room (wards grouped as one row "15 ward council members"), each row the body's name and one honest status line ("36 Council files name it in 2026. 35 have a roll call.", or "Its minutes print in the City Record. We have not added them yet."), the whole row a button to the node. The existing "Records in this room" list (by layer) stays below, unchanged. The room page ends with the Resident check button as now.

**Phone, a node** (`CxmRecord`). Evidence chip and portrait, the node's name, **new: the plain line (layer 1) and the stepper in a closed row "How this reaches you"**, then the four tabs as they are. Tab Overview keeps the summary, "Where it applies", "Role in the system" and "Connected records" and gains the person first tile at its top. Tab **Votes & actions** shows "What this has done" or the named state. Tab **Positions** shows the two kinds or the named state. Tab Sources keeps "Evidence coverage" and gains the layer 3 content: the official wording, each source with its day read, and the review notice.

**Desktop, a room.** The room header and the map stay. The person first tile sits under the header, above the map. Under the map, **What this room has done** is a list of body rows with the same status lines. The existing drawer opens on a node click.

**Desktop, a node's drawer.** Title, then the plain line and the five chip chain, then the existing tabs. Votes & actions and Positions carry the same content as the phone. The drawer patches are exact-match `patch()` calls in `build.py` that extend the ones already there for city files (`!/^leg-/.test(U.id)` becomes a lookup of the node's registry state).

**Guided path** ("Walk me through it"). Five story frames of a big line and a small line: 1 "Someone decides." (the decision), 2 "A body acts." (the body, with its latest dated record), 3 "A rule or money backs it." (the ordinance, Charter section or budget line, with a link), 4 "A service carries it out." (the department or program), 5 "It reaches you." (the person or place, from 4.2). Each frame shows its source and ends with "Read more" and a way back to the room. It is the same engine and frame shape as the other stories (`cx-story.jsx`), with a new builder `cxmRoomStory(roomId, nodeId)`.

**Quick view.** The card and the stepper on one screen: layer 1, then the closed "How this reaches you" row, then the tabs.

**Not changed**: the ward maps and captions, the Explore rail and the guide, profiles, the United States map and its Index and Tree, ballot stories and levy stories. The room's `?room=` and `?node=` links stay as they are and carry nothing about the viewer.

### 4.6 Every state, with the exact words

These reuse `docs/plan-states.md`: the 24 standard states, the lead words of the Bench's six (`SP_STATE`, `CX_EVIDENCE_STATES`), the pieces `CxmEmpty`, `.cxm-status-line` and `.cxm-notice`, and the future `CxState` family (`data-cx-state` markers). The names in the first column are plan-states names. `{x}` is filled from the registry (section 5), so the sentence is one string and Spanish can reorder it. All plain English, no dashes. The rule from plan-states 3.2 holds: every empty, failed, blocked or not found state names a next step.

There are two honest leads and they must not be swapped. **"Not in our record yet"** means the official source exists and we have not added it (or have not asked): it says nothing about what the source holds. **"Not in the record"** is used only when we read the source and it holds none: that is the Bench's sentence for a real finding.

| State (plan-states name) | Used for class | Title | Body | Next step |
| --- | --- | --- | --- | --- |
| Ready | A | none (the list) | none | none |
| Loading | all | none | "Loading {the Council record}." | none |
| Slow, Could not load, Offline | all | per plan-states 3.3 | per plan-states 3.3 | "Try again" |
| Partial (5) | A with limits, AC | "Partly shown" | "We show {n} Council files that name {the Department of Public Utilities}. Its own decisions are not in our record. A missing record is not a no." | "See where we looked" |
| No record found, not added (7) | B, B1 | "Not in our record yet" | "{The Board of Control}'s votes are published, but we do not show them here yet. A missing record is not a no." | "Read them at {the City Record}" |
| No record found, we looked (7) | any, when read and empty | "Not in the record" | "We found no {executive orders} for {2026} on {the city's page}, read {Oct. 7}. That is not the same as none. A missing record is not a no." | "Check the official source" |
| Blocked (13) | BB, refused | "{BoardDocs} cannot be shown here" | "{The school district}'s board records are on a site that does not let our software read them. You can read them there." | "Open {BoardDocs}" |
| Not added, a person must ask first | BB, needs clearance | "Not in our record yet" | "{PUCO}'s case files are public on its site. We have not asked to copy them yet. A missing record is not a no." | "Open {the PUCO case search}" |
| Not a voting body | C | "No votes to show" | "{The Charter} is a law, not a body that votes. Read it on {the city's site}." | "Read {the Charter}" |
| A person, not a body | C (a leader) | "A person, not a body" | "{The CEO}'s decisions are board records. See {the school board}." | "Open {the board}" |
| Out of scope | CS | "Cases are not listed here" | "Court cases name private people, so we do not list them. The court's own site has what it publishes." | "Open {the court's site}" |
| Not yet probed | NP | "Not in our record yet" | "We have not checked where {the Civil Service Commission} publishes its decisions. Start at its own site." | "Open {its page}" |
| Not yet reviewed (8) | any plain line of ours | none (one line) | "A person has not reviewed this yet. It was made from {the source}." After review: "Read against its sources by {name} on {date}." | the source link |
| Stale (9) | any dated list | none (one line) | "These records were pulled {n} days ago. Newer actions may be on {the official site}." | the official site |
| Held back (12) | a vote that does not add up | "We are not showing this one" | "We have a record for it, but a check did not pass, so it is held back. A missing record is not a no." | "Read it at the source" |
| Positions, none | any body | "No positions in our record yet" | "We have no official statements for {the Department of Public Utilities}. A missing record is not a no." | "Read its own pages" |
| Effect, none | any node without a reviewed line | none (one line) | "We do not have a record of how this reaches people yet. That does not mean it has none. Start with {the official page}." | the official page |
| Person first, no place | all | none (the tile) | "Set your neighborhood to see what this means for your block. It stays on this device." | "Set your neighborhood" |

Every word here is new copy outside the marker blocks of `cx-votes-text.jsx`, `cx-offices-text.jsx`, `cx-seat.jsx` and `cx-us-text.jsx`, per plan-states (editing a marker block resets its review flag). It belongs with the state components. Brent reads these words once (section 9, decision 1).

### 4.7 Six worked examples

Each has the headline, the plain line (layer 1), the four answers (layer 2) with their source, the chain, what the record holds, and what could not be verified. Every sentence is within the limits of 4.1. "Source" is the receipt a reviewer checks; "Unverified" is stated plainly and stays out of the shipped text until a person has checked it.

**A. Department of Public Utilities (water bills, who sets rates, what Council can change)**

- Headline: "Your water and power bills start here."
- Plain line: "This department runs Cleveland's water, power, and water pollution control services."
- What you might notice: "Your water bill has a fixed charge by meter size and a charge for how much you use." Source: Cleveland Water, Rates and Fees page, read Oct. 7, 2026.
- What it covers: "It covers drinking water, electric service from Cleveland Public Power, and water pollution control." Source: the node's own summary, from the city's department pages.
- Where: "Cleveland Water serves 80 communities, and your rate depends on your distance and elevation from Lake Erie." Source: the same page ("80 communities"; "the distance and elevation of your property from Lake Erie").
- Why it works this way: "Water rates are written into a city ordinance, so changing them takes a new ordinance that Council passes." Source: the page links the "Water Rates and Billing Ordinance" on the city code library. **Unverified:** that Council alone amends the schedule, and who proposes a change. The code library refuses scripts, so a person reads the ordinance by hand before this line ships; until then the line is replaced by "Water rates are in a city ordinance. Read it on the city's code library."
- Chain: Decision, "A rate ordinance or a contract". Body, "City Council, then Public Utilities". Rule or money, "The Water Rates and Billing Ordinance, paid by ratepayers". Service, "Cleveland Water and Cleveland Public Power". You, "Your water bill and your service line." Cleveland Water's page also says it "operate[s] entirely on revenue from ratepayers" and spends 36 cents of each dollar on infrastructure and 38 cents on treatment and delivery; those two figures are a receipt for the "money" step.
- What the record holds: 50 Council files name the department (title or printed referral), 36 passed, 35 with a roll call. For example 624-2026, "Program Year 5" of replacing lead and galvanized service lines, passed May 18, 14 Yea 0 Nay, took effect May 20. We found no 2026 Council file that sets water rates in the 1,393 titles; the schedule on the Cleveland Water page runs from 2025 to 2029. Whether the department's own decisions (a rate review, a shutoff notice) exist as records is not known.
- Honest gaps: the department's own actions; the ordinance text (refused to scripts); what Council could change is not a forecast and is not stated.

**B. Board of Control (contracts, who sits on it)**

- Headline: "City bids and contracts get approved here."
- Plain line: "The Board of Control approves city bids and contracts. Its minutes print in the City Record." (16 words)
- What you might notice: "Plumbing and air conditioning repairs for city buildings were among the contracts approved on Sept. 30." Source: City Record, Oct. 2, 2026, pp. 131 and 132 (resolutions 275-26 and 276-26).
- What it covers: "Bids and contracts for city departments. On Sept. 30 it approved two, estimated at $1,138,000 and $1,654,800." Source: the same pages ("would amount to $1,138,000.00" and "$1,654,800.00").
- Where: "Citywide. These two contracts are for city facilities, and the record names no ward." Source: the same pages (Division of Property Management, Department of Public Works).
- Why it works this way: "The resolutions cite Section 131.67 of the Codified Ordinances as their authority." Source: the same pages. **Unverified:** the dollar amount above which a contract needs the board, and the Charter section that creates it.
- Who sits on it, as the record prints it: directors of city departments, with the Mayor listed. On Sept. 30 the record shows 11 Yea, no Nays, and 4 absent (Mayor Bibb and three directors). The record names directors by surname and title ("Director Griffin", "Acting Director Preslan"); we show them exactly as printed, link none to a person, and never match a surname to a Council member (a "Director Griffin" is not Council President Blaine Griffin).
- Chain: Decision, "A bid or a contract". Body, "The Board of Control". Rule or money, "Section 131.67; the contract amount". Service, "The department that buys it". You, "The repair, the supply, the street work".
- What the record holds: nothing in `data/` yet. The City Record, which we already download every week, prints the minutes (`Resolution No. 276-26` by Sept. 30 suggests about 276 resolutions this year if every one is printed; the parser will report how many it finds against the numbers). Stage 3 reads them.
- Privacy: "Others Present" lists city staff; we do not store those names.

**C. A levy and the school board (property taxes, which district)**

- Headline: "Your school levy depends on your district."
- Plain line: "A school levy is a property tax vote for the one district named on your ballot." (16 words)
- What you might notice: "On one ballot the cost reads $235 for each $100,000 of county market value, for five years." Source: the Strongsville City School District wording in the Board of Elections issues list (6.7 mills, estimated $15,427,256 a year, commencing in 2026, first due in 2027). The app holds the official wording of every school levy on the Nov. 3 ballot.
- What it covers: "Current expenses of that district, as the ballot wording states." Source: the same wording.
- Where: "Only voters inside that school district vote on it, and district lines are not ward lines." Source: the node's own text ("School-district boundaries; these are not the same as council wards"). Find my districts shows your school district.
- Why it works this way: "The County Fiscal Officer's estimate is printed in the ballot wording." Source: the wording ("the County Fiscal Officer estimates will collect"). A separate honest line follows: "The board vote that placed it on the ballot is not in our record yet."
- The Cleveland school board node: "Cleveland's mayor appoints the nine voting board members from nominees." Source: the compiled room data and the city's news release. The board's agendas and votes are on BoardDocs, which refuses scripts: the state is "BoardDocs cannot be shown here" with the link. We found no Cleveland Metropolitan School District levy among the district names read in the official issues list; a person confirms the full list.
- A countywide example, from the official wording in the app: Issue 11 is a health and human services levy, "a renewal of 4.7 mills and an increase of 2.5 mills", not over 7.2 mills, "$196 for each $100,000 of the County Fiscal Officer's market value", ten years from 2026, first due in 2027, estimated $261,527,652 a year. The levies guide already presents it; the room links to that guide.
- Chain: Decision, "A board asks voters". Body, "The school board; then voters". Rule or money, "The ballot wording; a property tax". Service, "The district's schools". You, "Your tax bill, if you live in the district".

**D. The budget (where Council's vote changes a line)**

- Headline: "The budget lets city departments spend money."
- Plain line: "A yearly budget ordinance gives each city department permission to spend." (11 words)
- What you might notice: "City departments that run daily services need this permission before they can spend." Source: the ordinance's own title (117-2026: "To make appropriations and provide current expenses for the daily operation of all municipal departments ... from January 1, 2026 until December 31, 2026").
- What it covers: "The daily operation of all municipal departments for the 2026 fiscal year, as the title says." Source: the same title. A word note on "appropriation" says that permission to spend is not proof a payment happened (the Dictionary's own example).
- Where: "Citywide. Our record does not split the budget by ward." Source: the file and the ward matcher (no ward named).
- Why it works this way: "Council passed it on March 23, 2026, after referral to the Finance, Diversity, Equity and Inclusion committee." Source: the Council record rows (referred Feb. 2; approved as amended; passed 11 Yea, 3 Nay; took effect March 26).
- Where Council's vote changes a line: the file's action list says "approved as amended". **Which lines changed is not in our record** (the amendment is an attachment in Legistar that we do not read). The room says so, links the Legistar file and the Interactive Budget Portal, and does not guess. Budget hearings are in the record as agenda items: Feb. 18 (Law, Public Safety divisions, Community Police Commission, Office of Professional Standards, Civilian Police Review Board) and Feb. 25 (Public Works, Cleveland Public Power, Cleveland Water, Water Pollution Control).
- Chain: Decision, "Council passes the budget". Body, "Council, with the Finance committee". Rule or money, "The appropriation ordinance". Service, "Each department's work". You, "The services you use".

**E. A health board (monthly meetings, which district)**

- Headline: "The county health board meets each month."
- Plain line: "The Cuyahoga County Board of Health meets every month and posts its minutes." (13 words) Source: its Board Minutes and Agendas page, which lists a 2026 meeting each month.
- What you might notice: "Its pages list immunizations, vaccines, and reproductive health services." Source: the same site's service sheets.
- What it covers: "It covers county public health programs, while Cleveland also has its own Department of Public Health." Source: both sites. **Unverified:** which communities each of the two health offices serves; a person confirms from the Ohio health district list before this line ships. Until then the Where row reads "Check which health office serves your address" with the official link.
- Where: held until verified, as above.
- Why it works this way: held until a person reads the statute that creates a health district.
- What the record holds: documents only. For 2026 the page lists minutes for Jan. 28, Feb. 25, Apr. 1, Apr. 22, May 27, Jun. 24, Jul. 22 and Aug. 26, and the Sept. 23 agenda. Each vote is inside a PDF; we list them and do not read them yet. On the city side, 32 passed Council files with "health" in the title include grants and leases to the Director of Public Health, for example 103-2026 (the MomsFirst program with the county's Invest in Children), passed Feb. 9.
- A new node: the county Board of Health is not a node in any room today (section 9, decision 6).

**F. An energy rate case (PUCO)**

- Headline: "Delivery rates for The Illuminating Company go through PUCO."
- Plain line: "A state commission, PUCO, reviews rates for The Illuminating Company, not only City Council." (14 words) Source: the node's own text ("handled through Ohio utility regulation, not simply by Cleveland City Council").
- What you might notice: "If The Illuminating Company serves your home, the delivery part of your bill is a regulated rate." Source: the node's text. **Unverified:** how a given bill splits delivery and supply.
- What it covers: "Rates and service rules for the company's distribution of electricity." Source: the node's text.
- Where: "The company serves Northeast Ohio, and Cleveland Public Power serves part of the city." Source: both nodes' region fields ("Northeast Ohio service territory"; "Cleveland and connected service areas"). The household's own utility is on its bill.
- Why it works this way: "Ohio gives utility rate reviews to PUCO, and each review is a numbered case with filings and an order." Source: the node's text and the case system's pages (a case record page loads by number, for example 24-0020-EL-RDR). **Unverified:** the meaning of the letters in a case number, and the number of the current Illuminating rate case. A scripted lookup keys on the number alone and could not find the case by guessing, so no case is named.
- What the record holds: nothing from PUCO. The case system answers, but its robots file names scrapers, and the agency's main site answers a script with a generic not found page. The state is "Not in our record yet. PUCO's case files are public on its site. We have not asked to copy them yet." and the next step opens the PUCO case search. The Council side is real: 17 files name Cleveland Public Power (10 passed), for example 184-2026 (tree trimming) and 410-2026 (substation upkeep).
- Chain: Decision, "A rate review". Body, "PUCO". Rule or money, "The case's order; your delivery rate". Service, "The Illuminating Company's lines". You, "The delivery part of your bill".

## 5. Data shape and who writes it

### 5.1 The rules that decide the shape

- **Only `scripts/refresh.py`, or a fetcher it runs, writes `data/`.** Each new source needs a fetcher, unit tests, a terms note in `docs/source-notes-rooms.md`, and a line in `scripts/us_sources.py` style that says `review_required` until a named person has read its terms.
- **A pure function of `data/` may write `site/`.** That is how `scripts/council_record.py` (`site/council/record-2026.json`) and `scripts/records_feed.py` (`site/records/`) already work, and it is how Stage 1 ships with no new fetcher and no new `data/` file.
- **Interpretive text is not data.** Plain English lines about what a body decides sit in `ext/cx-rooms-text.jsx` between markers, with the unreviewed notice and a review command that Brent runs (the pattern of `ext/cx-offices-text.jsx` and `ext/cx-votes-text.jsx`). I never run it.
- **A record is keyed by a confirmed body key, never by a name at read time.** A name is a hazard: "Director Griffin" on the Board of Control is not Council President Blaine Griffin, "Conwell" on County Council is not Kevin Conwell on City Council, and the county's PDFs misspell a member's name. So a body is matched by exact strings the record itself prints (a referral line, a Legistar body name, a document title) tied once, in a registry a person reviews. A member of a body is matched by `person_id` where one exists (Council members, from `data/people-2026.json`) and by a kept list of printed names for a county or board member. A name is never matched by similarity, and a Board of Control director is shown as printed and linked to no one.

### 5.2 The body registry: `scripts/bodies.py`

One reviewed Python file, like `scripts/us_sources.py`. A key is `scope.kind.slug`: `city.council`, `city.committee.finance`, `city.dept.public-utilities`, `city.board.control`, `county.council`, `county.board.health`, `state.oh.house`, `fed.us.house`.

```python
"city.dept.public-utilities": {
  "name": "Department of Public Utilities",
  "nodes": ["dept-utilities", "dpu-energy"],      # every room node that is this body
  "class": "A",                                    # A, AC, B1, B, BB, C, CS, NP, P (section 2.1)
  "votes": False,                                  # a department does not vote
  "ties": {                                        # exact strings printed in the record; never fuzzy
    "title":    ["Public Utilities", "Division of Water", "Cleveland Public Power", "Water Pollution Control"],
    "referral": ["Public Utilities"]},
  "official": {"label": "Cleveland Department of Public Utilities",
               "url": "https://www.clevelandohio.gov/city-hall/departments/public-utilities"},
  "publishes": {"what": "Council files that name it; its own decisions are not published as data",
                "where": "https://cityofcleveland.legistar.com/", "format": "html", "terms": "review_required"},
  "empty": None,                                   # or one of: notbuilt, blocked, needsperson, notvoting, person, outofscope, notprobed
}
```

Tests (`scripts/test_rooms.py`): every node id in the build's node list (`build.py` writes `build/work/rooms-nodes.json`: room, id, kind for all 293 places) is in exactly one body; every `A` body ties at least one file (or says `all`); every `empty` reason has an official `https` address; two bodies never share a tie string unless declared; the Finance and Law referral strings are marked `routing` and are never counted as acting.

### 5.3 Files

| File | Written by | Holds | Loaded |
| --- | --- | --- | --- |
| `scripts/bodies.py` | a reviewed change | The registry above | Build and tests |
| `site/rooms/rooms-2026.json` | `scripts/rooms_record.py`, a pure function of `data/`, run by `build.py` | Per body: state, reason, official link, counts per kind, the file numbers newest first, meeting and agenda counts, pulled dates. It points at `site/council/record-2026.json` for the dated rows of a file, so it holds numbers and not copies. About 30 KB | Fetched when a room opens; in the offline single file a block read only then |
| `data/boc-2026.json` | `scripts/fetch_cityrecord.py`, parser 3, via `refresh.py` (Stage 3) | Board of Control meetings and resolutions with Yeas, Nays, Absent | Lazily |
| `data/county-2026.json` | `scripts/fetch_county.py` via `refresh.py` (Stage 4; shared with candidate stage 2b) | County Council resolutions with Yeas and Nays matched to a kept member list, the Executive's orders | Lazily |
| `data/boards-2026.json` | `scripts/fetch_boards.py` via `refresh.py` (Stage 5) | Dated documents per body: kind (agenda, packet, minutes, resolution), title, address, and the record's status word where it has one (RTA) | Lazily |
| `data/ohio-ga-2026.json` | `scripts/fetch_ohio.py` (Stage 6; shared with candidate stage 2c) | Floor votes by chamber and by member | Lazily |
| `data/puco-2026.json` | `scripts/fetch_puco.py` (Stage 7, only after PUCO answers) | Case number, title, status and last filing date for named cases | Lazily |
| `docs/source-notes-rooms.md` | a person with me | Terms notes per source | n/a |
| `ext/cx-rooms.jsx` | build agents | Components: `CxRoomDid`, `CxNodeDid`, `CxNoRecord`, `CxPersonTile`, `CxReach`, `CxChain` | Always |
| `ext/cx-rooms-text.jsx` | a person | The plain lines, between `ROOMS-TEXT` markers | Always |
| `data/rooms-text-reviewed.json` | `build.py` (from `--mark-rooms-text-reviewed`) | The review fingerprint of each room's text | Build |

Every row of every new `data/` file carries `source` (address and label) and `pulled` (the day), and a vote row carries the record's own word. A vote that does not add up (the Yeas, Nays and Absent do not equal the members present, a surname does not map to a member) is held back with a reason and listed, never fixed by hand. A second run of every fetcher writes the identical file.

### 5.4 The text: `ext/cx-rooms-text.jsx`

```js
/* ROOMS-TEXT-START money
   Interpretive text: ... a person reads each line against its source, then runs:
       python build.py --mark-rooms-text-reviewed "Your Name" money
   Until then, and again after any change here, the place these words show says a person has not reviewed them. */
const CX_ROOMS_TEXT = {
  "board-control": {
    headline: `City bids and contracts get approved here.`,
    line: `The Board of Control approves city bids and contracts. Its minutes print in the City Record.`,
    you: `Plumbing and air conditioning repairs for city buildings were among the contracts approved on Sept. 30.`,
    covers: `Bids and contracts for city departments.`,
    where: `Citywide. The record names no ward.`,
    why: `The resolutions cite Section 131.67 of the Codified Ordinances as their authority.`,
    chain: [`A bid or a contract`, `board-control`, `Section 131.67; the contract amount`, `The department that buys it`, `The repair, the supply`],
    sources: [{ label: `The City Record, Oct. 2, 2026, pages 130 to 132`, url: `...`, read: `2026-10-07` }],
  },
};
/* ROOMS-TEXT-END money */
```

- **One block per room**, so a later room's text does not reset an earlier room's review. `build.py` fingerprints each block into `data/rooms-text-reviewed.json` (the way `data/alignment-reviewed.json` works). The command is `python build.py --mark-rooms-text-reviewed "Name" <room ids or all>`. Brent runs it. I prepare a review packet for each room (line, source, day read, anything unverified) and never run it.
- **Unverified claims never ship.** A line with an unverified part is replaced by its safe form (section 4.7 A, E and F show how) until a person has read the source. A test fails if a line has no source, no read date, more than 20 words in a sentence, a dash, or a banned word (score, rank, best, worst, most, powerful, important, will, should).
- **One text for a ballot office and its room node.** The "What might your choices affect?" pages read `can` and `limits` from `ext/cx-offices-text.jsx` (`CX_OFFICES`). Where a room node is the same office (the County Executive), its "What it covers" and "Why it works this way" read the same strings, so there is one text and one review. `CxOfficeNote` becomes `CxBodyNote` for both.
- **Counts of text.** Stage 2 writes about 100 lines; Stage 10 about 120. A line is under 20 words, so a line takes about 15 minutes to write with its source, and about 1.5 minutes for Brent to read against the source.

### 5.5 The browser and unit checks that keep this honest (summary; each stage lists its own)

- `scripts/test_rooms.py`: the registry covers every node once; ties are exact; counts equal `data/`; every row has a date, a source and a pulled day; no body claims votes it does not have; every empty reason has an official link; a `votes: False` body never shows a vote count.
- `scripts/test_reading.js`: the reading rules of 4.1 on the text between the markers.
- `rooms-record` (browser): walks every room and every node (section 7).
- `rooms-reach` (browser): the layers, the stepper, the jargon taps, the person tile with and without a place, the guided path (section 7).

## 6. Stages

Each stage ships alone behind the full gate (`python scripts/release.py`, about 12 minutes). The fast lane is not available for any stage that touches `build.py`, a fetcher, `refresh.py`, the i18n pipeline, or `scripts/checks/`; it is allowed only for a later wording fix inside a `ROOMS-TEXT` block after its rows are in main, with its notice, and for a data refresh. Effort is working days for one builder with the gate waits included. Counts say how many of the 129 nodes have a real record or dated item ("shown") and how many a named honest empty ("empty") at the end of the stage.

Recommended order: **1, 2, 3, 4, 5, 10, 6, 7, 9, 8, 11.** Reasons: Stage 1 fixes what Brent sees with data in hand. Stage 2 delivers his mission (people first) on the nodes where facts are verified. Stage 3 is the cheapest real gain (the source is already downloaded). Stages 4 and 5 fill the largest gaps in the county and the regional boards. Stage 10 finishes the explainers before the stages that depend on someone else's answer (7, 9, 8).

### Stage 1: every node answers (records in hand, honest empties, the layered shell)

- **Scope.** All 17 rooms, all 129 nodes (293 places), phone and desktop. No new fetcher and no new `data/` file.
- **What changes.** 6 nodes show a record today. After: **58 show a record or a dated item** (55 A and 3 AC), **3 show the person first panel**, **68 show a named honest empty** (1 source in hand, 17 source works, 8 refused or needs clearance, 22 not a voting body, 5 out of scope, 15 not yet probed). The "How this reaches you" row exists on every node and shows the effect-empty state for all of them (Stage 2 fills it).
- **Work.**
  1. `scripts/bodies.py` (129 nodes into about 95 bodies) and `scripts/test_rooms.py`; `build.py` writes `build/work/rooms-nodes.json` and logs its hash.
  2. `scripts/rooms_record.py` and `site/rooms/rooms-2026.json`, wired into `build.py` and the offline block, hash in `dist/build-log.txt`. Two clean builds give the same hash.
  3. `ext/cx-rooms.jsx` (`CxRoomDid`, `CxNodeDid`, `CxNoRecord`, `CxPersonTile`, the closed "How this reaches you" row with the effect-empty state); `ext/cxm-explore.jsx` (`CxmRoom` and `CxmRecord`); `ext/cxm.css` and `ext/cx.css` with existing tokens; the person first tile on every room and node.
  4. Desktop: exact-match `patch()` calls in `build.py` that extend `CX_DrawerRecord` and relax the `!/^leg-/.test(U.id)` guards into a registry lookup; the room header tile.
  5. Wards and the Mayor: show `CX_PersonRecord` and `CX_WardRecord` inside the node's Votes & actions (the lists already built in phase 3). Departments and boards: "Council files that name it" from the ties. Committees: meetings and agenda items with outcomes, from `data/meetings-2026.json`. The three federal chambers: the 20 newest recorded votes from `data/us-votes-2026.json`, each opening on the United States map.
  6. `scripts/records_feed.py` tags each feed row with its body key (so a later Records bridge can filter by body); `scripts/test_records.py` keeps the 2,013 rows and the counts.
  7. Two `text-budget` entries ("Records: a room", 300; "Records: a node", 350) recorded on purpose; `design-look` updated on purpose for the room page and the record sheet only, and the diff read (the Rooms list and every finished visual must not move).
  8. Spanish: about 45 strings (the states, the labels, the tile).
- **Brent reviews.** The state words in 4.6 once (about 20 minutes), and the status lines. There is no new interpretive text about what a body decides in this stage; the numbers come from the data.
- **Checks to add.** `rooms-record` (the walk, 7.1); `scripts/test_rooms.py`. Must stay green: `records-tab`, `records-feed`, `votes-actions`, `council-votes`, `city-hall`, `remember-place`, `privacy-policy`, `security-policy`, `districts`, `axe`, `targets`, `no-bleed`, `text-overlap`, `text-budget`, `color-vision`, `tab-blue`, `perf-budget` (the rooms file loads only when a room opens), in dark and light, Bento and Original, English and Spanish (`CHECK_LANG=es`).
- **Spanish.** About 45 strings, a draft.
- **Effort.** 8 days.
- **Risks.** A count read as a ranking: counts are sentences per kind, no ordering by count, and the test scans for ranking words. "Council files that name a department" read as "the department decided": the section is headed that way and the first line says a department does not vote. The Rooms list screens (`design-look`, `records-tab`) assert exact structure: only the room page and the record sheet change.

### Stage 2: how this reaches people, for the rooms where facts are verified

- **Scope.** The 40 A nodes that are bodies or files (not the 15 wards, which share one reviewed template line) and the person first line for all 17 rooms; rooms centered on Mayor & services, Council & wards, Budget & contracts, Local decisions, Housing, Public safety, Transit, Health (city side), and the city side of Energy. Nodes in these rooms whose facts are not verified yet keep the effect-empty state.
- **What changes.** Layer 1 and layer 2 appear on the 40 nodes; the chain stepper and the guided path work; the person first tile reads the matcher. About **100 lines**: 80 node lines (a "why it works this way" and a "what you might notice" for 40 nodes), 17 room lines, 3 templates (wards, committees, files).
- **Work.** `ext/cx-rooms-text.jsx` with per-room markers; `CxReach` (layers, jargon taps), `CxChain` (vertical on the phone, chips on the desktop), `cxmRoomStory(roomId, nodeId)` in `ext/cx-story.jsx`; the person tile reading `cxWardTie`; about 14 Dictionary entries; `build.py` fingerprints and `--mark-rooms-text-reviewed`; `scripts/test_reading.js`; `rooms-reach` browser check; `text-budget` re-recorded.
- **Brent reviews.** About 100 lines against their sources (a packet lists line, source, day read, unverified flags): **about 2.5 hours**, then he runs `python build.py --mark-rooms-text-reviewed "Name" <rooms>`. Four unverified items must be settled by a person first (the Charter and code sections, the water rate ordinance, the Board of Control threshold, the county or city health district); lines that depend on them ship in their safe form.
- **Checks to add.** `rooms-reach`; `scripts/test_reading.js`; extend `scripts/test_rooms.py` (every line has a source and a read day). Must stay green: the Stage 1 list plus `stories-*` and `story-fit`.
- **Spanish.** About 125 draft strings (the lines and the labels); official titles and quotes stay English.
- **Effort.** 8 days (interface 4, writing 3, checks 1).
- **Risks.** Tone: a line that sounds like a forecast. The review and the banned-word test guard it. Length: the 80 word and 20 word limits are tested. Brent's reading time: the packet keeps it to a glance per line. The code library refuses scripts, so Charter and ordinance citations need a human reading by hand.

### Stage 3: the Board of Control, from the City Record we already download

- **Scope.** `board-control` (source in hand to real record); the rooms Mayor & services, Budget & contracts, Local decisions and Your government.
- **What changes.** **59 shown, 67 empty.** Every week's Board of Control minutes become dated rows with the roll call.
- **Work.** Parser 3 in `scripts/fetch_cityrecord.py`: the meeting date and time, the presiding director as printed, "Members Present" and "Absent" as printed, each resolution's number, date adopted, sponsor, kind (such as requirement contract), first sentence, the section it cites, the amount as printed, and Yeas, Nays and Absent. Staff under "Others Present" are not stored. `data/boc-2026.json`; a row component built from `CX_RecVote` (a director shown as printed, no profile link); `scripts/test_cityrecord.py` gains a fixture from the Oct. 2 issue (pages 130 to 132) and tests: Yeas plus Nays plus Absent equal the members listed; numbers ascend; a mismatch is held back and listed; two runs give the same file. Two `ROOMS-TEXT` lines for the node.
- **Brent reviews.** The City Record's terms (already open); a sample of 10 resolutions against the PDF; decision 7 in section 9 (vendor names and amounts as printed).
- **Checks to add.** Extend `rooms-record` for the node; `test_cityrecord.py` (about 8 tests).
- **Spanish.** About 10 strings.
- **Effort.** 3 days.
- **Risks.** Layout drift between issues (the parser holds back, never guesses). Numbering gaps (the issue prints only some). A vendor who is a person (the record is public; Brent samples).

### Stage 4: Cuyahoga County Council and Executive

- **Scope.** `county-council`, `county-executive`, `county` (and the county echoes in the County, state & federal and Cities rooms).
- **What changes.** **62 shown, 64 empty.**
- **Work.** `scripts/fetch_county.py`: the grid (a POST), each resolution's PDF through `pdftotext`, Yeas and Nays by printed surname matched to a kept member list (misspellings listed, not guessed), 232 resolutions today; the Executive's orders list; the 41 budget or appropriation resolutions marked as actions on the county budget; `data/county-2026.json`. Shared with candidate stage 2b: one fetcher, two consumers. Rows reuse `CX_RecVote`. The page says a unanimous vote is not a stance. Split votes appear only in minutes prose and are listed as "not read".
- **Brent reviews.** The county's disclaimer and terms; the surname list; a sample of 10 PDFs; the two `ROOMS-TEXT` lines per node (County Executive reads `CX_OFFICES`).
- **Checks.** `scripts/test_county.py`; extend `rooms-record`. 
- **Spanish.** About 12 strings. **Effort.** 6 days (3 shared with the candidate plan).
- **Risks.** An undocumented endpoint that can change: a change holds the data back and the page falls back to "not added yet". Two councils with the word "Council": every label says "County Council" or "City Council".

### Stage 5: regional boards as dated documents

- **Scope.** Board of Elections, RTA and its board, the Port, the sewer district, the 2025 election's results link, and (if decision 6 in section 9 says yes) the Cuyahoga County Board of Health: `boe`, `election-2025`, `rta`, `rta-board`, `eco-rta`, `eco-port`, `cx-neorsd`, `eco-neorsd`.
- **What changes.** **70 shown, 56 empty** (71 and 55 with the Board of Health node).
- **Work.** `scripts/fetch_boards.py` with one small adapter per body that reads the page's document list: date, kind, title, address, and for RTA the record's status word (ADOPTED, AMENDED, FAILED and so on). A layout hash holds an adapter back on drift. A 5 second pause between requests. `data/boards-2026.json`. The section is headed "Meetings and documents" with the sentence "We list the meetings and link the minutes. We have not read each vote." No body in this stage claims a member vote.
- **Brent reviews.** Each site's terms; a sample per body; the heading words.
- **Checks.** `scripts/test_boards.py`; extend `rooms-record`. **Spanish.** About 10 strings. **Effort.** 5 days.
- **Risks.** Sites change; PDFs that hold votes are not read, and the page says so, so a resident does not take a documents list for a vote record.

### Stage 10 (before 6): the rest of "How this reaches people", and the 15 not yet probed

- **Scope.** Every node still on the effect-empty state; the probes for the 15 NP nodes (Civil Service Commission, Community Police Commission, FERC, NRC, three education agencies, three land bank nodes, the library, the arts fund, MetroHealth, Cleveland State, Tri-C).
- **What changes.** About 120 lines. The 15 NP nodes get a class after the probe. Shown stays at 70; I expect 6 to 8 of the 15 to have a working source that a later fetcher could read, and the rest stay honest empties. The count is reported then.
- **Work.** Writing, `docs/source-notes-rooms.md` rows for the new probes, bodies and registry updates, Dictionary additions.
- **Brent reviews.** About 120 lines (about 3 hours) and the new notes.
- **Checks.** The Stage 2 tests cover it; the registry test fails if a node is left out. **Spanish.** About 140 strings. **Effort.** 6 days.
- **Risks.** Reader fatigue: the packet is split by room so Brent reads one room at a time, and per-room fingerprints mean one room's review does not undo another's.

### Stage 6: Ohio General Assembly and the Governor

- **Scope.** `ohio-house`, `ohio-senate`, `ohio-legislature`, `ohio-governor`.
- **What changes.** +4 shown.
- **Work.** `scripts/fetch_ohio.py`: bill pages and recorded floor votes (Yeas and Nays by member), tied to the chamber; the Governor's signature from the bill status. The certificate fix: a pinned intermediate certificate, checked, never `verify=False`. A vote whose motion is not stated is held back. Shared with candidate stage 2c. The rooms show each chamber's latest 20 floor votes with the tally; opening a row shows members.
- **Brent reviews.** Terms (none found); a sample of 10 votes against the official page.
- **Checks.** `scripts/test_ohio.py`; extend `rooms-record`. **Spanish.** About 10. **Effort.** 5 days (3 shared).
- **Risks.** The largest and most fragile fetch; run it after the others.

### Stage 7: energy dockets and regulators (only after PUCO answers)

- **Scope.** `puco`, `illuminating` (class BB), `ohio-epa`; probes of OPSB, FERC and NRC.
- **What changes.** +1 (Ohio EPA portal) now; +2 if PUCO agrees. Otherwise the honest state "Not in our record yet. PUCO's case files are public on its site. We have not asked to copy them yet" stays, and that is a correct shipped state.
- **Work.** A written request to PUCO (Equalpoint). If it agrees: `scripts/fetch_puco.py` for a short list of named dockets (case number, title, status, last filing date), chosen by a person, so no private person's filing is copied. Ohio EPA: permit titles from the portal, no private individuals.
- **Brent reviews.** The reply; the list of dockets; the text for the rate case (section 4.7 F).
- **Effort.** 4 days if cleared; 0.5 day for the honest state if not.
- **Risks.** The agency's robots file names scrapers; do not fetch without an answer.

### Stage 9: courts

- **Scope.** `appeals` (and the court rows in the Courts and Cities rooms). Trial courts stay out of scope.
- **Work.** The Eighth District's published opinions, as in phase 6 of the votes plan and stage 5 of the candidate plan: one fetcher, two consumers. Opinions only, never a docket with private parties; juvenile or sealed matters dropped.
- **What changes.** +1 shown. **Effort.** 5 days (3 shared). **Brent reviews.** Terms; each judge's list for private party risk (as in the candidate plan).

### Stage 8: the school district (only if it agrees)

- **Scope.** `cmsd`, `cmsd-board`, `eco-schools`, `labor-contracts`, `facilities-vendors`.
- **What changes.** If the district agrees to a data feed or permission: +5 shown; otherwise the honest state "BoardDocs cannot be shown here" stays, and that is a correct shipped state. Stage 1 already ships the blocked state with the link.
- **Work.** A written request from Equalpoint to the district. If it agrees, an adapter for the board's agendas, minutes and resolutions with votes. We do not use the YouTube playlist (it is video, not records).
- **Effort.** 0.5 day for the request and the wording; 4 days more if it agrees.

### Stage 11: positions, "Stated outside the record"

- **Scope.** The Positions tab on every node reads the same two folds as the record pages (`CX_STATED`, empty today).
- **Work.** Wire the rooms to the fold keyed by body key; add the review command and the entry format when the first named person adds an entry (phase 5 of the votes plan). Hidden while empty.
- **Effort.** 2 days. **Brent.** Adds and reviews any entry himself.

### Effort and counts at a glance

| Stage | What | Shown after | Empty after | Days | Shared with another plan |
| --- | --- | --- | --- | --- | --- |
| 1 | Every node answers | 58 | 68 (and 3 resident) | 8 | none |
| 2 | How this reaches people, first rooms | 58 | 68 | 8 | none |
| 3 | Board of Control | 59 | 67 | 3 | none |
| 4 | County | 62 | 64 | 6 | 3 with candidate 2b |
| 5 | Regional boards as documents | 70 | 56 | 5 | none |
| 10 | The rest of the explainers, probes | 70 | 56 | 6 | none |
| 6 | Ohio General Assembly | +4 | | 5 | 3 with candidate 2c |
| 7 | Energy dockets and regulators | +1, or +3 if PUCO agrees | | 4 (0.5 if not cleared) | none |
| 9 | Courts | +1 | | 5 | 3 with candidate 5 and votes phase 6 |
| 8 | School district | +5 if it agrees | | 0.5 (4.5 if it agrees) | none |
| 11 | Positions | no change | | 2 | votes plan phase 5 |
| | **Total** | at most 99 (never 129) | at least 27 by design | **52.5** (56.5 if the district agrees), about 43 net of the 9 shared days | |

The ceiling is 99 nodes with their own record because 22 nodes are not bodies that vote and 5 are out of scope by decision. Those 27 will always say why, in plain words, with a link.

## 7. Checks

### 7.1 `rooms-record`: the walk

A browser check that opens every room (17) and every node place (293), on a phone at 390 and a computer at 1280, and fails if any node shows neither a record nor a named honest empty with a next step. It reads `site/rooms/rooms-2026.json` and `build/work/rooms-nodes.json` to know what to expect, so a new node or a new body needs no edit to the check.

For each place it asserts:

1. **A record or a named state.** The Votes & actions tab shows exactly one of: a list whose first page of rows equals the file's rows (newest first, each with a date, a source link and the day pulled), or a state box with `data-cx-state` in the allowed set for the node's class (`partial`, `notfound`, `blocked`, with a `data-cx-reason` of `notbuilt`, `needsperson`, `notvoting`, `person`, `outofscope`, `notprobed`). Never blank, never "loading" forever, never the old sentence "Individual vote records have not been loaded".
2. **The words.** A state box has a title of 8 words or fewer, a body of 6 to 35 words, no dash, no score or ranking word (`RF_SCORE`), and "A missing record is not a no" where the state is partial or not added. A box that says "no votes" must also say "in our record". The Positions tab has its own state.
3. **A next step.** One link whose address is `https` and whose host is the registry's official host. The check does not click it and makes no request to it.
4. **The person first tile** on every room and node: with no place it shows the set-a-place words; with a seeded ward it equals the ward matcher's answer and shows the reason ("Names Ward 8"). The ward appears in no address, storage key beyond what Remember allows, cookie or request (the `records-feed` and `remember-place` comparisons).
5. **How this reaches you** on every node: a reviewed line with its source, an unreviewed line with the notice, or the effect-empty state. Layer 2 is closed by default (`aria-expanded` false), opens to 80 words or fewer, every sentence 20 words or fewer; layer 1 is 18 words or fewer with a headline of 12 or fewer.
6. **Jargon taps.** Every dictionary term in layers 1 and 2 is a button that opens a note of 20 words or fewer.
7. **Look.** 44 px targets, no sideways scroll (also at 320), axe on the node region, no left accent stripe, no console errors, no request to another site.
8. **Light and Spanish.** The same walk runs in light (`CHECK_MODE=light`, Bento and Original) and in Spanish (`CHECK_LANG=es`, which also asserts every new word is in `i18n/es.json`).
9. **Counts add up.** A body's counts equal `data/` (a file count from the ties, a roll call count from `data/votes-2026.json`).

It runs in shards by room group so the pool (`scripts/checks/pool.js`) finishes in under 3 minutes (293 visits at about 1 second each, three shards).

### 7.2 Plants (the check proves itself)

`ROOMS_PLANT=<fault> node scripts/checks/run.js --only rooms-record --selftest` must fail for each: `blank` (empties a state box), `norecord` (removes the state from a node), `nolink` (removes the next step), `dash` (adds an em dash), `score` (adds the word "ranked"), `verdict` (the box says "No votes" with no "in our record"), `open` (layer 2 open by default), `toolong` (a 30 word sentence), `nojargon` (an unwrapped dictionary term), `leak` (a ward appears in a request), `swap` (the two leads are swapped).

### 7.3 Unit tests

- `scripts/test_rooms.py`: the registry covers every node once; ties are exact strings; counts equal `data/`; every row has a date, source and pulled day; a department never shows a vote count; every empty reason has an official link; a Finance or Law routing line is never counted.
- `scripts/test_reading.js`: section 4.1, rule 4.
- `scripts/test_cityrecord.py` (Stage 3), `test_county.py` (4), `test_boards.py` (5), `test_ohio.py` (6): every vote adds up to its printed tally or is held back; a second run writes the identical file.
- `node scripts/i18n/inventory.js`, `merge.js`, `python scripts/test_i18n.py`, `node scripts/i18n/crawl.js` after each stage.

## 8. How this connects to the other plans

- **`docs/plan-states.md`.** Every state in 4.6 is a state from that list, with its lead words and the rule that every empty or failed state names a next step. Stage 1 builds `CxNoRecord` as a thin wrapper over `CxmEmpty` and `.cxm-status-line`; when plan-states Stage 1 lands, it moves onto `CxState` with `data-cx-state` and adds its rows to `scripts/checks/states.js` at no new design cost. The only new name is the reason attribute `data-cx-reason`. "Partial" is plan-states state 5; "Not in the record" is state 7; "Blocked" is 13; "Not yet reviewed" is 8; "Stale" is 9. Keep these words outside the marker blocks of `cx-votes-text.jsx` and the others, as plan-states says.
- **`docs/plan-candidate-records.md`.** Same body keys and the same person keys: a candidate's "Offices held" fact points at a body key, and a council member's key is the Legistar `person_id`. County Council votes (candidate stage 2b), Ohio General Assembly votes (2c) and court opinions (5) are fetched once and shown twice: on a candidate's page and on the body's node. The candidate pages' coverage line ("We checked ... We did not find ...") and this plan's "Not in the record" state use the same words and the same component. The "What might your choices affect?" pages (`CxmOutcomes`, `CxOfficeNote`) and "How this reaches you" are one pattern: `can` is "What it covers", `limits` is "Why it works this way", the link is "Read more", and one renderer (`CxBodyNote`) serves both. A contest page links to its office's room node, and the node links back to the contests.
- **`docs/plan-votes-actions-positions.md`.** This plan completes phase 4 (the county, including the Executive's actions, in Stage 4), phase 5 (the "Stated outside the record" fold, wired to the rooms in Stage 11, hidden until a named person adds an entry), and phase 6 (courts, Stage 9), and it extends phase 3 (people and wards) into the room's ward and Mayor nodes. Rules unchanged: order oldest first on a record, newest first on a person or body list; no total across members; sponsorship is not a vote.
- **`docs/plan-records-feed.md`.** The rooms stay, as that plan says. Each body row ends with "See all in Records", which opens Records with that body's rows once the Records bridge (its phase 7) exists; until then the link is absent. The body is held in memory, not in the address. Stage 1 tags feed rows with their body key so the bridge is a filter and not a rebuild. Roll calls, ceremonial resolutions and the pulled-date line are the same everywhere.
- **`docs/plan-explain-committees-and-seats.md`.** What it does and why it matters, in two lines: every body gets a short "what it does" and "why it matters" with the official wording one tap down, flagged until a person reads it. The rooms do the same for city and county bodies, scaled to four answers; for the three federal chambers the room reuses the lines in `data/us-explainers-2026.json` and `ext/cx-us-text.jsx` rather than writing new ones. The role-word note (one note per word, reused everywhere) is the model for the jargon tap.
- **`docs/plan-guided-stories.md`.** The guided path is a story in the same engine (frames of a big and small line, a source on each, ending in a next step into the rooms), with a new builder and no new engine.
- **`docs/plan-plain-text.md`.** The layers, the word budgets and the grade target are that plan's rules applied to rooms.
- **`docs/plan-mobile-restructure.md`.** The rooms stay in Records > Rooms; their list, rail and guide are not touched.

## 9. Decisions Brent must make

1. **Two honest leads for an empty state.** "Not in our record yet" when the official source exists and we have not added it, and "Not in the record" only when we read the source and it held none. They mean different things and must not be swapped. *Recommendation: yes, two leads, as in 4.6.*
2. **Show "Council files that name it" under bodies with no record of their own.** A department does not vote, and the RTA and the school district have no records in our data, but Council files that name them are real and useful. They are shown under a clear heading and the Finance and Law routing line is never counted. *Recommendation: yes.*
3. **Who clears terms, and who writes to the school district, PUCO and NOACA.** No source states a reuse license; four are refused or name scrapers. *Recommendation: Brent clears terms one source per stage before it ships (3.4); Equalpoint sends one short written request each to the school district and PUCO asking for a feed or permission; nothing is fetched or worked around before an answer; NOACA and the code library stay links.*
4. **The voice of "How this reaches you", and the person first tile.** Confirm the tone (plain, no forecast, no advice, a sentence about what the record says a body covers) and that a ward or neighborhood set on the device, or a Find my districts result held only in memory, drives the tile. *Recommendation: yes. I prepare the first room's lines (section 4.7) for Brent to read before the other rooms are written.*
5. **Review rhythm and who reads.** About 100 lines in Stage 2 (about 2.5 hours) and about 120 in Stage 10 (about 3 hours), read against sources, with one review mark per room so one room's review is never undone by another's. *Recommendation: per-room fingerprints (5.4); Brent reads Stage 2 first.* Spanish stays a draft until a Spanish speaking person reads it (`i18n/review-notes.md`).
6. **Add the missing bodies as nodes.** Eight bodies Brent named have no node: the Cuyahoga County Board of Health, the Civilian Police Review Board, the Cuyahoga Metropolitan Housing Authority, Cleveland Metroparks, the Ohio Power Siting Board, the Ohio Department of Health, the county Fiscal Officer's budget, and the consent decree monitor. *Recommendation: yes, but one at a time, and only once a person has found and confirmed its official page. Start with the County Board of Health (its source worked on Oct 7) and the Civilian Police Review Board. Each is added to a room, never restyling one.*
7. **Board of Control rows: vendors and amounts.** The minutes name each company, an amount and a roll call. *Recommendation: show them as printed, skip staff names under "Others Present", and have Brent sample the first 20 resolutions; hold back a row whose vendor looks like a private person.*
8. **The way in.** Both "Walk me through it" and the quick view are always on offer. *Recommendation: the guided path is the lead button on a phone, the quick view is the default on a computer, and the app remembers nothing about which was used.*

## 10. Rules kept, what I did not verify, and what I did not do

- **Rules kept.** Receipts, not scores; sponsorship is not a vote; a missing record is not a no; official records update by themselves but anything interpretive waits for a person; news is never automated into `data/`; nothing personal leaves the browser (place, answers and priorities never go into a link or request; the person tile is computed on the device); plain English with no dashes; no left accent stripes; both styles and both layouts, light and dark, English and a Spanish draft (official titles, quotes and ballot wording stay English); nothing already finished is restyled; a fix lives in the source or `build.py`.
- **Not verified, and kept out of any shipped line until a person has checked it:** that Council alone amends the water rate schedule and who proposes a change; the Charter section that creates the Board of Control and the dollar threshold above which a contract needs it; which communities the county health district and Cleveland's health department each serve; the current Illuminating Company rate case number and what the letters in a PUCO case number mean; whether Cleveland's school district has a levy on the Nov. 3 ballot (none found in the names read); where the right pages are for the Civil Service Commission's minutes, the Community Police Commission, Cleveland Metroparks, the Cuyahoga Metropolitan Housing Authority and the library's board; the contents of the Board of Control resolutions beyond the two read (the parser reports how many it finds).
- **Probe limits.** One read of each page on Oct 7, 2026. Several addresses were guesses that returned 404; they are listed as such, not as findings about the body. The Ohio state sites answered a script with a generic not found page, which a home page cannot honestly be, so they are written as refused. I read one City Record issue (Oct. 2) for the Board of Control, not all 40.
- **What I did not do.** No app code, no `data/`, no `site/`, no `build.py`, no release gate (`scripts/release.py`) and no `--mark-*-reviewed` command was run or changed. The probes wrote only to a scratch folder outside the repository. I wrote this file and committed it on this branch.
