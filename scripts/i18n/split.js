#!/usr/bin/env node
/* Cut i18n/work/inventory.json into batches of about 190 strings for translators.
   Each batch entry: { id, en, where } where "where" says which file, line, and property the English came from, for context. */
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', '..', 'i18n', 'work');
const all = JSON.parse(fs.readFileSync(path.join(dir, 'inventory.json'), 'utf8'));
const storePath = path.join(dir, 'translations.json');
const done = fs.existsSync(storePath) ? JSON.parse(fs.readFileSync(storePath, 'utf8')) : {};
const inv = all.filter((e) => !done[e.en]);   // only English that has no translation yet
for (const old of fs.readdirSync(dir).filter((x) => /^batch-\d+\.json$/.test(x))) fs.unlinkSync(path.join(dir, old));
const SIZE = +process.argv[2] || 190;
let n = 0;
for (let i = 0; i < inv.length; i += SIZE) {
  n++;
  const rows = inv.slice(i, i + SIZE).map((e) => ({ id: e.id, en: e.en, where: `${e.where[0].file}:${e.where[0].line}${e.where[0].key ? ' ' + e.where[0].key : ''}` }));
  fs.writeFileSync(path.join(dir, `batch-${String(n).padStart(2, '0')}.json`), JSON.stringify(rows, null, 0));
}
console.log(`${inv.length} strings still to translate (${all.length - inv.length} already done), in ${n} batches of up to ${SIZE}`);
