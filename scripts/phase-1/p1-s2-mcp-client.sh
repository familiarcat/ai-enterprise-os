#!/usr/bin/env bash
# Phase 1, Step 2: MCP Client Implementation | Assigned: Commander Data
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
source "$ROOT/scripts/lib/crew-fail.sh"

STEP="p1-s2-mcp-client"
step_header "PHASE 1" "Step 2: MCPClient Service"

TARGET="$ROOT/apps/vscode/src/services/MCPClient.ts"
SOURCE="$ROOT/scripts/MCPClient.ts"

if [[ -f "$SOURCE" ]]; then
    mkdir -p "$(dirname "$TARGET")"
    cp "$SOURCE" "$TARGET"
    echo "  ✔ MCPClient.ts ported to apps/vscode/src/services/"
else
    crew_fail --step "$STEP" --persona "commander_data" --tool "run_factory_mission" \
      --tool-args '{"project": "ai-enterprise-os", "objective": "Create scripts/MCPClient.ts"}' \
      --error "Source file scripts/MCPClient.ts missing."
fi

phase_pass "$STEP"