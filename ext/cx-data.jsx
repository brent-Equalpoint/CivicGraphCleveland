/* Cleveland Civic Graph v5 rebuild: extension data.
   Runs inside the CivicAtlas module scope, after Lh/Rh/zh/Ih/_h/Th/jh/Ph exist.
   Every record here is either reused from the compiled Sep 23 data or carries a
   public source and a conservative evidence label. Nothing is imported as fact
   from example files. */

const CX_CHECKED = `2026-09-24`;
const CX_BUILD = { version: `v5 rebuild`, rebuilt: `2026-09-24`, base: `Sep 23 compiled release (Agentic Bench build)`, sources: `Sep 22, 2026` };

function cxPick(id, patch) {
  const n = Lh.find((e) => e.id === id);
  return n ? { ...n, ...patch } : null;
}

/* ---------- Room: Cities & municipalities ---------- */
const CX_MUNI_LAYERS = [
  { id: `cx-city`, label: `City of Cleveland`, color: `#ff8777`, description: `Cleveland's own elected offices.` },
  { id: `cx-neighbors`, label: `Neighboring governments`, color: `#ff9b65`, description: `Separate cities and villages with their own leaders.` },
  { id: `cx-county`, label: `Cuyahoga County`, color: `#aaa4ff`, description: `County offices that serve many communities.` },
  { id: `cx-regional`, label: `Regional authorities`, color: `#7ed9c4`, description: `Public bodies whose work crosses city lines.` },
  { id: `cx-courts`, label: `Courts across boundaries`, color: `#e7c961`, description: `Courts whose jurisdiction follows law, not city lines.` },
];

function cxMuniNodes() {
  const own = (id, name, label, kind, layer, level, summary, region, source, url, evidence = `official`) => ({
    id, name, label, kind, layer, level, summary, region, source, url, evidence, checked: CX_CHECKED,
  });
  return [
    cxPick(`people`, {}),
    cxPick(`cleveland`, { layer: `cx-city`, level: 1 }),
    cxPick(`mayor`, { layer: `cx-city`, level: 2 }),
    cxPick(`council`, { layer: `cx-city`, level: 2 }),
    own(`cx-bratenahl`, `Village of Bratenahl`, `Bratenahl`, `municipality`, `cx-neighbors`, 1,
      `A separate village government next to Cleveland on the Lake Erie shore. It has its own elected officials, rules, and services.`,
      `Village of Bratenahl`, `Village of Bratenahl`, `https://www.bratenahl.org/`),
    own(`cx-east-cleveland`, `City of East Cleveland`, `East Cleveland`, `municipality`, `cx-neighbors`, 1,
      `A separate city with its own mayor, council, and services. The name includes "Cleveland," but East Cleveland residents vote for East Cleveland offices, not Cleveland's.`,
      `City of East Cleveland`, `City of East Cleveland`, `https://www.eastcleveland.org/`),
    own(`cx-other-municipalities`, `Other Cuyahoga County communities`, `Other communities`, `municipality`, `cx-neighbors`, 2,
      `Cuyahoga County contains many separate cities, villages, and townships. Each has its own leadership and local rules. This release does not load the full roster; an address lookup confirms where you live.`,
      `Cuyahoga County`, `Board of Elections address lookup`, `https://boe.cuyahogacounty.gov/voters/Find-Voting-Information-by-Address`, `missing`),
    cxPick(`county`, { layer: `cx-county`, level: 1 }),
    cxPick(`county-executive`, { layer: `cx-county`, level: 2 }),
    cxPick(`county-council`, { layer: `cx-county`, level: 2 }),
    cxPick(`boe`, { layer: `cx-county`, level: 2 }),
    own(`cx-county-landbank`, `Cuyahoga County Land Bank`, `County Land Bank`, `board`, `cx-county`, 3,
      `A countywide land-reuse organization that acquires, stabilizes, and returns vacant or tax-delinquent properties to productive use.`,
      `Cuyahoga County`, `Cuyahoga Land Bank`, `https://cuyahogalandbank.org/`, `organization`),
    cxPick(`rta`, { layer: `cx-regional`, level: 1 }),
    own(`cx-neorsd`, `Northeast Ohio Regional Sewer District`, `NEORSD`, `department`, `cx-regional`, 2,
      `A regional public utility for wastewater treatment and stormwater programs. It serves Cleveland and member communities, so one sewer decision can reach across city lines.`,
      `District service area`, `NEORSD service area`, `https://www.neorsd.org/about/service-area-and-facilities/`),
    own(`cx-noaca`, `Northeast Ohio Areawide Coordinating Agency`, `NOACA`, `board`, `cx-regional`, 2,
      `The regional agency for transportation and environmental planning in Northeast Ohio. Its plans can shape road and transit funding that crosses municipal lines.`,
      `Northeast Ohio planning region`, `NOACA`, `https://www.noaca.org/`),
    cxPick(`municipal-court`, { layer: `cx-courts`, level: 1 }),
    cxPick(`appeals`, { layer: `cx-courts`, level: 2 }),
  ].filter(Boolean);
}

function cxMuniEdges() {
  const ed = (source, target, relation, note, evidence = `official`, url) => ({
    id: `cx-${source}-${target}`, source, target, relation, note, evidence, url,
  });
  return [
    ed(`people`, `cleveland`, `authorizes`, `Cleveland residents are the represented public and elect city leadership.`),
    ed(`people`, `mayor`, `elects`, `Cleveland voters elect the mayor citywide.`),
    ed(`people`, `council`, `elects`, `Each of Cleveland's 15 wards elects one council member.`),
    ed(`cleveland`, `cx-bratenahl`, `is separate from`, `Neighboring governments share a border, not authority. Each keeps its own elected officials and rules.`, `official`, `https://www.bratenahl.org/`),
    ed(`cleveland`, `cx-east-cleveland`, `is separate from`, `East Cleveland is its own city. A similar name does not create a shared government.`, `official`, `https://www.eastcleveland.org/`),
    ed(`cx-other-municipalities`, `county`, `are located in`, `A complete list of municipalities and boundaries is not loaded in this release.`, `missing`),
    ed(`county`, `people`, `provides county services to`, `County services include Cleveland residents; city and county powers remain distinct.`, `official`, `https://cuyahogacounty.gov/`),
    ed(`county`, `county-executive`, `includes`, `Organizational membership. The offices retain the powers assigned by law.`, `official`, `https://cuyahogacounty.gov/`),
    ed(`county`, `county-council`, `includes`, `Organizational membership. The offices retain the powers assigned by law.`, `official`, `https://cuyahogacounty.gov/`),
    ed(`boe`, `people`, `administers elections for`, `The county Board of Elections runs elections for Cleveland and other communities in the county.`, `official`, `https://boe.cuyahogacounty.gov/`),
    ed(`cx-county-landbank`, `county`, `works across`, `Land-reuse work is countywide, not limited to one city.`, `organization`, `https://cuyahogalandbank.org/`),
    ed(`rta`, `people`, `provides transit to`, `Regional transit service crosses city lines. Its board, not City Council, approves transit policy and budgets.`, `official`, `https://www.riderta.com/board`),
    ed(`cx-neorsd`, `cleveland`, `serves`, `Cleveland is inside the district's service area along with other member communities.`, `official`, `https://www.neorsd.org/about/service-area-and-facilities/`),
    ed(`cx-noaca`, `county`, `plans across`, `Regional transportation and environmental plans cover communities throughout the planning region.`, `official`, `https://www.noaca.org/`),
    ed(`municipal-court`, `cleveland`, `hears cases from`, `Cleveland Municipal Court handles cases within its jurisdiction under Ohio law.`, `official`, `https://clevelandmunicipalcourt.org/`),
    ed(`municipal-court`, `cx-bratenahl`, `has civil jurisdiction in`, `Municipal civil jurisdiction includes Cleveland and Bratenahl. A court's reach follows law, not city hall.`, `official`, `https://clevelandmunicipalcourt.org/`),
    ed(`appeals`, `municipal-court`, `reviews eligible appeals from`, `The appeal guide covers municipal court decisions. Eligibility and deadlines depend on the particular case.`, `official`, `https://appeals.cuyahogacounty.gov/pro-se`),
  ];
}

/* ---------- Room: Civic ecosystem (ported from Ecosystem Architecture v1) ---------- */
const CX_ECO_LAYERS = [
  { id: `eco-government`, label: `Government & open data`, color: `#ff8777` },
  { id: `eco-health`, label: `Health & care`, color: `#63cbb8` },
  { id: `eco-learning`, label: `Learning & youth`, color: `#aaa4ff` },
  { id: `eco-culture`, label: `Culture & information`, color: `#ed7da9` },
  { id: `eco-systems`, label: `Land, systems & environment`, color: `#e7c961` },
  { id: `eco-economy`, label: `Jobs & philanthropy`, color: `#76c997` },
  { id: `eco-neighborhood`, label: `Neighborhood networks`, color: `#ff9b65` },
];
/* [id, name, short, layer, public?, relation (node -> residents), summary, residents, evidence, source label, url] */
const CX_ECO_RAW = [
  [`city`, `City of Cleveland`, `City`, `eco-government`, 1, `serves`, `The municipal government that delivers services, proposes budgets, enforces local code, and coordinates with regional and state partners.`, `Residents elect a mayor and council members; departments carry out the city's work.`, `official`, `City of Cleveland`, `https://www.clevelandohio.gov/`],
  [`council`, `Cleveland City Council`, `Council`, `eco-government`, 1, `represents`, `The legislative body that considers ordinances, approves spending, conducts hearings, and represents wards.`, `Ward residents are represented by an elected council member.`, `official`, `Council website`, `https://www.clevelandcitycouncil.gov/`],
  [`opendata`, `Cleveland Open Data`, `Open data`, `eco-government`, 1, `makes evidence visible to`, `The city's open-data program provides machine-readable public information for residents, researchers, and civic builders.`, `Residents connect through the ability to inspect, reuse, and question public data.`, `official`, `Open data portal`, `https://data.clevelandohio.gov/`],
  [`metrohealth`, `MetroHealth System`, `MetroHealth`, `eco-health`, 1, `treats & anchors`, `A public hospital system with a safety-net mission, clinical care, public health work, and major neighborhood investment.`, `Patients, employees, taxpayers, and county residents are connected through care and governance.`, `official`, `MetroHealth overview`, `https://www.metrohealth.org/en/about-us/`],
  [`clinic`, `Cleveland Clinic`, `Cleveland Clinic`, `eco-health`, 0, `treats & researches`, `A nonprofit academic medical system whose hospitals, research, workforce, and policy work shape regional health outcomes.`, `Patients and residents connect through care, jobs, research, and community programs.`, `organization`, `About Cleveland Clinic`, `https://my.clevelandclinic.org/about`],
  [`uh`, `University Hospitals`, `UH`, `eco-health`, 0, `treats & teaches`, `A regional academic health system that links hospitals, clinical training, research, and community health.`, `Residents connect as patients, students, workers, and neighbors.`, `organization`, `University Hospitals`, `https://www.uhhospitals.org/`],
  [`cwru`, `Case Western Reserve University`, `Case Western`, `eco-learning`, 0, `educates & researches`, `A research university with programs in law, medicine, engineering, social science, and civic innovation.`, `Students, faculty, patients, and residents connect through learning and research.`, `organization`, `University site`, `https://case.edu/`],
  [`csu`, `Cleveland State University`, `Cleveland State`, `eco-learning`, 1, `educates locally`, `An urban public university connected to workforce development, public service, law, health, and downtown civic life.`, `Residents connect through degrees, public programs, jobs, and research.`, `official`, `University site`, `https://www.csuohio.edu/`],
  [`tric`, `Cuyahoga Community College`, `Tri-C`, `eco-learning`, 1, `trains & transfers`, `A public community college serving workforce training, associate degrees, adult learners, and transfer pathways.`, `Learners connect to employers, universities, and public services through education.`, `official`, `Tri-C site`, `https://www.tri-c.edu/`],
  [`schools`, `Cleveland Metropolitan School District`, `CMSD`, `eco-learning`, 1, `educates`, `The public school district serving Cleveland students and families. The mayor appoints the voting board members from nominees.`, `Families connect through schools, services, budgets, and board decisions.`, `official`, `District`, `https://www.clevelandmetroschools.org/`],
  [`cpl`, `Cleveland Public Library`, `Public Library`, `eco-learning`, 1, `teaches & informs`, `A public library system that provides learning, research, digital access, public programs, and trusted information.`, `Residents connect through branches, collections, programs, and civic learning.`, `official`, `Library`, `https://www.cpl.org/`],
  [`cac`, `Cuyahoga Arts & Culture`, `Arts & Culture`, `eco-culture`, 1, `funds culture for`, `A county-supported public arts fund that awards grants and supports cultural participation across Cuyahoga County.`, `Residents connect through grants, programs, artists, and cultural organizations.`, `official`, `Grant programs`, `https://www.cacgrants.org/grants/`],
  [`arts`, `Cleveland arts institutions`, `Arts network`, `eco-culture`, 0, `creates & convenes with`, `Museums, theaters, libraries, festivals, and artist networks create places for expression, learning, and public dialogue.`, `Residents participate as audiences, artists, volunteers, and funders.`, `inferred`, `Arts & Culture grants`, `https://www.cacgrants.org/`],
  [`ideastream`, `Ideastream Public Media`, `Ideastream`, `eco-culture`, 0, `informs`, `A public media network providing reporting, civic information, arts coverage, and educational programming.`, `Residents connect through journalism and public-service media.`, `organization`, `Ideastream`, `https://www.ideastream.org/`],
  [`landbank`, `Cuyahoga County Land Bank`, `County Land Bank`, `eco-systems`, 0, `repositions land for`, `A countywide land-reuse organization that acquires, stabilizes, and returns vacant or tax-delinquent properties to productive use.`, `Neighborhoods connect through housing, demolition, redevelopment, and property decisions.`, `organization`, `Land Bank`, `https://cuyahogalandbank.org/`],
  [`city-landbank`, `Cleveland Land Bank`, `City Land Bank`, `eco-systems`, 1, `offers parcels to`, `A city program that makes publicly controlled parcels available for neighborhood development and reuse.`, `Residents connect through lot sales, redevelopment, and neighborhood planning.`, `official`, `City land bank`, `https://www.clevelandohio.gov/city-hall/departments/economic-development/land-bank`],
  [`rta`, `Greater Cleveland RTA`, `GCRTA`, `eco-systems`, 1, `moves`, `The regional transit authority connecting residents to jobs, schools, healthcare, courts, and civic life.`, `Riders connect through fares, service decisions, routes, and board oversight.`, `official`, `GCRTA`, `https://www.riderta.com/`],
  [`port`, `Port of Cleveland`, `Port`, `eco-systems`, 1, `moves goods for`, `A public port authority supporting maritime trade, logistics, jobs, environmental projects, and regional economic development.`, `Residents connect through employment, tax base, freight, and environmental decisions.`, `official`, `Port overview`, `https://www.portofcleveland.com/about/`],
  [`neorsd`, `Northeast Ohio Regional Sewer District`, `NEORSD`, `eco-systems`, 1, `manages water for`, `A regional public utility managing wastewater treatment, stormwater programs, and infrastructure across the service area.`, `Residents connect through sewer bills, projects, rate decisions, and environmental outcomes.`, `official`, `District site`, `https://www.neorsd.org/`],
  [`gcp`, `Greater Cleveland Partnership`, `GCP`, `eco-economy`, 0, `organizes employers around`, `A regional business organization that convenes employers, advocates on policy, and supports economic development.`, `Residents connect through jobs, investment, and policy advocacy.`, `organization`, `GCP`, `https://www.gcpartnership.com/`],
  [`foundation`, `Cleveland Foundation`, `Foundation`, `eco-economy`, 0, `funds initiatives for`, `A community foundation that makes grants, convenes partners, and supports civic, neighborhood, education, health, and arts work.`, `Residents connect through grantmaking, nonprofit services, and community initiatives.`, `organization`, `Foundation`, `https://www.clevelandfoundation.org/`],
  [`networks`, `Faith & neighborhood networks`, `Neighborhood networks`, `eco-neighborhood`, 0, `organizes with`, `Congregations, block clubs, community development corporations, tenant groups, and mutual-aid networks carry local knowledge and help residents act together.`, `Residents connect through trusted relationships and place-based organizing.`, `inferred`, `Community relations`, `https://www.clevelandohio.gov/city-hall/boards-commissions/community-relations-board`],
];
const CX_ECO_LINKS = [
  [`clinic`, `cwru`, `partners with`], [`metrohealth`, `cwru`, `partners with`], [`uh`, `cwru`, `partners with`],
  [`tric`, `cwru`, `offers transfer paths to`], [`tric`, `csu`, `offers transfer paths to`],
  [`city`, `city-landbank`, `runs`], [`city`, `rta`, `coordinates with`], [`port`, `gcp`, `supports`],
  [`foundation`, `cac`, `supports`], [`cpl`, `schools`, `partners with`],
];

function cxEcoNodes() {
  return [
    cxPick(`people`, {}),
    ...CX_ECO_RAW.map(([id, name, short, layer, isPublic, relation, summary, residents, evidence, source, url]) => ({
      id: `eco-${id}`, name, label: short, kind: id === `rta` ? `transport` : id === `schools` ? `district` : isPublic ? `institution` : `organization`,
      layer, level: isPublic ? 1 : 2, summary: `${summary} ${residents}`, region: `Cleveland and the region`,
      evidence, source, url, checked: CX_CHECKED, relation,
    })),
  ];
}
function cxEcoEdges() {
  const base = CX_ECO_RAW.map(([id, , , , , relation, , , evidence, , url]) => ({
    id: `eco-${id}-people`, source: `eco-${id}`, target: `people`, relation,
    note: evidence === `inferred`
      ? `A grouped description from the ecosystem prototype. Individual organizations need their own records.`
      : `Describes the institution's public role. It does not measure influence, quality, or control.`,
    evidence, url,
  }));
  const links = CX_ECO_LINKS.map(([a, b, relation]) => ({
    id: `eco-${a}-${b}`, source: `eco-${a}`, target: `eco-${b}`, relation,
    note: `Relationship described in the ecosystem prototype. A dedicated relationship citation is not attached yet.`,
    evidence: `inferred`,
  }));
  return [...base, ...links];
}

/* ---------- Extra rooms, spliced into Uh by the build ---------- */
function cxExtraRooms(which) {
  if (which === `municipalities`) {
    const nodes = cxMuniNodes();
    const ids = new Set(nodes.map((n) => n.id));
    return {
      id: `municipalities`,
      label: `Cities & municipalities`,
      icon: `pin`,
      question: `Is my address in Cleveland, and who governs it?`,
      answer: `Cleveland is one of many separate governments in Cuyahoga County. A nearby city or village has its own mayor or leaders, council, and rules. County offices, regional authorities, and courts can reach across those lines. Start with your address, then follow the government that actually serves it.`,
      region: `Cleveland, neighboring municipalities, Cuyahoga County, and regional authorities`,
      action: `Check your address with the Board of Elections`,
      actionUrl: `https://boe.cuyahogacounty.gov/voters/Find-Voting-Information-by-Address`,
      terms: [`city`, `municipality`, `county`, `jurisdiction`],
      path: [`people`, `cleveland`, `cx-bratenahl`, `county`],
      nodes,
      edges: cxMuniEdges().filter((e) => ids.has(e.source) && ids.has(e.target)),
      layers: CX_MUNI_LAYERS,
      gap: `This room names a small set of neighboring governments. It does not list every Cuyahoga County municipality, boundary, or shared-service agreement.`,
      prompts: [
        { label: `Is East Cleveland part of Cleveland?`, node: `cx-east-cleveland` },
        { label: `Which court covers Bratenahl?`, node: `municipal-court` },
        { label: `Who runs elections across the county?`, node: `boe` },
      ],
    };
  }
  if (which === `local-decisions`) {
    return Hh({
      id: `local-decisions`,
      label: `Local decisions`,
      icon: `file`,
      question: `How does a local decision actually get made?`,
      answer: `A proposal is introduced, reviewed in committee, voted on by Council, and then carried out by the administration. A budget allows spending, a contract sets terms, and the code records the law. Each step leaves a different record, and one step does not prove the next.`,
      region: `City of Cleveland`,
      action: `Search Cleveland's legislative records`,
      actionUrl: `https://cityofcleveland.legistar.com/Legislation.aspx`,
      terms: [`ordinance`, `committee`, `sponsor`, `effective date`],
      path: [`people`, `council`, `leg-561-2026`, `law-code`],
      ids: [`council`, `mayor`, `legislative`, `board-control`, `law-code`, `law-charter`],
      match: (e) => e.kind === `legislation` || e.kind === `committee`,
      gap: `Selected Cleveland legislation is loaded with its official record. How each member voted comes from the City Record where it prints names. Committee votes, contracts, and implementation records are not imported yet.`,
      prompts: [
        { label: `Follow a housing ordinance`, node: `leg-561-2026` },
        { label: `See a proposal still on an agenda`, node: `leg-620-2026` },
        { label: `Who reviews city contracts?`, node: `board-control` },
      ],
    });
  }
  if (which === `ecosystem`) {
    return {
      id: `ecosystem`,
      label: `Civic ecosystem`,
      icon: `layers`,
      question: `Beyond City Hall, who shapes daily life here?`,
      answer: `Hospitals, universities, libraries, transit, utilities, funders, media, and neighborhood networks all touch residents' lives. Some are public bodies with legal authority. Others are private or nonprofit organizations with influence but no power to make law. This room keeps that difference visible.`,
      region: `Cleveland and the surrounding region`,
      action: `Open Cleveland's open-data portal`,
      actionUrl: `https://data.clevelandohio.gov/`,
      terms: [`authority`, `oversight`, `open data`],
      path: [`people`, `eco-city`, `eco-metrohealth`, `eco-foundation`],
      nodes: cxEcoNodes(),
      edges: cxEcoEdges(),
      layers: CX_ECO_LAYERS,
      gap: `The ecosystem map is an orientation layer. Board memberships, funding flows, contracts, and measured outcomes are not loaded. A line here describes a public role, not influence or control.`,
      prompts: [
        { label: `Who funds community work?`, node: `eco-foundation` },
        { label: `Which health system is public?`, node: `eco-metrohealth` },
        { label: `Where can I check public data?`, node: `eco-opendata` },
      ],
    };
  }
  return null;
}

/* ---------- Dictionary: categories and additional plain-language terms ---------- */
const CX_DICT_CATEGORIES = [
  `Government structure`, `Legislature & decisions`, `Courts & law`, `Elections`, `Public money & contracts`,
  `Land & housing`, `Energy & utilities`, `Education`, `Neighborhoods & civic life`, `Evidence & records`,
];
const CX_ROOM_CATEGORY = {
  overview: `Government structure`, administration: `Government structure`, "state-federal": `Government structure`, municipalities: `Government structure`,
  council: `Legislature & decisions`, history: `Legislature & decisions`, "local-decisions": `Legislature & decisions`,
  courts: `Courts & law`, voting: `Elections`, money: `Public money & contracts`, housing: `Land & housing`,
  energy: `Energy & utilities`, education: `Education`, safety: `Government structure`, transport: `Public money & contracts`,
  health: `Government structure`, ecosystem: `Neighborhoods & civic life`,
};
const CX_DICT_EXTRA = [
  [`city`, `A local government created under state law to serve the people inside its boundaries.`, `Cleveland and East Cleveland are separate cities with separate governments.`, `municipalities`, `Government structure`],
  [`municipality`, `A city or village with its own local government.`, `Bratenahl is a village and Cleveland is a city. Each makes its own local rules.`, `municipalities`, `Government structure`],
  [`county`, `A larger local government that includes many cities, villages, and townships.`, `Cleveland is inside Cuyahoga County. County offices handle some services that cross city lines.`, `state-federal`, `Government structure`],
  [`mayor`, `The elected leader of a city's executive branch, who runs city departments.`, `Cleveland voters elect the mayor citywide.`, `administration`, `Government structure`],
  [`city council`, `The elected group that makes a city's local laws and approves spending.`, `Cleveland City Council has 15 members, one for each ward.`, `council`, `Government structure`],
  [`home rule`, `The power of Ohio cities to govern local matters, as long as local rules do not conflict with general state law.`, `Cleveland's charter organizes its government under home rule.`, `state-federal`, `Government structure`],
  [`executive order`, `A written directive from an executive, such as a mayor, about how government operates.`, `Executive Order 2025-01 created Cleveland's Municipal Cabinet for Children and Youth.`, `administration`, `Government structure`],
  [`board or commission`, `A group of appointed or elected people who oversee a specific public job.`, `Cleveland's Community Police Commission has oversight and review functions.`, `safety`, `Government structure`],
  [`resolution`, `A formal statement or decision by a legislative body. It is often not a permanent law.`, `A council can pass a resolution to state a position or approve a narrow action.`, `council`, `Legislature & decisions`],
  [`emergency ordinance`, `An ordinance passed with an emergency clause so it can take effect sooner than usual.`, `Emergency Ordinance 556-2026 set a data-center permitting moratorium.`, `local-decisions`, `Legislature & decisions`],
  [`quorum`, `The minimum number of members who must be present for a body to take official action.`, `Without a quorum, a meeting can talk but cannot vote.`, `council`, `Legislature & decisions`],
  [`veto`, `An executive's refusal to approve a passed measure. A legislature may be able to override it.`, `The Ohio governor can sign or veto bills passed by the General Assembly.`, `state-federal`, `Legislature & decisions`],
  [`agenda`, `The published list of items a public body plans to consider at a meeting.`, `An agenda entry shows an item was scheduled, not that it passed.`, `local-decisions`, `Legislature & decisions`],
  [`public comment`, `Time or a process for residents to share views with a public body before it decides.`, `RTA's board takes public comment at its meetings; committee meetings have different rules.`, `transport`, `Legislature & decisions`],
  [`roll-call vote`, `A vote where each member's yes or no is recorded by name.`, `A council decision alone does not show how each member voted. A roll call does.`, `local-decisions`, `Legislature & decisions`],
  [`magistrate`, `A court officer who hears certain matters under a judge's authority.`, `A magistrate's decision may be reviewed by the judge.`, `courts`, `Courts & law`],
  [`venue`, `The specific court location where a case should be heard.`, `Two courts can both exist in Cleveland but handle different case types.`, `courts`, `Courts & law`],
  [`injunction`, `A court order requiring someone to do, or stop doing, something.`, `A court can order a party to pause an action while a case is decided.`, `courts`, `Courts & law`],
  [`standing`, `Whether a person has a legal right to bring a particular case to court.`, `Being upset by a decision is not always enough to have standing.`, `courts`, `Courts & law`],
  [`precedent`, `An earlier court decision that guides how later, similar cases are decided.`, `Appeals courts often explain which earlier decisions they relied on.`, `courts`, `Courts & law`],
  [`primary election`, `An election that narrows the field or chooses party nominees before a general election.`, `Primary ballots can differ by party and district.`, `voting`, `Elections`],
  [`general election`, `The main election where voters choose officeholders and decide issues.`, `The practice ballot in this atlas covers the November 3, 2026 general election.`, `voting`, `Elections`],
  [`referendum`, `A public vote on whether a law or measure should stand.`, `Some local measures can be sent to voters by petition.`, `voting`, `Elections`],
  [`provisional ballot`, `A ballot counted only after election officials confirm the voter is eligible.`, `If your registration cannot be confirmed at the polls, you can still cast a provisional ballot.`, `voting`, `Elections`],
  [`absentee ballot`, `A ballot cast before Election Day, often by mail.`, `In Ohio, registered voters can request an absentee ballot without giving a reason.`, `voting`, `Elections`],
  [`write-in candidate`, `A candidate whose name voters write in. In Ohio, write-in candidates must file ahead of time for their votes to count.`, `The practice ballot marks valid write-in entries from the county list.`, `voting`, `Elections`],
  [`campaign finance`, `Rules and public reports about money raised and spent to influence elections.`, `Campaign reports show contributions and spending, not how a person will vote.`, `voting`, `Elections`],
  [`budget`, `A plan for how a government expects to raise and spend money in a period.`, `Emergency Ordinance 117-2026 made Cleveland's 2026 operating appropriations.`, `money`, `Public money & contracts`],
  [`grant`, `Money given for a specific purpose that usually does not need to be paid back.`, `A grant can come with reporting rules about how it is spent.`, `money`, `Public money & contracts`],
  [`vendor`, `A business or organization that sells goods or services to a government.`, `A vendor's contract terms are separate from the budget that allows the spending.`, `money`, `Public money & contracts`],
  [`tax abatement`, `A reduction or delay of property taxes, often to encourage building or repair.`, `An abatement lowers what a property owner pays for a set period.`, `housing`, `Land & housing`],
  [`variance`, `Permission to use or build on property in a way zoning rules would normally not allow.`, `A variance applies to one property, not the whole zoning code.`, `housing`, `Land & housing`],
  [`parcel`, `A specific piece of land identified in property records.`, `Land banks track vacant properties parcel by parcel.`, `housing`, `Land & housing`],
  [`code violation`, `A finding that a property does not meet a building, housing, or health rule.`, `Building & Housing handles inspections; Housing Court handles legal cases.`, `housing`, `Land & housing`],
  [`land bank`, `A public or nonprofit body that takes vacant or abandoned property and returns it to use.`, `The Cuyahoga County Land Bank works countywide; Cleveland also runs a city land bank program.`, `housing`, `Land & housing`],
  [`tariff`, `The official schedule of a utility's rates, charges, and service terms.`, `A tariff explains what a customer can be charged and why.`, `energy`, `Energy & utilities`],
  [`generation`, `Producing electricity at a power plant or other source.`, `Owning a plant and buying its power are different relationships.`, `energy`, `Energy & utilities`],
  [`transmission`, `Moving electricity at high voltage over long distances between plants and local systems.`, `Regional transmission is coordinated beyond any single city.`, `energy`, `Energy & utilities`],
  [`distribution`, `Delivering electricity from local substations to homes and businesses.`, `The utility on your bill usually handles distribution to your address.`, `energy`, `Energy & utilities`],
  [`capacity`, `The amount of electricity a plant or system can reliably supply, often paid for to keep the grid ready.`, `Capacity costs can appear on bills even when a plant is not running.`, `energy`, `Energy & utilities`],
  [`municipal utility`, `A utility owned by a city government.`, `Cleveland Public Power is Cleveland's municipally owned electric utility.`, `energy`, `Energy & utilities`],
  [`aggregation`, `When a community buys electricity for many customers as a group.`, `An aggregation program changes the supplier, not who maintains the wires.`, `energy`, `Energy & utilities`],
  [`superintendent`, `The top administrator of a school district. Some districts call this role chief executive officer.`, `CMSD's top administrator holds the CEO title.`, `education`, `Education`],
  [`charter school`, `A publicly funded school run independently of a traditional district. In Ohio these are legally called community schools.`, `A charter school's sponsor and governing board are separate from the district board.`, `education`, `Education`],
  [`community development corporation`, `A nonprofit that works on housing, business, and improvements in specific neighborhoods.`, `Community development corporations often partner with city programs and funders.`, `ecosystem`, `Neighborhoods & civic life`],
  [`block club`, `A group of neighbors who organize to improve and look after their street or area.`, `Block clubs often bring concerns to a council member or city department.`, `ecosystem`, `Neighborhoods & civic life`],
  [`community benefits agreement`, `A written agreement where a developer commits to benefits for the surrounding community.`, `An agreement's terms matter more than an announcement about it.`, `ecosystem`, `Neighborhoods & civic life`],
  [`open data`, `Public information published in a form anyone can download, reuse, and check.`, `Cleveland publishes an open-data portal for public datasets.`, `ecosystem`, `Neighborhoods & civic life`],
  [`evidence state`, `A label that says how well a claim is supported: official source, recorded action, interpretation, or record needed.`, `A dashed line on the map means interpretation or a missing record.`, `overview`, `Evidence & records`],
  [`primary source`, `The original record, such as the ordinance, docket, contract, or roll call, rather than a summary of it.`, `A news story can point you to a record, but the record is the proof.`, `overview`, `Evidence & records`],
].map(([term, meaning, example, room, category]) => ({ term, meaning, example, room, category, cx: !0 }));

function cxDictCategory(entry) {
  return entry.category ?? CX_ROOM_CATEGORY[entry.room] ?? `Government structure`;
}

/* ---------- Decision & contract ledger (reuses loaded records only) ---------- */
const CX_LEDGER_DOMAIN = {
  "leg-561-2026": `housing`, "leg-556-2026": `energy`, "leg-522-2026": `transportation`, "leg-117-2026": `budget`,
  "leg-605-2026": `public-safety`, "leg-620-2026": `energy`,
};
const CX_DOMAIN_LABEL = {
  energy: `Energy`, education: `Education`, housing: `Housing`, "public-safety": `Public safety`, budget: `Budget`, transportation: `Transportation`, contracts: `Contracts`,
};
const CX_EVIDENCE_LABEL = {
  verified: `Recorded action`, partial: `Partial record`, context: `Context only`, "under-review": `Agenda record`, missing: `Record needed`,
};

function cxLedgerEntries() {
  const leg = Th.map((n) => {
    const passed = (n.activity ?? []).some((a) => /Passed/.test(a)) || n.status === `Passed`;
    const agenda = n.id === `leg-620-2026`;
    const room = { housing: `housing`, energy: `local-decisions`, transportation: `transport`, budget: `money`, "public-safety": `safety` }[CX_LEDGER_DOMAIN[n.id]] ?? `local-decisions`;
    const lhNode = Lh.find((e) => e.id === n.id);
    const rc = cxVoteRecord(n.id.replace(/^leg-/, ``));
    return {
      id: n.id, domain: CX_LEDGER_DOMAIN[n.id] ?? `budget`, title: n.name, short: n.shortName,
      summary: lhNode?.summary ?? n.summary,
      evidence: agenda ? `under-review` : passed ? `verified` : `partial`,
      fields: [
        [`Record type`, agenda ? `Agenda entry` : `City legislation`],
        [`Status`, agenda ? `Listed for consideration; final disposition not loaded` : passed ? `Passed` : `Status not confirmed in this release`],
        [`Dates`, (n.activity ?? []).filter((a) => !/^Status/.test(a)).join(` · `) || `Not loaded`],
        [`Acted on by`, `Cleveland City Council`],
        [`Individual votes`, rc ? `Printed in the City Record for ${cxLongDate(rc.date)}: ${rc.yea} yea, ${rc.nay} nay${rc.absent ? `, ${rc.absent} absent` : ``}. Each member's vote is on their profile.` : `No member-by-member vote in the City Record snapshot`],
        [`Money involved`, /117|620/.test(n.id) ? `Amounts not totaled in this release` : `Not applicable or not loaded`],
        [`Scope`, n.region],
      ],
      missing: agenda
        ? [`Final action`, `Executed contracts`, `Member votes`, `Funding amounts`]
        : [...(rc ? [] : [`Member-by-member roll call`]), `Implementation records`, `Measured outcomes`],
      source: [n.sourceLabel, n.sourceUrl], checked: n.verifiedAt, room, node: n.id,
      related: n.issues ?? [],
    };
  });
  const cpp = jh.find((e) => e.id === `cpp-contract`);
  const school = Ph.find((e) => e.id === `school-decisions`);
  const control = Lh.find((e) => e.id === `board-control`);
  const police = Lh.find((e) => e.id === `board-police`);
  const extra = [
    cpp && {
      id: `cpp-contract`, domain: `energy`, title: cpp.name, short: cpp.shortName, summary: cpp.summary, evidence: `missing`,
      fields: [[`Record type`, `Power-purchase contracts`], [`Buyer`, `Cleveland Public Power`], [`Sellers and facilities`, `Not verified`], [`Term and price`, `Not verified`], [`Authorizing vote`, `Not located`], [`Resident rate impact`, `Not calculated`]],
      missing: [`Supplier`, `Price`, `MW or MWh`, `Start and expiration`, `Approval vote`, `Amendments`, `Exit terms`],
      source: [cpp.sourceLabel, cpp.sourceUrl], checked: `2026-09-22`, room: `energy`, node: `cpp-contract`,
      related: [`AMP membership does not establish a specific contract`],
    },
    school && {
      id: `school-decisions`, domain: `education`, title: school.name, short: school.shortName, summary: school.summary, evidence: `partial`,
      fields: [[`Record type`, `Levies, bonds, and district decisions`], [`Decided by`, `Voters for levies and bonds; the district board for district actions`], [`Amounts and terms`, `Not loaded for a specific levy`], [`Affected schools`, `Not loaded`]],
      missing: [`Ballot language`, `Vote totals`, `Amount and term`, `Affected schools`],
      source: [school.sourceLabel, school.sourceUrl], checked: `2026-09-22`, room: `education`, node: `school-decisions`,
      related: [`Renewal, replacement, and additional levies are different`],
    },
    control && {
      id: `board-control`, domain: `contracts`, title: control.name, short: `Contract approvals`, summary: control.summary, evidence: `context`,
      fields: [[`Record type`, `Public body`], [`What to look for`, `Meeting minutes that document contract approvals`], [`Individual contracts`, `Not imported`]],
      missing: [`Executed contracts`, `Payments`, `Amendments`],
      source: [control.source, control.url], checked: control.checked, room: `money`, node: `board-control`,
      related: control.issues ?? [],
    },
    police && {
      id: `board-police`, domain: `public-safety`, title: police.name, short: `Police oversight`, summary: police.summary, evidence: `context`,
      fields: [[`Record type`, `Oversight body`], [`Case outcomes`, `Not loaded`], [`Budget`, `Not loaded`]],
      missing: [`Case outcomes`, `Discipline decisions`, `Budget records`],
      source: [police.source, police.url], checked: police.checked, room: `safety`, node: `board-police`,
      related: police.issues ?? [],
    },
  ].filter(Boolean);
  return [...leg, ...extra];
}

/* ---------- Civic Intelligence Bench (from the Sep 24 architecture pack) ---------- */
const CX_PIPELINE = [
  [`Intake`, `Capture the resident question or source change, jurisdiction, as-of date, requested depth, and potential harms. Ambiguous places, ward boundaries, or election dates produce a clarification or a scoped uncertainty note.`],
  [`Route`, `Select only the research spokes needed, assign independent review, and cap retrieval cycles. Elections, legal currentness, public allegations, and public graph changes use full review.`],
  [`Fetch`, `Use a registry of official sources. Store the retrieval time, canonical URL, content hash, source owner, dates, and a snapshot where allowed. A failed fetch is a source-health event, not proof that a claim changed.`],
  [`Normalize`, `Parse record type, authority, decision date, effective date, jurisdiction, and named entities. Keep contract, ownership, operation, regulation, vote, statement, and inference as separate kinds of relationship.`],
  [`Resolve`, `Assign stable IDs using identifiers, jurisdiction, office, and date. Same-name conflicts go to a human queue. Superseded records are kept, not overwritten.`],
  [`Evidence packet`, `Link each atomic claim to exact source locations, hashes, time bounds, a confidence reason, and counterevidence. A homepage alone is not enough for a vote, contract term, or legal status.`],
  [`Examine`, `An independent examiner checks source fit, identity, chronology, duplicates, scope, and citation coverage, without seeing the researcher's reasoning.`],
  [`Challenge`, `A skeptic asks whether the claim is wrong, stale, misleading, partisan, or overclaims cause. Dissent is preserved. A veto blocks automatic advancement.`],
  [`Explain`, `Write three linked layers from the same claims: Simple (what happened, why it matters, what I can do), Explore (people, places, path), and Audit (sources, uncertainty, history).`],
  [`Approve & commit`, `A named human reviews the frozen candidate, its hash, sources, uncertainty, dissent, and exact graph change. A deterministic service commits only what was approved and writes a receipt.`],
  [`Follow through`, `Track amendments, budgets, contracts, implementation, and measured outcomes. Residents can flag errors; corrections enter review instead of editing the public graph directly.`],
];
const CX_SEATS = [
  [`Question Framer`, `Framing`, `Question, geography, timeframe, affected residents, answerability, and exclusions`, `Invent scope silently`],
  [`Orchestrator`, `Framing`, `Bounded lane plan, task IDs, budget, stop conditions, and handoff log`, `Certify its own research`],
  [`Source Monitor`, `Research`, `Registered-source polls, health status, and change notices`, `Treat a changed page as a verified fact`],
  [`Public Records Investigator`, `Research`, `Official records, document identity, retrieval metadata, and access gaps`, `Hide missing pages or redactions`],
  [`Domain Researchers`, `Research`, `Subject findings and unresolved questions for each spoke`, `Publish or assign an ideology score`],
  [`Entity Resolver`, `Modeling`, `Proposed stable IDs and merge or split decisions`, `Merge people by name alone`],
  [`Evidence Registrar`, `Modeling`, `Source snapshot and hash, citations, claim links, confidence reason`, `Upgrade uncertainty without review`],
  [`Graph Modeler`, `Modeling`, `Typed entity, edge, and time-bound candidates`, `Treat visual closeness as proof`],
  [`Legal & Policy Analyst`, `Modeling`, `Authority chain, effective dates, amendments, currentness flags`, `Give legal advice or infer current law from an old summary`],
  [`Plain-English Explainer`, `Explaining`, `Simple, Explore, and Audit text from one claim set`, `Omit material caveats or change the finding`],
  [`Accessibility Reviewer`, `Explaining`, `Text equivalent, keyboard, focus, and motion checks with test gaps`, `Claim WCAG conformance without testing`],
  [`Independent Examiner`, `Review`, `Claim verdicts, identity, date, and jurisdiction checks`, `Edit the research it judges`],
  [`Skeptic`, `Review`, `Counterevidence, misleading inference, missing voices, and veto`, `Quietly remove dissent`],
  [`Memory & Decision Registrar`, `Review`, `Append-only event log, corrections, supersessions, decision receipts`, `Rewrite old decisions`],
  [`Human Publisher`, `Publishing`, `Approve, reject, or request changes to an exact candidate hash`, `Bypass required evidence gates`],
  [`Commit Service`, `Publishing`, `Apply a precisely approved change and issue a receipt`, `Interpret evidence or broaden scope`],
];
const CX_SPOKES = [`Elections`, `Council & ordinances`, `Energy & contracts`, `Education`, `Housing & land`, `Courts & public safety`, `Budgets & procurement`, `Health`, `Transit`, `Arts & higher education`, `County`, `State`, `Federal`];
const CX_STATES = [
  [`intake`, `Resident question or detected source change`, `Scoped brief`, `needs_clarification`],
  [`queued`, `Brief accepted`, `Spoke assigned`, `paused (source unavailable)`],
  [`researching`, `Task assigned`, `Source packet and gaps filed`, `source_unavailable`],
  [`normalized`, `Raw and parsed record linked`, `Identity and ontology checks pass`, `identity_conflict`],
  [`shadow_candidate`, `Graph or answer change prepared`, `Complete evidence packet`, `needs_evidence`],
  [`examined`, `Independent checks pass or limits stated`, `Verdict recorded`, `blocked or quarantined`],
  [`challenged`, `Skeptic report and dissent status filed`, `No unresolved veto`, `blocked or needs_revision`],
  [`awaiting_human`, `Review bundle frozen and hashed`, `Explicit human decision`, `rejected or expired`],
  [`approved`, `Exact hash, scope, and expiry approved`, `Commit service validates`, `approval_mismatch`],
  [`committed`, `Change and receipt recorded together`, `Public projection updated`, `rollback_review on error`],
  [`superseded`, `A new verified record corrects an old one`, `Both versions traceable`, `History is never erased`],
];
const CX_GATES = [
  `Every public claim points to a specific document, page, section, row, docket entry, or vote record.`,
  `Vote tallies, legal authority, appointments, appropriations, and contract authorizations need at least one primary source, or they are labeled partial or held.`,
  `Every relationship has a type, direction, jurisdiction, observed date, validity interval when known, and evidence state.`,
  `Material current claims carry a review date and refresh policy. A source change triggers review, not automatic replacement.`,
  `Identity collisions, contradictory official records, uncertain legal currentness, high-impact allegations, and potential harm require a human reviewer.`,
  `Party affiliation is a sourced, dated field. It is never inferred from votes, and no one is reduced to a single ideology score.`,
  `A practice ballot choice is private session state. Projected effects are labeled scenarios, never outcomes.`,
  `Human approval binds candidate ID, version, hash, operations, jurisdiction, and expiry. Agents and the public interface have no commit credential.`,
];
const CX_STAGES = [
  [0, `Constitution`, `Role permissions, ontology, evidence labels, threat model`, `Agents have no public write capability; sample data cannot enter the approved graph`, `specified`],
  [1, `Registry`, `Cleveland source registry with owners, cadences, access rules, health`, `Three official sources fetched or registered with exact document anchors`, `partial`],
  [2, `Intake & queue`, `Resident-question brief, task IDs, routing, retries, change queue`, `Ambiguous geography and unavailable sources enter explicit states`, `specified`],
  [3, `Evidence store`, `Snapshots, SHA-256, parsed records, anchors, claim IDs`, `A claim traces to one exact official record location`, `partial`],
  [4, `Resolution & graph candidates`, `ID rules, typed edges, time validity`, `Same-name collisions quarantined; ownership and contract stay distinct`, `specified`],
  [5, `Review console`, `Examiner, Skeptic, dissent, currentness, accessibility statuses`, `Nothing reaches human approval with a missing mandatory review`, `specified`],
  [6, `Human approval`, `Frozen diff, named reviewer, hash, version, scope, expiry`, `A changed packet invalidates approval; a rejected packet never commits`, `specified`],
  [7, `Deterministic publisher`, `Atomic commit, receipt, graph version, rollback path`, `Replay produces the same result; failed preconditions change nothing`, `specified`],
  [8, `Public projection`, `Versioned export for Simple, Explore, Audit, and text`, `All views agree on claims, sources, dates, and uncertainty`, `partial`],
  [9, `Corrections & monitoring`, `Source-health alerts, correction intake, re-review, public history`, `A confirmed correction preserves the old version and shows the reason`, `specified`],
  [10, `Evaluation`, `Regression cases for conflicts, stale laws, duplicates, votes, accessibility`, `Failed cases block promotion and become repeatable fixtures`, `specified`],
];
const CX_STAGE_STATUS = {
  specified: `Designed, not built`,
  partial: `Partly in this release`,
};
const CX_CASES = [
  [`A source page changes but the vote record does not`, `The monitor files a change notice. The public graph stays the same.`],
  [`Two people share a name`, `The resolver quarantines the collision and keeps separate entities.`],
  [`A legal page has no effective date`, `The analyst marks currentness uncertain and blocks a present-tense claim.`],
  [`An agent says a buyer owns a plant because of a power contract`, `The examiner rejects the edge type. Contract is not ownership.`],
  [`A council member was not in office for a vote`, `Show "not applicable" with term dates, never "missing" or "abstained."`],
  [`A candidate states support but never voted on it`, `Show a statement, never a vote.`],
  [`A resident practices a ballot choice`, `It stays private, and projected effects are labeled scenarios.`],
  [`An approver signs version A but the packet changes to B`, `The commit is refused.`],
  [`A credible counter-record appears`, `Contested status and dissent are preserved, then routed to human review.`],
  [`Someone navigates without the visual map`, `The text view exposes the same nodes, relationships, sources, and correction path by keyboard and screen reader.`],
];
const CX_EVIDENCE_STATES = [
  [`verified`, `The specific claim is directly supported by suitable records and has passed review.`],
  [`partial`, `Only part of the claim is established.`],
  [`contested`, `Credible records disagree. Shown as contested, never as settled.`],
  [`stale`, `The fact may have changed since it was checked.`],
  [`missing`, `The record has not been found. A missing vote is never shown as an abstention.`],
  [`not_applicable`, `The field does not apply, for example a vote before someone took office.`],
];
