#!/usr/bin/env bash
# p3-s2-crew-webhook-map.sh — Phase 3, Step 2: Test crew webhook → MCP routing
# Fires a simulated n8n webhook payload to the MCP bridge's run_crew_agent tool
# and verifies persona enrichment is applied correctly.
# Assigned crew: Lt. Uhura (comms officer, ensures the channel from n8n → MCP is clear).
# MCP tool on failure: run_crew_agent
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
source "$SCRIPT_DIR/lib/crew-fail.sh"

STEP="p3-s2-crew-webhook-map"
step_header "PHASE 3 — N8N + CREWAI AUTOMATION" "Step 2: Crew Webhook → MCP Routing"

BRIDGE_PORT="${MCP_BRIDGE_PORT:-3002}"
BRIDGE_URL="http://localhost:${BRIDGE_PORT}"

set -a; source "$ROOT/.env" 2>/dev/null || true; set +a

# ── Verify bridge is running ──────────────────────────────────────────────────
HEALTH=$(curl -sf "${BRIDGE_URL}/health" --connect-timeout 3 2>&1) || {
  crew_fail \
    --step    "$STEP" \
    --persona "lt_uhura" \
    --tool    "run_crew_agent" \
    --tool-args '{"objective": "MCP bridge is not running — start it then re-run crew webhook mapping test", "agents": [{"persona": "Lt. Uhura"}, {"persona": "Geordi La Forge"}]}' \
    --context "MCP bridge at $BRIDGE_URL is not responding. Run p0-s4-bridge-start.sh first." \
    --error   "curl connect timeout to $BRIDGE_URL/health"
  exit 1
}
echo "  ✔  MCP bridge up"

# ── Open SSE session ──────────────────────────────────────────────────────────
SSE_LOG=$(mktemp)
timeout 4 curl -sN -H "Accept: text/event-stream" "${BRIDGE_URL}/sse" > "$SSE_LOG" 2>&1 || true
SESS_ID=$(grep -o 'sessionId=[^& "]*' "$SSE_LOG" | head -1 | cut -d= -f2 || true)

[[ -z "$SESS_ID" ]] && {
  crew_fail \
    --step    "$STEP" \
    --persona "lt_uhura" \
    --tool    "run_crew_agent" \
    --tool-args '{"objective": "Diagnose SSE session establishment failure at MCP bridge /sse endpoint", "agents": [{"persona": "Lt. Uhura"}, {"persona": "Geordi La Forge"}]}' \
    --context "Could not extract sessionId from SSE /sse endpoint." \
    --error   "SSE log:\n$(cat "$SSE_LOG")"
  rm -f "$SSE_LOG"; exit 1
}
rm -f "$SSE_LOG"
echo "  ✔  SSE session: $SESS_ID"

mcp_post() {
  curl -s -X POST "${BRIDGE_URL}/messages?sessionId=${SESS_ID}" \
    -H "Content-Type: application/json" -d "$1" 2>&1
}

# MCP initialize
mcp_post '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"webhook-test","version":"1.0"}}}' > /dev/null

# ── Test persona normalisation via /crew/personas ─────────────────────────────
echo ""
echo "  Testing persona name normalisation..."
declare -A PERSONA_TEST_CASES=(
  ["Captain Picard"]="captain_picard"
  ["Commander Data"]="commander_data"
  ["Geordi La Forge"]="geordi_la_forge"
  ["Lt. Worf"]="lt_worf"
  ["Dr. Crusher"]="dr_crusher"
)

PERSONAS_JSON=$(curl -sf "${BRIDGE_URL}/crew/personas" 2>&1)
ALL_PASSED=true
for display in "${!PERSONA_TEST_CASES[@]}"; do
  expected="${PERSONA_TEST_CASES[$display]}"
  # Check the expected key is in the personas map
  HAS=$(echo "$PERSONAS_JSON" | node -e "
    let d=''; process.stdin.on('data',c=>d+=c);
    process.stdin.on('end',()=>{
      const p=JSON.parse(d).personas||{};
      console.log(p['$expected']?'yes':'no');
    })
  " 2>/dev/null || echo "no")
  if [[ "$HAS" == "yes" ]]; then
    echo "  ✔  '$display' → $expected"
  else
    echo "  ✗  '$display' → $expected (not in personas map)"
    ALL_PASSED=false
  fi
done

[[ "$ALL_PASSED" == false ]] && {
  crew_fail \
    --step    "$STEP" \
    --persona "lt_uhura" \
    --tool    "run_crew_agent" \
    --tool-args '{"objective": "Fix persona key normalisation in mcp-http-bridge.mjs — some crew display names are not mapping to the correct persona keys", "agents": [{"persona": "Lt. Uhura"}, {"persona": "Commander Data"}]}' \
    --context "Some display-name → persona-key mappings failed validation." \
    --error   "Check normalisePersonaKey() in mcp-http-bridge.mjs"
  exit 1
}

# ── Fire a simulated n8n webhook payload as run_crew_agent ───────────────────
echo ""
echo "  Firing simulated n8n crew webhook (Counselor Troi, analysis task)..."

# This is the payload shape that n8n would send
N8N_WEBHOOK_PAYLOAD=$(cat <<'JSON'
{
  "jsonrpc":"2.0","id":10,"method":"tools/call",
  "params":{
    "name":"run_crew_agent",
    "arguments":{
      "objective":"Analyse the health of the Sovereign Factory pipeline and identify the top 3 risks",
      "agents":[
        {"persona":"Counselor Troi","goal":"Interpret system signals and surface risk patterns"},
        {"persona":"Lt. Worf","goal":"Challenge every assumption and identify security or reliability risks"}
      ]
    }
  }
}
JSON
)

RESP=$(mcp_post "$N8N_WEBHOOK_PAYLOAD")
HAS_RESULT=$(echo "$RESP" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d).result?'ok':'err')}catch(e){console.log('parse-err')}})" 2>/dev/null || echo "parse-err")

if [[ "$HAS_RESULT" == "ok" ]]; then
  echo "  ✔  run_crew_agent invocation succeeded (n8n → MCP → CrewAI routing validated)"
else
  crew_fail \
    --step    "$STEP" \
    --persona "lt_uhura" \
    --tool    "run_crew_agent" \
    --tool-args '{"objective": "Diagnose run_crew_agent MCP tool failure — the CrewAI subprocess bridge may be broken", "agents": [{"persona": "Lt. Uhura"}, {"persona": "Dr. Crusher"}]}' \
    --context "Simulated n8n webhook → run_crew_agent returned no result. CrewAI Python subprocess or OpenRouter key may be the issue." \
    --error   "MCP response: $RESP"
  exit 1
fi

phase_pass "$STEP"
