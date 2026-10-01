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

function SpLink({ href, children }) {
  return <a href={href} target="_blank" rel="noreferrer">{children}<span className="sp-ext"> (opens in a new tab)</span></a>;
}

function CX_SeatProfile({ seatId }) {
  const d = u.useMemo(() => cxSeatData(seatId), [seatId]);
  if (!d) return <p>We could not find that seat.</p>;
  const { isMayor, seat, node, name, person, parts, recent, money, liquor, hoods, council } = d;
  const office = isMayor ? `Mayor of Cleveland` : `Council Member, Ward ${seat.ward}`;
  const role = !isMayor && node && node.status && node.status !== `Council member` ? node.status : null;
  const termText = person ? `${cxLongDate(person.start)} to ${cxLongDate(person.end)}` : node && node.term ? node.term : `Not in the record`;
  const lead = isMayor ? node : council;
  const sec = (id) => `sp-${seatId}-${id}`;
  const own = parts ? parts.own : [], joined = parts ? parts.joined : [], dept = parts ? parts.dept : [];
  const listOf = (items) => (
    <ul className="sp-list">{items.slice(0, 12).map((x) => (
      <li key={x.m.file}><a href={x.m.url} target="_blank" rel="noreferrer">{x.m.file}</a>: {cxWords(cxShortTitle(x.m.title), 16)}</li>
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
          {role && <><dt>Leadership role</dt><dd>{role}, from Council's 2026 directory</dd></>}
          {!isMayor && <><dt>Committees</dt><dd>Council's public record in Legistar does not list committee seats. <SpLink href={CX_COUNCIL_SITE}>Council's website</SpLink> lists committee assignments.</dd></>}
          <dt>Official pages</dt>
          <dd>
            <SpLink href={isMayor ? CX_MAYOR_SITE : CX_COUNCIL_SITE}>{isMayor ? `Office of the Mayor` : `Cleveland City Council`}</SpLink>
            {person && person.url && <><br /><SpLink href={person.url}>{name} in Council's legislative record</SpLink></>}
          </dd>
        </dl>
      </section>

      <section aria-labelledby={sec(`does`)}>
        <h2 id={sec(`does`)}>What this office does</h2>
        {lead && <p>{lead.summary}</p>}
        {lead && lead.authority && <ul className="sp-list">{lead.authority.map((a) => <li key={a}>{a}</li>)}</ul>}
        <p className="sp-src">Source: <SpLink href={lead && lead.sourceUrl ? lead.sourceUrl : CX_COUNCIL_SITE}>{lead && lead.sourceLabel ? lead.sourceLabel : `Cleveland City Council`}</SpLink>, checked {cxLongDate(lead && lead.verifiedAt)}.</p>
      </section>

      <section aria-labelledby={sec(`record`)}>
        <h2 id={sec(`record`)}>This year's record</h2>
        {isMayor ? (
          <>
            <p>The Mayor's administration sent {cxmPl(seat.items.length, `request`, `requests`)} to Council in 2026. City departments send routine requests such as contracts, grants, and project steps. Council still decides each one.</p>
            {node && node.activity && node.activity.length > 0 && <ul className="sp-list">{node.activity.map((a) => <li key={a}>{a}</li>)}</ul>}
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
            <ul className="sp-list">{money.counted.slice(0, 5).map((r) => <li key={r.m.file}>{cxmMoney(r.amount)}{r.who ? ` to ${r.who}` : ``}: <a href={r.m.url} target="_blank" rel="noreferrer">{r.m.file}</a></li>)}</ul>
          </>
        ) : <p>No ward money tied to Ward {seat.ward} was found in this year's ordinance text. Missing here means none was found, not that nothing happened.</p>)}
        {!isMayor && liquor.length > 0 && <p>Liquor permit objections in Ward {seat.ward}: {cxmPl(liquor.filter((r) => !r.withdraw).length, `filed`, `filed`)}, {liquor.filter((r) => r.withdraw).length} withdrawn.</p>}
        {recent.length > 0 ? (
          <>
            <h3>The five most recent actions</h3>
            <ul className="sp-list">{recent.map((m) => <li key={m.file}><a href={m.url} target="_blank" rel="noreferrer">{m.file}</a>: {cxWords(cxShortTitle(m.title), 16)}. {cxmStatus(m).label}, {cxmDate(cxmWhen(m))}.</li>)}</ul>
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
        <p className="sp-src">Spotted a mistake? A way to report one is not built yet. Until it is, the official records above are the place to check any fact on this page.</p>
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
