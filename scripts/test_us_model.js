#!/usr/bin/env node
/* Tests for the federal model (ext/cx-us-model.jsx) against the real record (data/us-landscape-2026.json, data/us-votes-2026.json).

   node scripts/test_us_model.js

   Checks that the five doors add up to the record, that every connection has a plain sentence, that nothing reads as a score or a rank,
   and that the tree names what is not in our record yet. No network, no browser. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const us = read('ext/cx-us.jsx');
const pure = us.slice(0, us.indexOf('/* ---------- Your members'));
const ctx = vm.createContext({});
vm.runInContext(pure + '\n' + read('ext/cx-us-model.jsx') + '\n;this.api = { cxUsGraph, cxUsDoors, cxUsLinks, cxUsStateMembers, cxUsTree, cxUsEdgeSentence, CX_US_DOORS, cxUsSolo, CX_US_LAYOUT, cxUsStep, cxUsMotionState, CX_US_MOTION };', ctx);
const A = ctx.api;
const data = JSON.parse(read('data/us-landscape-2026.json')), vd = JSON.parse(read('data/us-votes-2026.json'));
const g = A.cxUsGraph(data);
let bad = 0;
const fail = (m) => { bad++; console.log('FAIL ' + m); };
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) fail(`${m}: got ${JSON.stringify(a)}, wanted ${JSON.stringify(b)}`); };

const doors = A.cxUsDoors(data, g, vd), by = Object.fromEntries(doors.map((d) => [d.id, d]));
eq(doors.map((d) => d.id), ['members', 'committees', 'agencies', 'areas', 'states'], 'the five doors, in order');
eq(by.members.count, data.counts.members, 'members door adds up to the record');
eq(by.members.groups.map((x) => x.count), [data.counts.senate, data.counts.house], 'Senate and House members');
eq(by.committees.count, data.committees.length, 'committees door adds up to the record');
eq(by.agencies.count, data.counts.agencies, 'agencies door adds up to the record');
eq(by.states.groups[0].states.length, new Set(data.members.map((m) => m.state)).size, 'one row per state');
eq(by.states.groups[0].states.reduce((t, s) => t + s.senators + s.representatives, 0), data.counts.members, 'state rows hold every member once');
const finals = vd.votes.filter((v) => v.final).length;
eq(by.areas.groups[0].areas.reduce((t, a) => t + a.votes, 0), finals, 'policy areas hold every vote that decided something once');
eq(A.cxUsDoors(data, g, null).find((d) => d.id === 'areas').ready, false, 'without votes the policy-area door says it is not ready');

// every connection of every node reads as a plain sentence
let sentences = 0;
g.nodes.forEach((n) => A.cxUsLinks(g, n.i).forEach((l) => {
  sentences++;
  if (!l.text || /undefined|NaN|null|\[object/.test(l.text)) fail(`a bad sentence for ${n.name}: ${l.text}`);
  if (/\u2014|\u2013/.test(l.text)) fail(`a dash in a sentence: ${l.text}`);
  if (/\b(scores?|ranks?|ranked|ratings?|influen(ce|tial)|powerful)\b/i.test(l.text)) fail(`a score word in a sentence: ${l.text}`);
}));
if (sentences < 1000) fail(`only ${sentences} connections have sentences`);

// a chair, a ranking member, an ex officio seat, and a plain member say what they are
const find = (name) => g.nodes.find((n) => n.kind === 'committee' && n.name === name);
const chamberCommittee = data.committees.find((c) => c.chair);
const cn = g.byId.get('c:' + chamberCommittee.id);
const chairLink = A.cxUsLinks(g, cn.i).find((l) => l.name === chamberCommittee.chair || chamberCommittee.chair.includes(l.name.split(' ').slice(-1)[0]));
if (!chairLink || !/^chair/i.test(chairLink.text)) fail(`the chair of ${chamberCommittee.name} is not described as chair: ${chairLink && chairLink.text}`);
const sample = data.members.find((m) => m.committees.some((x) => x.role === 'Ex Officio' && g.byId.has('c:' + x.id)));
if (sample) { const ex = A.cxUsLinks(g, g.byId.get('m:' + sample.id).i).find((l) => /ex officio/i.test(l.text)); if (!ex) fail('an ex officio seat does not say so'); }
const mem = A.cxUsLinks(g, g.byId.get('m:' + data.members[0].id).i);
if (!mem.some((l) => l.kind === 'hub' && /^Sits in /.test(l.text))) fail('a member does not say which chamber they sit in');
if (mem[mem.length - 1].kind !== 'hub') fail('the chamber sentence should come last, after committees');

// states
const oh = A.cxUsStateMembers(data, 'OH');
eq(oh.filter((m) => m.chamber === 'senate').length, 2, 'Ohio has two senators');
eq(oh[0].chamber, 'senate', 'senators are listed first');

// tree: whole record, and honest about the gaps
const tree = A.cxUsTree(data, g);
eq(tree.map((t) => t.label), ['Legislative branch', 'Executive branch', 'Judicial branch'], 'three branches');
if (!/not in our record yet/i.test(tree[2].note)) fail('the judicial branch does not say it is missing');
if (!/President/.test(tree[1].note)) fail('the executive branch does not say the President is missing');
const count = (n) => 1 + n.children.reduce((t, c) => t + count(c), 0);
const leaves = tree[0].children.reduce((t, c) => t + c.children.length, 0);
eq(leaves, data.committees.length, 'every committee appears once in the tree');
const agencyCount = (n) => n.children.reduce((t, c) => t + 1 + agencyCount(c), 0);
eq(agencyCount(tree[1]), data.agencies.length, 'every agency appears once in the tree, at any depth');
eq(g.nodes.filter((n) => n.kind === 'agency').length, data.agencies.length, 'every agency is a node in the picture');

// Sky layout: same data, same picture; nobody overlaps; everyone is inside their cluster; committees sit on the rim
const g2 = A.cxUsGraph(data);
eq(g.nodes.map((n) => [Math.round(n.x * 100), Math.round(n.y * 100)]), g2.nodes.map((n) => [Math.round(n.x * 100), Math.round(n.y * 100)]), 'two builds give the same positions');
eq(g.clusters.map((c) => [c.id, c.count]), [['senate', 100], ['house', 439], ['exec', 260], ['joint', 5]], 'the clusters and their counts');
for (const ch of ['senate', 'house']) {
  const c = g.clusters.find((k) => k.id === ch), ms = g.nodes.filter((n) => n.kind === 'member' && n.group === ch);
  let min = 1e9; for (let i = 0; i < ms.length; i++) for (let j = i + 1; j < ms.length; j++) min = Math.min(min, Math.hypot(ms[i].x - ms[j].x, ms[i].y - ms[j].y));
  if (min < 6) fail(`two ${ch} members are ${min.toFixed(1)} apart`);
  if (ms.some((n) => Math.hypot(n.x - c.x, n.y - c.y) > c.r)) fail(`a ${ch} member sits outside the ${ch} cluster`);
  const cm = g.nodes.filter((n) => n.kind === 'committee' && n.group === ch);
  if (cm.some((n) => Math.abs(Math.hypot(n.x - c.x, n.y - c.y) - A.CX_US_LAYOUT[ch].r) > 1)) fail(`a ${ch} committee is off the rim`);
}
// a member with exactly one committee of their chamber sits on the line from the middle toward it
const one = g.nodes.find((n) => n.kind === 'member' && n.group === 'house' && new Set(g.adj[n.i].map((ei) => g.edges[ei]).map((e) => g.nodes[e.a === n.i ? e.b : e.a]).filter((o) => o.kind === 'committee' && o.group === 'house').map((o) => o.i)).size === 1);
if (one) { const co = g.nodes[[...new Set(g.adj[one.i].map((ei) => g.edges[ei]).map((e) => (e.a === one.i ? e.b : e.a)).filter((o) => g.nodes[o].kind === 'committee' && g.nodes[o].group === 'house'))][0]]; const c = A.CX_US_LAYOUT.house; const toC = Math.atan2(co.y - c.y, co.x - c.x), toM = Math.atan2(one.y - c.y, one.x - c.x); let d = Math.abs(toC - toM); if (d > Math.PI) d = 2 * Math.PI - d; if (d > 0.9) fail(`a one-committee member is ${d.toFixed(2)} rad away from their committee's direction`); }

// Solo
const com = g.nodes.find((n) => n.kind === 'committee' && n.c.chair);
const soloCom = A.cxUsSolo(g, { node: com.i });
eq(soloCom.size, 1 + g.adj[com.i].map((ei) => g.edges[ei]).map((e) => g.nodes[e.a === com.i ? e.b : e.a]).filter((o) => o.kind !== 'hub').length, 'Solo on a committee keeps it and its members');
const ohMembers = data.members.filter((m) => m.state === 'OH');
const soloOh = A.cxUsSolo(g, { state: 'OH' });
if (!ohMembers.every((m) => soloOh.has(g.byId.get('m:' + m.id).i))) fail('Solo on Ohio dropped an Ohio member');
if ([...soloOh].some((i) => g.nodes[i].kind === 'member' && g.nodes[i].m.state !== 'OH')) fail('Solo on Ohio kept a member from another state');
const sub = g.nodes.find((n) => n.kind === 'agency' && n.a.parent_id);
const fam = A.cxUsSolo(g, { node: sub.i });
if (!fam.has(sub.i) || fam.size < 2) fail('Solo on a sub-agency lost its family');
const deep = g.byId.get('a:' + data.agencies.find((a) => data.agencies.some((b) => b.id === a.parent_id && b.parent_id)).id);
if (deep) { const f = A.cxUsSolo(g, { node: deep.i }); let top = deep; while (top.a.parent_id) top = g.byId.get('a:' + top.a.parent_id); if (!f.has(top.i)) fail('Solo on a deep agency lost the top of its family'); }

// Motion: still holds, calm stays near home, live settles back after a pull, nothing becomes a bad number, and it is repeatable
const home = (n) => Math.hypot(n.x - n.hx, n.y - n.hy);
const run = (mode, frames, S, nodes = g.nodes) => { for (let f = 0; f < frames; f++) A.cxUsStep(g, S, mode, f / 60, 1, nodes); };
{
  const S = A.cxUsMotionState(g); run('calm', 5, S); run('still', 1, S);
  if (g.nodes.some((n) => home(n) > 1e-9)) fail('still did not put every node at home');
  run('calm', 300, S);
  const far = Math.max(...g.nodes.map(home)); if (!(far <= 3 + 2.5)) fail(`calm moved a node ${far.toFixed(1)} px from home`);
  if (g.nodes.some((n) => !Number.isFinite(n.x) || !Number.isFinite(n.y))) fail('calm made a bad number');
  const snap = g.nodes.map((n) => [n.x.toFixed(3), n.y.toFixed(3)]).join();
  run('still', 1, S);
  const S2 = A.cxUsMotionState(g); run('calm', 5, S2); run('still', 1, S2); run('calm', 300, S2);
  eq(g.nodes.map((n) => [n.x.toFixed(3), n.y.toFixed(3)]).join(), snap, 'the same steps give the same picture');
  run('still', 1, S2);
  // live: pull a committee, its members follow; let go and all return
  const L = A.cxUsMotionState(g), c = g.nodes.find((n) => n.kind === 'committee' && n.c.chair);
  const members = g.adj[c.i].map((ei) => g.edges[ei]).map((e) => g.nodes[e.a === c.i ? e.b : e.a]).filter((o) => o.kind === 'member');
  run('live', 60, L);
  L.pulled = { i: c.i, x: c.hx + 160, y: c.hy };
  for (let f = 0; f < 240; f++) A.cxUsStep(g, L, 'live', 1 + f / 60, 1, g.nodes);
  const closer = members.filter((m) => Math.hypot(m.x - L.pulled.x, m.y - L.pulled.y) < Math.hypot(m.hx - L.pulled.x, m.hy - L.pulled.y)).length;
  if (closer < members.length * 0.6) fail(`pulling ${c.name}: only ${closer} of ${members.length} members followed`);
  if (Math.hypot(c.x - L.pulled.x, c.y - L.pulled.y) > 0.01) fail('the pulled node is not under the pointer');
  L.pulled = null;
  for (let f = 0; f < 600; f++) A.cxUsStep(g, L, 'live', 5 + f / 60, 1, g.nodes);
  const back = Math.max(...g.nodes.map(home)); if (!(back <= 8 + 8)) fail(`after letting go, a node is still ${back.toFixed(1)} px from home`);
  if (g.nodes.some((n) => !Number.isFinite(n.x) || !Number.isFinite(n.y))) fail('live made a bad number');
  const hm = g.nodes.filter((n) => n.kind === 'member' && n.group === 'house'); let md = 1e9;
  for (let i = 0; i < hm.length; i++) for (let j = i + 1; j < hm.length; j++) md = Math.min(md, Math.hypot(hm[i].x - hm[j].x, hm[i].y - hm[j].y));
  if (md < 2.5) fail(`live let two House members sit ${md.toFixed(1)} px apart`);
  run('still', 1, L);
}

console.log(bad ? `${bad} failed` : `ok  us model (${sentences} connection sentences)`);
process.exit(bad ? 1 : 0);
