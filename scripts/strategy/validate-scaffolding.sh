#!/bin/bash
# validate-scaffolding.sh | Assigned: Tasha Yar
# Purpose: Initiates combat diagnostics on generated domains.

echo "🛡️ Tasha Yar: Initiating combat diagnostics on generated domains..."
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

# Run a sample mission to generate a domain
echo "  ▶ Generating BarItalia domain..."
node -e "const { runMission } = require('./core/orchestrator'); runMission('.', 'create new BarItalia').then(() => process.exit(0)).catch(() => process.exit(1))"

# Test the generated domain
echo "  ▶ Executing vitest suite..."
cd "$ROOT" && pnpm test --filter "@domains/baritalia"