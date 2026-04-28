#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# scripts/deploy-pre-flight.sh — Prepare local stack for AWS/CI-CD deployment
# ═══════════════════════════════════════════════════════════════════════════════
set -e

echo "🚀 Starting Deployment Pre-Flight..."

# 1. Credential Check
echo "🔐 Validating local credentials..."
zsh ./setup_credentials.sh --non-interactive

# 2. Seed Architectural Memory
echo "🧠 Seeding architectural context into Supabase..."
bash ./scripts/seed-architecture.sh

# 3. Run Integration Health Check (Assigned: Chief O'Brien)
echo "⚙️  Running Chief O'Brien's integration audit..."
bash ./scripts/lounge/obrien-integration-report.sh --context "pre-deploy"

# 4. Run Security Audit (Assigned: Lt. Worf)
echo "⚔️  Running Lt. Worf's security gate..."
bash ./scripts/lounge/worf-security-report.sh --context "pre-deploy"

# 5. Final Registry Check
echo "🛡️  Verifying MCP Tool Registry..."
bash ./scripts/strategy/mcp-security-audit.sh

echo ""
echo "✅ Local pre-flight complete. The system is ready for remote deployment."
echo "🔗 Next Step: Ensure 'openrouter-crew-platform' is ready to receive secrets."
echo "   Run: bash scripts/p0-s0-secrets-sync.sh"
echo "   Then: git push origin main"
echo "   (This will trigger the Worf Security Audit GitHub Action)"