#!/bin/zsh
# verify_health.sh - Comprehensive health check for AI Enterprise OS

echo "🔍 Starting Sovereign Factory Health Check..."
FAILED=0

check_file() {
    if [ ! -f "$1" ]; then
        echo "❌ Missing file: $1"
        FAILED=1
    else
        echo "✅ Found: $1"
    fi
}

check_json() {
    if ! node -e "JSON.parse(require('fs').readFileSync('$1', 'utf8'))" >/dev/null 2>&1; then
        echo "❌ Invalid JSON syntax: $1"
        FAILED=1
    else
        echo "✅ Valid JSON: $1"
    fi
}

echo "\n--- 1. Infrastructure Check ---"
check_file "automate_structure.sh"
check_file "core/orchestrator.js"
check_file "tools/unzip_search_tool.py"

echo "\n--- 2. Configuration Integrity ---"
check_json "package.json"
check_json "apps/api/package.json"
check_json "packages/shared/package.json"

echo "\n--- 3. Environment Context ---"
for var in OPENROUTER_API_KEY SUPABASE_URL SUPABASE_KEY REDIS_URL; do
    if [ -z "$(eval "echo \$$var")" ]; then
        echo "⚠️  Missing Env Var: $var"
        FAILED=1
    else
        echo "✅ Env Var Set: $var"
    fi
done

echo "\n--- 4. Connectivity Check ---"
if [ -n "$REDIS_URL" ]; then
    if node -e "require('ioredis').newRedis = require('ioredis'); const r = new (require('ioredis'))('$REDIS_URL', { connectTimeout: 2000, maxRetriesPerRequest: 0 }); r.on('error', () => {}); r.ping().then(() => process.exit(0)).catch(() => process.exit(1)); setTimeout(() => process.exit(1), 2500);" >/dev/null 2>&1; then
        echo "✅ Redis Server: Reachable"
    else
        echo "❌ Redis Server: Unreachable"
        FAILED=1
    fi
fi

if [ -n "$SUPABASE_URL" ] && [ -n "$SUPABASE_KEY" ]; then
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "apikey: $SUPABASE_KEY" "$SUPABASE_URL/rest/v1/")
    if [ "$STATUS" = "200" ] || [ "$STATUS" = "302" ]; then
        echo "✅ Supabase Server: Reachable"
    else
        echo "❌ Supabase Server: Unreachable (Status: $STATUS)"
        FAILED=1
    fi
fi

if [ $FAILED -eq 0 ]; then
    echo "\n✨ All systems nominal. The Factory is ready for missions."
else
    echo "\nHW ❌ Health check failed. Please review the errors above."
    exit 1
fi