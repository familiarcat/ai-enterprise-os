#!/usr/bin/env bash
# p4-run-all.sh — Phase 4: Production Deploy (all steps)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/crew-fail.sh"

FROM_STEP="${2:-s1}"
step_header "PHASE 4" "Production Deploy — All Steps"
echo "  Steps: p4-s1 docker-build → s2 terraform-plan → s3 vercel-deploy"
echo "         → s4 aws-deploy → s5 vsce-publish"
echo ""
echo "  ⚠  Steps s3, s4, s5 require confirmation env vars:"
echo "     DEPLOY_TO_PRODUCTION=true  (s3)"
echo "     SOVEREIGN_CONFIRM_AWS_DEPLOY=yes  (s4)"
echo "     SOVEREIGN_CONFIRM_PUBLISH=yes  (s5)"
echo ""

STEPS=(
  "s1:p4-s1-docker-build.sh"
  "s2:p4-s2-terraform-plan.sh"
  "s3:p4-s3-vercel-deploy.sh"
  "s4:p4-s4-aws-deploy.sh"
  "s5:p4-s5-vsce-publish.sh"
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
echo -e "\033[1;32m║   PHASE 4 COMPLETE — Platform deployed to production          ║\033[0m"
echo -e "\033[1;32m║   Extension live on VS Code Marketplace                       ║\033[0m"
echo -e "\033[1;32m╚══════════════════════════════════════════════════════════════╝\033[0m"
