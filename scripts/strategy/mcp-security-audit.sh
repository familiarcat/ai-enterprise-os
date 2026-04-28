#!/usr/bin/env bash
# mcp-security-audit.sh | Assigned: Lt. Worf
# Purpose: Audits the registry.json and enforces security status.

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$ROOT"

echo "⚔️ Worf: Commencing deep scan of MCP registry..."

REGISTRY="$ROOT/registry.json"

if [[ ! -f "$REGISTRY" ]]; then
    echo "⚠️ Warning: registry.json not found. Creating default empty registry..."
    echo "[]" > "$REGISTRY"
fi

# Use the orchestrator's Worf logic to sign off on the registry
node -e "
const fs = require('fs');
const path = require('path');
const { listAvailableMCPs } = require('./core/orchestrator');

async function runAudit() {
  console.log('  🔍 Scanning tool manifests...');
  const audited = await listAvailableMCPs();
  if (audited.error) { console.error('❌ ' + audited.error); process.exit(1); }
  
  fs.writeFileSync('$REGISTRY', JSON.stringify(audited, null, 2));
  const secureCount = audited.filter(t => t.security_status === 'VERIFIED / SECURE').length;
  console.log('  🛡️ Security Audit Complete: ' + secureCount + ' tools verified.');
}
runAudit();
"

echo "✅ Registry honor verified. Security gate closed."