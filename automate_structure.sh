#!/bin/bash
set -e

# Universal Backbone Script
# Acts as a CLI proxy for orchestrator.enforceBackboneStructure

PROJECT_ROOT="/Users/bradygeorgen/Dev/ai-enterprise-os"
TARGET_PATH="${1:-$PROJECT_ROOT}"
TYPE="${2:-master}"
NAME="${3:-SovereignMaster}"

cd "$PROJECT_ROOT"

echo "🚀 Enforcing Sovereign Backbone on: $TARGET_PATH ($TYPE)"

# Call the Node.js orchestrator method directly
node -e "
const { enforceBackboneStructure } = require('./core/orchestrator');
enforceBackboneStructure('$TARGET_PATH', '$TYPE', '$NAME')
  .then(() => console.log('✅ Backbone enforcement successful.'))
  .catch(err => { console.error('❌ Failed:', err); process.exit(1); });
"

if [ "$TYPE" == "master" ]; then
    echo "🧹 Synchronizing pnpm workspace..."
    rm -rf node_modules pnpm-lock.yaml
    pnpm install
fi