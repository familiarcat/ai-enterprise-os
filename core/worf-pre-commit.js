#!/usr/bin/env node
const { spawnSync: ss } = require('child_process');
const p = require('path');
const f = require('fs');
const op = p.resolve(__dirname, './orchestrator.js');
if (!f.existsSync(op)) process.exit(1);
const { worfSecurityScan: wss } = require(op);

const g = ss('git', ['diff', '--cached', '--name-only', '--diff-filter=ACM']);
if (g.error || g.status !== 0) {
  console.error('Worf: Failed to retrieve staged files.');
  process.exit(1);
}
const files = g.stdout.toString().trim().split('\n').filter(Boolean);
if (!files.length) process.exit(0);
console.log(`Worf: Scanning ${files.length} staged files...`);
const v = wss(files, p.resolve(__dirname, '../'));
if (v.length) {
  console.error('\nFAIL: Security violations detected.\n');
  v.forEach(i => console.error(`  ❌ ${i.file}: ${i.pattern}`));
  process.exit(1);
}
console.log('Honour preserved.');
process.exit(0);