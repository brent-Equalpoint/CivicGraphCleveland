#!/usr/bin/env node
/* Speed measurements for the built site (the numbers in docs/performance.md).

     node scripts/perf/measure.js                       every scenario, 3 runs each, against site/
     node scripts/perf/measure.js --site <folder>       another built copy (to compare a before and an after on the same machine)
     node scripts/perf/measure.js --runs 5 --only today,us-phone
     node scripts/perf/measure.js --json out.json       also write every number
     node scripts/perf/measure.js --profile             add a CPU profile of the map while it pans zoomed in (top functions by own time)
     node scripts/perf/measure.js --files               only the table of file sizes (no browser)

   It serves the folder the way the host does (brotli for text when the browser asks for it, otherwise gzip; an ETag and a 304 for an
   unchanged file; the cache rules in vercel.json), opens every page in a fresh browser profile (nothing cached), and reports bytes sent
   and unpacked per file, first paint, when the first real content shows, long tasks (over 50 ms) while loading, the JavaScript heap,
   and for the United States map its first drawing and what each frame costs while it settles (Calm), while it moves (Live), and while
   panning and zooming. Phone: 390 by 844 at 3x pixels, a 4x slower processor, and Slow 4G (Lighthouse's numbers: 562.5 ms latency,
   1.44 Mbit/s down). Desktop: 1280 by 900, no slowdown. Medians of the runs are printed. Timings depend on the machine, so compare
   runs from the same machine only; the byte counts do not. Page requests bypass the service worker so every byte is counted. */
const puppeteer = require('puppeteer-core');
const http = require('http'), fs = require('fs'), path = require('path'), zlib = require('zlib'), crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..', '..');
function argv(flag) { const i = process.argv.indexOf(flag); return i < 0 ? null : (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true); }
const SITE = path.resolve(ROOT, argv('--site') || 'site');
const RUNS = +(argv('--runs') || 3);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const med = (a) => { const b = a.filter((x) => x != null && !Number.isNaN(x)).sort((x, y) => x - y); if (!b.length) return null; const m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; };
const pct = (a, q) => { const b = [...a].sort((x, y) => x - y); return b.length ? b[Math.min(b.length - 1, Math.floor(q * b.length))] : null; };

/* ---- the host, as vercel.json describes it ---- */
const MIME = { '.js': 'text/javascript; charset=utf-8', '.html': 'text/html; charset=utf-8', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.webp': 'image/webp', '.pdf': 'application/pdf', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
const TEXT = /\.(html|js|json|svg|webmanifest|css|txt)$/;
const BODY = new Map();
function body(f) {
  const st = fs.statSync(f); let c = BODY.get(f);
  if (!c || c.mtime !== st.mtimeMs) { const raw = fs.readFileSync(f); c = { raw, mtime: st.mtimeMs, etag: `"${crypto.createHash('sha1').update(raw).digest('hex').slice(0, 20)}"` }; BODY.set(f, c); }
  return c;
}
const br = (raw) => zlib.brotliCompressSync(raw, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11, [zlib.constants.BROTLI_PARAM_SIZE_HINT]: raw.length } });
const gz = (raw) => zlib.gzipSync(raw, { level: 9 });
function cacheRule(u) {
  if (u === '/' || u === '/index.html') return 'public, max-age=0, must-revalidate';
  if (u === '/sw.js') return 'no-cache, max-age=0, must-revalidate';
  if (u.startsWith('/bench/')) return 'public, max-age=300, must-revalidate';
  if (u.startsWith('/us/')) return 'public, max-age=3600, must-revalidate';
  if (u.startsWith('/fonts/')) return 'public, max-age=31536000, immutable';
  if (u.startsWith('/portraits/') || u.startsWith('/records/')) return 'public, max-age=86400';
  return 'public, max-age=0, must-revalidate';
}
let ENC_SEEN = '';
/* compress every text file before the first page opens, so no request waits on the compressor (the host serves them ready) */
function warm(root) {
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
  for (const f of walk(root)) if (TEXT.test(f)) { const c = body(f); c.br = c.br || br(c.raw); c.gz = c.gz || gz(c.raw); }
}
function serve(root) {
  warm(root);
  const server = http.createServer((q, r) => {
    const u = decodeURIComponent(q.url.split('?')[0]);
    const f = u === '/' ? path.join(root, 'index.html') : path.join(root, u);
    if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404, { 'content-type': MIME['.html'] }); return r.end('not found'); }
    const c = body(f), h = { 'content-type': MIME[path.extname(f)] || 'application/octet-stream', etag: c.etag, 'cache-control': cacheRule(u), vary: 'Accept-Encoding' };
    if (q.headers['if-none-match'] === c.etag) { r.writeHead(304, h); return r.end(); }
    const ae = String(q.headers['accept-encoding'] || ''); ENC_SEEN = ae;
    let data = c.raw;
    if (TEXT.test(f) && /\bbr\b/.test(ae)) { c.br = c.br || br(c.raw); data = c.br; h['content-encoding'] = 'br'; }
    else if (TEXT.test(f) && /\bgzip\b/.test(ae)) { c.gz = c.gz || gz(c.raw); data = c.gz; h['content-encoding'] = 'gzip'; }
    h['content-length'] = data.length;
    r.writeHead(200, h); r.end(data);
  });
  return new Promise((res) => server.listen(0, () => res({ server, base: `http://localhost:${server.address().port}` })));
}
function chromePath() {
  const c = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'];
  const p = c.find((x) => x && fs.existsSync(x)); if (!p) throw new Error('Chrome not found. Set CHROME_PATH.'); return p;
}

/* ---- the file table: what each file weighs raw, gzipped, and with brotli ---- */
function fileTable(root) {
  const rows = [], walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
  const groups = new Map();
  for (const f of walk(root)) {
    const rel = path.relative(root, f).split(path.sep).join('/');
    const key = rel.startsWith('portraits/us/') ? 'portraits/us/*.webp' : rel.startsWith('portraits/') ? 'portraits/*.webp (council, mayor)' : rel.startsWith('fonts/') ? 'fonts/*.woff2' : rel.startsWith('records/') ? 'records/*.pdf' : rel.startsWith('bench/') ? 'bench/*.json' : rel;
    const c = body(f), raw = c.raw, g = groups.get(key) || { file: key, n: 0, raw: 0, gzip: 0, br: 0 };
    g.n++; g.raw += raw.length;
    if (TEXT.test(f)) { c.gz = c.gz || gz(raw); c.br = c.br || br(raw); g.gzip += c.gz.length; g.br += c.br.length; } else { g.gzip += raw.length; g.br += raw.length; }
    groups.set(key, g);
  }
  for (const g of groups.values()) rows.push(g);
  return rows.sort((a, b) => b.raw - a.raw);
}
/* the parts of index.html: inline styles, inline scripts, and the big data constants inside the app script */
function htmlParts(root) {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8'), out = [];
  let css = 0, js = 0;
  for (const m of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) css += Buffer.byteLength(m[1]);
  const scripts = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)].map((m) => ({ attrs: m[1], len: Buffer.byteLength(m[2]) }));
  for (const s of scripts) js += s.len;
  out.push({ part: 'inline CSS', raw: css }, { part: 'inline JavaScript', raw: js }, { part: 'largest inline script', raw: Math.max(...scripts.map((s) => s.len)) });
  return out;
}

/* ---- what runs in the page before anything else: marks, long tasks, frame costs ---- */
function INSTR() {
  const P = (window.__cxPerf = { marks: {}, frames: new Map(), rec: false, lt: [], lcp: 0, ops: null });
  const R = window.requestAnimationFrame.bind(window);
  // every animation-frame callback is timed, so a frame's cost is the script time spent drawing it (the map draws in one)
  window.requestAnimationFrame = function (cb) { return R(function (t) { const s = performance.now(); try { return cb(t); } finally { if (P.rec) P.frames.set(t, (P.frames.get(t) || 0) + performance.now() - s); } }); };
  try { new PerformanceObserver((l) => l.getEntries().forEach((e) => P.lt.push([e.startTime, e.duration]))).observe({ type: 'longtask', buffered: true }); } catch (e) { /* older browser */ }
  try { new PerformanceObserver((l) => l.getEntries().forEach((e) => { P.lcp = e.startTime; })).observe({ type: 'largest-contentful-paint', buffered: true }); } catch (e) { /* older browser */ }
  const want = [['today', '.cxm-story-btn'], ['phone', '.cxm-tabs'], ['desk', '.atlas-workspace'], ['wait', '.usm-wait']];
  const poll = () => {
    const now = performance.now();
    for (const [k, s] of want) if (!P.marks[k] && document.querySelector(s)) P.marks[k] = now;
    if (!P.marks.app && document.getElementById('root') && !document.getElementById('cx-boot')) P.marks.app = now;
    if (!P.marks.map) { const c = document.querySelector('.usm-canvas'); if (c && c.cxMap && c.cxMap.labels && c.cxMap.labels.length) P.marks.map = now; }
    if (!P.marks.es) { const t = document.querySelector('.cxm-tabs'); if (t && /Hoy/.test(t.textContent)) P.marks.es = now; }   // the phone tabs read in Spanish
    if (now < 120000) R(poll);
  };
  R(poll);
}

let B, BASE;
async function openPage({ url, phone, net, cpu, store = {}, profileStart }) {
  const ctx = await B.createBrowserContext();
  const p = await ctx.newPage();
  await p.setViewport(phone ? { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 3 } : { width: 1280, height: 900, deviceScaleFactor: 1 });
  await p.setBypassServiceWorker(true);
  await p.setCacheEnabled(false);
  const cdp = await p.createCDPSession();
  await cdp.send('Network.enable');
  const reqs = new Map();
  cdp.on('Network.requestWillBeSent', (e) => { if (!reqs.has(e.requestId)) reqs.set(e.requestId, { url: e.request.url, t0: e.timestamp, dec: 0, enc: 0 }); });
  cdp.on('Network.responseReceived', (e) => { const r = reqs.get(e.requestId); if (r) { r.status = e.response.status; r.ce = e.response.headers['content-encoding'] || ''; } });
  cdp.on('Network.dataReceived', (e) => { const r = reqs.get(e.requestId); if (r) r.dec += e.dataLength; });
  cdp.on('Network.loadingFinished', (e) => { const r = reqs.get(e.requestId); if (r) { r.enc = e.encodedDataLength; r.t1 = e.timestamp; } });
  if (net) await p.emulateNetworkConditions(puppeteer.PredefinedNetworkConditions['Slow 4G']);
  if (cpu) await p.emulateCPUThrottling(cpu);
  await p.evaluateOnNewDocument((st) => { try { Object.entries(st).forEach(([k, v]) => localStorage.setItem(k, v)); } catch (e) { /* no storage */ } }, store);
  await p.evaluateOnNewDocument(INSTR);
  if (profileStart) { await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 200 }); await cdp.send('Profiler.start'); }
  const navStart = Date.now();
  await p.goto(BASE + url, { waitUntil: 'load', timeout: 120000 });
  return { p, ctx, cdp, reqs, navStart };
}
async function marks(p) { return p.evaluate(() => { const P = window.__cxPerf, nav = performance.getEntriesByType('navigation')[0] || {}, paint = Object.fromEntries(performance.getEntriesByType('paint').map((e) => [e.name, e.startTime])); return { marks: P.marks, lt: P.lt, lcp: P.lcp, fp: paint['first-paint'], fcp: paint['first-contentful-paint'], dcl: nav.domContentLoadedEventEnd, load: nav.loadEventEnd }; }); }
async function waitMark(p, k, ms = 90000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await p.evaluate((k) => !!window.__cxPerf.marks[k], k)) return true; await wait(100); } return false; }
/* quiet: no long task for `quiet` ms (or a cap), so "interactive" is the end of the last long task of the load */
async function settle(p, quiet = 3000, cap = 25000) {
  const t0 = Date.now();
  for (;;) {
    const s = await p.evaluate(() => { const lt = window.__cxPerf.lt; const last = lt.length ? lt[lt.length - 1][0] + lt[lt.length - 1][1] : 0; return { now: performance.now(), last }; });
    if (s.now - s.last >= quiet || Date.now() - t0 > cap) return;
    await wait(250);
  }
}
async function heap(cdp) { try { await cdp.send('HeapProfiler.collectGarbage'); const h = await cdp.send('Runtime.getHeapUsage'); return h.usedSize; } catch (e) { return null; } }
function files(reqs, base) {
  const out = {};
  for (const r of reqs.values()) {
    if (!r.url.startsWith(base)) continue;
    const k = new URL(r.url).pathname.replace(/^\/portraits\/us\/.*/, '/portraits/us/*').replace(/^\/portraits\/(?!us\/).*/, '/portraits/*').replace(/^\/fonts\/.*/, '/fonts/*');
    const o = out[k] || (out[k] = { n: 0, sent: 0, unpacked: 0 });
    o.n++; o.sent += r.enc; o.unpacked += r.dec;
  }
  return out;
}
function loadSummary(m, readyKey) {
  const ready = m.marks[readyKey] ?? null;
  const lt = m.lt.filter(([s]) => s <= (ready || 0) + 15000);
  const lastEnd = lt.reduce((t, [s, d]) => Math.max(t, s + d), 0);
  return { fp: m.fp, fcp: m.fcp, lcp: m.lcp, app: m.marks.app, ready, interactive: Math.max(ready || 0, lastEnd), longTasks: lt.length, longMs: Math.round(lt.reduce((t, [, d]) => t + d, 0)), longest: Math.round(lt.reduce((t, [, d]) => Math.max(t, d), 0)), blocking: Math.round(lt.reduce((t, [s, d]) => t + (s >= (m.fcp || 0) ? Math.max(0, d - 50) : 0), 0)) };
}

/* ---- load scenarios ---- */
const LOADS = {
  'today': { title: 'Phone, Today (first visit)', url: '/#phone', phone: true, net: true, cpu: 4, ready: 'today' },
  'today-es': { title: 'Phone, Today in Spanish (chosen before)', url: '/#phone', phone: true, net: true, cpu: 4, ready: 'es', store: { 'cx-lang': 'es' } },
  'us-phone': { title: 'Phone, People > Graph (United States map)', url: '/?panel=us&view=graph#phone', phone: true, net: true, cpu: 4, ready: 'map' },
  'desk-home': { title: 'Desktop, home', url: '/#desktop', ready: 'desk' },
  'us-desk': { title: 'Desktop, United States map', url: '/?panel=us#desktop', ready: 'map' },
};
async function runLoad(key) {
  const S = LOADS[key];
  const { p, ctx, cdp, reqs } = await openPage(S);
  const ok = await waitMark(p, S.ready);
  await settle(p);
  const m = await marks(p);
  const res = loadSummary(m, S.ready);
  res.ok = ok; res.heap = await heap(cdp); res.files = files(reqs, BASE);
  res.sent = Object.values(res.files).reduce((t, f) => t + f.sent, 0); res.unpacked = Object.values(res.files).reduce((t, f) => t + f.unpacked, 0);
  if (S.ready === 'map') {
    const r = await p.evaluate(() => { const e = performance.getEntriesByType('resource').find((x) => /\/us\/landscape-2026\.json/.test(x.name)); return e ? e.responseEnd : null; });
    res.mapDataAt = r; res.mapAfterData = r != null && res.ready != null ? res.ready - r : null;
  }
  await ctx.close();
  return res;
}

/* ---- the United States map at work: Calm, Live, pan, zoom, a focus ---- */
async function frameWindow(p, ms, act) {
  await p.evaluate(() => { window.__cxPerf.frames.clear(); window.__cxPerf.rec = true; window.__cxPerf.lt0 = window.__cxPerf.lt.length; });
  const t0 = Date.now();
  if (act) await act();
  const left = ms - (Date.now() - t0); if (left > 0) await wait(left);
  return p.evaluate(() => {
    const P = window.__cxPerf; P.rec = false;
    const f = [...P.frames.entries()].sort((a, b) => a[0] - b[0]), ts = f.map((x) => x[0]), cost = f.map((x) => x[1]);
    const gaps = ts.slice(1).map((t, k) => t - ts[k]);
    return { cost, gaps, span: ts.length ? ts[ts.length - 1] - ts[0] : 0, lt: P.lt.slice(P.lt0).length };
  });
}
function frameStats(w) { return { frames: w.cost.length, median: med(w.cost), p95: pct(w.cost, 0.95), max: w.cost.length ? Math.max(...w.cost) : null, gapMedian: med(w.gaps), gapP95: pct(w.gaps, 0.95), spanMs: w.span, longTasks: w.lt }; }
async function emptySpot(p) {
  return p.evaluate(() => {
    const c = document.querySelector('.usm-canvas'), r = c.getBoundingClientRect(), pts = c.cxMap.pts();
    const blocked = [...document.querySelectorAll('.usm-float, .usm-sheet, .usm-scrim')].map((e) => e.getBoundingClientRect()).filter((b) => b.width && b.height);
    for (let y = r.top + r.height * 0.35; y < r.bottom - 90; y += 11) for (let x = r.left + r.width * 0.3; x < r.right - 60; x += 11) {
      if (blocked.some((b) => x > b.left - 6 && x < b.right + 6 && y > b.top - 6 && y < b.bottom + 6)) continue;
      const cx = x - r.left, cy = y - r.top; if (pts.every(([px, py]) => Math.hypot(px - cx, py - cy) > 26)) return [x, y];
    }
    return [r.left + 20, r.top + r.height / 2];
  });
}
async function drag(p, dx, dy, steps = 30) {
  const [x, y] = await emptySpot(p);
  await p.mouse.move(x, y); await p.mouse.down();
  for (let k = 1; k <= steps; k++) { await p.mouse.move(x + (dx * k) / steps, y + (dy * k) / steps); await wait(16); }
  await p.mouse.up();
}
async function runMap(phone, profile) {
  const out = {};
  const base = { url: phone ? '/?panel=us&view=graph#phone' : '/?panel=us#desktop', phone, cpu: phone ? 4 : 0 };
  // Calm (the computer's default). The map opens with an 860 ms glide that moves nothing (every place is already home), and the
  // physics only runs once something asks for a frame after it, so: the opening glide, then a short pan and the physics settling
  {
    const { p, ctx } = await openPage({ ...base, store: { 'cx-us-motion': 'calm' } });
    await waitMark(p, 'map');
    out.open = frameStats(await frameWindow(p, 1200));
    out.calm = frameStats(await frameWindow(p, 3000, () => drag(p, -40, 0, 6)));
    await ctx.close();
  }
  // Live: the physics never rests (measured after the opening glide)
  {
    const { p, ctx } = await openPage({ ...base, store: { 'cx-us-motion': 'live' } });
    await waitMark(p, 'map'); await wait(1200);
    out.live = frameStats(await frameWindow(p, 3000));
    await ctx.close();
  }
  // Still (the phone's default): pan, zoom in, pan zoomed in (every name on screen becomes a candidate), then pick the Senate
  {
    const { p, ctx, cdp } = await openPage({ ...base, store: { 'cx-us-motion': 'still' } });
    await waitMark(p, 'map'); await wait(500);
    out.pan = frameStats(await frameWindow(p, 900, () => drag(p, -220, -60)));
    const c = await p.evaluate(() => { const r = document.querySelector('.usm-canvas').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
    await p.mouse.move(c[0], c[1]);
    out.zoom = frameStats(await frameWindow(p, 1200, async () => { for (let k = 0; k < 8; k++) { await p.mouse.wheel({ deltaY: -120 }); await wait(60); } }));
    if (profile) { await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 100 }); await cdp.send('Profiler.start'); }
    out.panZoomed = frameStats(await frameWindow(p, 1200, () => drag(p, 200, 80)));
    out.labelsZoomed = await p.evaluate(() => document.querySelector('.usm-canvas').cxMap.labels.length);
    if (profile) { const { profile: pr } = await cdp.send('Profiler.stop'); out.profile = topSelf(pr); }
    await p.click('.usm-canvas'); await p.keyboard.press('0'); await wait(400);
    out.focus = frameStats(await frameWindow(p, 1500, async () => { await p.focus('.usm-canvas'); await p.keyboard.press(']'); await p.keyboard.press('Enter'); }));
    await ctx.close();
  }
  return out;
}
/* own time per function in a CPU profile, with the start of each function's source so a minified name can be recognized */
let HTML_LINES = null;
function topSelf(pr) {
  const dt = new Map(), byId = new Map(pr.nodes.map((n) => [n.id, n]));
  pr.samples.forEach((id, k) => dt.set(id, (dt.get(id) || 0) + (pr.timeDeltas[k] || 0)));
  const agg = new Map();
  for (const [id, us] of dt) {
    const cf = byId.get(id).callFrame, key = `${cf.functionName || '(anon)'}@${cf.lineNumber}:${cf.columnNumber}`;
    const a = agg.get(key) || { fn: cf.functionName || '(anon)', line: cf.lineNumber, col: cf.columnNumber, url: cf.url, ms: 0 };
    a.ms += us / 1000; agg.set(key, a);
  }
  HTML_LINES = HTML_LINES || fs.readFileSync(path.join(SITE, 'index.html'), 'utf8').split('\n');
  return [...agg.values()].sort((a, b) => b.ms - a.ms).slice(0, 14).map((a) => ({ ms: +a.ms.toFixed(1), fn: a.fn, src: a.url && a.url.startsWith(BASE) && HTML_LINES[a.line] ? HTML_LINES[a.line].slice(a.col, a.col + 90) : a.url.slice(0, 40) }));
}

/* ---- print ---- */
const kb = (n) => (n == null ? '-' : `${(n / 1024).toFixed(1)} KB`);
const ms = (n) => (n == null ? '-' : `${Math.round(n)} ms`);
const ms1 = (n) => (n == null ? '-' : `${n.toFixed(1)} ms`);
function medObj(list) {   // the median of every number field, across runs
  const o = {};
  for (const k of Object.keys(list[0])) {
    const v = list.map((x) => x[k]);
    if (typeof v[0] === 'number' || v[0] == null) o[k] = med(v);
    else if (typeof v[0] === 'object' && !Array.isArray(v[0])) { const keys = [...new Set(v.flatMap((x) => Object.keys(x || {})))]; o[k] = Object.fromEntries(keys.map((kk) => [kk, typeof (v[0][kk]) === 'object' ? medObj(v.map((x) => (x && x[kk]) || { n: 0, sent: 0, unpacked: 0 })) : med(v.map((x) => x && x[kk]))])); }
    else o[k] = v[0];
  }
  return o;
}

(async () => {
  if (!fs.existsSync(path.join(SITE, 'index.html'))) { console.error(`No ${SITE}/index.html. Run python build.py first.`); process.exit(2); }
  const only = argv('--only'), want = (k) => !only || only === true || only.split(',').includes(k);
  const result = { site: SITE, when: new Date().toISOString(), runs: RUNS };
  result.files = fileTable(SITE); result.parts = htmlParts(SITE);
  console.log(`\nFiles in ${path.relative(ROOT, SITE) || SITE} (raw / gzip -9 / brotli 11):`);
  result.files.forEach((f) => console.log(`  ${f.file.padEnd(36)} ${String(f.n).padStart(4)}  ${kb(f.raw).padStart(11)} ${kb(f.gzip).padStart(11)} ${kb(f.br).padStart(11)}`));
  result.parts.forEach((f) => console.log(`  index.html: ${f.part.padEnd(24)} ${kb(f.raw).padStart(11)}`));
  if (argv('--files')) { if (argv('--json')) fs.writeFileSync(argv('--json'), JSON.stringify(result, null, 1)); return; }
  const { server, base } = await serve(SITE); BASE = base;
  B = await puppeteer.launch({ executablePath: chromePath(), headless: 'new', args: process.env.CI ? ['--no-sandbox', '--disable-setuid-sandbox'] : [] });
  result.loads = {};
  for (const key of Object.keys(LOADS)) {
    if (!want(key)) continue;
    const runs = [];
    for (let k = 0; k < RUNS; k++) runs.push(await runLoad(key));
    const m = medObj(runs); result.loads[key] = { median: m, runs };
    console.log(`\n${LOADS[key].title}  (median of ${RUNS}; accept-encoding "${ENC_SEEN}")`);
    console.log(`  runs: ready ${runs.map((r) => ms(r.ready)).join(', ')}; first paint ${runs.map((r) => ms(r.fp)).join(', ')}; interactive ${runs.map((r) => ms(r.interactive)).join(', ')}`);
    console.log(`  first paint ${ms(m.fp)}, first contentful paint ${ms(m.fcp)}, app drawn ${ms(m.app)}, ready (${LOADS[key].ready}) ${ms(m.ready)}, interactive ${ms(m.interactive)}, largest paint ${ms(m.lcp)}`);
    console.log(`  long tasks ${m.longTasks} (${ms(m.longMs)} in all, longest ${ms(m.longest)}, blocking ${ms(m.blocking)}), JS heap ${kb(m.heap)}, sent ${kb(m.sent)}, unpacked ${kb(m.unpacked)}`);
    if (m.mapAfterData != null) console.log(`  map data arrived ${ms(m.mapDataAt)}; first map drawing ${ms(m.mapAfterData)} after it`);
    Object.entries(m.files).sort((a, b) => b[1].sent - a[1].sent).forEach(([f, v]) => console.log(`    ${f.padEnd(34)} x${v.n}  sent ${kb(v.sent).padStart(10)}  unpacked ${kb(v.unpacked).padStart(10)}`));
  }
  result.map = {};
  for (const [key, phone] of [['map-desk', false], ['map-phone', true]]) {
    if (!want(key)) continue;
    const runs = [];
    for (let k = 0; k < RUNS; k++) runs.push(await runMap(phone, argv('--profile') && k === 0));
    const m = {};
    for (const w of ['open', 'calm', 'live', 'pan', 'zoom', 'panZoomed', 'focus']) m[w] = medObj(runs.map((r) => r[w]));
    m.labelsZoomed = med(runs.map((r) => r.labelsZoomed));
    result.map[key] = { median: m, runs };
    console.log(`\nUnited States map at work, ${phone ? 'phone (4x slower processor)' : 'desktop'}  (median of ${RUNS}; script time per frame)`);
    for (const w of ['open', 'calm', 'live', 'pan', 'zoom', 'panZoomed', 'focus']) { const s = m[w]; console.log(`  ${w.padEnd(10)} ${String(Math.round(s.frames)).padStart(4)} frames  median ${ms1(s.median)}  p95 ${ms1(s.p95)}  max ${ms1(s.max)}  frame gap median ${ms1(s.gapMedian)} p95 ${ms1(s.gapP95)}  long tasks ${s.longTasks}`); }
    if (runs[0].profile) { console.log('  CPU profile, panning zoomed in (own time):'); runs[0].profile.forEach((f) => console.log(`    ${String(f.ms).padStart(7)} ms  ${f.fn.padEnd(12)} ${f.src}`)); }
  }
  await B.close(); server.close();
  if (argv('--json')) fs.writeFileSync(argv('--json'), JSON.stringify(result, null, 1));
})();
