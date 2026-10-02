#!/usr/bin/env node
/* Tests for ext/cx-headline.jsx: the plain headlines on the feed cards.

   node scripts/test_headline.js            check every title in Council's record, and print a sample
   node scripts/test_headline.js --show 60  print 60 titles with their headlines

   The rules may shorten and reorder a title's own words and add only the template words in CX_HEADLINE_WORDS. This test fails if a
   headline contains any other word that is not in the official title, if it is empty or too long, or if it ends in an ellipsis.
   No network, no browser. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'ext', 'cx-headline.jsx'), 'utf8');
const ctx = vm.createContext({});
vm.runInContext(src + '\n;this.cxHeadline = cxHeadline; this.cxEntity = cxEntity; this.cxHeadClause = cxHeadClause; this.ALLOWED = CX_HEADLINE_WORDS;', ctx);
const { cxHeadline, cxEntity, cxHeadClause, ALLOWED } = ctx;
const matters = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'legistar-2026.json'), 'utf8')).matters;

const tokens = (s) => String(s).toLowerCase().replace(/[’']/g, '').match(/[a-z0-9]+/g) || [];
let fails = 0;
const fail = (msg) => { fails++; if (fails <= 25) console.log('FAIL ' + msg); };
const allowed = new Set(ALLOWED);

let n = 0, maxWords = 0, shortened = 0, same = 0;
const rows = [];
for (const m of matters) {
  const h = cxHeadline(m.title);
  n++;
  const clean = String(m.title).replace(/\s+/g, ' ').trim();
  const titleTokens = new Set(tokens(clean));
  rows.push([m.file, clean, h]);
  if (!h || !h.trim()) { fail(`${m.file}: empty headline for "${clean.slice(0, 80)}"`); continue; }
  const w = h.split(/\s+/).length;
  maxWords = Math.max(maxWords, w);
  if (w > 24) fail(`${m.file}: ${w} words: ${h}`);
  if (/…|\.\.\./.test(h)) fail(`${m.file}: ends in an ellipsis: ${h}`);
  if (!/^[A-Za-z0-9"(#]/.test(h)) fail(`${m.file}: does not start with a capital: ${h}`);
  for (const t of tokens(h)) if (!titleTokens.has(t) && !allowed.has(t)) fail(`${m.file}: the word "${t}" is not in the title and is not a template word: ${h}`);
  if (h.length < clean.length) shortened++; else same++;
}
console.log(`${n} titles: ${shortened} shortened, ${same} already short; longest headline ${maxWords} words; ${fails} problem(s)`);

// the rules, on titles written to match each pattern (not from the data), so a rule that stops firing is noticed
const cases = [
  ['AN EMERGENCY ORDINANCE Authorizing the Director of Parks and Recreation to enter into a property adoption agreement with MMH Park LLC, or its designee, to improve and maintain Meet Me Here Park, a City park.', /^Property adoption agreement with MMH Park LLC: improve and maintain Meet Me Here Park$/],
  ['Authorizing the Director of the Department of Aging to enter into agreement with NuPoint Community Development Corporation providing Senior Lawn Care Program for the public purpose of providing grass cutting and lawn maintenance to seniors through the use of Ward 3 Casino Revenue Funds.', /^Agreement with NuPoint Community Development Corporation: Senior Lawn Care Program$/],
  ['Authorizing the Director of Port Control to exercise the first option to renew Contract No. PS2025-65 with Downtown Cleveland Alliance to maintain, manage, secure, and promote City-owned properties.', /^Contract renewal with Downtown Cleveland Alliance: maintain/],
  ['To supplement the Codified Ordinances of Ohio, 1976, by enacting new Section 127.481, relating to the purchase of food and beverages for the Cleveland Municipal Court.', /^New city law: purchase of food and beverages for the Cleveland Municipal Court$/],
  ['Condolence Resolution for Mila Chatman', /^Condolence Resolution for Mila Chatman$/],
  ['Determining the method of making the public improvement of resurfacing Brookpark Road, and authorizing contracts.', /^Public improvement: resurfacing Brookpark Road$/],
];
for (const [title, want] of cases) {
  const h = cxHeadline(title);
  if (!want.test(h)) fail(`rule case: got "${h}" for "${title.slice(0, 70)}"`);
}
if (cxEntity('Flock Group, Inc. dba Flock Safety for the acquisition') !== 'Flock Group, Inc.') fail(`entity kept a company suffix wrongly: ${cxEntity('Flock Group, Inc. dba Flock Safety for the acquisition')}`);
if (cxHeadClause('a b c d e f g h i j k l m n o p', 5) !== '') fail('a clause with no natural boundary should return nothing, not a cut');

const show = process.argv.indexOf('--show');
if (show > -1) {
  const k = +process.argv[show + 1] || 40;
  const pick = rows.filter((r) => r[1].length > 70).filter((_, i) => i % Math.max(1, Math.floor(rows.length / k / 1.5)) === 0).slice(0, k);
  for (const [f, t, h] of pick) console.log(`\n${f}\n  TITLE    ${t.slice(0, 200)}\n  HEADLINE ${h}`);
}
console.log(fails ? `\n${fails} FAILED` : '\nOK');
process.exit(fails ? 1 : 0);
