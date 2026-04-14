#!/usr/bin/env bash
# p4-s5-vsce-publish.sh — Phase 4, Step 5: Publish VSCode extension to Marketplace
# Assigned crew: Commander Riker (First Officer closes out the mission — production quality).
# MCP tool on failure: git_operation
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
source "$SCRIPT_DIR/lib/crew-fail.sh"

STEP="p4-s5-vsce-publish"
step_header "PHASE 4 — PRODUCTION DEPLOY" "Step 5: VSCode Marketplace Publish"

EXT_DIR="$ROOT/apps/vscode"
PKG="$EXT_DIR/package.json"

# ── Validate extension is ready ───────────────────────────────────────────────
[[ ! -f "$PKG" ]] && {
  crew_fail --step "$STEP" --persona "commander_riker" --tool "git_operation" \
    --tool-args '{"action": "status"}' \
    --context "apps/vscode/package.json missing. Run p1-run-all.sh first." \
    --error "File not found: $PKG"
  exit 1
}

EXT_NAME=$(node -e "console.log(require('$PKG').name)" 2>/dev/null)
EXT_VERSION=$(node -e "console.log(require('$PKG').version)" 2>/dev/null)
EXT_PUBLISHER=$(node -e "console.log(require('$PKG').publisher||'')" 2>/dev/null)

echo "  Extension: $EXT_NAME v$EXT_VERSION"
echo "  Publisher: ${EXT_PUBLISHER:-NOT SET}"

# ── Verify publisher field is set ─────────────────────────────────────────────
if [[ -z "$EXT_PUBLISHER" || "$EXT_PUBLISHER" == "null" ]]; then
  crew_fail \
    --step    "$STEP" \
    --persona "commander_riker" \
    --tool    "git_operation" \
    --tool-args '{"action": "status"}' \
    --context "apps/vscode/package.json is missing the 'publisher' field. It must match your VS Marketplace publisher ID." \
    --error   "Add: \"publisher\": \"familiarcat\" to $PKG (or your VS Marketplace publisher name)"
  exit 1
fi

# ── Guard: explicit confirmation required ─────────────────────────────────────
echo ""
if [[ "${SOVEREIGN_CONFIRM_PUBLISH:-}" != "yes" ]]; then
  echo "  Publishing to the VS Code Marketplace is a PUBLIC action."
  echo "  Re-run with: SOVEREIGN_CONFIRM_PUBLISH=yes ./scripts/p4-s5-vsce-publish.sh"
  echo ""
  echo "  Pre-publish validation only:"
  cd "$EXT_DIR"
  VSCE_BIN="$(command -v vsce 2>/dev/null || echo "node_modules/.bin/vsce")"

  # Run pre-publish checks without publishing
  if $VSCE_BIN ls 2>/tmp/p4s5-ls.txt; then
    FILE_COUNT=$(cat /tmp/p4s5-ls.txt | wc -l)
    echo "  ✔  Package would include $FILE_COUNT files"
  else
    crew_fail \
      --step    "$STEP" \
      --persona "commander_riker" \
      --tool    "git_operation" \
      --tool-args '{"action": "status"}' \
      --context "vsce ls failed — extension package manifest has errors." \
      --error   "$(cat /tmp/p4s5-ls.txt)"
    exit 1
  fi

  echo "  ✔  Pre-publish validation passed (dry run)"
  phase_pass "$STEP"
  exit 0
fi

# ── Check vsce ────────────────────────────────────────────────────────────────
cd "$EXT_DIR"
VSCE_BIN="$(command -v vsce 2>/dev/null || echo "node_modules/.bin/vsce")"

# ── Check PAT token ───────────────────────────────────────────────────────────
VSCE_PAT="${VSCE_PAT:-}"
if [[ -z "$VSCE_PAT" ]]; then
  crew_fail \
    --step    "$STEP" \
    --persona "commander_riker" \
    --tool    "git_operation" \
    --tool-args '{"action": "status"}' \
    --context "VSCE_PAT environment variable not set. A Personal Access Token from dev.azure.com is required to publish." \
    --error   "VSCE_PAT not set — create one at: https://dev.azure.com/ → Personal Access Tokens → Marketplace (publish) scope, then set VSCE_PAT=your-token"
  exit 1
fi

# ── Build final artifact ──────────────────────────────────────────────────────
echo "  Building production bundle..."
pnpm run build 2>/tmp/p4s5-build.txt || {
  crew_fail \
    --step    "$STEP" \
    --persona "commander_riker" \
    --tool    "git_operation" \
    --tool-args '{"action": "status"}' \
    --context "Final extension build failed before publish." \
    --error   "$(cat /tmp/p4s5-build.txt)"
  exit 1
}

# ── Publish ───────────────────────────────────────────────────────────────────
echo "  Publishing $EXT_NAME v$EXT_VERSION to VS Code Marketplace..."
if ! $VSCE_BIN publish --pat "$VSCE_PAT" 2>/tmp/p4s5-pub.txt; then
  crew_fail \
    --step    "$STEP" \
    --persona "commander_riker" \
    --tool    "git_operation" \
    --tool-args '{"action": "status"}' \
    --context "vsce publish failed. PAT may be expired, publisher name wrong, or version already exists." \
    --error   "$(cat /tmp/p4s5-pub.txt)"
  exit 1
fi

echo "  ✔  Published: $EXT_NAME v$EXT_VERSION"
echo "  ✔  Marketplace: https://marketplace.visualstudio.com/items?itemName=${EXT_PUBLISHER}.${EXT_NAME}"

phase_pass "$STEP"
