#!/usr/bin/env bash
# p4-s3-vercel-deploy.sh — Phase 4, Step 3: Deploy alex-dashboard to Vercel
# Assigned crew: Captain Picard (makes the strategic call to go live — "make it so").
# MCP tool on failure: git_operation
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
source "$SCRIPT_DIR/lib/crew-fail.sh"

STEP="p4-s3-vercel-deploy"
step_header "PHASE 4 — PRODUCTION DEPLOY" "Step 3: Vercel Deploy (alex-dashboard)"

set -a; source "$ROOT/.env" 2>/dev/null || true; set +a

PARENT="$(dirname "$ROOT")"
DASHBOARD_CANDIDATES=(
  "$PARENT/openrouter-crew-platform/apps/alex-dashboard"
  "$HOME/Dev/openrouter-crew-platform/apps/alex-dashboard"
)

DASHBOARD_DIR=""
for c in "${DASHBOARD_CANDIDATES[@]}"; do [[ -d "$c" ]] && DASHBOARD_DIR="$c" && break; done

if [[ -z "$DASHBOARD_DIR" ]]; then
  crew_fail \
    --step    "$STEP" \
    --persona "captain_picard" \
    --tool    "git_operation" \
    --tool-args '{"action": "status"}' \
    --context "alex-dashboard not found. Run p2-s1-clone-platform.sh first." \
    --error   "Dashboard dir not found — expected at $PARENT/openrouter-crew-platform/apps/alex-dashboard"
  exit 1
fi
echo "  ✔  Dashboard: $DASHBOARD_DIR"

# ── Check Vercel CLI ──────────────────────────────────────────────────────────
if ! command -v vercel &>/dev/null; then
  echo "  Installing Vercel CLI..."
  npm install -g vercel --silent 2>/tmp/p4s3-vercel-install.txt || {
    crew_fail \
      --step    "$STEP" \
      --persona "captain_picard" \
      --tool    "git_operation" \
      --tool-args '{"action": "status"}' \
      --context "Failed to install Vercel CLI globally." \
      --error   "$(cat /tmp/p4s3-vercel-install.txt)"
    exit 1
  }
fi
echo "  ✔  Vercel CLI: $(vercel --version 2>/dev/null | head -1)"

# ── Verify Vercel auth ────────────────────────────────────────────────────────
echo ""
echo "  Checking Vercel authentication..."
if ! vercel whoami &>/dev/null 2>&1; then
  crew_fail \
    --step    "$STEP" \
    --persona "captain_picard" \
    --tool    "git_operation" \
    --tool-args '{"action": "status"}' \
    --context "Vercel CLI is not authenticated. Log in before deploying." \
    --error   "vercel whoami failed — run: vercel login"
  exit 1
fi
VERCEL_USER=$(vercel whoami 2>/dev/null || echo "unknown")
echo "  ✔  Logged in as: $VERCEL_USER"

# ── Set production env vars in Vercel project (idempotent) ───────────────────
echo ""
echo "  Configuring Vercel environment variables..."
cd "$DASHBOARD_DIR"

set_vercel_env() {
  local key="$1" val="$2" scope="${3:-production}"
  if [[ -n "$val" ]]; then
    echo "$val" | vercel env add "$key" "$scope" --yes 2>/dev/null || \
    echo "  ⚠  Could not set $key (may already exist — update at vercel.com)"
  fi
}

MCP_PROD_URL="${NEXT_PUBLIC_MCP_URL_PROD:-}"
[[ -n "$MCP_PROD_URL" ]] && set_vercel_env "NEXT_PUBLIC_MCP_URL" "$MCP_PROD_URL"
[[ -n "${OPENROUTER_API_KEY:-}" ]] && set_vercel_env "OPENROUTER_API_KEY" "$OPENROUTER_API_KEY"
[[ -n "${SUPABASE_URL:-}" ]] && set_vercel_env "NEXT_PUBLIC_SUPABASE_URL" "$SUPABASE_URL"

# ── Deploy ────────────────────────────────────────────────────────────────────
echo ""
PROD_FLAG=""
[[ "${DEPLOY_TO_PRODUCTION:-false}" == "true" ]] && PROD_FLAG="--prod"

echo "  Deploying to Vercel ${PROD_FLAG:-(preview)}..."
echo "  Set DEPLOY_TO_PRODUCTION=true to deploy to production URL."
echo ""

if ! DEPLOY_URL=$(vercel deploy $PROD_FLAG --yes 2>/tmp/p4s3-deploy.txt); then
  crew_fail \
    --step    "$STEP" \
    --persona "captain_picard" \
    --tool    "git_operation" \
    --tool-args '{"action": "status"}' \
    --context "Vercel deployment failed for alex-dashboard." \
    --error   "$(cat /tmp/p4s3-deploy.txt | tail -20)"
  exit 1
fi

echo "  ✔  Deployed: $DEPLOY_URL"
echo ""
echo "  Next: update NEXT_PUBLIC_MCP_URL in Vercel to point to the AWS ECS URL"
echo "        (set after p4-s4-aws-deploy.sh completes)"

phase_pass "$STEP"
