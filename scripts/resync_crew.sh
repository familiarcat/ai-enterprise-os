#!/bin/bash
# resync_crew.sh - Automates re-scraping and trait distillation for all crew members

# Ensure we are working from the project root
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MANIFEST_FILE="$PROJECT_ROOT/crew-manifest.js"
SCRAPER_TOOL="$PROJECT_ROOT/tools/memory_alpha_scraper.py"
TEMP_DIR=$(mktemp -d)
TEMP_MANIFEST="$TEMP_DIR/crew-manifest.tmp.json"

echo "🛠️  Starting Enterprise Crew Resync..."

if [ ! -f "$MANIFEST_FILE" ]; then
    echo "❌ Error: crew-manifest.js not found at $MANIFEST_FILE"
    exit 1
fi

# 1. Extract persona names from the JS manifest
# This handles both Array and Object export formats safely via node
echo "🔍 Reading manifest for active personas..."
PERSONAS=$(node -e "
    try {
        const manifest = require('$MANIFEST_FILE');
        const list = Array.isArray(manifest) ? manifest : Object.values(manifest);
        console.log(list.map(p => p.persona || p.name).join('\n'));
    } catch (e) {
        process.exit(1);
    }
")

if [ $? -ne 0 ] || [ -z "$PERSONAS" ]; then
    echo "❌ Error: Could not parse personas from $MANIFEST_FILE"
    exit 1
fi

echo "[" > "$TEMP_MANIFEST"
FIRST=true

# 2. Iterate and re-distill via memory_alpha_scraper.py
for PERSONA in $PERSONAS; do
    if [ "$FIRST" = false ]; then echo "," >> "$TEMP_MANIFEST"; fi
    
    echo "📡 Distilling traits for: $PERSONA..."
    # Payload for the Python scraper
    RESULT=$(echo "{\"persona_name\": \"$PERSONA\"}" | python3 "$SCRAPER_TOOL")
    
    if [[ $RESULT == *"\"success\": true"* ]]; then
        echo "$RESULT" >> "$TEMP_MANIFEST"
        echo "✅ Updated $PERSONA"
    else
        echo "⚠️  Failed to distill $PERSONA. Skipping..."
    fi
    FIRST=false
done

echo "]" >> "$TEMP_MANIFEST"

# 3. Finalize: Overwrite manifest as a JS module
echo "module.exports = $(cat "$TEMP_MANIFEST");" > "$MANIFEST_FILE"
echo "✨ Manifest updated. Run 'pnpm test' to verify crew alignment."
rm -rf "$TEMP_DIR"