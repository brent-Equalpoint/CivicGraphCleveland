/* v5.18 United States, one model for every view (plan-federal-map.md, phase 2).
   The Index, Linked, Tree, and (later) the rebuilt Sky all read this, so a count or a sentence is written once and cannot disagree.
   Pure functions only: no React, no page. They read the landscape record (data/us-landscape-2026.json, through cxUsGraph) and,
   when it has loaded, the recorded votes. Rules kept: counts and plain sentences, never a score or a rank; party is not used here;
   a connection is a recorded relationship, not control; a missing record is not a no. */

/* the five ways into the federal government */
const CX_US_DOORS = [
  { id: `members`, label: `Members of Congress`, one: `member`, many: `members` },
  { id: `committees`, label: `Committees`, one: `committee`, many: `committees` },
  { id: `executive`, label: `Executive branch`, one: `leader or agency`, many: `leaders and agencies` },
  { id: `courts`, label: `Courts and judges`, one: `court or judge`, many: `courts and judges` },
  { id: `areas`, label: `Policy areas`, one: `policy area`, many: `policy areas` },
  { id: `states`, label: `States`, one: `state`, many: `states` },
];

/* a recorded vote's policy area, the way the topics view reads it */
function cxUsAreaOf(vd, v) {
  const b = v.bill ? vd.bills[v.bill] : null;
  return b && b.policy_area ? b.policy_area : v.kind === `nomination` ? `Nominations` : CX_NO_AREA;
}

/* groups inside each door: { id, label, count, nodes: [node index] } or { id, label, count, states: [...] } for the non-graph doors.
   vd (recorded votes) is optional: without it the policy-area door says so and shows no counts. */
function cxUsDoors(data, g, vd) {
  const byKind = (k, f = () => !0) => g.nodes.filter((n) => n.kind === k && f(n));
  const members = byKind(`member`), committees = byKind(`committee`), agencies = byKind(`agency`), leaders = byKind(`president`), courts = byKind(`court`), judges = byKind(`judge`);
  const mk = (id, label, nodes) => ({ id, label, count: nodes.length, nodes: nodes.map((n) => n.i) });
  const doors = {
    members: [mk(`senate`, `Senate`, members.filter((n) => n.m.chamber === `senate`)), mk(`house`, `House`, members.filter((n) => n.m.chamber === `house`))],
    committees: [mk(`senate`, `Senate committees`, committees.filter((n) => n.c.chamber === `senate`)), mk(`house`, `House committees`, committees.filter((n) => n.c.chamber === `house`)), mk(`joint`, `Joint committees`, committees.filter((n) => n.c.chamber === `joint`))],
    executive: [mk(`current`, `President and Vice President`, leaders.filter((n) => n.p.current)), mk(`former`, `Former Presidents`, leaders.filter((n) => !n.p.current)), mk(`top`, `Top-level agencies`, agencies.filter((n) => !n.a.parent_id)), mk(`sub`, `Sub-agencies`, agencies.filter((n) => n.a.parent_id))].filter((x) => x.count),
    courts: [mk(`supreme`, `Supreme Court`, courts.filter((n) => n.c.type === `supreme`)), mk(`appeals`, `Courts of appeals`, courts.filter((n) => n.c.type === `appeals`)), mk(`district`, `District courts`, courts.filter((n) => n.c.type === `district`)), mk(`other`, `Other courts`, courts.filter((n) => n.c.type === `other`)), mk(`judges`, `Judges`, judges)].filter((x) => x.count),
  };
  const sc = new Map();
  data.members.forEach((m) => { const s = sc.get(m.state) || { senate: 0, house: 0 }; s[m.chamber] += 1; sc.set(m.state, s); });
  doors.states = [{ id: `all`, label: `States and territories`, count: sc.size, states: [...sc.keys()].sort((a, b) => cxStateName(a).localeCompare(cxStateName(b))).map((code) => ({ code, name: cxStateName(code), senators: sc.get(code).senate, representatives: sc.get(code).house })) }];
  if (vd) {
    const per = new Map();
    vd.votes.forEach((v) => { if (!v.final) return; const a = cxUsAreaOf(vd, v); per.set(a, (per.get(a) || 0) + 1); });
    const list = [...per].sort((a, b) => (a[0] === CX_NO_AREA) - (b[0] === CX_NO_AREA) || a[0].localeCompare(b[0])).map(([area, n]) => ({ area, votes: n }));
    doors.areas = [{ id: `all`, label: `Policy areas with a vote that decided something`, count: list.length, areas: list }];
  } else doors.areas = [{ id: `all`, label: `Policy areas`, count: null, areas: [] }];
  return CX_US_DOORS.filter((d) => doors[d.id] && doors[d.id].length).map((d) => ({ ...d, groups: doors[d.id], count: doors[d.id].reduce((t, x) => t + (x.count || 0), 0), ready: d.id !== `areas` || !!vd }));
}

/* what one connection is, said next to the other node's name ("Senate Committee on Finance" then "Chair."). e is an edge of the graph (a, b, rel). */
function cxUsEdgeSentence(g, e, from) {
  const me = g.nodes[from], other = g.nodes[e.a === from ? e.b : e.a];
  const chamberWord = (n) => (n.group === `senate` ? `the Senate` : n.group === `house` ? `the House` : n.group === `exec` ? `the federal executive branch` : n.group === `judicial` ? `the federal courts` : n.name);
  const seat = (n) => (n.j.title === `Judge` ? `Judge` : n.j.title) + (n.j.chief ? `, chief` : ``);   // "Judge", "Chief Justice", "Associate Justice", "Judge, chief"
  if (other.kind === `hub`) {
    if (me.kind === `committee`) return `A ${me.c.chamber === `joint` ? `joint` : me.c.chamber === `senate` ? `Senate` : `House`} committee of Congress.`;
    if (me.kind === `member`) return `Sits in ${chamberWord(other)}.`;
    if (me.kind === `court`) return `A federal court.`;
    if (me.kind === `president`) return me.p.current ? `Serves in ${chamberWord(other)}.` : `Served as President.`;
    return `A federal executive agency.`;
  }
  if (me.kind === `hub`) return `${other.kind === `member` ? `Member` : other.kind === `committee` ? `Committee` : other.kind === `court` ? `Court` : other.kind === `president` ? `Leader` : `Agency`}.`;
  if ((me.kind === `member` && other.kind === `committee`) || (me.kind === `committee` && other.kind === `member`)) {
    const r = e.rel === `member` ? `Member` : e.rel === `ex officio` ? `Member, ex officio` : e.rel.charAt(0).toUpperCase() + e.rel.slice(1);
    return `${r}.`;
  }
  if (me.kind === `agency` && other.kind === `agency`) return e.a === from ? `Larger agency it belongs to.` : `Part of this agency.`;
  if (me.kind === `judge` && other.kind === `court`) return `${seat(me)}.`;
  if (me.kind === `court` && other.kind === `judge`) return `${seat(other)}.`;
  if (me.kind === `judge` && other.kind === `president`) return `Appointed by this President.`;
  if (me.kind === `president` && other.kind === `judge`) return `Appointed this judge.`;
  if (me.kind === `court` && other.kind === `court`) {
    const t = (n) => n.c.type;
    if (t(me) === `district` && t(other) === `appeals`) return `Its appeals go to this court.`;
    if (t(me) === `appeals` && t(other) === `district`) return `Hears appeals from this court.`;
    if (t(me) === `appeals` && t(other) === `supreme`) return `Its decisions can be appealed to this court.`;
    if (t(me) === `supreme` && t(other) === `appeals`) return `Can hear appeals from this court.`;
  }
  return `Connected.`;
}
/* every connection of a node, in sentences. Hubs are folded into the first sentence; the rest are people, committees, and agencies. */
function cxUsLinks(g, nodeIndex) {
  return g.adj[nodeIndex].map((ei) => { const e = g.edges[ei], o = e.a === nodeIndex ? e.b : e.a; return { to: o, name: g.nodes[o].name, kind: g.nodes[o].kind, text: cxUsEdgeSentence(g, e, nodeIndex), rel: e.rel }; })
    .sort((x, y) => (x.kind === `hub`) - (y.kind === `hub`) || ((x.kind === `committee` || x.kind === `court`) ? 0 : 1) - ((y.kind === `committee` || y.kind === `court`) ? 0 : 1) || x.name.localeCompare(y.name));
}
/* the members of a state (two senators and each district's representative), for the States door */
function cxUsStateMembers(data, code) {
  return data.members.filter((m) => m.state === code).sort((a, b) => (a.chamber === b.chamber ? (a.district || 0) - (b.district || 0) || a.name.localeCompare(b.name) : a.chamber === `senate` ? -1 : 1));
}
/* the structure as a tree: the whole federal record we hold, as nested nodes { label, count, children, node }. Executive is agencies only so far;
   the President, the cabinet, and the courts are not in our record yet (plan-federal-map.md, phase 1), and the tree says so instead of leaving them out silently. */
function cxUsTree(data, g) {
  const idx = (id) => { const n = g.byId.get(id); return n ? n.i : null; };
  const comm = (ch) => data.committees.filter((c) => c.chamber === ch).map((c) => ({ label: c.name, node: idx(`c:${c.id}`), children: [] }));
  const kids = (id) => data.agencies.filter((a) => a.parent_id === id).map((a) => ({ label: a.name, node: idx(`a:${a.id}`), children: kids(a.id) }));
  const legislative = [
    { label: `Senate`, node: idx(`h:senate`), children: comm(`senate`) },
    { label: `House of Representatives`, node: idx(`h:house`), children: comm(`house`) },
    { label: `Joint committees`, node: null, children: comm(`joint`) },
  ];
  const agencies = data.agencies.filter((a) => !a.parent_id).map((a) => ({ label: a.name, node: idx(`a:${a.id}`), children: kids(a.id) }));
  const ex = data.executive, jud = data.judiciary;
  const leaders = [];
  if (ex && ex.president) leaders.push({ label: ex.president.name, node: idx(`p:${ex.president.id}`), children: [], note: `President` });
  if (ex && ex.vice_president) leaders.push({ label: ex.vice_president.name, node: idx(`p:${ex.vice_president.id}`), children: [], note: `Vice President` });
  const former = ex ? ex.presidents.filter((p) => !p.current).map((p) => ({ label: p.name, node: idx(`p:${p.id}`), children: [] })) : [];
  if (former.length) leaders.push({ label: `Former Presidents who appointed sitting judges`, node: null, children: former });
  const executive = [...leaders, ...agencies];
  const judgesOf = (courtId) => (jud ? jud.judges.filter((j) => j.court_id === courtId).map((j) => ({ label: j.name, node: idx(`j:${j.id}`), children: [], note: j.title === `Judge` ? `` : j.title })) : []);
  const judicial = [];
  if (jud) {
    const of = (type) => jud.courts.filter((c) => c.type === type);
    of(`supreme`).forEach((c) => judicial.push({ label: c.name, node: idx(`k:${c.id}`), children: judgesOf(c.id) }));
    judicial.push({ label: `Courts of appeals`, node: null, children: of(`appeals`).map((c) => ({
      label: c.name, node: idx(`k:${c.id}`), children: [...judgesOf(c.id), ...(of(`district`).some((d) => d.circuit === c.id) ? [{ label: `District courts in this circuit`, node: null, children: of(`district`).filter((d) => d.circuit === c.id).map((d) => ({ label: d.name, node: idx(`k:${d.id}`), children: judgesOf(d.id) })) }] : [])] })) });
    const other = of(`other`).concat(of(`district`).filter((d) => !d.circuit));
    if (other.length) judicial.push({ label: `Other courts`, node: null, children: other.map((c) => ({ label: c.name, node: idx(`k:${c.id}`), children: judgesOf(c.id) })) });
  }
  return [
    { label: `Legislative branch`, children: legislative },
    { label: `Executive branch`, count: agencies.length, children: executive, note: ex ? `The President, the Vice President, and the federal agencies in the Federal Register. The cabinet secretaries are not in our record yet.` : `Federal agencies from the Federal Register. The President and the cabinet are not in our record yet.` },
    { label: `Judicial branch`, children: judicial, note: jud ? `Article III judges who sit now, from the Federal Judicial Center. Senior judges are counted on each court, not listed. Bankruptcy, magistrate, and other courts are not in our record yet.` : `Not in our record yet.` },
  ];
}

/* ---------- Sky layout (plan-federal-map.md, phase 3) ----------
   Fixed and computed from the record, with no randomness and no timing, so the same data always gives the same picture and a test can pin it.
   Three clusters: the Senate and the House each hold their committees on the rim (diamonds) and their members inside; the executive agencies
   sit in their own cluster. A member is placed toward the committees they sit on (the middle of those seats, pushed outward so the cluster
   is used), then nudged apart so no two overlap. Position says "near the committees they sit on", nothing more: it is not a rank or a
   measure of influence. Joint committees sit in a row between the two chambers. */
const CX_US_LAYOUT = { senate: { x: -560, y: 0, r: 270 }, house: { x: 190, y: -30, r: 420 }, exec: { x: 1010, y: 60, r: 250 }, joint: { y: 500, gap: 130 }, judicial: { x: 1800, y: 20, r: 430 } };
function cxUsHash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; }
function cxUsPlace(g) {
  const L = CX_US_LAYOUT, byName = (a, b) => a.name.localeCompare(b.name);
  const hub = (id, c) => { const n = g.byId.get(id); if (n) { n.x = c.x; n.y = c.y; } };
  hub(`h:senate`, L.senate); hub(`h:house`, L.house); hub(`h:exec`, L.exec); hub(`h:court`, L.judicial);
  [`senate`, `house`].forEach((ch) => {
    const c = L[ch], list = g.nodes.filter((n) => n.kind === `committee` && n.group === ch).sort(byName);
    list.forEach((n, k) => { const a = -Math.PI / 2 + (2 * Math.PI * (k + 0.5)) / list.length; n.x = c.x + c.r * Math.cos(a); n.y = c.y + c.r * Math.sin(a); n.ring = ch; });
  });
  const joint = g.nodes.filter((n) => n.kind === `committee` && n.group === `joint`).sort(byName), mid = (L.senate.x + L.house.x) / 2;
  joint.forEach((n, k) => { n.x = mid + (k - (joint.length - 1) / 2) * L.joint.gap; n.y = L.joint.y; n.ring = `joint`; });
  // nudge a list of people apart, in a fixed order, until nobody overlaps; keep them inside their cluster
  const relax = (people, c, capFrac) => {
    const D = 9;
    for (let pass = 0; pass < 60; pass++) {
      const cell = new Map();
      people.forEach((n) => { const k = `${Math.floor(n.x / D)},${Math.floor(n.y / D)}`; (cell.get(k) || cell.set(k, []).get(k)).push(n); });
      let moved = 0;
      people.forEach((n) => {
        const cx = Math.floor(n.x / D), cy = Math.floor(n.y / D);
        for (let ix = cx - 1; ix <= cx + 1; ix++) for (let iy = cy - 1; iy <= cy + 1; iy++) (cell.get(`${ix},${iy}`) || []).forEach((m) => {
          if (m.i <= n.i) return;
          let ex = m.x - n.x, ey = m.y - n.y, dd = Math.hypot(ex, ey);
          if (dd >= D) return;
          if (dd < 0.01) { const a = cxUsHash(n.id + m.id) * 2 * Math.PI; ex = Math.cos(a); ey = Math.sin(a); dd = 1; }
          const push = ((D - dd) / 2) * 0.8; ex = (ex / dd) * push; ey = (ey / dd) * push;
          n.x -= ex; n.y -= ey; m.x += ex; m.y += ey; moved++;
        });
      });
      people.forEach((n) => { const dx = n.x - c.x, dy = n.y - c.y, d = Math.hypot(dx, dy), cap = c.r * capFrac; if (d > cap) { n.x = c.x + (dx * cap) / d; n.y = c.y + (dy * cap) / d; } });
      if (!moved) break;
    }
  };
  // members: toward the middle of the committees of their own chamber that they sit on
  [`senate`, `house`].forEach((ch) => {
    const c = L[ch], people = g.nodes.filter((n) => n.kind === `member` && n.group === ch);
    people.forEach((n) => {
      const seats = [...new Set(g.adj[n.i].map((ei) => { const e = g.edges[ei]; return g.nodes[e.a === n.i ? e.b : e.a]; }).filter((o) => o.kind === `committee` && o.group === ch).map((o) => o.i))];
      let bx = c.x, by = c.y;
      if (seats.length) { bx = seats.reduce((t, i) => t + g.nodes[i].x, 0) / seats.length; by = seats.reduce((t, i) => t + g.nodes[i].y, 0) / seats.length; }
      let dx = (bx - c.x) * 1.6, dy = (by - c.y) * 1.6; const d = Math.hypot(dx, dy), cap = c.r * 0.86;
      if (d > cap) { dx *= cap / d; dy *= cap / d; }
      const a = cxUsHash(n.id + `a`) * 2 * Math.PI, rr = 4 + cxUsHash(n.id + `r`) * 12;
      n.x = c.x + dx + rr * Math.cos(a); n.y = c.y + dy + rr * Math.sin(a);
    });
    relax(people, c, 0.9);
  });
  // the executive: the President, the Vice President, and the Presidents who appointed sitting judges sit in a small ring at the middle of the agencies
  const leaders = g.nodes.filter((n) => n.kind === `president`).sort((a, b) => (b.p.current ? 1 : 0) - (a.p.current ? 1 : 0) || a.name.localeCompare(b.name));
  leaders.forEach((n, k) => { const a = -Math.PI / 2 + (2 * Math.PI * k) / Math.max(1, leaders.length); n.x = L.exec.x + 42 * Math.cos(a); n.y = L.exec.y + 42 * Math.sin(a); });
  // the courts: districts on the rim in circuit order, each circuit court at the middle of its districts, the Supreme Court at the center
  const jc = L.judicial, courts = g.nodes.filter((n) => n.kind === `court`);
  if (courts.length) {
    const sup = courts.filter((n) => n.c.type === `supreme`), app = courts.filter((n) => n.c.type === `appeals`).sort(byName), oth = courts.filter((n) => n.c.type === `other`);
    const dis = courts.filter((n) => n.c.type === `district`);
    const rim = [];
    app.forEach((ap) => { dis.filter((d) => d.c.circuit === ap.c.id).sort(byName).forEach((d) => rim.push(d)); });
    dis.filter((d) => !app.some((ap) => ap.c.id === d.c.circuit)).sort(byName).forEach((d) => rim.push(d));
    oth.forEach((o) => rim.push(o));
    rim.forEach((n, k) => { const a = -Math.PI / 2 + (2 * Math.PI * (k + 0.5)) / rim.length; n.x = jc.x + jc.r * Math.cos(a); n.y = jc.y + jc.r * Math.sin(a); n.ring = `judicial`; });
    app.forEach((ap, k) => {
      const mine = dis.filter((d) => d.c.circuit === ap.c.id);
      if (mine.length) { const mx = mine.reduce((t, d) => t + d.x, 0) / mine.length, my = mine.reduce((t, d) => t + d.y, 0) / mine.length; ap.x = jc.x + (mx - jc.x) * 0.62; ap.y = jc.y + (my - jc.y) * 0.62; }
      else { const a = -Math.PI / 2 + (2 * Math.PI * k) / app.length; ap.x = jc.x + 0.5 * jc.r * Math.cos(a); ap.y = jc.y + 0.5 * jc.r * Math.sin(a); }
      ap.ring = `judicial`;
    });
    sup.forEach((n, k) => { n.x = jc.x; n.y = jc.y - 24 * k; n.ring = `judicial`; });
    // judges: beside their court, on the side toward the middle of the cluster, then nudged apart
    const judges = g.nodes.filter((n) => n.kind === `judge`);
    judges.forEach((n) => {
      const co = g.byId.get(`k:${n.j.court_id}`) || courts[0];
      const dx = jc.x - co.x, dy = jc.y - co.y, d = Math.hypot(dx, dy) || 1, back = co.c.type === `district` ? 14 + cxUsHash(n.id + `r`) * 26 : co.c.type === `supreme` ? 30 + cxUsHash(n.id + `r`) * 30 : 20 + cxUsHash(n.id + `r`) * 40;
      const a = cxUsHash(n.id + `a`) * 2 * Math.PI, rr = 3 + cxUsHash(n.id + `s`) * 10;
      n.x = co.x + (dx / d) * back + rr * Math.cos(a); n.y = co.y + (dy / d) * back + rr * Math.sin(a);
    });
    relax(judges, jc, 0.97);
  }
  const count = (f) => g.nodes.filter(f).length;
  g.clusters = [
    { id: `senate`, label: `Senate`, x: L.senate.x, y: L.senate.y, r: L.senate.r + 40, count: count((n) => n.kind === `member` && n.group === `senate`), noun: `members` },
    { id: `house`, label: `House`, x: L.house.x, y: L.house.y, r: L.house.r + 40, count: count((n) => n.kind === `member` && n.group === `house`), noun: `members` },
    { id: `exec`, label: `Executive agencies`, x: L.exec.x, y: L.exec.y, r: L.exec.r, count: count((n) => n.kind === `agency`), noun: `agencies` },
    { id: `joint`, label: `Joint committees`, x: mid, y: L.joint.y, r: 0, count: joint.length, noun: `committees` },   // a row, not a disc: only its label is drawn
  ];
  if (courts.length) g.clusters.push({ id: `judicial`, label: `Federal judges`, x: jc.x, y: jc.y, r: jc.r + 40, count: count((n) => n.kind === `judge`), noun: `judges` });
  g.nodes.forEach((n) => { n.hx = n.x; n.hy = n.y; });   // home: where motion always returns to
  return g;
}

/* Solo: the set of node indexes to keep when one thing is picked. spec is { node: index } or { state: "OH" }. Everything else is hidden.
   A committee keeps its members; a member keeps their committees; an agency keeps its whole family (the top agency above it and everything under it);
   a state keeps its members and the committees they sit on. */
function cxUsSolo(g, spec) {
  const keep = new Set();
  const nbrs = (i) => g.adj[i].map((ei) => { const e = g.edges[ei]; return e.a === i ? e.b : e.a; });
  if (spec.state) {
    g.nodes.forEach((n) => { if (n.kind === `member` && n.m.state === spec.state) { keep.add(n.i); nbrs(n.i).forEach((o) => { if (g.nodes[o].kind === `committee`) keep.add(o); }); } });
    return keep;
  }
  const n = g.nodes[spec.node];
  if (!n) return keep;
  keep.add(n.i);
  if (n.kind !== `agency`) nbrs(n.i).forEach((o) => { if (g.nodes[o].kind !== `hub`) keep.add(o); });
  else if (n.kind === `agency`) {
    let top = n; while (top.a.parent_id && g.byId.has(`a:${top.a.parent_id}`)) top = g.byId.get(`a:${top.a.parent_id}`);
    const down = (i) => { keep.add(i); g.adj[i].forEach((ei) => { const e = g.edges[ei], o = e.a === i ? e.b : e.a; if (g.nodes[o].kind === `agency` && g.nodes[o].a.parent_id === g.nodes[i].a.id && !keep.has(o)) down(o); }); };
    down(top.i);
  }
  return keep;
}


/* ---------- Sky motion (plan-federal-map.md, phase 4) ----------
   A small physics step of our own, three modes. Every node has a home (its place in the fixed layout above) and a render position that
   moves around it, so the picture can never drift away from the data: let go and everything settles back.
     still  nothing moves; every node sits at home.
     calm   a slow, small drift around home, and a pulled node brings the nodes it is connected to along on springs.
     live   a looser home spring so things move more, a push between nodes that get too close, a stronger drift, and the same pull.
   The drift is a formula of time and the node's id (no random numbers), so the same time gives the same picture and a test can pin it.
   Motion never changes a connection or a count. It is decoration plus a way to feel which nodes are tied together. */
const CX_US_MOTION = {
  still: null,
  calm: { drift: 3, home: 0.09, damp: 0.8, spring: 0.05, repel: 0 },
  live: { drift: 8, home: 0.02, damp: 0.9, spring: 0.07, repel: 0.45 },
};
function cxUsMotionState(g) {
  const n = g.nodes.length;
  return { vx: new Float32Array(n), vy: new Float32Array(n), pulled: null, ph: g.nodes.map((nd) => [cxUsHash(nd.id + `p`) * 6.2832, cxUsHash(nd.id + `q`) * 6.2832, 0.35 + cxUsHash(nd.id + `f`) * 0.6, 0.35 + cxUsHash(nd.id + `g`) * 0.6]) };
}
/* One step. nodes: the ones to move (the visible ones); t: seconds; dt: frames of 1/60 s (kept small). Returns the largest speed, so a caller can tell when it is quiet. */
function cxUsStep(g, S, mode, t, dt, nodes) {
  const M = CX_US_MOTION[mode];
  if (!M) { nodes.forEach((n) => { n.x = n.hx; n.y = n.hy; }); S.vx.fill(0); S.vy.fill(0); return 0; }
  dt = Math.max(0.2, Math.min(2, dt || 1));
  const fx = new Map(), fy = new Map(), add = (i, ax, ay) => { fx.set(i, (fx.get(i) || 0) + ax); fy.set(i, (fy.get(i) || 0) + ay); };
  const pl = S.pulled;
  // the nodes tied to a pulled one follow it on springs whose rest length is their distance at home
  if (pl) {
    const p = g.nodes[pl.i];
    g.adj[pl.i].forEach((ei) => {
      const e = g.edges[ei], o = g.nodes[e.a === pl.i ? e.b : e.a];
      if (o.kind === `hub`) return;
      const rest = Math.hypot(o.hx - p.hx, o.hy - p.hy), dx = pl.x - o.x, dy = pl.y - o.y, d = Math.hypot(dx, dy) || 1, pull = (d - rest) * M.spring;
      add(o.i, (dx / d) * pull, (dy / d) * pull);
    });
  }
  // nodes that get too close push apart (live only)
  if (M.repel) {
    const D = 9, cell = new Map();
    nodes.forEach((n) => { const k = `${Math.floor(n.x / D)},${Math.floor(n.y / D)}`; (cell.get(k) || cell.set(k, []).get(k)).push(n); });
    nodes.forEach((n) => {
      const cx = Math.floor(n.x / D), cy = Math.floor(n.y / D);
      for (let ix = cx - 1; ix <= cx + 1; ix++) for (let iy = cy - 1; iy <= cy + 1; iy++) (cell.get(`${ix},${iy}`) || []).forEach((m) => {
        if (m.i <= n.i) return;
        let ex = m.x - n.x, ey = m.y - n.y, dd = Math.hypot(ex, ey);
        if (dd >= D) return;
        if (dd < 0.01) { ex = 1; ey = 0; dd = 1; }
        const push = ((D - dd) / D) * M.repel; ex = (ex / dd) * push; ey = (ey / dd) * push;
        add(n.i, -ex, -ey); add(m.i, ex, ey);
      });
    });
  }
  let top = 0;
  nodes.forEach((n) => {
    if (pl && n.i === pl.i) { n.x = pl.x; n.y = pl.y; S.vx[n.i] = 0; S.vy[n.i] = 0; return; }
    const ph = S.ph[n.i], tx = n.hx + M.drift * Math.sin(t * ph[2] + ph[0]), ty = n.hy + M.drift * Math.cos(t * ph[3] + ph[1]);
    const ax = (tx - n.x) * M.home + (fx.get(n.i) || 0), ay = (ty - n.y) * M.home + (fy.get(n.i) || 0), k = Math.pow(M.damp, dt);
    S.vx[n.i] = (S.vx[n.i] + ax * dt) * k; S.vy[n.i] = (S.vy[n.i] + ay * dt) * k;
    n.x += S.vx[n.i] * dt; n.y += S.vy[n.i] * dt;
    // never wander far from home, and never become a bad number
    const ox = n.x - n.hx, oy = n.y - n.hy, od = Math.hypot(ox, oy);
    if (!(od < 1e5)) { n.x = n.hx; n.y = n.hy; S.vx[n.i] = 0; S.vy[n.i] = 0; }
    else if (od > 600 && !pl) { n.x = n.hx + (ox * 600) / od; n.y = n.hy + (oy * 600) / od; }
    top = Math.max(top, Math.hypot(S.vx[n.i], S.vy[n.i]));
  });
  return top;
}


/* The Bioguide ID that names a person's portrait file (data/portraits-us), or null. Members and any President who served in Congress have one;
   judges, justices, and Presidents who never served in Congress do not, and show their initials. */
function cxUsFaceId(n) {
  if (n.kind === `member`) return n.m.id;
  if (n.kind === `president` && n.p.id && !String(n.p.id).startsWith(`P-`)) return n.p.id;
  return null;
}

/* ---------- Policy areas for a resident (docs/plan-alignment.md, Step 1) ----------
   What the record says a member voted on, by policy area. Counts only. There is no comparison with the resident here, so nothing in
   this part can be read as a match, a rank, or a grade. Only votes that decided a bill or a nominee are counted (the record marks them). */
function cxUsAreaList(vd) {
  const per = new Map();
  vd.votes.forEach((v) => { if (!v.final) return; const a = cxUsAreaOf(vd, v); per.set(a, (per.get(a) || 0) + 1); });
  return [...per].sort((a, b) => (a[0] === CX_NO_AREA) - (b[0] === CX_NO_AREA) || a[0].localeCompare(b[0])).map(([area, votes]) => ({ area, votes }));
}
function cxUsAreaCounts(vd, m, areas) {
  const rows = cxMemberVotes(vd, m).filter((r) => r.v.final);
  return areas.map((area) => {
    const mine = rows.filter((r) => r.area === area), t = cxCastCounts(mine);
    return { area, total: mine.length, yea: t.Y, nay: t.N, present: t.P, notVoting: t.X, named: t.O };
  });
}
