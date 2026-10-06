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
const CX_USM_COLORS = { senate: `#7aa2ff`, house: `#4cc9f0`, exec: `#ffc66b`, courts: `#ff9db8` };
/* each category has its own family of hues and the branch moves the hue inside it: people are blues, committees are greens, agencies are ambers, courts are pink */
const CX_USM_FAMILY = {
  person: { senate: `#7aa2ff`, house: `#4cc9f0`, exec: `#a78bfa`, courts: `#8fa3c9` },
  committee: { senate: `#4cd37b`, house: `#5fd6c4`, joint: `#c8e86a` },
  agency: { dept: `#ffc66b`, other: `#ff9a5a` },
};
function cxUsmColor(m) {
  if (m.kind === `person`) return CX_USM_FAMILY.person[m.branch] || CX_USM_FAMILY.person.courts;
  if (m.kind === `committee`) return CX_USM_FAMILY.committee[m.branch] || CX_USM_FAMILY.committee.joint;
  if (m.kind === `agency`) return m.sub ? CX_USM_FAMILY.agency.other : CX_USM_FAMILY.agency.dept;
  return CX_USM_COLORS[m.branch];
}

/* names at rest: how many committees a phone names before you zoom in, and how few people must be on the screen before theirs are drawn */
const CX_USM_PHONE_COMMITTEES = 8;
const CX_USM_PEOPLE_NAMED = 40;
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
      Object.assign(m, { kind: `committee`, shape: `hex`, label, total: n.c.members, totalText: cxUsmPlural(n.c.members, `member`, `members`), r: 6 + Math.sqrt(n.c.members) * 1.1, charge: -110 });
    } else if (n.kind === `agency`) {
      // a department is named in full ("Labor Department", not "DOL"); other agencies keep the record's short name on the map
      Object.assign(m, { kind: `agency`, sub: !!n.a.parent_id, shape: `square`, label: cxUsmShort(!n.a.parent_id && /\bDepartment\b/.test(n.name) ? n.name : n.label, 28), r: n.a.parent_id ? 2.8 : 3.8, charge: -14 });
    } else if (n.kind === `court`) {
      const t = n.c.type;
      Object.assign(m, { kind: `court`, shape: `hexo`, label: cxUsmShort(n.label, 28), r: t === `supreme` ? 7 : t === `appeals` ? 5.4 : 4, charge: t === `supreme` ? -160 : t === `appeals` ? -60 : -16 });
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
   Runs ahead before the first drawing (pre ticks) so the map opens already formed. keep: a Set of node indexes to lay out alone (Solo).
   shape: `wide` (a computer, a phone on its side) or `tall` (a phone held upright). Tall starts the four branches in three rows (the Senate
   and the executive branch side by side, then the House, then the courts) and pulls sideways a little harder than up and down, so the
   same forces and the same seed settle into a map that uses the height of the screen. Both are found by the physics, not drawn. */
const CX_USM_SHAPES = {
  wide: { hubs: null, fx: 0.04, fy: 0.05 },
  tall: { hubs: [[-0.55, -1.3], [0, 0.1], [0.55, -1.3], [0, 1.5]], fx: 0.07, fy: 0.03 },
};
function cxUsmSeed(M, shape) {
  // where each thing starts: the four branch hubs on a circle (or, tall, in three rows), everything else in a small sunflower next to what it belongs to.
  // Only a starting point; the forces move everything from here, so the shape is found, not drawn.
  const xy = M.nodes.map(() => null), kids = new Map();
  M.parent.forEach((p, i) => { if (p >= 0) { if (!kids.has(p)) kids.set(p, []); kids.get(p).push(i); } });
  const B = M.branchHubs, R = 330, tall = (CX_USM_SHAPES[shape] || CX_USM_SHAPES.wide).hubs;
  [B.senate, B.house, B.exec, B.courts].forEach((h, k) => { const a = Math.PI * (1.25 - k * 0.5); xy[h] = tall ? [R * tall[k][0], R * tall[k][1]] : [R * Math.cos(a), R * Math.sin(a)]; });
  const queue = [B.senate, B.house, B.exec, B.courts];
  while (queue.length) {
    const p = queue.shift(), list = kids.get(p) || [], base = M.nodes[p].r + 6;
    list.forEach((i, k) => { if (xy[i]) return; const a = k * 2.399963, rr = base + 7 * Math.sqrt(k + 1); xy[i] = [xy[p][0] + rr * Math.cos(a), xy[p][1] + rr * Math.sin(a)]; queue.push(i); });
  }
  M.nodes.forEach((n, i) => { if (!xy[i]) xy[i] = [0, 0]; });
  return xy;
}
function cxUsMapSim(M, D3, opts = {}) {
  const keep = opts.keep || null, from = opts.objs ? null : opts.from || cxUsmSeed(M, opts.shape), F = CX_USM_SHAPES[opts.shape] || CX_USM_SHAPES.wide;
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
    .force(`x`, D3.forceX(0).strength(F.fx)).force(`y`, D3.forceY(0).strength(F.fy))
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
    for (const [x0, y, align] of spots) {
      // a hub's name slides inward to stay on a narrow screen (it still sits over its own ring), so the branches are always named
      const x = c.center && w < W - 6 ? Math.max(3, Math.min(W - 3 - w, x0)) : x0;
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
/* where everything rests: the build's file when it was made from this same record, otherwise the same physics run here (slower, same result).
   shape: `wide` or `tall` (the file holds both: xy and tall). */
function cxUsMapHome(g, M, file, shape = `wide`) {
  const key = shape === `tall` ? `tall` : `xy`;
  if (CX_USM.home && CX_USM.home.g === g && CX_USM.home[key]) return CX_USM.home[key];
  let xy = file && file.ids === cxUsmIds(g) && Array.isArray(file[key]) && file[key].length === M.nodes.length ? file[key] : null;
  if (!xy) { const R = cxUsMapSim(M, CXD3, { pre: 300, shape }); xy = M.nodes.map(() => [0, 0]); R.nodes.forEach((n) => { xy[n.i] = [n.x, n.y]; }); }
  if (!CX_USM.home || CX_USM.home.g !== g) CX_USM.home = { g };
  CX_USM.home[key] = xy;
  return xy;
}
/* a phone held upright (or any window much taller than wide) gets the tall map */
function cxUsmShapeOf(W, H) { return W > 0 && H > W * 1.2 ? `tall` : `wide`; }
/* words drawn on the map are not page text, so the translator cannot see them: they are translated here, with the same dictionary */
function cxUsmTr(s) { return (CX_I18N.lang === `es` && cxI18nText(s)) || s; }
const CX_USM_FONT = `"Schibsted Grotesk", Inter, ui-sans-serif, system-ui, sans-serif`;
function cxUsmIsland() { return document.documentElement.getAttribute(`data-cx-theme`) === `original` ? `#141210` : `#0f1012`; }
function cxUsmLess() { return !!(globalThis.matchMedia && globalThis.matchMedia(`(prefers-reduced-motion: reduce)`).matches); }
const CX_USM_TERR = new Set([`DC`, `PR`, `GU`, `VI`, `AS`, `MP`]);

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
  // a committee seat's word from the record (Chairman, Ranking member, Ex officio, Member) sits beside the row and opens what the post means
  const seat = (x, sub) => ({ i: x.i, name: x.n.name, sub, word: cxUsmRole(x.e.rel), role: !0 });
  const who = (x) => `${x.n.m.chamber === `senate` ? `Senator` : `Representative`}, ${st(x.n.m.state)}`;
  if (n.kind === `member`) {
    const m = n.m, seats = conn((o) => o.kind === `committee`).sort(byName), leads = seats.filter((x) => x.l.line === `lead`);
    const terr = CX_USM_TERR.has(m.state);
    out.kicker = m.chamber === `senate` ? `Senator, ${st(m.state)}` : terr ? (m.state === `PR` ? `Resident Commissioner, Puerto Rico` : `Delegate, ${st(m.state)}`) : m.district ? `Representative, ${st(m.state)}, district ${m.district}` : `Representative, ${st(m.state)}, at large`;
    out.sentence = m.chamber === `senate` ? `Represents ${st(m.state)} in the Senate.` : terr ? `Represents ${st(m.state)} in the House.` : m.district ? `Represents ${st(m.state)}'s ${cxOrd(m.district)} district in the House.` : `Represents all of ${st(m.state)} in the House.`;
    const on = seats.length === 1 ? `Sits on 1 committee` : `Sits on ${seats.length} committees`;
    out.fact = !seats.length ? `No committee seat is listed.` : leads.length ? `${on} and leads ${leads.length}.` : `${on}.`;
    if (seats.length) out.lists.push({ title: `Committees`, rows: seats.map((x) => seat(x, x.n.c.chamber === `joint` ? `Joint committee` : `${x.n.c.chamber === `senate` ? `Senate` : `House`} committee`)) });
    out.src = src(`membership`);
  } else if (n.kind === `committee`) {
    const c = n.c, ch = c.chamber === `senate` ? `Senate` : `House`, mem = conn((o) => o.kind === `member`).sort(byName), leads = mem.filter((x) => x.l.line === `lead`);
    out.kicker = c.chamber === `joint` ? `Joint committee` : `Committee, ${ch}`;
    out.sentence = c.chamber === `joint` ? `A joint committee of Congress with ${c.members} listed members.` : c.chamber === `senate` ? `A Senate committee with ${c.members} listed members.` : `A House committee with ${c.members} listed members.`;
    out.fact = c.chair ? `Chair: ${c.chair}.` : `No chair is listed.`;
    out.cid = c.id;
    if (leads.length) out.lists.push({ title: `Who leads it`, rows: leads.map((x) => seat(x, who(x))) });
    if (mem.length) out.lists.push({ title: `Members`, rows: mem.map((x) => row(x, who(x))) });
    // each subcommittee opens its own two lines (what it does, why it matters) and its official words
    if (c.subcommittees.length) out.lists.push({ title: `Subcommittees`, rows: c.subcommittees.map((s) => ({ i: null, xid: s.id, name: s.name, sub: s.chair ? `Chair: ${s.chair}` : `` })) });
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

/* ---------- The profile page (phase 6 of docs/plan-us-graph-master.md) ----------
   One person, committee, agency, court, or branch as a page: a kicker, the name, short sentences from the record, one fact line, up to
   three numbers, the record as label and value (each row with its source and the day it was pulled), and every connection with the
   record's own word beside it (Chair, Member, Yea, Nay, Not voting, Appointed by). Party appears only as one row of the record, with its
   date and its source. Lists are in the record's order or alphabetical, never by fit. A link names the person (cxUsmSlug), never the viewer. */
function cxUsmSlug(s) { return String(s).normalize(`NFD`).replace(/[̀-ͯ]/g, ``).toLowerCase().replace(/[^a-z0-9]+/g, `-`).replace(/^-+|-+$/g, ``); }
/* every node's link name, made once per record: the name, and when two share one, the second gets its record id as well */
function cxUsmSlugs(g) {
  if (g.slugs) return g.slugs;
  const of = new Array(g.nodes.length), at = new Map();
  g.nodes.forEach((n) => { let s = cxUsmSlug(n.name) || cxUsmSlug(n.id); if (at.has(s)) s = `${s}-${cxUsmSlug(n.id)}`; of[n.i] = s; at.set(s, n.i); });
  g.slugs = { of, at };
  return g.slugs;
}
/* the node a link names: its link name, or its record id (m:M001242) */
function cxUsmFind(g, who) { if (!who) return null; const s = cxUsmSlugs(g); if (s.at.has(who)) return s.at.get(who); const n = g.byId.get(who); return n ? n.i : null; }
/* short names for the sources, beside each row of the record */
const CX_USM_SRC_SHORT = { members: `congress-legislators`, committees: `congress-legislators`, membership: `congress-legislators`, executive: `congress-legislators`, agencies: `Federal Register`, cabinet: `White House cabinet page`, judges: `Federal Judicial Center`, circuits: `28 U.S.C. 41` };
function cxUsmRole(r) { const s = String(r || `Member`); return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase(); }
function cxUsProfile(g, M, data, vd, i) {
  const n = g.nodes[i], sh = cxUsMapSheet(g, M, data, i), slug = cxUsmSlugs(g).of[i];
  const day = (iso) => (iso ? cxVoteDate(String(iso).slice(0, 10)) : ``);
  const pulled = day(data.retrieved_at), vPulled = vd ? day(vd.retrieved_at) : ``;
  const src = (k) => ({ label: CX_USM_SRC_SHORT[k], url: M.sources[k] && M.sources[k].url, pulled });
  const conn = (f) => g.adj[i].map((ei) => { const e = g.edges[ei], o = e.a === i ? e.b : e.a; return { i: o, n: g.nodes[o], e, l: M.links[ei] }; }).filter((x) => f(x.n, x));
  const byName = (a, b) => a.n.name.localeCompare(b.n.name);
  const chamberWord = (c) => (c === `senate` ? `Senate` : c === `house` ? `House` : `Joint`);
  const P = { i, id: n.id, slug, kind: n.kind, kicker: sh.kicker, name: sh.name, face: cxUsFaceId(n), sentence: [sh.sentence], fact: sh.fact, glance: [], glanceNote: ``, record: [], lists: [] };
  const rec = (key, label, value, s, extra = {}) => P.record.push({ key, label, value, src: s, ...extra });
  const list = (key, title, rows, extra = {}) => { if (rows.length) P.lists.push({ key, title, rows, map: !0, ...extra }); };
  if (n.kind === `member`) {
    const m = n.m, terr = CX_USM_TERR.has(m.state);
    const full = [], subs = [];
    m.committees.forEach((c) => {
      const exact = g.byId.get(`c:${c.id}`), parent = exact || g.byId.get(`c:${c.id.slice(0, 4)}`);
      if (!parent) return;
      if (exact) full.push({ i: parent.i, name: parent.name, sub: `${chamberWord(parent.c.chamber)} committee`, word: cxUsmRole(c.role), role: !0 });
      else { const s = parent.c.subcommittees.find((x) => x.id === c.id); if (s) subs.push({ i: null, name: s.name, sub: `Part of ${parent.name}`, word: cxUsmRole(c.role), role: !0 }); }
    });
    P.sentence = [sh.sentence, `Current term since ${day(m.term_start)}.`, sh.fact];
    const rows = vd ? cxMemberVotes(vd, m) : null, cast = rows ? rows.filter((r) => r.c === `Y` || r.c === `N` || r.c === `P` || r.c === `O`) : null;
    const bills = cast ? new Set(cast.filter((r) => r.v.bill && r.c !== `O`).map((r) => r.v.bill)).size : 0;
    P.fact = !vd ? `Loading the votes...` : bills === 1 ? `Voted on 1 bill this Congress.` : bills ? `Voted on ${bills} bills this Congress.` : `No recorded vote on a bill is in our record yet.`;
    P.glance = [{ n: cast ? cast.length : null, label: `Recorded votes cast` }, { n: full.length, label: full.length === 1 ? `Committee` : `Committees` }, { n: subs.length, label: subs.length === 1 ? `Subcommittee` : `Subcommittees` }];
    P.glanceNote = `Bills they sponsored are not in our record yet.`;
    const vsrc = { label: m.chamber === `senate` ? `Senate roll calls` : `House Clerk roll calls`, url: m.chamber === `senate` ? `https://www.senate.gov/legislative/LIS/roll_call_lists/` : `https://clerk.house.gov/evs/`, pulled: vPulled };
    rec(`chamber`, `Chamber`, m.chamber === `senate` ? `Senate` : `House of Representatives`, src(`members`));
    rec(`state`, `State`, m.chamber === `senate` || terr ? cxStateName(m.state) : m.district ? `${cxStateName(m.state)}, district ${m.district}` : `${cxStateName(m.state)}, at large`, src(`members`));
    rec(`term`, `Term`, `Runs from ${day(m.term_start)} to ${day(m.term_end)}`, src(`members`));
    if (m.party) rec(`party`, `Party`, m.party, src(`members`), { note: `Recorded as of ${day(m.party_as_of || m.term_start)}` });
    rec(`committees`, `Committees`, full.length ? full.map((x) => g.nodes[x.i].label) : `None listed`, src(`membership`));
    const areas = cast ? [...new Set(cast.filter((r) => r.v.final && r.c !== `O`).map((r) => r.area))].filter((a) => a !== CX_NO_AREA).sort((a, b) => a.localeCompare(b)) : null;
    rec(`areas`, `Policy areas voted in`, !vd ? `Loading the votes...` : areas.length ? areas : `None in our record yet`, vsrc);
    if (m.url) rec(`page`, `Official page`, m.url, src(`members`), { link: m.url });
    list(`committees`, `Committees`, full);
    list(`subcommittees`, `Subcommittees`, subs, { map: !1, fold: !0 });
    const hub = g.byId.get(m.chamber === `senate` ? `h:senate` : `h:house`);
    list(`chamber`, `Chamber`, [{ i: hub.i, name: hub.name, sub: `Chamber of Congress`, word: terr ? `Delegate` : `Member` }]);
    if (rows) list(`votes`, `Recorded votes`, rows.map((r) => ({ i: null, href: r.v.url, name: cxVoteWhat(r), sub: `${day(r.v.date)}. ${r.v.question || `Question not recorded`}.`, word: CX_CAST[r.c] })), { map: !1, fold: !0, note: `Newest first. Not voting is not a no. A vote is on one question.` });
  } else if (n.kind === `committee`) {
    const c = n.c, mem = conn((o) => o.kind === `member`).sort(byName);
    const lead = (re) => mem.filter((x) => re.test(x.e.rel)).map((x) => x.n.name);
    P.glance = [{ n: c.members, label: `Members` }, { n: c.subcommittees.length, label: c.subcommittees.length === 1 ? `Subcommittee` : `Subcommittees` }, { n: new Set(mem.map((x) => x.n.m.state)).size, label: `States represented` }];
    rec(`chamber`, `Chamber`, c.chamber === `senate` ? `Senate` : c.chamber === `house` ? `House of Representatives` : `Joint, both chambers`, src(`committees`));
    rec(`chair`, `Chair`, c.chair || `None listed`, src(`membership`), { role: !0 });
    const rk = lead(/^ranking member$/i); if (rk.length) rec(`ranking`, `Ranking member`, rk, src(`membership`), { role: !0 });
    rec(`members`, `Members`, String(c.members), src(`membership`));
    rec(`subs`, `Subcommittees`, c.subcommittees.length ? c.subcommittees.map((s) => s.name) : `None listed`, src(`committees`));
    if (c.url) rec(`page`, `Official page`, c.url, src(`committees`), { link: c.url });
    P.cid = c.id;
    list(`members`, `Members`, mem.map((x) => ({ i: x.i, name: x.n.name, sub: `${x.n.m.chamber === `senate` ? `Senator` : `Representative`}, ${cxStateName(x.n.m.state)}`, word: cxUsmRole(x.e.rel), role: !0 })));
    // each subcommittee opens to its own two lines and its official words (CX_UsxLines)
    list(`subcommittees`, `Subcommittees`, c.subcommittees.map((s) => ({ i: null, xid: s.id, name: s.name, sub: s.chair ? `Chair: ${s.chair}` : `No chair listed`, word: `Subcommittee` })), { map: !1 });
    const hubs = conn((o) => o.kind === `hub`);
    list(`chamber`, `Chamber`, hubs.map((x) => ({ i: x.i, name: x.n.name, sub: `Chamber of Congress`, word: `Committee of` })));
  } else if (n.kind === `agency`) {
    const a = n.a, up = a.parent_id ? g.byId.get(`a:${a.parent_id}`) : null, kids = conn((o) => o.kind === `agency` && o.a.parent_id === a.id).sort(byName);
    let all = 0; const walk = (id) => g.nodes.forEach((o) => { if (o.kind === `agency` && o.a.parent_id === id) { all += 1; walk(o.a.id); } }); walk(a.id);
    P.kicker = up ? `Agency, part of a larger one` : `Agency`;
    P.glance = [{ n: a.documents_since_cutoff || 0, label: `Federal Register documents since ${day(data.agency_cutoff)}` }, { n: kids.length, label: kids.length === 1 ? `Agency directly under it` : `Agencies directly under it` }, { n: all, label: `Agencies under it in all` }];
    rec(`kind`, `Kind`, up ? `Part of a larger agency` : `Top-level agency`, src(`agencies`));
    if (up) rec(`parent`, `Part of`, up.name, src(`agencies`));
    rec(`docs`, `Federal Register documents`, `${(a.documents_since_cutoff || 0).toLocaleString(`en-US`)} documents since ${day(data.agency_cutoff)}`, src(`agencies`));
    rec(`lead`, `Who leads it`, `Not in our record yet`, src(`cabinet`), { note: `Which cabinet title leads which agency needs a person's review.` });
    if (a.url) rec(`page`, `Official page`, a.url, src(`agencies`), { link: a.url });
    if (up) list(`parent`, `Part of`, [{ i: up.i, name: up.name, sub: up.a && up.a.parent_id ? `Agency` : `Top-level agency`, word: `Part of` }]);
    list(`parts`, `Agencies under it`, kids.map((x) => ({ i: x.i, name: x.n.name, sub: `Agency`, word: `Part` })));
    const hubs = conn((o) => o.kind === `hub`);
    list(`branch`, `Branch`, hubs.map((x) => ({ i: x.i, name: x.n.name, sub: `Branch`, word: `Agency` })));
  } else if (n.kind === `court`) {
    const c = n.c, judges = conn((o) => o.kind === `judge`).sort(byName), up = c.circuit ? g.byId.get(`k:${c.circuit}`) : null;
    const lower = conn((o) => o.kind === `court` && (o.c.circuit === c.id || (c.type === `supreme` && o.c.type === `appeals`))).sort(byName);
    const seat = (j) => (j.title === `Judge` ? (j.chief ? `Chief judge` : `Judge`) : j.title);
    P.glance = [{ n: c.active_judges, label: `Judges sitting now` }, { n: c.senior_judges || 0, label: `Judges with senior status` }].concat(lower.length ? [{ n: lower.length, label: `Courts it hears appeals from` }] : []);
    rec(`kind`, `Kind`, sh.kicker, src(`judges`));
    if (up) rec(`up`, `Its appeals go to`, up.name, src(`circuits`));
    rec(`judges`, `Judges sitting now`, String(c.active_judges), src(`judges`));
    rec(`senior`, `Judges with senior status`, String(c.senior_judges || 0), src(`judges`));
    rec(`appoint`, `Who appoints its judges`, `The President, as listed for each judge below`, src(`judges`));
    list(`judges`, `Judges`, judges.map((x) => ({ i: x.i, name: x.n.name, sub: `Appointed by ${x.n.j.appointed_by}`, word: seat(x.n.j) })));
    list(`lower`, `Hears appeals from`, lower.map((x) => ({ i: x.i, name: x.n.name, sub: x.n.c.type === `appeals` ? `Court of appeals` : `District court`, word: `Appeals` })));
    if (up) list(`up`, `Its appeals go to`, [{ i: up.i, name: up.name, sub: `Court of appeals`, word: `Appeals` }]);
  } else if (n.kind === `judge`) {
    const j = n.j, co = g.byId.get(`k:${j.court_id}`), who = conn((o) => o.kind === `president`)[0];
    const title = j.title === `Judge` ? (j.chief ? `Chief judge` : `Judge`) : j.title;
    P.kicker = co ? `${j.title === `Judge` ? `Judge` : j.title}, ${co.label}` : sh.kicker;
    const year = j.commissioned ? Number(String(j.commissioned).slice(0, 4)) : null;
    P.glance = (year ? [{ n: year, label: `Year commissioned`, plain: !0 }] : []).concat(co ? [{ n: co.c.active_judges, label: `Judges on this court now` }, { n: co.c.senior_judges || 0, label: `Senior judges on this court` }] : []);
    if (co) rec(`court`, `Court`, co.name, src(`judges`));
    rec(`title`, `Title`, title, src(`judges`));
    rec(`by`, `Appointed by`, who ? who.n.name : j.appointed_by, src(`judges`));
    if (j.commissioned) rec(`comm`, `Commissioned`, day(j.commissioned), src(`judges`));
    const L = cxUsLink(n); if (L) rec(`page`, `Federal Judicial Center page`, L[1], src(`judges`), { link: L[1] });
    if (co) list(`court`, `Court`, [{ i: co.i, name: co.name, sub: sh.kicker, word: title }]);
    if (who) list(`by`, `Appointed by`, [{ i: who.i, name: who.n.name, sub: who.n.p.current ? `President` : `Former President`, word: `Appointed by` }]);
  } else if (n.kind === `president`) {
    const p = n.p, judges = conn((o) => o.kind === `judge`).sort(byName), cab = conn((o) => o.kind === `cabinet`);
    P.glance = [{ n: judges.length, label: `Judges appointed who sit now` }].concat(cab.length ? [{ n: cab.length, label: `Cabinet members listed` }] : []).concat(p.terms && p.terms.length ? [{ n: p.terms.length, label: p.terms.length === 1 ? `Term in our record` : `Terms in our record` }] : []);
    rec(`office`, `Office`, sh.kicker, src(`executive`));
    if (p.current && p.term_start) rec(`term`, `Term`, `Runs from ${day(p.term_start)} to ${day(p.term_end)}`, src(`executive`));
    else if (p.terms && p.terms.length) rec(`term`, p.terms.length === 1 ? `Term` : `Terms served`, p.terms.map((t) => `Runs from ${day(t.start)} to ${day(t.end)}`), src(`executive`));
    if (p.current && p.party) rec(`party`, `Party`, p.party, src(`executive`), { note: `Recorded as of ${day(p.term_start || (p.terms && p.terms.length ? p.terms[p.terms.length - 1].start : ``))}` });
    rec(`judges`, `Judges appointed who sit now`, String(judges.length), src(`judges`));
    const L = cxUsLink(n); if (L) rec(`page`, `Biographical Directory`, L[1], src(`executive`), { link: L[1] });
    list(`cabinet`, `Cabinet`, cab.map((x) => ({ i: x.i, name: x.n.name, sub: x.n.cab.title, word: `Cabinet` })));
    list(`judges`, `Judges appointed`, judges.map((x) => ({ i: x.i, name: x.n.name, sub: x.n.where || `Judge`, word: `Appointed` })));
    const hubs = conn((o) => o.kind === `hub`);
    list(`branch`, `Branch`, hubs.map((x) => ({ i: x.i, name: x.n.name, sub: `Branch`, word: p.current ? `Leader` : `Former leader` })));
  } else if (n.kind === `cabinet`) {
    const pr = conn((o) => o.kind === `president`)[0];
    rec(`title`, `Title`, n.cab.title, src(`cabinet`));
    if (pr) rec(`pres`, `Serves in the cabinet of`, pr.n.name, src(`cabinet`));
    rec(`lead`, `Agency it leads`, `Not linked yet`, src(`cabinet`), { note: `Which agency a cabinet title leads needs a person's review.` });
    if (pr) list(`pres`, `Serves in the cabinet of`, [{ i: pr.i, name: pr.n.name, sub: `President`, word: `Cabinet` }]);
  } else {
    // a branch or a chamber: what the sheet lists, with a word for each
    const m = M.nodes[i];
    const states = (ch) => new Set(data.members.filter((x) => x.chamber === ch).map((x) => x.state)).size;
    if (n.id === `h:senate` || n.id === `h:house`) {
      const ch = n.id === `h:senate` ? `senate` : `house`;
      P.glance = [{ n: m.total, label: `Members` }, { n: conn((o) => o.kind === `committee`).length, label: `Committees` }, { n: states(ch), label: ch === `senate` ? `States` : `States and territories` }];
      rec(`members`, `Members`, String(m.total), src(`members`));
      rec(`committees`, `Committees`, String(conn((o) => o.kind === `committee`).length), src(`committees`));
    } else if (n.id === `h:exec`) {
      const ag = g.nodes.filter((o) => o.kind === `agency`), top = ag.filter((o) => !o.a.parent_id).length, ppl = g.nodes.filter((o) => o.kind === `president` || o.kind === `cabinet`).length;
      P.glance = [{ n: ag.length, label: `Agencies` }, { n: top, label: `Top-level agencies` }, { n: ppl, label: `People` }];
      rec(`agencies`, `Agencies`, String(ag.length), src(`agencies`));
      rec(`people`, `People`, String(ppl), src(`executive`));
    } else {
      const co = g.nodes.filter((o) => o.kind === `court`), jd = g.nodes.filter((o) => o.kind === `judge`).length;
      P.glance = [{ n: co.length, label: `Courts` }, { n: jd, label: `Judges sitting now` }, { n: co.filter((o) => o.c.type === `appeals`).length, label: `Courts of appeals` }];
      rec(`courts`, `Courts`, String(co.length), src(`judges`));
      rec(`judges`, `Judges sitting now`, String(jd), src(`judges`));
    }
    const words = { Committees: `Committee`, Members: `Member`, Leaders: null, Cabinet: `Cabinet`, [`Top-level agencies`]: `Agency`, [`Supreme Court and courts of appeals`]: `Court` };
    // a list of things tied to the branch through someone else (the cabinet, through the President) is listed, not drawn on the corner map
    const nb = new Set(g.adj[i].map((ei) => (g.edges[ei].a === i ? g.edges[ei].b : g.edges[ei].a)));
    sh.lists.forEach((L, k) => list(`l${k}`, L.title, L.rows.map((r) => ({ i: r.i, name: r.name, sub: words[L.title] === null ? `` : r.sub, word: words[L.title] === null ? r.sub : words[L.title] || `Part` })), { map: L.rows.every((r) => r.i === null || r.i === undefined || nb.has(r.i)) }));
  }
  return P;
}

/* one shape on the canvas, by tier: a ring (a branch, the biggest), a hexagon (a committee, filled; a court, outlined and lightly tinted),
   a square (an agency), a circle (a person, the smallest) */
function cxUsmPath(x, shape, px, py, r) {
  x.beginPath();
  if (shape === `square`) x.rect(px - r * 0.9, py - r * 0.9, r * 1.8, r * 1.8);
  else if (shape === `hex` || shape === `hexo`) { for (let k = 0; k < 6; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 3, qx = px + r * 1.15 * Math.cos(a), qy = py + r * 1.15 * Math.sin(a); if (k) x.lineTo(qx, qy); else x.moveTo(qx, qy); } x.closePath(); }
  else x.arc(px, py, r, 0, 6.2832);
}
/* the same shapes, small, beside a word in the Show panel and the key (a shape, never a bare colored dot) */
function CxUsmShape({ shape, color, line }) {
  const c = color || `currentColor`;
  if (line) return <svg className="usm-glyph" width="26" height="12" viewBox="0 0 26 12" aria-hidden="true"><line x1="1" y1="6" x2="25" y2="6" stroke="currentColor" strokeWidth={line === `lead` ? 3 : 1.6} strokeDasharray={line === `appointed` ? `5 4` : line === `oversees` ? `1 4` : undefined} strokeLinecap="round" /></svg>;
  return (
    <svg className="usm-glyph" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      {shape === `hex` ? <path d="M8 1.2L14.2 4.8V11.2L8 14.8L1.8 11.2V4.8Z" fill={c} /> : shape === `square` ? <rect x="3" y="3" width="10" height="10" fill={c} /> : shape === `hexo` ? <path d="M8 1.6L13.6 4.8V11.2L8 14.4L2.4 11.2V4.8Z" fill={c} fillOpacity="0.28" stroke={c} strokeWidth="1.8" /> : shape === `ring` ? <circle cx="8" cy="8" r="5.6" fill="none" stroke={c} strokeWidth="1.8" /> : <circle cx="8" cy="8" r="5" fill={c} />}
    </svg>
  );
}

/* The details sheet: on a computer it sits to the right of the map; on a phone it opens part way up, pulls up to near the top, and
   swipes down to close (the kit's sheet, vendor/relationship-map-kit/map/sheet.js). It also closes with Done, a tap on the map, and
   the back gesture (handled by the page). */
function CX_UsMapSheet({ info, phone, still, onClose, onPick, onProfile, onSolo, soloOn, onIndex, sheetRef, onPeek, onMove, fresh, lead, noActs, hid = `usm-sheet-h`, cls = ``, onRole, onSub }) {
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
    <aside className={`usm-sheet ${fresh ? `usm-fresh` : ``} ${cls}`} ref={sheetRef} aria-labelledby={hid} data-phone={phone ? `1` : `0`}>
      <div className="usm-sheet-top">
        {phone && <span className="usm-grab" aria-hidden="true" />}
        <p className="usm-kicker">{info.kicker}</p>
        <button type="button" className="usm-done" onClick={onClose}>Done</button>
      </div>
      <div className="usm-sheet-body" ref={bodyRef}>
        <h2 id={hid} className="usm-name">{info.name}{!/[.!?]$/.test(info.name) && <span className="usm-dot">.</span>}</h2>
        {lead}
        {info.sentence ? <p className="usm-sent">{info.sentence}</p> : null}
        {info.fact ? <p className="usm-fact">{info.fact}</p> : null}
        {info.lists.map((L) => (
          <section key={L.title} className="usm-list">
            <h3>{L.title} <small>{L.rows.length}</small></h3>
            <ul>
              {(all[L.title] ? L.rows : L.rows.slice(0, CAP)).map((r, k) => {
                const body = <><span>{r.name}</span>{r.sub && <small>{r.sub}</small>}</>;
                return (
                  <li key={`${r.name}-${k}`} className={r.word ? `usx-rl` : undefined}>
                    {r.i !== null && r.i !== undefined ? <button type="button" onClick={() => onPick(r.i)}>{body}</button>
                      : r.xid && onSub ? <button type="button" className="usx-subrow" aria-haspopup="dialog" onClick={(e) => onSub(r.xid, e.currentTarget)}>{body}</button> : <p>{body}</p>}
                    {r.word ? (r.role ? <CX_UsxRoleBtn word={r.word} onRole={onRole} cls="usm-word" /> : <b className="usm-word">{r.word}</b>) : null}
                  </li>
                );
              })}
            </ul>
            {L.rows.length > CAP && !all[L.title] && <button type="button" className="usm-more" onClick={() => setAll({ ...all, [L.title]: !0 })}>{`Show all ${L.rows.length}`}</button>}
          </section>
        ))}
        {info.src && <p className="usm-src"><span>From </span><a href={info.src.url} target="_blank" rel="noreferrer">{info.src.label}<span className="sp-ext"> (opens in a new tab)</span></a><span>.</span></p>}
      </div>
      {!noActs && <div className="usm-acts">
        <button type="button" className="usm-btn usm-pri" onClick={onProfile}>Open profile</button>
        <button type="button" className="usm-btn" aria-pressed={soloOn} onClick={onSolo}>{soloOn ? `Show everything` : `Solo`}</button>
        <button type="button" className="usm-btn" onClick={onIndex}>Explore in Index</button>
      </div>}
    </aside>
  );
}

/* Their corner of the map: only this one's own connections, one group for each list of them on the record (with its count), drawn with
   the main map's shapes and color families, placed by the same d3 force code and fixed seed, and small: at most `cap` dots, the rest are
   in the lists below. Drag a dot to move it; tap a group or a dot to jump to its list. */
function cxUsmCorner(P, cap = 150) {
  const lists = P.lists.filter((L) => L.map && L.rows.some((r) => r.i !== null && r.i !== undefined));
  const seen = new Set([P.i]), total = lists.reduce((t, L) => t + L.rows.length, 0);
  const groups = lists.map((L) => {
    const rows = L.rows.filter((r) => r.i !== null && r.i !== undefined && !seen.has(r.i));
    const room = total > cap ? Math.max(6, Math.floor((cap * rows.length) / total)) : rows.length;
    const dots = rows.slice(0, room).map((r) => r.i);
    dots.forEach((i) => seen.add(i));
    return { key: L.key, title: L.title, count: L.rows.length, dots };
  });
  return { groups, shown: groups.reduce((t, x) => t + x.dots.length, 0), total };
}
function cxUsmCornerSim(M, C, focus, D3, pre = 160) {
  const nodes = [{ k: `focus`, i: focus, r: 9, x: 0, y: 0, fx: 0, fy: 0 }], links = [], G = C.groups.length;
  C.groups.forEach((gr, gi) => {
    const a = -Math.PI / 2 + (gi * 2 * Math.PI) / Math.max(1, G), R0 = 110 + Math.sqrt(gr.dots.length) * 6;
    const hole = 16 + Math.sqrt(gr.dots.length) * 4, ai = nodes.length;
    nodes.push({ k: `group`, g: gi, r: hole, x: R0 * Math.cos(a), y: R0 * Math.sin(a) });
    links.push({ source: 0, target: ai, d: R0, s: 0.5 });
    gr.dots.forEach((i, k) => { const b = k * 2.399963, rr = hole + 8 + 5 * Math.sqrt(k + 1), m = M.nodes[i]; nodes.push({ k: `dot`, i, g: gi, r: m.kind === `hub` ? 9 : Math.max(4, Math.min(8, m.r * 1.2)), x: nodes[ai].x + rr * Math.cos(b), y: nodes[ai].y + rr * Math.sin(b) }); links.push({ source: ai, target: nodes.length - 1, d: hole + 10, s: 0.35 }); });
  });
  const sim = D3.forceSimulation(nodes).randomSource(cxUsmLcg(26))
    .force(`link`, D3.forceLink(links).strength((l) => l.s).distance((l) => l.d))
    .force(`charge`, D3.forceManyBody().strength((n) => (n.k === `group` ? -320 : n.k === `focus` ? -240 : -16)).distanceMax(400))
    .force(`collide`, D3.forceCollide((n) => n.r + (n.k === `dot` ? 2 : 6)).iterations(2))
    .force(`x`, D3.forceX(0).strength(0.04)).force(`y`, D3.forceY(0).strength(0.07))
    .stop();
  for (let k = 0; k < pre; k++) sim.tick();
  return { sim, nodes };
}
function CX_UsCorner({ g, M, P, still, phone, onGroup, onNode }) {
  const cvRef = u.useRef(null), boxRef = u.useRef(null), S = u.useRef({ T: null, raf: 0, drag: null, W: 0, H: 0 });
  const [lang] = useCxLang();
  const C = u.useMemo(() => cxUsmCorner(P), [P]);
  const R = u.useMemo(() => cxUsmCornerSim(M, C, P.i, CXD3), [M, C, P.i]);
  const colorOf = (gr) => (gr.dots.length ? cxUsmColor(M.nodes[gr.dots[0]]) : `#9dbaff`);
  u.useEffect(() => {
    const cv = cvRef.current, box = boxRef.current, s = S.current; if (!cv || !box) return undefined;
    const measure = (text, font) => { const x = cv.getContext(`2d`); x.font = font; return x.measureText(text).width; };
    const fitNow = () => { const pts = R.nodes.map((n) => ({ x: n.x, y: n.y, r: n.r + (n.k === `group` ? 4 : 2) })); const f = cxUsmFit(cxUsmBox(pts), s.W, s.H, [14, 14, 14, 14], 2.2); s.T = f; };
    const draw = () => {
      const W = s.W, H = s.H, x = cv.getContext(`2d`), T = s.T; if (!W || !T) return;
      const dpr = Math.min(2, globalThis.devicePixelRatio || 1); x.setTransform(dpr, 0, 0, dpr, 0, 0);
      x.fillStyle = cxUsmIsland(); x.fillRect(0, 0, W, H);
      const X = (n) => T.x + T.k * n.x, Y = (n) => T.y + T.k * n.y, F = R.nodes[0];
      const groupsN = R.nodes.filter((n) => n.k === `group`);
      // the groups: a faint halo and ring, a line from the focus to each, and faint lines to their dots
      groupsN.forEach((n) => { const col = colorOf(C.groups[n.g]); x.globalAlpha = 0.06; x.fillStyle = col; x.beginPath(); x.arc(X(n), Y(n), n.r * T.k, 0, 6.2832); x.fill(); x.globalAlpha = 0.3; x.strokeStyle = col; x.lineWidth = 1.4; x.beginPath(); x.arc(X(n), Y(n), n.r * T.k, 0, 6.2832); x.stroke(); });
      x.globalAlpha = 0.5; x.strokeStyle = `#f4f2ee`; x.lineWidth = 1.4; x.beginPath(); groupsN.forEach((n) => { x.moveTo(X(F), Y(F)); x.lineTo(X(n), Y(n)); }); x.stroke();
      x.globalAlpha = 0.12; x.lineWidth = 1; x.beginPath(); R.nodes.forEach((n) => { if (n.k !== `dot`) return; const a = groupsN.find((q) => q.g === n.g); x.moveTo(X(a), Y(a)); x.lineTo(X(n), Y(n)); }); x.stroke();
      // the dots, in their own shapes and colors, and the focus with a ring
      R.nodes.forEach((n) => {
        if (n.k === `group`) return;
        const m = M.nodes[n.i], col = cxUsmColor(m), r = n.r * Math.max(0.8, Math.min(1.4, T.k));
        x.globalAlpha = 1;
        if (m.kind === `hub`) { x.strokeStyle = col; x.lineWidth = 2; x.beginPath(); x.arc(X(n), Y(n), r, 0, 6.2832); x.stroke(); return; }
        cxUsmPath(x, m.shape, X(n), Y(n), r);
        if (m.shape === `hexo`) { x.fillStyle = col; x.globalAlpha = 0.28; x.fill(); x.globalAlpha = 1; x.strokeStyle = col; x.lineWidth = 1.6; x.stroke(); } else { x.fillStyle = col; x.fill(); }
      });
      x.globalAlpha = 1; x.strokeStyle = `#f4f2ee`; x.lineWidth = 2.2; x.beginPath(); x.arc(X(F), Y(F), F.r * Math.max(0.8, Math.min(1.4, T.k)) + 5, 0, 6.2832); x.stroke();
      // names: the groups with their counts first, then the focus, then every dot whose name fits
      const ts = phone && cv.closest(`.cxm-large`) ? 1.15 : 1, f = (w, z) => `${w} ${Math.round(z * ts)}px ${CX_USM_FONT}`, z = (v) => Math.round(v * ts);
      const cand = [];
      groupsN.forEach((n) => { const gr = C.groups[n.g]; cand.push({ i: -1 - n.g, x: X(n), y: Y(n), rr: n.r * T.k, pri: 99, center: !0, lines: [{ text: cxUsmTr(gr.title), font: f(700, 13), size: z(13) }, { text: String(gr.count), font: f(600, 12), size: z(12) }] }); });
      cand.push({ i: F.i, x: X(F), y: Y(F), rr: F.r * T.k + 5, pri: 98, lines: [{ text: M.nodes[F.i].kind === `hub` ? cxUsmTr(M.nodes[F.i].label) : g.nodes[F.i].name, font: f(800, 14), size: z(14) }] });
      R.nodes.forEach((n, k) => { if (n.k === `dot`) cand.push({ i: n.i, x: X(n), y: Y(n), rr: n.r * T.k, pri: 50 - k * 0.001, lines: [{ text: M.nodes[n.i].kind === `hub` ? cxUsmTr(M.nodes[n.i].label) : M.nodes[n.i].kind === `person` ? cxUsmShort(g.nodes[n.i].name, 32) : M.nodes[n.i].label, font: f(500, 12), size: z(12) }] }); });   // the main map's short names ("Sixth Circuit", "Budget"); people in full
      const boxes = cxUsMapLabels(cand, measure, W, H, 90);
      x.textBaseline = `middle`; x.lineJoin = `round`;
      boxes.forEach((b) => { let y = b.y + 1.5; b.lines.forEach((l) => { y += l.size * 0.6; x.font = l.font; x.textAlign = b.align === `center` ? `center` : `left`; const tx = b.align === `center` ? b.x + b.w / 2 : b.x + 3; x.lineWidth = 4; x.strokeStyle = cxUsmIsland(); x.strokeText(l.text, tx, y); x.fillStyle = `#f4f2ee`; x.fillText(l.text, tx, y); y += l.size * 0.6; }); });
      cv.cxCorner = { focus: g.nodes[P.i].name, groups: C.groups.map((gr) => ({ key: gr.key, title: gr.title, count: gr.count, dots: gr.dots.length })), ids: R.nodes.filter((n) => n.k === `dot`).map((n) => g.nodes[n.i].id), shown: C.shown, total: C.total,
        labels: boxes.map((b) => ({ text: b.lines.map((l) => l.text).join(` `), x: b.x, y: b.y, w: b.w, h: b.h })), at: (id) => { const n = R.nodes.find((q) => q.k === `dot` && g.nodes[q.i].id === id); return n ? [X(n), Y(n)] : null; }, group: (key) => { const k = C.groups.findIndex((gr) => gr.key === key), n = groupsN.find((q) => q.g === k); return n ? [X(n), Y(n)] : null; } };
    };
    const tick = () => { s.raf = 0; if (!s.drag && R.sim.alpha() < R.sim.alphaMin()) { draw(); return; } R.sim.tick(); draw(); s.raf = requestAnimationFrame(tick); };
    const kick = () => { if (!s.raf) s.raf = requestAnimationFrame(tick); };
    const resize = () => { const W = box.clientWidth, H = box.clientHeight, dpr = Math.min(2, globalThis.devicePixelRatio || 1); if (!W || !H) return; s.W = W; s.H = H; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); fitNow(); draw(); };
    const ro = globalThis.ResizeObserver ? new globalThis.ResizeObserver(resize) : null;
    if (ro) ro.observe(box); else globalThis.addEventListener(`resize`, resize);
    resize();
    const at = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    const hit = (px, py) => {
      const T = s.T; if (!T) return null; let best = null, bd = 1e9;
      R.nodes.forEach((n) => { if (n.k === `group`) return; const d = Math.hypot(T.x + T.k * n.x - px, T.y + T.k * n.y - py); if (d < bd) { bd = d; best = n; } });
      if (best && bd <= Math.max(16, best.r * T.k + 6)) return best;
      return R.nodes.find((n) => n.k === `group` && Math.hypot(T.x + T.k * n.x - px, T.y + T.k * n.y - py) <= n.r * T.k) || null;
    };
    const pd = (e) => { if (e.button || e.isPrimary === !1) return; const [px, py] = at(e), n = hit(px, py); if (!n) return; s.drag = { n, x: e.clientX, y: e.clientY, moved: !1, id: e.pointerId }; };
    const pm = (e) => {
      const d = s.drag; if (!d) return;
      if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6 && d.n.k === `dot`) { d.moved = !0; try { cv.setPointerCapture(d.id); } catch (er) { /* not every pointer can be captured */ } if (!still) R.sim.alphaTarget(0.25); }
      if (!d.moved) return;
      const [px, py] = at(e), wx = (px - s.T.x) / s.T.k, wy = (py - s.T.y) / s.T.k;
      if (still) { d.n.x = wx; d.n.y = wy; draw(); } else { d.n.fx = wx; d.n.fy = wy; kick(); }
    };
    const pu = () => {
      const d = s.drag; s.drag = null; if (!d) return;
      if (d.moved) { if (!still) { d.n.fx = null; d.n.fy = null; R.sim.alphaTarget(0); kick(); } return; }
      if (d.n.k === `group`) onGroup(C.groups[d.n.g].key); else if (d.n.k === `dot`) onNode(d.n.i, C.groups[d.n.g].key);
    };
    const tm = (e) => { if (s.drag && s.drag.moved) e.preventDefault(); };   // while a dot is dragged the page does not scroll
    cv.addEventListener(`pointerdown`, pd); cv.addEventListener(`pointermove`, pm); cv.addEventListener(`pointerup`, pu); cv.addEventListener(`pointercancel`, pu); cv.addEventListener(`touchmove`, tm, { passive: !1 });
    return () => { if (s.raf) cancelAnimationFrame(s.raf); s.raf = 0; if (ro) ro.disconnect(); else globalThis.removeEventListener(`resize`, resize); cv.removeEventListener(`pointerdown`, pd); cv.removeEventListener(`pointermove`, pm); cv.removeEventListener(`pointerup`, pu); cv.removeEventListener(`pointercancel`, pu); cv.removeEventListener(`touchmove`, tm); };
  }, [R, still, lang]);
  const label = `Map of the connections of ${g.nodes[P.i].name}.`;
  return (
    <div className="usmp-cmap">
      <div className="usmp-cbox" ref={boxRef}><canvas ref={cvRef} className="usmp-canvas" role="img" aria-label={label} /></div>
      <p className="usmp-note">{C.shown < C.total ? <><span>Drag the dots. Tap a group to jump to its list.</span> <span>{`The map shows ${C.shown} of ${C.total}; the lists have all of them.`}</span></> : `Drag the dots. Tap a group to jump to its list.`}</p>
      <div className="usmp-jump" role="group" aria-label="Jump to a list">{C.groups.map((gr) => <button key={gr.key} type="button" onClick={() => onGroup(gr.key)}><span>{gr.title}</span><small>{gr.count}</small></button>)}</div>
    </div>
  );
}

/* The profile page itself, over the map. back: the words on the back button. bar: the language and settings buttons. */
function CX_UsProfile({ g, M, P, phone, still, back, bar, pulled, onBack, onMap, onIndex, onOpen, onRole, onHow }) {
  const ref = u.useRef(null);
  const [all, setAll] = u.useState({});
  const CAP = 5;
  u.useEffect(() => { setAll({}); const el = ref.current; if (!el) return; el.scrollTop = 0; const h = el.querySelector(`#usmp-h`); if (h) h.focus({ preventScroll: !0 }); }, [P.i]);
  const smooth = still || cxUsmLess() ? `auto` : `smooth`;
  const jump = (key, i) => {
    const L = P.lists.find((x) => x.key === key);
    const go = () => {
      const sec = ref.current && ref.current.querySelector(`#usmp-l-${key}`); if (!sec) return;
      if (sec.tagName === `DETAILS`) sec.open = !0;
      const row = i === undefined ? null : sec.querySelector(`[data-node="${g.nodes[i].id}"]`);
      (row || sec).scrollIntoView({ behavior: smooth, block: row ? `center` : `start` });
      const f = row || sec.querySelector(`h3`); if (f) f.focus({ preventScroll: !0 });
    };
    if (i !== undefined && L && L.rows.findIndex((r) => r.i === i) >= CAP && !all[key]) { setAll((a) => ({ ...a, [key]: !0 })); setTimeout(go, 30); } else go();
  };
  const fmt = (x) => (x.n === null || x.n === undefined ? `...` : x.plain ? String(x.n) : x.n.toLocaleString(`en-US`));
  const host = (url) => String(url).replace(/^https?:\/\/(www\.)?/, ``).replace(/\/$/, ``);
  const ext = <span className="sp-ext"> (opens in a new tab)</span>;
  return (
    <div className="usm-prof" ref={ref} role="region" aria-labelledby="usmp-h">
      <div className="usmp-bar">
        <button type="button" className="usm-btn usmp-back" onClick={onBack}><CXI.Back size={16} /><span>{back}</span></button>
        <div className="usmp-bar-end">{bar}</div>
      </div>
      <article className={`usmp ${phone ? `usmp-phone` : ``}`}>
        <div className="usmp-main">
          {(P.kind === `member` || P.kind === `president`) && <CxFace id={P.face} name={P.name} size={phone ? 64 : 76} className="usmp-face" />}
          <p className="usmp-kicker">{P.kicker}</p>
          <h1 id="usmp-h" className="usmp-name" tabIndex={-1}>{P.name}{!/[.!?]$/.test(P.name) && <span className="usm-dot">.</span>}</h1>
          {P.kind === `committee` && P.cid && <CX_UsxLines id={P.cid} onHow={onHow} />}
          <p className="usmp-sent">{P.sentence.map((s, k) => <u.Fragment key={k}>{k ? ` ` : null}<span>{s}</span></u.Fragment>)}</p>
          <p className="usmp-fact">{P.fact}</p>
          <div className="usmp-acts">
            <button type="button" className="usm-btn usm-pri" onClick={onMap}>Show on the map</button>
            <button type="button" className="usm-btn" onClick={onIndex}>Explore in Index</button>
          </div>
          <section className="usmp-corner" aria-labelledby="usmp-corner-h">
            <h2 id="usmp-corner-h">Their corner of the map</h2>
            <CX_UsCorner g={g} M={M} P={P} still={still} phone={phone} onGroup={(key) => jump(key)} onNode={(i, key) => jump(key, i)} />
          </section>
        </div>
        <div className="usmp-side">
          {P.glance.length > 0 && (
            <section className="usmp-glance" aria-labelledby="usmp-glance-h">
              <h2 id="usmp-glance-h">At a glance</h2>
              <ul>{P.glance.map((x) => <li key={x.label}><b>{fmt(x)}</b><span>{x.label}</span></li>)}</ul>
              {P.glanceNote && <p className="usmp-note">{P.glanceNote}</p>}
            </section>
          )}
          <section className="usmp-record" aria-labelledby="usmp-rec-h">
            <h2 id="usmp-rec-h">From the record</h2>
            <dl>
              {P.record.map((r) => (
                <div key={r.key} className={`usmp-row usmp-row-${r.key}`}>
                  <dt>{r.role ? <CX_UsxRoleBtn word={r.label} onRole={onRole} /> : r.label}</dt>
                  <dd>
                    {r.link ? <a href={r.link} target="_blank" rel="noreferrer" data-no-translate="">{host(r.link)}{ext}</a> : Array.isArray(r.value) ? <><ul>{(all[`r:${r.key}`] ? r.value : r.value.slice(0, CAP)).map((v) => <li key={v}>{v}</li>)}</ul>{r.value.length > CAP && !all[`r:${r.key}`] && <button type="button" className="usm-more" onClick={() => setAll((a) => ({ ...a, [`r:${r.key}`]: !0 }))}>{`Show all ${r.value.length}`}</button>}</> : <span className="usmp-val">{r.value}</span>}
                    {r.note && <span className="usmp-note">{r.note}</span>}
                    <span className="usmp-src">{r.src.url ? <a href={r.src.url} target="_blank" rel="noreferrer">{r.src.label}{ext}</a> : <span>{r.src.label}</span>}{r.src.pulled && <><span>, pulled </span><span>{r.src.pulled}</span></>}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </section>
          <section className="usmp-conns" aria-labelledby="usmp-conns-h">
            <h2 id="usmp-conns-h">Connections</h2>
            {P.lists.map((L) => {
              const head = <h3 tabIndex={-1}>{L.title} <small>{L.rows.length.toLocaleString(`en-US`)}</small></h3>;
              const body = <>{L.note && <p className="usmp-note">{L.note}</p>}
                <ul>
                  {(all[L.key] ? L.rows : L.rows.slice(0, CAP)).map((r, k) => {
                    const cn = <span className="usmp-cn"><span>{r.name}</span>{r.sub && <small>{r.sub}</small>}</span>;
                    // a subcommittee opens to its own two lines and its official words
                    if (r.xid) return (
                      <li key={`${r.name}-${k}`} className="usx-subli">
                        <details className="usx-sub" data-sub={r.xid}><summary>{cn}<b className="usmp-word">{r.word}</b></summary><CX_UsxLines id={r.xid} kind="sub" short /></details>
                      </li>
                    );
                    // a committee seat's word from the record is its own button: it opens what the post means
                    if (r.role) return (
                      <li key={`${r.name}-${k}`} className="usx-rl">
                        {r.i !== null && r.i !== undefined ? <button type="button" data-node={g.nodes[r.i].id} onClick={() => onOpen(r.i)}>{cn}</button> : <p>{cn}</p>}
                        <CX_UsxRoleBtn word={r.word} onRole={onRole} cls="usmp-word" />
                      </li>
                    );
                    const inner = <>{cn}<b className="usmp-word">{r.word}</b></>;
                    return (
                      <li key={`${r.name}-${k}`}>
                        {r.i !== null && r.i !== undefined ? <button type="button" data-node={g.nodes[r.i].id} onClick={() => onOpen(r.i)}>{inner}</button>
                          : r.href ? <a href={r.href} target="_blank" rel="noreferrer">{inner}{ext}</a> : <p>{inner}</p>}
                      </li>
                    );
                  })}
                </ul>
                {L.rows.length > CAP && !all[L.key] && <button type="button" className="usm-more" onClick={() => setAll((a) => ({ ...a, [L.key]: !0 }))}>{`Show all ${L.rows.length.toLocaleString(`en-US`)}`}</button>}</>;
              // a long list of the record's own words (each recorded vote, each subcommittee seat) is folded: its title and count show, the rows open on request
              return L.fold ? <details key={L.key} id={`usmp-l-${L.key}`} className="usmp-list usmp-fold"><summary>{head}</summary>{body}</details>
                : <section key={L.key} id={`usmp-l-${L.key}`} className="usmp-list">{head}{body}</section>;
            })}
          </section>
          <p className="us-preview usm-preview">{`Preview. Built from public records pulled ${pulled}. The terms of those sources have not yet been read by a person.`}</p>
        </div>
      </article>
    </div>
  );
}

/* Settings from inside the map. On a computer the map covers the app's header, so its Style, Mode, Dictionary, and Easy mode are offered
   here, with the same controls the header uses (CX_ThemeSwitch, CX_ModeChoice, cxEasyOn) and the same dictionary (CX_Dictionary). */
function CX_UsmSettings({ onClose, onDict, panelRef }) {
  return (
    <div className="usm-settings usm-float" role="dialog" aria-labelledby="usm-set-h" ref={panelRef}>
      <div className="usm-panel-top"><h2 id="usm-set-h">Settings</h2><button type="button" className="usm-done" onClick={onClose}>Done</button></div>
      <div className="usm-panel-body">
        <div className="usm-set-row"><span>Style</span><CX_ThemeSwitch /></div>
        <div className="usm-set-row"><span>Light or dark</span><CX_ModeChoice /></div>
        <button type="button" className="usm-switch" onClick={onDict}><span>Dictionary</span><small>Civic words in plain language</small></button>
        <button type="button" className="usm-switch" onClick={() => cxEasyOn()}><span>Easy mode</span><small>One thing at a time</small></button>
      </div>
    </div>
  );
}
function CX_UsmDict({ onClose }) {
  const [q, setQ] = u.useState(``), [cat, setCat] = u.useState(`all`), ref = u.useRef(null);
  u.useEffect(() => { const el = ref.current && ref.current.querySelector(`input`); if (el) el.focus(); }, []);
  return (
    <div className="usm-dict" role="dialog" aria-modal="true" aria-labelledby="usm-dict-h" ref={ref} onKeyDown={(e) => { if (e.key === `Escape`) { e.stopPropagation(); onClose(); } }}>
      <div className="usm-dict-card">
        <div className="usm-panel-top"><h2 id="usm-dict-h">Dictionary</h2><button type="button" className="usm-done" onClick={onClose}>Done</button></div>
        <div className="usm-dict-body"><CX_Dictionary query={q} setQuery={setQ} category={cat} setCategory={setCat} onRoom={(r) => CX_NAV.go(r)} onClose={onClose} /></div>
      </div>
    </div>
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
  // wide or tall: chosen from the window when the map opens, and again if the phone is turned (the map then glides to the other shape)
  const [shape, setShape] = u.useState(() => cxUsmShapeOf(globalThis.innerWidth || 0, globalThis.innerHeight || 0));
  u.useEffect(() => { if (!M) return undefined; const t = setTimeout(() => setHome(cxUsMapHome(g, M, file, shape)), home ? 0 : 30); return () => clearTimeout(t); }, [M, file, shape]);
  const [page, setPage] = u.useState(`network`);
  const [view, setView] = u.useState(`sky`);
  const [sel, setSel] = u.useState(null);
  const [sheet, setSheet] = u.useState(!1);
  const [q, setQ] = u.useState(``);
  const [searchOn, setSearchOn] = u.useState(!phone);
  const [panel, setPanel] = u.useState(!1);
  const [hover, setHover] = u.useState(null);  // the node under a mouse pointer (computers only), for the hover card
  const [setOn, setSetOn] = u.useState(!1);    // Settings (a computer: the map covers the header that holds them)
  const [dictOn, setDictOn] = u.useState(!1);  // the dictionary, opened from Settings
  const [show, setShow] = u.useState({ people: !0, committees: !0, agencies: !0, courts: !0 });
  const [lines, setLines] = u.useState({ seat: !0, lead: !0, appointed: !0, oversees: !0 });
  const [chamber, setChamber] = u.useState({ senate: !0, house: !0 });
  const [stateF, setStateF] = u.useState(``);
  const [solo, setSolo] = u.useState(null);   // { spec, label, keep }
  const [indexAt, setIndexAt] = u.useState(null);
  const [say, setSay] = u.useState(``);
  // the profile page: the profiles open, oldest first ([] is the map). A link may name one (?who=bernie-moreno): the person, never the viewer.
  const whoAt = u.useRef(null);
  if (whoAt.current === null) { try { whoAt.current = new URLSearchParams(globalThis.location.search).get(`who`) || ``; } catch (e) { whoAt.current = ``; } }
  const [prof, setProf] = u.useState([]);
  const profR = u.useRef({ n: 0, pushed: 0, skip: 0, then: null, focus: null });
  profR.current.n = prof.length;
  const [vd, setVd] = u.useState(CX_USV.v);   // the recorded votes, loaded only when a member's profile opens
  useCxUsx(!1);   // listen for the committee lines (they load when a committee, a role, or a text view first needs them, not before)
  // what a role word or a subcommittee means (a note in the same sheet the map uses), or the story "How a committee works", over everything.
  // It takes one step in the browser's history, so the back gesture closes it; it also closes with Done, a tap outside, a swipe down, and Escape.
  const [xo, setXo] = u.useState(null);   // { type: `role`, key, word } | { type: `sub`, id } | { type: `how` }
  const xoR = u.useRef({ open: null, skip: 0, focus: null });
  xoR.current.open = xo;
  const xoSheetRef = u.useRef(null);
  const openX = (o, from) => {
    const r = xoR.current;
    if (!r.open) { r.focus = from || document.activeElement; try { globalThis.history.pushState({ cxUsx: 1 }, ``, globalThis.location.href); } catch (e) { /* a sandboxed page has no history */ } }
    setXo(o); cxUsxLoad();
    setTimeout(() => { const b = rootRef.current && rootRef.current.querySelector(o.type === `how` ? `.usx-story .cxm-story-head > button` : `.usx-note .usm-done`); if (b) b.focus({ preventScroll: !0 }); }, 30);
  };
  const xoFocusBack = () => { const f = xoR.current.focus; xoR.current.focus = null; if (f && f.isConnected) setTimeout(() => { try { f.focus({ preventScroll: !0 }); } catch (e) { /* gone */ } }, 0); };
  const closeX = () => {
    const r = xoR.current; if (!r.open) return;
    setXo(null); r.open = null; r.skip += 1;
    try { globalThis.history.back(); } catch (e) { r.skip -= 1; }
    xoFocusBack();
  };
  const onRole = (key, word, from) => openX({ type: `role`, key, word }, from);
  const onSub = (id, from) => openX({ type: `sub`, id }, from);
  const onHow = (e) => openX({ type: `how` }, e && e.currentTarget);
  const [motion, setMotion] = u.useState(() => {
    try { const v = globalThis.localStorage && globalThis.localStorage.getItem(`cx-us-motion`); if (v === `still` || v === `calm` || v === `live`) return v; } catch (e) { /* no storage: the default */ }
    return phone || cxUsmLess() ? `still` : `calm`;
  });
  const chooseMotion = (m) => { setMotion(m); try { globalThis.localStorage.setItem(`cx-us-motion`, m); } catch (e) { /* a private window keeps it for this visit */ } };
  const still = motion === `still` || cxUsmLess();
  const rootRef = u.useRef(null), cvRef = u.useRef(null), topRef = u.useRef(null), menuRef = u.useRef(null), soloRef = u.useRef(null), sheetRef = u.useRef(null), searchRef = u.useRef(null), stageRef = u.useRef(null), ctlRef = u.useRef(null);
  const S = u.useRef({ T: null, W: 0, H: 0, dpr: 1, pos: null, sim: null, raf: 0, flow: null, drag: null, cursor: null, t0: 0, wc: new Map(), fitted: !1, userMoved: !1, peek: 0, zoom: null, csel: null });
  const sky = page === `network` && view === `sky`;
  u.useEffect(() => { if (page === `network` && view !== `sky`) cxUsxLoad(); }, [page, view]);   // the Index, Linked, and Tree show what each committee does

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
  st.current = { sel, vis, dimF, lines, motion, still, solo, stateF, phone, sheet, lang, shape };

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
      const R = cxUsMapSim(M, CXD3, { keep: solo.keep, from, pre: 220, shape });
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
      const R = cxUsMapSim(M, CXD3, { keep: solo ? solo.keep : null, objs: s.pos, pre: 0, shape });
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
        x.globalAlpha = a; const col = cxUsmColor(m);
        cxUsmPath(x, m.shape, px, py, sr(i));
        if (m.shape === `hexo`) { x.fillStyle = col; x.globalAlpha = a * 0.28; x.fill(); x.globalAlpha = a; x.strokeStyle = col; x.lineWidth = 1.6; x.stroke(); }
        else { x.fillStyle = col; x.fill(); }
      }
    });
    // rings: the focus, and the keyboard's place
    [[F, `#f4f2ee`, 2.2], [s.cursor, `#f1b083`, 2], [s.hover === F ? null : s.hover, `#f4f2ee`, 1.4]].forEach(([i, col, w]) => { if (i === null || i === undefined || !shown[i]) return; x.globalAlpha = 1; x.strokeStyle = col; x.lineWidth = w; x.beginPath(); x.arc(X(i), Y(i), (M.nodes[i].kind === `hub` ? sr(i) : sr(i) * 1.35) + 4, 0, 6.2832); x.stroke(); });
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
    // At rest only the main things are named: the four branches with their totals, the committees (on a phone the largest few, more as
    // you zoom in), the Supreme Court and the courts of appeals, and the departments if they fit. People are named only around a pick
    // (the one picked and everything tied to it), when zoomed in so far that a few dozen people are on the screen, and in the hover card.
    const kf = s.kFit || 0.8, closer = k > kf * 1.3, deep = c.solo || k > kf * 1.6;
    if (F !== null) add(F, 100, `focus`);
    if (s.cursor !== null) add(s.cursor, 98, `near`);
    M.slots.industries.slice(0, 4).forEach((i) => add(i, 95, `hub`));
    if (F !== null) nb.forEach((z, j) => add(z.o, 60 - Math.min(20, j * 0.05) + (M.nodes[z.o].kind === `committee` ? 4 : 0), `near`));
    if (c.stateF) for (let i = 0; i < N; i++) if (g.nodes[i].kind === `member` && g.nodes[i].m.state === c.stateF) add(i, 70, `near`);
    const coms = M.slots.industries.slice(4).filter((i) => shown[i]).sort((a, b) => M.nodes[b].total - M.nodes[a].total || a - b);
    const few = c.phone && !closer && !c.solo;   // a phone at rest: the largest few committees of each chamber, more as you zoom in
    const perChamber = { senate: 0, house: 0, joint: 0 };
    coms.forEach((i) => {
      const b = M.nodes[i].branch;
      if ((c.phone && F !== null) || (few && (b === `joint` || perChamber[b] >= CX_USM_PHONE_COMMITTEES / 2))) return;   // a pick on a phone names only its own ties
      perChamber[b] += 1; add(i, (F !== null ? 30 : 50) + Math.min(9, M.nodes[i].total / 8), `committee`);
    });
    if (F === null) for (let i = 0; i < N; i++) {
      const m = M.nodes[i], n = g.nodes[i];
      if (m.kind === `court` && (n.c.type === `supreme` || (n.c.type === `appeals` && !few))) add(i, n.c.type === `supreme` ? 45 : 40, `near`);
      else if (m.kind === `agency` && !n.a.parent_id && /\bDepartment\b/.test(n.name) && (!c.phone || closer)) add(i, 30, `near`);
      else if (deep && (m.kind === `court` || m.kind === `agency`)) add(i, m.kind === `court` ? 22 : !n.a.parent_id ? 20 : 12 + m.r, `far`);
    }
    // people: only when so few are on the screen that their names can be read (a conservative count), never by the hundred
    const onScreen = []; for (let i = 0; i < N; i++) { if (M.nodes[i].kind !== `person` || !shown[i]) continue; const px = X(i), py = Y(i); if (px >= 0 && py >= 0 && px <= s.W && py <= s.H) onScreen.push(i); }
    if (F === null && onScreen.length <= CX_USM_PEOPLE_NAMED) onScreen.forEach((i) => add(i, 12 + M.nodes[i].r, `far`));
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
    cv.cxMap = { labels: boxes.map((b) => ({ i: b.i, kind: M.nodes[b.i].kind, name: g.nodes[b.i].name, text: b.lines.map((l) => l.text).join(` `), x: b.x, y: b.y, w: b.w, h: b.h })), hover: s.hover === null || s.hover === undefined ? null : g.nodes[s.hover].name, peopleOnScreen: onScreen.length, focus: F === null ? null : g.nodes[F].name, near: F === null ? [] : nb.map((z) => z.o), shown: shown.reduce((t, v) => t + v, 0), k, frames: (s.frames = (s.frames || 0) + 1), tx: T.x, ty: T.y, rings: M.slots.industries.slice(0, 4).filter((i) => shown[i]).map((i) => [X(i), Y(i), sr(i) + 8]), motion: c.motion, still: c.still, pts: () => { const o = []; for (let i = 0; i < N; i++) if (shown[i]) o.push([X(i), Y(i)]); return o; }, at: (name) => { const n = g.nodes.find((z) => z.name === name); return n && s.pos ? [T.x + k * P[n.i].x, T.y + k * P[n.i].y] : null; } };
    return anim;
  };
  // no drawing while the page is hidden or a profile covers the map (Calm and Live would otherwise keep moving it unseen)
  const request = () => { const s = S.current; if (!s.raf) s.raf = requestAnimationFrame((now) => { s.raf = 0; if (document.hidden || profR.current.n) return; if (draw(now)) request(); }); };

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
      { const sh = cxUsmShapeOf(W, H); if (sh !== st.current.shape) setShape(sh); }   // the phone was turned: settle into the other shape
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
      if (hold) { clearTimeout(hold.t); hold = null; }   // a second finger (a pinch) is not a hold
      if (e.button || e.isPrimary === !1) return; const r = cv.getBoundingClientRect(), i = hitAt(e.clientX - r.left, e.clientY - r.top); if (i === null) return;
      drag = { i, x: e.clientX, y: e.clientY, moved: !1, id: e.pointerId };
      const h = { i, x: e.clientX, y: e.clientY, fired: !1, t: 0 };
      h.t = setTimeout(() => { if (hold !== h) return; h.fired = !0; pick(i, !0); }, HOLD);
      hold = h;
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
    // the hover card (a computer with a mouse only): pointing at a person, committee, court, or agency shows who it is beside it.
    // Everything on it is also in the side sheet after a click, and on a phone there is none.
    const canHover = !phone && !!(globalThis.matchMedia && globalThis.matchMedia(`(hover: hover) and (pointer: fine)`).matches);
    const hovSet = (j) => { if (j === (s.hover ?? null)) return; s.hover = j; setHover(j); if (j !== null && g.nodes[j].kind === `committee`) cxUsxLoad(); cv.style.cursor = j !== null ? `pointer` : ``; request(); };
    const hov = (e) => { if (!canHover || drag || e.buttons) return; const r = cv.getBoundingClientRect(), i = hitAt(e.clientX - r.left, e.clientY - r.top); hovSet(i !== null && M.nodes[i].kind !== `hub` ? i : null); };
    const hovOut = () => hovSet(null);
    const hovKey = (e) => { if (e.key === `Escape`) hovOut(); };
    s.hovOut = hovOut;
    if (canHover) { cv.addEventListener(`pointermove`, hov); cv.addEventListener(`pointerleave`, hovOut); cv.addEventListener(`pointerdown`, hovOut); document.addEventListener(`keydown`, hovKey); zoom.on(`start.hover`, (e) => { if (e.sourceEvent && e.sourceEvent.type === `wheel`) hovOut(); }); }
    const vis2 = () => { if (!document.hidden) request(); };
    document.addEventListener(`visibilitychange`, vis2);
    return () => {
      momStop(); if (ro) ro.disconnect(); else globalThis.removeEventListener(`resize`, resize);
      csel.on(`.zoom`, null); cv.removeEventListener(`pointerdown`, pd); cv.removeEventListener(`pointermove`, pm); cv.removeEventListener(`pointerup`, pu); cv.removeEventListener(`pointercancel`, pu); cv.removeEventListener(`click`, click);
      cv.removeEventListener(`pointermove`, hov); cv.removeEventListener(`pointerleave`, hovOut); cv.removeEventListener(`pointerdown`, hovOut); document.removeEventListener(`keydown`, hovKey); s.hover = null;
      document.removeEventListener(`visibilitychange`, vis2); s.fitted = !1; s.zoom = null;
    };
  }, [home, sky, M]);
  u.useEffect(() => { requestAnimationFrame(request); }, [sel, show, lines, chamber, stateF, motion, lang, sheet, panel, prof.length === 0]);   // after the panel or sheet is laid out, so no name is placed under it; and again when a profile closes
  u.useEffect(() => { if (S.current.fitted) fit(!st.current.still); }, [show, chamber]);

  // ---- choosing something
  const pick = (i, open) => {
    const s = S.current; s.t0 = performance.now(); s.cursor = null;
    setSel(i); if (open) setSheet(!0);
    const n = g.nodes[i]; setSay([n.name, typeof cxUsWhere(n) === `string` ? cxUsWhere(n) : ``]);
    if (page !== `network` || view !== `sky`) { setPage(`network`); setView(`sky`); }
    requestAnimationFrame(() => focusFit(i));
  };
  const clear = () => { setSel(null); setSheet(!1); S.current.cursor = null; request(); };

  // ---- the profile page: opening one adds a step to the browser's history (with the person's name in the address), so the back gesture
  // and the Back button both return to the same place on the map: the same zoom, the same pick, the same sheet
  const whoUrl = (i) => { const u0 = new URL(globalThis.location.href); u0.searchParams.set(`who`, cxUsmSlugs(g).of[i]); return u0.href; };
  const openProfile = (i) => {
    const pr = profR.current;
    if (!prof.length) pr.focus = document.activeElement;
    try { globalThis.history.pushState({ cxUsmProf: prof.length + 1 }, ``, whoUrl(i)); pr.pushed += 1; } catch (e) { /* a sandboxed page has no history */ }
    setProf([...prof, i]); setSetOn(!1);
  };
  const closeProfiles = (then) => {
    const pr = profR.current, k = pr.pushed;
    setProf([]);
    const done = () => { if (then) then(); else if (pr.focus && pr.focus.isConnected) setTimeout(() => { try { pr.focus.focus({ preventScroll: !0 }); } catch (e) { /* gone */ } }, 0); };
    if (k > 0) { pr.pushed = 0; pr.skip += 1; pr.then = done; try { globalThis.history.go(-k); } catch (e) { pr.skip -= 1; pr.then = null; done(); } }
    else {   // opened from a link: the person leaves the address
      try { const u0 = new URL(globalThis.location.href); u0.searchParams.delete(`who`); globalThis.history.replaceState(globalThis.history.state, ``, u0.href); } catch (e) { /* no history */ }
      done();
    }
  };

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
      const xr = xoR.current;   // a note or the story is the newest step while it is open
      if (xr.skip) { xr.skip -= 1; return; }
      if (xr.open) { xr.open = null; setXo(null); xoFocusBack(); return; }
      const pr = profR.current;
      if (pr.skip) { pr.skip -= 1; if (!pr.skip && pr.then) { const f = pr.then; pr.then = null; f(); } return; }
      if (pr.n > 0) {   // the back gesture on a profile: the one before it, or the map (and focus goes back where it was)
        if (pr.pushed > 0) pr.pushed -= 1;
        if (pr.n === 1 && pr.focus) { const f = pr.focus; setTimeout(() => { try { if (f.isConnected) f.focus({ preventScroll: !0 }); } catch (e) { /* gone */ } }, 0); }
        setProf((s) => s.slice(0, -1)); return;
      }
      const b = back.current;
      if (b.skip) { b.skip -= 1; return; }
      if (b.pushed) { const was = b.pushed; b.pushed = ``; if (was === `sheet`) setSheet(!1); else setPanel(!1); }
    };
    globalThis.addEventListener(`popstate`, onPop);
    return () => globalThis.removeEventListener(`popstate`, onPop);
  }, []);
  // a link that names someone opens their profile once the record is here; a name we cannot find leaves the map, and says so
  u.useEffect(() => {
    if (!g || !M || !whoAt.current) return;
    const i = cxUsmFind(g, whoAt.current); whoAt.current = ``;
    if (i === null) { setSay(`We could not find that profile, so here is the map.`); try { const u0 = new URL(globalThis.location.href); u0.searchParams.delete(`who`); globalThis.history.replaceState(globalThis.history.state, ``, u0.href); } catch (e) { /* no history */ } return; }
    setProf([i]);
  }, [g, M]);
  // while a profile is open its name stays in the address (the desktop app rewrites the address after a change of its own, without it)
  const profTop = prof.length ? prof[prof.length - 1] : null;
  const P = u.useMemo(() => (profTop !== null && g && M && data ? cxUsProfile(g, M, data, vd, profTop) : null), [profTop, vd, g, M, data]);
  u.useEffect(() => {
    if (profTop === null || !g) return undefined;
    const slug = cxUsmSlugs(g).of[profTop];
    const fix = () => { try { const u0 = new URL(globalThis.location.href); if (u0.searchParams.get(`who`) !== slug) { u0.searchParams.set(`who`, slug); globalThis.history.replaceState(globalThis.history.state, ``, u0.href); } } catch (e) { /* no history */ } };
    fix(); const t1 = setTimeout(fix, 400), t2 = setTimeout(fix, 1200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [profTop, g, !!xo]);   // and again after a note over the profile closes (the desktop app rewrites the address when its history steps back)
  // a member's profile needs the recorded votes: they load then, not before
  u.useEffect(() => { if (profTop !== null && g && g.nodes[profTop].kind === `member` && !vd) { let live = !0; cxUsVotesLoad().then((d) => { if (live && d) setVd(d); }); return () => { live = !1; }; } return undefined; }, [profTop, g]);
  // while the profile or the dictionary is open, the map under it is out of reach (keyboard and screen reader)
  u.useEffect(() => {
    const root = rootRef.current; if (!root || (!prof.length && !dictOn && !xo)) return undefined;
    const keep = xo ? /usx-|usm-sr/ : dictOn ? /usm-dict|usm-sr/ : /usm-prof|usm-settings|usm-dict|usm-sr/;
    const marked = [...root.children].filter((c) => !keep.test(String(c.className)) && !c.hasAttribute(`inert`));
    marked.forEach((c) => c.setAttribute(`inert`, ``));
    return () => marked.forEach((c) => c.removeAttribute(`inert`));
  });

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
      s.cursor = L[j]; const n = g.nodes[L[j]]; setSay([n.name, L[j] === sel ? `Selected.` : `Press Enter to select.`]); request(); return;
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
    if (e.key === `/` && !xo && !(e.target.closest && e.target.closest(`input, select, textarea`))) { e.preventDefault(); setSearchOn(!0); setTimeout(() => searchRef.current && searchRef.current.focus(), 0); }
    else if (e.key === `Escape` && e.target === searchRef.current) { if (q) setQ(``); else e.target.blur(); }
    else if (e.key === `Escape` && xo) { e.preventDefault(); closeX(); }
    else if (e.key === `Escape` && !(e.target.closest && e.target.closest(`input, select, textarea, canvas`))) { if (setOn) closeSettings(); else if (profR.current.n) closeProfiles(); else if (sheet) setSheet(!1); else if (panel) setPanel(!1); }
  };
  const setBtnRef = u.useRef(null), setPanelRef = u.useRef(null);
  const openSettings = (e) => { setBtnRef.current = e.currentTarget; setSetOn(!setOn); };
  const closeSettings = () => { setSetOn(!1); if (setBtnRef.current && setBtnRef.current.isConnected) setBtnRef.current.focus(); };
  // Settings closes on a click anywhere outside it (the dictionary it opens is its own dialog)
  u.useEffect(() => {
    if (!setOn) return undefined;
    const f = (e) => { const t = e.target; if ((setPanelRef.current && setPanelRef.current.contains(t)) || (t.closest && t.closest(`.usm-set-btn`))) return; setSetOn(!1); };
    document.addEventListener(`pointerdown`, f);
    return () => document.removeEventListener(`pointerdown`, f);
  }, [setOn]);
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
  // the hover card: beside the thing pointed at (to its right, or its left near the edge), never under the pointer, and nothing it says is
  // only here: the same kicker, name, and fact line are in the side sheet after a click. No party and no score, as everywhere on the map.
  const hoverCard = (() => {
    const s = S.current; if (hover === null || !sky || prof.length || !s.T || !s.pos || !s.pos[hover] || !vis(hover)) return null;
    const hi = cxUsMapSheet(g, M, data, hover), k = s.T.k, zr = Math.max(0.8, Math.min(2.2, Math.pow(k, 0.6)));
    const px = s.T.x + k * s.pos[hover].x, py = s.T.y + k * s.pos[hover].y, rr = M.nodes[hover].r * zr * 1.3 + 14, w = 288;
    const left = px + rr + w > s.W - 8 ? Math.max(8, px - rr - w) : px + rr, top = Math.max(8, Math.min(s.H - 220, py - 26));
    const what = hi.cid ? cxUsxWhat(hi.cid) : ``;   // a committee: the "what it does" line only (the rest is in the sheet after a click)
    return (
      <div className="usm-hover" aria-hidden="true" style={{ left: Math.round(left), top: Math.round(top), width: w }}>
        <p className="usmp-kicker">{hi.kicker}</p>
        <p className="usm-hover-n">{hi.name}</p>
        {what && <p className="usm-hover-w usx-what">{what}</p>}
        {what && <p className="usm-hover-r">{cxUsxShortReview()}</p>}
        <p className="usm-hover-f">{hi.fact}</p>
        <p className="usm-hover-c">Click for their connections and profile.</p>
      </div>
    );
  })();
  const backLabel = page === `people` ? `Back to People` : page === `topics` ? `Back to Votes by topic` : view === `index` ? `Back to the Index` : view === `tree` ? `Back to the Tree` : view === `linked` ? `Back to Linked` : `Back to the map`;
  const setButton = !phone ? <button type="button" className="usm-btn usm-set-btn" aria-expanded={setOn} aria-haspopup="dialog" onClick={openSettings}><CXI.Sliders size={16} /><span>Settings</span></button> : null;
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
          {[[`people`, `People`, `circle`], [`committees`, `Committees`, `hex`], [`agencies`, `Agencies`, `square`], [`courts`, `Courts`, `hexo`]].map(([key, t, shape]) => (
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
          {[[`People`, `circle`, [[`Senators`, CX_USM_FAMILY.person.senate], [`Representatives`, CX_USM_FAMILY.person.house], [`Executive officials`, CX_USM_FAMILY.person.exec], [`Judges`, CX_USM_FAMILY.person.courts]]],
            [`Committees`, `hex`, [[`Senate`, CX_USM_FAMILY.committee.senate], [`House`, CX_USM_FAMILY.committee.house], [`Joint`, CX_USM_FAMILY.committee.joint]]],
            [`Agencies`, `square`, [[`Departments`, CX_USM_FAMILY.agency.dept], [`Other agencies`, CX_USM_FAMILY.agency.other]]],
            [`Courts`, `hexo`, [[`Courts`, CX_USM_COLORS.courts]]]].map(([g, shape, rows]) => (
            <ul key={g} aria-label={g}>{rows.map(([t, color]) => <li key={t}><CxUsmShape shape={shape} color={color} /><span>{t}</span></li>)}</ul>))}
          <p className="usm-note">Circles are people, hexagons are committees and courts, and squares are agencies. A committee is a filled hexagon; a court is an outlined one. A ring is a branch, with its total. Things sit near what they are tied to on the record. Distance is not a rank.</p>
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
    : view === `index` ? <CX_UsDoors key={indexAt ? indexAt.at : `index`} data={data} g={g} visible={visibleText} dim={() => !1} q={q} start={indexAt} onOpen={(i) => { setSel(i); openProfile(i); }} onTopics={(area) => { CX_US_PICK.area = area; goPage(`topics`); }} />
    : view === `tree` ? <CX_UsTree data={data} g={g} onOpen={(i) => { setSel(i); openProfile(i); }} />
    : view === `linked` ? (
      <div className="us-linked">
        {!cur && <p>Choose a person, committee, agency, or court on the map, in the Index, or in the Tree, and its connections are listed here.</p>}
        {cur && <><div className="us-who">{(cur.kind === `member` || cur.kind === `president`) && <CxFace id={cxUsFaceId(cur)} name={cur.name} size={64} />}<h2>{cur.name}</h2></div>
          {cur.kind === `committee` && <CX_UsxLines id={cur.c.id} onHow={onHow} />}
          <ul className="us-facts">{cxUsFacts(g, cur).map((f, k) => <li key={k}>{f}</li>)}</ul>
          {cxUsLink(cur) && <p><a href={cxUsLink(cur)[1]} target="_blank" rel="noreferrer">{cxUsLink(cur)[0]}<span className="sp-ext"> (opens in a new tab)</span></a></p>}
          <p className="usm-linked-acts"><button type="button" className="usm-btn usm-pri" onClick={() => openProfile(cur.i)}>Open profile</button> <button type="button" className="cx-link-button" onClick={() => pick(cur.i, !0)}>Show in Sky</button></p>
          {linkedLinks.length > 0 && <><h3>Connected to {linkedLinks.length}</h3><ul className="us-conn">{linkedLinks.slice(0, 80).map((l, k) => {
            // a committee seat's word (Chairman, Member, Ex officio) opens what the post means; a committee says what it does
            const seat = (cur.kind === `member` && l.kind === `committee`) || (cur.kind === `committee` && l.kind === `member`);
            const what = l.kind === `committee` ? cxUsxWhat(g.nodes[l.to].c.id) : ``;
            return <li key={k} className={seat ? `usx-rl` : undefined}><button type="button" onClick={() => setSel(l.to)}>{l.name}</button> {seat ? <CX_UsxRoleBtn word={cxUsmRole(l.rel)} onRole={onRole} cls="us-role" /> : <small>{l.text}</small>}{what && <small className="usx-sub">{what}</small>}</li>;
          })}</ul>{linkedLinks.length > 80 && <p>And {linkedLinks.length - 80} more.</p>}</>}</>}
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
        {setButton}
      </header>
      {P && <CX_UsProfile g={g} M={M} P={P} phone={phone} still={still} pulled={pulled} back={backLabel} onBack={() => closeProfiles()}
        bar={<><CX_LangButton cls="usm-lang" short={phone} />{setButton}</>}
        onMap={() => closeProfiles(() => { if (solo && !solo.keep.has(P.i)) setSolo(null); pick(P.i, !0); })}
        onIndex={() => { const n = g.nodes[P.i]; closeProfiles(() => { setIndexAt({ ...cxUsmDoorOf(n), id: n.id, at: Date.now() }); setPage(`network`); setView(`index`); setSheet(!1); }); }}
        onOpen={openProfile} onRole={onRole} onHow={onHow} />}
      {xo && xo.type !== `how` && <button type="button" className="usm-scrim usx-scrim" aria-label="Close" tabIndex={-1} onClick={closeX} />}
      {xo && xo.type === `role` && <CX_UsMapSheet cls="usx-note" hid="usx-note-h" noActs phone={phone} still={still} sheetRef={xoSheetRef} fresh onPeek={() => {}} onMove={() => {}} onClose={closeX}
        info={{ kicker: `What the word means`, name: xo.word, sentence: ``, fact: ``, lists: [], src: null }} lead={<CX_UsxRoleBody rkey={xo.key} />} />}
      {xo && xo.type === `sub` && (() => {
        const pc = g.byId.get(`c:${xo.id.slice(0, 4)}`), s = pc && pc.c.subcommittees.find((x) => x.id === xo.id);
        return <CX_UsMapSheet cls="usx-note" hid="usx-note-h" noActs phone={phone} still={still} sheetRef={xoSheetRef} fresh onPeek={() => {}} onMove={() => {}} onClose={closeX}
          info={{ kicker: pc ? `Subcommittee of the ${pc.name}` : `Subcommittee`, name: s ? s.name : xo.id, sentence: ``, fact: s && s.chair ? `Chair: ${s.chair}.` : ``, lists: [], src: null }} lead={<CX_UsxLines id={xo.id} kind="sub" />} />;
      })()}
      {xo && xo.type === `how` && <CX_UsxStory onClose={closeX} />}
      {setOn && !phone && <CX_UsmSettings panelRef={setPanelRef} onClose={closeSettings} onDict={() => { setSetOn(!1); setDictOn(!0); }} />}
      {dictOn && <CX_UsmDict onClose={() => { setDictOn(!1); if (setBtnRef.current && setBtnRef.current.isConnected) setBtnRef.current.focus(); }} />}
      {sky && (
        <div className="usm-stage" ref={stageRef}>
          <canvas ref={cvRef} className="usm-canvas" tabIndex={0} role="img" onKeyDown={onCanvasKey}
            aria-label={`Map of ${visibleCount} people, committees, agencies, and courts, grouped around the Senate, the House, the executive branch, and the courts. The Index, Linked, and Tree views hold the same information as text. Keys: right and left bracket move, Enter selects, Escape clears, arrows pan, plus and minus zoom, slash searches.`} />
          {soloNote}
          <div className="usm-ctl" ref={ctlRef}>
            <button type="button" className="usm-btn usm-show-btn usm-float" aria-expanded={panel} onClick={() => { setPanel(!panel); if (phone || (globalThis.innerWidth || 0) < 1000) setSheet(!1); }}>Show</button>
            {soloPicker}
            <div className="usm-zoom usm-float">
              <button type="button" aria-label="Zoom in" onClick={() => zoomBy(1.4)}>+</button>
              <button type="button" aria-label="Zoom out" onClick={() => zoomBy(1 / 1.4)}>−</button>
              <button type="button" aria-label="Fit everything" onClick={() => fit(!0)}>Fit</button>
              {!phone && <button type="button" aria-pressed={full} aria-label={full ? `Leave full screen` : `Full screen`} onClick={toggleFull}>{full ? `Exit` : `Full`}</button>}
            </div>
          </div>
          {phone && cur && !sheet && <button type="button" className="usm-chip usm-float" onClick={() => setSheet(!0)}><strong>{cur.name}</strong><span>Details</span></button>}
          {hoverCard}
          {panel && phone && <button type="button" className="usm-scrim" aria-label="Close Show" onClick={() => setPanel(!1)} />}
          {panel && showPanel}
          {sheet && info && <CX_UsMapSheet info={info} phone={phone} still={still} sheetRef={sheetRef} fresh onPeek={(p) => { S.current.peek = p; }} onMove={request} onClose={() => setSheet(!1)} onPick={(i) => { if (solo && !solo.keep.has(i)) setSolo(null); pick(i, !0); }} onProfile={() => openProfile(sel)} onSolo={() => { if (solo && solo.spec.node === sel) setSolo(null); else soloNode(sel); }} soloOn={!!(solo && solo.spec.node === sel)} onIndex={openIndex}
            lead={info.cid ? <CX_UsxLines id={info.cid} onHow={onHow} /> : null} onRole={onRole} onSub={onSub} />}
        </div>
      )}
      {!sky && <div className="us usm-text">{textView}</div>}
      <p className="usm-sr" role="status" aria-live="polite">{Array.isArray(say) ? say.filter(Boolean).map((t, k) => <span key={k}>{k ? <span>, </span> : null}<span>{t}</span></span>) : say}</p>
    </section>
  );
}
