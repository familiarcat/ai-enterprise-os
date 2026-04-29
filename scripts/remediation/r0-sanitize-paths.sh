#!/usr/bin/env bash
###############################################################################
# r0-sanitize-paths.sh — Remediation Phase 0
# Purpose: Programmatically replace absolute paths with dynamic variables
# Assigned crew: Lt. Worf (Security), Geordi La Forge (Engineering)
###############################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "🛡️ Lt. Worf: Initiating path sanitization protocol..."

# 1. Sanitize Root setup_credentials.sh
ROOT_SETUP="$ROOT/setup_credentials.sh"
if [ -f "$ROOT_SETUP" ]; then
    echo -e "${BLUE}→${NC} Sanitizing root setup_credentials.sh..."
    sed 's|ZSHRC="/Users/bradygeorgen/.zshrc"|ZSHRC="$HOME/.zshrc"|g' "$ROOT_SETUP" > "$ROOT_SETUP.tmp"
    sed 's|PROJECT_PATH="/Users/bradygeorgen/Dev/ai-enterprise-os"|PROJECT_PATH="$(cd "$(dirname "$0")" \&\& pwd)"|g' "$ROOT_SETUP.tmp" > "$ROOT_SETUP"
    rm "$ROOT_SETUP.tmp"
    echo "✅ Root setup script sanitized."
fi

# 2. Sanitize apps/api/setup_credentials.sh
API_SETUP="$ROOT/apps/api/setup_credentials.sh"
if [ -f "$API_SETUP" ]; then
    echo -e "${BLUE}→${NC} Sanitizing apps/api/setup_credentials.sh..."
    sed 's|PROJECT_PATH="/Users/bradygeorgen/Dev/ai-enterprise-os"|PROJECT_PATH="$(cd "$(dirname "$0")/../.." \&\& pwd)"|g' "$API_SETUP" > "$API_SETUP.tmp"
    mv "$API_SETUP.tmp" "$API_SETUP"
    echo "✅ API setup script sanitized."
fi

# 3. Check for other hardcoded instances in scripts
echo -e "${BLUE}→${NC} Searching for remaining absolute path leaks..."
LEAKS=$(grep -r "/Users/bradygeorgen" "$ROOT" --exclude-dir=".git" --exclude-dir="node_modules" --exclude-dir="scripts/archive" --exclude-dir=".pipeline-logs" || true)

if [ -n "$LEAKS" ]; then
    echo "⚠️  Worf: Remaining leaks detected:"
    echo "$LEAKS"
else
    echo "✅ No additional personal path leaks found in active directories."
fi

echo ""
echo "⚙️  Geordi: Intermix ratio stabilizing. Paths are now relative to deployment root."
echo -e "${GREEN}✓ Phase R0 complete.${NC}"