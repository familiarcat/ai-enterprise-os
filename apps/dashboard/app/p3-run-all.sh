#!/usr/bin/env bash
# p3-run-all.sh | Assigned: Commander Riker
# Purpose: Orchestrates all Phase 3 Dashboard Refinement steps.

set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
source "$ROOT/scripts/lib/crew-fail.sh"

step_header "PHASE 3" "Dashboard Refinement"

"$ROOT/scripts/phase-3/p3-s1-modal-docs.sh"
"$ROOT/scripts/phase-3/p3-s2-dynamic-fleet.sh"
"$ROOT/scripts/phase-3/p3-s3-cost-monitor.sh"
"$ROOT/scripts/phase-3/p3-s4-sprint-nav.sh"

phase_pass "PHASE 3"

echo "✅ Phase 3 Dashboard Refinement complete. The UI is now more intuitive and informative."