/* v5.22 At City Hall: the Clerk's meeting record (data/meetings-2026.json, scripts/fetch_meetings.py) as a small front page instead of a calendar grid.
   One lead (the next Council meeting and the biggest items on its agenda), a short strip for the rest of the week, what was just decided, and the rest of
   the year folded away. Every item opens the legislation record we already have. It reads like a newsroom's front page and looks like the stories: Bento tiles,
   a headline first, the detail one tap down.
   Rules kept: receipts, not scores (counts of what the record says, nothing ranked); a missing record is not a no; and the page says plainly what this record
   is not: it holds agendas and what happened to each item, not testimony or public comment, and a hearing that is not on a Council agenda is not here.
   Data: site/meetings/meetings-2026.json, fetched on the hosted site only (it is a calendar; the offline file shows a note instead). */

const CX_MTG = { p: null, v: null, done: !1, subs: new Set() };
function cxMtgLoad() {
  if (!CX_MTG.p) {
    const web = typeof fetch === `function` && /^https?:$/.test(String(globalThis.location?.protocol || ``));
    CX_MTG.p = (web ? fetch(`/meetings/meetings-2026.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null) : Promise.resolve(null)).then((d) => { CX_MTG.v = d; CX_MTG.done = !0; CX_MTG.subs.forEach((f) => f()); return d; });
  }
  return CX_MTG.p;
}
function useCxMtg() {
  const [, bump] = u.useState(0);
  u.useEffect(() => { const f = () => bump((x) => x + 1); CX_MTG.subs.add(f); cxMtgLoad(); return () => { CX_MTG.subs.delete(f); }; }, []);
  return CX_MTG.v;
}

/* what the Clerk's action words mean, in plain English, and which status dot each one gets */
const CX_MTG_ACTIONS = {
  approved: [`Approved`, `done`], "approved as amended": [`Approved with changes`, `cond`], adopted: [`Adopted`, `done`], "adopted as amended": [`Adopted with changes`, `cond`],
  "recommended for approval": [`Committee recommends it`, `talk`], "recommended for denial": [`Committee recommends against it`, `hold`],
  tabled: [`Tabled`, `read`], "received and filed": [`Received and filed`, `read`], "read into the record": [`Introduced`, `talk`],
  "read and referred to administrative review": [`Sent to administrative review`, `talk`], "passed on second reading": [`Passed on second reading`, `talk`], withdrawn: [`Withdrawn`, `read`],
};
const CX_MTG_ORDER = { done: 0, cond: 1, talk: 2, hold: 3, read: 4 };
function cxMtgAction(a) { const r = CX_MTG_ACTIONS[a]; return r ? r[0] : a ? a.charAt(0).toUpperCase() + a.slice(1) : `On the agenda`; }
function cxMtgKind(a) { const r = CX_MTG_ACTIONS[a]; return r ? r[1] : `talk`; }
function cxMtgTime(t) { return String(t || ``).replace(`AM`, `a.m.`).replace(`PM`, `p.m.`); }
function cxMtgDays(from, to) { return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86400000); }
function cxMtgWeekday(iso) { return new Date(`${iso}T12:00:00Z`).toLocaleDateString(`en-US`, { weekday: `long`, timeZone: `UTC` }); }
function cxMtgMonthDay(iso) { return new Date(`${iso}T12:00:00Z`).toLocaleDateString(`en-US`, { month: `short`, day: `numeric`, timeZone: `UTC` }); }
/* "today", "tomorrow", "Monday" (within a week), or "Oct 12" */
function cxMtgDayWord(iso, today) {
  const n = cxMtgDays(today, iso);
  return n === 0 ? `today` : n === 1 ? `tomorrow` : n > 1 && n < 7 ? cxMtgWeekday(iso) : cxMtgMonthDay(iso);
}

/* The year, split for the front page. today is an ISO date. All lists are in the order they should be read. */
function cxMtgSplit(data, today) {
  const ms = data.meetings;
  const next = ms.filter((m) => m.date >= today);
  const lead = next.find((m) => m.body === `City Council`) || next[0] || null;
  const week = next.filter((m) => m !== lead && cxMtgDays(today, m.date) < 7);
  const past = ms.filter((m) => m.date < today).sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1));
  const recent = past.filter((m) => m.items.some((i) => i[1])).slice(0, 3);
  const months = [];
  past.forEach((m) => { const key = m.date.slice(0, 7); let g = months.find((x) => x.key === key); if (!g) { g = { key, list: [] }; months.push(g); } g.list.push(m); });
  return { lead, week, recent, months, next };
}
/* what kind of legislation a file number is: ordinances first, then resolutions, then everything else, with the ceremonial ones (condolences, congratulations) last */
function cxMtgGroup(file) {
  const t = (cxmMatter(file) || {}).type || ``;
  return /Ordinance/.test(t) ? `ordinance` : t === `Ceremonial Resolution` ? `ceremonial` : /Resolution/.test(t) ? `resolution` : `other`;
}
const CX_MTG_WEIGHT = { ordinance: 0, resolution: 1, other: 2, ceremonial: 3 };
const CX_MTG_GROUP_WORDS = { ordinance: [`ordinance`, `ordinances`], resolution: [`resolution`, `resolutions`], ceremonial: [`ceremonial resolution`, `ceremonial resolutions`], other: [`other item`, `other items`] };
/* the items of a meeting: the most settled outcomes first, and inside each, real legislation before ceremonial (the Clerk's order otherwise) */
function cxMtgRanked(m) {
  return m.items.map((i, k) => ({ i, k, w: CX_MTG_WEIGHT[cxMtgGroup(i[0])] })).sort((a, b) => (CX_MTG_ORDER[cxMtgKind(a.i[1])] - CX_MTG_ORDER[cxMtgKind(b.i[1])]) || (a.w - b.w) || (a.k - b.k)).map((x) => x.i);
}
/* "9 ordinances, 2 resolutions, 22 ceremonial resolutions": what the agenda is made of, in that order */
function cxMtgMix(m) {
  const n = { ordinance: 0, resolution: 0, ceremonial: 0, other: 0 };
  m.items.forEach((i) => { n[cxMtgGroup(i[0])] += 1; });
  return [`ordinance`, `resolution`, `other`, `ceremonial`].filter((g) => n[g]).map((g) => [`${n[g]} ${CX_MTG_GROUP_WORDS[g][n[g] === 1 ? 0 : 1]}`, g]);
}
/* The Clerk's notice, without the boilerplate: web addresses, bullets, "TENTATIVE AGENDA", and the broadcast instructions are dropped; what is left is read as plain sentences.
   A notice that only said how to watch becomes "The meeting will be broadcast live." Empty when there is nothing else to say. */
function cxMtgNoteParts(note) {
  const raw = String(note || ``);
  const live = /live ?broadcast|livestream|broadcast live/i.test(raw);
  const cleaned = raw.replace(/https?:\/\/\S+/g, ``).replace(/www\.\S+/g, ``).replace(/\*/g, `.`).replace(/TENTATIVE AGENDA/gi, ``).replace(/\s+/g, ` `).trim();
  const keep = (cleaned.match(/[^.!?]+[.!?]*/g) || []).map((x) => x.trim()).filter((x) => x.length > 3 && !/live ?broadcast|livestream|broadcast live|youtube|channel 20|spectrum|tv ?20|clevelandohio|clevelandcitycouncil|see (meeting )?notice/i.test(x) && !/^[.\s]*$/.test(x));
  return [keep.join(` `).slice(0, 320).trim(), live ? `The meeting will be broadcast live.` : ``];
}
function cxMtgNote(note) { return cxMtgNoteParts(note).filter(Boolean).join(` `); }
/* "5 approved, 3 committee recommendations": counts of what the record says happened, most settled first */
function cxMtgOutcomes(m) {
  const by = new Map();
  m.items.forEach((i) => { if (!i[1]) return; const l = cxMtgAction(i[1]); by.set(l, (by.get(l) || { n: 0, k: cxMtgKind(i[1]) })); by.get(l).n += 1; });
  return [...by].sort((a, b) => (CX_MTG_ORDER[a[1].k] - CX_MTG_ORDER[b[1].k]) || (b[1].n - a[1].n)).map(([label, v]) => [label, v.n, v.k]);
}
/* every meeting where a piece of legislation was on the agenda, newest first */
function cxMtgWhere(data, file) {
  return data.meetings.filter((m) => m.items.some((i) => i[0] === file)).map((m) => ({ m, actions: m.items.filter((i) => i[0] === file).map((i) => i[1]).filter(Boolean) }))
    .sort((a, b) => (a.m.date === b.m.date ? 0 : a.m.date < b.m.date ? 1 : -1));
}
/* the lead sentence for a meeting */
function cxMtgLine(m, today) {
  const w = cxMtgDayWord(m.date, today), n = m.items.length;
  return { head: `${m.body} meets ${w === `today` || w === `tomorrow` ? w : /^[A-Z][a-z]+day$/.test(w) ? w : `on ${w}`}.`, sub: n ? `${n === 1 ? `One piece of legislation is` : `${n} pieces of legislation are`} on the agenda.` : `No legislation is listed on the agenda yet. The Clerk can add items before the meeting.` };
}

/* A "this week at City Hall" story for the Today row. Null when there is nothing coming up and nothing recent. */
function cxMtgStory(data, today) {
  if (!data) return null;
  const s = cxMtgSplit(data, today);
  const wk = [s.lead, ...s.week].filter(Boolean);
  if (!wk.length && !s.recent.length) return null;
  const frames = [];
  if (wk.length) {
    const items = wk.reduce((t, m) => t + m.items.length, 0);
    frames.push({ k: `This week at City Hall`, big: `Council and its committees meet ${cxmPl(wk.length, `time`, `times`)}.`, small: items ? `${cxmPl(items, `piece of legislation is`, `pieces of legislation are`)} on the agendas. Here is what to watch.` : `The agendas are not posted with legislation yet.` });
    const m = s.lead;
    if (m) {
      const L = cxMtgLine(m, today);
      frames.push({ k: `${cxMtgWeekday(m.date)}, ${cxMtgMonthDay(m.date)}`, big: L.head, small: L.sub });
      cxMtgRanked(m).slice(0, 3).forEach((i) => { const x = cxmMatter(i[0]); if (x) frames.push({ k: `On the agenda · ${i[0]}`, big: cxHeadline(x.title), small: `${cxMtgAction(i[1])}.` }); });
    }
  } else {
    const m = s.recent[0];
    frames.push({ k: `Just decided`, big: `The latest meeting was on ${cxMtgMonthDay(m.date)}.`, small: cxMtgOutcomes(m).slice(0, 3).map(([l, n]) => `${n} ${l.toLowerCase()}`).join(`, `) + `.` });
  }
  frames.push({ k: `The whole week`, big: `See every meeting and what is on it.`, small: `Agendas, minutes once the Clerk posts them, and what happened to each item.`, type: `cta`, cta: `Open At City Hall`, go: `hall` });
  const week = (s.lead || s.recent[0]).date;
  return { id: `hall-${week}`, label: `City Hall`, ini: `CH`, name: `At City Hall`, when: wk.length ? `This week's meetings` : `The latest meetings`, frames,
           deeper: { label: `Open At City Hall`, kind: `sheet`, sheet: `meetings` }, source: { label: `the Clerk of Council's meeting record (Legistar)`, url: `https://cityofcleveland.legistar.com/Calendar.aspx` } };
}

/* ---------- the screen ---------- */
/* the Clerk's notice as two pieces: what it says (official wording, kept as written) and the broadcast line (which can be translated) */
function CxMtgNote({ note, tag = `p`, className }) {
  const [t, live] = cxMtgNoteParts(note);
  if (!t && !live) return null;
  const Tag = tag;
  return <Tag className={className}>{t ? <span>{t}</span> : null}{t && live ? ` ` : null}{live ? <span>{live}</span> : null}</Tag>;
}
/* "City Council meets Monday." as two pieces (the body's name, then the verb and day) so each can be translated on its own */
function CxMtgHead({ m, today, past }) {
  const w = cxMtgDayWord(m.date, today);
  const tail = past ? ` met on ${cxMtgMonthDay(m.date)}.` : w === `today` ? ` meets today.` : w === `tomorrow` ? ` meets tomorrow.` : /^[A-Z][a-z]+day$/.test(w) ? ` meets ${w}.` : ` meets on ${w}.`;
  return <><span>{m.body}</span>{tail}</>;
}
function CxMtgLinks({ m, past }) {
  return (
    <p className="mt-links">
      {m.agenda && <a href={m.agenda} target="_blank" rel="noreferrer">Agenda<span className="sp-ext"> (opens in a new tab)</span></a>}
      {m.minutes ? <a href={m.minutes} target="_blank" rel="noreferrer">Minutes<span className="sp-ext"> (opens in a new tab)</span></a> : past ? <span>Minutes not posted yet</span> : null}
      {m.page && <a href={m.page} target="_blank" rel="noreferrer">Meeting page<span className="sp-ext"> (opens in a new tab)</span></a>}
    </p>
  );
}
function CxMtgItem({ i, onOpen }) {
  const x = cxmMatter(i[0]);
  return (
    <button type="button" className="mt-item" onClick={() => onOpen(i[0])}>
      
      <span><strong>{x ? cxHeadline(x.title) : `Legislation ${i[0]}`}</strong><small><span>{i[0]}</span>{` · `}<span>{cxMtgAction(i[1])}</span></small></span>
    </button>
  );
}
function CxMtgItems({ m, onOpen, first = 3 }) {
  const [all, setAll] = u.useState(!1);
  const list = cxMtgRanked(m), shown = all ? list : list.slice(0, first);
  return (
    <>
      <div className="mt-items">{shown.map((i, k) => <CxMtgItem key={`${i[0]}${k}`} i={i} onOpen={onOpen} />)}</div>
      {list.length > first && <button type="button" className="cxm-link" aria-expanded={all} onClick={() => setAll(!all)}>{all ? `Show fewer` : `Show all ${list.length}`}</button>}
    </>
  );
}
function CxMtgEarlier({ g, onOpen }) {
  const month = new Date(`${g.key}-15T12:00:00Z`).toLocaleDateString(`en-US`, { month: `long`, year: `numeric`, timeZone: `UTC` });
  return (
    <CxmDrop title={month} sub={cxmPl(g.list.length, `meeting`, `meetings`)}>
      {g.list.map((m) => (
        <details key={m.id} className="mt-meet">
          <summary><strong>{m.body}</strong><small><span>{cxMtgMonthDay(m.date)}</span>{` · `}<span>{m.items.length ? cxmPl(m.items.length, `item`, `items`) : `no legislation`}</span></small></summary>
          {m.items.length > 0 && <CxMtgItems m={m} onOpen={onOpen} first={5} />}
          <CxMtgLinks m={m} past />
        </details>
      ))}
    </CxmDrop>
  );
}
function CX_Meetings({ onOpen }) {
  const data = useCxMtg();
  if (!data) return <p className="cxm-mut" role="status">{CX_MTG.done ? `The meeting record needs the hosted site. It is not part of the offline file.` : `Loading the meeting record...`}</p>;
  const today = cxTodayET(), s = cxMtgSplit(data, today);
  const L = s.lead ? cxMtgLine(s.lead, today) : null;
  return (
    <div className="mt">
      {s.lead && (
        <section className="cxm-tile cxm-tile-acc mt-lead" aria-labelledby="mt-lead-h">
          <span className="cxm-kicker"><span>Next up</span>{` · `}<span>{cxMtgWeekday(s.lead.date)}</span>{`, `}<span>{cxMtgMonthDay(s.lead.date)}</span>{s.lead.time ? <>{` · `}<span>{cxMtgTime(s.lead.time)}</span></> : null}</span>
          <h3 id="mt-lead-h" className="mt-head"><CxMtgHead m={s.lead} today={today} /></h3>
          <p className="mt-sub">{L.sub}</p>
          {s.lead.items.length > 0 && <p className="mt-chips">{cxMtgMix(s.lead).map(([l, g]) => <span key={g} className="mt-chip">{l}</span>)}</p>}
          <CxMtgNote note={s.lead.note} className="cxm-fine" />
          {s.lead.items.length > 0 && <CxMtgItems m={s.lead} onOpen={onOpen} />}
          <CxMtgLinks m={s.lead} />
          {s.lead.place && <p className="cxm-fine">{s.lead.place}</p>}
        </section>
      )}
      {s.week.length > 0 && (
        <section aria-labelledby="mt-week-h">
          <h3 id="mt-week-h" className="cxm-h3">Also this week</h3>
          <div className="mt-strip">
            {s.week.map((m) => (
              <div key={m.id} className="cxm-tile mt-small">
                <span className="cxm-kicker"><span>{cxMtgWeekday(m.date)}</span>{m.time ? <>{` · `}<span>{cxMtgTime(m.time)}</span></> : null}</span>
                <strong>{m.body}</strong>
                <small>{m.items.length ? cxmPl(m.items.length, `item`, `items`) : `No legislation listed yet`}</small>
                <CxMtgNote note={m.note} tag="small" className="mt-note" />
                {m.items.length > 0 && <CxMtgItems m={m} onOpen={onOpen} first={1} />}
                <CxMtgLinks m={m} />
              </div>
            ))}
          </div>
        </section>
      )}
      {s.recent.length > 0 && (
        <section aria-labelledby="mt-done-h">
          <h3 id="mt-done-h" className="cxm-h3">Just decided</h3>
          {s.recent.map((m) => (
            <div key={m.id} className="cxm-tile mt-done">
              <span className="cxm-kicker"><span>{cxMtgWeekday(m.date)}</span>{`, `}<span>{cxMtgMonthDay(m.date)}</span></span>
              <strong className="mt-head2">{m.body}</strong>
              <p className="mt-chips">{cxMtgOutcomes(m).map(([l, n, k]) => <span key={l} className="mt-chip">{`${n} ${l.toLowerCase()}`}</span>)}</p>
              <CxMtgItems m={m} onOpen={onOpen} />
              <CxMtgLinks m={m} past />
            </div>
          ))}
        </section>
      )}
      {s.months.length > 0 && (
        <section aria-labelledby="mt-earlier-h">
          <h3 id="mt-earlier-h" className="cxm-h3">Earlier this year</h3>
          {s.months.map((g) => <CxMtgEarlier key={g.key} g={g} onOpen={onOpen} />)}
        </section>
      )}
      <p className="cxm-fine">Source: the Clerk of Council's meeting record in Legistar. Pulled {cxShortDate(cxDayET(Date.parse(data.retrieved_at)))}. <span>It lists what was on each agenda and what happened to each item. It does not include testimony or public comment, and a hearing that is not on a Council agenda is not in it. A missing record is not a no.</span></p>
    </div>
  );
}
/* the phone sheet: the same front page, each item opening its legislation record */
function CxmMeetings() {
  const { openSheet } = useCxm();
  return (
    <div className="cxm-pad">
      <CxmBanner kind="hall" kicker="Council and committee meetings" title="At City Hall" />
      <CX_Meetings onOpen={(file) => openSheet(`leg`, { file })} />
    </div>
  );
}
/* on a legislation record: every meeting where it was on the agenda, with the agenda link */
function CxmHeardAt({ file }) {
  const data = useCxMtg();
  if (!data) return null;
  const rows = cxMtgWhere(data, file), today = cxTodayET();
  if (!rows.length) return null;
  return (
    <div className="mt-heard">
      <h3 className="cxm-h3">Where it was on the agenda</h3>
      {rows.map(({ m, actions }) => (
        <p key={m.id} className="mt-heard-row">
          <strong>{cxMtgMonthDay(m.date)}</strong>{` `}<span>{m.body}</span>{actions.length ? <>{` · `}{actions.map((a, k) => <span key={a + k}>{k > 0 ? `, ` : ``}<span>{cxMtgAction(a)}</span></span>)}</> : m.date >= today ? <>{` · `}<span>on the agenda</span></> : null}
          {m.agenda && <> <a href={m.agenda} target="_blank" rel="noreferrer">Agenda<span className="sp-ext"> (opens in a new tab)</span></a></>}
        </p>
      ))}
    </div>
  );
}
/* a small card for the Today tab: the lead sentence and the biggest item, one tap to the page */
function CxmHallCard() {
  const data = useCxMtg(), { openSheet } = useCxm();
  if (!data) return null;
  const today = cxTodayET(), s = cxMtgSplit(data, today), m = s.lead || s.recent[0];
  if (!m) return null;
  const L = s.lead ? cxMtgLine(m, today) : { sub: cxMtgOutcomes(m).slice(0, 2).map(([l, n]) => `${n} ${l.toLowerCase()}`).join(`, `) + `.` };
  const top = cxMtgRanked(m).map((i) => cxmMatter(i[0])).find(Boolean);
  return (
    <section className="cxm-section mt-hall">
    <CxmBanner kind="hall" kicker={s.lead ? `Next up` : `Just decided`} title="At City Hall" />
    <button type="button" className="cxm-card mt-card" onClick={() => openSheet(`meetings`)}>
      <strong><CxMtgHead m={m} today={today} past={!s.lead} /></strong>
      <small><span>{L.sub}</span>{top ? <>{` `}<span>Biggest:</span>{` `}<span>{cxHeadline(top.title)}</span></> : null}</small>
      <em>See the week <CXI.Arrow size={14} /></em>
    </button>
    </section>
  );
}
