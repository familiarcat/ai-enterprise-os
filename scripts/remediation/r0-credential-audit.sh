#!/usr/bin/env bash
# Phase R0: Credential Audit | Assigned: Lt. Worf
set -euo pipefail

echo "🛡️ Worf: Scanning for exposed credentials in project files..."

PATTERNS=("sk-or-v1-" "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" "AKIA" "SUPABASE_SERVICE_ROLE_KEY" "AWS_SECRET_ACCESS_KEY")
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

FOUND=0
for p in "${PATTERNS[@]}"; do
    MATCHES=$(grep -r "$p" "$ROOT_DIR" \
      --exclude-dir="node_modules" --exclude-dir=".git" --exclude-dir=".venv" \
      --exclude-dir="dist" --exclude-dir="out" --exclude-dir=".next" \
      --exclude-dir="versions" --exclude-dir="project analysis" \
      --exclude="orchestrator.js" \
      --exclude="r0-credential-audit.sh" \
      --exclude="PROJECT_ANALYSIS.md" \
      --exclude=".env" --exclude=".env.local" --exclude="*.env" \
      | grep -v ".env.example" || true)
    if [[ -n "$MATCHES" ]]; then
        echo "⚠️ WARNING: Potential leak of $p detected:"
        echo "$MATCHES"
        FOUND=1
    fi
done

if [ $FOUND -eq 0 ]; then
    echo "✅ Audit complete. No blocking dishonor found."
else
    echo "❌ Dishonorable credentials found. Rotate keys immediately."
    exit 1
fi