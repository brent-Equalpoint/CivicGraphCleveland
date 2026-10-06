#!/usr/bin/env node
/* Tests for "how you line up" (docs/plan-alignment.md): the sample question set (ext/cx-align-text.jsx) against the recorded votes
   (data/us-votes-2026.json), and the counting model (ext/cx-align.jsx), with no browser and no network.

   node scripts/test_alignment.js

   The question set:
   - every question maps to real votes: in the record, deciding (final), in the chamber it is filed under, on the question's own bill, and
     the only deciding vote on that bill in that chamber; the policy area is the bill's own; no nomination
   - no leaning word in our own words (LEANING below; an official name such as the Environmental Protection Agency is not ours, so it is
     taken out before the scan), no dash, no percent sign, and every question asks whether you support what the measure does
   - every question has a secure source link to official text; the set says it is a sample; 3 to 5 questions in each area used, and every
     area used had at least `threshold` deciding votes on bills; an area that had enough but is not used says why
   The model:
   - step 1 counts equal a count made straight from the record, for real members and areas
   - Present and Not voting are never counted as the same or as different; a member not in the roll is shown, not counted as a no
   - It depends and Still learning are left out; a senator is compared only on Senate votes, a representative only on House votes
   - the result has no number across areas: one entry per area and nothing else
   - no word of the feature (English or Spanish) is a score, a match, a rank, a percent, best, or a total of agreement
   - the step 2 preview switch is only ever read, never set, by the app */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
let bad = 0, ran = 0;
const fail = (m) => { bad++; console.log('FAIL ' + m); };
const ok = (c, m) => { ran++; if (!c) fail(m); };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: got ${JSON.stringify(a)}, wanted ${JSON.stringify(b)}`);

/* words that lean one way, in our own text (the question, what it does, what it does not do). Chosen for this set: advice words, praise and
   blame words, and the loaded labels both sides of American politics use. A person's quoted words would be theirs, but this set quotes no one. */
const LEANING = ['should', 'must', 'ought', 'good', 'bad', 'better', 'worse', 'best', 'worst', 'harmful', 'helpful', 'dangerous', 'safe', 'unsafe',
  'fight', 'fights', 'fighting', 'protect', 'protects', 'protecting', 'protection', 'protections', 'attack', 'attacks', 'radical', 'extreme', 'extremist',
  'common sense', 'common-sense', 'commonsense', 'sensible', 'crisis', 'scheme', 'scam', 'rip-off', 'giveaway', 'handout', 'handouts', 'job-killing',
  'job killing', 'woke', 'illegal alien', 'illegal aliens', 'slash', 'slashes', 'gut', 'guts', 'war on', 'freedom', 'patriot', 'un-American', 'so-called',
  'reckless', 'outrageous', 'disastrous', 'burden', 'burdensome', 'red tape', 'overreach', 'bureaucrats', 'loophole', 'big oil', 'polluters', 'greedy',
  'elite', 'elites', 'weaponize', 'weaponized', 'surveillance state', 'finally', 'obviously', 'clearly', 'simply', 'massive', 'huge'];
/* official names that contain one of those words but are names, not our words */
const NAMES = ['Environmental Protection Agency', 'Consumer Financial Protection Bureau', 'Environmental Protection'];
const lean = (t) => { let s = ` ${t} `; NAMES.forEach((n) => { s = s.split(n).join(' '); }); return LEANING.filter((w) => new RegExp(`(^|[^a-z])${w.replace(/[-]/g, '[- ]')}([^a-z]|$)`, 'i').test(s)); };

/* ---- the question set ---- */
const textSrc = read('ext/cx-align-text.jsx');
const block = /\/\* ALIGN-TEXT-START \*\/([\s\S]*?)\/\* ALIGN-TEXT-END \*\//.exec(textSrc);
ok(!!block, 'the ALIGN-TEXT markers are in ext/cx-align-text.jsx');
const Q = JSON.parse(/const CX_ALIGN_Q = (\{[\s\S]*?\n\});\n/.exec(block[1])[1]);
const vd = JSON.parse(read('data/us-votes-2026.json'));
const byId = new Map(vd.votes.map((v) => [v.id, v]));
ok(/\bsample\b/i.test(Q.about) && /not everything/i.test(Q.about), 'the set says it is a sample and not everything');
const ids = new Set();
for (const q of Q.questions) {
  const w = `[${q.id}]`;
  ok(!ids.has(q.id), `${w} the id is used once`); ids.add(q.id);
  const b = vd.bills[q.bill];
  ok(!!b, `${w} bill ${q.bill} is in the record`);
  if (!b) continue;
  ok(b.policy_area === q.area, `${w} the area ${q.area} is the bill's own (${b.policy_area})`);
  const chambers = Object.keys(q.votes);
  ok(chambers.length >= 1 && chambers.every((c) => c === 'senate' || c === 'house'), `${w} names a vote in the Senate, the House, or both`);
  for (const [ch, id] of Object.entries(q.votes)) {
    const v = byId.get(id);
    ok(!!v, `${w} vote ${id} is in data/us-votes-2026.json`);
    if (!v) continue;
    ok(v.chamber === ch, `${w} vote ${id} is a ${ch} vote`);
    ok(v.final === true, `${w} vote ${id} decided something (final)`);
    ok(v.bill === q.bill, `${w} vote ${id} is on ${q.bill}`);
    ok(v.kind !== 'nomination', `${w} vote ${id} is not a nomination`);
  }
  // exactly one deciding vote per chamber that voted on the bill, and it is the one named
  const deciding = {};
  vd.votes.filter((v) => v.bill === q.bill && v.final).forEach((v) => { (deciding[v.chamber] = deciding[v.chamber] || []).push(v.id); });
  eq(Object.fromEntries(Object.entries(q.votes).map(([c, id]) => [c, [id]]).sort()), Object.fromEntries(Object.entries(deciding).sort()), `${w} maps to the bill's one deciding vote in each chamber that voted`);
  // the words
  ok(/^Do you support [^?]+\?$/.test(q.q), `${w} asks whether you support what the measure does, as one question`);
  ok(q.q.split(/\s+/).length <= 40, `${w} the question is 40 words or fewer`);
  ok(q.does && q.does.split(/\s+/).length <= 80, `${w} what it does is said, in 80 words or fewer`);
  ok(!q.not || q.not.split(/\s+/).length <= 40, `${w} what it does not do is 40 words or fewer`);
  for (const [k, t] of [['question', q.q], ['what it does', q.does], ['what it does not do', q.not || '']]) {
    const hit = lean(t);
    ok(!hit.length, `${w} ${k} has a leaning word: ${hit.join(', ')}`);
    ok(!/[–—]|\s-\s/.test(t), `${w} ${k} has a dash`);
    ok(!/%|\bpercent/i.test(t), `${w} ${k} has a percent`);
  }
  ok(q.src && /^https:\/\/www\.govinfo\.gov\//.test(q.src.url) && q.src.label && /^\d{4}-\d{2}-\d{2}$/.test(q.src.read), `${w} has a secure link to its official source, with the day it was read`);
  ok(!q.text || /^https:\/\/www\.govinfo\.gov\//.test(q.text.url), `${w} the bill text link is secure and official`);
  ok(!q.cra || /chapter 8 of title 5|disapproving the rule/i.test(b.title), `${w} the Congressional Review Act note is only on a resolution of disapproval`);
}
ok(Q.questions.length >= 3, 'the set has questions');
// per area: 3 to 5, and only areas with enough deciding votes on bills
const finalsByArea = new Map();
vd.votes.forEach((v) => { if (!v.final || !v.bill) return; const a = (vd.bills[v.bill] || {}).policy_area; if (a) finalsByArea.set(a, (finalsByArea.get(a) || 0) + 1); });
const perArea = new Map();
Q.questions.forEach((q) => perArea.set(q.area, (perArea.get(q.area) || 0) + 1));
for (const [a, n] of perArea) {
  ok(n >= Q.per_area[0] && n <= Q.per_area[1], `${a} has ${n} questions, not ${Q.per_area[0]} to ${Q.per_area[1]}`);
  ok((finalsByArea.get(a) || 0) >= Q.threshold, `${a} has ${finalsByArea.get(a) || 0} deciding votes on bills, under the threshold of ${Q.threshold}`);
}
const skipped = new Set((Q.skipped || []).map((s) => s.area));
for (const [a, n] of finalsByArea) if (n >= Q.threshold && !perArea.has(a)) ok(skipped.has(a), `${a} had ${n} deciding votes but is neither used nor listed as skipped with a reason`);
(Q.skipped || []).forEach((s) => ok(s.why && !lean(s.why).length && !/[–—]/.test(s.why), `the reason ${s.area} is skipped is said plainly`));
ok(!/[–—]/.test(block[1]), 'no em or en dash anywhere in the question set');
ok(Q.cra_note && /^https:\/\//.test(Q.cra_note.url), 'the Congressional Review Act note links its source');

/* ---- the model ---- */
const us = read('ext/cx-us.jsx'), al = read('ext/cx-align.jsx');
const pureUs = us.slice(0, us.indexOf('/* ---------- Your members'));
const pureAl = al.slice(al.indexOf('/* ---------- pure'), al.indexOf('/* ---------- the questions file'));
ok(pureAl.length > 500 && !/</.test(pureAl.replace(/[<>]=?\s*\d|=>|[<>] [a-z]/g, '')), 'the pure part of ext/cx-align.jsx holds no screen');
const ctx = vm.createContext({ globalThis: {}, CX_ALIGN_REVIEW: { ok: false } });
vm.runInContext(`${pureUs}\n${pureAl}\n;this.api = { cxAlignOn, cxAlignStep1, cxAlignLine, cxAlignLineText, cxAlignCountLines, cxAlignOrder, cxAlignWho, cxMemberVotes, cxCastCounts };`, ctx);
const A = ctx.api;
const data = JSON.parse(read('data/us-landscape-2026.json'));
const member = (name) => data.members.find((m) => m.name === name);
ok(A.cxAlignOn() === false, 'step 2 is off while the questions are not reviewed and nothing turns on the preview');
ctx.globalThis.__cxAlignPreview = true; ok(A.cxAlignOn() === true, 'the test hook turns step 2 on'); ctx.globalThis.__cxAlignPreview = false;
// step 1 against a count made straight from the record
for (const nm of ['Jon Husted', 'Bernie Moreno', 'Shontel M. Brown']) {
  const m = member(nm); ok(!!m, `${nm} is in the record`); if (!m) continue;
  const at = vd.members.indexOf(m.id);
  for (const area of ['Energy', 'Crime and Law Enforcement', 'Nominations', 'Health']) {
    const [c] = A.cxAlignStep1(vd, m, [area]);
    const want = { Y: 0, N: 0, P: 0, X: 0 };
    let total = 0;
    vd.votes.forEach((v) => {
      if (!v.final || v.chamber !== m.chamber) return;
      const a = v.bill ? (vd.bills[v.bill] || {}).policy_area || 'No policy area listed' : v.kind === 'nomination' ? 'Nominations' : 'No policy area listed';
      const code = v.codes[at];
      if (a !== area || !code || code === '-') return;
      total++; if (code in want) want[code]++;
    });
    eq([c.total, c.yea, c.nay, c.present, c.notVoting], [total, want.Y, want.N, want.P, want.X], `${nm}, ${area}: step 1 counts equal the record`);
  }
}
// step 2 on a made-up record, so every case is known
const fake = {
  members: ['S1', 'H1', 'H2'],
  bills: { b1: { policy_area: 'Energy' }, b2: { policy_area: 'Energy' }, b3: { policy_area: 'Health' } },
  votes: [
    { id: 's-1', chamber: 'senate', final: true, bill: 'b1', codes: 'Y--' },
    { id: 'h-1', chamber: 'house', final: true, bill: 'b1', codes: '-YN' },
    { id: 'h-2', chamber: 'house', final: true, bill: 'b2', codes: '-XP' },
    { id: 'h-3', chamber: 'house', final: true, bill: 'b3', codes: '-N-' },
  ],
};
const FQ = { questions: [
  { id: 'q1', area: 'Energy', bill: 'b1', votes: { senate: 's-1', house: 'h-1' } },
  { id: 'q2', area: 'Energy', bill: 'b2', votes: { house: 'h-2' } },
  { id: 'q3', area: 'Health', bill: 'b3', votes: { house: 'h-3' } },
] };
const S1 = { id: 'S1', chamber: 'senate' }, H1 = { id: 'H1', chamber: 'house' }, H2 = { id: 'H2', chamber: 'house' };
{
  const r = A.cxAlignLine(fake, FQ, { q1: 'yes', q2: 'no', q3: 'no' }, H1);
  eq(Object.keys(r).sort(), ['areas', 'member'], 'the result holds one entry per area and nothing else: no number across areas');
  ok(r.areas.every((a) => !('total' in a) && !('overall' in a) && !('score' in a)), 'no area entry carries a total, an overall, or a score');
  const e = r.areas.find((a) => a.area === 'Energy'), h = r.areas.find((a) => a.area === 'Health');
  eq([e.same, e.of, e.none, e.other], [1, 1, 1, 0], 'H1, Energy: the yea is the same; Not voting is no vote on this, never a no');
  eq(e.rows.map((x) => x.kind), ['same', 'novote'], 'H1, Energy: the rows say same, then no vote on this');
  eq([h.same, h.of, h.none], [1, 1, 0], 'H1, Health: the nay is the same as a no');
  const r2 = A.cxAlignLine(fake, FQ, { q1: 'yes', q2: 'yes', q3: 'yes' }, H2);
  const e2 = r2.areas.find((a) => a.area === 'Energy'), h2 = r2.areas.find((a) => a.area === 'Health');
  eq([e2.same, e2.of, e2.none], [0, 1, 1], 'H2, Energy: a nay differs; Present is no vote on this, not counted either way');
  eq([h2.same, h2.of, h2.none, h2.rows[0].kind], [0, 0, 1, 'notroll'], 'H2, Health: not in the roll is shown, never counted as a no');
  const r3 = A.cxAlignLine(fake, FQ, { q1: 'yes', q2: 'no', q3: 'no' }, S1);
  const e3 = r3.areas.find((a) => a.area === 'Energy'), h3 = r3.areas.find((a) => a.area === 'Health');
  eq([e3.same, e3.of, e3.none, e3.other], [1, 1, 0, 1], 'S1: a senator is compared on the Senate vote only; the House-only question is not compared');
  eq([h3.of, h3.none, h3.other], [0, 0, 1], 'S1: a House-only question in another area is not compared either');
  const r4 = A.cxAlignLine(fake, FQ, { q1: 'depends', q2: 'learning' }, H1);
  eq(r4.areas.map((a) => [a.area, a.answered, a.of, a.none]), [['Energy', 0, 0, 0], ['Health', 0, 0, 0]], 'It depends and Still learning are left out');
  eq(A.cxAlignLine(fake, FQ, { q1: 'yes', q3: 'no' }, H1, ['Health']).areas.map((a) => a.area), ['Health'], 'only the areas you picked are shown');
  // the words for a line: the count that is the same, and the questions they did not vote on, always said
  const t = A.cxAlignLineText(e, 'house');
  ok(t.some((x) => /^You answered the same on 1 of 1 question you answered that this member voted on\.$/.test(x)) && t.some((x) => /did not vote on: 1\.$/.test(x)), `the line for an area says what was the same and what they did not vote on: ${JSON.stringify(t)}`);
  ok(A.cxAlignLineText(e3, 'senate').some((x) => /had no Senate vote, so they are not compared: 1\./.test(x)), 'a senator\'s line says a House-only question is not compared');
}
// the compare table is ordered by name or by state, never by a count
{
  const ohio = A.cxAlignWho(data, 'state', 'OH', '');
  const byName = A.cxAlignOrder(ohio, 'name').map((m) => m.last || m.name);
  eq(byName, [...byName].sort((a, b) => a.localeCompare(b)), 'by name is by last name');
  const sen = A.cxAlignOrder(A.cxAlignWho(data, 'senate', '', ''), 'state').map((m) => m.state);
  const stName = (c) => ({ OH: 'Ohio' })[c] || c;
  ok(sen.every((s, i) => i === 0 || A.cxAlignOrder([data.members.find((m) => m.state === sen[i - 1] && m.chamber === 'senate'), data.members.find((m) => m.state === s && m.chamber === 'senate')], 'state')[0].state === sen[i - 1]), 'by state keeps each state together in state order');
  const mine = A.cxAlignWho(data, 'mine', 'OH', '11');
  eq(mine.map((m) => m.chamber).sort(), ['house', 'senate', 'senate'], 'your members are your two senators and your representative');
  ok(!/sort\(\([ab], [ab]\) => [^)]*\b(same|of|none|total|yea|nay)\b/.test(al), 'nothing in the feature sorts by a count');
}

/* ---- the words of the feature, English and Spanish ---- */
const FORBIDDEN = /\bscores?\b|\bmatch(es|ed|ing)?\b|\branks?\b|\branked\b|\branking\b|%|\bpercent|\bbest\b|\bworst\b|\baligned with you\b|\bagrees? with you\b|\boverall\b|\bin total\b|\bgrades?\b|\brating\b(?! of anyone)/i;
const FORBIDDEN_ES = /\bpuntuaci[oó]n|\bpuntaje|\bcoincidencias?\b|\bclasificaci[oó]n|\branking|%|\bporcentaje|\bpor ciento|\bmejor(es)?\b|\bpeor(es)?\b|\ben total\b|\ben general\b|\bcalificaci[oó]n\b(?! de nadie)/i;
const strings = new Set();
const code = al.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
for (const m of code.matchAll(/`([^`]*)`/g)) if (/[A-Za-z]{3,}\s+[A-Za-z]/.test(m[1])) strings.add(m[1].replace(/\$\{[^}]*\}/g, '{n}'));
for (const m of code.matchAll(/>([^<>{}]*[A-Za-z]{3,}[^<>{}]*)</g)) if (m[1].trim()) strings.add(m[1].trim());
Q.questions.forEach((q) => [q.q, q.does, q.not].filter(Boolean).forEach((t) => strings.add(t)));
strings.add(Q.about);
for (const s of strings) { const h = s.match(FORBIDDEN); ok(!h, `the feature says "${h && h[0]}": ${s.slice(0, 90)}`); }
const man = JSON.parse(read('i18n/manual.json'));
const es = new Map([...Object.entries(man.exact), ...Object.entries(man.masked)]);
let esn = 0;
for (const s of strings) { const t = es.get(s); if (!t) continue; esn++; const h = t.match(FORBIDDEN_ES); ok(!h, `the Spanish for "${s.slice(0, 50)}" says "${h && h[0]}"`); ok(!/[–—]/.test(t), `the Spanish for "${s.slice(0, 50)}" has a dash`); }
ok(esn >= 40, `only ${esn} of the feature's strings have Spanish in i18n/manual.json`);

/* ---- the preview switch: read by the app, set only by a check ---- */
for (const f of fs.readdirSync(path.join(ROOT, 'ext')).filter((f) => /\.(jsx|js)$/.test(f))) {
  const s = read(`ext/${f}`);
  ok(!/__cxAlignPreview\s*=(?!=)/.test(s), `ext/${f} sets the step 2 preview switch; only a check may`);
  if (f !== 'cx-align.jsx') ok(!/__cxAlignPreview/.test(s), `ext/${f} reads the step 2 preview switch; only ext/cx-align.jsx may`);
}
ok((code.match(/__cxAlignPreview/g) || []).length === 1 && /function cxAlignOn\(\) \{[^\n]*globalThis\.__cxAlignPreview === true/.test(al), 'ext/cx-align.jsx reads the preview switch in one place only (cxAlignOn), and only as true');
ok(!/location|URLSearchParams|localStorage|sessionStorage|document\.cookie/.test(pureAl.replace(/globalThis\.location\?\.protocol/g, '')), 'whether step 2 is on never comes from a link, storage, or a cookie');
ok(!/localStorage|sessionStorage|document\.cookie|history\.(push|replace)State|searchParams/.test(al), 'ext/cx-align.jsx never writes to storage, a cookie, or the address');

console.log(bad ? `${bad} of ${ran} failed` : `ok  alignment (${Q.questions.length} questions in ${perArea.size} areas, ${ran} checks)`);
process.exit(bad ? 1 : 0);
