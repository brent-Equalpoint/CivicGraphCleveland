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
vm.runInContext(pure + '\n' + read('ext/cx-us-model.jsx') + '\n;this.api = { cxUsGraph, cxUsDoors, cxUsLinks, cxUsStateMembers, cxUsTree, cxUsEdgeSentence, CX_US_DOORS, cxUsSolo, CX_US_LAYOUT, cxUsStep, cxUsMotionState, CX_US_MOTION, cxUsAreaList, cxUsAreaCounts, cxMemberVotes, cxUsFaceId };', ctx);
const A = ctx.api;
const data = JSON.parse(read('data/us-landscape-2026.json')), vd = JSON.parse(read('data/us-votes-2026.json'));
const g = A.cxUsGraph(data);
let bad = 0;
const fail = (m) => { bad++; console.log('FAIL ' + m); };
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) fail(`${m}: got ${JSON.stringify(a)}, wanted ${JSON.stringify(b)}`); };

const doors = A.cxUsDoors(data, g, vd), by = Object.fromEntries(doors.map((d) => [d.id, d]));
eq(doors.map((d) => d.id), ['members', 'committees', 'executive', 'courts', 'areas', 'states'], 'the six doors, in order');
eq(by.members.count, data.counts.members, 'members door adds up to the record');
eq(by.members.groups.map((x) => x.count), [data.counts.senate, data.counts.house], 'Senate and House members');
eq(by.committees.count, data.committees.length, 'committees door adds up to the record');
eq(by.executive.count, data.counts.agencies + data.executive.presidents.length + 1, 'the executive door adds up to the agencies, the Presidents, and the Vice President');
eq(by.executive.groups.map((x) => x.id), ['current', 'former', 'top', 'sub'], 'the executive door groups');
eq(by.executive.groups[0].count, 2, 'the current President and Vice President');
eq(by.courts.count, data.judiciary.courts.length + data.judiciary.judges.length, 'the courts door adds up to the courts and the sitting judges');
eq(by.courts.groups.map((x) => x.id), ['supreme', 'appeals', 'district', 'other', 'judges'], 'the courts door groups');
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
if (!/cabinet/.test(tree[1].note)) fail('the executive branch does not say the cabinet is missing');
const count = (n) => 1 + n.children.reduce((t, c) => t + count(c), 0);
const leaves = tree[0].children.reduce((t, c) => t + c.children.length, 0);
eq(leaves, data.committees.length, 'every committee appears once in the tree');
const kindCount = (t, kind) => (t.node !== null && t.node !== undefined && g.nodes[t.node].kind === kind ? 1 : 0) + t.children.reduce((x, c) => x + kindCount(c, kind), 0);
eq(kindCount(tree[1], 'agency'), data.agencies.length, 'every agency appears once in the tree, at any depth');
eq(kindCount(tree[1], 'president'), data.executive.presidents.length + 1, 'every President and the Vice President appear once in the tree');
eq(kindCount(tree[2], 'court'), data.judiciary.courts.length, 'every court appears once in the tree');
eq(kindCount(tree[2], 'judge'), data.judiciary.judges.length, 'every sitting judge appears once in the tree');
eq(g.nodes.filter((n) => n.kind === 'agency').length, data.agencies.length, 'every agency is a node in the picture');

// the President, the courts, and the judges
{
  const jn = g.nodes.filter((n) => n.kind === 'judge'), cn2 = g.nodes.filter((n) => n.kind === 'court'), pn = g.nodes.filter((n) => n.kind === 'president');
  eq([jn.length, cn2.length, pn.length], [data.judiciary.judges.length, data.judiciary.courts.length, data.executive.presidents.length + 1], 'the graph holds every judge, court, and leader');
  const edgesOf = (n) => g.adj[n.i].map((ei) => g.edges[ei]);
  if (!jn.every((n) => edgesOf(n).filter((e) => e.rel === 'appointed by').length === 1)) fail('a judge lacks exactly one appointing President');
  if (!jn.every((n) => edgesOf(n).some((e) => (g.nodes[e.a] === n ? g.nodes[e.b] : g.nodes[e.a]).kind === 'court'))) fail('a judge is not tied to a court');
  const sup = cn2.find((n) => n.c.type === 'supreme');
  eq(edgesOf(sup).filter((e) => e.rel === 'appeals to').length, 13, 'the Supreme Court takes appeals from the 13 courts of appeals');
  if (!cn2.filter((n) => n.c.type === 'district').every((n) => edgesOf(n).some((e) => e.rel === 'appeals to'))) fail('a district court has no court of appeals');
  const just = jn.find((n) => n.j.title === 'Chief Justice');
  const note = (n) => A.cxUsLinks(g, n.i).map((l) => l.text).join(' | ');
  if (!/Chief Justice\./.test(note(just))) fail(`the Chief Justice's court note: ${note(just)}`);
  if (!/Appointed by this President\./.test(note(just))) fail('a judge does not say who appointed them');
  const prez = g.nodes.find((n) => n.kind === 'president' && n.p.current && n.p.role === 'President');
  if (!/Appointed this judge\./.test(note(prez))) fail('a President does not list the judges they appointed');
  if (A.cxUsLinks(g, prez.i).filter((l) => l.kind === 'judge').length < 100) fail('the President is tied to too few judges');
  const noParty = jn.every((n) => !('party' in n.j));
  if (!noParty) fail('a judge carries a party');
  const ids = new Set(jn.map((n) => n.id)); eq(ids.size, jn.length, 'judge ids are unique');
  // solo
  const some = cn2.find((n) => n.c.type === 'district' && n.c.active_judges >= 3);
  const soloCourt = A.cxUsSolo(g, { node: some.i });
  if (!jn.filter((n) => n.j.court_id === some.c.id).every((n) => soloCourt.has(n.i))) fail('Solo on a court dropped one of its judges');
  const soloPrez = A.cxUsSolo(g, { node: prez.i });
  if (!jn.filter((n) => n.j.appointed_by_id === prez.p.id).every((n) => soloPrez.has(n.i))) fail('Solo on a President dropped a judge they appointed');
  // layout: judges inside the judicial cluster, spaced out, near their court
  const jc = g.clusters.find((c) => c.id === 'judicial');
  if (jn.some((n) => Math.hypot(n.hx - jc.x, n.hy - jc.y) > jc.r)) fail('a judge sits outside the judicial cluster');
  let md = 1e9; for (let i = 0; i < jn.length; i++) for (let k = i + 1; k < jn.length; k++) md = Math.min(md, Math.hypot(jn[i].hx - jn[k].hx, jn[i].hy - jn[k].hy));
  if (md < 6) fail(`two judges are ${md.toFixed(1)} apart`);
  const far = jn.filter((n) => Math.hypot(n.hx - g.byId.get('k:' + n.j.court_id).hx, n.hy - g.byId.get('k:' + n.j.court_id).hy) > 140).length;
  if (far > jn.length * 0.05) fail(`${far} judges sit far from their own court`);
}

// Sky layout: same data, same picture; nobody overlaps; everyone is inside their cluster; committees sit on the rim
const g2 = A.cxUsGraph(data);
eq(g.nodes.map((n) => [Math.round(n.x * 100), Math.round(n.y * 100)]), g2.nodes.map((n) => [Math.round(n.x * 100), Math.round(n.y * 100)]), 'two builds give the same positions');
eq(g.clusters.map((c) => [c.id, c.count]), [['senate', 100], ['house', 439], ['exec', 260], ['joint', 5], ['judicial', data.judiciary.judges.length]], 'the clusters and their counts');
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

// Step 1 of the alignment plan: per-area counts of what the record says, and nothing that grades anyone
{
  const list = A.cxUsAreaList(vd);
  eq(list.reduce((t, a) => t + a.votes, 0), vd.votes.filter((v) => v.final).length, 'the area list holds every deciding vote once');
  const husted = data.members.find((m) => m.name === 'Jon Husted');
  const all = A.cxUsAreaCounts(vd, husted, list.map((a) => a.area));
  eq(all.reduce((t, c) => t + c.total, 0), A.cxMemberVotes(vd, husted).filter((r) => r.v.final).length, "an area split holds all of a member's deciding votes once");
  if (all.some((c) => c.yea + c.nay + c.present + c.notVoting + c.named !== c.total)) fail('an area row does not add up to its own total');
  eq(A.cxUsAreaCounts(vd, husted, ['No such area'])[0].total, 0, 'an area with no votes counts zero');
  // the part of the page that shows it uses no grade words
  const us = read('ext/cx-us.jsx'), a = us.indexOf('function CX_UsAreaPicker'), b = us.indexOf('/* The Index: five ways');
  const shown = us.slice(a, b).replace(/\/\*[\s\S]*?\*\//g, '');
  if (/\b(scores?|match(es|ed)?|ranks?|ranked|grades?|percent|agree(s|ment)?)\b|%/i.test(shown)) fail('the policy-area part of the page uses a grading word');
}

// portraits: a member and a President who served in Congress have a file name; judges and a President with no Bioguide ID do not
{
  const mem = g.nodes.find((n) => n.kind === 'member'), jud = g.nodes.find((n) => n.kind === 'judge');
  eq(A.cxUsFaceId(mem), mem.m.id, 'a member has a portrait file named by their Bioguide ID');
  eq(A.cxUsFaceId(jud), null, 'a judge has no portrait');
  const noId = g.nodes.find((n) => n.kind === 'president' && String(n.p.id).startsWith('P-'));
  if (noId) eq(A.cxUsFaceId(noId), null, 'a President with no Bioguide ID has no portrait');
  const withId = g.nodes.find((n) => n.kind === 'president' && !String(n.p.id).startsWith('P-'));
  if (withId) eq(A.cxUsFaceId(withId), withId.p.id, 'a President who served in Congress has a portrait file');
  const idx = JSON.parse(read('data/portraits-us/index.json'));
  const present = new Set(idx.ids);
  const miss = data.members.filter((m) => !present.has(m.id)).length;
  if (miss > data.members.length * 0.1) fail(`${miss} of ${data.members.length} members have no portrait`);
  if (idx.ids.some((i) => !fs.existsSync(path.join(ROOT, 'data', 'portraits-us', i + '.webp')))) fail('the portrait index names a file that is not there');
}

console.log(bad ? `${bad} failed` : `ok  us model (${sentences} connection sentences)`);
process.exit(bad ? 1 : 0);
