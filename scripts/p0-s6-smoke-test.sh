#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# scripts/p0-s6-smoke-test.sh — Bridge Connectivity Smoke Test
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail

BRIDGE_URL="http://localhost:3002"

echo "📡 Starting Phase 0 Bridge Smoke Test..."
echo "----------------------------------------"

# 1. Check health
echo -n "Checking Bridge Health (/health)... "
if curl -sf "$BRIDGE_URL/health" > /dev/null; then
    echo "✅ ONLINE"
else
    echo "❌ OFFLINE"
    echo "Error: Bridge at $BRIDGE_URL is not responding. Ensure the bridge is started."
    exit 1
fi

echo "🚀 Bridge connectivity verified. Systems are nominal."