#!/bin/zsh
# phase-01-foundation.sh - Establishes monorepo backbone
set -e

echo "🚀 Phase 1: Establishing Monorepo Foundation..."

# 1. Enforce Master Backbone
chmod +x ./automate_structure.sh
./automate_structure.sh . master SovereignMaster

# 2. Initialize App Containers for Migration
mkdir -p apps/dashboard apps/vscode apps/api

# 3. Align pnpm-workspace.yaml
cat <<EOF > pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'domains/*'
  - 'packages/*'
  - 'core'
EOF

# 4. Update Root package.json for Turborepo / 2026 Standards
node -e "
const pkg = require('./package.json');
pkg.name = 'ai-enterprise-os-root';
pkg.workspaces = ['apps/*', 'packages/*', 'domains/*', 'core'];
pkg.devDependencies = {
  ...pkg.devDependencies,
  'turbo': '^1.10.0'
};
require('fs').writeFileSync('./package.json', JSON.stringify(pkg, null, 2));
"

# 5. Finalize Workspace
pnpm install

echo "✅ Phase 1 Complete: Monorepo foundation established."