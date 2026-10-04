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
  await p.setViewport(o.mobile ? { width: 390, height: 844, isMobile: true, hasTouch: true } : { width: o.width || 1280, height: o.height || 900 });
  p.errors = [];
  p.on('pageerror', (e) => p.errors.push(e.message.slice(0, 160)));
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
async function done(p) { expect(p.errors.length === 0, `console errors: ${JSON.stringify(p.errors)}`); await p.close2(); }
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
    await c.evaluate(() => [...document.querySelectorAll('.cxm-keycard')][0].click()); await wait(500);
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
    await clickText(p, 'Graph', '.cxm-seg button'); await wait(1200);
    expect(!(await has(p, '.cxm-folders')) && (await has(p, '.us-canvas')) && (await txt(p, '.us-tabs button.on')) === 'Sky', 'Graph does not open on the Sky');
    expect(/panel=us/.test(await p.evaluate(() => location.search)) && /view=graph/.test(await p.evaluate(() => location.search)), 'the Graph view is not in the link');
    await clickText(p, 'Profiles', '.cxm-seg button'); await wait(500);
    expect(await has(p, '.cxm-folders'), 'Profiles did not bring the folders back after Graph');
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
    // At City Hall: the Clerk's meeting record as a front page. A card on Today, a story first in the row, and a page whose lead is the next Council meeting,
    // whose first items are real legislation (ceremonial resolutions come last), and which says what it does not hold.
    const rec = JSON.parse(fs.readFileSync(path.join(SITE, 'meetings', 'meetings-2026.json'), 'utf8'));
    const today = new Date().toISOString().slice(0, 10);
    const upcoming = rec.meetings.filter((m) => m.date >= today).length > 0;
    const p = await open('/#phone', { mobile: true, easy: false, settle: 2200 });
    if (!upcoming && !rec.meetings.some((m) => m.items.some((i) => i[1]))) { await done(p); return; }
    expect(await has(p, '.mt-card'), 'Today has no At City Hall card');
    expect((await p.$$eval('.cxm-story-btn small', (els) => els.map((e) => e.innerText)))[0] === 'City Hall', 'the City Hall story is not first in the row');
    await p.evaluate(() => document.querySelector('.cxm-story-btn').click()); await wait(600);
    expect(/City Hall/.test((await txt(p, '.cxm-story-head')) || ''), 'the City Hall story did not open');
    for (let i = 0; i < 8 && !(await has(p, '.cxm-story .cxm-btn-light')); i++) { await p.mouse.click(300, 420); await wait(350); }
    expect(await has(p, '.cxm-story .cxm-btn-light'), 'the City Hall story has no button to open the page');
    await p.evaluate(() => document.querySelector('.cxm-story .cxm-btn-light').click()); await wait(1200);
    expect(await has(p, '.mt-lead') || !upcoming, 'the City Hall page has no lead story');
    if (upcoming) {
      expect(/meets/.test((await txt(p, '.mt-head')) || ''), `the lead does not say who meets when: ${await txt(p, '.mt-head')}`);
      expect((await count(p, '.mt-lead .mt-item')) <= 3, 'the lead shows more than three items before "Show all"');
      const mixOk = await p.evaluate(() => [...document.querySelectorAll('.mt-lead .mt-chip')].map((c) => c.innerText).join(' | '));
      expect(/ordinance|resolution|item/.test(mixOk), `the lead does not say what the agenda is made of: ${mixOk}`);
      const firstTitles = await p.$$eval('.mt-lead .mt-item strong', (els) => els.map((e) => e.innerText));
      expect(!firstTitles.some((t) => /^(Condolence|Congratulations|Recognition)/.test(t)), `a ceremonial resolution leads the agenda: ${firstTitles}`);
      expect(!/https?:|www\./.test((await txt(p, '.mt-lead')) || ''), 'web addresses from the Clerk are shown in the lead');
      expect((await count(p, '.mt-lead .mt-links a')) >= 1, 'the lead has no agenda link');
    }
    expect(/not include testimony or public comment/.test((await txt(p, '.mt')) || ''), 'the page does not say it holds no testimony or public comment');
    expect((await count(p, '.mt-strip .mt-small')) >= 0 && (await has(p, '.cxm-drop')), 'the earlier meetings are not folded away');
    expect(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'the City Hall page scrolls sideways');
    // the sheet itself must not be wider than the screen: a sr-only line inside the horizontal strip once made it 1624 px, and a phone then let the whole sheet slide sideways
    expect(await p.evaluate(() => { const sh = document.querySelector('.cxm-sheet'); return !sh || sh.scrollWidth <= sh.clientWidth + 1; }), 'the City Hall sheet is wider than the screen (it slides sideways on a phone)');
    // an item opens its legislation record, which says where else it was on an agenda
    await p.evaluate(() => document.querySelector('.mt-item').click()); await wait(900);
    expect(await has(p, '.cxm-sheet .mt-heard') || !(await has(p, '.cxm-sheet')), 'a legislation record does not list its meetings');
    { const bad = await axeBad(p); expect(bad.length === 0, `axe on At City Hall: ${bad.length} violation(s): ` + bad.slice(0, 4).map((x) => `${x.id} ${x.target.slice(0, 60)}`).join('; ')); }
    await done(p);
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
    const p = await open('/?panel=us#desktop', { settle: 1800 });
    expect(await has(p, '.us canvas'), 'the United States page has no graph canvas');
    expect(/Preview/.test((await txt(p, '.us-preview')) || '') && /not yet been read by a person/.test((await txt(p, '.us-preview')) || ''), 'the page does not say its source terms are unconfirmed');
    expect(await has(p, '.atlas-sidebar button.active') && /United States/.test((await txt(p, '.atlas-sidebar button.active')) || ''), 'United States is not the active sidebar entry');
    await clickText(p, 'Index', '.us-tabs button');
    // the Index is five doors: members, committees, agencies, policy areas, states. Each adds up to the record.
    expect((await count(p, '.us-door')) === 6, `the Index offers ${await count(p, '.us-door')} ways in, not six`);
    expect(/^100 shown/.test((await txt(p, '.us-count')) || ''), `the Senate group does not show 100: ${await txt(p, '.us-count')}`);
    await clickText(p, 'House', '.us-groups button'); expect(/^439 shown/.test((await txt(p, '.us-count')) || ''), 'the House group does not show 439');
    expect((await count(p, '.us-list > li')) === 25, 'the member list is not paged by 25');
    await clickText(p, 'Committees', '.us-door'); await wait(300); expect(/^21 shown/.test((await txt(p, '.us-count')) || ''), `Senate committees: ${await txt(p, '.us-count')}`);
    await clickText(p, 'Executive branch', '.us-door'); await wait(300); expect(/^2 shown/.test((await txt(p, '.us-count')) || ''), `the President and Vice President: ${await txt(p, '.us-count')}`);
    await clickText(p, 'Top-level agencies', '.us-groups button'); await wait(300); expect(/^124 shown/.test((await txt(p, '.us-count')) || ''), `top-level agencies: ${await txt(p, '.us-count')}`);
    await clickText(p, 'Courts and judges', '.us-door'); await wait(300); expect(/^1 shown/.test((await txt(p, '.us-count')) || ''), `the Supreme Court: ${await txt(p, '.us-count')}`);
    await clickText(p, 'Judges', '.us-groups button'); await wait(300); expect(/^8\d\d shown/.test((await txt(p, '.us-count')) || ''), `the sitting judges: ${await txt(p, '.us-count')}`);
    await p.evaluate(() => [...document.querySelectorAll('.us-list > li > button')].find((b) => /Chief Justice/.test(b.innerText)).click()); await wait(400);
    expect(/Chief Justice/.test((await txt(p, '.us-linked')) || '') && /Appointed by this President/.test((await txt(p, '.us-linked')) || ''), 'a judge in the Linked view does not say who appointed them');
    await clickText(p, 'Index', '.us-tabs button'); await wait(300);
    await clickText(p, 'States', '.us-door'); await wait(300);
    expect((await count(p, '.us-list > li')) === 56, 'the States door does not list 56 states and territories');
    await p.evaluate(() => [...document.querySelectorAll('.us-list > li > button')].find((b) => /^Ohio/.test(b.innerText)).click()); await wait(250);
    expect(/Husted/.test((await txt(p, '.us-sub')) || '') && /Moreno/.test((await txt(p, '.us-sub')) || ''), 'Ohio does not list its two senators');
    await clickText(p, 'Policy areas', '.us-door'); await wait(900);
    expect((await count(p, '.us-list > li')) > 25, 'the Policy areas door lists too few areas');
    await p.evaluate(() => document.querySelector('.us-list > li > button').click()); await wait(700);
    expect(/Votes by topic/.test((await txt(p, '.us-topics h2')) || '') && (await p.evaluate(() => document.querySelector('.us-topics select').value)) !== '', 'a policy area did not open its votes');
    await clickText(p, 'Index', '.us-tabs button'); await wait(300);
    // your members: a state and a district give two senators and a representative, kept off the address bar
    await clickText(p, 'Your members', '.us-tabs button');
    await p.select('.us-mine select', 'OH'); await wait(300);
    await p.select('.us-mine label:nth-of-type(2) select', '11'); await wait(300);
    expect((await count(p, '.us-mine-card')) === 3, `expected 2 senators and 1 representative, found ${await count(p, '.us-mine-card')}`);
    const mt = (await txt(p, '.us-mine-list')) || '';
    expect(/United States senator for Ohio/.test(mt) && /Representative for Ohio's 11th district/.test(mt) && /as of 20\d\d-\d\d-\d\d \(a sourced field/.test(mt), 'the member cards are missing office or dated party');
    expect(/state=|district=|OH/.test(await p.evaluate(() => location.href)) === false, 'the place was put in the address');
    // how they voted: recorded votes by topic, counts only, with the official record linked
    expect(await has(p, '.us-votes'), 'Your members shows no votes section'); await wait(300);
    const vrows = await count(p, '.us-vote'); expect(vrows >= 1, 'the votes section lists no votes');
    const vt = (await txt(p, '.us-votes')) || '';
    expect(/Not voting is not a no/.test(vt) && /The official record/.test(vt) && /Yea \d+, Nay \d+, Present \d+, Not voting \d+/.test(vt), 'the votes section lacks the not-a-no note, the official record link, or plain counts');
    expect(!/%|percent|score|rank|agrees? with/i.test(vt.replace(/Congressional Research Service/g, '')), 'a percentage, score, or ranking appeared in the votes');
    const opts = await p.$$eval('.us-votes label:nth-of-type(2) select option', (os) => os.map((o) => o.value)); expect(opts.length > 2, `the topic list has only ${opts.length} entries`);
    await p.select('.us-votes label:nth-of-type(2) select', opts[1]); await wait(300);
    const some = await p.$$eval('.us-vote-meta', (els) => els.length); expect(some >= 1 && /recorded vote/.test((await txt(p, '.us-count')) || ''), 'choosing a topic did not list its votes');
    await p.select('.us-votes label:nth-of-type(1) select', await p.$eval('.us-votes label:nth-of-type(1) select option:nth-of-type(2)', (o) => o.value)); await wait(300);
    expect(/recorded vote|No recorded votes/.test((await txt(p, '.us-count')) || ''), 'choosing a senator did not update the votes');
    { const bad = await axeBad(p); expect(bad.length === 0, `axe on Your members with votes: ${bad.length} violation(s): ` + bad.slice(0, 4).map((x) => `${x.id} ${x.target.slice(0, 60)}`).join('; ')); }
    // my policy areas: up to five, counts for the three people, nothing graded, nothing in the address
    await p.evaluate(() => { const b = [...document.querySelectorAll('.us-areas input')]; b[1].click(); b[2].click(); }); await wait(500);
    expect((await count(p, '.us-area-table tbody tr')) === 2 && (await count(p, '.us-area-table thead th')) === 4, 'two chosen areas should give two rows and a column for each of the three members');
    const at = ((await txt(p, '.us-area-table')) || '').replace(/Congressional Research Service/g, '');
    expect(/Votes that decided something: \d+/.test(at) && /Yea \d+, Nay \d+, Present \d+, Not voting \d+/.test(at), `the area table lacks plain counts: ${at.slice(0, 160)}`);
    expect(/Not voting is not a no/.test(at) && !/%|percent|score|rank|match|grade|agree/i.test(at), 'the area table lacks the not-a-no note, or grades someone');
    await p.evaluate(() => { [...document.querySelectorAll('.us-areas input')].slice(0, 8).forEach((b) => { if (!b.disabled && !b.checked) b.click(); }); }); await wait(300);
    expect((await count(p, '.us-area-table tbody tr')) === 5 && (await count(p, '.us-areas input:disabled')) > 20, 'the sixth policy area was not refused');
    expect(!/area|Energy|Health/i.test(await p.evaluate(() => location.href)), 'a chosen policy area reached the address');
    await p.evaluate(() => [...document.querySelectorAll('.us-areas input:checked')].forEach((b) => b.click())); await wait(200);
    // votes by topic: pick a topic, see its votes, and how the chosen place's members voted
    await clickText(p, 'Votes by topic', '.us-tabs button'); await wait(500);
    const tops = await p.$$eval('.us-topics select option', (os) => os.map((o) => o.value).filter(Boolean)); expect(tops.length > 15, `the topic list has only ${tops.length} topics`);
    await p.select('.us-topics select', tops.includes('Health') ? 'Health' : tops[0]); await wait(400);
    expect((await count(p, '.us-topics .us-vote')) >= 1, 'a topic with votes lists none');
    const tt = (await txt(p, '.us-topics')) || '';
    expect(/Your members: /.test(tt) && /The official record/.test(tt) && /does not say which agencies handle a topic/.test(tt), 'the topic view lacks your members, the official record, or the honest limit');
    expect(!/%|percent|score|rank|agrees? with/i.test(tt.replace(/Congressional Research Service/g, '')), 'a percentage or score appeared in the topic view');
    { const bad = await axeBad(p); expect(bad.length === 0, `axe on Votes by topic: ${bad.length} violation(s): ` + bad.slice(0, 4).map((x) => `${x.id} ${x.target.slice(0, 60)}`).join('; ')); }
    await clickText(p, 'Sky', '.us-tabs button');
    await p.type('.us-search input', 'Husted'); await wait(300);
    expect((await count(p, '.us-results .us-pick')) >= 1, 'searching for a senator found nothing');
    await (await p.$('.us-results .us-pick')).click(); await wait(400);
    expect(/Jon Husted/.test((await txt(p, '.us-side h2')) || '') && /United States senator for Ohio/.test((await txt(p, '.us-side')) || ''), 'the chosen senator is not described');
    expect(/Party on this term: \w+, as of 20\d\d-\d\d-\d\d \(a sourced field, not a judgment\)/.test((await txt(p, '.us-side')) || ''), 'party is not shown as a dated, sourced field');
    const faceLoaded = async (sel) => { for (let t = 0; t < 20; t++) { if (await p.evaluate((q) => { const i = document.querySelector(q); return !!i && i.complete && i.naturalWidth > 0; }, sel)) return true; await wait(150); } return false; };
    // Jon Husted joined the Senate after the photo archive was made; his picture comes from the Congress directory
    expect(await faceLoaded('.us-side .cxm-fed-av img'), 'Husted has no loaded portrait (the Congress directory fallback)');
    // Alan Armstrong (Oklahoma, appointed 2026) has no photo anywhere yet: his initials stay, and no broken picture shows
    await (await p.$('.us-search input')).click({ clickCount: 3 }); await p.type('.us-search input', 'Armstrong'); await wait(300);
    await (await p.$('.us-results .us-pick')).click(); await wait(400);
    expect(await has(p, '.us-side .cxm-fed-ini') && !(await has(p, '.us-side .cxm-fed-av img')), 'a senator with no photo should show initials and no broken image');
    await (await p.$('.us-search input')).click({ clickCount: 3 }); await p.type('.us-search input', 'Moreno'); await wait(300);
    await (await p.$('.us-results .us-pick')).click(); await wait(500);
    expect(await faceLoaded('.us-side .cxm-fed-av img'), 'a senator with a photo has no loaded portrait');
    expect(/Photos of members of Congress/.test((await txt(p, '.us-src')) || '') || /Government Publishing Office/.test((await txt(p, '.us-side')) || ''), 'the portraits are not credited');
    await clickText(p, 'Linked', '.us-tabs button');
    const facts = (await txt(p, '.us-linked')) || '';
    expect(/serves on|is the (chair|ranking)/.test(facts) && /Connected to \d+/.test(facts), 'the Linked view lacks committee sentences or the connection count');
    expect(!/\b(conservative|liberal|moderate|score|rank(ed|ing) \d)\b/i.test(facts), 'an ideology word or a score appeared');
    await clickText(p, 'Sky', '.us-tabs button');
    const before = await txt(p, '.us-side h2');
    await p.focus('.us-canvas'); await p.keyboard.press(']'); await wait(250);
    expect((await txt(p, '.us-side h2')) !== before, 'the ] key did not move to another node');
    await p.keyboard.press('Escape'); await wait(150);
    expect(/Select anyone or anything/.test((await txt(p, '.us-side')) || ''), 'Escape did not clear the selection');
    // the Sky: three clusters, and Solo shows one committee, one state, or one agency family with what it touches
    const mapCount = async () => +((/Map of (\d+)/.exec(await p.$eval('.us-canvas', (c) => c.getAttribute('aria-label'))) || [])[1] || 0);
    const nAll = await mapCount(); expect(nAll > 800, `the Sky holds only ${nAll} nodes`);
    const com = await p.$eval('.us-solo optgroup[label="A committee"] option', (o) => o.value);
    await p.select('.us-solo', com); await wait(400);
    const nCom = await mapCount(); expect(nCom >= 2 && nCom < 160, `Solo on a committee left ${nCom} nodes`);
    await p.focus('.us-canvas'); await p.keyboard.press('Escape'); await wait(300);
    expect((await mapCount()) === nAll, 'Escape did not bring everything back after Solo');
    await p.select('.us-solo', 's:OH'); await wait(400);
    const nOh = await mapCount(); expect(nOh > 15 && nOh < 120, `Solo on Ohio left ${nOh} nodes`);
    await p.select('.us-solo', ''); await wait(300);
    await (await p.$('.us-search input')).click({ clickCount: 3 }); await p.type('.us-search input', 'Husted'); await wait(300);
    await (await p.$('.us-results .us-pick')).click(); await wait(400);
    expect(/Profile/.test((await txt(p, '.us-actions')) || '') && /Solo/.test((await txt(p, '.us-actions')) || '') && /In words/.test((await txt(p, '.us-actions')) || ''), 'the side panel lacks Profile, Solo, and In words');
    await clickText(p, 'Solo', '.us-actions button'); await wait(400);
    const nMember = await mapCount(); expect(nMember >= 2 && nMember < 40, `Solo on a senator left ${nMember} nodes`);
    await p.select('.us-solo', ''); await wait(300);
    await p.keyboard.press('Escape'); await wait(150);
    // motion: Still holds still, Live moves, and Calm is the default for someone who has not asked for less
    expect((await txt(p, '.us-motion button.on')) === 'Calm', 'the Sky does not open on Calm');
    const frame = () => p.$eval('.us-canvas', (c) => c.toDataURL());
    await clickText(p, 'Still', '.us-motion button'); await wait(400);
    const s1 = await frame(); await wait(600); expect(s1 === (await frame()), 'Still moved');
    await clickText(p, 'Live', '.us-motion button'); await wait(800);
    const l1 = await frame(); await wait(600); expect(l1 !== (await frame()), 'Live did not move');
    await p.select('.us-solo', 's:OH'); await wait(400);
    const cb = await p.$eval('.us-canvas', (c) => { const r = c.getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; });
    await p.mouse.move(cb[0] + cb[2] / 2, cb[1] + cb[3] / 2); await p.mouse.down(); await p.mouse.move(cb[0] + cb[2] / 2 + 60, cb[1] + cb[3] / 2 + 10, { steps: 5 }); await p.mouse.up(); await wait(300);
    await p.select('.us-solo', ''); await wait(300);
    await clickText(p, 'Still', '.us-motion button'); await wait(300);
    await p.select('.us-tools select:nth-of-type(1)', 'senate'); await wait(250);
    await clickText(p, 'Index', '.us-tabs button');
    await clickText(p, 'House', '.us-groups button'); expect(/^0 shown/.test((await txt(p, '.us-count')) || ''), 'the Senate filter still shows House members in the Index');
    await clickText(p, 'Tree', '.us-tabs button'); expect((await count(p, '.us-tree details')) > 20, 'the Tree view is nearly empty');
    await done(p);
    // the phone layout: Federal is a folder tab in People, shown as profiles; the whole graph opens from it in a sheet
    const ph = await open('/?panel=us#phone', { mobile: true, easy: false, settle: 1800 });
    expect(await has(ph, '.cxm-folders') && (await txt(ph, '.cxm-folders button.on')) === 'Federal', 'the phone People tab has no Federal folder, or it is not the one open');
    expect((await count(ph, 'h1')) === 1, `the phone page has ${await count(ph, 'h1')} h1 headings`);
    expect(await ph.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'the phone United States page scrolls sideways');
    expect((await count(ph, '.cxm-profile')) === 1 && /Senate/.test((await txt(ph, '.cxm-profile .cxm-kicker')) || ''), 'the Federal tab does not open on a senator profile');
    expect(((await txt(ph, '.cxm-prof-actions')) || '').replace(/\s+/g, ' ').trim().startsWith('Full Story Profile'), 'the Federal profile does not offer Full Story and Profile');
    await clickText(ph, 'Explore Congress as a graph', 'button'); await wait(900);
    expect((await txt(ph, '.cxm-seg button.on')) === 'Graph' && (await has(ph, '.us-canvas')), 'Explore Congress as a graph did not open the Graph view on the Sky');
    expect(/view=graph/.test(await ph.evaluate(() => location.search)), 'the Graph view is not in the link');
    // pinch to zoom: two fingers moving apart zoom in, moving together zoom out, and the page itself does not scroll sideways
    { await ph.$eval('.us-canvas', (c) => c.scrollIntoView({ block: 'center' })); await wait(300);
      const cdp = await ph.createCDPSession(); const r = await ph.$eval('.us-canvas', (c) => { const b = c.getBoundingClientRect(); return [b.left + b.width / 2, Math.max(b.top, 0) + Math.min(b.height / 2, 200)]; });
      const zoom = () => ph.$eval('.us-canvas', (c) => +c.getAttribute('data-zoom'));
      const touch = async (type, pts) => { await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y], id) => ({ x, y, id })) }); };
      const pinch = async (from, to) => { await touch('touchStart', [[r[0] - from, r[1]], [r[0] + from, r[1]]]); for (let i = 1; i <= 6; i++) { const f = from + ((to - from) * i) / 6; await touch('touchMove', [[r[0] - f, r[1]], [r[0] + f, r[1]]]); await wait(30); } await touch('touchEnd', []); await wait(250); };
      const z0 = await zoom(); await pinch(20, 90); const z1 = await zoom();
      expect(z1 > z0 * 2.5, `spreading two fingers did not zoom in enough: ${z0} to ${z1}`);
      await pinch(90, 20); const z2 = await zoom();
      expect(z2 < z1 * 0.6, `bringing two fingers together did not zoom out: ${z1} to ${z2}`);
      expect(await ph.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'pinching made the page scroll sideways');
      await cdp.detach(); }
    await clickText(ph, 'Your members', '.us-tabs button'); await wait(500);
    await ph.select('.us-mine select', 'OH'); await wait(300);
    await ph.select('.us-mine label:nth-of-type(2) select', '11'); await wait(500);
    expect((await count(ph, '.us-mine-card')) === 3 && (await count(ph, '.us-vote')) >= 1, 'the phone Your members view lacks the three cards or the votes');
    await clickText(ph, 'Sky', '.us-tabs button'); await wait(500);
    const box = await ph.$eval('.us-canvas', (c) => { const r = c.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; });
    expect(box[0] >= 300 && box[1] >= 300, `the phone map is ${box}`);
    expect(await ph.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'the phone map scrolls sideways');
    await clickText(ph, 'Index', '.us-tabs button'); expect((await count(ph, '.us-door')) === 6 && (await count(ph, '.us-list > li')) === 25, 'the phone Index lacks the five doors or the first 25 names');
    { const small = await ph.evaluate(() => [...document.querySelectorAll('.us button, .us a[href], .us select, .us input, .us summary')].filter((el) => { const r = el.getBoundingClientRect(); if (!r.width || !r.height) return false; const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || (el.tagName === 'A' && cs.display === 'inline') || el.tagName === 'INPUT' && el.type === 'checkbox') return false; return r.height < 44; }).map((el) => `${el.tagName.toLowerCase()}.${el.className}:${(el.textContent || '').slice(0, 20)}`));
      expect(small.length === 0, `phone United States: controls under 44px: ${small.slice(0, 5)}`); }
    { const bad = await axeBad(ph); expect(bad.length === 0, `axe on the phone United States page: ${bad.length} violation(s): ` + bad.slice(0, 4).map((x) => `${x.id} ${x.target.slice(0, 60)}`).join('; ')); }
    await done(ph);
    const off = await open('/#phone', { mobile: true, easy: false });
    await done(off);
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

/* Known axe false positives. A violation matching one of these is skipped; everything else fails. */
const AXE_ALLOW = [
  { rule: 'label-content-name-mismatch', target: /data-node="(people|ohio-governor)"/, why: 'SVG label lines join without a space in the visible text, so the full name does contain the words' },
  { rule: 'label-content-name-mismatch', target: /aria-label="(Step|Paso) \d+: /, why: 'diagram step: number and name are separate SVG texts' },
  { rule: 'label-content-name-mismatch', target: /(^|\s)\.human$|\.cx-step/, why: 'diagram step 10: number and name are separate SVG texts' },
  { rule: 'label-content-name-mismatch', target: /(story|Historia[^"]*), (new|seen|nueva|vista)"\]/, why: 'initials in the story ring are decorative (aria-hidden); the name holds the visible word' },
  { rule: 'label-content-name-mismatch', target: /^\.seen$|\.cxm-story-btn/, why: 'a story ring already seen: axe names it by its class; same decorative initials as above' },
];
const AXE_PAGES = [
  ['desktop home', '/#desktop', {}], ['desktop united states', '/?panel=us#desktop', {}], ['desktop home original', '/#desktop', { theme: 'original' }], ['desktop stories', '/?panel=stories#desktop', {}], ['desktop profiles', '/?panel=profiles#desktop', {}],
  ['desktop profiles original', '/?panel=profiles#desktop', { theme: 'original' }], ['desktop profile with votes', '/?panel=profiles&seat=ward-13#desktop', {}], ['desktop profile with votes original', '/?panel=profiles&seat=ward-13#desktop', { theme: 'original' }], ['desktop map room', '/?room=voting#desktop', {}], ['desktop news', '/?panel=news#desktop', {}], ['desktop ledger', '/?panel=ledger#desktop', {}],
  ['desktop ledger original', '/?panel=ledger#desktop', { theme: 'original' }], ['desktop leaders', '/?panel=leaders#desktop', {}], ['desktop place', '/?panel=place#desktop', {}], ['desktop ballot', '/?panel=ballot#desktop', {}],
  ['desktop bench', '/?panel=bench#desktop', {}], ['desktop easy', '/#desktop', { easy: true }],
  ['phone today', '/#phone', { mobile: true, easy: false }], ['phone settings', '/?panel=settings#phone', { mobile: true, easy: false }], ['phone my priorities', '/?panel=priorities#phone', { mobile: true, easy: false }], ['phone settings original', '/?panel=settings#phone', { mobile: true, easy: false, theme: 'original' }], ['phone today original', '/#phone', { mobile: true, easy: false, theme: 'original' }], ['phone easy', '/#phone', { mobile: true, easy: true }],
  ['phone room', '/?room=voting#phone', { mobile: true }], ['phone ledger', '/?panel=ledger#phone', { mobile: true }], ['phone ballot', '/?panel=ballot#phone', { mobile: true }], ['phone place', '/?panel=place#phone', { mobile: true }],
  ['phone news', '/?panel=news#phone', { mobile: true }],
  // the levies guide with every "Read more" and the official wording open, so the text inside is checked too
  ['desktop levies', '/?panel=levies#desktop', { after: 'openAll' }], ['desktop levies original', '/?panel=levies#desktop', { theme: 'original', after: 'openAll' }], ['phone levies', '/?panel=levies#phone', { mobile: true, easy: false, after: 'openAll' }], ['phone city hall', '/?panel=meetings#phone', { mobile: true, easy: false, after: 'openAll' }], ['phone levy story', '/#phone', { mobile: true, easy: false, after: 'levyStory' }], ['phone districts ask', '/?panel=ballot#phone', { mobile: true, easy: false, after: 'districtAsk' }], ['phone districts', '/?panel=ballot#phone', { mobile: true, easy: false, after: 'districtResult' }], ['desktop districts', '/?panel=districts#desktop', { after: 'districtResult' }],
];
const AXE_AFTER = {
  openAll: () => { document.querySelectorAll('.lv details').forEach((d) => { d.open = true; }); },
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
  ['phone city hall', '/?panel=meetings#phone', { mobile: true, easy: false }, null, ['.cxm-sheet', '.mt-lead', '.mt-head', '.mt-sub', '.mt-item', '.mt-item small', '.mt-chip', '.mt-links', '.mt-small', '.mt-note', '.cxm-kicker']],
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
];
/* Words on each phone screen, counted as a person sees them (nothing folded is opened). A screen may not grow past its recorded count plus a small allowance, so
   the app cannot slowly fill up with explanation again. When a screen gets shorter on purpose, lower the record:
     TEXT_BUDGET_UPDATE=1 node scripts/checks/run.js --only text-budget
   Screens that show a record's own words (What's new) are left out. See docs/plan-plain-text.md. */
const TEXT_SCREENS = [
  ['Today', '/#phone'], ['Explore', '/#phone', 'Explore'], ['My place', '/?panel=place#phone'], ['People: Profiles', '/?panel=leaders#phone'],
  ['People: Federal', '/?panel=us#phone'], ['People: Constellation', '/?panel=constellation#phone'], ['Priorities', '/?panel=priorities#phone'],
  ['Ballot', '/?panel=ballot#phone'], ['Levies and taxes', '/?panel=levies#phone'], ['At City Hall', '/?panel=meetings#phone'],
  ['Decision ledger', '/?panel=ledger#phone'], ['How this is built', '/?panel=bench#phone'], ['Settings', '/?panel=settings#phone'],
];
CHECKS['text-budget'] = async () => {
  const file = path.join(__dirname, 'text-budget.json');
  const have = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  const now = {};
  for (const [name, url, tab] of TEXT_SCREENS) {
    const p = await open(url, { mobile: true, easy: false, settle: 1500 });
    if (tab) { await p.evaluate((t) => { const b = [...document.querySelectorAll('.cxm-tabs button, nav button, [role=tab]')].find((x) => (x.innerText || '').trim().startsWith(t)); if (b) b.click(); }, tab); await wait(900); }
    now[name] = await p.evaluate(() => { const root = document.querySelector('.cxm-sheet') || document.querySelector('.cxm-main') || document.body; return (root.innerText || '').trim().split(/\s+/).filter(Boolean).length; });
    await done(p);
  }
  if (process.env.TEXT_BUDGET_UPDATE) { fs.writeFileSync(file, JSON.stringify(now, null, 1) + String.fromCharCode(10)); console.log(`    wrote scripts/checks/text-budget.json (${Object.keys(now).length} screens)`); return; }
  expect(Object.keys(have).length > 0, 'scripts/checks/text-budget.json is missing: run TEXT_BUDGET_UPDATE=1 node scripts/checks/run.js --only text-budget');
  for (const [name, words] of Object.entries(now)) {
    const rec = have[name];
    if (rec == null) { expect(false, `${name} has no recorded word count: run TEXT_BUDGET_UPDATE=1 node scripts/checks/run.js --only text-budget`); continue; }
    const room = Math.max(30, Math.round(rec * 0.08));
    expect(words <= rec + room, `${name} grew to ${words} words (recorded ${rec}, room ${room}). Say it in fewer words, or record the new count on purpose with TEXT_BUDGET_UPDATE=1`);
  }
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
