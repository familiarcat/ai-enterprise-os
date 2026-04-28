#!/bin/bash
###############################################################################
# SOVEREIGN FACTORY: Master Remediation Orchestrator
# Coordinator: Captain Picard
# Purpose: Executes phases r0-r7 to secure and structuralize the repo.
###############################################################################

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REMEDIATION_DIR="$SCRIPT_DIR/remediation"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

DRY_RUN=false
PHASE_ONLY=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run) DRY_RUN=true; shift ;;
    --phase-only) PHASE_ONLY="$2"; shift 2 ;;
    *) shift ;;
  esac
done

echo "🚀 Starting Sovereign Factory Remediation..."
mkdir -p "$REMEDIATION_DIR"
cd "$ROOT_DIR"

run_phase() {
    local phase=$1
    local script=$(find "$REMEDIATION_DIR" -name "r$phase-*.sh" | head -n 1)
    
    if [[ -n "$PHASE_ONLY" && "$PHASE_ONLY" != "$phase" ]]; then
        return
    fi

    echo "----------------------------------------------------------"
    echo "Executing Phase R$phase..."
    
    if [ "$DRY_RUN" = true ]; then
        echo "[DRY RUN] Would execute: ${script:-MISSING}"
    else
        if [[ -n "$script" && -f "$script" ]]; then
            bash "$script"
        else
            echo "⚠️  Warning: No script found for Phase R$phase"
        fi
    fi
}

# Sequence R0 - R7
run_phase 0 || echo "Phase 0 Warning: Potential leaks found."
run_phase 1
run_phase 2
run_phase 3
run_phase 4
run_phase 5
run_phase 6
run_phase 7

echo "----------------------------------------------------------"
echo "✅ Remediation sequence complete."
if [ "$DRY_RUN" = false ]; then
    echo "Next steps: git add . && git commit -m 'Apply crew remediation'"
fi