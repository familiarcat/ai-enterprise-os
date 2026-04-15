#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# p0-s3-supabase-check.sh — Phase 0, Step 3: Supabase reachability
#
# Verifies the Supabase project URL and key are valid by hitting the REST
# API health endpoint. Supabase is required for vector memory (mission recall).
# Assigned crew: Dr. Crusher (diagnose system health, prescribe corrective action).
# MCP tool on failure: health_check
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
source "$SCRIPT_DIR/lib/crew-fail.sh"

STEP="p0-s3-supabase-check"
step_header "PHASE 0 — CONVERGENCE" "Step 3: Supabase Reachability"

set -a; source "$ROOT/.env" 2>/dev/null || true; set +a

SUPABASE_URL="${SUPABASE_URL:-}"
SUPABASE_KEY="${SUPABASE_KEY:-}"

if [[ -z "$SUPABASE_URL" || -z "$SUPABASE_KEY" ]]; then
  crew_fail \
    --step    "$STEP" \
    --persona "dr_crusher" \
    --tool    "health_check" \
    --tool-args '{"fix": true}' \
    --context "SUPABASE_URL or SUPABASE_KEY is not set in .env. Both are required for vector memory." \
    --error   "SUPABASE_URL='$SUPABASE_URL'  SUPABASE_KEY='${SUPABASE_KEY:0:4}…'"
  exit 1
fi

if [[ "$SUPABASE_KEY" == *"REPLACE_WITH_ACTUAL"* ]]; then
  crew_fail \
    --step    "$STEP" \
    --persona "dr_crusher" \
    --tool    "health_check" \
    --tool-args '{"fix": true}' \
    --context "The SUPABASE_KEY is still using a placeholder value from .zshrc." \
    --error   "Placeholder detected: $SUPABASE_KEY"
  exit 1
fi

echo "  Supabase URL: $SUPABASE_URL"
echo "  Key prefix  : ${SUPABASE_KEY:0:8}…"

# ── Pre-flight JWT Validation ────────────────────────────────────────────────
if [[ ! "$SUPABASE_KEY" =~ ^eyJhbGci ]]; then
  crew_fail \
    --step    "$STEP" \
    --persona "dr_crusher" \
    --tool    "health_check" \
    --tool-args '{"fix": true}' \
    --context "The SUPABASE_KEY in .env does not appear to be a valid JWT (should start with 'eyJ...')." \
    --error   "Invalid key format. Current prefix: ${SUPABASE_KEY:0:10}"
  exit 1
fi

# ── Hit the /rest/v1/ health endpoint ────────────────────────────────────────
echo ""
echo "  Checking Supabase REST API..."
HTTP_STATUS=$(curl -s -o /tmp/supa-resp.json -w "%{http_code}" \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  "${SUPABASE_URL}/rest/v1/" 2>&1) || HTTP_STATUS="000"

if [[ "$HTTP_STATUS" == "200" ]]; then
  echo "  ✔  Supabase REST API returned 200"
elif [[ "$HTTP_STATUS" == "404" ]]; then
  # 404 on /rest/v1/ root is normal for some Supabase versions — try /health
  echo "  /rest/v1/ returned 404 — trying /health..."
  HTTP_STATUS2=$(curl -s -o /tmp/supa-health.json -w "%{http_code}" \
    "${SUPABASE_URL}/health" 2>&1) || HTTP_STATUS2="000"
  if [[ "$HTTP_STATUS2" == "200" ]]; then
    echo "  ✔  Supabase /health returned 200"
  else
    crew_fail \
      --step    "$STEP" \
      --persona "dr_crusher" \
      --tool    "health_check" \
      --tool-args '{"fix": true}' \
      --context "Supabase URL $SUPABASE_URL is reachable but /health returned HTTP $HTTP_STATUS2. The project may be paused (free tier) or the URL is incorrect." \
      --error   "HTTP $HTTP_STATUS2 from $SUPABASE_URL/health — wake the project at supabase.com or check SUPABASE_URL"
    exit 1
  fi
elif [[ "$HTTP_STATUS" == "401" ]]; then
  crew_fail \
    --step    "$STEP" \
    --persona "dr_crusher" \
    --tool    "health_check" \
    --tool-args '{"fix": true}' \
    --context "Supabase REST API returned 401 Unauthorized. The SUPABASE_KEY is invalid or has insufficient permissions." \
    --error   "HTTP 401 — check SUPABASE_KEY in .env; ensure it is the anon key or service_role key from your Supabase project settings"
  exit 1
elif [[ "$HTTP_STATUS" == "000" ]]; then
  crew_fail \
    --step    "$STEP" \
    --persona "dr_crusher" \
    --tool    "health_check" \
    --tool-args '{"fix": true}' \
    --context "curl could not connect to $SUPABASE_URL. DNS resolution failed or the network is offline." \
    --error   "curl returned exit code 000 (connection failed) — verify SUPABASE_URL is correct and network is reachable"
  exit 1
else
  crew_fail \
    --step    "$STEP" \
    --persona "dr_crusher" \
    --tool    "health_check" \
    --tool-args '{"fix": true}' \
    --context "Supabase REST API returned unexpected HTTP status $HTTP_STATUS." \
    --error   "HTTP $HTTP_STATUS from $SUPABASE_URL/rest/v1/ — response: $(cat /tmp/supa-resp.json 2>/dev/null | head -5)"
  exit 1
fi

# ── Verify the missions table exists (vector memory table) ────────────────────
echo ""
echo "  Checking for 'missions' vector table..."
TABLE_RESP=$(curl -s -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  -H "Accept: application/vnd.pgrst.plan+json" \
  "${SUPABASE_URL}/rest/v1/missions?limit=1" 2>&1) || TABLE_RESP=""

TABLE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  "${SUPABASE_URL}/rest/v1/missions?limit=1" 2>&1) || TABLE_STATUS="000"

if [[ "$TABLE_STATUS" == "200" ]]; then
  echo "  ✔  missions table exists, is queryable, and API permissions are valid"
elif [[ "$TABLE_STATUS" == "404" || "$TABLE_STATUS" == "406" ]]; then
  echo "  ⚠  missions table not found (HTTP $TABLE_STATUS)"
  echo "     Run the Supabase migrations in supabase/migrations/ to create it."
  echo "     Non-fatal for now — orchestrator will fail when recallMemory() is called."
else
  echo "  ⚠  missions table check returned HTTP $TABLE_STATUS — inspect $SUPABASE_URL manually"
fi

phase_pass "$STEP"
