#!/usr/bin/env node
/* Move finished translator batches into the permanent store, keyed by the English text.

   node scripts/i18n/ingest.js

   For every i18n/work/batch-NN.json that has an es-NN.json beside it, copy each result into i18n/work/translations.json as
   { "<English>": { "es": "...", "status": "ok|keep|skip" } }, then move both files to i18n/work/done/. Keying by the English text means
   that re-reading the source (scripts/i18n/inventory.js) never invalidates finished work; only new English needs translating. */
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', '..', 'i18n', 'work');
const storePath = path.join(dir, 'translations.json');
const store = fs.existsSync(storePath) ? JSON.parse(fs.readFileSync(storePath, 'utf8')) : {};
let added = 0, changed = 0;
for (const f of fs.readdirSync(dir).filter((x) => /^es-\d+\.json$/.test(x)).sort()) {
  const n = f.match(/\d+/)[0];
  const bp = path.join(dir, `batch-${n}.json`);
  if (!fs.existsSync(bp)) continue;
  const batch = JSON.parse(fs.readFileSync(bp, 'utf8'));
  const res = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  const byId = new Map(res.map((r) => [r.id, r]));
  for (const b of batch) {
    const r = byId.get(b.id); if (!r) continue;
    if (store[b.en] && store[b.en].es !== r.es) changed++; else if (!store[b.en]) added++;
    store[b.en] = { es: r.es, status: r.status };
  }
  fs.renameSync(bp, path.join(dir, 'done', `batch-${n}.json`)); fs.renameSync(path.join(dir, f), path.join(dir, 'done', f));
}
fs.writeFileSync(storePath, JSON.stringify(store));
console.log(`translations.json: ${Object.keys(store).length} strings (${added} added, ${changed} changed)`);
