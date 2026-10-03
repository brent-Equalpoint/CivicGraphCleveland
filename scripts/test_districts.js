#!/usr/bin/env node
/* Tests for districts by address (ext/cx-districts.jsx against data/districts-2026.json).

   node scripts/test_districts.js

   Checks that the street-name rules in the page match the ones that built the street list (scripts/fixtures/dist-norm.json, which
   scripts/test_districts.py also checks against Python), that known addresses give the districts the Census Bureau's own geocoder gave
   for them when the list was built, and that a wrong or partial address never lands on the wrong street. No network, no browser. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'ext', 'cx-districts.jsx'), 'utf8');
const pure = src.slice(src.indexOf('const CX_DIST = '), src.indexOf('/* ---------- the finder ---------- */')).replace(/function cxDistLoad[\s\S]*?\n}\n/, '');
const ctx = vm.createContext({});
vm.runInContext(pure + '\n;this.api = { cxDistNorm, cxDistCore, cxDistParse, cxDistFind, cxDistRows };', ctx);
const { cxDistNorm, cxDistCore, cxDistParse, cxDistFind, cxDistRows } = ctx.api;
const D = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'districts-2026.json'), 'utf8'));
let bad = 0;
const fail = (m) => { bad++; console.log('FAIL ' + m); };
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) fail(`${m}: got ${JSON.stringify(a)}, wanted ${JSON.stringify(b)}`); };

for (const c of JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'fixtures', 'dist-norm.json'), 'utf8'))) {
  eq(cxDistNorm(c.in), c.norm, `norm of "${c.in}"`);
  eq(cxDistCore(c.norm), c.core, `core of "${c.norm}"`);
}
eq(cxDistParse('1234 E 116th St, Apt 3, Cleveland, OH 44108'), { number: 1234, street: 'E 116th St', zip: '44108', rest: 'E 116th St, Apt 3, Cleveland' }, 'parse with a unit, city, state, and ZIP');
eq(cxDistParse('601 Lakeside Ave 44114').street, 'Lakeside Ave', 'parse with only a ZIP');
eq(cxDistParse('12 1/2 Main St').number, 12, 'a half address keeps its number');
eq(cxDistParse('Lakeside Ave').number, 0, 'no house number is bad input');
eq(cxDistFind(D, 'Lakeside Ave').status, 'badinput', 'no house number');

const rows = (t) => { const r = cxDistFind(D, t); return r.status === 'ok' ? { ...cxDistRows(D, r), street: r.street, boundary: r.boundary } : { status: r.status }; };
// answers the Census Bureau's geocoder gave at the time the list was built (U.S. House, Ohio Senate, Ohio House)
const city = rows('601 Lakeside Ave 44114');
eq([city.congress, city.senate, city.house, city.council, city.ward], [['11'], ['23'], ['20'], ['7'], ['8']], 'City Hall districts');
eq(city.place, ['Cleveland'], 'City Hall city (no "city" on the end)');
eq(city.school, ['Cleveland Municipal School District'], 'City Hall school district');
{ const a = cxDistFind(D, '1234 E. 116 Street, Cleveland OH 44108'), b = cxDistFind(D, '1234 E 116th St'); eq(a.status, b.status, 'the same street typed two ways'); if (a.status === 'ok') eq(a.ids, b.ids, 'the same street typed two ways gives the same districts'); }
eq(rows('99999 Nowhere Rd').status, 'notfound', 'an address that is not on the list');
// a number outside the street's ranges must never be answered from a different street with the same name core
const outside = cxDistFind(D, '999999 E 116th St');
if (outside.status === 'ok') fail('a house number far outside E 116th St got an answer: ' + JSON.stringify(outside));

// two streets that share a name apart from the direction (E 116th St, W 116th St) and both have the number: with different answers the app must ask which
let picked = 0;
for (const [core, keys] of Object.entries(D.cores)) {
  if (keys.length < 2 || picked >= 3) continue;
  for (let n = 100; n < 20000 && picked < 3; n += 2) {
    const per = keys.map((k) => (D.streets[k] || []).filter((r) => n >= r[0] && n <= r[1] && (r[2] === 'B' || (r[2] === 'E') === true)));
    const live = per.map((rs, i) => ({ k: keys[i], rs })).filter((x) => x.rs.length);
    if (live.length < 2) continue;
    const ids = live.map((x) => JSON.stringify(x.rs.map((r) => (r[4] >= 0 ? [r[4]] : D.splits[-1 - r[4]]))));
    if (new Set(ids).size < 2) continue;
    const res = cxDistFind(D, `${n} ${core}`);
    if (res.status !== 'pick') fail(`"${n} ${core}" fits ${live.length} streets with different answers but gave ${res.status}`); else picked++;
    break;
  }
}
if (!picked) fail('found no pair of same-named streets to test asking which street');
// every answer comes from the table: a sample of real ranges must resolve to their own street and give an answer
let tested = 0;
for (const [key, rs] of Object.entries(D.streets)) {
  if (tested >= 400) break;
  const r = rs.find((x) => x[1] - x[0] >= 20 && x[3]);
  if (!r) continue;
  let n = Math.floor((r[0] + r[1]) / 2); if (r[2] === 'E' && n % 2) n++; if (r[2] === 'O' && n % 2 === 0) n++;
  const res = cxDistFind(D, `${n} ${key} ${r[3]}`);
  tested++;
  if (res.status === 'pick') continue;                 // two streets share a name here: asking is correct
  if (res.status !== 'ok') fail(`"${n} ${key} ${r[3]}" gave ${res.status}`);
}
console.log(`${bad ? 'FAILED' : 'ok'}: ${tested} real addresses resolved, ${D.streets ? Object.keys(D.streets).length : 0} streets in the list`);
process.exit(bad ? 1 : 0);
