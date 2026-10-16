# Bias audit: the Cleveland questions a resident answers

Status: read only. Written 2026-10-14 for Brent. Nothing in `ext/`, `data/`, `bench/`, `build/`, `site/`, `i18n/` or `scripts/` was changed. The proposed rewordings are proposals. Most of this text is interpretive, so it waits for a named reviewer before it changes.

It follows `docs/plan-government-nav.md`, "Bias audit". That pass covered the 24 federal questions (`ext/cx-align-text.jsx`) and listed the Cleveland questions as "Not covered. Next pass." This is that pass. The federal 24 are not redone here.

Rules used: the FLX bias audit question rules W1 to W11, plus the extra checks Brent listed (lean in naming, length and tone of the two sides, what "yes" means, the answer buttons, fixed order, reading level, party or place used as a stand-in). Labels: **Fix first** changes what an answer means. **Tidy** only reads better. Rows are in the order the questions appear, never sorted by anything. No question is scored or ranked.

## Where the questions live

The text is in three places.

- The compiled app, in `build/work/CivicAtlas.pretty.js`. This is a pretty-printed copy of the Sep 23 release, so its line numbers move when it is rebuilt. The ids and the exact text are the stable key. A change here needs an exact-match `patch()` in `build.py`.
- `ext/cx-leaders.jsx` (our own source). A change here is a normal edit.
- The screens that show them: `ext/cxm-more.jsx`, `ext/cxm-ballot.jsx`, `ext/cxm-people.jsx`, `ext/cxm-core.jsx`.

The working tree had unsaved copy edits in `ext/cx-leaders.jsx` when this was run (git diff checked). None touch a question below.

## The questions

50 questions with their own wording. Plus 3 shared items (the issue template, the district pick, the local issue pick) and 2 read-only examples with no answer buttons.

Reading level is the Flesch-Kincaid grade, one number per question, from a simple syllable count. It is rough: it is not meaningful under about 8 words, and "H.R. 1" is counted as words. It describes. It is not a rating. Median for the 30 full-sentence questions (S1, G, H, C, M) is 15 words and grade 10. Two are over 22 words (M7 at 29, M10 at 24). Nine are above grade 12.

### Priorities (8). Answer: Most important, Important, Still deciding, Skip

Stem is the label. Under each label the app shows a "Look at..." line and one example question. Source: compiled `wm`, `CivicAtlas.pretty.js:9880-9929`. Shown on desktop at `:10272-10322`, on the phone at `ext/cxm-more.jsx:217-225`.

| Id | Label (the question) | Example line shown under it |
| --- | --- | --- |
| P1 | Keep everyday costs manageable | What could this cost residents now and later? |
| P2 | Make housing easier to find and afford | Who gains access to housing, and who may be priced out? |
| P3 | Keep neighborhoods safe and accountable | What improves safety, and how is power reviewed? |
| P4 | Improve schools and education access | Can students reach strong programs close to home? |
| P5 | Protect personal freedom and equal treatment | What choices are protected or limited? |
| P6 | Support jobs and local business growth | Does this create useful opportunity for local residents? |
| P7 | Protect air, water, and long-term health | Who carries the health or environmental risk? |
| P8 | Spend public money carefully | Can residents see what was promised and what happened? |

### One reviewed Cleveland decision. Answer: Support, Oppose, It depends, Still learning

| Id | Exact text | Where | Words | Grade |
| --- | --- | --- | --- | --- |
| S1 | Do you support Cleveland’s enacted licensing and neighborhood rules for short-term rentals? | `CivicAtlas.pretty.js:9964` (`Dm`, id `str-561-2026`); answers `Em` `:9936-9957`; desktop `:10399-10442`; phone `ext/cxm-more.jsx:450-460` | 12 | 12.7 |

Two more entries in `Dm` are "Learning example" cards with no answer buttons (`:10033`, `:10068`). They are not counted as questions. L1: "How should a public utility manage uncertain electricity costs?" L2: "How should a school district use limited building money?"

### Governor and U.S. House, in "My constellation". Answer: Yes, No, It depends, Still learning

Source: compiled `Wm`, `CivicAtlas.pretty.js:13984-14045`. Records: `Gm`, `:14046-14097`.

| Id | Exact text | Line | Words | Grade |
| --- | --- | --- | --- | --- |
| G1 | Should Ohio fund free breakfast and lunch for all public-school students? | 13988 | 11 | 5.9 |
| G2 | Should Ohio phase out its state income tax? | 13998 | 8 | 2.3 |
| G3 | Should Ohio expand energy-bill assistance and home weatherization programs? | 14008 | 9 | 15.5 |
| G4 | Should Ohio expand natural-gas development and streamline energy permitting? | 14018 | 9 | 16.8 |
| H1 | Would you have voted to agree to the Senate amendment to H.R. 1 on July 3, 2025? | 14028 | 17 | 4.2 |
| H2 | Would you have voted to overturn the IRS digital-asset broker reporting rule in H.J.Res. 25? | 14038 | 15 | 9.9 |

(G3 and G4 grades are high because of long words, not long sentences. H1 is low only because "H.R. 1" is counted as short words.)

### Cleveland City Council, in "My constellation"

Source: `ext/cx-leaders.jsx`, `CX_COUNCIL_Q`, lines 747-756. Pushed into the same list by `cxCouncilAlign` at line 763.

| Id | File | Exact text | Line | Words | Grade |
| --- | --- | --- | --- | --- | --- |
| C1 | 556-2026 | Should Cleveland pause permits for new data centers while it writes rules for them? | 748 | 14 | 8.4 |
| C2 | 561-2026 | Should Cleveland license short-term rentals like Airbnb and limit them in single-family neighborhoods? | 749 | 13 | 12.2 |
| C3 | 114-2026 | Should Cleveland oppose state bills that would require local agencies and hospitals to cooperate with federal immigration enforcement or lose funding? | 750 | 21 | 15.6 |
| C4 | 975-2026 | Should Council publicly urge Cleveland Public Library leaders to reach a contract with the library workers' union? | 751 | 17 | 12.6 |
| C5 | 240-2026 | Should Ohio create grants to bring grocery stores and healthy food to neighborhoods without them? | 752 | 15 | 8.4 |
| C6 | 107-2026 | Should state regulators reject FirstEnergy's requests to allow longer restoration times and more outages per year? | 753 | 16 | 14.3 |
| C7 | 239-2026 | Should middle and high school athletes in Ohio be allowed to earn money from their name, image, and likeness? | 754 | 19 | 9.8 |
| C8 | 111-2026 | Should council members use their wards' neighborhood funds to pay for home repairs for older residents? | 755 | 16 | 8.4 |

### Mayor Bibb, in "My constellation"

Source: `ext/cx-leaders.jsx`, `CX_MAYOR_Q`, lines 789-805. Pushed by `cxMayorAlign` at line 807.

| Id | File | Exact text | Line | Words | Grade |
| --- | --- | --- | --- | --- | --- |
| M1 | 557-2026 | Should Cleveland create an outdoor refreshment area in the Playhouse Square Theatre District, where adults can carry drinks from participating businesses outside? | 790 | 22 | 14.4 |
| M2 | 683-2026 | Should Cleveland police keep using Flock Safety's automated license plate reader cameras? | 791 | 12 | 13.7 |
| M3 | 605-2026 | Should Cleveland replace its dog safety law with new rules for nuisance, dangerous, and vicious dogs? | 792 | 16 | 9.8 |
| M4 | 1031-2026 | Should the city fund Legal Aid to provide lawyers for eligible tenants in eviction cases? | 793 | 15 | 10.7 |
| M5 | 620-2026 | Should the city build solar power generation, using contracts, grants, and gifts to pay for it? | 794 | 16 | 8.4 |
| M6 | 117-2026 | Should Council pass the mayor's 2026 operating budget for all city departments? | 795 | 12 | 7.8 |
| M7 | 664-2026 | Should Cleveland settle its long legal fight with Brook Park by paying Brook Park and giving it land, in exchange for all tax revenue from the I-X Center area? | 796 | 29 | 11.2 |
| M8 | 245-2026 | Should part of the city's parking meter profits go into a fund used only for street safety and getting around? | 797 | 20 | 10.5 |
| M9 | 615-2026 | Should the city create an East Side tax increment financing district, where taxes on new building pay for public improvements there? | 798 | 21 | 11.1 |
| M10 | 622-2026 | Should the city waive building permit fees for new one- to three-family homes in the East Side district, and halve them for larger housing? | 799 | 24 | 10.5 |
| M11 | 624-2026 | Should the city keep replacing lead and galvanized water service lines with copper? | 800 | 13 | 10.4 |
| M12 | 765-2026 | Should the city buy weapons-screening scanners for the new police headquarters under a four-year contract? | 801 | 15 | 10.7 |
| M13 | 938-2026 | Should the city keep funding community groups that work to interrupt and prevent violence? | 802 | 14 | 9.3 |
| M14 | 31-2026 | Should the city fund a summer jobs program for youth and young adults? | 803 | 13 | 4.9 |
| M15 | 931-2026 | Should the city reimburse the Browns for emergency repairs they made to the city-owned stadium? | 804 | 15 | 9.1 |

### Practice ballot issues. Answer: Yes, No, then Still deciding or Leave this blank

For each issue the app shows its own "A yes vote means" and "A no vote means" lines, a "Consider" line, and the official wording (official wording stays English and is not audited). Source: compiled `Jm`, `CivicAtlas.pretty.js:14143-14218`, read by `Xm` at `:14220`. Shown on desktop at `:15338-15429`, on the phone at `ext/cxm-ballot.jsx:191-222`.

Words are for the yes line and the no line.

| Id | Issue | Yes line | No line | Line |
| --- | --- | --- | --- | --- |
| I3 | Photo ID in the Ohio Constitution | Adopt the proposed constitutional photo-ID requirement, including its stated exceptions and alternatives. (12) | Reject this constitutional amendment. A no vote does not itself repeal existing voter-ID statutes. (14) | 14144 |
| I10 | Developmental-disability programs and facilities | Approve the additional 2.25-mill levy for ten years. The county estimates $79 per $100,000 of market value, first due in 2027. (21) | Reject this additional levy. This does not by itself abolish the board or all existing program funding. (17) | 14150 |
| I11 | Health and human services levy | Approve renewal of 4.7 mills plus a 2.5-mill increase for ten years. The county estimates $196 per $100,000 of market value for the combined levy. (25) | Reject the proposed renewal and increase. Do not interpret this as an immediate repeal of every existing health-services tax. (19) | 14156 |
| I12 | Council review of board-member removals | Require County Council confirmation for the County Executive’s removal of the board and commission members specified in the amendment. (19) | Reject this proposed change to the county charter. (8) | 14162 |
| I13 | Responsibilities of the county law director | Adopt the proposed changes to the Law Director’s non-litigation legal work and advice, with the Prosecuting Attorney’s powers preserved as described. (21) | Reject this proposed change to the county charter. (8) | 14168 |
| I14 | Appointments to the Charter Review Commission | Provide for four members appointed by the Executive without Council confirmation, four by Council without Executive approval, and one by the Executive with Council confirmation. (25) | Reject this proposed change to the county charter. (8) | 14174 |
| I33 to I38 | Sunday sales, six named businesses | Permit the proposed Sunday sale of {wine and mixed beverages, or beer} at {business}, {address}, under the specified local liquor option. (20 to 25) | Reject this request for Sunday sales at the named location. (10) | 14181-14218 |
| T | The other 93 issues (template) | Approve the specific proposal in the official wording below. | Reject this specific proposal. Effects on existing rules or funding depend on the proposal. | 14222-14227 |

### Setup questions

| Id | Text | Where |
| --- | --- | --- |
| D1 | Which U.S. House district are you in? (phone: chips District 7, District 11; "Cleveland is split between two districts. Your address decides which.") | `ext/cxm-people.jsx:376` |
| D2 | Desktop: four dropdowns (U.S. House, Ohio Senate, Ohio House, County Council), each with the first option "Not known / not on my ballot", and a list "Add local issues from my official ballot". Phone: "Which local issues are on your ballot?" | `CivicAtlas.pretty.js:15034-15064`; `ext/cxm-ballot.jsx:234` |

## Findings, question by question

Before and after are proposals. A proposed wording that states a fact about a measure (a number, who gets what) must be read against the ordinance by a person first. Where I could not confirm the fact from the app's own text, the after wording says so in square brackets.

### Priorities

| Id | Rule | What I found | Label | Before and after |
| --- | --- | --- | --- | --- |
| P1 | W3 | Overlaps P2 ("afford"), P8 ("taxes, fees" vs "budgets, contracts"). A person can place the same worry in two boxes | Tidy | Before: "Keep everyday costs manageable". After: keep, and say in P8 that it is about how public money is run, not what you pay |
| P2 | W9 | The example names one group's harm: "who may be priced out" | Fix first | Before: "Who gains access to housing, and who may be priced out?" After: "Does this make homes easier or harder to find and afford?" |
| P2 | W3 | Overlaps P1 ("afford", "costs") | Tidy | See P1 |
| P3 | W2 | Two values in one box: safety, and accountability (oversight). A person can rank them differently, and P8 also covers "oversight" | Fix first | Before: "Keep neighborhoods safe and accountable". After: two boxes, "Keep neighborhoods safe" and "Oversight of police and city agencies" |
| P3 | W9 | The example leads with oversight only: "how is power reviewed" | Fix first | Before: "What improves safety, and how is power reviewed?" After: two mixed examples, "How fast help arrives" and "How police are held to account" |
| P3 | W3 | Overlaps P8 on "oversight" | Tidy | See P3 W2 |
| P4 | W9 | One example, and it carries a value ("close to home") | Tidy | Before: "Can students reach strong programs close to home?" After: "Can students reach strong programs?" plus "What does it cost to run them?" |
| P5 | W2 | Two values that often pull against each other: personal freedom, and equal treatment. "Protect" also names a side | Fix first | Before: "Protect personal freedom and equal treatment". After: two boxes, "Personal freedom" and "Equal treatment under the law" |
| P5 | W10 | "due process" in the "Look at" line | Tidy | Before: "individual choice, civil rights, due process, and equal access". After: "fair hearings" in place of "due process", or spell it out |
| P5 | W9 | One example, no pair | Tidy | Add a second example from the other side, for example "What rules apply the same to everyone?" |
| P6 | W9 | One example, with a "local residents" lens | Tidy | After: "Who gets the jobs?" and "What does it cost the city?" |
| P7 | W9 | The example names who is harmed: "who carries the risk". "Protect" names a side | Fix first | Before: "Who carries the health or environmental risk?" After: "How clean are the air and water?" and "What does cleanup cost, and who pays?" |
| P8 | W3 | Overlaps P1 and P3 | Tidy | See P1 |
| P8 | W9 | One example, no pair | Tidy | After: add "What does it cost to keep records open?" |

### One reviewed decision, S1

| Id | Rule | What I found | Label | Before and after |
| --- | --- | --- | --- | --- |
| S1 | Lean | "Enacted" tells the reader it is already law. That makes "support" the status quo answer. "Neighborhood rules" names the benefit and leaves out the lodging tax and zoning change that the summary says the ordinance also made | Fix first | See below |
| S1 | W2 | Bundles licensing and the neighborhood rules (a density limit, a local contact). The facts list calls these separate things. A person who backs licensing and not the limit can only say "It depends" | Fix first | Before: "Do you support Cleveland’s enacted licensing and neighborhood rules for short-term rentals?" After, as three questions: (a) "Do you support requiring a city license for short-term rentals like Airbnbs?" (b) "Do you support limiting how many homes on one block or in one building can be short-term rentals?" (c) "Overall, do you support Ordinance 561-2026, Cleveland’s short-term rental law that took effect July 1, 2026?" Add the 10 percent figure to (b) only after a person confirms it from the ordinance (the figure sits in the priority guide, `ext/cx-leaders.jsx:49`, not in the decision card) |
| S1 | Sides | The four facts quote only the Council's purpose, "limiting negative neighborhood effects". The host or owner side appears as a question under "Questions to ask", not as a named voice. The levies guide says when a side has no quoted voice. This card does not | Tidy | After: add one named, sourced host or owner voice, or the line "No host or owner voice is quoted here" |
| S1 | W7 | On desktop the four stance buttons are radio buttons with no way to un-pick one. The phone lets you tap again to clear | Tidy | After: add "Clear my answer" on desktop |
| S1 vs C2 | Repeat | The same ordinance is asked two ways: S1 (above) and C2 below ("license ... and limit them in single-family neighborhoods"). The answers are stored in different places, and the wording of each leans differently | Tidy | After: use the three questions above in both places so one answer means one thing |

### Governor and U.S. House

| Id | Rule | What I found | Label | Before and after |
| --- | --- | --- | --- | --- |
| G1 | Lean | "Free" is the campaign's word and hides who pays. The explainer says cost "would still need to be worked out", but the question has already framed it as free | Fix first | Before: "Should Ohio fund free breakfast and lunch for all public-school students?" After: "Should Ohio pay, with state money, for breakfast and lunch for every public-school student?" |
| G2 | W8 | "Phase out" has no time frame and the explainer says "the pace ... would matter". "Phase out" is the candidate's phrase | Tidy | Before: "Should Ohio phase out its state income tax?" After: "Should Ohio end its state income tax, in steps, over a period of years?" |
| G3 | W2 | Two programs in one question: bill assistance (money to households) and weatherization (home work). A person can back one and not the other | Fix first | Before: "Should Ohio expand energy-bill assistance and home weatherization programs?" After: (a) "Should Ohio expand programs that help households pay energy bills?" (b) "Should Ohio expand programs that weatherize homes?" |
| G3 | W10 | The record line shown after you answer says "HEAP, PIPP" with no spelling out (`Gm`, `:14059`) | Tidy | After: "Home Energy Assistance Program, Percentage of Income Payment Plan" |
| G4 | W2 | Two separate things: more natural-gas development, and faster energy permits. "Streamline" is the campaign's positive word | Fix first | Before: "Should Ohio expand natural-gas development and streamline energy permitting?" After: (a) "Should Ohio allow more natural-gas drilling and production?" (b) "Should Ohio shorten the time it takes to approve energy permits?" |
| H1 | W2 | One yes or no for a very large bill. The explainer admits "An answer compares the whole motion, not approval of every provision" | Fix first | Before: "Would you have voted to agree to the Senate amendment to H.R. 1 on July 3, 2025?" After: "Do you support the large tax and spending law (H.R. 1) that Congress passed in July 2025?" and say beside it that the record is one vote on the whole package |
| H1 | Anchor | The explainer shows the result before you answer: "218 aye, 214 no; passed" | Fix first | After: show the result only after the answer is picked |
| H1 | W1, W10 | "Would you have voted" is a made-up case, and "Senate amendment" and "H.R. 1" are insider words. The explainer also uses the bill's slogan name | Tidy | See the after wording above. Use "Public Law" and the plain title, not the slogan |
| H2 | Anchor | The explainer shows "292 yea, 132 nay ... passed" before you answer. A lopsided result is a bandwagon | Fix first | After: show the result after the answer |
| H2 | W1, W10 | Same "would have voted". "IRS", "digital-asset broker" and "H.J.Res. 25" are not spelled out | Tidy | Before: "Would you have voted to overturn the IRS digital-asset broker reporting rule in H.J.Res. 25?" After: "Do you support cancelling the Internal Revenue Service rule that made brokers who help people sell digital assets report those sales (H.J.Res. 25)?" |
| H2 | W5 | "Overturn" means yes = undo. The earlier pass kept undo wording where the measure is a cancellation. This one is, and the explainer says what yes means | Tidy | Keep. Cap how many undo questions sit in a row |

### Cleveland City Council

| Id | Rule | What I found | Label | Before and after |
| --- | --- | --- | --- | --- |
| C1 | W2, W5 | "While it writes rules for them" builds in the assumption that rules will be written. A person who wants no data centers, or no pause, has no clean answer | Tidy | Before: "Should Cleveland pause permits for new data centers while it writes rules for them?" After: "Should Cleveland pause permits for new data centers?" and move "while it writes rules" to the explainer |
| C1 | Sides | Explainer: "Supporters point to electricity, water, and neighborhood effects; others weigh jobs and investment." Three reasons for one side, two for the other. "Point to" and "weigh" are not the same tone. No names | Tidy | After: same number of reasons, same verb, and a named, sourced voice for each, or a line saying none is quoted |
| C2 | W2 | Two things: license, and limit by neighborhood type | Fix first | Use the three S1 questions |
| C2 | Lean | Explainer ends "It balances neighbors' concerns with owners' income." That is a verdict. It also sets "concerns" against "income" | Fix first | After: delete the sentence. State what the ordinance does, then one named reason for each side |
| C2 | W9 | "like Airbnb" is a brand used as the only example | Tidy | After: "short-term rentals (rooms or homes rented for short stays)" |
| C3 | W2 | Stacks agencies and hospitals, "cooperate ... or lose funding", and "oppose". A person may oppose the bills and not want Council to speak. The funding penalty is in the question and the reasons for the bills are not in the explainer | Fix first | Before: "Should Cleveland oppose state bills that would require local agencies and hospitals to cooperate with federal immigration enforcement or lose funding?" After: "Should Cleveland City Council formally oppose Ohio bills that would require local governments to help federal immigration enforcement?" and move the hospitals and funding detail, and the bills' supporters' reasons, to the explainer |
| C3 | W10 | Plain enough, but at 21 words and grade 15.6 it is one of the hardest | Tidy | Covered by the after wording above |
| C4 | Lean | "Urge library leaders to reach a contract" puts the duty on one side. A person who thinks the union is the holdout cannot answer "yes" | Fix first | Before: "Should Council publicly urge Cleveland Public Library leaders to reach a contract with the library workers' union?" After: "Should Council publicly urge the library and its workers' union to settle a contract?" |
| C5 | W5 | Assumes the need ("neighborhoods without them"). The card title "Grants for food deserts" uses a contested term. No cost is mentioned | Tidy | Before: "Should Ohio create grants to bring grocery stores and healthy food to neighborhoods without them?" After: "Should Ohio create a grant program to help open grocery stores in neighborhoods that have none nearby?" Title: "Grants for grocery stores" |
| C6 | W2 | Two requests (longer restoration times, more outages per year) and only the worst reading is shown. The company's stated reason is not given | Fix first | Before: "Should state regulators reject FirstEnergy's requests to allow longer restoration times and more outages per year?" After: "Should Ohio regulators deny FirstEnergy's request to change its outage standards?" Put the two changes, and FirstEnergy's stated reason with a source, in the explainer. Keep yes = deny so the stored records stay valid |
| C7 | All | No rule broken in the wording. It states the current ban, spells out "name, image, and likeness", and has one thing in it | Passes | None |
| C8 | W2 | Two things: who decides (council members using ward funds) and what for (home repair for older residents). The explainer says each fund "is steered by its council member" | Fix first | Before: "Should council members use their wards' neighborhood funds to pay for home repairs for older residents?" After: "Should Cleveland pay for home repairs for older residents, using money from five wards' Neighborhood Equity Funds?" |

### Mayor

| Id | Rule | What I found | Label | Before and after |
| --- | --- | --- | --- | --- |
| M1 | Lean | The question never says alcohol. "Drinks" and "refreshment" hide what a DORA is | Fix first | Before: "Should Cleveland create an outdoor refreshment area in the Playhouse Square Theatre District, where adults can carry drinks from participating businesses outside?" After: "Should Cleveland let adults carry alcoholic drinks bought from participating businesses outside, in the Playhouse Square Theatre District?" |
| M1 | Sides | Explainer gives one reason for (foot traffic) and three against (litter, noise, policing) | Tidy | After: same count, same verb for each side |
| M2 | All | No rule broken | Passes | None |
| M3 | W5 | The question says "replace" but not what changes. A person cannot say yes or no to a law they have not been told about. The explainer ("new rules and penalties") is the only place | Tidy | Before: "Should Cleveland replace its dog safety law with new rules for nuisance, dangerous, and vicious dogs?" After: "Should Cleveland replace its dangerous-dog law with new rules and penalties for nuisance, dangerous, and vicious dogs?" and list the main changes |
| M4 | All | No rule broken | Passes | None |
| M5 | Lean | "Using contracts, grants, and gifts to pay for it" suggests it costs residents nothing. It also bundles whether to build with how to pay | Fix first | Before: "Should the city build solar power generation, using contracts, grants, and gifts to pay for it?" After: "Should the city build solar power generation?" and state the funding in the explainer with the amounts [confirm against Ordinance 620-2026] |
| M6 | W2 | A whole budget is one yes. "Yes" means every department and every line | Fix first | Before: "Should Council pass the mayor's 2026 operating budget for all city departments?" After: "Taken as a whole, do you support the mayor's 2026 operating budget for city departments?" and say plainly that it is one answer for the whole budget |
| M6 | W1, W8 | "Should Council pass" asks about an act that is over (the budget passed). The status sentence after it says so | Tidy | See the set-level row on "Should" for passed items |
| M7 | Meaning | "In exchange for all tax revenue from the I-X Center area" does not say who gets the revenue. Read one way, Cleveland gives up the revenue. Read the other way, Cleveland keeps it. Also a bundle: settle, pay, give land, revenue. "Long legal fight" is a loaded phrase | Fix first | Before: "Should Cleveland settle its long legal fight with Brook Park by paying Brook Park and giving it land, in exchange for all tax revenue from the I-X Center area?" After: "Should Cleveland settle its legal dispute with Brook Park on the terms in Ordinance 664-2026?" and list the terms below the question: what Cleveland pays, what land moves, who gets the tax revenue [a person confirms each term from the ordinance] |
| M8 | Meaning | The question says part of the money goes to a fund "used only for" street safety and getting around. The explainer says the ordinance also moves meter money into the General Fund. The question leaves out half of what the ordinance does | Fix first | Before: "Should part of the city's parking meter profits go into a fund used only for street safety and getting around?" After: "Should the city set up a Parking Benefits Fund and put a share of parking meter money in it?" and say in the explainer that the rest goes to the General Fund [confirm "used only for" against the ordinance] |
| M9 | Lean | "Taxes on new building pay for public improvements" sounds like a new tax. The explainer later says owners pay "in place of some property taxes". The question leaves out the part critics point to. "Tax increment financing" is an insider term | Fix first | Before: "Should the city create an East Side tax increment financing district, where taxes on new building pay for public improvements there?" After: "Should the city create an East Side tax increment financing (TIF) district? In a TIF, owners of new buildings pay money instead of some property taxes, and that money pays for public work in the district." |
| M10 | W2 | The question itself says "and": waive fees for small homes, halve them for larger housing. Two different decisions. "East Side district" is not defined | Fix first | Before: "Should the city waive building permit fees for new one- to three-family homes in the East Side district, and halve them for larger housing?" After: (a) "Should the city waive building permit fees for new one- to three-family homes in [name the district]?" (b) "Should the city cut building permit fees in half for larger new housing in [name the district]?" |
| M11 | All | No rule broken | Passes | None |
| M12 | W2, W5 | "Buy ... under a four-year contract" mixes buy with a service contract. The explainer lists equipment, installation, maintenance and software, so "buy" may be wrong | Tidy | Before: "Should the city buy weapons-screening scanners for the new police headquarters under a four-year contract?" After: "Should the city pay for weapons-screening scanners at the new police headquarters?" and put the four-year term in the explainer |
| M13 | Meaning | The question asks if the city should "keep funding" the groups. The explainer says the ordinance "changed the terms" of the program and does not say how. A person can support the funding and not the changes | Fix first | Before: "Should the city keep funding community groups that work to interrupt and prevent violence?" After: "Should the city continue its funding of community violence prevention groups, with the changes in Ordinance 938-2026?" and say what changed [a person reads it from the ordinance] |
| M14 | W8 | No year. The ordinance is for Summer 2026 with 18 months and renewals. It is October, so that summer has passed | Tidy | Before: "Should the city fund a summer jobs program for youth and young adults?" After: "Should the city keep paying for a summer jobs program for youth and young adults?" and put the 2026 term in the explainer |
| M15 | All | No rule broken | Passes | None |

### Practice ballot issues

| Id | Rule | What I found | Label | Before and after |
| --- | --- | --- | --- | --- |
| I3 | Sides | "Consider identification requirements and access to voting" names the proposal and one value (access). The usual reason on the other side, election security, is not named | Tidy | After: "Consider keeping elections secure and keeping voting easy to reach." |
| I3 | W10 | "statutes" | Tidy | "A no vote does not itself end existing voter-ID laws." |
| I10 | Lean | The card title is "Developmental-disability programs and facilities". It names the service and hides that it is an additional property tax. I11 says "levy" in its title. Same kind of item, titled two ways | Fix first | Before: "Developmental-disability programs and facilities". After: "Developmental disabilities levy (additional property tax)" |
| I10 | W10 | "2.25-mill" is not explained | Tidy | After: "2.25 mills (a mill is a unit of property tax rate)" |
| I11 | W2 | Renewal and increase are one yes. The line does not tell the reader there is no way to vote for only one | Tidy | After: add "A yes covers both the renewal and the increase. A no rejects both." |
| I11 | Sides | Only the no line carries an instruction: "Do not interpret this as ...". The yes line has none. Tone is not equal | Tidy | Before: "Do not interpret this as an immediate repeal of every existing health-services tax." After: "A no does not end existing health-services taxes right away." (same form as I10) |
| I12, I13, I14 | Sides | Yes lines are 19, 21, 25 words. The no line is the same 8 words each time and says nothing about what stays. I13's yes line adds a reassurance ("powers preserved as described") that the no line has no match for | Tidy | Before (no): "Reject this proposed change to the county charter." After (no): "Keep the charter as it is today: [state the current rule, for example that the Executive can remove these members without Council]." Shorten each yes line to one plain sentence |
| I12, I13, I14 | W10 | Grade 14 to 18 for the yes lines, 7 for the no line. "non-litigation legal work and advice" is hard | Tidy | After: say it in one short sentence a person can repeat |
| I33 to I38 | W10 | "mixed beverages" and "specified local liquor option" are legal terms | Tidy | Before: "Permit the proposed Sunday sale of wine and mixed beverages at ..." After: "Allow Sunday sales of wine and liquor at [business], [address]." and move "under the local liquor option" to the explainer [confirm the term] |
| I33 to I38 | Sides | Yes line 20 to 25 words, no line 10 | Tidy | Before (no): "Reject this request for Sunday sales at the named location." After (no): "Do not allow Sunday sales of wine and liquor at [business]." |
| T (93 issues) | W5 | The yes and no lines say almost nothing ("the specific proposal", "depend on the proposal"). It is honest, and it also says "A detailed plain-language impact review is not loaded" | Tidy | Keep the honesty. Add the reviewed yes and no lines for these issues over time, as done for the 12 above |

### Setup questions

| Id | Rule | What I found | Label | Before and after |
| --- | --- | --- | --- | --- |
| D1 (phone) | W7 | District 7 or District 11 only. No "I'm not sure" (desktop has one). A "Look it up by address" link is the only way out | Tidy | After: add "I'm not sure" |
| D2 (desktop) | W3 | "Not known / not on my ballot" is two meanings in one choice | Tidy | After: two choices, "I don't know" and "Not on my ballot" |
| D1, D2 | W11 | They say why ("Your address decides which"), say the address is typed only on the county site, and can be skipped. | Passes | None |

## Findings about the sets and the answer buttons

| Rule or check | Result | Label |
| --- | --- | --- |
| Selection (constellation) | **27 of 29 constellation questions have only "yes" records** (4 governor, 8 Council, 15 mayor). Only the two House questions have both a yes and a no record (Brown no on both, Miller yes on both). A "no" on any of the 27 can never match a record. A "yes" on all 15 mayor questions shows 15 of 15 the same. Council records are sponsorship, which the code already treats as support, not a floor vote | Fix first |
| Selection (governor) | Each of the four questions comes from one candidate's own campaign page. Each candidate has 2 of 4, so half are always "missing". The map leaves out a candidate with no comparable record (`S` keeps only `e.total`), so a candidate on the ballot can drop off the map. The plan lists three governor candidates on the ballot | Fix first |
| Direction of "yes" | In 20 of the 23 Cleveland Council and mayor questions, "yes" means start, change, spend or give up something. In 3 (M2, M11, M13) "yes" means keep going. In C3, C6 and H2 "yes" means oppose, reject or cancel. In all 29 constellation questions "yes" is the side the sponsor or candidate took. "Yes" never means two different directions inside one set, but it is never the "no change" answer for most of them | Tidy |
| Priority scale: "Still deciding" counts as a priority | Choosing it uses one of the five slots (`ext/cxm-core.jsx:198`, `chosen` is every level that is set) and it is treated as chosen when My leaders finds common ground (`ext/cx-leaders.jsx:466`, `:509-511`). It also sits between "Important" and "Skip", so it reads as a middle level of importance. The page says it "means you want to learn more", which is a different thing | Fix first |
| Priority scale: "Skip" | Skip is the only way to say "not a priority for me". It also means "I did not answer". The two cannot be told apart | Fix first |
| Priority scale: overlap | "Most important" is also "Important" (W3). Nothing stops a person marking all five "Most important" | Tidy |
| Same words, different effect | "Still deciding": on priorities it counts as chosen. On the ballot it is excluded from "choices made" (`ext/cxm-ballot.jsx:313`, `:434`). "Still learning" (stance and constellation) is excluded from matching. "Skip", "Skip this race", "Leave this blank", "Left blank", "Skipped" all name one thing. Three phrases about not knowing, and the code treats them three ways | Fix first |
| Where "Still deciding" and "Skip" sit | On desktop, Yes and No are the main answers. "Still deciding" and "Leave this blank" sit below them, behind a rule, as 14px text buttons with no fill (`practice-choice-secondary`, in the compiled CSS). On the phone, Yes and No are large cards and the other two are a small row below (`ext/cxm-ballot.jsx:211-216`). The side note says "Choosing 'Still deciding' is okay", which shows the app knows the risk. Yes comes first, No second | Tidy |
| Fixed order | Every set is in a fixed array order, so the first item gets the most attention. Priorities start with cost. The governor questions alternate between the two candidates. The phone says "QUESTION n OF N". None change between visits | Tidy |
| "Should" for passed items | Most of the 23 Cleveland Council and mayor questions are asked as "Should X do Y" for measures that have already passed or run. A status sentence follows. For passed items "Do you support" is the honest present-tense form (W1) | Tidy |
| Names and examples | None of the 23 explainers names a person or group. They say "supporters" and "others". The levies guide names voices. The practice ballot and constellation do not | Tidy |
| Priority labels as goals | Each label is a wish phrased as fact ("Keep", "Make", "Improve", "Protect", "Support"). "Protect" starts two of the eight. The importance scale is the "whether" step, so this is less serious than in a yes or no question | Tidy |
| W10 in the surrounding text | "atlas" ("A priority tells the atlas what you want to examine"; `ext/cxm-more.jsx:212`), "resilience", "entrepreneurship" in the "Look at" lines | Tidy |
| Party, race, income, neighborhood as a stand-in | No question asks for party, race or income. M9 and M10 say "East Side" because the ordinance does. Party is shown beside every candidate name from the Board of Elections list. The phone says "A party does not establish how someone will decide" (`ext/cxm-ballot.jsx:186`). I found no matching line on the desktop ballot step, which shows the party under each name. Council members are listed with "Ward n" in the party slot | Tidy (desktop party line) |

## Outside the question rules, seen on the way

These are not wording problems, but they touch "no ordering by agreement" and "no faces beside answers" in `docs/plan-government-nav.md`. I did not change them.

- The constellation places each person at a distance from "You" by how often the records match: `radius = 90 + (1 - same/total) * 160` (`CivicAtlas.pretty.js:14350`), with rings named Same, Mixed, Different. The phone says "the closer a person is to you, the more of your yes and no answers match their record" (`ext/cxm-people.jsx`). That is an order by agreement drawn as a picture. The phone also puts a face on each dot (`cxFaceSrc`).
- My leaders has a button "Most common ground first" (`ext/cx-leaders.jsx:509-511`, `:566-567`) that sorts council members by how many of your priorities appear in their work.

## Count

- Questions with their own wording audited: **50** (8 priorities, 1 stance, 4 governor, 2 House, 8 Council, 15 mayor, 12 issue lines).
- Break at least one rule in their own wording: **45 of 50**.
  - At least one Fix first: **24** (P2, P3, P5, P7, S1, G1, G3, G4, H1, H2, C2, C3, C4, C6, C8, M1, M5, M6, M7, M8, M9, M10, M13, I10).
  - Tidy only: **21** (P1, P4, P6, P8, G2, C1, C5, M3, M12, M14, I3, I11, I12, I13, I14, I33 to I38).
  - No rule broken: **5** (C7, M2, M4, M11, M15).
- Not counted in the 45, and shown in the second table: the set and button findings above. These apply to a whole set and not to one question. The first four (selection, scale, same words, direction) are Fix first.
- Not counted: L1 and L2 (no answer buttons). L2's "limited building money" assumes a shortage (W5, Tidy). Setup items D1 and D2 and the template T have findings, all Tidy.

## Not applicable

| Rule | Why |
| --- | --- |
| W4 "None" clears the other picks | There is no pick-many list with a "None" choice. The priority cards are one choice per card, and "Skip" clears that card. |
| W6 A yes or no needs a middle | Met everywhere an answer is a position: the constellation and stance have "It depends" and "Still learning", the ballot has "Still deciding". The finding is where the middle sits and what it counts as, not that it is missing. |
| W8 Time frame | Not needed for the priorities, the stance question or the issue lines. It matters for G2 and M14 only. |
| W11 Personal questions | The questions about policy are not personal. The only personal questions are D1 and D2, covered above. The priorities card says choices stay in the browser and everything is optional. |
| Candidate contests ("Choose at most one") | The app writes no question wording for them. The names and party come from the Board of Elections list. |
| Official ballot wording | Stays English and as the Board published it. Not audited. |

## Not covered

- Tone beyond word choice. Same limit as the earlier pass.
- The "Questions to ask" and "Tradeoffs" lists in the priority guides (`ext/cx-leaders.jsx:28-132`) are not answered by residents. Two look lopsided and are worth reading with this: "Short-term rental income for owners, or quiet and stable blocks for neighbors" (line 52, money set against quiet) and the growth tradeoff "Big downtown and lakefront projects, or investment spread across neighborhoods" (line 103, which sets a place against a place).
- The levies guide and the issue stories (`ext/cx-levies.jsx`, `ext/cx-story.jsx`). They have their own review rule.
- Spanish. Any rewording here needs the Spanish step in `CLAUDE.md` (inventory, translate, merge, test) and a Spanish-speaking reader.
- The reading level is a rough formula and was run on wording only, not on a reader.

## What still needs real people

The live app must not collect answers, so these come from a small consented test.

1. **Yes-rate per question.** Start with the 27 yes-only constellation questions. If nearly everyone says yes, look at the wording.
2. **A repeated question, flipped.** S1 and C2 are the same ordinance asked two ways. Ask some people one, some the other, and compare.
3. **A read by a few people outside the team**, on whether either answer sounds like the "right" one. Include M7 and M8, where the wording may be read two ways.
4. **Whether "Still deciding" and "Skip" feel respectable** when they sit under the main buttons.
5. **Whether people understand what "Still deciding" does on the priorities card** (it uses a slot and counts in My leaders).
6. **A Spanish-speaking reader** for any reworded question, before it is shown in Spanish.

## Where each fix goes

- `ext/cx-leaders.jsx` (C and M questions, the priority guides): normal edit, then the Spanish step. Interpretive text, so Brent reads it first.
- `CivicAtlas.pretty.js` text (priorities, S1, G, H, issue lines, the buttons): an exact-match `patch()` in `build.py`. If the wording is moved into `ext/`, that is a larger change and should be done on purpose.
- The "Still deciding is counted as chosen" fix is code, in `ext/cxm-core.jsx` and `ext/cx-leaders.jsx`. It changes what a saved answer means, so it needs a test.
- Data records (`Gm`) only change if a question's direction flips. C6 is written so it does not.
