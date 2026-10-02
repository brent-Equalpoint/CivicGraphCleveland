/* Cleveland Civic Graph v5.14 (v5.15 live layer): the phone app.
   Same module, same data as the desktop app: rooms (Uh), records, dictionary (Wh), history (Gh),
   ballot contests (Hm), issues (Um, Jm), constellation (Wm, Gm), priorities (wm, Dm), Legistar
   (CX_LEG), reasons (CX_REASONS, CX_RSRC), place data (CX_GEO, CX_PL), leaders (cxLegIndex).
   Nothing here copies a fact from those sources; screens only read them.
   The phone app renders under 760px wide, on any touch device whose short side is 500px or less
   (so turning a phone sideways keeps the phone app), or anywhere with #phone in the address.
   #desktop forces the desktop app. Room, record and panel links work in both layouts. */

/* ---------- which app to show ---------- */
function cxmWantPhone() {
  const h = String(globalThis.location?.hash || ``);
  if (/(^|[#&])phone\b/.test(h)) return !0;
  if (/(^|[#&])desktop\b/.test(h)) return !1;
  try {
    if (globalThis.matchMedia(`(max-width: 760px)`).matches) return !0;
    // a phone turned sideways is still a phone: touch screen with a short side of 500px or less
    const sc = globalThis.screen;
    return globalThis.matchMedia(`(pointer: coarse)`).matches && !!sc && Math.min(sc.width, sc.height) <= 500;
  } catch { return !1; }
}
/* Desktop Easy mode: the same one-thing-at-a-time screens, centered, reached from the header's Easy mode button. */
const CX_EASY_HOOK = { set: () => {} };
function cxEasyOn() { CX_EASY_HOOK.set(!0); }
function cxHasDeepLink() {
  try { const q = new URLSearchParams(globalThis.location?.search || ``); return !!(q.get(`room`) || q.get(`node`) || q.get(`panel`)); } catch { return !1; }
}
function CX_Root() {
  const [phone, setPhone] = u.useState(cxmWantPhone);
  const [deskEasy, setDeskEasy] = u.useState(() => !cxmWantPhone() && cxmStore(`cx-easy`, ``) === `on` && !cxHasDeepLink());
  u.useEffect(() => { CX_EASY_HOOK.set = (v) => { cxmPut(`cx-easy`, v ? `on` : `off`); setDeskEasy(v); }; }, []);
  u.useEffect(() => {
    const f = () => setPhone(cxmWantPhone());
    let mq = null;
    try { mq = globalThis.matchMedia(`(max-width: 760px)`); mq.addEventListener(`change`, f); } catch {}
    globalThis.addEventListener(`hashchange`, f);
    globalThis.addEventListener(`orientationchange`, f);
    return () => { try { mq && mq.removeEventListener(`change`, f); } catch {} globalThis.removeEventListener(`hashchange`, f); globalThis.removeEventListener(`orientationchange`, f); };
  }, []);
  u.useEffect(() => { document.documentElement.classList.toggle(`cxm-on`, phone || deskEasy); }, [phone, deskEasy]);
  return (
    <CxBoundary label="The Civic Graph" phone={phone} resetKey={phone ? `phone` : `desktop`}>
      {phone || deskEasy ? <CxmApp deskEasy={!phone && deskEasy} onLeaveEasy={() => CX_EASY_HOOK.set(!1)} /> : <><Qh /><CX_HoverCard /><CX_LinkNotice /><CX_StorageNotice /></>}
      <CX_LangNotice />
    </CxBoundary>
  );
}

/* ---------- election dates (shared with the desktop voter guide) ---------- */
const CX_DATES = [
  [`Oct 5`, `Registration deadline`, `2026-10-05`],
  [`Oct 6`, `Early voting begins`, `2026-10-06`],
  [`Oct 27`, `Mail ballot application due by 8:30 p.m.`, `2026-10-27`],
  [`Nov 1`, `Early in-person voting ends at 5 p.m.`, `2026-11-01`],
  [`Nov 3`, `Election Day`, `2026-11-03`],
];
/* ---------- "Who does what?" (shared with the desktop voter guide; build.py checks the text matches) ---------- */
const CX_WHO_DOES = [
  [`Mayor and city departments`, `Run city services. Think streets, buildings and daily administration. City Council makes local laws and approves many spending decisions.`],
  [`City Council, state legislature, Congress`, `These are different lawmaking bodies. An ordinance is a local law. A bill is a proposal; it is not a law just because someone introduced it.`],
  [`Courts and judges`, `Courts apply law to cases and resolve disputes. Judges do not work as the mayor’s department. Different courts hear different kinds of cases.`],
  [`Boards and school districts`, `Boards govern specific services or organizations. Some members are elected and others appointed. Check the specific board’s selection rules.`],
  [`Ward, district and precinct`, `A ward is an area for city representation. Other offices use their own districts. A precinct is a small voting area that helps determine your ballot and polling place.`],
  [`Votes, statements and party`, `A recorded vote shows a choice on one decision. A statement shows what someone said. A party label identifies affiliation. None alone tells you everything a person believes.`],
  [`Yes, no and not voting`, `Yes and no describe the question actually being voted on. Not voting is not a no. Read the proposal and voting stage before comparing.`],
];
const CXM_ELECTION = CX_ELECTION;
/* whole days from today in Cleveland (Eastern time) to a date; 0 means today */
function cxmDaysTo(iso) {
  return cxDays(cxTodayET(), iso);
}

/* ---------- small shared helpers ---------- */
const CXM_ANS = [[`yes`, `Yes`], [`no`, `No`], [`depends`, `It depends`], [`learning`, `Still learning`]];
function cxmSurname(n) {
  return String(n).replace(/\s*&.*$/, ``).split(` `).slice(-1)[0];
}
function cxmInitials(n) {
  const w = String(n).replace(/[^A-Za-z .&-]/g, ``).split(/[\s&]+/).filter(Boolean);
  return ((w[0] || ``)[0] || ``) + ((w.length > 1 ? w[w.length - 1] : ``)[0] || ``);
}
function cxmMoney(n) {
  return n == null ? `` : `$${Math.round(n).toLocaleString(`en-US`)}`;
}
function cxmDate(iso) {
  if (!iso) return ``;
  const d = new Date(`${String(iso).slice(0, 10)}T12:00:00`);
  return isNaN(d) ? String(iso) : d.toLocaleDateString(`en-US`, { month: `short`, day: `numeric` });
}
function cxmAsset(p) {
  return globalThis.__cxAsset ? globalThis.__cxAsset(p) : p;
}
function cxmMember(w) {
  return (_h.find(([n]) => n === w) || [])[1] || ``;
}
function cxmHoodWard(hood) {
  let best = null;
  for (const [w, rows] of Object.entries(CX_GEO.overlap.wards2026)) for (const r of rows) if (r.hood === hood && (!best || r.share_of_hood > best.share)) best = { ward: Number(w), share: r.share_of_hood };
  return best;
}
const CXM_BY_FILE = new Map(CX_LEG.matters.map((m) => [m.file, m]));
function cxmMatter(file) {
  return CXM_BY_FILE.get(file) || null;
}
/* which constellation question (if any) is about this file */
function cxmQuestionForFile(file) {
  const hit = [...CX_COUNCIL_Q, ...CX_MAYOR_Q].find((q) => q[0] === file);
  return hit ? Wm.find((w) => w.id === hit[1]) || null : null;
}

/* Relationship status, from the record's status and action history */
function cxmStatus(m) {
  const p = cxPlPath(m);
  const denial = p.flags.find((f) => /denial/.test(f[1]));
  let flip = ``;
  if (denial && m.status === `Passed`) {
    const later = p.h.find((r) => r[0] >= denial[0] && /recommended for approval/.test(r[1]) && r[2] === denial[2]);
    flip = `On again, off again: the ${denial[2]} recommended denial on ${cxmDate(denial[0])}${later ? `, then approval on ${cxmDate(later[0])}` : ``}.`;
  }
  const wd = cxWithdrawn(m);
  if (wd && m.status !== `Passed`) return { k: `read`, label: `Withdrawn`, note: `Withdrawn in the ${wd[2]} on ${cxmDate(wd[0])}. It is not moving forward.`, flip, p };
  if (m.status === `Passed`) {
    const amended = p.fin && /amended/.test(p.fin[1]);
    return amended
      ? { k: `cond`, label: `Committed, with a few conditions`, note: `Passed as amended: Council changed it before saying yes.`, flip, p }
      : { k: `done`, label: `Committed`, note: `Passed by City Council.`, flip, p };
  }
  if (m.status === `Tabled`) return { k: `read`, label: `Left on read`, note: `Tabled by City Council. It can come back, but it hasn't.`, flip, p };
  if (m.status === `Held`) return { k: `hold`, label: `On pause`, note: `Held by Council. Nothing is final.`, flip, p };
  return { k: `talk`, label: `Talking stage`, note: `Still moving through Council (status: ${m.status}). Nothing is final.`, flip, p };
}

/* ---------- priorities: same storage and rules as the desktop My priorities page ---------- */
function useCxmPrio() {
  const [st, setSt] = u.useState(() => {
    let v = { ...Om }, s = { ...km }, rem = !1;
    try {
      const raw = localStorage.getItem(Sm);
      if (raw) { const n = JSON.parse(raw); if (n?.version === 2) { v = Am(n.values); s = jm(n.stances); rem = !0; } }
    } catch {}
    return { v, s, rem, msg: `` };
  });
  u.useEffect(() => { cxPrioritySet(st.v); }, [st.v]);
  const persist = (v, s, rem) => {
    if (!rem) return ``;
    try { localStorage.setItem(Sm, JSON.stringify({ version: 2, values: v, stances: s })); return ``; }
    catch { return `This browser could not save your choices. They remain available for this visit.`; }
  };
  const setLevel = (id, level) => setSt((o) => {
    const count = Object.values(o.v).filter(Boolean).length;
    if (level && !o.v[id] && count >= 5) return { ...o, msg: `Choose up to five priorities. Change or skip one before adding another.` };
    const v = { ...o.v, [id]: level };
    const label = wm.find((w) => w.id === id)?.label ?? `Priority`;
    return { ...o, v, msg: persist(v, o.s, o.rem) || (level ? `${label}: ${Tm.find((t) => t.id === level)?.label}.` : `${label} skipped.`) };
  });
  const setStance = (id, val) => setSt((o) => { const s = { ...o.s, [id]: val }; return { ...o, s, msg: persist(o.v, s, o.rem) }; });
  const setRemember = (on) => setSt((o) => {
    try {
      if (on) { localStorage.setItem(Sm, JSON.stringify({ version: 2, values: o.v, stances: o.s })); return { ...o, rem: !0, msg: `Your choices will stay on this device.` }; }
      localStorage.removeItem(Sm); return { ...o, rem: !1, msg: `Remembering is off. Your choices remain only for this visit.` };
    } catch { return { ...o, rem: !1, msg: `Browser storage is unavailable. Your choices remain for this visit.` }; }
  });
  const clear = () => setSt(() => { try { localStorage.removeItem(Sm); localStorage.removeItem(Cm); } catch {} return { v: { ...Om }, s: { ...km }, rem: !1, msg: `Your priorities and policy choices have been cleared.` }; });
  const chosen = wm.map((w) => w.id).filter((id) => st.v[id]);
  return { ...st, chosen, setLevel, setStance, setRemember, clear };
}

/* ---------- links: the same room, record and panel addresses as the desktop app ---------- */
/* v5.16: when a link points at something that does not exist, say so once instead of silently showing Today */
const CXM_NOTICE = { v: null };
function cxmFromUrl() {
  const out = { tab: `today`, room: null, sheet: null, mode: null };
  let q;
  try { q = new URLSearchParams(globalThis.location?.search || ``); } catch { return out; }
  const panel = q.get(`panel`), r = Uh.find((x) => x.id === q.get(`room`)), node = q.get(`node`);
  const P = { ballot: [`ballot`], learn: [`ballot`], constellation: [`people`, null, `const`], leaders: [`people`, null, `profiles`], place: [`place`], context: [`place`],
    ledger: [`today`, `ledger`], bench: [`today`, `bench`], news: [`today`, `news`], priorities: [`people`, `priorities`, `profiles`], settings: [`today`, `you`], profiles: [`people`, null, `profiles`], us: [`people`, null, `us`] };
  if (panel && P[panel]) { const [tab, sheet, mode] = P[panel]; return { ...out, tab, sheet: sheet ? { type: sheet } : null, mode: mode || null }; }
  if (r && r.id !== `overview`) {
    out.tab = `explore`; out.room = r.id;
    if (node && node !== r.nodes[0]?.id && r.nodes.some((n) => n.id === node)) out.sheet = { type: `record`, room: r.id, node };
  } else if (r && node && node !== r.nodes[0]?.id && r.nodes.some((n) => n.id === node)) {
    out.tab = `explore`; out.sheet = { type: `record`, room: r.id, node };
  }
  if ((panel || q.get(`room`) || node) && !r) CXM_NOTICE.v = `We could not find that page, so here is the start.`;
  else if (r && node && !r.nodes.some((n) => n.id === node)) CXM_NOTICE.v = `We could not find that record, so here is the room.`;
  return out;
}
function cxmToUrl(tab, room, top, peopleMode) {
  let url;
  try { url = new URL(globalThis.location.href); } catch { return; }
  url.search = ``;
  const p = url.searchParams;
  if (top && top.type === `record`) { p.set(`room`, top.room); p.set(`node`, top.node); }
  else if (top && [`ledger`, `bench`, `news`, `priorities`].includes(top.type)) p.set(`panel`, top.type);
  else if (tab === `explore` && room) p.set(`room`, room);
  else if (tab === `place`) p.set(`panel`, `place`);
  else if (tab === `people`) p.set(`panel`, peopleMode === `const` ? `constellation` : peopleMode === `us` ? `us` : `leaders`);
  else if (tab === `ballot`) p.set(`panel`, `ballot`);
  if (url.href !== globalThis.location.href) globalThis.history.replaceState(globalThis.history.state, ``, url.href);
}

/* ---------- app context ---------- */
const CXM = u.createContext(null);
function useCxm() {
  return u.useContext(CXM);
}
function cxmStore(key, fallback) {
  try { const v = localStorage.getItem(key); return v == null ? fallback : v; } catch { return fallback; }
}
function cxmPut(key, v) {
  try { localStorage.setItem(key, v); } catch {}
}

function CxmApp({ deskEasy, onLeaveEasy }) {
  const practice = lh();
  const prio = useCxmPrio();
  const start = u.useMemo(cxmFromUrl, []);
  const [tab, setTab] = u.useState(start.tab);
  const [home, setHomeState] = u.useState(() => {
    const w = /^ward-(\d+)$/.exec(CX_PLACE.v || ``);
    return w ? { hood: ``, ward: Number(w[1]) } : CX_PLACE.v === `county` || CX_PLACE.v === `unsure` ? { hood: ``, ward: null, place: CX_PLACE.v } : null;
  });
  const [sheets, setSheets] = u.useState(start.sheet ? [start.sheet] : []);
  const [overlay, setOverlay] = u.useState(null);
  const [toast, setToast] = u.useState(null);
  const [liked, setLiked] = u.useState([]);
  const [guide, setGuideState] = u.useState(() => cxmStore(`cx-guide`, `erie`));
  const [large, setLarge] = u.useState(!1);
  // v5.16 Easy mode: remembered on this device only. First visit: Easy, unless the link points somewhere specific.
  const [storyBack, setStoryBack] = u.useState(null);  // the story you were in when you chose Go deeper
  const [easy, setEasyState] = u.useState(() => {
    if (deskEasy) return !0;
    const saved = cxmStore(`cx-easy`, ``);
    if (saved === `on`) return !0;
    if (saved === `off`) return !1;
    return !(start.tab !== `today` || start.sheet || start.room || CXM_NOTICE.v);
  });
  const setEasy = (v) => { setEasyState(v); cxmPut(`cx-easy`, v ? `on` : `off`); };
  const [theme, setThemeState] = u.useState(() => document.documentElement.getAttribute(`data-cx-theme`) || `bento`);
  const [room, setRoom] = u.useState(start.room);
  const [placeHood, setPlaceHood] = u.useState(null);
  const [people, setPeople] = u.useState({ mode: start.mode || `profiles`, seat: null, office: `council`, q: 0 });
  const [seen, setSeen] = u.useState({});
  const mainRef = u.useRef(null);

  const setHome = (h) => {
    setHomeState(h);
    CX_PLACE.v = h && h.ward ? `ward-${h.ward}` : (h && h.place) || ``;
    if (h && h.hood) setPlaceHood(h.hood);
  };
  const setGuide = (g) => { setGuideState(g); cxmPut(`cx-guide`, g); };
  const setTheme = (t) => { setThemeState(t); document.documentElement.setAttribute(`data-cx-theme`, t); cxmPut(`cx-theme`, t); };
  const openSheet = (type, data = {}, replace = !1) => setSheets((s) => (replace ? [...s.slice(0, -1), { type, ...data }] : [...s, { type, ...data }]));
  const closeSheet = () => setSheets([]);
  const backSheet = () => setSheets((s) => s.slice(0, -1));
  const go = (t) => { setSheets([]); setOverlay(null); setTab(t); setStoryBack(null); };
  const backToStory = () => { if (!storyBack) return; setSheets([]); setOverlay(storyBack); setStoryBack(null); };
  const openRoom = (roomId, nodeId) => {
    setSheets([]); setOverlay(null); setTab(`explore`); setRoom(roomId);
    if (nodeId) setTimeout(() => openSheet(`record`, { room: roomId, node: nodeId }), 30);
  };
  const openSeat = (seatId) => { setSheets([]); setOverlay(null); setTab(`people`); setPeople((p) => ({ ...p, mode: `profiles`, seat: seatId })); };
  const openOffice = (office) => { setSheets([]); setOverlay(null); setTab(`people`); setPeople((p) => ({ ...p, mode: `const`, office, q: 0 })); };
  const like = (id) => setLiked((l) => {
    if (l.includes(id)) return l.filter((x) => x !== id);
    if (!l.length) setToast({ kind: `first-ask` });
    return [...l, id];
  });
  const answer = (qid, v) => practice.update((s) => ({ ...s, answers: { ...s.answers, [qid]: v } }));
  u.useEffect(() => { if (mainRef.current) mainRef.current.scrollTop = 0; }, [tab, room]);
  const topSheet = sheets[sheets.length - 1];
  u.useEffect(() => { cxmToUrl(tab, room, topSheet, people.mode); }, [tab, room, topSheet, people.mode]);
  u.useEffect(() => {
    const onKey = (e) => { if (e.key === `Escape`) { if (sheets.length) backSheet(); else if (overlay) setOverlay(null); } };
    globalThis.addEventListener(`keydown`, onKey);
    return () => globalThis.removeEventListener(`keydown`, onKey);
  }, [sheets.length, overlay]);

  const ctx = {
    practice, prio, tab, go, home, setHome, sheets, openSheet, closeSheet, backSheet, overlay, setOverlay, toast, setToast,
    liked, like, guide, setGuide, large, setLarge, theme, setTheme, room, setRoom, openRoom, placeHood, setPlaceHood,
    people, setPeople, openSeat, openOffice, answer, seen, setSeen, mainRef, easy, setEasy, deskEasy, leaveEasy: onLeaveEasy, storyBack, setStoryBack,
  };
  const top = sheets[sheets.length - 1];
  const TABS = [
    [`today`, `Today`, CXI.Sparkles], [`explore`, `Explore`, CXI.Layers], [`place`, `My place`, CXI.Pin], [`people`, `People`, CXI.Users], [`ballot`, `Ballot`, CXI.Vote],
  ];
  return (
    <CXM.Provider value={ctx}>
      <div className={`cxm-stage`}>
        {easy ? <CxmEasy /> : <div className={`cxm ${large ? `cxm-large` : ``}`}>
          <a className="cxm-skip" href="#cxm-main" onClick={(e) => { e.preventDefault(); if (mainRef.current) mainRef.current.focus(); }}>Skip to content</a>
          <header className="cxm-top">
            <button type="button" className="cxm-brand" onClick={() => go(`today`)}><b>Civic Graph</b> <span>· Cleveland</span></button>
            <div className="cxm-top-actions">
              <button type="button" aria-label="Search" onClick={() => openSheet(`search`)}><CXI.Search size={20} /></button>
              <button type="button" aria-label="Dictionary" className="cxm-aa" onClick={() => openSheet(`dict`)}>Aa</button>
              <button type="button" aria-label="Settings" className="cxm-you" onClick={() => openSheet(`you`)}><CXI.Sliders size={18} /></button>
            </div>
          </header>
          <CxmFresh />
          <main className="cxm-main" id="cxm-main" tabIndex={-1} ref={mainRef}>
            <CxBoundary phone label={TABS.find((t) => t[0] === tab)?.[1]} resetKey={`${tab}|${room}`} onHome={() => { setRoom(null); go(`today`); }}>
              {tab === `today` && <CxmToday />}
              {tab === `explore` && <CxmExplore />}
              {tab === `place` && <CxmPlace />}
              {tab === `people` && <CxmPeople />}
              {tab === `ballot` && <CxmBallot />}
            </CxBoundary>
            <p className="cxm-foot">Public sources. Visible gaps. No scores. Council records pulled {cxFresh().when} (Eastern), checked every night.</p>
          </main>
          <nav className="cxm-tabs" aria-label="Sections">
            {TABS.map(([id, label, Icon]) => (
              <button key={id} type="button" className={tab === id ? `on` : ``} aria-current={tab === id ? `page` : undefined} onClick={() => go(id)}>
                <Icon size={22} /><span>{label}</span>
              </button>
            ))}
          </nav>
          {tab === `explore` && !room && <CxmRail />}
          <CxBoundary phone label="This screen" resetKey={overlay ? `${overlay.type}|${overlay.i ?? ``}|${overlay.f ?? ``}` : `none`} onHome={() => setOverlay(null)}>
            {overlay && overlay.type === `story` && <CxmStory />}
            {overlay && overlay.type === `moment` && <CxmMoment />}
            {overlay && overlay.type === `keypad` && <CxmKeypad />}
            {overlay && overlay.type === `crush` && <CxmCrush />}
          </CxBoundary>
          {top && <CxmSheet sheet={top} depth={sheets.length} />}
          {storyBack && !overlay && <button type="button" className="cxm-storyback" onClick={backToStory}><CXI.Back size={16} /> Back to the story</button>}
          {toast && <CxmToast />}
        </div>}
      </div>
    </CXM.Provider>
  );
}

/* ---------- bottom sheet ---------- */
const CXM_SHEETS = {
  record: (s) => <CxmRecord roomId={s.room} nodeId={s.node} />,
  leg: (s) => <CxmLeg file={s.file} fund={s.fund} />,
  term: (s) => <CxmDict focus={s.term} />,
  dict: () => <CxmDict />,
  search: () => <CxmSearch />,
  you: () => <CxmYou />,
  priorities: () => <CxmPriorities />,
  contest: (s) => <CxmContest id={s.id} />,
  issue: (s) => <CxmIssue id={s.id} />,
  local: () => <CxmLocalIssues />,
  seat: (s) => <CxmSeat seatId={s.seat} />,
  letter: (s) => <CxmLetter seatId={s.seat} />,
  ledger: () => <CxmLedger />,
  bench: () => <CxmBench />,
  check: (s) => <CxmCheck roomId={s.room} nodeId={s.node} />,
  home: () => <CxmHomePicker />,
  guides: (s) => <CxmPriorityGuide id={s.id} />,
  cand: (s) => <CxmCand id={s.id} />,
  decision: (s) => <CxmDecision id={s.id} />,
  review: () => <CxmReview />,
  news: () => <CxmNews />,
  profile: (s) => <div className="cxm-pad"><CX_SeatProfile seatId={s.seat} /></div>,
};
/* Pull a sheet down to close it, the way phones do. The sheet follows the finger, the dimmed screen behind it fades as it goes, and on
   release it either slides the rest of the way off or eases back, depending on how far and how fast it was pulled. A pull works from
   the handle bar, or from anywhere in the sheet when its content is scrolled to the top. It never takes over scrolling: pulling up,
   sideways, or inside a list that can still scroll does nothing special. With reduced motion on, it closes without the slide. */
function useCxmPull(sheetRef, scrimRef, onClose) {
  const closeRef = u.useRef(onClose);
  closeRef.current = onClose;
  u.useEffect(() => {
    const el = sheetRef.current;
    if (!el) return undefined;
    const scrim = scrimRef.current;
    const reduce = !!(globalThis.matchMedia && globalThis.matchMedia(`(prefers-reduced-motion: reduce)`).matches);
    const EASE = `cubic-bezier(.2,.8,.2,1)`;
    let on = !1, drag = !1, fromBar = !1, x0 = 0, y0 = 0, dy = 0, lastY = 0, lastT = 0, v = 0, timer = 0;
    const paint = (y) => {
      el.style.transform = `translateY(${y}px)`;
      if (scrim) scrim.style.opacity = String(Math.max(0, 1 - y / Math.max(1, el.offsetHeight)));
    };
    const scrolledInside = (t) => {
      for (let n = t; n && n !== el; n = n.parentElement) {
        if (n.scrollHeight > n.clientHeight + 1 && /(auto|scroll)/.test(getComputedStyle(n).overflowY) && n.scrollTop > 0) return !0;
        if (n.scrollWidth > n.clientWidth + 1 && /(auto|scroll)/.test(getComputedStyle(n).overflowX)) return !0;
      }
      return !1;
    };
    const begin = (x, y, target) => {
      if (timer) { clearTimeout(timer); timer = 0; }
      on = !0; drag = !1; x0 = x; y0 = lastY = y; lastT = performance.now(); v = 0; dy = 0;
      fromBar = !!(target.closest && target.closest(`.cxm-sheet-bar`)) && !(target.closest && target.closest(`button`));
    };
    const move = (x, y, e) => {
      if (!on) return;
      if (!drag) {
        const d = y - y0;
        if (d < 6 || Math.abs(x - x0) > d) return;                       // not a downward pull
        if (!fromBar && (el.scrollTop > 0 || scrolledInside(e.target))) { on = !1; return; }   // the content is still scrolling
        drag = !0; y0 = y;
        el.style.animation = `none`; el.style.transition = `none`; el.style.overflowY = `hidden`;
        if (scrim) { scrim.style.animation = `none`; scrim.style.transition = `none`; }
      }
      dy = Math.max(0, y - y0);
      const now = performance.now();
      v = (y - lastY) / Math.max(1, now - lastT); lastY = y; lastT = now;
      paint(dy);
      if (e.cancelable) e.preventDefault();
    };
    const finish = () => {
      if (!on) return;
      on = !1;
      if (!drag) return;
      drag = !1;
      const h = Math.max(1, el.offsetHeight);
      const away = dy > h * 0.28 || v > 0.5;
      if (away) {
        if (!reduce) { el.style.transition = `transform .3s ${EASE}`; if (scrim) scrim.style.transition = `opacity .3s ease`; }
        paint(h);
        timer = setTimeout(() => closeRef.current(), reduce ? 0 : 280);
      } else {
        el.style.transition = reduce ? `none` : `transform .34s ${EASE}`;
        if (scrim) scrim.style.transition = reduce ? `none` : `opacity .34s ease`;
        paint(0);
        timer = setTimeout(() => { el.style.transition = ``; el.style.transform = ``; el.style.overflowY = ``; if (scrim) { scrim.style.transition = ``; scrim.style.opacity = ``; } }, reduce ? 0 : 360);
      }
    };
    const ts = (e) => { if (e.touches.length === 1) begin(e.touches[0].clientX, e.touches[0].clientY, e.target); else on = !1; };
    const tm = (e) => { if (e.touches.length === 1) move(e.touches[0].clientX, e.touches[0].clientY, e); };
    const md = (e) => { if (e.button === 0 && e.target.closest && e.target.closest(`.cxm-sheet-bar`)) begin(e.clientX, e.clientY, e.target); };
    const mm = (e) => { if (on) move(e.clientX, e.clientY, e); };
    el.addEventListener(`touchstart`, ts, { passive: !0 });
    el.addEventListener(`touchmove`, tm, { passive: !1 });
    el.addEventListener(`touchend`, finish);
    el.addEventListener(`touchcancel`, finish);
    el.addEventListener(`mousedown`, md);
    globalThis.addEventListener(`mousemove`, mm);
    globalThis.addEventListener(`mouseup`, finish);
    return () => {
      if (timer) clearTimeout(timer);
      el.removeEventListener(`touchstart`, ts); el.removeEventListener(`touchmove`, tm); el.removeEventListener(`touchend`, finish); el.removeEventListener(`touchcancel`, finish);
      el.removeEventListener(`mousedown`, md); globalThis.removeEventListener(`mousemove`, mm); globalThis.removeEventListener(`mouseup`, finish);
    };
  }, [sheetRef, scrimRef]);
}

function CxmSheet({ sheet, depth }) {
  const { closeSheet, backSheet } = useCxm();
  const closeRef = u.useRef(null);
  const bodyRef = u.useRef(null);
  const scrimRef = u.useRef(null);
  useCxmPull(bodyRef, scrimRef, closeSheet);
  u.useEffect(() => { closeRef.current?.focus({ preventScroll: !0 }); if (bodyRef.current) bodyRef.current.scrollTop = 0; }, [sheet]);
  const render = CXM_SHEETS[sheet.type];
  return (
    <div className="cxm-sheet-wrap">
      <button type="button" className="cxm-scrim" aria-label="Close panel" ref={scrimRef} onClick={closeSheet} />
      <section className="cxm-sheet" role="dialog" aria-modal="true" aria-label="Details" ref={bodyRef}>
        <div className="cxm-sheet-bar">
          {depth > 1 ? <button type="button" className="cxm-sheet-back" onClick={backSheet}><CXI.Back size={16} /> Back</button> : <span className="cxm-grab" aria-hidden="true" />}
          <button type="button" ref={closeRef} className="cxm-sheet-x" aria-label="Close" onClick={closeSheet}><CXI.X size={18} /></button>
        </div>
        <CxBoundary phone label="This panel" resetKey={sheet} onHome={closeSheet}>{render ? render(sheet) : null}</CxBoundary>
      </section>
    </div>
  );
}

/* ---------- tiny building blocks ---------- */
function CxmSeg({ items, value, onChange, label }) {
  return (
    <div className="cxm-seg" role="group" aria-label={label}>
      {items.map(([id, text]) => <button key={id} type="button" aria-pressed={value === id} className={value === id ? `on` : ``} onClick={() => onChange(id)}>{text}</button>)}
    </div>
  );
}
function CxmKicker({ children }) {
  return <span className="cxm-kicker">{children}</span>;
}
function CxmH1({ children }) {
  return <h1 className="cxm-h1">{children}<span className="cxm-dot">.</span></h1>;
}
function CxmSrc({ href, children }) {
  if (!href) return null;
  return <a className="cxm-src" href={href} target="_blank" rel="noreferrer">{children} <CXI.Ext size={12} /></a>;
}
function CxmStatusDot({ k }) {
  return <i className={`cxm-sdot cxm-s-${k}`} aria-hidden="true" />;
}
function CxmDrop({ title, children, open: startOpen = !1, sub }) {
  const [open, setOpen] = u.useState(startOpen);
  return (
    <div className={`cxm-drop ${open ? `open` : ``}`}>
      <button type="button" className="cxm-drop-head" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span><strong>{title}</strong>{sub && <small>{sub}</small>}</span>
        <CXI.Chevron size={18} className="cxm-chev" />
      </button>
      {open && <div className="cxm-drop-body">{children}</div>}
    </div>
  );
}
function CxmAnswers({ value, onPick }) {
  return (
    <div className="cxm-answers">
      {CXM_ANS.map(([v, l]) => <button key={v} type="button" aria-pressed={value === v} className={value === v ? `on` : ``} onClick={() => onPick(v)}>{l}</button>)}
    </div>
  );
}
function CxmPortrait({ seat, size = 56 }) {
  return <img className="cxm-portrait" src={cxmAsset(seat.portrait)} alt="" width={size} height={size} />;
}
function CxmEvidence({ state }) {
  return <span className={`cxm-ev cxm-ev-${state}`}><i aria-hidden="true" />{Kh[state] ?? state}</span>;
}

/* ---------- the guide character ---------- */
const CXM_GUIDES = { erie: `Erie`, terry: `Terry`, cuy: `Cuy` };
function CxmGuide({ kind, size = 56 }) {
  const k = CXM_GUIDES[kind] ? kind : `erie`;
  return (
    <svg className="cxm-guide-svg" width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={k === `erie` ? `Erie, a Lake Erie gull` : k === `terry` ? `Terry, a little Terminal Tower` : `Cuy, a drop of the Cuyahoga`}>
      <circle cx="32" cy="32" r="31" className="cxm-guide-bg" />
      {k === `erie` && (
        <>
          <path d="M22 54 l-3 5 M28 55 l-1 5" stroke="#ffd36b" strokeWidth="2.2" strokeLinecap="round" />
          <ellipse cx="29" cy="40" rx="17" ry="14" fill="#f4f3ef" />
          <path d="M13 40 q9 -11 21 -1 q-9 9 -21 1 z" fill="#c9ccd4" />
          <circle cx="38" cy="25" r="11" fill="#f4f3ef" />
          <path d="M28 31 q10 6 20 0 l0 4 q-10 6 -20 0 z" className="cxm-guide-acc" />
          <path d="M48 23 l10 3.5 l-10 3.5 z" fill="#ffd36b" />
          <circle cx="41.5" cy="22" r="2.3" fill="#17171a" />
          <circle cx="42.3" cy="21.2" r=".7" fill="#fff" />
          <circle cx="45" cy="28" r="2" fill="#ffb3a0" opacity=".7" />
        </>
      )}
      {k === `terry` && (
        <>
          <path d="M32 5 l3 10 h-6 z" fill="#ffd36b" />
          <rect x="27" y="14" width="10" height="11" rx="1.5" fill="#dfe7ff" />
          <rect x="23" y="24" width="18" height="17" rx="2" fill="#dfe7ff" />
          <rect x="18" y="40" width="28" height="18" rx="2" fill="#c9d6fb" />
          <circle cx="28.5" cy="31" r="1.9" fill="#0c1a45" />
          <circle cx="35.5" cy="31" r="1.9" fill="#0c1a45" />
          <path d="M28.5 35.5 q3.5 3 7 0" fill="none" stroke="#0c1a45" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M23 46 v8 M29 46 v8 M35 46 v8 M41 46 v8" className="cxm-guide-stroke" strokeWidth="2" strokeLinecap="round" />
        </>
      )}
      {k === `cuy` && (
        <>
          <path d="M32 9 C25 21 17 29 17 40 a15 15 0 0 0 30 0 C47 29 39 21 32 9 z" className="cxm-guide-acc" />
          <ellipse cx="25" cy="34" rx="3" ry="6" fill="#fff" opacity=".35" />
          <circle cx="27.5" cy="40" r="2.3" fill="#0c0c0e" />
          <circle cx="37" cy="40" r="2.3" fill="#0c0c0e" />
          <path d="M28 46 q4.5 4 9 0" fill="none" stroke="#0c0c0e" strokeWidth="1.8" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}
/* ---------- first question: where is home? ---------- */
/* one label for "my place" wherever it shows */
function cxmHomeLabel(h) {
  if (!h) return `Not set`;
  if (h.place === `county`) return `Elsewhere in Cuyahoga County`;
  if (h.place === `unsure`) return `Not sure yet`;
  return h.hood ? `${h.hood}${h.ward ? ` · Ward ${h.ward}` : ``}` : `Ward ${h.ward}, City of Cleveland`;
}
function CxmHomePicker() {
  const { setHome, closeSheet, home } = useCxm();
  const hoods = cxPlCity().hoods;
  const [q, setQ] = u.useState(``);
  const list = hoods.filter((h) => h.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div className="cxm-pad">
      <CxmKicker>Your place</CxmKicker>
      <h2 className="cxm-h2">Where do you call home?</h2>
      <p className="cxm-mut">Pick your neighborhood. It stays on this visit only and is never sent anywhere. Your exact address decides your ward; the Board of Elections lookup confirms it.</p>
      <label className="cxm-field"><span>Find a neighborhood</span><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Hough, Ohio City, Kamm's…" /></label>
      <div className="cxm-chips">
        {list.map((h) => {
          const w = cxmHoodWard(h);
          return (
            <button key={h} type="button" className={home?.hood === h ? `on` : ``} onClick={() => { setHome({ hood: h, ward: w ? w.ward : null, share: w ? w.share : 0 }); closeSheet(); }}>
              {h}{w ? <small> · Ward {w.ward}</small> : null}
            </button>
          );
        })}
      </div>
      <h3 className="cxm-h3">Or pick your ward</h3>
      <div className="cxm-chips">
        {_h.map(([n, name]) => <button key={n} type="button" className={!home?.hood && home?.ward === Number(n) ? `on` : ``} onClick={() => { setHome({ hood: ``, ward: Number(n), share: 0 }); closeSheet(); }}>Ward {n}<small> · {name}</small></button>)}
        <button type="button" className={home?.place === `county` ? `on` : ``} onClick={() => { setHome({ hood: ``, ward: null, place: `county` }); closeSheet(); }}>Elsewhere in Cuyahoga County</button>
        <button type="button" className={home?.place === `unsure` ? `on` : ``} onClick={() => { setHome({ hood: ``, ward: null, place: `unsure` }); closeSheet(); }}>I am not sure</button>
      </div>
      <p className="cxm-fine">Do not know your ward? Choose "I am not sure" and use the official lookup. Private to this visit: your choice stays in this page's memory and is not saved, shared, or added to links. Reloading clears it.</p>
      <div className="cxm-row-links">
        <CxmSrc href="https://boe.cuyahogacounty.gov/voters/Find-Voting-Information-by-Address">Find my ward by address</CxmSrc>
        {home && <button type="button" className="cxm-link" onClick={() => { setHome(null); closeSheet(); }}>Clear my place</button>}
      </div>
    </div>
  );
}

/* ---------- v5.16 screen states: empty results, blocked storage, and links that lead nowhere ---------- */
/* An empty result says what was looked for, why nothing came up, and gives one thing to do next. */
function CxmEmpty({ title, body, actions }) {
  return (
    <div className="cxm-empty" role="status">
      <strong>{title}</strong>
      <p>{body}</p>
      {actions && actions.length > 0 && <div className="cxm-row2">{actions.map(([label, fn]) => <button key={label} type="button" className="cxm-btn2" onClick={fn}>{label}</button>)}</div>}
    </div>
  );
}
/* Private browsing and some locked-down browsers refuse to save anything. Say so instead of silently forgetting. */
function cxStorageOk() {
  try { const k = `cx-probe`; localStorage.setItem(k, `1`); localStorage.removeItem(k); return !0; } catch { return !1; }
}
/* Desktop: a link to a room, record, or panel that does not exist gets a notice (the phone has its own, CXM_NOTICE). */
const CX_PANELS_KNOWN = [`ballot`, `learn`, `constellation`, `context`, `ledger`, `bench`, `leaders`, `place`, `news`, `stories`, `priorities`, `profiles`, `us`];
function cxLinkProblem() {
  let q;
  try { q = new URLSearchParams(globalThis.location?.search || ``); } catch { return null; }
  const panel = q.get(`panel`), room = q.get(`room`), node = q.get(`node`);
  if (!panel && !room && !node) return null;
  if (panel) return CX_PANELS_KNOWN.includes(panel) ? null : `We could not find that page, so here is the start.`;
  const r = Uh.find((x) => x.id === room);
  if (!r) return `We could not find that page, so here is the start.`;
  if (node && !r.nodes.some((n) => n.id === node)) return `We could not find that record, so here is the room.`;
  return null;
}
/* Desktop: private browsing and some locked-down browsers refuse to save anything. Say so once, in plain words. */
function CX_StorageNotice() {
  const [note, setNote] = u.useState(() => !cxStorageOk());
  if (!note) return null;
  return <div className="cx-notice cx-notice-2" role="status"><span>This browser is not saving settings, so your style and your Easy mode choice start over each time you open the page. Private browsing can cause this.</span><button type="button" onClick={() => setNote(!1)}>Got it</button></div>;
}
function CX_LinkNotice() {
  const [note, setNote] = u.useState(cxLinkProblem);
  if (!note) return null;
  return <div className="cx-notice" role="status"><span>{note}</span><button type="button" onClick={() => setNote(null)}>Got it</button></div>;
}
