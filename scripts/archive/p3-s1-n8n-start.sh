#!/usr/bin/env bash
# p3-s1-n8n-start.sh — Phase 3, Step 1: Start n8n workflow engine
# Starts n8n on port 5678 if not running, verifies the health endpoint.
# Assigned crew: Chief O'Brien (integration engineer, wires automation systems).
# MCP tool on failure: run_crew_agent
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
source "$SCRIPT_DIR/lib/crew-fail.sh"

STEP="p3-s1-n8n-start"
step_header "PHASE 3 — N8N + CREWAI AUTOMATION" "Step 1: n8n Workflow Engine"

N8N_PORT="${N8N_PORT:-5678}"
N8N_URL="http://localhost:${N8N_PORT}"
N8N_PID_FILE="/tmp/sovereign-n8n.pid"

check_n8n() {
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" "${N8N_URL}/healthz" --connect-timeout 3 2>&1) || HTTP="000"
  [[ "$HTTP" == "200" ]]
}

if check_n8n; then
  echo "  ✔  n8n already running at $N8N_URL"
else
  # Check if n8n is available
  N8N_BIN=""
  if command -v n8n &>/dev/null; then
    N8N_BIN="n8n"
  elif [[ -f "$ROOT/node_modules/.bin/n8n" ]]; then
    N8N_BIN="$ROOT/node_modules/.bin/n8n"
  fi

  if [[ -z "$N8N_BIN" ]]; then
    echo "  n8n not found — installing globally via npx..."
    # Don't install globally, use npx
    N8N_BIN="npx n8n"
  fi

  echo "  Starting n8n on port $N8N_PORT..."
  N8N_PORT=$N8N_PORT N8N_LOG_LEVEL=warn \
    $N8N_BIN start > /tmp/sovereign-n8n.log 2>&1 &
  N8N_PID=$!
  echo "$N8N_PID" > "$N8N_PID_FILE"
  echo "  n8n PID: $N8N_PID  Log: /tmp/sovereign-n8n.log"

  echo "  Waiting for n8n to be ready (up to 30s)..."
  for i in {1..60}; do
    if check_n8n; then
      echo "  ✔  n8n ready after ${i}×0.5s"
      break
    fi
    if (( i == 60 )); then
      crew_fail \
        --step    "$STEP" \
        --persona "chief_obrien" \
        --tool    "run_crew_agent" \
        --tool-args '{"objective": "Diagnose why n8n failed to start on port 5678 and provide corrective steps", "agents": [{"persona": "Chief O'\''Brien"}, {"persona": "Dr. Crusher"}]}' \
        --context "n8n process started but /healthz did not return 200 within 30 seconds." \
        --error   "n8n startup log:\n$(cat /tmp/sovereign-n8n.log 2>/dev/null | tail -20)"
      kill "$N8N_PID" 2>/dev/null || true
      exit 1
    fi
    sleep 0.5
  done
fi

# ── Verify REST API accessible ────────────────────────────────────────────────
echo ""
echo "  Checking n8n REST API..."
API_STATUS=$(curl -s -o /tmp/n8n-api.json -w "%{http_code}" \
  "${N8N_URL}/api/v1/workflows" \
  -H "accept: application/json" 2>&1) || API_STATUS="000"

if [[ "$API_STATUS" == "200" || "$API_STATUS" == "401" ]]; then
  # 401 means API is up but needs auth — acceptable at this stage
  echo "  ✔  n8n API responding (HTTP $API_STATUS)"
else
  echo "  ⚠  n8n API returned HTTP $API_STATUS (expected 200 or 401)"
fi

echo ""
echo "  n8n is running at $N8N_URL"
echo "  Open the n8n editor: $N8N_URL"
echo "  Default credentials: admin / changeme (or set N8N_BASIC_AUTH_USER/PASSWORD)"

phase_pass "$STEP"
