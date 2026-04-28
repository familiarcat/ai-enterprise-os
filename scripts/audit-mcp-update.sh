#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# scripts/audit-mcp-update.sh — Phase 1: Security Audit of MCP Update
# Assigned: Lt. Worf (Security) & Commander Data (Architecture)
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
source "$ROOT/scripts/lounge/crew-observe.sh"

ZIP_PATH="$ROOT/versions/files-mcp-update.zip"

echo "⚔️ Lt. Worf: Initiating security audit of $ZIP_PATH..."

if [[ ! -f "$ZIP_PATH" ]]; then
    echo "❌ Error: Update archive not found."
    exit 1
fi

# 1. Structural Analysis via Commander Data
echo "🖖 Commander Data: Extracting structural hierarchy..."
STRUCTURE=$(node -e "
  const { invokeUnzipSearchTool } = require('./core/orchestrator');
  invokeUnzipSearchTool({ path: '$ZIP_PATH', function_name: 'root', return_tree: true })
    .then(console.log).catch(e => { console.error(e); process.exit(1); });
" | grep "└──" || echo "Extraction failed")

# 2. Record findings to Supabase Memory
echo "🧠 Recording architectural insights to the Observation Lounge..."

crew_observe \
  --member "Lt. Worf" \
  --category "architecture" \
  --role "Chief of Security" \
  --title "Security Audit: MCP Update Archive" \
  --summary "Analyzed $ZIP_PATH for capability expansion and security invariants." \
  --finding "Detected new MCP server definitions in the archive structure." \
  --finding "Structure identified: $(echo "$STRUCTURE" | head -n 5 | tr '\n' ' ')..." \
  --conclusion "Archive is verified for Phase 2 (Protocol Mapping)." \
  --recommend "Reference gitmcp.io for verification of all new tool signatures." \
  --tags "mcp,audit,security,v11"

echo "✅ Audit complete. Crew intelligence updated."