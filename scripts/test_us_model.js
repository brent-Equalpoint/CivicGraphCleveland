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
vm.runInContext(pure + '\n' + read('ext/cx-us-model.jsx') + '\n;this.api = { cxUsGraph, cxUsDoors, cxUsLinks, cxUsStateMembers, cxUsTree, cxUsEdgeSentence, CX_US_DOORS };', ctx);
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

console.log(bad ? `${bad} failed` : `ok  us model (${sentences} connection sentences)`);
process.exit(bad ? 1 : 0);
