#!/bin/zsh
# Unified Credential Setup for AI Enterprise OS
# This script ensures your local environment has the required keys and paths.

ZSHRC="/Users/bradygeorgen/.zshrc"
PROJECT_PATH="/Users/bradygeorgen/Dev/ai-enterprise-os"
source "$PROJECT_PATH/scripts/lib/crew-utils.sh"

echo "--- Unifying AI Enterprise OS Credentials ---"

# Function to validate a credential before saving
validate_credential() {
    local name=$1
    local value=$2
    
    if [[ "$name" == "OPENROUTER_API_KEY" ]]; then
        echo "🔍 Validating OpenRouter API Key..."
        local status=$(curl -s -o /dev/null -w "%{http_code}" -L -H "Authorization: Bearer $value" https://openrouter.ai/api/v1/models)
        if [ "$status" = "200" ]; then
            return 0
        else
            echo "❌ Invalid OpenRouter API Key (HTTP Status: $status)"
            return 1
        fi
    fi
    if [[ "$name" == "SUPABASE_KEY" ]]; then
        if [[ ! "$value" =~ ^eyJ ]]; then
            echo "❌ Invalid Supabase Key format."
            echo "   Expected a JWT starting with 'eyJ' (Anon or Service Role key)."
            return 1
        fi
    fi
    if [[ "$name" == "SUPABASE_KEY" ]]; then
        if [[ ! "$value" =~ ^eyJ ]]; then
            echo "❌ Invalid Supabase Key format."
            echo "   Expected a JWT starting with 'eyJ' (Anon or Service Role key)."
            return 1
        fi
    fi
    if [[ "$name" == "PYTHON_BIN" ]]; then
        if [[ -x "$value" ]]; then
            return 0
        else
            echo "❌ Python binary not found or not executable: $value"
            return 1
        fi
    fi
    return 0
}

# Function to add env var if missing in ~/.zshrc
add_env_var() {
    local var_name=$1
    local existing; existing=$(get_credential "$var_name")
    
    # Even if it exists, validate the 'vitals' of the derived credential
    if [[ -n "$existing" ]] && ! validate_credential "$var_name" "$existing"; then
        echo "⚠️  Derived value for $var_name from ~/.zshrc failed validation."
        existing=""
    fi

    if [[ -z "$existing" ]]; then
        while true; do
            echo "Setting up $var_name. Please enter your value:"
            read -r var_value
            if validate_credential "$var_name" "$var_value"; then
                set_zshrc_var "$var_name" "$var_value"
                echo "✅ Added $var_name to $ZSHRC"
                break
            else
                read -r -p "⚠️ Validation failed. Save anyway? (y/n): " force
                [[ "$force" == "y" ]] && set_zshrc_var "$var_name" "$var_value" && break
            fi
        done
    else
        # Sync existing zshrc var to .env to ensure runtime consistency
        local env_file="$PROJECT_PATH/.env"
        [[ -f "$env_file" ]] && set_env_var "$var_name" "$existing" "$env_file"
        echo "ℹ️  $var_name already exists in $ZSHRC"
    fi
}

add_env_var "OPENROUTER_API_KEY"
add_env_var "SUPABASE_URL"
add_env_var "SUPABASE_KEY"
add_env_var "REDIS_URL"
add_env_var "PYTHON_BIN"

# Deployment Secrets (Vercel & AWS/EC2)
add_env_var "VERCEL_TOKEN"
add_env_var "VERCEL_ORG_ID"
add_env_var "VERCEL_PROJECT_ID"
add_env_var "VERCEL_ORG_ID_CIVIC"
add_env_var "VERCEL_PROJECT_ID_CIVIC"
add_env_var "EC2_HOST"
add_env_var "EC2_USER"
add_env_var "EC2_SSH_KEY"

# Add project tools to PATH for global agent accessibility
if [[ ":$PATH:" == *":$PROJECT_PATH/tools:"* ]]; then
    echo "ℹ️  $PROJECT_PATH/tools is already in your active system PATH."
fi

if ! grep -q "$PROJECT_PATH/tools" "$ZSHRC"; then
    printf "\n# AI Enterprise OS - Path\nexport PATH=\"\$PATH:%s/tools\"\n" "$PROJECT_PATH" >> "$ZSHRC"
    echo "✅ Added $PROJECT_PATH/tools to PATH in $ZSHRC"
else
    echo "ℹ️  $PROJECT_PATH/tools persistence is already configured in $ZSHRC"
fi

# Source the file internally so the sync script can access the new variables immediately
source "$ZSHRC"

echo "--- Local Setup Done. ---"

# Automatic sync hook
if git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
    echo "Detected git repository. Sync these credentials to GitHub Secrets now? (y/n)"
    read sync_choice
    if [[ "$sync_choice" == "y" ]]; then
        SYNC_SCRIPT="$PROJECT_PATH/scripts/phase-0/p0-s0-secrets-sync.sh"
        [[ -f "$SYNC_SCRIPT" ]] || SYNC_SCRIPT="$PROJECT_PATH/scripts/p0-s0-secrets-sync.sh"
        bash "$SYNC_SCRIPT"
    fi
fi

echo "🚀 Refreshing your shell session to apply changes..."
exec zsh