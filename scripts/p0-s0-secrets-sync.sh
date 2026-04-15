#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# p0-s0-secrets-sync.sh — Phase 0, Step 0: Sync local credentials → GitHub Secrets
#
# Sources credentials from .env (preferred) with .zshrc as fallback,
# syncs them to GitHub Actions secrets.
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
source "$SCRIPT_DIR/lib/crew-fail.sh"

STEP="p0-s0-secrets-sync"
step_header "PHASE 0 — CONVERGENCE" "Step 0: Sync Local Credentials → GitHub Secrets"

ENV_FILE="$ROOT/.env"
ZSHRC="$HOME/.zshrc"

# Keys to sync
SYNC_KEYS=(
  "OPENROUTER_API_KEY"
  "SUPABASE_URL"
  "SUPABASE_KEY"
  "REDIS_URL"
  "N8N_URL"
  "N8N_WEBHOOK_SECRET"
  "CREW_OBS_KEY"
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
)

# ── 1. Validate .env exists ───────────────────────────────────────────────────
if [[ ! -f "$ENV_FILE" ]]; then
  crew_fail \
    --step    "$STEP" \
    --persona "dr_crusher" \
    --tool    "health_check" \
    --tool-args '{"fix": true}' \
    --context ".env file missing — cannot sync what doesn't exist." \
    --error   "Run: bash scripts/p0-s1-env-check.sh to create .env first"
  exit 1
fi

# ── 2. Load values: .env takes precedence, .zshrc as fallback ─────────────────
echo "  Loading credentials..."
set -a; source "$ENV_FILE" 2>/dev/null || true; set +a

_zshrc_val() {
  local key="$1"
  grep -E "^export ${key}=" "$ZSHRC" 2>/dev/null \
    | sed -E "s/^export ${key}=[\"']?([^\"']+)[\"']?/\1/" \
    | tail -1 || echo ""
}

for key in "${SYNC_KEYS[@]}" "${OPTIONAL_KEYS[@]}"; do
  current="${!key:-}"
  if [[ -z "$current" ]]; then
    fallback="$(_zshrc_val "$key")"
    if [[ -n "$fallback" ]]; then
      export "$key"="$fallback"
      echo "  ↩  $key: .env empty, loaded from .zshrc"
    fi
  fi
done

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

REPO_INFO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || echo "unknown/unknown")
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
  if [[ -n "$val" ]] && ! grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
    echo "${key}=${val}" >> "$ENV_FILE"
  fi
done

phase_pass "$STEP"