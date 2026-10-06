#!/usr/bin/env node
/* Walk the app in Spanish and list every piece of text that is still English.

   node scripts/i18n/crawl.js                       phone and desktop, writes i18n/work/crawl-es.json and prints a summary
   node scripts/i18n/crawl.js --layout phone        only the phone app
   node scripts/i18n/crawl.js --layout desktop      only the desktop app
   node scripts/i18n/crawl.js --budget 40           seconds to spend clicking around on each starting screen (default 45)
   node scripts/i18n/crawl.js --lang en             the same walk in English, to see what the app shows at all

   For each starting screen it opens the page in Spanish, then clicks buttons, tabs, rows, and links (not ones that leave the site or
   change the reader's data), a few levels deep, closing what it opens. After each click it asks the translator (exposed to this script
   only when the debug flag is set in local storage) which text it found no Spanish for. The result is a list of English strings with the
   screens they appeared on, most common first. A string listed here is either missing from i18n/es.json or is on purpose English
   (a name or an official title), in which case it belongs in the "keep" list. This is the test behind "the whole app is in Spanish". */
const fs = require('fs'), path = require('path'), http = require('http');
const ROOT = path.join(__dirname, '..', '..');
const puppeteer = require(path.join(ROOT, 'node_modules', 'puppeteer-core'));
const SITE = path.join(ROOT, 'site');
const arg = (f, d) => { const i = process.argv.indexOf(f); return i < 0 ? d : (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true); };
const LANG = arg('--lang', 'es'), LAYOUT = arg('--layout', 'both'), BUDGET = +arg('--budget', 45) * 1000;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2', '.pdf': 'application/pdf' };

function chromePath() {
  const c = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'];
  const p = c.find((x) => x && fs.existsSync(x)); if (!p) throw new Error('Chrome not found. Set CHROME_PATH.'); return p;
}
const server = http.createServer((q, r) => {
  let u = decodeURIComponent(q.url.split('?')[0]); if (u.endsWith('/')) u += 'index.html';
  const f = path.join(SITE, u);
  if (!f.startsWith(SITE) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
});

const SKIP_TEXT = /^(Clear|Clear my choices|Export|Print|Delete|Reset|Share|Full app|Full site|Desktop view|Close|Back to the story|English|Español|Easy mode|Modo fácil|Escuchar|Read it to me|Start over|Empezar de nuevo|Settings.*Ajustes)\b|opens in a new tab|^Remember/i;
const CLOSERS = ['.cxm-sheet-x', '[aria-label="Close story"]', '[aria-label="Close"]', '[aria-label="Cerrar"]', '.cx-drawer-close', '[aria-label="Close panel"]'];

const UI = (() => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'i18n', 'work', 'inventory.json'), 'utf8')).map((e) => e.en); } catch { return []; } })();
async function harvest(p, into, scene) {
  // any text on screen that is a known English string from the app's own source and still has no Spanish is a gap, however short it is
  if (!p.__ui) { await p.evaluate((list) => { window.__cxUI = new Set(list); }, UI); p.__ui = true; }
  await p.evaluate(() => {
    const t = globalThis.__cxI18n, f = globalThis.__cxI18nText; if (!t || !f) return;
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = w.nextNode())) {
      const core = n.nodeValue.replace(/\s+/g, ' ').trim();
      if (!core || !window.__cxUI.has(core) || (n.parentElement && n.parentElement.closest('[data-no-translate]'))) continue;
      if (t.keep && t.keep.has(core)) continue;
      if (t.mine.get(n) === n.nodeValue) continue;           // already Spanish
      if (f(core) == null) { t.stats.missed.set(core, (t.stats.missed.get(core) || 0) + 1); if (!t.stats.ctx.has(core)) t.stats.ctx.set(core, ((n.parentElement && n.parentElement.parentElement) || document.body).textContent.replace(/\s+/g, ' ').trim().slice(0, 200)); }
    }
  });
  const missed = await p.evaluate(() => {
    const t = globalThis.__cxI18n; if (!t) return null;
    const out = [...t.stats.missed.entries()].map(([k, n]) => [k, n, t.stats.ctx.get(k) || '']); t.stats.missed.clear(); return out;
  });
  if (!missed) return false;
  for (const [text, n, ctx] of missed) {
    const e = into.get(text) || { n: 0, scenes: new Set(), ctx };
    e.n += n; e.scenes.add(scene); into.set(text, e);
  }
  return true;
}

async function clickables(p) {
  return p.evaluate((skip) => {
    const rx = new RegExp(skip, 'i');
    const out = [];
    const seen = new Set();
    for (const e of document.querySelectorAll('button, [role=button], [role=tab], summary, a[href^="#"], a[href^="?"], .atlas-node, [data-node], [data-room]')) {
      if (e.closest('[data-no-translate]') || e.disabled) continue;
      const r = e.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const st = getComputedStyle(e); if (st.visibility === 'hidden' || st.pointerEvents === 'none') continue;
      const label = (e.getAttribute('aria-label') || e.innerText || e.getAttribute('data-node') || e.getAttribute('data-room') || '').trim().replace(/\s+/g, ' ').slice(0, 60);
      if (!label || rx.test(label)) continue;
      const sig = e.tagName + '|' + label + '|' + Math.round(r.top / 40);
      if (seen.has(sig)) continue; seen.add(sig);
      out.push({ label, x: r.left + r.width / 2, y: r.top + r.height / 2, sig });
    }
    return out;
  }, SKIP_TEXT.source);
}

async function explore(p, into, scene, deadline, depth, visited, mobile) {
  if (Date.now() > deadline) return;
  const items = await clickables(p);
  for (const it of items) {
    if (Date.now() > deadline) return;
    const key = scene + '|' + it.sig + '|' + depth;
    if (visited.has(key)) continue; visited.add(key);
    const before = await p.evaluate(() => location.href + '|' + document.querySelectorAll('.cxm-sheet, .cxm-overlay, .cx-drawer, [role=dialog], #cx-pages-menu').length);
    try { await p.mouse.click(it.x, it.y); } catch { continue; }
    await wait(260);
    await harvest(p, into, scene);
    const after = await p.evaluate(() => location.href + '|' + document.querySelectorAll('.cxm-sheet, .cxm-overlay, .cx-drawer, [role=dialog], #cx-pages-menu').length);
    // a sheet, a dialog, or the desktop My pages menu opened (or the address changed): look inside it too
    if (after !== before && depth < 2) await explore(p, into, scene + ' > ' + it.label, deadline, depth + 1, visited, mobile);
    // close what was opened
    for (const sel of CLOSERS) { const c = await p.$(sel); if (c) { try { await c.click(); await wait(160); } catch {} } }
    await p.keyboard.press('Escape').catch(() => {});
  }
}

async function scenes(B, base, layout) {
  const mobile = layout === 'phone';
  const list = mobile
    ? ['/#phone', '/?room=voting#phone', '/?panel=place#phone', '/?panel=leaders#phone', '/?panel=constellation#phone', '/?panel=us#phone', '/?panel=us&view=graph#phone', '/?panel=ballot#phone', '/?panel=ledger#phone', '/?panel=bench#phone', '/?panel=news#phone', '/?panel=settings#phone', '/?panel=priorities#phone', '/?panel=meetings#phone']
    : ['/#desktop', '/?room=voting#desktop', '/?panel=place#desktop', '/?panel=leaders#desktop', '/?panel=constellation#desktop', '/?panel=profiles#desktop', '/?panel=ballot#desktop', '/?panel=ledger#desktop', '/?panel=bench#desktop', '/?panel=news#desktop', '/?panel=stories#desktop', '/?panel=us#desktop', '/?panel=priorities#desktop'];
  const into = new Map();
  for (const url of list) {
    const ctx = await B.createBrowserContext(); const p = await ctx.newPage();
    await p.setViewport(mobile ? { width: 390, height: 844, isMobile: true, hasTouch: true } : { width: 1280, height: 900 });
    await p.evaluateOnNewDocument((lang) => { try { localStorage.setItem('cx-easy', 'off'); localStorage.setItem('cx-lang', lang); localStorage.setItem('cx-i18n-debug', '1'); sessionStorage.setItem('cx-es-note', '1'); } catch (e) {} }, LANG);
    const errs = []; p.on('pageerror', (e) => errs.push(e.message.slice(0, 120)));
    try {
      await p.goto(base + url, { waitUntil: 'networkidle2', timeout: 60000 }); await wait(1800);
      const ok = await harvest(p, into, `${layout} ${url}`);
      if (!ok) { console.log(`  ${layout} ${url}: no translator hook (is the debug flag supported?)`); await ctx.close(); continue; }
      await explore(p, into, `${layout} ${url}`, Date.now() + BUDGET, 0, new Set(), mobile);
      // scroll the whole page once so lazy parts are drawn
      await p.evaluate(async () => { const m = document.querySelector('.cxm-full-body') || document.querySelector('.cxm-main, .atlas-main, main') || document.scrollingElement; for (let i = 0; i < 12; i++) { m.scrollTop += 600; await new Promise((r) => setTimeout(r, 120)); } });
      await wait(300); await harvest(p, into, `${layout} ${url}`);
    } catch (e) { console.log(`  ${layout} ${url}: ${String(e.message).slice(0, 100)}`); }
    if (errs.length) console.log(`  ${layout} ${url}: page errors ${JSON.stringify(errs.slice(0, 2))}`);
    await ctx.close();
    process.stdout.write(`  ${layout} ${url}: ${into.size} untranslated so far\n`);
  }
  // Easy mode (phone, and on a computer)
  const ctx = await B.createBrowserContext(); const p = await ctx.newPage();
  await p.setViewport(mobile ? { width: 390, height: 844, isMobile: true, hasTouch: true } : { width: 1280, height: 900 });
  await p.evaluateOnNewDocument((lang) => { try { localStorage.setItem('cx-easy', 'on'); localStorage.setItem('cx-lang', lang); localStorage.setItem('cx-i18n-debug', '1'); sessionStorage.setItem('cx-es-note', '1'); } catch (e) {} }, LANG);
  try {
    await p.goto(base + (mobile ? '/#phone' : '/#desktop'), { waitUntil: 'networkidle2', timeout: 60000 }); await wait(1800);
    await harvest(p, into, `${layout} easy`);
    await explore(p, into, `${layout} easy`, Date.now() + BUDGET, 0, new Set(), mobile);
  } catch (e) { console.log(`  ${layout} easy: ${String(e.message).slice(0, 100)}`); }
  await ctx.close();
  return into;
}

(async () => {
  if (!fs.existsSync(path.join(SITE, 'index.html'))) { console.error('Run python build.py first.'); process.exit(2); }
  await new Promise((r) => server.listen(0, r));
  const base = 'http://localhost:' + server.address().port;
  const B = await puppeteer.launch({ executablePath: chromePath(), headless: 'new', args: process.env.CI ? ['--no-sandbox', '--disable-setuid-sandbox'] : [] });
  const all = new Map();
  for (const layout of LAYOUT === 'both' ? ['phone', 'desktop'] : [LAYOUT]) {
    console.log(`${layout}:`);
    const m = await scenes(B, base, layout);
    for (const [t, e] of m) { const a = all.get(t) || { n: 0, scenes: new Set(), ctx: e.ctx }; a.n += e.n; e.scenes.forEach((s) => a.scenes.add(s)); all.set(t, a); }
  }
  await B.close(); server.close();
  // English that comes from the data (official titles, organization names, neighborhoods, addresses) is meant to stay English, so it is not a gap
  const corpus = [];
  const grab = (v) => { if (typeof v === 'string') corpus.push(v.replace(/\s+/g, ' ').toLowerCase()); else if (Array.isArray(v)) v.forEach(grab); else if (v && typeof v === 'object') Object.values(v).forEach(grab); };
  for (const f of fs.readdirSync(path.join(ROOT, 'data')).filter((x) => x.endsWith('.json') && !/^(geo|changes|links)/.test(x))) { try { grab(JSON.parse(fs.readFileSync(path.join(ROOT, 'data', f), 'utf8'))); } catch {} }
  try {   // the short headlines are made from official titles by fixed rules (ext/cx-headline.jsx), so they count as data too
    const vm = require('vm'); const ctx = vm.createContext({});
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'ext', 'cx-headline.jsx'), 'utf8') + ';this.h=cxHeadline;', ctx);
    JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'legistar-2026.json'), 'utf8')).matters.forEach((m) => corpus.push(ctx.h(m.title).replace(/\s+/g, ' ').toLowerCase()));
  } catch {}
  const blob = corpus.join('\n');
  const fromData = (t) => { const k = t.replace(/^\[[a-z-]+\] /, '').toLowerCase().replace(/\s+/g, ' ').trim(); return k.length > 3 && blob.includes(k); };
  const rows0 = [...all.entries()].map(([text, e]) => ({ text, n: e.n, scenes: [...e.scenes].slice(0, 4), screens: e.scenes.size, ctx: e.ctx || '' })).sort((a, b) => b.screens - a.screens || b.n - a.n);
  const rows = rows0.filter((r) => !fromData(r.text));
  console.log(`\n${rows0.length} pieces of text have no Spanish; ${rows0.length - rows.length} of them come from the data (titles, organizations, places) and stay English on purpose.`);
  const out = path.join(ROOT, 'i18n', 'work', `crawl-${LANG}.json`);
  fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, JSON.stringify(rows, null, 0));
  console.log(`${rows.length} distinct pieces of app text are still in English. Written to ${path.relative(ROOT, out)}.`);
  rows.slice(0, 25).forEach((r) => console.log(`  ${String(r.screens).padStart(3)} screens  ${r.text.slice(0, 100)}`));
  if (rows.length && process.argv.includes('--fail')) process.exit(1);
})();
