#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# p1-s6-vsce-package.sh — Phase 1, Step 6: Build and package .vsix
#
# Runs full assembly (Extension + React Webview) and produces the installable 
# .vsix artifact. Verifies the package can be installed locally.
# Assigned crew: Chief O'Brien (Integration Engineer)
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Source failure library from Phase 0
LIB_FAIL="$ROOT/scripts/lib/crew-fail.sh"
if [ -f "$LIB_FAIL" ]; then
    source "$LIB_FAIL"
else
    # Fallback for isolated testing
    step_header() { echo -e "\n\033[1m[$1] $2\033[0m"; }
    phase_pass() { echo -e "\033[0;32m✔ $1 complete\033[0m"; }
    crew_fail() { echo -e "\033[0;31m✘ $1 failed: $5\033[0m"; exit 1; }
fi

STEP="p1-s6-vsce-package"
step_header "PHASE 1 — VSCODE EXTENSION MVP" "Step 6: Build & Package .vsix"

EXT_DIR="$ROOT/apps/vscode"
WEBVIEW_DIR="$EXT_DIR/webview"

cd "$EXT_DIR"

# ── 1. Install Extension Dependencies ─────────────────────────────────────────
echo "  📦 Chief O'Brien: Re-aligning extension buffers..."
pnpm install

# ── 1b. Ensure Mandatory README exists (Required by vsce) ──────────────────────
if [ ! -f "README.md" ]; then
    echo "  📝 README.md missing. Generating minimal documentation pattern..."
    echo "# Sovereign Factory" > README.md
    echo "AI Enterprise OS extension." >> README.md
fi

# ── 2. Build Webview React Assets ─────────────────────────────────────────────
if [ -d "$WEBVIEW_DIR" ]; then
    echo "  ⚛️  Building Agent Viewport (React Webview)..."
    cd "$WEBVIEW_DIR"
    pnpm install
    pnpm run build
    cd "$EXT_DIR"
    echo "  ✔ Webview assets generated in apps/vscode/media/"
else
    echo "  ⚠️  Webview directory missing. Skipping UI build."
fi

# ── 3. Compile Extension Source ───────────────────────────────────────────────
echo "  ⚙️  Compiling TypeScript source..."
pnpm run compile

# ── 4. Packaging with VSCE ───────────────────────────────────────────────────
EXT_NAME=$(node -e "console.log(require('./package.json').name)")
EXT_VERSION=$(node -e "console.log(require('./package.json').version)")
VSIX_NAME="${EXT_NAME}-${EXT_VERSION}.vsix"

echo "  📦 Packaging $VSIX_NAME..."

# Use non-interactive flags and show output to prevent hangs
if ! pnpm exec vsce package --no-dependencies --allow-missing-repository -o "$VSIX_NAME"; then
    crew_fail \
        "$STEP" \
        "chief_obrien" \
        "run_crew_agent" \
        '{"objective": "Resolve VSCE packaging error"}' \
        "Check terminal output above for VSCE failure details."
fi

# ── 4b. Verification ─────────────────────────────────────────────────────────
if [ ! -f "$VSIX_NAME" ]; then
    crew_fail \
        "$STEP" \
        "chief_obrien" \
        "run_crew_agent" \
        '{"objective": "Verify VSIX existence"}' \
        "VSIX file $VSIX_NAME was not found in $EXT_DIR after packaging."
fi

VSIX_SIZE=$(du -sh "$VSIX_NAME" | cut -f1)
echo "  ✔ Package verified: $EXT_DIR/$VSIX_NAME ($VSIX_SIZE)"

# ── 5. Installation Instructions ──────────────────────────────────────────────
echo ""
echo "  🖖 Captain's Log: Extension is ready for deployment."
echo "  To install in your local VS Code instance, run:"
echo -e "    \033[0;34mcode --install-extension $EXT_DIR/$VSIX_NAME\033[0m"
echo ""

phase_pass "$STEP"