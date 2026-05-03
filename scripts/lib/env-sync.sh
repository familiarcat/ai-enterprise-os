#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# scripts/lib/env-sync.sh — Unify ~/.zshrc credentials → .env
#
# Pulls every credential that lives in ~/.zshrc and is missing or stale in
# the project .env, then writes corrections back with set_env_var / set_zshrc_var.
#
# Safe to run repeatedly — only overwrites values that differ.
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="$ROOT/.env"
ZSHRC="$HOME/.zshrc"

source "$SCRIPT_DIR/crew-utils.sh"

# ── Helper: pull from shell env (already exported) or parse .zshrc directly ──
get_var() {
  local key="$1"
  # Prefer already-exported value in current shell
  local val="${!key:-}"
  if [[ -z "$val" ]]; then
    val="$(get_credential "$key")"
  fi
  echo "$val"
}

# ── Helper: write to .env only if value is non-empty and different ────────────
sync_to_env() {
  local key="$1" val="$2"
  [[ -z "$val" ]] && return
  local current
  current="$(grep "^${key}=" "$ENV_FILE" 2>/dev/null | cut -d= -f2- || echo "")"
  if [[ "$current" != "$val" ]]; then
    set_env_var "$key" "$val" "$ENV_FILE"
    echo "  ✔  $key → .env updated"
  else
    echo "  ·  $key unchanged"
  fi
}

# ── Helper: write to .zshrc only if value is non-empty and different ─────────
sync_to_zshrc() {
  local key="$1" val="$2"
  [[ -z "$val" ]] && return
  local current
  current="$(grep "^export ${key}=" "$ZSHRC" 2>/dev/null | sed -E "s/^export ${key}=[\"']?([^\"']+)[\"']?/\1/" || echo "")"
  if [[ "$current" != "$val" ]]; then
    set_zshrc_var "$key" "$val"
    echo "  ✔  $key → .zshrc updated"
  else
    echo "  ·  $key unchanged"
  fi
}

echo ""
echo "══════════════════════════════════════════════════════════════════"
echo "  Sovereign Factory — Credential Unification"
echo "  Source: ~/.zshrc → Target: $ENV_FILE"
echo "══════════════════════════════════════════════════════════════════"
echo ""

# Source .zshrc into current shell to resolve variable references (e.g. SUPABASE_KEY=$SUPABASE_SERVICE_ROLE_KEY)
set -a
# shellcheck disable=SC1090
source "$ZSHRC" 2>/dev/null || true
set +a

# ── 1. Core required vars ─────────────────────────────────────────────────────
echo "── Core"
sync_to_env "OPENROUTER_API_KEY"       "$(get_var OPENROUTER_API_KEY)"
sync_to_env "OPENROUTER_REFERER"       "$(get_var OPENROUTER_REFERER)"
sync_to_env "AI_APP_NAME"              "$(get_var AI_APP_NAME)"
sync_to_env "REDIS_URL"                "$(get_var REDIS_URL)"

# ── 2. Supabase — cloud project (env takes precedence for URL) ────────────────
echo ""
echo "── Supabase"
# SUPABASE_URL: .env cloud URL wins — do NOT overwrite with .zshrc local URL.
# Only sync if .env value is missing entirely.
if ! grep -q "^SUPABASE_URL=" "$ENV_FILE"; then
  sync_to_env "SUPABASE_URL" "$(get_var SUPABASE_URL)"
else
  echo "  ·  SUPABASE_URL preserved (cloud URL in .env takes precedence over local in .zshrc)"
fi
# SUPABASE_KEY: pull the resolved service role key (not the truncated stub)
sync_to_env "SUPABASE_KEY"             "$(get_var SUPABASE_SERVICE_ROLE_KEY)"
sync_to_env "SUPABASE_SERVICE_ROLE_KEY" "$(get_var SUPABASE_SERVICE_ROLE_KEY)"
sync_to_env "SUPABASE_PUBLIC_KEY"      "$(get_var SUPABASE_PUBLIC_KEY)"

# ── 3. Python — always use working venv313 ────────────────────────────────────
echo ""
echo "── Python"
PYTHON_BIN_TARGET="$ROOT/.venv313/bin/python3.13"
sync_to_env  "PYTHON_BIN" "$PYTHON_BIN_TARGET"
sync_to_zshrc "PYTHON_BIN" "$PYTHON_BIN_TARGET"

# ── 4. Vercel ─────────────────────────────────────────────────────────────────
echo ""
echo "── Vercel"
sync_to_env "VERCEL_TOKEN"      "$(get_var VERCEL_TOKEN)"
sync_to_env "VERCEL_ORG_ID"     "$(get_var VERCEL_ORG_ID)"
sync_to_env "VERCEL_PROJECT_ID" "$(get_var VERCEL_PROJECT_ID)"

# ── 5. N8N core ───────────────────────────────────────────────────────────────
echo ""
echo "── n8n Core"
sync_to_env "N8N_URL"                    "$(get_var N8N_PROD_URL)"
sync_to_env "N8N_BASE_URL"               "$(get_var N8N_BASE_URL)"
sync_to_env "N8N_PROD_API_KEY"           "$(get_var N8N_PROD_API_KEY)"
sync_to_env "N8N_EMAIL"                  "$(get_var N8N_EMAIL)"
sync_to_env "N8N_WEBHOOK_SECRET"         "$(get_var N8N_WEBHOOK_SECRET)"
sync_to_env "N8N_OBSERVATION_LOUNGE_WEBHOOK" "$(get_var N8N_OBSERVATION_LOUNGE_WEBHOOK)"
sync_to_env "N8N_FEDERATION_MISSION_WEBHOOK" "$(get_var N8N_FEDERATION_MISSION_WEBHOOK)"
sync_to_env "N8N_ANTI_HALLUCINATION_WEBHOOK" "$(get_var N8N_ANTI_HALLUCINATION_WEBHOOK)"
sync_to_env "N8N_ALEX_AI_UNIFIED_CREW_WEBHOOK" "$(get_var N8N_ALEX_AI_UNIFIED_CREW_WEBHOOK)"
sync_to_env "N8N_LLAMA_COLLABORATION_WEBHOOK" "$(get_var N8N_LLAMA_COLLABORATION_WEBHOOK)"

# ── 6. N8N crew member webhooks ───────────────────────────────────────────────
echo ""
echo "── n8n Crew Webhooks"
sync_to_env "N8N_CREW_CAPTAIN_PICARD_WEBHOOK"    "$(get_var N8N_CREW_CAPTAIN_PICARD_WEBHOOK)"
sync_to_env "N8N_CREW_COMMANDER_RIKER_WEBHOOK"   "$(get_var N8N_CREW_COMMANDER_RIKER_WEBHOOK)"
sync_to_env "N8N_CREW_COMMANDER_DATA_WEBHOOK"    "$(get_var N8N_CREW_COMMANDER_DATA_WEBHOOK)"
sync_to_env "N8N_CREW_GEORDI_LA_FORGE_WEBHOOK"   "$(get_var N8N_CREW_GEORDI_LA_FORGE_WEBHOOK)"
sync_to_env "N8N_CREW_WORF_WEBHOOK"              "$(get_var N8N_CREW_WORF_WEBHOOK)"
sync_to_env "N8N_CREW_DR_CRUSHER_WEBHOOK"        "$(get_var N8N_CREW_DR_CRUSHER_WEBHOOK)"
sync_to_env "N8N_CREW_COUNSELOR_TROI_WEBHOOK"    "$(get_var N8N_CREW_COUNSELOR_TROI_WEBHOOK)"
sync_to_env "N8N_CREW_QUARK_WEBHOOK"             "$(get_var N8N_CREW_QUARK_WEBHOOK)"
sync_to_env "N8N_CREW_CHIEF_OBRIEN_WEBHOOK"      "$(get_var N8N_CREW_CHIEF_OBRIEN_WEBHOOK)"
sync_to_env "N8N_CREW_UHURA_WEBHOOK"             "$(get_var N8N_CREW_UHURA_WEBHOOK)"

# ── 7. AI / LLM keys ─────────────────────────────────────────────────────────
echo ""
echo "── AI / LLM"
sync_to_env "LANGCHAIN_OPENAI_API_KEY" "$(get_var LANGCHAIN_OPENAI_API_KEY)"
sync_to_env "GEMINI_MODEL"             "$(get_var GEMINI_MODEL)"

# ── 8. Budget ─────────────────────────────────────────────────────────────────
echo ""
echo "── Budget"
sync_to_env "DAILY_BUDGET_USD"   "$(get_var DAILY_BUDGET_USD)"
sync_to_env "MONTHLY_BUDGET_USD" "$(get_var MONTHLY_BUDGET_USD)"

# ── 9. AWS ────────────────────────────────────────────────────────────────────
echo ""
echo "── AWS"
sync_to_env "AWS_REGION"  "$(get_var AWS_REGION)"
sync_to_env "AWS_PROFILE" "$(get_var AWS_PROFILE)"

# ── 10. Auth ──────────────────────────────────────────────────────────────────
echo ""
echo "── Auth"
sync_to_env "AUTHORIZED_USERS" "$(get_var AUTHORIZED_USERS)"

echo ""
echo "══════════════════════════════════════════════════════════════════"
echo "  Sync complete. Verify with: grep -v '^#' $ENV_FILE | grep -v '^$'"
echo "══════════════════════════════════════════════════════════════════"
