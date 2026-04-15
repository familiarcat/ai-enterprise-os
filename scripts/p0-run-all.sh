#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# p0-run-all.sh — Phase 0: Convergence & Validation (all steps)
#
# Runs all Phase 0 steps in sequence. Any step failure stops the phase and
# emits a crew-dispatched Claude prompt.
# Usage:
#   ./scripts/p0-run-all.sh              # run all steps
#   ./scripts/p0-run-all.sh --from s3   # resume from step 3
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/crew-fail.sh"

FROM_STEP="${2:-s0}"

step_header "PHASE 0" "Convergence & Validation — All Steps"
echo "  Steps: p0-s0 secrets-sync → s1 env-check → s2 redis-ping → s3 supabase-check"
echo "         → s4 bridge-start → s5 dashboard-wire → s6 smoke-test"
echo ""

STEPS=(
  "s0:p0-s0-secrets-sync.sh"
  "s1:p0-s1-env-check.sh"
  "s2:p0-s2-redis-ping.sh"
  "s3:p0-s3-supabase-check.sh"
  "s4:p0-s4-bridge-start.sh"
  "s5:p0-s5-dashboard-wire.sh"
  "s6:p0-s6-smoke-test.sh"
)

SKIP=true
[[ "$FROM_STEP" == "s0" ]] && SKIP=false

for entry in "${STEPS[@]}"; do
  KEY="${entry%%:*}"
  FILE="${entry##*:}"
  if [[ "$SKIP" == true && "$KEY" != "$FROM_STEP" ]]; then
    echo "  ⤳ Skipping $KEY (--from $FROM_STEP)"
    continue
  fi
  SKIP=false
  bash "$SCRIPT_DIR/$FILE"
done

echo ""
echo -e "\033[1;32m╔══════════════════════════════════════════════════════════════╗\033[0m"
echo -e "\033[1;32m║   PHASE 0 COMPLETE — Ready to proceed to Phase 1             ║\033[0m"
echo -e "\033[1;32m║   Next: ./scripts/p1-run-all.sh                              ║\033[0m"
echo -e "\033[1;32m╚══════════════════════════════════════════════════════════════╝\033[0m"
echo ""
