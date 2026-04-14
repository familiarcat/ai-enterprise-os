#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# p0-s6-smoke-test.sh — Phase 0, Step 6: End-to-end MCP smoke test
#
# Fires a real MCP tool call (health_check) through the SSE bridge and verifies
# the full round-trip: SSE connect → POST message → JSON-RPC response.
# Assigned crew: Lt. Worf (QA, find every failure mode before they find us).
# MCP tool on failure: health_check
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
source "$SCRIPT_DIR/lib/crew-fail.sh"

STEP="p0-s6-smoke-test"
step_header "PHASE 0 — CONVERGENCE" "Step 6: MCP End-to-End Smoke Test"

set -a; source "$ROOT/.env" 2>/dev/null || true; set +a

BRIDGE_PORT="${MCP_BRIDGE_PORT:-3002}"
BRIDGE_URL="http://localhost:${BRIDGE_PORT}"

# ── 1. Bridge /health ─────────────────────────────────────────────────────────
echo "  [1/4] Bridge /health..."
HEALTH=$(curl -sf "${BRIDGE_URL}/health" 2>&1) || {
  crew_fail \
    --step    "$STEP" \
    --persona "lt_worf" \
    --tool    "health_check" \
    --tool-args '{"fix": true}' \
    --context "Bridge /health is not responding. Run p0-s4-bridge-start.sh first." \
    --error   "$HEALTH"
  exit 1
}
echo "  ✔  /health OK"

# ── 2. /crew/personas ─────────────────────────────────────────────────────────
echo "  [2/4] /crew/personas..."
PERSONAS=$(curl -sf "${BRIDGE_URL}/crew/personas" 2>&1) || {
  crew_fail \
    --step    "$STEP" \
    --persona "lt_worf" \
    --tool    "health_check" \
    --tool-args '{"fix": false}' \
    --context "/crew/personas endpoint failed. CREW_PERSONAS map may be missing or malformed in mcp-http-bridge.mjs." \
    --error   "$PERSONAS"
  exit 1
}
COUNT=$(echo "$PERSONAS" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).count))" 2>/dev/null || echo "0")
echo "  ✔  /crew/personas → $COUNT personas"

# ── 3. SSE connect + list tools (MCP initialize handshake) ───────────────────
echo "  [3/4] SSE connect and tools/list..."

# Open SSE, capture sessionId from the endpoint event, then close
SSE_LOG=$(mktemp)
SESS_ID=""

# Use curl to open SSE for 3 seconds and grab the endpoint event
timeout 3 curl -sN \
  -H "Accept: text/event-stream" \
  "${BRIDGE_URL}/sse" > "$SSE_LOG" 2>&1 || true

# Extract sessionId from endpoint event: data: /messages?sessionId=xxx
SESS_ID=$(grep -o 'sessionId=[^&"]*' "$SSE_LOG" | head -1 | cut -d= -f2 || true)

if [[ -z "$SESS_ID" ]]; then
  crew_fail \
    --step    "$STEP" \
    --persona "lt_worf" \
    --tool    "health_check" \
    --tool-args '{"fix": true}' \
    --context "Could not open SSE session or extract sessionId from /sse endpoint event. SSE transport may be broken." \
    --error   "SSE log:\n$(cat "$SSE_LOG")"
  rm -f "$SSE_LOG"
  exit 1
fi
echo "  ✔  SSE session opened: $SESS_ID"
rm -f "$SSE_LOG"

# Send initialize request
INIT_RESP=$(curl -s -X POST \
  "${BRIDGE_URL}/messages?sessionId=${SESS_ID}" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"smoke-test","version":"1.0"}}}' \
  2>&1) || true

echo "  MCP initialize → $(echo "$INIT_RESP" | head -c 120)"

# Send tools/list
TOOLS_RESP=$(curl -s -X POST \
  "${BRIDGE_URL}/messages?sessionId=${SESS_ID}" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' \
  2>&1) || true

TOOL_COUNT=$(echo "$TOOLS_RESP" | node -e \
  "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{const r=JSON.parse(d);console.log(r.result?.tools?.length||0)}catch(e){console.log(0)}})" \
  2>/dev/null || echo "0")

if (( TOOL_COUNT == 0 )); then
  crew_fail \
    --step    "$STEP" \
    --persona "lt_worf" \
    --tool    "health_check" \
    --tool-args '{"fix": true}' \
    --context "tools/list returned 0 tools. The MCP server may not have registered its handlers or the sessionId routing is broken." \
    --error   "tools/list response: $TOOLS_RESP"
  exit 1
fi
echo "  ✔  tools/list → $TOOL_COUNT MCP tools registered"

# ── 4. Invoke health_check tool ───────────────────────────────────────────────
echo "  [4/4] Invoking health_check MCP tool..."

CALL_RESP=$(curl -s -X POST \
  "${BRIDGE_URL}/messages?sessionId=${SESS_ID}" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"health_check","arguments":{"fix":false,"rebuildVenv":false}}}' \
  2>&1) || true

HAS_RESULT=$(echo "$CALL_RESP" | node -e \
  "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{const r=JSON.parse(d);console.log(r.result?'ok':'err')}catch(e){console.log('parse-err')}})" \
  2>/dev/null || echo "parse-err")

if [[ "$HAS_RESULT" != "ok" ]]; then
  crew_fail \
    --step    "$STEP" \
    --persona "lt_worf" \
    --tool    "health_check" \
    --tool-args '{"fix": true}' \
    --context "tools/call for health_check did not return a result object. The tool handler may have thrown or the session timed out." \
    --error   "tools/call response: $CALL_RESP"
  exit 1
fi
echo "  ✔  health_check tool invocation succeeded"

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "  Smoke test summary:"
echo "    Bridge URL    : $BRIDGE_URL"
echo "    Personas      : $COUNT crew members"
echo "    MCP Tools     : $TOOL_COUNT tools"
echo "    Round-trip    : PASS (SSE → JSON-RPC → tool result)"

phase_pass "$STEP"
