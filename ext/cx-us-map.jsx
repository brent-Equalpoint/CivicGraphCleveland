/* The United States graph, rebuilt on the relationship-map kit (docs/plan-us-graph-master.md, phases 1 to 5; technical detail in
   docs/plan-us-graph-rebuild.md). The kit's own code is kept as a record in vendor/relationship-map-kit/; this file follows it.
   One model for every view: the map, Index, Linked, and Tree all read cxUsGraph (ext/cx-us.jsx) and the sentences in
   ext/cx-us-model.jsx, so a count or a sentence is written once. This file adds what the map needs on top of that model:
     cxUsMapModel   the kit's three slots (groups on the map, people, agencies and courts), every link with its line kind and its source
     cxUsMapSim     the physics (d3 force, from ext/cx-d3.js), with a fixed random seed so the same record always opens the same way
     cxUsMapLabels  names on the map by priority, never overlapping
   Rules kept: receipts, not scores. A line is a recorded relationship, never a strength. Party is not used anywhere here, not as a color,
   not on the map, not as a filter. Kinds are told apart by shape and by a word, not by color alone. Distance on the map only shows how
   many recorded ties two things share; it is not a rank and not "more like you". The part above the React line is pure: no page, no React. */

/* the four kinds of line a person can turn on, and the structural "part of" that only shapes the map */
const CX_USM_LINES = [
  { id: `seat`, label: `Sits on`, dash: [], note: `A seat in a chamber, on a committee, on a court, or in the cabinet.` },
  { id: `lead`, label: `Heads or leads`, dash: [], note: `A chair, a ranking member, a chief judge, or the President.` },
  { id: `appointed`, label: `Appointed by`, dash: [5, 4], note: `A sitting judge and the President who appointed them.` },
  { id: `oversees`, label: `Funds or oversees`, dash: [1, 4], note: `Not in our record yet. Which committee funds or oversees which agency needs a person's review first.` },
];
/* where every link comes from: the key in the record's own list of sources, and its entry in scripts/us_sources.py */
const CX_USM_SOURCES = {
  members: { registry: `us_members`, label: `the congress-legislators record of current members` },
  committees: { registry: `us_committees`, label: `the congress-legislators committee record` },
  membership: { registry: `us_committees`, label: `the congress-legislators committee membership record` },
  agencies: { registry: `us_agencies`, label: `the Federal Register's list of agencies` },
  executive: { registry: `us_executive`, label: `the congress-legislators record of the executive` },
  cabinet: { registry: `us_cabinet`, label: `the White House cabinet page` },
  judges: { registry: `us_judges`, label: `the Federal Judicial Center's list of judges` },
  circuits: { registry: `us_circuits`, label: `28 U.S.C. 41, the federal circuits`, url: `https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title28-section41&num=0&edition=prelim` },
};
/* the meaning group "United States chambers, agencies, and courts" in design/tokens.json; every color is also said by a shape and a word */
const CX_USM_COLORS = { senate: `#7aa2ff`, house: `#5fd6c4`, joint: `#d6a3ff`, exec: `#ffc66b`, courts: `#ff9db8` };

/* how hard a member is pulled to their chamber and, split across their seats, to their committees (lighter than the chamber, as the plan says) */
const CX_USM_PULL = { memberChamber: 0.26, memberCommittee: 0.5 };
function cxUsmPlural(n, one, many) { return `${n} ${n === 1 ? one : many}`; }
/* a short name for the map only; the full name is always in the sheet, the Index, and the Linked view */
function cxUsmShort(s, max = 30) {
  if (s.length <= max) return s;
  const cut = s.slice(0, max + 1).replace(/[\s,]+\S*$/, ``);
  return (cut.length > 8 ? cut : s.slice(0, max)).replace(/[\s,;:]+$/, ``) + `…`;
}

/* The adapter: the federal record (data/us-landscape-2026.json) and its graph (cxUsGraph) in the shape the kit's map reads.
   Returns { nodes, hubs, slots, links, pulls, lineCounts, sources }. nodes[i] matches g.nodes[i]. */
function cxUsMapModel(d, g) {
  const branchOf = (n) => (n.group === `senate` || n.group === `house` || n.group === `joint` || n.group === `exec` ? n.group : `courts`);
  const committeeLabels = new Map();
  g.nodes.forEach((n) => { if (n.kind === `committee`) committeeLabels.set(n.label, (committeeLabels.get(n.label) || 0) + 1); });
  const count = (f) => g.nodes.filter(f).length;
  const people = { senate: count((n) => n.kind === `member` && n.group === `senate`), house: count((n) => n.kind === `member` && n.group === `house`) };
  const execPeople = count((n) => n.kind === `president` || n.kind === `cabinet`), agencies = count((n) => n.kind === `agency`);
  const courts = count((n) => n.kind === `court`), judges = count((n) => n.kind === `judge`);
  const comms = (ch) => count((n) => n.kind === `committee` && n.group === ch);
  const hubInfo = {
    [`h:senate`]: { label: `Senate`, total: people.senate, totalText: cxUsmPlural(people.senate, `member`, `members`), more: cxUsmPlural(comms(`senate`), `committee`, `committees`) },
    [`h:house`]: { label: `House`, total: people.house, totalText: cxUsmPlural(people.house, `member`, `members`), more: cxUsmPlural(comms(`house`), `committee`, `committees`) },
    [`h:exec`]: { label: `Executive`, total: agencies + execPeople, totalText: `${cxUsmPlural(agencies, `agency`, `agencies`)}, ${cxUsmPlural(execPeople, `person`, `people`)}`, more: `` },
    [`h:court`]: { label: `Courts`, total: courts + judges, totalText: `${cxUsmPlural(courts, `court`, `courts`)}, ${cxUsmPlural(judges, `judge`, `judges`)}`, more: `` },
  };
  const nodes = g.nodes.map((n) => {
    const m = { i: n.i, id: n.id, name: n.name, branch: branchOf(n) };
    if (n.kind === `hub`) {
      const h = hubInfo[n.id];
      Object.assign(m, { kind: `hub`, shape: `ring`, label: h.label, total: h.total, totalText: h.totalText, r: 9 + Math.sqrt(Math.min(h.total, 450)) * 2.3, charge: -480 });
    } else if (n.kind === `committee`) {
      const dup = committeeLabels.get(n.label) > 1;
      // a joint committee keeps its full name ("Joint Committee on Taxation", not "Taxation", which would read like a policy area)
      const label = cxUsmShort(n.c.chamber === `joint` ? n.name : dup ? `${n.c.chamber === `senate` ? `Senate` : `House`} ${n.label}` : n.label);
      Object.assign(m, { kind: `committee`, shape: `diamond`, label, total: n.c.members, totalText: cxUsmPlural(n.c.members, `member`, `members`), r: 6 + Math.sqrt(n.c.members) * 1.1, charge: -110 });
    } else if (n.kind === `agency`) {
      Object.assign(m, { kind: `agency`, shape: `square`, label: cxUsmShort(n.label, 28), r: n.a.parent_id ? 2.8 : 3.8, charge: -14 });
    } else if (n.kind === `court`) {
      const t = n.c.type;
      Object.assign(m, { kind: `court`, shape: `hex`, label: cxUsmShort(n.label, 28), r: t === `supreme` ? 7 : t === `appeals` ? 5.4 : 4, charge: t === `supreme` ? -160 : t === `appeals` ? -60 : -16 });
    } else {
      const role = n.kind === `member` ? `member` : n.kind === `president` ? (n.p.role === `Vice President` ? `vp` : n.p.current ? `president` : `former`) : n.kind === `cabinet` ? `cabinet` : `judge`;
      Object.assign(m, { kind: `person`, role, shape: `circle`, label: n.name, r: role === `president` ? 5 : role === `vp` || role === `former` ? 4 : role === `judge` ? 2.5 : 3.1, charge: role === `judge` ? -5 : -16 });
    }
    return m;
  });
  // every edge of the shared graph, with its line kind and its source
  const leadRole = /^(chair|chairman|vice chair|vice chairman|ranking member|cochairman|co-chair|cochair)$/i;
  const links = g.edges.map((e) => {
    const A = g.nodes[e.a], B = g.nodes[e.b], k = `${A.kind}>${B.kind}`;
    let line = `part`, src = `members`;
    if (k === `member>hub`) { line = `seat`; src = `members`; }
    else if (k === `committee>hub`) { line = `part`; src = `committees`; }
    else if (k === `member>committee`) { line = leadRole.test(e.rel) ? `lead` : `seat`; src = `membership`; }
    else if (k === `agency>hub` || k === `agency>agency`) { line = `part`; src = `agencies`; }
    else if (k === `president>hub`) { line = A.p.current && A.p.role !== `Vice President` ? `lead` : A.p.current ? `seat` : `part`; src = `executive`; }
    else if (k === `cabinet>president`) { line = `seat`; src = `cabinet`; }
    else if (k === `court>hub`) { line = `part`; src = `judges`; }
    else if (k === `court>court`) { line = `part`; src = A.c.type === `district` ? `circuits` : `judges`; }
    else if (k === `judge>court`) { line = A.j.chief || A.j.title === `Chief Justice` ? `lead` : `seat`; src = `judges`; }
    else if (k === `judge>president`) { line = `appointed`; src = `judges`; }
    return { a: e.a, b: e.b, line, rel: e.rel, src };
  });
  // the pulls that shape the map: each thing toward what it belongs to. Appointments draw a line when focused but never pull,
  // so judges stay with their courts and are never grouped by the President who appointed them.
  const hub = (id) => g.byId.get(id).i;
  const S = hub(`h:senate`), H = hub(`h:house`), X = hub(`h:exec`), C = hub(`h:court`);
  const pulls = [];
  const pull = (a, b, s, dist) => pulls.push({ a, b, s, d: dist });
  const comCount = new Map();
  links.forEach((l) => { if (g.nodes[l.a].kind === `member` && g.nodes[l.b].kind === `committee`) comCount.set(l.a, (comCount.get(l.a) || 0) + 1); });
  // parent: where each thing starts before the physics runs (next to what it belongs to); the forces then find the shape
  const parent = new Array(g.nodes.length).fill(-1);
  links.forEach((l) => {
    const A = g.nodes[l.a], B = g.nodes[l.b];
    if (A.kind === `member` && B.kind === `hub`) { pull(l.a, l.b, CX_USM_PULL.memberChamber, 40); parent[l.a] = l.b; }
    else if (A.kind === `member` && B.kind === `committee`) pull(l.a, l.b, CX_USM_PULL.memberCommittee / (comCount.get(l.a) || 1), 40);
    else if (A.kind === `committee` && B.kind === `hub` && A.c.chamber !== `joint`) { pull(l.a, l.b, 0.22, 80); parent[l.a] = l.b; }
    else if (A.kind === `agency` && B.kind === `hub`) { pull(l.a, l.b, 0.32, 70); parent[l.a] = l.b; }
    else if (A.kind === `agency` && B.kind === `agency`) { pull(l.a, l.b, 0.6, 18); parent[l.a] = l.b; }
    else if (A.kind === `president` && B.kind === `hub`) { pull(l.a, l.b, A.p.current ? 0.7 : 0.3, A.p.current ? 26 : 64); parent[l.a] = l.b; }
    else if (A.kind === `cabinet`) { pull(l.a, l.b, 0.5, 30); parent[l.a] = l.b; }
    else if (A.kind === `court` && B.kind === `hub`) { pull(l.a, l.b, A.c.type === `supreme` ? 0.7 : A.c.type === `district` ? 0.04 : 0.5, A.c.type === `supreme` ? 30 : A.c.type === `district` ? 220 : 120); if (parent[l.a] < 0) parent[l.a] = l.b; }
    else if (A.kind === `court` && B.kind === `court`) { pull(l.a, l.b, A.c.type === `district` ? 0.6 : 0.06, A.c.type === `district` ? 40 : 120); if (A.c.type === `district`) parent[l.a] = l.b; }
    else if (A.kind === `judge` && B.kind === `court`) { pull(l.a, l.b, 0.8, 10); parent[l.a] = l.b; }
  });
  // a joint committee belongs to both chambers
  g.nodes.forEach((n) => { if (n.kind === `committee` && n.c.chamber === `joint`) { pull(n.i, S, 0.14, 200); pull(n.i, H, 0.14, 200); parent[n.i] = S; } });
  const lineCounts = Object.fromEntries([...CX_USM_LINES.map((x) => [x.id, 0]), [`part`, 0]]);
  links.forEach((l) => { lineCounts[l.line] += 1; });
  const sources = {};
  Object.entries(CX_USM_SOURCES).forEach(([k, v]) => { sources[k] = { ...v, url: v.url || (d.sources && d.sources[k]) || null }; });
  const ofKind = (k) => nodes.filter((n) => n.kind === k).map((n) => n.i);
  return {
    nodes, links, pulls, lineCounts, sources, parent,
    hubs: [S, H, X, C, ...ofKind(`committee`)],
    // the kit's three slots, by their kit names: groups on the map, side A, side B
    slots: { industries: [S, H, X, C, ...ofKind(`committee`)], companies: ofKind(`person`), funds: [...ofKind(`agency`), ...ofKind(`court`)] },
    branchHubs: { senate: S, house: H, exec: X, courts: C },
  };
}

/* a fingerprint of the nodes and their order, so settled positions computed at build time are only used for the record they were made from */
function cxUsmIds(g) { return `${g.nodes.length}:${cxUsHash(g.nodes.map((n) => n.id).join(`|`)).toFixed(12)}`; }

/* a seeded random source (the same recipe as d3-random's randomLcg), so the same record always settles the same way */
function cxUsmLcg(seed) {
  let s = seed | 0;
  return () => { s = (Math.imul(0x19660d, s) + 0x3c6ef35f) | 0; return (s >>> 0) / 4294967296; };
}

/* The physics, as in the kit's skyBuild: hubs push apart hard, people lightly, nothing overlaps, a gentle pull to the middle.
   Runs ahead before the first drawing (pre ticks) so the map opens already formed. keep: a Set of node indexes to lay out alone (Solo). */
function cxUsmSeed(M) {
  // where each thing starts: the four branch hubs on a circle, everything else in a small sunflower next to what it belongs to.
  // Only a starting point; the forces move everything from here, so the shape is found, not drawn.
  const xy = M.nodes.map(() => null), kids = new Map();
  M.parent.forEach((p, i) => { if (p >= 0) { if (!kids.has(p)) kids.set(p, []); kids.get(p).push(i); } });
  const B = M.branchHubs, R = 330;
  [B.senate, B.house, B.exec, B.courts].forEach((h, k) => { const a = Math.PI * (1.25 - k * 0.5); xy[h] = [R * Math.cos(a), R * Math.sin(a)]; });
  const queue = [B.senate, B.house, B.exec, B.courts];
  while (queue.length) {
    const p = queue.shift(), list = kids.get(p) || [], base = M.nodes[p].r + 6;
    list.forEach((i, k) => { if (xy[i]) return; const a = k * 2.399963, rr = base + 7 * Math.sqrt(k + 1); xy[i] = [xy[p][0] + rr * Math.cos(a), xy[p][1] + rr * Math.sin(a)]; queue.push(i); });
  }
  M.nodes.forEach((n, i) => { if (!xy[i]) xy[i] = [0, 0]; });
  return xy;
}
function cxUsMapSim(M, D3, opts = {}) {
  const keep = opts.keep || null, from = opts.objs ? null : opts.from || cxUsmSeed(M);
  // opts.objs: the page's own node objects (indexed like M.nodes), moved in place; otherwise new ones, started at opts.from or the seed
  const nodes = M.nodes.filter((n) => !keep || keep.has(n.i)).map((n) => {
    const o = opts.objs ? opts.objs[n.i] : { x: from[n.i][0], y: from[n.i][1] };
    return Object.assign(o, { i: n.i, r: n.r, kind: n.kind, charge: keep && n.kind === `hub` ? -150 : n.charge });
  });
  const at = new Map(nodes.map((n, k) => [n.i, k]));
  const links = M.pulls.filter((p) => at.has(p.a) && at.has(p.b)).map((p) => ({ source: at.get(p.a), target: at.get(p.b), s: p.s, d: p.d }));
  if (keep) {   // alone, each thing is pulled only toward what is left, a little harder, so the group forms cleanly (the kit's solo)
    const n = new Map(); links.forEach((l) => n.set(l.source, (n.get(l.source) || 0) + 1));
    links.forEach((l) => { l.s = Math.max(l.s, 0.5 / n.get(l.source)); });
  }
  const sim = D3.forceSimulation(nodes).randomSource(cxUsmLcg(26))
    .force(`link`, D3.forceLink(links).strength((l) => l.s).distance((l) => l.d))
    .force(`charge`, D3.forceManyBody().strength((n) => n.charge).distanceMax(520))
    .force(`collide`, D3.forceCollide((n) => n.r + (n.kind === `hub` ? 16 : n.kind === `committee` ? 7 : 1.6)).iterations(2))
    .force(`x`, D3.forceX(0).strength(0.04)).force(`y`, D3.forceY(0).strength(0.05))
    .stop();
  for (let k = 0; k < (opts.pre ?? 300); k++) sim.tick();
  return { sim, nodes, at };
}

/* the box that holds a set of nodes, in map units */
function cxUsmBox(pts) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  pts.forEach((p) => { x0 = Math.min(x0, p.x - p.r); y0 = Math.min(y0, p.y - p.r); x1 = Math.max(x1, p.x + p.r); y1 = Math.max(y1, p.y + p.r); });
  return { x0, y0, x1, y1 };
}
/* the zoom that fits a box into the screen, leaving room for the floating controls (pad: top, right, bottom, left) */
function cxUsmFit(box, W, H, pad, kMax = 3.2) {
  const w = Math.max(80, W - pad[1] - pad[3]), h = Math.max(80, H - pad[0] - pad[2]);
  const k = Math.max(0.12, Math.min(kMax, Math.min(w / Math.max(1, box.x1 - box.x0), h / Math.max(1, box.y1 - box.y0))));
  return { k, x: pad[3] + w / 2 - (k * (box.x0 + box.x1)) / 2, y: pad[0] + h / 2 - (k * (box.y0 + box.y1)) / 2 };
}

/* Names on the map, by priority, never overlapping (the kit's skyLabels, with every label kept from overlapping, the focus too).
   cand: [{ i, x, y, rr (radius on screen), pri, lines: [{ text, font, size }], center }]; measure(text, font) gives a width.
   Tries the right side, then the left, above, and below; a hub tries its middle, then above and below its ring. At most max labels.
   blocked: screen boxes where nothing may go (the floating controls), so no name hides under a button.
   Returns the boxes it drew: [{ i, x, y, w, h, lines, align }] in screen pixels. */
function cxUsMapLabels(cand, measure, W, H, max = 90, blocked = []) {
  const out = [], pad = 3;
  const hits = (b, o) => b.x < o.x + o.w && b.x + b.w > o.x && b.y < o.y + o.h && b.y + b.h > o.y;
  const free = (b) => b.x >= 2 && b.y >= 2 && b.x + b.w <= W - 2 && b.y + b.h <= H - 2 && !out.some((o) => hits(b, o)) && !blocked.some((o) => hits(b, o));
  [...cand].sort((a, b) => b.pri - a.pri || a.i - b.i).forEach((c) => {
    if (out.length >= max) return;
    const widths = c.lines.map((l) => measure(l.text, l.font));
    const w = Math.max(...widths) + pad * 2, h = c.lines.reduce((t, l) => t + l.size * 1.2, 0) + pad;
    const spots = c.center
      ? [[c.x - w / 2, c.y - h / 2, `center`], [c.x - w / 2, c.y - c.rr - h - 2, `center`], [c.x - w / 2, c.y + c.rr + 2, `center`]]
      : [[c.x + c.rr + 4, c.y - h / 2, `left`], [c.x - c.rr - 4 - w, c.y - h / 2, `right`], [c.x - w / 2, c.y - c.rr - h - 1, `center`], [c.x - w / 2, c.y + c.rr + 1, `center`]];
    for (const [x, y, align] of spots) {
      const b = { i: c.i, x, y, w, h, lines: c.lines, align, pri: c.pri };
      if (free(b)) { out.push(b); return; }
    }
  });
  return out;
}

/* ---------- the page (React) ---------- */
/* The settled places the build worked out (scripts/us_map.js), fetched once on the hosted site with the record itself. */
const CX_USM = { file: null, p: null, home: null };
function cxUsMapPosLoad() {
  if (!CX_USM.p) {
    const web = typeof fetch === `function` && /^https?:$/.test(String(globalThis.location?.protocol || ``));
    CX_USM.p = (web ? fetch(`/us/map-2026.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null) : Promise.resolve(null)).then((f) => { CX_USM.file = f; return f; });
  }
  return CX_USM.p;
}
/* where everything rests: the build's file when it was made from this same record, otherwise the same physics run here (slower, same result) */
function cxUsMapHome(g, M, file) {
  if (CX_USM.home && CX_USM.home.g === g) return CX_USM.home.xy;
  let xy = file && file.ids === cxUsmIds(g) && Array.isArray(file.xy) && file.xy.length === M.nodes.length ? file.xy : null;
  if (!xy) { const R = cxUsMapSim(M, CXD3, { pre: 300 }); xy = M.nodes.map(() => [0, 0]); R.nodes.forEach((n) => { xy[n.i] = [n.x, n.y]; }); }
  CX_USM.home = { g, xy };
  return xy;
}
/* words drawn on the map are not page text, so the translator cannot see them: they are translated here, with the same dictionary */
function cxUsmTr(s) { return (CX_I18N.lang === `es` && cxI18nText(s)) || s; }
const CX_USM_FONT = `"Schibsted Grotesk", Inter, ui-sans-serif, system-ui, sans-serif`;
function cxUsmIsland() { return document.documentElement.getAttribute(`data-cx-theme`) === `original` ? `#141210` : `#0f1012`; }
function cxUsmLess() { return !!(globalThis.matchMedia && globalThis.matchMedia(`(prefers-reduced-motion: reduce)`).matches); }
const CX_USM_TERR = new Set([`DC`, `PR`, `GU`, `VI`, `AS`, `MP`]);
function cxUsmDot(s) { return /[.!?]$/.test(s) ? s : `${s}.`; }

/* where a node is listed in the Index: its door and group (the same doors as cxUsDoors) */
function cxUsmDoorOf(n) {
  if (n.kind === `member`) return { door: `members`, grp: n.m.chamber };
  if (n.kind === `committee`) return { door: `committees`, grp: n.c.chamber };
  if (n.kind === `agency`) return { door: `executive`, grp: n.a.parent_id ? `sub` : `top` };
  if (n.kind === `president`) return { door: `executive`, grp: n.p.current ? `current` : `former` };
  if (n.kind === `cabinet`) return { door: `executive`, grp: `cabinet` };
  if (n.kind === `court`) return { door: `courts`, grp: n.c.type };
  if (n.kind === `judge`) return { door: `courts`, grp: `judges` };
  return { door: n.id === `h:exec` ? `executive` : n.id === `h:court` ? `courts` : `members`, grp: n.id === `h:house` ? `house` : n.id === `h:senate` ? `senate` : `` };
}

/* What the sheet says about one node: a kicker, the name, one plain sentence, one fact line, and lists, all read from the record.
   Party is not here: it is a dated, sourced fact on the profile (the Linked view), never on the map or its sheet. */
function cxUsMapSheet(g, M, data, i) {
  const n = g.nodes[i];
  const conn = (f) => g.adj[i].map((ei) => { const e = g.edges[ei], o = e.a === i ? e.b : e.a; return { i: o, n: g.nodes[o], e, l: M.links[ei] }; }).filter((x) => f(x.n, x));
  const byName = (a, b) => a.n.name.localeCompare(b.n.name);
  const role = (x) => (x.e.rel === `member` ? `Member` : x.e.rel === `ex officio` ? `Member, ex officio` : x.e.rel.charAt(0).toUpperCase() + x.e.rel.slice(1));
  const row = (x, sub) => ({ i: x.i, name: x.n.name, sub });
  const src = (k) => M.sources[k];
  const out = { kicker: ``, name: n.name, sentence: ``, fact: ``, lists: [], src: src(`members`) };
  const st = (c) => cxStateName(c);
  if (n.kind === `member`) {
    const m = n.m, seats = conn((o) => o.kind === `committee`).sort(byName), leads = seats.filter((x) => x.l.line === `lead`);
    const terr = CX_USM_TERR.has(m.state);
    out.kicker = m.chamber === `senate` ? `Senator, ${st(m.state)}` : terr ? (m.state === `PR` ? `Resident Commissioner, Puerto Rico` : `Delegate, ${st(m.state)}`) : m.district ? `Representative, ${st(m.state)}, district ${m.district}` : `Representative, ${st(m.state)}, at large`;
    out.sentence = m.chamber === `senate` ? `Represents ${st(m.state)} in the Senate.` : terr ? `Represents ${st(m.state)} in the House.` : m.district ? `Represents ${st(m.state)}'s ${cxOrd(m.district)} district in the House.` : `Represents all of ${st(m.state)} in the House.`;
    const on = seats.length === 1 ? `Sits on 1 committee` : `Sits on ${seats.length} committees`;
    out.fact = !seats.length ? `No committee seat is listed.` : leads.length ? `${on} and leads ${leads.length}.` : `${on}.`;
    if (seats.length) out.lists.push({ title: `Committees`, rows: seats.map((x) => row(x, role(x))) });
    out.src = src(`membership`);
  } else if (n.kind === `committee`) {
    const c = n.c, ch = c.chamber === `senate` ? `Senate` : `House`, mem = conn((o) => o.kind === `member`).sort(byName), leads = mem.filter((x) => x.l.line === `lead`);
    out.kicker = c.chamber === `joint` ? `Joint committee` : `Committee, ${ch}`;
    out.sentence = c.chamber === `joint` ? `A joint committee of Congress with ${c.members} listed members.` : c.chamber === `senate` ? `A Senate committee with ${c.members} listed members.` : `A House committee with ${c.members} listed members.`;
    out.fact = c.chair ? `Chair: ${c.chair}.` : `No chair is listed.`;
    if (leads.length) out.lists.push({ title: `Who leads it`, rows: leads.map((x) => row(x, role(x))) });
    if (mem.length) out.lists.push({ title: `Members`, rows: mem.map((x) => row(x, `${x.n.m.chamber === `senate` ? `Senator` : `Representative`}, ${st(x.n.m.state)}`)) });
    if (c.subcommittees.length) out.lists.push({ title: `Subcommittees`, rows: c.subcommittees.map((s) => ({ i: null, name: s.name, sub: s.chair ? `Chair: ${s.chair}` : `` })) });
    out.src = src(`membership`);
  } else if (n.kind === `agency`) {
    const a = n.a, up = a.parent_id ? g.byId.get(`a:${a.parent_id}`) : null, kids = conn((o) => o.kind === `agency` && o.a.parent_id === a.id).sort(byName);
    out.kicker = up ? `Agency, part of a larger one` : `Federal agency`;
    out.sentence = up ? `Part of ${up.name}.` : `A top-level agency in the Federal Register's list.`;
    out.fact = !a.documents_since_cutoff ? `Listed in the Federal Register.` : a.documents_since_cutoff === 1 ? `1 Federal Register document since ${cxVoteDate(data.agency_cutoff)}.` : `${a.documents_since_cutoff} Federal Register documents since ${cxVoteDate(data.agency_cutoff)}.`;
    if (up) out.lists.push({ title: `Part of`, rows: [{ i: up.i, name: up.name, sub: up.a && up.a.parent_id ? `Agency` : `Top-level agency` }] });
    if (kids.length) out.lists.push({ title: `Parts of it`, rows: kids.map((x) => row(x, `Agency`)) });
    out.src = src(`agencies`);
  } else if (n.kind === `court`) {
    const c = n.c, judges = conn((o) => o.kind === `judge`).sort(byName), up = c.circuit ? g.byId.get(`k:${c.circuit}`) : null;
    const lower = conn((o) => o.kind === `court` && (o.c.circuit === c.id || (c.type === `supreme` && o.c.type === `appeals`))).sort(byName);
    out.kicker = c.type === `supreme` ? `Supreme Court` : c.type === `appeals` ? `Court of appeals` : c.type === `district` ? `District court` : `Federal court`;
    out.sentence = c.type === `supreme` ? `The highest court in the federal courts.` : c.type === `appeals` ? `A federal court of appeals.` : c.type === `district` ? (up ? `A federal district court. Its appeals go to the ${up.name}.` : `A federal district court.`) : `A federal court.`;
    const sits = c.active_judges === 1 ? `${c.active_judges} judge sits on it now` : `${c.active_judges} judges sit on it now`;
    out.fact = !c.senior_judges ? `${sits}.` : c.senior_judges === 1 ? `${sits}, and ${c.senior_judges} has taken senior status.` : `${sits}, and ${c.senior_judges} have taken senior status.`;
    if (judges.length) out.lists.push({ title: `Judges`, rows: judges.map((x) => row(x, x.n.j.title === `Judge` ? `Appointed by ${x.n.j.appointed_by}` : `${x.n.j.title}, appointed by ${x.n.j.appointed_by}`)) });
    if (lower.length) out.lists.push({ title: `Hears appeals from`, rows: lower.map((x) => row(x, x.n.c.type === `appeals` ? `Court of appeals` : `District court`)) });
    if (up) out.lists.push({ title: `Its appeals go to`, rows: [{ i: up.i, name: up.name, sub: `Court of appeals` }] });
    out.src = c.type === `district` ? src(`circuits`) : src(`judges`);
  } else if (n.kind === `judge`) {
    const j = n.j, co = g.byId.get(`k:${j.court_id}`), who = conn((o) => o.kind === `president`)[0];
    out.kicker = j.title === `Judge` ? (co && co.c.type === `district` ? `District judge` : co && co.c.type === `appeals` ? `Appeals judge` : `Judge`) : j.title;
    const court = co ? co.name : `federal courts`;
    out.sentence = j.title === `Chief Justice` ? `The Chief Justice of the ${court}.` : j.title === `Judge` ? (j.chief ? `A judge of the ${court}, and its chief judge.` : `A judge of the ${court}.`) : `An Associate Justice of the ${court}.`;
    const by = who ? `President ${who.n.name}` : j.appointed_by;
    out.fact = j.commissioned ? `Appointed by ${by}, commissioned ${cxVoteDate(j.commissioned)}.` : `Appointed by ${by}.`;
    if (co) out.lists.push({ title: `Court`, rows: [{ i: co.i, name: co.name, sub: out.kicker }] });
    if (who) out.lists.push({ title: `Appointed by`, rows: [row(who, who.n.p.current ? `President` : `Former President`)] });
    out.src = src(`judges`);
  } else if (n.kind === `president`) {
    const p = n.p, judges = conn((o) => o.kind === `judge`).sort(byName), cab = conn((o) => o.kind === `cabinet`);
    const span = p.terms && p.terms.length ? `${p.terms[0].start.slice(0, 4)} to ${p.terms[p.terms.length - 1].end.slice(0, 4)}` : ``;
    out.kicker = p.role === `Vice President` ? `Vice President` : p.current ? `President` : `Former President`;
    out.sentence = p.role === `Vice President` ? `The Vice President of the United States.` : p.current ? `The President of the United States.` : `Served as President, ${span}.`;
    out.fact = judges.length ? `Appointed ${judges.length} of the judges who sit now.` : p.term_start ? `Term: ${cxVoteDate(p.term_start)} to ${cxVoteDate(p.term_end)}.` : `No sitting judge in our record was appointed by ${p.name}.`;
    if (cab.length) out.lists.push({ title: `Cabinet`, rows: cab.map((x) => row(x, x.n.cab.title)) });
    if (judges.length) out.lists.push({ title: `Judges appointed`, rows: judges.map((x) => row(x, x.n.where || `Judge`)) });
    out.src = judges.length ? src(`judges`) : src(`executive`);
  } else if (n.kind === `cabinet`) {
    const pr = conn((o) => o.kind === `president`)[0];
    out.kicker = `Cabinet`;
    out.sentence = `${n.cab.title} in the President's cabinet.`;
    out.fact = `Listed on the White House cabinet page. Which agency this title leads is not linked yet.`;
    if (pr) out.lists.push({ title: `Serves in the cabinet of`, rows: [row(pr, `President`)] });
    out.src = src(`cabinet`);
  } else {
    const m = M.nodes[i];
    if (n.id === `h:senate` || n.id === `h:house`) {
      const ch = n.id === `h:senate` ? `senate` : `house`, comms = conn((o) => o.kind === `committee`).sort(byName), mem = conn((o) => o.kind === `member`).sort(byName);
      out.kicker = `Chamber of Congress`;
      out.sentence = `${m.total} members and ${comms.length} committees in our record.`;
      out.fact = `${m.total} members. ${comms.length} committees.`;
      out.lists.push({ title: `Committees`, rows: comms.map((x) => row(x, `${x.n.c.members} members`)) });
      out.lists.push({ title: `Members`, rows: mem.map((x) => row(x, ch === `senate` ? st(x.n.m.state) : `${st(x.n.m.state)}${x.n.m.district ? `, district ${x.n.m.district}` : ``}`)) });
      out.src = src(`members`);
    } else if (n.id === `h:exec`) {
      const lead = conn((o) => o.kind === `president`).sort((a, b) => (b.n.p.current ? 1 : 0) - (a.n.p.current ? 1 : 0) || byName(a, b));
      const cab = g.nodes.filter((o) => o.kind === `cabinet`).map((o) => ({ i: o.i, n: o })), tops = conn((o) => o.kind === `agency`).sort(byName);
      out.name = `The federal executive branch`;
      out.kicker = `Branch`;
      out.sentence = `The President, the Vice President, the cabinet, and the federal agencies in our record.`;
      out.fact = `${m.totalText}.`;
      out.lists.push({ title: `Leaders`, rows: lead.map((x) => row(x, x.n.p.role === `Vice President` ? `Vice President` : x.n.p.current ? `President` : `Former President`)) });
      if (cab.length) out.lists.push({ title: `Cabinet`, rows: cab.map((x) => row(x, x.n.cab.title)) });
      out.lists.push({ title: `Top-level agencies`, rows: tops.map((x) => row(x, `Agency`)) });
      out.src = src(`agencies`);
    } else {
      const courts = conn((o) => o.kind === `court` && o.c.type !== `district`).sort((a, b) => (a.n.c.type === `supreme` ? -1 : 0) - (b.n.c.type === `supreme` ? -1 : 0) || byName(a, b));
      out.name = `The federal courts`;
      out.kicker = `Branch`;
      out.sentence = `The Supreme Court, the courts of appeals, and the district courts, with the judges who sit now.`;
      out.fact = `${m.totalText}.`;
      out.lists.push({ title: `Supreme Court and courts of appeals`, rows: courts.map((x) => row(x, x.n.c.type === `supreme` ? `Supreme Court` : `Court of appeals`)) });
      out.src = src(`judges`);
    }
  }
  return out;
}

/* Solo: the nodes to keep, everything else steps away. spec: { node }, { chamber }, { state }, or { area, members: Set of member ids } */
function cxUsmSoloSet(g, M, spec) {
  let keep = new Set();
  const hubOf = (n) => g.byId.get(n.m.chamber === `senate` ? `h:senate` : `h:house`).i;
  if (spec.chamber) {
    const h = g.byId.get(`h:${spec.chamber}`).i; keep.add(h);
    g.nodes.forEach((n) => { if ((n.kind === `member` || n.kind === `committee`) && n.group === spec.chamber) keep.add(n.i); });
  } else if (spec.state) {
    keep = cxUsSolo(g, { state: spec.state });
    [...keep].forEach((i) => { const n = g.nodes[i]; if (n.kind === `member`) keep.add(hubOf(n)); });
  } else if (spec.area) {
    g.nodes.forEach((n) => { if (n.kind === `member` && spec.members.has(n.m.id)) { keep.add(n.i); keep.add(hubOf(n)); } });
  } else if (spec.node != null) {
    const n = g.nodes[spec.node];
    if (n.id === `h:senate` || n.id === `h:house`) return cxUsmSoloSet(g, M, { chamber: n.group });
    if (n.id === `h:exec`) { g.nodes.forEach((o) => { if (o.group === `exec`) keep.add(o.i); }); return keep; }
    if (n.id === `h:court`) { g.nodes.forEach((o) => { if (o.group === `judicial`) keep.add(o.i); }); return keep; }
    keep = cxUsSolo(g, { node: spec.node });
  }
  return keep;
}
/* what a Solo shows, counted by kind, as separate pieces so each one translates: ["27 people", "1 committee"] */
function cxUsmSoloCount(M, keep) {
  const c = { person: 0, committee: 0, agency: 0, court: 0 };
  keep.forEach((i) => { const k = M.nodes[i].kind; if (k in c) c[k] += 1; });
  const parts = [[c.person, `person`, `people`], [c.committee, `committee`, `committees`], [c.agency, `agency`, `agencies`], [c.court, `court`, `courts`]].filter((x) => x[0]).map((x) => cxUsmPlural(...x));
  return parts.length ? parts : [`Nothing to show.`];
}
/* the members who cast a recorded vote (yea, nay, or present) that decided a bill or a nominee in one policy area */
function cxUsmAreaMembers(vd, area) {
  const ids = new Set();
  vd.votes.forEach((v) => {
    if (!v.final || cxUsAreaOf(vd, v) !== area) return;
    for (let k = 0; k < v.codes.length; k++) { const c = v.codes[k]; if (c === `Y` || c === `N` || c === `P`) ids.add(vd.members[k]); }
  });
  return ids;
}

/* one shape on the canvas: circle (a person), diamond (a committee), square (an agency), hexagon (a court) */
function cxUsmPath(x, shape, px, py, r) {
  x.beginPath();
  if (shape === `diamond`) { x.moveTo(px, py - r * 1.25); x.lineTo(px + r, py); x.lineTo(px, py + r * 1.25); x.lineTo(px - r, py); x.closePath(); }
  else if (shape === `square`) x.rect(px - r * 0.9, py - r * 0.9, r * 1.8, r * 1.8);
  else if (shape === `hex`) { for (let k = 0; k < 6; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 3, qx = px + r * 1.15 * Math.cos(a), qy = py + r * 1.15 * Math.sin(a); if (k) x.lineTo(qx, qy); else x.moveTo(qx, qy); } x.closePath(); }
  else x.arc(px, py, r, 0, 6.2832);
}
/* the same shapes, small, beside a word in the Show panel and the key (a shape, never a bare colored dot) */
function CxUsmShape({ shape, color, line }) {
  const c = color || `currentColor`;
  if (line) return <svg className="usm-glyph" width="26" height="12" viewBox="0 0 26 12" aria-hidden="true"><line x1="1" y1="6" x2="25" y2="6" stroke="currentColor" strokeWidth={line === `lead` ? 3 : 1.6} strokeDasharray={line === `appointed` ? `5 4` : line === `oversees` ? `1 4` : undefined} strokeLinecap="round" /></svg>;
  return (
    <svg className="usm-glyph" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      {shape === `diamond` ? <path d="M8 1.5L13.5 8L8 14.5L2.5 8Z" fill={c} /> : shape === `square` ? <rect x="3" y="3" width="10" height="10" fill={c} /> : shape === `hex` ? <path d="M8 1.6L13.6 4.8V11.2L8 14.4L2.4 11.2V4.8Z" fill="none" stroke={c} strokeWidth="1.8" /> : shape === `ring` ? <circle cx="8" cy="8" r="5.6" fill="none" stroke={c} strokeWidth="1.8" /> : <circle cx="8" cy="8" r="5" fill={c} />}
    </svg>
  );
}

/* The details sheet: on a computer it sits to the right of the map; on a phone it opens part way up, pulls up to near the top, and
   swipes down to close (the kit's sheet, vendor/relationship-map-kit/map/sheet.js). It also closes with Done, a tap on the map, and
   the back gesture (handled by the page). */
function CX_UsMapSheet({ info, phone, still, onClose, onPick, onProfile, onSolo, soloOn, onIndex, sheetRef, onPeek, onMove, fresh }) {
  const bodyRef = u.useRef(null);
  const [all, setAll] = u.useState({});
  u.useEffect(() => { setAll({}); if (bodyRef.current) bodyRef.current.scrollTop = 0; }, [info.name]);
  u.useEffect(() => {
    const el = sheetRef.current; if (!el || !phone) return undefined;
    const SH = { p: 0, peek: 0, full: 0, raf: 0 };
    const stage = () => (el.parentElement ? el.parentElement.clientHeight : innerHeight);
    const nat = () => { const h = el.style.height, t = el.style.transform; el.style.height = `auto`; el.style.transform = ``; const v = el.offsetHeight; el.style.height = h; el.style.transform = t; return v; };
    const apply = (p) => {
      SH.p = p; el.style.height = `${Math.round(Math.max(p, SH.peek))}px`; el.style.transform = p < SH.peek ? `translateY(${(SH.peek - p).toFixed(1)}px)` : ``;
      if (bodyRef.current) bodyRef.current.style.overflowY = p >= SH.full - 1 ? `auto` : `hidden`;
      el.dataset.p = String(Math.round(p));
      if (onMove) onMove();   // the names on the map are placed again, so none sits under the sheet
    };
    const detents = () => { const n = nat(), H = stage(); SH.full = Math.round(Math.max(160, Math.min(H - Math.max(88, H * 0.25), n))); SH.peek = Math.round(Math.min(SH.full, n, Math.max(260, H * 0.48))); };
    const stop = () => { if (SH.raf) cancelAnimationFrame(SH.raf); SH.raf = 0; };
    const glide = (to, then) => {
      stop(); const from = SH.p, d = to - from;
      if (still || Math.abs(d) < 1) { apply(to); if (then) then(); return; }
      const ms = Math.max(180, Math.min(420, Math.abs(d) * 1.4)), t0 = performance.now();
      const step = (now) => { const k = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - k, 4); apply(from + d * e); if (k < 1) SH.raf = requestAnimationFrame(step); else { SH.raf = 0; if (then) then(); } };
      SH.raf = requestAnimationFrame(step);
    };
    detents(); apply(SH.peek); onPeek(SH.peek);
    let st = null;
    const ts = (e) => {
      if (e.touches.length > 1) { st = null; return; }
      const body = bodyRef.current, inBody = !!(body && body.contains(e.target));
      if (!inBody || body.scrollTop <= 0 || SH.p < SH.full - 1) st = { y0: e.touches[0].clientY, p0: SH.p, on: !1, inBody, top: !!e.target.closest(`.usm-sheet-top`) && !e.target.closest(`button, a`), hist: [[e.timeStamp, SH.p]] };
    };
    const tm = (e) => {
      if (!st) return;
      const y = e.touches[0].clientY, dy = y - st.y0;
      if (!st.on) {
        if (Math.abs(dy) < 8) return;
        if (st.inBody && dy < 0 && SH.p >= SH.full - 1) { st = null; return; }   // already pulled up: an upward drag scrolls the text
        st.on = !0; st.y0 += dy > 0 ? 8 : -8; st.p0 = SH.p; stop();
      }
      e.preventDefault();
      let p = st.p0 - (y - st.y0); if (p > SH.full) p = SH.full + (p - SH.full) * 0.22; if (p < 0) p = 0;
      apply(p); st.hist.push([e.timeStamp, p]); if (st.hist.length > 6) st.hist.shift();
    };
    const te = (e) => {
      if (!st) return;
      const s0 = st; st = null;
      if (!s0.on) { if (s0.top && SH.full > SH.peek) glide(SH.p >= SH.full - 1 ? SH.peek : SH.full); return; }
      const h = s0.hist, a = h[0], b = h[h.length - 1], rest = (e.timeStamp || b[0]) - b[0], v = rest > 90 ? 0 : (b[1] - a[1]) / Math.max(8, b[0] - a[0]);
      if (SH.p < SH.peek * 0.62 || v < -0.55) glide(0, onClose);
      else if (v > 0.45 || SH.p > (SH.peek + SH.full) / 2) glide(SH.full);
      else glide(SH.peek);
    };
    el.addEventListener(`touchstart`, ts, { passive: !0 });
    el.addEventListener(`touchmove`, tm, { passive: !1 });
    el.addEventListener(`touchend`, te); el.addEventListener(`touchcancel`, te);
    return () => { stop(); el.removeEventListener(`touchstart`, ts); el.removeEventListener(`touchmove`, tm); el.removeEventListener(`touchend`, te); el.removeEventListener(`touchcancel`, te); };
  }, [phone, info.name, still]);
  const CAP = 12;
  return (
    <aside className={`usm-sheet ${fresh ? `usm-fresh` : ``}`} ref={sheetRef} aria-labelledby="usm-sheet-h" data-phone={phone ? `1` : `0`}>
      <div className="usm-sheet-top">
        {phone && <span className="usm-grab" aria-hidden="true" />}
        <p className="usm-kicker">{info.kicker}</p>
        <button type="button" className="usm-done" onClick={onClose}>Done</button>
      </div>
      <div className="usm-sheet-body" ref={bodyRef}>
        <h2 id="usm-sheet-h" className="usm-name">{cxUsmDot(info.name)}</h2>
        <p className="usm-sent">{info.sentence}</p>
        <p className="usm-fact">{info.fact}</p>
        {info.lists.map((L) => (
          <section key={L.title} className="usm-list">
            <h3>{L.title} <small>{L.rows.length}</small></h3>
            <ul>
              {(all[L.title] ? L.rows : L.rows.slice(0, CAP)).map((r, k) => (
                <li key={`${r.name}-${k}`}>{r.i !== null && r.i !== undefined ? <button type="button" onClick={() => onPick(r.i)}><span>{r.name}</span>{r.sub && <small>{r.sub}</small>}</button> : <p><span>{r.name}</span>{r.sub && <small>{r.sub}</small>}</p>}</li>
              ))}
            </ul>
            {L.rows.length > CAP && !all[L.title] && <button type="button" className="usm-more" onClick={() => setAll({ ...all, [L.title]: !0 })}>{`Show all ${L.rows.length}`}</button>}
          </section>
        ))}
        {info.src && <p className="usm-src"><span>From </span><a href={info.src.url} target="_blank" rel="noreferrer">{info.src.label}<span className="sp-ext"> (opens in a new tab)</span></a><span>.</span></p>}
      </div>
      <div className="usm-acts">
        <button type="button" className="usm-btn usm-pri" onClick={onProfile}>Open profile</button>
        <button type="button" className="usm-btn" aria-pressed={soloOn} onClick={onSolo}>{soloOn ? `Show everything` : `Solo`}</button>
        <button type="button" className="usm-btn" onClick={onIndex}>Explore in Index</button>
      </div>
    </aside>
  );
}

/* The United States graph: the map is the screen (at least 90% of it), with the controls floating over it and the details in a sheet.
   phone: People > Graph on the phone (a full-screen layer, onExit goes back to People). Desktop: the United States page, with the
   left menu Network, People, Votes by topic. */
function CX_UsMap({ phone, onExit }) {
  const [lang] = useCxLang();
  const [data, setData] = u.useState(CX_US.v);
  const [file, setFile] = u.useState(CX_USM.file);
  const [load, setLoad] = u.useState(CX_US.v && CX_USM.p ? `ready` : `loading`);
  u.useEffect(() => { let live = !0; Promise.all([cxUsLoad(), cxUsMapPosLoad()]).then(([d, f]) => { if (!live) return; setData(d); setFile(f); setLoad(d ? `ready` : `none`); }); return () => { live = !1; }; }, []);
  const g = CX_US.graph;
  const M = u.useMemo(() => (g && data ? cxUsMapModel(data, g) : null), [g, data]);
  const [home, setHome] = u.useState(null);
  u.useEffect(() => { if (!M || home) return undefined; const t = setTimeout(() => setHome(cxUsMapHome(g, M, file)), 30); return () => clearTimeout(t); }, [M, file]);
  const [page, setPage] = u.useState(`network`);
  const [view, setView] = u.useState(`sky`);
  const [sel, setSel] = u.useState(null);
  const [sheet, setSheet] = u.useState(!1);
  const [q, setQ] = u.useState(``);
  const [searchOn, setSearchOn] = u.useState(!phone);
  const [panel, setPanel] = u.useState(!1);
  const [show, setShow] = u.useState({ people: !0, committees: !0, agencies: !0, courts: !0 });
  const [lines, setLines] = u.useState({ seat: !0, lead: !0, appointed: !0, oversees: !0 });
  const [chamber, setChamber] = u.useState({ senate: !0, house: !0 });
  const [stateF, setStateF] = u.useState(``);
  const [solo, setSolo] = u.useState(null);   // { spec, label, keep }
  const [indexAt, setIndexAt] = u.useState(null);
  const [say, setSay] = u.useState(``);
  const [motion, setMotion] = u.useState(() => {
    try { const v = globalThis.localStorage && globalThis.localStorage.getItem(`cx-us-motion`); if (v === `still` || v === `calm` || v === `live`) return v; } catch (e) { /* no storage: the default */ }
    return phone || cxUsmLess() ? `still` : `calm`;
  });
  const chooseMotion = (m) => { setMotion(m); try { globalThis.localStorage.setItem(`cx-us-motion`, m); } catch (e) { /* a private window keeps it for this visit */ } };
  const still = motion === `still` || cxUsmLess();
  const rootRef = u.useRef(null), cvRef = u.useRef(null), topRef = u.useRef(null), menuRef = u.useRef(null), soloRef = u.useRef(null), sheetRef = u.useRef(null), searchRef = u.useRef(null), stageRef = u.useRef(null), ctlRef = u.useRef(null);
  const S = u.useRef({ T: null, W: 0, H: 0, dpr: 1, pos: null, sim: null, raf: 0, flow: null, drag: null, cursor: null, t0: 0, wc: new Map(), fitted: !1, userMoved: !1, peek: 0, zoom: null, csel: null });
  const sky = page === `network` && view === `sky`;

  // what the drawing needs to know, read fresh each frame
  const vis = u.useCallback((i) => {
    const n = g.nodes[i], m = M.nodes[i];
    if (solo && !solo.keep.has(i)) return !1;
    if (m.kind === `hub`) return !0;
    if (m.kind === `person` && !show.people) return !1;
    if (m.kind === `committee` && !show.committees) return !1;
    if (m.kind === `agency` && !show.agencies) return !1;
    if (m.kind === `court` && !show.courts) return !1;
    if ((n.kind === `member` || n.kind === `committee`) && (n.group === `senate` || n.group === `house`) && !chamber[n.group]) return !1;
    return !0;
  }, [g, M, solo, show, chamber]);
  const dimF = u.useCallback((i) => !!stateF && g.nodes[i].kind === `member` && g.nodes[i].m.state !== stateF, [g, stateF]);
  const st = u.useRef({});
  st.current = { sel, vis, dimF, lines, motion, still, solo, stateF, phone, sheet, lang };

  // neighbors of the focus that are shown, with the kind of line to each
  const nbOf = (i) => {
    const out = [];
    g.adj[i].forEach((ei) => { const l = M.links[ei], o = l.a === i ? l.b : l.a; if (!st.current.vis(o)) return; if (l.line !== `part` && !st.current.lines[l.line]) return; out.push({ o, line: l.line }); });
    return out;
  };

  // ---- positions: the settled home, a Solo layout, and (Calm, Live) the live physics
  u.useEffect(() => {
    if (!home) return;
    const s = S.current;
    if (!s.pos) s.pos = home.map((p) => ({ x: p[0], y: p[1] }));
  }, [home]);
  const targetOf = u.useRef(null);
  u.useEffect(() => {   // Solo: the group forms on its own (the kit's solo), then everything glides there; leaving Solo glides back home
    const s = S.current; if (!home || !s.pos) return;
    if (s.sim) { s.sim.stop(); s.sim = null; }
    let tgt;
    if (solo) {
      const from = s.pos.map((p) => [p.x, p.y]);
      const R = cxUsMapSim(M, CXD3, { keep: solo.keep, from, pre: 220 });
      tgt = new Map(R.nodes.map((n) => [n.i, [n.x, n.y]]));
    } else tgt = new Map(home.map((p, i) => [i, p]));
    targetOf.current = tgt;
    if (still) { tgt.forEach((p, i) => { s.pos[i].x = p[0]; s.pos[i].y = p[1]; }); s.flow = null; }
    else s.flow = { t0: performance.now(), dur: 860, items: [...tgt].map(([i, p]) => ({ p: s.pos[i], x0: s.pos[i].x, y0: s.pos[i].y, x1: p[0], y1: p[1] })) };
    if (s.fitted) fit(!still, solo ? [...solo.keep] : null);
    request();
  }, [solo, home]);
  u.useEffect(() => {   // Calm and Live: the physics keeps running gently from where everything is; Still: nothing moves by itself
    const s = S.current; if (!home || !s.pos) return undefined;
    if (s.sim) { s.sim.stop(); s.sim = null; }
    if (!still && sky) {
      const R = cxUsMapSim(M, CXD3, { keep: solo ? solo.keep : null, objs: s.pos, pre: 0 });
      R.sim.alpha(0.02).alphaTarget(motion === `live` ? 0.012 : 0);
      s.sim = R.sim;
      request();
    }
    return () => { if (s.sim) { s.sim.stop(); s.sim = null; } };
  }, [motion, still, solo, home, sky]);

  // ---- drawing
  const measure = (text, font) => {
    const s = S.current, key = font + `|` + text;
    let w = s.wc.get(key);
    if (w == null) { const x = cvRef.current.getContext(`2d`); x.font = font; w = x.measureText(text).width; s.wc.set(key, w); }
    return w;
  };
  const blockedBoxes = () => {
    const cv = cvRef.current, root = rootRef.current; if (!cv || !root) return [];
    const r0 = cv.getBoundingClientRect();
    return [...root.querySelectorAll(`.usm-float, .usm-sheet`)].map((el) => el.getBoundingClientRect()).filter((r) => r.width && r.height).map((r) => ({ x: r.left - r0.left - 4, y: r.top - r0.top - 4, w: r.width + 8, h: r.height + 8 }));
  };
  const draw = (now) => {
    const s = S.current, cv = cvRef.current;
    if (!cv || !s.W || !s.pos || !s.T) return !1;
    const c = st.current, x = cv.getContext(`2d`), T = s.T, k = T.k, P = s.pos;
    let anim = !1;
    if (s.flow) {
      const q2 = Math.min(1, (now - s.flow.t0) / s.flow.dur), e = q2 < 0.5 ? 4 * q2 * q2 * q2 : 1 - Math.pow(-2 * q2 + 2, 3) / 2;
      s.flow.items.forEach((o) => { o.p.x = o.x0 + (o.x1 - o.x0) * e; o.p.y = o.y0 + (o.y1 - o.y0) * e; });
      if (q2 < 1) anim = !0; else s.flow = null;
    } else if (s.sim && (s.sim.alpha() > s.sim.alphaMin() || s.drag)) { s.sim.tick(); anim = !0; }
    x.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
    x.fillStyle = cxUsmIsland(); x.fillRect(0, 0, s.W, s.H);
    const X = (i) => T.x + k * P[i].x, Y = (i) => T.y + k * P[i].y;
    const zr = Math.max(0.8, Math.min(2.2, Math.pow(k, 0.6)));
    const sr = (i) => { const m = M.nodes[i]; return m.kind === `hub` ? m.r * k : m.r * zr; };
    const F = c.sel !== null && c.vis(c.sel) ? c.sel : null, nb = F !== null ? nbOf(F) : null, on = F !== null ? new Set([F, ...nb.map((z) => z.o)]) : null;
    const quiet = c.phone && F === null && !c.solo;
    const pr = F !== null && !c.still ? Math.min(1, (now - s.t0) / 700) : 1; if (pr < 1) anim = !0;
    const live = c.motion === `live` && !c.still; if (live) anim = !0;
    const N = M.nodes.length, shown = new Uint8Array(N);
    for (let i = 0; i < N; i++) shown[i] = c.vis(i) ? 1 : 0;
    // branch hubs: a faint halo and a ring in their color
    M.slots.industries.slice(0, 4).forEach((i) => {
      if (!shown[i]) return; const m = M.nodes[i], col = CX_USM_COLORS[m.branch], r = sr(i), a = on && !on.has(i) ? 0.3 : 1;
      x.globalAlpha = 0.05 * a; x.fillStyle = col; x.beginPath(); x.arc(X(i), Y(i), r * 2.1, 0, 6.2832); x.fill();
      x.globalAlpha = 0.6 * a; x.strokeStyle = col; x.lineWidth = 1.6; x.beginPath(); x.arc(X(i), Y(i), r, 0, 6.2832); x.stroke();
    });
    // what each thing belongs to: faint lines, so the clouds read as groups
    x.globalAlpha = on ? 0.03 : quiet ? 0.045 : 0.075; x.strokeStyle = `#fff`; x.lineWidth = 1; x.beginPath();
    for (let i = 0; i < N; i++) { const p = M.parent[i]; if (p < 0 || !shown[i] || !shown[p]) continue; x.moveTo(X(i), Y(i)); x.lineTo(X(p), Y(p)); }
    x.stroke();
    // the focus: a line to each connection, drawn out from it
    if (F !== null) {
      const fx = X(F), fy = Y(F);
      [[`part`, 0.38, 1, [2, 4]], [`seat`, 0.62, 1.2, []], [`appointed`, 0.6, 1.2, [6, 4]], [`lead`, 0.92, 2.2, []]].forEach(([kind, a, w, dash]) => {
        x.globalAlpha = a; x.strokeStyle = `#f4f2ee`; x.lineWidth = w; x.setLineDash(dash); x.beginPath();
        nb.forEach((z, j) => { if (z.line !== kind) return; const t = pr >= 1 ? 1 : Math.max(0, Math.min(1, pr * 1.5 - j * 0.004)); if (t <= 0) return; x.moveTo(fx, fy); x.lineTo(fx + (X(z.o) - fx) * t, fy + (Y(z.o) - fy) * t); });
        x.stroke();
      });
      x.setLineDash([]);
      if (live && pr >= 1) { x.fillStyle = `#f4f2ee`; nb.slice(0, 160).forEach((z, j) => { const t = (now / 2400 + j * 0.13) % 1; x.globalAlpha = 0.85 * (1 - Math.abs(t - 0.5) * 2) + 0.1; x.beginPath(); x.arc(fx + (X(z.o) - fx) * t, fy + (Y(z.o) - fy) * t, 2.2, 0, 6.2832); x.fill(); }); }
    }
    // the things themselves, people under the rest
    const order = [`person`, `agency`, `court`, `committee`];
    order.forEach((kind) => {
      for (let i = 0; i < N; i++) {
        const m = M.nodes[i]; if (m.kind !== kind || !shown[i]) continue;
        const px = X(i), py = Y(i); if (px < -30 || py < -30 || px > s.W + 30 || py > s.H + 30) continue;
        let a = (on && !on.has(i)) || c.dimF(i) ? 0.13 : quiet ? 0.7 : 1;
        if (live && !on) a *= 0.84 + 0.16 * Math.sin(now / 1700 + i * 2.39996);
        x.globalAlpha = a; const col = CX_USM_COLORS[m.branch];
        cxUsmPath(x, m.shape, px, py, sr(i));
        if (m.shape === `hex`) { x.fillStyle = col; x.globalAlpha = a * 0.28; x.fill(); x.globalAlpha = a; x.strokeStyle = col; x.lineWidth = 1.6; x.stroke(); }
        else { x.fillStyle = col; x.fill(); }
      }
    });
    // rings: the focus, and the keyboard's place
    [[F, `#f4f2ee`, 2.2], [s.cursor, `#f1b083`, 2]].forEach(([i, col, w]) => { if (i === null || i === undefined || !shown[i]) return; x.globalAlpha = 1; x.strokeStyle = col; x.lineWidth = w; x.beginPath(); x.arc(X(i), Y(i), (M.nodes[i].kind === `hub` ? sr(i) : sr(i) * 1.35) + 4, 0, 6.2832); x.stroke(); });
    // names, by priority, never overlapping (larger with the phone's Larger text)
    const ts = rootRef.current && rootRef.current.closest(`.cxm-large`) ? 1.15 : 1;
    const cand = [], seen = new Set();
    const add = (i, pri, style) => {
      if (i === null || i === undefined || seen.has(i) || !shown[i]) return; seen.add(i);
      const px = X(i), py = Y(i); if (px < -40 || py < -20 || px > s.W + 40 || py > s.H + 20) return;
      const m = M.nodes[i], f = (w, z) => `${w} ${Math.round(z * ts)}px ${CX_USM_FONT}`, z = (n) => Math.round(n * ts);
      let L;
      if (style === `hub`) L = [{ text: cxUsmTr(m.label), font: f(700, 16), size: z(16) }, { text: cxUsmTr(m.totalText), font: f(500, 12), size: z(12) }];
      else if (style === `committee`) L = [{ text: `${m.label} · ${m.total}`, font: f(600, 12), size: z(12) }];
      else if (style === `focus`) L = [{ text: m.kind === `hub` ? cxUsmTr(m.label) : m.label, font: f(800, 15), size: z(15) }].concat(m.kind === `hub` || m.kind === `committee` ? [{ text: cxUsmTr(m.totalText), font: f(500, 12), size: z(12) }] : []);
      else L = [{ text: m.kind === `hub` ? cxUsmTr(m.label) : m.label, font: f(style === `near` ? 600 : 500, 12), size: z(12) }];
      cand.push({ i, x: px, y: py, rr: sr(i), pri, center: m.kind === `hub` && style !== `near`, lines: L, style, dim: on && !on.has(i) });
    };
    if (F !== null) add(F, 100, `focus`);
    if (s.cursor !== null) add(s.cursor, 98, `near`);
    M.slots.industries.slice(0, 4).forEach((i) => add(i, 95, `hub`));
    if (F !== null) nb.forEach((z, j) => add(z.o, 60 - Math.min(20, j * 0.05) + (M.nodes[z.o].kind === `committee` ? 4 : 0), `near`));
    if (c.stateF) for (let i = 0; i < N; i++) if (g.nodes[i].kind === `member` && g.nodes[i].m.state === c.stateF) add(i, 70, `near`);
    M.slots.industries.slice(4).forEach((i) => add(i, F !== null ? 30 : 50, `committee`));
    const many = c.solo ? 0 : (s.kFit || 0.8) * 1.6;
    if (k > many && F === null) for (let i = 0; i < N; i++) { const m = M.nodes[i]; if (m.kind === `hub` || m.kind === `committee`) continue; add(i, m.kind === `court` ? 22 : m.kind === `agency` && !g.nodes[i].a.parent_id ? 20 : 12 + m.r, `far`); }
    const boxes = cxUsMapLabels(cand, measure, s.W, s.H, 90, blockedBoxes());
    x.textBaseline = `middle`; x.lineJoin = `round`;
    boxes.forEach((b) => {
      const cd = cand.find((z) => z.i === b.i);
      let y = b.y + 1.5;
      b.lines.forEach((l) => {
        y += l.size * 0.6;
        x.font = l.font; x.textAlign = b.align === `center` ? `center` : `left`;
        const tx = b.align === `center` ? b.x + b.w / 2 : b.x + 3;
        x.globalAlpha = cd && cd.dim ? 0.5 : 1; x.lineWidth = 4; x.strokeStyle = cxUsmIsland(); x.strokeText(l.text, tx, y);
        x.fillStyle = cd && (cd.style === `far`) ? `#e1ded8` : `#f4f2ee`; x.fillText(l.text, tx, y);
        y += l.size * 0.6;
      });
    });
    x.globalAlpha = 1;
    cv.cxMap = { labels: boxes.map((b) => ({ i: b.i, name: g.nodes[b.i].name, text: b.lines.map((l) => l.text).join(` `), x: b.x, y: b.y, w: b.w, h: b.h })), focus: F === null ? null : g.nodes[F].name, near: F === null ? [] : nb.map((z) => z.o), shown: shown.reduce((t, v) => t + v, 0), k, frames: (s.frames = (s.frames || 0) + 1), tx: T.x, ty: T.y, rings: M.slots.industries.slice(0, 4).filter((i) => shown[i]).map((i) => [X(i), Y(i), sr(i) + 8]), motion: c.motion, still: c.still, pts: () => { const o = []; for (let i = 0; i < N; i++) if (shown[i]) o.push([X(i), Y(i)]); return o; }, at: (name) => { const n = g.nodes.find((z) => z.name === name); return n && s.pos ? [T.x + k * P[n.i].x, T.y + k * P[n.i].y] : null; } };
    return anim;
  };
  const request = () => { const s = S.current; if (!s.raf) s.raf = requestAnimationFrame((now) => { s.raf = 0; if (document.hidden) return; if (draw(now)) request(); }); };

  // ---- fitting to the screen, leaving room for the floating controls and the sheet
  const pads = () => {
    const root = rootRef.current; if (!root) return [16, 16, 16, 16];
    const r0 = root.getBoundingClientRect(), b = (el) => (el ? el.getBoundingClientRect() : null);
    const top = Math.max(b(topRef.current) ? b(topRef.current).bottom - r0.top : 0, b(soloRef.current) ? b(soloRef.current).bottom - r0.top : 0) + 12;
    const left = !phone && b(menuRef.current) ? b(menuRef.current).right - r0.left + 16 : 16;
    const sh = st.current.sheet && sheetRef.current ? sheetRef.current : null;
    const right = (!phone && sh ? sh.offsetWidth + 28 : 16);
    const bottom = (phone && sh ? S.current.peek || sh.offsetHeight : 0) + (b(ctlRef.current) ? r0.bottom - b(ctlRef.current).top + 10 : 70);
    return [top, right, bottom, left];
  };
  const fit = (anim, list) => {
    const s = S.current; if (!s.zoom || !s.W || !s.pos) return;
    const tgt = targetOf.current, ids = list || [...Array(M.nodes.length).keys()].filter((i) => st.current.vis(i));
    if (!ids.length) return;
    const pts = ids.map((i) => { const p = tgt && tgt.get(i) ? tgt.get(i) : [s.pos[i].x, s.pos[i].y]; return { x: p[0], y: p[1], r: M.nodes[i].r + (M.nodes[i].kind === `hub` ? 18 : 6) }; });
    const f = cxUsmFit(cxUsmBox(pts), s.W, s.H, pads(), ids.length < 4 ? 2.4 : 3.2);
    const t = CXD3.zoomIdentity.translate(f.x, f.y).scale(f.k);
    if (!list || (st.current.solo && list.length === st.current.solo.keep.size)) s.kFit = f.k;
    if (anim && !st.current.still) s.csel.transition().duration(700).call(s.zoom.transform, t); else s.csel.call(s.zoom.transform, t);
  };
  const focusFit = (i) => { const nb = nbOf(i).map((z) => z.o); fit(!0, [i, ...nb.slice(0, 80)]); };

  // ---- the canvas: size, d3 zoom (wheel, drag, pinch), the glide after a flick
  u.useEffect(() => {
    const cv = cvRef.current, box = stageRef.current, s = S.current;
    if (!cv || !box || !home || !sky) return undefined;
    const resize = () => {
      const W = box.clientWidth, H = box.clientHeight, dpr = Math.min(2, globalThis.devicePixelRatio || 1); if (!W || !H) return;
      // a new canvas (back from a text view) starts at the browser's default size, so its own size is compared too
      if (W !== s.W || H !== s.H || dpr !== s.dpr || cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { s.W = W; s.H = H; s.dpr = dpr; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
      if (!s.fitted) { s.fitted = !0; fit(!1, solo ? [...solo.keep] : null); if (st.current.sel !== null) focusFit(st.current.sel); }
      request();
    };
    const hitAt = (px, py) => {
      const T = s.T; if (!T || !s.pos) return null;
      const wx = (px - T.x) / T.k, wy = (py - T.y) / T.k, zr = Math.max(0.8, Math.min(2.2, Math.pow(T.k, 0.6)));
      let best = null, bd = 1e9;
      for (let i = 0; i < M.nodes.length; i++) { const m = M.nodes[i]; if (m.kind === `hub` || !st.current.vis(i)) continue; const d = Math.hypot(s.pos[i].x - wx, s.pos[i].y - wy); if (d < bd) { bd = d; best = i; } }
      if (best !== null && bd * T.k <= Math.max(14, M.nodes[best].r * zr + 6)) return best;
      for (const i of M.slots.industries.slice(0, 4)) if (st.current.vis(i) && Math.hypot(s.pos[i].x - wx, s.pos[i].y - wy) <= M.nodes[i].r + 6 / T.k) return i;
      return null;
    };
    s.hitAt = hitAt;
    const zoom = CXD3.zoom().scaleExtent([0.06, 14])
      .filter((ev) => {
        if (ev.type === `wheel`) return !ev.button;
        if (ev.button || ev.ctrlKey) return !1;
        if (ev.type === `mousedown` || (ev.type === `touchstart` && ev.touches.length === 1)) { const r = cv.getBoundingClientRect(), pp = ev.touches ? ev.touches[0] : ev; return hitAt(pp.clientX - r.left, pp.clientY - r.top) === null; }
        return !0;
      })
      .on(`zoom`, (e) => { if (e.sourceEvent) s.userMoved = !0; s.T = e.transform; cv.setAttribute(`data-zoom`, e.transform.k.toFixed(3)); request(); });
    // the glide: a flick keeps the map moving and slowing, like a puck on ice; a drag that comes to rest before lifting does not glide
    const MOM = { hist: [], raf: 0, k0: 1 };
    const momStop = () => { if (MOM.raf) cancelAnimationFrame(MOM.raf); MOM.raf = 0; };
    zoom.on(`start.mom`, (e) => { if (!e.sourceEvent) return; momStop(); MOM.hist = []; MOM.k0 = e.transform.k; })
      .on(`zoom.mom`, (e) => { if (!e.sourceEvent) return; const t = e.sourceEvent.timeStamp; MOM.hist.push([t, e.transform.x, e.transform.y, e.transform.k]); while (MOM.hist.length > 2 && t - MOM.hist[0][0] > 100) MOM.hist.shift(); })
      .on(`end.mom`, (e) => {
        if (!e.sourceEvent) return; const h = MOM.hist; MOM.hist = [];
        if (st.current.still || h.length < 2) { cv.dataset.glide = `none`; return; }
        const a = h[0], b = h[h.length - 1];
        if (Math.abs(b[3] - MOM.k0) > 1e-3) { cv.dataset.glide = `pinch`; return; }
        if (e.sourceEvent.timeStamp - b[0] > 100) { cv.dataset.glide = `rested`; return; }
        const dt = Math.max(8, b[0] - a[0]); let vx = (b[1] - a[1]) / dt, vy = (b[2] - a[2]) / dt; const sp = Math.hypot(vx, vy);
        if (sp < 0.15) { cv.dataset.glide = `slow`; return; }
        if (sp > 3.5) { vx *= 3.5 / sp; vy *= 3.5 / sp; }
        cv.dataset.glide = `glide`;
        let last = performance.now();
        const step = (now) => { const d = Math.min(40, now - last); last = now; const f = Math.pow(0.955, d / 16); vx *= f; vy *= f; if (Math.hypot(vx, vy) < 0.03) { MOM.raf = 0; return; } s.csel.call(zoom.translateBy, (vx * d) / s.T.k, (vy * d) / s.T.k); MOM.raf = requestAnimationFrame(step); };
        MOM.raf = requestAnimationFrame(step);
      });
    const csel = CXD3.select(cv); csel.call(zoom).on(`dblclick.zoom`, null);
    s.zoom = zoom; s.csel = csel; s.momStop = momStop;
    if (!s.T) s.T = CXD3.zoomIdentity;
    const ro = globalThis.ResizeObserver ? new globalThis.ResizeObserver(resize) : null;
    if (ro) ro.observe(box); else globalThis.addEventListener(`resize`, resize);
    resize();
    // tap focuses, hold opens the details, drag moves one thing (the kit's pointer code)
    const HOLD = 650;
    let hold = null, drag = null, dragMoved = !1, pend = null;
    const pd = (e) => {
      if (e.button) return; const r = cv.getBoundingClientRect(), i = hitAt(e.clientX - r.left, e.clientY - r.top); if (i === null) return;
      drag = { i, x: e.clientX, y: e.clientY, moved: !1, id: e.pointerId };
      hold = { i, x: e.clientX, y: e.clientY, fired: !1, t: setTimeout(() => { hold.fired = !0; pick(i, !0); }, HOLD) };
    };
    const pm = (e) => {
      if (hold && Math.hypot(e.clientX - hold.x, e.clientY - hold.y) > 7) { clearTimeout(hold.t); hold = null; }
      if (!drag) return;
      if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 6) { drag.moved = !0; s.drag = drag; try { cv.setPointerCapture(drag.id); } catch (er) { /* not every pointer can be captured */ } if (s.sim) s.sim.alphaTarget(0.22); if (s.flow) s.flow = null; }
      if (drag.moved) {
        const r = cv.getBoundingClientRect(), wx = (e.clientX - r.left - s.T.x) / s.T.k, wy = (e.clientY - r.top - s.T.y) / s.T.k, p = s.pos[drag.i];
        if (s.sim) { p.fx = wx; p.fy = wy; } else { p.x = wx; p.y = wy; }
        cv.style.cursor = `grabbing`; request();
      }
    };
    const pu = () => {
      if (hold) clearTimeout(hold.t);
      if (drag && drag.moved) { dragMoved = !0; const p = s.pos[drag.i]; p.fx = null; p.fy = null; if (s.sim) s.sim.alphaTarget(st.current.motion === `live` ? 0.012 : 0); cv.style.cursor = ``; }
      drag = null; s.drag = null;
    };
    const click = (e) => {
      if (dragMoved) { dragMoved = !1; hold = null; return; }
      if (hold && hold.fired) { hold = null; return; }
      hold = null;
      const r = cv.getBoundingClientRect(), i = hitAt(e.clientX - r.left, e.clientY - r.top), c = st.current;
      if (i !== null) {
        if (pend) { clearTimeout(pend); pend = null; }
        if (c.phone && i === c.sel && !c.sheet) { pick(i, !0); return; }   // a second tap on the same one opens its details
        pick(i, !c.phone);
      } else if (c.sel !== null) {
        if (c.phone && c.sheet) setSheet(!1);   // a tap on the map: the sheet goes, the lines stay; tap again and everything clears
        else { setSel(null); setSheet(!1); }
      }
    };
    cv.addEventListener(`pointerdown`, pd); cv.addEventListener(`pointermove`, pm); cv.addEventListener(`pointerup`, pu); cv.addEventListener(`pointercancel`, pu); cv.addEventListener(`click`, click);
    const vis2 = () => { if (!document.hidden) request(); };
    document.addEventListener(`visibilitychange`, vis2);
    return () => {
      momStop(); if (ro) ro.disconnect(); else globalThis.removeEventListener(`resize`, resize);
      csel.on(`.zoom`, null); cv.removeEventListener(`pointerdown`, pd); cv.removeEventListener(`pointermove`, pm); cv.removeEventListener(`pointerup`, pu); cv.removeEventListener(`pointercancel`, pu); cv.removeEventListener(`click`, click);
      document.removeEventListener(`visibilitychange`, vis2); s.fitted = !1; s.zoom = null;
    };
  }, [home, sky, M]);
  u.useEffect(() => { request(); }, [sel, show, lines, chamber, stateF, motion, lang, sheet]);
  u.useEffect(() => { if (S.current.fitted) fit(!st.current.still); }, [show, chamber]);

  // ---- choosing something
  const pick = (i, open) => {
    const s = S.current; s.t0 = performance.now(); s.cursor = null;
    setSel(i); if (open) setSheet(!0);
    const n = g.nodes[i]; setSay([cxUsmDot(n.name), typeof cxUsWhere(n) === `string` ? cxUsmDot(cxUsWhere(n)) : ``]);
    if (page !== `network` || view !== `sky`) { setPage(`network`); setView(`sky`); }
    requestAnimationFrame(() => focusFit(i));
  };
  const clear = () => { setSel(null); setSheet(!1); S.current.cursor = null; request(); };

  // ---- the back gesture closes the open sheet or panel instead of leaving the page (the kit's history layers)
  const layer = sheet ? `sheet` : phone && panel ? `panel` : ``;
  const back = u.useRef({ pushed: ``, skip: 0 });
  u.useEffect(() => {
    const b = back.current;
    if (layer && !b.pushed) { try { globalThis.history.pushState({ cxUsm: layer }, ``, globalThis.location.href); b.pushed = layer; } catch (e) { /* a sandboxed page has no history */ } }
    else if (!layer && b.pushed) { b.pushed = ``; b.skip += 1; try { globalThis.history.back(); } catch (e) { b.skip = 0; } }
    else if (layer && b.pushed && b.pushed !== layer) b.pushed = layer;
  }, [layer]);
  u.useEffect(() => {
    const onPop = () => {
      const b = back.current;
      if (b.skip) { b.skip -= 1; return; }
      if (b.pushed) { const was = b.pushed; b.pushed = ``; if (was === `sheet`) setSheet(!1); else setPanel(!1); }
    };
    globalThis.addEventListener(`popstate`, onPop);
    return () => globalThis.removeEventListener(`popstate`, onPop);
  }, []);

  // ---- Solo
  const soloNode = (i) => { const n = g.nodes[i]; setSolo({ spec: { node: i }, label: n.id === `h:senate` || n.id === `h:house` ? M.nodes[i].label : n.name, keep: cxUsmSoloSet(g, M, { node: i }) }); };
  const soloPick = (v) => {
    if (!v) { setSolo(null); return; }
    const [kind, val] = [v.slice(0, 2), v.slice(2)];
    if (kind === `c:`) setSolo({ spec: { chamber: val }, label: val === `senate` ? `Senate` : `House`, keep: cxUsmSoloSet(g, M, { chamber: val }) });
    else if (kind === `s:`) setSolo({ spec: { state: val }, label: cxStateName(val), keep: cxUsmSoloSet(g, M, { state: val }) });
    else if (kind === `n:`) soloNode(+val);
    else if (kind === `a:`) {
      setSolo({ spec: { area: val, members: new Set() }, label: val, keep: new Set(), loading: !0 });
      cxUsVotesLoad().then((vd) => {
        if (!vd) { setSolo({ spec: { area: val, members: new Set() }, label: val, keep: new Set(), none: !0 }); return; }
        const members = cxUsmAreaMembers(vd, val), votes = (cxUsAreaList(vd).find((a) => a.area === val) || { votes: 0 }).votes;
        setSolo({ spec: { area: val, members }, label: val, keep: cxUsmSoloSet(g, M, { area: val, members }), votes });
      });
    }
    setSel(null); setSheet(!1);
  };
  const soloVal = !solo ? `` : solo.spec.chamber ? `c:${solo.spec.chamber}` : solo.spec.state ? `s:${solo.spec.state}` : solo.spec.area ? `a:${solo.spec.area}` : `n:${solo.spec.node}`;
  u.useEffect(() => { if (sel !== null && solo && !solo.keep.has(sel)) { setSel(null); setSheet(!1); } }, [solo]);

  // ---- keyboard: ] [ move, Enter select, Esc clear, S solo, arrows pan, + - zoom, 0 fit, / search
  const stops = () => {
    const s = S.current;
    if (sel !== null) return [sel, ...nbOf(sel).map((z) => z.o)];
    return M.slots.industries.filter((i) => st.current.vis(i));
  };
  const onCanvasKey = (e) => {
    const s = S.current, K = e.key; if (!s.zoom) return;
    if (K === `]` || K === `[`) {
      e.preventDefault(); const L = stops(); if (!L.length) return;
      let j = L.indexOf(s.cursor !== null ? s.cursor : sel); j = K === `]` ? (j + 1) % L.length : j <= 0 ? L.length - 1 : j - 1;
      s.cursor = L[j]; const n = g.nodes[L[j]]; setSay([cxUsmDot(n.name), L[j] === sel ? `Selected.` : `Press Enter to select.`]); request(); return;
    }
    if (K === `Enter` || K === ` `) { e.preventDefault(); if (s.cursor !== null && s.cursor !== sel) { pick(s.cursor, !0); return; } if (sel !== null) setSheet(!0); return; }
    if (K === `Escape`) { if (s.cursor !== null) { s.cursor = null; request(); return; } if (sheet) { setSheet(!1); return; } if (sel !== null) { clear(); return; } if (solo) setSolo(null); return; }
    if ((K === `s` || K === `S`) && !e.metaKey && !e.ctrlKey && !e.altKey) { const i = s.cursor !== null ? s.cursor : sel; if (i === null) return; e.preventDefault(); if (solo && solo.spec.node === i) setSolo(null); else soloNode(i); return; }
    const step = 60;
    if (K === `ArrowLeft` || K === `ArrowRight` || K === `ArrowUp` || K === `ArrowDown`) { e.preventDefault(); s.csel.call(s.zoom.translateBy, (K === `ArrowLeft` ? step : K === `ArrowRight` ? -step : 0) / s.T.k, (K === `ArrowUp` ? step : K === `ArrowDown` ? -step : 0) / s.T.k); return; }
    if (K === `+` || K === `=`) { e.preventDefault(); s.csel.call(s.zoom.scaleBy, 1.3); return; }
    if (K === `-` || K === `_`) { e.preventDefault(); s.csel.call(s.zoom.scaleBy, 1 / 1.3); return; }
    if (K === `0`) { e.preventDefault(); fit(!0); }
  };
  const onRootKey = (e) => {
    if (e.key === `/` && !(e.target.closest && e.target.closest(`input, select, textarea`))) { e.preventDefault(); setSearchOn(!0); setTimeout(() => searchRef.current && searchRef.current.focus(), 0); }
    else if (e.key === `Escape` && e.target === searchRef.current) { if (q) setQ(``); else e.target.blur(); }
    else if (e.key === `Escape` && !(e.target.closest && e.target.closest(`input, select, textarea, canvas`))) { if (sheet) setSheet(!1); else if (panel) setPanel(!1); }
  };
  // the phone's Show panel slides away when swiped down, like the sheet (the kit's swipeDown)
  const panelRef = u.useRef(null);
  u.useEffect(() => {
    const el = panelRef.current; if (!el || !phone || !panel) return undefined;
    let st0 = null;
    const body = () => el.querySelector(`.usm-panel-body`);
    const ts = (e) => { if (e.touches.length > 1) return; const b = body(); if (!b || !b.contains(e.target) || b.scrollTop <= 0) st0 = { y0: e.touches[0].clientY, dy: 0, on: !1, h: [[e.timeStamp, 0]] }; };
    const tm = (e) => { if (!st0) return; const dy = e.touches[0].clientY - st0.y0; if (!st0.on) { if (dy > 8) st0.on = !0; else if (dy < -8) { st0 = null; return; } else return; } e.preventDefault(); st0.dy = Math.max(0, dy - 8); el.style.transform = `translateY(${st0.dy}px)`; st0.h.push([e.timeStamp, st0.dy]); if (st0.h.length > 6) st0.h.shift(); };
    const te = (e) => { if (!st0) return; const s0 = st0; st0 = null; if (!s0.on) return; const a = s0.h[0], b = s0.h[s0.h.length - 1], v = (e.timeStamp || b[0]) - b[0] > 90 ? 0 : (b[1] - a[1]) / Math.max(8, b[0] - a[0]); if (s0.dy > 90 || v > 0.5) setPanel(!1); else el.style.transform = ``; };
    el.addEventListener(`touchstart`, ts, { passive: !0 }); el.addEventListener(`touchmove`, tm, { passive: !1 }); el.addEventListener(`touchend`, te); el.addEventListener(`touchcancel`, te);
    return () => { el.removeEventListener(`touchstart`, ts); el.removeEventListener(`touchmove`, tm); el.removeEventListener(`touchend`, te); el.removeEventListener(`touchcancel`, te); };
  }, [panel, phone]);
  // while the map is open, everything behind it is out of reach (keyboard and screen reader), so focus never lands on a control you cannot see
  u.useEffect(() => {
    const root = rootRef.current; if (!root) return undefined;
    const marked = [];
    for (let el = root; el && el.parentElement && el.id !== `root` && el !== document.body; el = el.parentElement) {
      [...el.parentElement.children].forEach((sib) => { if (sib === el || sib.hasAttribute(`inert`) || /^(SCRIPT|STYLE|NOSCRIPT)$/.test(sib.tagName) || (sib.classList && sib.classList.contains(`cx-notice`))) return; sib.setAttribute(`inert`, ``); marked.push(sib); });
    }
    return () => marked.forEach((sib) => sib.removeAttribute(`inert`));
  }, [load, !!home]);
  // the / key goes to search from anywhere on the page while the map is open (the kit does the same)
  u.useEffect(() => {
    const k = (e) => { if (e.key !== `/` || e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return; const t = e.target; if (t && t.closest && (t.closest(`input, select, textarea, [contenteditable]`) || (rootRef.current && rootRef.current.contains(t)))) return; e.preventDefault(); setPage(`network`); setSearchOn(!0); setTimeout(() => searchRef.current && searchRef.current.focus(), 0); };
    document.addEventListener(`keydown`, k);
    return () => document.removeEventListener(`keydown`, k);
  }, []);
  const zoomBy = (f) => { const s = S.current; if (s.zoom) s.csel.transition().duration(st.current.still ? 0 : 280).call(s.zoom.scaleBy, f); };
  const [full, setFull] = u.useState(!1);
  u.useEffect(() => { const f = () => setFull(!!document.fullscreenElement); document.addEventListener(`fullscreenchange`, f); return () => document.removeEventListener(`fullscreenchange`, f); }, []);
  const toggleFull = () => { try { if (document.fullscreenElement) document.exitFullscreen(); else if (rootRef.current && rootRef.current.requestFullscreen) rootRef.current.requestFullscreen(); } catch (e) { /* a browser that refuses keeps the window-sized map */ } };
  // refit when the sheet opens or closes, so what was picked stays in view beside it
  u.useEffect(() => { if (S.current.fitted && sel !== null && sky) requestAnimationFrame(() => focusFit(sel)); }, [sheet]);

  if (load === `loading` || (load === `ready` && !home)) return <section className={`usm ${phone ? `usm-phone` : `usm-desk`}`}><div className="usm-wait" role="status">{load === `loading` ? `Loading the federal record...` : `Arranging the map...`}</div></section>;
  if (!data || !g) return <section className={`usm ${phone ? `usm-phone` : `usm-desk`}`}><div className="usm-wait" role="status"><p>The United States graph needs the hosted site. It is not part of the offline file, because it loads a data file of under a megabyte.</p>{phone && onExit && <button type="button" className="usm-btn" onClick={onExit}>Back to People</button>}</div></section>;

  const cur = sel !== null ? g.nodes[sel] : null;
  const info = cur ? cxUsMapSheet(g, M, data, sel) : null;
  const needle = q.trim().toLowerCase();
  const results = needle.length >= 2 ? g.nodes.filter((n) => n.kind !== `hub` && (n.name + ` ` + (n.m ? cxStateName(n.m.state) : ``)).toLowerCase().includes(needle)).slice(0, 12) : [];
  const states = [...new Set(data.members.map((m) => m.state))].sort((a, b) => cxStateName(a).localeCompare(cxStateName(b)));
  const kindWord = (n) => (n.kind === `member` || n.kind === `judge` || n.kind === `president` || n.kind === `cabinet` ? (typeof cxUsWhere(n) === `string` ? cxUsWhere(n) : n.j ? n.j.title : ``) : n.kind === `committee` ? cxUsWhere(n) : n.kind === `court` ? cxUsWhere(n) : `Agency`);
  const visibleCount = sky ? M.nodes.filter((m) => vis(m.i)).length : 0;
  const counts = { people: M.slots.companies.length, committees: M.slots.industries.length - 4, agencies: M.nodes.filter((m) => m.kind === `agency`).length, courts: M.nodes.filter((m) => m.kind === `court`).length };
  const pulled = cxShortDate(cxDayET(Date.parse(data.retrieved_at)));
  const linkedLinks = cur ? cxUsLinks(g, cur.i) : [];
  const openLinked = () => { setPage(`network`); setView(`linked`); setSheet(!1); };
  const openIndex = () => { if (cur) setIndexAt({ ...cxUsmDoorOf(cur), id: cur.id, at: Date.now() }); setPage(`network`); setView(`index`); setSheet(!1); };
  const goPage = (p) => { setPage(p); setSheet(!1); setPanel(!1); };
  const visibleText = (n) => { const i = n.i; if (M.nodes[i].kind === `hub`) return !0; return vis(i); };
  const PILLS = [[`sky`, `Sky`], [`index`, `Index`], [`linked`, `Linked`], [`tree`, `Tree`]];
  const pills = <div className="usm-pills" role="group" aria-label="View">{PILLS.map(([id, t]) => <button key={id} type="button" aria-pressed={page === `network` && view === id} className={page === `network` && view === id ? `on` : ``} onClick={() => { setPage(`network`); setView(id); setSheet(!1); }}>{t}</button>)}</div>;
  const search = (
    <div className="usm-search">
      <label><span className="usm-sr">Find a person, committee, agency, or court</span>
        <input ref={searchRef} type="search" value={q} aria-keyshortcuts="/" onChange={(e) => setQ(e.target.value)} placeholder="Find someone" autoComplete="off" /></label>
      {!phone && <kbd aria-hidden="true">/</kbd>}
      {results.length > 0 && sky && (
        <ul className="usm-results" aria-label="Search results">
          {results.map((n) => <li key={n.id}><button type="button" onClick={() => { setQ(``); if (phone) setSearchOn(!1); if (solo && !solo.keep.has(n.i)) setSolo(null); pick(n.i, !0); }}><strong>{n.name}</strong><small>{kindWord(n)}{n.m ? `, ${cxStateName(n.m.state)}` : ``}</small></button></li>)}
        </ul>
      )}
      {needle.length >= 2 && !results.length && sky && <p className="usm-results usm-none" role="status">Nothing in the record matches.</p>}
    </div>
  );
  const showPanel = (
    <div ref={panelRef} className={`usm-panel usm-float ${phone ? `usm-panel-phone` : ``}`} role={phone ? `dialog` : `region`} aria-label="Show" aria-modal={phone ? `false` : undefined}>
      <div className="usm-panel-top"><h2>Show</h2><button type="button" className="usm-done" onClick={() => setPanel(!1)}>Done</button></div>
      <div className="usm-panel-body">
        <fieldset className="usm-toggles"><legend>On the map</legend>
          {[[`people`, `People`, `circle`], [`committees`, `Committees`, `diamond`], [`agencies`, `Agencies`, `square`], [`courts`, `Courts`, `hex`]].map(([key, t, shape]) => (
            <button key={key} type="button" className="usm-switch" aria-pressed={show[key]} onClick={() => setShow({ ...show, [key]: !show[key] })}><CxUsmShape shape={shape} /><span>{t}</span><small>{counts[key]}</small></button>
          ))}
        </fieldset>
        <fieldset className="usm-toggles"><legend>Lines when you pick something</legend>
          {CX_USM_LINES.map((L) => (
            <button key={L.id} type="button" className="usm-switch" aria-pressed={lines[L.id] && M.lineCounts[L.id] > 0} disabled={!M.lineCounts[L.id]} onClick={() => setLines({ ...lines, [L.id]: !lines[L.id] })}><CxUsmShape line={L.id} /><span>{L.label}</span><small>{M.lineCounts[L.id] ? M.lineCounts[L.id] : `None yet`}</small></button>
          ))}
          <p className="usm-note">{CX_USM_LINES.find((L) => L.id === `oversees`).note}</p>
        </fieldset>
        <fieldset className="usm-toggles"><legend>Filter</legend>
          <div className="usm-chips">{[[`senate`, `Senate`], [`house`, `House`]].map(([key, t]) => <button key={key} type="button" aria-pressed={chamber[key]} onClick={() => setChamber({ ...chamber, [key]: !chamber[key] })}>{t}</button>)}</div>
          <label className="usm-field"><span>Highlight a state</span><select value={stateF} onChange={(e) => setStateF(e.target.value)}><option value="">None</option>{states.map((c) => <option key={c} value={c}>{cxStateName(c)}</option>)}</select></label>
        </fieldset>
        <div className="usm-motion" role="group" aria-label="Motion"><span>Motion</span>{[[`still`, `Still`], [`calm`, `Calm`], [`live`, `Live`]].map(([id, t]) => <button key={id} type="button" aria-pressed={motion === id} className={motion === id ? `on` : ``} onClick={() => chooseMotion(id)}>{t}</button>)}</div>
        <div className="usm-key">
          <h3>Key</h3>
          <ul>{[[`senate`, `circle`, `Senate`], [`house`, `circle`, `House`], [`joint`, `diamond`, `Joint committees`], [`exec`, `square`, `Executive branch`], [`courts`, `hex`, `Courts`]].map(([b, shape, t]) => <li key={b}><CxUsmShape shape={shape} color={CX_USM_COLORS[b]} /><span>{t}</span></li>)}</ul>
          <p className="usm-note">Circles are people, diamonds are committees, squares are agencies, and hexagons are courts. A ring is a branch, with its total. Things sit near what they are tied to on the record. Distance is not a rank.</p>
          {!phone && <p className="usm-note">Keys: ] and [ move, Enter selects, Esc clears, S solos, arrows pan, + and - zoom, / searches.</p>}
        </div>
        <p className="us-preview usm-preview">{`Preview. Built from public records pulled ${pulled}. The terms of those sources have not yet been read by a person. Party is never shown on the map.`}</p>
        {phone && <button type="button" className="usm-btn usm-wide" onClick={() => goPage(`topics`)}>Votes by topic</button>}
      </div>
    </div>
  );
  const soloPicker = (
    <label className="usm-solo usm-float"><span>Solo</span>
      <select value={soloVal} onChange={(e) => soloPick(e.target.value)}>
        <option value="">Everything</option>
        {solo && solo.spec.node != null && g.nodes[solo.spec.node].kind !== `committee` && <option value={`n:${solo.spec.node}`}>{solo.label}</option>}
        <optgroup label="A chamber"><option value="c:senate">Senate</option><option value="c:house">House</option></optgroup>
        <optgroup label="A committee">{g.nodes.filter((n) => n.kind === `committee`).sort((a, b) => a.name.localeCompare(b.name)).map((n) => <option key={n.id} value={`n:${n.i}`}>{n.name}</option>)}</optgroup>
        <optgroup label="A state delegation">{states.map((c) => <option key={c} value={`s:${c}`}>{cxStateName(c)}</option>)}</optgroup>
        <optgroup label="A policy area">{(data.policy_areas || []).map((a) => <option key={a} value={`a:${a}`}>{a}</option>)}</optgroup>
      </select>
    </label>
  );
  const soloNote = solo && (
    <div className="usm-solo-note usm-float" ref={soloRef}>
      <p className="usm-solo-n" role="status"><strong>{solo.label}</strong> <span>{solo.loading ? `Loading the votes...` : solo.none ? `The votes need the hosted site.` : solo.spec.area ? <><span>{solo.spec.members.size === 1 ? `1 member cast a recorded vote here.` : `${solo.spec.members.size} members cast a recorded vote here.`}</span> <span>{`Votes that decided something: ${solo.votes || 0}.`}</span> <span>Not voting is not a no.</span></> : <><span>Showing</span>{cxUsmSoloCount(M, solo.keep).map((t, k) => <span key={k}>{k ? `, ` : ` `}<span>{t}</span></span>)}</>}</span></p>
      <button type="button" className="usm-x" aria-label="Show everything" onClick={() => setSolo(null)}>×</button>
    </div>
  );
  const textView = page === `people` ? <CX_UsMine data={data} g={g} onSee={(n) => pick(n.i, !0)} onTopics={(area) => { CX_US_PICK.area = area; goPage(`topics`); }} />
    : page === `topics` ? <CX_UsTopics data={data} />
    : view === `index` ? <CX_UsDoors key={indexAt ? indexAt.at : `index`} data={data} g={g} visible={visibleText} dim={() => !1} q={q} start={indexAt} onOpen={(i) => { setSel(i); setView(`linked`); }} onTopics={(area) => { CX_US_PICK.area = area; goPage(`topics`); }} />
    : view === `tree` ? <CX_UsTree data={data} g={g} onOpen={(i) => { setSel(i); setView(`linked`); }} />
    : view === `linked` ? (
      <div className="us-linked">
        {!cur && <p>Choose a person, committee, agency, or court on the map, in the Index, or in the Tree, and its connections are listed here.</p>}
        {cur && <><div className="us-who">{(cur.kind === `member` || cur.kind === `president`) && <CxFace id={cxUsFaceId(cur)} name={cur.name} size={64} />}<h2>{cur.name}</h2></div>
          <ul className="us-facts">{cxUsFacts(g, cur).map((f, k) => <li key={k}>{f}</li>)}</ul>
          {cxUsLink(cur) && <p><a href={cxUsLink(cur)[1]} target="_blank" rel="noreferrer">{cxUsLink(cur)[0]}<span className="sp-ext"> (opens in a new tab)</span></a></p>}
          <p><button type="button" className="cx-link-button" onClick={() => pick(cur.i, !0)}>Show in Sky</button></p>
          {linkedLinks.length > 0 && <><h3>Connected to {linkedLinks.length}</h3><ul className="us-conn">{linkedLinks.slice(0, 80).map((l, k) => <li key={k}><button type="button" onClick={() => setSel(l.to)}>{l.name}</button> <small>{l.text}</small></li>)}</ul>{linkedLinks.length > 80 && <p>And {linkedLinks.length - 80} more.</p>}</>}</>}
      </div>
    ) : null;
  const title = page === `people` ? `People` : page === `topics` ? `Votes by topic` : `Network`;
  return (
    <section className={`usm ${phone ? `usm-phone` : `usm-desk`} ${sheet ? `usm-has-sheet` : ``} ${full ? `usm-full` : ``}`} ref={rootRef} onKeyDown={onRootKey} aria-labelledby="usm-h">
      {!phone && (
        <nav className="usm-menu usm-float" ref={menuRef} aria-label="United States">
          <button type="button" className="usm-back" onClick={() => (onExit ? onExit() : CX_NAV.panel && CX_NAV.panel(``))}><CXI.Back size={16} /><span>Cleveland</span></button>
          <h1 id="usm-h" className="usm-h1">United States<span className="usm-dot">.</span></h1>
          <p className="usm-sub">Pick anyone to see who they are tied to.</p>
          <ul>{[[`network`, `Network`], [`people`, `People`], [`topics`, `Votes by topic`]].map(([id, t]) => <li key={id}><button type="button" aria-current={page === id ? `page` : undefined} className={page === id ? `on` : ``} onClick={() => goPage(id)}>{t}</button></li>)}</ul>
        </nav>
      )}
      <header className={`usm-top usm-float ${phone && searchOn ? `usm-searching` : ``}`} ref={topRef}>
        {phone && <button type="button" className="usm-back usm-icon" aria-label={page !== `network` ? `Back to the map` : `Back to People`} onClick={() => (page !== `network` ? goPage(`network`) : onExit && onExit())}><CXI.Back size={18} /></button>}
        {phone && <h2 id="usm-h" className={page === `network` ? `usm-sr` : `usm-h2`}>{page === `network` ? `United States` : title}</h2>}
        {page === `network` && (!phone || searchOn) && search}
        {phone && searchOn && page === `network` && <button type="button" className="usm-icon" aria-label="Close search" onClick={() => { setSearchOn(!1); setQ(``); }}><CXI.X size={18} /></button>}
        {page === `network` && !(phone && searchOn) && pills}
        {phone && page === `network` && !searchOn && <button type="button" className="usm-icon" aria-label="Search" onClick={() => { setSearchOn(!0); setTimeout(() => searchRef.current && searchRef.current.focus(), 0); }}><CXI.Search size={18} /></button>}
        <CX_LangButton cls="usm-lang" short={phone} />
      </header>
      {sky && (
        <div className="usm-stage" ref={stageRef}>
          <canvas ref={cvRef} className="usm-canvas" tabIndex={0} role="img" onKeyDown={onCanvasKey}
            aria-label={`Map of ${visibleCount} people, committees, agencies, and courts, grouped around the Senate, the House, the executive branch, and the courts. The Index, Linked, and Tree views hold the same information as text. Keys: right and left bracket move, Enter selects, Escape clears, arrows pan, plus and minus zoom, slash searches.`} />
          {soloNote}
          <div className="usm-ctl" ref={ctlRef}>
            <button type="button" className="usm-btn usm-show-btn usm-float" aria-expanded={panel} onClick={() => { setPanel(!panel); if (phone) setSheet(!1); }}>Show</button>
            {soloPicker}
            <div className="usm-zoom usm-float">
              <button type="button" aria-label="Zoom in" onClick={() => zoomBy(1.4)}>+</button>
              <button type="button" aria-label="Zoom out" onClick={() => zoomBy(1 / 1.4)}>−</button>
              <button type="button" aria-label="Fit everything" onClick={() => fit(!0)}>Fit</button>
              {!phone && <button type="button" aria-pressed={full} aria-label={full ? `Leave full screen` : `Full screen`} onClick={toggleFull}>{full ? `Exit` : `Full`}</button>}
            </div>
          </div>
          {phone && cur && !sheet && <button type="button" className="usm-chip usm-float" onClick={() => setSheet(!0)}><strong>{cur.name}</strong><span>Details</span></button>}
          {panel && phone && <button type="button" className="usm-scrim" aria-label="Close Show" onClick={() => setPanel(!1)} />}
          {panel && showPanel}
          {sheet && info && <CX_UsMapSheet info={info} phone={phone} still={still} sheetRef={sheetRef} fresh onPeek={(p) => { S.current.peek = p; }} onMove={request} onClose={() => setSheet(!1)} onPick={(i) => { if (solo && !solo.keep.has(i)) setSolo(null); pick(i, !0); }} onProfile={openLinked} onSolo={() => { if (solo && solo.spec.node === sel) setSolo(null); else soloNode(sel); }} soloOn={!!(solo && solo.spec.node === sel)} onIndex={openIndex} />}
        </div>
      )}
      {!sky && <div className="us usm-text">{textView}</div>}
      <p className="usm-sr" role="status" aria-live="polite">{Array.isArray(say) ? say.filter(Boolean).map((t, k) => <span key={k}>{k ? ` ` : ``}{t}</span>) : say}</p>
    </section>
  );
}
