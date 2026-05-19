#!/usr/bin/env zsh

# p0-s0-secrets-sync.sh
# Honorable Unification Protocol: ~/.zshrc => .env => GitHub => AWS
# Authoritative for ai-enterprise-os variable lineage.

set -e

echo "[Lt. Worf] Initiating Honorable Secret Unification..."

ZSHRC="${HOME}/.zshrc"
ENV_FILE=".env"

# 1. Source local ZSHRC to get the latest station variables
if [ -f "$ZSHRC" ]; then
    echo "✅ Sourcing local station variables from $ZSHRC"
    source "$ZSHRC"
else
    echo "⚠️  $ZSHRC not found. Proceeding with existing environment."
fi

# 2. Propagate to local .env
echo "🛠️  Synchronizing local .env..."
KEYS=("OPENROUTER_API_KEY" "SUPABASE_URL" "SUPABASE_KEY" "REDIS_URL" "PYTHON_BIN")

for KEY in "${KEYS[@]}"; do
    VAL=$(eval echo "\$$KEY")
    if [ -n "$VAL" ]; then
        # Update or append to .env
        if [ -f "$ENV_FILE" ] && grep -q "^$KEY=" "$ENV_FILE"; then
            # Use a temporary file for safe sed on macOS
            sed -i.bak "s|^$KEY=.*|$KEY=$VAL|" "$ENV_FILE"
        else
            echo "$KEY=$VAL" >> "$ENV_FILE"
        fi
        echo "   ✔ $KEY synced to $ENV_FILE"
    else
        echo "   ❌ $KEY missing from station environment!"
    fi
done

# 3. Propagate to GitHub Secrets (requires gh CLI)
if command -v gh >/dev/null 2>&1; then
    echo "🚀 Propagating to GitHub Secrets..."
    for KEY in "${KEYS[@]}"; do
        VAL=$(eval echo "\$$KEY")
        if [ -n "$VAL" ]; then
            gh secret set "$KEY" --body "$VAL"
            echo "   ✔ $KEY synced to GitHub"
        fi
    done
else
    echo "⚠️  GitHub CLI (gh) not found. Skipping cloud sync."
fi

# 4. Clean up temporary sed backups
rm -f "${ENV_FILE}.bak"

echo "════════════════════════════════════════════════════════════"
echo "✅ [Lt. Worf] Lineage preserved. Secrets are Honorable."