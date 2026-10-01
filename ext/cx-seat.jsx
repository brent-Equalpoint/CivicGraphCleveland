/* v5.16 formal profiles: one neutral fact sheet per seat (the 15 council members and the Mayor).
   Every visitor sees the same page in the same order, so people compare by reading, never by a score.
   Sections: header, at a glance, what the office does, this year's record, money and decisions,
   how they voted, ward and neighborhoods, sources.
   Rules kept: receipts, not scores (no rankings, percentages of agreement, or ideology labels);
   sponsorship is not a vote; a missing record is not a no; names, not pronouns; nothing personal in
   links or requests. Facts come from the same snapshots as the rest of the app (data/legistar,
   place, people) and from the app's official-source room nodes. Committee seats are NOT shown:
   Legistar does not list them, and nothing here guesses.
   Shared by the desktop Profiles page and the phone sheet. */


/* OFFICE-TEXT-START
   What a profile says each office does, and who holds a leadership role. This is interpretive text, so it needs a person's
   approval. build.py fingerprints everything between these two markers. A person reads it against the sources named below,
   then runs:  python build.py --mark-office-reviewed "Your Name"   The profile shows "Reviewed by ..." only while the
   fingerprint still matches, and shows "not yet reviewed by a person" the moment this text changes. The text was carried over
   from the app's existing Council and Mayor descriptions; it has not been re-read by a person. The leadership roles come from
   the same existing data, whose source link goes to Council's find-my-ward page, which may not state roles at all: check that. */
const CX_OFFICE_TEXT = {
  council: {
    summary: `A 15-member legislative body. Members represent wards, introduce and sponsor legislation, work through committees, and vote as a full council.`,
    authority: [`Legislate`, `Appropriate funds`, `Confirm or review appointments where required`, `Conduct public committee hearings`],
    source: { label: `Cleveland City Council`, url: `https://www.clevelandcitycouncil.gov/` },
  },
  mayor: {
    summary: `Cleveland's mayor and chief executive officer. The office directs the administration and may issue executive orders to city divisions, departments, and agencies.`,
    authority: [`Chief executive officer`, `Direct city administration`, `Issue executive orders`, `Appoint officials where authorized`],
    activity: [`Chairs the Municipal Cabinet for Children and Youth under Executive Order 2025-01`],
    source: { label: `Office of the Mayor`, url: `https://www.clevelandohio.gov/mayor` },
  },
  roles: { 6: `Council President`, 14: `Majority Leader`, 15: `Majority Whip` },
  rolesSource: { label: `Official 2026 ward directory`, url: `https://www.clevelandcitycouncil.gov/find-my-ward` },
};
/* OFFICE-TEXT-END */

/* Where a resident reports a mistake. Add an email address to CX_CORRECTION.email to offer one beside the GitHub form. */
const CX_CORRECTION = { repo: `brent-Equalpoint/CivicGraphCleveland`, email: `` };
function cxReportLink(label) {
  return `https://github.com/${CX_CORRECTION.repo}/issues/new?${new URLSearchParams({ template: `mistake.yml`, title: `Mistake: ${label}`, page: label })}`;
}
const CX_SEAT_SEL = { v: null };
const CX_COUNCIL_SITE = `https://www.clevelandcitycouncil.gov/`;
const CX_MAYOR_SITE = `https://www.clevelandohio.gov/mayor`;
const CX_EO_SITE = `https://www.clevelandohio.gov/mayor/executive-orders`;
const CX_LEGISTAR_PEOPLE = `https://cityofcleveland.legistar.com/People.aspx`;

function cxOpenProfile(seatId) {
  CX_SEAT_SEL.v = seatId;
  CX_NAV.panel(`profiles`);
}
function cxSeatNode(id) {
  for (const r of Uh) { const n = r.nodes.find((x) => x.id === id); if (n) return n; }
  return null;
}
function cxLongDate(iso) {
  if (!iso) return ``;
  try { return new Date(`${iso}T12:00:00`).toLocaleDateString(`en-US`, { month: `long`, day: `numeric`, year: `numeric` }); } catch { return iso; }
}
function cxSeatList() {
  const idx = cxLegIndex();
  return [{ id: `mayor`, label: `Mayor`, name: `Justin M. Bibb` }, ...idx.seats.map((s) => ({ id: s.id, label: `Ward ${s.ward}`, name: s.name }))];
}
function cxSeatData(seatId) {
  const idx = cxLegIndex();
  const isMayor = seatId === `mayor`;
  const seat = isMayor ? idx.admin : idx.seats.find((s) => s.id === seatId);
  if (!seat) return null;
  const node = cxSeatNode(isMayor ? `mayor` : seatId);
  const name = isMayor ? `Justin M. Bibb` : seat.name;
  const person = CX_PEOPLE.people.find((p) => (isMayor ? p.title === `Mayor` : p.title === `Council Member`) && cxmSamePerson(p.name, name)) || null;
  const parts = isMayor ? null : cxmSplit(seat);
  const byWhen = [...new Map(seat.items.map((x) => [x.m.file, x.m])).values()].sort((a, b) => (cxmWhen(a) < cxmWhen(b) ? 1 : -1));
  let money = null, liquor = [], hoods = [];
  if (!isMayor) {
    money = cxPlWardMoney(seat.ward);
    liquor = cxPlCity().liquorRows.filter((r) => r.ward === seat.ward);
    hoods = cxPlCity().hoods.map((h) => { const s = cxPlShares(`wards2026`, h).find((r) => r.ward === seat.ward); return s ? { h, share: s.share } : null; })
      .filter(Boolean).sort((a, b) => b.share - a.share);
  }
  return { isMayor, seat, node, name, person, parts, recent: byWhen.slice(0, 5), money, liquor, hoods, council: cxSeatNode(`council`) };
}

/* A source link, with a plain notice beside it if the weekly link check (scripts/check_links.py) found it dead twice in a row. */
function SpBroken({ url }) {
  const b = CX_LINKS.broken[url];
  return b ? <span className="sp-broken"> This source did not answer on the last checks, since {cxLongDate(b.since)}. The record may have moved; search Council's legislative record for the file number.</span> : null;
}
function SpLink({ href, children }) {
  return <><a href={href} target="_blank" rel="noreferrer">{children}<span className="sp-ext"> (opens in a new tab)</span></a><SpBroken url={href} /></>;
}
function SpFile({ m }) {
  return <><a href={m.url} target="_blank" rel="noreferrer">{m.file}</a><SpBroken url={m.url} /><SpReviewed file={m.file} /></>;
}

function CX_SeatProfile({ seatId }) {
  const d = u.useMemo(() => cxSeatData(seatId), [seatId]);
  if (!d) return <p>We could not find that seat.</p>;
  const { isMayor, seat, node, name, person, parts, recent, money, liquor, hoods, council } = d;
  const office = isMayor ? `Mayor of Cleveland` : `Council Member, Ward ${seat.ward}`;
  const role = !isMayor ? CX_OFFICE_TEXT.roles[seat.ward] || null : null;
  const termText = person ? `${cxLongDate(person.start)} to ${cxLongDate(person.end)}` : node && node.term ? node.term : `Not in the record`;
  const lead = isMayor ? CX_OFFICE_TEXT.mayor : CX_OFFICE_TEXT.council;
  const rev = CX_OFFICE_REVIEW;
  const sec = (id) => `sp-${seatId}-${id}`;
  const own = parts ? parts.own : [], joined = parts ? parts.joined : [], dept = parts ? parts.dept : [];
  const listOf = (items) => (
    <ul className="sp-list">{items.slice(0, 12).map((x) => (
      <li key={x.m.file}><SpFile m={x.m} />: {cxWords(cxShortTitle(x.m.title), 16)}</li>
    ))}{items.length > 12 && <li>And {items.length - 12} more in Council's record.</li>}</ul>
  );
  return (
    <article className="sp" aria-labelledby={sec(`h`)}>
      <header className="sp-head">
        {seat.portrait && <img src={cxmAsset(seat.portrait)} alt={`Official portrait of ${name}`} width="96" height="96" />}
        <div>
          <h1 id={sec(`h`)}>{name}</h1>
          <p className="sp-office">{office}{role ? `, ${role}` : ``}</p>
          <p className="sp-chips"><span className="sp-chip">Official source</span><span className="sp-asof">Records pulled {cxShortDate(cxDayET(Date.parse(CX_LEG.retrieved_at)))}</span></p>
        </div>
      </header>

      <section aria-labelledby={sec(`glance`)}>
        <h2 id={sec(`glance`)}>At a glance</h2>
        <dl className="sp-dl">
          <dt>Office</dt><dd>{office}</dd>
          <dt>Area served</dt><dd>{isMayor ? `All of Cleveland` : `Ward ${seat.ward}`}</dd>
          <dt>Term</dt><dd>{termText}</dd>
          {role && <><dt>Leadership role</dt><dd>{role}, from <SpLink href={CX_OFFICE_TEXT.rolesSource.url}>{CX_OFFICE_TEXT.rolesSource.label}</SpLink>. {rev.ok ? `Reviewed by ${rev.by} on ${cxLongDate(rev.checked)}.` : `A person has not yet checked this role against its source.`}</dd></>}
          {!isMayor && <><dt>Committees</dt><dd>Council's public record in Legistar does not list committee seats. <SpLink href={CX_COUNCIL_SITE}>Council's website</SpLink> lists committee assignments.</dd></>}
          <dt>Official pages</dt>
          <dd>
            <SpLink href={isMayor ? CX_MAYOR_SITE : CX_COUNCIL_SITE}>{isMayor ? `Office of the Mayor` : `Cleveland City Council`}</SpLink>
            <br /><SpLink href={CX_LEGISTAR_PEOPLE}>People in Council's legislative record</SpLink>
          </dd>
        </dl>
      </section>

      <section aria-labelledby={sec(`does`)}>
        <h2 id={sec(`does`)}>What this office does</h2>
        {lead && <p>{lead.summary}</p>}
        {lead && lead.authority && <ul className="sp-list">{lead.authority.map((a) => <li key={a}>{a}</li>)}</ul>}
        <p className="sp-note">{rev.ok ? `This description was reviewed by ${rev.by} on ${cxLongDate(rev.checked)}.` : `A person has not yet reviewed this description against its source. Read it as a starting point, and check the source.`}</p>
        <p className="sp-src">Source: <SpLink href={lead.source.url}>{lead.source.label}</SpLink>.</p>
      </section>

      <section aria-labelledby={sec(`record`)}>
        <h2 id={sec(`record`)}>This year's record</h2>
        {isMayor ? (
          <>
            <p>The Mayor's administration sent {cxmPl(seat.items.length, `request`, `requests`)} to Council in 2026. City departments send routine requests such as contracts, grants, and project steps. Council still decides each one.</p>
            {lead.activity && lead.activity.length > 0 && <ul className="sp-list">{lead.activity.map((a) => <li key={a}>{a}</li>)}</ul>}
            <p className="sp-src">Executive orders: <SpLink href={CX_EO_SITE}>the Mayor's list of executive orders</SpLink>.</p>
          </>
        ) : (
          <>
            <ul className="sp-counts">
              <li><strong>{own.length}</strong> proposals led, as the first name on the file</li>
              <li><strong>{joined.length}</strong> proposals joined as a co-sponsor</li>
              <li><strong>{dept.length}</strong> items signed for a city department</li>
            </ul>
            <p className="sp-note">These are counts of what is in Council's public record, not grades. Sponsoring a proposal is not the same as voting for it.</p>
            <SpReviewedCount files={[...new Set([...own, ...joined, ...dept, ...recent].map((x) => (x.m || x).file))]} />
            {own.length > 0 && <details><summary>Proposals {name} led ({own.length})</summary>{listOf(own)}</details>}
            {joined.length > 0 && <details><summary>Proposals {name} joined ({joined.length})</summary>{listOf(joined)}</details>}
          </>
        )}
      </section>

      <section aria-labelledby={sec(`money`)}>
        <h2 id={sec(`money`)}>{isMayor ? `Recent items from the administration` : `Money and decisions tied to this seat`}</h2>
        {!isMayor && (money && money.counted.length > 0 ? (
          <>
            <p>Casino revenue and Neighborhood Equity money that ordinance text ties to Ward {seat.ward}: {cxmMoney(money.total)} across {cxmPl(money.counted.length, `item`, `items`)}.</p>
            <ul className="sp-list">{money.counted.slice(0, 5).map((r) => <li key={r.m.file}>{cxmMoney(r.amount)}{r.who ? ` to ${r.who}` : ``}: <SpFile m={r.m} /></li>)}</ul>
          </>
        ) : <p>No ward money tied to Ward {seat.ward} was found in this year's ordinance text. Missing here means none was found, not that nothing happened.</p>)}
        {!isMayor && liquor.length > 0 && <p>Liquor permit objections in Ward {seat.ward}: {cxmPl(liquor.filter((r) => !r.withdraw).length, `filed`, `filed`)}, {liquor.filter((r) => r.withdraw).length} withdrawn.</p>}
        {recent.length > 0 ? (
          <>
            <h3>The five most recent actions</h3>
            <ul className="sp-list">{recent.map((m) => <li key={m.file}><SpFile m={m} />: {cxWords(cxShortTitle(m.title), 16)}. {cxmStatus(m).label}, {cxmDate(cxmWhen(m))}.</li>)}</ul>
          </>
        ) : <p>No proposals under this seat are in the record yet.</p>}
      </section>

      <section aria-labelledby={sec(`votes`)}>
        <h2 id={sec(`votes`)}>How they voted</h2>
        <p>Council's database records what passed and who sponsored it. It does not publish each member's vote. The roll calls are in the City Record, and they are not part of this page yet. A missing record is not a no, and an absence here is not an abstention.</p>
      </section>

      {!isMayor && (
        <section aria-labelledby={sec(`ward`)}>
          <h2 id={sec(`ward`)}>Ward {seat.ward} and its neighborhoods</h2>
          <SpWardMap ward={seat.ward} hoods={hoods} />
          {hoods.length > 0 ? (
            <>
              <p>These neighborhoods touch Ward {seat.ward} on the 2026 map. The share is how much of that neighborhood's land is in this ward, not how many people live there.</p>
              <ul className="sp-list">{hoods.slice(0, 10).map((x) => <li key={x.h}>{x.h}: {Math.round(x.share * 100)}% of the neighborhood</li>)}</ul>
            </>
          ) : <p>No neighborhood overlap is loaded for this ward.</p>}
          <p className="sp-src">Wards changed from 17 to 15 for the term that began in 2026. Not sure of your ward? Your address decides it. <SpLink href="https://www.clevelandcitycouncil.gov/find-my-ward">Find my ward</SpLink>.</p>
        </section>
      )}

      <section aria-labelledby={sec(`sources`)}>
        <h2 id={sec(`sources`)}>Sources and corrections</h2>
        <ul className="sp-list">
          <li>Legislation, sponsors, and passed dates: <SpLink href="https://cityofcleveland.legistar.com/Legislation.aspx">Council's legislative record (Legistar)</SpLink>, pulled {cxShortDate(cxDayET(Date.parse(CX_LEG.retrieved_at)))}.</li>
          <li>Committee and Council actions: the same record, pulled {cxShortDate(cxDayET(Date.parse(CX_PL.retrieved)))}.</li>
          <li>Who holds the seat and the term: Legistar's office records, pulled {cxShortDate(cxDayET(Date.parse(CX_PEOPLE.retrieved_at)))}. <SpLink href={CX_LEGISTAR_PEOPLE}>People in Legistar</SpLink>.</li>
          {!isMayor && <li>Ward map and neighborhoods: the City of Cleveland's open data ward and neighborhood maps.</li>}
          {node && node.sourceUrl && <li>Portrait and role: <SpLink href={node.sourceUrl}>{node.sourceLabel || `official directory`}</SpLink>.</li>}
        </ul>
        <p className="sp-src">Spotted a mistake? <SpLink href={cxReportLink(`Profile of ${isMayor ? `the Mayor` : `Ward ${seat.ward}`}`)}>Report it on GitHub</SpLink>. A free GitHub account is needed, and reports are public, so leave out anything personal.{CX_CORRECTION.email ? <> Or write to <a href={`mailto:${CX_CORRECTION.email}`}>{CX_CORRECTION.email}</a>.</> : null} A person checks each report against the official record, and what they decide is listed under Corrections on the How this is built page. The official records above are always the place to check a fact yourself.</p>
        <p className="sp-actions"><button type="button" onClick={() => globalThis.print()}>Print this profile</button></p>
      </section>
    </article>
  );
}

/* ---------- desktop Profiles page (sidebar: Profiles) ---------- */
function CX_Profiles() {
  const list = u.useMemo(cxSeatList, []);
  const fromUrl = (() => { try { return new URLSearchParams(globalThis.location.search).get(`seat`); } catch { return null; } })();
  const [sel, setSel] = u.useState(() => [CX_SEAT_SEL.v, fromUrl].find((s) => s && list.some((x) => x.id === s)) || `mayor`);
  u.useEffect(() => { CX_SEAT_SEL.v = sel; }, [sel]);
  return (
    <section className="sp-page" aria-labelledby="sp-page-h">
      <h1 id="sp-page-h" className="sp-page-h">Profiles</h1>
      <p className="sp-lede">One fact sheet for each of the 15 council members and the Mayor, in the same order every time. Every fact links to its public record.</p>
      <nav className="sp-pick" aria-label="Choose a seat">
        {list.map((x) => (
          <button key={x.id} type="button" className={x.id === sel ? `on` : ``} aria-current={x.id === sel ? `true` : undefined} onClick={() => setSel(x.id)}>
            <span>{x.label}</span><small>{x.name}</small>
          </button>
        ))}
      </nav>
      <CX_SeatProfile seatId={sel} />
    </section>
  );
}

/* ---------- ward map for a profile (the same 2026 map the phone uses; the text equivalent is the neighborhood list beside it) ---------- */
function SpWardMap({ ward, hoods }) {
  const names = hoods.slice(0, 6).map((x) => x.h).join(`, `);
  return (
    <figure className="sp-map">
      <svg viewBox={CX_GEO.viewBox} role="img" aria-label={`Map of Cleveland's ${CX_GEO.wards2026.length} wards on the 2026 map with Ward ${ward} highlighted.${names ? ` Its largest neighborhoods include ${names}.` : ``} The full list is below.`}>
        {CX_GEO.wards2026.map((w) => <path key={w.id} d={w.d} className={`sp-ward ${w.id === ward ? `on` : ``}`} />)}
        {CX_GEO.wards2026.map((w) => <text key={`t${w.id}`} x={w.cx} y={w.cy} className={`sp-ward-t ${w.id === ward ? `on` : ``}`}>{w.id}</text>)}
      </svg>
      <figcaption>Ward {ward} on the 2026 map of Cleveland's 15 wards. The neighborhoods are listed below in words.</figcaption>
    </figure>
  );
}

/* A button inside the map's record drawer for a council member or the Mayor. Other records show nothing. */
function CX_DrawerProfile({ node }) {
  if (!node || !(node.id === `mayor` || /^ward-\d+$/.test(node.id))) return null;
  return <p className="cx-drawer-profile"><button type="button" className="cx-link-button" onClick={() => cxOpenProfile(node.id)}>Read the formal profile of {node.name}<CXI.Arrow size={13} /></button></p>;
}

/* ---------- the Bench's approved records, read from the hosted site (stage 8) ---------- */
const CX_BENCH = { p: null, v: null };
function cxBench() {
  if (!CX_BENCH.p) {
    const web = typeof fetch === `function` && /^https?:$/.test(String(globalThis.location?.protocol || ``));
    CX_BENCH.p = (web ? fetch(`/bench/public-2026.json`, { cache: `no-cache` }).then((r) => (r.ok ? r.json() : null)).catch(() => null) : Promise.resolve(null)).then((d) => (CX_BENCH.v = d));
  }
  return CX_BENCH.p;
}
function useBench() {
  const [d, setD] = u.useState(CX_BENCH.v);
  u.useEffect(() => { let live = !0; cxBench().then((x) => live && setD(x)); return () => { live = !1; }; }, []);
  return d;
}
const SP_STATE = { verified: `Checked`, partial: `Partly checked`, missing: `Not in the record`, contested: `Records disagree`, stale: `May be out of date`, not_applicable: `Does not apply` };
function SpReviewed({ file }) {
  const bench = useBench();
  const r = bench && bench.records && bench.records[file];
  if (!r) return null;
  const rv = r.reviewed;
  return (
    <details className="sp-reviewed">
      <summary><span className="sp-rev">Reviewed</span> Checked against its sources by {rv.by_name} on {cxLongDate(String(rv.at).slice(0, 10))}</summary>
      <p>{r.summary}</p>
      <p><strong>What was checked.</strong></p>
      <ul className="sp-list">{r.claims.map((c, i) => <li key={i}>{c[2]} <em>{SP_STATE[c[1]] || c[1]}.</em>{c[1] !== `verified` && c[3] ? ` ${c[3]}` : ``}</li>)}</ul>
      {r.member_votes && r.member_votes.length > 0 && (
        <>
          <p><strong>How each member voted, from the roll call record.</strong></p>
          <ul className="sp-list">{r.member_votes.map((v) => <li key={v.name}>{v.ward ? `Ward ${v.ward}, ` : ``}{v.name}: {v.vote}</li>)}</ul>
        </>
      )}
      <p><strong>What the reviewer saw and recorded.</strong></p>
      <ul className="sp-list">
        {rv.dissent ? <li>A note kept on the record: {rv.dissent}</li> : rv.no_dissent ? <li>The reviewer looked for counterevidence and recorded none.</li> : null}
        {(rv.skeptic_notes || []).map((n) => <li key={n}>The checker flagged: {n}</li>)}
        {rv.veto_overridden && <li>The checker vetoed this record, and the publisher approved it anyway, writing: {rv.override_reason}</li>}
      </ul>
      <p><strong>Where it comes from.</strong></p>
      <ul className="sp-list">{r.sources.map((s) => <li key={s.url + s.locator}><SpLink href={s.url}>{s.locator}</SpLink></li>)}</ul>
      <p className="sp-src">This is the version approved on {cxLongDate(String(rv.at).slice(0, 10))}. If the official record changes, this mark goes away until a person checks the new version.</p>
    </details>
  );
}
/* one line for the whole profile: how many of its items a person has checked */
function SpReviewedCount({ files }) {
  const bench = useBench();
  if (!bench || !bench.records) return null;
  const n = files.filter((f) => bench.records[f]).length;
  return <p className="sp-note">{n > 0 ? `${n} of the ${files.length} items on this page have a reviewed record: a named person checked it against its sources. Open one marked Reviewed to see what was checked.` : `No item on this page has been reviewed by a person yet. When one is, it shows a Reviewed mark with who checked it, what they found, and where it comes from.`}</p>;
}
/* "How this is built": where the Bench stands right now, read from the nightly status file */
function CX_BenchStatus() {
  const [s, setS] = u.useState(null);
  const [cr, setCr] = u.useState(null);
  u.useEffect(() => {
    const web = typeof fetch === `function` && /^https?:$/.test(String(globalThis.location?.protocol || ``));
    if (!web) return;
    fetch(`/bench/status-2026.json`, { cache: `no-cache` }).then((r) => (r.ok ? r.json() : null)).then(setS).catch(() => {});
    fetch(`/bench/corrections-2026.json`, { cache: `no-cache` }).then((r) => (r.ok ? r.json() : null)).then(setCr).catch(() => {});
  }, []);
  const c = s && s.counts;
  const DISP = { confirmed: `Confirmed and being fixed`, unconfirmed: `Not supported by the official record`, duplicate: `Already reported`, out_of_scope: `Not about a fact in the app` };
  return (
    <>
      {s && (
        <div className="civic-card cx-bench-status">
          <h2>Review status, as of {cxShortDate(cxDayET(Date.parse(s.as_of)))}</h2>
          <ul>
            <li><strong>{c.approved_current}</strong> approved by a named publisher and still current</li>
            <li><strong>{c.approved_stale}</strong> approved earlier, but the source changed, so a person must look again</li>
            <li><strong>{c.human_required}</strong> need a person to look before they can be approved</li>
            <li><strong>{c.blocked + c.quarantined}</strong> held back by a check, such as a name that could mean two people</li>
            <li><strong>{c.awaiting_review}</strong> passed the checks and are waiting for a person</li>
          </ul>
          <p className="cx-muted">{s.packets} Council items are tracked. Nothing is shown as reviewed until a named publisher has approved that exact version.</p>
        </div>
      )}
      {cr && (
        <div className="civic-card cx-bench-status">
          <h2>Corrections</h2>
          {cr.count === 0
            ? <p>No mistake report has been decided yet. If you spot one, each profile has a link to report it. A person checks every report against the official record and lists the decision here.</p>
            : <><p><strong>{cr.count}</strong> report{cr.count === 1 ? `` : `s`} decided, <strong>{cr.confirmed}</strong> confirmed.</p>
              <ul>{cr.corrections.slice(0, 8).map((x) => <li key={x.issue}><a href={x.url} target="_blank" rel="noreferrer">Report {x.issue}</a>, {x.page}: <strong>{DISP[x.disposition] || x.disposition}.</strong> {x.note} ({cxShortDate(cxDayET(Date.parse(x.decided_at)))})</li>)}</ul></>}
        </div>
      )}
    </>
  );
}
