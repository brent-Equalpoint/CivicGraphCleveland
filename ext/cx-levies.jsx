/* v5.17 Levies and taxes: a plain-English guide to the tax issues on the ballot, for both layouts.
   - Every number comes from the official ballot wording that is already in the app (Um), read by cxLevyFacts().
   - The two countywide levies (Issues 10 and 11) also get hand-written, sourced text: what the money pays for, what changes,
     what the county or board says happens if it fails, what named people have said on each side, and questions a voter can ask.
     That text is interpretive, so it sits between the LEVY-TEXT markers below. A person reads it against its sources and then runs
         python build.py --mark-levies-reviewed "Your Name"
     Until then the page says a person has not reviewed it. If the text changes after that, the page says so again.
   - It never tells anyone how to vote and never scores a levy. It shows the cost, the uses, and both sides, with sources.
   - What a person types as their home's value stays in the page and is never saved or sent anywhere. */

const CX_LEVY_SRC = {
  boe: { label: `Official ballot wording, Cuyahoga County Board of Elections`, url: `https://boe.cuyahogacounty.gov/elections` },
  signal: { label: `Signal Cleveland, Oct. 1, 2026: Here's what's on your ballots in Cuyahoga County this November`, url: `https://signalcleveland.org/cuyahoga-county-levy-charter-amendment-ballot-issues-election-2026/` },
  spectrum: { label: `Spectrum News, Sept. 23, 2026: Cuyahoga County Board of Developmental Disabilities kicks off levy campaign`, url: `https://spectrumnews1.com/oh/columbus/news/2026/09/23/cuyahoga-county-issue-10-kickoff` },
  hoodline: { label: `Hoodline, July 23, 2026: Cuyahoga's DD tax hike heads for a November vote`, url: `https://hoodline.com/2026/07/cuyahoga-s-dd-tax-hike-heads-for-high-stakes-november-vote-6929795/` },
  ide0928: { label: `Ideastream, Sept. 28, 2026: Cuyahoga County could cut funding for homeless population, infant mortality if levy fails`, url: `https://www.ideastream.org/government-politics/2026-09-28/cuyahoga-county-could-cut-funding-for-homeless-population-infant-mortality-if-levy-fails` },
  ide0805: { label: `Ideastream, Aug. 5, 2026: Cuyahoga County Council puts HHS levy increase on ballot`, url: `https://www.ideastream.org/government-politics/2026-08-05/cuyahoga-county-council-puts-hhs-levy-increase-on-ballot-elected-sheriff-amendment-withdrawn` },
  county: { label: `Cuyahoga County, July 8, 2026: Cuyahoga County seeks funding for health and human services`, url: `https://cuyahogacounty.gov/county-news/county-news-detail/2026/07/08/cuyahoga-county-seeks-funding-for-health-and-human-services` },
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
/* LEVY-TEXT-END */

/* ---------- the numbers, read from the official wording ---------- */
const cxLevyMoney = (n) => `$${Math.round(n).toLocaleString(`en-US`)}`;
const cxLevyExact = (n) => (Number.isInteger(n) ? cxLevyMoney(n) : `$${n.toFixed(2)}`);   // $87.50, not $88
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

/* ---------- a source line ---------- */
function CxLevySrc({ k }) {
  const s = CX_LEVY_SRC[k];
  return s ? <span className="lv-src"> <a href={s.url} target="_blank" rel="noreferrer">Source<span className="sp-ext"> (opens in a new tab)</span></a></span> : null;
}
function CxLevyList({ rows }) {
  return <ul className="lv-list">{rows.map((r, n) => <li key={n}>{r[0]}<CxLevySrc k={r[1]} /></li>)}</ul>;
}

/* ---------- one countywide levy ---------- */
function CxLevyCard({ it, home }) {
  const { issue, facts: f } = it;
  const T = CX_LEVY_TEXT.issues[issue.number];
  const mine = home > 0 && f.per ? (home * f.per) / 100000 : null;
  const sid = (x) => `lv-${issue.number}-${x}`;
  return (
    <article className="lv-card" aria-labelledby={sid(`h`)}>
      <p className="lv-kick"><span className="lv-chip">{f.kind}</span>{` Issue ${issue.number} · Everywhere in the county`}</p>
      <h2 id={sid(`h`)}>{T.name}</h2>
      <p className="lv-line">{T.line}</p>
      <div className="lv-cost">
        <p className="lv-big"><b>{cxLevyMoney(f.per)}</b> <span>a year for each $100,000 of your home's market value</span></p>
        {mine != null && <p className="lv-mine">{`For a home worth ${cxLevyMoney(home)}: about `}<b>{cxLevyMoney(mine)}</b>{` a year.`}</p>}
        {T.now && <p className="lv-sub">{`Now about ${cxLevyExact(f.per - T.now.increase)} a year. The increase is ${cxLevyExact(T.now.increase)} a year for each $100,000.`}</p>}
        <p className="lv-sub">{`The county estimates it would collect ${cxLevyMoney(f.annual)} a year, for ${f.years}.`}</p>
        <p className="lv-sub">{CX_LEVY_KIND_LINE[f.kind]}</p>
      </div>
      <details className="lv-more">
        <summary>Read more</summary>
        <div className="lv-body">
          <h3>What it pays for</h3>
          <CxLevyList rows={T.pays} />
          <h3>What changes if it passes</h3>
          <CxLevyList rows={T.changes} />
          <h3>What happens if it fails</h3>
          <CxLevyList rows={T.fails} />
          <h3>What people have said</h3>
          <ul className="lv-said">
            {T.said.map((s, n) => (
              <li key={n} className={`lv-${s[0]}`}>
                <b>{s[1]}</b>
                <span className="lv-side">{s[0] === `for` ? `Supports it` : `Raised a concern`}</span>
                <span className="lv-quote">{s[2]}</span><CxLevySrc k={s[3]} />
              </li>
            ))}
          </ul>
          {T.noOpp && <p className="lv-note">{T.noOpp}</p>}
          <h3>Questions to ask yourself</h3>
          <ul className="lv-list">{T.ask.map((q, n) => <li key={n}>{q}</li>)}</ul>
          <details className="lv-wording">
            <summary>The official ballot wording</summary>
            <p className="lv-wtext">{issue.text.replace(/\s+/g, ` `).trim()}</p>
          </details>
        </div>
      </details>
    </article>
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

/* ---------- the page (a desktop panel and a phone sheet) ---------- */
function CX_Levies({ onPad }) {
  const all = u.useMemo(() => cxLevyIssues(), []);
  const [text, setText] = u.useState(``);
  const home = Number(text.replace(/[^\d]/g, ``)) || 0;
  const county = all.filter((x) => CX_LEVY_TEXT.issues[x.issue.number]);
  const other = all.filter((x) => !CX_LEVY_TEXT.issues[x.issue.number]);
  const rev = CX_LEVY_REVIEW;
  return (
    <section className="sp lv" aria-labelledby="lv-h">
      <h1 id="lv-h">Levies and taxes on your ballot</h1>
      <p className="sp-lede">A levy is a property tax that voters decide. For each one, this page shows what it costs, what it pays for, what changes if it passes or fails, and what people on different sides have said. It does not tell you how to vote.</p>
      <div className="lv-field">
        <label htmlFor="lv-home">Your home's market value (optional)</label>
        <input id="lv-home" type="text" inputMode="numeric" autoComplete="off" placeholder="For example 150,000" value={text ? Number(home).toLocaleString(`en-US`) : ``} onChange={(e) => setText(e.target.value)} />
        <p className="lv-note">Type it to see a dollar figure for your home. It stays on this device and is never sent anywhere. It is an estimate, not your tax bill.</p>
        {onPad && <button type="button" className="lv-pad" onClick={onPad}>Use the number pad, or see Cleveland income tax</button>}
      </div>
      <h2 className="lv-h2">Every home in the county</h2>
      {county.map((it) => <CxLevyCard key={it.issue.id} it={it} home={home} />)}
      <h2 className="lv-h2">Only in some places</h2>
      <p className="lv-note">Your school district or city may have a tax issue. Open the ones for where you live.</p>
      <ul className="lv-others">{other.map((it) => <CxLevyOther key={it.issue.id} it={it} home={home} />)}</ul>
      <details className="lv-how">
        <summary>How to read a levy</summary>
        <div className="lv-body">{CX_LEVY_TEXT.how.map((h) => <p key={h[0]}><b>{h[0]}.</b> {h[1]}</p>)}</div>
      </details>
      <p className="sp-note lv-review">{rev.ok ? `Read against its sources by ${rev.by} on ${rev.checked}.` : `The countywide write-ups were made from the sources linked in each one. A person has not yet read them against those sources.`}{` The cost figures come straight from the official ballot wording. Sponsorship is not a vote, and a missing record is not a no.`}</p>
      <p className="sp-note lv-review">Official source for everything on the ballot: <a href={CX_LEVY_SRC.boe.url} target="_blank" rel="noreferrer">Cuyahoga County Board of Elections<span className="sp-ext"> (opens in a new tab)</span></a>.</p>
    </section>
  );
}
