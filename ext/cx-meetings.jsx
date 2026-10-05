/* v5.22 At City Hall: the Clerk's meeting record (data/meetings-2026.json, scripts/fetch_meetings.py) as a front page instead of a calendar grid.
   v5.30 (docs/plan-city-hall-page.md): on the phone it is a full page with a back arrow, not a sheet. In order: the next Council meeting as the lead (when,
   where, how to watch), the week as day tabs, what is on the next agenda grouped by kind, For you (items that name your ward or match your priorities,
   worked out on the device), what was just decided, a search of the record, and the rest of the year folded away. Every item opens the legislation
   record we already have. No horizontal scrolling anywhere on the page.
   Rules kept: receipts, not scores (counts of what the record says, nothing ranked); a missing record is not a no; the ward and priorities never leave
   the device; and the page says plainly what this record is not: it holds agendas and what happened to each item, not testimony or public comment.
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
/* a day some days after an ISO date, and the Monday of the week it falls in */
function cxMtgPlus(iso, n) { return new Date(Date.parse(`${iso}T12:00:00Z`) + n * 86400000).toISOString().slice(0, 10); }
function cxMtgMonday(iso) { const g = new Date(`${iso}T12:00:00Z`).getUTCDay(); return cxMtgPlus(iso, g === 0 ? -6 : 1 - g); }
/* The week as five day tabs, Monday to Friday. A weekday shows its own week. A Saturday or Sunday shows the coming week once the Clerk has posted a
   meeting in it, and the week just ended until then. The tab that opens first is today if anyone meets today, else the next day with a meeting, else
   the last day that had one. */
function cxMtgWeek(data, today) {
  const g = new Date(`${today}T12:00:00Z`).getUTCDay();
  let mon = cxMtgMonday(today);
  if (g === 0 || g === 6) { const nx = cxMtgPlus(mon, 7); if (data.meetings.some((m) => m.date >= nx && m.date <= cxMtgPlus(nx, 4))) mon = nx; }
  const days = [0, 1, 2, 3, 4].map((k) => { const iso = cxMtgPlus(mon, k); return { iso, list: data.meetings.filter((m) => m.date === iso) }; });
  const has = days.filter((d) => d.list.length);
  const first = days.find((d) => d.iso === today && d.list.length) || has.find((d) => d.iso >= today) || has[has.length - 1] || days.find((d) => d.iso === today) || days[0];
  return { days, pick: first.iso, when: days[4].iso < today ? `last` : days[0].iso > today ? `next` : `this` };
}
/* what kind of legislation a file number is: ordinances first, then resolutions, then everything else, with the ceremonial ones (condolences, congratulations) last */
function cxMtgGroup(file) {
  const t = (cxmMatter(file) || {}).type || ``;
  return /Ordinance/.test(t) ? `ordinance` : t === `Ceremonial Resolution` ? `ceremonial` : /Resolution/.test(t) ? `resolution` : `other`;
}
const CX_MTG_WEIGHT = { ordinance: 0, resolution: 1, other: 2, ceremonial: 3 };
const CX_MTG_GROUP_WORDS = { ordinance: [`ordinance`, `ordinances`], resolution: [`resolution`, `resolutions`], ceremonial: [`ceremonial resolution`, `ceremonial resolutions`], other: [`other item`, `other items`] };
const CX_MTG_KINDS = [[`ordinance`, `Ordinances`], [`resolution`, `Resolutions`], [`other`, `Everything else`], [`ceremonial`, `Ceremonial resolutions`]];
/* an agenda by kind, in that order, each kind in the Clerk's own order */
function cxMtgByKind(m) {
  return CX_MTG_KINDS.map(([g, label]) => ({ g, label, items: m.items.filter((i) => cxMtgGroup(i[0]) === g) })).filter((x) => x.items.length);
}
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
/* One line on how to watch, naming only what the Clerk's notice names. When the notice does not say, the line says so instead of guessing. */
function cxMtgWatch(note) {
  const t = String(note || ``);
  const yt = /youtube/i.test(t), tv = /channel 20|tv ?20/i.test(t);
  if (yt && tv) return `Live on YouTube and Cleveland TV Channel 20.`;
  if (yt) return `Live on YouTube.`;
  if (tv) return `Live on Cleveland TV Channel 20.`;
  if (/live ?broadcast|livestream|broadcast live/i.test(t)) return `The meeting will be broadcast live.`;
  return `The Clerk's notice does not say how to watch.`;
}
/* "5 approved, 3 committee recommendations": counts of what the record says happened, most settled first */
function cxMtgOutcomes(m) {
  const by = new Map();
  m.items.forEach((i) => { if (!i[1]) return; const l = cxMtgAction(i[1]); by.set(l, (by.get(l) || { n: 0, k: cxMtgKind(i[1]) })); by.get(l).n += 1; });
  return [...by].sort((a, b) => (CX_MTG_ORDER[a[1].k] - CX_MTG_ORDER[b[1].k]) || (b[1].n - a[1].n)).map(([label, v]) => [label, v.n, v.k]);
}
/* the outcome counts of a meeting that has happened, then the items with no action in the record (a missing record is not a no) */
function cxMtgTally(m) {
  const out = cxMtgOutcomes(m).map(([l, n]) => [l, n]);
  const none = m.items.filter((i) => !i[1]).length;
  if (none) out.push([`No action recorded`, none]);
  return out;
}
/* Just decided: the latest meeting of City Council (the body that decides) that the record shows acting on something; a committee's if Council has none */
function cxMtgDecided(data, today) {
  const past = data.meetings.filter((m) => m.date < today && m.items.some((i) => i[1]));
  const last = (list) => list.reduce((a, m) => (!a || m.date >= a.date ? m : a), null);
  return last(past.filter((m) => m.body === `City Council`)) || last(past);
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
/* the Cleveland wards a title names: "Ward 7", "(Ward 3)", "Wards 1, 2 and 14" */
function cxMtgWardsIn(title) {
  const out = new Set();
  for (const g of String(title || ``).matchAll(/\bWards?\s+(\d{1,2}(?!\d)(?:\s*(?:,\s*and|,|and|&)\s*\d{1,2}(?!\d))*)/gi)) for (const n of g[1].match(/\d+/g)) { const w = Number(n); if (w >= 1 && w <= 15) out.add(w); }
  return out;
}
/* For you: the items on these meetings that name the person's ward in the record (the title, the ward money's own ordinance text, or an address in the
   title that lies in the ward) or match one of their priorities by the keyword rules My priorities uses. Worked out on the device: the ward and the
   priorities never leave it. An item is in or out, with the reason it is in; nothing is scored or ranked, and the list keeps the Clerk's order.
   Ceremonial resolutions are left out. look = { fundWards(file), addrWards(file), match(title) -> { priority: word } }. */
function cxMtgForYou(meetings, ward, chosen, look) {
  const seen = new Set(), out = [];
  for (const m of meetings) for (const i of m.items) {
    const f = i[0];
    if (seen.has(f)) continue;
    seen.add(f);
    const x = cxmMatter(f);
    if (!x || cxMtgGroup(f) === `ceremonial`) continue;
    const why = [];
    if (ward) {
      if (cxMtgWardsIn(x.title).has(ward)) why.push([`ward`, `Names Ward ${ward}`]);
      else if (look.fundWards(f).includes(ward)) why.push([`ward`, `Ward ${ward} in the ordinance text`]);
      else if (look.addrWards(f).includes(ward)) why.push([`ward`, `Address in Ward ${ward}`]);
    }
    const hits = (chosen || []).length ? look.match(x.title) : {};
    // the rule may be a stem ("universit"); show the title's own word that it matched ("University")
    (chosen || []).forEach((p) => { if (hits[p]) why.push([`prio`, p, (x.title.match(new RegExp(`\\b${hits[p].replace(/[.*+?^${}()|[\]\\]/g, `\\$&`)}[A-Za-z]*`, `i`)) || [hits[p]])[0]]); });
    if (why.length) out.push({ f, i, m, x, why });
  }
  return out;
}
/* Look it up. Words and street addresses are compared as plain tokens, with the usual short forms made the same (West 25th Street, W. 25th St.). */
const CX_MTG_ABBR = { west: `w`, east: `e`, north: `n`, south: `s`, street: `st`, avenue: `ave`, av: `ave`, road: `rd`, boulevard: `blvd`, drive: `dr`, place: `pl`, court: `ct`, lane: `ln`, parkway: `pkwy`, square: `sq`, terrace: `ter`,
  northwest: `n w`, northeast: `n e`, southwest: `s w`, southeast: `s e`, nw: `n w`, ne: `n e`, sw: `s w`, se: `s e` };
function cxMtgNorm(s) {
  return String(s || ``).toLowerCase().replace(/[’'`]/g, ``).replace(/[^a-z0-9-]+/g, ` `).trim().split(/\s+/).filter(Boolean).map((w) => CX_MTG_ABBR[w] || w).join(` `).split(` `);
}
function cxMtgHit(qt, tt) { return qt.every((q) => tt.some((t) => (/^\d+$/.test(q) ? t === q : t.startsWith(q)))); }
/* what Look it up searches: every legislation record of the year (newest first) and every meeting (newest first), each with its words made plain once */
function cxMtgIndex(data, matters) {
  return {
    leg: [...matters].sort((a, b) => (a.intro === b.intro ? 0 : a.intro < b.intro ? 1 : -1)).map((x) => [x, cxMtgNorm(x.title)]),
    meet: [...data.meetings].reverse().map((m) => [m, cxMtgNorm(`${m.body} ${m.place || ``} ${cxMtgNote(m.note)}`)]),
  };
}
/* A file number (1232-2026, 1232-26) finds that record and every meeting it was on. A bare number (1232, or a house number such as 3870) finds the
   files with that number and the titles that hold it. Anything else is words: a record matches when every word is in its title, a meeting when every
   word is in its body, place, or notice. Nothing typed is kept or sent. null until two characters are typed. */
function cxMtgFind(index, q) {
  const raw = String(q || ``).trim();
  if (raw.length < 2) return null;
  const fm = raw.match(/^(\d{1,5})(?:-(\d{2}|\d{4}))?$/);
  const qt = cxMtgNorm(raw);
  const words = { leg: index.leg.filter(([, t]) => cxMtgHit(qt, t)).map(([x]) => x), meet: index.meet.filter(([, t]) => cxMtgHit(qt, t)).map(([m]) => m) };
  if (!fm) return qt.length && qt[0] ? words : null;
  const want = (f) => (fm[2] ? f === `${fm[1]}-${fm[2].length === 2 ? `20${fm[2]}` : fm[2]}` : String(f).split(`-`)[0] === fm[1]);
  const files = { leg: index.leg.filter(([x]) => want(x.file)).map(([x]) => x), meet: index.meet.filter(([m]) => m.items.some((i) => want(i[0]))).map(([m]) => m) };
  if (fm[2]) return files.leg.length || files.meet.length ? files : words;   // an older file named in a title (Ordinance No. 194-2021) is found by its words
  return { leg: [...new Set([...files.leg, ...words.leg])], meet: [...new Set([...files.meet, ...words.meet])] };
}

/* A "this week at City Hall" story for the Today row. Null when there is nothing coming up and nothing recent. */
const CX_MTG_SRC = `https://cityofcleveland.legistar.com/Calendar.aspx`;
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
           deeper: { label: `Open At City Hall`, kind: `page`, page: `hall` }, source: { label: `the Clerk of Council's meeting record (Legistar)`, url: CX_MTG_SRC } };
}

/* ---------- the screen ---------- */
/* what For you reads besides the meeting record: the ward money's own text and the geocoded title addresses (data/place-2026.json), and the priority keyword rules */
const CX_MTG_LOOK = {
  fundWards: (f) => ((CX_PL.funds || {})[f] || {}).wards || [],
  addrWards: (f) => Object.values(CX_PL.addresses || {}).filter((r) => (r.files || []).includes(f)).map((r) => r.ward2026),
  match: (t) => cxMatch(t),
};
const CX_MTG_DAY3 = [`Sun`, `Mon`, `Tue`, `Wed`, `Thu`, `Fri`, `Sat`];
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
/* one item: a plain headline, then its file number and what happened to it (an item of a past meeting with no action in the record says so) */
function CxMtgItem({ i, onOpen, past, children }) {
  const x = cxmMatter(i[0]);
  return (
    <button type="button" className="mt-item" onClick={() => onOpen(i[0])}>
      <span><strong>{x ? cxHeadline(x.title) : `Legislation ${i[0]}`}</strong>{children || <small><span>{i[0]}</span>{` · `}<span>{!i[1] && past ? `No action recorded` : cxMtgAction(i[1])}</span></small>}</span>
    </button>
  );
}
/* a list that shows its first five, with "Show all N" for the rest */
function CxMtgList({ items, onOpen, past, first = 5 }) {
  const [all, setAll] = u.useState(!1);
  const shown = all ? items : items.slice(0, first);
  return (
    <>
      <div className="mt-items">{shown.map((i, k) => <CxMtgItem key={`${i[0]}${k}`} i={i} onOpen={onOpen} past={past} />)}</div>
      {items.length > first && <button type="button" className="cxm-link" aria-expanded={all} onClick={() => setAll(!all)}>{all ? `Show fewer` : `Show all ${items.length}`}</button>}
    </>
  );
}
/* an agenda by kind (ordinances, resolutions, everything else, ceremonial last): the first five items, then "Show all N" */
function CxMtgAgenda({ m, onOpen, past, first = 5 }) {
  const [all, setAll] = u.useState(!1);
  let left = all ? m.items.length : first;
  return (
    <div className="mt-agenda">
      {cxMtgByKind(m).map((g) => {
        const show = g.items.slice(0, Math.max(0, left));
        left -= show.length;
        if (!show.length) return null;
        return (
          <div key={g.g} className="mt-group">
            <p className="mt-group-h"><span>{g.label}</span>{` `}<span className="mt-n">{g.items.length}</span></p>
            <div className="mt-items">{show.map((i, k) => <CxMtgItem key={`${i[0]}${k}`} i={i} onOpen={onOpen} past={past} />)}</div>
          </div>
        );
      })}
      {m.items.length > first && <button type="button" className="cxm-link" aria-expanded={all} onClick={() => setAll(!all)}>{all ? `Show fewer` : `Show all ${m.items.length}`}</button>}
    </div>
  );
}
/* one meeting as a row that opens: the body, when, and how many items; inside, the Clerk's notice, the place, the agenda by kind, and the links */
function CxMtgMeet({ m, today, onOpen, date }) {
  const past = m.date < today;
  return (
    <details className="mt-meet">
      <summary>
        <span><strong>{m.body}</strong><small>{date ? <><span>{cxMtgMonthDay(m.date)}</span>{` · `}</> : null}{m.time ? <><span>{cxMtgTime(m.time)}</span>{` · `}</> : null}<span>{m.items.length ? cxmPl(m.items.length, `item`, `items`) : `No legislation listed`}</span></small></span>
        <CXI.Chevron size={18} className="cxm-chev" />
      </summary>
      <div className="mt-meet-body">
        <CxMtgNote note={m.note} className="cxm-fine" />
        {m.place && <p className="cxm-fine">{m.place}</p>}
        {m.items.length > 0 && <CxMtgAgenda m={m} onOpen={onOpen} past={past} />}
        <CxMtgLinks m={m} past={past} />
      </div>
    </details>
  );
}
/* 1. Next up: the next Council meeting. When, who, where, and how to watch, in two sentences at most, then the agenda and the meeting page */
function CxMtgLead({ m, today }) {
  if (!m) return <section className="cxm-tile mt-lead"><span className="cxm-kicker">Next up</span><p className="mt-sub">No meetings are on the Clerk's calendar yet.</p></section>;
  return (
    <section className="cxm-tile cxm-tile-acc mt-lead" aria-labelledby="mt-lead-h">
      <span className="cxm-kicker"><span>Next up</span>{` · `}<span>{cxMtgWeekday(m.date)}</span>{`, `}<span>{cxMtgMonthDay(m.date)}</span>{m.time ? <>{` · `}<span>{cxMtgTime(m.time)}</span></> : null}</span>
      <h3 id="mt-lead-h" className="mt-head"><CxMtgHead m={m} today={today} /></h3>
      {m.place && <p className="mt-place"><CXI.Pin size={15} aria-hidden="true" /><span>{m.place}</span></p>}
      <p className="mt-watch">{cxTight(cxMtgWatch(m.note), !0)}</p>
      {(m.agenda || m.page) && (
        <div className="mt-acts">
          {m.agenda && <a className="cxm-btn2" href={m.agenda} target="_blank" rel="noreferrer">Agenda<span className="sp-ext"> (opens in a new tab)</span></a>}
          {m.page && <a className="cxm-btn2" href={m.page} target="_blank" rel="noreferrer">Meeting page<span className="sp-ext"> (opens in a new tab)</span></a>}
        </div>
      )}
    </section>
  );
}
/* 2. The week as folder tabs, Monday to Friday. A day opens to its meetings, each a row that opens. No sideways scrolling. */
function CxMtgDays({ wk, today, onOpen }) {
  const [day, setDay] = u.useState(wk.pick);
  const d = wk.days.find((x) => x.iso === day) || wk.days[0];
  const tabs = wk.days.map((x) => [x.iso, (
    <>
      <span>{CX_MTG_DAY3[new Date(`${x.iso}T12:00:00Z`).getUTCDay()]}</span>{` `}<small>{cxMtgMonthDay(x.iso)}</small>
      <span className="cxm-sr">{`, `}{x.list.length ? cxmPl(x.list.length, `meeting`, `meetings`) : `No meetings`}</span>
    </>
  )]);
  return (
    <section className="mt-week" aria-labelledby="mt-week-h">
      <h3 id="mt-week-h" className="cxm-h3">{wk.when === `next` ? `Next week` : wk.when === `last` ? `Last week` : `This week`}</h3>
      <div>
        <CxmFolders idp="mt-day" cls="mt-days" label="Days of the week" items={tabs} value={d.iso} onChange={setDay} />
        <div id="mt-day-panel" role="tabpanel" aria-labelledby={`mt-day-${d.iso}`} className="mt-daypanel">
          <span className="cxm-kicker">{`${cxMtgWeekday(d.iso)}, ${cxMtgMonthDay(d.iso)}`}</span>
          {d.list.length ? d.list.map((m) => <CxMtgMeet key={m.id} m={m} today={today} onOpen={onOpen} />) : <p className="cxm-fine mt-none">No meetings on the Clerk's calendar for this day.</p>}
        </div>
      </div>
    </section>
  );
}
/* 3. What is on the next agenda, by kind */
function CxMtgOn({ m, onOpen }) {
  return (
    <section className="mt-on" aria-labelledby="mt-on-h">
      <h3 id="mt-on-h" className="cxm-h3">What is on it</h3>
      <p className="cxm-fine"><span>{m.body}</span>{` · `}<span>{cxMtgMonthDay(m.date)}</span>{m.items.length ? <>{` · `}<span>{cxmPl(m.items.length, `item`, `items`)}</span></> : null}</p>
      {m.items.length ? <CxMtgAgenda m={m} onOpen={onOpen} /> : <p className="cxm-fine">No legislation is listed on the agenda yet. The Clerk can add items before the meeting.</p>}
    </section>
  );
}
/* 4. For you: only from a ward or priorities the person set; worked out here, never sent, never a score */
function CxMtgYou({ meetings, ward, chosen, onOpen, onPlace, onPrio }) {
  const set = !!ward || chosen.length > 0;
  const list = u.useMemo(() => (set ? cxMtgForYou(meetings, ward, chosen, CX_MTG_LOOK) : []), [meetings, ward, chosen.join(`,`)]);
  const [all, setAll] = u.useState(!1);
  const shown = all ? list : list.slice(0, 5);
  return (
    <section className="mt-you" aria-labelledby="mt-you-h">
      <h3 id="mt-you-h" className="cxm-h3">For you</h3>
      {!set ? (
        <div className="cxm-tile mt-you-empty">
          <p>Set your place or your priorities to see what on this week's agendas touches them. They stay on this device.</p>
          <div className="cxm-row2"><button type="button" className="cxm-btn2" onClick={onPlace}>Set your neighborhood</button><button type="button" className="cxm-btn2" onClick={onPrio}>Choose priorities</button></div>
        </div>
      ) : (
        <>
          <p className="cxm-fine">From this week's agendas, matched on this device.</p>
          {list.length ? (
            <>
              <div className="mt-items">
                {shown.map((r) => (
                  <CxMtgItem key={r.f} i={r.i} onOpen={onOpen}>
                    <small className="mt-why">
                      <span>{r.f}</span>{` · `}<span>{cxMtgMonthDay(r.m.date)}</span>
                      {r.why.map((w, k) => (w[0] === `ward` ? <span key={k}>{` · `}<span>{w[1]}</span></span> : <span key={k}>{` · `}<span>{CX_SHORT[w[1]] || w[1]}</span>{` (`}<span lang="en" data-no-translate>{w[2]}</span>{`)`}</span>))}
                    </small>
                  </CxMtgItem>
                ))}
              </div>
              {list.length > 5 && <button type="button" className="cxm-link" aria-expanded={all} onClick={() => setAll(!all)}>{all ? `Show fewer` : `Show all ${list.length}`}</button>}
            </>
          ) : (
            <p className="cxm-tile mt-you-none">{cxTight(ward && chosen.length ? `Nothing on this week's agendas names Ward ${ward} or matches your priorities.` : ward ? `Nothing on this week's agendas names Ward ${ward}.` : `Nothing on this week's agendas matches your priorities.`, !0)}</p>
          )}
        </>
      )}
    </section>
  );
}
/* 5. Just decided: the last Council meeting's outcomes as counts, then its items */
function CxMtgDone({ m, today, onOpen }) {
  return (
    <section aria-labelledby="mt-done-h">
      <h3 id="mt-done-h" className="cxm-h3">Just decided</h3>
      <div className="cxm-tile mt-done">
        <strong className="mt-head2"><CxMtgHead m={m} today={today} past /></strong>
        <p className="mt-chips">{cxMtgTally(m).map(([l, n]) => <span key={l} className="mt-chip"><span>{l}</span>{` `}<b>{n}</b></span>)}</p>
        <CxMtgList items={cxMtgRanked(m)} onOpen={onOpen} past />
        <CxMtgLinks m={m} past />
      </div>
    </section>
  );
}
/* 6. Look it up: a file number, a word, or an address, matched on the device against the year's records and meetings. Nothing typed is saved or sent. */
function CxMtgLookup({ data, today, onOpen }) {
  const [q, setQ] = u.useState(``);
  const [more, setMore] = u.useState({});
  const index = u.useMemo(() => cxMtgIndex(data, CX_LEG.matters), [data]);
  const res = u.useMemo(() => cxMtgFind(index, q), [index, q]);
  const count = u.useMemo(() => { const c = new Map(); data.meetings.forEach((m) => new Set(m.items.map((i) => i[0])).forEach((f) => c.set(f, (c.get(f) || 0) + 1))); return c; }, [data]);
  const leg = res ? (more.leg ? res.leg : res.leg.slice(0, 5)) : [], meet = res ? (more.meet ? res.meet : res.meet.slice(0, 3)) : [];
  return (
    <section className="mt-find" aria-labelledby="mt-find-h">
      <h3 id="mt-find-h" className="cxm-h3">Look it up</h3>
      <label className="cxm-field"><span>File number, word, or address</span><input type="search" autoComplete="off" value={q} onChange={(e) => { setQ(e.target.value); setMore({}); }} placeholder="1232-2026, liquor, West 25th" /></label>
      {res && !res.leg.length && !res.meet.length && <CxmEmpty title={`Nothing matches "${q.trim()}"`} body="Try a file number such as 1232-2026, one word from a title, or a street name. Titles are in English." actions={[[`Clear the search`, () => setQ(``)]]} />}
      {res && res.leg.length > 0 && (
        <div className="mt-res" role="group" aria-labelledby="mt-res-leg">
          <span id="mt-res-leg" className="cxm-kicker"><span>Legislation</span>{` · `}<span>{res.leg.length}</span></span>
          {leg.map((x) => <button key={x.file} type="button" className="cxm-row mt-row" onClick={() => onOpen(x.file)}><span><strong>{cxHeadline(x.title)}</strong><small><span>{x.file}</span>{count.get(x.file) ? <>{` · `}<span>{cxmPl(count.get(x.file), `meeting`, `meetings`)}</span></> : null}</small></span><CXI.Arrow size={15} /></button>)}
          {res.leg.length > 5 && <button type="button" className="cxm-link" aria-expanded={!!more.leg} onClick={() => setMore((o) => ({ ...o, leg: !o.leg }))}>{more.leg ? `Show fewer` : `Show all ${res.leg.length}`}</button>}
        </div>
      )}
      {res && res.meet.length > 0 && (
        <div className="mt-res" role="group" aria-labelledby="mt-res-meet">
          <span id="mt-res-meet" className="cxm-kicker"><span>Meetings</span>{` · `}<span>{res.meet.length}</span></span>
          <div className="mt-res-meet">{meet.map((m) => <CxMtgMeet key={m.id} m={m} today={today} onOpen={onOpen} date />)}</div>
          {res.meet.length > 3 && <button type="button" className="cxm-link" aria-expanded={!!more.meet} onClick={() => setMore((o) => ({ ...o, meet: !o.meet }))}>{more.meet ? `Show fewer` : `Show all ${res.meet.length}`}</button>}
        </div>
      )}
    </section>
  );
}
/* 7. Earlier this year: one fold, and inside it one fold per month */
function CxMtgEarlier({ g, today, onOpen }) {
  const month = new Date(`${g.key}-15T12:00:00Z`).toLocaleDateString(`en-US`, { month: `long`, year: `numeric`, timeZone: `UTC` });
  return (
    <CxmDrop title={month} sub={cxmPl(g.list.length, `meeting`, `meetings`)}>
      {g.list.map((m) => <CxMtgMeet key={m.id} m={m} today={today} onOpen={onOpen} date />)}
    </CxmDrop>
  );
}
/* The front page. onOpen opens a legislation record. For you shows only where the layout passes onPlace (the phone). */
function CX_Meetings({ onOpen, ward = null, chosen = [], onPlace, onPrio }) {
  const data = useCxMtg();
  if (!data) return <p className="cxm-mut" role="status">{CX_MTG.done ? `The meeting record needs the hosted site. It is not part of the offline file.` : `Loading the meeting record...`}</p>;
  const today = cxTodayET(), s = cxMtgSplit(data, today), wk = cxMtgWeek(data, today), dec = cxMtgDecided(data, today);
  const earlier = s.months.reduce((t, g) => t + g.list.length, 0);
  return (
    <div className="mt">
      <CxMtgLead m={s.lead} today={today} />
      <CxMtgDays wk={wk} today={today} onOpen={onOpen} />
      {s.lead && <CxMtgOn m={s.lead} onOpen={onOpen} />}
      {onPlace && <CxMtgYou meetings={wk.days.flatMap((x) => x.list)} ward={ward} chosen={chosen} onOpen={onOpen} onPlace={onPlace} onPrio={onPrio} />}
      {dec && <CxMtgDone m={dec} today={today} onOpen={onOpen} />}
      <CxMtgLookup data={data} today={today} onOpen={onOpen} />
      {earlier > 0 && (
        <section className="mt-earlier" aria-label="Earlier this year">
          <CxmDrop title="Earlier this year" sub={cxmPl(earlier, `meeting`, `meetings`)}>
            <div className="mt-months">{s.months.map((g) => <CxMtgEarlier key={g.key} g={g} today={today} onOpen={onOpen} />)}</div>
          </CxmDrop>
        </section>
      )}
      <div className="mt-foot">
        <p className="cxm-fine"><span>Source:</span>{` `}<a href={CX_MTG_SRC} target="_blank" rel="noreferrer">the Clerk of Council's meeting record (Legistar)<span className="sp-ext"> (opens in a new tab)</span></a>{`. `}<span>{`Pulled ${cxShortDate(cxDayET(Date.parse(data.retrieved_at)))}.`}</span></p>
        <p className="cxm-fine">It does not include testimony or public comment. A missing record is not a no.</p>
      </div>
    </div>
  );
}
/* The phone page: full screen over the tabs, with a back arrow (to the story, when it was opened from one) and the language switch. Each item opens
   its legislation record in a sheet on top. ?panel=meetings opens it. */
function CxmHall() {
  const { overlay, setOverlay, openSheet, home, prio } = useCxm();
  const backRef = u.useRef(null);
  u.useEffect(() => { if (backRef.current) backRef.current.focus({ preventScroll: !0 }); }, []);
  const toStory = !!(overlay && overlay.back && overlay.back.type === `story`);
  return (
    <div className="cxm-full mt-page" role="dialog" aria-modal="true" aria-label="At City Hall">
      <div className="cxm-full-bar">
        <button type="button" ref={backRef} className="cxm-full-back" onClick={() => setOverlay((overlay && overlay.back) || null)}><CXI.Back size={18} /><span>{toStory ? `Back to the story` : `Back`}</span></button>
        <div className="cxm-top-actions"><CX_LangButton cls="cxm-lang" short /></div>
      </div>
      <div className="cxm-full-body">
        <CxmBanner kind="hall" kicker="Council and committee meetings" title="At City Hall" />
        <CX_Meetings onOpen={(file) => openSheet(`leg`, { file })} ward={(home && home.ward) || null} chosen={prio.chosen} onPlace={() => openSheet(`home`)} onPrio={() => openSheet(`priorities`)} />
      </div>
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
/* the card on Today: the next meeting only (who meets when, and how many items), one tap to the page */
function CxmHallCard() {
  const data = useCxMtg(), { setOverlay } = useCxm();
  if (!data) return null;
  const today = cxTodayET(), m = cxMtgSplit(data, today).lead;
  return (
    <section className="cxm-section mt-hall">
      <CxmBanner kind="hall" kicker="Next up" title="At City Hall" />
      <button type="button" className="cxm-card mt-card" onClick={() => setOverlay({ type: `hall` })}>
        {m ? (
          <>
            <strong><CxMtgHead m={m} today={today} /></strong>
            <small>{m.time ? <><span>{cxMtgTime(m.time)}</span>{` · `}</> : null}<span>{cxMtgLine(m, today).sub}</span></small>
          </>
        ) : <strong>No meetings are on the Clerk's calendar yet.</strong>}
        <em>Open At City Hall <CXI.Arrow size={14} /></em>
      </button>
    </section>
  );
}
