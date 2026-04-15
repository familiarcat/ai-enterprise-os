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
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
source "$SCRIPT_DIR/lib/crew-fail.sh"

ZSHRC="/Users/bradygeorgen/.zshrc"
STEP="p0-s0-supabase-config"
step_header "PHASE 0" "Supabase Configuration Automation"

echo "  This script will update your Supabase credentials."
echo "  You can find these in the Supabase Dashboard -> Settings -> API."
echo ""

read -p "  Enter Supabase Public Key (formerly anon): " PUB_KEY
read -p "  Enter Supabase Service Role Key (secret): " SR_KEY

if [[ -z "$PUB_KEY" || -z "$SR_KEY" ]]; then
  echo "  ✗ Error: Both keys are required."
  exit 1
fi

echo ""
echo "  Injecting keys into $ZSHRC ..."

# Replace placeholders or existing keys
sed -i '' "s/export SUPABASE_PUBLIC_KEY=.*/export SUPABASE_PUBLIC_KEY=\"$PUB_KEY\"/" "$ZSHRC"
sed -i '' "s/export SUPABASE_SERVICE_ROLE_KEY=.*/export SUPABASE_SERVICE_ROLE_KEY=\"$SR_KEY\"/" "$ZSHRC"

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