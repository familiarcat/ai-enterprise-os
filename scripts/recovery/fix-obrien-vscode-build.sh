#!/usr/bin/env bash
# fix-obrien-vscode-build.sh | Assigned: Miles O'Brien
# Purpose: Proxy to the root fix script to maintain orchestrator isolation.

set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

if [[ -f "$ROOT/scripts/fix-obrien-vscode-build.sh" ]]; then
    bash "$ROOT/scripts/fix-obrien-vscode-build.sh"
else
    echo "❌ Error: Root fix-obrien-vscode-build.sh not found." && exit 1
fi