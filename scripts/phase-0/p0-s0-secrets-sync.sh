#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# p0-s0-secrets-sync.sh — Phase 0, Step 0: Sync local credentials → GitHub Secrets
#
# Sources credentials from .env (preferred) with .zshrc as fallback,
# syncs them to GitHub Actions secrets.
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
source "$ROOT/scripts/lib/crew-fail.sh"
source "$ROOT/scripts/lib/crew-utils.sh"

STEP="p0-s0-secrets-sync"
step_header "PHASE 0 — CONVERGENCE" "Step 0: Sync Local Credentials → GitHub Secrets"

ENV_FILE="$ROOT/.env"
ZSHRC="$HOME/.zshrc"

# ── Step 0a: Unify .zshrc → .env before syncing to GitHub ────────────────────
echo "  Running env-sync to pull .zshrc credentials into .env..."
node "$ROOT/scripts/lib/env-sync.js" || echo "  ⚠ env-sync.js failed — continuing with existing .env"

# Keys to sync to GitHub Actions secrets
SYNC_KEYS=(
  "OPENROUTER_API_KEY"
  "SUPABASE_URL"
  "SUPABASE_KEY"
  "SUPABASE_SERVICE_ROLE_KEY"
  "SUPABASE_PUBLIC_KEY"
  "REDIS_URL"
  "N8N_URL"
  "N8N_BASE_URL"
  "N8N_PROD_API_KEY"
  "N8N_WEBHOOK_SECRET"
  "N8N_OBSERVATION_LOUNGE_WEBHOOK"
  "N8N_FEDERATION_MISSION_WEBHOOK"
  "N8N_CREW_CAPTAIN_PICARD_WEBHOOK"
  "N8N_CREW_COMMANDER_RIKER_WEBHOOK"
  "N8N_CREW_COMMANDER_DATA_WEBHOOK"
  "N8N_CREW_GEORDI_LA_FORGE_WEBHOOK"
  "N8N_CREW_WORF_WEBHOOK"
  "N8N_CREW_DR_CRUSHER_WEBHOOK"
  "N8N_CREW_COUNSELOR_TROI_WEBHOOK"
  "N8N_CREW_QUARK_WEBHOOK"
  "N8N_CREW_CHIEF_OBRIEN_WEBHOOK"
  "N8N_CREW_UHURA_WEBHOOK"
  "LANGCHAIN_OPENAI_API_KEY"
  "VERCEL_TOKEN"
  "VERCEL_ORG_ID"
  "VERCEL_PROJECT_ID"
  "VERCEL_ORG_ID_CIVIC"
  "VERCEL_PROJECT_ID_CIVIC"
  "AWS_REGION"
  "AWS_PROFILE"
  "EC2_HOST"
  "EC2_USER"
  "EC2_SSH_KEY"
  "CREW_OBS_KEY"
  "DAILY_BUDGET_USD"
  "MONTHLY_BUDGET_USD"
  "AUTHORIZED_USERS"
)

# Optional model-tier overrides
OPTIONAL_KEYS=(
  "MODEL_CREW_MANAGER"
  "MODEL_ARCHITECT"
  "MODEL_DEVELOPER"
  "MODEL_INTEGRATION"
  "MODEL_QA_AUDITOR"
  "MODEL_ANALYST"
  "MODEL_COST_OPT"
  "NEXT_PUBLIC_MCP_URL_PROD"
  "GEMINI_MODEL"
)

# ── 1. Validate .env exists ───────────────────────────────────────────────────
if [[ ! -f "$ENV_FILE" ]]; then
  echo "  ⚠ .env file missing — bootstrapping from ~/.zshrc..."
  touch "$ENV_FILE"
fi

# ── 2. Load values: .env takes precedence, .zshrc as fallback ─────────────────
echo "  Loading credentials..."
set -a; source "$ENV_FILE" 2>/dev/null || true; set +a

for key in "${SYNC_KEYS[@]}" "${OPTIONAL_KEYS[@]}"; do
  current="${!key:-}"
  if [[ -z "$current" ]]; then
    fallback="$(get_credential "$key")"
    if [[ -n "$fallback" ]]; then
      export "$key"="$fallback"
      echo "  ↩  $key: .env empty, loaded from .zshrc"
    fi

    # ── Robust Fallback: Direct ~/.zshrc parsing (Restoring previous effective logic) ──
    if [[ -z "${!key:-}" && -f "$ZSHRC" ]]; then
      # Match 'export KEY=VALUE', 'export KEY="VALUE"', or 'export KEY='VALUE''
      direct_val=$(grep -E "^export ${key}=" "$ZSHRC" | sed -E "s/^export ${key}=['\"]?([^'\"]+)['\"]?/\1/" | tail -n 1)
      if [[ -n "$direct_val" ]]; then
        export "$key"="$direct_val"
        echo "  ✔  $key: Extracted from $ZSHRC via regex fallback"
      fi
    fi
  fi
done

# ── 4. Auto-discover Vercel Project/Org IDs ───────────────────────────────────
echo ""
echo "  Auto-discovering Vercel Project/Org IDs..."
if [[ -n "${VERCEL_TOKEN:-}" ]]; then
  if ! command -v vercel &>/dev/null; then
    echo "  Installing Vercel CLI..."
    npm install -g vercel
  fi

  if command -v vercel &>/dev/null; then
    # Navigate to the dashboard app directory
    cd "$ROOT/apps/dashboard" || { echo "Error: apps/dashboard not found."; exit 1; }
    
    # Link the project if not already linked
    # Use VERCEL_TOKEN for non-interactive linking
    if [[ ! -f ".vercel/project.json" ]]; then
      echo "  Linking Vercel project for apps/dashboard..."
      # Use `vercel link --yes` for non-interactive linking
      # VERCEL_TOKEN is picked up automatically by the CLI
      if ! vercel link --yes > /dev/null 2>&1; then
        echo "  ⚠️ Vercel project linking failed. Ensure VERCEL_TOKEN is valid and project exists."
      fi
    fi

    if [[ -f ".vercel/project.json" ]]; then
      ORG_ID=$(jq -r '.orgId' .vercel/project.json 2>/dev/null || true)
      PROJECT_ID=$(jq -r '.projectId' .vercel/project.json 2>/dev/null || true)

      if [[ -n "$ORG_ID" && -n "$PROJECT_ID" ]]; then
        export VERCEL_ORG_ID="$ORG_ID"
        export VERCEL_PROJECT_ID="$PROJECT_ID"
        echo "  ✔ Vercel Org ID: $VERCEL_ORG_ID"
        echo "  ✔ Vercel Project ID: $VERCEL_PROJECT_ID"
        set_env_var "VERCEL_ORG_ID" "$VERCEL_ORG_ID" "$ENV_FILE"
        set_env_var "VERCEL_PROJECT_ID" "$VERCEL_PROJECT_ID" "$ENV_FILE"
      else
        echo "  ⚠️ Could not extract Vercel Org ID or Project ID from .vercel/project.json."
      fi
    else
      echo "  ⚠️ .vercel/project.json not found after linking attempt."
    fi
    cd "$ROOT" # Go back to root
  else
    echo "  ⚠️ Vercel CLI not installed or not in PATH. Cannot auto-discover Vercel IDs."
  fi
else
  echo "  ⚠️ VERCEL_TOKEN not set. Cannot auto-discover Vercel IDs."
fi

# ── 3. Validate gh CLI ────────────────────────────────────────────────────────
echo ""
echo "  Validating GitHub CLI..."
if ! command -v gh &>/dev/null; then
  crew_fail \
    --step    "$STEP" \
    --persona "chief_obrien" \
    --tool    "health_check" \
    --tool-args '{"fix": false}' \
    --context "GitHub CLI (gh) not found. It is required to set GitHub Actions secrets." \
    --error   "gh: command not found — install from https://cli.github.com/"
  exit 1
fi

if ! gh auth status &>/dev/null 2>&1; then
  crew_fail \
    --step    "$STEP" \
    --persona "chief_obrien" \
    --tool    "health_check" \
    --tool-args '{"fix": false}' \
    --context "GitHub CLI is not authenticated. Secrets cannot be synced without auth." \
    --error   "gh auth status failed — run: gh auth login"
  exit 1
fi

REPO_INFO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || echo "unknown/unknown") # This line was already present, but its position relative to the new section is important.
echo "  ✔  GitHub CLI authenticated — repo: $REPO_INFO"

# ── 4. Sync required secrets ──────────────────────────────────────────────────
echo ""
echo "  Syncing required secrets to GitHub Actions..."
FAILED=()
for key in "${SYNC_KEYS[@]}"; do
  val="${!key:-}"
  if [[ -z "$val" ]]; then continue; fi
  if ! echo "$val" | gh secret set "$key" 2>/dev/null; then
    FAILED+=("$key")
  fi
done

if [[ ${#FAILED[@]} -gt 0 ]]; then
  crew_fail \
    --step    "$STEP" \
    --persona "chief_obrien" \
    --tool    "run_crew_agent" \
    --tool-args '{"objective": "Diagnose GitHub secret sync failures", "agents": [{"persona": "Chief O'\''Brien"}]}' \
    --context "Some GitHub secrets failed to sync." \
    --error   "$(printf '%s\n' "${FAILED[@]}")"
  exit 1
fi

# ── 9. Reconcile .env ─────────────────────────────────────────────────────────
for key in "${SYNC_KEYS[@]}"; do
  val="${!key:-}"
  if [[ -n "$val" ]]; then
    set_env_var "$key" "$val" "$ENV_FILE"
  fi
done

phase_pass "$STEP"