#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# p0-s0-supabase-config.sh — Phase 0, Step 0: Supabase Credential Automation
#
# Automates the injection of Supabase keys into ~/.zshrc and synchronizes them
# to the project environment.
# Assigned crew: Lt. Uhura (comms/integration) + Chief O'Brien (sync).
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
source "$ROOT/scripts/lib/crew-fail.sh"
source "$ROOT/scripts/lib/crew-utils.sh"

ZSHRC="${HOME}/.zshrc"
ENV_FILE="$ROOT/.env"
STEP="p0-s0-supabase-config"
step_header "PHASE 0" "Supabase Configuration Automation"

echo "  This script will update your Supabase credentials."
echo "  You can find these in the Supabase Dashboard -> Settings -> API."
echo ""

# Use existing env vars if present (CI mode), otherwise prompt (Local mode)
SUPA_URL="${SUPABASE_URL:-}"
PUB_KEY="${SUPABASE_PUBLIC_KEY:-}"
SR_KEY="${SUPABASE_SERVICE_ROLE_KEY:-$SUPABASE_KEY}"

if [[ -z "$SUPA_URL" || -z "$PUB_KEY" || -z "$SR_KEY" ]]; then
  if [[ "${CI:-false}" == "true" ]]; then
    echo "  ✗ Error: Missing Supabase secrets in CI environment."
    exit 1
  fi
  read -p "  Enter Supabase Project URL (https://xxx.supabase.co): " SUPA_URL
  read -p "  Enter Supabase Public Key (formerly anon): " PUB_KEY
  read -p "  Enter Supabase Service Role Key (secret): " SR_KEY
fi

if [[ -z "$SUPA_URL" || -z "$PUB_KEY" || -z "$SR_KEY" ]]; then
  echo "  ✗ Error: Both keys are required."
  exit 1
fi

if [[ ! "$PUB_KEY" =~ ^eyJ.* ]]; then
  echo "  ✗ Error: Public Key must be a JWT (starting with eyJ)."
  exit 1
fi

if [[ ! "$SR_KEY" =~ ^eyJ.* ]]; then
  echo "  ✗ Error: Service Role Key must be a JWT (starting with eyJ)."
  exit 1
fi

echo ""
echo "  Injecting keys into $ZSHRC ..."

# Use robust utility to ensure variables exist and are updated
set_zshrc_var "SUPABASE_URL"              "$SUPA_URL"
set_zshrc_var "SUPABASE_PUBLIC_KEY"       "$PUB_KEY"
set_zshrc_var "SUPABASE_SERVICE_ROLE_KEY" "$SR_KEY"
set_zshrc_var "SUPABASE_KEY"              "$SR_KEY"

# Force update the local .env to prevent overrides from legacy values
set_env_var "SUPABASE_URL" "$SUPA_URL" "$ENV_FILE"
set_env_var "SUPABASE_KEY" "$SR_KEY" "$ENV_FILE"

# Source the updated .env into the current shell for immediate use
set -a; source "$ENV_FILE" 2>/dev/null || true; set +a

echo "  ✔ Keys updated in ~/.zshrc"

echo "  Synchronizing to local .env and GitHub Secrets..."
# Leverage the existing secrets-sync script to propagate the new keys
bash "$SCRIPT_DIR/p0-s0-secrets-sync.sh"

echo ""
echo "  Verifying connectivity..."
# Run the Supabase reachability check
if bash "$SCRIPT_DIR/p0-s3-supabase-check.sh"; then
  echo ""
  echo "  ✔ Configuration Complete. All systems nominal."
  echo "  Please run 'source ~/.zshrc' in your other terminal windows."
else
  echo ""
  echo "  ✗ Verification failed. Please check the keys and try again."
  exit 1
fi

phase_pass "$STEP"