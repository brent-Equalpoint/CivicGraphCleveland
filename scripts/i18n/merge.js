#!/usr/bin/env node
/* Build i18n/es.json (the dictionary the app loads) from the translators' batches and the hand-written entries.

   node scripts/i18n/merge.js

   Reads  i18n/work/translations.json  every translated string, keyed by its English (scripts/i18n/ingest.js)
          i18n/manual.json           entries written by hand, which win over a batch (fixes from review, special cases)
   Writes i18n/es.json              { meta, exact, masked, keep }

   A string with a changing part, written {*}, goes in "masked"; the rest go in "exact". A string marked keep goes in "keep". A masked
   pattern with almost no fixed words (such as "{*}") is dropped, because it would match everything. */
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', '..', 'i18n');
const work = path.join(dir, 'work');
const store = JSON.parse(fs.readFileSync(path.join(work, 'translations.json'), 'utf8'));
const exact = {}, masked = {}, keep = new Set();
let ok = 0, kept = 0, skipped = 0, dropped = 0;
for (const [en, r] of Object.entries(store)) {
  if (r.status === 'skip') { skipped++; continue; }
  if (r.status === 'keep') { keep.add(en); kept++; continue; }
  if (en.includes('{*}')) {
    const fixed = en.replace(/<\/?\d+>/g, '').replace(/\{[n$fdt*]\}/g, '').replace(/[^A-Za-z]/g, '');
    if (fixed.length < 3) { dropped++; continue; }
    masked[en] = r.es;
  } else exact[en] = r.es;
  ok++;
}
// Names that come from the data, not the source code, stay as they are: people, committees, agencies, neighborhoods.
const dataFile = (f) => JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'data', f), 'utf8'));
try {
  dataFile('people-2026.json').people.forEach((p) => keep.add(p.name));
  const us = dataFile('us-landscape-2026.json');
  us.members.forEach((m) => keep.add(m.name)); us.committees.forEach((c) => keep.add(c.name)); us.agencies.forEach((x) => keep.add(x.name));
  dataFile('legistar-2026.json').matters.forEach((m) => m.sponsors.forEach((n) => keep.add(n)));
  Object.values(dataFile('place-2026.json').addresses).forEach((x) => x.hood && keep.add(x.hood));
} catch (e) { console.error('could not read names from data/: ' + e.message); }
const manualPath = path.join(dir, 'manual.json');
if (fs.existsSync(manualPath)) {
  const m = JSON.parse(fs.readFileSync(manualPath, 'utf8'));
  Object.assign(exact, m.exact || {}); Object.assign(masked, m.masked || {});
  (m.keep || []).forEach((k) => { keep.add(k); delete exact[k]; delete masked[k]; });   // English that must stay English wins over any translation
  for (const k of Object.keys(m.exact || {})) keep.delete(k);
}
const sorted = (o) => Object.fromEntries(Object.entries(o).sort((a, b) => a[0].localeCompare(b[0])));
for (const k of Object.keys(exact)) keep.delete(k);   // a translated string is not also kept
const out = {
  meta: {
    language: 'es',
    status: 'Draft. A person who reads Spanish has not yet reviewed this file.',
    how: 'exact: English text as it appears, with extra spaces tidied. masked: sentences built around data; {n} number, {$} money, {f} file number, {d} date, {t} time, {*} any other text. keep: text that stays in English (names, official titles).',
    glossary: 'i18n/glossary.md',
    built: 'scripts/i18n/merge.js',
  },
  exact: sorted(exact), masked: sorted(masked), keep: [...keep].sort(),
};
fs.writeFileSync(path.join(dir, 'es.json'), JSON.stringify(out, null, 1) + '\n');
console.log(`i18n/es.json: ${Object.keys(exact).length} exact, ${Object.keys(masked).length} patterns, ${keep.size} kept in English (${ok} translated, ${skipped} skipped, ${dropped} patterns dropped as too loose)`);
