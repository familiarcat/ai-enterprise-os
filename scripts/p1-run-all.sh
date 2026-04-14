#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# p1-run-all.sh — Phase 1: VSCode Extension MVP (all steps)
# Usage: ./scripts/p1-run-all.sh [--from s3]
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/crew-fail.sh"

FROM_STEP="${2:-s1}"
step_header "PHASE 1" "VSCode Extension MVP — All Steps"
echo "  Steps: p1-s1 vscode-bootstrap → s2 mcp-client → s3 webview-port"
echo "         → s4 ext-commands → s5 vsce-package"
echo ""

STEPS=(
  "s1:p1-s1-vscode-bootstrap.sh"
  "s2:p1-s2-mcp-client.sh"
  "s3:p1-s3-webview-port.sh"
  "s4:p1-s4-ext-commands.sh"
  "s5:p1-s5-vsce-package.sh"
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
echo -e "\033[1;32m║   PHASE 1 COMPLETE — VSCode Extension packaged               ║\033[0m"
echo -e "\033[1;32m║   Next: ./scripts/p2-run-all.sh                              ║\033[0m"
echo -e "\033[1;32m╚══════════════════════════════════════════════════════════════╝\033[0m"
