#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# r8-mcp-scaffold.sh — Phase 2: Composable Cognitive Infrastructure
# Purpose: Implements the Probe's suggested MCP modules within the workspace
# ═══════════════════════════════════════════════════════════════════════════════
set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TARGET="$ROOT/packages/mcp-core"

echo "🖖 Commander Data: Scaffolding Composable MCP Core..."

mkdir -p "$TARGET/src"

# Initialize package.json for the new workspace package
cat <<EOF > "$TARGET/package.json"
{
  "name": "@sovereign/mcp-core",
  "version": "0.1.0",
  "private": true,
  "main": "dist/index.js",
  "types": "dist/index.d.ts"
}
EOF

echo "✅ MCP Core package initialized. Proceed to Type Migration."