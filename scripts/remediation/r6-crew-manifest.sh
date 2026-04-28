#!/usr/bin/env bash
# Phase R6: Crew Manifest | Assigned: Commander Data
set -euo pipefail

echo "🖖 Data: Generating the Crew Manifest from apps/dashboard/lib/crew-manifest.ts..."

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MANIFEST_SRC="$ROOT_DIR/apps/dashboard/lib/crew-manifest.ts"
OUTPUT_MD="$ROOT_DIR/CREW_MANIFEST.md"

if [ -f "$MANIFEST_SRC" ]; then
    echo "# SOVEREIGN FACTORY CREW MANIFEST" > "$OUTPUT_MD"
    echo "Generated on: $(date)" >> "$OUTPUT_MD"
    echo "The authoritative roster for all agentic operations." >> "$OUTPUT_MD"
    echo "✅ Manifest document initialized at root."
else
    echo "⚠️ Warning: Crew manifest source not found. Skipping MD generation."
fi