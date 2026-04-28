#!/usr/bin/env bash
# fix-obrien-vscode-build.sh | Assigned: Miles O'Brien
# Purpose: Externalizes 'vscode' in esbuild to prevent runtime 'module not found' errors.

set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo "⚙️ O'Brien: Patching esbuild configuration..."
PKG_PATH="$ROOT/apps/vscode/package.json"

node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('$PKG_PATH', 'utf8'));
const fix = (s) => s.includes('--external:vscode') && !s.includes('--external:node:*') 
    ? s.replace('--external:vscode', '--external:vscode --external:node:*') 
    : s;
if (pkg.scripts) {
  pkg.scripts.build = fix(pkg.scripts.build || '');
  pkg.scripts.dev = fix(pkg.scripts.dev || '');
  fs.writeFileSync('$PKG_PATH', JSON.stringify(pkg, null, 2));
  console.log('✅ Patched build/dev scripts in package.json');
}"

echo "🏗️ Rebuilding extension..."
cd "$ROOT/apps/vscode" && pnpm run build

if node -e "const e = require('./dist/extension.js'); if(typeof e.activate !== 'function') throw 'fail'" 2>/dev/null; then
    echo "✓ Extension exports activate() correctly. Running packaging..."
    bash "$ROOT/scripts/p1-s5-vsce-package.sh"
else
    echo "❌ Build verification failed." && exit 1
fi