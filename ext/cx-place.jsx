/* v5.13: "Who decides here?" Pick a Cleveland neighborhood and see, from public records only:
   1. which wards and council members cover it now and before redistricting (city ward maps),
   2. the 2026 decisions tied to it, sorted by the lever used (Council's Legistar record),
   3. liquor permit objections and withdrawals in those wards,
   4. how fast each decision moved (Legistar action history),
   5. ward money (Neighborhood Equity Fund and casino-revenue items, amounts from ordinance text),
   6. what the record shows about votes, and what it does not.
   Data: CX_GEO and CX_PL are injected at build time from data/geo-2026.json and
   data/place-2026.json (scripts/fetch_place.py). No scores, no rankings, no inferred motives. */

const CX_PL_LEVERS = [
  [`liquor`, `Liquor permits`, /liquor permit/i, `Only the ward's council member files these. An objection asks the state to deny or look harder at a permit; a withdrawal takes that back.`],
  [`tax`, `Tax deals`, /tax increment financing|\bTIF\b|tax abatement|tax exempt|Advanced Energy District|special energy improvement|Priority Investment Area/i, `Deals that change what a property pays in taxes, often to help a project get built. Ask what the public gets back and what goes to the schools.`],
  [`land`, `Land and buildings`, /acquire and re-convey|re-convey|\bsell\b|\blease\b|transfer .*parcel|vacate|convey|Land Reutilization|easement|option to purchase/i, `The city buying, selling, leasing, or giving up land or streets.`],
  [`money`, `City loans and grants`, /loan agreement|grant agreement|economic development assistance|financial assistance/i, `City money lent or granted to a business or group.`],
  [`street`, `Streets and sidewalks`, /encroach|right-of-way|Director of Transportation of the State|resurfac|bridge|streetscape|sidewalk|traffic/i, `Work on or use of public streets, sidewalks, and bridges.`],
  [`zoning`, `Zoning`, /zoning|Use,? (?:Area|Height)|Map Change|form-based/i, `Rules for what can be built where.`],
  [`ward`, `Ward money`, /Neighborhood Equity Fund|Casino Revenue/i, `Money each council member steers to groups and projects in their ward.`],
  [`event`, `Events on public streets`, /issuance of a permit for|street closure/i, `Races, festivals, and parades that use public streets.`],
  [`other`, `Other decisions`, /.*/, `Everything else tied to this place.`],
];
const CX_PL_ADMIN = new Set([`By Departmental Request`, `Mayor's Administration`, `Justin M. Bibb`]);
const CX_PL_FINAL = new Set([`approved`, `adopted`, `approved as amended`, `adopted as amended`, `passed on second reading`]);
const CX_PL_ALIAS = {
  "Downtown": [/\bDowntown\b|Playhouse Square|Public Square|Huntington Bank Field|Cleveland Browns|Rocket Arena|Progressive Field|Tower City|Terminal Tower|Theatre District|Warehouse District|Gateway District|North Coast|Erieview|Voinovich|Burke Lakefront|the Mall\b|East 4th Street/i],
  "St.Clair-Superior": [/St\.? ?Clair[- ]Superior/i], "Broadway-Slavic Village": [/Slavic Village|Broadway/i],
  "Goodrich-Kirtland Pk": [/Goodrich|Kirtland|AsiaTown/i], "Buckeye-Shaker Square": [/Shaker Square|Buckeye/i],
  "Buckeye-Woodhill": [/Woodhill|Buckeye/i], "Collinwood-Nottingham": [/Collinwood|Nottingham/i], "North Shore Collinwood": [/Collinwood|Waterloo/i],
};

function cxPlDays(a, b) {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
}
function cxPlLever(m) {
  return CX_PL_LEVERS.find(([, , re]) => re.test(m.title));
}
function cxPlSigner(m) {
  return m.sponsors.find((s) => !CX_PL_ADMIN.has(s)) || ``;
}
function cxPlPath(m) {
  const h = CX_PL.histories[m.file] || [];
  // final vote from the action history; if the history has none but the record lists a passed date, use that
  const fin = h.find((r) => CX_PL_FINAL.has(r[1]) && r[2] === `City Council`) || (m.passed ? [m.passed, `passed (date from the matter record)`, `City Council`] : null);
  const committees = [...new Set(h.filter((r) => /recommended/.test(r[1])).map((r) => r[2]))];
  const flags = h.filter((r) => /denial|tabled|failed|veto/i.test(r[1]));
  return { h, fin, committees, flags, days: fin ? cxPlDays(m.intro, fin[0]) : null };
}
function cxPlMoney(n) {
  return `$${Math.round(n).toLocaleString(`en-US`)}`;
}
function cxPlMedian(xs) {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor((s.length - 1) / 2)] : null;
}

/* which matters are tied to a neighborhood: an address in the title that maps inside it, or the title naming it */
function cxPlItems(hood) {
  const byAddr = new Map();
  for (const [addr, r] of Object.entries(CX_PL.addresses)) if (r.hood === hood) for (const f of r.files) byAddr.set(f, addr);
  const res = CX_PL_ALIAS[hood] || [new RegExp(hood.replace(/[.*+?^${}()|[\]\\]/g, `\\$&`).replace(/-/g, `[- ]`), `i`)];
  const out = [];
  for (const m of CX_LEG.matters) {
    if (!CX_SUBSTANTIVE.has(m.type)) continue;
    const addr = byAddr.get(m.file);
    const named = res.some((re) => re.test(m.title));
    if (addr || named) out.push({ m, why: addr ? `Address in the title (${addr}) is in ${hood}` : `The title names a ${hood} place` });
  }
  return out;
}

/* v5.14: the page's numbers live in plain functions so the phone app reads exactly the same thing. */
let CX_PL_CACHE = null;
function cxPlCity() {
  if (CX_PL_CACHE) return CX_PL_CACHE;
  const sub = CX_LEG.matters.filter((m) => CX_SUBSTANTIVE.has(m.type));
  const allFunds = Object.values(CX_PL.funds).map((f) => {
    const m = CX_LEG.matters.find((x) => x.file === f.file);
    const sw = m.sponsors.filter((x) => !CX_PL_ADMIN.has(x)).map((x) => CX_SPONSOR_WARD[x]).filter(Boolean);
    const named = [...new Set([...(f.wards || []), ...[...m.title.matchAll(/Wards? ((?:\d+(?:, | and | & |,)?)+)/g)].flatMap((g) => g[1].match(/\d+/g).map(Number))])].sort((a, b) => a - b);
    const councilWide = /^AN? (?:EMERGENCY )?ORDINANCE (?:Allocating|Amending the Title|To amend Section 3 of Ordinance No\. 2567)/i.test(m.title);
    const match = !named.length ? sw[0] : named.length === 1 && sw.includes(named[0]) ? named[0] : null;
    const amount = f.limit || (f.amounts.length === 1 ? f.amounts[0] : null);
    const who = (m.title.match(/(?:agreements?|contracts?|payment) (?:with|to) (.+?)(?:,? (?:or its designee|and\/or)|,? for |;| to )/i) || [])[1] || ``;
    return { f, m, ward: match || sw[0] || null, counted: !!match, named, councilWide, amount, who };
  });
  const liquorRows = sub.filter((m) => /liquor permit/i.test(m.title)).map((m) => {
    const addr = Object.entries(CX_PL.addresses).find(([, r]) => r.files.includes(m.file));
    const signerWard = CX_SPONSOR_WARD[cxPlSigner(m)] || null;
    return { m, addr: addr ? addr[0] : null, ward: addr && addr[1].ward2026 ? addr[1].ward2026 : signerWard, withdraw: /withdraw/i.test(m.title), repeals: (m.title.match(/Resolution No\.?\s*([\d-]+)/i) || [])[1] || null, date: (cxPlPath(m).fin || [m.passed || m.intro])[0] };
  });
  CX_PL_CACHE = {
    allFunds,
    liquorRows,
    cityDays: cxPlMedian(sub.map((m) => cxPlPath(m).days).filter((d) => d !== null)),
    unusual: sub.map((m) => ({ m, p: cxPlPath(m) })).filter((x) => x.p.flags.length),
    hoods: CX_GEO.spa.map((s) => s.name).sort(),
  };
  return CX_PL_CACHE;
}
function cxPlShares(key, hood) {
  return Object.entries(CX_GEO.overlap[key]).flatMap(([w, rows]) => rows.filter((r) => r.hood === hood).map((r) => ({ ward: Number(w), share: r.share_of_hood })))
    .filter((r) => r.share >= 0.01).sort((a, b) => b.share - a.share);
}
function cxPlMember(key, w) {
  return (CX_GEO[key].find((x) => x.id === w) || {}).member || ``;
}
function cxPlaceData(hood) {
  const city = cxPlCity();
  const now = cxPlShares(`wards2026`, hood);
  const before = cxPlShares(`wards2014`, hood);
  const nowWards = new Set(now.map((r) => r.ward));
  const items = cxPlItems(hood).map((x) => ({ ...x, lever: cxPlLever(x.m), path: cxPlPath(x.m), signer: cxPlSigner(x.m), city: x.m.sponsors.some((s) => CX_PL_ADMIN.has(s)) }));
  const byAddr = {};
  city.liquorRows.filter((r) => r.ward && nowWards.has(r.ward)).forEach((r) => (byAddr[r.addr || r.m.file] = byAddr[r.addr || r.m.file] || []).push(r));
  const liquor = Object.entries(byAddr).map(([a, rs]) => ({ addr: a, rows: rs.sort((x, y) => (x.date < y.date ? -1 : 1)) })).sort((a, b) => (a.rows[0].ward - b.rows[0].ward) || (a.rows[0].date < b.rows[0].date ? -1 : 1));
  const funds = city.allFunds.filter((r) => !r.councilWide && r.ward && nowWards.has(r.ward)).sort((a, b) => a.ward - b.ward || (b.amount || 0) - (a.amount || 0));
  const passed = items.filter((x) => x.path.days !== null);
  return { hood, now, before, nowWards, items, liquor, funds, councilWideFunds: city.allFunds.filter((r) => r.councilWide), passed, cityDays: city.cityDays, unusual: city.unusual, hoods: city.hoods };
}
/* ward money that the ordinance text ties to one ward (the rule the place page uses for its totals) */
function cxPlWardMoney(ward) {
  const rows = cxPlCity().allFunds.filter((r) => !r.councilWide && r.ward === ward).sort((a, b) => (b.amount || 0) - (a.amount || 0));
  const counted = rows.filter((r) => r.counted);
  return { rows, counted, total: counted.reduce((s, x) => s + (x.amount || 0), 0) };
}

function CX_PlMap({ layer, hood, title, wards }) {
  const L = CX_GEO[layer];
  const H = CX_GEO.spa.find((s) => s.name === hood);
  return (
    <figure className="cx-pl-map">
      <figcaption>{title}</figcaption>
      <svg viewBox={CX_GEO.viewBox} role="img" aria-label={`${title}: ${hood} highlighted; ${wards.map((w) => `Ward ${w.ward}`).join(`, `)}`}>
        {L.map((w) => <path key={w.id} d={w.d} className={wards.some((x) => x.ward === w.id) ? `cx-pl-ward on` : `cx-pl-ward`} />)}
        {H && <path d={H.d} className="cx-pl-hood" />}
        {L.map((w) => <text key={`t${w.id}`} x={w.cx} y={w.cy} className={wards.some((x) => x.ward === w.id) ? `cx-pl-label on` : `cx-pl-label`}>{w.id}</text>)}
      </svg>
    </figure>
  );
}

function CX_Place({ onGo }) {
  const [hood, setHood] = u.useState(`Downtown`);
  const [lever, setLever] = u.useState(`all`);
  const D = u.useMemo(() => cxPlaceData(hood), [hood]);
  const { now, before, items, liquor, funds, councilWideFunds, passed, cityDays, unusual, hoods } = D;
  const pv = cxPlaceVotes(items);
  const member = cxPlMember;
  const shown = lever === `all` ? items : items.filter((x) => x.lever[0] === lever);
  const src = (m) => <a href={m.url} target="_blank" rel="noreferrer">{m.file} <CXI.Ext size={11} /></a>;

  return (
    <section className="civic-page cx-pl">
      <span className="atlas-eyebrow"><CXI.Pin size={15} /> WHO DECIDES HERE?</span>
      <h1>Pick a place. See who decides, how, and how fast.</h1>
      <p className="civic-lede">Everything below comes from public records: the city's ward maps, Council's legislative database, and the ordinance text. Nothing here scores anyone. Where the record is silent, it says so.</p>
      <label className="cx-pl-pick">Neighborhood
        <select value={hood} onChange={(e) => { setHood(e.target.value); setLever(`all`); }}>
          {hoods.map((h) => <option key={h} value={h}>{h}</option>)}
        </select>
      </label>

      <h2><span className="cx-pl-n">1</span> Who represents {hood}, before and after redistricting</h2>
      <p className="cx-pl-intro">In 2025 Council redrew the map from 17 wards to 15. Blue marks the wards that cover {hood}; the outline is the neighborhood's official boundary.</p>
      <div className="cx-pl-maps">
        <CX_PlMap layer="wards2014" hood={hood} title="2014 to 2025 (17 wards)" wards={before} />
        <CX_PlMap layer="wards2026" hood={hood} title="From 2026 (15 wards)" wards={now} />
      </div>
      <div className="cx-pl-cols">
        <div><h3>Before</h3><ul className="cx-pl-shares">{before.map((r) => <li key={r.ward}><b>Ward {r.ward}</b><span>{Math.round(r.share * 100)}% of the neighborhood's area</span>{member(`wards2014`, r.ward) && <small>Listed in the city's map file: {member(`wards2014`, r.ward)}</small>}</li>)}</ul></div>
        <div><h3>Now</h3><ul className="cx-pl-shares">{now.map((r) => <li key={r.ward}><b>Ward {r.ward}</b><span>{Math.round(r.share * 100)}% of the neighborhood's area</span><small>{member(`wards2026`, r.ward)}</small><button type="button" className="cx-link-button" onClick={() => { CX_FOCUS.v = `ward-${r.ward}`; CX_NAV.panel(`leaders`); }}>Open their profile <CXI.Arrow size={12} /></button></li>)}</ul></div>
      </div>
      <p className="cx-pl-note">Shares are by land area, not by how many people live there. {now.length > 1 ? `With ${now.length} council members covering parts of ${hood}, check which side of the line your address is on before you call.` : ``} Sources: <a href={CX_GEO.src.wards2014} target="_blank" rel="noreferrer">2014 ward map</a> · <a href={CX_GEO.src.wards2026} target="_blank" rel="noreferrer">2026 ward map (Ord. No. 1-2025)</a> · <a href={CX_GEO.src.spa} target="_blank" rel="noreferrer">neighborhood boundaries</a>, City of Cleveland open data.</p>

      <h2><span className="cx-pl-n">2</span> 2026 decisions tied to {hood}</h2>
      <p className="cx-pl-intro">A decision is tied here when a street address in its title maps inside {hood}, or when the title names a {hood} place. Titles without an address are not counted, so this list is a floor, not the whole picture.</p>
      <div className="cx-pl-levers" role="group" aria-label="Filter by lever">
        <button type="button" aria-pressed={lever === `all`} onClick={() => setLever(`all`)}>All ({items.length})</button>
        {CX_PL_LEVERS.map(([id, label]) => { const n = items.filter((x) => x.lever[0] === id).length; return n ? <button key={id} type="button" aria-pressed={lever === id} onClick={() => setLever(id)}>{label} ({n})</button> : null; })}
      </div>
      {lever !== `all` && <p className="cx-pl-note">{CX_PL_LEVERS.find((l) => l[0] === lever)[3]}</p>}
      {!items.length && <p className="cx-pl-empty">No 2026 decisions are tied to {hood} by address or name in this record.</p>}
      <ul className="cx-pl-items">
        {shown.map(({ m, why, lever: lv, path, signer, city }) => (
          <li key={m.file}>
            <div className="cx-pl-row1"><span className="cx-pl-tag">{lv[1]}</span><span className={city ? `cx-pl-origin city` : `cx-pl-origin member`}><i />{city ? `Sent by the mayor's administration` : `Written by a council member`}</span>{/^Emergency/.test(m.type) && <span className="cx-pl-origin fast"><i />Emergency: takes effect right away</span>}</div>
            <p className="cx-pl-title">{cxShortTitle(m.title)}</p>
            <p className="cx-pl-meta">{signer ? <>Signed first by <b>{signer}</b>{CX_SPONSOR_WARD[signer] ? ` (Ward ${CX_SPONSOR_WARD[signer]})` : ``}</> : `No council member listed`} · {m.status} · {path.days !== null ? `${path.days} days from introduced to final vote` : `no final vote yet`} · {src(m)}</p>
            <p className="cx-pl-why">{why}</p>
          </li>
        ))}
      </ul>

      <h2><span className="cx-pl-n">3</span> Liquor permit objections in {now.map((r) => `Ward ${r.ward}`).join(`, `) || `these wards`}</h2>
      <p className="cx-pl-intro">This is the lever only a ward member holds. Each line shows an objection, and a later withdrawal when there was one. A withdrawal often means conditions were worked out; the record does not say what they were.</p>
      {!liquor.length && <p className="cx-pl-empty">No 2026 liquor permit resolutions in these wards.</p>}
      <ul className="cx-pl-liquor">
        {liquor.map(({ addr, rows }) => (
          <li key={addr}>
            <b>{/^\d/.test(addr) ? addr : `Address not in title`}</b> <small>Ward {rows[0].ward}</small>
            <ol>{rows.map((r) => <li key={r.m.file} className={r.withdraw ? `wd` : `ob`}><i />{r.date}: {r.withdraw ? `Objection withdrawn` : `Objection filed`}{r.repeals ? ` (repeals Res. ${r.repeals})` : ``} by {cxPlSigner(r.m)} · {src(r.m)}</li>)}</ol>
          </li>
        ))}
      </ul>

      <h2><span className="cx-pl-n">4</span> How fast decisions moved</h2>
      <p className="cx-pl-intro">From the day a proposal was introduced to Council's final vote, with the committees it passed through. Emergency measures take effect as soon as they pass, so the committee hearing is usually the last chance to weigh in.</p>
      <div className="cx-pl-stats">
        <div><b>{passed.length ? cxPlMedian(passed.map((x) => x.path.days)) : `–`}</b><span>median days here</span></div>
        <div><b>{cityDays ?? `–`}</b><span>median days citywide</span></div>
        <div><b>{items.filter((x) => /^Emergency/.test(x.m.type)).length} of {items.length}</b><span>passed or pending as emergency measures</span></div>
        <div><b>{passed.filter((x) => x.path.days <= 7).length}</b><span>went from introduced to final vote within a week</span></div>
      </div>
      <ul className="cx-pl-speed">
        {passed.sort((a, b) => a.path.days - b.path.days).map(({ m, path }) => (
          <li key={m.file}><span className="cx-pl-bar" style={{ width: `${Math.min(100, 6 + path.days / 1.5)}%` }} /><span className="cx-pl-speedtxt"><b>{path.days} days</b> · {cxShortTitle(m.title).slice(0, 90)}{cxShortTitle(m.title).length > 90 ? `…` : ``} · {path.committees.length ? path.committees.join(`, `) : `no committee step recorded`} · {src(m)}</span></li>
        ))}
      </ul>

      <h2><span className="cx-pl-n">5</span> Ward money in {now.map((r) => `Ward ${r.ward}`).join(`, `) || `these wards`}</h2>
      <p className="cx-pl-intro">Each council member steers a Neighborhood Equity Fund, and casino revenue is set aside for Council use. Amounts come from the ordinance text ("not to exceed" limits when stated). Ward money is spent across the whole ward, so not all of it reaches {hood}.</p>
      {!funds.length && <p className="cx-pl-empty">No 2026 ward-money items led by these wards' members.</p>}
      {now.map((r) => { const rs = funds.filter((x) => x.ward === r.ward); if (!rs.length) return null; const total = rs.filter((x) => x.counted).reduce((s, x) => s + (x.amount || 0), 0); return (
        <div key={r.ward} className="cx-pl-fund">
          <h3>Ward {r.ward}, {member(`wards2026`, r.ward)} <small>{rs.length} items · {cxPlMoney(total)} in listed amounts for this ward</small></h3>
          <ul>{rs.map((x) => <li key={x.m.file}><b>{x.amount ? cxPlMoney(x.amount) : `Amount not stated`}</b> {x.who ? `to ${x.who}` : ``}{!x.counted && <em className="cx-pl-flag">{x.named.length > 1 ? ` Shared by Wards ${x.named.join(`, `)}; not counted in the total.` : ` Fund named in the text: Ward ${x.named.join(`, `)}, which may use the ward numbers from before 2026; not counted in the total.`}</em>} <small>{cxShortTitle(x.m.title).slice(0, 120)}… · Sponsors: {x.m.sponsors.filter((y) => !CX_PL_ADMIN.has(y)).join(`, `)} · {x.f.text_url ? <a href={x.f.text_url} target="_blank" rel="noreferrer">ordinance text <CXI.Ext size={11} /></a> : null} · {src(x.m)}</small></li>)}</ul>
        </div>); })}
      {councilWideFunds.length > 0 && <div className="cx-pl-fund"><h3>Council-wide fund rules <small>not tied to one ward</small></h3>
        <ul>{councilWideFunds.map((x) => <li key={x.m.file}>{cxShortTitle(x.m.title).slice(0, 160)}… <small>Sponsors: {x.m.sponsors.filter((y) => !CX_PL_ADMIN.has(y)).join(`, `)} · {src(x.m)}</small></li>)}</ul></div>}

      <h2><span className="cx-pl-n">6</span> What the record shows about votes</h2>
      <p className="cx-pl-intro">Council's database records the outcome of each vote (approved, adopted, amended) and each committee's recommendation. For a vote to pass an ordinance or adopt a resolution, the City Record also prints how each member voted. Where it does, that is counted here. A file with no printed vote has no record, which is not a no.</p>
      <div className="cx-pl-stats">
        <div><b>{passed.length}</b><span>decisions here with a recorded final vote</span></div>
        <div><b>{items.filter((x) => x.path.fin && /amended/.test(x.path.fin[1])).length}</b><span>changed before passing ("as amended")</span></div>
        <div><b>{pv.withRoll.length}</b><span>of these have a member-by-member vote in the City Record</span></div>
      </div>
      {pv.split.length > 0 && <>
        <h3>Here: votes that were not unanimous</h3>
        <ul className="cx-pl-items">{pv.split.map((x) => <li key={x.m.file}><p className="cx-pl-title">{cxShortTitle(x.m.title)}</p><p className="cx-pl-meta">{cxVoteSplitText(x)} · {src(x.m)}</p></li>)}</ul>
      </>}
      {unusual.length > 0 && <>
        <h3>Citywide: decisions that did not simply pass</h3>
        <ul className="cx-pl-items">{unusual.map(({ m, p }) => <li key={m.file}><p className="cx-pl-title">{cxShortTitle(m.title)}</p><p className="cx-pl-meta">{p.flags.map((f) => `${f[0]}: ${f[1]} (${f[2]})`).join(` · `)} · {src(m)}</p></li>)}</ul>
      </>}
      <details className="context-notes cx-method">
        <summary><CXI.Help size={16} /> How this page works</summary>
        <ul>
          <li>Maps: City of Cleveland open data, retrieved {CX_GEO.retrieved.slice(0, 10)}. Ward shares are by land area.</li>
          <li>Decisions: Council's Legistar database ({CX_LEG.count} items since Jan. 1, 2026), action histories retrieved {CX_PL.retrieved.slice(0, 10)}. Addresses in titles were located with the U.S. Census Bureau geocoder; {Object.values(CX_PL.addresses).filter((r) => r.hood).length} of {Object.keys(CX_PL.addresses).length} addresses fell inside a mapped neighborhood.</li>
          <li>"Signed first" is the first council member listed on the record. For city requests, that is usually the ward member and the committee chair, and it does not by itself show personal support.</li>
          <li>Ward money amounts are read from the ordinance text and may not match final spending.</li>
          <li>How each member voted: the City Record, Council's weekly official publication, pulled {CX_VOTES.retrieved_at.slice(0, 10)}. It prints names only for votes to pass or adopt, so a vote to suspend the rules shows no names.</li>
          <li>Not in any of these records: meetings held or calls returned. Absences appear only where the City Record prints them on a vote.</li>
        </ul>
      </details>
    </section>
  );
}
