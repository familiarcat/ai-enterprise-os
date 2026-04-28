#!/usr/bin/env bash
# Phase 1, Step 4b: Command Implementation | Assigned: Commander Riker
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
source "$SCRIPT_DIR/lib/crew-fail.sh"

STEP="p1-s4b-ext-run-mission"

TARGET="$ROOT/apps/vscode/src/commands/runMission.ts"
SOURCE="$ROOT/scripts/runMission.ts"

if [[ -f "$SOURCE" ]]; then
    mkdir -p "$(dirname "$TARGET")"
    cp "$SOURCE" "$TARGET"
    echo "  ✔ runMission.ts ported to apps/vscode/src/commands/"
else
    crew_fail --step "$STEP" --persona "commander_riker" --tool "run_factory_mission" \
      --tool-args '{"project": "ai-enterprise-os", "objective": "Create scripts/runMission.ts"}' \
      --error "Source file scripts/runMission.ts missing."
fi

phase_pass "$STEP"