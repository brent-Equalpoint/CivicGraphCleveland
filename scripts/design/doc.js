#!/usr/bin/env node
/* Write the token tables in docs/design-system.md from design/tokens.json, so the document and the look cannot drift apart.

   node scripts/design/doc.js          rewrite the part between the GENERATED markers
   node scripts/design/doc.js --check  fail if the document is out of date (used by the tests)
   Everything outside the markers is written by hand. */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const T = JSON.parse(fs.readFileSync(path.join(ROOT, 'design', 'tokens.json'), 'utf8'));
const DOC = path.join(ROOT, 'docs', 'design-system.md');
const sw = (h) => `\`${h}\``;
const rows = (head, list) => [`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`, ...list.map((r) => `| ${r.join(' | ')} |`)].join('\n');
const names = Object.keys(T.styles.bento).filter((k) => !k.startsWith('_'));
const g = [];
g.push('### Color: the two styles', '', 'Both are required and every screen is checked in both. Names are the CSS custom properties on `.cxm` in `ext/cxm.css`.', '');
g.push(rows(['Name', 'Bento Blue (default)', 'Original (orange)'], names.map((k) => [`\`--${k}\``, sw(T.styles.bento[k]), sw(T.styles.original[k])])), '');
g.push('Shared accents: ' + Object.entries(T.styles.shared).filter(([k]) => !k.startsWith('_')).map(([k, v]) => `\`--${k}\` ${sw(v)}`).join(', ') + '.', '');
g.push('### Color: on dark pages, sheets, and stories', '', rows(['Use', 'Value'], [
  ['Text on dark', sw(T.color.text['on-dark'])], ['Softer text on dark', sw(T.color.text['on-dark-soft'])], ['Text on the accent', sw(T.color.text['on-accent'])],
  ['Text on the white story button', sw(T.color.text['ink-on-white'])], ['Link on dark', sw(T.color.link['on-dark'])], ['Focus ring', sw(T.color.focus)],
  ['Notice banner', sw(T.color.banner)], ['Card tint, light to strong', [T.color.overlay['wash-1'], T.color.overlay['wash-2'], T.color.overlay['wash-3']].map(sw).join(', ')],
  ['Strong hairline', sw(T.color.overlay['line-strong'])],
]), '');
g.push('### Type', '', `Font: ${T.type.family.display} (fallback ${T.type.family.fallback}); labels in ${T.type.family.mono}. Sentence case; no all-caps labels. Smallest readable size: ${T.type['min-readable']} px.`, '');
g.push(rows(['Step', 'Size'], Object.entries(T.type.scale).map(([k, v]) => [k, `${v} px`])), '');
g.push('Weights: ' + Object.entries(T.type.weight).map(([k, v]) => `${k} ${v}`).join(', ') + '. Line height: ' + Object.entries(T.type['line-height']).map(([k, v]) => `${k} ${v}`).join(', ') + '. Tracking: ' + Object.entries(T.type.tracking).map(([k, v]) => `${k} ${v}`).join(', ') + '.', '');
g.push('### Shape, space, targets, motion', '', 'Corner radius: ' + Object.entries(T.shape.radius).map(([k, v]) => `${k} ${v}${v === '50%' ? '' : ' px'}`).join(', ') + '.', '');
g.push(`Spacing steps (px): ${T.space.step.join(', ')}. Phone gutter ${T.space.gutter} px. Smallest control: ${T.target.min} by ${T.target.min} px. Motion: ${Object.entries(T.motion).filter(([k]) => k !== 'reduced').map(([k, v]) => `${k} ${v}`).join(', ')}; with reduced motion: ${T.motion.reduced}.`, '');
g.push('### Contrast pairs that must stay at 4.5:1 or better', '', rows(['Text', 'Background', 'What'], T.contrast.pairs.map(([a, b, w]) => [sw(a), sw(b), w])), '');
g.push('### Components that exist', '', rows(['Component', 'CSS', 'Code'], Object.entries(T.components).filter(([k]) => !k.startsWith('_')).map(([k, v]) => [k, `\`${v.css}\``, v.code + (v.note ? `. ${v.note}` : '')])), '');
const body = g.join('\n');
const START = '<!-- GENERATED-START (scripts/design/doc.js) -->', END = '<!-- GENERATED-END -->';
const CR = String.fromCharCode(13), LF = String.fromCharCode(10);
const raw = fs.readFileSync(DOC, 'utf8'), eol = raw.includes(CR + LF) ? CR + LF : LF, cur = raw.split(CR + LF).join(LF);   // compare and write the same way on Windows and Linux
const a = cur.indexOf(START), b = cur.indexOf(END);
if (a < 0 || b < 0) { console.error('docs/design-system.md is missing its GENERATED markers'); process.exit(2); }
const next = cur.slice(0, a + START.length) + '\n\n' + body + '\n' + cur.slice(b);
if (process.argv.includes('--check')) { if (next !== cur) { console.error('docs/design-system.md is out of date: run node scripts/design/doc.js'); process.exit(1); } console.log('design doc: up to date.'); process.exit(0); }
fs.writeFileSync(DOC, next.split(LF).join(eol));
console.log('wrote docs/design-system.md');
