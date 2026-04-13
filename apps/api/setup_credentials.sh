#!/bin/zsh
# Unified Credential Setup for AI Enterprise OS
# This script ensures your local environment has the required keys and paths.

ZSHRC="$HOME/.zshrc"
PROJECT_PATH="/Users/bradygeorgen/Dev/ai-enterprise-os"

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
    return 0
}

# Function to add env var if missing in ~/.zshrc
add_env_var() {
    local var_name=$1
    if ! grep -q "export $var_name=" "$ZSHRC"; then
        while true; do
            echo "Setting up $var_name. Please enter your value:"
            read -r var_value
            if validate_credential "$var_name" "$var_value"; then
                printf "\n# AI Enterprise OS - %s\nexport %s=\"%s\"\n" "$var_name" "$var_name" "$var_value" >> "$ZSHRC"
                echo "✅ Added $var_name to $ZSHRC"
                break
            else
                echo "⚠️  Validation failed for $var_name. Save anyway? (y/n)"
                read -r force
                if [[ "$force" == "y" ]]; then
                    printf "\n# AI Enterprise OS - %s\nexport %s=\"%s\"\n" "$var_name" "$var_name" "$var_value" >> "$ZSHRC"
                    break
                fi
            fi
        done
    else
        echo "ℹ️  $var_name already exists in $ZSHRC"
    fi
}

add_env_var "OPENROUTER_API_KEY"
add_env_var "SUPABASE_URL"
add_env_var "SUPABASE_KEY"
add_env_var "REDIS_URL"

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
        zsh "$PROJECT_PATH/scripts/sync_secrets.sh"
    fi
fi

echo "🚀 Refreshing your shell session to apply changes..."
exec zsh