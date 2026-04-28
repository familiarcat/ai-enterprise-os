#!/usr/bin/env bash
# orchestrator.sh | Assigned: Captain Picard
# Unified entry point for the Sovereign Factory Engine.

set -e
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

PHASE="${1:-}"

case "$PHASE" in
    --phase-0)
        if [ -d "$ROOT/scripts/phase-0" ]; then
            bash "$ROOT/scripts/phase-0/p0-run-all.sh"
        else
            echo "⚠️ Phase 0 directory not found. Did you run --reorganize yet?"
            # Fallback to current root scripts if they haven't been moved yet
            [ -f "$ROOT/scripts/p0-run-all.sh" ] && bash "$ROOT/scripts/p0-run-all.sh"
        fi
        ;;
    --phase-1)
        TARGET_DIR="$ROOT/scripts/phase-1"
        [[ -d "$TARGET_DIR" ]] || TARGET_DIR="$ROOT/scripts"
        RUNNER="$TARGET_DIR/p1-run-all.sh"
        if [ -f "$RUNNER" ]; then bash "$RUNNER";
        else echo "❌ Error: Phase 1 runner not found at $RUNNER"; exit 1; fi
        ;;
    --phase-2)
        if [ -d "$ROOT/scripts/phase-2" ]; then
            bash "$ROOT/scripts/phase-2/p2-run-all.sh"
        else
            echo "⚠️ Phase 2 directory not found. Did you run --reorganize yet?"
            [ -f "$ROOT/scripts/p2-run-all.sh" ] && bash "$ROOT/scripts/p2-run-all.sh"
        fi
        ;;
    --repair)
        echo "🛠️ Initiating repair sequence..."
        bash "$ROOT/scripts/recovery/fix-crusher-supabase-key.sh"
        bash "$ROOT/scripts/recovery/fix-obrien-vscode-build.sh"
        ;;
    --strategy)
        echo "🖖 Initiating strategic implementation..."
        TARGET_DIR="$ROOT/scripts/strategy"
        mkdir -p "$TARGET_DIR"
        
        RUN_S() { [[ -f "$TARGET_DIR/$1" ]] && bash "$TARGET_DIR/$1" || echo "⚠️  $1 missing"; }

        RUN_S "discussion.sh"
        RUN_S "infra-setup.sh"
        RUN_S "mcp-security-audit.sh"
        RUN_S "validate-scaffolding.sh"
        ;;
    --reorganize)
        bash "$ROOT/scripts/recovery/reorganize-ddd-real.sh"
        ;;
    *)
        echo "Usage: ./scripts/orchestrator.sh [--phase-0 | --phase-1 | --phase-2 | --repair | --reorganize]"
        exit 1
        ;;
esac