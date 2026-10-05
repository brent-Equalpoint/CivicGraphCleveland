/* v5.17 Levies and taxes: a plain-English guide to the tax issues on the ballot, for both layouts.
   - Every number comes from the official ballot wording that is already in the app (Um), read by cxLevyFacts().
   - The two countywide levies (Issues 10 and 11) also get hand-written, sourced text: what the money pays for, what changes,
     what the county or board says happens if it fails, what named people have said on each side, and questions a voter can ask.
     That text is interpretive, so it sits between the LEVY-TEXT markers below. A person reads it against its sources and then runs
         python build.py --mark-levies-reviewed "Your Name"
     Until then the page says a person has not reviewed it. If the text changes after that, the page says so again.
   - It never tells anyone how to vote and never scores a levy. It shows the cost, the uses, and both sides, with sources.
   - What a person types as their home's value stays in the page and is never saved or sent anywhere.
   - Oct 5, 2026: the other questions on every ballot in the county are stories too, in the same engine with no number pad: State Issue 3
     (photo ID in the Ohio Constitution) and county charter Issues 12, 13 and 14 (CX_ISSUE_TEXT, also between the LEVY-TEXT markers, so the
     same review flag covers it). The official wording is read from the issue list already in the app (Um), never typed.
     Sources, all read on Oct 5, 2026: the Board of Elections issue list (PDF, English and Spanish); the county charter; County Council's
     minutes of Aug. 4 and Sept. 1, 2026 and its July 7 committee agenda; Signal Cleveland Aug. 4, Aug. 6 and Oct. 1; Signal Ohio Sept. 1;
     the Statehouse News Bureau Aug. 3; Ideastream July 21, Aug. 5, Aug. 26 and Sept. 1; the Ohio Capital Journal June 1; The Vindicator
     Sept. 19 (editorial); the ACLU of Ohio Sept. 22. NOT read: the Ohio Secretary of State's site (ohiosos.gov, including the official
     arguments for and against Issue 3 and the Ballot Board's explanation) answered every request with HTTP 403 and a "Website Maintenance"
     page on Oct 5, 2026. The two official arguments are therefore quoted from The Vindicator and Signal Ohio, and the page says so.
     WKYC's Issue 3 explainer also refused the request (403) and is not used. */

const CX_LEVY_SRC = {
  boe: { label: `Official ballot wording, Cuyahoga County Board of Elections`, url: `https://boe.cuyahogacounty.gov/elections` },
  signal: { label: `Signal Cleveland, Oct. 1, 2026: Here's what's on your ballots in Cuyahoga County this November`, url: `https://signalcleveland.org/cuyahoga-county-levy-charter-amendment-ballot-issues-election-2026/` },
  spectrum: { label: `Spectrum News, Sept. 23, 2026: Cuyahoga County Board of Developmental Disabilities kicks off levy campaign`, url: `https://spectrumnews1.com/oh/columbus/news/2026/09/23/cuyahoga-county-issue-10-kickoff` },
  hoodline: { label: `Hoodline, July 23, 2026: Cuyahoga's DD tax hike heads for a November vote`, url: `https://hoodline.com/2026/07/cuyahoga-s-dd-tax-hike-heads-for-high-stakes-november-vote-6929795/` },
  ide0928: { label: `Ideastream, Sept. 28, 2026: Cuyahoga County could cut funding for homeless population, infant mortality if levy fails`, url: `https://www.ideastream.org/government-politics/2026-09-28/cuyahoga-county-could-cut-funding-for-homeless-population-infant-mortality-if-levy-fails` },
  ide0805: { label: `Ideastream, Aug. 5, 2026: Cuyahoga County Council puts HHS levy increase on ballot`, url: `https://www.ideastream.org/government-politics/2026-08-05/cuyahoga-county-council-puts-hhs-levy-increase-on-ballot-elected-sheriff-amendment-withdrawn` },
  county: { label: `Cuyahoga County, July 8, 2026: Cuyahoga County seeks funding for health and human services`, url: `https://cuyahogacounty.gov/county-news/county-news-detail/2026/07/08/cuyahoga-county-seeks-funding-for-health-and-human-services` },
  /* State Issue 3 and county Issues 12 to 14 (read Oct 5, 2026) */
  list: { label: `Official ballot wording, Cuyahoga County Board of Elections`, url: `https://boe.cuyahogacounty.gov/docs/default-source/boe/elections/2026-11-03-issues-list.pdf?sfvrsn=3285f23b_1` },
  charter: { label: `Cuyahoga County Council: the Charter of Cuyahoga County, as it reads now`, url: `https://cuyahogacounty.gov/council/legislation/cuyahoga-county-charter` },
  min0804: { label: `Cuyahoga County Council, minutes of the Aug. 4, 2026 meeting`, url: `https://cuyahogacounty.gov/docs/default-source/council/committees/council/2026/20260804-mtg--minutes.pdf` },
  min0901: { label: `Cuyahoga County Council, minutes of the Sept. 1, 2026 special meeting`, url: `https://cuyahogacounty.gov/docs/default-source/council/committees/council/2026/20260901--minutes.pdf` },
  ide0826: { label: `Ideastream, Aug. 26, 2026: O'Malley, Ronayne strike deal to end Cuyahoga County legal turf battle`, url: `https://www.ideastream.org/government-politics/2026-08-26/omalley-ronayne-strike-deal-to-end-cuyahoga-county-legal-turf-battle` },
  ide0901: { label: `Ideastream, Sept. 1, 2026: Cuyahoga County approves truce on legal matters between Ronayne, O'Malley`, url: `https://www.ideastream.org/government-politics/2026-09-01/cuyahoga-county-approves-truce-on-legal-matters-between-ronayne-omalley` },
  sig0804: { label: `Signal Cleveland, Aug. 4, 2026: Ballot language set for Issue 3, the Ohio voter ID amendment`, url: `https://signalcleveland.org/ballot-language-set-for-ohio-issue-3-voter-id-amendment-november-election-2026/` },
  sig0901: { label: `Signal Ohio, Sept. 1, 2026: What is Issue 3? Ohio's voter ID amendment, explained`, url: `https://signalohio.org/what-is-ohio-issue-3-voter-id-amendment-november-election-2026/` },
  shnb0803: { label: `Statehouse News Bureau, Aug. 3, 2026: Ohio Ballot Board OKs language that puts Issue 3, or photo ID, on ballot`, url: `https://www.statenews.org/government-politics/2026-08-03/ohio-ballot-board-oks-language-that-puts-issue-3-or-photo-id-on-ballot` },
  vindy: { label: `The Vindicator, editorial, Sept. 19, 2026: Issue 3 may be odd, but it merits support`, url: `https://www.vindy.com/opinion/editorials/2026/09/issue-3-may-be-odd-but-it-merits-support/` },
  aclu: { label: `ACLU of Ohio, Sept. 22, 2026: Picture This: Issue 3 Puts Strict Photo ID on the Ballot`, url: `https://www.acluohio.org/news/picture-this-issue-3-puts-strict-photo-id-on-the-ballot/` },
  ocj0601: { label: `Ohio Capital Journal, June 1, 2026: Ohio photo voter ID amendment prompts pushback across political spectrum`, url: `https://ohiocapitaljournal.com/2026/06/01/ohio-photo-voter-id-amendment-prompts-push-back-across-political-spectrum/` },
};

/* LEVY-TEXT-START */
const CX_LEVY_TEXT = {
  how: [
    [`What a mill is`, `A mill is a tax rate: one dollar for every $1,000 of taxable value. You do not need the math. The county turns each levy into dollars for every $100,000 of a home's market value, and that is the number shown here.`],
    [`New, renewal, or both`, `A new (additional) levy is new money on top of what you pay now. A renewal keeps a tax that is already on your bill. A renewal and increase keeps the tax you pay now and adds more.`],
    [`Why voters decide`, `In Ohio, voters decide property tax levies. A majority, which is more than half of the votes, is needed for one to pass.`],
    [`Your own bill`, `The dollars shown are the county's estimate for a home worth $100,000, or scaled to the value you type. They are not your tax bill. Your real bill depends on your home's value, where you live, and every other levy you already pay.`],
  ],
  issues: {
    10: {
      name: `Services for people with developmental disabilities`,
      line: `Pays for the county board that supports people with developmental disabilities, from birth through adulthood.`,
      pays: [
        [`The county Board of Developmental Disabilities serves about 15,000 people with physical or cognitive disabilities.`, `signal`],
        [`The official wording says the money is for community programs and services run by county boards of developmental disabilities, and for buying, building, renovating, and running their facilities.`, `boe`],
        [`The board says about 81% of its levy money goes to the local share of Medicaid-funded home and community care. Signal Cleveland lists transportation, wheelchairs and other equipment, and pay for certified caregivers.`, `signal`],
      ],
      changes: [
        [`This is new money on top of the levy voters approved in 2005. Your cost for this levy would go up by the amount shown above.`, `signal`],
        [`The ballot wording says it would last ten years. The first payment would be due in 2027.`, `boe`],
        [`The board's budget is about $177 million now.`, `signal`],
      ],
      fails: [
        [`If voters say no, this new tax is not added. The levy from 2005 stays as it is.`, `boe`],
        [`The board's CEO, Amber Gibbs, said the board would likely come back to the ballot in 2027 or early 2028.`, `hoodline`],
        [`Spectrum News reported that, without more funding, Gibbs predicts the board will have to cut programs within two years.`, `spectrum`],
      ],
      said: [
        [`for`, `Amber Gibbs, CEO of the board`, `“We're serving more people than ever. Services cost more, and we're diagnosing more people early.”`, `spectrum`],
        [`for`, `Leslie Linaevers, who receives services`, `“I want to be able to keep my home and the services and supports that I get.”`, `spectrum`],
        [`for`, `Amber Gibbs, CEO of the board`, `“Although things are really tough right now in this economy, we're confident that voters will find a way to work that into their household budget.”`, `spectrum`],
      ],
      noOpp: `The coverage we read does not quote anyone opposing Issue 10 by name. That is not the same as nobody disagreeing. A missing record is not a no.`,
      /* the story: one idea a screen, the number first. f holds the figures read from the official wording. */
      story: (f, m) => [
        { k: `Issue 10 · Everywhere in the county`, big: `Services for people with developmental disabilities.`, small: `A county tax vote. Tap through to see what it costs, what it pays for, and what people say.` },
        { k: `What it costs`, fig: `$${f.per}`, big: `a year for each $100,000 of your home's value.`, small: `New money on top of what you pay now. The county's estimate, not your tax bill.` },
        { type: `home`, k: `Your number`, big: `is your home's market value.`, small: `Tap the numbers. It stays on this device.` },
        { k: `What it pays for`, big: `Support for about 15,000 people with disabilities, from birth through adulthood.`, small: `The board says about 81% of its levy money goes to the local share of Medicaid-funded home and community care, such as transportation, equipment, and certified caregivers.`, src: `signal` },
        { k: `If it passes`, fig: `${m(f.annual / 1e6, 1)} million`, big: `more a year, for ten years.`, small: `The county's estimate is ${m(f.annual)} a year. The board's budget is about $177 million now.`, src: `boe` },
        { k: `If it fails`, big: `The board would likely try again in 2027 or early 2028.`, small: `Spectrum News reports the CEO predicts program cuts within two years without more funding.`, src: `spectrum` },
        { k: `Someone who supports it`, q: !0, big: `“We're serving more people than ever. Services cost more, and we're diagnosing more people early.”`, small: `Amber Gibbs, CEO of the board`, src: `spectrum` },
        { k: `Anyone against it?`, big: `We found no named opponent.`, small: `The coverage we read quotes none. That is not the same as nobody disagreeing. A missing record is not a no.` },
        { type: `more`, k: `Your call`, big: `Is it right for you?`, small: `We do not tell you how to vote. Open Read more for the reasons, both sides, and the official wording.` },
      ],
      ask: [
        `Is $79 a year for each $100,000 of home value affordable for your household, now and for ten years?`,
        `Do you or someone you know use these services? What would a cut mean for them?`,
        `This is new money, not a renewal. Does the board's case for more money convince you?`,
        `The board says most of the levy goes to the local share of Medicaid care. Do you want to know more about how the rest is spent?`,
      ],
    },
    11: {
      name: `Health and human services`,
      line: `Pays for county services such as child protection, senior services, homeless programs, addiction treatment, and support for MetroHealth.`,
      now: { increase: 87.5, raises: `$144.1 million` },
      pays: [
        [`The county's health and human services levy pays for caring for children in county custody, senior services, and universal pre-K. It also supports the MetroHealth System and the Alcohol, Drug Addiction and Mental Health Services Board.`, `signal`],
        [`The county lists senior services, programs for people who are homeless, child protective services, addiction treatment, and support for MetroHealth Medical Center.`, `county`],
        [`The official wording says the money is for supplementing the county's general fund for health and human or social services.`, `boe`],
      ],
      changes: [
        [`Two things at once: the 4.7-mill levy now on your bill is renewed, and 2.5 mills are added. The county puts the increase at $87.50 a year for each $100,000 of home value.`, `signal`],
        [`The levy raises about $144.1 million a year now. The county estimates the new levy would raise about $261.5 million a year.`, `signal`],
        [`The ballot wording says it would last ten years. The first payment would be due in 2027.`, `boe`],
        [`County Council voted unanimously to put it on the ballot.`, `ide0805`],
      ],
      fails: [
        [`If voters say no to the whole issue, the renewal fails too, not only the increase.`, `boe`],
        [`The county says the health and human services budget would be about $18 million short in 2027, and the county's general fund would be about $19.2 million short.`, `ide0928`],
        [`Signal Cleveland reports: “The county projects a growing deficit in the coming years, requiring cuts or a general fund subsidy.”`, `signal`],
        [`The county's list of possible cuts includes: Children and Family Services, $8.8 million; Senior and Adult Services, $2.2 million; homeless services, $1 million; Job and Family Services, $1 million; the United Way of Greater Cleveland contract, $1 million; and funding for universal pre-K, Say Yes Cleveland, the Fatherhood Initiative, infant mortality prevention, the AIDS Funding Collaborative, and bed bug extermination.`, `ide0928`],
      ],
      said: [
        [`for`, `Dale Miller, County Council President`, `“We have fallen on hard times. Post-Covid inflation; increased labor and healthcare costs; and adverse state and federal policy changes have taken a serious toll.”`, `ide0805`],
        [`concern`, `Yvonne Conwell, County Council member`, `Said the council needs more discussion of how the dollars are spent: “We have a duty to be prudent with the dollars.”`, `ide0805`],
        [`concern`, `Mike O'Malley, Cuyahoga County Prosecutor`, `Criticized county leadership: “Now is the time to start eliminating non-essential programs, departments and staff.”`, `ide0928`],
      ],
      noOpp: ``,
      story: (f, m) => [
        { k: `Issue 11 · Everywhere in the county`, big: `Health and human services.`, small: `A county tax vote. Tap through to see what it costs, what it pays for, and what people say.` },
        { k: `What it costs`, fig: `$${f.per}`, big: `a year for each $100,000 of your home's value.`, small: `Now about ${m(f.per - 87.5, 2)}. The increase is $87.50. The county's estimate, not your tax bill.` },
        { type: `home`, k: `Your number`, big: `is your home's market value.`, small: `Tap the numbers. It stays on this device.` },
        { k: `What it pays for`, big: `Child protection, senior services, homeless programs, addiction treatment, and MetroHealth.`, small: `The county's health and human services levy. It also pays for universal pre-K and supports the county's mental health and addiction board.`, src: `signal` },
        { k: `If it passes`, fig: `${m(f.annual / 1e6, 1)} million`, big: `a year, up from $144.1 million.`, small: `The 4.7-mill levy is renewed and 2.5 mills are added, for ten years. County Council voted unanimously to put it on the ballot.`, src: `signal` },
        { k: `If it fails`, big: `The county projects cuts or a subsidy.`, small: `About $18 million short for health and human services in 2027, the county says. A no ends the renewal too, not only the increase.`, src: `ide0928` },
        { k: `Someone who supports it`, q: !0, big: `“We have fallen on hard times. Post-Covid inflation; increased labor and healthcare costs; and adverse state and federal policy changes have taken a serious toll.”`, small: `Dale Miller, County Council President`, src: `ide0805` },
        { k: `A concern raised`, q: !0, big: `“We have a duty to be prudent with the dollars.”`, small: `Yvonne Conwell, County Council member, asking for more discussion of how the money is spent`, src: `ide0805` },
        { k: `A concern raised`, q: !0, big: `“Now is the time to start eliminating non-essential programs, departments and staff.”`, small: `Mike O'Malley, Cuyahoga County Prosecutor, criticizing county leadership`, src: `ide0928` },
        { type: `more`, k: `Your call`, big: `Is it right for you?`, small: `We do not tell you how to vote. Open Read more for the reasons, both sides, and the official wording.` },
      ],
      ask: [
        `Is $196 a year for each $100,000 of home value, which is $87.50 more than now, affordable for your household for ten years?`,
        `Which of these services do you or people you know rely on? Which would you want protected if money is short?`,
        `The county says cuts or a subsidy would follow if it fails. Do you think cuts, other savings, or new money is the better answer?`,
        `This is one issue with two parts. A yes renews the old tax and adds the increase. A no ends both. Does that change how you see it?`,
        `Do you want to see the county's budget and audits before you decide?`,
      ],
    },
  },
};
/* The other questions on every ballot in the county: State Issue 3 and county charter Issues 12, 13 and 14. Same rules as the levies:
   one idea a screen, a source on every claim, both sides by name with a date and a link, or a plain statement that we found none.
   Each row is [text, source key]; each "said" row is [side, who, words, source key]. Putting a question on the ballot is not backing it,
   so Council's votes to do that are under "How it got on the ballot", not under "What people have said". */
const CX_ISSUE_TEXT = {
  3: {
    name: `Photo ID in the Ohio Constitution`,
    asks: [
      [`It would add a photo ID rule for voting to the Ohio Constitution.`, `list`],
      [`In person, voters would show an unexpired Ohio driver license or state ID card, a U.S. passport or passport card, or a U.S. military, Ohio National Guard, or Veterans Affairs ID card.`, `list`],
      [`State law could allow another way to confirm who you are if you have a sincere religious objection to being photographed.`, `list`],
      [`Voters who do not vote in person would show a photo ID too, unless state law lets them give a signature and at least one other ID number.`, `list`],
    ],
    now: [
      [`Ohio has required a photo ID to vote in person since 2023, under a state law. Its list of IDs matches the one in Issue 3.`, `sig0804`],
      [`Mail voters can give another ID instead, such as the last four digits of a Social Security number.`, `sig0804`],
      [`Out-of-state driver licenses and student IDs are not accepted now, and would not be under Issue 3.`, `sig0901`],
    ],
    changes: [
      [`Nothing changes at the polls right away. Ohio's ID rule moves from state law into the constitution.`, `sig0804`],
      [`Changing or ending the rule later would take another statewide vote, not just a new law.`, `sig0804`],
      [`The ballot wording says it would take effect right away.`, `list`],
      [`Lawmakers could still decide whether mail voters need a photo ID. They passed a bill to require it in June 2026, and Gov. Mike DeWine vetoed it.`, `sig0804`],
    ],
    fails: [
      [`Ohio's photo ID law stays in place. A no vote does not repeal it.`, `sig0901`],
      [`Lawmakers could still change that law with a regular bill, without a statewide vote.`, `sig0901`],
    ],
    how: [
      [`State lawmakers put it on the ballot in June 2026. It did not come from a citizen petition.`, `sig0901`],
      [`The Ohio Ballot Board approved the ballot wording 4 to 1 on Aug. 3, 2026. Republican lawmakers wrote the official argument for it, and Democratic lawmakers wrote the argument against it.`, `sig0804`],
      [`It passes if more than half of the votes on it are yes.`, `list`],
    ],
    said: [
      [`for`, `The official argument for Issue 3, by state lawmakers Adam Bird, Heidi Workman, Jane Timken, and Theresa Gavarone`, `“Photo ID is a proven method to protect Ohio's elections and improve voter confidence. If you can show an ID to drive a car, you can show an ID to decide the future of our state and our country.” As quoted by The Vindicator.`, `vindy`],
      [`for`, `Theresa Gavarone, Republican state senator, Aug. 3, 2026`, `“By enshrining this language in the (Ohio) Constitution, we are really setting a floor, so that future general assemblies won’t be able to go backwards.”`, `shnb0803`],
      [`for`, `The Vindicator's editorial board, Sept. 19, 2026`, `Endorsed Issue 3: “We agree with the extra sticking power of inclusion of photo identification mandates in the Ohio Constitution.”`, `vindy`],
      [`for`, `Amy Acton, Democratic nominee for governor, and the Ohio Republican Party`, `Signal Ohio reported that Acton supports Issue 3 and that the Ohio Republican Party is running the campaign for it.`, `sig0901`],
      [`concern`, `The official argument against Issue 3, by state lawmakers Bill DeMora, Terrence Upchurch, and Desiree Tims`, `“Today in Ohio you can use your digital wallet to fly but not to vote. This amendment locks out future technology that will be both more secure and more available.” As quoted by Signal Ohio.`, `sig0901`],
      [`concern`, `ACLU of Ohio, Sept. 22, 2026`, `Opposes Issue 3. It says “putting these requirements in the state constitution leaves the possibility that some forms of ID could become obsolete, and thus unusable.”`, `aclu`],
      [`concern`, `The Ohio Legislative Black Caucus Foundation and Ohio Citizen Action`, `Have announced their opposition to Issue 3, Signal Ohio reported.`, `sig0901`],
      [`concern`, `Marisa Nahem, Ohio Democratic Party spokesperson`, `Called it “an unnecessary ballot initiative that doesn’t change the current law.”`, `sig0901`],
      [`concern`, `Marcell Strbich, retired Air Force officer, at a hearing on the House version in May 2026`, `A concern from the other side, that it does not go far enough: “Most Ohioans support universal photo ID, yet many voters will not realize they’re being asked to enshrine this clause of unequal treatment, photo ID for in-person voters only, with no requirement for mail-in absentee ballots.”`, `ocj0601`],
    ],
    noOpp: ``,
    story: () => [
      { k: `Issue 3 · Statewide`, big: `Photo ID in the Ohio Constitution.`, small: `The one statewide question this year, on every ballot in Ohio. Tap through to see what it asks and what people say.`, src: `shnb0803` },
      { k: `What it asks`, big: `It puts Ohio's photo ID rule for voting into the state constitution.`, small: `The IDs: an unexpired Ohio driver license or state ID card, a U.S. passport or passport card, or a U.S. military, Ohio National Guard, or Veterans Affairs ID card.` },
      { k: `The law now`, big: `Ohio already requires a photo ID to vote in person.`, small: `It has since 2023, under a state law with the same list of IDs. Mail voters can give another ID number instead.`, src: `sig0804` },
      { k: `If it passes`, big: `Nothing changes at the polls right away.`, small: `The rule moves into the constitution, so changing it later would take another statewide vote. Lawmakers could still set the ID rules for voting by mail.`, src: `sig0804` },
      { k: `If it fails`, big: `The photo ID law stays as it is.`, small: `A no vote does not repeal it. Lawmakers could still change that law with a regular bill.`, src: `sig0901` },
      { k: `Someone who supports it`, q: !0, big: `“Photo ID is a proven method to protect Ohio's elections and improve voter confidence.”`, small: `The official argument for it, by state lawmakers Adam Bird, Heidi Workman, Jane Timken, and Theresa Gavarone, as quoted by The Vindicator`, src: `vindy` },
      { k: `A concern raised`, q: !0, big: `“This amendment locks out future technology that will be both more secure and more available.”`, small: `The official argument against it, by state lawmakers Bill DeMora, Terrence Upchurch, and Desiree Tims, as quoted by Signal Ohio`, src: `sig0901` },
      { type: `link`, link: `list`, k: `What to check next`, big: `Is your ID on the list, and not expired?`, small: `The official wording is on the Board of Elections issue list, in English and Spanish.` },
      { type: `more`, k: `Your call`, big: `Is it right for you?`, small: `We do not tell you how to vote. Open Read more for the reasons, both sides, and the official wording.` },
    ],
    ask: [
      `Do you have one of the IDs on the list, and is it unexpired?`,
      `Would anyone in your household have trouble getting one of these IDs?`,
      `Do you want this rule to be harder to change in the future, or easier?`,
      `Issue 3 leaves the ID rules for voting by mail to lawmakers. Does that matter to you?`,
    ],
  },
  12: {
    name: `Council review of board-member removals`,
    asks: [
      [`County Council would have to confirm when the County Executive removes a member of a county board, agency, commission, or authority.`, `list`],
      [`It covers boards set up under the county charter, boards that state law has the county fill, and special boards made by an agreement with another public agency or by a court order.`, `list`],
      [`The County Executive appoints people to many boards, including those over MetroHealth, the Greater Cleveland Regional Transit Authority, Cuyahoga Community College, and the Port of Cleveland.`, `signal`],
    ],
    now: [
      [`The charter lets the County Executive appoint these members, with Council's confirmation, and remove them without it.`, `charter`],
    ],
    changes: [
      [`A removal would need Council's confirmation, the same as an appointment does now.`, `list`],
    ],
    fails: [
      [`The charter stays as it is. The County Executive can still remove these members without Council.`, `charter`],
    ],
    how: [
      [`Council member Sunny Simon said she learned Council had no role in removals after the County Executive asked a member of the port board to resign.`, `signal`],
      [`Simon and Martin J. Sweeney sponsored it. Council voted unanimously on Aug. 4, 2026 to put it on the ballot.`, `min0804`],
      [`To reach the ballot, a charter change needs the votes of eight Council members.`, `ide0805`],
      [`It passes if more than half of the votes on it are yes.`, `list`],
    ],
    said: [
      [`for`, `Sunny Simon, County Council member, who proposed it, in July 2026`, `“I think it’s really important that this council body, if we, again, confirm an appointment, should absolutely have a say in whether that appointee should be removed.”`, `signal`],
    ],
    noOpp: `We found no named person speaking against Issue 12. That is not the same as nobody disagreeing. A missing record is not a no.`,
    story: () => [
      { k: `Issue 12 · Everywhere in the county`, big: `Council review of board-member removals.`, small: `A question about the county charter. Tap through to see what it asks and what people say.` },
      { k: `What it asks`, big: `Council would have to confirm when the County Executive removes a board member.`, small: `Such as members of the boards over MetroHealth, the transit authority, the community college, and the Port of Cleveland.`, src: `signal` },
      { k: `How it works now`, big: `Council confirms these appointments but has no say in removals.`, small: `The charter lets the County Executive appoint board members, with Council's confirmation, and remove them.`, src: `charter` },
      { k: `If it passes`, big: `A removal would need Council's confirmation too.`, small: `The official wording covers boards set up under the charter, boards that state law has the county fill, and special boards made by an agreement or a court order.` },
      { k: `If it fails`, big: `The County Executive can still remove these members without Council.`, small: `The charter stays as it is.`, src: `charter` },
      { k: `Someone who supports it`, q: !0, big: `“I think it’s really important that this council body, if we, again, confirm an appointment, should absolutely have a say in whether that appointee should be removed.”`, small: `Sunny Simon, County Council member, who proposed it, in July 2026`, src: `signal` },
      { k: `Anyone against it?`, big: `We found no named opponent.`, small: `The coverage we read quotes none. That is not the same as nobody disagreeing. A missing record is not a no.` },
      { type: `link`, link: `list`, k: `What to check next`, big: `Check which boards it covers.`, small: `The official wording is on the Board of Elections issue list, in English and Spanish.` },
      { type: `more`, k: `Your call`, big: `Is it right for you?`, small: `We do not tell you how to vote. Open Read more for the reasons, both sides, and the official wording.` },
    ],
    ask: [
      `Who do you want to have the final say when a county board member is removed?`,
      `Would a Council vote make removals more careful, or slower when speed matters?`,
      `Which of these boards matter to you, such as MetroHealth, the transit authority, or the port?`,
    ],
  },
  13: {
    name: `Responsibilities of the county law director`,
    asks: [
      [`It writes into the charter which legal work the county's law director does and which the elected prosecutor does.`, `ide0826`],
      [`The law director would handle labor negotiations, grievances and arbitrations, employment matters not in court, public records, risk management, and contracts, debt documents, and purchase orders that are not part of a lawsuit.`, `list`],
      [`The law director would give written opinions and legal advice to the County Executive, County Council, and county offices, boards, and agencies.`, `list`],
      [`The law director could not handle any court case for the county unless the prosecutor refers it.`, `list`],
      [`Nothing would stop county leaders from asking the prosecutor for advice, and the prosecutor's powers would not be limited.`, `list`],
    ],
    now: [
      [`The charter now says only that the law director is the legal advisor to and representative of the County Executive and County Council.`, `charter`],
      [`Since county government was reformed in 2010, informal agreements between the two offices have decided who handles what.`, `ide0826`],
      [`Prosecutor Mike O'Malley argued those agreements had no standing. Ohio Attorney General Dave Yost agreed in a legal opinion: without a charter change, they were not defensible in court.`, `ide0826`],
    ],
    changes: [
      [`The prosecutor would handle the county's lawsuits, whether the county is suing or being sued.`, `ide0826`],
      [`The law director would be the main legal adviser to the County Executive and County Council, and would handle labor talks and contracts.`, `ide0826`],
      [`Spokespeople for both the County Executive and the prosecutor said it writes down the duties each office already has.`, `ide0826`],
    ],
    fails: [
      [`The charter keeps its short section on the law director, with no rule dividing the work of the two offices.`, `charter`],
      [`The Attorney General wrote that agreements alone were not defensible in court without a charter change.`, `ide0826`],
    ],
    how: [
      [`County Executive Chris Ronayne proposed it. An earlier version got 5 votes for and 6 against on Aug. 4, 2026, short of what it needed.`, `min0804`],
      [`Prosecutor Mike O'Malley and the County Executive then agreed on this version.`, `ide0826`],
      [`Council approved this version by a unanimous roll call at a special meeting on Sept. 1, 2026. Three members were absent.`, `min0901`],
      [`To reach the ballot, a charter change needs the votes of eight Council members.`, `ide0805`],
      [`It passes if more than half of the votes on it are yes.`, `list`],
    ],
    said: [
      [`for`, `County Executive Chris Ronayne and Prosecutor Mike O'Malley, Aug. 26, 2026`, `Agreed to this version. Their spokespeople said it writes down the duties each office already has, Ideastream reported.`, `ide0826`],
      [`for`, `Martin Sweeney, County Council member, Sept. 1, 2026`, `“I don't like how the journey went with all the distractions going on, but at the end of the day, it worked.”`, `ide0901`],
      [`for`, `Richard Manoloff, the county's law director, Sept. 1, 2026`, `Said the new version solved the issues raised at the earlier meeting, Ideastream reported.`, `ide0901`],
      [`concern`, `Nora Hurley, county law department, Aug. 4, 2026, about the earlier version`, `“The charter amendment as it currently is submitted does not get it right. As it is currently submitted, it does not protect the future and the existence of the law department.”`, `ide0805`],
    ],
    noOpp: `We found no named person speaking against the final version. That is not the same as nobody disagreeing. A missing record is not a no.`,
    story: () => [
      { k: `Issue 13 · Everywhere in the county`, big: `Responsibilities of the county law director.`, small: `A question about the county charter. Tap through to see what it asks and what people say.` },
      { k: `What it asks`, big: `It divides the county's legal work between two offices.`, small: `The law director, whom the County Executive appoints, and the prosecutor, whom voters elect.`, src: `charter` },
      { k: `If it passes`, big: `The law director advises county government and handles contracts, labor talks, and public records.`, small: `Also employment matters and risk management, when they are not in court.` },
      { k: `If it passes`, big: `The prosecutor handles the county's court cases.`, small: `The law director could take one only if the prosecutor refers it. Nothing limits the prosecutor's powers.` },
      { k: `How it works now`, big: `The charter says only that the law director advises the County Executive and Council.`, small: `Agreements between the offices split the work. The state Attorney General wrote that, without a charter change, they were not defensible in court.`, src: `ide0826` },
      { k: `If it fails`, big: `The charter stays as it is.`, small: `It would still have no rule dividing the work of the two offices.`, src: `charter` },
      { k: `Who supports it`, big: `County Executive Chris Ronayne and Prosecutor Mike O'Malley agreed to it.`, small: `Ideastream reports their spokespeople said it writes down the duties each office already has.`, src: `ide0826` },
      { k: `Anyone against it?`, big: `We found no named opponent of this version.`, small: `County lawyers objected to an earlier version in August. The law director said this one solved that. A missing record is not a no.`, src: `ide0901` },
      { type: `link`, link: `list`, k: `What to check next`, big: `Read the line about court cases.`, small: `The official wording is on the Board of Elections issue list, in English and Spanish.` },
      { type: `more`, k: `Your call`, big: `Is it right for you?`, small: `We do not tell you how to vote. Open Read more for the reasons, both sides, and the official wording.` },
    ],
    ask: [
      `Do you want the charter to say who does the county's legal work, or leave it to agreements between the offices?`,
      `The prosecutor is elected and the law director is appointed. Does that matter to you for who handles court cases?`,
      `Read the line about court cases in the official wording. Is it clear to you?`,
    ],
  },
  14: {
    name: `Appointments to the Charter Review Commission`,
    asks: [
      [`It changes who appoints the members of the Charter Review Commission.`, `list`],
      [`The County Executive would appoint four, with no Council confirmation. Council would appoint four, with no approval needed from the County Executive.`, `list`],
      [`The County Executive would appoint one more, with Council's confirmation.`, `list`],
    ],
    now: [
      [`Every ten years, the County Executive appoints a nine-member Charter Review Commission, and Council confirms the appointments.`, `charter`],
      [`No more than five members may be from the same political party, and no more than two may be county officers or employees.`, `charter`],
      [`The commission can propose charter changes to Council, which decides whether to put them on the ballot.`, `charter`],
      [`The next commission is due in 2027.`, `signal`],
    ],
    changes: [
      [`Council and the County Executive would each choose four members without the other's approval, and share the ninth: the County Executive picks, and Council confirms.`, `list`],
    ],
    fails: [
      [`The charter stays as it is. The County Executive would appoint all nine members of the next commission, with Council's confirmation.`, `charter`],
    ],
    how: [
      [`Council member Martin J. Sweeney proposed it. A wider first version, which would also have split other board appointments, got 6 votes for and 5 against on Aug. 4, 2026, short of what it needed.`, `min0804`],
      [`Council then passed this narrower version unanimously the same night. Sunny Simon offered the new wording.`, `min0804`],
      [`To reach the ballot, a charter change needs the votes of eight Council members.`, `ide0805`],
      [`It passes if more than half of the votes on it are yes.`, `list`],
    ],
    said: [
      [`for`, `Martin J. Sweeney, County Council member, who proposed it`, `Called it a “rebalancing of the appointment process,” Signal Cleveland reported.`, `signal`],
    ],
    noOpp: `We found no named person speaking against Issue 14. That is not the same as nobody disagreeing. A missing record is not a no.`,
    /* f holds the numbers read from the official wording (cxIssueFacts) */
    story: (f) => [
      { k: `Issue 14 · Everywhere in the county`, big: `Appointments to the Charter Review Commission.`, small: `A question about the county charter. Tap through to see what it asks and what people say.` },
      { k: `What the commission does`, big: `Every ten years, nine county voters review the county charter.`, small: `They can propose changes, and Council decides whether to put them on the ballot. The next commission is due in 2027.`, src: `charter` },
      { k: `How it works now`, big: `The County Executive appoints all nine, and Council confirms them.`, small: `No more than five may be from the same political party.`, src: `charter` },
      f.ex && f.co && f.one === 1
        ? { k: `If it passes`, fig: `${f.ex} and ${f.co}`, big: `members picked by the County Executive and by Council.`, small: `Neither needs the other's approval. The County Executive picks one more, and Council confirms that one.` }
        : { k: `If it passes`, big: `Council and the County Executive would split the picks.`, small: `Open Read more for the official wording.` },
      { k: `If it fails`, big: `The County Executive appoints all nine in 2027, as now.`, small: `Council confirms them, and the charter stays as it is.`, src: `charter` },
      { k: `Someone who supports it`, big: `Martin J. Sweeney, who proposed it, called it a “rebalancing of the appointment process.”`, small: `County Council member, as quoted by Signal Cleveland`, src: `signal` },
      { k: `Anyone against it?`, big: `We found no named opponent.`, small: `The coverage we read quotes none. That is not the same as nobody disagreeing. A missing record is not a no.` },
      { type: `link`, link: `list`, k: `What to check next`, big: `Read the exact question on your ballot.`, small: `The official wording is on the Board of Elections issue list, in English and Spanish.` },
      { type: `more`, k: `Your call`, big: `Is it right for you?`, small: `We do not tell you how to vote. Open Read more for the reasons, both sides, and the official wording.` },
    ],
    ask: [
      `Who do you want choosing the people who propose changes to the county charter?`,
      `Would splitting the picks between Council and the County Executive change which ideas reach the ballot?`,
      `The next commission is chosen in 2027. Does that timing matter to you?`,
    ],
  },
};
/* LEVY-TEXT-END */

/* ---------- the numbers, read from the official wording ---------- */
const cxLevyMoney = (n, d) => `$${d == null ? Math.round(n).toLocaleString(`en-US`) : Number(n).toLocaleString(`en-US`, { minimumFractionDigits: d, maximumFractionDigits: d })}`;
const cxLevyExact = (n) => (Number.isInteger(n) ? cxLevyMoney(n) : cxLevyMoney(n, 2));   // $87.50, not $88
function cxLevyFacts(i) {
  const t = i.text.replace(/\s+/g, ` `).trim();
  const kindRaw = (t.match(/\(((?:Additional|Renewal and Increase|Renewal|Replacement|Increase)[^)]*)\)/i) || [])[1] || ``;
  const m = t.match(/\)\s+(.*?)\s+A majority affirmative vote (?:is necessary|is required) for passage\.\s*(.*)$/);
  const who = m ? m[1].replace(/\s+/g, ` `) : ``;
  const rest = m ? m[2] : t;
  const income = /Municipal Income Tax/i.test(i.title);
  const num = (rx) => { const x = rest.match(rx); return x ? Number(x[1].replace(/,/g, ``)) : null; };
  const years = rest.match(/for (?:a period of )?(a continuing period of time|(\w+) years?)\b/i);
  const rate = rest.match(/to a rate of a ([\d.]+)% levy/i), plus = rest.match(/providing for a ([\d.]+)% levy increase/i);
  const purpose = (rest.match(/for the purposes? of (.*?)(?:,? (?:that|estimated by) the County Fiscal Officer|,? commencing|; and eliminating| and a levy|,? in the sum)/i) || [])[1] || ``;
  return {
    kind: /renewal and increase/i.test(kindRaw) ? `Renewal and increase` : /renewal/i.test(kindRaw) ? `Renewal` : /additional/i.test(kindRaw) ? `New (additional)` : /increase/i.test(kindRaw) ? `Increase` : `Tax issue`,
    who, income, purpose,
    per: num(/\$(\d[\d,]*) for each \$100,000/), annual: num(/\$([\d,]+) annually/), fixed: num(/in the sum of \$([\d,]+)/),
    years: years ? (/continuing/i.test(years[1]) ? `a continuing period of time` : `${years[2]} years`) : ``,
    due: (rest.match(/first due in calendar year (\d{4})/) || [])[1] || ``,
    from: (rest.match(/(?:commencing|effective) (January 1, \d{4})/) || [])[1] || ``,
    newRate: rate ? rate[1] : ``, plus: plus ? plus[1] : ``, ends: /eliminating the tax credit/i.test(rest),
  };
}
function cxLevyIssues() {
  return Um.filter((i) => /Tax/i.test(i.title) && /Levy|Income Tax/i.test(i.title)).map((i) => ({ issue: i, facts: cxLevyFacts(i) }));
}
const CX_LEVY_KIND_LINE = {
  'New (additional)': `New money on top of what you pay now.`,
  Renewal: `Keeps a tax that is already on your bill.`,
  'Renewal and increase': `Keeps the tax you pay now and adds more.`,
  Increase: `Raises a tax you already pay.`,
};

/* ---------- the stories (Issue 10 and Issue 11): same engine as Today and the desktop Stories page ---------- */
function cxmLevyStories() {
  return cxLevyIssues().filter((x) => CX_LEVY_TEXT.issues[x.issue.number]).map(({ issue, facts: f }) => {
    const T = CX_LEVY_TEXT.issues[issue.number];
    return {
      id: `levy-${issue.number}`, label: `Issue ${issue.number}`, ini: String(issue.number), name: `Issue ${issue.number}`, when: T.name,
      deeper: { label: `See all tax issues`, kind: `sheet`, sheet: `levies`, panel: `levies` },
      source: CX_LEVY_SRC.boe,
      frames: T.story(f, cxLevyMoney).map((fr) => (fr.src ? { ...fr, src: CX_LEVY_SRC[fr.src] } : fr)),
    };
  });
}

/* ---------- the other questions on every ballot in the county (State Issue 3, county Issues 12 to 14): the same engine, no number pad ---------- */
const cxStoryIssueNo = (id) => Number(String(id).replace(/^(levy|issue)-/, ``));   // "levy-10" and "issue-12" are both the story of a ballot issue
/* a number a story shows as a big figure, read from the official wording, never typed: Issue 14's split of the commission's appointments */
function cxIssueFacts(i) {
  const t = i.text.replace(/\s+/g, ` `);
  const n = (rx) => { const x = t.match(rx); return x ? Number(x[1]) : null; };
  return {
    ex: n(/\((\d+)\) members of the Charter Review Commission shall be appointed by the County Executive, and such appointments shall not be subject to Council confirmation/),
    co: n(/\((\d+)\) members shall be appointed by the Council, and such appointments shall not be presented to the County Executive/),
    one: n(/\((\d+)\) member shall be appointed by the County Executive, subject to confirmation by Council/),
  };
}
function cxmIssueStories() {
  return Object.keys(CX_ISSUE_TEXT).map(Number).sort((a, b) => a - b).map((n) => {
    const issue = Um.find((i) => i.number === n);
    if (!issue) return null;
    const T = CX_ISSUE_TEXT[n];
    return {
      id: `issue-${n}`, label: `Issue ${n}`, ini: String(n), name: `Issue ${n}`, when: T.name,
      deeper: { label: `Open my ballot`, kind: `tab`, tab: `ballot`, panel: `ballot` },
      source: CX_LEVY_SRC.list,
      frames: T.story(cxIssueFacts(issue)).map((fr) => ({ ...fr, src: fr.src ? CX_LEVY_SRC[fr.src] : undefined, link: fr.link ? { label: `Read the official wording`, url: CX_LEVY_SRC[fr.link].url } : undefined })),
    };
  }).filter(Boolean);
}
/* every ballot-question story, the levies and the others, in ballot order (3, 10, 11, 12, 13, 14): Today, the desktop Stories page, and the Ballot tab read this one list */
function cxmBallotIssueStories() {
  return [...cxmLevyStories(), ...cxmIssueStories()].sort((a, b) => cxStoryIssueNo(a.id) - cxStoryIssueNo(b.id));
}
/* the story of one ballot issue, for a link from its row on the Ballot tab: the whole list, and where that issue sits in it */
function cxIssueStoryFor(n) {
  const list = cxmBallotIssueStories();
  const i = list.findIndex((s) => cxStoryIssueNo(s.id) === n);
  return i < 0 ? null : { list, i };
}

/* ---------- "your home's value": one number shared by the stories and the guide page, kept on this device only ---------- */
const CX_LEVY_HOME = { v: ``, subs: new Set() };
function cxLevySetHome(v) { CX_LEVY_HOME.v = v; CX_LEVY_HOME.subs.forEach((f) => f(v)); }
function useCxLevyHome() {
  const [v, set] = u.useState(CX_LEVY_HOME.v);
  u.useEffect(() => { CX_LEVY_HOME.subs.add(set); set(CX_LEVY_HOME.v); return () => CX_LEVY_HOME.subs.delete(set); }, []);
  return v;
}
/* what the typed home value does to each countywide levy */
function cxLevyHomeLines(v) {
  const n = Number(v) || 0;
  return cxLevyIssues().filter((x) => CX_LEVY_TEXT.issues[x.issue.number] && x.facts.per).map((x) => `Issue ${x.issue.number}: about ${cxLevyMoney((n * x.facts.per) / 100000)} a year.`).join(` `);
}
/* a story frame as shown right now: the "your number" frame shows the typed value as the big figure */
function cxLevyView(fr, hv) {
  if (fr.type !== `home`) return fr;
  return { ...fr, fig: cxLevyMoney(Number(hv) || 0), small: Number(hv) ? cxLevyHomeLines(hv) : fr.small };
}

/* the number pad, like a payment app: big keys, the value above them */
function CxLevyPad() {
  const v = useCxLevyHome();
  const press = (k) => {
    const cur = v === `0` ? `` : v;
    if (k === `del`) cxLevySetHome(cur.slice(0, -1));
    else if ((cur + k).length <= 9) cxLevySetHome((cur + k).replace(/^0+/, ``));
  };
  u.useEffect(() => {
    const on = (e) => {
      if (e.target.closest && e.target.closest(`input, textarea, select`)) return;
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === `Backspace`) press(`del`);
    };
    window.addEventListener(`keydown`, on);
    return () => window.removeEventListener(`keydown`, on);
  });
  return (
    <div className="cxm-keys lv-keys" role="group" aria-label="Your home's market value, number pad">
      {[`1`, `2`, `3`, `4`, `5`, `6`, `7`, `8`, `9`, `00`, `0`, `del`].map((k) => (
        <button key={k} type="button" aria-label={k === `del` ? `Delete` : k} onClick={() => press(k)}>{k === `del` ? `⌫` : k}</button>
      ))}
    </div>
  );
}

/* ---------- a source line ---------- */
function CxLevySrc({ k }) {
  const s = CX_LEVY_SRC[k];
  return s ? <span className="lv-src"> <a href={s.url} target="_blank" rel="noreferrer">Source<span className="sp-ext"> (opens in a new tab)</span></a></span> : null;
}
function CxLevyList({ rows }) {
  return <ul className="lv-list">{rows.map((r, n) => <li key={n}>{r[0]}<CxLevySrc k={r[1]} /></li>)}</ul>;
}

/* ---------- "Read more": everything behind a countywide levy, in one drop-down ---------- */
function CxLevyBody({ issue }) {
  const T = CX_LEVY_TEXT.issues[issue.number];
  return (
    <div className="lv-body">
      <h3>What it pays for</h3>
      <CxLevyList rows={T.pays} />
      <h3>What changes if it passes</h3>
      <CxLevyList rows={T.changes} />
      <h3>What happens if it fails</h3>
      <CxLevyList rows={T.fails} />
      <h3>What people have said</h3>
      <CxLevySaid rows={T.said} />
      {T.noOpp && <p className="lv-note">{T.noOpp}</p>}
      <h3>Questions to ask yourself</h3>
      <ul className="lv-list">{T.ask.map((q, n) => <li key={n}>{q}</li>)}</ul>
      <details className="lv-wording">
        <summary>The official ballot wording</summary>
        <p className="lv-wtext">{issue.text.replace(/\s+/g, ` `).trim()}</p>
      </details>
      <p className="lv-note lv-review">{CX_LEVY_REVIEW.ok ? `Read against its sources by ${CX_LEVY_REVIEW.by} on ${CX_LEVY_REVIEW.checked}.` : `Made from the sources linked above. A person has not yet read it against them.`}</p>
    </div>
  );
}
/* what named people have said, each with their side in words (and a solid or dashed outline), never a colored dot */
function CxLevySaid({ rows }) {
  return (
    <ul className="lv-said">
      {rows.map((s, n) => (
        <li key={n} className={`lv-${s[0]}`}>
          <b>{s[1]}</b>
          <span className="lv-side">{s[0] === `for` ? `Supports it` : `Raised a concern`}</span>
          <span className="lv-quote">{s[2]}</span><CxLevySrc k={s[3]} />
        </li>
      ))}
    </ul>
  );
}
/* "Read more" for State Issue 3 and county Issues 12 to 14: the same parts as a levy, with what it asks in place of what it pays for */
function CxIssueBody({ issue }) {
  const T = CX_ISSUE_TEXT[issue.number];
  return (
    <div className="lv-body">
      <h3>What it asks</h3>
      <CxLevyList rows={T.asks} />
      <h3>How it works now</h3>
      <CxLevyList rows={T.now} />
      <h3>What changes if it passes</h3>
      <CxLevyList rows={T.changes} />
      <h3>What happens if it fails</h3>
      <CxLevyList rows={T.fails} />
      <h3>How it got on the ballot</h3>
      <CxLevyList rows={T.how} />
      <h3>What people have said</h3>
      <CxLevySaid rows={T.said} />
      {T.noOpp && <p className="lv-note">{T.noOpp}</p>}
      <h3>Questions to ask yourself</h3>
      <ul className="lv-list">{T.ask.map((q, n) => <li key={n}>{q}</li>)}</ul>
      <details className="lv-wording">
        <summary>The official ballot wording</summary>
        <p className="lv-wtext">{issue.text.replace(/\s+/g, ` `).trim()}</p>
        <p className="lv-note"><CxLevySrc k="list" /></p>
      </details>
      <p className="lv-note lv-review">{CX_LEVY_REVIEW.ok ? `Read against its sources by ${CX_LEVY_REVIEW.by} on ${CX_LEVY_REVIEW.checked}.` : `Made from the sources linked above. A person has not yet read it against them.`}</p>
    </div>
  );
}
function CxLevyMore({ n }) {
  const issue = Um.find((i) => i.number === n);
  if (!issue) return null;
  return (
    <details className="lv-more-story">
      <summary>Read more</summary>
      {CX_ISSUE_TEXT[n] ? <CxIssueBody issue={issue} /> : <CxLevyBody issue={issue} />}
    </details>
  );
}

/* ---------- a tax issue in one place only (school district, city) ---------- */
function CxLevyOther({ it, home }) {
  const { issue, facts: f } = it;
  const mine = home > 0 && f.per ? (home * f.per) / 100000 : null;
  const place = f.who || cxArea(issue.area);
  const cut = f.purpose.length > 190 ? `${f.purpose.slice(0, 187).replace(/\s+\S*$/, ``)}...` : f.purpose;
  return (
    <li className="lv-other">
      <details>
        <summary>
          <span className="lv-place">{place}</span>
          <span className="lv-oneline"><span>{f.kind}</span>{` · `}<span>{f.income ? `Income tax` : f.per ? `${cxLevyMoney(f.per)} per $100,000` : `Property tax`}</span></span>
        </summary>
        <div className="lv-body">
          <p>{CX_LEVY_KIND_LINE[f.kind] || ``}</p>
          {cut && <p>{`The ballot says it is for: ${cut}`}</p>}
          {f.income && f.newRate && <p>{f.from ? `It adds ${f.plus || `0.5`} percentage point to the city income tax, for a total of ${f.newRate}%, starting ${f.from}.` : `It adds ${f.plus || `0.5`} percentage point to the city income tax, for a total of ${f.newRate}%.`}</p>}
          {f.income && f.ends && <p>It also ends the credit residents get for income tax paid to other cities.</p>}
          {!f.income && f.per && <p>{`The county estimates this is ${cxLevyMoney(f.per)} a year for each $100,000 of market value.`}</p>}
          {!f.income && f.per && mine != null && <p>{`For a home worth ${cxLevyMoney(home)}: about ${cxLevyMoney(mine)} a year.`}</p>}
          {!f.income && f.annual && <p>{`It would collect about ${cxLevyMoney(f.annual)} a year.`}</p>}
          {!f.income && !f.annual && f.fixed && <p>{`It is a fixed sum of ${cxLevyMoney(f.fixed)}.`}</p>}
          {!f.income && f.years && <p>{f.due ? `It lasts ${f.years}, and is first due in ${f.due}.` : `It lasts ${f.years}.`}</p>}
          <p className="lv-note">{/School/i.test(f.who) ? `We have not yet written what supporters and critics say about this one. Read the official wording below, and ask the school district.` : `We have not yet written what supporters and critics say about this one. Read the official wording below, and ask the city.`}</p>
          <details className="lv-wording">
            <summary>The official ballot wording</summary>
            <p className="lv-wtext">{issue.text.replace(/\s+/g, ` `).trim()}</p>
          </details>
        </div>
      </details>
    </li>
  );
}

/* ---------- the guide page (a desktop panel and a phone sheet): big tappable numbers that open the stories ---------- */
function CX_Levies({ onPad, onOpen }) {
  const all = u.useMemo(() => cxLevyIssues(), []);
  const hv = useCxLevyHome();
  const home = Number(hv) || 0;
  const county = all.filter((x) => CX_LEVY_TEXT.issues[x.issue.number]);
  const other = all.filter((x) => !CX_LEVY_TEXT.issues[x.issue.number]);
  const open = onOpen || ((n) => { CX_STORY_POS.id = `levy-${n}`; CX_STORY_POS.f = 0; CX_NAV.panel(`stories`); });
  return (
    <section className="sp lv" aria-labelledby="lv-h">
      <h1 id="lv-h">Levies and taxes on your ballot</h1>
      <p className="sp-lede">A levy is a property tax that voters decide. Tap a card for a short story: what it costs, what it pays for, what changes if it passes or fails, and what people on different sides have said. We do not tell you how to vote.</p>
      <h2 className="lv-h2">Every home in the county</h2>
      <div className="lv-tiles">
        {county.map((it) => {
          const T = CX_LEVY_TEXT.issues[it.issue.number];
          const mine = home > 0 ? (home * it.facts.per) / 100000 : null;
          return (
            <button key={it.issue.id} type="button" className="lv-tile" onClick={() => open(it.issue.number)}>
              <span className="lv-tile-kick">{`Issue ${it.issue.number} · `}<span>{it.facts.kind}</span></span>
              <b className="lv-tile-fig">{cxLevyMoney(it.facts.per)}</b>
              <span className="lv-tile-per">a year for each $100,000 of your home's value</span>
              {mine != null && <span className="lv-tile-mine">{`For your home: about ${cxLevyMoney(mine)} a year`}</span>}
              <strong>{T.name}</strong>
              <em>See the story <CXI.Arrow size={14} /></em>
            </button>
          );
        })}
      </div>
      <div className="lv-field">
        <label htmlFor="lv-home">Your home's market value (optional)</label>
        <input id="lv-home" type="text" inputMode="numeric" autoComplete="off" placeholder="For example 150,000" value={hv ? Number(hv).toLocaleString(`en-US`) : ``} onChange={(e) => cxLevySetHome(e.target.value.replace(/[^\d]/g, ``).slice(0, 9).replace(/^0+/, ``))} />
        <p className="lv-note">Type it to see a dollar figure for your home. It stays on this device and is never sent anywhere. It is an estimate, not your tax bill.</p>
        {onPad && <button type="button" className="lv-pad" onClick={onPad}>Use the number pad, or see Cleveland income tax</button>}
      </div>
      <h2 className="lv-h2">Only in some places</h2>
      <p className="lv-note">Your school district or city may have a tax issue. Open the ones for where you live.</p>
      <ul className="lv-others">{other.map((it) => <CxLevyOther key={it.issue.id} it={it} home={home} />)}</ul>
      <details className="lv-how">
        <summary>How to read a levy</summary>
        <div className="lv-body">{CX_LEVY_TEXT.how.map((h) => <p key={h[0]}><b>{h[0]}.</b> {h[1]}</p>)}</div>
      </details>
      <p className="sp-note lv-review">{CX_LEVY_REVIEW.ok ? `Read against its sources by ${CX_LEVY_REVIEW.by} on ${CX_LEVY_REVIEW.checked}.` : `The countywide stories were made from the sources linked in each one. A person has not yet read them against those sources.`}{` The cost figures come straight from the official ballot wording. Sponsorship is not a vote, and a missing record is not a no.`}</p>
      <p className="sp-note lv-review">Official source for everything on the ballot: <a href={CX_LEVY_SRC.boe.url} target="_blank" rel="noreferrer">Cuyahoga County Board of Elections<span className="sp-ext"> (opens in a new tab)</span></a>.</p>
    </section>
  );
}
