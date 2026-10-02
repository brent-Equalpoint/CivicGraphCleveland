#!/usr/bin/env node
/* Color-vision check for the design system: can two colors that mean different things still be told apart by someone who sees color differently?

   node scripts/design/cvd.js            check the groups in design/tokens.json ("meaning"); exit 1 on a finding
   node scripts/design/cvd.js --table    also print, for every group, the least difference between any two of its colors for each kind of color vision

   How: each color is turned into what a person with protanopia (no red cones), deuteranopia (no green), tritanopia (no blue), or
   achromatopsia (no color at all, so only lightness is left) sees, using the Machado et al. (2009) matrices at full severity,
   worked in linear light. The difference between two colors is CIEDE2000. Below about 12 two colors look alike; 20 or more is a clear
   difference at a glance for small shapes.
   A group says what carries its meaning besides color:
     "text"   a word right beside every colored mark (a status dot beside "Committed"): fine whatever the colors are, reported only
     "shape"  the marks also differ in size, outline, or pattern
     "none"   color alone: the colors MUST stay at least 20 apart under every kind of color vision, or this fails
   A marker that carries meaning by color alone must be "none", and "none" is the stricter default for any group that does not say.
   No network, no browser. The browser check (color-vision in scripts/checks/run.js) finds color marks that have no word beside them. */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..');

const MACHADO = {   // severity 1.0, applied to linear RGB
  protanopia: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deuteranopia: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
  tritanopia: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.303900]],
};
const toLin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const toSrgb = (c) => { c = Math.min(1, Math.max(0, c)); return 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055); };
function rgb(hex) { let h = hex.replace('#', '').toLowerCase(); if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join(''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); }
function simulate(hex, kind) {
  const [r, g, b] = rgb(hex).map(toLin);
  if (kind === 'normal') return [r, g, b].map(toSrgb);
  if (kind === 'achromatopsia') { const y = toSrgb(0.2126 * r + 0.7152 * g + 0.0722 * b); return [y, y, y]; }
  const M = MACHADO[kind];
  return M.map((row) => toSrgb(row[0] * r + row[1] * g + row[2] * b));
}
function lab([R, G, B]) {
  const [r, g, b] = [R, G, B].map(toLin);
  let x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047, y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b, z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883;
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  [x, y, z] = [f(x), f(y), f(z)];
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}
function de2000(l1, l2) {
  const [L1, a1, b1] = l1, [L2, a2, b2] = l2, rad = Math.PI / 180;
  const C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2), Cm = (C1 + C2) / 2, G = 0.5 * (1 - Math.sqrt(Math.pow(Cm, 7) / (Math.pow(Cm, 7) + Math.pow(25, 7))));
  const a1p = (1 + G) * a1, a2p = (1 + G) * a2, C1p = Math.hypot(a1p, b1), C2p = Math.hypot(a2p, b2);
  const hp = (b, a) => { const h = Math.atan2(b, a) / rad; return h < 0 ? h + 360 : h; };
  const h1p = C1p === 0 ? 0 : hp(b1, a1p), h2p = C2p === 0 ? 0 : hp(b2, a2p);
  const dLp = L2 - L1, dCp = C2p - C1p;
  let dhp = 0; if (C1p * C2p !== 0) { dhp = h2p - h1p; if (dhp > 180) dhp -= 360; else if (dhp < -180) dhp += 360; }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp * rad) / 2);
  const Lp = (L1 + L2) / 2, Cp = (C1p + C2p) / 2;
  let hbar = h1p + h2p; if (C1p * C2p === 0) hbar = h1p + h2p; else if (Math.abs(h1p - h2p) <= 180) hbar /= 2; else hbar = (hbar + (hbar < 360 ? 360 : -360)) / 2;
  const T = 1 - 0.17 * Math.cos((hbar - 30) * rad) + 0.24 * Math.cos(2 * hbar * rad) + 0.32 * Math.cos((3 * hbar + 6) * rad) - 0.2 * Math.cos((4 * hbar - 63) * rad);
  const dTheta = 30 * Math.exp(-Math.pow((hbar - 275) / 25, 2)), Rc = 2 * Math.sqrt(Math.pow(Cp, 7) / (Math.pow(Cp, 7) + Math.pow(25, 7)));
  const Sl = 1 + (0.015 * Math.pow(Lp - 50, 2)) / Math.sqrt(20 + Math.pow(Lp - 50, 2)), Sc = 1 + 0.045 * Cp, Sh = 1 + 0.015 * Cp * T, Rt = -Math.sin(2 * dTheta * rad) * Rc;
  return Math.sqrt(Math.pow(dLp / Sl, 2) + Math.pow(dCp / Sc, 2) + Math.pow(dHp / Sh, 2) + Rt * (dCp / Sc) * (dHp / Sh));
}
const KINDS = ['normal', 'protanopia', 'deuteranopia', 'tritanopia', 'achromatopsia'];
const diff = (a, b, kind) => de2000(lab(simulate(a, kind)), lab(simulate(b, kind)));
function worst(colors) {   // the least difference between any two colors, for each kind of color vision
  const out = {};
  for (const k of KINDS) { let m = Infinity, pair = null; for (let i = 0; i < colors.length; i++) for (let j = i + 1; j < colors.length; j++) { const d = diff(colors[i][1], colors[j][1], k); if (d < m) { m = d; pair = [colors[i][0], colors[j][0]]; } } out[k] = { min: m, pair }; }
  return out;
}
module.exports = { simulate, diff, worst, KINDS, rgb };

if (require.main === module) {
  const T = JSON.parse(fs.readFileSync(path.join(ROOT, 'design', 'tokens.json'), 'utf8'));
  const NEED = 20, findings = [];
  const table = process.argv.includes('--table');
  const groups = [];
  for (const g of T.meaning || []) { groups.push(g); if (g.colorsLight) groups.push({ ...g, name: g.name + ' (light mode)', colors: g.colorsLight }); if (g.colorsLight2) groups.push({ ...g, name: g.name + ' (light mode, Original)', colors: g.colorsLight2 }); }
  for (const grp of groups) {
    const w = worst(Object.entries(grp.colors));
    const low = KINDS.filter((k) => w[k].min < NEED);
    if (table) console.log(`${grp.name.padEnd(34)} carried by ${String(grp.carriedBy).padEnd(6)} ` + KINDS.map((k) => `${k.slice(0, 5)} ${w[k].min.toFixed(0).padStart(2)}`).join('  ') + (low.length ? `   <- under ${NEED} for ${low.join(', ')}` : ''));
    if ((grp.carriedBy || 'none') === 'none' && low.length) findings.push(`${grp.name}: meant to be told apart by color alone, but ${low.map((k) => `${k} sees ${w[k].pair.join(' and ')} only ${w[k].min.toFixed(0)} apart`).join('; ')} (need ${NEED}). Give the marks a word, a shape, or a pattern, or pick colors further apart.`);
  }
  if (findings.length) { console.log(findings.join('\n')); console.log(`\n${findings.length} color-vision finding${findings.length === 1 ? '' : 's'}.`); process.exit(1); }
  console.log(`color vision: ${groups.length} groups checked under protanopia, deuteranopia, tritanopia, and achromatopsia.`);
}
