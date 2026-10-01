/* v5.14 phone app: Explore. All rooms from the desktop atlas (Uh), ordered by distance from the
   resident's front door. Scrolling down zooms out. Each room keeps its desktop content: question,
   answer, guided view (Start, Meaning, Power, Proof), records with their four tabs, connections. */

const CXM_LEVELS = [
  [`block`, `YOUR BLOCK`, `Where decisions land first`, `This is your block. Housing, streets, and safety start here.`, [`housing`, `transport`, `safety`, `local-decisions`]],
  [`ward`, `YOUR WARD`, `One council member per ward`, `Your ward. One council member speaks for it.`, [`council`]],
  [`city`, `YOUR CITY`, `Mayor, budget, utilities, schools`, `The whole city now. The mayor's office and the budget live here.`, [`administration`, `money`, `energy`, `education`, `health`]],
  [`county`, `COUNTY AND COURTS`, `Judges and elections`, `Zooming out to the county. Your judges live up here.`, [`courts`, `voting`]],
  [`state`, `OHIO AND THE NATION`, `Columbus and Washington`, `Ohio and Washington. Big decisions, farther from your porch.`, [`state-federal`]],
  [`big`, `THE BIG PICTURE`, `How it all connects`, `The big picture. How every piece fits together.`, [`overview`, `municipalities`, `ecosystem`, `history`]],
];
function cxmLevelRooms() {
  const placed = new Set(CXM_LEVELS.flatMap((l) => l[4]));
  return CXM_LEVELS.map((l, i) => ({ id: l[0], label: l[1], sub: l[2], line: l[3], rooms: [...l[4].map((id) => Uh.find((r) => r.id === id)).filter(Boolean), ...(i === CXM_LEVELS.length - 1 ? Uh.filter((r) => !placed.has(r.id)) : [])] }));
}
function cxmFirstSentence(t) {
  const m = String(t).match(/^.*?[.!?](\s|$)/);
  return m ? m[0].trim() : String(t);
}
function cxmRoomPulse(r) {
  const off = r.nodes.filter((n) => n.evidence === `official`).length;
  const leg = r.nodes.filter((n) => n.kind === `legislation`).length;
  return `${cxmPl(r.nodes.length, `record`, `records`)} · ${off} official source${off === 1 ? `` : `s`}${leg ? ` · ${cxmPl(leg, `law or proposal`, `laws or proposals`)}` : ``}`;
}

/* shared scroll state for the guide rail */
const CXM_RAIL = { focus: null, level: 0, prog: 0, ticks: null, subs: new Set() };
function cxmRailSet(o) {
  Object.assign(CXM_RAIL, o);
  CXM_RAIL.subs.forEach((f) => f());
}
function useCxmRail() {
  const [, force] = u.useState(0);
  u.useEffect(() => { const f = () => force((n) => n + 1); CXM_RAIL.subs.add(f); return () => CXM_RAIL.subs.delete(f); }, []);
  return CXM_RAIL;
}

function CxmExplore() {
  const { room } = useCxm();
  return room ? <CxmRoom roomId={room} /> : <CxmRooms />;
}
function CxmRooms() {
  const { mainRef, setRoom, openSheet } = useCxm();
  const rail = useCxmRail();
  const levels = u.useMemo(() => cxmLevelRooms(), []);
  u.useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const rect = el.getBoundingClientRect(), mid = rect.top + rect.height * 0.45;
      let best = CXM_RAIL.focus, bd = 1e9;
      el.querySelectorAll(`[data-room]`).forEach((t) => { const r = t.getBoundingClientRect(), d = Math.abs((r.top + r.bottom) / 2 - mid); if (d < bd) { bd = d; best = t.getAttribute(`data-room`); } });
      const max = Math.max(1, el.scrollHeight - el.clientHeight);
      let lvl = 0; const ticks = [];
      el.querySelectorAll(`section[data-level]`).forEach((s, j) => { ticks.push(Math.min(1, s.offsetTop / max)); if (s.getBoundingClientRect().top <= rect.top + 56) lvl = j; });
      const o = { focus: best, prog: Math.min(1, el.scrollTop / max), ticks };
      if (lvl !== CXM_RAIL.level) { o.level = lvl; o.bubble = Date.now(); }
      cxmRailSet(o);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(measure); };
    el.addEventListener(`scroll`, onScroll, { passive: !0 });
    cxmRailSet({ level: 0, bubble: Date.now() });
    setTimeout(measure, 60);
    return () => { el.removeEventListener(`scroll`, onScroll); if (raf) cancelAnimationFrame(raf); };
  }, []);
  return (
    <div className="cxm-page cxm-rise cxm-rooms">
      <CxmH1>Explore</CxmH1>
      <p className="cxm-mut">Scroll down to zoom out, from your block all the way to Washington. {Uh.length} rooms, each answering one question.</p>
      <button type="button" className="cxm-searchbar" onClick={() => openSheet(`search`)}><CXI.Search size={18} /> Search records, people, laws, terms</button>
      <div className="cxm-doors" role="group" aria-label="Start with a topic">
        {CX_DOORWAYS.map(([, icon, title, sub, kind, target]) => {
          const Icon = CXI[icon];
          return <button key={title} type="button" className="cxm-door" onClick={() => (kind === `room` ? setRoom(target) : openSheet(target))}><Icon size={18} /><strong>{title}</strong><small>{sub}</small></button>;
        })}
      </div>
      {levels.map((lv, i) => (
        <section key={lv.id} data-level={i} className="cxm-level">
          <div className="cxm-level-h">
            <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">{[3.5, 6, 8.5, 11, 13.5, 16].map((r, j) => <circle key={r} cx="17" cy="17" r={r} className={j === i ? `on` : ``} />)}<circle cx="17" cy="17" r="2" className="core" /></svg>
            <span><span className={`cxm-kicker ${rail.level === i ? `cxm-kicker-on` : ``}`}>{lv.label}</span><small>{lv.sub}</small></span>
          </div>
          {lv.rooms.map((r) => {
            const f = rail.focus === r.id;
            return (
              <button key={r.id} type="button" data-room={r.id} className={`cxm-roomtile ${f ? `focus` : ``}`} onClick={() => setRoom(r.id)}>
                <span className="cxm-roomtile-q">{r.question}</span>
                <span className="cxm-roomtile-foot">
                  <span className="cxm-kicker">{r.label}</span>
                  {f ? <span key="h" className="cxm-fade cxm-roomtile-p hook">{cxmFirstSentence(r.answer)}</span> : <span key="p" className="cxm-roomtile-p">{cxmRoomPulse(r)}</span>}
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
function CxmRail() {
  const { mainRef, guide } = useCxm();
  const rail = useCxmRail();
  const [bubble, setBubble] = u.useState(!1);
  const drag = u.useRef(!1);
  u.useEffect(() => { if (!rail.bubble || (mainRef.current?.scrollTop || 0) < 60) return; setBubble(!0); const t = setTimeout(() => setBubble(!1), 2400); return () => clearTimeout(t); }, [rail.bubble]);
  const along = (p, extra = 0) => `calc((100% - 36px) * ${p.toFixed(3)} + ${extra}px)`;
  const ticks = rail.ticks || CXM_LEVELS.map((_, i) => i / CXM_LEVELS.length);
  const scrub = (e) => { const el = mainRef.current; if (!el) return; const r = e.currentTarget.getBoundingClientRect(); const ratio = Math.max(0, Math.min(1, (e.clientY - r.top - 18) / Math.max(1, r.height - 36))); el.scrollTop = ratio * (el.scrollHeight - el.clientHeight); };
  const jump = (i) => { const el = mainRef.current; const s = el?.querySelectorAll(`section[data-level]`)[i]; if (s) el.scrollTo({ top: s.offsetTop + 2, behavior: `smooth` }); };
  return (
    <div className="cxm-rail" onPointerDown={(e) => { if (e.target.closest(`[data-tick]`)) return; drag.current = !0; try { e.currentTarget.setPointerCapture(e.pointerId); } catch {} scrub(e); }}
      onPointerMove={(e) => drag.current && scrub(e)} onPointerUp={() => (drag.current = !1)} onPointerCancel={() => (drag.current = !1)}>
      <i className="cxm-rail-track" aria-hidden="true" />
      <i className="cxm-rail-fill" aria-hidden="true" style={{ height: along(rail.prog) }} />
      {ticks.map((t, i) => (
        <button key={i} type="button" data-tick="1" className={`cxm-tick ${rail.level === i ? `on` : ``}`} style={{ top: along(t, 18) }} aria-label={`Jump to ${CXM_LEVELS[i][1].toLowerCase()}`} onClick={() => jump(i)}><i /></button>
      ))}
      <span className="cxm-rail-guide" aria-hidden="true" style={{ top: along(rail.prog) }}><CxmGuide kind={guide} size={36} /></span>
      {bubble && <span className="cxm-rail-bubble cxm-pop" role="status" style={{ top: along(rail.prog) }}><b>{(CXM_GUIDES[guide] || `Erie`).toUpperCase()}</b>{CXM_LEVELS[rail.level][3]}</span>}
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
  const out = node ? room.edges.filter((e) => e.source === node.id && pos[e.target]) : [];
  const inc = node ? room.edges.filter((e) => e.target === node.id && pos[e.source]) : [];
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
            <g key={n.id} role="button" tabIndex={0} aria-pressed={isSel} aria-label={`${n.name}. ${isSel ? `Selected. Tap again to open its record.` : `Tap to preview.`}`}
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
          {(out.length > 0 || inc.length > 0) && (
            <div className="cxm-mapcard-links">
              {out.slice(0, 4).map((e) => <button key={e.id} type="button" onClick={() => setSel(e.target)}><span>{e.relation}</span> <b>→ {name(e.target)}</b></button>)}
              {inc.slice(0, 3).map((e) => <button key={e.id} type="button" onClick={() => setSel(e.source)}><b>{name(e.source)}</b> <span>{e.relation}</span> <b>→ here</b></button>)}
              {out.length + inc.length > 7 && <small className="cxm-fine">+{out.length + inc.length - 7} more in the record</small>}
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
          <span className="cxm-kicker">{room.label.toUpperCase()}, IN WORDS</span>
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
        {step === 0 && <div className="cxm-fade"><h3>{room.question}</h3><p><CX_Definable text={room.answer} onTerm={term} limit={2} /></p>
          {room.prompts?.length > 0 && <div className="cxm-chips">{room.prompts.map((p) => <button key={p.label} type="button" onClick={() => open(p.node)}>{p.label}</button>)}</div>}</div>}
        {step === 1 && <div className="cxm-fade"><span className="cxm-kicker">IN PLAIN WORDS</span>{termEntries.map((t) => <div key={t.term} className="cxm-term"><button type="button" className="cxm-link" onClick={() => term(t.term)}>{t.term}</button><p>{t.meaning}</p></div>)}</div>}
        {step === 2 && <div className="cxm-fade"><span className="cxm-kicker">WHO CAN ACT</span><p className="cxm-mut">Suggested stops, not a chain of command.</p>{pathNodes.map((n, i) => <button key={n.id} type="button" className="cxm-row" onClick={() => open(n.id)}><span><strong>{i + 1}. {n.name}</strong><small>{n.region}</small></span><CXI.Arrow size={15} /></button>)}</div>}
        {step === 3 && <div className="cxm-fade"><span className="cxm-kicker">CHECK THE RECORD</span><div className="cxm-chips static">{Object.entries(counts).map(([k, c]) => <span key={k}><CxmEvidence state={k} /> {c}</span>)}</div><p>{room.gap}</p><CxmSrc href={room.actionUrl}>{room.action}</CxmSrc></div>}
      </div>
      {room.id === `history` && (
        <section className="cxm-section">
          <CxmKicker>SELECTED DATED RECORDS</CxmKicker>
          {Gh.map((g) => (
            <div key={g.date + g.title} className="cxm-tl">
              <span className="cxm-tl-d">{g.date}</span>
              <span><strong>{g.title}</strong><small>{g.detail}</small><span className="cxm-row-links">{g.node && room.nodes.some((n) => n.id === g.node) && <button type="button" className="cxm-link" onClick={() => open(g.node)}>Open record</button>}<CxmSrc href={g.url}>Source</CxmSrc></span></span>
            </div>
          ))}
        </section>
      )}
      <section className="cxm-section">
        <CxmKicker>RECORDS IN THIS ROOM · {room.nodes.length}</CxmKicker>
        {[...byLayer, ...(orphan.length ? [[{ id: `other`, label: `Other records` }, orphan]] : [])].map(([l, list]) => (
          <div key={l.id} className="cxm-rgroup">
            <div className="cxm-rgroup-h"><strong><i className="cxm-layer-dot" style={{ background: l.color || `#8f93a0` }} />{l.label}</strong><small>{list.length}</small></div>
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
  const { openSheet, openSeat } = useCxm();
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
          <h3 className="cxm-h3">Connected records <span>{edges.length}</span></h3>
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
          {node.activity?.length ? <><h3 className="cxm-h3">Recorded activity</h3>{node.activity.map((a) => <p key={a}>{a}</p>)}<p className="cxm-fine">Sponsorship does not establish a roll-call vote or a complete policy position.</p></> : null}
          {m && <CxmLegHistory m={m} />}
          {node.kind === `contract` && <><h3 className="cxm-h3">Contract record</h3><p>Supplier, price, MW/MWh, start date, expiration, approval vote, amendments, and exit terms: not yet verified.</p><p className="cxm-fine">Do not infer a contractual obligation from membership or proximity on the map.</p></>}
          {!node.activity?.length && !m && node.kind !== `contract` && <p className="cxm-mut">Individual vote records have not been loaded for this item. An institution's decision does not establish each member's vote.</p>}
        </div>
      )}
      {tab === `positions` && (
        <div className="cxm-fade">
          <p className="cxm-mut">No sourced position statements are attached here yet. Party, sponsorship, and map location do not establish a person's beliefs.</p>
          {seatId && <button type="button" className="cxm-btn2" onClick={() => openSeat(seatId)}>See what they sponsored in 2026</button>}
        </div>
      )}
      {tab === `sources` && (
        <div className="cxm-fade">
          <h3 className="cxm-h3">Evidence coverage</h3>
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
      <CxmKicker>{room.label.toUpperCase()} · {node.label}</CxmKicker>
      <h2 className="cxm-h2">Can you answer these three questions?</h2>
      <p className="cxm-mut">Mark each one when it makes sense to you. Nothing here is saved or sent anywhere. {n} of 3 answered.</p>
      {cards.map(([id, t, body]) => (
        <div key={id} className={`cxm-tile ${done[id] ? `cxm-done` : ``}`}>
          <strong>{t}</strong><p>{body}</p>
          <button type="button" className="cxm-btn2" aria-pressed={!!done[id]} onClick={() => setDone((d) => ({ ...d, [id]: !d[id] }))}>{done[id] ? `I can answer this` : `Mark as understood`}</button>
        </div>
      ))}
      {nearby.length > 0 && <><h3 className="cxm-h3">Still unsure? Look at a connected record</h3>{nearby.map(({ e, other }) => <button key={e.id} type="button" className="cxm-row" onClick={() => openSheet(`record`, { room: room.id, node: other.id })}><span><strong>{other.name}</strong><small>{e.relation} · {Kh[e.evidence] ?? ``}</small></span><CXI.Arrow size={15} /></button>)}</>}
      <CxmSrc href={node.url}>Open the official source</CxmSrc>
    </div>
  );
}
