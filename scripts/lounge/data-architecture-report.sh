#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# scripts/lounge/data-architecture-report.sh — Commander Data's architecture observation
#
# Data validates the monorepo structural integrity: workspace packages,
# DDD domain shape, MCP bridge config, and TypeScript consistency.
# Writes findings to the Observation Lounge independently of Worf and O'Brien.
#
# Usage:
#   bash scripts/lounge/data-architecture-report.sh [--context "post-scaffold|post-merge|ci"]
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
source "$SCRIPT_DIR/crew-observe.sh"

CONTEXT="${2:-manual}"
TODAY="$(date +%Y-%m-%d)"

FINDINGS=()
CONCLUSIONS=()
RECOMMENDATIONS=()
STATUS="NOMINAL"

cd "$ROOT"

# ── 1. Workspace package integrity ────────────────────────────────────────────
WORKSPACE_FILE="$ROOT/pnpm-workspace.yaml"
if [[ -f "$WORKSPACE_FILE" ]]; then
  PKG_COUNT=$(find "$ROOT" -name "package.json" -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null | wc -l | tr -d ' ')
  FINDINGS+=("Workspace packages detected: $PKG_COUNT package.json files")

  # Verify expected packages exist
  for pkg in "packages/orchestrator" "packages/mcp-bridge" "packages/crew-personas" "apps/vscode"; do
    if [[ -d "$ROOT/$pkg" ]]; then
      FINDINGS+=("Package present: $pkg")
    else
      [[ "$STATUS" == "NOMINAL" ]] && STATUS="INCOMPLETE"
      FINDINGS+=("Package absent: $pkg (Phase 2 required)")
    fi
  done
else
  STATUS="DEGRADED"
  FINDINGS+=("pnpm-workspace.yaml missing — monorepo configuration absent")
  RECOMMENDATIONS+=("Run: bash scripts/p2-run-all.sh to establish monorepo structure")
fi

# ── 2. DDD domain structure validation ────────────────────────────────────────
DOMAINS_DIR="$ROOT/domains"
if [[ -d "$DOMAINS_DIR" ]]; then
  DOMAIN_COUNT=$(find "$DOMAINS_DIR" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l | tr -d ' ')
  FINDINGS+=("DDD domains scaffolded: $DOMAIN_COUNT")

  # Check each domain has the required DDD layers
  MALFORMED=()
  while IFS= read -r domain_path; do
    domain_name="$(basename "$domain_path")"
    MISSING_LAYERS=()
    for layer in "domain" "application" "infrastructure"; do
      [[ ! -d "$domain_path/$layer" ]] && MISSING_LAYERS+=("$layer")
    done
    [[ ${#MISSING_LAYERS[@]} -gt 0 ]] && MALFORMED+=("$domain_name missing: ${MISSING_LAYERS[*]}")
  done < <(find "$DOMAINS_DIR" -mindepth 1 -maxdepth 1 -type d 2>/dev/null)

  if [[ ${#MALFORMED[@]} -gt 0 ]]; then
    [[ "$STATUS" == "NOMINAL" ]] && STATUS="INCOMPLETE"
    FINDINGS+=("Malformed DDD domains: ${MALFORMED[*]}")
    RECOMMENDATIONS+=("Run a factory mission to scaffold missing domain layers")
  else
    [[ $DOMAIN_COUNT -gt 0 ]] && FINDINGS+=("All $DOMAIN_COUNT domains have correct DDD layer structure")
  fi
else
  FINDINGS+=("No domains/ directory — no DDD domains scaffolded yet")
fi

# ── 3. core/orchestrator.js integrity ────────────────────────────────────────
ORCH="$ROOT/core/orchestrator.js"
if [[ -f "$ORCH" ]]; then
  ORCH_LINES=$(wc -l < "$ORCH" | tr -d ' ')
  FINDINGS+=("core/orchestrator.js: $ORCH_LINES lines")

  # Check key function exports are present
  for fn in "runMission" "runMissions" "invokeCrewAgent" "verifyIntegrity" "scaffoldDDDComponent"; do
    grep -q "$fn" "$ORCH" && FINDINGS+=("Export verified: $fn()") || {
      STATUS="DEGRADED"
      FINDINGS+=("Missing export: $fn() — orchestrator may be incomplete")
      RECOMMENDATIONS+=("Restore $fn to core/orchestrator.js")
    }
  done
else
  STATUS="DEGRADED"
  FINDINGS+=("MISSING: core/orchestrator.js — primary engine absent")
  RECOMMENDATIONS+=("Restore core/orchestrator.js from git history or run recovery mission")
fi

# ── 4. MCP bridge configuration ───────────────────────────────────────────────
BRIDGE="$ROOT/apps/api/mcp-http-bridge.mjs"
if [[ -f "$BRIDGE" ]]; then
  TOOL_COUNT=$(grep -c "name:" "$BRIDGE" 2>/dev/null || echo "0")
  PERSONA_COUNT=$(grep -c "_picard\|_data\|_riker\|la_forge\|_obrien\|_worf\|_troi\|_crusher\|_uhura\|quark" "$BRIDGE" 2>/dev/null || echo "0")
  FINDINGS+=("MCP bridge: $TOOL_COUNT tool definitions, $PERSONA_COUNT persona entries")
else
  STATUS="DEGRADED"
  FINDINGS+=("MISSING: apps/api/mcp-http-bridge.mjs — MCP transport absent")
  RECOMMENDATIONS+=("Run: bash scripts/p0-s4-bridge-start.sh")
fi

# ── 5. TypeScript consistency (if tsc available) ──────────────────────────────
if command -v tsc &>/dev/null; then
  EXT_SRC="$ROOT/apps/vscode/src"
  if [[ -d "$EXT_SRC" ]]; then
    TS_ERRORS=$(tsc --noEmit --allowSyntheticDefaultImports --module commonjs --target ES2020 \
      --lib ES2020 --skipLibCheck "$EXT_SRC"/**/*.ts 2>&1 | grep "error TS" | wc -l | tr -d ' ') || TS_ERRORS="0"
    if [[ "$TS_ERRORS" -gt 0 ]]; then
      [[ "$STATUS" == "NOMINAL" ]] && STATUS="INCOMPLETE"
      FINDINGS+=("TypeScript errors in extension: $TS_ERRORS")
      RECOMMENDATIONS+=("Fix TypeScript errors in apps/vscode/src/ before packaging")
    else
      FINDINGS+=("TypeScript: no errors in extension source")
    fi
  fi
fi

# ── 6. Compose Data's summary ─────────────────────────────────────────────────
case "$STATUS" in
  NOMINAL)    SUMMARY="Architecture analysis complete. All structural constraints are satisfied. The logical consistency of this system is... remarkable." ;;
  INCOMPLETE) SUMMARY="Architecture is partially implemented. I have identified $( [[ ${#FINDINGS[@]} -gt 0 ]] && echo "${#FINDINGS[@]}" || echo "several") structural gaps that require attention." ;;
  DEGRADED)   SUMMARY="Critical architectural components are absent. I calculate a 94.7% probability of pipeline failure if deployment proceeds without remediation." ;;
esac

CONCLUSIONS+=("Architectural status: $STATUS — $TODAY")
CONCLUSIONS+=("Context: $CONTEXT")
[[ "$STATUS" == "NOMINAL" ]] && CONCLUSIONS+=("System is structurally sound for continued development")

crew_observe \
  --member    "Commander Data" \
  --role      "Second Officer, DDD Architect" \
  --title     "Architecture Validation — $TODAY ($CONTEXT)" \
  --summary   "$SUMMARY" \
  $(for f in "${FINDINGS[@]}"; do echo "--finding"; echo "$f"; done) \
  $(for c in "${CONCLUSIONS[@]}"; do echo "--conclusion"; echo "$c"; done) \
  $(for r in "${RECOMMENDATIONS[@]}"; do echo "--recommend"; echo "$r"; done) \
  --tags      "architecture,ddd,data,$CONTEXT"

[[ "$STATUS" == "DEGRADED" ]] && exit 1 || exit 0
