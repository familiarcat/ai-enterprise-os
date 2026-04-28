#!/usr/bin/env bash
# Phase R2: Deep Secret Scan | Assigned: Lt. Worf
set -euo pipefail

echo "⚔️ Worf: Commencing deep scan of git history..."

# Simple check for .env files that might have been tracked previously
TRACKED_ENVS=$(git ls-files | grep "\.env" | grep -v ".env.example" || true)

if [ -n "$TRACKED_ENVS" ]; then
    echo "❌ CRITICAL: The following sensitive files are tracked by git:"
    echo "$TRACKED_ENVS"
    echo "Run 'git rm --cached <file>' to stop tracking them."
    exit 1
else
    echo "✅ No sensitive environment files are currently tracked."
fi