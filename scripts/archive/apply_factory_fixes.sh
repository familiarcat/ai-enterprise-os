#!/bin/bash
# apply_factory_fixes.sh - Manually synchronizes the orchestrator and dependencies

PROJECT_ROOT="/Users/bradygeorgen/Dev/ai-enterprise-os"
ORCHESTRATOR="$PROJECT_ROOT/core/orchestrator.js"

echo "🛠️  Applying manual fixes to the Sovereign Factory..."

# 1. Verify pnpm installation
if ! command -v pnpm &> /dev/null; then
    echo "📦 Installing pnpm..."
    npm install -g pnpm
fi

# 1b. Clear invalid/empty package.json files that block pnpm
API_PKG="$PROJECT_ROOT/apps/api/package.json"
if [ -f "$API_PKG" ] && [ ! -s "$API_PKG" ]; then
    echo "🧹 Removing empty API package.json to unblock pnpm..."
    rm "$API_PKG"
fi

# 2. Update dependencies at root
echo "📥 Synchronizing root dependencies..."
pnpm add -w @supabase/supabase-js ioredis dotenv
pnpm add -Dw vitest

# 3. Ensure Lazy Loading logic is present in orchestrator
# This step checks if getMemorySystems exists, if not, it warns the user
# to apply the diff provided by Gemini.

# 3. Check for Supabase Placeholders
ZSHRC="/Users/bradygeorgen/.zshrc"
if grep -q "REPLACE_WITH_ACTUAL" "$ZSHRC" 2>/dev/null; then
    echo "⚠️  Supabase placeholders detected in ~/.zshrc"
    echo "   Running automated configuration..."
    bash "$PROJECT_ROOT/scripts/p0-s0-supabase-config.sh"
fi

# 4. Ensure Lazy Loading logic is present in orchestrator
if ! grep -q "getMemorySystems" "$ORCHESTRATOR"; then
    echo "⚠️  Lazy loading logic missing in $ORCHESTRATOR."
    echo "Please ensure the diff for core/orchestrator.js has been applied."
fi

# 4. Run backbone enforcement
echo "🚀 Enforcing project backbone..."
chmod +x "$PROJECT_ROOT/automate_structure.sh"
"$PROJECT_ROOT/automate_structure.sh" . master SovereignMaster

echo "✅ Manual fixes applied. Try running 'pnpm test' to verify."