#!/usr/bin/env node
/* Which browser checks the files you changed can affect: while working, and for the release's fast lane.

   node scripts/checks/changed.js              run the checks that what differs from the last commit can affect (edited, staged, and new files)
   node scripts/checks/changed.js --since main    what differs from another commit or branch
   node scripts/checks/changed.js --thorough      also run the mapped checks in light mode and Spanish
   node scripts/checks/changed.js --plan          print the plan and stop
   node scripts/checks/changed.js --files a,b     pretend these files changed
   node scripts/checks/changed.js --release --since <commit> [--fresh]   the fast lane's plan as JSON (python scripts/release.py --fast reads it)

   How it decides, while working. Each changed file is looked up in RULES below. A change to anything shared (the stylesheets, cxm-core, the
   build, the tokens, the check runner) runs every check. A change to a file nothing here knows about also runs every check, because a guess
   that is too small is how a bug ships. Docs and agent notes run nothing. Rebuild first (python build.py): the checks open site/.
   The release gate (python scripts/release.py) still runs everything; this never replaces it.

   The fast lane (python scripts/release.py --fast), for changes the reviewer reads on the live site himself. It refuses, and says why, when
   a change touches anything in REFUSE (the build's patches and the Content-Security-Policy, the fetchers, the tokens, the Spanish pipeline,
   the host's headers, the privacy and storage paths, the gate itself), when a changed line in ext/ saves something in the browser or asks a
   server for something, or when more than FAST_MAX files changed (site/, docs, and photos not counted). Otherwise it runs the ALWAYS checks
   (scripts/checks/lists.js) and the ones the change can affect: RULES as above, except that a stylesheet runs the layout and look checks
   (STYLE_CHECKS) and the checks for the parts whose selectors changed (CSS_AREAS) instead of everything, and records and docs run no
   extra check (the unit tests and refresh.py --check run in every lane). Light mode, in both styles, runs only when the look can have
   changed (a stylesheet, bento.py, light.py, or a changed line in ext/ with a color or an inline style), or with --fresh. Spanish runs when
   i18n/ changed. The full gate runs on GitHub after every push to main as the safety net (.github/workflows/checks.yml). */
const { spawnSync, execFileSync } = require('child_process');
const fs = require('fs'), path = require('path');
const { LIGHT, ALWAYS, SPANISH } = require('./lists.js');
const ROOT = path.resolve(__dirname, '..', '..');
const arg = (f) => { const i = process.argv.indexOf(f); return i < 0 ? null : (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true); };

const ALL = '*';
// the slow ones that scan every page: run once for any change to the app's screens or styles
const SWEEP = ['axe', 'no-bleed', 'targets', 'text-budget'];
// [test on the path, checks to run]. First match wins. Order matters: shared files first.
const RULES = [
  [(f) => f.startsWith('docs/') || f.startsWith('.claude/') || f.endsWith('.md') || f.endsWith('.txt') || f === '.gitignore', []],
  [(f) => f === 'scripts/checks/changed.js' || f === 'scripts/test_release_plan.js', []],
  [(f) => f.startsWith('site/') || f.startsWith('dist/') || f.startsWith('build/'), []],   // outputs, not inputs
  [(f) => ['ext/cx.css', 'ext/cxm.css', 'ext/cx-bento.css', 'ext/cx-light.css', 'ext/cxm-core.jsx', 'ext/cx-ui.jsx', 'ext/cx-data.jsx', 'ext/cx-i18n.jsx', 'build.py', 'bento.py', 'light.py', 'design/tokens.json', 'design/legacy.json', 'scripts/checks/run.js', 'scripts/checks/pool.js', 'scripts/checks/lists.js', 'package.json', 'package-lock.json'].includes(f), ALL],
  [(f) => f === 'ext/cxm-people.jsx' || f === 'ext/cxm-federal.jsx', ['people-tabs', 'records-tab', 'profiles', 'us-graph', 'us-map', 'alignment', 'screen-states', ...SWEEP]],   // CxmFolders is also the Records tab's folder tabs
  [(f) => f === 'ext/cx-us.jsx' || f === 'ext/cx-us-map.jsx' || f === 'ext/cx-us-model.jsx' || f === 'ext/cx-us-text.jsx' || f === 'ext/cx-d3.js', ['us-graph', 'us-index', 'us-tree', 'us-map', 'us-map-touch', 'us-map-sheet', 'us-map-narrow', 'us-profile', 'us-explain', 'alignment', 'people-tabs', 'perf-budget', ...SWEEP]],
  [(f) => f === 'ext/cx-us-index.jsx', ['us-index', 'us-tree', 'us-graph', 'us-profile', 'us-explain', 'color-vision', 'text-overlap', 'perf-budget', ...SWEEP]],   // the Index (Brent's Index kit); the Tree reads its pages
  [(f) => f === 'ext/cx-us-tree.jsx', ['us-tree', 'us-graph', 'us-index', 'us-profile', 'color-vision', 'text-overlap', 'perf-budget', ...SWEEP]],   // the Tree (Brent's Tree kit)
  [(f) => f === 'ext/cx-align.jsx' || f === 'ext/cx-align-text.jsx' || f === 'data/alignment-reviewed.json', ['alignment', 'us-graph', 'us-profile', 'us-map-sheet', 'security-policy', 'color-vision', 'text-overlap', 'perf-budget', ...SWEEP]],   // how you line up
  [(f) => f === 'ext/cxm-ballot.jsx' || f === 'ext/cx-districts.jsx', ['districts', 'levies', 'screen-states', ...SWEEP]],
  [(f) => f === 'ext/cx-levies.jsx', ['levies', 'story-fit', 'titles-never-cut', ...SWEEP]],
  [(f) => f === 'ext/cx-story.jsx' || f === 'ext/cxm-today.jsx' || f === 'ext/cx-headline.jsx', ['stories-desktop', 'stories-phone', 'stories-deeper', 'story-layout', 'story-fit', 'today-order', 'titles-never-cut', 'records-feed', 'records-tab', 'city-hall', 'banners', ...SWEEP]],
  [(f) => f === 'ext/cxm-easy.jsx', ['easy-phone', 'easy-desktop', 'records-tab', ...SWEEP]],
  [(f) => f === 'ext/cxm-explore.jsx', ['explore-bubble', 'records-tab', 'settings-sheet', 'map-cards', 'screen-states', 'shell', 'text-overlap', 'design-look', ...SWEEP]],   // Explore (Records > Rooms) and its rail (ext/cxm.css runs everything)
  [(f) => f === 'ext/cxm-place.jsx' || f === 'ext/cx-place.jsx', ['map-cards', 'place-dropdown', 'screen-states', 'shell', ...SWEEP]],
  [(f) => ['ext/cx-leaders.jsx', 'ext/cx-seat.jsx', 'ext/cx-votes.jsx', 'ext/cx-reasons.jsx'].includes(f), ['profiles', 'council-votes', 'people-tabs', ...SWEEP]],
  [(f) => f === 'ext/cxm-more.jsx', ['settings-sheet', 'mode-switch', 'sheet-pull', ...SWEEP]],
  [(f) => f === 'ext/cxm-live.jsx' || f === 'ext/cx-live.jsx', ['update-wins', 'shell', 'offline-shell', 'screen-states', 'print', 'records-feed', 'records-tab', 'records-changed', ...SWEEP]],   // the Updated strip opens Records > Latest, with "Changed in the latest pull"
  [(f) => f === 'ext/cx-nav.jsx', ['nav-desktop', 'stories-deeper', 'easy-desktop', 'us-graph', 'screen-states', 'design-look', 'privacy-policy', ...SWEEP]],
  [(f) => f === 'ext/cx-privacy.jsx' || f === 'vercel.json', ['privacy-policy', 'nav-desktop', 'settings-sheet', 'screen-states', 'design-look', 'text-overlap', ...SWEEP]],
  [(f) => f === 'ext/cx-record.jsx' || f === 'ext/cx-votes-text.jsx' || f === 'data/votes-text-reviewed.json' || f === 'scripts/council_record.py', ['votes-actions', 'council-votes', 'profiles', 'city-hall', 'titles-never-cut', 'nav-desktop', 'privacy-policy', 'perf-budget', 'color-vision', 'text-overlap', 'records-feed', ...SWEEP]],   // votes, actions, and positions
  [(f) => f === 'ext/cx-records.jsx' || f === 'scripts/records_feed.py', ['records-feed', 'records-tab', 'records-changed','explore-bubble', 'today-order', 'banners', 'votes-actions', 'city-hall', 'tab-blue', 'perf-budget', 'color-vision', 'design-look', 'text-overlap', ...SWEEP]],   // Records, its tab and folders (Latest, Meetings, Rooms), and Today's Latest  [(f) => f.startsWith('ext/'), ALL],   // a new or unknown source file: be safe
  [(f) => f.startsWith('i18n/'), ['spanish-switch']],
  [(f) => f === 'data/us-explainers-2026.json', ['us-explain', 'perf-budget']],   // what each committee does: the official words
  [(f) => f.startsWith('data/') || f.startsWith('bench/'), ['bench-records', 'council-votes', 'votes-actions', 'us-graph', 'screen-states', 'update-wins', 'perf-budget', 'records-changed']],
  [(f) => f.startsWith('design/'), ['design-look', 'color-vision']],
  [(f) => f.startsWith('scripts/checks/') || f.startsWith('scripts/design/'), ALL],
  [(f) => f.startsWith('scripts/') || f.startsWith('.github/') || f === 'vercel.json', []],   // unit tests and workflows, not the browser
];
// text or style changes can break Spanish or light mode; these run there under --thorough, and always for i18n changes
const LAYOUT = SPANISH;

/* ---------- the fast lane ---------- */
// more changed files than this (site/, docs, and photos not counted) is not a small change: the full gate
const FAST_MAX = 25;
const NOT_COUNTED = (f) => /^(site|dist|build|docs)\//.test(f) || f.endsWith('.md') || f.startsWith('data/portraits-us/');
// [test on the path, why the full gate is needed]
const REFUSE = [
  [(f) => f === 'build.py', 'build.py holds the patches to the compiled app and the Content-Security-Policy (with_csp)'],
  [(f) => f === 'vercel.json', "vercel.json sets the host's headers, its Content-Security-Policy, and its addresses"],
  [(f) => /^scripts\/(refresh|net|changes|us_sources|us_explainer_config|fetch_[a-z0-9_]+)\.py$/.test(f), 'refresh.py and the fetchers decide what official records are published'],
  [(f) => f === 'design/tokens.json' || f === 'design/legacy.json', 'the design tokens (and the allowance for older values) are the one source for the look'],
  [(f) => f.startsWith('scripts/i18n/') || f === 'ext/cx-i18n.jsx', 'the Spanish pipeline: the translator and the scripts that build the dictionary'],
  [(f) => f === 'ext/cx-privacy.jsx' || f === 'ext/cx-districts.jsx' || f === 'scripts/test_privacy.py' || f === 'docs/privacy-claims.md', 'a privacy path: the policy, what is saved in the browser, or the address finder'],
  [(f) => f.startsWith('scripts/checks/') || f.startsWith('scripts/design/') || f === 'scripts/release.py' || f.startsWith('.github/'), 'the release gate, the checks, and the workflows are checked only by the full gate'],
  [(f) => /^scripts\/(approve|commit|bench_common|packets)\.py$/.test(f) || f === 'bench/reviewers.json', 'the Bench approval and publishing code'],
  [(f) => f === 'package.json' || f === 'package-lock.json', 'the packages change the bundle and the tools'],
  [(f) => f.startsWith('inputs/'), 'inputs/ is the compiled app and is never edited'],
];
// a changed line in ext/ that saves something in the browser or asks a server for something: a privacy path, wherever it is
const PRIVATE_LINE = /\b(localStorage|sessionStorage|indexedDB|cookieStore|caches|serviceWorker|sendBeacon|XMLHttpRequest|EventSource|WebSocket)\b|document\.cookie|\bfetch\s*\(/;
// a changed line in ext/ that sets a color or an inline style: the look can change, so light mode runs too
const STYLE_LINE = /\bstyle\s*=\s*\{|\bstyle\s*:|#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(|\bvar\(--/;
const STYLE_FILES = (f) => /^ext\/[^/]+\.css$/.test(f) || f === 'bento.py' || f === 'light.py';
// the layout and look checks a stylesheet change runs, on every screen they visit
const STYLE_CHECKS = ['axe', 'no-bleed', 'text-overlap', 'targets', 'titles-never-cut', 'story-fit', 'story-layout', 'text-budget', 'color-vision', 'design-look', 'print', 'screen-states', 'mode-switch', 'nav-desktop', 'sheet-pull'];
// and the checks of the part whose selectors changed: [test on the selector, checks]
const CSS_AREAS = [
  [/\.(usm|us-|usx|ual)/, ['us-graph', 'us-map', 'us-map-touch', 'us-map-sheet', 'us-map-narrow', 'us-profile', 'us-map-chrome', 'us-explain', 'alignment']],
  [/\.rc(-|\b)/, ['votes-actions', 'council-votes', 'profiles']],
  [/\.lv(-|\b)/, ['levies']],
  [/\.mt-/, ['city-hall', 'records-tab']],
  [/\.rf(-|\b)/, ['records-feed', 'records-tab', 'records-changed', 'tab-blue']],
  [/\.cxm-(recbar|recpanel|folder|rooms|roomtile|level|rail|tick)/, ['records-tab', 'explore-bubble', 'people-tabs', 'tab-blue']],   // the Records tab's folder tabs (People's) and Rooms
  [/\.cxe(-|\b)/, ['easy-phone', 'easy-desktop']],
  [/stor(y|ies)/, ['stories-desktop', 'stories-phone', 'stories-deeper']],
  [/\.(sp(-|\b)|cxm-prof)/, ['profiles', 'people-tabs']],
  [/\.(cxm-sheet|cxm-grab|cxm-set)/, ['settings-sheet']],
  [/\.(cxm-tile|cxm-keycard|cxm-card)/, ['map-cards', 'levies']],
  [/\.(cx-bench|bench)/, ['bench-records']],
];
// the fast lane's own reading of a file, where it differs from RULES: records and docs need no extra check (the unit tests and
// refresh.py --check run in every lane), unit tests run anyway, and the map's build script moves the map
const FAST_RULES = [
  // a person's review mark (python build.py --mark-...-reviewed) changes what a page says about its review: that page's checks
  [(f) => f === 'data/office-reviewed.json', ['profiles', 'people-tabs']],
  [(f) => f === 'data/levies-reviewed.json', ['levies', 'story-fit']],
  [(f) => f === 'data/us-text-reviewed.json', ['us-explain', 'us-profile', 'us-map-sheet']],
  [(f) => f === 'data/reasons-reviewed.json', ['profiles', 'council-votes']],
  [(f) => f === 'data/privacy-reviewed.json', ['privacy-policy']],
  [(f) => f.startsWith('data/') && !['data/alignment-reviewed.json', 'data/votes-text-reviewed.json', 'data/us-explainers-2026.json'].includes(f), []],
  [(f) => f.startsWith('bench/'), []],
  [(f) => /^scripts\/test_[a-z0-9_]+\.(py|js)$/.test(f) || f.startsWith('scripts/fixtures/') || f.startsWith('scripts/perf/'), []],
  [(f) => f === 'scripts/us_map.js', ['us-graph', 'us-map', 'us-map-touch', 'us-map-sheet', 'us-map-narrow', 'perf-budget']],
  [(f) => f === 'design/look.json', ['design-look']],
];

/* the selector of the rule each of these lines (1-based) sits in */
function cssSelectors(text, lineNos) {
  const lines = text.split('\n'), out = new Set();
  for (const n of lineNos) {
    let depth = 0;
    for (let i = Math.min(n, lines.length) - 1; i >= 0; i--) {
      const l = lines[i].replace(/\/\*.*?\*\//g, '');
      const close = (l.match(/\}/g) || []).length, open = (l.match(/\{/g) || []).length;
      depth += close - open;
      if (depth < 0) {
        let sel = l.slice(0, l.lastIndexOf('{'));
        for (let k = i - 1; k >= 0 && /,\s*$/.test(lines[k]); k--) sel = lines[k] + ' ' + sel;
        out.add(sel.trim()); break;
      }
    }
  }
  return [...out];
}

/* The fast lane's plan. files: what changed since the last release; lines: { file: changed lines (added and removed) };
   selectors: { stylesheet: the selectors of the rules that changed }; known: every check, in run.js's order. */
function planRelease({ files, lines = {}, selectors = {}, known, fresh = false, max = FAST_MAX }) {
  const refuse = [], notes = [];
  for (const f of files) { const r = REFUSE.find(([t]) => t(f)); if (r) refuse.push(`${f}: ${r[1]}`); }
  for (const [f, ls] of Object.entries(lines)) {
    if (!f.startsWith('ext/') || STYLE_FILES(f)) continue;
    const hit = ls.find((l) => PRIVATE_LINE.test(l));
    if (hit && !refuse.some((r) => r.startsWith(`${f}:`))) refuse.push(`${f}: a changed line saves something in the browser or asks a server for something (${hit.trim().slice(0, 80)})`);
  }
  const counted = files.filter((f) => !NOT_COUNTED(f));
  if (counted.length > max) refuse.push(`${counted.length} files changed (more than ${max}, not counting site/, docs, and photos): not a small change`);
  const picked = new Set(ALWAYS);
  let all = false, light = false, spanish = false;
  for (const f of files) {
    if (STYLE_FILES(f)) {
      STYLE_CHECKS.forEach((c) => picked.add(c)); light = true;
      const sels = selectors[f] || [];
      CSS_AREAS.forEach(([re, cs]) => { if (sels.some((s) => re.test(s))) cs.forEach((c) => picked.add(c)); });
      notes.push(`${f}: the layout and look checks${sels.length ? ` and the parts its ${sels.length} changed rule${sels.length === 1 ? '' : 's'} style` : ''}, in light mode too`);
      continue;
    }
    if (f.startsWith('i18n/')) spanish = true;
    if (f.startsWith('ext/') && (lines[f] || []).some((l) => STYLE_LINE.test(l))) { light = true; notes.push(`${f}: a changed line sets a color or a style, so light mode runs too`); }
    const rule = FAST_RULES.find(([t]) => t(f)) || RULES.find(([t]) => t(f));
    if (!rule || rule[1] === ALL) { all = true; notes.push(`${f}: ${rule ? 'shared' : 'not recognized'}, runs every check`); continue; }
    rule[1].forEach((c) => picked.add(c));
    if (rule[1] === SWEEP || rule[1].includes('no-bleed')) picked.add('text-overlap');   // a change to a screen can put text on top of text
  }
  if (spanish) picked.add('spanish-switch');
  const unknown = [...picked, ...LIGHT, ...SPANISH].filter((c) => !known.includes(c));
  if (unknown.length) throw new Error(`the fast lane names checks that do not exist: ${[...new Set(unknown)].join(', ')}`);
  const checks = all ? known.slice() : known.filter((c) => picked.has(c));
  const lightChecks = fresh || (all && light) ? LIGHT.slice() : light ? LIGHT.filter((c) => checks.includes(c)) : [];
  if (fresh && !light) notes.push('--fresh: light mode runs in both styles');
  return { ok: refuse.length === 0, refuse, checks, light: lightChecks, spanish: spanish ? SPANISH.slice() : [], all, always: ALWAYS.slice(), counted: counted.length, max, files: files.length, notes };
}

/* ---------- reading git ---------- */
const git = (a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
function changedFiles(since) {
  const f = arg('--files');
  if (typeof f === 'string') return f.split(',');
  const list = (a) => git(a).split('\n').filter(Boolean);
  const tracked = list(['diff', '--name-only', typeof since === 'string' ? since : 'HEAD']);
  return [...new Set([...tracked, ...list(['ls-files', '--others', '--exclude-standard'])])];
}
/* changed lines (added and removed) per file, and for each stylesheet the selectors of the rules those lines sit in */
function diffDetail(since, files) {
  const lines = {}, selectors = {};
  for (const f of files) {
    if (!/^(ext|i18n)\//.test(f) && !STYLE_FILES(f)) continue;
    let d = '';
    try { d = git(['diff', '-U0', '--no-color', since, '--', f]); } catch (e) { d = ''; }
    const isNew = !d && fs.existsSync(path.join(ROOT, f));
    const added = [], removed = [], addAt = [], remAt = [];
    if (isNew) { fs.readFileSync(path.join(ROOT, f), 'utf8').split('\n').forEach((l, i) => { added.push(l); addAt.push(i + 1); }); }
    let a = 0, b = 0;
    for (const l of d.split('\n')) {
      const h = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(l);
      if (h) { a = +h[1]; b = +h[2]; continue; }
      if (l.startsWith('+++') || l.startsWith('---')) continue;
      if (l.startsWith('+')) { added.push(l.slice(1)); addAt.push(b++); } else if (l.startsWith('-')) { removed.push(l.slice(1)); remAt.push(a++); }
    }
    lines[f] = [...added, ...removed];
    if (/\.css$/.test(f)) {
      const now = fs.existsSync(path.join(ROOT, f)) ? fs.readFileSync(path.join(ROOT, f), 'utf8') : '';
      let was = ''; try { was = git(['show', `${since}:${f}`]); } catch (e) { was = ''; }
      selectors[f] = [...new Set([...cssSelectors(now, addAt), ...cssSelectors(was, remAt)])];
    }
  }
  return { lines, selectors };
}
const knownChecks = () => execFileSync('node', [path.join(__dirname, 'run.js'), '--list'], { cwd: ROOT, encoding: 'utf8' }).split('\n').map((s) => s.trim()).filter(Boolean);

/* ---------- the command ---------- */
function main() {
  const since = arg('--since');
  if (arg('--release')) {   // the fast lane's plan, for release.py
    if (typeof since !== 'string') { console.error('--release needs --since <the last released commit>'); process.exit(2); }
    const files = changedFiles(since);
    const plan = planRelease({ files, ...diffDetail(since, files), known: knownChecks(), fresh: !!arg('--fresh') });
    process.stdout.write(JSON.stringify({ since, changed: files, ...plan }, null, 1) + '\n');
    return;
  }
  const files = changedFiles(since);
  if (!files.length) { console.log('Nothing changed since the last commit. Nothing to check.'); process.exit(0); }
  let all = false; const picked = new Set(); const notes = [];
  for (const f of files) {
    const rule = RULES.find(([t]) => t(f));
    if (!rule) { all = true; notes.push(`${f}: not recognized, running everything`); continue; }
    if (rule[1] === ALL) { all = true; notes.push(`${f}: shared or not mapped, runs everything`); continue; }
    rule[1].forEach((c) => picked.add(c));
  }
  const known = knownChecks();
  const bad = [...picked].filter((c) => !known.some((k) => k.includes(c)));
  if (bad.length) { console.error(`changed.js names checks that do not exist: ${bad.join(', ')}`); process.exit(2); }
  const list = all ? known : known.filter((k) => [...picked].some((c) => k.includes(c)));
  const spanish = files.some((f) => f.startsWith('i18n/') || f.startsWith('ext/')) && !all ? LAYOUT.filter((c) => picked.has(c)) : [];
  const thorough = !!arg('--thorough');

  console.log(`${files.length} file${files.length === 1 ? '' : 's'} changed. ${all ? 'Running all ' + known.length + ' checks.' : list.length ? 'Running ' + list.length + ' of ' + known.length + ' checks: ' + list.join(', ') : 'No browser check can be affected.'}`);
  notes.slice(0, 4).forEach((n) => console.log('  ' + n));
  if (arg('--plan') || !list.length) {
    if (!list.length) console.log('Run the unit tests if scripts or data changed: python scripts/release.py runs everything before a push.');
    process.exit(0);
  }

  // the checks open site/, so it has to be at least as new as the newest changed source
  const site = path.join(ROOT, 'site', 'index.html');
  const newest = Math.max(0, ...files.filter((f) => f.startsWith('ext/') || ['build.py', 'bento.py', 'light.py'].includes(f) || f.startsWith('i18n/') || f.startsWith('design/')).map((f) => { try { return fs.statSync(path.join(ROOT, f)).mtimeMs; } catch (e) { return 0; } }));
  if (!fs.existsSync(site) || fs.statSync(site).mtimeMs < newest) { console.error('site/ is older than your changes. Run python build.py first, so the checks look at what you wrote.'); process.exit(2); }

  // one run, side by side (run.js): the mapped checks, and with --thorough (or a change to i18n/) the layout checks in Spanish and the mapped checks in light mode
  const args = ['--exact', list.join(',')];
  if (thorough || files.some((f) => f.startsWith('i18n/'))) args.push('--spanish', (all ? LAYOUT : (spanish.length ? spanish : LAYOUT)).join(','));
  if (thorough) args.push('--light', list.join(','));
  const once = (a) => { const r = spawnSync('node', [path.join(__dirname, 'run.js'), ...a], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 }); return { out: (r.stdout || '') + (r.stderr || ''), ok: r.status === 0 }; };
  const first = once(args);
  process.stdout.write(first.out);
  let ok = first.ok;
  // Chrome sometimes drops its session in a long run ("Session with given id not found"). That says nothing about the app,
  // so a check that failed only that way is run once more by itself, in the same pass. A real failure is never retried.
  if (!ok) {
    const lines = first.out.split('\n'), glitched = [], real = [];
    lines.forEach((l, i) => { const m = /^FAIL\s+(\S+)(?:\s+\[([^\]]+)\])?/.exec(l); if (!m) return; (lines.slice(i + 1, i + 4).some((x) => x.includes('Session with given id not found')) ? glitched : real).push({ name: m[1], pass: m[2] || '' }); });
    if (glitched.length && !real.length) {
      console.log(`\nChrome dropped its session on ${glitched.map((g) => g.name + (g.pass ? ` [${g.pass}]` : '')).join(', ')}. Running ${glitched.length === 1 ? 'it' : 'them'} once more.`);
      const by = (p) => glitched.filter((g) => g.pass === p).map((g) => g.name);
      const again = ['--exact', by('').join(',') || 'none'];
      const lt = [...new Set([...by('light, Bento'), ...by('light, Original')])], es = by('Spanish');
      if (lt.length) again.push('--light', lt.join(','));
      if (es.length) again.push('--spanish', es.join(','));
      const second = once(again);
      process.stdout.write(second.out);
      ok = second.ok;
    }
  }
  console.log(`\n${ok ? 'These checks passed.' : 'A check failed.'} This is a working check; python scripts/release.py still runs everything before a push.`);
  process.exit(ok ? 0 : 1);
}

module.exports = { planRelease, cssSelectors, RULES, REFUSE, FAST_MAX, STYLE_CHECKS, SWEEP };
if (require.main === module) main();
