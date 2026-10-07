#!/usr/bin/env node
/* The release's fast lane picks the right checks (scripts/checks/changed.js, planRelease), and refuses what needs the full gate.
   Given sample changes: which browser checks run, which run again in light mode (Bento and Original) and in Spanish; the checks that
   never skip are always there; everything on the refusal list refuses. Also: every named list is made of real checks, and pool.js
   splits the suite into parts that cover every job once.   node scripts/test_release_plan.js */
const path = require('path');
const { execFileSync } = require('child_process');
const { planRelease, cssSelectors, FAST_MAX, STYLE_CHECKS } = require('./checks/changed.js');
const { LIGHT, ALWAYS, SPANISH, SERIAL, TOGETHER } = require('./checks/lists.js');
const { shardOf, jobsFor } = require('./checks/pool.js');

const known = execFileSync('node', [path.join(__dirname, 'checks', 'run.js'), '--list'], { encoding: 'utf8' }).split('\n').map((s) => s.trim()).filter(Boolean);
let failed = 0, ran = 0;
function t(name, fn) { ran++; try { fn(); console.log(`ok   ${name}`); } catch (e) { failed++; console.log(`FAIL ${name}\n       ${e.message}`); } }
function eq(a, b, what) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${what}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); }
function ok(c, what) { if (!c) throw new Error(what); }
const plan = (files, more = {}) => planRelease({ files, known, ...more });
const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x));
const inOrder = (names) => known.filter((k) => names.includes(k));

t('the lists name real checks, and the never-skipped set is the agreed one', () => {
  for (const [n, l] of Object.entries({ LIGHT, ALWAYS, SPANISH, SERIAL, STYLE_CHECKS })) l.forEach((c) => ok(known.includes(c), `${n} names ${c}, which is not a check`));
  eq(ALWAYS, ['security-policy', 'privacy-policy', 'remember-place', 'districts', 'shell', 'offline-shell', 'update-wins'], 'ALWAYS');
  eq(LIGHT, ['axe', 'no-bleed', 'text-overlap', 'story-fit', 'color-vision', 'targets', 'titles-never-cut', 'print', 'records-tab', 'agenda-calendar', 'office-text'], 'LIGHT (the light passes release.py ran before the fast lane, plus the Records tab, the agenda calendar, and the office text, added Oct 7)');
});

t('a stylesheet tweak: the layout and look checks, both light passes, no Spanish', () => {
  const p = plan(['ext/cxm.css'], { selectors: { 'ext/cxm.css': ['.cxm-row small'] }, lines: { 'ext/cxm.css': ['  padding: 10px 12px;', '  padding: 8px 12px;'] } });
  ok(p.ok, `refused: ${p.refuse}`);
  ok(STYLE_CHECKS.every((c) => p.checks.includes(c)), `missing a layout check: ${STYLE_CHECKS.filter((c) => !p.checks.includes(c))}`);
  eq(p.light, LIGHT, 'light');
  eq(p.spanish, [], 'spanish');
  ok(!p.checks.includes('us-graph') && !p.all, 'a stylesheet tweak should not run every check');
});

t("a stylesheet tweak to the map's rules adds the map's checks", () => {
  const p = plan(['ext/cx.css'], { selectors: { 'ext/cx.css': ['.usm-sheet .usm-name'] } });
  ['us-map', 'us-graph', 'us-map-sheet', 'us-map-narrow', 'us-explain'].forEach((c) => ok(p.checks.includes(c), `no ${c}`));
});

t('bento.py and light.py are style changes too', () => {
  for (const f of ['bento.py', 'light.py']) { const p = plan([f]); ok(p.ok && sameSet(p.light, LIGHT), `${f}: ${JSON.stringify(p)}`); }
});

t('records only (a data refresh, the built site): the never-skipped checks and nothing else', () => {
  const p = plan(['data/legistar-2026.json', 'data/votes-2026.json', 'data/changes-2026.json', 'bench/status-2026.json', 'site/index.html', 'site/council/record-2026.json', 'site/us/map-2026.json']);
  ok(p.ok, `refused: ${p.refuse}`);
  eq(p.checks, inOrder(ALWAYS), 'checks');
  eq(p.light, [], 'light'); eq(p.spanish, [], 'spanish');
});

t('docs only: the never-skipped checks and nothing else', () => {
  const p = plan(['docs/how-it-fits.md', 'STATE-OF-BUILD.md', 'CLAUDE.md', 'docs/plan-idempotency.md']);
  ok(p.ok, `refused: ${p.refuse}`);
  eq(p.checks, inOrder(ALWAYS), 'checks'); eq(p.light, [], 'light');
});

t("a person's review mark runs that page's checks", () => {
  ok(plan(['data/levies-reviewed.json']).checks.includes('levies'), 'levies review mark without levies');
  ok(plan(['data/votes-text-reviewed.json']).checks.includes('votes-actions'), 'votes text review mark without votes-actions');
  ok(plan(['data/alignment-reviewed.json']).checks.includes('alignment'), 'alignment review mark without alignment');
  ok(plan(['data/offices-text-reviewed.json']).checks.includes('office-text'), 'offices text review mark without office-text');
});

t('words in a screen (no color, no style): its checks and the sweeps, dark only', () => {
  const p = plan(['ext/cx-levies.jsx'], { lines: { 'ext/cx-levies.jsx': ['      <p>What the levy pays for, in plain words.</p>'] } });
  ok(p.ok, `refused: ${p.refuse}`);
  ['levies', 'story-fit', 'titles-never-cut', 'axe', 'no-bleed', 'targets', 'text-budget', 'text-overlap', ...ALWAYS].forEach((c) => ok(p.checks.includes(c), `no ${c}`));
  ok(!p.checks.includes('us-graph'), 'a levies change ran the United States checks');
  eq(p.light, [], 'light');
});

t('a color or an inline style in a screen adds its light passes', () => {
  const p = plan(['ext/cx-levies.jsx'], { lines: { 'ext/cx-levies.jsx': ["  <span style={{ color: '#fff' }}>x</span>"] } });
  ok(p.light.length > 0 && p.light.every((c) => LIGHT.includes(c) && p.checks.includes(c)), `light: ${p.light}`);
});

t('the Spanish dictionary: the switch and the Spanish layout pass', () => {
  const p = plan(['i18n/manual.json', 'i18n/es.json']);
  ok(p.ok, `refused: ${p.refuse}`);
  ok(p.checks.includes('spanish-switch'), 'no spanish-switch'); eq(p.spanish, SPANISH, 'spanish');
});

t('a shared or unknown source file runs every check', () => {
  for (const f of ['ext/cxm-core.jsx', 'ext/cx-new-thing.jsx']) { const p = plan([f]); ok(p.ok && p.all && p.checks.length === known.length, `${f}: ${p.checks.length}`); }
});

t('--fresh adds both light passes in full', () => { const p = plan(['docs/x.md'], { fresh: true }); eq(p.light, LIGHT, 'light'); });

t('the never-skipped checks are in every plan', () => {
  const samples = [[], ['docs/a.md'], ['data/votes-2026.json'], ['ext/cx.css'], ['ext/cx-levies.jsx'], ['i18n/manual.json'], ['ext/cx-nav.jsx'], ['scripts/test_votes.py'], ['scripts/us_map.js'], ['design/look.json']];
  for (const s of samples) { const p = plan(s); ALWAYS.forEach((c) => ok(p.checks.includes(c), `${s.join(',') || '(nothing)'}: no ${c}`)); }
});

t('the refusal list refuses, and says why', () => {
  const refused = ['build.py', 'scripts/refresh.py', 'scripts/fetch_legistar.py', 'scripts/fetch_cityrecord.py', 'scripts/net.py', 'design/tokens.json', 'design/legacy.json',
    'scripts/i18n/merge.js', 'ext/cx-i18n.jsx', 'vercel.json', 'ext/cx-privacy.jsx', 'ext/cx-districts.jsx', 'scripts/test_privacy.py', 'scripts/checks/run.js',
    'scripts/checks/pool.js', 'scripts/release.py', '.github/workflows/checks.yml', 'package.json', 'package-lock.json', 'inputs/app.js', 'scripts/approve.py', 'scripts/commit.py'];
  for (const f of refused) { const p = plan([f]); ok(!p.ok && p.refuse.length && p.refuse[0].startsWith(f + ': ') && p.refuse[0].length > f.length + 10, `${f} was not refused with a reason: ${JSON.stringify(p.refuse)}`); }
});

t('a changed line that saves in the browser or asks a server refuses, in any file of ext/', () => {
  for (const l of ["  try { localStorage.setItem('cx-new', '1'); } catch (e) {}", "  sessionStorage.removeItem('x');", "  fetch('/api/' + place)", '  navigator.sendBeacon(u, d);', "  document.cookie = 'a=1';", "  caches.open('x')"]) {
    const p = plan(['ext/cx-levies.jsx'], { lines: { 'ext/cx-levies.jsx': [l] } });
    ok(!p.ok && /saves something in the browser or asks a server/.test(p.refuse.join(' ')), `not refused: ${l}`);
  }
  ok(plan(['ext/cx-levies.jsx'], { lines: { 'ext/cx-levies.jsx': ['  <p>Fetch the paper ballot from the board.</p>'] } }).ok, 'plain words with "Fetch" were refused');
});

t(`more than ${FAST_MAX} changed files refuses; site/, docs, and photos do not count`, () => {
  const n = (k) => Array.from({ length: k }, (_, i) => `ext/cx-levies-part${i}.jsx`);
  const quiet = (fs) => Object.fromEntries(fs.map((f) => [f, []]));
  ok(plan(n(FAST_MAX), { lines: quiet(n(FAST_MAX)) }).ok, `${FAST_MAX} files were refused`);
  const p = plan(n(FAST_MAX + 1), { lines: quiet(n(FAST_MAX + 1)) });
  ok(!p.ok && /files changed \(more than/.test(p.refuse.join(' ')), `${FAST_MAX + 1} files were not refused`);
  const big = [...n(FAST_MAX), ...Array.from({ length: 40 }, (_, i) => `site/x${i}.json`), ...Array.from({ length: 40 }, (_, i) => `data/portraits-us/p${i}.webp`), 'docs/a.md', 'README.md'];
  ok(plan(big, { lines: quiet(n(FAST_MAX)) }).ok, 'site/, photos, or docs were counted');
});

t('the selector of a changed line is found, inside @media too', () => {
  const css = ['.a { color: red; }', '.usm-sheet,', '.usm-name {', '  color: blue;', '}', '@media (max-width: 600px) {', '  .lv-tile {', '    padding: 4px;', '  }', '}'].join('\n');
  eq(cssSelectors(css, [4]), ['.usm-sheet, .usm-name'], 'a rule over two lines');
  eq(cssSelectors(css, [8]), ['.lv-tile'], 'a rule inside @media');
});

t('the full suite is every check once, plus the light list in both styles; the checks that share pages are one job per pass', () => {
  const jobs = jobsFor({ names: known, light: inOrder(LIGHT) });
  const runs = jobs.flatMap((j) => j.names.map((n) => `${j.pass}|${n}`));
  eq(runs.length, new Set(runs).size, 'a check runs twice in one pass');
  eq(runs.filter((r) => r.startsWith('|')).length, known.length, 'the default pass');
  for (const p of ['light-bento', 'light-original']) eq(runs.filter((r) => r.startsWith(p + '|')).map((r) => r.split('|')[1]).sort(), LIGHT.slice().sort(), p);
  for (const p of ['', 'light-bento', 'light-original']) ok(jobs.some((j) => j.pass === p && TOGETHER[0].every((n) => j.names.includes(n))), `the shared-page checks are not one job in pass "${p}"`);
  eq(jobsFor({ names: ['axe'] }).map((j) => j.names), [['axe']], 'one of them alone');
});

t('the parts of a split suite cover every job exactly once', () => {
  const jobs = jobsFor({ names: known, light: inOrder(LIGHT) });
  for (const n of [1, 2, 3, 4]) {
    const parts = Array.from({ length: n }, (_, k) => shardOf(jobs, k + 1, n));
    const seen = parts.flat().map((j) => j.idx).sort((a, b) => a - b);
    eq(seen, jobs.map((j) => j.idx), `${n} parts`);
  }
});

console.log(`\n${ran - failed} of ${ran} release plan tests passed.`);
process.exit(failed ? 1 : 0);
