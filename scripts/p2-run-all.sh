#!/usr/bin/env bash
# p2-run-all.sh — Phase 2: Monorepo Merge (all steps)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/crew-fail.sh"

FROM_STEP="${2:-s1}"
step_header "PHASE 2" "Monorepo Merge — All Steps"
echo "  Steps: p2-s1 clone-platform → s2 pkg-orchestrator → s3 pkg-mcp-bridge"
echo "         → s4 pkg-crew-personas → s5 turbo-pipeline"
echo ""

STEPS=(
  "s1:p2-s1-clone-platform.sh"
  "s2:p2-s2-pkg-orchestrator.sh"
  "s3:p2-s3-pkg-mcp-bridge.sh"
  "s4:p2-s4-pkg-crew-personas.sh"
  "s5:p2-s5-turbo-pipeline.sh"
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
echo -e "\033[1;32m║   PHASE 2 COMPLETE — Monorepo packages extracted             ║\033[0m"
echo -e "\033[1;32m║   Next: ./scripts/p3-run-all.sh                              ║\033[0m"
echo -e "\033[1;32m╚══════════════════════════════════════════════════════════════╝\033[0m"
