#!/bin/zsh
set -e

echo "🚀 Phase 1: Aligning Backbone and Credentials..."

# 1. Run the credential setup to ensure local/cloud sync
chmod +x ./scripts/setup_credentials.sh
./scripts/setup_credentials.sh

# 2. Enforce the Master backbone structure
chmod +x ./automate_structure.sh
./automate_structure.sh . master SovereignMaster

# 3. Create the Dashboard Application backbone
mkdir -p apps/dashboard
./automate_structure.sh ./apps/dashboard dashboard Dashboard

# 4. Initialize pnpm workspace if missing
if [ ! -f pnpm-workspace.yaml ]; then
  cat <<EOF > pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'domains/*'
  - 'packages/*'
  - 'core'
EOF
fi

# 5. Install MCP and Workspace dependencies
pnpm add @modelcontextprotocol/sdk @sovereign/ui @sovereign/shared -w
pnpm install

echo "✅ Phase 1 Complete: Workspace is ready for feature absorption."