#!/usr/bin/env node
/* Tests for the United States graph's data adapter and physics (ext/cx-us-map.jsx) against the real record (data/us-landscape-2026.json).

   node scripts/test_us_map.js

   Checks the kit's three slots add up to the record (hubs are the chambers, the executive, the courts, and the committees, never policy
   areas), that every link has a line kind and a source registered in scripts/us_sources.py, that nothing carries party or a strength
   word, that the physics is the same twice with the fixed seed, that the settled file the build writes matches a fresh run, and that
   names placed on the map never overlap. No network, no browser. */
const fs = require('fs'), path = require('path');
const { load, settle } = require('./us_map.js');
const ROOT = path.join(__dirname, '..');
const A = load();
const d = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'us-landscape-2026.json'), 'utf8'));
let bad = 0;
const fail = (m) => { bad++; console.log('FAIL ' + m); };
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) fail(`${m}: got ${JSON.stringify(a)}, wanted ${JSON.stringify(b)}`); };

const g = A.cxUsGraph(d), M = A.cxUsMapModel(d, g);
const ex = d.executive, ju = d.judiciary;

// the kit's three slots
eq(M.slots.industries.length, 4 + d.committees.length, 'hubs: Senate, House, Executive, Courts, and every committee');
eq(M.slots.industries.slice(0, 4).map((i) => M.nodes[i].label), ['Senate', 'House', 'Executive', 'Courts'], 'the four branch hubs, in order');
eq(M.slots.industries.slice(4).every((i) => M.nodes[i].kind === 'committee'), true, 'every other hub is a committee');
const areas = new Set(d.policy_areas || []);
eq(M.nodes.filter((n) => n.kind === 'hub' || n.kind === 'committee').filter((n) => areas.has(n.name) || areas.has(n.label)).map((n) => n.name), [], 'no policy area is a hub, and no hub is labeled like one');
const people = d.counts.members + ex.presidents.length + (ex.vice_president ? 1 : 0) + (ex.cabinet || []).length + ju.judges.length;
eq(M.slots.companies.length, people, 'people: members, Presidents, the Vice President, the cabinet, and judges');
eq(M.slots.funds.length, d.agencies.length + ju.courts.length, 'agencies and courts, each their own kind');
eq(M.nodes.filter((n) => n.kind === 'agency').length, d.agencies.length, 'every agency');
eq(M.nodes.filter((n) => n.kind === 'court').length, ju.courts.length, 'every court');
eq(M.nodes.length, g.nodes.length, 'one map node for each node of the shared model');
eq(M.nodes.every((n, i) => n.i === i && n.id === g.nodes[i].id), true, 'map nodes line up with the shared model');

// hub totals, drawn on each hub's own label
const hub = (lab) => M.nodes[M.slots.industries.find((i) => M.nodes[i].label === lab)];
eq(hub('Senate').total, d.counts.senate, 'the Senate hub counts the senators');
eq(hub('House').total, d.counts.house, 'the House hub counts the representatives');
eq(hub('Executive').total, d.agencies.length + ex.presidents.length + 1 + (ex.cabinet || []).length, 'the Executive hub counts agencies and people');
eq(hub('Courts').total, ju.courts.length + ju.judges.length, 'the Courts hub counts courts and judges');
eq(/^100 members$/.test(hub('Senate').totalText), true, `the Senate label says its total: ${hub('Senate').totalText}`);
M.slots.industries.slice(4).forEach((i) => { const c = g.nodes[i].c; if (M.nodes[i].total !== c.members) fail(`${c.name}: hub total ${M.nodes[i].total}, record ${c.members}`); });

// links: one per edge of the shared model, each with a line kind and a source
eq(M.links.length, g.edges.length, 'one link per recorded connection');
const registry = new Set([...fs.readFileSync(path.join(ROOT, 'scripts', 'us_sources.py'), 'utf8').matchAll(/"id": "([a-z_]+)"/g)].map((m) => m[1]));
const kinds = new Set(['seat', 'lead', 'appointed', 'oversees', 'part']);
M.links.forEach((l, k) => {
  if (!kinds.has(l.line)) fail(`link ${k} has no line kind: ${l.line}`);
  const s = M.sources[l.src];
  if (!s) fail(`link ${k} (${g.nodes[l.a].name} to ${g.nodes[l.b].name}) has no source`);
  else if (!s.url || !/^https:\/\//.test(s.url)) fail(`source ${l.src} has no address`);
  else if (!registry.has(s.registry)) fail(`source ${l.src} names ${s.registry}, which is not in scripts/us_sources.py`);
});
const c = M.lineCounts;
eq(c.appointed, ju.judges.filter((j) => j.appointed_by_id && g.byId.has('p:' + j.appointed_by_id)).length, 'Appointed by: one line for each judge with a matched President');
eq(c.oversees, 0, 'Funds or oversees: nothing in the record yet, so no line is invented');
if (!(c.lead > 50)) fail(`Heads or leads: only ${c.lead} lines`);
if (!(c.seat > 1500)) fail(`Sits on: only ${c.seat} lines`);
const chairs = M.links.filter((l) => l.line === 'lead' && g.nodes[l.a].kind === 'member').length;
eq(chairs, g.edges.filter((e) => g.nodes[e.a].kind === 'member' && g.nodes[e.b].kind === 'committee' && /^(chair|chairman|vice chair|vice chairman|ranking member|cochairman)$/i.test(e.rel)).length, 'every recorded chair, vice chair, and ranking member is a Heads or leads line');
eq(M.links.filter((l) => l.src === 'circuits').length, ju.courts.filter((x) => x.type === 'district' && x.circuit).length, 'each district court cites the circuits statute for its appeals line');

// nothing about party, nothing that reads as a strength or a score
const words = JSON.stringify(M.nodes.map((n) => [n.label, n.totalText || ''])) + JSON.stringify(A.CX_USM_LINES) + JSON.stringify(A.CX_USM_SOURCES);
if (M.nodes.some((n) => 'party' in n)) fail('a map node carries party');
if (/\b(Republican|Democrat|Democratic|Independent|conservative|liberal)\b/i.test(JSON.stringify(A.CX_USM_LINES) + JSON.stringify(M.nodes.filter((n) => n.kind !== 'person').map((n) => n.label)))) fail('a party or ideology word in the map text');
if (/\b(Strong|Some|Light)\b|\bscores?\b|\brank(s|ed)?\b|\bmatch(es)?\b|%/.test(JSON.stringify(A.CX_USM_LINES) + JSON.stringify(M.nodes.map((n) => n.totalText || '')))) fail('a strength or score word in the map text');
if (/[–—]/.test(words)) fail('a dash in the map text');
const colors = new Set([...Object.values(A.CX_USM_COLORS), ...Object.values(A.CX_USM_FAMILY).flatMap((f) => Object.values(f))]);
const tokens = JSON.parse(fs.readFileSync(path.join(ROOT, 'design', 'tokens.json'), 'utf8')).meaning.find((m) => /United States chambers/.test(m.name));
const registered = new Set(Object.values(tokens.colors));
const unregistered = [...colors].filter((c) => !registered.has(c));
if (unregistered.length) fail('the map uses colors that are not in the registered meaning group: ' + unregistered.join(', '));

// shapes by tier: a branch is a ring (the biggest), a committee a filled hexagon, a court an outlined hexagon, an agency a square, a person a circle;
// committees and courts, both hexagons, also differ by fill and by color family, and the key says each in words
const tier = { hub: 'ring', committee: 'hex', court: 'hexo', agency: 'square', person: 'circle' };
M.nodes.forEach((n) => { if (n.shape !== tier[n.kind]) fail(`${n.name}: a ${n.kind} is drawn as ${n.shape}, not ${tier[n.kind]}`); });
{
  const comCols = new Set(M.nodes.filter((n) => n.kind === 'committee').map((n) => A.cxUsmColor(n))), courtCols = new Set(M.nodes.filter((n) => n.kind === 'court').map((n) => A.cxUsmColor(n)));
  if ([...comCols].some((c) => courtCols.has(c))) fail('a committee and a court share a color');
}

// the profile page: every node has a link name that finds it again, and every profile reads only from the record. Party is one row of the
// record, with its date and source, and nowhere else; no score, strength, or ranking word; no dash; every row has a source and a pulled date.
const vd = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'us-votes-2026.json'), 'utf8'));
{
  const S = A.cxUsmSlugs(g);
  if (new Set(S.of).size !== g.nodes.length) fail('two nodes share a link name');
  const lost = g.nodes.filter((n) => A.cxUsmFind(g, S.of[n.i]) !== n.i || A.cxUsmFind(g, n.id) !== n.i); if (lost.length) fail(`${lost.length} link names do not find their node, for example ${lost[0].name}`);
  if (!/^[a-z0-9-]+$/.test(S.of.join('-'))) fail('a link name has a character that is not a lowercase letter, a digit, or a hyphen');
  eq(S.of[g.byId.get('m:M001242') ? g.byId.get('m:M001242').i : 0], g.byId.get('m:M001242') ? 'bernie-moreno' : S.of[0], 'Bernie Moreno is shared as bernie-moreno');
  const kinds = new Map();
  g.nodes.forEach((n) => { const k = n.kind; if (!kinds.has(k)) kinds.set(k, []); if (kinds.get(k).length < 25) kinds.get(k).push(n.i); });
  const ours = (P) => JSON.stringify([P.kicker, P.sentence, P.fact, P.glance.map((x) => x.label), P.glanceNote, P.record.filter((r) => r.key !== 'party').map((r) => [r.label, typeof r.value === 'string' && !r.link ? r.value : '', r.note || '']), P.lists.map((L) => [L.title, L.note || '', L.rows.map((r) => r.word)])]);
  let n = 0;
  for (const [k, list] of kinds) for (const i of list) {
    const P = A.cxUsProfile(g, M, d, vd, i), name = g.nodes[i].name; n++;
    if (!P.kicker || !P.name || !P.sentence.length || !P.record.length) { fail(`${name}: the profile is missing its kicker, name, sentence, or record`); continue; }
    const words = ours(P);
    if (/\b(Republican|Democrat|Democratic|Independent|conservative|liberal|moderate)\b/i.test(words)) fail(`${name}: a party or ideology word outside the Party row`);
    if (/\b(strong|some|light)\b|\bscores?\b|\bmatch(es|ed)?\b|%|\bpercent|\branked\b|\brank(ing)? (?!member)/i.test(words)) fail(`${name}: a score or strength word: ${words.match(/\b(strong|some|light)\b|\bscores?\b|\bmatch(es|ed)?\b|%|\bpercent|\branked\b/i)}`);
    if (/[–—]/.test(words)) fail(`${name}: a dash in the profile`);
    P.record.forEach((r) => { if (!r.src || !r.src.label || !/^https:\/\//.test(r.src.url || '') || !/\d{4}$/.test(r.src.pulled || '')) fail(`${name}: the ${r.label} row has no source address or pulled date`); });
    const party = P.record.filter((r) => r.key === 'party');
    if (party.length && !/^Recorded as of \w+ \d+, \d{4}$/.test(party[0].note || '')) fail(`${name}: party is not dated`);
    if (k === 'member' && !party.length) fail(`${name}: a member's profile has no dated Party row`);
    if (k !== 'member' && k !== 'president' && party.length) fail(`${name}: a ${k} has a Party row`);
    if (k === 'member' && !/^(Voted on [\d,]+ bills? this Congress\.|No recorded vote on a bill is in our record yet\.)$/.test(P.fact)) fail(`${name}: the fact line is "${P.fact}"`);
    if (k === 'member' && P.glance.length !== 3) fail(`${name}: a member has ${P.glance.length} numbers at a glance, not 3`);
    P.lists.forEach((L) => L.rows.forEach((r) => { if (!r.word) fail(`${name}: a row of ${L.title} has no word from the record`); }));
    const nb = new Set(g.adj[i].map((ei) => (g.edges[ei].a === i ? g.edges[ei].b : g.edges[ei].a)));
    // what the corner map draws (lists marked map) is only their own recorded connections
    P.lists.filter((L) => L.map).forEach((L) => L.rows.forEach((r) => { if (r.i !== null && r.i !== undefined && !nb.has(r.i)) fail(`${name}: ${L.title} would put ${g.nodes[r.i].name} on the corner map, who is not connected on the record`); }));
  }
  // a member's numbers are counts from the record
  const mo = g.byId.get('m:M001242');
  if (mo) {
    const P = A.cxUsProfile(g, M, d, vd, mo.i), i0 = vd.members.indexOf('M001242');
    const cast = vd.votes.filter((v) => v.chamber === 'senate' && ['Y', 'N', 'P', 'O'].includes(v.codes[i0])).length;
    eq(P.glance[0].n, cast, 'Bernie Moreno: recorded votes cast, counted straight from the roll calls');
    const bills = new Set(vd.votes.filter((v) => v.chamber === 'senate' && v.bill && ['Y', 'N', 'P'].includes(v.codes[i0])).map((v) => v.bill)).size;
    eq(P.fact, `Voted on ${bills} bills this Congress.`, 'Bernie Moreno: the fact line counts the bills he cast a vote on');
  }
  console.log(`  ${n} profiles read`);
}

// physics: the same twice, every node placed, nothing a bad number
const t0 = Date.now();
const one = settle(A, d), two = settle(A, d);
const ms = Date.now() - t0;
eq(one.xy.every((p) => p && Number.isFinite(p[0]) && Number.isFinite(p[1])), true, 'every node has a place');
eq(JSON.stringify(one.xy) === JSON.stringify(two.xy), true, 'the same record settles the same way twice (fixed seed)');
const P = one.xy.map((p, i) => ({ x: p[0], y: p[1], r: M.nodes[i].r }));
const box = A.cxUsmBox(P);
if (!(box.x1 - box.x0 < 2400 && box.y1 - box.y0 < 2400)) fail(`the map is spread too wide: ${Math.round(box.x1 - box.x0)} by ${Math.round(box.y1 - box.y0)}`);
// the four branch hubs find separate places: no hub sits inside another's cloud
const H = [M.branchHubs.senate, M.branchHubs.house, M.branchHubs.exec, M.branchHubs.courts].map((i) => one.xy[i]);
for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) if (Math.hypot(H[a][0] - H[b][0], H[a][1] - H[b][1]) < 200) fail(`two branch hubs settled too close: ${a} and ${b}`);
// most people settle nearer their own chamber's hub than the other's
const near = M.nodes.filter((n) => n.kind === 'person' && n.role === 'member').filter((n) => { const own = g.nodes[n.i].m.chamber === 'senate' ? 0 : 1, p = one.xy[n.i]; const dd = (h) => Math.hypot(p[0] - H[h][0], p[1] - H[h][1]); return dd(own) < dd(1 - own); }).length;
if (near < 0.95 * d.counts.members) fail(`only ${near} of ${d.counts.members} members settled nearer their own chamber`);

// the tall map (a phone held upright): the same physics and seed, started in three rows. It must be taller than wide, keep the four
// branches apart, and keep members near their own chamber, like the wide one.
const tall = settle(A, d, 'tall');
eq(tall.xy.every((p) => p && Number.isFinite(p[0]) && Number.isFinite(p[1])), true, 'tall: every node has a place');
{
  const tb = A.cxUsmBox(tall.xy.map((p, i) => ({ x: p[0], y: p[1], r: M.nodes[i].r }))), tw = tb.x1 - tb.x0, th = tb.y1 - tb.y0;
  if (!(th > 1.5 * tw)) fail(`the tall map is not tall enough for a phone held upright: ${Math.round(tw)} by ${Math.round(th)}`);
  const wb = box, fitW = (bx) => Math.min(358 / (bx.x1 - bx.x0), 690 / (bx.y1 - bx.y0));   // the room on a 390 by 844 phone, between its controls
  if (!(fitW(tb) > 1.3 * fitW(wb))) fail(`the tall map does not fill a 390 by 844 phone better than the wide one: ${fitW(tb).toFixed(3)} against ${fitW(wb).toFixed(3)}`);
  const TH = [M.branchHubs.senate, M.branchHubs.house, M.branchHubs.exec, M.branchHubs.courts].map((i) => tall.xy[i]);
  for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) if (Math.hypot(TH[a][0] - TH[b][0], TH[a][1] - TH[b][1]) < 200) fail(`tall: two branch hubs settled too close: ${a} and ${b}`);
  const tnear = M.nodes.filter((n) => n.kind === 'person' && n.role === 'member').filter((n) => { const own = g.nodes[n.i].m.chamber === 'senate' ? 0 : 1, p = tall.xy[n.i]; const dd = (h) => Math.hypot(p[0] - TH[h][0], p[1] - TH[h][1]); return dd(own) < dd(1 - own); }).length;
  if (tnear < 0.95 * d.counts.members) fail(`tall: only ${tnear} of ${d.counts.members} members settled nearer their own chamber`);
}

// the settled file the build writes must be a fresh run of the same code on the same record
const built = path.join(ROOT, 'site', 'us', 'map-2026.json');
if (fs.existsSync(built)) {
  const f = JSON.parse(fs.readFileSync(built, 'utf8'));
  eq(f.ids, A.cxUsmIds(g), 'the built file is for this record');
  eq(JSON.stringify(f.xy) === JSON.stringify(one.xy), true, 'the built file matches a fresh run (rebuild with python build.py)');
  eq(JSON.stringify(f.tall) === JSON.stringify(tall.xy), true, 'the built file\'s tall map matches a fresh run (rebuild with python build.py)');
} else console.log('note: site/us/map-2026.json is not built yet; run python build.py');

// names on the map never overlap, whatever they are asked to place
const measure = (t) => t.length * 7;
let seed = 7; const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
for (let trial = 0; trial < 20; trial++) {
  const cand = Array.from({ length: 160 }, (_, i) => ({ i, x: rnd() * 390, y: rnd() * 844, rr: 4, pri: Math.round(rnd() * 100), center: i % 9 === 0, lines: [{ text: 'Name ' + 'x'.repeat(Math.round(rnd() * 14)), font: '600 13px sans-serif', size: 13 }] }));
  const out = A.cxUsMapLabels(cand, measure, 390, 844, 90);
  if (out.length > 90) fail('more than 90 names');
  for (let a = 0; a < out.length; a++) for (let b = a + 1; b < out.length; b++) { const p = out[a], q = out[b]; if (p.x < q.x + q.w && p.x + p.w > q.x && p.y < q.y + q.h && p.y + p.h > q.y) { fail(`two names overlap in trial ${trial}`); a = out.length; break; } }
  if (out.some((b) => b.x < 0 || b.y < 0 || b.x + b.w > 390 || b.y + b.h > 844)) fail('a name runs off the screen');
}
// a higher priority name is never pushed off by a lower one
{ const cand = [{ i: 1, x: 100, y: 100, rr: 4, pri: 10, lines: [{ text: 'low', font: '', size: 12 }] }, { i: 2, x: 100, y: 100, rr: 4, pri: 99, lines: [{ text: 'high', font: '', size: 12 }] }];
  const out = A.cxUsMapLabels(cand, measure, 400, 400); if (!out.length || out[0].i !== 2) fail('the highest priority name was not placed first'); }

console.log(`${bad ? bad + ' failure(s)' : 'ok'}: ${M.nodes.length} nodes (${M.slots.industries.length} hubs, ${M.slots.companies.length} people, ${M.slots.funds.length} agencies and courts), ${M.links.length} links with sources, settled twice in ${ms} ms`);
process.exit(bad ? 1 : 0);
