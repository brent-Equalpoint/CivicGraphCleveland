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
const CX_USM_BRANCH_WORD = { senate: `Senate`, house: `House`, joint: `Joint`, exec: `Executive`, courts: `Courts` };
const CX_USM_SHAPE_WORD = { ring: `Group`, diamond: `Committee`, circle: `Person`, square: `Agency`, hex: `Court` };

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
  const keep = opts.keep || null, from = opts.from || cxUsmSeed(M);
  const nodes = M.nodes.filter((n) => !keep || keep.has(n.i)).map((n) => ({ i: n.i, r: n.r, kind: n.kind, charge: keep && n.kind === `hub` ? -150 : n.charge, x: from[n.i][0], y: from[n.i][1] }));
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
   Returns the boxes it drew: [{ i, x, y, w, h, lines, align }] in screen pixels. */
function cxUsMapLabels(cand, measure, W, H, max = 90) {
  const out = [], pad = 3;
  const free = (b) => b.x >= 2 && b.y >= 2 && b.x + b.w <= W - 2 && b.y + b.h <= H - 2 && !out.some((o) => b.x < o.x + o.w && b.x + b.w > o.x && b.y < o.y + o.h && b.y + b.h > o.y);
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
