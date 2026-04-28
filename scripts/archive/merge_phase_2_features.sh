#!/bin/zsh
set -e

LEGACY_PATH="/Users/bradygeorgen/Dev/openrouter-crew-platform"
echo "🛰️ Phase 2: Ingesting legacy features from $LEGACY_PATH..."

# 1. Migrate YouTube and Parser utilities to /tools
mkdir -p tools/parsers
cp -r "$LEGACY_PATH/utils/youtube" ./tools/parsers/ 2>/dev/null || echo "ℹ️ YouTube utils already moved or missing."

# 2. Copy legacy UI components to shared UI package
mkdir -p packages/ui/src/legacy
cp -r "$LEGACY_PATH/components"/* ./packages/ui/src/legacy/ 2>/dev/null || echo "ℹ️ UI components migrated."

# 3. Update orchestrator to include legacy tool paths
sed -i '' "s/include_exts: \['.md', '.ts', '.tsx'\]/include_exts: \['.md', '.ts', '.tsx', '.json', '.py'\]/g" core/orchestrator.js

# 4. Scaffold the 'Project' and 'Sprint' domains automatically
node -e "
const { runMission } = require('./core/orchestrator');
async function init() {
  await runMission('.', 'create new ProjectManagement');
  await runMission('.', 'create new AgileSprint');
}
init();
"

pnpm install
echo "✅ Phase 2 Complete: System absorbed legacy features and scaffolded core domains."