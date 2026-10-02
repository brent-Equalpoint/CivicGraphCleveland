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
  const ctx = await B.createBrowserContext();
  const p = await ctx.newPage();
  await p.setViewport(o.mobile ? { width: 390, height: 844, isMobile: true, hasTouch: true } : { width: o.width || 1280, height: o.height || 900 });
  p.errors = [];
  p.on('pageerror', (e) => p.errors.push(e.message.slice(0, 160)));
  if (o.mock) {  // { '/bench/public-2026.json': {...} }: answer these addresses with made-up JSON
    await p.setRequestInterception(true);
    p.on('request', (r) => { const u = new URL(r.url()); if (o.mock[u.pathname]) r.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(o.mock[u.pathname]) }); else r.continue(); });
  }
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
async function clickText(p, label, sel = 'button, a') {
  const h = await p.evaluateHandle((l, sel) => [...document.querySelectorAll(sel)].find((x) => (x.innerText || '').trim().startsWith(l) || x.getAttribute('aria-label') === l), label, sel);
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
    expect((await txt(p, '.cxe h1')) === 'Hello. What would you like to know?', 'first visit is not Easy mode');
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
    await clickText(p, 'You and settings'); await wait(300);
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
    expect(/does not publish each member/.test((await txt(p, '.sp')) || ''), 'the votes honesty statement is missing');
    await done(p);
    const q = await open('/?room=voting#desktop', { settle: 1500 });
    const c = await q.evaluate(() => { const r = document.querySelector('[data-node="ward-8"]').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }); await q.mouse.click(c[0], c[1]); await wait(700);
    expect(/formal profile/.test((await txt(q, '.cx-drawer-profile button')) || ''), 'no profile button in the record drawer');
    await q.evaluate(() => document.querySelector('.cx-drawer-profile button').click()); await wait(900);
    expect(/Howse-Jones/.test((await txt(q, '.sp h1')) || ''), 'the drawer button did not open the profile'); await done(q);
    const m = await open('/#phone', { mobile: true }); await clickText(m, 'Who represents me?');
    await m.select('.cxe select', await m.evaluate(() => [...document.querySelector('.cxe select').options].find((o) => /Hough/.test(o.text)).value)); await wait(500); await walkEasy(m);
    await clickText(m, 'Read the short profile of'); await wait(500);
    expect(/Howse-Jones/.test((await txt(m, '.cxe h1')) || '') && /led \d+ proposal/.test((await txt(m, '.cxe-main')) || ''), 'the Easy mode short profile is missing its name or its counts');
    expect(/not public yet/.test((await txt(m, '.cxe-main')) || ''), 'the short profile does not say the votes are not public');
    await clickText(m, 'Read the full profile'); await wait(900);
    expect(await has(m, '.cxm-sheet .sp'), 'the full profile button did not open the phone sheet'); await done(m);
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
    const rows = await count(p, '.us-index tbody tr'); expect(rows > 800, `the Index lists only ${rows} rows`);
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
    await clickText(p, 'Sky', '.us-tabs button');
    await p.type('.us-search input', 'Husted'); await wait(300);
    expect((await count(p, '.us-results .us-pick')) >= 1, 'searching for a senator found nothing');
    await (await p.$('.us-results .us-pick')).click(); await wait(400);
    expect(/Jon Husted/.test((await txt(p, '.us-side h2')) || '') && /United States senator for Ohio/.test((await txt(p, '.us-side')) || ''), 'the chosen senator is not described');
    expect(/Party on this term: \w+, as of 20\d\d-\d\d-\d\d \(a sourced field, not a judgment\)/.test((await txt(p, '.us-side')) || ''), 'party is not shown as a dated, sourced field');
    await clickText(p, 'Linked', '.us-tabs button');
    const facts = (await txt(p, '.us-linked')) || '';
    expect(/serves on|is the (chair|ranking)/.test(facts) && /Connected to \d+/.test(facts), 'the Linked view lacks committee sentences or the connection count');
    expect(!/(conservative|liberal|moderate|score|rank(ed|ing) \d)/i.test(facts), 'an ideology word or a score appeared');
    await clickText(p, 'Sky', '.us-tabs button');
    const before = await txt(p, '.us-side h2');
    await p.focus('.us-canvas'); await p.keyboard.press(']'); await wait(250);
    expect((await txt(p, '.us-side h2')) !== before, 'the ] key did not move to another node');
    await p.keyboard.press('Escape'); await wait(150);
    expect(/Select anyone or anything/.test((await txt(p, '.us-side')) || ''), 'Escape did not clear the selection');
    await p.select('.us-tools select:nth-of-type(1)', 'senate'); await wait(250);
    await clickText(p, 'Index', '.us-tabs button');
    const senateRows = await count(p, '.us-index tbody tr'); expect(senateRows < rows && senateRows > 150, `the Senate filter left ${senateRows} rows`);
    await clickText(p, 'Tree', '.us-tabs button'); expect((await count(p, '.us-tree details')) > 20, 'the Tree view is nearly empty');
    await done(p);
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
  { rule: 'label-content-name-mismatch', target: /aria-label="Step \d+: /, why: 'diagram step: number and name are separate SVG texts' },
  { rule: 'label-content-name-mismatch', target: /(^|\s)\.human$|\.cx-step/, why: 'diagram step 10: number and name are separate SVG texts' },
  { rule: 'label-content-name-mismatch', target: /story, (new|seen)"\]/, why: 'initials in the story ring are decorative (aria-hidden); the name holds the visible word' },
];
const AXE_PAGES = [
  ['desktop home', '/#desktop', {}], ['desktop united states', '/?panel=us#desktop', {}], ['desktop home original', '/#desktop', { theme: 'original' }], ['desktop stories', '/?panel=stories#desktop', {}], ['desktop profiles', '/?panel=profiles#desktop', {}],
  ['desktop profiles original', '/?panel=profiles#desktop', { theme: 'original' }], ['desktop map room', '/?room=voting#desktop', {}], ['desktop news', '/?panel=news#desktop', {}], ['desktop ledger', '/?panel=ledger#desktop', {}],
  ['desktop ledger original', '/?panel=ledger#desktop', { theme: 'original' }], ['desktop leaders', '/?panel=leaders#desktop', {}], ['desktop place', '/?panel=place#desktop', {}], ['desktop ballot', '/?panel=ballot#desktop', {}],
  ['desktop bench', '/?panel=bench#desktop', {}], ['desktop easy', '/#desktop', { easy: true }],
  ['phone today', '/#phone', { mobile: true, easy: false }], ['phone today original', '/#phone', { mobile: true, easy: false, theme: 'original' }], ['phone easy', '/#phone', { mobile: true, easy: true }],
  ['phone room', '/?room=voting#phone', { mobile: true }], ['phone ledger', '/?panel=ledger#phone', { mobile: true }], ['phone ballot', '/?panel=ballot#phone', { mobile: true }], ['phone place', '/?panel=place#phone', { mobile: true }],
  ['phone news', '/?panel=news#phone', { mobile: true }],
];
async function axeBad(p) {
  await p.evaluate(axeSource);
  const v = await p.evaluate(() => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] }, rules: { 'label-content-name-mismatch': { enabled: true } } })
    .then((r) => r.violations.flatMap((x) => x.nodes.map((n) => ({ id: x.id, impact: x.impact, target: n.target.join(' '), msg: ((n.any[0] || n.all[0] || {}).message || '').slice(0, 100) })))));
  return v.filter((x) => !AXE_ALLOW.some((a) => a.rule === x.id && a.target.test(x.target)));
}
CHECKS['axe'] = async () => {
  for (const [name, url, o] of AXE_PAGES) {
    const p = await open(url, o);
    const bad = await axeBad(p);
    expect(bad.length === 0, `axe on ${name}: ${bad.length} violation(s): ` + bad.slice(0, 4).map((x) => `${x.id} ${x.target.slice(0, 60)}`).join('; '));
    await done(p);
  }
};

(async () => {
  if (argv('--list')) { console.log(Object.keys(CHECKS).join('\n')); return; }
  if (!fs.existsSync(path.join(SITE, 'index.html'))) { console.error(`No ${SITE}/index.html. Run python build.py first.`); process.exit(2); }
  const only = argv('--only');
  const { server, base } = await serve(); BASE = base;
  B = await puppeteer.launch({ executablePath: chromePath(), headless: 'new', args: process.env.CI ? ['--no-sandbox', '--disable-setuid-sandbox'] : [] });
  let failed = 0, ran = 0;
  for (const [name, fn] of Object.entries(CHECKS)) {
    if (only && only !== true && !name.includes(only)) continue;
    fails = []; const t = Date.now(); ran++;
    try { await fn(); } catch (e) { fails.push(`crashed: ${e.message.slice(0, 200)}`); }
    console.log(`${fails.length ? 'FAIL' : 'ok  '}  ${name}  (${((Date.now() - t) / 1000).toFixed(1)}s)`);
    fails.forEach((f) => console.log(`        - ${f}`)); if (fails.length) failed++;
  }
  await B.close(); server.close();
  console.log(`\n${ran - failed} of ${ran} checks passed.`);
  process.exit(failed ? 1 : 0);
})();
