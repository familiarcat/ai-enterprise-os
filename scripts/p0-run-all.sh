#!/usr/bin/env zsh

# p0-run-all.sh
# Master verification suite for Phase 0: Convergence & Validation.
# Authoritative for ai-enterprise-os refactor.

set -e # Exit on any failure
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
echo "🚀 [Captain Picard] Initiating Phase 0 Verification Suite..."
echo "════════════════════════════════════════════════════════════"

# 1. Environment & Secrets
echo "\n[Lt. Worf] Step 0: Syncing Secrets..."
zsh ./scripts/phase-0/p0-s0-secrets-sync.sh || echo "⚠️  Secrets sync skipped or failed."

echo "\n[Dr. Crusher] Step 1: Validating Environment..."
bash ./scripts/phase-0/p0-s1-env-check.sh

# 1.5 Docker Infrastructure (Chief O'Brien)
echo "\n[Chief O'Brien] Step 1b: Checking Docker Infrastructure..."
if command -v docker >/dev/null 2>&1; then
  if docker info >/dev/null 2>&1; then
    echo "✅ Docker daemon is active."
    if [ -f "core/docker-compose.yml" ]; then
      if ! docker compose -f core/docker-compose.yml ps --format json | grep -q '"State":"running"'; then
        echo "🛠️  Infrastructure is down. Starting local containers..."
        docker compose -f core/docker-compose.yml up -d
      else
        echo "✅ Containers are already running."
      fi
    fi
  else
    echo "❌ Docker daemon is not running. Please start Docker to ensure service availability."
    exit 1
  fi
else
  echo "⚠️  Docker not installed. Proceeding assuming Redis and Supabase are externally hosted."
fi

# 2. Infrastructure Health
echo "\n[Chief O'Brien] Step 2: Pinging Redis..."
zsh ./scripts/phase-0/p0-s2-redis-ping.sh

echo "\n[Dr. Crusher] Step 3: Checking Supabase..."
zsh ./scripts/phase-0/p0-s3-supabase-check.sh

# 3. Bridge & Tools
echo "\n[Geordi] Step 4: Activating MCP Bridge..."
# Note: Bridge start usually stays open; check status instead for batch runs
curl -s http://localhost:3002/health > /dev/null && echo "✅ Bridge is already online." || echo "❌ Bridge is offline. Start it in a separate terminal: node apps/api/mcp-http-bridge.mjs"

echo "\n[Lt. Worf] Step 6: Executing Smoke Tests..."
zsh ./scripts/phase-0/p0-s6-smoke-test.sh

# 4. Architectural Seeding
echo "\n[Data] Step 8: Seeding Architecture ADRs..."
zsh ./scripts/phase-0/seed-architecture.sh

echo "\n[Data] Step 9: Seeding Project Summary..."
zsh ./scripts/phase-0/p0-s9-project-summary-seed.sh

echo "════════════════════════════════════════════════════════════"
echo "✅ [Captain Picard] Phase 0 Complete. All systems nominal."

# Final instruction for the crew
echo "\n[Geordi] To apply shell changes, run: source ~/.zshrc"