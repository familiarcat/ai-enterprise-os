#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# p1-s5-vsce-package.sh — Phase 1, Step 5: Build and package .vsix
#
# Runs esbuild to compile the extension, then vsce package to produce the
# installable .vsix artifact. Verifies the package can be installed locally.
# Assigned crew: Chief O'Brien (integration engineer, packages and ships it).
# MCP tool on failure: run_crew_agent
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
source "$ROOT/scripts/lib/crew-fail.sh"

STEP="p1-s5-vsce-package"
step_header "PHASE 1 — VSCODE EXTENSION MVP" "Step 5: Build & Package .vsix"

EXT_DIR="$ROOT/apps/vscode"
WEBVIEW_DIR="$EXT_DIR/webview"
PKG="$EXT_DIR/package.json"

if [[ ! -f "$PKG" ]]; then
  crew_fail \
    --step    "$STEP" \
    --persona "chief_obrien" \
    --tool    "run_crew_agent" \
    --tool-args '{"objective": "Run p1-s1-vscode-bootstrap.sh to create the extension package.json before packaging", "agents": [{"persona": "Chief O'\''Brien"}]}' \
    --context "apps/vscode/package.json does not exist. Run p1-s1-vscode-bootstrap.sh first." \
    --error   "File not found: $PKG"
  exit 1
fi

EXT_NAME=$(node -e "console.log(require('$PKG').name)" 2>/dev/null || echo "sovereign-factory")
EXT_VERSION=$(node -e "console.log(require('$PKG').version)" 2>/dev/null || echo "0.1.0")

cd "$EXT_DIR"

# ── Install deps ──────────────────────────────────────────────────────────────
echo "  Installing dependencies..."
if ! pnpm install; then
  crew_fail \
    --step    "$STEP" \
    --persona "chief_obrien" \
    --tool    "run_crew_agent" \
    --tool-args '{"objective": "Fix pnpm install failure in apps/vscode/", "agents": [{"persona": "Chief O'\''Brien"}]}' \
    --context "pnpm install failed in $EXT_DIR." \
    --error   "Check terminal output for pnpm install errors."
  exit 1
fi
echo "  ✔  Dependencies installed"

# ── 2. Build Webview React Assets ─────────────────────────────────────────────
if [ -d "$WEBVIEW_DIR" ]; then
    echo "  ⚛️  Building Agent Viewport (React Webview)..."
    cd "$WEBVIEW_DIR"
    pnpm install
    pnpm run build
    cd "$EXT_DIR"
    echo "  ✔  Webview assets generated in apps/vscode/media/"
else
    echo "  ⚠️   Webview directory missing. Ensuring media/ assets exist..."
fi

# ── Compile Extension Source (using pnpm run compile which runs tsc) ──────────
echo ""
echo "  Compiling TypeScript source (pnpm run compile)..."
if ! pnpm run compile; then
  crew_fail \
    --step    "$STEP" \
    --persona "chief_obrien" \
    --tool    "run_factory_mission" \
    --tool-args '{"project": "ai-enterprise-os", "objective": "Fix TypeScript compilation errors in apps/vscode/", "agents": [{"persona": "Geordi La Forge"}, {"persona": "Commander Data"}]}' \
    --context "TypeScript compilation failed in apps/vscode/. Check tsconfig.json and source files." \
    --error   "Check terminal output for TypeScript compilation errors."
  exit 1
fi
echo "  ✔  TypeScript compilation successful."

# ── Verify dist/extension.js has the activate export ─────────────────────────
if ! node -e "const e = require('./out/src/extension.js'); if (typeof e.activate !== 'function') throw new Error('activate not exported')" 2>/tmp/p1s5-verify.txt; then
  crew_fail \
    --step    "$STEP" \
    --persona "chief_obrien" \
    --tool    "run_factory_mission" \
    --tool-args '{"project": "ai-enterprise-os", "objective": "Ensure apps/vscode/src/extension.ts exports an activate() function"}' \
    --context "dist/extension.js compiled but does not export an activate function. VSCode will refuse to load it." \
    --error   "$(cat /tmp/p1s5-verify.txt)"
  exit 1
fi
echo "  ✔  activate() export verified"

# ── vsce package ──────────────────────────────────────────────────────────────
echo ""
echo "  Packaging .vsix..."

# Check vsce is available
VSCE_BIN=""
if command -v vsce &>/dev/null; then
  VSCE_BIN="vsce"
elif [[ -f "node_modules/.bin/vsce" ]]; then
  VSCE_BIN="node_modules/.bin/vsce"
else
  echo "  ⚠  vsce not found — installing @vscode/vsce..."
  pnpm add -D @vscode/vsce --silent 2>/dev/null || npm install -g @vscode/vsce --silent 2>/dev/null || true
  [[ -f "node_modules/.bin/vsce" ]] && VSCE_BIN="node_modules/.bin/vsce"
fi

if [[ -z "$VSCE_BIN" ]]; then
  crew_fail \
    --step    "$STEP" \
    --persona "chief_obrien" \
    --tool    "run_crew_agent" \
    --tool-args '{"objective": "Install @vscode/vsce and package the extension in apps/vscode/", "agents": [{"persona": "Chief O'\''Brien"}]}' \
    --context "vsce is not available and could not be installed. It is required to build the .vsix package." \
    --error   "vsce not found: try 'npm install -g @vscode/vsce' then re-run p1-s5-vsce-package.sh"
  exit 1
fi

VSIX_NAME="${EXT_NAME}-${EXT_VERSION}.vsix"

if ! $VSCE_BIN package --no-dependencies --allow-missing-repository -o "$VSIX_NAME"; then
  crew_fail \
    --step    "$STEP" \
    --persona "chief_obrien" \
    --tool    "run_crew_agent" \
    --tool-args '{"objective": "Fix vsce packaging errors for the Sovereign Factory VSCode extension", "agents": [{"persona": "Chief O'\''Brien"}, {"persona": "Commander Data"}]}' \
    --context "vsce package failed. Common causes: missing 'publisher' field, missing icon file, or invalid contributes schema." \
    --error   "Check terminal output for VSCE packaging errors."
  exit 1
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

VSIX_SIZE=$(du -sh "$VSIX_NAME" 2>/dev/null | cut -f1 || echo "?")
echo "  ✔  Package: $EXT_DIR/$VSIX_NAME ($VSIX_SIZE)"

# ── Install locally ───────────────────────────────────────────────────────────
echo ""
echo "  To install in VSCode:"
echo "    code --install-extension $EXT_DIR/$VSIX_NAME"
echo "  Or: Extensions panel → '...' → 'Install from VSIX...'"

phase_pass "$STEP"
