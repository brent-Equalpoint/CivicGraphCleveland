/* v5.14 phone app: Explore, now the Rooms folder of the Records tab (ext/cx-records.jsx, CxmRecTab), unchanged inside. All rooms from the desktop
   atlas (Uh), ordered by distance from the resident's front door. Scrolling down zooms out. Each room keeps its desktop content: question,
   answer, guided view (Start, Meaning, Power, Proof), records with their four tabs, connections. */

// the levels, in sentence case (the desktop strip reads the same list in cx-nav.jsx)
const CXM_LEVELS = [
  [`block`, `Your block`, `Where decisions land first`, `This is your block. Housing, streets, and safety start here.`, [`housing`, `transport`, `safety`, `local-decisions`]],
  [`ward`, `Your ward`, `One council member per ward`, `Your ward. One council member speaks for it.`, [`council`]],
  [`city`, `Your city`, `Mayor, budget, utilities, schools`, `The whole city now. The mayor's office and the budget live here.`, [`administration`, `money`, `energy`, `education`, `health`]],
  [`county`, `County and courts`, `Judges and elections`, `Zooming out to the county. Your judges live up here.`, [`courts`, `voting`]],
  [`state`, `Ohio and the nation`, `Columbus and Washington`, `Ohio and Washington. Big decisions, farther from your porch.`, [`state-federal`]],
  [`big`, `The big picture`, `How it all connects`, `The big picture. How every piece fits together.`, [`overview`, `municipalities`, `ecosystem`, `history`]],
];
// what each tick on the rail is called: a whole sentence each, so a translation never joins "Jump to" to a name
const CXM_LEVEL_JUMP = [`Jump to your block`, `Jump to your ward`, `Jump to your city`, `Jump to the county and courts`, `Jump to Ohio and the nation`, `Jump to the big picture`];
function cxmLevelRooms() {
  const placed = new Set(CXM_LEVELS.flatMap((l) => l[4]));
  return CXM_LEVELS.map((l, i) => ({ id: l[0], label: l[1], sub: l[2], line: l[3], rooms: [...l[4].map((id) => Uh.find((r) => r.id === id)).filter(Boolean), ...(i === CXM_LEVELS.length - 1 ? Uh.filter((r) => !placed.has(r.id)) : [])] }));
}
function cxmFirstSentence(t) {
  const m = String(t).match(/^.*?[.!?](\s|$)/);
  return m ? m[0].trim() : String(t);
}
/* The line under a room card. Each wording is one whole line (singular and plural written out), so a translation never glues pieces together. */
function cxmRoomPulse(r) {
  const n = r.nodes.length, o = r.nodes.filter((x) => x.evidence === `official`).length, l = r.nodes.filter((x) => x.kind === `legislation`).length;
  const k = `${n === 1 ? 1 : `n`}${o === 1 ? 1 : `n`}${l > 1 ? `n` : l}`;
  if (k === `nn0`) return `${n} records · ${o} official sources`;
  if (k === `nn1`) return `${n} records · ${o} official sources · ${l} law or proposal`;
  if (k === `nnn`) return `${n} records · ${o} official sources · ${l} laws or proposals`;
  if (k === `n10`) return `${n} records · ${o} official source`;
  if (k === `n11`) return `${n} records · ${o} official source · ${l} law or proposal`;
  if (k === `n1n`) return `${n} records · ${o} official source · ${l} laws or proposals`;
  if (k === `1n0`) return `${n} record · ${o} official sources`;
  if (k === `1n1`) return `${n} record · ${o} official sources · ${l} law or proposal`;
  if (k === `110`) return `${n} record · ${o} official source`;
  return `${n} record · ${o} official source · ${l} law or proposal`;
}

/* Where you are on Explore, shared by the list and the rail. The level is the level of the card on the reading line (45% down the list),
   so the lit tick, the highlighted heading, the highlighted card, and the guide's bubble always name the same place. ticks[j] is the point
   of the scroll (0 to 1) where a card of level j first takes the reading line. The list and the rail draw again only when the card, the level,
   or the ticks change (subs); the guide and the fill move every frame by transform, outside React (moves). Nothing here is saved. */
const CXM_RAIL = { focus: null, level: 0, prog: 0, ticks: null, subs: new Set(), moves: new Set() };
function cxmRailKey() { return `${CXM_RAIL.focus}|${CXM_RAIL.level}|${(CXM_RAIL.ticks || []).join()}`; }
function cxmRailSet(o) {
  const was = cxmRailKey();
  Object.assign(CXM_RAIL, o);
  CXM_RAIL.moves.forEach((f) => f());
  if (cxmRailKey() !== was) CXM_RAIL.subs.forEach((f) => f());
}
// pick: what this component draws from the state; it draws again only when that changes
function useCxmRail(pick) {
  const [, force] = u.useState(0);
  u.useEffect(() => {
    let last = pick(CXM_RAIL);
    const f = () => { const v = pick(CXM_RAIL); if (v !== last) { last = v; force((n) => n + 1); } };
    CXM_RAIL.subs.add(f);
    f();
    return () => CXM_RAIL.subs.delete(f);
  }, []);
  return CXM_RAIL;
}
/* The rail is a scale of the six levels, evenly spaced so every tick is a full 44 px target. The guide follows the scroll with no easing:
   between two ticks it moves in step with the scroll between the points where those two levels take the reading line, so it passes a tick
   exactly when that level becomes the one you are reading. y is the place on the rail (0 top, 1 bottom); p the scroll (0 to 1). */
function cxmRailKnots(ticks) {
  const n = CXM_LEVELS.length, t = ticks && ticks.length === n ? ticks : CXM_LEVELS.map((_, j) => j / n);
  return { xs: [...t, 1], ys: [...t.map((_, j) => j / n), 1] };
}
function cxmRailY(p, ticks) {
  const { xs, ys } = cxmRailKnots(ticks);
  if (p <= xs[0]) return 0;
  for (let k = 1; k < xs.length; k++) if (p <= xs[k]) { const dx = xs[k] - xs[k - 1]; return dx > 1e-6 ? ys[k - 1] + ((ys[k] - ys[k - 1]) * (p - xs[k - 1])) / dx : ys[k]; }
  return 1;
}
function cxmRailP(y, ticks) {
  const { xs, ys } = cxmRailKnots(ticks);
  for (let k = 1; k < ys.length; k++) if (y <= ys[k]) return xs[k - 1] + ((xs[k] - xs[k - 1]) * (y - ys[k - 1])) / (ys[k] - ys[k - 1]);
  return 1;
}
/* Where the guide's bubble may sit, in the rail's own pixels: under the heading of the level it names, inside that level and inside the list
   (above the tab bar), touching no card's question, no level heading, and not the end of the list (6 px clear of each), and off the highlighted
   card's answer if it can be. null when there is no such place: the guide then says nothing, and the heading still names the level. */
function cxmBubbleSpot(main, rail, b, level) {
  const sec = main && rail && b ? main.querySelectorAll(`section[data-level]`)[level] : null;
  if (!sec) return null;
  const pad = 6, head = sec.querySelector(`.cxm-level-h`).getBoundingClientRect(), sr = sec.getBoundingClientRect(), mr = main.getBoundingClientRect(), rr = rail.getBoundingClientRect(), br = b.getBoundingClientRect();
  const x0 = br.left - pad, x1 = br.right + pad, H = br.height;
  const lines = (sel) => [...main.querySelectorAll(sel)].flatMap((e) => {
    const out = [], w = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) { if (!n.nodeValue.trim()) continue; const g = document.createRange(); g.selectNodeContents(n); for (const q of g.getClientRects()) if (q.width && q.height) out.push(q); }
    return out;
  }).filter((q) => q.right > x0 && q.left < x1);
  const hard = [...lines(`.cxm-roomtile-q, .cxm-end`), ...[...main.querySelectorAll(`.cxm-level-h`)].map((h) => h.getBoundingClientRect()).filter((q) => q.right > x0 && q.left < x1)];
  const soft = lines(`.cxm-roomtile.focus .cxm-roomtile-p.hook`);
  const clear = (list, y) => list.every((q) => q.bottom + pad <= y || q.top - pad >= y + H);
  const from = Math.max(head.bottom + pad, mr.top + 8), to = Math.min(sr.bottom, mr.bottom - 8) - H;
  let first = null;
  for (let y = from; y <= to; y += 2) {
    if (!clear(hard, y)) continue;
    if (clear(soft, y)) return Math.round(y - rr.top);
    if (first === null) first = y;
  }
  return first === null ? null : Math.round(first - rr.top);
}

function CxmExplore() {
  const { room } = useCxm();
  return room ? <CxmRoom roomId={room} /> : <CxmRooms />;
}
function CxmRooms() {
  const { mainRef, setRoom, openSheet, setRecFolder } = useCxm();
  const rail = useCxmRail((r) => `${r.focus}|${r.level}`);
  const levels = u.useMemo(() => cxmLevelRooms(), []);
  const pageRef = u.useRef(null);
  u.useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const top = el.getBoundingClientRect().top, line = el.clientHeight * 0.45, st = el.scrollTop, max = Math.max(1, el.scrollHeight - el.clientHeight);
      // every card's middle, in the list's own coordinates, with its level; the highlighted card is the one nearest the reading line
      const cards = [];
      el.querySelectorAll(`section[data-level]`).forEach((s, j) => s.querySelectorAll(`[data-room]`).forEach((t) => { const r = t.getBoundingClientRect(); cards.push([r.top - top + st + r.height / 2, j, t.getAttribute(`data-room`)]); }));
      let focus = null, level = 0, bd = 1e9;
      for (const [c, j, id] of cards) { const d = Math.abs(c - st - line); if (d < bd) { bd = d; focus = id; level = j; } }
      // a level takes the reading line when its first card becomes nearer to the line than the card before it
      const ticks = [];
      CXM_LEVELS.forEach((_, j) => {
        const k = cards.findIndex((x) => x[1] === j), at = k > 0 ? (cards[k - 1][0] + cards[k][0]) / 2 - line : 0;
        ticks.push(Math.round(Math.min(1, Math.max(j ? ticks[j - 1] : 0, at / max)) * 1e4) / 1e4);
      });
      cxmRailSet({ focus, level, prog: Math.min(1, st / max), ticks });
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(measure); };
    el.addEventListener(`scroll`, onScroll, { passive: !0 });
    // the cards change height when the fonts arrive, the language changes, or the window turns
    const ro = typeof ResizeObserver === `function` ? new ResizeObserver(onScroll) : null;
    if (ro) { ro.observe(el); if (pageRef.current) ro.observe(pageRef.current); }
    cxmRailSet({ focus: null, level: 0, prog: 0, ticks: null });
    const t0 = setTimeout(measure, 60);
    return () => { el.removeEventListener(`scroll`, onScroll); if (ro) ro.disconnect(); clearTimeout(t0); if (raf) cancelAnimationFrame(raf); };
  }, []);
  return (
    <div className="cxm-page cxm-rise cxm-rooms" ref={pageRef}>
      <CxmH1>Rooms</CxmH1>
      <p className="cxm-mut">Scroll down to zoom out, from your block all the way to Washington. {Uh.length} rooms, each answering one question.</p>
      <button type="button" className="cxm-searchbar" onClick={() => openSheet(`search`)}><CXI.Search size={18} /> Search records, people, laws, terms</button>
      <div className="cxm-doors" role="group" aria-label="Start with a topic">
        <button type="button" className="cxm-door" onClick={() => setRecFolder(`meetings`)}><CXI.Landmark size={18} /><strong>At City Hall</strong><small>Council meetings, agendas, and what was decided.</small></button>
        {CX_DOORWAYS.map(([, icon, title, sub, kind, target]) => {
          const Icon = CXI[icon];
          return <button key={title} type="button" className="cxm-door" onClick={() => (kind === `room` ? setRoom(target) : openSheet(target))}><Icon size={18} /><strong>{title}</strong><small>{sub}</small></button>;
        })}
      </div>
      <section className="cxm-section" aria-label="Check yourself">
        <button type="button" className="cxm-row" onClick={() => openSheet(`check`, { room: `overview`, node: (Uh.find((r) => r.id === `overview`)?.path || [])[0] })}><span><strong>Resident check</strong><small>Three questions every resident should be able to answer</small></span><CXI.Arrow size={15} /></button>
      </section>
      {levels.map((lv, i) => (
        <section key={lv.id} data-level={i} className="cxm-level">
          <div className="cxm-level-h">
            <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">{[3.5, 6, 8.5, 11, 13.5, 16].map((r, j) => <circle key={r} cx="17" cy="17" r={r} className={j === i ? `on` : ``} />)}<circle cx="17" cy="17" r="2" className="core" /></svg>
            <span><span className={`cxm-kicker ${rail.level === i ? `cxm-kicker-on` : ``}`}>{lv.label}</span><small>{lv.sub}</small></span>
          </div>
          {lv.rooms.map((r) => {
            const f = rail.focus === r.id;
            // the record count and the answer's first sentence share one place, so the card keeps its height when it is highlighted
            return (
              <button key={r.id} type="button" data-room={r.id} className={`cxm-roomtile ${f ? `focus` : ``}`} onClick={() => setRoom(r.id)}>
                <span className="cxm-roomtile-q">{r.question}</span>
                <span className="cxm-roomtile-foot">
                  <span className="cxm-kicker">{r.label}</span>
                  <span className="cxm-roomtile-pp">
                    <span className={`cxm-roomtile-p${f ? ` off` : ``}`} aria-hidden={f ? `true` : undefined}>{cxmRoomPulse(r)}</span>
                    <span className={`cxm-roomtile-p hook ${f ? `cxm-fade` : `off`}`} aria-hidden={f ? undefined : `true`}>{cxmFirstSentence(r.answer)}</span>
                  </span>
                </span>
              </button>
            );
          })}
        </section>
      ))}
      <div className="cxm-end"><strong>You've zoomed all the way out.</strong><span>Scroll up to come home.</span></div>
    </div>
  );
}
/* The guide on the rail. It speaks at rest, never while the list moves: 160 ms after the last scroll, if you moved down onto a level it has
   not named yet on this visit (kept in memory only) and you are past the top of the page, it names that level once, under that level's
   heading, for 2.4 s, and it goes as soon as the list moves 24 px. A screen reader hears the same words from one status line that is always
   there; the bubble itself is hidden from it. The rail runs from the top of the list to its bottom; a bare touch on it does nothing, and it
   scrubs only from the guide (drawn above the ticks, so a drag can start on it) or after a 10 px drag, from where the finger took hold. */
function CxmRail() {
  const { mainRef, guide } = useCxm();
  const [lang] = useCxLang();
  const rail = useCxmRail((r) => `${r.level}|${(r.ticks || []).join()}`);
  const box = u.useRef(null), cuy = u.useRef(null), fill = u.useRef(null), bub = u.useRef(null), drag = u.useRef(null);
  const T = u.useRef({ rest: 0, hide: 0, last: 0, shownAt: null, spoken: new Set() }).current;
  const [frame, setFrame] = u.useState(null);
  const [say, setSay] = u.useState(null);   // { level, phase: measure, in, or out, top }
  const [sr, setSr] = u.useState(null);   // the level the status line names, or null
  const n = CXM_LEVELS.length;
  const still = () => !!globalThis.matchMedia && globalThis.matchMedia(`(prefers-reduced-motion: reduce)`).matches;
  const tr = (s) => (lang === `es` ? cxUsmTr(s) : s);
  const langOf = (s) => (lang === `es` && tr(s) === s ? `en` : undefined);
  // the guide and the fill follow the scroll each frame
  const move = () => {
    const r = box.current; if (!r) return;
    const y = cxmRailY(CXM_RAIL.prog, CXM_RAIL.ticks), len = Math.max(0, r.clientHeight - 36);
    if (cuy.current) cuy.current.style.transform = `translateY(${(len * y).toFixed(1)}px)`;
    if (fill.current) fill.current.style.transform = `scaleY(${y.toFixed(4)})`;
  };
  u.useEffect(() => { CXM_RAIL.moves.add(move); return () => CXM_RAIL.moves.delete(move); }, []);
  u.useLayoutEffect(move, [frame, rail.ticks]);
  // from the top of the list to its bottom, so the rail covers neither the Updated strip nor the tab bar
  u.useLayoutEffect(() => {
    const el = mainRef.current; if (!el) return;
    const fit = () => { const host = el.offsetParent; if (!host) return; const top = el.offsetTop + 10, bottom = host.clientHeight - el.offsetTop - el.offsetHeight + 10; setFrame((f) => (f && f.top === top && f.bottom === bottom ? f : { top, bottom })); };
    fit();
    const ro = typeof ResizeObserver === `function` ? new ResizeObserver(fit) : null;
    if (ro) ro.observe(el);
    globalThis.addEventListener(`resize`, fit);
    return () => { if (ro) ro.disconnect(); globalThis.removeEventListener(`resize`, fit); };
  }, []);
  const hide = () => {
    clearTimeout(T.hide); T.shownAt = null; setSr(null);
    // the way it came, unless no animation will run (reduced motion): then at once, because no animationend will come
    setSay((s) => { if (!s) return s; if (s.phase !== `in`) return null; const a = bub.current ? getComputedStyle(bub.current).animationName : `none`; return still() || !a || a === `none` ? null : { ...s, phase: `out` }; });
  };
  u.useEffect(() => {
    const el = mainRef.current; if (!el) return;
    T.last = el.scrollTop;
    const rest = () => {
      const st = el.scrollTop, down = st > T.last + 1;
      T.last = st;
      const level = CXM_RAIL.level;
      if (down && st >= 60 && !T.spoken.has(level)) setSay({ level, phase: `measure`, top: 0 });
    };
    const onScroll = () => {
      if (T.shownAt !== null && Math.abs(el.scrollTop - T.shownAt) > 24) hide();
      clearTimeout(T.rest);
      T.rest = setTimeout(rest, 160);
    };
    el.addEventListener(`scroll`, onScroll, { passive: !0 });
    return () => { el.removeEventListener(`scroll`, onScroll); clearTimeout(T.rest); clearTimeout(T.hide); };
  }, []);
  // drawn once unseen, measured, then placed (or dropped when there is no clear place)
  u.useLayoutEffect(() => {
    if (!say || say.phase !== `measure`) return;
    const top = cxmBubbleSpot(mainRef.current, box.current, bub.current, say.level);
    if (top === null) { setSay(null); return; }
    T.spoken.add(say.level); T.shownAt = mainRef.current.scrollTop;
    setSay({ ...say, phase: `in`, top });
    setSr(say.level);
    clearTimeout(T.hide); T.hide = setTimeout(hide, 2400);
  }, [say]);
  const jump = (i) => {
    const el = mainRef.current, card = el && el.querySelectorAll(`section[data-level]`)[i]?.querySelector(`[data-room]`);
    if (!card) return;
    const r = card.getBoundingClientRect(), y = r.top - el.getBoundingClientRect().top + el.scrollTop + r.height / 2 - el.clientHeight * 0.45;
    el.scrollTo({ top: Math.max(0, Math.min(el.scrollHeight - el.clientHeight, y)), behavior: still() ? `auto` : `smooth` });
  };
  const cuyAt = () => { const r = box.current.getBoundingClientRect(); return r.top + 18 + Math.max(0, r.height - 36) * cxmRailY(CXM_RAIL.prog, CXM_RAIL.ticks); };
  const scrub = (y) => {
    const el = mainRef.current, r = box.current.getBoundingClientRect();
    const at = Math.max(0, Math.min(1, (y - drag.current.grab - r.top - 18) / Math.max(1, r.height - 36)));
    el.scrollTop = cxmRailP(at, CXM_RAIL.ticks) * (el.scrollHeight - el.clientHeight);
  };
  const onDown = (e) => {
    if (e.target.closest(`[data-tick]`)) return;
    const c = cuyAt();
    drag.current = { id: e.pointerId, y0: e.clientY, grab: e.clientY - c, on: !!e.target.closest(`.cxm-rail-guide`) || Math.abs(e.clientY - c) <= 18 };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
  };
  const onMove = (e) => {
    const d = drag.current; if (!d || d.id !== e.pointerId) return;
    if (!d.on) { if (Math.abs(e.clientY - d.y0) < 10) return; d.on = !0; d.grab = e.clientY - cuyAt(); }
    scrub(e.clientY);
  };
  const onUp = () => { drag.current = null; };
  const name = CXM_GUIDES[guide] || `Erie`, line = say ? CXM_LEVELS[say.level][3] : ``;
  return (
    <div className="cxm-rail" ref={box} style={frame ? { top: frame.top, bottom: frame.bottom } : undefined} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
      <i className="cxm-rail-track" aria-hidden="true" />
      <i className="cxm-rail-fill" ref={fill} aria-hidden="true" />
      {CXM_LEVELS.map((lv, i) => (
        <button key={lv[0]} type="button" data-tick={i} className={`cxm-tick${rail.level === i ? ` on` : ``}`} style={{ top: `calc(18px + (100% - 36px) * ${(i / n).toFixed(4)})` }} aria-label={CXM_LEVEL_JUMP[i]} aria-current={rail.level === i ? `location` : undefined} onClick={() => jump(i)}><i /></button>
      ))}
      <span className="cxm-rail-guide" ref={cuy} aria-hidden="true"><CxmGuide kind={guide} size={36} /></span>
      {say && (
        <span ref={bub} className={`cxm-rail-bubble${say.phase === `in` ? ` cxm-bubble-in` : say.phase === `out` ? ` cxm-bubble-out` : ``}`} aria-hidden="true" data-no-translate="" data-level={say.level} lang={langOf(line)}
          style={{ top: say.top, visibility: say.phase === `measure` ? `hidden` : undefined }} onAnimationEnd={(e) => { if (e.target === e.currentTarget) setSay((s) => (s && s.phase === `out` ? null : s)); }}>
          <CxmGuide kind={guide} size={20} /><b>{name}</b>{` `}{tr(line)}
        </span>
      )}
      <p className="cxm-sr" role="status" aria-live="polite" aria-atomic="true" data-no-translate="" lang={sr === null ? undefined : langOf(CXM_LEVELS[sr][3])}>{sr === null ? `` : tr(CXM_LEVELS[sr][3])}</p>
    </div>
  );
}

/* ---------- one room ---------- */
function cxmLayerLabel(room, id) {
  return room.layers.find((l) => l.id === id)?.label ?? id;
}
/* Tap a dot once to preview it: its lines light up and draw out as arrows toward what it points
   to, and a card shows who or what it is. Tap it again (or Open record) to open the full record. */
function CxmRoomMap({ room, onPick, proof }) {
  const nodes = room.nodes;
  const layers = room.layers.map((l) => l.id);
  const W = 340, H = 300, cx = 170, cy = 150;
  const rings = [0, 52, 94, 132];
  const [sel, setSel] = u.useState(null);
  u.useEffect(() => setSel(null), [room.id]);
  const pos = u.useMemo(() => {
    const byLevel = {};
    nodes.forEach((n) => { const lv = Math.max(0, Math.min(3, n.level ?? 2)); (byLevel[lv] = byLevel[lv] || []).push(n); });
    const out = {};
    Object.entries(byLevel).forEach(([lv, list]) => {
      list.sort((a, b) => layers.indexOf(a.layer) - layers.indexOf(b.layer) || a.label.localeCompare(b.label));
      list.forEach((n, i) => {
        const r = rings[lv] || 132;
        const a = (i / Math.max(1, list.length)) * Math.PI * 2 - Math.PI / 2 + Number(lv) * 0.35;
        out[n.id] = lv === `0` && list.length === 1 ? [cx, cy] : [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
      });
    });
    return out;
  }, [room.id]);
  const layerOf = (n) => room.layers.find((l) => l.id === n.layer);
  const color = (n) => layerOf(n)?.color || `#8f93a0`;
  const big = (n) => (n.level ?? 2) <= 1;
  const photo = (n) => pm[n.id] || null;
  const rad = (n) => (photo(n) ? (big(n) ? 12 : 10) : big(n) ? 9 : 6);
  const node = sel ? nodes.find((n) => n.id === sel) : null;
  const linked = u.useMemo(() => {
    if (!sel) return new Set();
    const s0 = new Set([sel]);
    room.edges.forEach((e) => { if (e.source === sel) s0.add(e.target); if (e.target === sel) s0.add(e.source); });
    return s0;
  }, [sel, room.id]);
  const tap = (id) => (sel === id ? onPick(id) : setSel(id));
  const ends = (e) => {
    const a = pos[e.source], b = pos[e.target], s0 = nodes.find((n) => n.id === e.source), t0 = nodes.find((n) => n.id === e.target);
    const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
    const ra = rad(s0) + 2, rb = rad(t0) + 4;
    return [a[0] + (dx / d) * ra, a[1] + (dy / d) * ra, b[0] - (dx / d) * rb, b[1] - (dy / d) * rb];
  };
  const lines = node ? cxNodeLines(room, node).filter((l) => pos[l.to]) : [];
  const name = (id) => nodes.find((n) => n.id === id)?.label ?? id;
  const mid = `cxm-arrow-${room.id}`;
  return (
    <div className={`cxm-map ${sel ? `has-sel` : ``}`}>
      <svg viewBox={`0 0 ${W} ${H}`} role="group" aria-label={`Map of ${room.label}: ${nodes.length} records. Tap a dot to preview it, tap again to open. Text view lists everything.`}>
        <defs>
          <marker id={mid} viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" className="cxm-arrowhead" /></marker>
        </defs>
        <rect x="0" y="0" width={W} height={H} fill="transparent" onClick={() => setSel(null)} />
        {rings.slice(1).map((r) => <circle key={r} cx={cx} cy={cy} r={r} className="cxm-map-ring" />)}
        {room.edges.map((e) => {
          if (!pos[e.source] || !pos[e.target]) return null;
          const on = sel && (e.source === sel || e.target === sel);
          const [x1, y1, x2, y2] = ends(e);
          const dashed = e.evidence === `missing` || e.evidence === `inferred`;
          return <line key={`${e.id}${on ? `-on` : ``}`} x1={x1} y1={y1} x2={x2} y2={y2} pathLength={dashed ? undefined : 100}
            className={`cxm-map-edge ${proof || on ? `ev-${e.evidence}` : ``} ${on ? `lit ${dashed ? `dashed` : `draw`}` : sel ? `dim` : ``}`} markerEnd={on ? `url(#${mid})` : undefined} />;
        })}
        {nodes.map((n) => {
          if (!pos[n.id]) return null;
          const [x, y] = pos[n.id], ph = photo(n), r = rad(n), isSel = sel === n.id;
          const showLabel = isSel || (sel ? linked.has(n.id) : nodes.length <= 18 || big(n));
          return (
            <g key={n.id} role="button" tabIndex={0} aria-pressed={isSel} aria-label={`${String(n.name).toLowerCase().includes(String(n.label).toLowerCase()) ? `` : `${n.label}, `}${n.name}. ${isSel ? `Selected. Tap again to open its record.` : `Tap to preview.`}`}
              className={`cxm-map-node ${isSel ? `sel` : ``} ${sel && !linked.has(n.id) ? `dim` : ``} ${sel && linked.has(n.id) && !isSel ? `near` : ``}`}
              onClick={() => tap(n.id)} onKeyDown={(ev) => { if (ev.key === `Enter` || ev.key === ` `) { ev.preventDefault(); tap(n.id); } }}>
              <circle cx={x} cy={y} r={r + 9} className="cxm-hit" />
              {isSel && <circle cx={x} cy={y} r={r + 5} className="cxm-sel-ring" stroke={color(n)} />}
              {ph ? (
                <>
                  <circle cx={x} cy={y} r={r + 1.5} fill={color(n)} className={proof && n.evidence !== `official` ? `cxm-map-dash` : ``} />
                  <CX_SvgFace id={`m-${room.id}-${n.id}`} name={n.name} r={r} cx={x} cy={y} src={ph.src} />
                </>
              ) : <circle cx={x} cy={y} r={r} fill={color(n)} className={proof && n.evidence !== `official` ? `cxm-map-dash` : ``} />}
              {showLabel && <text x={x} y={y + r + (big(n) ? 12 : 10)} className="cxm-map-label">{n.label.length > 16 ? `${n.label.slice(0, 15)}…` : n.label}</text>}
            </g>
          );
        })}
      </svg>
      {node ? (
        <div className="cxm-mapcard cxm-rise" aria-live="polite" key={node.id}>
          <div className="cxm-mapcard-h">
            {photo(node) ? <img src={photo(node).src} alt="" width="44" height="44" /> : <i style={{ background: color(node) }} />}
            <span><strong>{node.name}</strong><small>{layerOf(node)?.label || node.layer} · {node.kind}</small></span>
            <button type="button" aria-label="Close preview" onClick={() => setSel(null)}><CXI.X size={16} /></button>
          </div>
          <p className="cxm-mut">{node.region} · <CxmEvidence state={node.evidence} /></p>
          {lines.length > 0 && (
            <div className="cxm-mapcard-links">
              {lines.slice(0, 5).map((l) => <button key={l.id} type="button" onClick={() => setSel(l.to)}>{l.text}</button>)}
              {lines.length > 5 && <small className="cxm-fine">{lines.length - 5} more connections are in the record.</small>}
            </div>
          )}
          <button type="button" className="cxm-btn cxm-wide" onClick={() => onPick(node.id)}>Open record</button>
        </div>
      ) : <div className="cxm-legend">{room.layers.map((l) => <span key={l.id}><i style={{ background: l.color }} />{l.label}</span>)}</div>}
      <p className="cxm-fine">{proof ? `Solid line: sourced or recorded relationship · Dashed line: interpretation or missing record. ` : `Turn on "Show the proof" to see which lines are sourced. `}Arrows point from who acts to what they act on. Ring position groups topics; it does not imply control.</p>
    </div>
  );
}
function CxmWardMap({ ward, onWard }) {
  return (
    <div className="cxm-map">
      <svg viewBox={CX_GEO.viewBox} role="img" aria-label={`Cleveland's ${CX_GEO.wards2026.length} wards on the 2026 map${ward ? `, Ward ${ward} highlighted` : ``}`}>
        {CX_GEO.wards2026.map((w) => <path key={w.id} d={w.d} className={`cxm-ward ${w.id === ward ? `on` : ``}`} onClick={() => onWard(w.id)} />)}
        {CX_GEO.wards2026.map((w) => <text key={`t${w.id}`} x={w.cx} y={w.cy} className={`cxm-ward-t ${w.id === ward ? `on` : ``}`}>{w.id}</text>)}
      </svg>
      <p className="cxm-fine">{CX_GEO.wards2026.length} wards on the 2026 map (Ord. No. 1-2025). Tap a ward to open its council member.</p>
    </div>
  );
}
function CxmRoom({ roomId }) {
  const { setRoom, openSheet, home, openSeat } = useCxm();
  const room = Uh.find((r) => r.id === roomId);
  const [view, setView] = u.useState(`map`);
  const [proof, setProof] = u.useState(!1);
  const [step, setStep] = u.useState(0);
  if (!room) return null;
  const open = (id) => openSheet(`record`, { room: room.id, node: id });
  const term = (t) => openSheet(`term`, { term: t });
  const pathNodes = room.path.map((id) => room.nodes.find((n) => n.id === id)).filter(Boolean);
  const termEntries = room.terms.map((t) => cxFindTerm(t)).filter(Boolean);
  const counts = room.nodes.reduce((a, n) => ((a[n.evidence] = (a[n.evidence] ?? 0) + 1), a), {});
  const byLayer = room.layers.map((l) => [l, room.nodes.filter((n) => n.layer === l.id)]).filter(([, list]) => list.length);
  const orphan = room.nodes.filter((n) => !room.layers.some((l) => l.id === n.layer));
  const name = (id) => room.nodes.find((n) => n.id === id)?.label ?? id;
  return (
    <div className="cxm-page cxm-rise">
      <button type="button" className="cxm-back" onClick={() => setRoom(null)}><CXI.Back size={16} /> All rooms</button>
      <CxmKicker>{room.region}</CxmKicker>
      <CxmH1>{room.label}</CxmH1>
      <p className="cxm-lede"><strong>{room.question}</strong> <CX_Definable text={room.answer} onTerm={term} limit={3} /></p>
      <div className="cxm-controls">
        <CxmSeg label="View" items={[[`map`, `Map`], [`text`, `Text`]]} value={view} onChange={setView} />
        <button type="button" className={`cxm-switch ${proof ? `on` : ``}`} aria-pressed={proof} onClick={() => setProof(!proof)}><span>Show the proof</span><i><b /></i></button>
      </div>
      {view === `map` && <CxmRoomMap room={room} onPick={open} proof={proof} />}
      {view === `map` && room.id === `council` && <CxmWardMap ward={home?.ward} onWard={(w) => openSeat(`ward-${w}`)} />}
      {view === `text` && (
        <div className="cxm-tile">
          <span className="cxm-kicker">{room.label}, in words</span>
          <p className="cxm-fine">Every line on the map, written out. Solid lines on the map are sourced or recorded; dashed lines are interpretation or a missing record.</p>
          {room.edges.length ? room.edges.map((e) => (
            <div key={e.id} className="cxm-conn">
              <button type="button" onClick={() => open(e.target === `people` ? e.source : e.target)}><span><b>{name(e.source)}</b> {e.relation} <b>{name(e.target)}</b></span></button>
              {e.note && <small className="cxm-mut">{e.note}</small>}
              {e.url
                ? <CxmSrc href={e.url}><CxmEvidence state={e.evidence} /> · relationship source</CxmSrc>
                : <small><CxmEvidence state={e.evidence} /> · entity sources available; no dedicated relationship citation</small>}
            </div>
          )) : <p className="cxm-mut">No relationships are visible for this room.</p>}
        </div>
      )}
      <div className="cxm-tile cxm-guide-card">
        <CxmSeg label="Guided view" items={[[0, `Start`], [1, `Meaning`], [2, `Power`], [3, `Proof`]]} value={step} onChange={setStep} />
        {step === 0 && <div className="cxm-fade"><h3 aria-level="2">{room.question}</h3><p><CX_Definable text={room.answer} onTerm={term} limit={2} /></p>
          {room.prompts?.length > 0 && <div className="cxm-chips">{room.prompts.map((p) => <button key={p.label} type="button" onClick={() => open(p.node)}>{p.label}</button>)}</div>}</div>}
        {step === 1 && <div className="cxm-fade"><span className="cxm-kicker">In plain words</span>{termEntries.map((t) => <div key={t.term} className="cxm-term"><button type="button" className="cxm-link" onClick={() => term(t.term)}>{t.term}</button><p>{t.meaning}</p></div>)}</div>}
        {step === 2 && <div className="cxm-fade"><span className="cxm-kicker">Who can act</span><p className="cxm-mut">Suggested stops, not a chain of command.</p>{pathNodes.map((n, i) => <button key={n.id} type="button" className="cxm-row" onClick={() => open(n.id)}><span><strong>{i + 1}. {n.name}</strong><small>{n.region}</small></span><CXI.Arrow size={15} /></button>)}</div>}
        {step === 3 && <div className="cxm-fade"><span className="cxm-kicker">Check the record</span><div className="cxm-chips static">{Object.entries(counts).map(([k, c]) => <span key={k}><CxmEvidence state={k} /> {c}</span>)}</div><p>{room.gap}</p><CxmSrc href={room.actionUrl}>{room.action}</CxmSrc></div>}
      </div>
      {room.id === `history` && (
        <section className="cxm-section">
          <CxmKicker>Dated records</CxmKicker>
          {Gh.map((g) => (
            <div key={g.date + g.title} className="cxm-tl">
              <span className="cxm-tl-d">{g.date}</span>
              <span><strong>{g.title}</strong><small>{g.detail}</small><span className="cxm-row-links">{g.node && room.nodes.some((n) => n.id === g.node) && <button type="button" className="cxm-link" onClick={() => open(g.node)}>Open record</button>}<CxmSrc href={g.url}>Source</CxmSrc></span></span>
            </div>
          ))}
        </section>
      )}
      <section className="cxm-section">
        <CxmKicker>Records in this room · {room.nodes.length}</CxmKicker>
        {[...byLayer, ...(orphan.length ? [[{ id: `other`, label: `Other records` }, orphan]] : [])].map(([l, list]) => (
          <div key={l.id} className="cxm-rgroup">
            <div className="cxm-rgroup-h"><strong>{l.label}</strong><small>{list.length}</small></div>
            {list.map((n) => (
              <button key={n.id} type="button" className="cxm-row" onClick={() => open(n.id)}>
                <span><strong>{n.name}</strong><small>{n.kind} · {n.region}</small>{proof && <CxmEvidence state={n.evidence} />}</span><CXI.Arrow size={15} />
              </button>
            ))}
          </div>
        ))}
      </section>
      <button type="button" className="cxm-btn2 cxm-wide" onClick={() => openSheet(`check`, { room: room.id, node: pathNodes[0]?.id || room.nodes[0]?.id })}>Resident check: can I answer the three questions?</button>
    </div>
  );
}

/* ---------- a record (node) ---------- */
function CxmRecord({ roomId, nodeId }) {
  const { openSheet, openSeat, openProfile } = useCxm();
  const room = Uh.find((r) => r.id === roomId) || Uh.find((r) => r.nodes.some((n) => n.id === nodeId));
  const node = room?.nodes.find((n) => n.id === nodeId);
  const [tab, setTab] = u.useState(`overview`);
  if (!room || !node) return <div className="cxm-pad"><p className="cxm-mut">This record is not in the atlas.</p></div>;
  const edges = room.edges.filter((e) => e.source === node.id || e.target === node.id);
  const legFile = /^leg-(\d+-\d{4})$/.exec(node.id)?.[1];
  const m = legFile ? cxmMatter(legFile) : null;
  const seatId = /^ward-\d+$/.test(node.id) ? node.id : node.id === `mayor` ? `mayor` : null;
  const photo = pm[node.id];
  return (
    <div className="cxm-pad">
      <div className="cxm-rec-top"><CxmEvidence state={node.evidence} />{photo && <img className="cxm-portrait" src={photo.src} alt="" width="44" height="44" />}</div>
      <h2 className="cxm-h2">{node.name}</h2>
      <CxmSeg label="Record sections" items={[[`overview`, `Overview`], [`actions`, `Votes & actions`], [`positions`, `Positions`], [`sources`, `Sources`]]} value={tab} onChange={setTab} />
      {tab === `overview` && (
        <div className="cxm-fade">
          <p>{node.summary}</p>
          <dl className="cxm-dl"><div><dt>Where it applies</dt><dd>{node.region}</dd></div><div><dt>Role in the system</dt><dd>{cxmLayerLabel(room, node.layer)}</dd></div>{node.issues?.length > 0 && <div><dt>Issues</dt><dd>{node.issues.join(`, `)}</dd></div>}</dl>
          <CxmSrc href={node.url}>{node.source}</CxmSrc>
          <p className="cxm-fine">Source review recorded {node.checked}. Check the source for updates.</p>
          <h3 className="cxm-h3" aria-level="2">Connected records <span>{edges.length}</span></h3>
          {edges.length ? edges.map((e) => {
            const otherId = e.source === node.id ? e.target : e.source;
            const other = room.nodes.find((n) => n.id === otherId);
            if (!other) return null;
            return <button key={e.id} type="button" className="cxm-row" onClick={() => openSheet(`record`, { room: room.id, node: other.id })}><span><strong>{other.label}</strong><small>{room.nodes.find((n) => n.id === e.source)?.label} <b>{e.relation}</b> {room.nodes.find((n) => n.id === e.target)?.label}</small></span><CXI.Arrow size={15} /></button>;
          }) : <p className="cxm-mut">No relationship records loaded for this item. Its position on the map does not establish authority over other records.</p>}
        </div>
      )}
      {tab === `actions` && (
        <div className="cxm-fade">
          {node.activity?.length ? <><h3 className="cxm-h3" aria-level="2">Recorded activity</h3>{node.activity.map((a) => <p key={a}>{a}</p>)}<p className="cxm-fine">Sponsorship does not establish a roll-call vote or a complete policy position.</p></> : null}
          {m && <CxmLegHistory m={m} />}
          {node.kind === `contract` && <><h3 className="cxm-h3" aria-level="2">Contract record</h3><p>Supplier, price, MW/MWh, start date, expiration, approval vote, amendments, and exit terms: not yet verified.</p><p className="cxm-fine">Do not infer a contractual obligation from membership or proximity on the map.</p></>}
          {!node.activity?.length && !m && node.kind !== `contract` && <p className="cxm-mut">Individual vote records have not been loaded for this item. An institution's decision does not establish each member's vote.</p>}
        </div>
      )}
      {tab === `positions` && (
        <div className="cxm-fade">
          {m ? <CX_RecPositions m={m} onPerson={openProfile} head="h3" /> : <p className="cxm-mut">No sourced position statements are attached here yet. Party, sponsorship, and map location do not establish a person's beliefs.</p>}
          {seatId && <button type="button" className="cxm-btn2" onClick={() => openSeat(seatId)}>See what they sponsored in 2026</button>}
        </div>
      )}
      {tab === `sources` && (
        <div className="cxm-fade">
          <h3 className="cxm-h3" aria-level="2">Evidence coverage</h3>
          <p>{room.gap}</p>
          <CxmSrc href={node.url}>{node.source}</CxmSrc>
          {photo && <p className="cxm-fine">Portrait: {photo.credit}, retrieved {photo.retrievedAt}. <CxmSrc href={photo.sourceUrl}>Portrait source</CxmSrc></p>}
          {m && <CxmSrc href={m.url}>Council record, {m.file}</CxmSrc>}
        </div>
      )}
    </div>
  );
}

/* ---------- resident check ---------- */
function CxmCheck({ roomId, nodeId }) {
  const { openSheet } = useCxm();
  const room = Uh.find((r) => r.id === roomId);
  const node = room?.nodes.find((n) => n.id === nodeId) || room?.nodes[0];
  const [done, setDone] = u.useState({});
  if (!room || !node) return null;
  const layer = cxmLayerLabel(room, node.layer);
  const cards = [
    [`who`, `Who has authority here?`, <><strong>{node.name}</strong> sits in <strong>{layer}</strong>. {node.summary}</>],
    [`where`, `Where does it apply?`, <>It applies to <strong>{node.region}</strong>. {room.region !== node.region ? `Room scope: ${room.region}.` : ``}</>],
    [`next`, `What can I do next?`, <><strong>{room.action}.</strong> Then open the official record for {node.label} and check the date it was reviewed ({node.checked}).</>],
  ];
  const n = Object.values(done).filter(Boolean).length;
  const nearby = room.edges.filter((e) => e.source === node.id || e.target === node.id).slice(0, 5).map((e) => ({ e, other: room.nodes.find((x) => x.id === (e.source === node.id ? e.target : e.source)) })).filter((x) => x.other);
  return (
    <div className="cxm-pad">
      <CxmKicker>{room.label} · {node.label}</CxmKicker>
      <h2 className="cxm-h2">Can you answer these three questions?</h2>
      <p className="cxm-mut">Mark each one when it makes sense to you. Nothing here is saved or sent anywhere. {n} of 3 answered.</p>
      {cards.map(([id, t, body]) => (
        <div key={id} className={`cxm-tile ${done[id] ? `cxm-done` : ``}`}>
          <strong>{t}</strong><p>{body}</p>
          <button type="button" className="cxm-btn2" aria-pressed={!!done[id]} onClick={() => setDone((d) => ({ ...d, [id]: !d[id] }))}>{done[id] ? `I can answer this` : `Mark as understood`}</button>
        </div>
      ))}
      {nearby.length > 0 && <><h3 className="cxm-h3" aria-level="2">Still unsure? Look at a connected record</h3>{nearby.map(({ e, other }) => <button key={e.id} type="button" className="cxm-row" onClick={() => openSheet(`record`, { room: room.id, node: other.id })}><span><strong>{other.name}</strong><small>{e.relation} · {Kh[e.evidence] ?? ``}</small></span><CXI.Arrow size={15} /></button>)}</>}
      <CxmSrc href={node.url}>Open the official source</CxmSrc>
    </div>
  );
}
