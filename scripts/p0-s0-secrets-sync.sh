#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# p0-s0-secrets-sync.sh — Phase 0, Step 0: Sync local credentials → GitHub Secrets
#
# Sources credentials from .env (preferred) with .zshrc as fallback,
# syncs them to GitHub Actions secrets, then dispatches Worf's security
# observation to the Observation Lounge.
#
# This is Step 0 — it runs before env-check (s1) because it ensures the
# CI/CD environment mirrors local state before any pipeline validation.
#
# Assigned crew: Lt. Worf (security gate) + Chief O'Brien (sync plumbing)
# MCP tool on failure: health_check
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
source "$SCRIPT_DIR/lib/crew-fail.sh"

STEP="p0-s0-secrets-sync"
step_header "PHASE 0 — CONVERGENCE" "Step 0: Sync Local Credentials → GitHub Secrets"

ENV_FILE="$ROOT/.env"
ZSHRC="$HOME/.zshrc"

# Keys to sync — expanded from the original sync_secrets.sh
SYNC_KEYS=(
  "OPENROUTER_API_KEY"
  "SUPABASE_URL"
  "SUPABASE_KEY"
  "REDIS_URL"
  "N8N_URL"
  "N8N_WEBHOOK_SECRET"
  "CREW_OBS_KEY"
)

# Optional model-tier overrides (sync if set locally)
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

# Fallback: read uncommented exports from .zshrc for any still-empty vars
_zshrc_val() {
  local key="$1"
  # Match: export KEY="value" or export KEY=value (no quotes)
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
SYNCED=()
MISSING=()
FAILED=()

for key in "${SYNC_KEYS[@]}"; do
  val="${!key:-}"
  if [[ -z "$val" ]]; then
    MISSING+=("$key")
    echo "  ⚠  $key — not set locally, skipping"
    continue
  fi
  if echo "$val" | gh secret set "$key" 2>/tmp/p0s0-secret-err.txt; then
    SYNCED+=("$key")
    echo "  ✔  $key — synced"
  else
    FAILED+=("$key: $(cat /tmp/p0s0-secret-err.txt | head -1)")
    echo "  ✗  $key — sync failed"
  fi
done

# ── 5. Sync optional secrets (silent skip if empty) ───────────────────────────
echo ""
echo "  Syncing optional model-routing secrets..."
for key in "${OPTIONAL_KEYS[@]}"; do
  val="${!key:-}"
  if [[ -n "$val" ]]; then
    echo "$val" | gh secret set "$key" 2>/dev/null && echo "  ✔  $key" || echo "  ⚠  $key — failed (non-fatal)"
  fi
done

# ── 6. Error if required secrets failed ──────────────────────────────────────
if [[ ${#FAILED[@]} -gt 0 ]]; then
  crew_fail \
    --step    "$STEP" \
    --persona "chief_obrien" \
    --tool    "run_crew_agent" \
    --tool-args '{"objective": "Diagnose GitHub secret sync failures — check IAM permissions and gh CLI auth scope", "agents": [{"persona": "Chief O'\''Brien"}, {"persona": "Lt. Worf"}]}' \
    --context "Some GitHub secrets failed to sync. This will cause CI/CD failures." \
    --error   "$(printf '%s\n' "${FAILED[@]}")"
  exit 1
fi

# ── 7. Summary ────────────────────────────────────────────────────────────────
echo ""
echo "  Sync results:"
echo "    Synced : ${#SYNCED[@]} secrets (${SYNCED[*]:-none})"
echo "    Missing: ${#MISSING[@]} secrets (${MISSING[*]:-none})"
echo "    Failed : ${#FAILED[@]} secrets"

# ── 8. Dispatch Worf's security observation to Observation Lounge ─────────────
echo ""
echo "  Dispatching Worf's security report to Observation Lounge..."
bash "$SCRIPT_DIR/lounge/worf-security-report.sh" "" "secrets-sync" 2>/dev/null || true

# ── 9. Update .env with any .zshrc values that were missing ───────────────────
# Only update keys that were empty in .env but found in .zshrc
echo ""
echo "  Reconciling .env with synced values..."
for key in "${SYNC_KEYS[@]}"; do
  val="${!key:-}"
  if [[ -n "$val" ]] && ! grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
    echo "${key}=${val}" >> "$ENV_FILE"
    echo "  ✔  Wrote $key to .env (was missing)"
  elif grep -q "^${key}=$" "$ENV_FILE" 2>/dev/null && [[ -n "$val" ]]; then
    # Key exists but value is empty — update it
    sed -i.bak "s|^${key}=.*|${key}=${val}|" "$ENV_FILE" && rm -f "${ENV_FILE}.bak"
    echo "  ✔  Updated empty $key in .env"
  fi
done

phase_pass "$STEP"
