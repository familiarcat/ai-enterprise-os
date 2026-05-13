#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# scripts/run-dev-stack.sh — Unified Local Development Orchestrator
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Load environment variables
if [ -f "$ROOT/.env" ]; then
    export $(grep -v '^#' "$ROOT/.env" | xargs)
fi

echo "🧹 Cleaning up existing Sovereign instances..."
pkill -f "mcp-http-bridge.mjs" || true
pkill -f "next-dev" || true
docker stop sovereign-redis >/dev/null 2>&1 || true
docker rm sovereign-redis >/dev/null 2>&1 || true

echo "🚀 Starting Sovereign Factory Local Stack..."

# 1. Start Core Infrastructure via Docker Compose
if docker info >/dev/null 2>&1; then
    echo "📦 Orchestrating containers with restart policies..."
    docker-compose up -d sovereign-redis
else
    echo "❌ Docker Desktop is not running. Please start it and try again."
    exit 1
fi

# 2. Seed RAG Memories
echo "🧠 Hydrating RAG Memories (Supabase)..."
bash "$ROOT/scripts/seed-architecture.sh"
node "$ROOT/scripts/seed-missions.js"
echo "✅ Memory systems synced."

# 3. Start MCP Bridge
echo "🔌 Launching MCP HTTP Bridge on port 3002..."
cd "$ROOT/apps/api"
node mcp-http-bridge.mjs > "$ROOT/.bridge.log" 2>&1 &
BRIDGE_PID=$!

# 4. Start Dashboard
echo "🖥️  Launching Observation Lounge Dashboard..."
cd "$ROOT/apps/dashboard"
pnpm dev > "$ROOT/.dashboard.log" 2>&1 &
DASHBOARD_PID=$!

# 5. Activate Crew
echo "🖖 Initializing Crew Personas..."

# Wait for bridge health check to pass (max 10 seconds)
MAX_RETRIES=10
COUNT=0
while ! curl -s http://localhost:3002/health > /dev/null; do
    sleep 1
    COUNT=$((COUNT+1))
    if [ $COUNT -ge $MAX_RETRIES ]; then
        echo "❌ MCP Bridge failed to start in time. Check .bridge.log for errors."
        exit 1
    fi
done

bash "$ROOT/scripts/crew-activation.sh"

echo ""
echo "══════════════════════════════════════════════════════════════"
echo "🎉 Sovereign Factory is LIVE"
echo "   - Dashboard: http://localhost:3000/lounge"
echo "   - MCP Bridge: http://localhost:3002/health"
echo "   - Redis: localhost:6379"
echo "══════════════════════════════════════════════════════════════"
echo "Press Ctrl+C to shut down all systems."

# Cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down Sovereign Factory..."
    kill $BRIDGE_PID || true
    kill $DASHBOARD_PID || true
    docker stop sovereign-redis || true
    echo "✅ Cleanup complete."
    exit
}

trap cleanup SIGINT SIGTERM

# Keep script alive and tail logs
tail -f "$ROOT/.bridge.log" "$ROOT/.dashboard.log"