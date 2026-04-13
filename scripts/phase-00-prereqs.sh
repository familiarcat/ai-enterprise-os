#!/bin/zsh
# phase-00-prereqs.sh - Validates tools and credentials
set -e

echo "🚀 Phase 0: Verifying Sovereign Factory Prereqs..."

# 1. Check for required CLI tools
command -v pnpm >/dev/null 2>&1 || { echo "❌ pnpm not found. Install via 'npm i -g pnpm'"; exit 1; }
command -v gh >/dev/null 2>&1 || { echo "❌ GitHub CLI (gh) not found."; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "❌ python3 not found."; exit 1; }

# 2. Validate GitHub Auth
if ! gh auth status >/dev/null 2>&1; then
    echo "❌ gh not authenticated. Run 'gh auth login'."
    exit 1
fi

# 3. Validate ~/.zshrc credentials
REQUIRED_VARS=("OPENROUTER_API_KEY" "SUPABASE_URL" "SUPABASE_KEY" "REDIS_URL")
for var in "${REQUIRED_VARS[@]}"; do
    # Portable indirect expansion to check if variable name stored in $var is empty
    if [ -z "$(eval "echo \$$var")" ]; then
        echo "⚠️  $var is missing in your current shell. Running setup_credentials.sh..."
        chmod +x ./scripts/setup_credentials.sh
        ./scripts/setup_credentials.sh
        exit 0 # setup_credentials.sh calls exec zsh, so we exit here.
    fi
done

# 4. Sync to GitHub Secrets immediately
echo "🛰️  Syncing local credentials to GitHub Secrets..."
chmod +x ./scripts/sync_secrets.sh
./scripts/sync_secrets.sh -e development

echo "✅ Phase 0 Complete: Environment is ready."