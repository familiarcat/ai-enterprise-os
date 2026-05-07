#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# scripts/lounge/crew-roll-call.sh — Sovereign Factory Observation Lounge Roll Call
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "🚀 Activating Sovereign Factory Command Stack..."

# 1. Seed Architecture
bash "$ROOT/scripts/seed-architecture.sh"

# 2. Execute Roll Call via Orchestrator
echo "📡 Initiating Observation Lounge Roll Call..."
node -e "
  const { conductRollCall } = require('./core/orchestrator');
  conductRollCall().then(res => { console.log(JSON.stringify(res, null, 2)); process.exit(res.status === 'SUCCESS' ? 0 : 1); });
"