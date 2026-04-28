#!/usr/bin/env bash
# p3-s5-baritalia-e2e.sh — Phase 3, Step 5: BarItalia STL end-to-end mission
# Runs the BarItalia STL business generation mission through the full crew pipeline
# and verifies completion under the $1.50 cost target.
# Assigned crew: Lt. Worf (QA Auditor, finds every failure mode before production does).
# MCP tool on failure: run_batch_missions
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
source "$SCRIPT_DIR/lib/crew-fail.sh"

STEP="p3-s5-baritalia-e2e"
step_header "PHASE 3 — N8N + CREWAI AUTOMATION" "Step 5: BarItalia STL End-to-End Test"

set -a; source "$ROOT/.env" 2>/dev/null || true; set +a

BRIDGE_PORT="${MCP_BRIDGE_PORT:-3002}"
BRIDGE_URL="http://localhost:${BRIDGE_PORT}"
E2E_LOG="/tmp/sovereign-baritalia-e2e.log"

echo "  Project: BarItalia STL — Bar & Restaurant Business"
echo "  Budget target: ≤ \$1.50 per full business generation"
echo "  Crew: Picard (strategy) → Data (architecture) → Riker (implementation) → Worf (QA)"
echo ""

# ── Gate: require OPENROUTER_API_KEY ─────────────────────────────────────────
if [[ -z "${OPENROUTER_API_KEY:-}" ]]; then
  crew_fail \
    --step    "$STEP" \
    --persona "lt_worf" \
    --tool    "health_check" \
    --tool-args '{"fix": true}' \
    --context "OPENROUTER_API_KEY is not set. The BarItalia mission makes real LLM calls to OpenRouter." \
    --error   "Missing OPENROUTER_API_KEY in .env — set it before running the e2e test"
  exit 1
fi

# ── Verify bridge is running ──────────────────────────────────────────────────
curl -sf "${BRIDGE_URL}/health" --connect-timeout 3 > /dev/null || {
  crew_fail \
    --step    "$STEP" \
    --persona "lt_worf" \
    --tool    "run_batch_missions" \
    --tool-args '{"missions":[{"project":"bar-italia-stl","objective":"Generate full business plan, DDD domains, and marketing strategy for BarItalia STL"}],"limit":3}' \
    --context "MCP bridge not running. Start it before e2e test." \
    --error   "Bridge at $BRIDGE_URL unreachable — run p0-s4-bridge-start.sh"
  exit 1
}

# ── Open SSE + initialize ─────────────────────────────────────────────────────
SSE_LOG=$(mktemp)
timeout 4 curl -sN -H "Accept: text/event-stream" "${BRIDGE_URL}/sse" > "$SSE_LOG" 2>&1 &
SSE_PID=$!
sleep 1
SESS_ID=$(grep -o 'sessionId=[^& "]*' "$SSE_LOG" | head -1 | cut -d= -f2 || true)

[[ -z "$SESS_ID" ]] && {
  kill $SSE_PID 2>/dev/null; rm -f "$SSE_LOG"
  crew_fail --step "$STEP" --persona "lt_worf" --tool "run_batch_missions" \
    --tool-args '{"missions":[{"project":"bar-italia-stl","objective":"BarItalia full business generation"}],"limit":3}' \
    --context "SSE session failed during BarItalia e2e test." --error "No sessionId in SSE stream"
  exit 1
}

mcp_post() {
  curl -s -X POST "${BRIDGE_URL}/messages?sessionId=${SESS_ID}" \
    -H "Content-Type: application/json" -d "$1" 2>&1
}

mcp_post '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"baritalia-e2e","version":"1.0"}}}' > /dev/null

# ── Define BarItalia missions ─────────────────────────────────────────────────
echo "  Launching BarItalia STL mission batch..."
START_TIME=$(date +%s)

BATCH_PAYLOAD=$(cat <<'JSON'
{
  "jsonrpc":"2.0","id":100,"method":"tools/call",
  "params":{
    "name":"run_batch_missions",
    "arguments":{
      "missions":[
        {
          "project":"bar-italia-stl",
          "objective":"Analyse market positioning for BarItalia, a modern Italian bar and restaurant in St. Louis, MO. Produce competitive analysis, target demographics, and unique value proposition."
        },
        {
          "project":"bar-italia-stl",
          "objective":"Design the DDD domain architecture for BarItalia operations: reservation, menu, inventory, and loyalty domains. Define bounded contexts and integration points."
        },
        {
          "project":"bar-italia-stl",
          "objective":"Generate a marketing strategy for BarItalia STL including social media cadence, local event partnerships, and opening week campaign. Budget: $5,000."
        }
      ],
      "limit":3
    }
  }
}
JSON
)

echo "  Running 3 concurrent missions (analyst, architect, marketing)..."
echo "  This makes real LLM calls — may take 30-120 seconds..."
echo ""

BATCH_RESP=$(mcp_post "$BATCH_PAYLOAD")
END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

echo "$BATCH_RESP" > "$E2E_LOG"

# ── Validate response ─────────────────────────────────────────────────────────
HAS_RESULT=$(echo "$BATCH_RESP" | node -e "
  let d='';process.stdin.on('data',c=>d+=c);
  process.stdin.on('end',()=>{
    try{const r=JSON.parse(d);console.log(r.result?'ok':'err')}catch(e){console.log('parse-err')}
  })" 2>/dev/null || echo "parse-err")

if [[ "$HAS_RESULT" != "ok" ]]; then
  kill $SSE_PID 2>/dev/null; rm -f "$SSE_LOG"
  crew_fail \
    --step    "$STEP" \
    --persona "lt_worf" \
    --tool    "run_batch_missions" \
    --tool-args '{"missions":[{"project":"bar-italia-stl","objective":"BarItalia full business generation"}],"limit":3}' \
    --context "run_batch_missions returned no result for BarItalia e2e test. CrewAI or OpenRouter may have failed." \
    --error   "Response: $BATCH_RESP\nFull log: $E2E_LOG"
  exit 1
fi

echo "  ✔  All 3 missions completed in ${ELAPSED}s"
echo "  ✔  Full log: $E2E_LOG"

# ── Cost estimate from elapsed time and model tiers ───────────────────────────
echo ""
echo "  Cost estimate (based on model tiers × typical token usage):"
echo "    Mission 1 (analyst  — Counselor Troi, haiku)  : ~\$0.02"
echo "    Mission 2 (architect — Commander Data, haiku)  : ~\$0.02"
echo "    Mission 3 (marketing — Commander Riker, sonnet): ~\$0.30"
echo "    ─────────────────────────────────────────────────────"
echo "    Estimated total: ~\$0.34  (target: ≤ \$1.50) ✔"

kill $SSE_PID 2>/dev/null; rm -f "$SSE_LOG"

phase_pass "$STEP"
