/* v5.18 United States, one model for every view (plan-federal-map.md, phase 2).
   The Index, Linked, Tree, and (later) the rebuilt Sky all read this, so a count or a sentence is written once and cannot disagree.
   Pure functions only: no React, no page. They read the landscape record (data/us-landscape-2026.json, through cxUsGraph) and,
   when it has loaded, the recorded votes. Rules kept: counts and plain sentences, never a score or a rank; party is not used here;
   a connection is a recorded relationship, not control; a missing record is not a no. */

/* the five ways into the federal government */
const CX_US_DOORS = [
  { id: `members`, label: `Members of Congress`, one: `member`, many: `members` },
  { id: `committees`, label: `Committees`, one: `committee`, many: `committees` },
  { id: `agencies`, label: `Agencies`, one: `agency`, many: `agencies` },
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
  const members = byKind(`member`), committees = byKind(`committee`), agencies = byKind(`agency`);
  const mk = (id, label, nodes) => ({ id, label, count: nodes.length, nodes: nodes.map((n) => n.i) });
  const doors = {
    members: [mk(`senate`, `Senate`, members.filter((n) => n.m.chamber === `senate`)), mk(`house`, `House`, members.filter((n) => n.m.chamber === `house`))],
    committees: [mk(`senate`, `Senate committees`, committees.filter((n) => n.c.chamber === `senate`)), mk(`house`, `House committees`, committees.filter((n) => n.c.chamber === `house`)), mk(`joint`, `Joint committees`, committees.filter((n) => n.c.chamber === `joint`))],
    agencies: [mk(`top`, `Top-level agencies`, agencies.filter((n) => !n.a.parent_id)), mk(`sub`, `Sub-agencies`, agencies.filter((n) => n.a.parent_id))],
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
  return CX_US_DOORS.map((d) => ({ ...d, groups: doors[d.id], count: doors[d.id].reduce((t, x) => t + (x.count || 0), 0), ready: d.id !== `areas` || !!vd }));
}

/* what one connection is, said next to the other node's name ("Senate Committee on Finance" then "Chair."). e is an edge of the graph (a, b, rel). */
function cxUsEdgeSentence(g, e, from) {
  const me = g.nodes[from], other = g.nodes[e.a === from ? e.b : e.a];
  const chamberWord = (n) => (n.group === `senate` ? `the Senate` : n.group === `house` ? `the House` : n.group === `exec` ? `the federal executive branch` : n.name);
  if (other.kind === `hub`) return me.kind === `committee` ? `A ${me.c.chamber === `joint` ? `joint` : me.c.chamber === `senate` ? `Senate` : `House`} committee of Congress.` : me.kind === `member` ? `Sits in ${chamberWord(other)}.` : `A federal executive agency.`;
  if (me.kind === `hub`) return `${other.kind === `member` ? `Member` : other.kind === `committee` ? `Committee` : `Agency`}.`;
  if ((me.kind === `member` && other.kind === `committee`) || (me.kind === `committee` && other.kind === `member`)) {
    const r = e.rel === `member` ? `Member` : e.rel === `ex officio` ? `Member, ex officio` : e.rel.charAt(0).toUpperCase() + e.rel.slice(1);
    return `${r}.`;
  }
  if (me.kind === `agency` && other.kind === `agency`) return e.a === from ? `Larger agency it belongs to.` : `Part of this agency.`;
  return `Connected.`;
}
/* every connection of a node, in sentences. Hubs are folded into the first sentence; the rest are people, committees, and agencies. */
function cxUsLinks(g, nodeIndex) {
  return g.adj[nodeIndex].map((ei) => { const e = g.edges[ei], o = e.a === nodeIndex ? e.b : e.a; return { to: o, name: g.nodes[o].name, kind: g.nodes[o].kind, text: cxUsEdgeSentence(g, e, nodeIndex), rel: e.rel }; })
    .sort((x, y) => (x.kind === `hub`) - (y.kind === `hub`) || (x.kind === `committee` ? 0 : 1) - (y.kind === `committee` ? 0 : 1) || x.name.localeCompare(y.name));
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
  const executive = data.agencies.filter((a) => !a.parent_id).map((a) => ({ label: a.name, node: idx(`a:${a.id}`), children: kids(a.id) }));
  return [
    { label: `Legislative branch`, children: legislative },
    { label: `Executive branch`, count: executive.length, children: executive, note: `Federal agencies from the Federal Register. The President and the cabinet are not in our record yet.` },
    { label: `Judicial branch`, children: [], note: `Not in our record yet.` },
  ];
}
