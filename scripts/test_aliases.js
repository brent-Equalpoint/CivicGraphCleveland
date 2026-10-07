#!/usr/bin/env node
/* Tests for the well known neighborhood names (ext/cx-aliases-text.jsx; docs/source-notes-aliases.md), with no browser and no network.

   node scripts/test_aliases.js

   The list:
   - exactly eleven rows, each with an alias, a neighborhood, a PDF page of the City Planning Commission's plan, and a weak flag; no alias repeats
   - every neighborhood is spelled exactly as in data/geo-2026.json, and no alias is itself a neighborhood name
   - no dash anywhere in the block, and the text says how a person marks it reviewed
   - every alias, neighborhood, and page is in docs/source-notes-aliases.md, which says when the plan was read and quotes the words
   How typed letters are matched:
   - capitals, accents, apostrophes, periods, and hyphens are ignored; at least three letters; the start of the alias or of one of its words
   - an alias row is left out when its neighborhood is already found by name, so a name result never carries an alias line
   - typing each alias finds exactly its own row
   The notice:
   - unreviewed it says a person has not reviewed these names; reviewed it names the person and the day
   Where it is wired:
   - the picker shows "{name} is part of {neighborhood}." as separate spans and the notice once, under the alias lines only; the Meetings part has no
     Choose priorities button; the file is built in, with its review command */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
let bad = 0, ran = 0;
const ok = (c, m) => { ran++; if (!c) { bad++; console.log('FAIL ' + m); } };

const src = read('ext/cx-aliases-text.jsx');
const block = /\/\* ALIASES-TEXT-START[\s\S]*?ALIASES-TEXT-END \*\//.exec(src);
ok(!!block, 'the ALIASES-TEXT markers are in ext/cx-aliases-text.jsx');
ok(/python build\.py --mark-aliases-reviewed "Your Name"/.test(block[0]), 'the block says how a person marks it reviewed');
ok(!/[–—]/.test(src), 'no em or en dash in ext/cx-aliases-text.jsx');

const longDate = /function cxLongDate\(iso\) \{[\s\S]*?\n\}/.exec(read('ext/cx-seat.jsx'))[0];
const run = (review) => {
  const ctx = vm.createContext({ CX_ALIASES_REVIEW: review });
  vm.runInContext(`${longDate}\n${src}\n;this.api = { CX_ALIASES, cxAliasFold, cxAliasNames, cxAliasFind, cxAliasReview };`, ctx);
  return ctx.api;
};
const A = run({ ok: false, by: null, checked: null });
const geo = JSON.parse(read('data/geo-2026.json'));
const HOODS = [...new Set(Object.values(geo.overlap.wards2026).flatMap((rows) => rows.map((r) => r.hood)))].sort();

/* the list */
const L = A.CX_ALIASES;
ok(Array.isArray(L) && L.length === 11, `the list has ${L.length} rows, not eleven`);
const WANT = { 'Little Italy': ['University', 479], 'University Circle': ['University', 479], 'Gordon Square': ['Detroit Shoreway', 342], 'Warehouse District': ['Downtown', 384], 'Playhouse Square': ['Downtown', 384], 'Larchmere': ['Buckeye-Shaker Square', 453], "Kamm's Corners": ["Kamm's", 304], 'Battery Park': ['Detroit Shoreway', 342], 'AsiaTown': ['Goodrich-Kirtland Pk', 390], 'Chinatown': ['Goodrich-Kirtland Pk', 392], 'Waterloo': ['North Shore Collinwood', 506] };
const WEAK = ['Battery Park', 'AsiaTown', 'Chinatown', 'Waterloo'];
for (const a of L) {
  ok(Object.keys(a).sort().join() === 'alias,hood,page,weak', `${a.alias}: only alias, hood, page, weak`);
  ok(HOODS.includes(a.hood), `${a.alias}: ${a.hood} is not a neighborhood in data/geo-2026.json`);
  ok(!HOODS.includes(a.alias), `${a.alias} is itself a neighborhood name, so it needs no alias`);
  ok(Number.isInteger(a.page) && a.page > 0, `${a.alias}: has no page`);
  ok(WANT[a.alias] && WANT[a.alias][0] === a.hood && WANT[a.alias][1] === a.page, `${a.alias}: ${a.hood} p. ${a.page} is not the pair the plan supports`);
  ok(a.weak === WEAK.includes(a.alias), `${a.alias}: the weak flag is ${a.weak}`);
}
ok(new Set(L.map((a) => a.alias)).size === L.length, 'an alias is listed twice');
ok(Object.keys(WANT).every((k) => L.some((a) => a.alias === k)), 'a pair Brent chose is missing');

/* the source notes say when the plan was read, quote it, and name every row */
const doc = read('docs/source-notes-aliases.md');
ok(/Oct 7, 2026/.test(doc) && /Connecting Cleveland 2020 Citywide Plan/.test(doc) && /Connecting%20Cleveland%202020%20CWP-%20FULL%20DOCUMENT%202024\.pdf/.test(doc), 'the source notes name the plan, its link, and the day it was read');
ok(!/[–—]/.test(doc), 'no em or en dash in the source notes');
for (const a of L) ok(doc.includes(a.alias) && doc.includes(String(a.page)) && doc.includes(a.hood), `the source notes miss ${a.alias}, p. ${a.page}, or ${a.hood}`);
for (const q of ['University neighborhood encompasses two of Cleveland\'s most well known places, University Circle and Little Italy', 'the West 65th/Detroit retail district anchored by the Gordon Square Arcade', 'new housing projects such as Ashbury Tower and Battery Park on former industrial sites', 'growing residential neighborhoods in the Warehouse District', 'Great Lakes Science Center and Playhouse Square', 'the Larchmere Boulevard antiques district', 'Kamm\'s Corners Neighborhood Plan Summary', 'Identify neighborhood as Chinatown with signage and banners', 'create an entertainment district in North Collinwood by investment in the Waterloo District']) ok(doc.includes(q), `the source notes do not quote: ${q}`);
ok(/Address check/.test(doc), 'the source notes record the address check');

/* matching */
const f = A.cxAliasFold;
ok(f("Kamm's") === 'kamms' && f('Kamm’s') === 'kamms' && f('St.Clair-Superior') === 'stclairsuperior' && f('  Little   ITALY ') === 'little italy' && f('Café') === 'cafe', 'the fold ignores capitals, accents, apostrophes, periods, hyphens, and extra spaces');
ok(A.cxAliasNames('', HOODS).length === HOODS.length && A.cxAliasNames('zzzz', HOODS).length === 0, 'an empty search finds every neighborhood and nonsense finds none');
ok(A.cxAliasNames('kamms', HOODS).join() === "Kamm's" && A.cxAliasNames('slavic', HOODS).join() === 'Broadway-Slavic Village' && A.cxAliasNames('collinwood', HOODS).length === 2, 'names are found by their letters, ignoring apostrophes and hyphens');
for (const a of L) {
  const r = A.cxAliasFind(a.alias, HOODS);
  ok(r.length >= 1 && r.some((x) => x.alias === a.alias && x.hood === a.hood), `typing "${a.alias}" does not find its row`);
  ok(r.every((x) => HOODS.includes(x.hood)), `typing "${a.alias}" finds a row with no neighborhood`);
}
ok(A.cxAliasFind('Little', HOODS).map((a) => a.alias).join() === 'Little Italy', 'typing Little finds Little Italy (half a word)');
ok(A.cxAliasFind('kamms corners', HOODS).map((a) => a.alias).join() === "Kamm's Corners", 'typing kamms corners (no capital, no apostrophe) finds Kamm\'s Corners');
ok(A.cxAliasFind('li', HOODS).length === 0 && A.cxAliasFind('', HOODS).length === 0, 'fewer than three letters finds no alias');
ok(A.cxAliasFind('Hough', HOODS).length === 0 && A.cxAliasFind('Slavic', HOODS).length === 0 && A.cxAliasFind('Parma', HOODS).length === 0, 'a name found by its letters, and a word nothing matches, get no alias line');
ok(A.cxAliasFind('University', HOODS).length === 0 && A.cxAliasNames('University', HOODS).join() === 'University', 'University is found by its name, so University Circle gives no alias line for it');
ok(A.cxAliasFind('Little Italy', HOODS.filter((h) => h !== 'University')).length === 0, 'a row whose neighborhood is not in the list is never offered');
ok(A.cxAliasFind('Univ', ['University', 'Downtown']).length === 0 && A.cxAliasFind('Univ', ['Downtown']).length === 0, 'a row whose neighborhood is already found by name is left out');
ok(!A.cxAliasFind('Square', HOODS).some((a) => a.hood === undefined), 'every row found has a neighborhood');

/* the notice */
const un = A.cxAliasReview();
ok(un === 'A person has not reviewed these names.', `the unreviewed notice: ${un}`);
const rv = run({ ok: true, by: 'Ada Reviewer', checked: '2026-10-07' }).cxAliasReview();
ok(/read against the City Planning Commission's plan by Ada Reviewer on October 7, 2026\./.test(rv) && !/has not reviewed/.test(rv), `the reviewed notice: ${rv}`);
const none = vm.runInContext(`${longDate}\n${src}\n;cxAliasReview()`, vm.createContext({}));
ok(/has not reviewed/.test(none), 'with no review record at all it says a person has not reviewed it');

/* where it is wired */
const build = read('build.py'), core = read('ext/cxm-core.jsx'), mtg = read('ext/cx-meetings.jsx');
ok(/"cx-aliases-text\.jsx"/.test(build) && /--mark-aliases-reviewed/.test(build) && /CX_ALIASES_REVIEW/.test(build), 'build.py builds the file in, has the review command, and passes the review mark in');
ok(/<span>\{a\.alias\}<\/span>\{` `\}<span>is part of<\/span>\{` `\}<span>\{a\.hood\}<\/span>/.test(core), 'the picker says "{name} is part of {neighborhood}." as separate spans');
ok((core.match(/cxAliasReview\(\)/g) || []).length === 1 && /aliases\.length > 0 && <p className="cxm-fine">\{cxAliasReview\(\)\}<\/p>/.test(core), 'the unreviewed notice is shown once, under the alias lines only');
ok(/No neighborhood matches "\$\{typed\}"\. Try the first letters, or pick your ward below\./.test(core), 'the empty search says what was looked for and offers the wards');
ok(!/Choose priorities/.test(mtg.slice(mtg.indexOf('function CxMtgYou'), mtg.indexOf('function CxMtgDone'))), 'Your ward this week has no Choose priorities button');

console.log(`${ran - bad} of ${ran} checks passed.`);
process.exit(bad ? 1 : 0);
