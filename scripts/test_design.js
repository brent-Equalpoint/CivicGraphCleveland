#!/usr/bin/env node
/* Tests for the design system: the CSS is on the tokens (scripts/design/audit.js) and docs/design-system.md matches design/tokens.json
   (scripts/design/doc.js --check). No network, no browser. The look of the built screens is the design-look browser check. */
const { spawnSync } = require('child_process');
const path = require('path');
let bad = 0;
for (const [name, args] of [['audit', ['scripts/design/audit.js']], ['doc', ['scripts/design/doc.js', '--check']]]) {
  const r = spawnSync(process.execPath, args, { cwd: path.join(__dirname, '..'), encoding: 'utf8' });
  console.log(`${r.status === 0 ? 'ok  ' : 'FAIL'} design ${name}: ${(r.stdout + r.stderr).trim().split('\n').slice(-3).join(' | ')}`);
  if (r.status !== 0) bad++;
}
process.exit(bad ? 1 : 0);
