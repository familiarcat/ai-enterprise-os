#!/bin/zsh
# Unified Credential Setup for AI Enterprise OS
# This script ensures your local environment has the required keys and paths.

ZSHRC="$HOME/.zshrc"
PROJECT_PATH="/Users/bradygeorgen/Dev/ai-enterprise-os"

echo "--- Unifying AI Enterprise OS Credentials ---"

# Function to add env var if missing in ~/.zshrc
add_env_var() {
    local var_name=$1
    if ! grep -q "export $var_name=" "$ZSHRC"; then
        echo "Setting up $var_name. Please enter your value:"
        read var_value
        echo "\n# AI Enterprise OS - $var_name\nexport $var_name=\"$var_value\"" >> "$ZSHRC"
        echo "✅ Added $var_name to $ZSHRC"
    else
        echo "ℹ️  $var_name already exists in $ZSHRC"
    fi
}

add_env_var "OPENROUTER_API_KEY"
add_env_var "SUPABASE_URL"
add_env_var "SUPABASE_KEY"
add_env_var "REDIS_URL"

# Add project tools to PATH for global agent accessibility
if ! grep -q "$PROJECT_PATH/tools" "$ZSHRC"; then
    echo "\n# AI Enterprise OS - Path\nexport PATH=\"\$PATH:$PROJECT_PATH/tools\"" >> "$ZSHRC"
    echo "✅ Added $PROJECT_PATH/tools to PATH in $ZSHRC"
fi

echo "--- Done. Run 'source ~/.zshrc' to update your current session. ---"