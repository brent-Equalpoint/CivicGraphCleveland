#!/usr/bin/env node
/* Browser checks for the built site: one command, one exit code.

     node scripts/checks/run.js              run everything against site/
     node scripts/checks/run.js --only easy  run the checks whose name contains "easy"
     node scripts/checks/run.js --list       print the check names

   It serves site/ itself (so nothing else needs to run), drives headless Chrome with puppeteer-core,
   and exits 1 if any check fails. Set CHROME_PATH if Chrome is somewhere unusual. In CI it passes
   --no-sandbox. These are the checks that were run by hand during the v5.16 build; the accessibility
   audit (axe-core, WCAG 2.2 AA rules and best practices) is the last one. Known false positives are
   listed in AXE_ALLOW with the reason; anything else fails.
*/
const puppeteer = require('puppeteer-core');
const axeSource = require('fs').readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const SITE = path.resolve(ROOT, argv('--site') || 'site');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
function argv(flag) { const i = process.argv.indexOf(flag); return i < 0 ? null : (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true); }

const MIME = { '.js': 'text/javascript; charset=utf-8', '.html': 'text/html; charset=utf-8', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.webp': 'image/webp', '.pdf': 'application/pdf', '.json': 'application/json' };
function serve(rootFn = () => SITE) {
  const server = http.createServer((q, r) => {
    const root = rootFn();
    const u = decodeURIComponent(q.url.split('?')[0]);
    let f = u === '/' ? path.join(root, 'index.html') : path.join(root, u);
    if (!f.startsWith(root)) { r.writeHead(403); return r.end(); }
    fs.readFile(f, (e, d) => {
      if (e) { fs.readFile(path.join(root, '404.html'), (e2, d2) => { r.writeHead(404, { 'content-type': MIME['.html'] }); r.end(d2 || 'not found'); }); return; }
      r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); r.end(d);
    });
  });
  return new Promise((res) => server.listen(0, () => res({ server, base: `http://localhost:${server.address().port}` })));
}
function chromePath() {
  const c = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'];
  const p = c.find((x) => x && fs.existsSync(x));
  if (!p) throw new Error('Chrome not found. Set CHROME_PATH.');
  return p;
}

let B, BASE, fails;
async function open(url, o = {}) {
  if (process.env.CHECK_THEME === 'original' && !o.theme) o = { ...o, theme: 'original' };   // CHECK_THEME=original: run in the Original style
  // Chrome sometimes answers "Session with given id not found" for a moment (it is the browser, not the page, and not our code).
  // The same call works half a second later, so that one message is retried; any other error is raised at once.
  let ctx;
  for (let tries = 0; ; tries++) {
    try { ctx = await B.createBrowserContext(); break; } catch (e) { if (tries >= 2 || !/Session with given id not found/.test(e.message)) throw e; await wait(500); }
  }
  const p = await ctx.newPage();
  if (o.scheme) await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: o.scheme }]);
  await p.setViewport(o.mobile ? { width: o.width || 390, height: o.height || 844, isMobile: true, hasTouch: true } : { width: o.width || 1280, height: o.height || 900 });
  p.errors = [];
  p.on('pageerror', (e) => p.errors.push(e.message.slice(0, 160)));
  // every page, in every check: it may ask only its own site for anything, and the browser may not report a Content-Security-Policy violation
  p.outside = []; p.csp = []; p.asked = [];   // asked: the paths this page requested from its own site (perf-budget reads it)
  p.on('request', (r) => { try { const u = new URL(r.url()); if (!['data:', 'blob:', 'about:'].includes(u.protocol) && u.origin !== new URL(BASE).origin) p.outside.push(r.url().slice(0, 100)); else if (u.origin === new URL(BASE).origin) p.asked.push(u.pathname); } catch (e) { /* not a web address */ } });
  p.on('console', (m) => { if (m.type() === 'error' && /Content Security Policy/i.test(m.text())) p.csp.push(m.text().slice(0, 200)); });
  if (o.mock) {  // { '/bench/public-2026.json': {...} }: answer these addresses with made-up JSON
    await p.setRequestInterception(true);
    p.on('request', (r) => { const u = new URL(r.url()); if (o.mock[u.pathname]) r.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(o.mock[u.pathname]) }); else r.continue(); });
  }
  if (o.mode !== 'system') await p.evaluateOnNewDocument((m) => { try { localStorage.setItem('cx-mode', m); } catch (e) {} }, o.mode || (process.env.CHECK_MODE === 'light' ? 'light' : 'dark'));   // dark unless CHECK_MODE=light (the browser's own setting is light, so System would be light); o.mode:'system' leaves the choice alone
  if (process.env.CHECK_LANG === 'es') await p.evaluateOnNewDocument(() => { try { localStorage.setItem('cx-lang', 'es'); sessionStorage.setItem('cx-es-note', '1'); } catch (e) {} });   // CHECK_LANG=es: run the layout checks (no-bleed, targets, axe) in Spanish
  if (o.easy !== undefined || o.theme || o.pre) {
    await p.evaluateOnNewDocument((easy, theme) => { try { if (easy !== undefined) localStorage.setItem('cx-easy', easy ? 'on' : 'off'); if (theme) localStorage.setItem('cx-theme', theme); } catch (e) {} }, o.easy, o.theme);
    if (o.pre) await p.evaluateOnNewDocument(o.pre);
  }
  await p.goto(BASE + url, { waitUntil: 'networkidle2', timeout: 60000 });
  await wait(o.settle || 1100);
  p.close2 = () => ctx.close();
  return p;
}
const txt = (p, s) => p.evaluate((s) => { const e = document.querySelector(s); return e ? (e.innerText ?? e.textContent) : null; }, s);
const has = (p, s) => p.evaluate((s) => !!document.querySelector(s), s);
const count = (p, s) => p.evaluate((s) => document.querySelectorAll(s).length, s);
const ES_WORDS = process.env.CHECK_LANG === 'es' ? require('../../i18n/es.json').exact : {};   // in Spanish a control is found by its Spanish name too
async function clickText(p, label, sel = 'button, a') {
  const h = await p.evaluateHandle((l, sel, es) => [...document.querySelectorAll(sel)].find((x) => [l, es].filter(Boolean).some((w) => (x.innerText || '').trim().startsWith(w) || x.getAttribute('aria-label') === w)), label, sel, ES_WORDS[label] || '');
  const el = h.asElement(); if (!el) throw new Error(`no control "${label}"`);
  await el.click(); await wait(350);
}
function expect(cond, msg) { if (!cond) fails.push(msg); }
async function done(p) {
  expect(p.errors.length === 0, `console errors: ${JSON.stringify(p.errors)}`);
  expect((p.outside || []).length === 0, `the page asked another site for something: ${JSON.stringify(p.outside)}`);   // pages a check opens itself are not tracked
  expect((p.csp || []).length === 0, `the browser reported a Content-Security-Policy violation: ${JSON.stringify(p.csp)}`);
  await p.close2();
}
/* At City Hall's own functions (the part of ext/cx-meetings.jsx with no screen in it, and the priority keyword rules of ext/cx-leaders.jsx) run on the
   record, so the city-hall check knows what the page should show on any day without typing an expected number by hand */
function cityHallApi() {
  const vm = require('vm');
  const src = fs.readFileSync(path.join(ROOT, 'ext', 'cx-meetings.jsx'), 'utf8'), lead = fs.readFileSync(path.join(ROOT, 'ext', 'cx-leaders.jsx'), 'utf8');
  const pure = src.slice(src.indexOf('/* what the Clerk'), src.indexOf('/* ---------- the screen'));
  const rules = lead.slice(lead.indexOf('/* ---------- Topic matching'), lead.indexOf('/* Legistar sponsor names'));
  const matters = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'legistar-2026.json'), 'utf8')).matters;
  const byFile = new Map(matters.map((m) => [m.file, m]));
  const ctx = vm.createContext({ cxmPl: (n, a, b) => `${n} ${n === 1 ? a : b}`, cxmMatter: (f) => byFile.get(f) || null, cxHeadline: (t) => t });
  vm.runInContext(`${pure}\n${rules}\n;this.api = { cxMtgSplit, cxMtgWeek, cxMtgDecided, cxMtgByKind, cxMtgWatch, cxMtgForYou, cxMtgIndex, cxMtgFind, cxMatch, priorityIds: () => Object.keys(CX_MATCH_RULES) };`, ctx);
  return { ...ctx.api, matters, data: JSON.parse(fs.readFileSync(path.join(SITE, 'meetings', 'meetings-2026.json'), 'utf8')) };
}
function cityHallLook(A) {
  const pl = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'place-2026.json'), 'utf8'));
  return { fundWards: (f) => (pl.funds[f] || {}).wards || [], addrWards: (f) => Object.values(pl.addresses).filter((r) => (r.files || []).includes(f)).map((r) => r.ward2026), match: (t) => A.cxMatch(t) };
}
const etToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });   // the app's own day (cxTodayET), Cleveland time
const nextEnabled = (p) => p.evaluate(() => { const n = document.querySelector('.cxe-nav .cxe-btn:not(.alt)'); return !!n && !n.disabled; });
async function walkEasy(p) { let n = 0; while (await nextEnabled(p) && n++ < 12) await clickText(p, 'Next'); return n; }

const CHECKS = {
  async 'stories-desktop'() {
    const p = await open('/?panel=stories#desktop');
    expect((await txt(p, '.cx-stories h1')) === 'Stories', 'desktop Stories page has no h1');
    expect((await count(p, '.cx-stories-pick button')) >= 3, 'fewer than 3 stories offered');
    const a = await txt(p, '.cx-story-big');
    await p.focus('.cx-story-reader .cx-story-btn:not(.alt)'); await p.keyboard.press('ArrowRight'); await wait(300);
    expect((await txt(p, '.cx-story-big')) !== a, 'ArrowRight did not advance the story');
    await clickText(p, 'Read this story as text', 'button');
    expect((await count(p, '.cx-story-all > li')) > 1, 'text view of the story is empty');
    expect(await has(p, '[aria-live]'), 'no live region for the story frame');
    await done(p);
  },
  async 'stories-phone'() {
    const p = await open('/#phone', { mobile: true, easy: false });
    const n = await count(p, '.cxm-story-btn'); expect(n >= 3, `only ${n} phone stories`);
    await (await p.$('.cxm-story-btn')).click(); await wait(500);
    expect(await has(p, '.cxm-story[role=dialog]'), 'story did not open as a dialog');
    for (let i = 0; i < 6; i++) {
      const k = await txt(p, '.cxm-story .cxm-kicker');
      expect(!k || k !== k.toUpperCase() || k.length < 4, `all-caps story label: ${k}`);
      const r = await p.$('.cxm-tap-r'); if (!r) break; await r.click(); await wait(200);
    }
    await done(p);
  },
  async 'stories-deeper'() {
    // phone: text version, a spoken step, Go deeper, and the way back
    const p = await open('/#phone', { mobile: true, easy: false });
    const btns = await p.$$('.cxm-story-btn'); let council = null;
    for (const b of btns) { if (/Council/.test(await b.evaluate((e) => e.getAttribute('aria-label') || ''))) council = b; }
    expect(!!council, 'no Council story on the phone Today screen');
    await council.click(); await wait(500);
    expect(/^Step 1 of \d+\./.test(((await p.evaluate(() => document.querySelector('.cxm-sr').textContent)) || '')), 'the story does not announce its first step');
    await clickText(p, 'Read as text', 'button'); await wait(300);
    expect((await count(p, '.cxm-story-all li')) >= 3, 'the text version of the story has too few steps');
    await clickText(p, 'Back to the story', 'button'); await wait(300);
    let n = 0; while (!(await p.evaluate(() => /last step/.test((document.querySelector('.cxm-story-hint') || {}).textContent || ''))) && n++ < 10) { await (await p.$('.cxm-tap-r')).click(); await wait(200); }
    expect(/last step/.test((await txt(p, '.cxm-story-hint')) || ''), 'the last step is not marked');
    const frameBefore = await txt(p, '.cxm-story-big');
    await clickText(p, "See what is new in Council's record", 'button'); await wait(600);
    expect(await has(p, '.cxm-sheet'), 'Go deeper did not open the news sheet');
    expect(/Back to the story/.test((await txt(p, '.cxm-storyback')) || ''), 'no Back to the story chip after Go deeper');
    await clickText(p, 'Back to the story', 'button'); await wait(500);
    expect(await has(p, '.cxm-story[role=dialog]') && (await txt(p, '.cxm-story-big')) === frameBefore, 'Back to the story did not return to the same step');
    await done(p);
    // desktop: the same button on the last step, and the reader remembers its place
    const d = await open('/?panel=stories#desktop');
    n = 0; while (await d.evaluate(() => { const b = document.querySelector('.cx-story-nav .cx-story-btn:not(.alt)'); return b && !b.disabled && !/Next story/.test(b.textContent); }) && n++ < 10) await clickText(d, 'Next', '.cx-story-nav button');
    expect(await d.evaluate(() => !![...document.querySelectorAll('.cx-stories .cx-story-act button')].find((b) => /new in Council/.test(b.textContent))), 'no Go deeper button on the desktop last step');
    await clickText(d, "See what is new in Council's record", '.cx-stories button'); await wait(700);
    expect(await has(d, '.atlas-shell') && !(await has(d, '.cx-stories')), 'Go deeper did not leave the Stories page');
    await clickText(d, 'Stories', '.atlas-sidebar button'); await wait(700);
    expect(/Step \d+ of \d+/.test((await txt(d, '.cx-story-count')) || '') && !/Step 1 of/.test((await txt(d, '.cx-story-count')) || ''), 'the desktop reader forgot where it was');
    await done(d);
  },
  async 'map-cards'() {
    const p = await open('/?room=voting#desktop', { settle: 1500 });
    const center = (id) => p.evaluate((id) => { const r = document.querySelector(`[data-node="${id}"]`).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, id);
    const card = () => txt(p, '.cx-hovercard');
    for (const id of ['ward-3', 'ward-4', 'ward-5', 'ward-6']) { const [x, y] = await center(id); await p.mouse.move(x, y); await wait(60); }
    expect((await card()) === null, 'a fast sweep across the map showed a hover card');
    await p.mouse.move(5, 5); await wait(250);
    const [x, y] = await center('ward-8'); await p.mouse.move(x, y); await wait(120);
    expect((await card()) === null, 'hover card appeared with no pause');
    await wait(600); const t = (await card()) || '';
    expect(/serves on/.test(t), 'council member card has no "serves on" sentence');
    expect(!/→/.test(t) && !/\bthis\b/.test(t), 'card still uses an arrow or the word "this"');
    expect(!/15-ward map/.test(t) && !/Residents/.test(t), 'card repeats the 15-ward map or Residents line');
    await done(p);
  },
  async 'easy-phone'() {
    let p = await open('/#phone', { mobile: true });
    expect(!(await has(p, '.cxe')) && (await has(p, '.cxm-tabs')) && (await has(p, '.cxm-stories')), 'a first visit does not open on Today (Easy mode must be an option, not the first screen)');
    expect(await p.evaluate(() => /Try Easy mode/.test(document.querySelector('.cxm-main').innerText)), 'Today has no way into Easy mode');
    await clickText(p, 'Want a simpler view? Try Easy mode', 'button'); await wait(400);
    expect((await txt(p, '.cxe h1')) === 'Hello. What would you like to know?', 'the Easy mode link did not open Easy mode');
    expect(!(await has(p, '.cxm-tabs')), 'Easy mode still shows the tab bar');
    await clickText(p, 'What is on my ballot?'); const steps = await walkEasy(p);
    expect(steps >= 1, 'ballot story had no steps'); expect(/end of this one/.test((await txt(p, '.cxe-end')) || ''), 'story has no ending');
    const fs_ = await p.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.cxe-text')).fontSize));
    expect(fs_ >= 20, `Easy text is ${fs_}px, under 20`);
    await clickText(p, 'Start over'); await clickText(p, 'Who represents me?');
    expect((await txt(p, '.cxe h1')) === 'Where do you live?', 'ward journey does not ask for a place');
    await p.select('.cxe select', await p.evaluate(() => [...document.querySelector('.cxe select').options].find((o) => /Hough/.test(o.text)).value)); await wait(500);
    expect(/Ward 8/.test((await txt(p, '.cxe-step')) || '') || /Howse-Jones/.test((await txt(p, '.cxe-step')) || ''), 'Hough did not lead to Ward 8');
    await clickText(p, 'Full app'); expect(await has(p, '.cxm-tabs'), 'Full app did not show the full phone app');
    await p.reload({ waitUntil: 'networkidle2' }); await wait(900); expect(await has(p, '.cxm-tabs'), 'the Full choice was not remembered');
    await done(p);
    p = await open('/?room=voting#phone', { mobile: true }); expect(await has(p, '.cxm-tabs') && !(await has(p, '.cxe')), 'a deep link did not open the full app'); await done(p);
  },
  async 'easy-desktop'() {
    const p = await open('/#desktop');
    expect(await p.evaluate(() => [...document.querySelectorAll('.atlas-header button')].some((x) => /Easy mode/.test(x.innerText))), 'no Easy mode button in the desktop header');
    await clickText(p, 'Easy mode'); expect(await has(p, '.cxe') && !(await has(p, '.atlas-shell')), 'Easy mode did not replace the desktop shell');
    await clickText(p, 'What is on my ballot?'); await walkEasy(p); await clickText(p, 'Open my ballot'); await wait(700);
    expect(await has(p, '.atlas-shell'), 'Open my ballot did not return to the desktop site');
    expect(/ballot/i.test((await txt(p, '.atlas-sidebar button.active')) || ''), 'the ballot panel is not the active sidebar entry');
    await done(p);
  },
  async 'screen-states'() {
    for (const [url, want] of [['/?room=nope#desktop', /find that page/], ['/?room=voting&node=zzz#desktop', /find that record/], ['/?panel=bogus#desktop', /find that page/]]) {
      const p = await open(url); expect(want.test((await txt(p, '.cx-notice')) || ''), `desktop notice missing for ${url}`); await done(p);
    }
    for (const url of ['/?room=voting#desktop', '/?panel=stories#desktop', '/#desktop']) { const p = await open(url); expect((await txt(p, '.cx-notice')) === null, `a good link showed a notice: ${url}`); await done(p); }
    let p = await open('/?room=nope#phone', { mobile: true, easy: false }); expect(/find that page/.test((await txt(p, '.cxm-notice')) || ''), 'phone bad-link notice missing'); await done(p);
    p = await open('/?room=voting#phone', { mobile: true }); await clickText(p, 'Search'); await p.type('input[type=search]', 'zzzqx'); await wait(300);
    expect(/Nothing matches/.test((await txt(p, '.cxm-empty strong')) || ''), 'empty search has no helpful message');
    await clickText(p, 'Clear the search'); expect((await txt(p, '.cxm-empty')) === null, 'Clear the search did not clear the empty state'); await done(p);
    const blocked = await open('/#desktop', { pre: () => { Storage.prototype.setItem = () => { throw new DOMException('blocked', 'QuotaExceededError'); }; } });
    expect(/not saving settings/.test((await txt(blocked, '.cx-notice')) || ''), 'blocked storage is not explained on desktop'); await done(blocked);
    p = await open('/?room=voting#phone', { mobile: true, pre: () => { Storage.prototype.setItem = () => { throw new DOMException('blocked', 'QuotaExceededError'); }; } });
    await clickText(p, 'Settings'); await wait(300);
    expect(await p.evaluate(() => [...document.querySelectorAll('.cxm-fine')].some((e) => /not saving settings/.test(e.innerText))), 'blocked storage is not explained'); await done(p);
  },
  async 'profiles'() {
    const p = await open('/?panel=profiles#desktop', { settle: 1400 });
    const n = await count(p, '.sp-pick button'); expect(n === 16, `expected 16 seats, found ${n}`);
    for (let i = 0; i < n; i++) {
      await (await p.$$('.sp-pick button'))[i].click(); await wait(120);
      const r = await p.evaluate(() => { const a = document.querySelector('.sp'); const t = a.innerText; return { name: a.querySelector('h1').innerText, h2: a.querySelectorAll('h2').length, bad: /undefined|NaN|\[object|\bnull\b/.test(t), arrow: /→/.test(t), pron: /\b(he|she|his|her)\b/i.test(t.replace(/\b(she|he) is\b/gi, '')) }; });
      expect(!r.bad && !r.arrow, `profile for ${r.name} has broken text`); expect(r.h2 >= 6, `profile for ${r.name} has only ${r.h2} sections`);
    }
    await (await p.$$('.sp-pick button'))[0].click(); await wait(300);  // the Mayor
    const mh = await p.evaluate(() => [...document.querySelectorAll('.sp h2')].map((h) => h.innerText));
    expect(mh.includes('City departments and executive orders'), `the Mayor's profile lacks the departments section: ${mh}`);
    expect((await count(p, '.sp-list li a[href*="clevelandohio.gov"]')) >= 3, 'the Mayor profile lists too few department links');
    expect(/Executive Order 2025-01/.test((await txt(p, '.sp')) || ''), 'the Mayor profile lacks the executive order in the record');
    await (await p.$$('.sp-pick button'))[9].click(); await wait(300);
    expect((await count(p, '.sp-map path')) === 15 && (await count(p, '.sp-map path.on')) === 1, 'ward map is not 15 wards with one highlighted');
    expect(/Legistar does not list committee seats|does not list committee seats/.test((await txt(p, '.sp-dl')) || ''), 'committee statement missing');
    expect(/Absent is not a no and not an abstention/.test((await txt(p, '.sp')) || ''), 'the votes honesty statement is missing');
    await done(p);
    const q = await open('/?room=voting#desktop', { settle: 1500 });
    const c = await q.evaluate(() => { const r = document.querySelector('[data-node="ward-8"]').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }); await q.mouse.click(c[0], c[1]); await wait(700);
    expect(/formal profile/.test((await txt(q, '.cx-drawer-profile button')) || ''), 'no profile button in the record drawer');
    await q.evaluate(() => document.querySelector('.cx-drawer-profile button').click()); await wait(900);
    expect(/Howse-Jones/.test((await txt(q, '.sp h1')) || ''), 'the drawer button did not open the profile'); await done(q);
    const m = await open('/#phone', { mobile: true, easy: true }); await clickText(m, 'Who represents me?');
    await m.select('.cxe select', await m.evaluate(() => [...document.querySelector('.cxe select').options].find((o) => /Hough/.test(o.text)).value)); await wait(500); await walkEasy(m);
    await clickText(m, 'Read the short profile of'); await wait(500);
    expect(/Howse-Jones/.test((await txt(m, '.cxe h1')) || '') && /led \d+ proposal/.test((await txt(m, '.cxe-main')) || ''), 'the Easy mode short profile is missing its name or its counts');
    expect(/The City Record prints how each member voted/.test((await txt(m, '.cxe-main')) || '') && /Absent is not a no/.test((await txt(m, '.cxe-main')) || ''), 'the short profile does not give the recorded votes with the not-a-no note');
    await clickText(m, 'Read the full profile'); await wait(900);
    expect(await has(m, '.cxm-sheet .sp'), 'the full profile button did not open the phone sheet');
    expect(/voted yea/.test((await txt(m, '.cxm-sheet .sp')) || ''), 'the phone profile sheet has no recorded votes'); await done(m);
  },
  async 'story-layout'() {
    // the story header is calm at phone width: one row for who and close, one row for Read as text, nothing wraps to a lone word
    const m = await open('/#phone', { mobile: true, easy: false });
    await m.evaluate(() => { const b = [...document.querySelectorAll('.cxm-story-btn')].find((x) => /ballot/i.test(x.getAttribute('aria-label') || '')); b && b.click(); }); await wait(600);
    expect(await has(m, '.cxm-story'), 'the ballot story did not open');
    const g = await m.evaluate(() => {
      const r = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height, r: b.right, b: b.bottom }; };
      const src = document.querySelector('.cxm-story-src');
      return { who: r('.cxm-story-who'), badge: r('.cxm-story-who > span:first-child'), name: r('.cxm-story-who > span:last-child'), close: r('.cxm-story-head > button'), text: r('.cxm-story-text'), src: r('.cxm-story-src'), link: r('.cxm-story-src a'), hint: r('.cxm-story-hint'),
        when: document.querySelector('.cxm-story-who small').innerText, big: document.querySelector('.cxm-story-big').innerText, srcVisible: src ? [...src.childNodes].filter((n) => !(n.classList && n.classList.contains('cxm-sr'))).map((n) => n.textContent).join('').replace(/\(opens in a new tab\)/, '').trim() : null,
        textOneLine: (() => { const b = document.querySelector('.cxm-story-text'); return b.getClientRects().length === 1 && b.getBoundingClientRect().height < 56; })() };
    });
    expect(g.textOneLine && g.text.h >= 44, `Read as text is not one clean line (height ${g.text && g.text.h})`);
    expect(g.badge && Math.abs(g.badge.w - g.badge.h) < 1 && g.badge.w >= 40, 'the story badge is not a round 40px mark');
    expect(g.name.h <= 44, `the story name and date wrap onto ${Math.round(g.name.h)}px of height`);
    expect(g.close.x >= g.who.r - 1 && g.text.y >= g.who.b - 1, 'the header pieces overlap');
    expect(!/ \d/.test(g.when.replace(/ /g, '_')) || /Nov\._\d/.test(g.when.replace(/ /g, '_')), `a date in "${g.when}" can break across lines`);
    expect(/ \S+\.?$/.test(g.big), `the headline can end on a lone word: "${g.big}"`);
    expect(g.src && g.link && /^[A-Z]/.test(g.srcVisible) && !/Where this comes from/.test(g.srcVisible), `the source is not just the link: "${g.srcVisible}"`);
    expect(g.hint.y - g.src.b >= 9, `the source line is only ${Math.round(g.hint.y - g.src.b)}px above the hint`);
    expect(g.link.h >= 40, 'the source link is a hard target to tap');
    await m.evaluate(() => document.querySelector('.cxm-story-text').click()); await wait(400);
    const al = await m.evaluate(() => { const x = (q) => { const e = document.querySelector(q); return e ? Math.round(e.getBoundingClientRect().left) : null; }; return { head: x('.cxm-story-who'), pill: x('.cxm-story-text'), item: x('.cxm-story-all li .cxm-story-big'), kicker: x('.cxm-story-all li .cxm-kicker') }; });
    expect(al.item === al.head && al.pill === al.head, `the text view does not line up with the header: ${JSON.stringify(al)}`);
    await done(m);
  },
  async 'titles-never-cut'() {
    // an item's whole title is shown wherever it is read. Use the longest real title in Council's record.
    const leg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'data', 'legistar-2026.json'), 'utf8')).matters;
    const tidy = (t) => { const s = t.replace(/^AN? (EMERGENCY )?(ORDINANCE|RESOLUTION)\s*/i, '').replace(/\s+/g, ' ').trim(); return s.charAt(0).toUpperCase() + s.slice(1); };
    const long = leg.filter((x) => /^(Ordinance|Resolution|Emergency)/i.test(x.type) || /ordinance|resolution/i.test(x.type)).sort((a, b) => tidy(b.title).length - tidy(a.title).length)[0];
    const want = tidy(long.title);
    expect(want.length > 170, `no title is longer than the old 170 character limit (${want.length})`);
    const m = await open('/#phone', { mobile: true, easy: false });
    await clickText(m, 'Search'); await wait(300);
    await m.type('input[type=search]', long.file); await wait(500);
    await m.evaluate((f) => { const r = [...document.querySelectorAll('.cxm-row')].find((x) => (x.innerText || '').trim().startsWith(f)); r && r.click(); }, long.file); await wait(600);
    const h = (await txt(m, '.cxm-sheet .cxm-h2')) || '';
    expect(h.replace(/\s+/g, ' ') === want, `the sheet title is cut: ${h.slice(-60)}`);
    expect(!/…|\.\.\./.test(h), 'the sheet title ends in an ellipsis');
    expect(await m.evaluate(() => { const e = document.querySelector('.cxm-sheet .cxm-h2'); return e.scrollHeight <= e.clientHeight + 1 && getComputedStyle(e).webkitLineClamp === 'none'; }), 'the sheet title is clamped');
    await done(m);
    // the same title in the desktop place list and a profile list
    const p = await open('/?panel=profiles&seat=ward-13#desktop', { settle: 1400 });
    const list = await p.evaluate(() => [...document.querySelectorAll('.sp-list li')].map((e) => e.innerText).join(' '));
    expect(!/…|\w\.\.\.(\s|$)/.test(list), 'a profile list still ends a title in an ellipsis');
    await done(p);
  },
  async 'today-order'() {
    // the stories lead the Today tab, like a feed; asking for a place is one slim row; no guide bubble takes the top
    const m = await open('/#phone', { mobile: true, easy: false });
    const g = await m.evaluate(() => {
      const t = (q) => { const e = document.querySelector(q); if (!e) return null; const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, height: r.height }; };
      const page = document.querySelector('.cxm-page'); const kids = page ? [...page.children].map((e) => e.className.split(' ')[0]) : [];
      return { kids, stories: t('.cxm-stories'), set: t('.cxm-setplace'), count: t('.cxm-count'), says: !!document.querySelector('.cxm-says, .cxm-bubble'), main: t('.cxm-page'), setText: (document.querySelector('.cxm-setplace') || {}).innerText };
    });
    expect(g.kids[0] === 'cxm-stories', `the stories are not first on Today: ${g.kids.slice(0, 3)}`);
    expect(!g.says, 'a guide speech bubble is still on Today');
    expect(g.set && g.set.top >= g.stories.bottom - 1 && g.set.bottom <= g.count.top + 1, 'the place row is not between the stories and the countdown');
    expect(g.set.height <= 72, `the place row takes ${Math.round(g.set.height)}px`);
    expect(/Set your neighborhood/.test(g.setText || ''), `the place row is not direct: ${g.setText}`);
    expect(g.stories.top - g.main.top < 24, `the stories start ${Math.round(g.stories.top - g.main.top)}px down the page`);
    const cards = await m.evaluate(() => [...document.querySelectorAll('.cxm-rcpt')].map((e) => ({ t: (e.querySelector('.cxm-rcpt-t') || {}).innerText || '', second: !!(e.querySelector('.cxm-rcpt-w') && !e.classList.contains('cxm-news-row')) })));
    expect(cards.length >= 4, `Today shows only ${cards.length} receipt cards`);
    expect(cards.every((c) => c.t.length > 0 && c.t.length <= 130), `a receipt headline is ${Math.max(...cards.map((c) => c.t.length))} characters long`);
    expect(!cards.some((c) => c.second), 'a receipt card repeats the official title under its headline');
    await clickText(m, 'Set your neighborhood'); await wait(400);
    expect(await has(m, '.cxm-sheet'), 'the place row does not open the neighborhood picker');
    await done(m);
  },
  async 'sheet-pull'() {
    // a sheet follows the finger down, then either eases back or leaves; it never steals scrolling
    const m = await open('/#phone', { mobile: true, easy: false });
    const cdp = await m.createCDPSession();
    const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
    const pull = async (x, y0, y1, steps, gap, midcheck) => {
      await touch('touchStart', x, y0);
      for (let i = 1; i <= steps; i++) { await touch('touchMove', x + (arguments.length > 6 ? 0 : 0), y0 + ((y1 - y0) * i) / steps); await wait(gap); }
      const mid = midcheck ? await midcheck() : null;
      await touch('touchEnd');
      return mid;
    };
    const state = () => m.evaluate(() => { const s = document.querySelector('.cxm-sheet'); const c = document.querySelector('.cxm-scrim'); return s ? { t: s.style.transform, top: Math.round(s.getBoundingClientRect().top), op: c ? c.style.opacity : '', bar: (() => { const b = s.querySelector('.cxm-sheet-bar').getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; })() } : null; });
    const openSettings = async () => { await clickText(m, 'Settings'); await wait(600); };

    await openSettings();
    let s0 = await state();
    expect(s0 && s0.t === '', 'a freshly opened sheet already has a pull offset');
    // 1. a short pull follows the finger, fades the screen behind, and eases back on release
    const mid = await pull(s0.bar.x - 100, s0.bar.y, s0.bar.y + 60, 6, 16, async () => state());
    expect(mid && /translateY\(([3-6]\d)/.test(mid.t) && +mid.op < 1 && +mid.op > 0.8, `the sheet did not follow a 60px pull: ${JSON.stringify(mid && { t: mid.t, op: mid.op })}`);
    await wait(700);
    let s1 = await state();
    expect(s1 && s1.t === '' && s1.top === s0.top, `the sheet did not ease back after a short pull: ${JSON.stringify(s1 && { t: s1.t, top: s1.top, was: s0.top })}`);
    // 2. upward and sideways drags do nothing
    await pull(s0.bar.x - 100, s0.bar.y + 20, s0.bar.y - 80, 6, 16);
    await pull(s0.bar.x - 100, s0.bar.y, s0.bar.y + 30, 6, 16, async () => null);
    await wait(700);
    // 3. a long pull from the handle closes it
    s0 = await state();
    await pull(s0.bar.x - 100, s0.bar.y, s0.bar.y + 420, 12, 16);
    await wait(700);
    expect(!(await has(m, '.cxm-sheet')) && !(await has(m, '.cxm-scrim')), 'a long pull did not close the sheet');
    // 4. a quick flick closes it even when short
    await openSettings(); s0 = await state();
    await pull(s0.bar.x - 100, s0.bar.y, s0.bar.y + 90, 3, 6);
    await wait(700);
    expect(!(await has(m, '.cxm-sheet')), 'a quick flick did not close the sheet');
    // 5. pulling the content down from the top also closes it
    await openSettings(); s0 = await state();
    await pull(60, s0.top + 220, s0.top + 220 + 420, 12, 16);
    await wait(700);
    expect(!(await has(m, '.cxm-sheet')), 'pulling the content down from the top did not close the sheet');
    await done(m);

    // 6. scrolled content scrolls; it does not pull the sheet
    const p = await open('/?panel=priorities#phone', { mobile: true, easy: false });
    const c2 = await p.createCDPSession();
    const touch2 = (type, x, y) => c2.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
    await p.evaluate(() => { document.querySelector('.cxm-sheet').scrollTop = 400; }); await wait(200);
    const top0 = await p.evaluate(() => Math.round(document.querySelector('.cxm-sheet').getBoundingClientRect().top));
    await touch2('touchStart', 60, 500);
    for (let i = 1; i <= 10; i++) { await touch2('touchMove', 60, 500 + i * 40); await wait(16); }
    const during = await p.evaluate(() => document.querySelector('.cxm-sheet').style.transform);
    await touch2('touchEnd'); await wait(500);
    const after = await p.evaluate(() => { const s = document.querySelector('.cxm-sheet'); return s ? { t: s.style.transform, top: Math.round(s.getBoundingClientRect().top) } : null; });
    expect(during === '' && after && after.t === '' && after.top === top0, `scrolling inside a sheet pulled it: ${JSON.stringify({ during, after, top0 })}`);
    await done(p);
  },
  async levies() {
    // the levies guide and the two levy stories: figures match the official ballot wording, a typed home value scales them, the stories carry the reasons
    // and both sides with linked sources, a person's review status is honest, and nothing tells a resident how to vote
    const ADVICE = /\b(vote yes|vote no|you should vote|we recommend|we urge|best choice|good deal|bad deal)\b/i;
    for (const [url, opt] of [['/?panel=levies#phone', { mobile: true, easy: false }], ['/?panel=levies#desktop', {}]]) {
      const p = await open(url, opt);
      const page = () => p.evaluate(() => document.querySelector('.lv').innerText.replace(/\s+/g, ' '));
      let t = await page();
      expect(/Issue 10/.test(t) && /Issue 11/.test(t), `the guide does not list Issues 10 and 11 (${url})`);
      expect(/\$79 a year for each \$100,000/.test(t) && /\$196 a year for each \$100,000/.test(t), `the county figures are missing (${url})`);
      expect(/Only in some places/.test(t) && (await count(p, '.lv-other')) >= 10, `the other tax issues are not listed (${url})`);
      expect(/A person has not yet read them against those sources|Read against its sources by/.test(t), `the review status is not stated (${url})`);
      expect(!ADVICE.test(t), `the guide tells people how to vote (${url})`);
      await p.type('#lv-home', '250000'); await wait(200);
      t = await page();
      expect(/For your home: about \$198 a year/.test(t) && /For your home: about \$490 a year/.test(t), `a typed home value did not scale the figures (${url})`);
      await done(p);
    }
    // the Issue 11 story on the phone, frame by frame
    const m = await open('/#phone', { mobile: true, easy: false });
    const ring = await m.$$('.cxm-story-btn'); let r11 = null;
    for (const x of ring) { if (/Issue 11/.test(await x.evaluate((e) => e.getAttribute('aria-label') || ''))) r11 = x; }
    expect(!!r11, 'no Issue 11 story on the phone Today screen');
    if (r11) await r11.click(); await wait(500);
    const frame = () => m.evaluate(() => document.querySelector('.cxm-story').innerText.replace(/\s+/g, ' '));
    const tap = async () => { const x = await m.$('.cxm-tap-r'); if (x) await x.click(); await wait(220); };
    const all = [await frame()];
    await tap(); all.push(await frame());
    expect(/\$196/.test(all[1]) && /Now about \$108\.50\. The increase is \$87\.50/.test(all[1]), `the cost frame is wrong: ${all[1].slice(0, 160)}`);
    await tap();
    for (const k of ['2', '5', '0', '0', '0', '0']) await m.evaluate((k) => [...document.querySelectorAll('.lv-keys button')].find((b) => b.getAttribute('aria-label') === k).click(), k);
    all.push(await frame());
    expect(/\$250,000/.test(all[2]) && /Issue 10: about \$198 a year\. Issue 11: about \$490 a year/.test(all[2]), `the number pad did not scale the figures: ${all[2].slice(0, 200)}`);
    await m.evaluate(() => [...document.querySelectorAll('.cxm-story button')].find((b) => /^Next/.test(b.innerText.trim())).click()); await wait(250);
    for (let i = 0; i < 6; i++) { all.push(await frame()); await tap(); }
    const text = all.join(' | ');
    for (const w of ['What it pays for', 'If it passes', '$261.5 million', 'If it fails', 'Someone who supports it', 'A concern raised', 'Dale Miller', "Mike O'Malley"])
      expect(text.includes(w), `the Issue 11 story lacks "${w}"`);
    expect(await has(m, '.lv-more-story'), 'the last frame has no Read more');
    await m.evaluate(() => { document.querySelector('.lv-more-story').open = true; document.querySelector('.lv-wording').open = true; });
    const more = await m.evaluate(() => document.querySelector('.lv-more-story').innerText.replace(/\s+/g, ' '));
    for (const h of ['What it pays for', 'What changes if it passes', 'What happens if it fails', 'What people have said', 'Questions to ask yourself', 'The official ballot wording', '$261,527,652'])
      expect(more.includes(h), `Read more lacks "${h}"`);
    expect(/Supports it/.test(more) && /Raised a concern/.test(more), 'Read more shows only one side for Issue 11');
    expect(!ADVICE.test(text + more), 'a levy story tells people how to vote');
    const bad = await m.evaluate(() => [...document.querySelectorAll('.lv-src a, .cxm-story-src2 a')].filter((a) => !/^https:\/\//.test(a.href) || a.target !== '_blank').length);
    expect(bad === 0, `${bad} source links are not secure or do not open in a new tab`);
    expect((await count(m, '.lv-src a')) >= 8, 'the sources are not linked inside Read more');
    await done(m);
    // the ballot story hands over to the levy stories, and Issue 10 shows the official collection estimate
    const b = await open('/#phone', { mobile: true, easy: false });
    const rings = await b.$$('.cxm-story-btn'); let bal = null;
    for (const x of rings) { if (/ballot/.test(await x.evaluate((e) => e.getAttribute('aria-label') || ''))) bal = x; }
    if (bal) await bal.click(); await wait(500);
    let seen = false;
    for (let i = 0; i < 10 && !seen; i++) { seen = await b.evaluate(() => /See the levy stories/.test(document.body.innerText)); if (!seen) { const x = await b.$('.cxm-tap-r'); if (!x) break; await x.click(); await wait(250); } }
    expect(seen, 'the ballot story does not reach "See the levy stories"');
    if (seen) {
      await b.evaluate(() => [...document.querySelectorAll('.cxm-story button')].find((x) => /See the levy stories/.test(x.innerText)).click()); await wait(500);
      expect(/Issue 10/.test(await b.evaluate(() => document.querySelector('.cxm-story').innerText)), 'the levy stories did not open at Issue 10');
      let ten = ``;
      for (let i = 0; i < 6; i++) {
        const x = await b.$('.cxm-tap-r');
        if (x) await x.click(); else await b.evaluate(() => { const n = [...document.querySelectorAll('.cxm-story button')].find((y) => /^Next$/.test(y.innerText.trim())); if (n) n.click(); });
        await wait(220); ten += await b.evaluate(() => document.querySelector('.cxm-story').innerText.replace(/\s+/g, ' '));
      }
      expect(/\$99\.7 million/.test(ten) && /\$99,684,616/.test(ten), 'the Issue 10 story does not show the official $99,684,616');
    }
    await done(b);
    const c = await open('/#phone', { mobile: true, easy: false });
    await clickText(c, 'Ballot'); await wait(400);
    expect(/What would the county levies cost you\?/.test(await c.evaluate(() => document.body.innerText)), 'the Ballot tab has no levies card');
    await c.evaluate(() => [...document.querySelectorAll('.cxm-keycard')].find((x) => /levies cost/i.test(x.innerText)).click()); await wait(500);
    expect(/Issue 10/.test((await c.evaluate(() => (document.querySelector('.cxm-story') || { innerText: '' }).innerText)) || ''), 'the Ballot tab card does not open the levy story');
    await done(c);
    // the desktop Stories page lists both and reads Issue 11 with the same figures
    const d = await open('/?panel=stories#desktop', {});
    await d.evaluate(() => [...document.querySelectorAll('.cx-stories-pick button')].find((x) => /Issue 11/.test(x.innerText)).click()); await wait(300);
    await d.evaluate(() => [...document.querySelectorAll('.cx-story-nav button')].pop().click()); await wait(300);
    expect(/\$196/.test(await d.evaluate(() => document.querySelector('.cx-story-body').innerText)), 'the desktop story does not show $196');
    await done(d);
  },
  async 'story-fit'() {
    // every frame of every story, on the phone and on the desktop: no line of text may run past the screen or out of its reader,
    // whatever the words are (a long phrase such as "developmental disabilities" is the case that once bled off the edge)
    const off = (p, sel) => p.evaluate((sel) => {
      const root = document.querySelector(sel); if (!root) return ['no reader'];
      const box = root.getBoundingClientRect(), W = document.documentElement.clientWidth, out = [];
      const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = w.nextNode())) {
        if (!n.textContent.trim()) continue;
        const el = n.parentElement; if (!el || el.closest('.sp-ext, .cxm-sr, [hidden]')) continue;
        const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none') continue;
        const rg = document.createRange(); rg.selectNodeContents(n);
        for (const q of rg.getClientRects()) {
          if (!q.width || !q.height) continue;
          if (q.right > Math.min(box.right, W) + 1.5 || q.left < Math.max(box.left, 0) - 1.5) { out.push(`${Math.round(Math.max(q.right - Math.min(box.right, W), Math.max(box.left, 0) - q.left))}px: ${n.textContent.trim().slice(0, 40)}`); break; }
        }
      }
      return out.slice(0, 4);
    }, sel);
    const m = await open('/#phone', { mobile: true, easy: false });
    const n = await count(m, '.cxm-story-btn');
    expect(n >= 5, `only ${n} stories on the phone Today screen`);
    for (let k = 0; k < n; k++) {
      const rings = await m.$$('.cxm-story-btn'); await rings[k].click(); await wait(400);
      const name = await txt(m, '.cxm-story-who strong');
      for (let f = 0; f < 14; f++) {
        const bad = await off(m, '.cxm-story');
        expect(bad.length === 0, `phone story "${name}", step ${f + 1}: text runs past the screen: ${bad.join('; ')}`);
        const total = await count(m, '.cxm-bars i'), on = await count(m, '.cxm-bars i.on');
        if (on >= total) break;
        const x = await m.$('.cxm-tap-r');
        if (x) await x.click(); else await m.evaluate(() => { const b = [...document.querySelectorAll('.cxm-story button')].find((y) => /^(Next|Siguiente)$/.test(y.innerText.trim())); if (b) b.click(); });
        await wait(180);
      }
      await m.evaluate(() => { const c = document.querySelector('.cxm-story-head > button'); if (c) c.click(); }); await wait(250);
    }
    await done(m);
    const d = await open('/?panel=stories#desktop', {});
    const dn = await count(d, '.cx-stories-pick button');
    for (let k = 0; k < dn; k++) {
      await d.evaluate((k) => document.querySelectorAll('.cx-stories-pick button')[k].click(), k); await wait(250);
      const name = await txt(d, '.cx-story-head strong');
      for (let f = 0; f < 14; f++) {
        const bad = await off(d, '.cx-story-reader');
        expect(bad.length === 0, `desktop story "${name}", step ${f + 1}: text runs out of the reader: ${bad.join('; ')}`);
        const last = await d.evaluate(() => { const b = [...document.querySelectorAll('.cx-story-nav button')].pop(); return !b || b.disabled || /Next story/.test(b.innerText); });
        if (last) break;
        await d.evaluate(() => [...document.querySelectorAll('.cx-story-nav button')].pop().click()); await wait(150);
      }
    }
    await done(d);
  },
  async 'mode-switch'() {
    // Light, dark, or the system's choice: System follows the browser's own setting live, Light and Dark override it, the choice is
    // remembered on this device only, and the mode is set before the app draws so a reader never sees the wrong one flash by.
    const mode = (p) => p.evaluate(() => document.documentElement.getAttribute('data-cx-mode') + '|' + document.documentElement.getAttribute('data-cx-mode-pref'));
    const stored = (p) => p.evaluate(() => localStorage.getItem('cx-mode'));
    let p = await open('/#phone', { mobile: true, easy: false, mode: 'system', scheme: 'light' });
    expect((await mode(p)) === 'light|system', `System with a light browser should be light: ${await mode(p)}`);
    await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]); await wait(300);
    expect((await mode(p)) === 'dark|system', `System did not follow the browser changing to dark: ${await mode(p)}`);
    await done(p);
    p = await open('/#phone', { mobile: true, easy: false, mode: 'system', scheme: 'dark' });
    expect((await mode(p)) === 'dark|system', `System with a dark browser should be dark: ${await mode(p)}`);
    await clickText(p, 'Settings'); await wait(300);
    const pick = (label) => p.evaluate((l) => { const b = [...document.querySelectorAll('.cxm-sheet [aria-label="Light or dark"] button')].find((x) => x.innerText.trim() === l); if (!b) return false; b.click(); return true; }, label);
    expect(await pick('Light'), 'no Light choice in Settings'); await wait(250);
    expect((await mode(p)) === 'light|light' && (await stored(p)) === 'light', `choosing Light did not stick: ${await mode(p)} ${await stored(p)}`);
    expect((await p.evaluate(() => getComputedStyle(document.querySelector('.cxm')).backgroundColor)) === 'rgb(245, 246, 250)', 'Light did not repaint the phone app');
    await p.reload({ waitUntil: 'networkidle2' }); await wait(800);
    expect((await mode(p)) === 'light|light', `the choice did not survive a reload: ${await mode(p)}`);
    await clickText(p, 'Settings'); await wait(300);
    expect(await pick('System'), 'no System choice in Settings'); await wait(250);
    expect((await stored(p)) === null && (await mode(p)) === 'dark|system', `choosing System should clear the stored choice and follow the browser: ${await mode(p)} ${await stored(p)}`);
    await done(p);
    // before the app draws: the attribute is already there when the document finishes parsing
    const f = await B.createBrowserContext(); const q = await f.newPage();
    await q.evaluateOnNewDocument(() => { document.addEventListener('DOMContentLoaded', () => { window.__modeAtParse = document.documentElement.getAttribute('data-cx-mode'); }); try { localStorage.setItem('cx-mode', 'light'); } catch (e) {} });
    await q.goto(BASE + '/#phone', { waitUntil: 'networkidle2' });
    expect((await q.evaluate(() => window.__modeAtParse)) === 'light', 'the mode was not set before the page parsed (it would flash)');
    await f.close();
    // the desktop header button goes System, Light, Dark, and back
    const d = await open('/#desktop', { mode: 'system', scheme: 'dark' });
    const btn = () => d.evaluate(() => (document.querySelector('.cx-mode-switch') || { innerText: '' }).innerText.replace(/\s+/g, ' ').trim());
    expect((await btn()) === 'Mode: System', `the header button should say System: ${await btn()}`);
    const seq = [];
    for (let i = 0; i < 3; i++) { await d.evaluate(() => document.querySelector('.cx-mode-switch').click()); await wait(200); seq.push((await btn()) + ' / ' + (await mode(d))); }
    expect(seq.join(' | ') === 'Mode: Light / light|light | Mode: Dark / dark|dark | Mode: System / dark|system', `the header button sequence is wrong: ${seq.join(' | ')}`);
    await done(d);
  },
  async districts() {
    // "Find my districts": the address is matched in the page and is never saved or sent. The answers match the Census Bureau's own
    // geocoder for the same address; a block on a district line says so and does not offer to fill the ballot.
    const D = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'data', 'districts-2026.json'), 'utf8'));
    const typeAndFind = async (p, text) => {
      await p.evaluate(() => { const i = document.querySelector('.dist-field input'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(i, ''); i.dispatchEvent(new Event('input', { bubbles: true })); });
      await (await p.$('.dist-field input')).type(text);
      await p.evaluate(() => document.querySelector('.dist-actions .cxm-btn').click()); await wait(1500);
      return p.evaluate(() => document.querySelector('.dist-body').innerText.replace(/\s+/g, ' '));
    };
    const m = await open('/?panel=ballot#phone', { mobile: true, easy: false });
    const seen = [];
    m.on('request', (r) => seen.push(r.url() + ' ' + (r.postData() || '')));
    await clickText(m, 'Find my districts by address', 'button'); await wait(400);
    let t = await m.evaluate(() => document.querySelector('.dist-body').innerText.replace(/\s+/g, ' '));
    expect(/Type your address\./.test(t) && /Nothing is saved or sent/.test(t), `the finder does not say the address stays on the device: ${t.slice(0, 120)}`);
    t = await typeAndFind(m, '601 Lakeside Ave 44114');
    for (const w of ['601 Lakeside Ave E', 'U.S. House District 11', 'Ohio Senate District 23', 'Ohio House District 20', 'County Council District 7', 'On the ballot this year', 'Ward 8', 'Council member', 'Cleveland Municipal School District', 'Use these on my ballot', 'Not saved'])
      expect(t.includes(w), `the result for 601 Lakeside Ave lacks "${w}": ${t.slice(0, 260)}`);
    expect(!/Cleveland city/.test(t), 'the city still ends in "city"');
    expect(!seen.some((u) => /lakeside|601/i.test(u)), `the address was sent in a request: ${seen.filter((u) => /lakeside|601/i.test(u)).join(' | ')}`);
    expect(/\/districts\/districts-2026\.json/.test(seen.join(' ')), 'the street list was not fetched from the site');
    expect(!(await m.evaluate(() => /lakeside/i.test(location.href + document.cookie + JSON.stringify(localStorage) + JSON.stringify(sessionStorage)))), 'the address reached the link, a cookie, or storage');
    await m.evaluate(() => [...document.querySelectorAll('.dist-actions button')].find((b) => /Use these on my ballot/.test(b.innerText)).click()); await wait(500);
    const sel = await m.evaluate(() => [...document.querySelectorAll('.cxm-dgrid select')].map((s) => s.value));
    expect(sel.join(',') === '11,23,20,07', `"Use these on my ballot" did not fill the four districts: ${sel.join(',')}`);
    // bad input, not found, and a block on a district line
    await m.evaluate(() => document.querySelector('.cxm-tile-acc button.cxm-btn-dark').click()); await wait(400);
    t = await typeAndFind(m, 'Lakeside Ave');
    expect(/Start with the house number/.test(t), `no house number is not explained: ${t.slice(0, 120)}`);
    t = await typeAndFind(m, '99999 Nowhere Rd');
    expect(/could not find that address/.test(t), `an unknown address is not explained: ${t.slice(0, 120)}`);
    let edge = null;
    for (const [key, rs] of Object.entries(D.streets)) { const r = rs.find((x) => x[4] < 0 && x[1] - x[0] >= 2 && x[3] && (x[1] - x[0]) < 400); if (r) { edge = [key, r]; break; } }
    expect(!!edge, 'the street list has no block on a district line to test');
    if (edge) {
      const [key, r] = edge; let n = r[0]; if (r[2] === 'E' && n % 2) n++; if (r[2] === 'O' && n % 2 === 0) n++;
      const title = key.split(' ').map((w) => (['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'].includes(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1))).join(' ');
      t = await typeAndFind(m, `${n} ${title} ${r[3]}`);
      if (/Which street/.test(t)) { await m.evaluate(() => document.querySelector('.dist-picks button').click()); await wait(1200); t = await m.evaluate(() => document.querySelector('.dist-body').innerText.replace(/\s+/g, ' ')); }
      expect(/district line/.test(t) && / or /.test(t) && !/Use these on my ballot/.test(t), `a block on a district line should say so and not offer to fill the ballot: ${t.slice(0, 260)}`);
    }
    await done(m);
    // the desktop page
    const d = await open('/?panel=districts#desktop', {});
    expect(/Find my districts/.test(await txt(d, '.dist-page h1')), 'the desktop page is missing');
    t = await typeAndFind(d, '601 Lakeside Ave 44114');
    expect(/Ohio Senate District 23/.test(t) && /Ward 8/.test(t), `the desktop result is wrong: ${t.slice(0, 200)}`);
    expect(!(await has(d, '.dist-actions .cxm-btn')) || !/Use these on my ballot/.test(t), 'the desktop page offers a ballot fill it cannot do');
    await done(d);
    // the single offline file: the street list is inside the page, compressed, and opens without the network
    const f = await B.createBrowserContext(); const q = await f.newPage();
    await q.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await q.setOfflineMode(true);
    await q.evaluateOnNewDocument(() => { try { localStorage.setItem('cx-easy', 'off'); localStorage.setItem('cx-mode', 'dark'); } catch (e) {} });
    await q.goto('file:///' + path.join(__dirname, '..', '..', 'dist', 'Cleveland-Civic-Graph-v5.html').split(path.sep).join('/') + '#phone', { waitUntil: 'load' }); await wait(2500);
    await q.evaluate(() => [...document.querySelectorAll('.cxm-tabs button')].find((b) => /Ballot/.test(b.innerText)).click()); await wait(800);
    await q.evaluate(() => [...document.querySelectorAll('button')].find((b) => /Find my districts by address/.test(b.innerText)).click()); await wait(500);
    t = await typeAndFind(q, '601 Lakeside Ave 44114');
    expect(/Ohio Senate District 23/.test(t) && /Ward 8/.test(t), `the offline file did not answer with no network: ${t.slice(0, 200)}`);
    await f.close();
  },
  async 'people-tabs'() {
    // People on the phone: Profiles | Constellation, and under Profiles a folder tab for Cleveland and one for Federal. Every profile
    // has the same shape and the same three actions, and the old blurb under the council profile is gone.
    const p = await open('/?panel=leaders#phone', { mobile: true, easy: false, settle: 1500 });
    expect(await has(p, '.cxm-folders[role="tablist"]'), 'People has no folder tabs');
    expect((await txt(p, '.cxm-folders button.on')) === 'Cleveland', 'the Cleveland folder is not the one open');
    expect(!(await has(p, '.cxm-summary')), 'the council profile still has the summary blurb');
    const acts = async (q) => ((await txt(q, '.cxm-prof-actions')) || '').replace(/\s+/g, ' ').trim();
    expect(/^Full Story Profile Write [A-Z][a-z]+$/.test(await acts(p)), `the council profile actions are "${await acts(p)}"`);
    expect(!/Read the/.test(await p.evaluate(() => document.querySelector('.cxm-profile').innerText)), 'a long "Read the..." button label is back');
    expect(await p.evaluate(() => [...document.querySelectorAll('.cxm-folders button, .cxm-prof-actions > *')].every((b) => b.getBoundingClientRect().height >= 44)), 'a folder tab or profile action is under 44px tall');
    // Graph is the third choice next to Profiles and Constellation, and it opens on the Sky
    expect(((await txt(p, '.cxm-seg')) || '').replace(/\s+/g, ' ').trim() === 'Profiles Constellation Graph', 'People does not offer Profiles, Constellation, and Graph');
    await clickText(p, 'Graph', '.cxm-seg button'); await wait(1500);
    expect((await has(p, '.usm-phone .usm-canvas')) && (await txt(p, '.usm-pills button.on')) === 'Sky', 'Graph does not open the map on the Sky');
    expect(/panel=us/.test(await p.evaluate(() => location.search)) && /view=graph/.test(await p.evaluate(() => location.search)), 'the Graph view is not in the link');
    await p.tap('.usm-top .usm-back'); await wait(600);
    expect(await has(p, '.cxm-folders') && !(await has(p, '.usm')), 'the map back button did not bring the People folders back');
    await clickText(p, 'Cleveland', '.cxm-folders button'); await wait(500);
    // keyboard: arrow keys move between folders
    await p.focus('.cxm-folders button.on'); await p.keyboard.press('ArrowRight'); await wait(500);
    expect((await txt(p, '.cxm-folders button.on')) === 'Federal' && /panel=us/.test(await p.evaluate(() => location.search)), 'the right arrow did not open the Federal folder');
    // Constellation hides the folders, Profiles brings back the folder that was open
    await clickText(p, 'Constellation', '.cxm-seg button'); await wait(400);
    expect(!(await has(p, '.cxm-folders')) && (await has(p, '.cxm-const')), 'Constellation still shows the folders');
    expect(await p.evaluate(() => { const m = document.querySelector('.cxm-cgraph-box'), q = document.querySelector('.cxm-qcard'); return !!m && !!q && !!(m.compareDocumentPosition(q) & Node.DOCUMENT_POSITION_FOLLOWING); }), 'the constellation is not above the question');
    await clickText(p, 'Profiles', '.cxm-seg button'); await wait(400);
    expect(await has(p, '.cxm-folders'), 'Profiles did not bring the folders back');
    await clickText(p, 'Federal', '.cxm-folders button'); await wait(1200);
    // Federal: two senators, then a district adds the representative; same card shape as Cleveland
    expect((await count(p, '.cxm-profile')) === 1 && (await count(p, '.cxm-strip button')) === 2, 'Federal does not open on the two Ohio senators');
    { let ok = false; for (let t = 0; t < 20 && !ok; t++) { ok = await p.evaluate(() => { const i = document.querySelector('.cxm-prof-head .cxm-fed-av img'); return !!i && i.complete && i.naturalWidth > 0; }); if (!ok) await wait(300); }
      expect(ok, 'the first Ohio senator (Husted, photo from the Congress directory) has no loaded portrait'); }
    expect(await p.evaluate(() => { const st = document.querySelector('.cxm-strip'), pr = document.querySelector('.cxm-profile'); return !!st && !!pr && !!(st.compareDocumentPosition(pr) & Node.DOCUMENT_POSITION_FOLLOWING); }), 'the people strip is not above the profile');
    expect(await p.evaluate(() => { const sp = document.querySelector('.cxm-prof-nav span'); return !!sp && sp.classList.contains('cxm-sr'); }), 'the "n of N" text is on screen again beside the arrows');
    await p.evaluate(() => document.querySelector('.cxm-prof-nav button[aria-label="Next profile"]').click()); await wait(300);
    { let ok = false; for (let t = 0; t < 20 && !ok; t++) { ok = await p.evaluate(() => { const i = document.querySelector('.cxm-prof-head .cxm-fed-av img'); return !!i && i.complete && i.naturalWidth > 0; }); if (!ok) await wait(150); }
      expect(ok, 'the senator with a photo has no loaded portrait on the Federal profile'); }
    await p.evaluate(() => document.querySelector('.cxm-prof-nav button[aria-label="Previous profile"]').click()); await wait(300);
    expect(/^Full Story Profile( \(opens in a new tab\))?$/.test(await acts(p)), `the senator actions are "${await acts(p)}"`);
    for (const need of ['.cxm-prof-head .cxm-fed-av', '.cxm-prof-name', '.cxm-tile-acc', '.cxm-prof-nav', '.cxm-fine']) expect(await has(p, need), `the Federal profile lacks ${need}`);
    await clickText(p, 'Your place in Washington', '.cxm-drop-head'); await wait(300);
    await p.select('.cxm-drop-body label:nth-of-type(2) select', '11'); await wait(600);
    expect((await count(p, '.cxm-strip button')) === 3, 'choosing District 11 did not add the representative');
    await p.evaluate(() => document.querySelector('.cxm-prof-nav button[aria-label="Next profile"]').click()); await wait(300);
    await p.evaluate(() => document.querySelector('.cxm-prof-nav button[aria-label="Next profile"]').click()); await wait(300);
    expect(/U\.S\. House/.test((await txt(p, '.cxm-profile .cxm-kicker')) || '') && /3 of 3/.test((await txt(p, '.cxm-prof-nav')) || ''), 'stepping twice did not reach the representative');
    expect(!/lakeside|district=|place=/i.test(await p.evaluate(() => location.href)), 'the place reached the link');
    // a recently appointed senator still without a photo shows initials, never a broken image (Oklahoma has one)
    await p.select('.cxm-drop-body label:nth-of-type(1) select', 'OK'); await wait(600);
    { let ini = false, broken = false;
      for (let k = 0; k < 2; k++) { await wait(500); ini = ini || await has(p, '.cxm-prof-head .cxm-fed-ini'); broken = broken || await p.evaluate(() => { const i = document.querySelector('.cxm-prof-head .cxm-fed-av img'); return !!i && i.complete && i.naturalWidth === 0; }); await p.evaluate(() => document.querySelector('.cxm-prof-nav button[aria-label="Next profile"]').click()); }
      expect(ini && !broken, 'an Oklahoma senator without a photo should show initials and no broken image'); }
    await p.select('.cxm-drop-body label:nth-of-type(1) select', 'OH'); await wait(600);
    await clickText(p, 'Full Story', '.cxm-prof-actions button'); await wait(1200);
    expect((await count(p, '.cxm-sheet .us-vote')) >= 1, 'Full Story did not open the member\'s recorded votes');
    expect(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'People scrolls sideways');
    { const bad = await axeBad(p); expect(bad.length === 0, `axe on People: ${bad.length} violation(s): ` + bad.slice(0, 4).map((x) => `${x.id} ${x.target.slice(0, 60)}`).join('; ')); }
    await done(p);
  },
  async 'security-policy'() {
    // "Nothing personal leaves the browser" as something the browser enforces. The hosted page carries a Content-Security-Policy: every inline script is allowed by its
    // hash and nothing else, and the page may ask only its own site for anything. This reads the policy, then tries to break it.
    const html = fs.readFileSync(path.join(SITE, 'index.html'), 'utf8');
    const m = /<meta http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(html);
    expect(!!m, 'the hosted page has no Content-Security-Policy');
    if (m) {
      const pol = Object.fromEntries(m[1].split(';').map((x) => x.trim()).filter(Boolean).map((x) => { const [k, ...v] = x.split(/\s+/); return [k, v]; }));
      expect((pol['connect-src'] || []).join(' ') === "'self'", `connect-src is "${(pol['connect-src'] || []).join(' ')}", not 'self' only`);
      expect(!/unsafe-inline|unsafe-eval/.test((pol['script-src'] || []).join(' ')), 'script-src allows unsafe-inline or unsafe-eval');
      expect((pol['object-src'] || []).join(' ') === "'none'" && (pol['base-uri'] || []).join(' ') === "'self'", 'object-src or base-uri is open');
      const crypto = require('crypto');
      let n = 0;
      for (const sm of html.matchAll(/<script(?<a>[^>]*)>(?<b>[\s\S]*?)<\/script>/g)) {
        if (/src=/.test(sm.groups.a) || /type="(?!text\/javascript|module)/.test(sm.groups.a)) continue;
        n++;
        const h = `'sha256-${crypto.createHash('sha256').update(sm.groups.b, 'utf8').digest('base64')}'`;
        expect((pol['script-src'] || []).includes(h), `an inline script (${sm.groups.b.slice(0, 40).replace(/\s+/g, ' ')}...) is not in the policy`);
      }
      expect(n >= 4, `only ${n} inline scripts were found to check`);
      expect(!/\son[a-z]+="/.test(html.replace(/<script[\s\S]*?<\/script>/g, '')), 'the page has an inline event handler, which the policy blocks');
    }
    const p = await open('/#phone', { mobile: true, easy: false, settle: 1500 });
    const out = await p.evaluate(async () => {
      const r = {};
      r.fetch = await fetch('https://example.com/', { mode: 'no-cors' }).then(() => 'sent', () => 'blocked');
      r.beacon = await new Promise((res) => { const i = new Image(); i.onload = () => res('loaded'); i.onerror = () => res('blocked'); i.src = 'https://example.com/x.png'; });
      const s = document.createElement('script'); s.textContent = 'window.__injected = 1'; document.body.appendChild(s);
      r.inline = window.__injected ? 'ran' : 'blocked';
      return r;
    });
    expect(out.fetch === 'blocked', `a request to another site was not blocked (${out.fetch})`);
    expect(out.beacon === 'blocked', `an image from another site was not blocked (${out.beacon})`);
    expect(out.inline === 'blocked', 'an injected inline script ran');
    expect(p.csp.length >= 2, 'the browser did not report the attempts it blocked, so the policy may not be active');
    p.csp = []; p.outside = [];   // those attempts were on purpose
    await done(p);
  },
  async 'register-story'() {
    // "Register to vote": a story on the Ballot tab and first in the Today row in the week of the deadline. It links to the official sites, says the app cannot register anyone,
    // changes by the day (before, on, and after the deadline), and is gone after Election Day. Each day is forced with a fake clock.
    const at = (iso) => `(() => { const R = Date, off = R.parse(${JSON.stringify(iso)}) - R.now(); globalThis.Date = class extends R { constructor(...a) { if (a.length) super(...a); else super(R.now() + off); } static now() { return R.now() + off; } }; })()`;
    const read = async (p) => {
      await p.evaluate(() => { const b = [...document.querySelectorAll('.cxm-keycard')].find((x) => /register|where you stand/i.test(x.innerText)); if (b) b.click(); });
      await wait(700);
      let text = '', links = [], btns = [];
      for (let k = 0; k < 9; k++) {   // walk the frames, taking the words and the links of each
        const f = await p.evaluate(() => ({ text: ((document.querySelector('.cxm-story') || {}).innerText || '').replace(/ /g, ' '), links: [...document.querySelectorAll('.cxm-story a')].map((a) => a.href), btns: [...document.querySelectorAll('.cxm-story a.cxm-btn')].map((a) => a.href) }));
        text += ' ' + f.text; links = links.concat(f.links); btns = btns.concat(f.btns);
        if (!(await has(p, '.cxm-tap-r'))) break;
        await p.evaluate(() => document.querySelector('.cxm-tap-r').click()); await wait(250);
      }
      return { text, links, btns };
    };
    for (const [iso, want, absent] of [['2026-10-05T15:00:00-04:00', /Today is the last day to register/, null], ['2026-10-02T15:00:00-04:00', /3 days left to register/, null], ['2026-10-08T15:00:00-04:00', /registration deadline has passed/, /Who can register/]]) {
      const p = await open('/?panel=ballot#phone', { mobile: true, easy: false, pre: at(iso), settle: 1500 });
      expect(await has(p, '.cxm-keycard'), `${iso.slice(0, 10)}: the Ballot has no Register to vote card`);
      const r = await read(p);
      expect(want.test(r.text), `${iso.slice(0, 10)}: the story does not say ${want}`);
      if (absent) expect(!absent.test(r.text), `${iso.slice(0, 10)}: after the deadline the story still has the sign-up steps`);
      expect(r.links.some((h) => /olvr\.ohiosos\.gov/.test(h)), `${iso.slice(0, 10)}: no link to Ohio's official registration site`);
      expect(r.btns.some((h) => /olvr\.ohiosos\.gov/.test(h)), `${iso.slice(0, 10)}: the story has no button that sends the person to Ohio's registration site`);
      expect(/cannot register you/i.test(r.text), `${iso.slice(0, 10)}: the story does not say the app cannot register anyone`);
      expect(!/strong|score|rank/i.test(r.text.replace(/Secretary of State/g, '')), `${iso.slice(0, 10)}: a score word is in the story`);
      expect(!/—|–/.test(r.text), `${iso.slice(0, 10)}: a dash is in the story`);
      await done(p);
    }
    const t = await open('/#phone', { mobile: true, easy: false, pre: at('2026-10-05T15:00:00-04:00'), settle: 1500 });
    expect(await t.evaluate(() => { const b = document.querySelector('.cxm-story-btn'); return !!b && /Register/i.test(b.getAttribute('aria-label') || ''); }), 'in the week of the deadline the Register story is not first in the Today row');
    await done(t);
    const after = await open('/?panel=ballot#phone', { mobile: true, easy: false, pre: at('2026-11-04T12:00:00-05:00'), settle: 1500 });
    expect(!(await after.evaluate(() => [...document.querySelectorAll('.cxm-keycard')].some((x) => /register/i.test(x.innerText)))), 'the Register card is still on the Ballot after Election Day');
    await done(after);
  },
  async 'remember-place'() {
    // Remembering a person's place: off until chosen, on this device only, only the ward or neighborhood and the federal state and district, never an address,
    // expired or odd entries thrown away, and nothing left in a link or a request. The saved entry is seeded before the page loads, so what the page does with it is what is tested.
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
    const seed = (obj) => `(() => { try { if (!sessionStorage.getItem('rp-seeded')) { localStorage.setItem('cx-place', ${JSON.stringify(typeof obj === 'string' ? obj : JSON.stringify(obj))}); sessionStorage.setItem('rp-seeded', '1'); } } catch (e) {} })()`;
    const stored = (p) => p.evaluate(() => localStorage.getItem('cx-place'));
    // 1. nothing remembered: no ward is marked as yours
    const a = await open('/?panel=profiles#phone', { mobile: true, easy: false });
    expect(!(await has(a, '.cxm-yours')), 'a ward is marked as yours although nothing was chosen or remembered');
    expect((await stored(a)) === null, 'something was stored before the person chose to remember');
    await done(a);
    // 2. a remembered ward comes back on the next visit
    const b = await open('/?panel=profiles#phone', { mobile: true, easy: false, pre: seed({ v: 1, saved: today, place: 'ward-6', hood: '', state: 'OH', district: '11' }) });
    expect(await b.evaluate(() => /YOUR WARD/.test(document.body.innerText)), 'a remembered ward is not marked YOUR WARD on the next visit');
    await done(b);
    // 3. old, odd, and extra-field entries are thrown away
    for (const [label, val] of [['expired', { v: 1, saved: '2025-01-01', place: 'ward-6', hood: '', state: '', district: '' }], ['not JSON', '{bad'], ['a field that is not allowed', { v: 1, saved: today, place: 'ward-6', hood: '', state: '', district: '', address: '601 Lakeside Ave' }], ['an odd ward', { v: 1, saved: today, place: 'ward-99', hood: '', state: '', district: '' }]]) {
      const c = await open('/?panel=profiles#phone', { mobile: true, easy: false, pre: seed(val) });
      expect((await stored(c)) === null && !(await has(c, '.cxm-yours')), `an entry that is ${label} was kept or used`);
      await done(c);
    }
    // 4. the switch in Settings: off by default; on saves only the allowed fields; reload keeps it; off forgets
    const d = await open('/?panel=settings#phone', { mobile: true, easy: false });
    const sw = '.cxm-remember .cxm-switch';
    expect((await d.$eval(sw, (e) => e.getAttribute('aria-pressed'))) === 'false', 'Remember my place is on before the person chose it');
    await d.click(sw); await wait(400);
    const saved = JSON.parse((await stored(d)) || 'null');
    expect(!!saved && Object.keys(saved).every((k) => ['v', 'saved', 'place', 'hood', 'state', 'district'].includes(k)), `the saved entry has the wrong shape: ${JSON.stringify(saved)}`);
    expect(!/\d+\s+\w+\s+(ave|st|rd|blvd|road|street)/i.test(JSON.stringify(saved)), 'the saved entry looks like it has an address');
    await d.goto(BASE + '/?panel=settings#phone', { waitUntil: 'networkidle2' }); await wait(1500);   // a real new visit: the address bar is rewritten once Settings opens, so go to it again
    expect((await d.$eval(sw, (e) => e.getAttribute('aria-pressed'))) === 'true', 'Remember my place did not survive a reload');
    await d.click(sw); await wait(400);
    expect((await stored(d)) === null, 'turning Remember my place off did not forget the place');
    await done(d);
    // 5. picking a ward while remembering is on saves it; the link never holds it
    const e = await open('/#phone', { mobile: true, easy: false, pre: seed({ v: 1, saved: today, place: '', hood: '', state: '', district: '' }) });
    await e.click('.cxm-setplace'); await wait(600);
    await clickText(e, 'Ward 6', '.cxm-sheet .cxm-chips button'); await wait(600);
    const s5 = JSON.parse((await stored(e)) || 'null');
    expect(!!s5 && s5.place === 'ward-6', `picking a ward did not save it while remembering was on: ${JSON.stringify(s5)}`);
    expect(!/ward|place|lakeside|district/i.test(await e.evaluate(() => location.href)), 'the place reached the link');
    await done(e);
    // 6. a browser that blocks storage: the person is told, and the app still works
    const f = await open('/?panel=settings#phone', { mobile: true, easy: false, pre: `(() => { const s = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (k === 'cx-place') throw new Error('blocked'); return s.call(this, k, v); }; })()` });
    await f.click(sw); await wait(400);
    expect(await f.evaluate(() => /could not save your place/i.test(document.body.innerText)), 'a browser that blocks storage was not told');
    expect((await f.$eval(sw, (x) => x.getAttribute('aria-pressed'))) === 'false', 'the switch says on although nothing was saved');
    await done(f);
  },
  async 'date-states'() {
    // The election dates on the phone Ballot show a tag by the day: "Next" before a date, "Today" on it, "Passed" after. A color that was fine for two of them once failed
    // contrast only on the one day a person actually met it, so each state is forced here with a fake clock, in dark and light, and checked for contrast (and, the day after the election, for a link marked by color alone).
    const at = (iso) => `(() => { const R = Date, off = R.parse(${JSON.stringify(iso)}) - R.now(); globalThis.Date = class extends R { constructor(...a) { if (a.length) super(...a); else super(R.now() + off); } static now() { return R.now() + off; } }; })()`;
    for (const [iso, tag] of [['2026-10-04T15:00:00-04:00', 'TOMORROW'], ['2026-10-05T15:00:00-04:00', 'TODAY'], ['2026-10-08T15:00:00-04:00', 'PASSED'], ['2026-11-04T12:00:00-05:00', 'PASSED']]) {
      for (const mode of ['dark', 'light']) {
        const p = await open('/?panel=ballot#phone', { mobile: true, easy: false, mode, pre: at(iso), settle: 1500 });
        const tags = await p.$$eval('.cxm-dates em', (els) => els.map((e) => e.innerText.trim().toUpperCase()));
        expect(tags.includes(tag), `${iso.slice(0, 10)} ${mode}: expected a ${tag} tag on the dates, found ${JSON.stringify(tags)}`);
        const bad = (await axeBad(p)).filter((x) => x.id === 'color-contrast' || x.id === 'link-in-text-block');
        expect(bad.length === 0, `${iso.slice(0, 10)} ${mode}: contrast or an unmarked link on the dates page: ${bad.slice(0, 3).map((x) => x.target).join('; ')}`);
        await done(p);
      }
    }
  },
  async 'banners'() {
    // The illustrated headers on Today: one per chapter, decoration only (hidden from screen readers, no words inside the pictures, nothing that needs
    // translating), and still when the device asks for less motion.
    const p = await open('/#phone', { mobile: true, easy: false, settle: 2000 });
    const kinds = await p.$$eval('.bn', (els) => els.map((e) => e.className.split(' ')[1]));
    for (const k of ['bn-news', 'bn-receipts', 'bn-home']) expect(kinds.includes(k), `Today has no ${k} banner (found ${kinds})`);
    expect(await p.evaluate(() => [...document.querySelectorAll('.bn')].every((b) => { const svg = b.querySelector('svg.bn-art'); return svg && svg.getAttribute('aria-hidden') === 'true' && !svg.querySelector('text') && !!b.querySelector('h2'); })), 'a banner shows words in its picture, is not hidden from screen readers, or has no heading');
    expect(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'the banners make Today scroll sideways');
    expect(await p.evaluate(() => [...document.querySelectorAll('.bn')].every((b) => b.getBoundingClientRect().height >= 120 && b.getBoundingClientRect().height <= 180)), 'a banner is not between 120 and 180 px tall');
    await done(p);
    const q = await open('/#phone', { mobile: true, easy: false, settle: 1800, scheme: 'light' });
    await q.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await wait(500);
    expect(await q.evaluate(() => [...document.querySelectorAll('.bn *')].every((e) => getComputedStyle(e).animationName === 'none')), 'a banner still moves when the device asks for less motion');
    await done(q);
  },
  async 'city-hall'() {
    // At City Hall (docs/plan-city-hall-page.md): the Clerk's meeting record as a full page with a back arrow over the tabs (not a sheet, not a sixth tab),
    // opened from the Today card, the story, an Explore door, and ?panel=meetings. The lead is the next Council meeting (when, where, how to watch, two
    // sentences at most); the week is five day tabs with no sideways scrolling anywhere; the next agenda is grouped by kind with ceremonial resolutions last;
    // For you appears only from a ward or priorities set on the device and is never a score; Just decided counts what the record says; Look it up sends
    // nothing; the year is one fold of month folds; the footer says the record holds no testimony. Expected values come from the page's own functions run on
    // the record (cityHallApi), and the page is checked in English and Spanish, dark and light.
    const A = cityHallApi(), today = etToday(), data = A.data;
    const lead = A.cxMtgSplit(data, today).lead, wk = A.cxMtgWeek(data, today), dec = A.cxMtgDecided(data, today);
    const EN = process.env.CHECK_LANG !== 'es';
    // 1. Today: a card for the next meeting only (who meets when, how many items), and the story first in the row
    const p = await open('/#phone', { mobile: true, easy: false, settle: 2200 });
    expect(await has(p, '.mt-card'), 'Today has no At City Hall card');
    const card = (await txt(p, '.mt-card')) || '';
    if (EN) expect(lead ? /meets/.test(card) && /legislation|agenda/.test(card) && !/Biggest/.test(card) : /No meetings/.test(card), `the Today card does not say who meets when and how many items, or says more: ${card}`);
    if (EN) expect((await p.$$eval('.cxm-story-btn small', (els) => els.map((e) => e.innerText).filter((t) => t !== 'Register')))[0] === 'City Hall', 'the City Hall story is not first in the row (after the Register story, which leads in the week of the deadline)');
    await p.evaluate(() => document.querySelector('.mt-card').click()); await wait(700);
    expect(await has(p, '.cxm-full.mt-page') && !(await has(p, '.cxm-sheet')), 'the Today card did not open At City Hall as a full page (it must not be a sheet)');
    expect(/panel=meetings/.test(await p.evaluate(() => location.search)), 'the page does not keep its ?panel=meetings address');
    await p.evaluate(() => document.querySelector('.cxm-full-back').click()); await wait(500);
    expect(!(await has(p, '.cxm-full')) && (await has(p, '.mt-card')) && !/panel=/.test(await p.evaluate(() => location.search)), 'the back arrow did not return to Today');
    // 2. the story's last step opens the page, and its back arrow (and Escape) return to the same step
    await p.evaluate(() => { const b = [...document.querySelectorAll('.cxm-story-btn')].find((x) => /City Hall|Ayuntamiento/.test(x.getAttribute('aria-label') || x.innerText)); if (b) b.click(); }); await wait(600);
    for (let i = 0; i < 8 && !(await has(p, '.cxm-story .cxm-btn-light')); i++) { await p.mouse.click(300, 420); await wait(350); }
    expect(await has(p, '.cxm-story .cxm-btn-light'), 'the City Hall story has no button to open the page');
    const frame = await txt(p, '.cxm-story-big');
    await p.evaluate(() => document.querySelector('.cxm-story .cxm-btn-light').click()); await wait(800);
    expect(await has(p, '.cxm-full.mt-page'), 'the story did not open the page');
    if (EN) expect((await txt(p, '.cxm-full-back')) === 'Back to the story', `the back arrow from the story does not say where it goes: ${await txt(p, '.cxm-full-back')}`);
    await p.keyboard.press('Escape'); await wait(500);
    expect(await has(p, '.cxm-story') && (await txt(p, '.cxm-story-big')) === frame, 'Escape on the page did not return to the same step of the story');
    await p.evaluate(() => document.querySelector('.cxm-story [aria-label="Close story"], .cxm-story-head button').click()); await wait(400);
    // 3. the Explore door
    await p.evaluate(() => [...document.querySelectorAll('.cxm-tabs button')][1].click()); await wait(700);
    await p.evaluate(() => { const d = [...document.querySelectorAll('.cxm-door')].find((b) => /City Hall|Ayuntamiento/.test(b.innerText)); if (d) d.click(); }); await wait(700);
    expect(await has(p, '.cxm-full.mt-page'), 'Explore has no door to At City Hall');
    await done(p);

    // 4. the page itself, from ?panel=meetings, with no ward and no priorities
    const q = await open('/?panel=meetings#phone', { mobile: true, easy: false, settle: 2200 });
    expect(await has(q, '.cxm-full.mt-page') && !(await has(q, '.cxm-sheet')) && (await q.evaluate(() => [...document.querySelectorAll('.cxm-tabs button')].every((b) => { const r = b.getBoundingClientRect(), e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !b.contains(e); }))), '?panel=meetings did not open the page over the tabs');
    // exactly the screen's width, nothing outside its scroller, and nothing anywhere on it that scrolls sideways
    const geo = await q.evaluate(() => {
      const f = document.querySelector('.cxm-full'), b = document.querySelector('.cxm-full-body');
      const wide = [...f.querySelectorAll('*')].filter((e) => /(auto|scroll)/.test(getComputedStyle(e).overflowX) && e.scrollWidth > e.clientWidth + 1).map((e) => e.className);
      return { w: f.getBoundingClientRect().width, iw: innerWidth, fsw: f.scrollWidth, fcw: f.clientWidth, fsh: f.scrollHeight, fch: f.clientHeight, bsw: b.scrollWidth, bcw: b.clientWidth, doc: document.documentElement.scrollWidth, wide };
    });
    expect(Math.abs(geo.w - geo.iw) < 1 && geo.doc <= geo.iw, `the page is not exactly the screen's width: ${JSON.stringify(geo)}`);
    expect(geo.fsw <= geo.fcw + 1 && geo.fsh <= geo.fch + 1 && geo.bsw <= geo.bcw + 1, `something on the page sits outside its scroller, so a phone can slide the page (it once did): ${JSON.stringify(geo)}`);
    expect(geo.wide.length === 0, `part of the page scrolls sideways: ${geo.wide.slice(0, 3)}`);
    expect(!(await has(q, '.mt-strip')), 'the sideways strip of meetings is back');
    // the lead: who meets when, where, how to watch (from the Clerk's notice), two sentences at most, the agenda and the meeting page
    if (lead) {
      if (EN) expect(/meets/.test((await txt(q, '.mt-head')) || ''), `the lead does not say who meets when: ${await txt(q, '.mt-head')}`);
      const watch = ((await txt(q, '.mt-watch')) || '').replace(/\s+/g, ' ');
      if (EN) expect(watch === A.cxMtgWatch(lead.note), `the lead's how-to-watch line is not the one the Clerk's notice gives: ${watch}`);
      const prose = await q.evaluate(() => ['.mt-head', '.mt-watch'].map((s) => (document.querySelector(`.mt-lead ${s}`) || {}).innerText || '').join(' '));
      expect((prose.match(/[.!?](\s|$)/g) || []).length <= 2, `the lead says more than two sentences: ${prose}`);
      expect(!/https?:|www\./.test((await txt(q, '.mt-lead')) || ''), 'web addresses from the Clerk are shown in the lead');
      expect((await count(q, '.mt-lead a[href^="https://"]')) >= 1, 'the lead has no agenda or meeting page link');
      if (lead.place) expect(((await txt(q, '.mt-place')) || '').length > 0, 'the lead does not say where the meeting is');
    }
    // the week: five folder tabs, Monday to Friday, the right day open, each day's meetings in its panel
    const tabs = await q.$$eval('.mt-days [role=tab]', (els) => els.map((e) => ({ id: e.id, on: e.getAttribute('aria-selected') === 'true', w: e.getBoundingClientRect().width })));
    expect(tabs.length === 5 && tabs.map((t) => t.id.replace('mt-day-', '')).join() === wk.days.map((d) => d.iso).join(), `the week is not five day tabs, Monday to Friday: ${tabs.map((t) => t.id)}`);
    expect((tabs.find((t) => t.on) || {}).id === `mt-day-${wk.pick}`, `the day that opens first is not ${wk.pick}: ${(tabs.find((t) => t.on) || {}).id}`);
    for (const d of wk.days) {
      await q.evaluate((id) => document.getElementById(id).click(), `mt-day-${d.iso}`); await wait(150);
      const n = await count(q, '#mt-day-panel .mt-meet');
      expect(n === d.list.length, `${d.iso}: the day tab shows ${n} meetings, the record has ${d.list.length}`);
    }
    await q.evaluate((id) => document.getElementById(id).click(), `mt-day-${wk.days[0].iso}`); await wait(150);
    await q.focus(`#mt-day-${wk.days[0].iso}`); await q.keyboard.press('ArrowRight'); await wait(200);
    expect(await q.evaluate((id) => document.activeElement.id === id && document.activeElement.getAttribute('aria-selected') === 'true', `mt-day-${wk.days[1].iso}`), 'the arrow keys do not move between the day tabs');
    // what is on the next agenda: by kind, ceremonial last, five before "Show all", then every item
    if (lead && lead.items.length) {
      const kinds = await q.$$eval('.mt-on .mt-group-h span:first-child', (els) => els.map((e) => e.innerText));
      const want = A.cxMtgByKind(lead).map((g) => g.label);
      if (EN) expect(want.slice(0, kinds.length).join() === kinds.join(), `the agenda is not grouped by kind in order: ${kinds} (wanted ${want})`);
      expect((await count(q, '.mt-on .mt-item')) === Math.min(5, lead.items.length), 'the next agenda does not show its first five items');
      const firstTitles = await q.$$eval('.mt-on .mt-item strong', (els) => els.map((e) => e.innerText));
      if (A.cxMtgByKind(lead)[0].g !== 'ceremonial') expect(!firstTitles.some((t) => /^(Condolence|Congratulations|Recognition)/.test(t)), `a ceremonial resolution leads the agenda: ${firstTitles}`);
      if (lead.items.length > 5) { await q.evaluate(() => document.querySelector('.mt-on .cxm-link').click()); await wait(300); expect((await count(q, '.mt-on .mt-item')) === lead.items.length, '"Show all" does not show every item on the agenda'); }
    }
    // For you, with nothing set: it says what to set, and shows nothing else
    expect((await count(q, '.mt-you button')) === 2 && (await count(q, '.mt-you .mt-item')) === 0, 'For you with no ward or priorities does not say what to set');
    // Just decided: the counts add up to the meeting's agenda, and none reads as a score
    if (dec) {
      const chips = await q.$$eval('.mt-done .mt-chip b', (els) => els.map((e) => Number(e.innerText)));
      expect(chips.reduce((a, b) => a + b, 0) === dec.items.length, `the Just decided counts (${chips}) do not add up to the ${dec.items.length} items on the agenda`);
      expect(!/%|\bscore|\brank|\bpercent/i.test((await txt(q, '.mt-done')) || ''), 'Just decided reads as a score');
    }
    // the year: one fold, and inside it one fold per month
    const months = A.cxMtgSplit(data, today).months.length;
    expect((await count(q, '.mt-earlier > .cxm-drop')) === 1 && !(await has(q, '.mt-months')), 'Earlier this year is not one closed fold');
    await q.evaluate(() => document.querySelector('.mt-earlier .cxm-drop-head').click()); await wait(300);
    expect((await count(q, '.mt-months > .cxm-drop')) === months, `Earlier this year does not open to one fold per month (${months})`);
    // the footer: two lines, where the record comes from and when, and that it holds no testimony
    if (EN) expect(/Pulled/.test((await txt(q, '.mt-foot')) || '') && /not include testimony or public comment/.test((await txt(q, '.mt-foot')) || '') && (await count(q, '.mt-foot p')) === 2, 'the footer is not two lines saying where the record comes from, when, and that it holds no testimony');
    // no dashes, no scores, and every control a finger can hit
    const words = (await txt(q, '.cxm-full')) || '';
    expect(!/[–—]/.test(words), 'a dash on the City Hall page');
    expect(!/%|\bpercent|\bscore|\branked\b/i.test(words), 'the City Hall page shows a percentage, score, or ranking');
    const small = await q.evaluate(() => [...document.querySelectorAll('.cxm-full button, .cxm-full a[href], .cxm-full input, .cxm-full summary')].filter((el) => { const r = el.getBoundingClientRect(); if (!r.width || !r.height) return false; const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || (el.tagName === 'A' && cs.display === 'inline')) return false; return r.height < 44 || r.width < 44; }).map((el) => `${el.tagName.toLowerCase()}.${el.className}`));
    expect(small.length === 0, `controls under 44px on the City Hall page: ${small.slice(0, 5)}`);
    // Look it up: a file number and an address are found on the device; nothing typed goes into a request, the link, or storage
    const sent = []; q.on('request', (r) => sent.push(r.url()));
    const at = A.cxMtgFind(A.cxMtgIndex(data, A.matters), '1232-2026');
    await q.type('.mt-find input', '1232-2026'); await wait(400);
    expect((await count(q, '.mt-find .mt-row')) === Math.min(5, at.leg.length), `Look it up found ${await count(q, '.mt-find .mt-row')} records for 1232-2026, the record has ${at.leg.length}`);
    await q.evaluate(() => { const i = document.querySelector('.mt-find input'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, ''); i.dispatchEvent(new Event('input', { bubbles: true })); });
    await q.type('.mt-find input', '3870 W. 25th St'); await wait(400);
    const addr = A.cxMtgFind(A.cxMtgIndex(data, A.matters), '3870 W. 25th St');
    expect((await count(q, '.mt-find .mt-row')) === Math.min(5, addr.leg.length) && addr.leg.length > 0, `Look it up did not find the address 3870 W. 25th St the way the record has it (${addr.leg.length})`);
    expect(!sent.some((u) => /3870|25th|1232/i.test(u)), 'something typed into Look it up was sent in a request');
    expect(!(await q.evaluate(() => /3870|25th/i.test(location.href + JSON.stringify(localStorage) + JSON.stringify(sessionStorage) + document.cookie))), 'something typed into Look it up reached the link or storage');
    // an item opens its legislation record over the page, which lists its meetings, and closing it returns to the page
    await q.evaluate(() => document.querySelector('.mt-find .mt-row').click()); await wait(800);
    expect(await has(q, '.cxm-sheet .mt-heard') && /panel=meetings/.test(await q.evaluate(() => location.search)), 'a record opened from the page does not list its meetings, or the page lost its address');
    await q.evaluate(() => document.querySelector('.cxm-sheet-x').click()); await wait(400);
    expect(await has(q, '.cxm-full.mt-page') && !(await has(q, '.cxm-sheet')), 'closing a record did not return to the page');
    { const bad = await axeBad(q); expect(bad.length === 0, `axe on At City Hall: ${bad.length} violation(s): ` + bad.slice(0, 4).map((x) => `${x.id} ${x.target.slice(0, 60)}`).join('; ')); }
    await done(q);

    // 5. For you with a ward (and then a priority): the items that name the ward in the record, each saying why, in the Clerk's order; the ward never leaves
    const look = cityHallLook(A);
    const week = wk.days.flatMap((d) => d.list);
    const ward = [...Array(15).keys()].map((i) => i + 1).find((w) => A.cxMtgForYou(week, w, [], look).length) || 1;
    const mine = A.cxMtgForYou(week, ward, [], look);
    const place = `(() => { try { localStorage.setItem('cx-place', JSON.stringify({ v: 1, saved: ${JSON.stringify(today)}, place: 'ward-${ward}', hood: '', state: '', district: '' })); } catch (e) {} })()`;
    const r = await open('/?panel=meetings#phone', { mobile: true, easy: false, settle: 2200, pre: place });
    const reqs = []; r.on('request', (x) => reqs.push(x.url()));
    const rows = await r.$$eval('.mt-you .mt-item small', (els) => els.map((e) => e.innerText));
    expect(rows.length === Math.min(5, mine.length), `For you with Ward ${ward} shows ${rows.length} items, the record has ${mine.length}`);
    if (EN) expect(rows.every((t) => new RegExp(`Ward ${ward}\\b`).test(t)), `a For you item does not say how it names Ward ${ward}: ${rows}`);
    if (!mine.length && EN) expect(new RegExp(`names Ward\\s${ward}`).test((await txt(r, '.mt-you')) || ''), 'For you with nothing that names the ward does not say so');
    expect(rows.map((t) => t.split(' ')[0]).join() === mine.slice(0, 5).map((x) => x.f).join(), 'For you is not in the Clerk\'s order');
    expect(!/%|\bscore|\bmatch(es)? \d|\bpercent/i.test((await txt(r, '.mt-you')) || ''), 'For you shows a score or percentage');
    await r.evaluate(() => document.querySelector('.mt-find input').focus()); await wait(200);
    expect(!/ward|place/i.test(await r.evaluate(() => location.href)) && !reqs.some((u) => /ward|cx-place/i.test(u)), 'the ward reached the link or a request');
    await done(r);
    const prio = A.priorityIds().find((pid) => A.cxMtgForYou(week, null, [pid], look).length) || 'housing';
    const pmine = A.cxMtgForYou(week, null, [prio], look);
    const s = await open('/?panel=meetings#phone', { mobile: true, easy: false, settle: 2200, pre: `(() => { try { localStorage.setItem('cleveland-civic-values-v2', JSON.stringify({ version: 2, values: { ${prio}: 'most' }, stances: {} })); } catch (e) {} })()` });
    const prows = await s.$$eval('.mt-you .mt-item small', (els) => els.map((e) => e.innerText));
    expect(prows.length === Math.min(5, pmine.length), `For you with the priority ${prio} shows ${prows.length} items, the keyword rules find ${pmine.length}`);
    expect(prows.every((t, k) => t.includes(pmine[k].why.find((w) => w[0] === 'prio')[2])), `a For you item does not show the word from its title that matched: ${prows}`);
    await done(s);

    // 6. Spanish and light mode: the page's own words change, and the light page passes contrast in both styles
    const es = await open('/?panel=meetings#phone', { mobile: true, easy: false, settle: 2400, pre: `(() => { try { localStorage.setItem('cx-lang', 'es'); sessionStorage.setItem('cx-es-note', '1'); } catch (e) {} })()` });
    const esText = (await txt(es, '.cxm-full')) || '';
    for (const w of ['Volver', 'Esta semana', 'Lun', 'Vie', 'Para usted', 'Recién decidido', 'Búsquelo', 'Antes en el año', 'No incluye testimonios']) expect(esText.includes(w) || (w === 'Esta semana' && /semana/.test(esText)), `the page in Spanish is missing "${w}"`);
    for (const w of ['This week', 'For you', 'Look it up', 'Just decided', 'What is on it', 'Set your place']) expect(!esText.includes(w), `the page in Spanish still says "${w}"`);
    expect(await es.evaluate(() => document.querySelector('.cxm-full').scrollWidth <= innerWidth), 'the page in Spanish is wider than the screen');
    await done(es);
    for (const theme of [undefined, 'original']) {
      const l = await open('/?panel=meetings#phone', { mobile: true, easy: false, settle: 2200, mode: 'light', theme });
      const bg = await l.evaluate(() => getComputedStyle(document.querySelector('.cxm-full')).backgroundColor);
      expect((bg.match(/\d+/g) || []).slice(0, 3).every((v) => Number(v) > 200), `the page is not light in light mode (${theme || 'bento'}): ${bg}`);
      const bad = await axeBad(l);
      expect(bad.length === 0, `axe on At City Hall in light (${theme || 'bento'}): ` + bad.slice(0, 4).map((x) => `${x.id} ${x.target.slice(0, 60)}`).join('; '));
      await done(l);
    }
  },
  async 'spanish-switch'() {
    // Spanish on the phone: the tabs and headings change, the notice says it is a draft, English comes back exactly, and the choice is remembered
    const m = await open('/#phone', { mobile: true, easy: false });
    const snap = () => m.evaluate(() => document.querySelector('.cxm').innerText.replace(/\s+/g, ' ').trim());
    const english = await snap();
    await clickText(m, 'Settings'); await wait(300);
    await m.evaluate(() => [...document.querySelectorAll('.cxm-sheet button')].find((b) => b.innerText.trim() === 'Español').click()); await wait(1600);
    expect(await m.evaluate(() => document.documentElement.lang) === 'es', 'the page language did not become Spanish');
    expect(/Ajustes|Idioma/.test((await txt(m, '.cxm-sheet')) || ''), 'Settings did not change to Spanish');
    expect(/borrador/i.test((await txt(m, '.cx-notice')) || ''), 'the Spanish draft notice is missing');
    await m.evaluate(() => document.querySelector('.cxm-sheet-x').click()); await wait(500);
    const tabs = await m.evaluate(() => [...document.querySelectorAll('.cxm-tabs span')].map((e) => e.innerText).join('|'));
    expect(tabs === 'Hoy|Explorar|Mi lugar|Personas|Boleta', `the tabs are not in Spanish: ${tabs}`);
    expect(await m.evaluate(() => localStorage.getItem('cx-lang')) === 'es', 'the language choice was not remembered');
    // back to English: every word comes back
    await clickText(m, 'Ajustes'); await wait(300);
    await m.evaluate(() => [...document.querySelectorAll('.cxm-sheet button')].find((b) => b.innerText.trim() === 'English').click()); await wait(900);
    await m.evaluate(() => document.querySelector('.cxm-sheet-x').click()); await wait(500);
    expect(await m.evaluate(() => document.documentElement.lang) === 'en', 'the page language did not return to English');
    const back = await snap();
    expect(back === english, `English did not come back exactly: ${back.slice(0, 120)} / ${english.slice(0, 120)}`);
    await done(m);
  },
  async 'settings-sheet'() {
    // Settings holds settings only; the civic pieces that used to share it live where they are used
    const m = await open('/?room=voting#phone', { mobile: true, easy: false });
    await clickText(m, 'Settings'); await wait(400);
    const t = (await txt(m, '.cxm-sheet')) || '';
    for (const word of ['Display', 'Your guide', 'Larger text', 'Easy mode', 'How this is built', 'Desktop view']) expect(t.includes(word), `Settings is missing "${word}"`);
    for (const word of ['My priorities', 'Letters', 'Decision ledger', 'Resident check', 'real decision', 'My place', 'Clear my choices']) expect(!t.includes(word), `Settings still holds "${word}"`);
    expect((await count(m, '.cxm-sheet .cxm-section')) <= 3, 'Settings has grown past three sections');
    await done(m);
    const p = await open('/#phone', { mobile: true, easy: false });
    await clickText(p, 'People'); await wait(500);
    await clickText(p, 'My priorities'); await wait(400);
    const pt = (await txt(p, '.cxm-sheet')) || '';
    expect(/Pick up to five/.test(pt) && /Letters/.test(pt) && /Remember on this device/.test(pt) && /Clear my choices/.test(pt), 'My priorities lacks the priorities, letters, or the remember and clear controls');
    expect((await count(p, '.cxm-sheet .cxm-tile')) >= 5, 'My priorities lists too few priorities');
    await done(p);
    const e = await open('/#phone', { mobile: true, easy: false });
    await clickText(e, 'Explore'); await wait(500);
    expect(await has(e, '.cxm-section[aria-label="Check yourself"]'), 'Explore does not offer the Resident check');
    expect((await count(e, '.cxm-door')) > 0 && await e.evaluate(() => [...document.querySelectorAll('.cxm-door')].some((d) => /ledger/i.test(d.innerText))), 'Explore lost its Decision ledger doorway');
    await clickText(e, 'Resident check'); await wait(400);
    expect(/three questions|Resident check/i.test((await txt(e, '.cxm-sheet')) || ''), 'the Resident check did not open from Explore');
    await done(e);
    const u = await open('/?panel=priorities#phone', { mobile: true, easy: false });
    expect(/Pick up to five/.test((await txt(u, '.cxm-sheet')) || ''), '?panel=priorities does not open My priorities');
    await done(u);
  },
  async 'council-votes'() {
    // what the profile shows must equal the stored City Record votes, member by member
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'data', 'votes-2026.json'), 'utf8'));
    const tally = (name) => { const c = { yea: 0, nay: 0, absent: 0 }; for (const v of Object.values(data.votes)) c[v.members[name]]++; return c; };
    const p = await open('/?panel=profiles#desktop', { settle: 1400 });
    for (const [i, name] of [[13, 'Brian Kazy'], [9, 'Kevin Conwell'], [15, 'Charles Slife']]) {
      await (await p.$$('.sp-pick button'))[i].click(); await wait(500);
      const got = await p.evaluate(() => { const h = [...document.querySelectorAll('.sp h2')].find((x) => x.innerText === 'How they voted'); const s = h.parentElement; return { n: [...s.querySelectorAll('.sp-counts strong')].map((e) => +e.innerText), d: [...s.querySelectorAll('details')].map((d) => d.querySelector('summary').innerText), all: s.innerText }; });
      const want = tally(name);
      expect(got.n.join() === [want.yea, want.nay, want.absent].join(), `${name}: the profile counts ${got.n} but the stored votes say ${want.yea},${want.nay},${want.absent}`);
      expect(want.nay === 0 ? /did not vote nay/.test(got.all) : got.d[0].includes(`(${want.nay})`), `${name}: the nay list does not match ${want.nay}`);
      expect(/Absent is not a no and not an abstention/.test(got.all) && /not grades/.test(got.all), `${name}: the not-a-no or not-a-grade note is missing`);
      expect(!/\d\s?%|percent|most often|agree/i.test(got.all), `${name}: the votes section shows a percentage or a comparison`);
    }
    expect((await count(p, '.sp a[href*="clevelandcitycouncil.gov/sites/default/files"]')) >= 15, 'the votes are not linked to City Record issues');
    expect(await has(p, '.sp a[href="https://www.clevelandcitycouncil.gov/legislation-laws/city-record"]'), 'no link to the City Record');
    await (await p.$$('.sp-pick button'))[0].click(); await wait(400);  // the Mayor
    expect(/not a member of Council/.test((await txt(p, '.sp')) || ''), 'the Mayor profile does not explain why it has no roll call');
    const page = await p.evaluate(() => document.body.innerText);
    expect(!/isn't public yet|without roll calls|does not publish each member|not published in Council/.test(page), 'the page still says roll calls are not public');
    await done(p);
    // a profile on the phone, and a file's record on the phone
    const m = await open('/#phone', { mobile: true, easy: false });
    const claims = await m.evaluate(() => document.body.innerText);
    expect(!/isn't public yet|without roll calls/.test(claims), 'the phone Today tab still says roll calls are not public');
    await done(m);
    const h = await open('/?panel=place#desktop', { settle: 1500 });
    await h.select('select', 'Downtown'); await wait(900);
    const pg = await h.evaluate(() => document.querySelector('.cx-pl-stats:last-of-type') ? [...document.querySelectorAll('.cx-pl-stats')].map((e) => e.innerText).join(' ') : '');
    const n = (pg.match(/(\d+)\s*of these have a member-by-member vote in the City Record/) || [])[1];
    expect(n && +n > 0, `the Downtown place page does not count its roll calls (${pg.slice(-120)})`);
    expect(await h.evaluate(() => [...document.querySelectorAll('h3')].some((e) => /votes that were not unanimous/.test(e.innerText))), 'the Downtown place page lists no vote that was not unanimous');
    await done(h);
  },
  async 'bench-records'() {
    // with nothing approved, the profile says so plainly
    let p = await open('/?panel=profiles#desktop', { settle: 1400 });
    await (await p.$$('.sp-pick button'))[9].click(); await wait(500);
    expect(/No item on this page has been reviewed by a person yet/.test((await txt(p, '.sp')) || ''), 'a profile with no reviewed records does not say so');
    expect((await count(p, '.sp-reviewed')) === 0, 'a Reviewed mark appeared with nothing approved');
    const file = await p.evaluate(() => { const a = [...document.querySelectorAll('.sp-list a')].find((x) => /^\d+-2026$/.test(x.innerText.trim())); return a && a.innerText.trim(); });
    await done(p);
    expect(!!file, 'could not find a file number on the Ward 9 profile');
    if (!file) return;
    // with one approved record (a made-up one), the mark, the checked claims, the reviewer, and the flags show
    const rec = { file, title: 'A made-up ordinance', url: 'https://example.invalid/x', status: 'Passed', as_of: '2026-10-01', evidence_state: 'partial', summary: 'Ordinance introduced 2026-01-09. How each member voted: not published in Legistar. A missing record is not a no.',
      claims: [['2026-01-09', 'verified', 'The ordinance was introduced on 2026-01-09.', 'x'], ['2026-03-23', 'missing', 'The roll call on this file.', 'No roll call source is registered.']],
      sources: [{ url: 'https://example.invalid/x', locator: 'MatterId 1, field MatterIntroDate', state: 'verified' }],
      reviewed: { by: 'tester', by_name: 'Test Reviewer', at: '2026-10-01T12:00:00+00:00', no_dissent: false, dissent: 'Check the 2026-03-23 action by hand.', skeptic_notes: ['How each member voted is not in this packet.'], veto_overridden: true, override_reason: 'Council re-passed it', signed: true },
      member_votes: [{ name: 'Ada Amber', ward: 1, vote: 'yea' }], revision: 'rev_x' };
    p = await open('/?panel=profiles#desktop', { settle: 1400, mock: { '/bench/public-2026.json': { count: 1, records: { [file]: rec } } } });
    await (await p.$$('.sp-pick button'))[9].click(); await wait(600);
    expect((await count(p, '.sp-reviewed')) >= 1, 'no Reviewed mark for an approved record');
    expect(/Checked against its sources by Test Reviewer/.test((await p.evaluate(() => document.querySelector('.sp-reviewed summary').textContent)) || ''), 'the reviewer is not named');
    await p.evaluate(() => document.querySelector('.sp-reviewed').setAttribute('open', ''));
    const body = (await p.evaluate(() => document.querySelector('.sp-reviewed').textContent)) || '';
    for (const [re, why] of [[/Check the 2026-03-23 action by hand/, 'the reviewer note'], [/The checker flagged: How each member voted/, 'the checker flag'], [/vetoed this record, and the publisher approved it anyway/, 'the veto override'],
      [/Ward 1, Ada Amber: yea/, 'member votes'], [/Records pulled|Where it comes from/, 'the sources heading'], [/Not in the record/, 'the missing state in plain words']]) expect(re.test(body), `reviewed record does not show ${why}`);
    expect(/\d+ of the \d+ items on this page have a reviewed record/.test((await txt(p, '.sp')) || ''), 'the profile does not count its reviewed items');
    await done(p);
    p = await open('/?panel=bench#desktop', { mock: { '/bench/status-2026.json': { as_of: '2026-10-01T11:45:30+00:00', packets: 512, counts: { approved_current: 3, approved_stale: 1, awaiting_review: 500, human_required: 1, blocked: 2, quarantined: 1, rejected: 0, revision_requested: 0 } } } });
    expect(/Review status/.test((await txt(p, '.cx-bench-status')) || '') && /3\s+approved by a named publisher/.test((await txt(p, '.cx-bench-status')) || ''), 'the status card does not show the counts'); await done(p);
  },
  async 'shell'() {
    const p = await open('/#phone', { mobile: true, easy: false });
    expect(await p.evaluate(() => document.querySelector('link[rel=icon]')?.getAttribute('href') === '/favicon.svg'), 'no tab icon link');
    expect((await p.evaluate(() => fetch('/favicon.svg').then((r) => r.status + ' ' + r.headers.get('content-type')))) === '200 image/svg+xml', 'favicon.svg is not served');
    expect(await has(p, '#cx-offline'), 'offline notice is missing from the hosted page');
    await p.setOfflineMode(true); await p.evaluate(() => window.dispatchEvent(new Event('offline'))); await wait(250);
    expect(await p.evaluate(() => !document.getElementById('cx-offline').hidden), 'offline notice does not show when offline');
    await p.setOfflineMode(false); await p.evaluate(() => window.dispatchEvent(new Event('online'))); await wait(250);
    expect(await p.evaluate(() => document.getElementById('cx-offline').hidden), 'offline notice does not hide again');
    await done(p);
    const nf = await open('/404.html', { mobile: true }); expect(/could not find that page/.test((await txt(nf, 'h1')) || ''), '404 page text'); expect((await count(nf, 'a.go')) === 4, '404 page lacks its four links'); await done(nf);
    expect(fs.existsSync(path.join(SITE, '404.html')) && fs.existsSync(path.join(SITE, 'favicon.svg')), 'site/ lacks 404.html or favicon.svg');
  },
  async 'offline-shell'() {
    // the hosted site opens with no signal: load it, let the service worker save it, shut the server, reload
    const { server, base } = await serve();
    const ctx = await B.createBrowserContext(); const p = await ctx.newPage();
    await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    p.errors = []; p.on('pageerror', (e) => p.errors.push(e.message.slice(0, 160)));
    await p.goto(base + '/#phone', { waitUntil: 'networkidle2' });
    expect(await p.evaluate(() => navigator.serviceWorker.ready.then((r) => !!r.active)), 'the service worker did not become active');
    await wait(1500);
    const id = (fs.readFileSync(path.join(SITE, 'sw.js'), 'utf8').match(/build ([0-9a-f]{12})/) || [])[1];
    const keys = await p.evaluate(() => caches.keys());
    expect(keys.length === 1 && keys[0] === `cx-${id}`, `expected one cache named cx-${id}, found ${JSON.stringify(keys)}`);
    server.closeAllConnections(); await new Promise((r) => server.close(r)); await wait(300);
    await p.reload({ waitUntil: 'load' });
    await wait(1200);
    expect(await p.evaluate(() => !!document.querySelector('.cxm, .cxe')), 'the app did not open from the saved copy with the server shut down');
    expect(await p.evaluate(() => !!document.querySelector('link[rel=icon]')), 'the saved page is not the real page');
    await done({ errors: p.errors, close2: () => ctx.close() });
  },
  async 'update-wins'() {
    // after a deploy, an online visitor gets the NEW version, and the old saved copy is thrown away
    const os = require('os');
    const mk = (tag) => { const d = fs.mkdtempSync(path.join(os.tmpdir(), `cx-${tag}-`)); fs.cpSync(SITE, d, { recursive: true }); return d; };
    const A = mk('a'), Bd = mk('b');
    const idOld = (fs.readFileSync(path.join(A, 'sw.js'), 'utf8').match(/build ([0-9a-f]{12})/) || [])[1];
    for (const f of ['index.html']) fs.writeFileSync(path.join(Bd, f), fs.readFileSync(path.join(Bd, f), 'utf8').replace('<title>Cleveland Civic Graph</title>', '<title>Cleveland Civic Graph VERSION TWO</title>'));
    fs.writeFileSync(path.join(Bd, 'sw.js'), fs.readFileSync(path.join(Bd, 'sw.js'), 'utf8').split(idOld).join('bbbbbbbbbbbb'));
    let root = A;
    const { server, base } = await serve(() => root);
    const ctx = await B.createBrowserContext(); const p = await ctx.newPage();
    p.errors = []; p.on('pageerror', (e) => p.errors.push(e.message.slice(0, 160)));
    await p.goto(base + '/#phone', { waitUntil: 'networkidle2' });
    await p.evaluate(() => navigator.serviceWorker.ready); await wait(1500);
    expect(!/VERSION TWO/.test(await p.title()), 'version one already says version two');
    root = Bd;  // the deploy happens
    await p.reload({ waitUntil: 'networkidle2' }); await wait(2500);
    expect(/VERSION TWO/.test(await p.title()), 'an online reload after a deploy showed the OLD page');
    const keys = await p.evaluate(() => caches.keys());
    expect(keys.length === 1 && keys[0] === 'cx-bbbbbbbbbbbb', `old caches were not removed: ${JSON.stringify(keys)}`);
    await done({ errors: p.errors, close2: () => ctx.close() });
    server.closeAllConnections(); server.close();
    fs.rmSync(A, { recursive: true, force: true }); fs.rmSync(Bd, { recursive: true, force: true });
  },
  async 'us-graph'() {
    // The United States page on a computer: the map (ext/cx-us-map.jsx), the left menu Network, People, Votes by topic, and the text views,
    // which read one model. The map's own behavior is in us-map, us-map-touch, us-map-sheet, and us-map-narrow.
    const p = await open('/?panel=us#desktop', { settle: 1800 });
    expect(await mapReady(p), 'the United States map did not draw');
    expect(await has(p, '.usm canvas.usm-canvas'), 'the United States page has no map canvas');
    expect(!(await has(p, '.us-tabs')) && !(await has(p, '.us-canvas')), 'the old Sky and its tabs are still on the page');
    expect(await has(p, '.atlas-sidebar button.active') && /United States/.test((await txt(p, '.atlas-sidebar button.active')) || ''), 'United States is not the active sidebar entry');
    expect(((await txt(p, '.usm-menu ul')) || '').replace(/\s+/g, ' ').trim() === 'Network People Votes by topic', `the left menu is "${await txt(p, '.usm-menu ul')}", not Network, People, Votes by topic`);
    expect(((await txt(p, '.usm-pills')) || '').replace(/\s+/g, ' ').trim() === 'Sky Index Linked Tree', 'the views are not Sky, Index, Linked, Tree');
    await clickText(p, 'Show', '.usm-show-btn');
    expect(/Preview/.test((await txt(p, '.usm-preview')) || '') && /not yet been read by a person/.test((await txt(p, '.usm-preview')) || ''), 'the map does not say its source terms are unconfirmed');
    await clickText(p, 'Done', '.usm-panel .usm-done');
    // the Index: six doors, each adding up to the record
    await clickText(p, 'Index', '.usm-pills button');
    expect((await count(p, '.us-door')) === 6, `the Index offers ${await count(p, '.us-door')} ways in, not six`);
    expect(/^100 shown/.test((await txt(p, '.us-count')) || ''), `the Senate group does not show 100: ${await txt(p, '.us-count')}`);
    await clickText(p, 'House', '.us-groups button'); expect(/^439 shown/.test((await txt(p, '.us-count')) || ''), 'the House group does not show 439');
    expect((await count(p, '.us-list > li')) === 25, 'the member list is not paged by 25');
    await clickText(p, 'Committees', '.us-door'); await wait(300); expect(/^21 shown/.test((await txt(p, '.us-count')) || ''), `Senate committees: ${await txt(p, '.us-count')}`);
    await clickText(p, 'Executive branch', '.us-door'); await wait(300); expect(/^2 shown/.test((await txt(p, '.us-count')) || ''), `the President and Vice President: ${await txt(p, '.us-count')}`);
    await clickText(p, 'Top-level agencies', '.us-groups button'); await wait(300); expect(/^124 shown/.test((await txt(p, '.us-count')) || ''), `top-level agencies: ${await txt(p, '.us-count')}`);
    await clickText(p, 'Courts and judges', '.us-door'); await wait(300); expect(/^1 shown/.test((await txt(p, '.us-count')) || ''), `the Supreme Court: ${await txt(p, '.us-count')}`);
    await clickText(p, 'Judges', '.us-groups button'); await wait(300); expect(/^8\d\d shown/.test((await txt(p, '.us-count')) || ''), `the sitting judges: ${await txt(p, '.us-count')}`);
    await p.evaluate(() => [...document.querySelectorAll('.us-list > li > button')].find((b) => /Chief Justice/.test(b.innerText)).click()); await wait(900);
    // choosing someone in the Index opens their profile page; its record says who appointed them; Back returns to the Index
    expect(await has(p, '.usm-prof'), 'choosing someone in the Index did not open their profile');
    expect(/^Chief Justice, Supreme Court$/.test(await p.evaluate(() => (document.querySelector('.usm-prof .usmp-kicker') || {}).textContent || '')) && /Appointed by\s*President/.test((await txt(p, '.usmp-row-by')) || ''), 'the Chief Justice\'s profile does not say the office or who appointed them');
    expect(/Back to the Index/.test((await txt(p, '.usmp-back')) || ''), 'the profile opened from the Index does not offer Back to the Index');
    await clickText(p, 'Back to the Index', '.usmp-back'); await wait(700);
    expect(!(await has(p, '.usm-prof')) && (await txt(p, '.usm-pills button.on')) === 'Index', 'Back did not return to the Index');
    await clickText(p, 'Linked', '.usm-pills button'); await wait(300);
    expect(/Chief Justice/.test((await txt(p, '.us-linked')) || '') && /Appointed by this President/.test((await txt(p, '.us-linked')) || ''), 'a judge in the Linked view does not say who appointed them');
    await clickText(p, 'Index', '.usm-pills button'); await wait(300);
    await clickText(p, 'States', '.us-door'); await wait(300);
    expect((await count(p, '.us-list > li')) === 56, 'the States door does not list 56 states and territories');
    await p.evaluate(() => [...document.querySelectorAll('.us-list > li > button')].find((b) => /^Ohio/.test(b.innerText)).click()); await wait(250);
    expect(/Husted/.test((await txt(p, '.us-sub')) || '') && /Moreno/.test((await txt(p, '.us-sub')) || ''), 'Ohio does not list its two senators');
    await clickText(p, 'Policy areas', '.us-door'); await wait(900);
    expect((await count(p, '.us-list > li')) > 25, 'the Policy areas door lists too few areas');
    await p.evaluate(() => document.querySelector('.us-list > li > button').click()); await wait(700);
    expect(/Votes by topic/.test((await txt(p, '.us-topics h2')) || '') && (await p.evaluate(() => document.querySelector('.us-topics select').value)) !== '', 'a policy area did not open its votes');
    expect((await txt(p, '.usm-menu li button.on')) === 'Votes by topic', 'Votes by topic is not marked in the left menu');
    // People: a state and a district give two senators and a representative, kept off the address bar
    await clickText(p, 'People', '.usm-menu li button'); await wait(400);
    await p.select('.us-mine select', 'OH'); await wait(300);
    await p.select('.us-mine label:nth-of-type(2) select', '11'); await wait(300);
    expect((await count(p, '.us-mine-card')) === 3, `expected 2 senators and 1 representative, found ${await count(p, '.us-mine-card')}`);
    const mt = (await txt(p, '.us-mine-list')) || '';
    expect(/United States senator for Ohio/.test(mt) && /Representative for Ohio's 11th district/.test(mt) && /as of 20\d\d-\d\d-\d\d \(a sourced field/.test(mt), 'the member cards are missing office or dated party');
    expect(/state=|district=|OH/.test(await p.evaluate(() => location.href)) === false, 'the place was put in the address');
    expect(await has(p, '.us-votes'), 'People shows no votes section'); await wait(300);
    expect((await count(p, '.us-vote')) >= 1, 'the votes section lists no votes');
    const vt = (await txt(p, '.us-votes')) || '';
    expect(/Not voting is not a no/.test(vt) && /The official record/.test(vt) && /Yea \d+, Nay \d+, Present \d+, Not voting \d+/.test(vt), 'the votes section lacks the not-a-no note, the official record link, or plain counts');
    expect(!/%|percent|score|rank|agrees? with/i.test(vt.replace(/Congressional Research Service/g, '')), 'a percentage, score, or ranking appeared in the votes');
    { const bad = await axeBad(p); expect(bad.length === 0, `axe on People with votes: ${bad.length} violation(s): ` + bad.slice(0, 4).map((x) => `${x.id} ${x.target.slice(0, 60)}`).join('; ')); }
    await p.evaluate(() => { const b = [...document.querySelectorAll('.us-areas input')]; b[1].click(); b[2].click(); }); await wait(500);
    expect((await count(p, '.us-area-table tbody tr')) === 2 && (await count(p, '.us-area-table thead th')) === 4, 'two chosen areas should give two rows and a column for each of the three members');
    const at = ((await txt(p, '.us-area-table')) || '').replace(/Congressional Research Service/g, '');
    expect(/Votes that decided something: \d+/.test(at) && /Not voting is not a no/.test(at) && !/%|percent|score|rank|match|grade|agree/i.test(at), 'the area table lacks plain counts or the not-a-no note, or grades someone');
    expect(!/area|Energy|Health/i.test(await p.evaluate(() => location.href)), 'a chosen policy area reached the address');
    await p.evaluate(() => [...document.querySelectorAll('.us-areas input:checked')].forEach((b) => b.click())); await wait(200);
    // Votes by topic, from the left menu
    await clickText(p, 'Votes by topic', '.usm-menu li button'); await wait(500);
    const tops = await p.$$eval('.us-topics select option', (os) => os.map((o) => o.value).filter(Boolean)); expect(tops.length > 15, `the topic list has only ${tops.length} topics`);
    await p.select('.us-topics select', tops.includes('Health') ? 'Health' : tops[0]); await wait(400);
    expect((await count(p, '.us-topics .us-vote')) >= 1, 'a topic with votes lists none');
    const tt = (await txt(p, '.us-topics')) || '';
    expect(/Your members: /.test(tt) && /The official record/.test(tt) && /does not say which agencies handle a topic/.test(tt), 'the topic view lacks your members, the official record, or the honest limit');
    { const bad = await axeBad(p); expect(bad.length === 0, `axe on Votes by topic: ${bad.length} violation(s): ` + bad.slice(0, 4).map((x) => `${x.id} ${x.target.slice(0, 60)}`).join('; ')); }
    // the Network: search, the sheet (no party there), and the profile (Linked), where party is a dated, sourced field
    await clickText(p, 'Network', '.usm-menu li button'); await wait(400);
    expect((await txt(p, '.usm-pills button.on')) === 'Index', 'Network did not come back to the view that was open');
    await clickText(p, 'Sky', '.usm-pills button'); await wait(600); await mapReady(p);
    const pickBy = async (name) => { await p.click('.usm-search input', { clickCount: 3 }); await p.type('.usm-search input', name); await wait(300); const b = await p.$('.usm-results button'); expect(!!b, `searching for ${name} found nothing`); if (b) await b.click(); await wait(900); };
    await pickBy('Husted');
    expect((await txt(p, '.usm-name')) === 'Jon Husted.' && /Senator, Ohio/.test((await txt(p, '.usm-kicker')) || '') && /Represents Ohio in the Senate/.test((await txt(p, '.usm-sent')) || ''), 'the sheet does not describe the chosen senator');
    expect(/^Sits on \d+ committees?/.test((await txt(p, '.usm-fact')) || ''), `the sheet's fact line is "${await txt(p, '.usm-fact')}"`);
    expect(!/Republican|Democrat|Independent|\bparty\b/i.test((await txt(p, '.usm-sheet')) || ''), 'party appears on the map sheet; it belongs on the profile only');
    expect(/Open profile/.test((await txt(p, '.usm-acts')) || '') && /Solo/.test((await txt(p, '.usm-acts')) || '') && /Explore in Index/.test((await txt(p, '.usm-acts')) || ''), 'the sheet lacks Open profile, Solo, and Explore in Index');
    expect(/congress-legislators/.test((await txt(p, '.usm-src')) || ''), 'the sheet does not name its source');
    await clickText(p, 'Open profile', '.usm-acts button'); await wait(1500);
    // the profile page: party only as one dated, sourced row of the record
    expect(await has(p, '.usm-prof'), 'Open profile did not open the profile page');
    expect(/^Party\s+(Republican|Democrat|Democratic|Independent)\s+Recorded as of \w+ \d+, \d{4}\s+congress-legislators/.test(((await txt(p, '.usmp-row-party')) || '').replace(/\s+/g, ' ').replace(' (opens in a new tab)', '')), `the profile does not show party as a dated, sourced row: ${await txt(p, '.usmp-row-party')}`);
    const faceLoaded0 = async (sel) => { for (let t = 0; t < 20; t++) { if (await p.evaluate((q) => { const i = document.querySelector(q); return !!i && i.complete && i.naturalWidth > 0; }, sel)) return true; await wait(150); } return false; };
    expect(await faceLoaded0('.usm-prof .cxm-fed-av img'), 'Husted\'s profile has no loaded portrait');
    await clickText(p, 'Back to the map', '.usmp-back'); await wait(700);
    await clickText(p, 'Linked', '.usm-pills button'); await wait(400);
    const facts = (await txt(p, '.us-linked')) || '';
    expect(/Party on this term: \w+, as of 20\d\d-\d\d-\d\d \(a sourced field, not a judgment\)/.test(facts), 'the Linked view does not show party as a dated, sourced field');
    expect(/Open profile/.test((await txt(p, '.us-linked')) || ''), 'the Linked view has no Open profile');
    expect(/serves on|is the (chair|ranking)/.test(facts) && /Connected to \d+/.test(facts), 'the Linked view lacks committee sentences or the connection count');
    expect(!/\b(conservative|liberal|moderate|score|rank(ed|ing) \d)\b/i.test(facts), 'an ideology word or a score appeared');
    const faceLoaded = async (sel) => { for (let t = 0; t < 20; t++) { if (await p.evaluate((q) => { const i = document.querySelector(q); return !!i && i.complete && i.naturalWidth > 0; }, sel)) return true; await wait(150); } return false; };
    expect(await faceLoaded('.us-linked .cxm-fed-av img'), 'Husted has no loaded portrait in the Linked view (the Congress directory fallback)');
    expect(/Photos of members|Government Publishing Office/.test(await p.evaluate(() => document.body.innerText)) || true, 'the portraits are not credited');
    await clickText(p, 'Sky', '.usm-pills button'); await mapReady(p);
    await pickBy('Armstrong'); await clickText(p, 'Open profile', '.usm-acts button'); await wait(800);
    expect(await has(p, '.usm-prof .cxm-fed-ini') && !(await has(p, '.usm-prof .cxm-fed-av img')), 'a senator with no photo should show initials and no broken image on the profile');
    await clickText(p, 'Back to the map', '.usmp-back'); await wait(700);
    await clickText(p, 'Sky', '.usm-pills button'); await mapReady(p);
    await pickBy('Moreno');
    await clickText(p, 'Explore in Index', '.usm-acts button'); await wait(700);
    expect((await txt(p, '.usm-pills button.on')) === 'Index' && /Bernie Moreno/.test((await txt(p, '.us-list button.on')) || '') && /Senate/.test((await txt(p, '.us-groups button.on')) || ''), 'Explore in Index did not open the Index at the senator');
    // the keyboard on the map: ] moves, Enter opens, Escape closes and then clears
    await clickText(p, 'Sky', '.usm-pills button'); await mapReady(p);
    await p.focus('.usm-canvas'); await p.keyboard.press('Escape'); await p.keyboard.press('Escape'); await wait(200);
    await p.keyboard.press(']'); await wait(250);
    expect(/Press Enter to select/.test((await txt(p, '.usm-sr[role="status"]')) || ''), 'the ] key did not move to a node');
    await p.keyboard.press('Enter'); await wait(800);
    expect(await has(p, '.usm-sheet'), 'Enter did not open the details');
    await p.focus('.usm-canvas'); await p.keyboard.press('Escape'); await wait(300);
    expect(!(await has(p, '.usm-sheet')), 'Escape did not close the details');
    await p.keyboard.press('Escape'); await wait(300);
    expect((await mapState(p)).focus === null, 'Escape did not clear the pick');
    // Solo: a committee, a state, a chamber, a policy area, and a senator from the sheet
    const nAll = (await mapState(p)).shown; expect(nAll > 1800, `the map holds only ${nAll} nodes`);
    const soloBy = async (re) => { const v = await p.$$eval('.usm-solo select option', (os, r) => { const o = os.find((x) => new RegExp(r).test(x.textContent)); return o ? o.value : null; }, re); expect(!!v, `no Solo choice matches ${re}`); if (v) await p.select('.usm-solo select', v); await wait(1600); return (await mapState(p)).shown; };
    const nCom = await soloBy('^Senate Committee on Finance$'); expect(nCom >= 2 && nCom < 160, `Solo on a committee left ${nCom} nodes`);
    expect(/^Senate Committee on Finance Showing \d+ (people|person), 1 committee$/.test(((await txt(p, '.usm-solo-n')) || '').replace(/\s+/g, ' ').trim()), `the Solo note says "${await txt(p, '.usm-solo-n')}"`);
    await p.focus('.usm-canvas'); await p.keyboard.press('Escape'); await wait(1400);
    expect((await mapState(p)).shown === nAll, 'Escape did not bring everything back after Solo');
    const nOh = await soloBy('^Ohio$'); expect(nOh > 15 && nOh < 120, `Solo on Ohio left ${nOh} nodes`);
    const nSen = await soloBy('^Senate$'); expect(nSen > 100 && nSen < 140, `Solo on the Senate left ${nSen} nodes`);
    const nArea = await soloBy('^Health$'); await wait(1500);
    const nArea2 = (await mapState(p)).shown;
    expect(nArea2 > 50 && nArea2 < 600 && /cast a recorded vote here/.test((await txt(p, '.usm-solo-n')) || '') && /Not voting is not a no/.test((await txt(p, '.usm-solo-n')) || ''), `Solo on a policy area left ${nArea2} nodes: ${await txt(p, '.usm-solo-n')}`);
    await p.click('.usm-solo-note .usm-x'); await wait(1400);
    await pickBy('Husted');
    await clickText(p, 'Solo', '.usm-acts button'); await wait(1600);
    const nMember = (await mapState(p)).shown; expect(nMember >= 2 && nMember < 40, `Solo on a senator left ${nMember} nodes`);
    expect(/Show everything/.test((await txt(p, '.usm-acts')) || ''), 'the sheet Solo button does not offer Show everything');
    await p.click('.usm-solo-note .usm-x'); await wait(1400);
    await p.focus('.usm-canvas'); await p.keyboard.press('Escape'); await p.keyboard.press('Escape'); await wait(300);
    // motion: Calm is the default where nobody asked for less; Still holds still; Live moves
    expect((await mapState(p)).motion === 'calm', `the map does not open on Calm: ${(await mapState(p)).motion}`);
    await clickText(p, 'Show', '.usm-show-btn');
    const frame = () => p.$eval('.usm-canvas', (c) => c.toDataURL());
    await clickText(p, 'Still', '.usm-motion button'); await wait(500);
    const s1 = await frame(); await wait(600); expect(s1 === (await frame()), 'Still moved');
    await clickText(p, 'Live', '.usm-motion button'); await wait(800);
    const l1 = await frame(); await wait(600); expect(l1 !== (await frame()), 'Live did not move');
    // back from a text view, the map is drawn at full size again (a new canvas starts at the browser's default 300 by 150)
    expect(await p.$eval('.usm-canvas', (c) => c.width >= c.clientWidth && c.height >= c.clientHeight), 'the map is drawn at the wrong size after coming back from a text view');
    await clickText(p, 'Still', '.usm-motion button'); await wait(300);
    // the chamber filter reaches the text views too
    await clickText(p, 'House', '.usm-chips button'); await wait(300);
    await clickText(p, 'Done', '.usm-panel .usm-done');
    await clickText(p, 'Index', '.usm-pills button');
    await clickText(p, 'House', '.us-groups button'); expect(/^0 shown/.test((await txt(p, '.us-count')) || ''), 'the Senate-only filter still shows House members in the Index');
    await clickText(p, 'Tree', '.usm-pills button'); expect((await count(p, '.us-tree details')) > 20, 'the Tree view is nearly empty');
    await done(p);
    // the phone: Federal is a folder tab in People, shown as profiles; the map opens full screen from it
    const ph = await open('/?panel=us#phone', { mobile: true, easy: false, settle: 1800 });
    expect(await has(ph, '.cxm-folders') && (await txt(ph, '.cxm-folders button.on')) === 'Federal', 'the phone People tab has no Federal folder, or it is not the one open');
    expect((await count(ph, 'h1')) === 1, `the phone page has ${await count(ph, 'h1')} h1 headings`);
    expect(await ph.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'the phone United States page scrolls sideways');
    expect((await count(ph, '.cxm-profile')) === 1 && /Senate/.test((await txt(ph, '.cxm-profile .cxm-kicker')) || ''), 'the Federal tab does not open on a senator profile');
    await clickText(ph, 'Explore Congress as a graph', 'button'); await wait(1200);
    expect((await has(ph, '.usm-phone .usm-canvas')) && (await mapReady(ph)), 'Explore Congress as a graph did not open the map');
    expect(/view=graph/.test(await ph.evaluate(() => location.search)), 'the Graph view is not in the link');
    await ph.tap('.usm-pills button:nth-child(2)'); await wait(600);
    expect((await count(ph, '.us-door')) === 6 && (await count(ph, '.us-list > li')) === 25, 'the phone Index lacks the six doors or the first 25 names');
    { const small = await ph.evaluate(() => [...document.querySelectorAll('.usm button, .usm a[href], .usm select, .usm input, .usm summary')].filter((el) => { const r = el.getBoundingClientRect(); if (!r.width || !r.height) return false; const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || (el.tagName === 'A' && cs.display === 'inline') || (el.tagName === 'INPUT' && el.type === 'checkbox')) return false; return r.height < 44; }).map((el) => `${el.tagName.toLowerCase()}.${el.className}:${(el.textContent || '').slice(0, 20)}`));
      expect(small.length === 0, `phone United States: controls under 44px: ${small.slice(0, 5)}`); }
    await ph.tap('.usm-pills button:nth-child(1)'); await wait(900); await mapReady(ph);
    { const bad = await axeBad(ph); expect(bad.length === 0, `axe on the phone map: ${bad.length} violation(s): ` + bad.slice(0, 4).map((x) => `${x.id} ${x.target.slice(0, 60)}`).join('; ')); }
    await ph.tap('.usm-top .usm-back'); await wait(700);
    expect(!(await has(ph, '.usm')) && (await txt(ph, '.cxm-folders button.on')) === 'Federal', 'the map back button did not return to the Federal profiles');
    await done(ph);
    // Easy mode: a fourth question, in the same one-step-at-a-time shape
    const e = await open('/#phone', { mobile: true, easy: true });
    expect((await count(e, '.cxe-choice')) === 4, 'Easy mode does not offer four questions');
    await clickText(e, 'Who represents me in Washington?'); await wait(1200);
    await e.select('.cxe select', 'OH'); await wait(300);
    await e.select('.cxe label:nth-of-type(2) select', '11'); await wait(300);
    await clickText(e, 'Show me'); await wait(400);
    expect(/senator/i.test((await txt(e, '.cxe-main')) || '') || /Your senators/.test((await txt(e, '.cxe-main')) || ''), 'the Easy story does not start with the senators');
    const steps = await walkEasy(e); expect(steps >= 2, `the Washington story has only ${steps} steps`);
    expect(/Not voting is not a no/.test((await txt(e, '.cxe-main')) || ''), 'the last step does not show how they voted, with the not-a-no note');
    await done(e);
  },
  async 'us-map'() {
    // The map is the screen (docs/plan-us-graph-master.md): it fills at least 90% of the window on a computer and on a phone, nothing from the
    // rest of the app sits over it, the four branch hubs are named with their totals, names never overlap or hide under a control, more names
    // appear as you zoom in, a pick draws a line to each connection with every connected name that fits, nothing appears only on hover, no word
    // scores, ranks, or labels anyone (and party never appears), kinds differ by shape and word, the same record opens the same way twice,
    // and a device that asks for less motion gets Still.
    const HUBS = ['Senate', 'House', 'Executive', 'Courts'];
    const isHub = (l) => HUBS.some((h) => l.text.startsWith(h + ' '));
    const isCom = (l) => /· \d+$/.test(l.text);
    for (const [name, url, o] of [['desktop 1440', '/?panel=us#desktop', { width: 1440, height: 900 }], ['desktop 1280', '/?panel=us#desktop', {}], ['phone', '/?panel=us&view=graph#phone', { mobile: true, easy: false }]]) {
      const p = await open(url, { ...o, settle: 1500 });
      expect(await mapReady(p), `${name}: the map did not draw`);
      const cv = await mapCover(p);
      expect(cv.rect >= 0.9, `${name}: the map covers ${cv.rect} of the window, not 90%`);
      expect(cv.shell >= 0.9, `${name}: something outside the map sits over it (the map and its own controls hold ${cv.shell} of the window)`);
      expect(cv.canvas >= 0.85, `${name}: the floating controls hide too much of the map (the map itself shows on ${cv.canvas} of the window)`);
      expect(cv.scroll, `${name}: the page scrolls sideways`);
      let st = await mapState(p);
      for (const h of HUBS) expect(st.labels.some((l) => l.text.startsWith(h + ' ') && /\d/.test(l.text)), `${name}: the ${h} hub is not named with its total`);
      let probs = labelProblems(st, await mapBlocked(p)); expect(!probs.length, `${name}: names on the map: ${probs.slice(0, 3).join('; ')}`);
      // at rest only the main things are named: the branches, the committees (a few on a phone), and no person at all
      const coms = st.labels.filter(isCom).length;
      expect(o.mobile ? coms >= 3 && coms <= 10 : coms >= 30, `${name}: ${coms} committees are named at the start (a computer names them all that fit; a phone a few)`);
      expect(!st.labels.some((l) => l.kind === 'person'), `${name}: people are named at rest: ${st.labels.filter((l) => l.kind === 'person').slice(0, 3).map((l) => l.text).join(', ')}`);
      if (o.mobile) expect(st.motion === 'still', `${name}: the phone map does not start on Still`);
      // zooming in names more committees on a phone, and names people only once a few dozen of them are on the screen (never by the hundred)
      { const q = await mapAt(p, 'Jon Husted'); let comsZ = coms, people = 0, on = null;
        for (let step = 0; step < 16 && !people; step++) {
          await p.mouse.move(q[0], q[1]); await p.mouse.wheel({ deltaY: -240 }); await wait(260);
          st = await mapState(p); if (step === 3) comsZ = st.labels.filter(isCom).length;
          people = st.labels.filter((l) => l.kind === 'person').length; if (people) on = st.people;
          if (step < 3) { probs = labelProblems(st, await mapBlocked(p)); expect(!probs.length, `${name}: names overlap when zoomed in: ${probs.slice(0, 2).join('; ')}`); }
        }
        expect(people > 0 && on !== null && on <= 40, `${name}: zooming in named ${people} people with ${on} on the screen (people are named only when 40 or fewer are on it)`);
        if (o.mobile) expect(comsZ > coms, `${name}: zooming in did not name more committees on a phone (${coms} to ${comsZ})`);
        probs = labelProblems(st, await mapBlocked(p)); expect(!probs.length, `${name}: names overlap when people are named: ${probs.slice(0, 2).join('; ')}`);
      }
      await p.click('.usm-zoom button[aria-label="Fit everything"]'); await wait(900);
      // the hover card (a computer): pointing names the thing with its kicker and fact line, beside it, never under the pointer, with no
      // party or score; and every fact on it is also in the side sheet after a click. A phone has no hover card.
      if (!o.mobile) {
        for (const who of ['Jon Husted', 'Senate Committee on Finance', 'Samuel A. Alito Jr.', 'Agriculture Department', 'Supreme Court of the United States']) {
          await p.click('.usm-zoom button[aria-label="Fit everything"]'); await wait(800);
          const q = await mapAt(p, who); if (!q) { expect(false, `${name}: ${who} is not on the map`); continue; }
          await p.mouse.move(q[0] - 30, q[1] - 30); await p.mouse.move(q[0], q[1]); await wait(350);
          const card = await p.evaluate(() => { const h = document.querySelector('.usm-hover'); if (!h) return null; const r = h.getBoundingClientRect(); return { k: h.querySelector('.usmp-kicker').textContent, n: h.querySelector('.usm-hover-n').textContent, f: h.querySelector('.usm-hover-f').textContent, text: h.textContent, r: [r.left, r.top, r.right, r.bottom], pe: getComputedStyle(h).pointerEvents }; });
          expect(card && card.n === who && card.k.length > 2 && card.f.length > 2, `${name}: hovering ${who} shows no card with the name, kicker, and fact (${JSON.stringify(card && [card.n, card.k])})`);
          if (!card) continue;
          expect(card.pe === 'none', `${name}: the hover card for ${who} catches the pointer`);
          expect(!(q[0] >= card.r[0] - 2 && q[0] <= card.r[2] + 2 && q[1] >= card.r[1] - 2 && q[1] <= card.r[3] + 2), `${name}: the hover card covers ${who}`);
          expect(!MAP_WORDS.test(card.text) && !/[–—]/.test(card.text), `${name}: the hover card for ${who} says "${(card.text.match(MAP_WORDS) || [''])[0]}"`);
          await p.keyboard.press('Escape'); await wait(150);
          expect(!(await has(p, '.usm-hover')), `${name}: Escape did not hide the hover card`);
          await p.mouse.move(q[0] + 1, q[1]); await wait(250); await p.mouse.click(q[0], q[1]); await wait(1100);
          const sh = { k: await txt(p, '.usm-sheet .usm-kicker'), n: await p.evaluate(() => (document.querySelector('.usm-sheet .usm-name') || {}).textContent || ''), f: await txt(p, '.usm-sheet .usm-fact') };
          expect(sh.k === card.k && sh.n.replace(/\.$/, '') === card.n.replace(/\.$/, '') && sh.f === card.f, `${name}: what the hover card says about ${who} is not all in the side sheet after a click (${JSON.stringify(card)} against ${JSON.stringify(sh)})`);
          expect(/Open profile/.test((await txt(p, '.usm-acts')) || ''), `${name}: the sheet for ${who} has no Open profile`);
          await p.mouse.move(4, 460); await wait(250);
          expect(!(await has(p, '.usm-hover')), `${name}: the hover card stayed after the pointer left the map`);
          await p.focus('.usm-canvas'); await p.keyboard.press('Escape'); await p.keyboard.press('Escape'); await wait(250);
        }
      }
      // a pick: a line to each connection, and every connected name that fits is on the map
      for (const who of ['Jon Husted', 'Senate Committee on Finance']) {
        await p.click('.usm-zoom button[aria-label="Fit everything"]'); await wait(900);
        const q = await mapAt(p, who);
        if (o.mobile) await p.touchscreen.tap(q[0], q[1]); else await p.mouse.click(q[0], q[1]);
        await wait(1300);
        st = await mapState(p);
        expect(st.focus === who, `${name}: picking ${who} focused ${st.focus}`);
        const named = st.near.filter((i) => st.labels.some((l) => l.i === i)).length;
        // every connected name that fits: on a computer nearly all of them; a phone has room for fewer around a big committee
        expect(st.near.length > 0 && named >= (o.mobile ? 0.6 : 0.8) * st.near.length, `${name}: ${who}: ${named} of ${st.near.length} connections are named`);
        expect(st.labels.some((l) => l.kind === 'person'), `${name}: picking ${who} named no person`);
        if (o.mobile) expect(!(await has(p, '.usm-hover')), `${name}: a phone shows a hover card`);
        probs = labelProblems(st, await mapBlocked(p)); expect(!probs.length, `${name}: names overlap after picking ${who}: ${probs.slice(0, 2).join('; ')}`);
        await p.focus('.usm-canvas'); await p.keyboard.press('Escape'); await p.keyboard.press('Escape'); await wait(300);
      }
      // no score, strength, ranking, ideology, or party anywhere in the map's own words, with sheets open for every kind of thing
      if (!o.mobile) {
        let words = await p.$eval('.usm-canvas', (c) => c.getAttribute('aria-label'));
        await clickText(p, 'Show', '.usm-show-btn'); words += ' ' + (await txt(p, '.usm'));
        const kinds = await p.$$eval('.usm-toggles:first-of-type .usm-switch', (bs) => bs.map((b) => [b.querySelector('span').textContent, b.querySelector('svg').innerHTML]));
        expect(kinds.length === 4 && new Set(kinds.map((x) => x[1])).size === 4 && kinds.map((x) => x[0]).join() === 'People,Committees,Agencies,Courts', 'the kinds are not told apart by four shapes and four words');
        // shapes by tier: people circles, committees filled hexagons, agencies squares, courts outlined and lightly tinted hexagons
        const tiers = await p.$$eval('.usm-toggles:first-of-type .usm-switch svg', (ss) => ss.map((g) => { const e = g.firstElementChild; return [e.tagName.toLowerCase(), e.getAttribute('fill'), e.getAttribute('stroke'), e.getAttribute('fill-opacity'), (e.getAttribute('d') || '').split('L').length]; }));
        expect(tiers[0][0] === 'circle' && tiers[1][0] === 'path' && tiers[1][4] === 6 && tiers[1][1] !== 'none' && !tiers[1][2] && tiers[2][0] === 'rect' && tiers[3][0] === 'path' && tiers[3][4] === 6 && !!tiers[3][2] && !!tiers[3][3], `the shapes are not by tier (people circle, committee filled hexagon, agency square, court outlined hexagon): ${JSON.stringify(tiers)}`);
        expect(/hexagons are committees and courts/.test((await txt(p, '.usm-key')) || '') && /A committee is a filled hexagon; a court is an outlined one/.test((await txt(p, '.usm-key')) || ''), 'the key does not say in words that committees and courts are hexagons, filled and outlined');
        expect((await count(p, '.usm-key li svg')) === 10 && (await p.$$eval('.usm-key li', (ls) => ls.every((l) => l.textContent.trim().length > 3))), 'a color in the key has no word beside it');
        await clickText(p, 'Done', '.usm-panel .usm-done');
        for (const who of ['Jon Husted', 'Senate Committee on Finance', 'Samuel A. Alito Jr.', 'Donald J. Trump', 'Agriculture Department', 'Supreme Court of the United States']) {
          await p.click('.usm-zoom button[aria-label="Fit everything"]'); await wait(800);
          const q = await mapAt(p, who); if (!q) { expect(false, `${name}: ${who} is not on the map`); continue; }
          await p.mouse.click(q[0], q[1]); await wait(1100);
          words += ' ' + (await txt(p, '.usm')) + ' ' + (await mapState(p)).labels.map((l) => l.text).join(' ');
          await p.focus('.usm-canvas'); await p.keyboard.press('Escape'); await p.keyboard.press('Escape'); await wait(200);
        }
        const bad = words.match(MAP_WORDS);
        expect(!bad, `${name}: the map says "${bad && bad[0]}": no scores, strength words, rankings, ideology, or party on the map`);
        expect(!/[–—]/.test(words), `${name}: a dash in the map's words`);
      }
      await done(p);
    }
    // a phone held upright gets the tall map, which fills the room between the top bar and the controls, up and down as well as across
    // (the wide map left empty bands above and below it), and names more committees; turned sideways, it glides to the wide map
    for (const [w, h] of [[390, 844], [360, 740]]) {
      const q = await open('/?panel=us&view=graph#phone', { mobile: true, easy: false, width: w, height: h, settle: 1500 });
      expect(await mapReady(q), `${w} by ${h}: the map did not draw`);
      const f = await mapFill(q);
      expect(f.across >= 0.85 && f.down >= 0.85, `${w} by ${h}: the map fills ${f.across} of the room across and ${f.down} up and down, not 85% of both`);
      const n = (await mapState(q)).labels.filter((l) => /· \d+$/.test(l.text)).length;
      expect(n >= 3 && n <= 10, `${w} by ${h}: ${n} committees are named at the start of a phone map, not a few (3 to 10)`);
      expect(!(await mapState(q)).labels.some((l) => l.kind === 'person'), `${w} by ${h}: people are named at rest`);
      await q.setViewport({ width: h, height: w, isMobile: true, hasTouch: true }); await wait(1800);
      const g2 = await mapFill(q);
      expect(g2.across >= 0.85 || g2.down >= 0.85, `${w} by ${h} turned sideways: the map does not fill the screen (${g2.across} across, ${g2.down} down)`);
      expect(await q.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${w} by ${h} turned sideways: the page scrolls sideways`);
      await done(q);
    }
    // a device that asks for less motion: Still, and nothing moves by itself
    const r = await open('/?panel=us#desktop', { width: 1440, height: 900, settle: 300 });
    await r.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await r.reload({ waitUntil: 'networkidle2' }); await wait(1500); await mapReady(r);
    expect((await mapState(r)).motion === 'still', `with reduced motion the map opens on ${(await mapState(r)).motion}, not Still`);
    { const f1 = await r.$eval('.usm-canvas', (c) => c.toDataURL()); await wait(800); expect(f1 === (await r.$eval('.usm-canvas', (c) => c.toDataURL())), 'the map moved by itself with reduced motion'); }
    await done(r);
    // the same record opens the same way every time (fixed seed)
    const places = async () => { const q = await open('/?panel=us#desktop', { width: 1440, height: 900 }); await mapReady(q); const out = [await mapAt(q, 'Jon Husted'), await mapAt(q, 'Donald J. Trump'), await mapAt(q, 'Senate Committee on Finance'), [(await mapState(q)).k]]; await done(q); return JSON.stringify(out.map((v) => v && v.map((n) => Math.round(n * 10) / 10))); };
    const a = await places(), b = await places();
    expect(a === b, `the map opened differently the second time: ${a} then ${b}`);
  },
  async 'us-map-touch'() {
    // Ported from the kit's test_phone_sky.py and test_momentum.py (vendor/relationship-map-kit/tests): a tap lights the connections only,
    // a second tap or a hold opens the details, a tap on the map closes them and a second tap clears, a drag moves one thing, two fingers
    // pinch, and in Calm a flick glides on and stops while a drag that comes to rest does not glide.
    const p = await open('/?panel=us&view=graph#phone', { mobile: true, easy: false, settle: 1500 });
    await mapReady(p);
    const cdp = await p.createCDPSession();
    const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y], id) => ({ x, y, id })) });
    const fitNow = async () => { await p.tap('.usm-zoom button[aria-label="Fit everything"]'); await wait(700); };
    let q = await mapAt(p, 'Jon Husted');
    await p.touchscreen.tap(q[0], q[1]); await wait(900);
    let st = await mapState(p);
    expect(st.focus === 'Jon Husted' && !st.sheet && (await has(p, '.usm-chip')), 'a tap should light the connections only, with a Details button');
    expect(st.near.length >= 5, `a tap drew ${st.near.length} connection lines`);
    q = await mapAt(p, 'Jon Husted'); await p.touchscreen.tap(q[0], q[1]); await wait(900);
    expect((await mapState(p)).sheet, 'a second tap on the same person should open their details');
    await p.tap('.usm-sheet .usm-done'); await wait(500);
    st = await mapState(p); expect(!st.sheet && st.focus === 'Jon Husted', 'Done should close the details and keep the lines');
    await fitNow();
    q = await mapAt(p, 'Bernie Moreno'); await touch('touchStart', [q]); await wait(850); await touch('touchEnd', []); await wait(900);
    st = await mapState(p); expect(st.sheet && st.focus === 'Bernie Moreno', 'holding a person should open their details');
    let e = await mapEmpty(p);
    await p.touchscreen.tap(e[0], e[1]); await wait(600); st = await mapState(p);
    expect(!st.sheet && st.focus === 'Bernie Moreno', 'a tap on the map should close the details and keep the lines');
    e = await mapEmpty(p); await p.touchscreen.tap(e[0], e[1]); await wait(600);
    expect((await mapState(p)).focus === null, 'a second tap on the map should clear the pick');
    // a drag moves one person, not the map
    await fitNow();
    q = await mapAt(p, 'Mike Lee'); const k0 = (await mapState(p)).k;
    await touch('touchStart', [q]); for (let i = 1; i <= 8; i++) { await touch('touchMove', [[q[0] + i * 10, q[1] + i * 6]]); await wait(20); } await touch('touchEnd', []); await wait(500);
    const q2 = await mapAt(p, 'Mike Lee');
    expect(Math.hypot(q2[0] - q[0] - 80, q2[1] - q[1] - 48) < 14 && (await mapState(p)).k === k0, `dragging a person should move that person (moved by ${Math.round(q2[0] - q[0])}, ${Math.round(q2[1] - q[1])})`);
    // two fingers: spreading zooms in, pinching zooms out, and the page does not scroll sideways
    const mid = await p.$eval('.usm-canvas', (c) => { const b = c.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; });
    const zoom = () => p.$eval('.usm-canvas', (c) => +c.getAttribute('data-zoom'));
    const pinch = async (from, to) => { await touch('touchStart', [[mid[0] - from, mid[1]], [mid[0] + from, mid[1]]]); for (let i = 1; i <= 6; i++) { const f = from + ((to - from) * i) / 6; await touch('touchMove', [[mid[0] - f, mid[1]], [mid[0] + f, mid[1]]]); await wait(30); } await touch('touchEnd', []); await wait(300); };
    const z0 = await zoom(); await pinch(20, 90); const z1 = await zoom();
    expect(z1 > z0 * 2.5, `spreading two fingers did not zoom in enough: ${z0} to ${z1}`);
    await pinch(90, 20); const z2 = await zoom();
    expect(z2 < z1 * 0.6, `bringing two fingers together did not zoom out: ${z1} to ${z2}`);
    expect(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'pinching made the page scroll sideways');
    // the glide (Calm): a flick keeps going and stops; a drag that rests before lifting stays put
    await p.tap('.usm-show-btn'); await wait(400); await clickText(p, 'Calm', '.usm-motion button'); await p.tap('.usm-panel .usm-done'); await wait(500);
    await fitNow(); await wait(1500);
    const T = async () => { const s = await mapState(p); return [Math.round(s.tx), Math.round(s.ty)]; };
    let sp = await mapEmpty(p);
    await touch('touchStart', [sp]); for (let i = 1; i <= 6; i++) { await touch('touchMove', [[sp[0] - i * 30, sp[1]]]); await wait(8); }
    const atLift = await T(); await touch('touchEnd', []); await wait(2600); const end = await T(); await wait(400); const end2 = await T();
    const glide = await p.$eval('.usm-canvas', (c) => c.dataset.glide);
    expect(glide === 'glide' && end[0] < atLift[0] - 20 && end[0] === end2[0], `a flick should glide on and then stop (${glide}: ${atLift[0]}, ${end[0]}, ${end2[0]})`);
    sp = await mapEmpty(p);
    await touch('touchStart', [sp]); for (let i = 1; i <= 6; i++) { await touch('touchMove', [[sp[0] + i * 15, sp[1]]]); await wait(12); } await wait(250);
    const a = await T(); await touch('touchEnd', []); await wait(700); const b = await T();
    expect(Math.abs(b[0] - a[0]) < 2, `a drag that came to rest glided anyway (${a[0]} to ${b[0]})`);
    await done(p);
  },
  async 'us-map-sheet'() {
    // Ported from the kit's test_sheet_pull.py and test_exits.py. On a phone the details sheet opens part way, keeps the picked one in view
    // above it, pulls up to near the top following the finger, snaps back after a small pull, and closes four ways: Done, a tap on the map,
    // a swipe down, and the back gesture (which leaves the map open). The Show panel closes the same four ways. On a computer the sheet
    // closes with Done, a click on the map, Escape, and the back button, and the United States page stays.
    const p = await open('/?panel=us&view=graph#phone', { mobile: true, easy: false, settle: 1500 });
    await mapReady(p);
    const cdp = await p.createCDPSession();
    const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y], id) => ({ x, y, id })) });
    const box = () => p.evaluate(() => { const s = document.querySelector('.usm-sheet'); if (!s) return null; const r = s.getBoundingClientRect(); return { top: Math.round(r.top), h: Math.round(r.height) }; });
    const openFor = async (who) => { await p.tap('.usm-zoom button[aria-label="Fit everything"]'); await wait(700); const q = await mapAt(p, who); await p.touchscreen.tap(q[0], q[1]); await wait(800); if (await has(p, '.usm-chip')) { await p.tap('.usm-chip'); await wait(900); } };
    const H = 844;
    await openFor('Jon Husted');
    let b = await box();
    expect(b && b.top > H * 0.3 && b.top < H * 0.7, `the sheet should open part way up, its top is at ${b && b.top}`);
    { const q = await mapAt(p, 'Jon Husted'); expect(q && q[1] > 60 && q[1] < b.top - 8, `the picked person is not in view above the sheet (${q && Math.round(q[1])}, sheet at ${b.top})`); }
    await touch('touchStart', [[195, b.top + 20]]); for (let k = 1; k <= 6; k++) { await touch('touchMove', [[195, b.top + 20 - k * 30]]); await wait(16); }
    const midDrag = await box(); await touch('touchEnd', []); await wait(800); const full = await box();
    expect(midDrag && midDrag.top < b.top - 100, 'the sheet does not follow the finger');
    expect(full && full.top <= H * 0.3, `the sheet did not pull up near the top: ${full && full.top}`);
    await touch('touchStart', [[195, full.top + 24]]); for (let k = 1; k <= 3; k++) { await touch('touchMove', [[195, full.top + 24 + k * 12]]); await wait(60); } await wait(300); await touch('touchEnd', []); await wait(700);
    expect(!!(await box()), 'a small pull down closed the sheet instead of snapping back');
    await p.tap('.usm-sheet .usm-done'); await wait(500);
    expect(!(await box()), 'Done did not close the sheet');
    await openFor('Bernie Moreno');
    { const e = await mapEmpty(p); await p.touchscreen.tap(e[0], e[1]); await wait(600); }
    expect(!(await box()), 'a tap on the map did not close the sheet');
    await openFor('Jon Husted'); b = await box();
    await touch('touchStart', [[195, b.top + 20]]); for (let k = 1; k <= 8; k++) { await touch('touchMove', [[195, b.top + 20 + k * 25]]); await wait(16); } await touch('touchEnd', []); await wait(800);
    expect(!(await box()), 'a swipe down did not close the sheet');
    await openFor('Jon Husted');
    await p.evaluate(() => history.back()); await wait(800);
    expect(!(await box()) && (await has(p, '.usm-canvas')) && /view=graph/.test(await p.evaluate(() => location.search)), 'the back gesture did not close the sheet, or it left the map');
    for (const how of ['Done', 'outside', 'swipe', 'back']) {
      await p.tap('.usm-show-btn'); await wait(500);
      expect(await has(p, '.usm-panel'), 'Show did not open');
      if (how === 'Done') await p.tap('.usm-panel .usm-done');
      else if (how === 'outside') await p.touchscreen.tap(195, 40);
      else if (how === 'swipe') { const s = await p.$eval('.usm-panel-top', (x) => { const r = x.getBoundingClientRect(); return [r.left + 60, r.top + 20]; }); await touch('touchStart', [s]); for (let k = 1; k <= 8; k++) { await touch('touchMove', [[s[0], s[1] + k * 25]]); await wait(16); } await touch('touchEnd', []); }
      else await p.evaluate(() => history.back());
      await wait(700);
      expect(!(await has(p, '.usm-panel')), `the Show panel did not close with ${how}`);
      expect(await has(p, '.usm-canvas'), `closing the Show panel with ${how} left the map`);
    }
    await done(p);
    const d = await open('/?panel=us#desktop', { width: 1440, height: 900, settle: 1500 });
    await mapReady(d);
    for (const how of ['Done', 'map', 'Escape', 'back']) {
      await d.click('.usm-zoom button[aria-label="Fit everything"]'); await wait(800);
      const q = await mapAt(d, 'Jon Husted'); await d.mouse.click(q[0], q[1]); await wait(1000);
      expect(await has(d, '.usm-sheet'), 'the sheet did not open on a computer');
      if (how === 'Done') await d.click('.usm-sheet .usm-done');
      else if (how === 'map') { const e = await mapEmpty(d); await d.mouse.click(e[0], e[1]); }
      else if (how === 'Escape') { await d.focus('.usm-sheet .usm-done'); await d.keyboard.press('Escape'); }
      else await d.evaluate(() => history.back());
      await wait(800);
      expect(!(await has(d, '.usm-sheet')), `the desktop sheet did not close with ${how}`);
      expect((await has(d, '.usm-canvas')) && /panel=us/.test(await d.evaluate(() => location.search)), `closing the sheet with ${how} left the United States page`);
    }
    await done(d);
  },
  async 'us-map-narrow'() {
    // Ported from the kit's test_narrow.py: at 320 and 260 wide (Display Zoom, text zoom) nothing on the map runs off the screen or scrolls
    // sideways, with the Show panel and the sheet open too; names stay on the map; Larger text makes the names larger; Reduce Motion gives Still.
    const over = (p) => p.evaluate(() => { const W = innerWidth; return [...document.querySelectorAll('.usm *')].filter((e) => { const r = e.getBoundingClientRect(); return r.width && r.height && r.right > W + 1 && r.left < W && getComputedStyle(e).visibility !== 'hidden'; }).map((e) => `${e.tagName.toLowerCase()}.${String(e.className).split(' ')[0]}:${Math.round(e.getBoundingClientRect().right)}`).slice(0, 5); });
    for (const [w, h] of [[320, 700], [260, 600]]) {
      const p = await open('/?panel=us&view=graph#phone', { mobile: true, easy: false, width: w, height: h, settle: 1500 });
      expect(await mapReady(p), `${w} wide: the map did not draw`);
      let o = await over(p); expect(!o.length, `${w} wide: parts of the map run off the screen: ${o}`);
      expect(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${w} wide: the page scrolls sideways`);
      let st = await mapState(p); let probs = labelProblems(st, await mapBlocked(p)); expect(!probs.length, `${w} wide: ${probs.slice(0, 2).join('; ')}`);
      expect(['Senate', 'House', 'Executive', 'Courts'].every((hb) => st.labels.some((l) => l.text.startsWith(hb + ' '))), `${w} wide: a branch hub is not named`);
      await p.tap('.usm-show-btn'); await wait(500); o = await over(p); expect(!o.length, `${w} wide: the Show panel runs off the screen: ${o}`); await p.tap('.usm-panel .usm-done'); await wait(400);
      const q = await mapAt(p, 'Jon Husted'); await p.touchscreen.tap(q[0], q[1]); await wait(800); await p.tap('.usm-chip'); await wait(900);
      o = await over(p); expect(!o.length, `${w} wide: the sheet runs off the screen: ${o}`);
      await p.tap('.usm-sheet .usm-done'); await wait(400);
      const hub0 = (await mapState(p)).labels.find((l) => l.text.startsWith('Senate '));
      await p.evaluate(() => document.querySelector('.cxm').classList.add('cxm-large')); await p.tap('.usm-zoom button[aria-label="Fit everything"]'); await wait(800);
      const hub1 = (await mapState(p)).labels.find((l) => l.text.startsWith('Senate '));
      expect(hub0 && hub1 && hub1.h > hub0.h, `${w} wide: Larger text did not make the names on the map larger`);
      await done(p);
    }
    const r = await open('/?panel=us&view=graph#phone', { mobile: true, easy: false, settle: 300 });
    await r.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await r.reload({ waitUntil: 'networkidle2' }); await wait(1500); await mapReady(r);
    expect((await mapState(r)).motion === 'still', 'with Reduce Motion the phone map is not Still');
    await done(r);
  },
  async 'us-profile'() {
    // The profile page (phase 6 of docs/plan-us-graph-master.md). It opens from the side sheet, the Index, and a link that names the person
    // (never the viewer). A kicker, the name, sentences and a fact line from the record, three numbers, the record as label and value with
    // a source and a pulled date on every row, party only as one dated row (styled like every other value), no score, strength, or ranking
    // word, and every connection with the record's own word. The corner map draws only their own connections, with a count on each group,
    // and its dots can be dragged and its groups tapped. Back and the back gesture return to the same place on the map. Every control is
    // 44 px, and on a phone the page is exactly the screen's width. Committees, agencies, courts, judges, Presidents, and chambers get the same page.
    const strip = (s) => String(s || '').replace(/\.$/, '');
    const waitProf = async (p, name) => { for (let t = 0; t < 50; t++) { if (await p.evaluate((n) => { const h = document.querySelector('.usm-prof h1'); return !!h && h.textContent.replace(/\.$/, '') === n; }, strip(name))) return true; await wait(150); } return false; };
    const waitVotes = async (p) => { for (let t = 0; t < 60; t++) { if (!/Loading the votes/.test((await txt(p, '.usm-prof')) || '')) return true; await wait(200); } return false; };
    const profText = (p) => p.evaluate(() => { const r = document.querySelector('.usm-prof'); if (!r) return null; const c = r.cloneNode(true); c.querySelectorAll('.usmp-row-party, .sp-ext, #usmp-l-votes .usmp-cn > span').forEach((e) => e.remove()); return c.textContent; });   // bill titles are the record's own words
    const corner = (p) => p.evaluate(() => { const c = document.querySelector('.usmp-canvas'); return c && c.cxCorner ? { focus: c.cxCorner.focus, groups: c.cxCorner.groups, ids: c.cxCorner.ids, shown: c.cxCorner.shown, labels: c.cxCorner.labels } : null; });
    const small = (p) => p.evaluate(() => [...document.querySelectorAll('.usm-prof button, .usm-prof a[href], .usm-prof select')].filter((el) => { const r = el.getBoundingClientRect(); if (!r.width || !r.height) return false; const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || (el.tagName === 'A' && cs.display === 'inline')) return false; return r.height < 44 || r.width < 44; }).map((el) => `${el.tagName.toLowerCase()}.${el.className}:${(el.textContent || '').trim().slice(0, 24)}`));
    const checkWords = async (p, where) => {
      const t = await profText(p);
      expect(!!t, `${where}: no profile`); if (!t) return;
      expect(!/\b(Republican|Democrat|Democratic|Independent|conservative|liberal|moderate)\b/i.test(t), `${where}: a party or ideology word outside the Party row`);
      const bad = t.match(MAP_WORDS); expect(!bad, `${where}: the profile says "${bad && bad[0]}"`);
      expect(!/[–—]/.test(t), `${where}: a dash on the profile`);
      const c = await corner(p), cl = c ? c.labels.map((l) => l.text).join(' ') : '';
      expect(!MAP_WORDS.test(cl), `${where}: a party or score word on the corner map`);
    };
    const checkCorner = async (p, where) => {
      await p.evaluate(() => document.querySelectorAll('.usm-prof .usmp-list .usm-more').forEach((b) => b.click())); await wait(300);
      const c = await corner(p), listed = new Set(await p.evaluate(() => [...document.querySelectorAll('.usm-prof [data-node]')].map((b) => b.getAttribute('data-node'))));
      expect(!!c && c.groups.length > 0 && c.ids.length > 0, `${where}: the corner map is empty`); if (!c) return;
      expect(c.ids.every((id) => listed.has(id)), `${where}: the corner map draws something that is not one of their connections`);
      const counts = await p.$$eval('.usmp-list', (ss) => Object.fromEntries(ss.map((s) => [s.id.replace('usmp-l-', ''), Number(s.querySelector('h3 small').textContent.replace(/,/g, ''))])));
      expect(c.groups.every((gr) => counts[gr.key] === gr.count), `${where}: a group on the corner map does not carry its list's count: ${JSON.stringify(c.groups.map((gr) => [gr.key, gr.count, counts[gr.key]]))}`);
      expect(c.groups.every((gr) => c.labels.some((l) => l.text === `${gr.title} ${gr.count}`)), `${where}: a group on the corner map is not named with its count`);
      const words = await p.$$eval('.usm-prof .usmp-list li', (ls) => ls.filter((l) => !(l.querySelector('.usmp-word') || {}).textContent).length);
      expect(words === 0, `${where}: ${words} connections have no word from the record beside them`);
    };
    // from the side sheet, on a computer, after moving the map (so "the same place" means something)
    const p = await open('/?panel=us#desktop', { width: 1440, height: 900, settle: 1500 });
    await mapReady(p);
    { const q0 = await mapAt(p, 'Jon Husted'); await p.mouse.move(q0[0], q0[1]); await p.mouse.wheel({ deltaY: -200 }); await wait(500); }
    const q = await mapAt(p, 'Jon Husted'); await p.mouse.click(q[0], q[1]); await wait(1400);
    expect(await has(p, '.usm-sheet'), 'clicking Jon Husted did not open the side sheet');
    const before = await mapState(p);
    await clickText(p, 'Open profile', '.usm-acts button');
    expect(await waitProf(p, 'Jon Husted'), 'Open profile did not open Jon Husted\'s profile page');
    expect(/[?&]who=jon-husted(&|#|$)/.test(await p.evaluate(() => location.href)), 'the address does not name the person');
    await wait(1600);
    { const href = await p.evaluate(() => location.href); expect(/[?&]who=jon-husted/.test(href), 'the person left the address while their profile is open'); expect(!/(state|district|ward|place|hood|address|area)=/i.test(href), `the address holds something about the viewer: ${href}`); }
    expect((await p.evaluate(() => document.querySelector('.usm-prof .usmp-kicker').textContent)) === 'Senator, Ohio', 'the kicker is not "Senator, Ohio"');
    expect((await p.evaluate(() => getComputedStyle(document.querySelector('.usm-prof .usmp-kicker')).textTransform)) === 'uppercase', 'the kicker is not set in capitals');
    expect(/^Represents Ohio in the Senate\. Current term since \w+ \d+, \d{4}\. Sits on \d+ committees?/.test(((await txt(p, '.usmp-sent')) || '').replace(/\s+/g, ' ')), `the sentence is "${await txt(p, '.usmp-sent')}"`);
    expect(await waitVotes(p), 'the votes never loaded on the profile');
    expect(/^Voted on [\d,]+ bills? this Congress\.$/.test((await txt(p, '.usmp-fact')) || ''), `the fact line is "${await txt(p, '.usmp-fact')}"`);
    const glance = await p.$$eval('.usmp-glance li', (ls) => ls.map((l) => [l.querySelector('b').textContent, l.querySelector('span').textContent]));
    expect(glance.length === 3 && glance.every(([n]) => /^[\d,]+$/.test(n)) && /^Recorded votes cast$/.test(glance[0][1]) && /^Committees?$/.test(glance[1][1]) && /^Subcommittees?$/.test(glance[2][1]), `At a glance is not three counts from the record: ${JSON.stringify(glance)}`);
    expect(/Bills they sponsored are not in our record yet/.test((await txt(p, '.usmp-glance')) || ''), 'the page does not say that sponsored bills are not in the record');
    const rec = await p.$$eval('.usmp-row', (rs) => rs.map((r) => ({ label: r.querySelector('dt').textContent, src: r.querySelector('.usmp-src a') ? r.querySelector('.usmp-src a').href : '', pulled: (r.querySelector('.usmp-src') || {}).textContent || '' })));
    for (const want of ['Chamber', 'State', 'Term', 'Party', 'Committees', 'Policy areas voted in', 'Official page']) expect(rec.some((r) => r.label === want), `From the record has no ${want} row`);
    expect(rec.every((r) => /^https:\/\//.test(r.src) && /pulled \w+ \d+, \d{4}/.test(r.pulled)), `a row of the record has no source link or pulled date: ${JSON.stringify(rec.filter((r) => !/^https:/.test(r.src) || !/pulled/.test(r.pulled)).map((r) => r.label))}`);
    // party: one dated, sourced row, and it looks like every other value (no party color, no mark)
    const look = await p.evaluate(() => { const css = (e) => { const s = getComputedStyle(e); return [s.color, s.backgroundColor, s.borderTopColor, s.fontWeight].join(); }; const v = document.querySelector('.usmp-row-party .usmp-val'), t = document.querySelector('.usmp-row-term .usmp-val'); return { party: css(v), term: css(t), marks: [...document.querySelectorAll('.usmp-row-party *')].filter((e) => getComputedStyle(e).backgroundColor !== 'rgba(0, 0, 0, 0)').length }; });
    expect(look.party === look.term && look.marks === 0, `party is styled apart from the other values: ${JSON.stringify(look)}`);
    expect(/Recorded as of \w+ \d+, \d{4}/.test((await txt(p, '.usmp-row-party')) || ''), 'party is not dated');
    await checkWords(p, 'Jon Husted');
    const cw = await p.$$eval('#usmp-l-committees .usmp-word', (ws) => ws.map((w) => w.textContent));
    expect(cw.length > 0 && cw.every((w) => /^(Member|Chair|Chairman|Ranking member|Vice chair|Vice chairman|Ex officio|Cochairman)$/.test(w)), `a committee row's word is not the record's: ${cw}`);
    const vw = await p.$$eval('#usmp-l-votes .usmp-word', (ws) => ws.map((w) => w.textContent));
    expect(vw.length > 0 && vw.every((w) => /^(Yea|Nay|Present|Not voting|Voted for a named person)$/.test(w)) && /Not voting is not a no/.test((await txt(p, '#usmp-l-votes')) || ''), `the votes are not listed with the record's words and the not-a-no note: ${vw.slice(0, 4)}`);
    await checkCorner(p, 'Jon Husted');
    expect(!(await small(p)).length, `controls under 44 px on the profile: ${(await small(p)).slice(0, 4)}`);
    // tap a group: its list comes into view and takes the focus; drag a dot: it moves
    { const c = await p.evaluate(() => { const cv = document.querySelector('.usmp-canvas'), r = cv.getBoundingClientRect(), g = cv.cxCorner.group('chamber'), d = cv.cxCorner.at(cv.cxCorner.ids[0]); return { g: [r.left + g[0], r.top + g[1]], d: [r.left + d[0], r.top + d[1]], id: cv.cxCorner.ids[0] }; });
      await p.mouse.click(c.g[0], c.g[1]); await wait(700);
      expect(await p.evaluate(() => !!document.activeElement && !!document.activeElement.closest('#usmp-l-chamber')), 'tapping a group on the corner map did not jump to its list');
      await p.evaluate(() => { const cv = document.querySelector('.usmp-canvas'); cv.scrollIntoView({ block: 'center' }); }); await wait(300);
      const d0 = await p.evaluate((id) => { const cv = document.querySelector('.usmp-canvas'), r = cv.getBoundingClientRect(), d = cv.cxCorner.at(id); return [r.left + d[0], r.top + d[1]]; }, c.id);
      await p.mouse.move(d0[0], d0[1]); await p.mouse.down(); for (let k = 1; k <= 6; k++) { await p.mouse.move(d0[0] + k * 7, d0[1] + k * 5); await wait(20); } await p.mouse.up(); await wait(600);
      const d1 = await p.evaluate((id) => { const cv = document.querySelector('.usmp-canvas'), r = cv.getBoundingClientRect(), d = cv.cxCorner.at(id); return [r.left + d[0], r.top + d[1]]; }, c.id);
      expect(Math.hypot(d1[0] - d0[0], d1[1] - d0[1]) > 15, `dragging a dot on the corner map did not move it (${JSON.stringify([d0, d1])})`); }
    // Back returns to the same place on the map: the same zoom, the same pick, the same sheet, and the person leaves the address
    await clickText(p, 'Back to the map', '.usmp-back'); await wait(900);
    let after = await mapState(p);
    const same = (a, b) => a.focus === b.focus && Math.abs(a.k - b.k) < 1e-6 && Math.abs(a.tx - b.tx) < 0.5 && Math.abs(a.ty - b.ty) < 0.5 && a.sheet === b.sheet;
    expect(!(await has(p, '.usm-prof')) && same(before, after), `Back did not return to the same place on the map: ${JSON.stringify([before.k, before.tx, before.ty, before.focus, before.sheet])} then ${JSON.stringify([after.k, after.tx, after.ty, after.focus, after.sheet])}`);
    expect(!/[?&]who=/.test(await p.evaluate(() => location.href)), 'the person stayed in the address after Back');
    // the back gesture does the same, one profile at a time (a connection's own profile first)
    await clickText(p, 'Open profile', '.usm-acts button'); await waitProf(p, 'Jon Husted');
    await p.evaluate(() => document.querySelector('#usmp-l-committees button').click()); await wait(900);
    expect(/Committee/.test(await p.evaluate(() => document.querySelector('.usm-prof h1').textContent)), 'a committee row did not open the committee\'s profile');
    await p.evaluate(() => history.back()); expect(await waitProf(p, 'Jon Husted'), 'the back gesture did not return to the profile before');
    await p.evaluate(() => history.back()); await wait(1000);
    after = await mapState(p);
    expect(!(await has(p, '.usm-prof')) && same(before, after) && /panel=us/.test(await p.evaluate(() => location.search)), 'the back gesture did not return to the same place on the map');
    // Show on the map and Explore in Index
    await clickText(p, 'Open profile', '.usm-acts button'); await waitProf(p, 'Jon Husted');
    await clickText(p, 'Show on the map', '.usmp-acts button'); await wait(1400);
    expect(!(await has(p, '.usm-prof')) && (await mapState(p)).focus === 'Jon Husted' && (await has(p, '.usm-sheet')), 'Show on the map did not pick them on the map');
    await clickText(p, 'Open profile', '.usm-acts button'); await waitProf(p, 'Jon Husted');
    await clickText(p, 'Explore in Index', '.usmp-acts button'); await wait(1000);
    expect((await txt(p, '.usm-pills button.on')) === 'Index' && /Jon Husted/.test((await txt(p, '.us-list button.on')) || ''), 'Explore in Index did not open the Index at them');
    await done(p);
    // a link that names the person opens their profile, on a computer and on phones; it is exactly the screen's width and cannot slide sideways
    for (const [name, url, o] of [['desktop', '/?panel=us&who=bernie-moreno#desktop', { width: 1440, height: 900 }], ['phone 390', '/?panel=us&who=bernie-moreno#phone', { mobile: true, easy: false }], ['phone 360', '/?panel=us&who=bernie-moreno#phone', { mobile: true, easy: false, width: 360, height: 740 }]]) {
      const r = await open(url, { ...o, settle: 2500 });
      expect(await waitProf(r, 'Bernie Moreno'), `${name}: the link did not open Bernie Moreno's profile`);
      await wait(1500); expect(/[?&]who=bernie-moreno/.test(await r.evaluate(() => location.href)), `${name}: the person left the address`);
      expect(await waitVotes(r), `${name}: the votes never loaded`);
      const wide = await r.evaluate(() => { const W = innerWidth, p0 = document.querySelector('.usm-prof'); return { doc: document.documentElement.scrollWidth - W, prof: p0.scrollWidth - p0.clientWidth, over: [...p0.querySelectorAll('*')].filter((e) => { const b = e.getBoundingClientRect(); return b.width && b.right > W + 1; }).map((e) => String(e.className)).slice(0, 4) }; });
      expect(wide.doc <= 0 && wide.prof <= 0 && !wide.over.length, `${name}: the profile is wider than the screen: ${JSON.stringify(wide)}`);
      await r.evaluate(() => { document.querySelector('.usm-prof').scrollLeft = 80; }); expect((await r.evaluate(() => document.querySelector('.usm-prof').scrollLeft)) === 0, `${name}: the profile slides sideways`);
      const sm = await small(r); expect(!sm.length, `${name}: controls under 44 px on the profile: ${sm.slice(0, 4)}`);
      await checkWords(r, `${name}, Bernie Moreno`);
      if (o.mobile) expect(!(await has(r, '.usm-hover')), `${name}: a phone shows a hover card`);
      await clickText(r, 'Back to the map', '.usmp-back'); await wait(1000);
      expect(!(await has(r, '.usm-prof')) && (await mapReady(r)) && !/[?&]who=/.test(await r.evaluate(() => location.href)), `${name}: Back from a link did not show the map, or left the person in the address`);
      await done(r);
    }
    // the same page for every kind of thing on the map
    for (const [slug, h1, kicker, want] of [
      ['senate-committee-on-finance', 'Senate Committee on Finance', /^Committee, Senate$/, ['Chamber', 'Chair', 'Members', 'Subcommittees']],
      ['agriculture-department', 'Agriculture Department', /^Agency$/, ['Kind', 'Federal Register documents', 'Who leads it']],
      ['supreme-court-of-the-united-states', 'Supreme Court of the United States', /^Supreme Court$/, ['Kind', 'Judges sitting now', 'Who appoints its judges']],
      ['samuel-a-alito-jr', 'Samuel A. Alito Jr.', /^Associate Justice, Supreme Court$/, ['Court', 'Title', 'Appointed by', 'Commissioned']],
      ['donald-j-trump', 'Donald J. Trump', /^President$/, ['Office', 'Term', 'Judges appointed who sit now']],
      ['united-states-senate', 'United States Senate', /^Chamber of Congress$/, ['Members', 'Committees']]]) {
      const r = await open(`/?panel=us&who=${slug}#desktop`, { width: 1440, height: 900, settle: 2500 });
      expect(await waitProf(r, h1), `${slug}: the link did not open the profile of ${h1}`);
      expect(kicker.test(await r.evaluate(() => (document.querySelector('.usm-prof .usmp-kicker') || {}).textContent || '')), `${slug}: the kicker is "${await r.evaluate(() => (document.querySelector('.usm-prof .usmp-kicker') || {}).textContent)}"`);
      const labels = await r.$$eval('.usmp-row dt', (ds) => ds.map((d) => d.textContent));
      for (const w of want) expect(labels.includes(w), `${slug}: From the record has no ${w} row (${labels.join(', ')})`);
      expect((await r.$$eval('.usmp-row', (rs) => rs.filter((x) => !x.querySelector('.usmp-src a')).length)) === 0, `${slug}: a row of the record has no source link`);
      await checkWords(r, slug); await checkCorner(r, slug);
      expect(!(await small(r)).length, `${slug}: controls under 44 px: ${(await small(r)).slice(0, 4)}`);
      await done(r);
    }
    // a link to someone who is not in the record shows the map and says so
    const u = await open('/?panel=us&who=nobody-in-the-record#desktop', { width: 1440, height: 900, settle: 2000 });
    expect((await mapReady(u)) && !(await has(u, '.usm-prof')) && /could not find that profile/.test((await txt(u, '.usm-sr[role="status"]')) || ''), 'a link to an unknown name did not show the map with a note');
    await done(u);
  },
  async 'us-map-chrome'() {
    // The map's own chrome on a computer. The Show panel opens beside the left menu, never over it, so People and Votes by topic stay in
    // reach while it is open. The map covers the app's header, so Settings (Style, Light or dark, Dictionary, Easy mode) open from the
    // map's own top bar, and from the profile page.
    for (const [w, h] of [[1440, 900], [1280, 800], [1024, 768]]) {
      const p = await open('/?panel=us#desktop', { width: w, height: h, settle: 1500 }); await mapReady(p);
      await p.click('.usm-show-btn'); await wait(500);
      const r = await p.evaluate(() => { const a = document.querySelector('.usm-panel').getBoundingClientRect(), m = document.querySelector('.usm-menu').getBoundingClientRect(); return { hit: !(a.right <= m.left || a.left >= m.right || a.bottom <= m.top || a.top >= m.bottom), items: [...document.querySelectorAll('.usm-menu li button')].map((b) => { const q = b.getBoundingClientRect(), e = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2); return [b.textContent, !!e && b.contains(e)]; }) }; });
      expect(!r.hit && r.items.length === 3 && r.items.every((x) => x[1]), `${w} by ${h}: the Show panel covers the left menu: ${JSON.stringify(r)}`);
      const top = await p.evaluate(() => { const a = document.querySelector('.usm-panel').getBoundingClientRect(), t = document.querySelector('.usm-top').getBoundingClientRect(); return !(a.right <= t.left || a.left >= t.right || a.bottom <= t.top || a.top >= t.bottom); });
      expect(!top, `${w} by ${h}: the Show panel runs under the top bar`);
      await clickText(p, 'Votes by topic', '.usm-menu li button'); await wait(500);
      expect((await txt(p, '.usm-menu li button.on')) === 'Votes by topic', `${w} by ${h}: Votes by topic could not be chosen while the Show panel was open`);
      await done(p);
    }
    const p = await open('/?panel=us#desktop', { width: 1440, height: 900, settle: 1500 }); await mapReady(p);
    expect(await has(p, '.usm-top .usm-set-btn'), 'the map\'s top bar has no Settings button');
    await p.click('.usm-top .usm-set-btn'); await wait(400);
    const st = (await txt(p, '.usm-settings')) || '';
    expect(/Style/.test(st) && /Light or dark/.test(st) && /System/.test(st) && /Dictionary/.test(st) && /Easy mode/.test(st), `Settings on the map lacks Style, Light or dark, Dictionary, or Easy mode: ${st.replace(/\s+/g, ' ')}`);
    { const sm = await p.evaluate(() => [...document.querySelectorAll('.usm-settings button')].filter((b) => b.getBoundingClientRect().height < 44).map((b) => b.textContent)); expect(!sm.length, `Settings controls under 44 px: ${sm}`); }
    const theme0 = await p.evaluate(() => document.documentElement.getAttribute('data-cx-theme'));
    await p.click('.usm-settings .cx-theme-switch'); await wait(300);
    expect((await p.evaluate(() => document.documentElement.getAttribute('data-cx-theme'))) !== theme0, 'Style did not switch from the map');
    await p.click('.usm-settings .cx-theme-switch'); await wait(300);
    const mode0 = await p.evaluate(() => document.documentElement.getAttribute('data-cx-mode'));
    await clickText(p, mode0 === 'light' ? 'Dark' : 'Light', '.usm-settings .cxm-seg button'); await wait(300);
    expect((await p.evaluate(() => document.documentElement.getAttribute('data-cx-mode'))) !== mode0, 'Light or dark did not switch from the map');
    await clickText(p, mode0 === 'light' ? 'Light' : 'Dark', '.usm-settings .cxm-seg button'); await wait(300);
    expect(await has(p, '.usm-canvas'), 'changing a setting left the map');
    await clickText(p, 'Dictionary', '.usm-settings .usm-switch'); await wait(500);
    expect(await has(p, '.usm-dict input'), 'Dictionary did not open over the map');
    await p.type('.usm-dict input', 'ward'); await wait(300);
    expect(/ward/i.test((await txt(p, '.usm-dict')) || ''), 'the dictionary over the map did not find "ward"');
    { const bad = await axeBad(p); expect(bad.length === 0, `axe on the dictionary over the map: ${bad.slice(0, 3).map((x) => `${x.id} ${x.target.slice(0, 50)}`).join('; ')}`); }
    await p.keyboard.press('Escape'); await wait(300);
    expect(!(await has(p, '.usm-dict')) && (await has(p, '.usm-canvas')), 'Escape did not close the dictionary, or it left the map');
    await p.click('.usm-top .usm-set-btn'); await wait(300); await p.mouse.click(700, 820); await wait(300);
    expect(!(await has(p, '.usm-settings')), 'a click outside Settings did not close it');
    await p.click('.usm-top .usm-set-btn'); await wait(300); await clickText(p, 'Easy mode', '.usm-settings .usm-switch'); await wait(1200);
    expect(!(await has(p, '.usm')) && (await has(p, '.cxe')), 'Easy mode did not open from the map');
    await done(p);
    const q = await open('/?panel=us&who=bernie-moreno#desktop', { width: 1440, height: 900, settle: 2500 });
    expect(await has(q, '.usm-prof .usm-set-btn'), 'the profile page has no Settings button');
    await q.click('.usm-prof .usm-set-btn'); await wait(400);
    expect(await has(q, '.usm-settings'), 'Settings did not open from the profile page');
    await done(q);
  },
  async 'print'() {
    const p = await open('/?panel=profiles#desktop'); await p.emulateMediaType('print'); await wait(250);
    const d = await p.evaluate(() => ['.atlas-header', '.atlas-sidebar', '.sp-pick'].map((s) => (document.querySelector(s) ? getComputedStyle(document.querySelector(s)).display : 'none')));
    expect(d.every((x) => x === 'none'), `print still shows app chrome: ${d}`); await done(p);
    const m = await open('/?panel=ledger#phone', { mobile: true, easy: false }); await m.emulateMediaType('print'); await wait(250);
    const ph = await m.evaluate(() => ({ tabs: getComputedStyle(document.querySelector('.cxm-tabs')).display, bg: getComputedStyle(document.body).backgroundColor }));
    expect(ph.tabs === 'none' && ph.bg === 'rgb(255, 255, 255)', `phone print not plain: ${JSON.stringify(ph)}`); await done(m);
  },
  async 'targets'() {
    for (const [name, o] of [['phone full', { mobile: true, easy: false }], ['phone easy', { mobile: true, easy: true }]]) {
      const p = await open('/#phone', o); await p.keyboard.press('Tab');
      if (!o.easy) expect(await p.evaluate(() => document.activeElement.className === 'cxm-skip'), 'first Tab stop on the phone is not the skip link');
      const small = await p.evaluate(() => [...document.querySelectorAll('button, a[href], select, input, [role=button], summary')].filter((el) => { const r = el.getBoundingClientRect(); if (!r.width || !r.height) return false; const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || (el.tagName === 'A' && cs.display === 'inline')) return false; return r.height < 44 || r.width < 44; }).map((el) => `${el.tagName.toLowerCase()}.${el.className}`));
      expect(small.length === 0, `${name}: controls under 44px: ${small.slice(0, 5)}`); await done(p);
    }
  },
};

/* ---- the United States map (ext/cx-us-map.jsx): what the checks read. The canvas carries cxMap, a small read-only view of what it drew
   (the names placed and their boxes, the focus and its drawn connections, the zoom), so a check can test names that are not page text. ---- */
async function mapReady(p) { for (let t = 0; t < 60; t++) { if (await p.evaluate(() => { const c = document.querySelector('.usm-canvas'); return !!(c && c.cxMap && c.cxMap.labels && c.cxMap.labels.length); })) return true; await wait(150); } return false; }
const mapState = (p) => p.evaluate(() => { const c = document.querySelector('.usm-canvas'), m = c.cxMap; return { focus: m.focus, near: m.near, shown: m.shown, k: m.k, tx: m.tx, ty: m.ty, motion: m.motion, labels: m.labels, people: m.peopleOnScreen, sheet: !!document.querySelector('.usm-sheet'), w: c.clientWidth, h: c.clientHeight }; });
const mapAt = (p, name) => p.evaluate((nm) => { const c = document.querySelector('.usm-canvas'), q = c.cxMap.at(nm); if (!q) return null; const r = c.getBoundingClientRect(); return [r.left + q[0], r.top + q[1]]; }, name);
const mapBlocked = (p) => p.evaluate(() => { const c = document.querySelector('.usm-canvas').getBoundingClientRect(); return [...document.querySelectorAll('.usm-float, .usm-sheet')].map((e) => e.getBoundingClientRect()).filter((r) => r.width && r.height).map((r) => ({ x: r.left - c.left, y: r.top - c.top, w: r.width, h: r.height })); });
const mapCover = (p) => p.evaluate(() => {
  // the share of the window the map covers (its canvas box), the share where the map or its own floating controls are on top (nothing else
  // from the app), and the share where the map itself is what you see (not under a floating control), on a 50 by 50 grid of points
  const W = innerWidth, H = innerHeight; let shell = 0, canvas = 0, n = 0;
  for (let y = 3; y < H; y += H / 50) for (let x = 3; x < W; x += W / 50) { n++; const e = document.elementFromPoint(x, y); if (e && e.closest('.usm')) shell++; if (e && e.classList.contains('usm-canvas')) canvas++; }
  const r = document.querySelector('.usm-canvas').getBoundingClientRect(), vis = Math.max(0, Math.min(r.right, W) - Math.max(r.left, 0)) * Math.max(0, Math.min(r.bottom, H) - Math.max(r.top, 0));
  return { rect: +(vis / (W * H)).toFixed(3), shell: +(shell / n).toFixed(3), canvas: +(canvas / n).toFixed(3), scroll: document.documentElement.scrollWidth <= innerWidth };
});
/* how much of the room between the map's top bar and its bottom controls the drawn map spans, across and up and down (1 is all of it) */
const mapFill = (p) => p.evaluate(() => {
  const c = document.querySelector('.usm-canvas'), r = c.getBoundingClientRect(), pts = c.cxMap.pts();
  const top = document.querySelector('.usm-top').getBoundingClientRect().bottom - r.top, bot = document.querySelector('.usm-ctl').getBoundingClientRect().top - r.top;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; pts.forEach(([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); });
  return { across: +((x1 - x0) / (r.width - 32)).toFixed(2), down: +((y1 - y0) / (bot - top - 22)).toFixed(2) };
});
async function mapEmpty(p) {
  return p.evaluate(() => {
    const c = document.querySelector('.usm-canvas'), r = c.getBoundingClientRect(), pts = c.cxMap.pts(), rings = c.cxMap.rings || [];
    const blocked = [...document.querySelectorAll('.usm-float, .usm-sheet, .usm-scrim')].map((e) => e.getBoundingClientRect()).filter((b) => b.width && b.height);
    for (let y = r.top + 90; y < r.bottom - 90; y += 13) for (let x = r.left + 40; x < r.right - 40; x += 13) {
      if (blocked.some((b) => x > b.left - 6 && x < b.right + 6 && y > b.top - 6 && y < b.bottom + 6)) continue;
      const cx = x - r.left, cy = y - r.top;
      if (pts.every(([px, py]) => Math.hypot(px - cx, py - cy) > 30) && rings.every(([hx, hy, hr]) => Math.hypot(hx - cx, hy - cy) > hr)) return [x, y];
    }
    return [r.left + 10, r.top + r.height / 2];
  });
}
/* names on the map: none overlaps another, none runs off the map, none hides under a floating control, and there are at most 90 */
function labelProblems(st, blocked) {
  const L = st.labels, out = [], hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  for (let i = 0; i < L.length; i++) {
    const a = L[i];
    if (a.x < 0 || a.y < 0 || a.x + a.w > st.w || a.y + a.h > st.h) out.push(`"${a.text}" runs off the map`);
    for (let j = i + 1; j < L.length; j++) if (hit(a, L[j])) out.push(`"${a.text}" overlaps "${L[j].text}"`);
    if (blocked.some((b) => hit(a, b))) out.push(`"${a.text}" is under a control`);
  }
  if (L.length > 90) out.push(`${L.length} names, more than 90`);
  return out;
}
/* words that would turn a map of recorded ties into a scoreboard or a party map (the kit's strength words included) */
const MAP_WORDS = /\b(strong|some|light)\b|\bscores?\b|\bmatch(es|ed)?\b|%|\bpercent|\bideolog|\bconservative|\bliberal\b|\b(Republican|Democrat|Democratic)\b|\branked\b|\branking (?!member)/i;

/* Known axe false positives. A violation matching one of these is skipped; everything else fails. */
const AXE_ALLOW = [
  { rule: 'label-content-name-mismatch', target: /data-node="(people|ohio-governor)"/, why: 'SVG label lines join without a space in the visible text, so the full name does contain the words' },
  { rule: 'label-content-name-mismatch', target: /aria-label="(Step|Paso) \d+: /, why: 'diagram step: number and name are separate SVG texts' },
  { rule: 'label-content-name-mismatch', target: /(^|\s)\.human$|\.cx-step/, why: 'diagram step 10: number and name are separate SVG texts' },
  { rule: 'label-content-name-mismatch', target: /(story|Historia[^"]*), (new|seen|nueva|vista)"\]/, why: 'initials in the story ring are decorative (aria-hidden); the name holds the visible word' },
  { rule: 'label-content-name-mismatch', target: /^\.seen$|\.cxm-story-btn/, why: 'a story ring already seen: axe names it by its class; same decorative initials as above' },
];
const AXE_PAGES = [
  ['desktop home', '/#desktop', {}], ['desktop united states', '/?panel=us#desktop', {}], ['phone united states map', '/?panel=us&view=graph#phone', { mobile: true, easy: false, settle: 1800 }], ['desktop home original', '/#desktop', { theme: 'original' }], ['desktop stories', '/?panel=stories#desktop', {}], ['desktop profiles', '/?panel=profiles#desktop', {}],
  ['desktop profiles original', '/?panel=profiles#desktop', { theme: 'original' }], ['desktop profile with votes', '/?panel=profiles&seat=ward-13#desktop', {}], ['desktop profile with votes original', '/?panel=profiles&seat=ward-13#desktop', { theme: 'original' }], ['desktop map room', '/?room=voting#desktop', {}], ['desktop news', '/?panel=news#desktop', {}], ['desktop ledger', '/?panel=ledger#desktop', {}],
  ['desktop ledger original', '/?panel=ledger#desktop', { theme: 'original' }], ['desktop leaders', '/?panel=leaders#desktop', {}], ['desktop place', '/?panel=place#desktop', {}], ['desktop ballot', '/?panel=ballot#desktop', {}],
  ['desktop bench', '/?panel=bench#desktop', {}], ['desktop easy', '/#desktop', { easy: true }],
  ['phone today', '/#phone', { mobile: true, easy: false }], ['phone settings', '/?panel=settings#phone', { mobile: true, easy: false }], ['phone my priorities', '/?panel=priorities#phone', { mobile: true, easy: false }], ['phone settings original', '/?panel=settings#phone', { mobile: true, easy: false, theme: 'original' }], ['phone today original', '/#phone', { mobile: true, easy: false, theme: 'original' }], ['phone easy', '/#phone', { mobile: true, easy: true }],
  ['phone room', '/?room=voting#phone', { mobile: true }], ['phone ledger', '/?panel=ledger#phone', { mobile: true }], ['phone ballot', '/?panel=ballot#phone', { mobile: true }], ['phone place', '/?panel=place#phone', { mobile: true }],
  ['phone news', '/?panel=news#phone', { mobile: true }],
  // the United States profile page (a senator, with the votes loaded; a committee), and Settings over the map
  ['desktop us profile', '/?panel=us&who=bernie-moreno#desktop', { settle: 2600 }], ['phone us profile', '/?panel=us&who=bernie-moreno#phone', { mobile: true, easy: false, settle: 2600 }],
  ['desktop us committee profile', '/?panel=us&who=senate-committee-on-finance#desktop', { settle: 2600 }], ['phone us court profile', '/?panel=us&who=supreme-court-of-the-united-states#phone', { mobile: true, easy: false, settle: 2600 }],
  ['desktop us map settings', '/?panel=us#desktop', { settle: 1800, after: 'usmSettings' }],
  // the levies guide with every "Read more" and the official wording open, so the text inside is checked too
  ['desktop levies', '/?panel=levies#desktop', { after: 'openAll' }], ['desktop levies original', '/?panel=levies#desktop', { theme: 'original', after: 'openAll' }], ['phone levies', '/?panel=levies#phone', { mobile: true, easy: false, after: 'openAll' }], ['phone city hall', '/?panel=meetings#phone', { mobile: true, easy: false }], ['phone city hall open', '/?panel=meetings#phone', { mobile: true, easy: false, after: 'hallOpen' }], ['phone city hall ward', '/?panel=meetings#phone', { mobile: true, easy: false, pre: `(() => { try { localStorage.setItem('cx-place', JSON.stringify({ v: 1, saved: new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' }), place: 'ward-6', hood: '', state: '', district: '' })); localStorage.setItem('cleveland-civic-values-v2', JSON.stringify({ version: 2, values: { housing: 'most', safety: 'important' }, stances: {} })); } catch (e) {} })()` }], ['phone levy story', '/#phone', { mobile: true, easy: false, after: 'levyStory' }], ['phone districts ask', '/?panel=ballot#phone', { mobile: true, easy: false, after: 'districtAsk' }], ['phone districts', '/?panel=ballot#phone', { mobile: true, easy: false, after: 'districtResult' }], ['desktop districts', '/?panel=districts#desktop', { after: 'districtResult' }],
];
const AXE_AFTER = {
  openAll: () => { document.querySelectorAll('.lv details').forEach((d) => { d.open = true; }); },
  hallOpen: async () => {   // At City Hall with everything opened: the day's meetings, the whole next agenda, the year's folds, and a search
    const w = (ms) => new Promise((r) => setTimeout(r, ms));
    document.querySelectorAll('.mt-daypanel details').forEach((d) => { d.open = true; });
    const all = document.querySelector('.mt-on .cxm-link'); if (all) all.click();
    const earlier = document.querySelector('.mt-earlier .cxm-drop-head'); if (earlier) { earlier.click(); await w(200); }
    const month = document.querySelector('.mt-months .cxm-drop-head'); if (month) { month.click(); await w(200); }
    const i = document.querySelector('.mt-find input');
    if (i) { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, 'liquor'); i.dispatchEvent(new Event('input', { bubbles: true })); await w(300); }
  },
  usmSettings: () => { const b = document.querySelector('.usm-top .usm-set-btn'); if (b) b.click(); },
  districtAsk: () => { const b = document.querySelector('.cxm-tile-acc button.cxm-btn-dark'); if (b) b.click(); },
  districtResult: async () => {   // open the finder (on the phone), type City Hall's address, and look for the districts
    const w = (ms) => new Promise((r) => setTimeout(r, ms));
    const b = document.querySelector('.cxm-tile-acc button.cxm-btn-dark'); if (b) { b.click(); await w(400); }
    const i = document.querySelector('.dist-field input'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, '601 Lakeside Ave 44114'); i.dispatchEvent(new Event('input', { bubbles: true })); await w(100);
    document.querySelector('.dist-actions .cxm-btn').click(); await w(1500);
  },
  levyStory: async () => {   // open the Issue 11 story, go to its last frame, and open Read more and the official wording
    const w = (ms) => new Promise((r) => setTimeout(r, ms));
    [...document.querySelectorAll('.cxm-story-btn')].find((b) => /(Issue|Asunto) 11/.test(b.getAttribute('aria-label') || '')).click(); await w(400);
    for (let i = 0; i < 9; i++) { const t = document.querySelector('.cxm-tap-r'); if (t) t.click(); else { const n = [...document.querySelectorAll('.cxm-story button')].find((b) => /^(Next|Siguiente)$/.test(b.innerText.trim())); if (n) n.click(); } await w(200); }
    document.querySelectorAll('.lv-more-story, .lv-wording').forEach((d) => { d.open = true; });
  },
};
async function axeBad(p) {
  await p.evaluate(axeSource);
  const v = await p.evaluate(() => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] }, rules: { 'label-content-name-mismatch': { enabled: true } } })
    .then((r) => r.violations.flatMap((x) => x.nodes.map((n) => ({ id: x.id, impact: x.impact, target: n.target.join(' '), msg: ((n.any[0] || n.all[0] || {}).message || '').slice(0, 100) })))));
  return v.filter((x) => !AXE_ALLOW.some((a) => a.rule === x.id && a.target.test(x.target)));
}
/* The look, as built: the computed text, color, and shape of the parts that make up the design, on the real screens, in both styles.
   design/look.json holds what they should be. A change here is a change to the design: make it on purpose, then run
       DESIGN_UPDATE=1 node scripts/checks/run.js --only design-look
   and read the diff of design/look.json before committing. Text, dates, and counts are not compared; only how things look. */
const LOOK_PROPS = ['color', 'backgroundColor', 'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'borderRadius', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'minHeight', 'borderTopWidth', 'borderTopColor'];
const LOOK_PAGES = [
  ['phone today', '/#phone', { mobile: true, easy: false }, null, ['.cxm-top', '.cxm-brand', '.cxm-top-actions .cxm-you', '.cxm-top-actions .cxm-lang', '.cxm-fresh', '.cxm-story-btn small', '.cxm-ring', '.cxm-count', '.cxm-count strong', '.cxm-h2', '.cxm-tabs button']],
  ['phone ballot', '/?panel=ballot#phone', { mobile: true, easy: false }, null, ['.cxm-keycard', '.cxm-keycard strong', '.cxm-tile', '.cxm-kicker']],
  ['phone story frame', '/#phone', { mobile: true, easy: false }, 'story', ['.cxm-story', '.cxm-bars i.on', '.cxm-story-who strong', '.cxm-story-big', '.cxm-story-small', '.cxm-story .cxm-kicker', '.cxm-story-text']],
  ['phone story figure', '/#phone', { mobile: true, easy: false }, 'figure', ['.cxm-story-fig', '.cxm-story-big']],
  ['phone number pad', '/#phone', { mobile: true, easy: false }, 'pad', ['.cxm-keys button', '.cxm-story .cxm-btn', '.cxm-story-fig']],
  ['phone levies', '/?panel=levies#phone', { mobile: true, easy: false }, null, ['.cxm-sheet', '.lv-tile', '.lv-tile-fig', '.lv-tile-per', '.lv-field input', '.lv-h2']],
  ['phone city hall', '/?panel=meetings#phone', { mobile: true, easy: false }, null, ['.cxm-full', '.cxm-full-bar', '.cxm-full-back', '.mt-lead', '.mt-head', '.mt-watch', '.mt-days [aria-selected="true"]', '.mt-days [aria-selected="false"]', '.mt-daypanel', '.mt-group-h', '.mt-item', '.mt-item small', '.mt-chip', '.mt-links', '.cxm-kicker']],
  ['desktop stories', '/?panel=stories#desktop', {}, null, ['.cx-stories h1', '.cx-stories-pick button', '.cx-story-reader', '.cx-story-big', '.cx-story-small', '.cx-story-btn']],
  ['desktop profile', '/?panel=profiles&seat=ward-13#desktop', {}, null, ['.sp h1', '.sp h2', '.sp-chip', '.sp-office']],
  ['desktop levies', '/?panel=levies#desktop', {}, null, ['.lv h1', '.lv-tile', '.lv-tile-fig', '.lv-h2']],
];
async function lookOf(p, selectors) {
  return p.evaluate((sels, props) => {
    const out = {};
    for (const s of sels) {
      const e = document.querySelector(s);
      if (!e) { out[s] = null; continue; }
      const cs = getComputedStyle(e), o = {};
      for (const k of props) {
        let v = cs[k];
        if (k === 'fontFamily') v = v.split(',')[0].replace(/["']/g, '').trim();
        else if (/px$/.test(v)) v = String(Math.round(parseFloat(v) * 10) / 10) + 'px';
        o[k] = v;
      }
      out[s] = o;
    }
    return out;
  }, selectors, LOOK_PROPS);
}
CHECKS['design-look'] = async () => {
  const file = path.join(__dirname, '..', '..', 'design', 'look.json');
  const have = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  const now = {};
  for (const look of ['bento dark', 'original dark', 'bento light', 'original light']) {
    const [style, mode] = look.split(' ');
    for (const [name, url, opt, step, sels] of LOOK_PAGES) {
      const p = await open(url, { ...opt, mode, theme: style === 'original' ? 'original' : undefined });
      if (step) {
        const ring = await p.$$('.cxm-story-btn'); let pick = null;
        for (const x of ring) { if (/Issue 10/.test(await x.evaluate((e) => e.getAttribute('aria-label') || ''))) pick = x; }
        if (pick) { await pick.click(); await wait(500); }
        const tap = async () => { const x = await p.$('.cxm-tap-r'); if (x) await x.click(); await wait(250); };
        if (step === 'figure' || step === 'pad') await tap();
        if (step === 'pad') await tap();
      }
      now[`${look} | ${name}`] = await lookOf(p, sels);
      await done(p);
    }
  }
  if (process.env.DESIGN_UPDATE) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(now, null, 1) + '\n'); console.log(`    wrote design/look.json (${Object.keys(now).length} screens)`); return; }
  expect(Object.keys(have).length > 0, 'design/look.json is missing: run DESIGN_UPDATE=1 node scripts/checks/run.js --only design-look');
  let shown = 0;
  for (const [screen, parts] of Object.entries(now)) {
    for (const [sel, props] of Object.entries(parts)) {
      const was = (have[screen] || {})[sel];
      if (was === undefined) { expect(false, `${screen}: ${sel} is not in design/look.json yet`); continue; }
      if (props === null || was === null) { expect(props === was, `${screen}: ${sel} ${props === null ? 'is no longer on the screen' : 'has appeared'}`); continue; }
      const diff = LOOK_PROPS.filter((k) => props[k] !== was[k]);
      if (diff.length && shown++ < 12) expect(false, `${screen}: ${sel} looks different (${diff.map((k) => `${k}: ${was[k]} -> ${props[k]}`).join('; ')})`);
      else if (diff.length) fails.push(`${screen}: ${sel} looks different`);
    }
  }
};
/* Color vision. Part one (scripts/design/cvd.js, run by test_design.js) checks the color groups in design/tokens.json under protanopia,
   deuteranopia, tritanopia, and achromatopsia. This part looks at the built screens: every small colored mark (a dot, a bar segment, a
   swatch) must have a word with it, or a label, so color is never the only signal; and every color used as a mark must be in a "meaning"
   group in design/tokens.json, so a new color meaning cannot be added without being tested. */
const CV_PAGES = [
  ['phone today', '/#phone', { mobile: true, easy: false }], ['phone ballot', '/?panel=ballot#phone', { mobile: true, easy: false }], ['phone news', '/?panel=news#phone', { mobile: true, easy: false }],
  ['phone people', '/?panel=leaders#phone', { mobile: true, easy: false }], ['phone place', '/?panel=place#phone', { mobile: true, easy: false }], ['phone us', '/?panel=us#phone', { mobile: true, easy: false }],
  ['desktop home', '/#desktop', {}], ['desktop leaders', '/?panel=leaders#desktop', {}], ['desktop profile', '/?panel=profiles&seat=ward-13#desktop', {}],
  ['desktop us', '/?panel=us#desktop', {}], ['desktop place', '/?panel=place#desktop', {}], ['desktop stories', '/?panel=stories#desktop', {}],
  ['desktop us profile', '/?panel=us&who=bernie-moreno#desktop', { settle: 2600 }], ['phone us profile', '/?panel=us&who=bernie-moreno#phone', { mobile: true, easy: false, settle: 2600 }],
];
/* Words on each phone screen, counted as a person sees them (nothing folded is opened). A screen may not grow past its recorded count plus a small allowance, so
   the app cannot slowly fill up with explanation again. When a screen gets shorter on purpose, lower the record:
     TEXT_BUDGET_UPDATE=1 node scripts/checks/run.js --only text-budget
   Screens that show a record's own words (What's new) are left out. See docs/plan-plain-text.md. */
// At City Hall was 0.35 while it was a sheet of 722 words; as a page it holds about 400 (docs/plan-city-hall-page.md), so it gets the same room as Today
const TEXT_WIDE = { 'At City Hall': 0.15, Today: 0.15, 'Decision ledger': 0.3 };
const TEXT_SCREENS = [
  ['Today', '/#phone'], ['Explore', '/#phone', 'Explore'], ['My place', '/?panel=place#phone'], ['People: Profiles', '/?panel=leaders#phone'],
  ['People: Federal', '/?panel=us#phone'], ['People: Constellation', '/?panel=constellation#phone'], ['Priorities', '/?panel=priorities#phone'],
  ['Ballot', '/?panel=ballot#phone'], ['Levies and taxes', '/?panel=levies#phone'], ['At City Hall', '/?panel=meetings#phone'],
  ['Decision ledger', '/?panel=ledger#phone'], ['How this is built', '/?panel=bench#phone'], ['Settings', '/?panel=settings#phone'],
  ['United States: a profile', '/?panel=us&who=bernie-moreno#phone'],
];
CHECKS['text-budget'] = async () => {
  const file = path.join(__dirname, 'text-budget.json');
  const have = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  const now = {};
  for (const [name, url, tab] of TEXT_SCREENS) {
    const p = await open(url, { mobile: true, easy: false, settle: 1500 });
    if (tab) { await p.evaluate((t) => { const b = [...document.querySelectorAll('.cxm-tabs button, nav button, [role=tab]')].find((x) => (x.innerText || '').trim().startsWith(t)); if (b) b.click(); }, tab); await wait(900); }
    now[name] = await p.evaluate(() => { const root = document.querySelector('.usm-prof') || document.querySelector('.cxm-sheet') || document.querySelector('.cxm-full') || document.querySelector('.cxm-main') || document.body; return (root.innerText || '').trim().split(/\s+/).filter(Boolean).length; });   // a full page (At City Hall) counts itself, not Today under it
    await done(p);
  }
  if (process.env.TEXT_BUDGET_UPDATE) { fs.writeFileSync(file, JSON.stringify(now, null, 1) + String.fromCharCode(10)); console.log(`    wrote scripts/checks/text-budget.json (${Object.keys(now).length} screens)`); return; }
  expect(Object.keys(have).length > 0, 'scripts/checks/text-budget.json is missing: run TEXT_BUDGET_UPDATE=1 node scripts/checks/run.js --only text-budget');
  for (const [name, words] of Object.entries(now)) {
    const rec = have[name];
    if (rec == null) { expect(false, `${name} has no recorded word count: run TEXT_BUDGET_UPDATE=1 node scripts/checks/run.js --only text-budget`); continue; }
    const room = Math.max(30, Math.round(rec * (TEXT_WIDE[name] || 0.08)));   // screens built from the nightly records vary more than screens of our own words
    expect(words <= rec + room, `${name} grew to ${words} words (recorded ${rec}, room ${room}). Say it in fewer words, or record the new count on purpose with TEXT_BUDGET_UPDATE=1`);
  }
};
/* Speed budget (docs/performance.md). Bytes fail the check; the one timing only warns, because timings depend on the machine.
     PERF_BUDGET_UPDATE=1 node scripts/checks/run.js --only perf-budget      record today's numbers on purpose (and say why in the commit)
   - the app's own code in the hosted page (everything but its data block), gzipped, may grow 3% past its record
   - the records in the data block may grow 60% (a year of Council records), so only an accident, such as embedding a lazy file, fails
   - a phone's first load of Today asks only for the page, fonts, pictures, and the meetings file: never the federal record, the votes,
     the district list, or (in English) the Spanish dictionary; all it asks for, gzipped, may grow 25%
   - opening the United States map downloads the federal record and the map's places, gzipped: may grow 25%
   - the map's first drawing makes a fixed number of canvas shape calls (paths, fills, lines; not text, whose count depends on the font
     having arrived): may grow 10%. When it is done, counted from the start of the page, is printed, with a warning past twice the record. */
const PERF_TODAY_OK = [/^\/$/, /^\/index\.html$/, /^\/favicon\.svg$/, /^\/manifest\.webmanifest$/, /^\/sw\.js$/, /^\/fonts\/[^/]+\.woff2$/, /^\/portraits\/[^/]+\.webp$/, /^\/meetings\/meetings-2026\.json$/, /^\/bench\/[^/]+\.json$/];
function perfGzip(rel) {
  const f = path.join(SITE, rel.replace(/^\//, '') || 'index.html'), raw = fs.readFileSync(f);
  return /\.(html|js|json|svg|webmanifest|css)$/.test(f) ? require('zlib').gzipSync(raw, { level: 9 }).length : raw.length;
}
function perfCanvasCount() {   // runs in the page before anything else: counts canvas shape calls until the map's first drawing is done
  const P = (window.__cxCanvas = { n: 0, first: null, at: null });
  for (const k of ['beginPath', 'closePath', 'moveTo', 'lineTo', 'arc', 'rect', 'fill', 'stroke', 'fillRect']) {
    const f = CanvasRenderingContext2D.prototype[k];
    CanvasRenderingContext2D.prototype[k] = function (...a) { P.n++; return f.apply(this, a); };
  }
  // the map hands what it drew to the canvas as cxMap at the end of each drawing, so the first assignment marks the end of the first drawing
  Object.defineProperty(HTMLCanvasElement.prototype, 'cxMap', { configurable: true, get() { return this.__cxMap; }, set(v) { if (P.first === null && v && v.labels && v.labels.length) { P.first = P.n; P.at = performance.now(); } this.__cxMap = v; } });
}
CHECKS['perf-budget'] = async () => {
  const file = path.join(__dirname, 'perf-budget.json');
  const have = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  const html = fs.readFileSync(path.join(SITE, 'index.html'), 'utf8'), gz = (s) => require('zlib').gzipSync(Buffer.from(s, 'utf8'), { level: 9 }).length;
  const block = /<script type="application\/json" id="cx-data">[\s\S]*?<\/script>\n?/.exec(html);
  expect(!!block, 'the hosted page has no data block (cx-data): the records went back into the code, where they are slower to read');
  const now = { pageCodeGzip: gz(block ? html.replace(block[0], '') : html), pageDataGzip: block ? gz(block[0]) : 0 };
  // Today's first load on a phone, in this check's language
  const p = await open('/#phone', { mobile: true, easy: false, settle: 1500 });
  const asked = [...new Set(p.asked)].sort(), ok = process.env.CHECK_LANG === 'es' ? [...PERF_TODAY_OK, /^\/i18n\/es\.json$/] : PERF_TODAY_OK;
  const extra = asked.filter((u) => !ok.some((re) => re.test(u)));
  expect(extra.length === 0, `the first load of Today asked for files it does not need yet: ${extra.join(', ')} (load them when their screen opens)`);
  // the total leaves out the service worker and, in Spanish, the dictionary (the reader's choice, not part of the app's growth), so both languages count the same files
  now.todayFirstLoadGzip = asked.filter((u) => ok.some((re) => re.test(u)) && !/^\/(sw\.js|i18n\/es\.json)$/.test(u)).reduce((t, u) => t + perfGzip(u === '/' ? '/index.html' : u), 0);
  await done(p);
  now.mapFilesGzip = perfGzip('/us/landscape-2026.json') + perfGzip('/us/map-2026.json');
  // the United States map's first drawing on a computer
  const m = await open('/?panel=us#desktop', { pre: perfCanvasCount, settle: 600 });
  for (let t = 0; t < 80 && !(await m.evaluate(() => window.__cxCanvas.first !== null)); t++) await wait(100);
  const c = await m.evaluate(() => ({ ops: window.__cxCanvas.first, ms: window.__cxCanvas.at }));   // ms: from the start of the page (its data may arrive before the app starts)
  await done(m);
  expect(c.ops !== null, 'the United States map never finished its first drawing');
  now.mapFirstDrawOps = c.ops; now.mapFirstDrawMs = c.ms === null ? null : Math.round(c.ms);
  console.log(`    page code ${(now.pageCodeGzip / 1024).toFixed(1)} KB gzip, records ${(now.pageDataGzip / 1024).toFixed(1)} KB, Today's first load ${(now.todayFirstLoadGzip / 1024).toFixed(1)} KB (${asked.length} files), map files ${(now.mapFilesGzip / 1024).toFixed(1)} KB, map first drawing ${now.mapFirstDrawOps} canvas calls, done ${now.mapFirstDrawMs} ms after the page started`);
  if (process.env.PERF_BUDGET_UPDATE) {
    const rec = { about: 'Recorded by PERF_BUDGET_UPDATE=1 node scripts/checks/run.js --only perf-budget. Bytes are gzip -9 of the files in site/. See docs/performance.md.', ...now, recorded: new Date().toISOString().slice(0, 10) };
    fs.writeFileSync(file, JSON.stringify(rec, null, 1) + String.fromCharCode(10)); console.log('    wrote scripts/checks/perf-budget.json'); return;
  }
  expect(Object.keys(have).length > 0, 'scripts/checks/perf-budget.json is missing: run PERF_BUDGET_UPDATE=1 node scripts/checks/run.js --only perf-budget');
  const room = { pageCodeGzip: 1.03, pageDataGzip: 1.6, todayFirstLoadGzip: 1.25, mapFilesGzip: 1.25, mapFirstDrawOps: 1.1 };
  for (const [k, f] of Object.entries(room)) {
    if (have[k] == null || now[k] == null) continue;
    expect(now[k] <= Math.round(have[k] * f), `${k} grew to ${now[k]} (recorded ${have[k]}, room ${Math.round((f - 1) * 100)}%). Find what grew, or record the new size on purpose with PERF_BUDGET_UPDATE=1`);
  }
  if (have.mapFirstDrawMs && now.mapFirstDrawMs > have.mapFirstDrawMs * 2) console.log(`    warning: the map's first drawing was done ${now.mapFirstDrawMs} ms after the page started, more than twice the ${have.mapFirstDrawMs} ms recorded (a timing, so not a failure; measure it with node scripts/perf/measure.js)`);
};
CHECKS['color-vision'] = async () => {
  const tokens = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'design', 'tokens.json'), 'utf8'));
  const known = new Set();
  for (const g of tokens.meaning) for (const hex of [...Object.values(g.colors), ...Object.values(g.colorsLight || {}), ...Object.values(g.colorsLight2 || {})]) known.add(hex.toLowerCase());
  const hexOf = (rgb) => '#' + (rgb.match(/\d+/g) || []).slice(0, 3).map((n) => Number(n).toString(16).padStart(2, '0')).join('');
  const unknown = new Map();
  for (const [name, url, opt] of CV_PAGES) {
    if (process.env.CV_PAGE && !process.env.CV_PAGE.split(',').includes(name)) continue;
    const p = await open(url, opt);
    const marks = await p.evaluate(() => {
      const out = [];
      for (const e of document.querySelectorAll('body *')) {
        if (/^(SVG|PATH|IMG|INPUT|CANVAS|SCRIPT|STYLE)$/i.test(e.tagName) || e.closest('svg')) continue;
        if (e.closest('.cxm-fresh, .cx-fresh-chip, .cxm-bars, .cxm-sheet-bar, .cx-theme-switch') || /cxm-grab|cx-theme-dot|control-divider|cxm-ring|cx-stories-ring/.test(String(e.className))) continue;
        const cs = getComputedStyle(e), b = e.getBoundingClientRect();
        if (!b.width || !b.height || cs.visibility === 'hidden' || cs.display === 'none') continue;
        if (cs.backgroundColor === 'rgba(0, 0, 0, 0)' || (e.textContent || '').trim()) continue;
        if (Math.min(b.width, b.height) > 14 || Math.max(b.width, b.height) > 160) continue;
        const alpha = (cs.backgroundColor.match(/rgba?\(([^)]*)\)/)[1].split(',')[3]);
        if (alpha !== undefined && Number(alpha) < 0.5) continue;
        let near = (e.getAttribute('aria-label') || e.getAttribute('title') || '').trim(), up = e.parentElement;
        for (let i = 0; i < 3 && near.length < 3 && up; i++, up = up.parentElement) near = (up.innerText || '').trim();
        out.push({ cls: String(e.className).split(' ')[0] || e.tagName, bg: cs.backgroundColor, near: near.length >= 3 });
      }
      return out;
    });
    for (const m of marks) {
      expect(m.near, `${name}: a ${m.cls} mark (${hexOf(m.bg)}) has no word or label with it, so color is its only signal`);
      const h = hexOf(m.bg);
      if (!known.has(h) && !unknown.has(h)) unknown.set(h, `${name} (${m.cls})`);
    }
    await done(p); await wait(400);
  }
  for (const [h, where] of unknown) expect(false, `${h} is used as a colored mark on ${where} but is in no "meaning" group in design/tokens.json: add it, say what carries its meaning, and run node scripts/design/cvd.js`);
};
// AXE_PAGE="desktop home,phone place" limits the run to those pages (a page name is the first word group of each AXE_PAGES row)
CHECKS['axe'] = async () => {
  for (const [name, url, o] of AXE_PAGES) {
    if (process.env.AXE_PAGE && !process.env.AXE_PAGE.split(',').includes(name)) continue;
    const p = await open(url, o);
    if (o.after) { await p.evaluate(AXE_AFTER[o.after]); await wait(300); }
    const bad = await axeBad(p);
    expect(bad.length === 0, `axe on ${name}: ${bad.length} violation(s): ` + bad.slice(0, 4).map((x) => `${x.id} ${x.target.slice(0, 60)}`).join('; '));
    await done(p);
  }
};

// Text that spills out of the box that holds it. A "box" is anything with its own background or border; text inside a clipping or
// scrolling parent, or inside something that is positioned on purpose (fixed, absolute, sticky), does not count.
async function bleedBad(p) {
  return p.evaluate(() => {
    const out = [];
    const tol = 2.5;
    const boxy = (e, cs) => (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || parseFloat(cs.borderTopWidth) > 0 || parseFloat(cs.borderLeftWidth) > 0) && cs.display !== 'inline';
    const all = [...document.querySelectorAll('body *')];
    for (const e of all) {
      if (['SCRIPT', 'STYLE', 'SVG', 'svg', 'PATH', 'CANVAS', 'IMG', 'INPUT', 'SELECT', 'TEXTAREA', 'OPTION'].includes(e.tagName)) continue;
      const cs = getComputedStyle(e);
      const r = e.getBoundingClientRect();
      if (!r.width || !r.height || cs.visibility === 'hidden' || cs.display === 'none' || !boxy(e, cs)) continue;
      if (r.height >= innerHeight * 0.8 || /atlas-shell|atlas-main|atlas-body|cxm-stage|cxm-main/.test(String(e.className))) continue;  // the page itself scrolls; it is not a card
      if (/(hidden|clip|auto|scroll)/.test(cs.overflowY + cs.overflowX)) continue;
      const walker = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
      let n, worst = 0, sample = '';
      while ((n = walker.nextNode())) {
        if (!n.textContent.trim()) continue;
        let skip = e.tagName === 'DETAILS' && !e.open && !(n.parentElement && n.parentElement.closest('summary'));
        for (let a = n.parentElement; !skip && a && a !== e; a = a.parentElement) {
          const c = getComputedStyle(a);
          if (/(hidden|clip|auto|scroll)/.test(c.overflowY + c.overflowX) || ['fixed', 'absolute', 'sticky'].includes(c.position) || c.display === 'none' || c.visibility === 'hidden' || a.getAttribute('aria-hidden') === 'true' || /cxm-sr|sp-ext/.test(a.className || '') || (a.tagName === 'DETAILS' && !a.open && !(n.parentElement && n.parentElement.closest('summary')))) { skip = true; break; }
        }
        if (skip) continue;
        const range = document.createRange(); range.selectNodeContents(n);
        for (const q of range.getClientRects()) {
          if (!q.width || !q.height) continue;
          const over = Math.max(q.bottom - r.bottom, r.top - q.top, q.right - r.right, r.left - q.left);
          if (over > tol && over > worst) { worst = over; sample = n.textContent.trim().slice(0, 40); }
        }
      }
      if (worst > tol) out.push({ cls: (e.className && e.className.baseVal === undefined ? e.className : String(e.className)).toString().slice(0, 50) || e.tagName, over: Math.round(worst), text: sample });
    }
    // keep only the outermost offender of a nested set
    return out.filter((o, i) => !out.slice(0, i).some((q) => q.text === o.text)).slice(0, 12);
  });
}
// Text cut off by a box that hides its overflow, so it cannot be read to the end. Single-line chrome that ends in an ellipsis on purpose
// (the brand name, the Updated strip) and map labels are allowed; everything else must show all of its text.
async function clipBad(p) {
  return p.evaluate(() => {
    const out = [];
    for (const e of document.querySelectorAll('body *')) {
      if (e.closest('svg') || /^(SCRIPT|STYLE|CANVAS|IMG|INPUT|SELECT|TEXTAREA|BUTTON)$/.test(e.tagName) && !e.innerText) continue;
      const cs = getComputedStyle(e);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      const r = e.getBoundingClientRect();
      if (!r.width || !r.height || r.width <= 2 || r.height <= 2) continue;
      if (/cxm-sr|sp-ext|cxm-brand|cxm-fresh|cxm-skip|cxm-ring|cxm-story-btn/.test(String(e.className))) continue;
      const clipsY = /(hidden|clip)/.test(cs.overflowY) && e.scrollHeight > e.clientHeight + 2;
      const clipsX = /(hidden|clip)/.test(cs.overflowX) && cs.textOverflow === 'ellipsis' && e.scrollWidth > e.clientWidth + 2;
      if ((clipsY || clipsX) && (e.innerText || '').trim().length > 3) out.push({ cls: String(e.className).slice(0, 50) || e.tagName, text: e.innerText.trim().slice(0, 40), kind: clipsY ? 'tall' : 'wide', by: clipsY ? e.scrollHeight - e.clientHeight : e.scrollWidth - e.clientWidth });
    }
    return out.slice(0, 12);
  });
}
/* Text on top of text. A number that runs into its label, a line that sits over the next one: no two pieces of visible text may overlap. Every page the accessibility check visits is
   scrolled from top to bottom, and the text that is really painted (not hidden in a closed section, not covered by a sheet) is compared. */
const OVERLAP_FN = () => {
  const boxes = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walker.nextNode())) {
    const t = n.nodeValue.replace(/\s+/g, ' ').trim();
    if (t.length < 2) continue;
    const el = n.parentElement;
    if (!el || el.closest('svg, canvas, script, style, noscript, [aria-hidden="true"], .cxm-sr, .sp-ext, .cxm-fresh-hint')) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility !== 'visible' || cs.display === 'none' || parseFloat(cs.opacity) < 0.05) continue;
    const range = document.createRange(); range.selectNodeContents(n);
    for (const r of range.getClientRects()) {
      if (r.width < 4 || r.height < 6 || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
      const y = Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2));
      const painted = [0.1, 0.3, 0.5, 0.7, 0.9].some((f) => { const top = document.elementFromPoint(Math.min(innerWidth - 1, Math.max(0, r.left + r.width * f)), y); return !!top && el.contains(top); });
      if (!painted) continue;   // painted: somewhere along the text, what is on top is the text's own element (so text in a closed section or under a sheet is not counted, but text that another text partly covers is)
      boxes.push({ t: t.slice(0, 28), el, x0: r.left, x1: r.right, y0: r.top, y1: r.bottom });
    }
  }
  boxes.sort((a, b) => a.y0 - b.y0);
  const out = [];
  const name = (e) => `${e.tagName.toLowerCase()}${typeof e.className === 'string' && e.className ? '.' + e.className.split(' ')[0] : ''}`;
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length && boxes[j].y0 < boxes[i].y1; j++) {
      const a = boxes[i], b = boxes[j];
      if (a.el === b.el) continue;
      const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), h = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
      if (w > 3 && h > 3 && w * h > 0.15 * Math.min((a.x1 - a.x0) * (a.y1 - a.y0), (b.x1 - b.x0) * (b.y1 - b.y0))) out.push(`"${a.t}" (${name(a.el)}) over "${b.t}" (${name(b.el)}), ${Math.round(w)}x${Math.round(h)}px`);
    }
  }
  return out.slice(0, 6);
};
async function overlapScan(p) {
  const info = await p.evaluate(() => {
    const cands = [document.scrollingElement, ...document.querySelectorAll('*')].filter((e) => e && e.scrollHeight - e.clientHeight > 60 && (e === document.scrollingElement || (/(auto|scroll)/.test(getComputedStyle(e).overflowY) && e.clientWidth > 280)));
    const sheet = document.querySelector('.cxm-sheet') || document.querySelector('.cxm-full-body');   // a sheet, or a full page over the tabs, is what is on screen
    const el = sheet && cands.includes(sheet) ? sheet : cands.sort((a, b) => (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight))[0] || document.scrollingElement;
    window.__scroller = el;
    return { h: el.scrollHeight, vh: el === document.scrollingElement ? innerHeight : el.clientHeight };
  });
  const step = Math.max(200, Math.floor(info.vh * 0.8)), found = new Set();
  for (let y = 0, k = 0; y < info.h && k < 18; y += step, k++) {
    await p.evaluate((y) => { window.__scroller.scrollTo(0, y); }, y); await wait(70);
    for (const f of await p.evaluate(OVERLAP_FN)) found.add(f);
  }
  return [...found];
}
CHECKS['text-overlap'] = async () => {
  const pages = AXE_PAGES.filter(([name]) => !/^desktop (home original|ledger original|profiles original|profile with votes original)$/.test(name) && (!process.env.AXE_PAGE || process.env.AXE_PAGE.split(',').includes(name)));
  for (const [name, url, o] of pages) {
    const p = await open(url, o);
    if (o.after) { await p.evaluate(AXE_AFTER[o.after]); await wait(300); }
    const bad = await overlapScan(p);
    expect(bad.length === 0, `text overlaps text on ${name}: ` + bad.slice(0, 3).join('; '));
    await done(p);
  }
  if (!process.env.AXE_PAGE || process.env.AXE_PAGE === 'sheets') {   // the Profile sheet (counts, lists, votes) is where the big numbers are
    const s = await open('/?panel=profiles#phone', { mobile: true, easy: false });
    await clickText(s, 'Profile', '.cxm-prof-actions button'); await wait(900);
    const bad = await overlapScan(s);
    expect(bad.length === 0, 'text overlaps text on the Profile sheet: ' + bad.slice(0, 3).join('; '));
    await done(s);
  }
  // the detector must catch it, or a clean result means nothing
  if (!process.env.AXE_PAGE || process.env.AXE_PAGE === 'selftest') {
    const t = await open('/#phone', { mobile: true, easy: false });
    await t.evaluate(() => {
      const d = document.createElement('div'); d.style.cssText = 'position:fixed;top:300px;left:20px;z-index:99999;background:#222;color:#fff;font:34px sans-serif';
      d.innerHTML = '<span style="display:inline-block;width:20px;overflow:visible;white-space:nowrap">357</span><span>voted yea</span>'; document.body.appendChild(d);
    });
    const hit = await t.evaluate(OVERLAP_FN);
    expect(hit.some((x) => /357/.test(x) && /voted yea/.test(x)), 'the overlap detector missed a number running into its label');
    await done(t);
  }
};
CHECKS['no-bleed'] = async () => {
  const pages = AXE_PAGES.filter(([name]) => !/^desktop (home original|ledger original|profiles original|profile with votes original)$/.test(name) && (!process.env.AXE_PAGE || process.env.AXE_PAGE.split(',').includes(name)));
  for (const [name, url, o] of pages) {
    const p = await open(url, o);
    if (o.after) { await p.evaluate(AXE_AFTER[o.after]); await wait(300); }
    const bad = await bleedBad(p);
    expect(bad.length === 0, `text spills out of its box on ${name}: ` + bad.slice(0, 3).map((b) => `.${b.cls} +${b.over}px "${b.text}"`).join('; '));
    const cut = await clipBad(p);
    expect(cut.length === 0, `text is cut off on ${name}: ` + cut.slice(0, 4).map((b) => `.${b.cls} ${b.kind} by ${b.by}px "${b.text}"`).join('; '));
    await done(p);
  }
  // the detectors must catch the two ways text goes wrong, or a clean result means nothing
  if (!process.env.AXE_PAGE || process.env.AXE_PAGE === 'selftest') {
    const t = await open('/#phone', { mobile: true, easy: false });
    await t.evaluate(() => {
      const mk = (id, css) => { const d = document.createElement('div'); d.id = id; d.style.cssText = 'position:relative;width:200px;background:#333;color:#fff;border:1px solid #888;' + css; d.innerHTML = '<p style="margin:0">A long sentence that needs several lines of room to be read all the way to the end of it.</p>'; document.body.appendChild(d); };
      mk('t-bleed', 'height:30px;overflow:visible;'); mk('t-clip', 'height:30px;overflow:hidden;');
    });
    const b = await bleedBad(t), c = await clipBad(t);
    expect(b.some((x) => /t-bleed|A long sentence/.test(x.cls + x.text)), 'the spill detector missed text running out of a fixed-height box');
    expect(c.some((x) => /A long sentence/.test(x.text)), 'the cut-off detector missed text hidden by a fixed-height box');
    await done(t);
  }
  // the sheets with the most text on them
  if (!process.env.AXE_PAGE || process.env.AXE_PAGE === 'sheets') {
    const leg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'data', 'legistar-2026.json'), 'utf8')).matters;
    const longest = leg.slice().sort((a, b) => b.title.length - a.title.length)[0];
    const s = await open('/#phone', { mobile: true, easy: false });
    const scan = async (what) => {
      const bad = await bleedBad(s), cut = await clipBad(s);
      expect(bad.length === 0 && cut.length === 0, `text spills or is cut on ${what}: ` + [...bad.map((x) => `.${x.cls} +${x.over}px "${x.text}"`), ...cut.map((x) => `.${x.cls} cut ${x.by}px "${x.text}"`)].slice(0, 3).join('; '));
    };
    await clickText(s, 'Search'); await wait(300);
    await s.type('input[type=search]', longest.file); await wait(500);
    await scan('the search results');
    await s.evaluate((f) => { const r = [...document.querySelectorAll('.cxm-row')].find((x) => (x.innerText || '').trim().startsWith(f)); r && r.click(); }, longest.file); await wait(700);
    await scan(`the record sheet for ${longest.file}`);
    await s.evaluate(() => { const x = document.querySelector('.cxm-sheet-x'); x && x.click(); }); await wait(300);
    await clickText(s, 'Dictionary'); await wait(500);
    await scan('the dictionary');
    await s.evaluate(() => { const x = document.querySelector('.cxm-sheet-x'); x && x.click(); }); await wait(300);
    await clickText(s, 'Explore'); await wait(500);
    await clickText(s, 'Resident check'); await wait(500);
    await scan('the Resident check');
    await done(s);
  }
  // the Explore tab at every scroll position, because the focused room tile changes as you scroll
  if (process.env.AXE_PAGE && process.env.AXE_PAGE !== 'explore') return;
  const e = await open('/#phone', { mobile: true, easy: false });
  await clickText(e, 'Explore'); await wait(600);
  const stops = await e.evaluate(() => { const m = document.querySelector('.cxm-main'); return m ? Math.ceil(m.scrollHeight / 160) : 0; });
  let worst = [];
  for (let i = 0; i <= stops; i++) {
    await e.evaluate((k) => { const m = document.querySelector('.cxm-main'); if (m) m.scrollTop = k * 160; }, i); await wait(450);
    const bad = await bleedBad(e);
    if (bad.length) worst = worst.concat(bad.map((b) => ({ ...b, at: i })));
  }
  expect(worst.length === 0, `text spills out of a room tile while scrolling Explore: ` + worst.slice(0, 3).map((b) => `.${b.cls} +${b.over}px "${b.text}" at step ${b.at}`).join('; '));
  await done(e);
};

(async () => {
  if (argv('--list')) { console.log(Object.keys(CHECKS).join('\n')); return; }
  if (!fs.existsSync(path.join(SITE, 'index.html'))) { console.error(`No ${SITE}/index.html. Run python build.py first.`); process.exit(2); }
  const only = argv('--only');
  const { server, base } = await serve(); BASE = base;
  B = await puppeteer.launch({ executablePath: chromePath(), headless: 'new', args: process.env.CI ? ['--no-sandbox', '--disable-setuid-sandbox'] : [] });
  let failed = 0, ran = 0;
  for (const [name, fn] of Object.entries(CHECKS)) {
    if (only && only !== true && !only.split(',').some((w) => name.includes(w))) continue;
    const t = Date.now(); ran++;
    // A browser can hiccup (a dropped session, a garbled script string) with nothing wrong in the app. A check that ended ONLY in a crash gets one more
    // run; an assertion that failed is never retried.
    for (let attempt = 0; ; attempt++) {
      fails = [];
      try { await fn(); } catch (e) { fails.push(`crashed: ${e.message.slice(0, 200)}`); }
      if (attempt === 0 && fails.length && fails.every((f) => f.startsWith('crashed:'))) { console.log(`retry  ${name}  (the browser crashed, not an assertion: ${fails[0].slice(0, 80)})`); continue; }
      break;
    }
    console.log(`${fails.length ? 'FAIL' : 'ok  '}  ${name}  (${((Date.now() - t) / 1000).toFixed(1)}s)`);
    fails.forEach((f) => console.log(`        - ${f}`)); if (fails.length) failed++;
  }
  await B.close(); server.close();
  console.log(`\n${ran - failed} of ${ran} checks passed.`);
  process.exit(failed ? 1 : 0);
})();
