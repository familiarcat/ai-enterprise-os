#!/bin/zsh
# sync_secrets.sh - Automates the transfer of local credentials to GitHub Actions
# Inspired by openrouter-crew-platform deployment patterns.

ZSHRC="$HOME/.zshrc"
KEYS=("OPENROUTER_API_KEY" "SUPABASE_URL" "SUPABASE_KEY" "REDIS_URL")

ENV_NAME="Repository"
ENV_FLAG=""
while getopts "e:" opt; do
  case $opt in
    e) ENV_FLAG="--env $OPTARG"; ENV_NAME="$OPTARG" ;;
    *) ;;
  esac
done

if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) not found. Please install it: https://cli.github.com/"
    exit 1
fi

if ! gh auth status &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not authenticated. Please run 'gh auth login'."
    exit 1
fi

if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
    echo "❌ Not a git repository. This script must run within the project tree."
    exit 1
fi

echo "🛰️  Syncing local .zshrc credentials to GitHub $ENV_NAME Secrets..."

for KEY in "${KEYS[@]}"; do
    # Robust extraction: handles quotes, no quotes, and multiple occurrences
    # Uses sed to grab the value precisely from the start of the line export
    VALUE=$(grep -E "^export ${KEY}=" "$ZSHRC" | sed -E "s/^export ${KEY}=\"?([^\"]+)\"?/\1/" | tail -n 1)

    if [ -z "$VALUE" ]; then
        # Fallback for export KEY=VALUE (no quotes)
        VALUE=$(grep -E "^export ${KEY}=" "$ZSHRC" | cut -d'=' -f2)
    fi

    if [ -n "$VALUE" ]; then
        echo "📤 Uploading ${KEY}..."
        gh secret set "$KEY" --body "$VALUE" $ENV_FLAG
        if [ $? -eq 0 ]; then
            echo "✅ ${KEY} synchronized."
        else
            echo "❌ Failed to set ${KEY}."
        fi
    else
        echo "⚠️  ${KEY} not found in $ZSHRC. Skipping."
    fi
done

echo "✨ Synchronization complete. Your CI/CD environment now mirrors your local setup."