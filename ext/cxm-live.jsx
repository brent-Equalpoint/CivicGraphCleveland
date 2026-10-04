/* v5.15 phone app: the live layer. The Updated strip under the header (every screen), What's new
   on Today and as its own panel, Latest on each leader, and the date-aware election calendar.
   Everything comes from cx-live.jsx, which the desktop app uses too. */

function cxmNewsAv(r) {
  return r.kind === `passed` ? `done` : r.kind === `stopped` ? `read` : r.kind === `new` ? `new` : `talk`;
}
function CxmFresh() {
  const { openSheet } = useCxm();
  const f = cxFresh();
  const n = u.useMemo(() => cxNewsRows(7).rows.filter((r) => r.kind !== `routine` && r.kind !== `gone`).length, []);
  const said = f.stale ? `Updated ${cxShortDate(f.day)} · ${f.ago}` : `Updated ${f.ago === `today` ? `today` : f.ago}, ${cxClockET(Date.parse(f.at))}`;
  const more = f.stale ? `Newer records may exist` : n ? `${cxmPl(n, `change`, `changes`)} this week` : `What's new`;
  return (
    <button type="button" className={`cxm-fresh ${f.stale ? `stale` : ``}`} onClick={() => openSheet(`news`)}>
      <i aria-hidden="true" />
      <span>{said}</span>{` `}
      <b>{more} <CXI.Arrow size={12} /></b>
      <span className="cxm-fresh-hint"> Opens What's new.</span>
    </button>
  );
}
function CxmNewsRow({ r }) {
  const { openSheet } = useCxm();
  const lead = r.m ? cxPlSigner(r.m) || (r.admin ? `City Hall` : ``) : ``;
  return (
    <button type="button" className={`cxm-rcpt cxm-news-row k-${r.kind}`} disabled={!r.m} onClick={() => r.m && openSheet(`leg`, { file: r.f })}>
      <span className={`cxm-av cxm-av-${cxmNewsAv(r)}`}>{lead ? cxmInitials(lead) : `CH`}</span>
      <span className="cxm-rcpt-mid">
        <span className="cxm-rcpt-t">{cxHeadline(r.title)}</span>
        <span className="cxm-rcpt-s">{r.what}</span>
        <span className="cxm-rcpt-w">{r.f}{r.wards.length ? ` · Ward${r.wards.length > 1 ? `s` : ``} ${r.wards.join(`, `)}` : r.admin ? ` · mayor's administration` : ``}</span>
      </span>
    </button>
  );
}
function CxmWhatsNew() {
  const { home, openSheet } = useCxm();
  const { rows, since } = u.useMemo(() => cxNewsRows(7), []);
  const main = rows.filter((r) => r.kind !== `routine` && r.kind !== `gone`);
  const w = home?.ward || null;
  const mine = w ? cxNewsFor(main, { ward: w }) : [];
  const c = cxNewsCounts(main);
  const top = (mine.length ? mine : main).slice(0, 3);
  const parts = [[`passed`, `passed`], [`new`, `new`], [`moved`, `moved`], [`stopped`, `paused or stopped`]].filter(([k]) => c[k]);
  return (
    <section className="cxm-section cxm-newsbox">
      <CxmBanner kind="news" kicker={<>What's new since {since ? cxShortDate(since) : `the last check`}</>} title={main.length ? `${main.length} changes at City Hall` : `A quiet week at City Hall`} />
      {parts.length > 0 && <div className="cxm-chips static cxm-news-chips">{parts.map(([k, l]) => <span key={k} className={`k-${k}`}><b>{c[k]}</b> {l}</span>)}</div>}
      {w && <p className="cxm-mut">{mine.length ? `${cxmPl(mine.length, `change involves`, `changes involve`)} ${cxmMember(w)}, your council member.` : `Nothing new from ${cxmMember(w)} this week. No record is not a no.`}</p>}
      {top.map((r) => <CxmNewsRow key={r.f} r={r} />)}
      <button type="button" className="cxm-link" onClick={() => openSheet(`news`)}>See everything new{rows.length > top.length ? ` (${rows.length})` : ``}</button>
    </section>
  );
}
function CxmNews() {
  const { home } = useCxm();
  const [days, setDays] = u.useState(7);
  const [who, setWho] = u.useState(home?.ward ? `ward` : `all`);
  const [routine, setRoutine] = u.useState(!1);
  const f = cxFresh();
  const { rows, since, checks } = u.useMemo(() => cxNewsRows(days), [days]);
  const list = who === `ward` && home?.ward ? cxNewsFor(rows, { ward: home.ward }) : who === `mayor` ? cxNewsFor(rows, { admin: !0 }) : rows;
  const items = [[`all`, `Everything`], ...(home?.ward ? [[`ward`, `Ward ${home.ward}`]] : []), [`mayor`, `Mayor's office`]];
  return (
    <div className="cxm-pad">
      <CxmKicker>Council's public record</CxmKicker>
      <h2 className="cxm-h2">What's new</h2>
      <p className="cxm-mut">What changed in City Council's 2026 record since {since ? cxShortDate(since) : `the last check`}, found by comparing two snapshots of the official record. Pulled {f.when} (Eastern).</p>
      {f.stale && <p className="cxm-status-line"><span>These records were pulled {f.ago}. Newer actions may be on the <a href="https://cityofcleveland.legistar.com/Legislation.aspx" target="_blank" rel="noreferrer">Council site</a>.</span></p>}
      <CxmSeg label="Whose changes" items={items} value={who} onChange={setWho} />
      <CxmSeg label="How far back" items={[[7, `Last 7 days`], [45, `Last 45 days`]]} value={days} onChange={setDays} />
      {!list.length && <p className="cxm-mut">No changes here in this period. The record did not change; that does not mean nothing happened.</p>}
      {CX_KINDS.map(([k, label, sub]) => {
        const g = list.filter((r) => r.kind === k);
        if (!g.length) return null;
        const open = k !== `routine` || routine;
        return (
          <div key={k} className="cxm-rgroup">
            <div className="cxm-rgroup-h"><strong>{label}</strong><small>{sub} · {g.length}</small></div>
            {open && g.map((r) => <CxmNewsRow key={r.f} r={r} />)}
            {k === `routine` && <button type="button" className="cxm-link" onClick={() => setRoutine(!routine)}>{routine ? `Hide them` : `Show all ${g.length}`}</button>}
          </div>
        );
      })}
      <CxmDrop title="How this stays current" sub={`${cxmPl(checks.length, `check`, `checks`)} of the record so far`}>
        <p>Every night the app pulls Cleveland City Council's public Legistar record, compares it with the night before, and lists what changed. If a night's data looks broken, the old records stay up and nothing is published.</p>
        <p>News stories are not added automatically. A person checks each one before it appears.</p>
        <ul className="cxm-list">{checks.map((c) => <li key={c.at}>{cxShortDate(cxDayET(Date.parse(c.at)))}, {cxClockET(Date.parse(c.at))}: {c.changes.length ? `${c.changes.length} items changed since ${cxShortDate(cxDayET(Date.parse(c.from)))}` : `no changes`}</li>)}</ul>
      </CxmDrop>
      <p className="cxm-fine">Sponsorship is not a vote. A missing record is not a no. Plain-English labels are ours; the official status is on each record.</p>
    </div>
  );
}
function CxmLatest({ seat, limit = 3 }) {
  const { openSheet } = useCxm();
  const { rows, since } = u.useMemo(() => cxNewsRows(45), []);
  const list = (seat.ward ? cxNewsFor(rows, { ward: seat.ward }) : cxNewsFor(rows, { admin: !0 })).filter((r) => r.kind !== `routine`);
  return (
    <div className="cxm-tile cxm-latest">
      <span className="cxm-kicker">Latest since {since ? cxShortDate(since) : `the last check`}</span>
      {list.length ? list.slice(0, limit).map((r) => <CxmNewsRow key={r.f} r={r} />) : <p className="cxm-mut">Nothing new on {seat.ward ? `${seat.name}'s` : `the administration's`} proposals since {since ? cxShortDate(since) : `the last check`}. No record is not a no.</p>}
      {list.length > limit && <button type="button" className="cxm-link" onClick={() => openSheet(`news`)}>{cxmPl(list.length - limit, `more change`, `more changes`)}</button>}
    </div>
  );
}
/* the latest change for one record, for its receipt */
function cxmLatestFor(file) {
  return cxNewsRows(45).rows.find((r) => r.f === file) || null;
}
function CxmDates() {
  const list = cxDatesNow();
  const phase = cxElectionPhase();
  return (
    <>
      {phase === `after` && <p className="cxm-status-line"><span><strong>The November 3 election is over.</strong> Your practice ballot stays here to look back on. <a href={CX_RESULTS_URL} target="_blank" rel="noreferrer">Official results</a></span></p>}
      <div className="cxm-dates">
        {list.map((x) => (
          <div key={x.iso} className={`cxm-date-${x.state}`}>
            <b>{x.label}</b>
            <span>{x.text}{CX_DATE_TAG[x.state] && <em>{x.state === `next` ? (x.days === 1 ? `Tomorrow` : `In ${x.days} days`) : CX_DATE_TAG[x.state]}</em>}</span>
          </div>
        ))}
      </div>
    </>
  );
}
