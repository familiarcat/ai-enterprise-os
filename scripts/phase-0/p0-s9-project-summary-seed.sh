#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# p0-s9-project-summary-seed.sh — Aggregate and seed Project Master Summary
# Assigned: Commander Data (Architect)
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
source "$ROOT/scripts/lounge/crew-observe.sh"

STEP="p0-s9-project-summary-seed"
step_header "PHASE 0 — CONVERGENCE" "Step 9: Project Master Summary Seeding"

echo "🖖 Commander Data: Aggregating project DNA..."

# 1. Capture current system state and evolution
RAW_DATA=$(node -e "
  const { sensorSweep, analyzeEvolution } = require('./core/orchestrator');
  const path = require('path');
  async function aggregate() {
    const sweep = await sensorSweep();
    const evolution = await analyzeEvolution(path.resolve('./versions'), './');
    console.log(JSON.stringify({ sweep, evolution }));
  }
  aggregate().catch(e => { console.error(e); process.exit(1); });
")

# 2. Seeding the Master Summary as an Architectural Observation
crew_observe \
  --member "Commander Data" \
  --category "architecture" \
  --role "Second Officer, Architect" \
  --title "Project Master Summary — $(date +%Y-%m-%d)" \
  --summary "A unified structural and evolutionary blueprint of the Sovereign Factory." \
  --finding "System Status: $(echo "$RAW_DATA" | node -e "console.log(JSON.parse(require('fs').readFileSync(0)).sweep.status)")" \
  --finding "Evolutionary History: $(echo "$RAW_DATA" | node -e "const d=JSON.parse(require('fs').readFileSync(0)); console.log(d.evolution.substring(0, 500) + '...')")" \
  --conclusion "The system is structurally sound and aware of its version history." \
  --recommend "All agents should refer to this summary to ensure architectural alignment with v11 protocols." \
  --tags "master-summary,architecture,evolution,dna"

phase_pass "$STEP"