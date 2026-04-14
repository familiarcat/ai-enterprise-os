#!/usr/bin/env bash
# p2-s5-turbo-pipeline.sh — Phase 2, Step 5: Validate Turbo pipeline
# Ensures turbo.json exists and the build pipeline is correctly ordered.
# Assigned crew: Geordi La Forge (keeps the warp core — I mean build pipeline — running).
# MCP tool on failure: health_check
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
source "$SCRIPT_DIR/lib/crew-fail.sh"

STEP="p2-s5-turbo-pipeline"
step_header "PHASE 2 — MONOREPO MERGE" "Step 5: Turbo Build Pipeline"

TURBO_JSON="$ROOT/turbo.json"

# ── Write turbo.json if missing ───────────────────────────────────────────────
if [[ ! -f "$TURBO_JSON" ]]; then
  echo "  turbo.json not found — creating..."
  cat > "$TURBO_JSON" <<'TURBO'
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [".env"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", "out/**", ".next/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "lint": {
      "outputs": []
    },
    "mcp:start": {
      "cache": false,
      "persistent": true
    },
    "bridge:start": {
      "dependsOn": ["@sovereign/orchestrator#build"],
      "cache": false,
      "persistent": true
    }
  }
}
TURBO
  echo "  ✔  turbo.json written"
else
  echo "  ✔  turbo.json exists"
fi

# ── Verify turbo is installed ─────────────────────────────────────────────────
TURBO_BIN=""
if command -v turbo &>/dev/null; then
  TURBO_BIN="turbo"
elif [[ -f "$ROOT/node_modules/.bin/turbo" ]]; then
  TURBO_BIN="$ROOT/node_modules/.bin/turbo"
fi

if [[ -z "$TURBO_BIN" ]]; then
  echo "  turbo not found — installing..."
  cd "$ROOT"
  if ! pnpm add turbo -w --silent 2>/tmp/p2s5-turbo-install.txt; then
    crew_fail \
      --step    "$STEP" \
      --persona "geordi_la_forge" \
      --tool    "health_check" \
      --tool-args '{"fix": true}' \
      --context "Failed to install turbo as a workspace dev dependency." \
      --error   "$(cat /tmp/p2s5-turbo-install.txt)"
    exit 1
  fi
  TURBO_BIN="$ROOT/node_modules/.bin/turbo"
fi

TURBO_VER=$($TURBO_BIN --version 2>/dev/null || echo "unknown")
echo "  ✔  turbo: $TURBO_VER"

# ── Dry-run turbo build ───────────────────────────────────────────────────────
echo ""
echo "  Running turbo build --dry (validates pipeline without building)..."
cd "$ROOT"
if ! $TURBO_BIN build --dry 2>/tmp/p2s5-dry.txt; then
  crew_fail \
    --step    "$STEP" \
    --persona "geordi_la_forge" \
    --tool    "health_check" \
    --tool-args '{"fix": true}' \
    --context "turbo build --dry failed. The pipeline configuration or workspace package graph has errors." \
    --error   "$(cat /tmp/p2s5-dry.txt | tail -30)"
  exit 1
fi
echo "  ✔  turbo build --dry passed"

# ── Check workspace packages are registered ────────────────────────────────────
echo ""
echo "  Checking workspace package registrations..."
for pkg in "@sovereign/orchestrator" "@sovereign/mcp-bridge" "@sovereign/crew-personas"; do
  FOUND=$(pnpm list --filter "$pkg" 2>/dev/null | grep "$pkg" || true)
  if [[ -z "$FOUND" ]]; then
    echo "  ⚠  $pkg not found in workspace — run pnpm install"
  else
    echo "  ✔  $pkg registered in workspace"
  fi
done

phase_pass "$STEP"
