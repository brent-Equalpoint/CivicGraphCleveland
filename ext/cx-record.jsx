/* One shape for every city record, and the Votes & actions lists of people and wards (docs/plan-votes-actions-positions.md, phases 2 and 3).
   Shared by the phone (the legislation sheet CxmLeg, the Explore record, the profile sheet, My place) and the desktop (the record page ?panel=leg,
   the map's record drawer, the Profiles page, My local context). Four parts: what it is; Votes & actions, a dated list oldest first where each row
   has the date, what happened, who acted, and the source with the day it was pulled; Positions, "In the record" (sponsors, the record's own title,
   the reports printed before the final vote) and "Stated outside the record" (hidden while CX_STATED holds nothing for the file); and where to read it.
   Data: the roll calls and the record (CX_LEG, CX_VOTES, CX_PL) are in the page; the dated actions from the Clerk's meeting record and the City Record
   load the first time a record or a list needs them (site/council/record-2026.json; in the single offline file, a block read only then).
   Rules kept: receipts, not scores (counts per kind only, never a total, a rank, or a percentage, and nothing ordered by a count); sponsorship is
   not a vote; Absent and Recusal are not a no; a missing record is not a no; a ward chosen on the device never goes into a link, a request, or storage.
   The plain words are in ext/cx-votes-text.jsx between the VOTES-TEXT markers. */

/* ---------- the record data, loaded once when first needed ---------- */
const CX_REC = { p: null, v: null, done: !1, subs: new Set() };
function cxRecLoad() {
  if (!CX_REC.p) {
    const ready = (d) => { CX_REC.v = d; CX_REC.done = !0; CX_REC.subs.forEach((f) => f()); return d; };
    const el = typeof document !== `undefined` ? document.getElementById(`cx-council-rec`) : null;
    if (el) {   // the single offline file carries the record in a block that is read only now
      let d = null;
      try { d = JSON.parse(el.textContent); } catch (e) { d = null; }
      el.remove();
      CX_REC.p = Promise.resolve(d).then(ready);
    } else {
      const web = typeof fetch === `function` && /^https?:$/.test(String(globalThis.location?.protocol || ``));
      CX_REC.p = (web ? fetch(`/council/record-2026.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null) : Promise.resolve(null)).then(ready);
    }
  }
  return CX_REC.p;
}
function useCxRec() {
  const [, bump] = u.useState(0);
  u.useEffect(() => { const f = () => bump((x) => x + 1); CX_REC.subs.add(f); cxRecLoad(); return () => { CX_REC.subs.delete(f); }; }, []);
  return { R: CX_REC.v, done: CX_REC.done };
}

/* ---------- small shared pieces ---------- */
function cxRecPulled(iso) { return iso ? cxLongDate(cxDayET(Date.parse(iso))) : ``; }
function cxRecSeatOf(name) { const w = CX_SPONSOR_WARD[name]; return w ? `ward-${w}` : null; }
function cxRecReview() {
  const r = typeof CX_VOTES_TEXT_REVIEW !== `undefined` ? CX_VOTES_TEXT_REVIEW : { ok: !1 };
  return r.ok ? `Our plain words for what happened were read against the record by ${r.by} on ${cxLongDate(r.checked)}.` : `Our plain words for what happened. A person has not reviewed them yet.`;
}
function CxRecLink({ href, children }) {
  if (!href) return <>{children}</>;
  return <a href={href} target="_blank" rel="noreferrer">{children}<span className="sp-ext"> (opens in a new tab)</span></a>;
}
/* a person's name as a link to their profile; the address names the seat, never the viewer */
function CxRecPerson({ name, onPerson }) {
  const seat = cxRecSeatOf(name);
  if (!seat || !onPerson) return <span>{name}</span>;
  return <a href={`?panel=profiles&seat=${seat}`} onClick={(e) => { e.preventDefault(); onPerson(seat); }}>{name}</a>;
}
function CxRecFile({ file, onFile }) {
  if (!onFile) return <span>{file}</span>;
  return <a href={`?panel=leg&file=${file}`} onClick={(e) => { e.preventDefault(); onFile(file); }}>{file}</a>;
}
function CxRecSrc({ label, url, pulled }) {
  return <p className="rc-src"><span>Source:</span>{` `}<CxRecLink href={url}>{label}</CxRecLink>{pulled ? <span>{`, pulled ${pulled}.`}</span> : `.`}</p>;
}
/* "14 Yea, 0 Nay, 1 Absent": the record's own words, with every word that has a member in it, so the line adds up to every member */
function cxRecCountLine(v) {
  const n = { yea: 0, nay: 0, absent: 0, recused: 0, abstain: 0 };
  for (const c of v.codes) n[CX_VOTE_WORD[c]] = (n[CX_VOTE_WORD[c]] || 0) + 1;
  return [`yea`, `nay`, `absent`, `recused`, `abstain`].filter((w) => w === `yea` || w === `nay` || n[w]).map((w) => `${n[w]} ${CX_VT.word[w]}`).join(`, `);
}
function cxRecVoteSrc(v) {
  const lg = v.issue.kind === `lg`;
  return { label: lg ? v.issue.label : cxIssueName(v.issue.label), url: v.issue.url, pulled: cxRecPulled(lg ? CX_VOTES.legistar_read : CX_VOTES.retrieved_at) };
}

/* ---------- part 2: Votes & actions, oldest first ---------- */
const CX_REC_FINAL = { approved: 1, "approved as amended": 1, adopted: 1, "adopted as amended": 1, "passed on second reading": 1, tabled: 1 };
function cxRecActions(m, R) {
  const rows = [];
  const lg = { label: `Council's Legistar record, ${m.file}`, url: m.url, pulled: cxRecPulled(CX_LEG.retrieved_at) };
  rows.push({ d: m.intro, k: 0, what: CX_VT.action.introduced, sponsors: m.sponsors, src: lg });
  const F = (R && R.files && R.files[m.file]) || {};
  const issue = (i) => ({ label: cxIssueName(R.issues[i][0]), url: R.issues[i][1], pulled: cxRecPulled(R.pulled.city_record) });
  (F.r || []).forEach(([d, text, i]) => rows.push({ d, k: 1, what: CX_VT.action.referred, printed: text, body: `City Council`, src: issue(i) }));
  const today = cxTodayET();
  if (R) {
    (F.m || []).forEach(([mi, a]) => {
      const [d, bi, agenda, page, minutes] = R.meetings[mi];
      const body = R.bodies[bi];
      rows.push({ d, k: body === `City Council` ? 3 : 2, body, word: a || null, what: a ? CX_VT.action[a] || a.charAt(0).toUpperCase() + a.slice(1) : d >= today ? CX_VT.action.agendaNext : CX_VT.action.agendaPast,
        src: { label: `${minutes ? `Minutes` : `Agenda`}, ${body}, ${cxLongDate(d)}`, url: minutes || agenda || page, pulled: cxRecPulled(R.pulled.meetings) }, page: page && (minutes || agenda) ? page : null });
    });
    (F.h || []).forEach(([d, a, bi]) => rows.push({ d, k: R.bodies[bi] === `City Council` ? 3 : 2, body: R.bodies[bi], word: a, what: CX_VT.action[a] || a, src: { ...lg, pulled: cxRecPulled(R.pulled.histories) } }));
  } else {   // before the record loads, or if it cannot: the action history the page already carries
    (CX_PL.histories[m.file] || []).forEach(([d, a, body]) => rows.push({ d, k: body === `City Council` ? 3 : 2, body, word: a, what: CX_VT.action[a] || a, src: { ...lg, pulled: cxRecPulled(CX_PL.retrieved) } }));
  }
  // the roll calls go on Council's row for that meeting; a vote with no such row is a row of its own
  const v = cxVoteRecord(m.file);
  const votes = [...(v ? [v] : []), ...cxVoteOthers(m.file)];
  votes.forEach((x) => {
    const host = rows.find((r) => r.k === 3 && r.d === x.date && !r.vote && r.word && CX_REC_FINAL[r.word] && (x.table ? r.word === `tabled` : r.word !== `tabled`));
    if (host) host.vote = x;
    else rows.push({ d: x.date, k: 4, what: CX_VT.question[x.question], body: `City Council`, vote: x, src: cxRecVoteSrc(x) });
  });
  if (F.e) {
    const [word, on, eff, i] = F.e;
    rows.push({ d: eff, k: 5, what: CX_VT.action.effective, printed: `${word === `passed` ? `Passed` : `Adopted`} ${cxLongDate(on)}. Effective ${cxLongDate(eff)}.`, note: CX_VT.effectiveNote, src: issue(i) });
  }
  return rows.sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : a.k - b.k));
}
/* why a file shows no member-by-member vote, from the data (never empty) */
function cxRecNoNames(m) {
  if (cxVoteRecord(m.file)) return null;
  if (m.status !== `Passed`) return CX_VT.noNames.notPassed;
  const x = (CX_VOTES.x || {})[m.file];
  return CX_VT.noNames[(x && x.reason) || `not_printed`] || CX_VT.noNames.not_printed;
}
function CX_RecVote({ v, file, onPerson }) {
  const ix = cxVoteIndex();
  const names = (w) => CX_VOTES.members.filter((n) => CX_VOTE_WORD[v.codes[ix.slot.get(n)]] === w);
  const diff = (CX_VOTES.d || {})[file];
  const lg = v.issue && v.issue.kind === `lg`;
  const someNotNo = names(`absent`).length + names(`recused`).length > 0;
  return (
    <div className="rc-vote">
      <p className="rc-count"><strong>{cxRecCountLine(v)}</strong></p>
      {[`yea`, `nay`, `absent`, `recused`, `abstain`].map((w) => {
        const list = names(w);
        if (!list.length) return null;
        return <p key={w} className="rc-names"><strong>{`${CX_VT.word[w]} (${list.length}):`}</strong>{` `}{list.map((n, k) => <span key={n}>{k ? `, ` : ``}<CxRecPerson name={n} onPerson={onPerson} /></span>)}</p>;
      })}
      {someNotNo && <p className="rc-note">{names(`recused`).length ? CX_VT.notANo : CX_VT.absentNotANo}</p>}
      {lg && <p className="rc-note">{CX_VT.fromLegistar}</p>}
      {!lg && diff && diff.length > 0 && v.table !== !0 && <p className="rc-note">{CX_VT.differs.replace(`{*}`, diff.map(([n, , l]) => `${n} (${CX_VT.word[l] || l})`).join(`, `))}</p>}
    </div>
  );
}
function CX_RecActions({ m, onPerson, onFile, head = `h3`, title = !0 }) {
  const { R, done } = useCxRec();
  const rows = u.useMemo(() => cxRecActions(m, R), [m, R]);
  const none = cxRecNoNames(m);
  const H = head;
  return (
    <div className="rc rc-actions">
      {title && <H className="rc-h">Votes & actions</H>}
      {!done && <p className="rc-note" role="status">Loading the rest of the record.</p>}
      <ol className="rc-list">
        {rows.map((r, i) => (
          <li key={i} className="rc-row">
            <p className="rc-when">{cxLongDate(r.d)}</p>
            <p className="rc-what"><strong>{r.what}</strong>{r.body ? <span className="rc-body">{r.body}</span> : null}</p>
            {r.sponsors && r.sponsors.length > 0 && <p className="rc-who"><span>Sponsored by</span>{` `}{r.sponsors.map((s, k) => <span key={s}>{k ? `, ` : ``}<CxRecPerson name={s} onPerson={onPerson} /></span>)}<span>. Sponsorship is not a vote.</span></p>}
            {r.word && <p className="rc-word"><span>In the record:</span>{` `}<q>{r.word}</q></p>}
            {r.printed && <p className="rc-word"><span>As printed:</span>{` `}<q>{r.printed}</q></p>}
            {r.note && <p className="rc-note">{r.note}</p>}
            {r.vote && <CX_RecVote v={r.vote} file={m.file} onPerson={onPerson} />}
            {r.vote && r.k !== 4 && <CxRecSrc {...cxRecVoteSrc(r.vote)} />}
            <CxRecSrc {...r.src} />
          </li>
        ))}
      </ol>
      {none && <p className="rc-none">{none}</p>}
      <p className="rc-review">{cxRecReview()}</p>
    </div>
  );
}

/* ---------- part 3: Positions ---------- */
function CX_RecPositions({ m, onPerson, head = `h3`, title = !0 }) {
  const { R } = useCxRec();
  const F = (R && R.files && R.files[m.file]) || {};
  const stated = (typeof CX_STATED !== `undefined` ? CX_STATED : []).filter((x) => x.file === m.file && x.reviewed);
  const H = head;
  return (
    <div className="rc rc-positions">
      {title && <H className="rc-h">Positions</H>}
      <p className="rc-lead">{CX_VT.positionsLead}</p>
      <details className="rc-fold" open>
        <summary>In the record</summary>
        <p className="rc-who"><span>Sponsored by</span>{` `}{m.sponsors.length ? m.sponsors.map((s, k) => <span key={s}>{k ? `, ` : ``}<CxRecPerson name={s} onPerson={onPerson} /></span>) : <span>no sponsor named</span>}<span>. Sponsorship is not a vote.</span></p>
        <p className="rc-word"><span>{CX_VT.purpose}</span>{` `}<q>{m.title}</q></p>
        <CxRecSrc label={`Council's Legistar record, ${m.file}`} url={m.url} pulled={cxRecPulled(CX_LEG.retrieved_at)} />
        <p className="rc-sub"><strong>{CX_VT.reports}</strong></p>
        {F.p && F.p.length ? F.p.map(([d, text, i]) => (
          <div key={d + text} className="rc-row">
            <p className="rc-when">{cxLongDate(d)}</p>
            <p className="rc-word"><q>{text}</q></p>
            <CxRecSrc label={cxIssueName(R.issues[i][0])} url={R.issues[i][1]} pulled={cxRecPulled(R.pulled.city_record)} />
          </div>
        )) : <p className="rc-note">{CX_VT.reportsNone}</p>}
      </details>
      {stated.length > 0 && (
        <details className="rc-fold">
          <summary>{CX_VT.outside}</summary>
          {stated.map((x, k) => <div key={k} className="rc-row"><p className="rc-when">{cxLongDate(x.date)}</p><p><strong>{x.who}</strong>{x.role ? `, ${x.role}` : ``}</p><p className="rc-word"><q>{x.text}</q></p><CxRecSrc label={x.label} url={x.url} pulled={x.pulled} /></div>)}
        </details>
      )}
    </div>
  );
}

/* ---------- part 4: where to read it ---------- */
function CX_RecWhere({ m, meetings, head = `h3`, title = !0, base = !0 }) {
  const { R } = useCxRec();
  const src = CX_RSRC[m.file];
  const F = (R && R.files && R.files[m.file]) || {};
  const v = cxVoteRecord(m.file);
  const issues = new Map();
  if (v) issues.set(v.issue.url, v.issue.kind === `lg` ? v.issue.label : cxIssueName(v.issue.label));
  cxVoteOthers(m.file).forEach((o) => issues.set(o.issue.url, cxIssueName(o.issue.label)));
  if (R) [...(F.r || []), ...(F.p || [])].forEach((r) => issues.set(R.issues[r[2]][1], cxIssueName(R.issues[r[2]][0])));
  if (R && F.e) issues.set(R.issues[F.e[3]][1], cxIssueName(R.issues[F.e[3]][0]));
  const mtgs = R && !meetings ? (F.m || []).map(([mi]) => R.meetings[mi]).filter((x, i, a) => a.indexOf(x) === i) : [];
  const H = head;
  return (
    <div className="rc rc-where">
      {title && <H className="rc-h">Where to read it</H>}
      <ul className="rc-links">
        {base && <li><CxRecLink href={m.url}>{`Council's Legistar record, ${m.file}`}</CxRecLink></li>}
        {base && src && src[0] && <li><CxRecLink href={src[0]}>The ordinance text</CxRecLink></li>}
        {base && src && src[1] && <li><CxRecLink href={src[1]}>The legislative summary</CxRecLink></li>}
        {[...issues].map(([u0, label]) => <li key={u0}><CxRecLink href={u0}>{label}</CxRecLink></li>)}
        {mtgs.map(([d, bi, agenda, page, minutes]) => (
          <li key={`${d}${bi}`}><span>{R.bodies[bi]}</span>{`, `}<span>{cxLongDate(d)}</span>{`: `}{agenda && <CxRecLink href={agenda}>Agenda</CxRecLink>}{minutes && <>{` `}<CxRecLink href={minutes}>Minutes</CxRecLink></>}{page && <>{` `}<CxRecLink href={page}>Meeting page and video</CxRecLink></>}</li>
        ))}
      </ul>
      {meetings}
      <p className="rc-note">{`Council's Legistar record pulled ${cxRecPulled(CX_LEG.retrieved_at)}. The City Record pulled ${cxRecPulled(CX_VOTES.retrieved_at)}.`}</p>
    </div>
  );
}

/* ---------- ceremonial resolutions: one line, never a full record ---------- */
/* the outcome in the record's own status word, with the date the record gives */
function cxRecOutcome(m) {
  return m.passed ? `${m.status}, ${cxLongDate(m.passed)}` : m.status;
}
/* bare: on the file's own sheet or page, where the number and title are already the heading */
function CX_RecShort({ m, onFile, bare }) {
  const v = cxVoteRecord(m.file);
  return (
    <p className="rc-short">
      <span>{cxLongDate(m.intro)}</span>{bare ? null : <>{` · `}<CxRecFile file={m.file} onFile={onFile} />{` · `}<span>{cxHeadline(m.title)}</span></>}{` · `}<span>{cxRecOutcome(m)}</span>{v ? <>{` · `}<span>{cxRecCountLine(v)}</span></> : null}
    </p>
  );
}

/* ---------- the desktop record page (?panel=leg&file=906-2026) ---------- */
const CX_LEG_SEL = { v: null, subs: new Set() };
function cxOpenLeg(file) {
  CX_LEG_SEL.v = file;
  CX_LEG_SEL.subs.forEach((f) => f(file));
  CX_NAV.panel(`leg`);
}
function cxLegFromUrl() {
  try { const f = new URLSearchParams(globalThis.location.search).get(`file`); return /^\d{1,5}-\d{4}$/.test(f || ``) ? f : null; } catch (e) { return null; }
}
function CX_LegPage() {
  const [file, setFile] = u.useState(() => CX_LEG_SEL.v || cxLegFromUrl());
  u.useEffect(() => { const f = (x) => setFile(x); CX_LEG_SEL.subs.add(f); return () => { CX_LEG_SEL.subs.delete(f); }; }, []);
  u.useEffect(() => { CX_LEG_SEL.v = file; }, [file]);
  const m = file ? cxmMatter(file) : null;
  const head = u.useRef(null), first = u.useRef(!0);
  u.useEffect(() => { if (first.current) { first.current = !1; return; } if (head.current) head.current.focus({ preventScroll: !1 }); }, [file]);   // another record opened here: the reader starts at its title
  if (!m) {
    return (
      <section className="sp-page" aria-labelledby="rc-page-h">
        <h1 id="rc-page-h" className="sp-page-h" tabIndex={-1} ref={head}>That record is not in the 2026 record</h1>
        <p className="sp-lede">{file ? `We could not find file ${file} among the 2026 files in Council's record.` : `No file was named.`} Use Jump to and type a file number, such as 906-2026.</p>
      </section>
    );
  }
  const onPerson = (seat) => cxOpenProfile(seat);
  const ceremonial = m.type === `Ceremonial Resolution`;
  const st = cxmStatus(m);
  return (
    <section className="sp-page" aria-labelledby="rc-page-h">
      <article className="sp rc-page">
        <p className="sp-office">{m.file} · {m.type}</p>
        <h1 id="rc-page-h" tabIndex={-1} ref={head} className={cxShortTitle(m.title).length > 110 ? `rc-h1-long` : undefined}>{cxShortTitle(m.title)}</h1>
        <section aria-label="What it is">
          <p className="rc-lead"><span>{`City Council. Introduced ${cxLongDate(m.intro)}.`}</span>{` `}<span>{m.status === `Passed` && m.passed ? `Passed ${cxLongDate(m.passed)}.` : `Status in Council's record: ${m.status}.`}</span></p>
          {!ceremonial && <p className="rc-note">{st.note}</p>}
        </section>
        {ceremonial ? (
          <section aria-label="Votes & actions">
            <CX_RecShort m={m} bare />
            <p className="rc-note">{CX_VT.ceremonial}</p>
            <CxRecSrc label={`Council's Legistar record, ${m.file}`} url={m.url} pulled={cxRecPulled(CX_LEG.retrieved_at)} />
          </section>
        ) : (
          <>
            <h2>Votes & actions</h2>
            <CX_RecActions m={m} onPerson={onPerson} title={!1} />
            <h2>Positions</h2>
            <CX_RecPositions m={m} onPerson={onPerson} title={!1} />
            <h2>Where to read it</h2>
            <CX_RecWhere m={m} title={!1} />
          </>
        )}
      </article>
    </section>
  );
}
/* inside the map's record drawer, for the few records that are city files */
function CX_DrawerRecord({ node, tab }) {
  const f = /^leg-(\d+-\d{4})$/.exec((node && node.id) || ``);
  const m = f ? cxmMatter(f[1]) : null;
  if (!m || (tab !== `actions` && tab !== `positions`)) return null;
  return (
    <div className="cx-drawer-record">
      {tab === `actions` ? <CX_RecActions m={m} onPerson={cxOpenProfile} head="h3" /> : <CX_RecPositions m={m} onPerson={cxOpenProfile} head="h3" />}
      <p className="cx-drawer-profile"><button type="button" className="cx-link-button" onClick={() => cxOpenLeg(m.file)}>Open the full record of {m.file}<CXI.Arrow size={13} /></button></p>
    </div>
  );
}

/* ---------- phase 3: a person's Votes & actions ---------- */
function cxPersonVoteName(ward) {
  return CX_VOTES.members.find((n) => CX_SPONSOR_WARD[n] === ward) || null;
}
/* every row for one seat, newest first: sponsorships (and for the Mayor, what the administration sent), then votes. No row is scored. */
function cxPersonRows(seatId) {
  const isMayor = seatId === `mayor`;
  const ward = isMayor ? 0 : Number(String(seatId).replace(`ward-`, ``));
  const rows = [];
  for (const m of CX_LEG.matters) {
    const admin = m.sponsors.some((s) => CX_ADMIN_SPONSORS.has(s));
    if (isMayor) { if (admin) rows.push({ kind: `sent`, d: m.intro, m, file: m.file }); continue; }
    const i = m.sponsors.findIndex((s) => CX_SPONSOR_WARD[s] === ward);
    if (i >= 0) rows.push({ kind: `sponsor`, role: admin ? `dept` : i === 0 ? `led` : `joined`, d: m.intro, m, file: m.file });
  }
  if (!isMayor) {
    const name = cxPersonVoteName(ward);
    const ix = cxVoteIndex();
    const byFile = CXM_BY_FILE;
    if (name && ix.slot.has(name)) {
      const s = ix.slot.get(name);
      for (const r of ix.all) rows.push({ kind: `vote`, d: r.date, file: r.file, m: byFile.get(r.file) || null, v: r, word: CX_VOTE_WORD[r.codes[s]] });
    }
  }
  return rows.sort((a, b) => (a.d < b.d ? 1 : a.d > b.d ? -1 : a.file < b.file ? -1 : a.file > b.file ? 1 : a.kind === `vote` ? 1 : -1));
}
const CX_PERSON_KINDS = [[`sponsor`, `Sponsorships`], [`vote`, `Votes`], [`sent`, `Sent by the administration`]];
const CX_PERSON_ROLE = { led: `Sponsorship: the first name on the file`, joined: `Sponsorship: joined as a co-sponsor`, dept: `Sponsorship: signed for a city department` };
function cxPersonType(r) { return r.m ? r.m.type : `From before this year's record`; }
function CX_PersonRow({ r, onFile }) {
  const ceremonial = r.m && r.m.type === `Ceremonial Resolution`;
  const src = r.kind === `vote` ? cxRecVoteSrc(r.v) : { label: `Council's Legistar record, ${r.file}`, url: r.m && r.m.url, pulled: cxRecPulled(CX_LEG.retrieved_at) };
  const what = r.kind === `vote` ? `Vote: ${CX_VT.word[r.word] || r.word}` : r.kind === `sent` ? `Sent to Council by the administration` : CX_PERSON_ROLE[r.role];
  if (ceremonial) {
    return <li className="rc-row rc-row-short"><p className="rc-what"><strong>{what}</strong></p><CX_RecShort m={r.m} onFile={onFile} /></li>;
  }
  return (
    <li className="rc-row">
      <p className="rc-when">{cxLongDate(r.d)}</p>
      <p className="rc-what"><strong>{what}</strong>{r.kind === `vote` ? <span className="rc-body">{CX_VT.question[r.v.question]}</span> : null}</p>
      <p className="rc-title">{r.m ? <CxRecFile file={r.file} onFile={onFile} /> : <span>{`File ${r.file}`}</span>}{` `}<span>{r.m ? cxHeadline(r.m.title) : `(from before this year's record; no title is loaded)`}</span></p>
      {r.kind === `vote` && <p className="rc-count">{cxRecCountLine(r.v)}</p>}
      {r.kind !== `vote` && r.m && <p className="rc-note">{cxmStatus(r.m).label === `Committed` || r.m.status === `Passed` ? (r.m.passed ? `Passed ${cxLongDate(r.m.passed)}.` : `Passed.`) : `Status in Council's record: ${r.m.status}.`}</p>}
      <CxRecSrc {...src} />
    </li>
  );
}
function CX_PersonRecord({ seatId, onFile, head = `h2`, title = !0, step = 20, lead = !0 }) {
  const all = u.useMemo(() => cxPersonRows(seatId), [seatId]);
  const isMayor = seatId === `mayor`;
  const [kind, setKind] = u.useState(`all`);
  const [type, setType] = u.useState(`all`);
  const [year, setYear] = u.useState(`all`);
  const [n, setN] = u.useState(step);
  u.useEffect(() => { setKind(`all`); setType(`all`); setYear(`all`); setN(step); }, [seatId]);
  const kinds = CX_PERSON_KINDS.filter(([k]) => all.some((r) => r.kind === k));
  const types = [...new Set(all.map(cxPersonType))];
  const years = [...new Set(all.map((r) => r.d.slice(0, 4)))].sort();
  const byKind = (r) => kind === `all` || r.kind === kind, byType = (r) => type === `all` || cxPersonType(r) === type, byYear = (r) => year === `all` || r.d.slice(0, 4) === year;
  const shown = all.filter((r) => byKind(r) && byType(r) && byYear(r));
  const H = head;
  const chip = (on, label, count, onClick) => <button key={label} type="button" className={on ? `on` : ``} aria-pressed={on} onClick={() => { onClick(); setN(step); }}>{count == null ? label : `${label} (${count})`}</button>;
  return (
    <div className="rc rc-person">
      {title && <H className="rc-h">Votes & actions</H>}
      {lead && <p className="rc-lead">{isMayor ? CX_VT.personMayor : CX_VT.personLead}</p>}
      {isMayor && <p className="rc-note">{CX_VT.mayorActions}</p>}
      <p className="rc-note">{CX_VT.noAreas}</p>
      <div className="rc-filters">
        <div className="rc-chips" role="group" aria-label="Kind of record">{chip(kind === `all`, `All kinds`, null, () => setKind(`all`))}{kinds.map(([k, label]) => chip(kind === k, label, all.filter((r) => r.kind === k && byType(r) && byYear(r)).length, () => setKind(k)))}</div>
        <div className="rc-chips" role="group" aria-label="Type of legislation">{chip(type === `all`, `All types`, null, () => setType(`all`))}{types.map((t) => chip(type === t, t, all.filter((r) => cxPersonType(r) === t && byKind(r) && byYear(r)).length, () => setType(t)))}</div>
        <div className="rc-chips" role="group" aria-label="Year">{chip(year === `all`, `All years`, null, () => setYear(`all`))}{years.map((y) => chip(year === y, y, null, () => setYear(y)))}</div>
      </div>
      {shown.length ? (
        <ol className="rc-list">{shown.slice(0, n).map((r) => <CX_PersonRow key={`${r.kind}${r.file}${r.d}${r.v ? r.v.question : ``}`} r={r} onFile={onFile} />)}</ol>
      ) : <p className="rc-none">Nothing in the record matches these choices. Choose All kinds or All types to see more.</p>}
      {shown.length > n && <button type="button" className="rc-more" onClick={() => setN(n + step)}>{`Show ${Math.min(step, shown.length - n)} more`}</button>}
      <p className="rc-review">{cxRecReview()}</p>
    </div>
  );
}

/* ---------- phase 3: the ward view (the ward chosen on the device; it never goes into a link, a request, or storage) ---------- */
function cxWardRows(ward) {
  const out = [];
  for (const m of CX_LEG.matters) {
    if (m.type === `Ceremonial Resolution`) continue;
    const tie = cxWardTie(m.file, m.title, ward);   // the shared ward matcher (ext/cx-live.jsx)
    const why = !tie ? null : tie[0] === `names` ? `Names Ward ${ward}` : tie[0] === `money` ? `Ward ${ward} in the ordinance text` : `Address in Ward ${ward}: ${tie[1]}`;
    if (why) out.push({ m, why, d: m.passed || m.intro });
  }
  return out.sort((a, b) => (a.d < b.d ? 1 : a.d > b.d ? -1 : a.m.file < b.m.file ? -1 : 1));
}
function CX_WardRecord({ ward, onFile, onPerson, onSetWard, head = `h3`, step = 20 }) {
  const rows = u.useMemo(() => (ward ? cxWardRows(ward) : []), [ward]);
  const [n, setN] = u.useState(step);
  u.useEffect(() => setN(step), [ward]);
  const H = head;
  if (!ward) {
    return (
      <div className="rc rc-ward rc-empty">
        <p>{CX_VT.wardNone}</p>
        {onSetWard && <button type="button" className="rc-more" onClick={onSetWard}>Choose your ward</button>}
      </div>
    );
  }
  const name = (_h.find(([w]) => w === ward) || [])[1] || ``;
  return (
    <div className="rc rc-ward">
      <p className="rc-lead">{CX_VT.wardLead}</p>
      <H className="rc-h">{`Ward ${ward}: ${name}`}</H>
      {onPerson && <p className="rc-who"><a href={`?panel=profiles&seat=ward-${ward}`} onClick={(e) => { e.preventDefault(); onPerson(`ward-${ward}`); }}>{`Open the profile of ${name}`}</a></p>}
      <CX_PersonRecord seatId={`ward-${ward}`} onFile={onFile} title={!1} step={10} lead={!1} />
      <H className="rc-h">{`City records that name Ward ${ward}`}</H>
      <p className="rc-lead">{CX_VT.wardRecordsLead}</p>
      {rows.length ? (
        <ol className="rc-list">
          {rows.slice(0, n).map(({ m, why, d }) => (
            <li key={m.file} className="rc-row">
              <p className="rc-when">{cxLongDate(d)}</p>
              <p className="rc-what"><strong>{why}</strong></p>
              <p className="rc-title"><CxRecFile file={m.file} onFile={onFile} />{` `}<span>{cxHeadline(m.title)}</span></p>
              <p className="rc-note">{m.status === `Passed` && m.passed ? `Passed ${cxLongDate(m.passed)}.` : `Status in Council's record: ${m.status}.`}</p>
              <CxRecSrc label={`Council's Legistar record, ${m.file}`} url={m.url} pulled={cxRecPulled(CX_LEG.retrieved_at)} />
            </li>
          ))}
        </ol>
      ) : <p className="rc-none">{CX_VT.wardRecordsNone}</p>}
      {rows.length > n && <button type="button" className="rc-more" onClick={() => setN(n + step)}>{`Show ${Math.min(step, rows.length - n)} more`}</button>}
    </div>
  );
}
