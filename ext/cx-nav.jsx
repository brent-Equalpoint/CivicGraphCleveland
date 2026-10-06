/* The desktop strip above the graph (screens wider than 760 px): places, rooms, Jump to, and My pages.
   Row one: the places (folders, from your block to the nation) and My ballot. Row two: the chosen place's rooms as a segmented control,
   Jump to, and the My pages menu. The compiled app draws the room tabs (a Radix tablist, ?room=) and the personal page buttons (?panel=,
   kept for a narrow window); build.py mounts these parts inside the strip with the app's own state. */

/* Bring a tab or button inside its sideways-scrolling row into view, clear of the fade and the "more" button at each end
   (scroll-padding-inline in ext/cx.css, 112 px). Only the row moves sideways: the page never moves up or down. */
function cxNavReveal(el, smooth) {
  const row = el && el.closest(`.atlas-room-tabs, .atlas-sidebar-bottom, .cx-folders`);
  if (!row || row.scrollWidth <= row.clientWidth + 1) return;
  const pad = 112, r = el.getBoundingClientRect(), s = row.getBoundingClientRect();
  let d = 0;
  if (r.left < s.left + pad) d = r.left - s.left - pad;
  else if (r.right > s.right - pad) d = Math.min(r.right - s.right + pad, r.left - s.left - pad);
  if (Math.abs(d) < 1) return;
  const left = Math.max(0, Math.min(row.scrollWidth - row.clientWidth, row.scrollLeft + d));
  try { row.scrollTo({ left, behavior: smooth ? `smooth` : `instant` }); } catch (e) { row.scrollLeft = left; }
}

/* How the last action was made: a key or a pointer. A page opened from the keyboard appears at once (no rise), and the
   strip scrolls instantly for keys and smoothly for a pointer. Read once, when a page opens (CX_DeskStrip): a page's entrance is never
   switched on or off afterwards, because a CSS animation that is switched back on plays again and moves the page under the pointer. */
const CX_NAV_INPUT = { kbd: !1 };
function cxNavInputWatch() {
  if (cxNavInputWatch.on || typeof window === `undefined`) return;
  cxNavInputWatch.on = !0;
  window.addEventListener(`keydown`, (e) => { if (!e.metaKey && !e.ctrlKey && !e.altKey) CX_NAV_INPUT.kbd = !0; }, !0);
  window.addEventListener(`pointerdown`, () => { CX_NAV_INPUT.kbd = !1; }, !0);
}

/* A row that still has to scroll sideways (a narrow window, Spanish, larger text): it fades only at the side with more, a plain mouse wheel over it
   moves it sideways while it can still move that way (and then hands the wheel back to the page), and a button at each end says how many are hidden
   there, so a mouse alone can reach everything. build.py puts CX_RowMore right after the row inside a .cx-row wrapper. The keyboard needs none of this:
   the arrow keys and Tab bring each tab into view, so the buttons are not Tab stops. */
/* the button reads "Show 9 more rooms" ("Show" and the noun are for a screen reader; the screen shows "9 more"), so the name holds the words on it in English and in Spanish */
const CX_ROW_WORDS = {
  rooms: [`rooms to the left`, `rooms`],
  pages: [`pages to the left`, `pages`],
  places: [`places to the left`, `places`],
};
function cxRowItems(row) {
  return [...row.children].filter((e) => !e.hidden && e.getBoundingClientRect().width > 0);
}
function cxRowState(row) {
  const s = row.getBoundingClientRect(), max = row.scrollWidth - row.clientWidth;
  const start = max > 1 && row.scrollLeft > 1, end = max > 1 && row.scrollLeft < max - 1;
  let a = 0, b = 0;
  for (const e of cxRowItems(row)) { const r = e.getBoundingClientRect(); if (start && r.left < s.left - 1) a++; if (end && r.right > s.right + 1) b++; }
  return { start, end, a, b };
}
function cxRowWheel(row, e) {
  if (e.ctrlKey || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;   // a sideways wheel or trackpad already scrolls the row; a pinch zooms the page
  const max = row.scrollWidth - row.clientWidth;
  if (max <= 1 || !matchMedia(`(min-width: 761px)`).matches) return;
  const d = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? row.clientWidth : 1);
  if ((d > 0 && row.scrollLeft >= max - 1) || (d < 0 && row.scrollLeft <= 1)) return;   // at the end of the row the wheel scrolls the page again
  e.preventDefault();
  row.scrollLeft = Math.max(0, Math.min(max, row.scrollLeft + d));
}
function CX_RowMore({ unit }) {
  const ref = u.useRef(null);
  const [st, setSt] = u.useState({ a: 0, b: 0 });
  const rowOf = () => ref.current && ref.current.parentElement && ref.current.parentElement.firstElementChild;
  u.useEffect(() => {
    const row = rowOf();
    if (!row) return;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const s = cxRowState(row);
      row.toggleAttribute(`data-more-start`, s.start);
      row.toggleAttribute(`data-more-end`, s.end);
      setSt((o) => (o.a === s.a && o.b === s.b ? o : { a: s.a, b: s.b }));
    };
    const later = () => { if (!raf) raf = requestAnimationFrame(measure); };
    const ro = typeof ResizeObserver === `undefined` ? null : new ResizeObserver(later);
    const watch = () => { if (ro) { ro.observe(row); [...row.children].forEach((c) => ro.observe(c)); } };
    watch();
    const mo = new MutationObserver(() => { watch(); later(); });
    mo.observe(row, { childList: !0, subtree: !0, attributes: !0, attributeFilter: [`data-state`, `hidden`, `class`] });
    const wheel = (e) => cxRowWheel(row, e);
    row.addEventListener(`scroll`, later, { passive: !0 });
    row.addEventListener(`wheel`, wheel, { passive: !1 });
    window.addEventListener(`resize`, later);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(later);
    later();
    return () => { cancelAnimationFrame(raf); if (ro) ro.disconnect(); mo.disconnect(); row.removeEventListener(`scroll`, later); row.removeEventListener(`wheel`, wheel); window.removeEventListener(`resize`, later); };
  }, []);
  const go = (dir) => {
    const row = rowOf();
    if (!row) return;
    const calm = CX_NAV_INPUT.kbd || matchMedia(`(prefers-reduced-motion: reduce)`).matches;
    try { row.scrollBy({ left: dir * Math.max(120, row.clientWidth - 140), behavior: calm ? `instant` : `smooth` }); } catch (e) { row.scrollLeft += dir * Math.max(120, row.clientWidth - 140); }
  };
  const words = CX_ROW_WORDS[unit] || CX_ROW_WORDS.rooms;
  return (
    <span ref={ref} className="cx-rowmore-wrap">
      {st.a > 0 && (
        <button type="button" className="cx-rowmore cx-rowmore-start" tabIndex={-1} onClick={() => go(-1)}>
          <CXI.Chevron size={16} aria-hidden="true" className="cx-rowmore-back" /><span className="sr-only">Show </span><b>{st.a}</b> <span>more</span><span className="sr-only">{` ${words[0]}`}</span>
        </button>
      )}
      {st.b > 0 && (
        <button type="button" className="cx-rowmore cx-rowmore-end" tabIndex={-1} onClick={() => go(1)}>
          <span className="sr-only">Show </span><b>{st.b}</b> <span>more</span><span className="sr-only">{` ${words[1]}`}</span><CXI.Chevron size={16} aria-hidden="true" />
        </button>
      )}
    </span>
  );
}

/* ---------- My pages: one menu for the 15 personal pages and the privacy policy ----------
   Grouped the way a resident looks for them. Every entry opens its page through the same functions the old buttons called (CX_NAV.panel,
   CX_NAV.priorities), so every ?panel= link still opens the same page. My ballot keeps its own button beside the menu until Election Day. */
const CX_PAGE_GROUPS = [
  [`Ballot`, [[`ballot`, `My ballot`], [`learn`, `Voter education`], [`levies`, `Levies and taxes`], [`districts`, `Find my districts`]]],
  [`People`, [[`leaders`, `My leaders`], [`profiles`, `Profiles`], [`constellation`, `My constellation`], [`us`, `United States`]]],
  [`Where I live`, [[`place`, `Who decides here?`], [`context`, `My local context`]]],
  [`Today`, [[`stories`, `Stories`], [`news`, `What's new`]]],
  [`You`, [[`priorities`, `My priorities`], [`ledger`, `Decision ledger`], [`bench`, `How this is built`], [`privacy`, `Privacy policy`]]],
];
const CX_PAGE_NAME = Object.fromEntries(CX_PAGE_GROUPS.flatMap((g) => g[1]));
function cxNavOpenPage(id) {
  if (id === `priorities`) CX_NAV.priorities();
  else CX_NAV.panel(id);
}
/* My ballot keeps its own button until the election is over (CX_DATES, Eastern time) */
function cxNavBallotShortcut() {
  try { return cxElectionPhase() !== `after`; } catch (e) { return !0; }
}
/* only: `ballot` draws just the My ballot button (on the places row), `menu` just the My pages menu (on the rooms row) */
function CX_DeskPages({ panel, prio, only }) {
  const cur = prio ? `priorities` : panel || ``;
  const showBallot = cxNavBallotShortcut();
  const inMenu = !!cur && !!CX_PAGE_NAME[cur] && !(showBallot && cur === `ballot`);
  const [open, setOpen] = u.useState(!1);
  const [instant, setInstant] = u.useState(!1);
  const btn = u.useRef(null), box = u.useRef(null), wrap = u.useRef(null);
  u.useEffect(() => {
    if (!open) return;
    const away = (e) => { if (wrap.current && !wrap.current.contains(e.target)) setOpen(!1); };
    const esc = (e) => { if (e.key === `Escape`) { e.stopPropagation(); e.preventDefault(); setOpen(!1); if (btn.current) btn.current.focus(); } };
    document.addEventListener(`pointerdown`, away, !0);
    document.addEventListener(`keydown`, esc, !0);
    if (instant && box.current) { const f = box.current.querySelector(`[aria-current="page"]`) || box.current.querySelector(`button`); if (f) f.focus(); }
    return () => { document.removeEventListener(`pointerdown`, away, !0); document.removeEventListener(`keydown`, esc, !0); };
  }, [open]);
  const pick = (id) => { setOpen(!1); cxNavOpenPage(id); };
  const menuKey = (e) => {
    if (!box.current) return;
    const items = [...box.current.querySelectorAll(`button`)];
    const i = items.indexOf(document.activeElement);
    let n = -1;
    if (e.key === `ArrowDown`) n = Math.min(items.length - 1, i + 1);
    else if (e.key === `ArrowUp`) n = Math.max(0, i - 1);
    else if (e.key === `Home`) n = 0;
    else if (e.key === `End`) n = items.length - 1;
    if (n >= 0) { e.preventDefault(); items[n].focus(); }
  };
  const toggle = () => { setInstant(CX_NAV_INPUT.kbd); setOpen(!open); };
  if (only === `ballot` && !showBallot) return null;
  return (
    <div ref={wrap} className={`cx-pages${only ? ` cx-pages-part-${only}` : ``}`} onBlur={(e) => { if (open && wrap.current && !wrap.current.contains(e.relatedTarget)) setOpen(!1); }}>
      {showBallot && only !== `menu` && (
        <button type="button" className={`cx-strip-btn cx-ballot-btn${cur === `ballot` ? ` on` : ``}`} aria-current={cur === `ballot` ? `page` : undefined} onClick={() => cxNavOpenPage(`ballot`)}>
          <CXI.Check size={16} /><span>My ballot</span>
        </button>
      )}
      {only !== `ballot` && <button ref={btn} type="button" className={`cx-strip-btn cx-pages-btn${inMenu ? ` on` : ``}`} aria-expanded={open} aria-controls="cx-pages-menu" aria-current={inMenu ? `page` : undefined}
        onClick={toggle} onKeyDown={(e) => { if (e.key === `ArrowDown` && !open) { e.preventDefault(); setInstant(!0); setOpen(!0); } }}>
        {inMenu && <span className="sr-only">My pages:</span>}
        <span>{inMenu ? CX_PAGE_NAME[cur] : `My pages`}</span>
        <CXI.Chevron size={16} className="cx-pages-chev" />
      </button>}
      {open && only !== `ballot` && (
        <div ref={box} id="cx-pages-menu" className={`cx-pages-menu${instant ? ` cx-instant` : ``}`} onKeyDown={menuKey}>
          {CX_PAGE_GROUPS.map(([h, list], gi) => (
            <div key={h} className="cx-pages-group" role="group" aria-labelledby={`cx-pages-h${gi}`}>
              <p id={`cx-pages-h${gi}`} className="cx-pages-h">{h}</p>
              <ul>
                {list.map(([id, name]) => (
                  <li key={id}>
                    <button type="button" aria-current={cur === id ? `page` : undefined} onClick={() => pick(id)}>
                      <span>{name}</span>{cur === id && <CXI.Check size={16} />}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* The places, from your block to the nation: the phone's zoom levels (CXM_LEVELS in ext/cxm-explore.jsx), read from the same list so the two
   layouts cannot drift, with their names in sentence case ("YOUR BLOCK" is "Your block"). */
function cxNavLevels() {
  // each place's rooms keep the desktop's own room order (the order of the room tabs), so the first room of a place is the first one you see
  if (!cxNavLevels.v) cxNavLevels.v = cxmLevelRooms().map((l) => ({ ...l, name: l.label.charAt(0) + l.label.slice(1).toLowerCase(), rooms: [...l.rooms].sort((a, b) => Uh.indexOf(a) - Uh.indexOf(b)) }));
  return cxNavLevels.v;
}
function cxNavFolderOf(roomId) {
  const ls = cxNavLevels();
  return (ls.find((l) => l.rooms.some((r) => r.id === roomId)) || ls[ls.length - 1]).id;
}

/* ---------- Jump to: one box that finds a room, a page, or a record ----------
   Ctrl+K or Cmd+K anywhere opens it, and "/" where you are not typing (the United States map keeps "/" for its own search). It matches on the
   device: what you type is never put in a link, a request, or storage. With nothing typed it shows the last five places you went (their ids
   only, kept in this browser, with a Clear button) and the rooms by place. It opens and closes at once: it is used often, so it does not animate. */
const CX_JUMP_KEY = `cx-jump-recent`;
const CX_JUMP_ID = /^(room:[a-z0-9-]+|page:[a-z]+|rec:[a-z0-9-]+:[a-z0-9-]+)$/;
function cxJumpRecent() {
  try {
    const v = JSON.parse(localStorage.getItem(CX_JUMP_KEY) || `[]`);
    return Array.isArray(v) ? v.filter((x) => typeof x === `string` && CX_JUMP_ID.test(x)).slice(0, 5) : [];
  } catch (e) { return []; }
}
function cxJumpRemember(id) {
  if (!CX_JUMP_ID.test(id)) return;
  try { localStorage.setItem(CX_JUMP_KEY, JSON.stringify([id, ...cxJumpRecent().filter((x) => x !== id)].slice(0, 5))); } catch (e) { /* storage blocked: nothing is kept */ }
}
function cxJumpForget() {
  try { localStorage.removeItem(CX_JUMP_KEY); } catch (e) { /* nothing to forget */ }
}
/* words a resident might type that the room's own text does not use; matched, never shown */
const CX_JUMP_WORDS = {
  transport: `bus buses rta transit train rail road roads pothole potholes sidewalk bike traffic autobus transporte calle calles`,
  energy: `electricity electric power lights gas water bill utility utilities electricidad luz agua`,
  courts: `judge judges court courts jail sentence juez jueces tribunal corte`,
  education: `school schools teacher teachers student students cmsd escuela escuelas`,
  voting: `vote voting ballot election elections register voto votar boleta elecciones`,
  housing: `house home homes rent landlord eviction vivienda casa alquiler`,
  safety: `police fire ems 911 policia seguridad`,
  money: `tax taxes budget contract contracts spending impuesto presupuesto`,
  health: `health hospital clinic lead environment pollution salud`,
  council: `council councilmember ward wards concejo distrito`,
  administration: `mayor bibb city hall departments alcalde`,
};
function cxJumpFold(s) {
  return String(s || ``).toLowerCase().normalize(`NFD`).replace(/\p{M}/gu, ``);
}
function cxJumpEs(s) {
  try { return CX_I18N.lang === `es` ? cxI18nText(s) || `` : ``; } catch (e) { return ``; }
}
/* everything the box can open: 17 rooms, 15 pages, and the records in the rooms (each under the most specific room it is in) */
function cxJumpIndex() {
  const lang = (typeof CX_I18N !== `undefined` && CX_I18N.lang) || `en`;
  if (cxJumpIndex.v && cxJumpIndex.lang === lang) return cxJumpIndex.v;
  const levels = cxNavLevels();
  const folderOf = {};
  levels.forEach((l) => l.rooms.forEach((r) => { folderOf[r.id] = l; }));
  const rooms = Uh.map((r) => ({ id: `room:${r.id}`, kind: `room`, room: r.id, name: r.label, sub: r.question, folder: folderOf[r.id],
    name0: cxJumpFold(`${r.label} ${cxJumpEs(r.label)}`), hay: cxJumpFold([r.label, r.question, r.answer, r.region, ...(r.terms || []), CX_JUMP_WORDS[r.id] || ``, cxJumpEs(r.label), cxJumpEs(r.question)].join(` `)) }));
  const pages = CX_PAGE_GROUPS.flatMap(([g, list]) => list.map(([id, name]) => ({ id: `page:${id}`, kind: `page`, page: id, name, sub: g,
    name0: cxJumpFold(`${name} ${cxJumpEs(name)}`), hay: cxJumpFold(`${name} ${g} ${cxJumpEs(name)}`) })));
  const recs = [], seen = new Set();
  for (const r of [...Uh.filter((x) => x.id !== `overview`), ...Uh.filter((x) => x.id === `overview`)]) {
    for (const n of r.nodes) {
      if (seen.has(n.id) || n.id === `people` || !/^[a-z0-9-]+$/.test(n.id)) continue;
      seen.add(n.id);
      recs.push({ id: `rec:${r.id}:${n.id}`, kind: `rec`, room: r.id, node: n.id, name: n.name, sub: r.label,
        name0: cxJumpFold(n.name), hay: cxJumpFold(`${n.name} ${n.label || ``} ${n.region || ``}`) });
    }
  }
  cxJumpIndex.v = { rooms, pages, recs, all: new Map([...rooms, ...pages, ...recs].map((x) => [x.id, x])) };
  cxJumpIndex.lang = lang;
  return cxJumpIndex.v;
}
/* every word typed must appear; a name that starts with the words comes first */
function cxJumpFind(q) {
  const words = cxJumpFold(q).split(/[^a-z0-9]+/).filter(Boolean);
  if (!words.length) return null;
  const ix = cxJumpIndex();
  const score = (x) => {
    if (!words.every((w) => x.hay.includes(w))) return -1;
    if (x.name0.startsWith(words[0])) return 3;
    if (words.every((w) => x.name0.includes(w))) return 2;
    return 1;
  };
  const top = (list, n) => list.map((x) => [score(x), x]).filter((p) => p[0] >= 0).sort((a, b) => b[0] - a[0]).slice(0, n).map((p) => p[1]);
  return [[`Rooms`, top(ix.rooms, 6)], [`Pages`, top(ix.pages, 6)], [`Records`, top(ix.recs, 8)]].filter((g) => g[1].length);
}
function cxJumpGo(x, onRoom) {
  cxJumpRemember(x.id);
  if (x.kind === `room`) onRoom ? onRoom(x.room) : CX_NAV.go(x.room);
  else if (x.kind === `page`) cxNavOpenPage(x.page);
  else CX_NAV.go(x.room, x.node);
}
function cxJumpIsField(t) {
  if (!t || !t.tagName) return !1;
  if (t.isContentEditable) return !0;
  if (t.tagName === `TEXTAREA` || t.tagName === `SELECT`) return !0;
  return t.tagName === `INPUT` && !/^(button|checkbox|radio|range|color|file|submit|reset|image)$/i.test(t.type || ``);
}
const CX_JUMP_MAC = typeof navigator !== `undefined` && /Mac|iPhone|iPad/.test(navigator.platform || ``);
function CX_DeskJump({ panel, onRoom }) {
  const [open, setOpen] = u.useState(!1);
  const [q, setQ] = u.useState(``);
  const [act, setAct] = u.useState(0);
  const [recent, setRecent] = u.useState([]);
  const list = u.useRef(null), back = u.useRef(null);
  // Escape (or a choice) gives the focus back to where it was when the box opened: the Jump to button, or wherever Ctrl+K was pressed
  const show = () => { back.current = document.activeElement; setOpen(!0); };
  u.useEffect(() => {
    const onKey = (e) => {
      if (!matchMedia(`(min-width: 761px)`).matches) return;
      const other = [...document.querySelectorAll(`[role=dialog]`)].some((d) => !d.classList.contains(`cx-jump`));
      if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && String(e.key).toLowerCase() === `k`) {
        if (other) return;
        e.preventDefault(); if (document.querySelector(`.cx-jump`)) setOpen(!1); else show(); return;
      }
      if (e.key === `/` && !e.ctrlKey && !e.metaKey && !e.altKey && !other && !cxJumpIsField(e.target) && panel !== `us` && !document.querySelector(`.usm`)) {
        e.preventDefault(); show();
      }
    };
    window.addEventListener(`keydown`, onKey);
    return () => window.removeEventListener(`keydown`, onKey);
  }, [panel]);
  u.useEffect(() => { if (open) { setQ(``); setAct(0); setRecent(cxJumpRecent()); } }, [open]);
  const ix = open ? cxJumpIndex() : null;
  const groups = !open ? [] : q.trim() ? cxJumpFind(q) || [] : [
    ...(recent.length ? [[`Recent`, recent.map((id) => ix.all.get(id)).filter(Boolean)]] : []),
    ...cxNavLevels().map((l) => [l.name, l.rooms.map((r) => ix.all.get(`room:${r.id}`)).filter(Boolean)]),
  ].filter((g) => g[1].length);
  const flat = groups.flatMap((g) => g[1]);
  const pos = Math.min(act, Math.max(0, flat.length - 1));
  u.useEffect(() => {
    const el = list.current && list.current.querySelector(`[aria-selected="true"]`);
    if (el) el.scrollIntoView({ block: `nearest` });
  }, [pos, q, open]);
  // a record opens in the map's record panel, which takes the focus itself
  const go = (x) => { if (x.kind === `rec`) back.current = null; setOpen(!1); cxJumpGo(x, onRoom); };
  const key = (e) => {
    if (e.key === `ArrowDown` || e.key === `ArrowUp`) { e.preventDefault(); setAct(Math.max(0, Math.min(flat.length - 1, pos + (e.key === `ArrowDown` ? 1 : -1)))); }
    else if (e.key === `Enter` && flat[pos]) { e.preventDefault(); go(flat[pos]); }
  };
  let k = -1;
  return (
    <>
      <button type="button" className="cx-strip-btn cx-jump-btn" aria-haspopup="dialog" aria-keyshortcuts="Control+K Meta+K" onClick={show}>
        <CXI.Search size={16} /><span>Jump to</span><kbd aria-hidden="true">{CX_JUMP_MAC ? `⌘ K` : `Ctrl K`}</kbd>
      </button>
      <CXD.Root open={open} onOpenChange={setOpen}>
        <CXD.Content className="atlas-dialog cx-jump" showCloseButton={!1} aria-describedby={undefined} onCloseAutoFocus={(e) => { const b = back.current; if (b && b.isConnected && b !== document.body) { e.preventDefault(); b.focus({ preventScroll: !0 }); } }}>
          <CXD.Title className="sr-only">Jump to</CXD.Title>
          <div className="cx-jump-field">
            <CXI.Search size={18} />
            <input type="text" role="combobox" aria-expanded="true" aria-controls="cx-jump-list" aria-autocomplete="list" aria-label="Jump to a room, page, or record"
              aria-activedescendant={flat[pos] ? `cx-jump-o${pos}` : undefined} autoComplete="off" spellCheck={!1} placeholder="A room, a page, or a record"
              value={q} onChange={(e) => { setQ(e.target.value); setAct(0); }} onKeyDown={key} />
          </div>
          <div ref={list} id="cx-jump-list" className="cx-jump-list" role="listbox" aria-label="Places to go">
            {groups.map(([h, items], gi) => (
              <div key={h + gi} role="group" aria-labelledby={`cx-jump-g${gi}`} className="cx-jump-group">
                <div id={`cx-jump-g${gi}`} role="presentation" className="cx-jump-h">{h}</div>
                {items.map((x) => {
                  k++;
                  const i = k;
                  return (
                    <div key={x.id} id={`cx-jump-o${i}`} role="option" aria-selected={i === pos} className="cx-jump-opt" onMouseMove={() => i !== pos && setAct(i)} onClick={() => go(x)}>
                      <span>{x.name}</span>{x.sub && <small>{x.sub}</small>}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          {q.trim() && !flat.length && <p className="cx-jump-empty" role="status">{`No room or page matches "${q.trim()}". Try a word like bus, school, or vote.`}</p>}
          <div className="cx-jump-foot">
            <span aria-hidden="true"><kbd>↑</kbd> <kbd>↓</kbd> to move, <kbd>Enter</kbd> to open, <kbd>Esc</kbd> to close</span>
            {!q.trim() && recent.length > 0 && <button type="button" className="cx-jump-clear" onClick={() => { cxJumpForget(); setRecent([]); setAct(0); }}>Clear recent</button>}
          </div>
        </CXD.Content>
      </CXD.Root>
    </>
  );
}

/* ---------- Places: the rooms in folders, from your block to the nation ----------
   The folders are the places above (cxNavLevels). Choosing one happens on the press (like the room tabs) and opens the room last used in it
   this visit (kept in memory only, never saved), or its first room. The chosen place's rooms show below it as a segmented control: they are
   the compiled room tabs, and build.py only hides the other places' tabs (data-cx-off), so ?room= links and the room panels stay as they were. */
const CX_FOLDER_LAST = {};
function cxNavFolderRoom(l) {
  const last = CX_FOLDER_LAST[l.id];
  return last && l.rooms.some((r) => r.id === last) ? last : l.rooms[0].id;
}
/* Left and Right move along a row of tabs, Home and End go to its ends, and the row stops at its ends. The focus moves; nothing opens. */
function cxNavRove(e, sel) {
  const map = { ArrowLeft: -1, ArrowRight: 1, Home: -1e3, End: 1e3 };
  if (!(e.key in map) || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
  const items = [...e.currentTarget.querySelectorAll(sel)].filter((x) => x.getBoundingClientRect().width > 0);
  const i = items.indexOf(document.activeElement);
  if (i < 0) return;
  e.preventDefault();
  const n = items[Math.max(0, Math.min(items.length - 1, i + map[e.key]))];
  if (n && n !== document.activeElement) n.focus();
}
function CX_DeskFolders({ room, panel, prio, onRoom }) {
  const ls = cxNavLevels();
  const cur = cxNavFolderOf(room), page = !!(panel || prio);
  u.useEffect(() => { CX_FOLDER_LAST[cxNavFolderOf(room)] = room; }, [room]);
  const choose = (l) => {
    const to = cxNavFolderRoom(l);
    if (to === room && !page) return;
    onRoom(to);
  };
  return (
    <div className="cx-row cx-row-folders">
      <div role="tablist" aria-label="Places" className="cx-folders" onKeyDown={(e) => cxNavRove(e, `[role=tab]`)}>
        {ls.map((l) => {
          const on = l.id === cur;
          return (
            <button key={l.id} type="button" role="tab" className="cx-folder" aria-selected={on && !page} data-on={on ? `` : undefined} aria-controls="cx-rooms-row" tabIndex={on ? 0 : -1}
              onMouseDown={(e) => { if (e.button === 0 && !e.ctrlKey && !e.metaKey) choose(l); }}
              onClick={(e) => { if (e.detail === 0 && (l.id !== cur || page)) choose(l); }}
              onKeyDown={(e) => { if (e.key === `Enter` || e.key === ` `) { e.preventDefault(); choose(l); } }}>
              {l.name}
            </button>
          );
        })}
      </div>
      <CX_RowMore unit="places" />
    </div>
  );
}
/* A place with one room shows that room and the place's own line beside it */
function CX_FolderLine({ room }) {
  const l = cxNavLevels().find((x) => x.id === cxNavFolderOf(room));
  return l && l.rooms.length === 1 ? <p className="cx-folder-line">{l.line}</p> : null;
}
/* The thumb of the segmented control: it slides to the chosen room (transform and width, motion.spring), and is gone while a personal page is open.
   A pointer choice within the same place slides; a keyboard choice, a new place, the first drawing, and a change of size (fonts, Spanish) just put it there. */
function cxThumbAt(el, slide) {
  const list = el.parentElement, t = list && list.querySelector(`[role=tab][aria-selected="true"]`);
  if (!t) { el.style.opacity = `0`; el.dataset.at = ``; return; }
  el.classList.toggle(`cx-thumb-go`, !!slide && !!el.dataset.at);
  el.style.opacity = `1`;
  el.style.width = `${t.offsetWidth}px`;
  el.style.transform = `translateX(${t.offsetLeft}px)`;
  el.dataset.at = `${t.offsetLeft},${t.offsetWidth}`;
}
function CX_RoomThumb({ room, page }) {
  const ref = u.useRef(null), was = u.useRef(``);
  u.useLayoutEffect(() => {
    const f = cxNavFolderOf(room);
    if (ref.current) cxThumbAt(ref.current, !CX_NAV_INPUT.kbd && was.current === f);
    was.current = f;
  }, [room, page]);
  u.useEffect(() => {
    const el = ref.current, list = el && el.parentElement;
    if (!list || typeof ResizeObserver === `undefined`) return;
    const ro = new ResizeObserver(() => {
      const t = list.querySelector(`[role=tab][aria-selected="true"]`);
      if (t && el.dataset.at !== `${t.offsetLeft},${t.offsetWidth}`) cxThumbAt(el, !1);
    });
    ro.observe(list);
    list.querySelectorAll(`[role=tab]`).forEach((t) => ro.observe(t));
    return () => ro.disconnect();
  }, []);
  return <span ref={ref} className="cx-thumb" aria-hidden="true" />;
}

/* Mounted by build.py at the top of the strip with the app's state: the room, the open page (panel), and My priorities. */
function CX_DeskStrip({ room, panel, prio }) {
  const ref = u.useRef(null);
  u.useEffect(() => { cxNavInputWatch(); }, []);
  // a page opened from the keyboard is simply there: its entrance is turned off before the first paint (only on the page that just opened)
  u.useLayoutEffect(() => {
    if (!CX_NAV_INPUT.kbd || !(panel || prio)) return;
    document.querySelectorAll(`.auxiliary-page > section, .auxiliary-page > .civic-page, .cx-enter`).forEach((el) => { el.style.animation = `none`; });
  }, [panel, prio]);
  // the chosen room, and the open page, are always in view: on load, on a ?room= link, on every change, after the fonts arrive, and when the strip is resized
  u.useEffect(() => {
    const strip = ref.current && ref.current.parentElement;
    if (!strip) return;
    const show = () => {
      if (!matchMedia(`(min-width: 761px)`).matches) return;
      cxNavReveal(strip.querySelector(`.atlas-room-tab[data-state="active"]`) || strip.querySelector(`.atlas-room-tab[tabindex="0"]`));
      cxNavReveal(strip.querySelector(`.atlas-sidebar-bottom [aria-current="page"]`));
      cxNavReveal(strip.querySelector(`.cx-folder[data-on]`));
    };
    const raf = requestAnimationFrame(show);
    let gone = !1;
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (!gone) show(); });
    return () => { gone = !0; cancelAnimationFrame(raf); };
  }, [room, panel, prio]);
  u.useEffect(() => {
    const strip = ref.current && ref.current.parentElement;
    if (!strip || typeof ResizeObserver === `undefined`) return;
    let raf = 0, w = 0;
    const ro = new ResizeObserver(() => {
      if (strip.clientWidth === w) return;
      w = strip.clientWidth;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => cxNavReveal(strip.querySelector(`.atlas-room-tab[data-state="active"]`)));
    });
    ro.observe(strip);
    // a tab or page button that is cut off at the edge comes fully into view when it is clicked
    const onClick = (e) => {
      const b = e.target.closest && e.target.closest(`.atlas-room-tab, .atlas-sidebar-bottom button`);
      if (b) requestAnimationFrame(() => cxNavReveal(b, !CX_NAV_INPUT.kbd));
    };
    strip.addEventListener(`click`, onClick);
    return () => { ro.disconnect(); cancelAnimationFrame(raf); strip.removeEventListener(`click`, onClick); };
  }, []);
  return <span ref={ref} hidden />;
}
