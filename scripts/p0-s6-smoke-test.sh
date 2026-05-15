#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# scripts/p0-s6-smoke-test.sh — Bridge Connectivity Smoke Test
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

BRIDGE_URL="http://localhost:3002"

# Load failure dispatcher to alert the crew if systems are down
source "$PROJECT_ROOT/scripts/lib/crew-fail.sh"

echo "📡 Starting Phase 0 Bridge Smoke Test..."
echo "----------------------------------------"

# 1. Check health
echo -n "Checking Bridge Health (/health)... "
if curl -sf "$BRIDGE_URL/health" > /dev/null; then
    echo "✅ ONLINE"
else
    echo "❌ OFFLINE"
    echo "Error: Bridge at $BRIDGE_URL is not responding. Ensure the bridge is started."
    crew_fail --step "Bridge Liveness Check" --persona "geordi_la_forge" --error "Bridge at $BRIDGE_URL is unreachable."
    exit 1
fi

# 2. Crew Manager & Python Environment Check
echo -n "Checking Crew Manager Status (__ping__)... "

# Verify Python dependencies are available
if ! python3 -c "import crewai, langchain_openai, requests" 2>/dev/null; then
    echo -e "\n  ❌ Missing Python dependencies (crewai, langchain_openai, or requests)."
    crew_fail --step "Python Dependency Check" --persona "geordi_la_forge" --error "Missing dependencies in $(which python3)"
    exit 1
fi

# Perform the actual 'ping' health check
CREW_HEALTH_JSON=$(echo '{"task": "__ping__"}' | python3 "$PROJECT_ROOT/tools/crew_manager.py" 2>/dev/null)

if [[ $CREW_HEALTH_JSON == *"\"status\": \"success\""* ]]; then
    BRIDGE_STATE=$(echo "$CREW_HEALTH_JSON" | python3 -c "import sys, json; print(json.load(sys.stdin).get('mcp_bridge_status'))")
    echo "✅ OPERATIONAL (Bridge Aware: $BRIDGE_STATE)"
else
    echo "❌ FAILED"
    crew_fail --step "Crew Manager Ping" --persona "geordi_la_forge" --error "$CREW_HEALTH_JSON"
    exit 1
fi

echo "🚀 Bridge connectivity verified. Systems are nominal."