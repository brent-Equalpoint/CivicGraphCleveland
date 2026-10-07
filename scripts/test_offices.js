#!/usr/bin/env node
/* Tests for what five offices can do (ext/cx-offices-text.jsx; docs/source-notes-offices.md), with no browser and no network.

   node scripts/test_offices.js

   The words:
   - exactly Attorney General, Auditor of State, Secretary of State, Treasurer of State, and County Executive have words, each with can, limits,
     and one https link on codes.ohio.gov or cuyahogacounty.gov; each line is one or two sentences
   - no party, ranking, score, advice, or prediction word, no percent sign, and no em or en dash
   - every link and every office is in docs/source-notes-offices.md, which says when it was read
   The lookup:
   - the five (any case) get their words, in the shape qm() returns; every other office, and a name like "constructor", gets null (so the
     compiled app's own words are used, exactly as before)
   The notice:
   - unreviewed, it says a person has not reviewed the words; reviewed, it names the person and the day and no longer says that
   The ticket (the governor's contest, contest-1):
   - one added line for the lieutenant governor with its own codes.ohio.gov link, at most two sentences, no party, ranking, score, advice, or
     prediction word, no dash; the lookup finds it by contest id and returns null for every other contest; the governor's words are not in the
     block (qm() keeps them from the compiled app) and cxOfficeInfo() still returns null for that contest
   - the source notes have a Lieutenant Governor section that quotes the sections the line rests on
   Where it is wired:
   - build.py makes qm() ask first (one patch) and puts the notice under the words in the three desktop places; the phone shows it in the
     three places that show the words; the ticket line follows the governor's own link in the two phone and one desktop record places */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
let bad = 0, ran = 0;
const ok = (c, m) => { ran++; if (!c) { bad++; console.log('FAIL ' + m); } };

const NAMES = ['Attorney General', 'Auditor of State', 'Secretary of State', 'Treasurer of State', 'County Executive'];
const src = read('ext/cx-offices-text.jsx');
const block = /\/\* OFFICES-TEXT-START[\s\S]*?OFFICES-TEXT-END \*\//.exec(src);
ok(!!block, 'the OFFICES-TEXT markers are in ext/cx-offices-text.jsx');
ok(/python build\.py --mark-offices-reviewed "Your Name"/.test(block[0]), 'the block says how a person marks it reviewed');

/* the pure part: everything before the screen piece (the notice component is JSX) */
const pure = src.slice(0, src.indexOf('/* ---------- the notice under the words'));
ok(pure.length > 1500 && !/<[A-Za-z]/.test(pure.replace(/\/\*[\s\S]*?\*\//g, '').replace(/`[^`]*`/g, '')), 'the pure part of ext/cx-offices-text.jsx holds no screen');
const longDate = /function cxLongDate\(iso\) \{[\s\S]*?\n\}/.exec(read('ext/cx-seat.jsx'))[0];
const run = (review) => {
  const ctx = vm.createContext({ CX_OFFICES_REVIEW: review });
  vm.runInContext(`${longDate}\n${pure}\n;this.api = { CX_OFFICES, CX_OFFICE_TICKETS, cxOfficeInfo, cxOfficeTicket, cxOfficeReview };`, ctx);
  return ctx.api;
};
const A = run({ ok: false, by: null, checked: null });

const keys = Object.keys(A.CX_OFFICES);
ok(JSON.stringify(keys) === JSON.stringify(NAMES.map((n) => n.toLowerCase())), `the offices are ${keys.join(', ')}`);

const BAD = /\b(democrat\w*|republican\w*|libertarian\w*|party|parties|partisan|best|better|worse|worst|rank\w*|scores?|should|ought|must|favorite|strongest|weakest|vote for|vote against|will|would|likely|predict\w*|promis\w*|win|wins|lose|loses)\b|%/i;
const sentences = (t) => (t.match(/[^.!?]+[.!?]+(\s|$)/g) || []).length;
for (const [k, w] of Object.entries(A.CX_OFFICES)) {
  ok(typeof w.can === 'string' && w.can.length > 40 && typeof w.limits === 'string' && w.limits.length > 40, `${k}: has can and limits`);
  ok(/^https:\/\/(codes\.ohio\.gov|cuyahogacounty\.gov)\/[A-Za-z0-9._\/-]+$/.test(w.url), `${k}: links one official source (${w.url})`);
  for (const [f, t] of [['can', w.can], ['limits', w.limits]]) {
    ok(sentences(t) >= 1 && sentences(t) <= 2, `${k} ${f}: one or two sentences (${sentences(t)})`);
    ok(!/[–—]/.test(t), `${k} ${f}: no em or en dash`);
    ok(!BAD.test(t), `${k} ${f}: a party, ranking, score, advice, or prediction word: ${(BAD.exec(t) || [])[0]}`);
    ok(/[.]$/.test(t), `${k} ${f}: ends with a period`);
  }
  ok(Object.keys(w).sort().join() === 'can,limits,url', `${k}: only can, limits, url (the shape qm returns)`);
}
ok(!/[–—]/.test(block[0]), 'no em or en dash anywhere in the block');
ok(!/[–—]/.test(read('docs/source-notes-offices.md')), 'no em or en dash in the source notes');

/* every link and every office is in the source notes, with the day it was read */
const doc = read('docs/source-notes-offices.md');
ok(/Oct 7, 2026/.test(doc) && /read on Oct 7, 2026/.test(doc), 'the source notes say when the pages were read');
for (const n of NAMES) ok(new RegExp(`^## ${n}$`, 'm').test(doc), `the source notes have a section for ${n}`);
for (const w of Object.values(A.CX_OFFICES)) ok(doc.includes(w.url), `the source notes show the link ${w.url}`);
for (const sec of ['109.02', '117.10', '117.11', '3501.05', '3501.04', '113.11', '113.12', '2.03', '3.10(7)']) ok(doc.includes(sec), `the source notes cite section ${sec}`);

/* the ticket: the added line for the lieutenant governor */
const T = A.CX_OFFICE_TICKETS;
ok(JSON.stringify(Object.keys(T)) === JSON.stringify(['contest-1']), `the tickets are ${Object.keys(T)}`);
{
  const t = T['contest-1'] || {};
  ok(Object.keys(t).sort().join() === 'line,name,url' && t.name === 'Lieutenant Governor', 'the ticket has a name, a line, and a url');
  ok(/^https:\/\/codes\.ohio\.gov\/[A-Za-z0-9._\/-]+$/.test(t.url || ''), `the ticket links one codes.ohio.gov page (${t.url})`);
  ok(sentences(t.line) >= 1 && sentences(t.line) <= 2, `the ticket line is one or two sentences (${sentences(t.line)})`);
  ok(!/[–—]/.test(t.line) && !BAD.test(t.line) && /[.]$/.test(t.line), `the ticket line has a dash, a bad word (${(BAD.exec(t.line) || [])[0]}), or no period`);
  ok(/lieutenant governor/i.test(t.line) && /same ticket/.test(t.line) && /takes over as governor/.test(t.line) && /cannot serve/.test(t.line), 'the ticket line says what the office is and what it does');
  ok(/powers only in those cases/.test(t.line), 'the ticket line says what the office cannot do alone');
  ok(A.cxOfficeTicket({ id: 'contest-1' }) === t, 'contest-1 finds its ticket line');
  for (const id of ['contest-2', 'contest-22', 'CONTEST-1', 'constructor', '__proto__', 'toString', '']) ok(A.cxOfficeTicket({ id }) === null, `${id || '(empty)'}: no ticket line`);
  ok(A.cxOfficeTicket(null) === null && A.cxOfficeTicket({}) === null && A.cxOfficeTicket({ id: 1 }) === null, 'a missing or odd contest has no ticket line');
  ok(A.cxOfficeInfo({ id: 'contest-1', name: 'Governor and Lieutenant Governor' }) === null, 'the governor words stay the compiled app\'s: cxOfficeInfo is null for the ticket');
  ok(doc.includes('## Lieutenant Governor') && doc.includes(t.url), 'the source notes have a Lieutenant Governor section with the link');
  for (const sec of ['Section 1a', 'Section 15', '107.01', '141.011']) ok(doc.includes(sec), `the source notes cite ${sec} for the lieutenant governor`);
  ok(/one vote shall be cast jointly/.test(doc) && /the Lieutenant Governor shall succeed to the office of Governor/.test(doc), 'the source notes quote the words the line rests on');
}

/* the lookup */
for (const n of NAMES) {
  for (const name of [n, n.toLowerCase(), n.toUpperCase()]) {
    const i = A.cxOfficeInfo({ name });
    ok(i && i.can === A.CX_OFFICES[n.toLowerCase()].can && i.limits && i.url, `${name}: gets its words`);
  }
}
for (const name of ['Governor and Lieutenant Governor', 'United States Senator', 'Representative to Congress', 'State Senator', 'State Representative', 'Member of County Council',
  'Justice of the Supreme Court', 'Judge of the Court of Appeals', 'Judge of the Court of Common Pleas', 'Lieutenant Governor', 'Attorney General of Ohio', 'constructor', '__proto__', 'toString', '']) {
  ok(A.cxOfficeInfo({ name }) === null, `${name || '(empty)'}: no words here, so the compiled app's own words (or its generic line) stay`);
}
ok(A.cxOfficeInfo(null) === null && A.cxOfficeInfo(undefined) === null && A.cxOfficeInfo({}) === null && A.cxOfficeInfo({ name: 7 }) === null, 'a missing or odd contest gets null');

/* the notice: unreviewed it says so; reviewed it names the person and the day, and no longer says a person has not reviewed it */
const un = A.cxOfficeReview();
ok(/A person has not reviewed them yet\./.test(un) && /what this office can do/.test(un) && !/read against/.test(un), `the unreviewed notice: ${un}`);
const rv = run({ ok: true, by: 'Ada Reviewer', checked: '2026-10-07' }).cxOfficeReview();
ok(/read against Ohio law and the county charter by Ada Reviewer on October 7, 2026\./.test(rv) && !/has not reviewed/.test(rv), `the reviewed notice: ${rv}`);
const none = vm.runInContext(`${longDate}\n${pure}\n;cxOfficeReview()`, vm.createContext({}));
ok(/has not reviewed/.test(none), 'with no review record at all it says a person has not reviewed it');

/* where it is wired */
const build = read('build.py'), ballot = read('ext/cxm-ballot.jsx');
ok(/office words: qm asks the new words first/.test(build) && /function qm\(e\) \{\\n  let cxo = cxOfficeInfo\(e\);\\n  if \(cxo\) return cxo;/.test(build), 'build.py makes qm ask cxOfficeInfo first');
ok((build.match(/\(0, W\.jsx\)\(CxOfficeNote, \{ contest: /g) || []).length === 3, 'build.py puts the notice under the words in the three desktop places');
ok((ballot.match(/<CxOfficeNote contest=\{/g) || []).length === 3, 'the phone shows the notice in the three places that show the words');
ok((ballot.match(/<CxOfficeTicket contest=\{/g) || []).length === 2 && (ballot.match(/<CxOfficeNote contest=\{c\} skipTicket \/>/g) || []).length === 2, 'the phone puts a ticket line after the governor\'s own link in the contest page and the record');
ok(/contest: t, skipTicket: !0/.test(build) && /CxOfficeTicket, \{ contest: t \}/.test(build), 'build.py leaves the ticket line for after the desktop record\'s link and puts it there');
ok(/"cx-offices-text\.jsx"/.test(build) && /--mark-offices-reviewed/.test(build) && /CX_OFFICES_REVIEW/.test(build), 'build.py builds the file in, has the review command, and passes the review mark in');
ok(/<p className="cxm-fine">\{cxOfficeReview\(\)\}<\/p>/.test(src), 'the notice reuses the existing small-note style');

console.log(`${ran - bad} of ${ran} checks passed.`);
process.exit(bad ? 1 : 0);
