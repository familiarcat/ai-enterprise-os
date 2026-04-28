#!/usr/bin/env bash
# fix-crusher-supabase-key.sh | Assigned: Dr. Beverly Crusher
# Purpose: Proxy to the root fix script to maintain orchestrator isolation.

set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

if [[ -f "$ROOT/scripts/fix-crusher-supabase-key.sh" ]]; then
    bash "$ROOT/scripts/fix-crusher-supabase-key.sh"
else
    echo "❌ Error: Root fix-crusher-supabase-key.sh not found." && exit 1
fi