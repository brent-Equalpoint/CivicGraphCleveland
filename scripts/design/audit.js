#!/usr/bin/env node
/* Keep the design a system. Reads design/tokens.json (the look, written down) and the app's CSS (ext/cx.css, ext/cxm.css, ext/cx-bento.css).

   node scripts/design/audit.js            check; exit 1 on any finding
   node scripts/design/audit.js --explain  also print how much of the CSS is on the system and what is not
   node scripts/design/audit.js --write-legacy   record every value in use today that is not a token, as the allowed legacy set
                                                (only run this when starting out or after deliberately retiring values; it can only shrink in review)

   It fails when
     1. the CSS uses a color, text size, corner radius, or font weight that is neither a token nor in design/legacy.json
        (so a new one-off value cannot creep in; use a token, or add a token on purpose);
     2. the phone palette on .cxm in ext/cxm.css (both styles) stops matching design/tokens.json;
     3. a text and background pair in tokens.json falls below the WCAG AA contrast ratio, 4.5:1;
     4. the tokens file or the CSS has an em dash or en dash.
   No network, no browser. The look itself (how the built screens render) is checked by the design-look browser check. */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const T = JSON.parse(fs.readFileSync(path.join(ROOT, 'design', 'tokens.json'), 'utf8'));
const LEG_PATH = path.join(ROOT, 'design', 'legacy.json');
const FILES = ['ext/cx.css', 'ext/cxm.css', 'ext/cx-bento.css', 'ext/cx-light.css'];
const findings = [];
const norm = (h) => { h = h.toLowerCase(); return /^#[0-9a-f]{3}$/.test(h) ? '#' + [...h.slice(1)].map((c) => c + c).join('') : h; };

/* ---- the allowed values, from the tokens ---- */
const hexes = new Set();
(function walk(o) { for (const v of Object.values(o)) { if (typeof v === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(v)) hexes.add(norm(v)); else if (v && typeof v === 'object') walk(v); } })({ s: T.styles, c: T.color, m: T.modes });
const sizes = new Set(Object.values(T.type.scale));
const radii = new Set([0, ...Object.values(T.shape.radius).map((v) => (v === '50%' ? '50%' : Number(v)))]);
const weights = new Set(Object.values(T.type.weight));
const legacy = fs.existsSync(LEG_PATH) ? JSON.parse(fs.readFileSync(LEG_PATH, 'utf8')) : { colors: [], sizes: [], radii: [], weights: [] };
const leg = { colors: new Set(legacy.colors.map(norm)), sizes: new Set(legacy.sizes), radii: new Set(legacy.radii), weights: new Set(legacy.weights) };

/* ---- what the CSS uses ---- */
const use = { colors: new Map(), sizes: new Map(), radii: new Map(), weights: new Map() };
const put = (m, k, where) => { if (!m.has(k)) m.set(k, []); m.get(k).push(where); };
for (const f of FILES) {
  const lines = fs.readFileSync(path.join(ROOT, f), 'utf8').split('\n');
  lines.forEach((ln, i) => {
    const where = `${f}:${i + 1}`;
    if (/[\u2013\u2014]/.test(ln)) findings.push(`${where}: a dash in the CSS`);
    const bare = ln.replace(/\/\*.*?\*\//g, '');
    for (const m of bare.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) { if (/^#[0-9a-fA-F]{3}$|^#[0-9a-fA-F]{4}$|^#[0-9a-fA-F]{6}$|^#[0-9a-fA-F]{8}$/.test(m[0])) put(use.colors, norm(m[0]), where); }
    for (const m of bare.matchAll(/font-size:\s*([\d.]+)px/g)) put(use.sizes, Number(m[1]), where);
    for (const m of bare.matchAll(/border-radius:\s*([^;}]+)/g)) for (const v of m[1].trim().split(/\s+/)) { const n = /^([\d.]+)px$/.test(v) ? Number(v.replace('px', '')) : v === '50%' ? '50%' : v === '0' ? 0 : null; if (n !== null) put(use.radii, n, where); }
    for (const m of bare.matchAll(/font-weight:\s*(\d{3})\b/g)) put(use.weights, Number(m[1]), where);
  });
}

const tokenSet = { colors: hexes, sizes, radii, weights };
const names = { colors: 'color', sizes: 'text size (px)', radii: 'corner radius', weights: 'font weight' };
const outside = {};
for (const k of Object.keys(use)) {
  outside[k] = [...use[k].entries()].filter(([v]) => !tokenSet[k].has(v) && !leg[k].has(v));
  for (const [v, where] of outside[k]) findings.push(`${where[0]}: a new ${names[k]} that is not a token: ${v}${where.length > 1 ? ` (and ${where.length - 1} more place${where.length > 2 ? 's' : ''})` : ``}. Use a token, or add one to design/tokens.json on purpose.`);
}

if (process.argv.includes('--write-legacy')) {
  const out = { _about: 'Values the CSS used before the design system was written down. They are allowed to stay; new ones are not. Retire them by moving the CSS onto a token, then re-run --write-legacy; the list should only get shorter.' };
  for (const k of Object.keys(use)) out[k] = [...use[k].keys()].filter((v) => !tokenSet[k].has(v)).sort((a, b) => (typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b))));
  fs.writeFileSync(LEG_PATH, JSON.stringify(out, null, 1) + '\n');
  console.log(`wrote design/legacy.json: ${out.colors.length} colors, ${out.sizes.length} sizes, ${out.radii.length} radii, ${out.weights.length} weights`);
  process.exit(0);
}

/* ---- the phone palette in cxm.css must be the palette in tokens.json ---- */
const cxm = fs.readFileSync(path.join(ROOT, 'ext', 'cxm.css'), 'utf8');
function vars(block) { const o = {}; for (const m of block.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/g)) o[m[1]] = norm(m[2]); return o; }
const main = (cxm.match(/\n\.cxm \{([\s\S]*?)\n\}/) || [])[1] || '', orig = (cxm.match(/html\[data-cx-theme="original"\] \.cxm \{([\s\S]*?)\n\}/) || [])[1] || '';
for (const [style, block] of [['bento', main], ['original', orig]]) {
  const v = vars(block);
  for (const [k, hex] of Object.entries(T.styles[style])) { if (k.startsWith('_')) continue; if (style === 'original' && !(k in v)) continue; if (v[k] !== norm(hex)) findings.push(`ext/cxm.css: --${k} in the ${style} style is ${v[k] || 'missing'}, but design/tokens.json says ${norm(hex)}`); }
}
{ const v = vars(main); for (const [k, hex] of Object.entries(T.styles.shared)) if (!k.startsWith('_') && v[k] !== norm(hex)) findings.push(`ext/cxm.css: --${k} is ${v[k] || 'missing'}, but design/tokens.json says ${norm(hex)}`); }

/* ---- the light palette in cxm.css must be the light palette in tokens.json ---- */
{
  const lb = (cxm.match(/html\[data-cx-mode="light"\] \.cxm \{([\s\S]*?)\n\}/) || [])[1] || '',
    lo = (cxm.match(/html\[data-cx-mode="light"\]\[data-cx-theme="original"\] \.cxm \{([\s\S]*?)\n\}/) || [])[1] || '';
  for (const [style, block] of [['bento', lb], ['original', lo]]) {
    const v = vars(block);
    for (const [k, hex] of Object.entries(T.modes.light[style])) { if (v[k] !== norm(hex)) findings.push(`ext/cxm.css: --${k} in the light ${style} style is ${v[k] || 'missing'}, but design/tokens.json says ${norm(hex)}`); }
  }
  const v = vars(lb); for (const [k, hex] of Object.entries(T.modes.light.shared)) if (v[k] !== norm(hex)) findings.push(`ext/cxm.css: --${k} in light is ${v[k] || 'missing'}, but design/tokens.json says ${norm(hex)}`);
}

/* ---- contrast ---- */
const lum = (h) => { const n = norm(h); const c = [1, 3, 5].map((i) => parseInt(n.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4))); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
for (const [fg, bg, what, min] of [...T.contrast.pairs, ...(T.contrast.light || [])]) { const r = ratio(fg, bg), need = min || 4.5; if (r < need) findings.push(`design/tokens.json: ${what} (${fg} on ${bg}) is ${r.toFixed(2)}:1, under ${need}:1`); }
if (/[\u2013\u2014]/.test(fs.readFileSync(path.join(ROOT, 'design', 'tokens.json'), 'utf8'))) findings.push('design/tokens.json: a dash');

if (process.argv.includes('--explain')) {
  const total = (k) => [...use[k].values()].reduce((a, w) => a + w.length, 0);
  const onSys = (k) => [...use[k].entries()].filter(([v]) => tokenSet[k].has(v)).reduce((a, [, w]) => a + w.length, 0);
  for (const k of Object.keys(use)) console.log(`${names[k].padEnd(16)} ${String(onSys(k)).padStart(5)} of ${String(total(k)).padStart(5)} uses are on the system (${Math.round((100 * onSys(k)) / Math.max(1, total(k)))}%); ${[...use[k].keys()].filter((v) => !tokenSet[k].has(v)).length} legacy values`);
  for (const k of ['sizes', 'radii']) { const top = [...use[k].entries()].filter(([v]) => !tokenSet[k].has(v)).sort((a, b) => b[1].length - a[1].length).slice(0, 8).map(([v, w]) => `${v} (${w.length})`); console.log(`  most used legacy ${names[k]}: ${top.join(', ')}`); }
}
if (findings.length) { console.log(findings.slice(0, 40).join('\n')); if (findings.length > 40) console.log(`... and ${findings.length - 40} more`); console.log(`\n${findings.length} design finding${findings.length === 1 ? '' : 's'}.`); process.exit(1); }
console.log('design: the CSS is on the system (tokens, legacy set, phone palette, contrast).');
