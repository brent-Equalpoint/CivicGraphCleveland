#!/usr/bin/env node
/* Tests for the ward step of a neighborhood that sits in more than one ward (cxmHoodSplit in ext/cxm-core.jsx), with no browser and no network.

   node scripts/test_place_split.js

   - exactly 11 of the 34 neighborhoods in data/geo-2026.json have no ward holding 70% of them (Tremont, at 69.4%, is the closest); every other neighborhood gets null
   - the wards come largest first; each share is a whole percent; the shares of a neighborhood add to exactly 100 (the file's own shares add to 99.1 to 100)
   - the shares match a second way of working them out (the nearest whole percent of each share of the land inside the wards, then the largest remainders)
   - the words for a place (cxmPlaceWords) are the ones the notice and Meetings say */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
let bad = 0, ran = 0;
const ok = (c, m) => { ran++; if (!c) { bad++; console.log('FAIL ' + m); } };

const core = read('ext/cxm-core.jsx');
const grab = (name) => { const i = core.indexOf(`function ${name}(`); const m = /\n\}\n/.exec(core.slice(i)); return core.slice(i, i + m.index + 2); };
const geo = JSON.parse(read('data/geo-2026.json'));
const ctx = vm.createContext({ CX_GEO: { overlap: geo.overlap } });
vm.runInContext(`${grab('cxmHoodSplit')}\n${grab('cxmPlaceWords')}\n;this.api = { cxmHoodSplit, cxmPlaceWords };`, ctx);
const A = ctx.api;

const by = {};
for (const [w, rows] of Object.entries(geo.overlap.wards2026)) for (const r of rows) if (r.share_of_hood > 0) (by[r.hood] = by[r.hood] || []).push({ ward: Number(w), raw: r.share_of_hood });
const names = Object.keys(by);
ok(names.length === 34, `the file has ${names.length} neighborhoods, not 34`);
const splitNames = [];
for (const h of names) {
  const rows = by[h].slice().sort((a, b) => b.raw - a.raw || a.ward - b.ward), r = A.cxmHoodSplit(h);
  const split = rows.length > 1 && rows[0].raw < 0.7;
  if (!split) { ok(r === null, `${h}: a ward holds 70% or more, so no step`); continue; }
  splitNames.push(h);
  ok(Array.isArray(r) && r.length === rows.length, `${h}: has no step`);
  ok(r.map((x) => x.ward).join() === rows.map((x) => x.ward).join(), `${h}: the wards are not largest first`);
  ok(r.every((x) => Number.isInteger(x.share) && x.share >= 1 && x.share <= 99), `${h}: a share is not a whole percent: ${r.map((x) => x.share)}`);
  ok(r.reduce((a, x) => a + x.share, 0) === 100, `${h}: the shares add to ${r.reduce((a, x) => a + x.share, 0)}, not 100`);
  ok(r.every((x, i) => i === 0 || r[i - 1].share >= x.share), `${h}: the shares are not in order`);
  const sum = rows.reduce((a, x) => a + x.raw, 0);
  ok(r.every((x, i) => Math.abs(x.share - (rows[i].raw / sum) * 100) < 1), `${h}: a share is more than a point from its land share: ${r.map((x) => x.share)}`);
  ok(r.every((x, i) => x.raw === rows[i].raw), `${h}: the file's own share is not kept`);
  // a second way: floor each, give the remaining points to the largest fractions, the earlier ward first
  const fl = rows.map((x) => Math.floor((x.raw / sum) * 100 + 1e-9)), fr = rows.map((x, i) => (x.raw / sum) * 100 - fl[i]);
  let left = 100 - fl.reduce((a, b) => a + b, 0);
  fr.map((f, i) => [f, i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]).forEach(([, i]) => { if (left > 0) { fl[i]++; left--; } });
  ok(r.map((x) => x.share).join() === fl.join(), `${h}: ${r.map((x) => x.share)} is not ${fl}`);
}
ok(splitNames.length === 11, `${splitNames.length} neighborhoods have a step, not 11: ${splitNames}`);
for (const h of ['Broadway-Slavic Village', 'Buckeye-Shaker Square', 'Cudell', 'Cuyahoga Valley', 'Detroit Shoreway', 'Downtown', 'Kinsman', 'Mount Pleasant', 'Stockyards', 'Tremont', 'West Boulevard']) ok(splitNames.includes(h), `${h} has no step`);
const T = A.cxmHoodSplit('Tremont');
ok(T && T[0].ward === 7 && T[0].share === 69 && T[1].share === 31, `Tremont is ${JSON.stringify(T)}`);
ok(A.cxmHoodSplit('Hough') === null && A.cxmHoodSplit('Nowhere') === null && A.cxmHoodSplit('') === null, 'a neighborhood with one big ward, an unknown name, and an empty name have no step');

/* the words for a place */
const W = A.cxmPlaceWords;
ok(W(null) === '' && W({ hood: 'Hough', ward: 8 }) === 'Hough, Ward 8' && W({ hood: '', ward: 6 }) === 'Ward 6' && W({ hood: '', ward: null, place: 'county' }) === 'elsewhere in Cuyahoga County' && W({ hood: '', ward: null, place: 'unsure' }) === 'not sure yet' && W({ hood: 'Kamm\'s', ward: null }) === 'Kamm\'s', 'the words for a place');
ok(!/[–—]/.test(core.slice(core.indexOf('function cxmHoodSplit'), core.indexOf('const CXM_BY_FILE'))), 'no dash in the step\'s code or words');

console.log(`${ran - bad} of ${ran} checks passed.`);
process.exit(bad ? 1 : 0);
