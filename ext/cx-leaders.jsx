/* Cleveland Civic Graph v5.1: priorities explained in plain English, and
   priorities compared with each council member's official sponsorship record.
   CX_LEG (Legistar snapshot) is injected by build.py ahead of this file. */

/* ---------- Shared priority store (My priorities -> My leaders) ---------- */
const CX_PRIO = { v: {}, subs: new Set() };
function cxPrioritySet(v) {
  CX_PRIO.v = v ?? {};
  CX_PRIO.subs.forEach((f) => f());
}
function useCxPriorities() {
  const [, force] = u.useState(0);
  u.useEffect(() => {
    const f = () => force((n) => n + 1);
    CX_PRIO.subs.add(f);
    return () => CX_PRIO.subs.delete(f);
  }, []);
  return CX_PRIO.v;
}
/* Navigation hooks registered by the main component each render */
const CX_NAV = { panel: () => {}, go: () => {}, priorities: () => {} };

const CX_LEVEL_LABEL = { most: `Most important`, important: `Important`, deciding: `Still deciding` };

/* ---------- Plain-English Cleveland guides for each priority ----------
   Facts verified 2026-09-24 against the linked sources. Tradeoffs and
   questions are neutral prompts, not positions. */
const CX_GUIDES = {
  cost: {
    means: `Choosing this means you want to know what public decisions cost your household: taxes, utility bills, fees, and debts the city takes on that residents pay back later.`,
    like: `Think of it like checking the monthly payment, not just the sticker price.`,
    facts: [
      [`Cleveland charges a 2.5% income tax. Residents pay it on what they earn, and people who live elsewhere pay it on work done inside the city.`, `CCA Division of Taxation`, `https://www.ccaohio.gov/tax-rates`, `2026`],
      [`Cleveland Public Power is the city's own electric company. In 2024, City Council approved its first rate increases since 1983: about $4.85 more a month in 2025 and $3.45 more in 2026.`, `Ideastream`, `https://www.ideastream.org/government-politics/2024-11-05/cleveland-city-council-approves-electricity-rate-increases-for-2025-and-2026`, `2024`],
      [`Sewer rates from the Northeast Ohio Regional Sewer District rose on Jan. 1, 2026, a little under $4 a month for the average customer.`, `NEORSD`, `https://neorsd.medium.com/new-rates-take-effect-january-1-eddccf60f7e5`, `2026`],
      [`In the 2024 reappraisal, county property values rose about 32% on average, but most tax bills rose far less, because the levies voters approve set most tax rates.`, `Ideastream`, `https://www.ideastream.org/government-politics/2024-07-09/cuyahoga-county-property-values-are-way-up-heres-what-that-means-for-property-taxes`, `2024`],
    ],
    who: [`City Council sets Cleveland Water and Cleveland Public Power rates. Changing the income tax rate needs voter approval.`, `The NEORSD board sets sewer and stormwater rates.`, `The county sets property values, and voters approve the levies that set most property tax rates.`],
    tradeoffs: [`Keeping rates low now, or paying for pipes and power lines so they do not fail later.`, `Taxing income earned in the city, or staying attractive to employers and workers.`, `Approving levies for schools and services, or keeping monthly costs down for owners and renters.`],
    ask: [`What help is there for residents who have trouble paying water, sewer, or power bills?`, `How will the 2026 power rate increase improve outages and service in our ward?`, `Which levies will be on my ballot, and what would each cost a typical homeowner?`],
  },
  housing: {
    means: `Choosing this means you care whether people can find, keep, and afford a safe home in Cleveland, as renters and as owners.`,
    like: `Think of housing rules like the rules of a board game: they decide how many houses get built, who can rent them, and what counts as safe.`,
    facts: [
      [`Cleveland gives a 15-year property tax break on new or rehabbed homes. The size of the break depends on the neighborhood. Large apartment projects must include some affordable units or pay a fee. These rules started Jan. 1, 2024.`, `City of Cleveland`, `https://www.clevelandohio.gov/city-hall/departments/community-development/programs-services/tax-abatement`, `2024`],
      [`Those tax breaks mean less money for schools for now. The county estimated the Cleveland school district went without about $41.5 million in 2025 because of abated properties.`, `Signal Cleveland`, `https://signalcleveland.org/cleveland-metropolitan-school-district-cmsd-tax-abatements-city-council-bibb-recall/`, `2025`],
      [`A 2019 city law requires landlords of older rentals to prove units are lead safe. About one-third of rental units had certificates in early 2026.`, `Signal Cleveland`, `https://signalcleveland.org/cleveland-proposes-loosening-lead-safe-law-for-some-landlords/`, `Feb. 2026`],
      [`In June 2026, Council passed Ordinance 561-2026 to license short-term rentals like Airbnbs. No more than 10% of a residential block or building can be short-term rentals.`, `Ideastream`, `https://www.ideastream.org/government-politics/2026-06-02/cleveland-sets-new-rules-for-short-term-rentals`, `June 2026`],
    ],
    who: [`City Council passes housing laws: tax abatement, lead-safe rules, rental registration, short-term rentals.`, `The mayor's departments run the programs, including Community Development, Building & Housing, and Public Health.`, `Housing Court hears housing and building-code cases.`],
    tradeoffs: [`Tax breaks that encourage building, or more revenue now for schools and services.`, `Strict safety rules that protect tenants, or lower costs for small landlords that can keep rents down.`, `Short-term rental income for owners, or quiet and stable blocks for neighbors.`],
    ask: [`How many rentals in our ward are lead-safe certified, and what happens with the rest?`, `Should abatement rules change to protect school funding, and how would that affect new building?`, `How will the short-term rental rules be enforced on my street?`],
  },
  safety: {
    means: `Choosing this means you care about preventing harm, getting help fast in an emergency, and making sure the people with power to enforce laws are held accountable.`,
    like: `Think of it like a team with a referee: players need to be able to do their jobs, and someone needs to be able to call a foul.`,
    facts: [
      [`Since 2015, Cleveland police have worked under a federal consent decree, a court-enforced reform agreement that followed a Justice Department finding of excessive force.`, `Ideastream`, `https://www.ideastream.org/law-justice/2026-05-08/judge-rejects-clevelands-request-to-end-federal-police-consent-decree`, `2026`],
      [`In May 2026, the federal judge declined to end the decree. He noted progress but found the city had not yet met all of its terms.`, `Signal Cleveland`, `https://signalcleveland.org/cleveland-police-consent-decree-solomon-oliver-what-happens-next/`, `May 2026`],
      [`Voters passed Issue 24 in 2021. It gave the 13-member Community Police Commission final authority over police policy, training, and discipline.`, `Signal Cleveland`, `https://signalcleveland.org/cleveland-police-commission-oversight-issue-24-consent-decree-clash-letters/`, `2026`],
      [`Cleveland pairs police officers with mental health clinicians on some crisis calls. There were 8 such teams in September 2025.`, `Signal Cleveland`, `https://signalcleveland.org/cleveland-expands-mental-health-crisis-response-teams/`, `Sept. 2025`],
    ],
    who: [`A federal judge oversees the consent decree, with an independent monitoring team.`, `The Community Police Commission has final say on police policy, training, and discipline under the city charter.`, `The mayor runs the Division of Police, and City Council approves its budget.`],
    tradeoffs: [`Ending federal oversight to restore local control, or keeping it until every reform is proven.`, `Hiring more officers, or spending more on crisis teams and violence prevention.`, `Strong independent civilian oversight, or simpler lines of authority inside City Hall.`],
    ask: [`Which consent decree requirements are still unfinished, and what is the plan?`, `How many mental health crisis teams serve our police district?`, `How are liquor permit and nuisance concerns in our ward being handled?`],
  },
  education: {
    means: `Choosing this means you care whether Cleveland children can reach strong schools and programs, and who gets to make those decisions.`,
    like: `Think of it like a school bus route: who draws the route decides who gets picked up, how long the ride is, and where it ends.`,
    facts: [
      [`Cleveland voters do not elect the school board. Under a 1998 Ohio law, the mayor appoints the nine-member CMSD board from names given by a nominating panel. In 2002, voters chose to keep this system.`, `Signal Cleveland`, `https://signalcleveland.org/timeline-25-years-of-mayoral-control-over-cleveland-public-schools/`, `2023`],
      [`The Cleveland Plan, passed by the state legislature in 2012, gave schools more flexibility with performance-based accountability. Voters passed a school levy in 2012 and renewed or increased it in 2016 and 2020.`, `Signal Cleveland`, `https://signalcleveland.org/timeline-25-years-of-mayoral-control-over-cleveland-public-schools/`, `2023`],
      [`In December 2025, the school board approved the Building Brighter Futures plan: 29 fewer schools by 2026-27, including 18 closed buildings, citing falling enrollment and about $30 million a year in savings.`, `Ideastream`, `https://www.ideastream.org/education/2025-12-09/cleveland-school-board-approves-sweeping-consolidation-plan`, `Dec. 2025`],
      [`Say Yes Cleveland helps CMSD and partner charter graduates pay for college. For 2026-27, it covers remaining tuition at Ohio public colleges for families earning $96,000 or less.`, `Say Yes Cleveland`, `https://sayyescleveland.org/say-yes-cleveland-scholarship-program-policy-effective-for-the-2026-2027-academic-year/`, `2026-27`],
    ],
    who: [`The mayor appoints the school board. The board hires the district CEO and approves plans like school mergers.`, `The Ohio legislature wrote the mayoral-control law and controls much of school funding.`, `Cleveland voters approve or reject school levies.`],
    tradeoffs: [`An appointed board with one clear line of responsibility, or an elected board that answers directly to voters.`, `Closing buildings to save money, or keeping schools closer to home.`, `Raising levies for schools, or keeping property taxes lower.`],
    ask: [`How are the school mergers affecting students in our ward, including students with disabilities?`, `What will happen to school buildings that close in our neighborhood?`, `How can residents weigh in on who is appointed to the school board?`],
  },
  freedom: {
    means: `Choosing this means you care about equal treatment under the law, protection from discrimination, and which personal choices government can or cannot limit.`,
    like: `Think of it like the rules of a public park: everyone gets in, and the rules apply the same way to everybody.`,
    facts: [
      [`Cleveland's fair housing law bans housing discrimination based on traits including race, religion, disability, familial status, sexual orientation, and gender identity. The city's Office of Fair Housing takes complaints at 216-664-2018.`, `City of Cleveland`, `https://www.clevelandohio.gov/city-hall/departments/community-development/programs-services/fair-housing`, `2026`],
      [`City Council created the Community Relations Board in 1945 to improve relations between racial and cultural groups.`, `Encyclopedia of Cleveland History`, `https://case.edu/ech/articles/c/cleveland-community-relations-board`, `historical`],
      [`Cuyahoga County passed a human rights law in 2018 banning discrimination based on sexual orientation and gender identity in jobs, housing, and public places countywide.`, `Cuyahoga County`, `https://cuyahogacounty.gov/county-news/county-news-detail/2020/11/30/historic-human-rights-commission-now-accepting-complaints`, `2018`],
      [`Ohio can limit what cities do. In 2024, state lawmakers banned local limits on flavored tobacco. A group of Ohio cities challenged it, and the Ohio Supreme Court heard the case in June 2026 with no ruling yet.`, `Ideastream`, `https://www.ideastream.org/2026-06-09/home-rule-questions-over-ban-on-local-flavored-tobacco-bans-go-to-ohio-supreme-court`, `June 2026`],
    ],
    who: [`City Council passes Cleveland's fair housing and nondiscrimination laws, and city offices enforce them.`, `Cuyahoga County's Human Rights Commission takes complaints under the county law.`, `The Ohio legislature can override some city laws, and Ohio courts settle home-rule disputes.`],
    tradeoffs: [`Rules shaped for Cleveland, or one set of rules across the whole state.`, `Strong enforcement of equal-treatment laws, or less cost and paperwork for landlords and businesses.`, `Overlapping city, county, and state protections, or one clear place to file a complaint.`],
    ask: [`How many fair housing complaints does the city get each year, and how are they resolved?`, `Which state laws currently limit what Cleveland can do on issues residents care about?`, `How can residents reach the Community Relations Board today?`],
  },
  growth: {
    means: `Choosing this means you care about jobs, local businesses, and whether public deals bring real opportunity to people who live here.`,
    like: `Think of it like planting a garden with public money: you want to know what grows, how long it takes, and who gets to eat from it.`,
    facts: [
      [`Cleveland's 2003 Fannie Lewis Law required residents to work 20% of construction hours on large city projects. A 2016 state law banned residency hiring quotas, and the Ohio Supreme Court upheld that state law in 2019.`, `Court News Ohio`, `https://www.courtnewsohio.gov/cases/2019/SCO/0924/180097.asp`, `2019`],
      [`In 2024, City Council created a downtown tax-increment financing (TIF) district that sets aside new property tax growth for public projects. The city projected about $3.4 billion through 2065.`, `Signal Cleveland`, `https://signalcleveland.org/understanding-clevelands-bet-on-a-tif-district-to-raise-money-for-downtown/`, `2024`],
      [`The Browns plan to move to a new domed stadium in Brook Park. In 2025, the city settled with the team's owners for $100 million plus demolition of the lakefront stadium. The state approved $600 million for the new stadium.`, `ENR`, `https://www.enr.com/articles/61587-cleveland-browns-settle-100m-dispute-paving-way-for-brook-park-stadium`, `Oct. 2025`],
    ],
    who: [`City Council approves tax incentives, TIF districts, and development deals, which the mayor's administration negotiates.`, `The Ohio legislature can limit local hiring rules and funds some big projects.`, `Courts settle disputes between the city, the state, and private parties.`],
    tradeoffs: [`Tax incentives that attract development, or more money now for schools and services.`, `Big downtown and lakefront projects, or investment spread across neighborhoods.`, `Local hiring goals, or state rules and contractor flexibility.`],
    ask: [`How much downtown TIF money will reach neighborhood projects in our ward?`, `How will the Browns settlement money be spent, and when?`, `What does the city do now to help residents get jobs on city-funded projects?`],
  },
  environment: {
    means: `Choosing this means you care about clean air and water, lead-safe homes, and who carries the health risk or the cleanup bill.`,
    like: `Think of it like a shared kitchen: whoever makes the mess, somebody has to clean it, and everyone breathes the same air.`,
    facts: [
      [`Lead is still a serious problem for Cleveland children. In 2025, 15.8% of tested children under 6 had elevated blood lead levels, far above the national estimate of about 2.5%, though the rate is falling.`, `Signal Cleveland`, `https://signalcleveland.org/childhood-lead-poisoning-numbers-dropping-in-cleveland/`, `Oct. 2025`],
      [`Project Clean Lake is a 25-year sewer project, 2011 to 2036, to cut sewage overflows into Lake Erie by about 4 billion gallons a year, mostly with huge underground tunnels.`, `NEORSD`, `https://www.neorsd.org/community/about-the-project-clean-lake-program/`, `2026`],
      [`About $2.4 billion had been spent or committed on Project Clean Lake by March 2026. Sewer customers pay for it through their bills.`, `NEORSD`, `https://www.neorsd.org/community/about-the-project-clean-lake-program/`, `March 2026`],
      [`Cleveland updated its Climate Action Plan in April 2025, aiming for net-zero emissions by 2050 and naming poor air quality, extreme heat, and heavy storms as its main climate hazards.`, `City of Cleveland`, `https://www.clevelandohio.gov/news/cleveland-releases-updated-climate-action-plans-and-community-toolkit-reaffirming-climate`, `April 2025`],
    ],
    who: [`City Council and the mayor set lead-safe rules and climate goals; the Department of Public Health enforces lead rules.`, `The NEORSD board runs Project Clean Lake under a federal agreement.`, `Federal and state environmental agencies set air and water standards.`],
    tradeoffs: [`Faster lead cleanup, or lower costs for landlords and less pressure on rents.`, `Cleaner lake water now, or lower sewer bills for decades.`, `Climate goals, or lower short-term costs for households and businesses.`],
    ask: [`How many children in our ward tested high for lead last year, and what is being done in those homes?`, `Which Climate Action Plan projects are planned for our neighborhood?`, `What help can residents get with lead repairs?`],
  },
  trust: {
    means: `Choosing this means you want to see where public money goes, who approved it, and whether it delivered what was promised.`,
    like: `Think of it like a family budget with receipts: the plan says what you meant to spend, the receipts show what you actually spent.`,
    facts: [
      [`Cleveland's 2026 budget is about $2.3 billion in total. The general fund, which pays for police, fire, EMS, and trash pickup, is about $920 million, and public safety is 46% of it.`, `Signal Cleveland`, `https://signalcleveland.org/cleveland-city-budget-2026-first-look-mayor-justin-bibb-city-council/`, `2026`],
      [`City Council passes the budget and authorizes spending. The Board of Control, made up of the mayor and department directors, then awards contracts within those limits.`, `Signal Cleveland`, `https://signalcleveland.org/clevelands-board-of-control-votes-to-spend-taxpayer-money-what-is-it-explainer/`, `2024`],
      [`Cleveland received $512 million in federal COVID recovery (ARPA) money. It must be spent by Dec. 31, 2026.`, `City of Cleveland`, `https://www.clevelandohio.gov/city-hall/office-mayor/mayors-initiatives/mayor-bibbs-rescue-transformation-plan`, `2026`],
      [`In 2023, voters narrowly rejected Issue 38, which would have set aside 2% of the city budget for projects residents chose directly.`, `Axios Cleveland`, `https://www.axios.com/local/cleveland/2023/11/08/cleveland-voters-reject-participatory-budgeting-issue-38`, `2023`],
    ],
    who: [`The mayor proposes the budget; City Council amends and passes it.`, `The Board of Control approves contracts within the limits Council set.`, `Voters decide charter changes, such as Issue 38.`],
    tradeoffs: [`Spending more on services now, or keeping reserves for hard times.`, `Fast contract approvals, or more public review and debate.`, `Residents choosing projects directly, or leaving budget choices to elected officials.`],
    ask: [`How much ARPA money is still unspent, and will it all be used by the Dec. 31, 2026 deadline?`, `Where can I see the contracts approved for projects in our ward?`, `What results were promised for this year's budget, and how will we know if they happened?`],
  },
};

/* ---------- Topic matching: plain keyword rules, shown to the reader ---------- */
const CX_MATCH_RULES = {
  cost: [`rate`, `rates`, `fee`, `fees`, `fare`, `fares`, `income tax`, `admissions tax`, `parking`, `utility bill*`, `assistance`, `relief`, `affordab*`],
  housing: [`housing`, `residential`, `rental*`, `tenant*`, `landlord*`, `homeowner*`, `home repair*`, `dwelling*`, `abatement*`, `land bank`, `land reutilization`, `lead safe`, `lead-safe`, `demolition*`, `vacant`, `short-term rental*`, `affordable`],
  safety: [`police`, `public safety`, `fire department`, `division of fire`, `fire station*`, `firefight*`, `emergency medical`, `ems`, `911`, `crime*`, `violence`, `firearm*`, `gun*`, `camera*`, `dangerous`, `nuisance*`, `liquor permit*`, `traffic safety`],
  education: [`school*`, `cmsd`, `education*`, `student*`, `youth`, `library`, `libraries`, `college*`, `universit*`, `scholarship*`, `literacy`, `early childhood`, `pre-k`],
  freedom: [`civil rights`, `discriminat*`, `equal`, `equity`, `fair housing`, `accessib*`, `ada`, `disabilit*`, `immigra*`, `language access`, `human rights`, `privacy`, `inclusion`, `voting`, `voter*`],
  growth: [`tax increment`, `economic development`, `business*`, `job`, `jobs`, `employment`, `workforce`, `small business*`, `retail`, `redevelopment`, `enterprise zone`, `incentive*`, `port of cleveland`, `port authority`, `entrepreneur*`],
  environment: [`environment*`, `climate`, `tree*`, `park`, `parks`, `green`, `lead poisoning`, `lead hazard*`, `lead safe`, `lead-safe`, `stormwater`, `sewer*`, `pollution`, `air quality`, `recycl*`, `waste`, `solar`, `energy efficien*`, `brownfield*`, `lake erie`, `river*`, `sustainability`, `data center*`],
  trust: [`appropriation*`, `budget*`, `audit`, `audits`, `auditor`, `auditors`, `bonds`, `bond`, `debt`, `american rescue`, `arpa`, `transparen*`, `public records`, `ethics`, `revenue*`, `pension*`],
};
const CX_MATCH_RE = Object.fromEntries(Object.entries(CX_MATCH_RULES).map(([p, words]) => [p, words.map((k) => {
  const stem = k.endsWith(`*`);
  const body = k.replace(/\*$/, ``).replace(/[.*+?^${}()|[\]\\]/g, `\\$&`);
  return [k.replace(/\*$/, ``), new RegExp(`\\b${body}${stem ? `` : `\\b`}`, `i`)];
})]));
function cxMatch(title) {
  const t = String(title);
  const out = {};
  for (const [pid, rules] of Object.entries(CX_MATCH_RE)) {
    const hit = rules.find(([, re]) => re.test(t));
    if (hit) out[pid] = hit[0];
  }
  return out;
}

/* Legistar sponsor names -> ward seats */
const CX_SPONSOR_WARD = {
  "Joseph T. Jones": 1, "Kevin L. Bishop": 2, "Deborah A. Gray": 3, "Deborah Gray": 3, "Kris Harsh": 4, "Richard A. Starr": 5,
  "Blaine A. Griffin": 6, "Austin Davis": 7, "Austin N. Davis": 7, "Stephanie Howse-Jones": 8, "Stephanie D. Howse-Jones": 8,
  "Kevin Conwell": 9, "Michael Polensek": 10, "Michael D. Polensek": 10, "Nikki Hudson": 11, "Tanmay Shah": 12, "Brian Kazy": 13,
  "Jasmin Santana": 14, "Charles Slife": 15, "Charles J. Slife": 15,
};
const CX_ADMIN_SPONSORS = new Set([`By Departmental Request`, `Mayor's Administration`, `Justin M. Bibb`]);
const CX_SUBSTANTIVE = new Set([`Emergency Ordinance`, `Ordinance`, `Emergency Resolution`, `Resolution`]);

function cxShortTitle(t) {
  let s = String(t).replace(/^AN? (EMERGENCY )?(ORDINANCE|RESOLUTION)\s*/i, ``).trim();
  s = s.charAt(0).toUpperCase() + s.slice(1);
  return s.length > 170 ? `${s.slice(0, 167).trim()}…` : s;
}

/* ---------- What kind of action a measure is, in plain words ---------- */
const CX_ACTIONS = [
  { id: `liquor`, label: `Spoke up about liquor permits in the ward`, test: (m) => /liquor permit/i.test(m.title),
    means: `Council members can object to a state liquor permit for a bar or store, usually after neighbors raise concerns. The state makes the final decision, but the objection puts the neighborhood's concerns on the record. Withdrawing an objection usually means the concern was worked out.` },
  { id: `event`, label: `Approved events on city streets`, test: (m) => /issuance of a permit|permit for the|street closure/i.test(m.title),
    means: `Races, festivals, and parades that use public streets need Council's approval.` },
  { id: `landmark`, label: `Named Cleveland Landmarks`, test: (m) => /landmark/i.test(m.title),
    means: `A landmark designation means future changes to a building's outside get reviewed by the Cleveland Landmarks Commission.` },
  { id: `honor`, label: `Gave honorary street names`, test: (m) => /honorary|co-?nam|naming of|renam/i.test(m.title),
    means: `An honorary street name recognizes a person or group. It does not change anyone's address.` },
  { id: `position`, label: `Took public positions`, test: (m) => /Resolution/.test(m.type),
    means: `A resolution states Council's view or asks another group to act. It is not a law and does not spend money.` },
  { id: `law`, label: `Proposed changes to city law`, test: (m) => /codified ordinances|to amend|enacting|repeal|chapter \d/i.test(m.title),
    means: `These add to or change the city code: the rules people, landlords, and businesses must follow.` },
  { id: `money`, label: `Moved city spending, grants, or agreements`, test: (m) => /authoriz|contract|agreement|grant|appropriat|purchase|lease|bond|fund/i.test(m.title),
    means: `These let the city spend money, accept grants, or sign agreements. Many are steps for projects already planned.` },
  { id: `other`, label: `Other actions`, test: () => !0, means: `Measures that do not fit the groups above. Open each one to read it.` },
];
function cxAction(m) {
  return CX_ACTIONS.find((a) => a.test(m)).id;
}
const CX_ACTION_BY_ID = Object.fromEntries(CX_ACTIONS.map((a) => [a.id, a]));
const CX_NUM_WORDS = [`no`, `one`, `two`, `three`, `four`, `five`, `six`, `seven`, `eight`, `nine`, `ten`];
function cxNum(n) {
  return n <= 10 ? CX_NUM_WORDS[n] : String(n);
}

let CX_LEG_INDEX = null;
function cxLegIndex() {
  if (CX_LEG_INDEX) return CX_LEG_INDEX;
  const measures = CX_LEG.matters.filter((m) => CX_SUBSTANTIVE.has(m.type)).map((m) => ({
    ...m, topics: cxMatch(m.title), short: cxShortTitle(m.title), action: cxAction(m),
    admin: m.sponsors.some((s) => CX_ADMIN_SPONSORS.has(s)),
  }));
  const seats = _h.map(([ward, name]) => ({ ward, name, id: `ward-${ward}`, portrait: "/" + "portraits/ward-" + String(ward).padStart(2, "0") + ".webp", items: [] }));
  const admin = { ward: 0, name: `Mayor's administration`, id: `mayor`, portrait: "/" + "portraits/mayor-bibb.webp", items: [] };
  for (const m of measures) {
    m.sponsors.forEach((s, i) => {
      const w = CX_SPONSOR_WARD[s];
      if (w) seats[w - 1].items.push({ m, lead: i === 0, role: m.admin ? `dept` : i === 0 ? `own` : `joined` });
    });
    if (m.admin) admin.items.push({ m, lead: !0, role: `dept` });
  }
  CX_LEG_INDEX = { measures, seats, admin, total: CX_LEG.matters.length };
  return CX_LEG_INDEX;
}


/* ---------- Guide shown inside each priority card ---------- */
function CX_PriorityGuide({ id, level }) {
  const g = CX_GUIDES[id];
  if (!g) return null;
  const chosen = !!level && level !== ``;
  return (
    <details className="cx-guide" open={chosen}>
      <summary><CXI.Book size={14} /> {chosen ? `What choosing this means in Cleveland` : `What this means in Cleveland`}</summary>
      <p className="cx-guide-means">{g.means}</p>
      <p className="cx-guide-like">{g.like}</p>
      <h4>In Cleveland</h4>
      <ul className="cx-guide-facts">
        {g.facts.map(([t, src, url, when]) => (
          <li key={t}>{t} <a href={url} target="_blank" rel="noreferrer">{src}, {when} <CXI.Ext size={11} /></a></li>
        ))}
      </ul>
      <h4>Who decides</h4>
      <ul>{g.who.map((t) => <li key={t}>{t}</li>)}</ul>
      <h4>What people weigh</h4>
      <ul className="cx-guide-tradeoffs">{g.tradeoffs.map((t) => <li key={t}>{t}</li>)}</ul>
      <h4>Questions to ask</h4>
      <ul>{g.ask.map((t) => <li key={t}>{t}</li>)}</ul>
      <button type="button" className="cx-link-button" onClick={() => CX_NAV.panel(`leaders`)}>See what council members did on this <CXI.Arrow size={13} /></button>
    </details>
  );
}

/* ---------- Letter drafted from the reader's own choices ---------- */
function cxWords(t, n) {
  const w = String(t).replace(/[…]+$/, ``).split(/\s+/);
  return w.length > n ? `${w.slice(0, n).join(` `).replace(/[,;:]$/, ``)}...` : w.join(` `);
}
const CX_SHORT = { cost: `Costs`, housing: `Housing`, safety: `Safety`, education: `Schools`, freedom: `Equal treatment`, growth: `Jobs & business`, environment: `Air, water, health`, trust: `Public money` };
function cxLetter(seat, chosenIds, levels, items, likedIds = []) {
  const ordered = [...chosenIds].sort((a, b) => (levels[a] === `most` ? 0 : 1) - (levels[b] === `most` ? 0 : 1));
  const labels = Object.fromEntries(wm.map((w) => [w.id, w.label]));
  const isAdmin = seat.ward === 0;
  const rank = { own: 0, joined: 1, dept: 2 };
  const lines = [];
  lines.push(isAdmin ? `Dear Mayor Bibb,` : `Dear Council Member ${seat.name.split(` `).slice(-1)[0]},`);
  lines.push(``);
  lines.push(`I am a Cleveland resident${isAdmin ? `` : ` in Ward ${seat.ward}`}. I am writing to share the issues that matter most to me and to ask a few questions.`);
  lines.push(``);
  const liked = items.filter((x) => likedIds.includes(x.m.id));
  if (liked.length) {
    lines.push(`Proposals I would like to understand better:`);
    liked.forEach((x) => lines.push(`- ${x.m.file}: "${cxWords(x.m.short, 14)}" What will this change for residents, and when?`));
    lines.push(``);
  }
  ordered.slice(0, 3).forEach((pid) => {
    const g = CX_GUIDES[pid];
    const mine = items.filter((x) => x.m.topics[pid]).sort((a, b) => rank[a.role] - rank[b.role])[0];
    lines.push(`${labels[pid]}${levels[pid] === `most` ? ` (most important to me)` : ``}.`);
    if (mine) lines.push(`I saw ${mine.m.file} in the city's legislative record with your name on it: "${cxWords(mine.m.short, 14)}" I would like to understand how it affects residents.`);
    lines.push(`My question: ${g.ask[0]}`);
    lines.push(``);
  });
  lines.push(`Thank you for your time. I would appreciate a reply.`);
  lines.push(``);
  lines.push(`Sincerely,`);
  lines.push(`[Your name]`);
  lines.push(`[Your street or neighborhood]`);
  return lines.join(`\n`);
}

function cxDid(o, j) {
  const pl = (n) => (n === 1 ? `proposal` : `proposals`);
  if (o && j) return `led ${cxNum(o)} and joined ${cxNum(j)} ${pl(j)}`;
  if (o) return `led ${cxNum(o)} ${pl(o)}`;
  return `joined ${cxNum(j)} ${pl(j)}`;
}

/* Plain-English one-paragraph summary of a member's own work */
function cxSummary(seat, own, joined, dept) {
  if (!seat.ward) return `City departments sent Council ${dept.length} requests this year, such as contracts, grants, and project steps. A council member signs each one so it can be introduced.`;
  if (!own.length) return `${seat.name} did not lead any proposals in this record. They joined ${cxNum(joined.length)} colleagues' proposals and signed ${dept.length} routine department requests.`;
  const groups = Object.entries(own.reduce((a, x) => ((a[x.m.action] = (a[x.m.action] ?? 0) + 1), a), {})).sort((a, b) => b[1] - a[1]);
  const [topId, topN] = groups[0];
  const more = groups.slice(1, 3).map(([id, n]) => `${CX_ACTION_BY_ID[id].label.toLowerCase()} (${cxNum(n)})`);
  const lead = `In 2026, ${seat.name} led ${cxNum(own.length)} ${own.length === 1 ? `proposal` : `proposals`}.`;
  const biggest = own.length === 1 ? ` It was in this group: ${CX_ACTION_BY_ID[topId].label.toLowerCase()}.` : ` The biggest group: ${CX_ACTION_BY_ID[topId].label.toLowerCase()} (${cxNum(topN)}).`;
  return `${lead}${biggest}${more.length ? ` Also: ${more.join(`; `)}.` : ``} They joined ${cxNum(joined.length)} colleagues' proposals and signed ${dept.length} routine department requests.`;
}

function CX_MeasureList({ list, chosen, limit = 6 }) {
  const [all, setAll] = u.useState(!1);
  const shown = all ? list : list.slice(0, limit);
  return (
    <>
      <ul className="cx-measures">
        {shown.map(({ m }) => (
          <li key={m.id}>
            <a href={m.url} target="_blank" rel="noreferrer"><strong>{m.file}</strong> {m.short} <CXI.Ext size={11} /></a>
            <span className="cx-tags">
              <span className={`cx-status-tag ${m.status === `Passed` ? `passed` : ``}`}>{m.status === `Passed` ? `Passed` : `Status: ${m.status}`}</span>
              {chosen.filter((p) => m.topics[p]).map((p) => <span key={p} className="cx-prio-tag">Your priority: {CX_SHORT[p]}</span>)}
            </span>
          </li>
        ))}
      </ul>
      {list.length > limit && <button type="button" className="cx-link-button" onClick={() => setAll(!all)}>{all ? `Show fewer` : `Show all ${list.length}`}</button>}
    </>
  );
}


/* ---------- Profile view: one leader at a time, bento tiles ---------- */
function CX_Profile({ seat, parts, chosen, liked, onLike, onPrev, onNext, pos, total, onOpen }) {
  const startX = u.useRef(null);
  const isAdmin = seat.ward === 0;
  const first = isAdmin ? `The administration` : seat.name.split(` `)[0];
  const mine = [...parts.own, ...parts.joined];
  const common = chosen.filter((k) => mine.some((x) => x.m.topics[k]));
  const groups = Object.entries(parts.own.reduce((a, x) => ((a[x.m.action] = (a[x.m.action] ?? 0) + 1), a), {})).sort((a, b) => b[1] - a[1]);
  const pick = [...parts.own].sort((a, b) =>
    Number(chosen.some((k) => b.m.topics[k])) - Number(chosen.some((k) => a.m.topics[k])) ||
    Number(b.m.status === `Passed`) - Number(a.m.status === `Passed`) ||
    (b.m.passed ?? b.m.intro).localeCompare(a.m.passed ?? a.m.intro))[0];
  const deptPick = isAdmin ? [...parts.dept].sort((a, b) => Number(chosen.some((k) => b.m.topics[k])) - Number(chosen.some((k) => a.m.topics[k])))[0] : null;
  const feature = pick ?? deptPick;
  const role = isAdmin ? `City departments` : seat.ward === 6 ? `Council President` : `Council member`;
  function onKey(ev) {
    if (ev.key === `ArrowLeft`) { ev.preventDefault(); onPrev(); }
    if (ev.key === `ArrowRight`) { ev.preventDefault(); onNext(); }
  }
  return (
    <div className="cxp" role="region" aria-roledescription="profile" aria-label={`${seat.name}, profile ${pos} of ${total}. Use left and right arrow keys to move between profiles.`}
      tabIndex={0} onKeyDown={onKey}
      onPointerDown={(e) => { startX.current = e.target.closest(`button,a`) ? null : e.clientX; }}
      onPointerUp={(e) => { if (startX.current == null) return; const dx = e.clientX - startX.current; startX.current = null; if (dx > 60) onPrev(); if (dx < -60) onNext(); }}>
      <div className="cxp-tile cxp-name cxp-light">
        <div className="cxp-nav">
          <button type="button" onClick={onPrev} aria-label="Previous profile"><CXI.Back size={16} /></button>
          <span className="cxp-mono">{isAdmin ? `city: departments` : `ward: `}{!isAdmin && <b>{seat.ward}</b>}{seat.id === CX_PLACE.v && <b className="cxp-yours"> · your ward</b>}<span className="cxp-count">{pos}/{total}</span></span>
          <button type="button" onClick={onNext} aria-label="Next profile"><CXI.Arrow size={16} /></button>
        </div>
        <h2 className="cxp-h">{seat.name}<span className="cxp-period">.</span></h2>
        <p className="cxp-sub">{role} · Cleveland</p>
      </div>
      <div className="cxp-tile cxp-photo">
        <img src={globalThis.__cxAsset ? globalThis.__cxAsset(seat.portrait) : seat.portrait} alt={`Official portrait of ${seat.name}`} />
      </div>

      <div className="cxp-tile cxp-common cxp-blue">
        <div className="cxp-hatch" aria-hidden="true" />
        <span className="cxp-label">Common ground</span>
        {chosen.length ? (
          <>
            <strong className="cxp-big">{common.length}<small>/{chosen.length}</small></strong>
            <span className="cxp-caption">of your priorities show up in what {first} {isAdmin ? `sent to Council` : `led or joined`} this year</span>
            <ul className="cxp-dots">
              {chosen.map((k) => (
                <li key={k} className={common.includes(k) ? `on` : ``}><i aria-hidden="true" />{CX_SHORT[k]}<span className="sr-only">{common.includes(k) ? `: yes` : `: not yet`}</span></li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <strong className="cxp-big">?</strong>
            <span className="cxp-caption">Pick your priorities above to see where you overlap.</span>
          </>
        )}
      </div>

      <div className="cxp-tile cxp-prompt cxp-light">
        <span className="cxp-q">{isAdmin ? `Most of what we sent Council was about…` : `This year, most of what I led…`}</span>
        {isAdmin ? (
          <strong className="cxp-a">City contracts, grants, and project steps.</strong>
        ) : groups.length ? (
          <>
            <strong className="cxp-a">{CX_ACTION_BY_ID[groups[0][0]].label}.</strong>
            <span className="cxp-meta">{cxNum(groups[0][1])} of {cxNum(parts.own.length)} proposals {first} led</span>
          </>
        ) : (
          <strong className="cxp-a">Nothing led yet this year.</strong>
        )}
      </div>

      <div className="cxp-tile cxp-roles cxp-dark">
        {!isAdmin && (
          <>
            <div><span><i className="cx-dot cx-dot-own" aria-hidden="true" />Led</span><b>{parts.own.length}</b></div>
            <div><span><i className="cx-dot cx-dot-joined" aria-hidden="true" />Joined</span><b>{parts.joined.length}</b></div>
          </>
        )}
        <div className="cxp-roles-dept"><span><i className="cx-dot cx-dot-dept" aria-hidden="true" />{isAdmin ? `Requests sent` : `Signed for the city`}</span><b>{parts.dept.length}</b></div>
      </div>

      <div className="cxp-tile cxp-list cxp-gray">
        <span className="cxp-label">On what you care about</span>
        {chosen.length ? (
          <ul>
            {chosen.map((k) => {
              const o = parts.own.filter((x) => x.m.topics[k]).length;
              const j = parts.joined.filter((x) => x.m.topics[k]).length;
              const d = parts.dept.filter((x) => x.m.topics[k]).length;
              const val = isAdmin ? (d ? `${d} sent` : `None`) : o || j ? [o ? `Led ${o}` : ``, j ? `Joined ${j}` : ``].filter(Boolean).join(` · `) : `Nothing yet`;
              const on = isAdmin ? d > 0 : o + j > 0;
              return <li key={k} className={on ? `on` : ``}><i aria-hidden="true" /><span>{CX_SHORT[k]}</span><b>{val}</b></li>;
            })}
          </ul>
        ) : <p className="cxp-empty">Choose priorities to fill this in.</p>}
      </div>

      <div className="cxp-tile cxp-feature cxp-light">
        <span className="cxp-q">{isAdmin ? `A request on your priorities…` : `Something I led this year…`}</span>
        {feature ? (
          <>
            <span className="cxp-kind">{CX_ACTION_BY_ID[feature.m.action].label}</span>
            <p className="cxp-title">{cxWords(feature.m.short, 24)}</p>
            <div className="cxp-feature-foot">
              <span className={`cxp-status ${feature.m.status === `Passed` ? `passed` : ``}`}><i aria-hidden="true" />{feature.m.status === `Passed` ? `Passed` : feature.m.status}</span>
              <a href={feature.m.url} target="_blank" rel="noreferrer">{feature.m.file} <CXI.Ext size={12} /></a>
              <button type="button" className={`cxp-heart ${liked.includes(feature.m.id) ? `on` : ``}`} aria-pressed={liked.includes(feature.m.id)} onClick={() => onLike(feature.m.id)}>
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-7.5-10.1A4.4 4.4 0 0 1 12 7.6a4.4 4.4 0 0 1 7.5 2.8c0 5.5-7.5 10.1-7.5 10.1z" /></svg>
                {liked.includes(feature.m.id) ? `Saved to my letter` : `Ask about this`}
              </button>
            </div>
          </>
        ) : <p className="cxp-title">No proposal to show yet.</p>}
      </div>

      <div className="cxp-tile cxp-latest cxp-gray">
        <CX_Latest seat={seat} />
      </div>

      <div className="cxp-tile cxp-cta cxp-blue-soft">
        <button type="button" className="cxp-primary" onClick={() => onOpen(`story`)}>Read the full story <CXI.Arrow size={16} /></button>
        <button type="button" className="cxp-secondary" onClick={() => cxOpenProfile(seat.id)}>Read the formal profile <CXI.Arrow size={16} /></button>
        <button type="button" className="cxp-secondary" onClick={() => onOpen(`letter`)}><CXI.File size={15} /> Write to {isAdmin ? `the mayor` : first}</button>
        <span className="cxp-fine">Receipts, not scores. Sponsorship is not a vote.</span>
      </div>
    </div>
  );
}

/* ---------- My leaders page ---------- */
function CX_Leaders({ onGo, onPanel }) {
  const stored = useCxPriorities();
  const idx = u.useMemo(() => cxLegIndex(), []);
  const storedIds = wm.map((w) => w.id).filter((id) => stored[id]);
  const [localIds, setLocalIds] = u.useState([]);
  const chosen = storedIds.length ? storedIds : localIds;
  const levels = storedIds.length ? stored : Object.fromEntries(localIds.map((i) => [i, `important`]));
  const [sel, setSel] = u.useState(null);
  const [copied, setCopied] = u.useState(``);
  const [view, setView] = u.useState(`profiles`);
  const [order, setOrder] = u.useState(`ward`);
  const [cur, setCur] = u.useState(() => { const f = CX_FOCUS.v; CX_FOCUS.v = ``; return /^ward-\d+$|^mayor$/.test(f) ? f : /^ward-\d+$/.test(CX_PLACE.v) ? CX_PLACE.v : `ward-1`; });
  const [liked, setLiked] = u.useState([]);
  const cxLetterRef = u.useRef(null);
  const [focusLetter, setFocusLetter] = u.useState(!1);
  const seatsAll = [...idx.seats, idx.admin];
  const split = (s) => ({
    own: s.items.filter((x) => x.role === `own`),
    joined: s.items.filter((x) => x.role === `joined`),
    dept: s.items.filter((x) => x.role === `dept`),
  });
  const touches = (items) => chosen.map((p) => [p, items.filter((x) => x.m.topics[p]).length]).filter(([, n]) => n > 0);
  const seat = seatsAll.find((s) => s.id === sel);
  const parts = seat ? split(seat) : null;
  const [letter, setLetter] = u.useState(``);
  const cxLastSeat = u.useRef(null);
  const cxCloseRef = u.useRef(null);
  const maxTotal = Math.max(1, ...seatsAll.flatMap((s0) => chosen.map((k) => s0.items.filter((x) => x.m.topics[k]).length)));
  function closeDrawer() {
    setSel(null);
    setCopied(``);
    const el = cxLastSeat.current;
    if (el) setTimeout(() => el.focus({ preventScroll: !0 }), 0);
  }
  u.useEffect(() => {
    if (!sel) return;
    cxCloseRef.current?.focus({ preventScroll: !0 });
    const onKey = (ev) => { if (ev.key === `Escape`) { ev.stopPropagation(); closeDrawer(); } };
    window.addEventListener(`keydown`, onKey, !0);
    const prev = document.body.style.overflow;
    document.body.style.overflow = `hidden`;
    return () => { window.removeEventListener(`keydown`, onKey, !0); document.body.style.overflow = prev; };
  }, [sel]);
  u.useEffect(() => { if (seat) setLetter(cxLetter(seat, chosen, levels, [...parts.own, ...parts.joined, ...parts.dept], liked)); }, [sel, chosen.join(`,`), liked.join(`,`)]);
  u.useEffect(() => { if (sel && focusLetter) { setTimeout(() => { cxLetterRef.current?.scrollIntoView({ block: `start` }); cxLetterRef.current?.querySelector(`textarea`)?.focus({ preventScroll: !0 }); }, 80); setFocusLetter(!1); } }, [sel, focusLetter]);
  const commonCount = (s0) => { const p0 = split(s0); const mine = s0.ward ? [...p0.own, ...p0.joined] : p0.dept; return chosen.filter((k) => mine.some((x) => x.m.topics[k])).length; };
  const deck = order === `common`
    ? [...idx.seats].sort((a, b) => commonCount(b) - commonCount(a) || a.ward - b.ward).concat(idx.admin)
    : [...idx.seats, idx.admin];
  const curIdx = Math.max(0, deck.findIndex((s0) => s0.id === cur));
  const curSeat = deck[curIdx];
  const step = (d) => setCur(deck[(curIdx + d + deck.length) % deck.length].id);
  const toggleLike = (id) => setLiked((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));
  async function copy() {
    try { await navigator.clipboard.writeText(letter); setCopied(`Copied. Paste it into an email or letter.`); }
    catch { setCopied(`Select the text above and copy it.`); }
  }
  const byPriorityFirst = (list) => [...list].sort((a, b) => Number(chosen.some((p) => b.m.topics[p])) - Number(chosen.some((p) => a.m.topics[p])));
  const retrieved = CX_LEG.retrieved_at.slice(0, 10);
  return (
    <section className="civic-page cx-leaders">
      <span className="atlas-eyebrow"><CXI.Users size={15} /> MY PRIORITIES × WHAT LEADERS DID</span>
      <h1>What has your council member actually worked on?</h1>
      <p className="civic-lede">Pick what matters to you. Then choose a council member to see, in plain words, the proposals they led this year and how those connect to your priorities. Everything comes from Cleveland's official legislative record.</p>

      <div className="civic-card cx-howto">
        <h2>How to read this</h2>
        <p className="cx-guide-like">Think of City Council like a group project. The person who writes a proposal is the <strong>lead</strong>. Classmates can <strong>join</strong> it. City departments also turn in a lot of routine paperwork, like contract renewals, and a council member has to <strong>sign</strong> it so it can move forward. Signing that paperwork is part of the job, like a manager signing timesheets. It says little about what they personally care about.</p>
        <dl className="cx-roles">
          <div><dt><i className="cx-dot cx-dot-own" aria-hidden="true" /> Led</dt><dd>Their own proposals. This is the clearest sign of what they are working on.</dd></div>
          <div><dt><i className="cx-dot cx-dot-joined" aria-hidden="true" /> Joined</dt><dd>A colleague's proposal they signed on to support.</dd></div>
          <div><dt><i className="cx-dot cx-dot-dept" aria-hidden="true" /> Signed for a city department</dt><dd>Routine requests from the mayor's departments. The Council President and committee chairs sign many of these as part of their role.</dd></div>
        </dl>
        <p className="atlas-muted">This is not a vote record and not a score. Sponsoring a proposal is not voting for it. How each member voted, where the City Record prints it, is under Profiles.</p>
      </div>

      <div className="civic-card cx-prio-picker">
        <div className="cx-prio-head">
          <h2>Your priorities</h2>
          {storedIds.length
            ? <button type="button" className="cx-link-button" onClick={() => CX_NAV.priorities()}>Change them in My priorities <CXI.Arrow size={13} /></button>
            : <span className="atlas-muted">Nothing chosen in My priorities yet. Tap to try some here; they are not saved.</span>}
        </div>
        <div className="cx-chips cx-chip-buttons">
          {wm.map((w) => {
            const on = chosen.includes(w.id);
            return (
              <button type="button" key={w.id} aria-pressed={on} disabled={!!storedIds.length && !on}
                onClick={() => !storedIds.length && setLocalIds((l) => (l.includes(w.id) ? l.filter((x) => x !== w.id) : [...l, w.id]))}>
                {on && <CXI.Check size={12} />} {w.label}{storedIds.length && levels[w.id] ? ` · ${CX_LEVEL_LABEL[levels[w.id]] ?? ``}` : ``}
              </button>
            );
          })}
        </div>
      </div>

      <div className="cxp-toolbar">
        <div className="cxp-seg" role="group" aria-label="View">
          <button type="button" aria-pressed={view === `profiles`} onClick={() => setView(`profiles`)}>Profiles</button>
          <button type="button" aria-pressed={view === `grid`} onClick={() => setView(`grid`)}>See everyone</button>
        </div>
        {view === `profiles` && (
          <div className="cxp-seg" role="group" aria-label="Order">
            <button type="button" aria-pressed={order === `ward`} onClick={() => setOrder(`ward`)}>Ward order</button>
            <button type="button" aria-pressed={order === `common`} onClick={() => setOrder(`common`)}>Most common ground first</button>
          </div>
        )}
      </div>
      {view === `profiles` && curSeat && (
        <>
          <CX_Profile seat={curSeat} parts={split(curSeat)} chosen={chosen} liked={liked} onLike={toggleLike}
            onPrev={() => step(-1)} onNext={() => step(1)} pos={curIdx + 1} total={deck.length}
            onOpen={(what) => { cxLastSeat.current = document.activeElement; setFocusLetter(what === `letter`); setSel(curSeat.id); }} />
          <div className="cxp-strip" role="group" aria-label="Jump to a council member">
            {deck.map((s0) => (
              <button type="button" key={s0.id} aria-pressed={s0.id === curSeat.id} onClick={() => setCur(s0.id)} title={s0.name}>
                <img src={globalThis.__cxAsset ? globalThis.__cxAsset(s0.portrait) : s0.portrait} alt="" />
                <span>{s0.ward ? `W${s0.ward}` : `City`}</span>
              </button>
            ))}
          </div>
          {liked.length > 0 && <p className="cx-note">{liked.length} {liked.length === 1 ? `proposal` : `proposals`} saved to your letters. They stay on this device.</p>}
        </>
      )}
      {view === `grid` && <>
      <h2 className="cx-h2">Council members, by ward</h2>
      <p className="cx-note">Each bar counts this year's proposals on one of your priorities, split by role. Select a member to open a plain-English explanation on the right.</p>
      <div className="cx-bar-legend" aria-hidden="true">
        <span><i className="cx-dot cx-dot-own" /> Led</span>
        <span><i className="cx-dot cx-dot-joined" /> Joined</span>
        <span><i className="cx-dot cx-dot-dept" /> Signed for a city department</span>
      </div>
      <div className="cx-seat-grid">
        {seatsAll.map((s) => {
          const p = split(s);
          const count = (list, k) => list.filter((x) => x.m.topics[k]).length;
          return (
            <button type="button" key={s.id} className={`cx-seat ${sel === s.id ? `selected` : ``}`} aria-pressed={sel === s.id} aria-haspopup="dialog"
              onClick={(ev) => { cxLastSeat.current = ev.currentTarget; setSel(s.id); }}>
              <span className="cx-seat-top">
                <img src={globalThis.__cxAsset ? globalThis.__cxAsset(s.portrait) : s.portrait} alt="" width="40" height="40" />
                <span><strong>{s.name}</strong><small>{s.ward ? `Ward ${s.ward}${s.ward === 6 ? ` · Council President` : ``}` : `City departments`}</small></span>
              </span>
              {chosen.length > 0 && (
                <span className="cx-bars">
                  {chosen.map((k) => {
                    const o = count(p.own, k), j = count(p.joined, k), d = count(p.dept, k);
                    const scale = (n) => `${(n / maxTotal) * 100}%`;
                    return (
                      <span key={k} className="cx-bar-row" aria-label={`${CX_SHORT[k]}: led ${o}, joined ${j}, signed for departments ${d}`}>
                        <span className="cx-bar-label">{CX_SHORT[k]}</span>
                        <span className="cx-bar-track">
                          <i className="cx-seg-own" style={{ width: scale(o) }} />
                          <i className="cx-seg-joined" style={{ width: scale(j) }} />
                          <i className="cx-seg-dept" style={{ width: scale(d) }} />
                        </span>
                        <b>{o + j + d}</b>
                      </span>
                    );
                  })}
                </span>
              )}
              <span className="cx-seat-foot">
                {s.ward ? `Led ${p.own.length} · Joined ${p.joined.length} · Signed ${p.dept.length}` : `Sent ${p.dept.length} requests to Council`}
                <span className="cx-seat-open">What this means <CXI.Arrow size={12} /></span>
              </span>
            </button>
          );
        })}
      </div>
      </>}

      {seat && (
        <>
        <div className="cx-drawer-scrim" onClick={closeDrawer} aria-hidden="true" />
        <aside className="cx-drawer" role="dialog" aria-modal="true" aria-labelledby="cx-drawer-title">
          <div className="cx-drawer-bar">
            <span className="atlas-eyebrow">WHAT THIS MEANS</span>
            <button type="button" ref={cxCloseRef} onClick={closeDrawer} aria-label="Close explanation"><CXI.X size={18} /></button>
          </div>
        <article className="cx-seat-detail">
          <div className="cx-seat-detail-head">
            <img src={globalThis.__cxAsset ? globalThis.__cxAsset(seat.portrait) : seat.portrait} alt="" width="64" height="64" />
            <div>
              <span className="atlas-eyebrow">{seat.ward ? `WARD ${seat.ward}` : `CITY ADMINISTRATION`}</span>
              <h2 id="cx-drawer-title">{seat.name}</h2>
            </div>
            <button type="button" className="cx-link-button" onClick={() => onGo(seat.ward ? `council` : `administration`, seat.id)}>Open on the map <CXI.Arrow size={13} /></button>
          </div>
          <p className="cx-summary">{cxSummary(seat, parts.own, parts.joined, parts.dept)}</p>

          {seat.ward > 0 && chosen.length > 0 && (
            <div className="cx-touch-box">
              <h3>What this means for your priorities</h3>
              <ul>
                {chosen.map((p) => {
                  const o = parts.own.filter((x) => x.m.topics[p]).length;
                  const j = parts.joined.filter((x) => x.m.topics[p]).length;
                  const d = parts.dept.filter((x) => x.m.topics[p]).length;
                  const label = wm.find((w) => w.id === p).label;
                  return (
                    <li key={p}>
                      <strong>{label}:</strong>{` `}
                      {o || j
                        ? `${seat.name.split(` `)[0]} ${cxDid(o, j)} on this.`
                        : `No proposals ${seat.name.split(` `)[0]} led or joined this year matched this by title.`}
                      {d > 0 ? ` They also signed ${cxNum(d)} department ${d === 1 ? `request` : `requests`} on it.` : ``}
                    </li>
                  );
                })}
              </ul>
              <p className="atlas-muted">A title match is a starting point. Open a proposal to see what it actually does.</p>
            </div>
          )}

          {seat.ward > 0 && (
            <section className="cx-topic">
              <h3><i className="cx-dot cx-dot-own" aria-hidden="true" /> What {seat.name.split(` `)[0]} led, in plain words <span>{parts.own.length}</span></h3>
              {!parts.own.length && <p className="atlas-muted">No proposals led by this member are in the 2026 record.</p>}
              {CX_ACTIONS.map((a) => {
                const list = byPriorityFirst(parts.own.filter((x) => x.m.action === a.id));
                if (!list.length) return null;
                return (
                  <div key={a.id} className="cx-action-group">
                    <h4>{a.label} <span>{list.length}</span></h4>
                    <p className="cx-action-means"><strong>What this means for you:</strong> {a.means}</p>
                    <CX_MeasureList list={list} chosen={chosen} limit={4} />
                  </div>
                );
              })}
            </section>
          )}

          {seat.ward > 0 && parts.joined.length > 0 && (
            <details className="cx-more">
              <summary><i className="cx-dot cx-dot-joined" aria-hidden="true" /> Proposals they joined ({parts.joined.length})</summary>
              <CX_MeasureList list={byPriorityFirst(parts.joined)} chosen={chosen} />
            </details>
          )}

          {parts.dept.length > 0 && (
            <details className="cx-more" open={seat.ward === 0}>
              <summary><i className="cx-dot cx-dot-dept" aria-hidden="true" /> {seat.ward ? `Routine department requests they signed` : `Requests city departments sent to Council`} ({parts.dept.length})</summary>
              <p className="atlas-muted">City departments send requests like contract renewals, grant applications, and project steps. {seat.ward ? `Signing one is part of the job and does not show personal support.` : `Council still has to approve each one.`} Items that match your priorities are listed first.</p>
              <CX_MeasureList list={byPriorityFirst(parts.dept)} chosen={chosen} />
            </details>
          )}

          <section className="cx-letter" ref={cxLetterRef}>
            <h3><CXI.File size={16} /> Write to {seat.ward ? seat.name : `the mayor`}</h3>
            <p className="atlas-muted">A starting draft built from your priorities and this record. Edit it in your own words. Nothing is sent from here.</p>
            <label htmlFor="cx-letter-text" className="sr-only">Letter draft</label>
            <textarea id="cx-letter-text" value={letter} onChange={(e) => setLetter(e.target.value)} rows={14} />
            <div className="cx-letter-actions">
              <button type="button" className="civic-action" onClick={copy}>Copy letter</button>
              <a href={seat.ward ? `https://www.clevelandcitycouncil.gov/find-my-ward` : `https://www.clevelandohio.gov/contact`} target="_blank" rel="noreferrer">{seat.ward ? `Find contact details on the official ward directory` : `City contact directory`} <CXI.Ext size={12} /></a>
              {copied && <span className="cx-copied" role="status">{copied}</span>}
            </div>
          </section>
        </article>
        </aside>
        </>
      )}

      <details className="context-notes cx-method">
        <summary><CXI.Help size={16} /> How this page works</summary>
        <ul>
          <li>Source: Cleveland's Legistar legislative database, {CX_LEG.count} items introduced since Jan. 1, 2026, retrieved {retrieved}. Ceremonial resolutions, communications, and agenda items are left out, leaving {idx.measures.length} ordinances and resolutions.</li>
          <li>"Led" means the member is listed first as sponsor and no city department requested it. "Joined" means they are a later sponsor on a member's proposal. "Signed for a department" means the record lists "By Departmental Request."</li>
          <li>The plain-word groups (liquor permits, events, landmarks, positions, law changes, spending) come from each official title.</li>
          <li>A proposal is tagged with a priority when its title contains one of these words, so some will be missed and some will be loose fits: {Object.entries(CX_MATCH_RULES).map(([p, words]) => `${CX_SHORT[p]}: ${words.join(`, `)}`).join(` · `)} (a * means any word that starts that way).</li>
          <li>Individual roll-call votes are published in Council's minutes (the City Record), not in this database, and are not loaded yet.</li>
          <li>To answer yes or no on real 2026 council proposals and see which members backed the same ones, choose "Cleveland City Council" in <button type="button" className="cx-link-button" onClick={() => onPanel(`constellation`)}>My constellation</button>. Statewide and federal candidates are there too.</li>
        </ul>
      </details>
    </section>
  );
}


/* ---------- v5.9: City Council in the constellation (proposals they backed) ----------
   Each question is a real 2026 Council proposal led by members (not a department request).
   A member who sponsored it is recorded as backing it. A member who did not sponsor it has
   no record, which the constellation already treats as missing, never as a no. */
const CX_COUNCIL_Q = [
  [`556-2026`, `cc-datacenters`, `Pause on new data centers`, `Should Cleveland pause permits for new data centers while it writes rules for them?`, `This ordinance paused zoning permits, occupancy certificates, and utility permits for data centers in the city. Supporters point to electricity, water, and neighborhood effects; others weigh jobs and investment.`],
  [`561-2026`, `cc-rentals`, `Short-term rental rules`, `Should Cleveland license short-term rentals like Airbnb and limit them in single-family neighborhoods?`, `This ordinance created a licensing system for short-term rentals, updated the hotel-style lodging tax, and changed which neighborhoods allow them. It balances neighbors' concerns with owners' income.`],
  [`114-2026`, `cc-ice`, `Ohio immigration enforcement bills`, `Should Cleveland oppose state bills that would require local agencies and hospitals to cooperate with federal immigration enforcement or lose funding?`, `This resolution states Council's position on Ohio House Bills 26, 42, and 281 and Senate Bill 172. A resolution is a statement; it does not change state law.`],
  [`975-2026`, `cc-library`, `Library workers' contract`, `Should Council publicly urge Cleveland Public Library leaders to reach a contract with the library workers' union?`, `This resolution supported library employees in their contract talks with SEIU District 1199. The library board, not Council, negotiates the contract.`],
  [`240-2026`, `cc-food`, `Grants for food deserts`, `Should Ohio create grants to bring grocery stores and healthy food to neighborhoods without them?`, `This resolution urged the General Assembly to pass House Bill 543, the Food Desert Elimination Grant Program. The state decides; Council adds its support.`],
  [`107-2026`, `cc-outages`, `FirstEnergy outage rules`, `Should state regulators reject FirstEnergy's requests to allow longer restoration times and more outages per year?`, `This resolution asked the Public Utilities Commission of Ohio to reject the requests and investigate repeated outages. PUCO, a state agency, makes the decision.`],
  [`239-2026`, `cc-nil`, `Student athletes and endorsements`, `Should middle and high school athletes in Ohio be allowed to earn money from their name, image, and likeness?`, `This resolution opposed Ohio House Bill 661, which would bar it. It is a statement of position; the legislature decides.`],
  [`111-2026`, `cc-repair`, `Home repair from ward funds`, `Should council members use their wards' neighborhood funds to pay for home repairs for older residents?`, `This ordinance funded a home repair program run by Community Housing Solutions from five wards' Neighborhood Equity Funds. Each ward's fund is steered by its council member.`],
];
const CX_COUNCIL_PEOPLE = _h.map(([w, name]) => ({ id: `council-ward-${w}`, name, party: `Ward ${w}`, status: `valid`, chosen: !1 }));
const CX_FOCUS = { v: `` };
function cxOpenLeader(id) {
  CX_FOCUS.v = /^mayor-/.test(id) ? `mayor` : String(id).replace(/^council-/, ``);
  CX_NAV.panel(`leaders`);
}
(function cxCouncilAlign() {
  const byFile = new Map(CX_LEG.matters.map((m) => [m.file, m]));
  for (const [file, id, title, question, explanation] of CX_COUNCIL_Q) {
    const m = byFile.get(file);
    if (!m) continue;
    const when = `Introduced ${m.intro}${m.passed ? `, passed ${m.passed}` : ``} · file ${file}`;
    Wm.push({ id, title, question, explanation: [explanation, cxStatusSentence(m)].filter(Boolean).join(` `), kind: `sponsor`, scope: `council`, date: when, url: m.url });
    m.sponsors.forEach((s, i) => {
      const w = CX_SPONSOR_WARD[s];
      if (!w) return;
      const name = _h.find(([n]) => n === w)?.[1] ?? s;
      Gm.push({
        candidate: `council-ward-${w}`,
        question: id,
        answer: `yes`,
        detail: `${name} ${i === 0 ? `led` : `co-sponsored`} ${file}.`,
        scenario: `Sponsoring is a public sign of support. It is not a floor vote, and it does not show how other members voted.`,
        tradeoff: `Members who did not sponsor may still have voted for it. Their votes are in the City Record minutes, which are not loaded yet.`,
      });
    });
  }
})();

/* ---------- v5.10: Mayor Bibb in the constellation (proposals his administration sent) ----------
   Records come from Legistar: sponsor "Mayor's Administration" or "Justin M. Bibb", or "By Departmental
   Request" (a city department, which reports to the mayor, asked Council to consider it). */
const CX_MAYOR_Q = [
  [`557-2026`, `my-dora`, `Outdoor drinking in Playhouse Square`, `Should Cleveland create an outdoor refreshment area in the Playhouse Square Theatre District, where adults can carry drinks from participating businesses outside?`, `This ordinance approved a designated outdoor refreshment area (DORA) and its public health and safety rules. Ohio law lets cities set these up; supporters point to foot traffic for businesses, others to litter, noise, and policing.`],
  [`683-2026`, `my-flock`, `License plate reader cameras`, `Should Cleveland police keep using Flock Safety's automated license plate reader cameras?`, `This ordinance renewed the license and maintenance for the police division's Flock system; Council shortened the renewal to six months. People weigh help with investigations against privacy and data-sharing concerns.`],
  [`605-2026`, `my-dogs`, `New dangerous dog law`, `Should Cleveland replace its dog safety law with new rules for nuisance, dangerous, and vicious dogs?`, `This ordinance repealed the old chapter on dogs that threaten public safety and wrote new rules and penalties. It affects owners, neighbors, and how the city enforces.`],
  [`1031-2026`, `my-counsel`, `Lawyers for tenants facing eviction`, `Should the city fund Legal Aid to provide lawyers for eligible tenants in eviction cases?`, `This ordinance would carry out Cleveland's right-to-counsel law in Housing Court through agreements led by The Legal Aid Society.`],
  [`620-2026`, `my-solar`, `City solar power`, `Should the city build solar power generation, using contracts, grants, and gifts to pay for it?`, `This ordinance set how the city will build solar facilities through Public Utilities and related departments. Several council members also signed on.`],
  [`117-2026`, `my-budget`, `The 2026 city budget`, `Should Council pass the mayor's 2026 operating budget for all city departments?`, `This is the yearly spending plan for daily city operations. The mayor proposes it; Council can change it and must pass it.`],
  [`664-2026`, `my-brookpark`, `Brook Park land deal`, `Should Cleveland settle its long legal fight with Brook Park by paying Brook Park and giving it land, in exchange for all tax revenue from the I-X Center area?`, `This ordinance, sent in the mayor's name, amends a 2001 agreement between the two cities about the airport, the I-X Center, and the Emerald Park economic zone. It needs federal aviation approval to take effect.`],
  [`245-2026`, `my-meters`, `Parking meter money`, `Should part of the city's parking meter profits go into a fund used only for street safety and getting around?`, `This ordinance would move street meter money into the General Fund and set aside a share in a new Parking Benefits Fund.`],
  [`615-2026`, `my-eastside-tif`, `East Side development district`, `Should the city create an East Side tax increment financing district, where taxes on new building pay for public improvements there?`, `In a TIF district, owners of new improvements make payments in place of some property taxes, and that money funds roads and other public work in the district. Part of the payments go to the Cleveland schools.`],
  [`622-2026`, `my-permit-fees`, `Cheaper permits for new homes`, `Should the city waive building permit fees for new one- to three-family homes in the East Side district, and halve them for larger housing?`, `This ordinance lowered a cost of building new housing in one area of the East Side. Supporters see more homes; others weigh the permit revenue the city gives up.`],
  [`624-2026`, `my-lead`, `Replacing lead water lines`, `Should the city keep replacing lead and galvanized water service lines with copper?`, `This ordinance funded year five of the Division of Water's replacement program, including consultants and materials.`],
  [`765-2026`, `my-screening`, `Weapons scanners at police headquarters`, `Should the city buy weapons-screening scanners for the new police headquarters under a four-year contract?`, `This ordinance approved equipment, installation, maintenance, and software for Evolv screening systems at the new headquarters.`],
  [`938-2026`, `my-violence`, `Community violence prevention`, `Should the city keep funding community groups that work to interrupt and prevent violence?`, `This ordinance changed the terms of the Community Based Violence Intervention and Prevention Initiative, part of the city's Cleveland Thrive program.`],
  [`31-2026`, `my-youthjobs`, `Summer jobs for young people`, `Should the city fund a summer jobs program for youth and young adults?`, `This ordinance hired Youth Opportunities Unlimited to run the city's Summer 2026 Youth and Young Adult Employment Program, for eighteen months with options to renew.`],
  [`931-2026`, `my-stadium`, `Paying back stadium repairs`, `Should the city reimburse the Browns for emergency repairs they made to the city-owned stadium?`, `This ordinance would repay the Cleveland Browns Stadium Company for emergency repairs at Huntington Bank Field.`],
];
const CX_MAYOR_PEOPLE = [{ id: `mayor-bibb`, name: `Justin M. Bibb`, party: `Mayor of Cleveland`, status: `valid`, chosen: !1 }];
(function cxMayorAlign() {
  const byFile = new Map(CX_LEG.matters.map((m) => [m.file, m]));
  for (const [file, id, title, question, explanation] of CX_MAYOR_Q) {
    const m = byFile.get(file);
    if (!m) continue;
    const named = m.sponsors.some((x) => x === `Mayor's Administration` || x === `Justin M. Bibb`);
    const dept = m.sponsors.includes(`By Departmental Request`);
    if (!named && !dept) continue;
    const when = `Introduced ${m.intro}${m.passed ? `, passed ${m.passed}` : `, status: ${m.status}`} · file ${file}`;
    Wm.push({ id, title, question, explanation: [explanation, cxStatusSentence(m)].filter(Boolean).join(` `), kind: `mayor`, scope: `mayor`, date: when, url: m.url });
    Gm.push({
      candidate: `mayor-bibb`,
      question: id,
      answer: `yes`,
      detail: named ? `The official record lists the mayor's administration as the sponsor of ${file}.` : `A city department, part of the mayor's administration, asked Council to consider ${file} ("By Departmental Request").`,
      scenario: `Sending a proposal shows the administration backs it. Council still decides whether it passes.`,
      tradeoff: `The mayor may have spoken about this elsewhere; public statements are not loaded here yet.`,
    });
  }
})();
