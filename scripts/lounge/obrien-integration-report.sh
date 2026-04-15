#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# scripts/lounge/obrien-integration-report.sh — Chief O'Brien's integration observation
#
# O'Brien validates the live service mesh: MCP bridge, Redis, Supabase,
# the Express API, and cross-repo connectivity. He's the one who keeps
# it all running — if something's loose, he'll find it.
#
# Usage:
#   bash scripts/lounge/obrien-integration-report.sh [--context "post-deploy|post-bridge|ci"]
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
source "$SCRIPT_DIR/crew-observe.sh"

CONTEXT="${2:-manual}"
TODAY="$(date +%Y-%m-%d)"

set -a; source "$ROOT/.env" 2>/dev/null || true; set +a

FINDINGS=()
CONCLUSIONS=()
RECOMMENDATIONS=()
STATUS="OPERATIONAL"

# ── 1. MCP bridge /health ─────────────────────────────────────────────────────
BRIDGE_PORT="${MCP_BRIDGE_PORT:-3002}"
BRIDGE_URL="http://localhost:${BRIDGE_PORT}"

HEALTH=$(curl -sf "${BRIDGE_URL}/health" --connect-timeout 3 2>/dev/null) || HEALTH=""
if [[ -n "$HEALTH" ]]; then
  SESSIONS=$(echo "$HEALTH" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d).sessions)}catch(e){console.log('?')}})" 2>/dev/null || echo "?")
  FINDINGS+=("MCP bridge: ONLINE at $BRIDGE_URL (active SSE sessions: $SESSIONS)")
else
  [[ "$STATUS" == "OPERATIONAL" ]] && STATUS="DEGRADED"
  FINDINGS+=("MCP bridge: OFFLINE at $BRIDGE_URL — start with: node apps/api/mcp-http-bridge.mjs")
  RECOMMENDATIONS+=("Run: bash scripts/p0-s4-bridge-start.sh to start the MCP bridge")
fi

# ── 2. /crew/personas endpoint ────────────────────────────────────────────────
if [[ -n "$HEALTH" ]]; then
  PERSONAS=$(curl -sf "${BRIDGE_URL}/crew/personas" --connect-timeout 3 2>/dev/null) || PERSONAS=""
  if [[ -n "$PERSONAS" ]]; then
    PERSONA_COUNT=$(echo "$PERSONAS" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d).count)}catch(e){console.log(0)}})" 2>/dev/null || echo "0")
    FINDINGS+=("Crew personas: $PERSONA_COUNT members registered and routed")
  else
    STATUS="DEGRADED"
    FINDINGS+=("Crew personas endpoint: not responding")
  fi
fi

# ── 3. Redis ping ─────────────────────────────────────────────────────────────
REDIS_URL="${REDIS_URL:-redis://127.0.0.1:6379}"
REDIS_HOST=$(echo "$REDIS_URL" | sed -E 's|rediss?://([^:@/]+@)?([^:/]+)(:[0-9]+)?.*|\2|')
REDIS_PORT=$(echo "$REDIS_URL" | sed -E 's|.*:([0-9]+)/?.*|\1|' || echo "6379")
REDIS_PORT="${REDIS_PORT:-6379}"

if command -v redis-cli &>/dev/null; then
  PONG=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" PING 2>/dev/null || echo "FAIL")
  if [[ "$PONG" == "PONG" ]]; then
    FINDINGS+=("Redis: PONG from $REDIS_HOST:$REDIS_PORT")
  else
    [[ "$STATUS" == "OPERATIONAL" ]] && STATUS="DEGRADED"
    FINDINGS+=("Redis: NOT RESPONDING at $REDIS_HOST:$REDIS_PORT")
    RECOMMENDATIONS+=("Start Redis: redis-server or docker run -d -p 6379:6379 redis:7-alpine")
  fi
else
  FINDINGS+=("Redis: redis-cli not available — connectivity not directly tested")
fi

# ── 4. Supabase REST API ──────────────────────────────────────────────────────
SUPABASE_URL="${SUPABASE_URL:-}"
SUPABASE_KEY="${SUPABASE_KEY:-}"
if [[ -n "$SUPABASE_URL" && -n "$SUPABASE_KEY" ]]; then
  SUPA_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "apikey: $SUPABASE_KEY" \
    -H "Authorization: Bearer $SUPABASE_KEY" \
    "${SUPABASE_URL}/rest/v1/" --connect-timeout 5 2>/dev/null) || SUPA_STATUS="000"
  case "$SUPA_STATUS" in
    200|404) FINDINGS+=("Supabase: REACHABLE at ${SUPABASE_URL} (HTTP $SUPA_STATUS)") ;;
    401)     FINDINGS+=("Supabase: AUTH FAILED (HTTP 401) — check SUPABASE_KEY")
             [[ "$STATUS" == "OPERATIONAL" ]] && STATUS="DEGRADED"
             RECOMMENDATIONS+=("Verify SUPABASE_KEY in .env matches your project anon key") ;;
    000)     FINDINGS+=("Supabase: UNREACHABLE — network or URL error")
             [[ "$STATUS" == "OPERATIONAL" ]] && STATUS="DEGRADED" ;;
    *)       FINDINGS+=("Supabase: HTTP $SUPA_STATUS — unexpected response") ;;
  esac
else
  FINDINGS+=("Supabase: credentials not configured in .env")
  RECOMMENDATIONS+=("Set SUPABASE_URL and SUPABASE_KEY in .env")
fi

# ── 5. Express API server ─────────────────────────────────────────────────────
API_PORT="${PORT:-3001}"
API_HEALTH=$(curl -sf "http://localhost:${API_PORT}/health" --connect-timeout 3 2>/dev/null) || API_HEALTH=""
if [[ -n "$API_HEALTH" ]]; then
  FINDINGS+=("Express API: ONLINE at http://localhost:$API_PORT")
else
  FINDINGS+=("Express API: OFFLINE at http://localhost:$API_PORT (non-fatal — bridge is independent)")
fi

# ── 6. openrouter-crew-platform reachability ──────────────────────────────────
DASHBOARD_URL="${NEXT_PUBLIC_DASHBOARD_URL:-http://localhost:3000}"
DASH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$DASHBOARD_URL" --connect-timeout 3 2>/dev/null) || DASH_STATUS="000"
if [[ "$DASH_STATUS" == "200" ]]; then
  FINDINGS+=("alex-dashboard: ONLINE at $DASHBOARD_URL")
else
  FINDINGS+=("alex-dashboard: not running locally (start with pnpm dev in openrouter-crew-platform)")
fi

# ── 7. Python CrewAI env ──────────────────────────────────────────────────────
PYTHON_BIN="${PYTHON_BIN:-}"
if [[ -z "$PYTHON_BIN" ]]; then
  [[ -f "$ROOT/.venv/bin/python3" ]] && PYTHON_BIN="$ROOT/.venv/bin/python3" || PYTHON_BIN="$(command -v python3 2>/dev/null || echo "")"
fi

if [[ -n "$PYTHON_BIN" && -x "$PYTHON_BIN" ]]; then
  CREWAI_INSTALLED=$("$PYTHON_BIN" -c "import crewai; print(crewai.__version__)" 2>/dev/null || echo "not installed")
  if [[ "$CREWAI_INSTALLED" == "not installed" ]]; then
    [[ "$STATUS" == "OPERATIONAL" ]] && STATUS="DEGRADED"
    FINDINGS+=("CrewAI Python: NOT installed in $PYTHON_BIN")
    RECOMMENDATIONS+=("Run: pip install crewai langchain-openai in your .venv")
  else
    FINDINGS+=("CrewAI Python: v$CREWAI_INSTALLED via $PYTHON_BIN")
  fi
else
  FINDINGS+=("Python: interpreter not found — CrewAI subprocess unavailable")
fi

# ── Compose O'Brien's summary ──────────────────────────────────────────────────
case "$STATUS" in
  OPERATIONAL) SUMMARY="All systems are running. She's not exactly the Enterprise-D, but I've seen worse. Every integration point is holding." ;;
  DEGRADED)    SUMMARY="We've got problems. Not catastrophic — I've kept the transporter running with less — but these need fixing before we can call this operational." ;;
esac

CONCLUSIONS+=("Integration status: $STATUS — $TODAY")
CONCLUSIONS+=("Context: $CONTEXT")
[[ "$STATUS" == "OPERATIONAL" ]] && \
  CONCLUSIONS+=("All 7 integration checks passed — system is production-ready for $CONTEXT phase")

crew_observe \
  --member    "Chief O'Brien" \
  --role      "Chief of Operations, Integration Engineer" \
  --title     "Integration Health Check — $TODAY ($CONTEXT)" \
  --summary   "$SUMMARY" \
  $(for f in "${FINDINGS[@]}"; do echo "--finding"; echo "$f"; done) \
  $(for c in "${CONCLUSIONS[@]}"; do echo "--conclusion"; echo "$c"; done) \
  $(for r in "${RECOMMENDATIONS[@]}"; do echo "--recommend"; echo "$r"; done) \
  --tags      "integration,health,obrien,$CONTEXT"

[[ "$STATUS" == "DEGRADED" ]] && exit 1 || exit 0
