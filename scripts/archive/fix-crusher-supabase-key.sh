#!/usr/bin/env bash
# fix-crusher-supabase-key.sh | Assigned: Dr. Beverly Crusher
# Purpose: Corrects Supabase key format from Management Secret to Service Role JWT.

set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
source "$ROOT/scripts/lib/crew-utils.sh"

echo "⚕️ Crusher: Diagnosing Supabase connection health..."
ENV_FILE="$ROOT/.env"

CURRENT_KEY=$(grep "^SUPABASE_KEY=" "$ENV_FILE" | cut -d'=' -f2- || echo "")

if [[ "$CURRENT_KEY" =~ ^sb_secret_ ]]; then
    echo "⚠️  Diagnosis: Found Management API Key (sb_secret_...). Need Service Role JWT (eyJ...)."
    ZSH_KEY="$(get_credential 'SUPABASE_SERVICE_ROLE_KEY')"
    
    if [[ "$ZSH_KEY" =~ ^eyJ ]]; then
        echo "✅ Found valid JWT in ~/.zshrc. Synchronizing..."
        set_env_var "SUPABASE_KEY" "$ZSH_KEY" "$ENV_FILE"
    else
        echo "❌ Valid key not found in ~/.zshrc. Please paste your 'service_role' key (starting with 'eyJ'):"
        read -r NEW_KEY
        if [[ "$NEW_KEY" =~ ^eyJ ]]; then
            set_env_var "SUPABASE_KEY" "$NEW_KEY" "$ENV_FILE"
            set_zshrc_var "SUPABASE_SERVICE_ROLE_KEY" "$NEW_KEY"
        else
            echo "❌ Invalid format. Still not a JWT."
            exit 1
        fi
    fi
    echo "✓ SUPABASE_KEY is now valid (JWT format)"
else
    echo "✅ Key format appears correct (starts with 'eyJ')."
fi

echo "🧪 Running health check..."
if bash "$ROOT/scripts/p0-s3-supabase-check.sh"; then
    echo "✓ p0-s3-supabase-check PASSED"
else
    exit 1
fi