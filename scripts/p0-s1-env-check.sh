#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# p0-s1-env-check.sh — Phase 0, Step 1: Environment & CLI prerequisites
#
# Verifies all required env vars, CLI tools, and .env file before anything
# else runs. Assigned crew: Dr. Crusher (diagnose system health).
# MCP tool on failure: health_check
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
source "$SCRIPT_DIR/lib/crew-fail.sh"

STEP="p0-s1-env-check"
step_header "PHASE 0 — CONVERGENCE" "Step 1: Environment & CLI Prerequisites"

# ── 1. Required CLI tools ─────────────────────────────────────────────────────
check_cli() {
  local bin="$1" install_hint="$2"
  if ! command -v "$bin" &>/dev/null; then
    crew_fail \
      --step    "$STEP" \
      --persona "dr_crusher" \
      --tool    "health_check" \
      --tool-args '{"fix": true}' \
      --context "Required CLI tool '$bin' is not installed or not on PATH." \
      --error   "command not found: $bin — $install_hint"
    exit 1
  fi
  echo "  ✔  $bin $(${bin} --version 2>/dev/null | head -1 || true)"
}

echo "Checking required CLI tools..."
check_cli "node"       "Install via https://nodejs.org or nvm"
check_cli "pnpm"       "npm install -g pnpm"
check_cli "python3"    "Install via https://python.org or pyenv"
check_cli "git"        "Install via your OS package manager"
check_cli "curl"       "Install via your OS package manager"

# Optional but logged
for opt in gh redis-cli docker terraform vsce; do
  if command -v "$opt" &>/dev/null; then
    echo "  ✔  $opt (optional) found"
  else
    echo "  ⚠  $opt not found — required for later phases"
  fi
done

# ── 2. .env file ──────────────────────────────────────────────────────────────
echo ""
echo "Checking .env file..."
ENV_FILE="$ROOT/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  crew_fail \
    --step    "$STEP" \
    --persona "dr_crusher" \
    --tool    "health_check" \
    --tool-args '{"fix": true}' \
    --context "No .env file found at $ENV_FILE. All required API keys and URLs must be defined here." \
    --error   "File not found: $ENV_FILE — copy .env.example or create with: OPENROUTER_API_KEY, SUPABASE_URL, SUPABASE_KEY, REDIS_URL, NEXT_PUBLIC_MCP_URL"
  exit 1
fi
echo "  ✔  .env exists at $ENV_FILE"

# ── 3. Required environment variables ─────────────────────────────────────────
echo ""
echo "Checking required environment variables..."

# Source .env without exporting (read-only check)
set -a; source "$ENV_FILE" 2>/dev/null || true; set +a

REQUIRED_VARS=(
  "OPENROUTER_API_KEY:OpenRouter API key for model routing"
  "SUPABASE_URL:Supabase project URL (https://xxx.supabase.co)"
  "SUPABASE_KEY:Supabase anon/service role key"
  "REDIS_URL:Redis connection string (redis://localhost:6379 or TLS URL)"
)

MISSING=()
for entry in "${REQUIRED_VARS[@]}"; do
  var="${entry%%:*}"
  desc="${entry##*:}"
  val="${!var:-}"
  if [[ -z "$val" ]]; then
    echo "  ✗  $var — MISSING ($desc)"
    MISSING+=("$var")
  else
    # Mask value for display
    masked="${val:0:6}…${val: -4}"
    echo "  ✔  $var = $masked"
  fi
done

if [[ ${#MISSING[@]} -gt 0 ]]; then
  crew_fail \
    --step    "$STEP" \
    --persona "dr_crusher" \
    --tool    "health_check" \
    --tool-args '{"fix": true}' \
    --context "The following required environment variables are absent from $ENV_FILE: ${MISSING[*]}" \
    --error   "Missing vars: ${MISSING[*]} — add them to $ENV_FILE and re-run"
  exit 1
fi

# ── 4. NEXT_PUBLIC_MCP_URL check (warn if missing, not fatal yet) ─────────────
echo ""
MCP_URL="${NEXT_PUBLIC_MCP_URL:-}"
if [[ -z "$MCP_URL" ]]; then
  echo "  ⚠  NEXT_PUBLIC_MCP_URL not set — p0-s5-dashboard-wire will configure this"
else
  echo "  ✔  NEXT_PUBLIC_MCP_URL = $MCP_URL"
fi

phase_pass "$STEP"
