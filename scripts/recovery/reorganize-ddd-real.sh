#!/usr/bin/env bash
# reorganize-ddd-real.sh | Assigned: Commander Data
# Purpose: Proxy to the root reorganization script.

set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
S_DIR="$ROOT/scripts"

if [[ -f "$S_DIR/reorganize-ddd-real.sh" ]]; then
    bash "$S_DIR/reorganize-ddd-real.sh"
elif [[ -f "$S_DIR/archive/reorganize-ddd-real.sh" ]]; then
    bash "$S_DIR/archive/reorganize-ddd-real.sh"
else
    echo "❌ Error: Root reorganize-ddd-real.sh not found." && exit 1
fi