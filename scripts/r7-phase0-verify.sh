#!/bin/bash
# Phase R7: Verification | Assigned: Tasha Yar
echo "🛡️ Tasha: Running final combat diagnostics (Phase 0)..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

if [ -f "$ROOT_DIR/scripts/p0-run-all.sh" ]; then
    bash "$ROOT_DIR/scripts/p0-run-all.sh"
else
    echo "⚠️ Phase 0 script not found. Manual verification required."
    exit 1
fi
echo "System diagnostics complete."