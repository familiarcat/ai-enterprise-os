#!/usr/bin/env bash
# Phase R4: Monorepo Initialization | Assigned: Geordi La Forge
set -euo pipefail

echo "⚙️ La Forge: Aligning monorepo warp field (pnpm + turbo)..."
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# 1. pnpm-workspace.yaml
cat > "$ROOT_DIR/pnpm-workspace.yaml" <<EOF
packages:
  - 'apps/*'
  - 'packages/*'
  - 'domains/*'
  - 'core'

shared-workspace-lockfile: true
EOF

# 1. turbo.json
cat > "$ROOT_DIR/turbo.json" <<EOF
{
  "\$schema": "https://turbo.build/schema.json",
  "globalDependencies": [".env"],
  "pipeline": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**", ".next/**", "out/**", "build/**"] },
    "dev": { "cache": false, "persistent": true },
    "test": { "dependsOn": ["build"], "outputs": ["coverage/**"] },
    "lint": { "outputs": [] }
  }
}
EOF

# 2. .npmrc
cat > "$ROOT_DIR/.npmrc" <<EOF
shamefully-hoist=true
strict-peer-dependencies=false
resolution-mode=highest
prefer-workspace-packages=true
EOF

mkdir -p "$ROOT_DIR/apps" "$ROOT_DIR/packages" "$ROOT_DIR/domains" "$ROOT_DIR/lib"

# 3. Update root package.json workspaces and scripts
node -e "
const fs = require('fs');
const p = JSON.parse(fs.readFileSync('$ROOT_DIR/package.json', 'utf8'));
p.workspaces = ['apps/*', 'packages/*', 'domains/*', 'core'];
p.scripts = {
  ...p.scripts,
  'build': 'turbo build',
  'dev': 'turbo dev --parallel',
  'test': 'turbo test',
  'lint': 'turbo lint'
};
fs.writeFileSync('$ROOT_DIR/package.json', JSON.stringify(p, null, 2));
"

echo "Monorepo infrastructure synchronized."