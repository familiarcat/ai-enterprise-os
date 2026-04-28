#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# scripts/local-view.sh — View full system state locally via Commander Data
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🖖 Commander Data: Initiating local system state visualization..."

# 1. Ensure Bridge is running
if ! curl -s http://localhost:3002/health > /dev/null; then
  echo "📡 Bridge is offline. Starting Bridge..."
  bash "$ROOT/scripts/phase-0/p0-s4-bridge-start.sh"
elif [[ "${RESTART_BRIDGE:-false}" == "true" ]]; then
  echo "♻️ Restarting Bridge to apply changes..."
  pkill -f "node apps/api/mcp-http-bridge.mjs" || true
  bash "$ROOT/scripts/phase-0/p0-s4-bridge-start.sh"
fi

# 2. Execute Sensor Sweep via MCP Tool
echo "🔍 Executing Sensors Sweep..."
RESULT=$(curl -s -X POST \
  "http://localhost:3002/messages?sessionId=local-view-$(date +%s)" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"sensor_sweep","arguments":{}}}')

echo ""
echo "✨ SYSTEM STATE REPORT ✨"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [[ -z "$RESULT" ]]; then
  echo "❌ Error: Bridge returned no response."
  exit 1
fi

node -e "
  const data = process.argv[1];
  try {
    const json = JSON.parse(data);
    if (json.error) throw new Error('BRIDGE: ' + json.error.message);
    if (!json.result || !json.result.content) throw new Error('Malformed bridge response');
    
    const r = JSON.parse(json.result.content[0].text);
    console.log('STATUS:', r.status || 'UNKNOWN');
    if (r.git) {
        console.log('GIT:', (r.git.status || 'Clean').replace(/\n/g, ' '));
        if (r.git.violations && r.git.violations.length) {
          console.log('⚠️  SECURITY VIOLATIONS DETECTED BY WORF:');
          r.git.violations.forEach(v => console.log(`   - ${v.file}: ${v.pattern}`));
        }
    }
      console.log('\n--- DOMAINS SCANNED ---\n', (r.active_domains || []).join(', ') || 'None');
  } catch (e) {
    console.error('❌ Error parsing report:', e.message);
    process.exit(1);
  }
" "$RESULT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Sweep complete. If status is NOMINAL, proceed to AWS Deployment."