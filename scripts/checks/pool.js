/* Runs the browser checks side by side. run.js is the command; it hands its list here when more than one check runs at once.

   Each check in each pass (the default pass, light mode in Bento, light mode in Original, Spanish) is one job: its own node process
   (run.js --exact <name>), so its own Chrome with its own profile, its own server on its own port, and its own storage. No two jobs share
   anything but site/, which they only read. N jobs run at once: --jobs N, or CHECK_JOBS, or min(4, half the processors).
   Checks listed together in TOGETHER (lists.js) visit the same pages, so when two or more of them run in one pass they are one job, and
   run.js opens each page once for all of them.

   The report is printed in the table's order (the default pass, then each other pass), whatever order the jobs finish in. A failed check
   never hides another one's result: every job runs to its end, and the exit code is 1 if any check failed. Retries are the same as in one
   process: a check that ended only in a crash runs once more inside its job (run.js), and a job whose process stopped without printing
   its results (Chrome did not start, the process died) runs once more. An assertion that failed is never retried.

   Checks named in SERIAL (lists.js) run after everything else, one at a time, with nothing beside them.
   Every run writes how long each check took to a file outside the repository, so the next run starts the longest jobs first, and prints
   the slowest checks with the time on the clock. --shard k/n runs only part k of n of the jobs (the Checks workflow splits the suite
   across machines); the split uses the fixed estimates below, so every machine computes the same split. */
const { spawn, spawnSync } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path');
const { TOGETHER } = require('./lists.js');

const ROOT = path.resolve(__dirname, '..', '..');
const RUN = path.join(__dirname, 'run.js');
const TIMES = path.join(os.tmpdir(), 'cx-check-times.json');
const JOB_LIMIT_MS = 20 * 60 * 1000;   // a job that runs this long is stuck (the slowest takes about 4 minutes on a slow machine)

// seconds per check when each runs alone (measured Oct 6, 2026 on Windows), used before this machine has a history, and always for --shard
// (so every machine splits the same way); a check not named here counts as 8
const HINT = { 'text-overlap': 224, 'no-bleed': 212, axe: 209, 'nav-desktop': 130, 'us-map': 109, 'design-look': 94, 'privacy-policy': 79, 'us-graph': 71,
  'color-vision': 63, 'us-profile': 62, 'votes-actions': 60, alignment: 55, 'story-fit': 52, levies: 46, 'us-explain': 39, 'text-budget': 37,
  'us-map-sheet': 35, 'city-hall': 33, 'us-map-chrome': 25, 'screen-states': 24, 'remember-place': 23, 'date-states': 20, targets: 19, 'us-map-touch': 19,
  'register-story': 19, districts: 19, profiles: 17, 'people-tabs': 16, 'us-map-narrow': 16, 'sheet-pull': 13, 'stories-deeper': 13, 'settings-sheet': 12,
  'mode-switch': 11, 'council-votes': 10, 'explore-bubble': 71, 'tab-blue': 14 };
const HINT_TOGETHER = 0.45;   // a job of checks that share their pages takes about this share of their times added up (axe, text-overlap, no-bleed: 290 of 645)

const PASSES = {
  '': { label: '', env: {} },
  'light-bento': { label: 'light, Bento', env: { CHECK_MODE: 'light', CHECK_THEME: 'bento' } },
  'light-original': { label: 'light, Original', env: { CHECK_MODE: 'light', CHECK_THEME: 'original' } },
  spanish: { label: 'Spanish', env: { CHECK_LANG: 'es' } },
};

function defaultJobs() { return Math.max(1, Math.min(4, Math.floor(os.cpus().length / 2))); }
function jobCount(flag) { const n = parseInt(typeof flag === 'string' ? flag : process.env.CHECK_JOBS || '', 10); return n > 0 ? n : defaultJobs(); }
const clock = (s) => (s >= 60 ? `${Math.floor(s / 60)}m ${String(Math.round(s % 60)).padStart(2, '0')}s` : `${s.toFixed(1)}s`);
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const tagOf = (name, pass) => (PASSES[pass].label ? `${name} [${PASSES[pass].label}]` : name);

function readTimes() { try { return JSON.parse(fs.readFileSync(TIMES, 'utf8')); } catch (e) { return {}; } }
function writeTimes(t) { try { const tmp = `${TIMES}.${process.pid}`; fs.writeFileSync(tmp, JSON.stringify(t)); fs.renameSync(tmp, TIMES); } catch (e) { /* a missing history only changes the order */ } }
const hintOf = (job) => job.names.reduce((t, n) => t + (HINT[n] || 8), 0) * (job.names.length > 1 ? HINT_TOGETHER : 1);

/* the jobs, in report order: each pass's checks in the table's order, with the checks in TOGETHER joined into one job */
function jobsFor({ names, light = [], spanish = [] }) {
  const jobs = [];
  for (const [pass, ns] of [['', names], ['light-bento', light], ['light-original', light], ['spanish', spanish]]) {
    const taken = new Set();
    for (const n of ns) {
      if (taken.has(n)) continue;
      const group = TOGETHER.find((g) => g.includes(n));
      const members = group ? ns.filter((x) => group.includes(x)) : [n];
      const job = members.length > 1 ? members : [n];
      job.forEach((x) => taken.add(x));
      jobs.push({ names: job, pass, idx: jobs.length });
    }
  }
  return jobs;
}

function killTree(child) {
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true });
  else try { process.kill(-child.pid, 'SIGKILL'); } catch (e) { child.kill('SIGKILL'); }
}
const live = new Set();   // running jobs, stopped with this process (Ctrl+C), so no Chrome is left behind
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { live.forEach(killTree); process.exit(130); });

function runOnce(job) {
  return new Promise((resolve) => {
    const t0 = Date.now(), chunks = [];
    const child = spawn(process.execPath, [RUN, '--exact', job.names.join(',')], { cwd: ROOT, env: { ...process.env, ...PASSES[job.pass].env, CX_CHECK_CHILD: '1' }, windowsHide: true, detached: process.platform !== 'win32' });
    live.add(child);
    child.stdout.on('data', (d) => chunks.push(d)); child.stderr.on('data', (d) => chunks.push(d));
    const timer = setTimeout(() => { chunks.push(Buffer.from(`\nstopped: the job ran past ${JOB_LIMIT_MS / 60000} minutes\n`)); killTree(child); }, JOB_LIMIT_MS);
    child.on('error', (e) => chunks.push(Buffer.from(`could not start the check: ${e.message}\n`)));
    child.on('close', (code) => { clearTimeout(timer); live.delete(child); resolve({ code, out: Buffer.concat(chunks).toString('utf8'), wall: (Date.now() - t0) / 1000 }); });
  });
}

// what one job printed, as the report shows it: the checks' own lines, each result line labeled with the pass, and no summary line
function shape(job, r) {
  const lines = r.out.replace(/\r/g, '').split('\n');
  while (lines.length && (!lines[lines.length - 1].trim() || /^\d+ of \d+ checks passed\.$/.test(lines[lines.length - 1]))) lines.pop();
  const label = PASSES[job.pass].label, got = {};
  const res = job.names.map((n) => [n, new RegExp(`^(ok  |FAIL)  ${esc(n)}  \\(([\\d.]+)s\\)$`)]);
  const out = lines.map((l) => {
    for (const [n, re] of res) { const m = re.exec(l); if (m) { got[n] = { ok: m[1] === 'ok  ', secs: parseFloat(m[2]) }; return label ? `${m[1]}  ${n}  [${label}]  (${m[2]}s)` : l; } }
    return l;
  });
  return { got, out, complete: job.names.every((n) => got[n]) };
}

async function attempt(job) {
  let r = await runOnce(job), s = shape(job, r);
  if (!s.complete) {   // the process stopped before every check could report: run the job once more
    const why = (s.out.filter((l) => l.trim()).pop() || `exit code ${r.code}`).trim().slice(0, 120), first = s.out;
    r = await runOnce(job); s = shape(job, r);
    s.out = [`retry  ${job.names.map((n) => tagOf(n, job.pass)).join(', ')}  (the process stopped without every result: ${why})`, ...(s.complete ? [] : first), ...s.out];
  }
  const checks = job.names.map((n) => {
    if (s.got[n]) return { name: n, ok: s.got[n].ok, secs: s.got[n].secs };
    s.out.push(`FAIL  ${n}${PASSES[job.pass].label ? `  [${PASSES[job.pass].label}]` : ''}  (${r.wall.toFixed(1)}s)`, `        - the check did not report a result (exit code ${r.code})`);
    return { name: n, ok: false, secs: r.wall };
  });
  // a process that printed only passes but still exited with an error failed somewhere after them: that counts against the job
  if (r.code !== 0 && checks.every((c) => c.ok)) { checks[checks.length - 1].ok = false; s.out.push(`        - the process ended with exit code ${r.code} after its checks passed`); }
  return { checks, wall: r.wall, lines: s.out };
}

// split jobs into n parts of about equal time, the same way on every machine
function shardOf(jobs, k, n) {
  const bins = Array.from({ length: n }, () => ({ t: 0, jobs: [] }));
  [...jobs].sort((a, b) => hintOf(b) - hintOf(a) || a.idx - b.idx).forEach((j) => { const b = bins.reduce((m, x) => (x.t < m.t ? x : m), bins[0]); b.t += hintOf(j); b.jobs.push(j); });
  return bins[k - 1].jobs.sort((a, b) => a.idx - b.idx);
}

/* names: the default pass (in table order); light: names to run again in light mode in both styles; spanish: names to run again in
   Spanish; serial: names that run alone. Returns the exit code. */
async function run({ names, light = [], spanish = [], serial = [], jobs: jobsFlag, shard, report }) {
  const T0 = Date.now();
  let list = jobsFor({ names, light, spanish });
  if (shard) {
    const m = /^(\d+)\/(\d+)$/.exec(String(shard)); if (!m || +m[1] < 1 || +m[1] > +m[2]) { console.error(`--shard wants k/n, such as 2/3, not ${shard}`); return 2; }
    list = shardOf(list, +m[1], +m[2]);
    console.log(`Part ${m[1]} of ${m[2]}.`);
  }
  const n = jobCount(jobsFlag), past = readTimes();
  const weight = (j) => { const t = j.names.map((x) => past[`${j.pass}|${x}`]); return t.every((x) => x > 0) ? t.reduce((a, b) => a + b, 0) : hintOf(j); };
  const together = list.filter((j) => !j.names.some((x) => serial.includes(x))), alone = list.filter((j) => j.names.some((x) => serial.includes(x)));
  const count = list.reduce((t, j) => t + j.names.length, 0);
  console.log(`Running ${count} check${count === 1 ? '' : 's'}, ${Math.min(n, together.length || 1)} at a time${alone.length ? `, then ${alone.length} alone (${alone.map((j) => j.names.map((x) => tagOf(x, j.pass)).join(', ')).join('; ')})` : ''}.` +
    `${light.length ? ` Light mode in Bento and Original: ${light.join(', ')}.` : ''}${spanish.length ? ` Spanish: ${spanish.join(', ')}.` : ''}`);

  const results = new Array(list.length), pos = new Map(list.map((j, i) => [j, i]));
  let printed = 0, finished = 0;
  const flush = () => { while (printed < list.length && results[printed]) { results[printed].lines.forEach((l) => console.log(l)); printed++; } };
  // the longest jobs start first, so the report in the table's order can wait minutes for its first line: a short note on stderr as each job
  // ends (CHECK_PROGRESS=0 turns it off); the report itself, on stdout, is the same whatever the order
  const finish = (j, r) => {
    results[pos.get(j)] = r; finished++;
    if (process.env.CHECK_PROGRESS !== '0') process.stderr.write(`  ... ${finished} of ${list.length} done: ${j.names.map((x) => tagOf(x, j.pass)).join(', ')} ${r.checks.every((c) => c.ok) ? 'passed' : 'FAILED'} (${clock(r.wall)})\n`);
    flush();
  };

  const queue = together.slice().sort((a, b) => weight(b) - weight(a) || a.idx - b.idx);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(n, queue.length) }, async () => { while (next < queue.length) { const j = queue[next++]; finish(j, await attempt(j)); } }));
  for (const j of alone) finish(j, await attempt(j));
  flush();

  const wall = (Date.now() - T0) / 1000;
  const all = list.flatMap((j, i) => results[i].checks.map((c) => ({ ...c, pass: j.pass, tag: tagOf(c.name, j.pass), lines: results[i].lines })));
  const failed = all.filter((c) => !c.ok);
  const sum = all.reduce((t, c) => t + c.secs, 0), jobWall = results.reduce((t, r) => t + r.wall, 0);
  const t = readTimes(); all.forEach((c) => { t[`${c.pass}|${c.name}`] = Math.round(c.secs * 10) / 10; }); writeTimes(t);
  const slow = all.slice().sort((a, b) => b.secs - a.secs).slice(0, 10);
  const why = (c) => { const i = c.lines.findIndex((l) => new RegExp(`^FAIL  ${esc(c.name)}  `).test(l)); const out = []; for (let k = i + 1; k > 0 && k < c.lines.length && /^\s+- /.test(c.lines[k]); k++) out.push(c.lines[k]); return out; };
  console.log(`\nSlowest checks (this run took ${clock(wall)} on the clock, ${n} at a time; the checks took ${clock(sum)} added up, and starting and stopping their browsers ${clock(Math.max(0, jobWall - sum))}):`);
  slow.forEach((c) => console.log(`  ${c.secs.toFixed(1).padStart(6)}s  ${c.tag}`));
  if (failed.length) console.log(`\nFailed: ${failed.map((c) => c.tag).join(', ')}`);
  if (report) fs.writeFileSync(report, JSON.stringify({ passed: all.length - failed.length, total: all.length, wallSeconds: Math.round(wall), jobs: n, shard: shard || null,
    failed: failed.map((c) => ({ check: c.name, pass: PASSES[c.pass].label || 'default', lines: why(c).slice(0, 8).map((l) => l.replace(/^\s+- /, '').slice(0, 300)) })),
    times: all.map((c) => ({ check: c.name, pass: PASSES[c.pass].label || 'default', seconds: c.secs, ok: c.ok })),
    jobs_run: list.map((j, i) => ({ checks: j.names, pass: PASSES[j.pass].label || 'default', wallSeconds: Math.round(results[i].wall * 10) / 10 })) }, null, 1) + '\n');
  if (process.env.GITHUB_STEP_SUMMARY) {
    const md = [`### Browser checks${shard ? ` (part ${shard})` : ''}: ${all.length - failed.length} of ${all.length} passed in ${clock(wall)}`, ''];
    if (failed.length) { md.push('Failed:', ''); failed.forEach((c) => { md.push(`- **${c.tag}**`); why(c).slice(0, 5).forEach((l) => md.push(`  - ${l.replace(/^\s+- /, '').slice(0, 300)}`)); }); md.push(''); }
    md.push('Slowest:', '', '| check | seconds |', '| --- | --- |', ...slow.map((c) => `| ${c.tag} | ${c.secs.toFixed(1)} |`), '');
    try { fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md.join('\n') + '\n'); } catch (e) { /* the summary is a courtesy */ }
  }
  console.log(`\n${all.length - failed.length} of ${all.length} checks passed.`);
  return failed.length ? 1 : 0;
}

module.exports = { run, jobCount, defaultJobs, jobsFor, shardOf, PASSES };
