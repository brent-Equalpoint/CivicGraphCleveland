#!/usr/bin/env node
/* Check one translated batch against its English batch.

   node scripts/i18n/split.js                  cut i18n/work/inventory.json into batches (i18n/work/batch-NN.json)
   node scripts/i18n/check_batch.js 07         check i18n/work/es-07.json against batch-07.json

   A result file is a JSON array, in the same order as the batch: { "id": 123, "es": "Spanish text", "status": "ok" | "keep" | "skip" }
     ok    translated
     keep  not translated on purpose (a name, an organization, an official title): es is the English, unchanged
     skip  not text people see (a code, an id, a stray fragment): es is ""
   Fails (exit 1) on: a missing, extra, or reordered id; a changed number of placeholders; an em or en dash; an empty translation;
   a "translation" that is the English unchanged; or a changed number, file number, or dollar amount. */
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', '..', 'i18n', 'work');
const no = process.argv[2];
if (!no) { console.error('usage: check_batch.js NN'); process.exit(2); }
const batch = JSON.parse(fs.readFileSync(path.join(dir, `batch-${no}.json`), 'utf8'));
let res;
try { res = JSON.parse(fs.readFileSync(path.join(dir, `es-${no}.json`), 'utf8')); } catch (e) { console.error(`es-${no}.json is not valid JSON: ${e.message}`); process.exit(1); }
const bad = [];
const PH = /\{[n$fdt*]\}/g;
const count = (s, ch) => (String(s).match(new RegExp(ch.replace(/[$*{}]/g, '\\$&'), 'g')) || []).length;
if (!Array.isArray(res)) { console.error('the result must be a JSON array'); process.exit(1); }
if (res.length !== batch.length) bad.push(`expected ${batch.length} entries, found ${res.length}`);
batch.forEach((b, i) => {
  const r = res[i];
  if (!r || r.id !== b.id) { bad.push(`position ${i}: expected id ${b.id}, found ${r && r.id}`); return; }
  if (!['ok', 'keep', 'skip'].includes(r.status)) { bad.push(`#${b.id}: status must be ok, keep, or skip`); return; }
  if (r.status === 'skip') return;
  if (typeof r.es !== 'string' || !r.es.trim()) { bad.push(`#${b.id}: empty translation for "${b.en.slice(0, 50)}"`); return; }
  if (r.status === 'keep') { if (r.es !== b.en) bad.push(`#${b.id}: a keep must be the English unchanged`); return; }
  for (const ph of ['{*}', '{n}', '{$}', '{f}', '{d}', '{t}']) if (count(b.en, ph) !== count(r.es, ph)) bad.push(`#${b.id}: ${ph} appears ${count(b.en, ph)} time(s) in English and ${count(r.es, ph)} in Spanish: "${b.en.slice(0, 60)}"`);
  const tags = (s) => (String(s).match(/<\/?\d+>/g) || []).join('');
  if (tags(b.en) !== tags(r.es)) bad.push(`#${b.id}: the <1>...</1> tags must be the same, in the same order, as the English: "${b.en.slice(0, 60)}"`);
  if (/[—–]/.test(r.es)) bad.push(`#${b.id}: has an em or en dash: "${r.es.slice(0, 60)}"`);
  if (r.es === b.en && /[A-Za-z]{4,}/.test(b.en.replace(PH, ''))) bad.push(`#${b.id}: the Spanish is the English unchanged (use status keep if that is intended): "${b.en.slice(0, 60)}"`);
  const nums = (s) => (String(s).replace(PH, '').match(/\d+(?:[.,]\d+)*/g) || []).join('|');   // digits with their inner commas and points, not a trailing one
  if (nums(b.en) !== nums(r.es)) bad.push(`#${b.id}: the numbers differ: "${b.en.slice(0, 50)}" / "${r.es.slice(0, 50)}"`);
  if (/\s{2,}|^\s|\s$/.test(r.es) !== /\s{2,}|^\s|\s$/.test(b.en) && r.es !== r.es.trim()) bad.push(`#${b.id}: stray spaces`);
});
const c = res.reduce((a, r) => { a[r.status] = (a[r.status] || 0) + 1; return a; }, {});
if (bad.length) { console.log(bad.slice(0, 60).join('\n')); console.log(`\n${bad.length} problem(s) in es-${no}.json`); process.exit(1); }
console.log(`es-${no}.json OK: ${res.length} entries (${c.ok || 0} translated, ${c.keep || 0} kept, ${c.skip || 0} skipped)`);
