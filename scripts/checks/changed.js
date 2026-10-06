#!/usr/bin/env node
/* Run only the browser checks that the files you changed can affect. For working, not for shipping.

   node scripts/checks/changed.js              what differs from the last commit (edited, staged, and new files)
   node scripts/checks/changed.js --since main    what differs from another commit or branch
   node scripts/checks/changed.js --thorough      also run the mapped checks in light mode and Spanish
   node scripts/checks/changed.js --plan          print the plan and stop
   node scripts/checks/changed.js --files a,b     pretend these files changed

   How it decides. Each changed file is looked up in RULES below. A change to anything shared (the stylesheets, cxm-core, the build,
   the tokens, the check runner) runs every check. A change to a file nothing here knows about also runs every check, because a guess
   that is too small is how a bug ships. Docs and agent notes run nothing. Rebuild first (python build.py): the checks open site/.
   The release gate (python scripts/release.py) still runs everything; this never replaces it. */
const { spawnSync, execFileSync } = require('child_process');
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const arg = (f) => { const i = process.argv.indexOf(f); return i < 0 ? null : (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true); };

const ALL = '*';
// the slow ones that scan every page: run once for any change to the app's screens or styles
const SWEEP = ['axe', 'no-bleed', 'targets', 'text-budget'];
// [test on the path, checks to run]. First match wins. Order matters: shared files first.
const RULES = [
  [(f) => f.startsWith('docs/') || f.startsWith('.claude/') || f.endsWith('.md') || f.endsWith('.txt') || f === '.gitignore', []],
  [(f) => f === 'scripts/checks/changed.js', []],
  [(f) => f.startsWith('site/') || f.startsWith('dist/') || f.startsWith('build/'), []],   // outputs, not inputs
  [(f) => ['ext/cx.css', 'ext/cxm.css', 'ext/cx-bento.css', 'ext/cx-light.css', 'ext/cxm-core.jsx', 'ext/cx-ui.jsx', 'ext/cx-data.jsx', 'ext/cx-i18n.jsx', 'build.py', 'bento.py', 'light.py', 'design/tokens.json', 'design/legacy.json', 'scripts/checks/run.js', 'package.json', 'package-lock.json'].includes(f), ALL],
  [(f) => f === 'ext/cxm-people.jsx' || f === 'ext/cxm-federal.jsx', ['people-tabs', 'profiles', 'us-graph', 'us-map', 'screen-states', ...SWEEP]],
  [(f) => f === 'ext/cx-us.jsx' || f === 'ext/cx-us-map.jsx' || f === 'ext/cx-us-model.jsx' || f === 'ext/cx-d3.js', ['us-graph', 'us-map', 'us-map-touch', 'us-map-sheet', 'us-map-narrow', 'people-tabs', ...SWEEP]],
  [(f) => f === 'ext/cxm-ballot.jsx' || f === 'ext/cx-districts.jsx', ['districts', 'levies', 'screen-states', ...SWEEP]],
  [(f) => f === 'ext/cx-levies.jsx', ['levies', 'story-fit', 'titles-never-cut', ...SWEEP]],
  [(f) => f === 'ext/cx-story.jsx' || f === 'ext/cxm-today.jsx' || f === 'ext/cx-headline.jsx', ['stories-desktop', 'stories-phone', 'stories-deeper', 'story-layout', 'story-fit', 'today-order', 'titles-never-cut', ...SWEEP]],
  [(f) => f === 'ext/cxm-easy.jsx', ['easy-phone', 'easy-desktop', ...SWEEP]],
  [(f) => f === 'ext/cxm-explore.jsx' || f === 'ext/cxm-place.jsx' || f === 'ext/cx-place.jsx', ['map-cards', 'screen-states', 'shell', ...SWEEP]],
  [(f) => ['ext/cx-leaders.jsx', 'ext/cx-seat.jsx', 'ext/cx-votes.jsx', 'ext/cx-reasons.jsx'].includes(f), ['profiles', 'council-votes', 'people-tabs', ...SWEEP]],
  [(f) => f === 'ext/cxm-more.jsx', ['settings-sheet', 'mode-switch', 'sheet-pull', ...SWEEP]],
  [(f) => f === 'ext/cxm-live.jsx' || f === 'ext/cx-live.jsx', ['update-wins', 'shell', 'offline-shell', 'screen-states', 'print', ...SWEEP]],
  [(f) => f === 'ext/cx-nav.jsx', ['nav-desktop', 'stories-deeper', 'easy-desktop', 'us-graph', 'screen-states', 'design-look', ...SWEEP]],
  [(f) => f.startsWith('ext/'), ALL],   // a new or unknown source file: be safe
  [(f) => f.startsWith('i18n/'), ['spanish-switch']],
  [(f) => f.startsWith('data/') || f.startsWith('bench/'), ['bench-records', 'council-votes', 'us-graph', 'screen-states', 'update-wins', 'perf-budget']],
  [(f) => f.startsWith('design/'), ['design-look', 'color-vision']],
  [(f) => f.startsWith('scripts/checks/') || f.startsWith('scripts/design/'), ALL],
  [(f) => f.startsWith('scripts/') || f.startsWith('.github/') || f === 'vercel.json', []],   // unit tests and workflows, not the browser
];
// text or style changes can break Spanish or light mode; these run there under --thorough, and always for i18n changes
const LAYOUT = ['axe', 'no-bleed', 'targets'];

function changedFiles() {
  const f = arg('--files');
  if (typeof f === 'string') return f.split(',');
  const since = arg('--since');
  const git = (a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean);
  const tracked = git(['diff', '--name-only', typeof since === 'string' ? since : 'HEAD']);
  return [...new Set([...tracked, ...git(['ls-files', '--others', '--exclude-standard'])])];
}

const files = changedFiles();
if (!files.length) { console.log('Nothing changed since the last commit. Nothing to check.'); process.exit(0); }
let all = false; const picked = new Set(); const notes = [];
for (const f of files) {
  const rule = RULES.find(([t]) => t(f));
  if (!rule) { all = true; notes.push(`${f}: not recognized, running everything`); continue; }
  if (rule[1] === ALL) { all = true; notes.push(`${f}: shared or not mapped, runs everything`); continue; }
  rule[1].forEach((c) => picked.add(c));
}
const known = execFileSync('node', [path.join(__dirname, 'run.js'), '--list'], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean);
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

function once(env, names) {
  const r = spawnSync('node', [path.join(__dirname, 'run.js'), '--only', names.join(',')], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, ...env } });
  return { out: (r.stdout || '') + (r.stderr || ''), ok: r.status === 0 };
}
// Chrome sometimes drops its session in a long run ("Session with given id not found"). That says nothing about the app,
// so a check that failed only that way is run once more by itself. A real failure is never retried.
function run(label, env, names) {
  console.log(`\n== ${label}: ${names.length === known.length ? 'all checks' : names.join(', ')}`);
  const first = once(env, names);
  process.stdout.write(first.out);
  if (first.ok) return true;
  const lines = first.out.split('\n');
  const glitched = [], real = [];
  lines.forEach((l, i) => { const m = /^FAIL\s+(\S+)/.exec(l); if (!m) return; (lines.slice(i + 1, i + 4).some((x) => x.includes('Session with given id not found')) ? glitched : real).push(m[1]); });
  if (!glitched.length || real.length) return false;
  console.log(`\nChrome dropped its session on ${glitched.join(', ')}. Running ${glitched.length === 1 ? 'it' : 'them'} once more.`);
  const second = once(env, glitched);
  process.stdout.write(second.out);
  return second.ok;
}
let ok = run('English, dark', {}, list);
if (thorough || files.some((f) => f.startsWith('i18n/'))) {
  const lang = all ? LAYOUT : (spanish.length ? spanish : LAYOUT);
  ok = run('Spanish layout', { CHECK_LANG: 'es' }, lang) && ok;
}
if (thorough) {
  ok = run('Light mode, Bento', { CHECK_MODE: 'light' }, list) && ok;
  ok = run('Light mode, Original', { CHECK_MODE: 'light', CHECK_THEME: 'original' }, list) && ok;
}
console.log(`\n${ok ? 'These checks passed.' : 'A check failed.'} This is a working check; python scripts/release.py still runs everything before a push.`);
process.exit(ok ? 0 : 1);
