#!/usr/bin/env bash
# p2-s4-pkg-crew-personas.sh — Phase 2, Step 4: Shared crew-personas package
# Verifies @sovereign/crew-personas is available to extension, dashboard, and bridge.
# Assigned crew: Lt. Uhura (cross-system communication, ensures all channels share the same map).
# MCP tool on failure: run_crew_agent
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
source "$SCRIPT_DIR/lib/crew-fail.sh"

STEP="p2-s4-pkg-crew-personas"
step_header "PHASE 2 — MONOREPO MERGE" "Step 4: packages/crew-personas (Shared Map)"

PKG_DIR="$ROOT/packages/crew-personas"
BRIDGE_PKG="$ROOT/packages/mcp-bridge/personas.mjs"
mkdir -p "$PKG_DIR"

# ── package.json ──────────────────────────────────────────────────────────────
[[ ! -f "$PKG_DIR/package.json" ]] && cat > "$PKG_DIR/package.json" <<'PKG'
{
  "name": "@sovereign/crew-personas",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./index.mjs",
  "exports": { ".": "./index.mjs" }
}
PKG

# ── index.mjs — re-export from mcp-bridge (single source of truth) ───────────
cat > "$PKG_DIR/index.mjs" <<'IDX'
/**
 * @sovereign/crew-personas
 *
 * Single source of truth for Star Trek crew persona definitions.
 * Consumed by: VSCode extension, alex-dashboard, mcp-http-bridge, n8n webhooks.
 *
 * To add/change a persona, edit packages/mcp-bridge/personas.mjs.
 * This package re-exports from there so nothing diverges.
 */
export {
  CREW_PERSONAS,
  normalisePersonaKey,
  enrichAgentsWithPersonas,
} from '../mcp-bridge/personas.mjs';

/** Sorted list of all persona keys */
export const PERSONA_KEYS = Object.freeze([
  'captain_picard', 'commander_data', 'commander_riker',
  'geordi_la_forge', 'chief_obrien', 'lt_worf',
  'counselor_troi', 'dr_crusher', 'lt_uhura', 'quark',
]);

/** Human-readable display names for UI dropdowns */
export const PERSONA_LABELS = Object.freeze({
  captain_picard:  'Captain Picard — Strategy',
  commander_data:  'Commander Data — Architecture',
  commander_riker: 'Commander Riker — Development',
  geordi_la_forge: 'Geordi La Forge — Engineering',
  chief_obrien:    "Chief O'Brien — Integration",
  lt_worf:         'Lt. Worf — QA Audit',
  counselor_troi:  'Counselor Troi — UX Analysis',
  dr_crusher:      'Dr. Crusher — Health Check',
  lt_uhura:        'Lt. Uhura — Communications',
  quark:           'Quark — Cost Optimization',
});

/** Cost tier groupings for budget-aware routing */
export const MODEL_TIERS = Object.freeze({
  strategic: ['captain_picard', 'commander_data', 'counselor_troi', 'dr_crusher'],
  developer: ['commander_riker', 'geordi_la_forge'],
  qa:        ['lt_worf', 'chief_obrien'],
  comms:     ['lt_uhura', 'quark'],
});
IDX
echo "  ✔  packages/crew-personas/index.mjs written"

# ── Verify it loads ───────────────────────────────────────────────────────────
echo ""
echo "  Verifying @sovereign/crew-personas loads..."
LOAD_TEST=$(node --input-type=module <<'EOF' 2>&1 || echo "FAIL")
import { CREW_PERSONAS, PERSONA_KEYS, MODEL_TIERS } from '/Users/bradygeorgen/Dev/ai-enterprise-os/packages/crew-personas/index.mjs';
const count = Object.keys(CREW_PERSONAS).length;
const tierCount = Object.values(MODEL_TIERS).flat().length;
console.log(`personas:${count} tier_members:${tierCount}`);
EOF
)

if echo "$LOAD_TEST" | grep -q "FAIL\|Error\|Cannot"; then
  crew_fail \
    --step    "$STEP" \
    --persona "lt_uhura" \
    --tool    "run_crew_agent" \
    --tool-args '{"objective": "Fix @sovereign/crew-personas package — it cannot load or re-export from @sovereign/mcp-bridge/personas.mjs", "agents": [{"persona": "Lt. Uhura"}, {"persona": "Commander Data"}]}' \
    --context "packages/crew-personas/index.mjs failed to load. It depends on packages/mcp-bridge/personas.mjs being present." \
    --error   "$LOAD_TEST — run p2-s3-pkg-mcp-bridge.sh first"
  exit 1
fi
echo "  ✔  $LOAD_TEST"

# ── Verify consistent persona count across all three sources ──────────────────
echo ""
echo "  Consistency check: bridge source vs package..."
BRIDGE_COUNT=$(grep -c "model:" "$BRIDGE_PKG" 2>/dev/null || echo "0")
PKG_COUNT=$(echo "$LOAD_TEST" | grep -o 'personas:[0-9]*' | cut -d: -f2 || echo "0")
echo "  Bridge source personas : $BRIDGE_COUNT"
echo "  Package export personas: $PKG_COUNT"
(( BRIDGE_COUNT == PKG_COUNT )) && echo "  ✔  Counts match" || echo "  ⚠  Count mismatch — check personas.mjs"

phase_pass "$STEP"
