#!/usr/bin/env bash
# p3-run-all.sh — Phase 3: n8n + CrewAI Full Automation (all steps)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/crew-fail.sh"

FROM_STEP="${2:-s1}"
step_header "PHASE 3" "n8n + CrewAI Automation — All Steps"
echo "  Steps: p3-s1 n8n-start → s2 crew-webhook-map → s3 socketio-verify"
echo "         → s4 cost-routing-test → s5 baritalia-e2e"
echo "  ⚠  Step 5 makes real LLM API calls. Ensure OPENROUTER_API_KEY is set."
echo ""

STEPS=(
  "s1:p3-s1-n8n-start.sh"
  "s2:p3-s2-crew-webhook-map.sh"
  "s3:p3-s3-socketio-verify.sh"
  "s4:p3-s4-cost-routing-test.sh"
  "s5:p3-s5-baritalia-e2e.sh"
)

SKIP=true; [[ "$FROM_STEP" == "s1" ]] && SKIP=false
for entry in "${STEPS[@]}"; do
  KEY="${entry%%:*}"; FILE="${entry##*:}"
  if [[ "$SKIP" == true && "$KEY" != "$FROM_STEP" ]]; then echo "  ⤳ Skipping $KEY"; continue; fi
  SKIP=false
  bash "$SCRIPT_DIR/$FILE"
done

echo ""
echo -e "\033[1;32m╔══════════════════════════════════════════════════════════════╗\033[0m"
echo -e "\033[1;32m║   PHASE 3 COMPLETE — Full crew automation validated           ║\033[0m"
echo -e "\033[1;32m║   Next: ./scripts/p4-run-all.sh                              ║\033[0m"
echo -e "\033[1;32m╚══════════════════════════════════════════════════════════════╝\033[0m"
