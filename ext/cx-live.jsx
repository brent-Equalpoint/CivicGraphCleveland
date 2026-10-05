/* v5.15: the live layer, shared by the desktop and phone apps.
   - Freshness: when the official records were last pulled (CX_UPDATES, built from data/changes-2026.json)
   - What's new: plain-English rows built only from differences between two public snapshots
   - An election calendar that knows today's date (Eastern time)
   - Error boundaries, so one bad record never blanks the app
   - Desktop: Updated chip, What's new page, Latest on profiles, map hover card, portrait faces
   Facts here come from the snapshots; the wording around them is ours. No scores, no inferred motives. */

/* ---------- time, always in Cleveland's time zone ---------- */
const CX_TZ = `America/New_York`;
function cxNow() {
  return Date.now();
}
/* Speed: these run thousands of times while the What's new rows are built. Each keeps one formatter, or remembers the answer for an
   input it has seen, on the function itself (not in a const, which an earlier file calling it at load time could reach before it is set).
   The text they return is unchanged. */
function cxDayET(ts) {
  try {
    const f = cxDayET.f || (cxDayET.f = new Intl.DateTimeFormat(`en-US`, { timeZone: CX_TZ, year: `numeric`, month: `2-digit`, day: `2-digit` }));
    const p = Object.fromEntries(f.formatToParts(new Date(ts)).map((x) => [x.type, x.value]));
    return `${p.year}-${p.month}-${p.day}`;
  } catch {
    return new Date(ts).toISOString().slice(0, 10);
  }
}
function cxTodayET() {
  return cxDayET(cxNow());
}
function cxDays(fromIso, toIso) {
  return Math.round((Date.parse(`${toIso}T12:00:00Z`) - Date.parse(`${fromIso}T12:00:00Z`)) / 86400000);
}
function cxShortDate(iso) {
  if (!iso) return ``;
  const key = String(iso), day = key.slice(0, 10), seen = cxShortDate.m || (cxShortDate.m = new Map());
  let out = seen.get(day);
  if (out === undefined) {   // the answer depends only on the day; the formatter gives exactly what toLocaleDateString gives with the same options
    const d = new Date(`${day}T12:00:00Z`);
    out = isNaN(d) ? null : (cxShortDate.f || (cxShortDate.f = new Intl.DateTimeFormat(`en-US`, { month: `short`, day: `numeric`, timeZone: `UTC` }))).format(d);
    seen.set(day, out);
  }
  return out === null ? key : out;
}
function cxClockET(ts) {
  const seen = cxClockET.m || (cxClockET.m = new Map());
  if (seen.has(ts)) return seen.get(ts);
  let out;
  try {
    out = new Date(ts).toLocaleTimeString(`en-US`, { hour: `numeric`, minute: `2-digit`, timeZone: CX_TZ }).replace(`AM`, `a.m.`).replace(`PM`, `p.m.`);
  } catch {
    return ``;
  }
  seen.set(ts, out);
  return out;
}

/* ---------- freshness ---------- */
function cxFresh() {
  const at = CX_UPDATES.updated;
  const day = cxDayET(Date.parse(at));
  const age = Math.max(0, cxDays(day, cxTodayET()));
  return {
    at, day, age,
    when: `${cxShortDate(day)}, ${cxClockET(Date.parse(at))}`,
    ago: age === 0 ? `today` : age === 1 ? `yesterday` : `${age} days ago`,
    stale: age >= 3,
  };
}

/* ---------- What's new ---------- */
const CX_STAGE = {
  Passed: `Passed`, "Agenda Ready": `Ready for a Council vote`, "In Committee": `In committee`, "First Reading": `Introduced`,
  "Administrative Review": `Administrative review`, Held: `On hold`, Tabled: `Tabled`, Failed: `Failed`, Filed: `Filed`, Plat: `Plat`,
};
const CX_ROUTINE = new Set([`Ceremonial Resolution`, `Communication`, `Item`]);
const CX_KINDS = [
  [`passed`, `Passed`, `Council said yes`],
  [`stopped`, `Paused or stopped`, `Held, tabled, withdrawn, or recommended for denial`],
  [`moved`, `Moved forward`, `A committee or Council acted, or the status changed`],
  [`new`, `New proposals`, `Introduced since the last check`],
  [`routine`, `Ceremonial and routine`, `Proclamations, communications, and agenda items`],
  [`gone`, `No longer listed`, `In the earlier snapshot, missing from the new one`],
];
const CX_MATTER = new Map(CX_LEG.matters.map((m) => [m.file, m]));
function cxStepText(s) {
  const [, act, body] = s;
  const b = body || `City Council`;
  if (act === `recommended for approval`) return `${b} recommended approval`;
  if (act === `recommended for approval as amended`) return `${b} recommended approval with changes`;
  if (act === `recommended for denial`) return `${b} recommended denial`;
  if (act === `approved` || act === `adopted`) return b === `City Council` ? `City Council ${act === `adopted` ? `adopted` : `passed`} it` : `${b} ${act} it`;
  if (act === `approved as amended` || act === `adopted as amended`) return `${b === `City Council` ? `City Council` : b} ${act.startsWith(`adopted`) ? `adopted` : `passed`} it with changes`;
  if (act === `read and referred to administrative review`) return `Read at Council and sent for administrative review`;
  if (act === `passed on second reading`) return `Passed on second reading`;
  if (act === `withdrawn`) return `Withdrawn in the ${b}`;
  if (act === `tabled`) return `${b} tabled it`;
  return `${b}: ${act}`;
}
function cxWithdrawn(m) {
  const h = (CX_PL.histories[m.file] || []).filter((r) => r[1] === `withdrawn`);
  return h.length ? h[h.length - 1] : null;
}
/* merge every change to one file inside a window into a single row */
function cxNewsRows(days = 7) {
  const log = CX_UPDATES.log;
  if (!log.length) return { rows: [], since: null, checks: [] };
  const newest = Date.parse(log[0].at);
  const inWin = log.filter((u) => newest - Date.parse(u.at) <= days * 86400000 + 3600000);
  const by = new Map();
  for (const up of [...inWin].reverse()) {
    for (const c of up.changes) {
      const r = by.get(c.f) || { f: c.f, isNew: !1, st: null, sp: [], steps: [], gone: !1, t: c.t || ``, at: up.at };
      if (c.new) r.isNew = !0;
      if (c.gone) r.gone = !0;
      if (c.st) r.st = r.st ? [r.st[0], c.st[1]] : c.st;
      if (c.sp) r.sp = [...new Set([...r.sp, ...c.sp])];
      if (c.steps) for (const s of c.steps) if (!r.steps.some((x) => x.join(`|`) === s.join(`|`))) r.steps.push(s);
      r.at = up.at;
      by.set(c.f, r);
    }
  }
  const rows = [...by.values()].map(cxNewsRow).filter(Boolean).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.f < b.f ? 1 : -1));
  return { rows, since: inWin[inWin.length - 1].from, checks: log };
}
function cxNewsRow(r) {
  const m = CX_MATTER.get(r.f) || null;
  if (r.gone) return { ...r, m: null, kind: `gone`, date: ``, title: r.t || r.f, what: `No longer in Council's 2026 list.`, wards: [], admin: !1 };
  if (!m) return null;
  const last = r.steps[r.steps.length - 1] || null;
  const fin = r.steps.find((s) => /^(approved|adopted)/.test(s[1]) && s[2] === `City Council`);
  const wd = r.steps.find((s) => s[1] === `withdrawn` || s[1] === `tabled` || s[1] === `recommended for denial`);
  const now = r.st ? r.st[1] : m.status;
  let kind, what;
  if (CX_ROUTINE.has(m.type)) {
    kind = `routine`;
    what = r.isNew ? `Introduced ${cxShortDate(m.intro)}.` : r.st ? `Now: ${CX_STAGE[now] || now}.` : last ? `${cxStepText(last)}, ${cxShortDate(last[0])}.` : `Updated.`;
  } else if (now === `Passed` && (r.st || fin)) {
    kind = `passed`;
    const amended = fin && /amended/.test(fin[1]);
    what = `Passed by City Council${fin ? ` on ${cxShortDate(fin[0])}` : m.passed ? ` on ${cxShortDate(m.passed)}` : ``}${amended ? `, with changes` : ``}.`;
  } else if (wd || [`Held`, `Tabled`, `Failed`, `Filed`].includes(now) && r.st) {
    kind = `stopped`;
    what = wd ? `${cxStepText(wd)}, ${cxShortDate(wd[0])}.` : now === `Held` ? `Council put it on hold. Nothing is final.` : `Now: ${CX_STAGE[now] || now}.`;
  } else if (r.isNew) {
    kind = `new`;
    what = `Introduced ${cxShortDate(m.intro)}.${last ? ` ${cxStepText(last)}.` : ``}`;
  } else {
    kind = `moved`;
    what = last ? `${cxStepText(last)}, ${cxShortDate(last[0])}.` : r.st ? `Now: ${CX_STAGE[r.st[1]] || r.st[1]} (was ${(CX_STAGE[r.st[0]] || r.st[0]).toLowerCase()}).` : `Updated.`;
  }
  if (r.sp.length) what += ` ${r.sp.join(`, `)} signed on.`;
  const date = (last && last[0]) || (fin && fin[0]) || m.passed || m.intro || ``;
  const wards = [...new Set(m.sponsors.map((s) => CX_SPONSOR_WARD[s]).filter(Boolean))].sort((a, b) => a - b);
  return { ...r, m, kind, what, date, title: cxShortTitle(m.title), wards, admin: m.sponsors.some((s) => CX_ADMIN_SPONSORS.has(s)), lead: m.sponsors[0] || `` };
}
function cxNewsCounts(rows) {
  return Object.fromEntries(CX_KINDS.map(([k]) => [k, rows.filter((r) => r.kind === k).length]));
}
function cxNewsFor(rows, { ward = null, admin = !1 } = {}) {
  return rows.filter((r) => (admin ? r.admin : ward ? r.wards.includes(ward) : !0));
}
/* the record's status in one sentence, for questions whose proposal has not passed */
function cxStatusSentence(m) {
  if (!m || m.status === `Passed`) return ``;
  const wd = cxWithdrawn(m);
  if (wd) return `The ${wd[2]} withdrew it on ${cxShortDate(wd[0])}. It is not moving forward.`;
  if (m.status === `Held`) return `Council is holding it. It has not passed.`;
  if (m.status === `Tabled`) return `Council tabled it. It has not passed.`;
  if (m.status === `Agenda Ready`) return `It is ready for a Council vote and has not passed yet.`;
  if (m.status === `In Committee`) return `It is still in committee.`;
  return `Council's record lists it as ${m.status}. It has not passed.`;
}

/* ---------- election calendar that knows what day it is ---------- */
const CX_ELECTION = `2026-11-03`;
function cxElectionPhase() {
  const d = cxDays(cxTodayET(), CX_ELECTION);
  return d > 0 ? `before` : d === 0 ? `today` : `after`;
}
function cxDatesNow() {
  const today = cxTodayET();
  let next = !1;
  return CX_DATES.map(([label, text, iso]) => {
    const d = cxDays(today, iso);
    let state = d < 0 ? `past` : d === 0 ? `today` : `later`;
    if (state === `later` && !next) { state = `next`; next = !0; }
    if (state === `today`) next = !0;
    return { label, text, iso, state, days: d };
  });
}
const CX_DATE_TAG = { past: `Passed`, today: `Today`, next: `Next` };
const CX_RESULTS_URL = `https://boe.cuyahogacounty.gov/elections/election-results`;
function CX_DateList() {
  const list = cxDatesNow();
  const phase = cxElectionPhase();
  return (
    <>
      {phase === `after` && <p className="cx-date-after">The November 3 election is over. Official results come from the Board of Elections. <a href={CX_RESULTS_URL} target="_blank" rel="noreferrer">Election results <CXI.Ext size={11} /></a></p>}
      {list.map((x) => (
        <div key={x.iso} className={`civic-date cx-date-${x.state}`}>
          <strong>{x.label}</strong>
          <span>{x.text}{CX_DATE_TAG[x.state] && <em className="cx-date-tag">{CX_DATE_TAG[x.state]}</em>}</span>
        </div>
      ))}
    </>
  );
}

/* ---------- error boundary ---------- */
class CxBoundary extends u.Component {
  constructor(p) {
    super(p);
    this.state = { err: null, key: p.resetKey };
  }
  static getDerivedStateFromError(err) {
    return { err };
  }
  static getDerivedStateFromProps(p, s) {
    return p.resetKey !== s.key ? { err: null, key: p.resetKey } : null;
  }
  componentDidCatch(err, info) {
    try { console.error(`[civic-graph] ${this.props.label || `section`} failed`, err, info && info.componentStack); } catch {}
  }
  render() {
    if (!this.state.err) return this.props.children;
    const phone = this.props.phone;
    return (
      <div className={phone ? `cxm-pad cx-oops cx-oops-phone` : `cx-oops`} role="alert">
        <strong>{this.props.label ? `${this.props.label} didn't load.` : `This part didn't load.`}</strong>
        <p>Something in this section hit a problem. The rest of the app still works. Your choices on this device are safe.</p>
        <div className="cx-oops-row">
          <button type="button" onClick={() => this.setState({ err: null })}>Try again</button>
          {this.props.onHome && <button type="button" onClick={() => { this.setState({ err: null }); this.props.onHome(); }}>Go to the start</button>}
          <button type="button" onClick={() => location.reload()}>Reload</button>
          <button type="button" onClick={() => { location.hash = phone ? `desktop` : `phone`; }}>{phone ? `Open the desktop view` : `Open the phone view`}</button>
        </div>
      </div>
    );
  }
}

/* ---------- portrait faces for leaders (16 official portraits: 15 council members and the mayor) ---------- */
function cxFaceSrc(id) {
  const w = /^(?:council-)?ward-(\d+)$/.exec(String(id));
  const p = w ? "/" + "portraits/ward-" + String(w[1]).padStart(2, "0") + ".webp" : id === `mayor-bibb` || id === `mayor` ? "/" + "portraits/mayor-bibb.webp" : null;
  return p ? (globalThis.__cxAsset ? globalThis.__cxAsset(p) : p) : null;
}
function cxInitials(n) {
  const w = String(n).replace(/[^A-Za-z .&-]/g, ``).split(/[\s&]+/).filter(Boolean);
  return ((w[0] || ``)[0] || ``) + ((w.length > 1 ? w[w.length - 1] : ``)[0] || ``);
}
/* an SVG face: clipped portrait when we have one, initials otherwise */
function CX_SvgFace({ id, name, r, cx = 0, cy = 0, src }) {
  const s = src === undefined ? cxFaceSrc(id) : src;
  const cid = `cxface-${String(id).replace(/[^\w-]/g, ``)}-${r}`;
  if (!s) return <text x={cx} y={cy + r * 0.2} textAnchor="middle" fontSize={Math.round(r * 0.6)} className="cx-face-ini">{cxInitials(name)}</text>;
  return (
    <>
      <defs><clipPath id={cid}><circle cx={cx} cy={cy} r={r} /></clipPath></defs>
      <image href={s} x={cx - r} y={cy - r} width={r * 2} height={r * 2} preserveAspectRatio="xMidYMin slice" clipPath={`url(#${cid})`} />
    </>
  );
}

/* ---------- desktop: Updated chip, What's new page, Latest ---------- */
function CX_FreshChip() {
  const f = cxFresh();
  return (
    <button type="button" className={`cx-fresh-chip ${f.stale ? `stale` : ``}`} title={`Official records pulled ${f.when} (Eastern). Click for what's new.`} onClick={() => CX_NAV.panel(`news`)}>
      <i aria-hidden="true" />Updated {f.ago === `today` ? `today` : cxShortDate(f.day)}
    </button>
  );
}
function CX_NewsRow({ r }) {
  return (
    <li className={`cx-news-row cx-k-${r.kind}`}>
      <span className="cx-news-file">{r.f}</span>
      <span className="cx-news-mid">
        <strong>{cxHeadline(r.title)}</strong>
        <span>{r.what}</span>
        <small>
          {r.m ? <>{r.m.type}{r.lead ? ` · led by ${r.lead}` : ``}{r.wards.length ? ` · Ward${r.wards.length > 1 ? `s` : ``} ${r.wards.join(`, `)}` : ``} · </> : null}
          {r.m && <a href={r.m.url} target="_blank" rel="noreferrer">Council record <CXI.Ext size={11} /></a>}
        </small>
      </span>
    </li>
  );
}
function CX_News() {
  const [days, setDays] = u.useState(7);
  const [ward, setWard] = u.useState(() => {
    const w = /^ward-(\d+)$/.exec(CX_PLACE.v || ``);
    return w ? Number(w[1]) : 0;
  });
  const [routine, setRoutine] = u.useState(!1);
  const f = cxFresh();
  const { rows, since, checks } = u.useMemo(() => cxNewsRows(days), [days]);
  const list = ward === -1 ? cxNewsFor(rows, { admin: !0 }) : ward ? cxNewsFor(rows, { ward }) : rows;
  const counts = cxNewsCounts(list);
  return (
    <section className="civic-page cx-news cx-enter" aria-labelledby="cx-news-h">
      <span className="atlas-eyebrow"><CXI.Sparkles size={15} /> COUNCIL'S PUBLIC RECORD · UPDATED {f.when.toUpperCase()}</span>
      <h1 id="cx-news-h">What's new</h1>
      <p className="cx-lede">What changed in Cleveland City Council's 2026 record since {since ? cxShortDate(since) : `the last check`}. Every line comes from comparing two snapshots of the official record. Sponsorship is not a vote, and a missing record is not a no.</p>
      {f.stale && <p className="cx-stale">These records were pulled {f.ago}. Newer actions may exist on the <a href="https://cityofcleveland.legistar.com/Legislation.aspx" target="_blank" rel="noreferrer">Council site <CXI.Ext size={11} /></a>. The nightly refresh may be failing; the team is told automatically when it does.</p>}
      <div className="cx-news-controls">
        <label>Show <select value={ward} onChange={(e) => setWard(Number(e.target.value))}>
          <option value={0}>All of Cleveland</option>
          <option value={-1}>Sent by the mayor's administration</option>
          {_h.map(([n, name]) => <option key={n} value={n}>Ward {n} · {name}</option>)}
        </select></label>
        <label>Over <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
          <option value={7}>the last 7 days</option>
          <option value={45}>the last 45 days</option>
        </select></label>
      </div>
      <div className="cx-news-counts">{CX_KINDS.filter(([k]) => counts[k]).map(([k, l]) => <span key={k} className={`cx-k-${k}`}><b>{counts[k]}</b> {l.toLowerCase()}</span>)}</div>
      {!list.length && <p className="cx-muted">No changes {ward ? `for this selection ` : ``}in this period. That means the record did not change, not that nothing happened.</p>}
      {CX_KINDS.map(([k, label, sub]) => {
        const g = list.filter((r) => r.kind === k);
        if (!g.length) return null;
        const shown = k === `routine` && !routine ? [] : g;
        return (
          <div key={k} className="cx-news-group">
            <h2>{label} <small>{g.length} · {sub}</small></h2>
            {k === `routine` && <button type="button" className="cx-link-button" onClick={() => setRoutine(!routine)}>{routine ? `Hide them` : `Show all ${g.length}`}</button>}
            <ul>{shown.map((r) => <CX_NewsRow key={r.f} r={r} />)}</ul>
          </div>
        );
      })}
      <details className="cx-news-checks">
        <summary>Every check of the record ({checks.length})</summary>
        <ul>{checks.map((c) => <li key={c.at}>{cxShortDate(cxDayET(Date.parse(c.at)))}, {cxClockET(Date.parse(c.at))}: {c.changes.length ? `${c.changes.length} items changed since ${cxShortDate(cxDayET(Date.parse(c.from)))}` : `no changes`} · {c.count.toLocaleString(`en-US`)} items in the record</li>)}</ul>
        <p className="cx-muted">Official records refresh automatically every night from Council's public Legistar record. News stories are not added automatically; a person checks each one first.</p>
      </details>
    </section>
  );
}
function CX_Latest({ seat }) {
  const { rows, since } = u.useMemo(() => cxNewsRows(45), []);
  const list = (seat.ward ? cxNewsFor(rows, { ward: seat.ward }) : cxNewsFor(rows, { admin: !0 })).filter((r) => r.kind !== `routine`).slice(0, 4);
  return (
    <div className="cx-latest">
      <h4 aria-level="3">Latest <small>since {since ? cxShortDate(since) : `the last check`}</small></h4>
      {list.length ? <ul>{list.map((r) => <li key={r.f}><b>{r.f}</b> {cxHeadline(r.title)} <span>{r.what}</span></li>)}</ul> : <p>Nothing new on {seat.ward ? `${seat.name}'s` : `the administration's`} proposals since {since ? cxShortDate(since) : `the last check`}. No record is not a no.</p>}
      <button type="button" className="cx-link-button" onClick={() => CX_NAV.panel(`news`)}>Everything new <CXI.Arrow size={13} /></button>
    </div>
  );
}

/* ---------- desktop map: hover card with lit connections ---------- */
const CX_HOVER = { v: null, subs: new Set() };
function cxHoverSet(v) {
  CX_HOVER.v = v;
  CX_HOVER.subs.forEach((f) => f());
}
function cxEsc(s) {
  return globalThis.CSS && CSS.escape ? CSS.escape(s) : String(s).replace(/["\\]/g, `\\$&`);
}
function cxLight(svg, id) {
  if (!svg) return;
  svg.querySelectorAll(`.cx-lit`).forEach((p) => p.classList.remove(`cx-lit`));
  svg.querySelectorAll(`.cx-near`).forEach((p) => p.classList.remove(`cx-near`));
  svg.classList.toggle(`cx-hovering`, !!id);
  if (!id) return;
  const e = cxEsc(id);
  svg.querySelector(`[data-node="${e}"]`)?.classList.add(`cx-near`);
  svg.querySelectorAll(`path[data-cx-s="${e}"], path[data-cx-t="${e}"]`).forEach((p) => {
    p.classList.add(`cx-lit`);
    const o = p.getAttribute(`data-cx-s`) === id ? p.getAttribute(`data-cx-t`) : p.getAttribute(`data-cx-s`);
    svg.querySelector(`[data-node="${cxEsc(o)}"]`)?.classList.add(`cx-near`);
  });
}
/* ---------- connections in plain sentences (v5.16, Phase 1e) ----------
   A connection is written as one sentence with real names: "Kevin Conwell serves on City Council."
   No arrows and never the word "this". The verb agrees with the subject ("Residents elect ...").
   A connection that one source draws to five or more nodes with the same wording (for example, Residents
   elect each of the 15 council members) is "broadcast": it is shown once as a sentence about the whole
   group, and left off each individual's card so it cannot read as that person's own fact. */
const CX_BE_HAVE = { is: `are`, has: `have`, was: `were` };
/* A subject is plural when it names a group of people ("Residents", "People of Cleveland") or ends in a plural noun
   ("Courts"). A person or a single office is never plural, even when the surname ends in s (Howse-Jones). */
function cxPluralNode(node) {
  if (!node || node.kind === `official` || node.kind === `person`) return !1;
  const name = String(node.name || ``).trim();
  if (/^(people|residents|voters|citizens|members|candidates|neighbors)\b/i.test(name)) return !0;
  const w = name.split(/\s+/).pop() || ``;
  return /[a-z]s$/i.test(w) && !/(ss|us|is)$/i.test(w);
}
function cxSentence(subject, relation, object, plural) {
  const words = String(relation).trim().split(/\s+/);
  if (plural) {
    const w = words[0].toLowerCase();
    if (CX_BE_HAVE[w]) words[0] = CX_BE_HAVE[w];
    else if (/[^s]s$/.test(w)) words[0] = words[0].slice(0, -1);
  }
  return `${subject} ${words.join(` `)} ${object}.`;
}
const CX_BROADCAST_MIN = 5;
const CX_BROADCAST_CACHE = new WeakMap();
function cxBroadcast(room) {
  if (CX_BROADCAST_CACHE.has(room)) return CX_BROADCAST_CACHE.get(room);
  const groups = new Map();
  room.edges.forEach((e) => { const k = `${e.source}|${e.relation}`; (groups.get(k) || groups.set(k, []).get(k)).push(e); });
  const out = { ids: new Set(), groups: [] };
  groups.forEach((list) => { if (list.length >= CX_BROADCAST_MIN) { list.forEach((e) => out.ids.add(e.id)); out.groups.push(list); } });
  CX_BROADCAST_CACHE.set(room, out);
  return out;
}
/* what to list for one node: its own outgoing connections, and incoming ones unless a person's card would only repeat a group fact */
function cxNodeLines(room, node) {
  const nd = (id) => room.nodes.find((n) => n.id === id);
  const nm = (id) => nd(id)?.name ?? id;
  const has = (id) => room.nodes.some((n) => n.id === id);
  const bc = cxBroadcast(room);
  const out = room.edges.filter((e) => e.source === node.id && has(e.target));
  const inc = room.edges.filter((e) => e.target === node.id && has(e.source) && !(node.kind === `official` && bc.ids.has(e.id)));
  return [
    ...out.map((e) => ({ id: e.id, to: e.target, text: cxSentence(node.name, e.relation, nm(e.target), cxPluralNode(node)) })),
    ...inc.map((e) => ({ id: e.id, to: e.source, text: cxSentence(nm(e.source), e.relation, node.name, cxPluralNode(nd(e.source))) })),
  ];
}
/* hover card timing: a pause before the card appears, so sweeping across the map does not flash cards */
const CX_HOVER_WAIT = 320;
const CX_HOVER_SWAP = 90;
function cxHoverNode(room, node, ev) {
  const g = ev.currentTarget;
  const svg = g && g.ownerSVGElement;
  cxLight(svg, node.id);
  const r = g.getBoundingClientRect();
  const kb = ev.type === `focus`;
  clearTimeout(CX_HOVER.t);
  // the lit lines respond at once; the card waits a moment, and swaps quickly when one is already open
  CX_HOVER.t = setTimeout(() => cxHoverSet({ room, node, x: r.left + r.width / 2, top: r.top, bottom: r.bottom, kb }), CX_HOVER.v ? CX_HOVER_SWAP : CX_HOVER_WAIT);
}
function cxHoverEnd(ev) {
  clearTimeout(CX_HOVER.t);
  cxLight(ev && ev.currentTarget && ev.currentTarget.ownerSVGElement, null);
  cxHoverSet(null);
}
function CX_HoverCard() {
  const [, force] = u.useState(0);
  const ref = u.useRef(null);
  const [pos, setPos] = u.useState(null);
  u.useEffect(() => { const f = () => force((n) => n + 1); CX_HOVER.subs.add(f); return () => CX_HOVER.subs.delete(f); }, []);
  const h = CX_HOVER.v;
  u.useLayoutEffect(() => {
    if (!h || !ref.current) return setPos(null);
    const w = ref.current.offsetWidth, ht = ref.current.offsetHeight, vw = innerWidth, vh = innerHeight;
    let top = h.top - ht - 10;
    if (top < 8) top = Math.min(vh - ht - 8, h.bottom + 10);
    setPos({ left: Math.max(8, Math.min(vw - w - 8, h.x - w / 2)), top });
  }, [h]);
  u.useEffect(() => {
    const off = () => CX_HOVER.v && cxHoverSet(null);
    addEventListener(`scroll`, off, !0);
    addEventListener(`wheel`, off, { passive: !0 });
    return () => { removeEventListener(`scroll`, off, !0); removeEventListener(`wheel`, off); };
  }, []);
  if (!h) return null;
  const { room, node } = h;
  const layer = room.layers.find((l) => l.id === node.layer);
  const lines = cxNodeLines(room, node);
  const photo = pm[node.id];
  return (
    <div ref={ref} className="cx-hovercard" role="tooltip" style={pos ? { left: pos.left, top: pos.top } : { left: -9999, top: 0 }}>
      <div className="cx-hc-head">
        {photo ? <img src={photo.src} alt="" width="40" height="40" /> : <i style={{ background: layer?.color || `#8f93a0` }} />}
        <span><strong>{node.name}</strong><small>{layer?.label || node.layer} · {node.kind}</small></span>
      </div>
      <p className="cx-hc-place">{node.region}</p>
      <p className={`cx-hc-ev ev-${node.evidence}`}>{Kh[node.evidence] ?? node.evidence}</p>
      {lines.length > 0 && (
        <ul className="cx-hc-links">
          {lines.slice(0, 5).map((l) => <li key={l.id}>{l.text}</li>)}
          {lines.length > 5 && <li className="cx-hc-more">{lines.length - 5} more connections are in the record.</li>}
        </ul>
      )}
      <small className="cx-hc-foot">{h.kb ? `Press Enter to open` : `Click to open`} · lines show recorded relationships, not control</small>
    </div>
  );
}

/* ---------- desktop constellation: a face instead of initials when a portrait exists ---------- */
function CX_StarFace({ id, name }) {
  const s = cxFaceSrc(id);
  if (!s) return <text textAnchor="middle" y="5" fontSize="14">{name.split(` `).slice(0, 2).map((e) => e[0]).join(``)}</text>;
  return <CX_SvgFace id={id} name={name} r={23} src={s} />;
}
