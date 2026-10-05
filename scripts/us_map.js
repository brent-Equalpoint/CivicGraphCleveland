#!/usr/bin/env node
/* The United States graph, settled once when the site is built (docs/plan-us-graph-rebuild.md: "the simulation runs ahead before
   the first draw"). Runs the same code the page runs (the pure parts of ext/cx-us.jsx, ext/cx-us-model.jsx, ext/cx-us-map.jsx, and the
   d3 force bundle from ext/cx-d3.js) on the federal record with the fixed seed, and writes where every node settles, so every phone and
   computer opens the identical map at once instead of spending seconds on the physics. The page checks that the file matches the record
   it loaded (same nodes, same order) and runs the physics itself if it does not.

     node scripts/us_map.js data/us-landscape-2026.json site/us/map-2026.json

   Writes nothing to data/. Also used by scripts/test_us_map.js (require it for load()). */
const fs = require('fs'), path = require('path'), vm = require('vm'), crypto = require('crypto');
const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const TICKS = 300;

function load() {
  const d3 = require(path.join(ROOT, 'node_modules', 'esbuild')).buildSync({ entryPoints: [path.join(ROOT, 'ext', 'cx-d3.js')], bundle: true, format: 'iife', globalName: 'CXD3', target: 'es2020', write: false, legalComments: 'none' }).outputFiles[0].text;
  const us = read('ext/cx-us.jsx'), map = read('ext/cx-us-map.jsx');
  const cut = (src, marker) => { const i = src.indexOf(marker); if (i < 0) throw new Error(`marker not found: ${marker}`); return src.slice(0, i); };
  const ctx = vm.createContext({ setTimeout, clearTimeout, setInterval, clearInterval, performance, console });
  // the map's code up to its first piece of JSX: the physics, the names, the sheet's and the profile's words (plain JavaScript, no page needed)
  vm.runInContext(d3 + '\n' + cut(us, '/* ---------- Your members') + '\n' + read('ext/cx-us-model.jsx') + '\n' + cut(map, 'function CxUsmShape(') +
    '\n;this.api = { CXD3, cxUsGraph, cxUsHash, cxUsMapModel, cxUsMapSim, cxUsmSeed, cxUsMapLabels, cxUsmFit, cxUsmBox, cxUsmIds, CX_USM_LINES, CX_USM_SOURCES, CX_USM_COLORS, CX_USM_FAMILY, cxUsProfile, cxUsmSlugs, cxUsmFind, cxUsmColor };', ctx);
  return ctx.api;
}

/* where every node settles, rounded to a tenth of a map unit. shape: `wide` (computers) or `tall` (a phone held upright) */
function settle(A, d, shape = 'wide') {
  const g = A.cxUsGraph(d), M = A.cxUsMapModel(d, g);
  const R = A.cxUsMapSim(M, A.CXD3, { pre: TICKS, shape });
  const xy = M.nodes.map(() => null);
  R.nodes.forEach((n) => { xy[n.i] = [Math.round(n.x * 10) / 10, Math.round(n.y * 10) / 10]; });
  return { g, M, xy };
}

if (require.main === module) {
  const [src, out] = process.argv.slice(2);
  if (!src || !out) { console.error('usage: node scripts/us_map.js <us-landscape.json> <out.json>'); process.exit(2); }
  const body = fs.readFileSync(src, 'utf8'), d = JSON.parse(body), A = load();
  const t0 = Date.now(), { g, xy } = settle(A, d), tall = settle(A, d, 'tall').xy;
  const file = { about: 'Where each node of the United States graph settles, computed when the site was built by scripts/us_map.js from the record below, with the physics in ext/cx-us-map.jsx and a fixed seed. xy is the map for computers; tall is the same physics started in three rows, for a phone held upright. Positions only: every fact, count, and link is read from the record itself.',
    record: crypto.createHash('sha256').update(body).digest('hex'), ids: A.cxUsmIds(g), nodes: g.nodes.length, seed: 26, ticks: TICKS, xy, tall };
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(file) + '\n');
  console.log(`settled ${g.nodes.length} nodes in ${Date.now() - t0} ms`);
}
module.exports = { load, settle, TICKS };
