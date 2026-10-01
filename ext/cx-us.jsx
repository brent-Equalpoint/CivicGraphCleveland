/* v5.16 United States graph (plan-us-graph.md, phases U2 and U3): who is in Congress, its committees, and the federal agencies.
   Four ways into one record, so nobody has to use the picture: Sky (a canvas of every node), Index (a searchable list),
   Linked (everything connected to the chosen node, in sentences), and Tree (the structure, as nested lists).
   Rules kept: receipts, not scores. No ranking, no ideology label, no match percentage. Party is shown as a sourced, dated
   field on the member's current term and never used to color or group. A connection is a recorded relationship, not control.
   The layout is fixed and computed here from the data (no physics), so it never depends on timing or on a person's device.
   Data: site/us/landscape-2026.json (scripts/fetch_us.py), fetched on the hosted site only. It is a PREVIEW: the terms of
   the sources have not yet been read by a person, and the page says so. */

const CX_US = { p: null, v: null, graph: null };
function cxUsLoad() {
  if (!CX_US.p) {
    const web = typeof fetch === `function` && /^https?:$/.test(String(globalThis.location?.protocol || ``));
    CX_US.p = (web ? fetch(`/us/landscape-2026.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null) : Promise.resolve(null)).then((d) => { CX_US.v = d; if (d) CX_US.graph = cxUsGraph(d); return d; });
  }
  return CX_US.p;
}
function cxOrd(n) { const s = [`th`, `st`, `nd`, `rd`], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
const CX_US_STATES = { AL: `Alabama`, AK: `Alaska`, AZ: `Arizona`, AR: `Arkansas`, CA: `California`, CO: `Colorado`, CT: `Connecticut`, DE: `Delaware`, FL: `Florida`, GA: `Georgia`, HI: `Hawaii`, ID: `Idaho`, IL: `Illinois`, IN: `Indiana`, IA: `Iowa`, KS: `Kansas`, KY: `Kentucky`, LA: `Louisiana`, ME: `Maine`, MD: `Maryland`, MA: `Massachusetts`, MI: `Michigan`, MN: `Minnesota`, MS: `Mississippi`, MO: `Missouri`, MT: `Montana`, NE: `Nebraska`, NV: `Nevada`, NH: `New Hampshire`, NJ: `New Jersey`, NM: `New Mexico`, NY: `New York`, NC: `North Carolina`, ND: `North Dakota`, OH: `Ohio`, OK: `Oklahoma`, OR: `Oregon`, PA: `Pennsylvania`, RI: `Rhode Island`, SC: `South Carolina`, SD: `South Dakota`, TN: `Tennessee`, TX: `Texas`, UT: `Utah`, VT: `Vermont`, VA: `Virginia`, WA: `Washington`, WV: `West Virginia`, WI: `Wisconsin`, WY: `Wyoming`, DC: `District of Columbia`, PR: `Puerto Rico`, GU: `Guam`, VI: `U.S. Virgin Islands`, AS: `American Samoa`, MP: `Northern Mariana Islands` };
const cxStateName = (c) => CX_US_STATES[c] || c;

/* Build nodes, edges, and a fixed layout. Pure: the same data always gives the same picture. */
function cxUsGraph(d) {
  const nodes = [], byId = new Map(), edges = [];
  const add = (n) => { n.i = nodes.length; nodes.push(n); byId.set(n.id, n); return n; };
  const seen = new Set();
  const edge = (a, b, rel) => { const k = `${byId.get(a).i}|${byId.get(b).i}`; if (seen.has(k)) return; seen.add(k); edges.push({ a: byId.get(a).i, b: byId.get(b).i, rel }); };
  const hubs = { senate: [-560, -40], house: [60, -430], exec: [560, 120] };
  add({ id: `h:senate`, kind: `hub`, label: `Senate`, name: `United States Senate`, x: hubs.senate[0], y: hubs.senate[1], r: 16, shape: `circle`, group: `senate` });
  add({ id: `h:house`, kind: `hub`, label: `House`, name: `United States House of Representatives`, x: hubs.house[0], y: hubs.house[1], r: 16, shape: `circle`, group: `house` });
  add({ id: `h:exec`, kind: `hub`, label: `Executive agencies`, name: `Federal executive agencies`, x: hubs.exec[0], y: hubs.exec[1], r: 16, shape: `circle`, group: `exec` });
  const GOLD = 2.399963;  // golden angle: a sunflower spiral, so members of a state sit together along an arm
  const spiral = (list, hub, c, mk) => list.forEach((m, k) => { const r = c * Math.sqrt(k + 2), a = k * GOLD; add(mk(m, hub[0] + r * Math.cos(a), hub[1] + r * Math.sin(a))); });
  const senators = d.members.filter((m) => m.chamber === `senate`), reps = d.members.filter((m) => m.chamber === `house`);
  const mk = (ch) => (m, x, y) => ({ id: `m:${m.id}`, kind: `member`, label: m.name, name: m.name, x, y, r: 3.6, shape: `circle`, group: ch, m });
  spiral(senators, hubs.senate, 13, mk(`senate`));
  spiral(reps, hubs.house, 12, mk(`house`));
  senators.forEach((m) => edge(`m:${m.id}`, `h:senate`, `member of`));
  reps.forEach((m) => edge(`m:${m.id}`, `h:house`, `member of`));
  // committees sit on a ring outside their chamber's cluster; joint committees sit between the three clusters
  const ring = (list, hub, rad, a0, span) => list.forEach((c, k) => { const a = a0 + (list.length > 1 ? (k / (list.length - 1)) * span : span / 2); add({ id: `c:${c.id}`, kind: `committee`, label: c.name.replace(/^(House|Senate|Joint) (Select |Permanent Select |Special )?Committee on (the )?/, ``), name: c.name, x: hub[0] + rad * Math.cos(a), y: hub[1] + rad * Math.sin(a), r: 7 + Math.min(5, c.members / 12), shape: `diamond`, group: c.chamber, c }); });
  const cs = (t) => d.committees.filter((c) => c.chamber === t);
  ring(cs(`senate`), hubs.senate, 190, Math.PI * 0.55, Math.PI * 0.9);
  ring(cs(`house`), hubs.house, 340, Math.PI * 0.12, Math.PI * 0.76);
  const joint = cs(`joint`); joint.forEach((c, k) => add({ id: `c:${c.id}`, kind: `committee`, label: c.name.replace(/^Joint (Select |Economic )?Committee (on )?(the )?/, ``), name: c.name, x: -200 + k * 120, y: 160 + (k % 2) * 40, r: 8, shape: `diamond`, group: `joint`, c }));
  d.committees.forEach((c) => edge(`c:${c.id}`, c.chamber === `joint` ? `h:senate` : `h:${c.chamber}`, `committee of`));
  d.members.forEach((m) => m.committees.forEach((cm) => { const cid = cm.id.length > 4 && !byId.has(`c:${cm.id}`) ? cm.id.slice(0, 4) : cm.id; if (byId.has(`c:${cid}`)) edge(`m:${m.id}`, `c:${cid}`, cm.role === `Member` ? `member` : cm.role.toLowerCase()); }));
  // agencies: the top level in a ring, each one's sub-agencies spiraling near it
  const tops = d.agencies.filter((a) => !a.parent_id), kids = (id) => d.agencies.filter((a) => a.parent_id === id);
  tops.forEach((a, k) => { const ang = (k / tops.length) * Math.PI * 2, rad = 120 + (k % 3) * 26; add({ id: `a:${a.id}`, kind: `agency`, label: a.short_name || a.name, name: a.name, x: hubs.exec[0] + rad * Math.cos(ang), y: hubs.exec[1] + rad * Math.sin(ang), r: 5.5, shape: `square`, group: `exec`, a }); edge(`a:${a.id}`, `h:exec`, `agency of`); });
  tops.forEach((p) => { const pn = byId.get(`a:${p.id}`), ks = kids(p.id); ks.forEach((a, k) => { const ang = Math.atan2(pn.y - hubs.exec[1], pn.x - hubs.exec[0]) + (k - ks.length / 2) * 0.16, rad = 175 + (k % 2) * 22; add({ id: `a:${a.id}`, kind: `agency`, label: a.short_name || a.name, name: a.name, x: hubs.exec[0] + rad * Math.cos(ang), y: hubs.exec[1] + rad * Math.sin(ang), r: 3.4, shape: `square`, group: `exec`, a }); edge(`a:${a.id}`, `a:${p.id}`, `part of`); }); });
  const adj = nodes.map(() => []);
  edges.forEach((e, k) => { adj[e.a].push(k); adj[e.b].push(k); });
  return { nodes, byId, edges, adj };
}

/* what a node says about itself, and its connections, as plain sentences with names */
function cxUsFacts(g, n) {
  const f = [], nm = (i) => g.nodes[i].name;
  if (n.kind === `member`) {
    const m = n.m, chamber = m.chamber === `senate` ? `senator` : (m.district === 0 || m.district === null ? `delegate` : `representative`);
    f.push(m.chamber === `senate` ? `${m.name} is a United States senator for ${cxStateName(m.state)}.` : (m.district ? `${m.name} represents ${cxStateName(m.state)}'s ${cxOrd(m.district)} district in the United States House.` : `${m.name} is the delegate to the United States House from ${cxStateName(m.state)}.`));
    f.push(`Current term: ${m.term_start} to ${m.term_end}. Party on this term: ${m.party}, as of ${m.party_as_of} (a sourced field, not a judgment).`);
    m.committees.forEach((c) => {
      const parent = g.byId.get(`c:${c.id}`) || g.byId.get(`c:${c.id.slice(0, 4)}`);
      if (!parent) return;
      const sub = c.id.length > 4 ? parent.c.subcommittees.find((s) => s.id === c.id) : null;
      const where = sub ? `the ${sub.name} subcommittee of the ${parent.name}` : `the ${parent.name}`;
      f.push(c.role === `Member` ? `${m.name} serves on ${where}.` : `${m.name} is ${/^(Chair|Vice|Ranking|Co)/i.test(c.role) ? `the ${c.role.toLowerCase()} of` : `${c.role} on`} ${where}.`);
    });
    if (!m.committees.length) f.push(`No committee seat is listed for ${m.name} in the committee membership record.`);
  } else if (n.kind === `committee`) {
    const c = n.c;
    f.push(`${c.name} is a ${c.chamber} committee with ${c.members} listed members.`);
    f.push(c.chair ? `${c.chair} is listed as its chair.` : `No chair is listed in the committee membership record.`);
    if (c.subcommittees.length) f.push(`Its subcommittees: ${c.subcommittees.map((s) => s.name).join(`, `)}.`);
  } else if (n.kind === `agency`) {
    const a = n.a, parent = a.parent_id ? g.nodes.find((x) => x.a && x.a.id === a.parent_id) : null;
    f.push(parent ? `${a.name} is part of ${parent.name}.` : `${a.name} is a top-level federal agency in the Federal Register's list.`);
    if (a.blurb) f.push(a.blurb);
    const subs = g.nodes.filter((x) => x.a && x.a.parent_id === a.id);
    if (subs.length) f.push(`Sub-agencies listed: ${subs.slice(0, 12).map((s) => s.name).join(`, `)}${subs.length > 12 ? `, and ${subs.length - 12} more` : ``}.`);
  } else {
    f.push(n.id === `h:exec` ? `These are federal agencies that have published in the Federal Register in the last two years. Some well-known bodies are listed under a parent.` : `${n.name}.`);
  }
  return f;
}
function cxUsLink(n) {
  if (n.kind === `member`) return n.m.url ? [`${n.m.name}'s official website`, n.m.url] : null;
  if (n.kind === `committee`) return n.c.url ? [`${n.name}'s official website`, n.c.url] : null;
  if (n.kind === `agency`) return n.a.url ? [`${n.name}`, n.a.url] : null;
  return null;
}
const CX_US_COLORS = { senate: `#7aa2ff`, house: `#5fd6c4`, joint: `#d6a3ff`, exec: `#ffc66b` };

function CX_UsGraph() {
  const [data, setData] = u.useState(CX_US.v);
  const [state, setState] = u.useState(CX_US.p ? `ready` : `loading`);
  u.useEffect(() => { let live = !0; cxUsLoad().then((d) => { if (live) { setData(d); setState(d ? `ready` : `none`); } }); return () => { live = !1; }; }, []);
  const g = CX_US.graph;
  const [view, setView] = u.useState(`sky`);
  const [sel, setSel] = u.useState(null);
  const [q, setQ] = u.useState(``);
  const [show, setShow] = u.useState({ member: !0, committee: !0, agency: !0 });
  const [chamber, setChamber] = u.useState(`all`);
  const [stateF, setStateF] = u.useState(``);
  const [tick, setTick] = u.useState(0);
  const cvs = u.useRef(null), cam = u.useRef({ x: 0, y: 0, k: 0.55 }), wrap = u.useRef(null), drag = u.useRef(null);
  const visible = u.useCallback((n) => {
    if (n.kind === `hub`) return !0;
    if (n.kind === `member` && !show.member) return !1;
    if (n.kind === `committee` && !show.committee) return !1;
    if (n.kind === `agency` && !show.agency) return !1;
    if (chamber !== `all` && n.group !== chamber && n.group !== `joint` && n.group !== `exec`) return !1;
    return !0;
  }, [show, chamber]);
  const dim = u.useCallback((n) => !!stateF && n.kind === `member` && n.m.state !== stateF, [stateF]);
  const nbr = u.useMemo(() => { if (!g || sel === null) return null; const s = new Set([sel]); g.adj[sel].forEach((k) => { s.add(g.edges[k].a); s.add(g.edges[k].b); }); return s; }, [g, sel]);

  // ---- drawing
  const draw = u.useCallback(() => {
    const c = cvs.current; if (!c || !g) return;
    const w = c.clientWidth, h = c.clientHeight, dpr = globalThis.devicePixelRatio || 1;
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
    const x = c.getContext(`2d`); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, w, h);
    const { x: cx, y: cy, k } = cam.current, X = (v) => w / 2 + (v + cx) * k, Y = (v) => h / 2 + (v + cy) * k;
    const lit = nbr;
    if (lit) {  // the connections of the chosen node
      x.lineWidth = 1; x.strokeStyle = `rgba(255,255,255,.28)`;
      g.adj[sel].forEach((ei) => { const e = g.edges[ei], A = g.nodes[e.a], B = g.nodes[e.b]; if (!visible(A) || !visible(B)) return; x.beginPath(); x.moveTo(X(A.x), Y(A.y)); x.lineTo(X(B.x), Y(B.y)); x.stroke(); });
    }
    g.nodes.forEach((n) => {
      if (!visible(n)) return;
      const on = !lit || lit.has(n.i), isSel = n.i === sel, faded = (lit && !on) || dim(n);
      const px = X(n.x), py = Y(n.y), r = Math.max(1.6, n.r * Math.sqrt(k) * (isSel ? 1.5 : 1));
      if (px < -20 || py < -20 || px > w + 20 || py > h + 20) return;
      x.globalAlpha = faded ? 0.14 : 1; x.fillStyle = CX_US_COLORS[n.group] || `#ccc`;
      x.beginPath();
      if (n.shape === `diamond`) { x.moveTo(px, py - r * 1.3); x.lineTo(px + r, py); x.lineTo(px, py + r * 1.3); x.lineTo(px - r, py); x.closePath(); }
      else if (n.shape === `square`) x.rect(px - r, py - r, r * 2, r * 2);
      else x.arc(px, py, r, 0, 6.2832);
      x.fill();
      if (isSel) { x.lineWidth = 2; x.strokeStyle = `#fff`; x.stroke(); }
      x.globalAlpha = 1;
      const label = n.kind === `hub` || isSel || (k > 1.2 && n.kind === `committee`) || (k > 2.4 && n.kind !== `member`) || (k > 4 && n.kind === `member`) || (lit && on && n.kind !== `member`);
      if (label && !faded) { x.font = `${n.kind === `hub` ? 700 : 500} ${n.kind === `hub` ? 15 : 12}px Inter, system-ui, sans-serif`; x.fillStyle = `#f4f2ee`; x.textAlign = `center`; x.fillText(n.label.length > 26 ? n.label.slice(0, 25) + `…` : n.label, px, py - r - 6); }
    });
  }, [g, sel, nbr, visible, dim]);
  u.useEffect(() => { draw(); }, [draw, tick, view, state]);
  u.useEffect(() => { const f = () => setTick((t) => t + 1); globalThis.addEventListener(`resize`, f); return () => globalThis.removeEventListener(`resize`, f); }, []);

  const toWorld = (ev) => { const c = cvs.current, r = c.getBoundingClientRect(), { x, y, k } = cam.current; return [(ev.clientX - r.left - r.width / 2) / k - x, (ev.clientY - r.top - r.height / 2) / k - y]; };
  const pick = (wx, wy) => { let best = null, bd = 1e9; g.nodes.forEach((n) => { if (!visible(n) || dim(n)) return; const dd = (n.x - wx) ** 2 + (n.y - wy) ** 2, rr = (Math.max(n.r, 6) + 4 / cam.current.k) ** 2; if (dd < rr && dd < bd) { bd = dd; best = n; } }); return best; };
  const zoomAt = (f, ev) => { const k0 = cam.current.k, k1 = Math.max(0.2, Math.min(9, k0 * f)); if (ev) { const [wx, wy] = toWorld(ev); const r = cvs.current.getBoundingClientRect(); cam.current = { k: k1, x: (ev.clientX - r.left - r.width / 2) / k1 - wx, y: (ev.clientY - r.top - r.height / 2) / k1 - wy }; } else cam.current = { ...cam.current, k: k1 }; setTick((t) => t + 1); };
  // fit everything that is shown into the canvas, with a margin
  const fit = () => {
    const c = cvs.current; if (!c || !g) return;
    const vis = g.nodes.filter(visible);
    if (!vis.length) return;
    const xs = vis.map((n) => n.x), ys = vis.map((n) => n.y), x0 = Math.min(...xs) - 40, x1 = Math.max(...xs) + 40, y0 = Math.min(...ys) - 40, y1 = Math.max(...ys) + 40;
    const k = Math.max(0.2, Math.min(2, Math.min(c.clientWidth / (x1 - x0), c.clientHeight / (y1 - y0))));
    cam.current = { x: -(x0 + x1) / 2, y: -(y0 + y1) / 2, k };
    setTick((t) => t + 1);
  };
  u.useEffect(() => { if (state === `ready` && view === `sky`) fit(); }, [state, view, show, chamber]);
  const focus = (n) => { setSel(n.i); cam.current = { ...cam.current, x: -n.x, y: -n.y, k: Math.max(cam.current.k, 1.6) }; setTick((t) => t + 1); };
  const onDown = (ev) => { drag.current = { sx: ev.clientX, sy: ev.clientY, cx: cam.current.x, cy: cam.current.y, moved: !1 }; cvs.current.setPointerCapture?.(ev.pointerId); };
  const onMove = (ev) => { const d0 = drag.current; if (!d0) return; const dx = ev.clientX - d0.sx, dy = ev.clientY - d0.sy; if (Math.abs(dx) + Math.abs(dy) > 4) d0.moved = !0; if (d0.moved) { cam.current = { ...cam.current, x: d0.cx + dx / cam.current.k, y: d0.cy + dy / cam.current.k }; setTick((t) => t + 1); } };
  const onUp = (ev) => { const d0 = drag.current; drag.current = null; if (d0 && !d0.moved) { const [wx, wy] = toWorld(ev); const n = pick(wx, wy); setSel(n ? n.i : null); } };
  const order = u.useMemo(() => (g ? g.nodes.filter(visible).filter((n) => !dim(n)).map((n) => n.i) : []), [g, visible, dim]);
  const move = (dir) => { if (!order.length) return; const at = order.indexOf(sel); focus(g.nodes[order[(at + dir + order.length) % order.length]]); };
  const onKey = (ev) => {
    if (ev.target.closest && ev.target.closest(`input, select, textarea`)) { if (ev.key === `Escape`) ev.target.blur(); return; }
    const K = ev.key, pan = 60 / cam.current.k;
    if (K === `]`) { ev.preventDefault(); move(1); } else if (K === `[`) { ev.preventDefault(); move(-1); }
    else if (K === `Escape`) setSel(null);
    else if (K === `+` || K === `=`) zoomAt(1.3); else if (K === `-`) zoomAt(1 / 1.3);
    else if (K === `ArrowLeft`) { ev.preventDefault(); cam.current = { ...cam.current, x: cam.current.x + pan }; setTick((t) => t + 1); }
    else if (K === `ArrowRight`) { ev.preventDefault(); cam.current = { ...cam.current, x: cam.current.x - pan }; setTick((t) => t + 1); }
    else if (K === `ArrowUp`) { ev.preventDefault(); cam.current = { ...cam.current, y: cam.current.y + pan }; setTick((t) => t + 1); }
    else if (K === `ArrowDown`) { ev.preventDefault(); cam.current = { ...cam.current, y: cam.current.y - pan }; setTick((t) => t + 1); }
    else if (K === `/`) { ev.preventDefault(); wrap.current?.querySelector(`.us-search input`)?.focus(); }
  };
  u.useEffect(() => { const c = cvs.current; if (!c) return; const w = (e) => { e.preventDefault(); zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e); }; c.addEventListener(`wheel`, w, { passive: !1 }); return () => c.removeEventListener(`wheel`, w); });

  if (state === `loading`) return <section className="us"><h1>United States</h1><p role="status">Loading the federal record...</p></section>;
  if (!data || !g) return <section className="us"><h1>United States</h1><p role="status">The United States graph needs the hosted site. It is not part of the offline file, because it loads a data file of about half a megabyte.</p></section>;
  const results = q.trim().length >= 2 ? g.nodes.filter((n) => n.kind !== `hub` && (n.name + ` ` + (n.m ? cxStateName(n.m.state) : ``)).toLowerCase().includes(q.trim().toLowerCase())).slice(0, 40) : [];
  const states = [...new Set(data.members.map((m) => m.state))].sort();
  const cur = sel !== null ? g.nodes[sel] : null;
  const facts = cur ? cxUsFacts(g, cur) : [];
  const link = cur ? cxUsLink(cur) : null;
  const rows = g.nodes.filter((n) => n.kind !== `hub` && visible(n) && !dim(n));
  const connected = cur ? g.adj[cur.i].map((ei) => { const e = g.edges[ei]; return { e, other: g.nodes[e.a === cur.i ? e.b : e.a], out: e.a === cur.i }; }) : [];
  const kindWord = { member: `Member of Congress`, committee: `Committee`, agency: `Agency`, hub: `Group` };
  const tabs = [[`sky`, `Sky`], [`index`, `Index`], [`linked`, `Linked`], [`tree`, `Tree`]];
  const pickBtn = (n) => <button type="button" className="us-pick" onClick={() => { focus(n); }}><strong>{n.name}</strong><small>{kindWord[n.kind]}{n.m ? `, ${cxStateName(n.m.state)}${n.m.district ? ` ${n.m.district}` : ``}` : ``}</small></button>;
  return (
    <section className="us" ref={wrap} onKeyDown={onKey} aria-labelledby="us-h">
      <header className="us-head">
        <div><h1 id="us-h">United States</h1><p className="us-lede">Congress, its committees, and the federal agencies, from public records. Pick anything to see what it connects to, in words.</p></div>
        <div className="us-tabs" role="group" aria-label="View">{tabs.map(([id, t]) => <button key={id} type="button" aria-pressed={view === id} className={view === id ? `on` : ``} onClick={() => setView(id)}>{t}</button>)}</div>
      </header>
      <p className="us-preview" role="note">Preview. This is built from public-domain and Federal Register records pulled {cxShortDate(cxDayET(Date.parse(data.retrieved_at)))}. The terms of those sources have not yet been read by a person, so treat it as a working view, not a finished record. Party is shown only as a dated, sourced field. Nothing here ranks or scores anyone.</p>
      <div className="us-tools">
        <label className="us-search"><span>Find a person, committee, or agency</span><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Husted, Agriculture, Treasury" /></label>
        <fieldset className="us-show"><legend>Show</legend>
          {[[`member`, `Members`], [`committee`, `Committees`], [`agency`, `Agencies`]].map(([k, t]) => <label key={k}><input type="checkbox" checked={show[k]} onChange={() => setShow({ ...show, [k]: !show[k] })} /> {t}</label>)}
        </fieldset>
        <label>Chamber <select value={chamber} onChange={(e) => setChamber(e.target.value)}><option value="all">Both</option><option value="senate">Senate</option><option value="house">House</option></select></label>
        <label>Highlight a state <select value={stateF} onChange={(e) => setStateF(e.target.value)}><option value="">None</option>{states.map((s) => <option key={s} value={s}>{cxStateName(s)}</option>)}</select></label>
      </div>
      {results.length > 0 && <ul className="us-results" aria-label="Search results">{results.map((n) => <li key={n.id}>{pickBtn(n)}</li>)}</ul>}
      <div className="us-body">
        <div className="us-main">
          {view === `sky` && (
            <div className="us-stage">
              <canvas ref={cvs} className="us-canvas" tabIndex={0} role="img" aria-label={`Map of ${order.length} federal nodes: members of Congress, committees, and agencies. Use the Index, Linked, or Tree view for the same information as text. Keys: right and left bracket move between nodes, arrows pan, plus and minus zoom, Escape clears, slash searches.`}
                onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => { drag.current = null; }} />
              <div className="us-zoom"><button type="button" aria-label="Zoom in" onClick={() => zoomAt(1.3)}>+</button><button type="button" aria-label="Zoom out" onClick={() => zoomAt(1 / 1.3)}>−</button><button type="button" aria-label="Fit everything" onClick={fit}>Fit</button></div>
              <p className="us-key" aria-hidden="true"><i style={{ background: CX_US_COLORS.senate }} /> Senate <i style={{ background: CX_US_COLORS.house }} /> House <i style={{ background: CX_US_COLORS.joint }} /> Joint committees <i style={{ background: CX_US_COLORS.exec }} /> Agencies. Circles are people, diamonds are committees, squares are agencies.</p>
            </div>
          )}
          {view === `index` && (
            <div className="us-index"><p>{rows.length} shown. Choose one to see its connections.</p>
              <table><caption className="us-sr">Federal members, committees, and agencies</caption><thead><tr><th scope="col">Name</th><th scope="col">What it is</th><th scope="col">Where</th></tr></thead>
                <tbody>{rows.map((n) => <tr key={n.id} className={n.i === sel ? `on` : ``}><th scope="row"><button type="button" onClick={() => { setSel(n.i); setView(`linked`); }}>{n.name}</button></th><td>{kindWord[n.kind]}</td><td>{n.m ? `${cxStateName(n.m.state)}${n.m.district ? `, district ${n.m.district}` : ``}` : n.kind === `committee` ? n.c.chamber : n.a && n.a.parent_id ? `Part of an agency` : ``}</td></tr>)}</tbody></table>
            </div>
          )}
          {view === `linked` && (
            <div className="us-linked">
              {!cur && <p>Choose a person, committee, or agency (search above, or in the Sky or Index views) to see everything it is connected to.</p>}
              {cur && <><h2>{cur.name}</h2><ul className="us-facts">{facts.map((f, i) => <li key={i}>{f}</li>)}</ul>
                {connected.length > 0 && <><h3>Connected to {connected.length}</h3><ul className="us-conn">{connected.slice(0, 60).map(({ e, other }, i) => <li key={i}><button type="button" onClick={() => focus(other)}>{other.name}</button> <small>{e.rel}</small></li>)}</ul>{connected.length > 60 && <p>And {connected.length - 60} more.</p>}</>}</>}
            </div>
          )}
          {view === `tree` && (
            <div className="us-tree">
              <details open><summary>Congress</summary>
                {[[`senate`, `Senate`], [`house`, `House`], [`joint`, `Joint committees`]].map(([ch, t]) => (
                  <details key={ch}><summary>{t}</summary>
                    <ul>{d_committees(data, ch).map((c) => <li key={c.id}><details><summary>{c.name}{c.chair ? `, chair ${c.chair}` : ``}</summary><ul>{data.members.filter((m) => m.committees.some((x) => x.id === c.id || x.id.startsWith(c.id))).slice(0, 80).map((m) => <li key={m.id}><button type="button" onClick={() => { const n = g.byId.get(`m:${m.id}`); setSel(n.i); setView(`linked`); }}>{m.name}</button> <small>{cxStateName(m.state)}</small></li>)}</ul></details></li>)}</ul>
                  </details>))}
              </details>
              <details><summary>Executive agencies</summary><ul>{data.agencies.filter((a) => !a.parent_id).map((a) => <li key={a.id}><details><summary>{a.name}</summary><ul>{data.agencies.filter((b) => b.parent_id === a.id).map((b) => <li key={b.id}><button type="button" onClick={() => { const n = g.byId.get(`a:${b.id}`); setSel(n.i); setView(`linked`); }}>{b.name}</button></li>)}<li><button type="button" onClick={() => { const n = g.byId.get(`a:${a.id}`); setSel(n.i); setView(`linked`); }}>About {a.short_name || a.name}</button></li></ul></details></li>)}</ul></details>
            </div>
          )}
        </div>
        <aside className="us-side" aria-live="polite" aria-label="Selected">
          {cur && view !== `linked` ? <>
            <h2>{cur.name}</h2><p className="us-kind">{kindWord[cur.kind]}</p>
            <ul className="us-facts">{facts.slice(0, 4).map((f, i) => <li key={i}>{f}</li>)}</ul>
            {link && <p><a href={link[1]} target="_blank" rel="noreferrer">{link[0]}<span className="sp-ext"> (opens in a new tab)</span></a></p>}
            <p><button type="button" className="cx-link-button" onClick={() => setView(`linked`)}>See all {connected.length} connections in words</button></p>
            <p><button type="button" className="cx-link-button" onClick={() => setSel(null)}>Clear</button></p>
          </> : cur ? (link && <p><a href={link[1]} target="_blank" rel="noreferrer">{link[0]}<span className="sp-ext"> (opens in a new tab)</span></a></p>) : <p className="us-hint">Select anyone or anything. A selected node lights its connections. {data.counts.members} members, {data.counts.committees} committees, {data.counts.agencies} agencies.</p>}
          <p className="us-src">Sources: congress-legislators (public domain), the Federal Register. Pulled {cxShortDate(cxDayET(Date.parse(data.retrieved_at)))}. A connection is a recorded relationship, not control.</p>
        </aside>
      </div>
    </section>
  );
}
function d_committees(data, ch) { return data.committees.filter((c) => c.chamber === ch); }
