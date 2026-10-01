/* v5.12: "Why supporters backed it" in My constellation.
   Each entry is a plain-English summary of the reasons written into the official record:
   the "WHEREAS" clauses of the ordinance or resolution (src: `text`) and, where the city
   published one, the Legislative Summary (src: `summary`). Evidence snapshot:
   data/reasons-2026.json (scripts/fetch_reasons.py). Links come from that snapshot at build
   time (CX_RSRC), so every citation points at the document these lines were checked
   against. When the record gives no reasons, the entry says so. */

const CX_REASONS = {
  "cc-datacenters": { file: `556-2026`, src: [`text`], points: [
    `Data centers use huge amounts of electricity and water. One very large data center can use as much power as 100,000 homes.`,
    `Connecting them often needs new power lines, and those costs have usually been shared by every customer, which can push up home electric bills.`,
    `They create few jobs for the money invested, and Cleveland runs mostly on income tax paid by workers.`,
    `The zoning code does not define data centers, and they may be allowed in areas where people also live.`,
    `The pause gives Council time to write rules or limits before any are built.`,
  ] },
  "cc-rentals": { file: `561-2026`, src: [`text`, `summary`], points: [
    `Short-term renters are taking the place of permanent neighbors in areas built for homes, which the sponsors say weakens neighborhoods.`,
    `Turning homes into visitor rentals adds to the shortage of affordable housing for owners and long-term renters.`,
    `Council received many complaints about parking, noise, and safety.`,
    `Under the new rules every rental needs a license ($150 a year and $500,000 in insurance), a local contact who can arrive within an hour, and in single-family areas no more than about 1 in 10 homes on a block.`,
  ] },
  "cc-ice": { file: `114-2026`, src: [`text`], points: [
    `House Bill 26 would require local police to honor every federal immigration detainer and would ban "sanctuary" policies.`,
    `House Bill 42 would make agencies track and report people's immigration status, including K-12 students. House Bill 281 would require hospitals to let ICE agents in or risk losing Medicaid and state grants.`,
    `Senate Bill 172 would allow immigration arrests anywhere in Ohio, including courthouses and places of worship.`,
    `Council says the bills violate the U.S. Constitution and Ohio's home rule protections, and would force cities and hospitals to comply or lose funding.`,
  ] },
  "cc-library": { file: `975-2026`, src: [`text`], points: [
    `About 400 library workers had set a strike deadline of August 24, 2026, after eight months and more than 30 bargaining sessions.`,
    `The open issues were wages, benefits, and working conditions.`,
    `Sponsors point to the daily work: story time for children, helping job seekers, teaching seniors technology, and keeping neighborhood branches running.`,
    `Their view: the library cannot provide those services without these workers.`,
  ] },
  "cc-food": { file: `240-2026`, src: [`text`], points: [
    `More than 1.3 million Ohioans live in food deserts, and about 225,000 of them have no car to reach a grocery store.`,
    `Poor access to healthy food is linked to diabetes, obesity, and heart disease, which cost families and taxpayers.`,
    `The bill would give small neighborhood stores grants of up to $15,000 a year to stock fresh food, starting as a $200,000 test with quarterly reports.`,
    `Some Cleveland neighborhoods are food deserts, and the bill has sponsors from both parties.`,
  ] },
  "cc-outages": { file: `107-2026`, src: [`text`], points: [
    `FirstEnergy asked state regulators to allow more outages each year and more time to restore power.`,
    `Longer outages hurt people who rely on medical equipment and cause missed work and school, exposure to heat and cold, and spoiled food.`,
    `Lakewood reported 60 outages longer than five hours in one year, also hitting Cleveland's west side. The cities say most were caused by equipment failures, company error, or trees FirstEnergy is responsible for.`,
    `Customers have paid more than $1.1 billion since 2017 for grid upgrades, yet an audit found little modernization and average outages got 12% longer.`,
  ] },
  "cc-nil": { file: `239-2026`, src: [`text`], points: [
    `Many student athletes come from working-class families and see sports as a path to school and work opportunities.`,
    `The sponsors say a ban would fall hardest on Black, Brown, and urban students.`,
    `Other states allow it, so talented Ohio athletes might leave to find fair opportunities.`,
    `Earning from their own name can teach business and money skills, and the Ohio High School Athletic Association allows it.`,
  ] },
  "cc-repair": { file: `111-2026`, src: [`text`], points: [
    `The ordinance says helping low-income homeowners make repairs they could not otherwise afford, so they can stay safe and independent at home, is a proper use of public money.`,
    `The official text gives no other reasons.`,
  ] },
  "my-dora": { file: `557-2026`, src: [`summary`, `text`], points: [
    `The mayor's office and Playhouse Square Foundation applied together. The goal is to make the Theatre District more of a destination and help the businesses around it.`,
    `Cleveland can have up to six of these areas and had one, on East 4th Street. Ohio had 167 statewide as of late 2024.`,
    `Drinks must be in special cups from participating businesses and stay inside the boundaries. A larger area opens only for events such as the Cleveland International Film Festival and Tri-C JazzFest.`,
    `A three-person Playhouse Square committee sets the hours and works with Cleveland police and state liquor officials.`,
  ] },
  "my-flock": { file: `683-2026`, src: [`summary`], points: [
    `Police use the cameras in violent crime investigations, to recover stolen cars, to find missing people, and in hit-skip cases, and say it makes investigations faster.`,
    `The police division has used the system since 2023. The license and maintenance cost $125,000 from the police budget.`,
    `Council amended the request, shortening the renewal from one year to six months.`,
  ] },
  "my-dogs": { file: `605-2026`, src: [`summary`, `text`], points: [
    `A new state law, House Bill 247 (Avery's Law), changed Ohio's dog rules in March 2026. Now only the county dog warden can officially label a dog nuisance, dangerous, or vicious.`,
    `City animal control officers cannot make that call, so the city rewrote its law to send cases to the county warden.`,
    `While a case is pending, the city can require the dog to be confined, seize a dog after a serious incident, fine owners who do not comply, and must give owners notice.`,
  ] },
  "my-counsel": { file: `1031-2026`, src: [`text`, `summary`], points: [
    `The city's executive summary says the program keeps legal help available for low-income tenants facing eviction. The Legal Aid Society would lead it with its own staff, volunteer lawyers, and partner groups.`,
    `It carries out a law the city already has, Legal Representation in Housing Court (Section 375.12).`,
    `The agreements could cost up to $750,000 from the city's General Fund.`,
    `The ordinance text itself lists no reasons.`,
  ] },
  "my-solar": { file: `620-2026`, src: [`text`, `summary`], points: [
    `The city has a $14.9 million federal EPA grant, through Cuyahoga County, and can use federal clean-energy tax credits before they phase out.`,
    `The solar arrays would go on two closed landfills: West 11th and Spring Road, serving Cleveland Public Power customers and adding a small park, and Kolthoff Road, to cut Hopkins Airport's power costs.`,
    `The sites also get native plantings for pollinators, and one design-build team is meant to speed the work.`,
  ] },
  "my-budget": { file: `117-2026`, src: [`text`], points: [
    `The budget ordinance lists no reasons; it funds the daily operation of every city department for 2026.`,
    `The record shows Council amended the mayor's proposed budget before passing it.`,
  ] },
  "my-brookpark": { file: `664-2026`, src: [`summary`, `text`], points: [
    `It ends about nine years of lawsuits between the two cities over a 2001 agreement about the airport's expansion and the I-X Center. Courts had ruled for Cleveland, and Brook Park appealed.`,
    `Cleveland would receive all tax revenue from the I-X Center and Emerald Park properties.`,
    `In return, Cleveland pays Brook Park $2 million for legal costs and $650,000 a year for 33 years, gives it about 34 acres, and no longer has to buy homes under the old airport program.`,
    `The Federal Aviation Administration must approve before it takes effect.`,
  ] },
  "my-meters": { file: `245-2026`, src: [`summary`, `text`], points: [
    `Street meter money would move into the city's General Fund starting July 1, 2026.`,
    `A share of the monthly profit would go to a new Parking Benefits Fund, used only for citywide improvements to safety, accessibility, and getting around on city streets.`,
  ] },
  "my-eastside-tif": { file: `615-2026`, src: [`text`], points: [
    `The district covers parts of Wards 5 and 8 and is meant to capture growth there to benefit all Clevelanders.`,
    `The money would pay for public infrastructure and for housing construction, storefront improvements, lighting, and streetscapes.`,
    `Passing it as an emergency lets the payments start as soon as possible. The school board was notified, as state law requires.`,
  ] },
  "my-permit-fees": { file: `622-2026`, src: [`summary`, `text`], points: [
    `Hough and St. Clair-Superior have seen long-term disinvestment and little new building.`,
    `Removing fees for one- to three-family homes and halving them for larger buildings is meant to draw builders and buyers, including onto city-owned lots.`,
    `It works together with the new East Side TIF district and simpler design rules. The city lists its cost as $0.`,
  ] },
  "my-lead": { file: `624-2026`, src: [`summary`, `text`], points: [
    `The 2021 federal infrastructure law set aside $15 billion to remove lead lines. Ohio's share is $926 million, about half grants and half zero-interest loans.`,
    `Cleveland's last lead lines were installed in 1948. Cleveland Water says a treatment coating has kept lead levels about seven times below federal limits since 2012, and it is using the federal money to replace the pipes.`,
    `Year 5 pays to find and replace lead lines from the water main to the curb and, when needed, into the home up to the meter.`,
  ] },
  "my-screening": { file: `765-2026`, src: [`text`], points: [
    `The ordinance text lists no reasons, and the record had no legislative summary when this was written.`,
    `It buys Evolv weapons-screening equipment, installation, maintenance, and software for the new police headquarters for four years.`,
  ] },
  "my-violence": { file: `938-2026`, src: [`text`], points: [
    `The text gives the program's history, not new reasons: since 2022 Council has let the city use a federal Justice Department grant of up to $2 million for the Cleveland Thrive violence prevention initiative.`,
    `This ordinance updates how that grant money is paid out to community groups.`,
  ] },
  "my-youthjobs": { file: `31-2026`, src: [`summary`], points: [
    `The mayor's office calls summer jobs a violence prevention tool: they help young people build skills to deal with trauma and stress.`,
    `Young people also learn work skills and explore careers.`,
    `The contract is up to $1,499,337 from the General Fund, with Youth Opportunities Unlimited chosen through a competitive request for proposals.`,
  ] },
  "my-stadium": { file: `931-2026`, src: [`text`, `summary`], points: [
    `The city owns the stadium, and the 1998 lease requires the city to pay for emergency repairs the Browns make to keep it usable.`,
    `The city's capital projects office inspected the work and agreed it was necessary.`,
    `The total is about $1.12 million from the Stadium Capital Repair Fund, for items like failed sewer pumps and pipes and $650,000 in concrete repairs. Much of the work was already done.`,
  ] },
};

function CX_Why({ q }) {
  const r = CX_REASONS[q.id];
  if (r) {
    const [textUrl, summaryUrl, pageUrl] = CX_RSRC[r.file] || [];
    const links = [];
    if (r.src.includes(`text`) && textUrl) links.push([`Official text, ${r.file}`, textUrl]);
    if (r.src.includes(`summary`) && summaryUrl) links.push([`Legislative summary`, summaryUrl]);
    if (pageUrl) links.push([`Council record`, pageUrl]);
    return (
      <section className="cx-why">
        <h4>Why supporters backed it</h4>
        <ul>{r.points.map((p) => <li key={p}>{p}</li>)}</ul>
        <p className="cx-why-note">In plain English, from the reasons written into the official record by the people who brought it. This is their case for it, not a neutral review.</p>
        {r.file in CX_DRIFT && <p className="cx-why-drift" role="note">The official record for {r.file} changed after this summary was checked{CX_DRIFT[r.file] ? ` on ${cxShortDate(CX_DRIFT[r.file])}` : ``}. Read the source to confirm it still holds.</p>}
        <p className="cx-why-src">Sources: {links.map(([t, href], i) => <u.Fragment key={href}>{i ? ` · ` : ``}<a href={href} target="_blank" rel="noreferrer">{t} <CXI.Ext size={11} /></a></u.Fragment>)}</p>
      </section>
    );
  }
  const recs = Gm.filter((g) => g.question === q.id);
  if (!recs.length) return null;
  return (
    <section className="cx-why">
      <h4>What the record says</h4>
      <ul>{recs.map((g) => <li key={g.candidate + g.detail}>{g.detail}</li>)}</ul>
      <p className="cx-why-src">Source: <a href={q.url} target="_blank" rel="noreferrer">{q.kind === `vote` ? `House roll call` : `Campaign page`} <CXI.Ext size={11} /></a></p>
    </section>
  );
}
