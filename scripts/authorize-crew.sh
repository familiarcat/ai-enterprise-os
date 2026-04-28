#!/usr/bin/env bash
# authorize-crew.sh | Assigned: Lt. Worf
# Purpose: Enforces execution permissions and security masks across the Engine.

set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "⚔️ Worf: Enforcing security protocols and script authorizations..."

# 1. Grant execution to all shell scripts in the hierarchy
find "$ROOT/scripts" -name "*.sh" -exec chmod +x {} +

# 2. Grant execution to the root orchestrators
[ -f "$ROOT/scripts/orchestrator.sh" ] && chmod +x "$ROOT/scripts/orchestrator.sh"
[ -f "$ROOT/scripts/remediate-all.sh" ] && chmod +x "$ROOT/scripts/remediate-all.sh"

# 3. Secure sensitive files
if [ -f "$ROOT/.env" ]; then
    chmod 600 "$ROOT/.env"
    echo "  ✔ .env secured (mode 600)"
fi

if [ -f "$HOME/.zshrc" ]; then
    chmod 600 "$HOME/.zshrc"
    echo "  ✔ ~/.zshrc secured (mode 600)"
fi

echo "✅ All crew members authorized. Systems ready for engagement."