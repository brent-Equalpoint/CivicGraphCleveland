/* Records (docs/plan-records-feed.md, phase 2; docs/plan-mobile-restructure.md, Option A): every dated record in Council's 2026 public record in one
   list, newest first, with one card for every kind (legislation, a meeting, a roll call) and three filters (when, what kind, which ward) and one sort.
   On the phone it is the Latest folder of the Records tab (?panel=records, "See all records" under Today's Latest, and the Updated strip).
   Data: site/records/records-2026.json, written by build.py from scripts/records_feed.py (a pure function of data/), fetched the first time Records
   opens; Today's Latest reads the front of the same list, site/records/latest-2026.json, after Today has drawn. The single offline file carries both
   as blocks that are read only then.
   A card: what kind and when, the record's own headline, what happened, the wards it is tied to and why, and its source with the day it was pulled.
   Details opens in place: the shared record (ext/cx-record.jsx) for legislation and roll calls, the agenda for a meeting.
   Rules kept: receipts, not scores (date order only; a count is a count of cards, never a rank or a shade); sponsorship is not a vote; a missing
   record is not a no; the filters, and the ward chosen on this device, stay in this page's memory: never in the address, storage, or a request. */

/* ---------- the list, loaded once when first needed ---------- */
const CX_RECS = { p: null, v: null, done: !1, lp: null, lv: null, ldone: !1, subs: new Set() };
const CX_RECS_DIR = [``, `records`, ``].join(`/`);   // the folder, from parts: build.py rewrites a written-out path that starts with /records/ (the ballot PDFs)
function cxRecsBlock(id) {   // the single offline file: a block read once, then removed
  const el = typeof document !== `undefined` ? document.getElementById(id) : null;
  if (!el) return undefined;
  let d = null;
  try { d = JSON.parse(el.textContent); } catch (e) { d = null; }
  el.remove();
  return d;
}
function cxRecsGet(name) {
  const web = typeof fetch === `function` && /^https?:$/.test(String(globalThis.location?.protocol || ``));
  return web ? fetch(CX_RECS_DIR + name).then((r) => (r.ok ? r.json() : null)).catch(() => null) : Promise.resolve(null);
}
function cxRecsLoad() {
  if (!CX_RECS.p) {
    const ready = (d) => { CX_RECS.v = d && Array.isArray(d.rows) ? d : null; CX_RECS.done = !0; CX_RECS.subs.forEach((f) => f()); return CX_RECS.v; };
    const b = cxRecsBlock(`cx-records`);
    CX_RECS.p = (b !== undefined ? Promise.resolve(b) : cxRecsGet(`records-2026.json`)).then(ready);
  }
  return CX_RECS.p;
}
/* Today's Latest: the front rows of the same list (a few KB), unless the whole list is already here */
function cxRecsLatestLoad() {
  if (!CX_RECS.lp) {
    const ready = (d) => { CX_RECS.lv = d && Array.isArray(d.rows) ? d : null; CX_RECS.ldone = !0; CX_RECS.subs.forEach((f) => f()); return CX_RECS.lv; };
    const b = CX_RECS.v ? CX_RECS.v : cxRecsBlock(`cx-records-latest`);
    CX_RECS.lp = (b !== undefined ? Promise.resolve(b) : cxRecsGet(`latest-2026.json`)).then(ready);
  }
  return CX_RECS.lp;
}
/* latest: read only the front rows, a moment after the screen has drawn */
function useCxRecs(latest) {
  const [, bump] = u.useState(0);
  u.useEffect(() => {
    const f = () => bump((x) => x + 1);
    CX_RECS.subs.add(f);
    const t = latest ? setTimeout(cxRecsLatestLoad, 250) : 0;
    if (!latest) cxRecsLoad();
    return () => { clearTimeout(t); CX_RECS.subs.delete(f); };
  }, []);
  return latest ? CX_RECS.v || CX_RECS.lv : CX_RECS.v;
}

/* ---------- the filters ---------- */
const CX_REC_TIMES = [[7, `Last 7 days`], [30, `Last 30 days`], [0, `All time`]];
const CX_REC_TYPES = [[`all`, `All`], [`legislation`, `Legislation`], [`meeting`, `Meetings`], [`vote`, `Votes`]];
const CX_REC_SORTS = [[`new`, `Newest first`], [`old`, `Oldest first`]];
const CX_REC_START = { days: 30, type: `all`, ward: 0, sort: `new` };
/* The cards that pass the filters, in the chosen order. f = { days (0: all time), type (`all` or a kind), ward (0: any), sort (`new` or `old`) };
   today is a day in Eastern time. Days count back from today, today being the first; a meeting still to come is in every window. The list is
   already newest first, so oldest first is the same list turned around. */
function cxRecFilter(rows, f, today) {
  const out = (rows || []).filter((r) => (!f.days || cxDays(r.date, today) < f.days) && (!f.type || f.type === `all` || r.type === f.type) && (!f.ward || r.wards.some((w) => w[0] === f.ward)));
  return f.sort === `old` ? out.reverse() : out;
}
/* how many cards of each kind the other filters leave (shown on the kind choices; never on All) */
function cxRecKindCounts(rows, f, today) {
  const n = { legislation: 0, meeting: 0, vote: 0 };
  cxRecFilter(rows, { ...f, type: `all` }, today).forEach((r) => { n[r.type] += 1; });
  return n;
}

/* ---------- the words on a card ---------- */
const CX_REC_KIND = { legislation: `Legislation`, meeting: `Meeting`, vote: `Vote` };
const CX_REC_PASSED = new Set([`approved`, `approved as amended`, `adopted`, `adopted as amended`, `passed`, `effective`]);
/* why a card is tied to a ward, in the words the ward view uses */
function cxRecTie(t) {
  const [w, kind, addr] = t;
  return kind === `names` ? `Names Ward ${w}` : kind === `money` ? `Ward ${w} in the ordinance text` : addr ? `Address in Ward ${w}: ${addr}` : `Address in Ward ${w}`;
}
/* what happened on the card's date, from the reviewed words in ext/cx-votes-text.jsx ("passed" is Legistar's own word) */
function cxRecAct(r) {
  if (r.act === `passed`) return `Passed`;
  return CX_VT.action[r.act] || r.act.charAt(0).toUpperCase() + r.act.slice(1);
}
/* where it stands now, unless the action already says so; a status with no plain words of ours is named as the record's own */
function cxRecNow(r) {
  if ((r.status === `Passed` && CX_REC_PASSED.has(r.act)) || (r.status === `Filed` && r.act === `received and filed`)) return null;
  return CX_STAGE[r.status] ? `Now: ${CX_STAGE[r.status]}.` : `Status in Council's record: ${r.status}.`;
}
/* "14 Yea, 0 Nay, 1 Absent": the record's own words, every word that has a member in it (as cxRecCountLine does for a vote in the page) */
function cxRecCounts(c) {
  return [`yea`, `nay`, `absent`, `recused`, `abstain`].filter((w) => w === `yea` || w === `nay` || c[w]).map((w) => `${c[w]} ${CX_VT.word[w]}`).join(`, `);
}
/* the source's short name on a card ("Legistar", "Minutes", "City Record"); the whole name is in the row and on the record */
function cxRecSrcShort(r) {
  const head = String(r.src || ``).split(`,`)[0];
  return head === `Council's Legistar record` ? `Legistar` : head;
}
function cxRecMeetState(r, today) {
  return r.date < today ? `Met.` : r.date === today ? `Meets today.` : `Scheduled.`;
}
/* the roll call in the page (CX_VOTES) that a vote card is about, for its names */
function cxRecVoteOf(r) {
  return [cxVoteRecord(r.file), ...cxVoteOthers(r.file)].find((v) => v && v.date === r.date && v.question === r.question) || null;
}

/* ---------- one card, the same parts for every kind ---------- */
function cxRecCard(r, o = {}) {
  return <CX_RecCard key={r.id} r={r} {...o} />;
}
function CX_RecSrcLine({ r }) {
  return (
    <p className="rf-src"><span>Source:</span>{` `}<a href={r.url} target="_blank" rel="noreferrer">{cxRecSrcShort(r)}<span className="sp-ext"> (opens in a new tab)</span></a><span>{`, pulled ${cxmDate(cxDayET(Date.parse(r.pulled)))}.`}</span></p>
  );
}
function CX_RecCard({ r, today, onFile, onPerson, first }) {
  const [open, setOpen] = u.useState(!1);
  const id = `rf-d${u.useId().replace(/[^A-Za-z0-9]/g, ``)}`;   // the same record can be on Today and on Records at once
  const m = r.file ? cxmMatter(r.file) : null;
  const file = r.file && m && /^\d{1,5}-\d{4}$/.test(r.file) ? <a href={`?panel=leg&file=${r.file}`} onClick={(e) => { e.preventDefault(); onFile(r.file); }}>{r.file}</a> : r.file ? <span>{r.file}</span> : null;
  if (r.type === `legislation` && r.short) {   // a ceremonial resolution: one short line, never a full record
    return (
      <li className="rf-card rf-short" data-type={r.type} data-id={r.id} data-date={r.date}>
        <p className="rf-line" tabIndex={-1} ref={first}><span className="rf-type">Ceremonial resolution</span>{` · `}<span>{cxmDate(r.date)}</span>{` · `}{file}{` · `}<span data-rec="">{cxHeadline(r.title)}</span>{` · `}<span>{cxRecAct(r)}</span></p>
        <CX_RecSrcLine r={r} />
      </li>
    );
  }
  const title = r.title ? cxHeadline(r.title) : `File ${r.file}, from before this year's record`;
  return (
    <li className="rf-card" data-type={r.type} data-id={r.id} data-date={r.date}>
      <p className="rf-kind"><span className="rf-type">{CX_REC_KIND[r.type]}</span>{file ? <>{` · `}{file}</> : null}{` · `}<span>{cxmDate(r.date)}</span>{r.type === `meeting` && r.time ? <>{` · `}<span>{cxMtgTime(r.time)}</span></> : null}</p>
      <h3 className="rf-title" tabIndex={-1} ref={first} data-rec="">{r.type === `meeting` ? <span>{r.title}</span> : title}</h3>
      {r.type === `legislation` && <p className="rf-what"><span>{cxRecAct(r)}</span>{r.body && r.body !== `City Council` ? <span className="rf-body">{r.body}</span> : null}{cxRecNow(r) ? <span className="rf-now">{cxRecNow(r)}</span> : null}</p>}
      {r.type === `meeting` && <p className="rf-what"><span>{cxRecMeetState(r, today)}</span>{` `}<span>{r.items ? cxmPl(r.items, `item on the agenda.`, `items on the agenda.`) : `No legislation on the agenda.`}</span></p>}
      {r.type === `vote` && <p className="rf-what"><span>{CX_VT.question[r.question] || r.question}</span>{`: `}<strong className="rf-count-line">{cxRecCounts(r.count)}</strong></p>}
      {r.wards.length > 0 && <p className="rf-wards">{r.wards.map((t) => <span key={t[0]} className="rf-chip" data-ward={t[0]}>{cxRecTie(t)}</span>)}</p>}
      <CX_RecSrcLine r={r} />
      <button type="button" className="rf-more" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}><span>{open ? `Hide details` : `Details`}</span><CXI.Chevron size={16} className="cxm-chev" /></button>
      {open && <div id={id} className="rf-details">{r.type === `meeting` ? <CX_RecMeetDetails r={r} today={today} onFile={onFile} /> : r.type === `vote` ? <CX_RecVoteDetails r={r} m={m} onFile={onFile} onPerson={onPerson} /> : <CX_RecLegDetails m={m} onFile={onFile} onPerson={onPerson} />}</div>}
    </li>
  );
}
/* Details: the shared record of a file (ext/cx-record.jsx), in place */
function CX_RecLegDetails({ m, onFile, onPerson }) {
  if (!m) return null;
  return (
    <div className="rf-rec">
      <p className="rc-lead"><span>{`City Council. Introduced ${cxLongDate(m.intro)}.`}</span>{` `}<span>{m.status === `Passed` && m.passed ? `Passed ${cxLongDate(m.passed)}.` : `Status in Council's record: ${m.status}.`}</span></p>
      <CX_RecActions m={m} onPerson={onPerson} onFile={onFile} head="h4" />
      <CX_RecPositions m={m} onPerson={onPerson} head="h4" />
      <CX_RecWhere m={m} head="h4" />
      <button type="button" className="rf-open" onClick={() => onFile(m.file)}>{`Open the full record of ${m.file}`}</button>
    </div>
  );
}
function CX_RecVoteDetails({ r, m, onFile, onPerson }) {
  const v = cxRecVoteOf(r);
  return (
    <div className="rf-rec rc">
      {v ? <CX_RecVote v={v} file={r.file} onPerson={onPerson} /> : <p className="rc-note">The names for this vote are on its source.</p>}
      {m && <button type="button" className="rf-open" onClick={() => onFile(m.file)}>{`Open the full record of ${m.file}`}</button>}
    </div>
  );
}
/* a meeting: the Clerk's notice, the place, the agenda by kind (from the meeting record, on the hosted site), and its links */
function CX_RecMeetDetails({ r, today, onFile }) {
  const data = useCxMtg();
  const [wait, again] = useCxWait(!data && CX_MTG.done);
  const m = data ? data.meetings.find((x) => x.id === r.mid) : null;
  const past = r.date < today;
  return (
    <div className="rf-rec mt">
      {m && <CxMtgNote note={m.note} className="cxm-fine" />}
      {r.place && <p className="cxm-fine">{r.place}</p>}
      {m && m.items.length > 0 && <CxMtgAgenda m={m} onOpen={onFile} past={past} />}
      {!m && !data && (wait === `loading` ? <p className="cxm-fine" role="status">Loading the agenda.</p> : <CxMtgFail wait={wait} again={again} body={`The agenda by kind comes from this website, and it did not arrive. The links below still open it. Check your connection, then try again.`} />)}
      <CxMtgLinks m={r} past={past} />
    </div>
  );
}

/* ---------- the list with its filters ---------- */
function CX_RecPills({ name, label, items, value, onChange, counts }) {
  return (
    <div className="rf-group" role="group" aria-label={label} data-f={name}>
      <span className="rf-label" aria-hidden="true">{label}</span>
      <div className="rf-pills">
        {items.map(([id, text]) => (
          <button key={id} type="button" aria-pressed={value === id} className={value === id ? `on` : ``} data-v={String(id)} onClick={() => onChange(id)}>
            <span>{text}</span>{counts && counts[id] != null ? <>{` `}<span className="rf-n">{counts[id].toLocaleString(`en-US`)}</span></> : null}
          </button>
        ))}
      </div>
    </div>
  );
}
/* home: the ward chosen on this device (or none), offered as "Names my ward"; it is kept only in this page's memory */
function CX_Records({ home = null, onFile, onPerson, step = 20 }) {
  const data = useCxRecs(!1);
  const [f, setF] = u.useState(CX_REC_START);
  const [n, setN] = u.useState(step);
  const [mine, setMine] = u.useState(!1);
  const firstNew = u.useRef(null), focusAt = u.useRef(-1);
  const today = cxTodayET();
  const ward = mine && home ? home : f.ward;
  const shown = u.useMemo(() => (data ? cxRecFilter(data.rows, { ...f, ward }, today) : []), [data, f, ward, today]);
  const kinds = u.useMemo(() => (data ? cxRecKindCounts(data.rows, { ...f, ward }, today) : null), [data, f, ward, today]);
  u.useEffect(() => { if (focusAt.current >= 0 && firstNew.current) { firstNew.current.focus({ preventScroll: !1 }); focusAt.current = -1; } }, [n]);
  const set = (k, v) => { setF((x) => ({ ...x, [k]: v })); setN(step); };
  if (!data) {
    return CX_RECS.done
      ? <CxmEmpty title="Records could not be loaded" body="This page reads a list from this website, and it did not arrive. Check your connection, then try again." actions={[[`Try again`, () => { CX_RECS.p = null; CX_RECS.done = !1; cxRecsLoad(); }]]} />
      : <p className="cxm-mut" role="status">Loading the records.</p>;
  }
  const wardValue = mine ? `mine` : String(f.ward || ``);
  return (
    <div className="rf">
      <p className="rf-lead">Every dated record in City Council's 2026 public record: legislation, meetings, and roll call votes.</p>
      <div className="rf-filters">
        <CX_RecPills name="days" label="When" items={CX_REC_TIMES} value={f.days} onChange={(v) => set(`days`, v)} />
        <CX_RecPills name="type" label="Kind" items={CX_REC_TYPES} value={f.type} onChange={(v) => set(`type`, v)} counts={kinds} />
        <label className="cxm-field rf-ward"><span>Ward</span>
          <select value={wardValue} onChange={(e) => { const v = e.target.value; setMine(v === `mine`); set(`ward`, v === `mine` || !v ? 0 : Number(v)); }}>
            <option value="">Any ward</option>
            {home ? <option value="mine">{`Names my ward (Ward ${home})`}</option> : null}
            {Array.from({ length: 15 }, (_, i) => <option key={i + 1} value={String(i + 1)}>{`Ward ${i + 1}`}</option>)}
          </select>
        </label>
        <CX_RecPills name="sort" label="Order" items={CX_REC_SORTS} value={f.sort} onChange={(v) => set(`sort`, v)} />
      </div>
      <p className="rf-count" role="status" aria-live="polite"><span>{shown.length.toLocaleString(`en-US`)}</span>{` `}<span>{shown.length === 1 ? `record` : `records`}</span></p>
      {ward ? <p className="cxm-fine">A record is tied to a ward when its title names the ward, its ordinance text ties ward money to it, or an address in its title is in the ward. Sponsorship by the ward's member is not counted here.</p> : null}
      {shown.length ? (
        <ol className="rf-list">{shown.slice(0, n).map((r, i) => cxRecCard(r, { today, onFile, onPerson, first: i === focusAt.current ? firstNew : undefined }))}</ol>
      ) : (
        <CxmEmpty title="No records match these choices" body="Nothing in the record is dated in this window with this ward and kind. That is not the same as nothing happening." actions={[[`Clear the filters`, () => { setMine(!1); setF(CX_REC_START); setN(step); }]]} />
      )}
      {shown.length > n && <button type="button" className="rf-show" onClick={() => { focusAt.current = n; setN(n + step); }}>{`Show ${Math.min(step, shown.length - n)} more`}</button>}
      <div className="rf-foot">
        <p className="cxm-fine">Each card says where it comes from and when that record was pulled. The words for what happened are ours; the record's own words are in Details.</p>
        <p className="cxm-fine">{cxRecReview()}</p>
        <p className="cxm-fine">Sponsorship is not a vote. A missing record is not a no.</p>
      </div>
    </div>
  );
}

/* ---------- the phone: Records > Latest (?panel=records), the same banner and list that were the full page, now inside the tab ---------- */
function CxmRecords() {
  const { openSheet, openProfile, home } = useCxm();
  return (
    <div className="rf-page cxm-rise">
      <CxmBanner kind="receipts" title="Records" />
      <CX_Records home={(home && home.ward) || null} onFile={(file) => openSheet(`leg`, { file })} onPerson={openProfile} />
    </div>
  );
}

/* ---------- the phone's Records tab (docs/plan-mobile-restructure.md, Option A, step 2): Explore's slot, with three folders ----------
   Latest (the list above), Meetings (At City Hall as it was, ext/cx-meetings.jsx), and Rooms (Explore as it was: the rail, the six levels, the 17 rooms,
   and the guide, ext/cxm-explore.jsx). The folder tabs are People's (CxmFolders) and sit above the list, outside its scroll, so the list, and the rail on
   Rooms, start under them. The tab remembers its folder for the visit, in memory only. Its id stays `explore` in the code until every check passes. */
const CXM_REC_FOLDERS = [[`latest`, `Latest`], [`meetings`, `Meetings`], [`rooms`, `Rooms`]];
function CxmRecBar() {
  const { recFolder, setRecFolder } = useCxm();
  return <nav className="cxm-recbar" aria-label="Records"><CxmFolders idp="rf-folder" label="Records" items={CXM_REC_FOLDERS} value={recFolder} onChange={setRecFolder} /></nav>;   // a landmark, as the tab bar is: outside the list, it would be outside every landmark
}
function CxmRecTab() {
  const { recFolder } = useCxm();
  return (
    <div id="rf-folder-panel" role="tabpanel" aria-labelledby={`rf-folder-${recFolder}`} className="cxm-recpanel">
      {recFolder === `meetings` ? <CxmHall /> : recFolder === `rooms` ? <CxmExplore /> : <CxmRecords />}
    </div>
  );
}
