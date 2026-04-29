#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# scripts/remediate-analysis.sh — Sovereign Factory Analysis Remediation
#
# This script orchestrates the fixes for findings in AI_ENTERPRISE_OS_ANALYSIS.md
# ═══════════════════════════════════════════════════════════════════════════════
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🖖 Captain's Log: Commencing System Remediation..."

# 1. Fix CI/CD Location
if [ -f "$ROOT/main.yml" ]; then
    echo "🛡️ Lt. Worf: Relocating CI/CD tactical gate..."
    mkdir -p "$ROOT/.github/workflows"
    mv "$ROOT/main.yml" "$ROOT/.github/workflows/main.yml"
    echo "✅ main.yml moved to .github/workflows/"
fi

# 2. Path Sanitization (Drafting variables for setup_credentials)
echo "🔧 Geordi La Forge: Checking setup scripts for hardcoded paths..."
R0_SCRIPT="$SCRIPT_DIR/remediation/r0-sanitize-paths.sh"
if [ -f "$R0_SCRIPT" ]; then
    bash "$R0_SCRIPT"
else
    echo "⚠️  r0-sanitize-paths.sh not found at $R0_SCRIPT"
fi

# 3. Consolidate Setup Scripts
if [ -f "$ROOT/setup_credentials.sh" ] && [ -f "$ROOT/apps/api/setup_credentials.sh" ]; then
    echo "🧬 Commander Data: Consolidating duplicated setup scripts..."
    rm "$ROOT/setup_credentials.sh"
    echo "✅ Root-level setup_credentials.sh removed. Use apps/api/setup_credentials.sh"
fi

# 4. Verify Monorepo Config
echo "📐 Commander Data: Validating pnpm-workspace.yaml..."
if [ -f "$ROOT/pnpm-workspace.yaml" ]; then
    # Remove the non-existent packages/* entry found in analysis
    sed "/- 'packages\/\*'/d" "$ROOT/pnpm-workspace.yaml" > "$ROOT/pnpm-workspace.yaml.tmp"
    mv "$ROOT/pnpm-workspace.yaml.tmp" "$ROOT/pnpm-workspace.yaml"
    echo "✅ pnpm-workspace.yaml cleaned of dead references."
fi

echo "✨ Remediation complete. System integrity restored to NOMINAL status."
echo "Run: ./scripts/p0-run-all.sh to verify."