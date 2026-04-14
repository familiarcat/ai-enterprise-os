#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# p0-s4-bridge-start.sh — Phase 0, Step 4: MCP HTTP Bridge health
#
# Starts the MCP HTTP bridge (apps/api/mcp-http-bridge.mjs) if not already
# running, then verifies /health and /crew/personas endpoints respond correctly.
# Assigned crew: Geordi La Forge (engineer robust systems, MCP wiring).
# MCP tool on failure: health_check
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
source "$SCRIPT_DIR/lib/crew-fail.sh"

STEP="p0-s4-bridge-start"
step_header "PHASE 0 — CONVERGENCE" "Step 4: MCP HTTP Bridge"

set -a; source "$ROOT/.env" 2>/dev/null || true; set +a

BRIDGE_PORT="${MCP_BRIDGE_PORT:-3002}"
BRIDGE_FILE="$ROOT/apps/api/mcp-http-bridge.mjs"
BRIDGE_URL="http://localhost:${BRIDGE_PORT}"
BRIDGE_PID_FILE="/tmp/sovereign-mcp-bridge.pid"

# ── Verify bridge file exists ─────────────────────────────────────────────────
if [[ ! -f "$BRIDGE_FILE" ]]; then
  crew_fail \
    --step    "$STEP" \
    --persona "geordi_la_forge" \
    --tool    "run_factory_mission" \
    --tool-args '{"project": "ai-enterprise-os", "objective": "Create the MCP HTTP bridge at apps/api/mcp-http-bridge.mjs with SSEServerTransport on port 3002 and Star Trek crew persona routing"}' \
    --context "apps/api/mcp-http-bridge.mjs does not exist. This file is the SSE transport layer that connects alex-dashboard to the orchestrator." \
    --error   "File not found: $BRIDGE_FILE"
  exit 1
fi
echo "  ✔  Bridge file exists: $BRIDGE_FILE"

# ── Check if already running ──────────────────────────────────────────────────
check_bridge_health() {
  HTTP_STATUS=$(curl -s -o /tmp/bridge-health.json -w "%{http_code}" \
    "${BRIDGE_URL}/health" --connect-timeout 3 2>&1) || HTTP_STATUS="000"
  [[ "$HTTP_STATUS" == "200" ]]
}

if check_bridge_health; then
  SESSION_COUNT=$(node -e "const d=require('/tmp/bridge-health.json');console.log(d.sessions)" 2>/dev/null || echo "?")
  echo "  ✔  Bridge already running at $BRIDGE_URL (active sessions: $SESSION_COUNT)"
else
  echo "  Bridge not running — starting in background..."

  # Kill any stale process on the port
  if command -v lsof &>/dev/null; then
    STALE_PID=$(lsof -ti ":${BRIDGE_PORT}" 2>/dev/null || true)
    if [[ -n "$STALE_PID" ]]; then
      echo "  Killing stale process $STALE_PID on port $BRIDGE_PORT..."
      kill "$STALE_PID" 2>/dev/null || true
      sleep 1
    fi
  fi

  cd "$ROOT"
  node apps/api/mcp-http-bridge.mjs > /tmp/sovereign-mcp-bridge.log 2>&1 &
  BRIDGE_PID=$!
  echo "$BRIDGE_PID" > "$BRIDGE_PID_FILE"
  echo "  Bridge PID: $BRIDGE_PID  Log: /tmp/sovereign-mcp-bridge.log"

  # Wait up to 10 seconds for it to be ready
  echo "  Waiting for bridge to be ready..."
  for i in {1..20}; do
    if check_bridge_health; then
      echo "  ✔  Bridge is up after ${i}×0.5s"
      break
    fi
    if (( i == 20 )); then
      BRIDGE_LOG=$(cat /tmp/sovereign-mcp-bridge.log 2>/dev/null | tail -20)
      crew_fail \
        --step    "$STEP" \
        --persona "geordi_la_forge" \
        --tool    "health_check" \
        --tool-args '{"fix": true, "rebuildVenv": false}' \
        --context "MCP HTTP bridge process started (PID $BRIDGE_PID) but /health did not return 200 within 10 seconds." \
        --error   "Startup log tail:\n$BRIDGE_LOG"
      kill "$BRIDGE_PID" 2>/dev/null || true
      exit 1
    fi
    sleep 0.5
  done
fi

# ── Validate /health response structure ──────────────────────────────────────
echo ""
echo "  Validating /health response..."
HEALTH_JSON=$(curl -s "${BRIDGE_URL}/health" 2>&1)
SERVICE=$(echo "$HEALTH_JSON" | node -e "process.stdin.resume();let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d).service)}catch(e){console.log('parse-error')}})" 2>/dev/null || echo "")

if [[ "$SERVICE" != "mcp-http-bridge" ]]; then
  crew_fail \
    --step    "$STEP" \
    --persona "geordi_la_forge" \
    --tool    "health_check" \
    --tool-args '{"fix": true}' \
    --context "/health endpoint returned 200 but the JSON does not contain service='mcp-http-bridge'. Something else may be running on port $BRIDGE_PORT." \
    --error   "health JSON: $HEALTH_JSON"
  exit 1
fi
echo "  ✔  /health → service: mcp-http-bridge"

# ── Validate /crew/personas ───────────────────────────────────────────────────
echo ""
echo "  Validating /crew/personas endpoint..."
PERSONAS_STATUS=$(curl -s -o /tmp/bridge-personas.json -w "%{http_code}" \
  "${BRIDGE_URL}/crew/personas" 2>&1) || PERSONAS_STATUS="000"

if [[ "$PERSONAS_STATUS" != "200" ]]; then
  crew_fail \
    --step    "$STEP" \
    --persona "geordi_la_forge" \
    --tool    "health_check" \
    --tool-args '{"fix": true}' \
    --context "/crew/personas endpoint returned HTTP $PERSONAS_STATUS instead of 200." \
    --error   "Response: $(cat /tmp/bridge-personas.json 2>/dev/null)"
  exit 1
fi

PERSONA_COUNT=$(node -e "const d=require('/tmp/bridge-personas.json');console.log(d.count)" 2>/dev/null || echo "0")
echo "  ✔  /crew/personas → $PERSONA_COUNT crew members registered"

if (( PERSONA_COUNT < 10 )); then
  echo "  ⚠  Expected 10 personas, got $PERSONA_COUNT — check CREW_PERSONAS in mcp-http-bridge.mjs"
fi

echo ""
echo "  Bridge URL for alex-dashboard: export NEXT_PUBLIC_MCP_URL=$BRIDGE_URL"
phase_pass "$STEP"
