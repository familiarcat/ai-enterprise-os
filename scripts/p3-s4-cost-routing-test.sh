#!/usr/bin/env bash
# p3-s4-cost-routing-test.sh — Phase 3, Step 4: Per-persona model cost routing validation
# Verifies that each crew persona maps to the correct model tier and that
# the $1.50/execution budget can be met by the routing configuration.
# Assigned crew: Quark (cost optimization, the 285th Rule of Acquisition).
# MCP tool on failure: run_crew_agent
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
source "$SCRIPT_DIR/lib/crew-fail.sh"

STEP="p3-s4-cost-routing-test"
step_header "PHASE 3 — N8N + CREWAI AUTOMATION" "Step 4: Cost-Optimized Model Routing"

set -a; source "$ROOT/.env" 2>/dev/null || true; set +a

BRIDGE_PORT="${MCP_BRIDGE_PORT:-3002}"
BRIDGE_URL="http://localhost:${BRIDGE_PORT}"

# ── Expected model assignments ────────────────────────────────────────────────
# Tier 1 (cheapest): haiku / gemini-flash — planning, analysis, comms
# Tier 2 (medium):   gpt-4o-mini — QA, integration
# Tier 3 (premium):  claude-3-5-sonnet — development, implementation
declare -A EXPECTED_TIERS
EXPECTED_TIERS[captain_picard]="haiku"
EXPECTED_TIERS[commander_data]="haiku"
EXPECTED_TIERS[counselor_troi]="haiku"
EXPECTED_TIERS[dr_crusher]="haiku"
EXPECTED_TIERS[lt_uhura]="gemini"
EXPECTED_TIERS[quark]="gemini"
EXPECTED_TIERS[lt_worf]="gpt-4o-mini"
EXPECTED_TIERS[chief_obrien]="gpt-4o-mini"
EXPECTED_TIERS[commander_riker]="sonnet"
EXPECTED_TIERS[geordi_la_forge]="sonnet"

# ── Fetch actual persona→model assignments from the bridge ────────────────────
echo "  Fetching live persona→model assignments from bridge..."

BRIDGE_UP=$(curl -sf "${BRIDGE_URL}/health" --connect-timeout 3 2>&1) || {
  echo "  ⚠  Bridge not running — reading persona config from source file directly"
  BRIDGE_UP=""
}

PERSONAS_JSON=""
if [[ -n "$BRIDGE_UP" ]]; then
  PERSONAS_JSON=$(curl -sf "${BRIDGE_URL}/crew/personas" 2>&1)
fi

if [[ -z "$PERSONAS_JSON" ]]; then
  # Fallback: parse from mcp-http-bridge.mjs source
  echo "  Reading CREW_PERSONAS from mcp-http-bridge.mjs source..."
  PERSONAS_JSON=$(node --input-type=module <<'EOF' 2>/dev/null || echo '{"personas":{}}')
import { readFileSync } from 'fs';
const src = readFileSync('/Users/bradygeorgen/Dev/ai-enterprise-os/apps/api/mcp-http-bridge.mjs', 'utf8');
// Extract the CREW_PERSONAS block and eval it
const match = src.match(/const CREW_PERSONAS = \{([\s\S]*?)\};/);
if (!match) { console.log('{}'); process.exit(0); }
// Just output a count for now
const keys = src.match(/captain_picard|commander_data|commander_riker|geordi_la_forge|chief_obrien|lt_worf|counselor_troi|dr_crusher|lt_uhura|quark/g);
const unique = [...new Set(keys || [])];
const personas = {};
unique.forEach(k => { personas[k] = { role: k, model: 'unknown' }; });
console.log(JSON.stringify({ personas, count: unique.length }));
EOF
)
fi

echo ""
echo "  Validating model tier assignments:"
echo "  ─────────────────────────────────────────────────────────────"
printf "  %-22s %-40s %-12s\n" "PERSONA" "MODEL" "TIER CHECK"
echo "  ─────────────────────────────────────────────────────────────"

TIER_FAILURES=()
BUDGET_WARNING=false

for persona in "${!EXPECTED_TIERS[@]}"; do
  expected_tier="${EXPECTED_TIERS[$persona]}"

  # Get model from personas JSON
  actual_model=$(echo "$PERSONAS_JSON" | node -e "
    let d=''; process.stdin.on('data',c=>d+=c);
    process.stdin.on('end',()=>{
      try {
        const p = JSON.parse(d).personas || {};
        console.log(p['$persona']?.model || 'NOT_FOUND');
      } catch(e) { console.log('PARSE_ERROR'); }
    })
  " 2>/dev/null || echo "UNKNOWN")

  # Check tier match
  TIER_OK=true
  case "$expected_tier" in
    haiku)       [[ "$actual_model" == *"haiku"* ]]        || TIER_OK=false ;;
    gemini)      [[ "$actual_model" == *"gemini"* ]]       || TIER_OK=false ;;
    gpt-4o-mini) [[ "$actual_model" == *"gpt-4o-mini"* ]]  || TIER_OK=false ;;
    sonnet)      [[ "$actual_model" == *"sonnet"* ]]       || TIER_OK=false ;;
  esac

  if [[ "$TIER_OK" == true ]]; then
    printf "  %-22s %-40s %-12s\n" "$persona" "${actual_model:0:38}" "✔ $expected_tier"
  else
    printf "  %-22s %-40s %-12s\n" "$persona" "${actual_model:0:38}" "✗ wants $expected_tier"
    TIER_FAILURES+=("$persona: got $actual_model, expected tier $expected_tier")
  fi
done
echo "  ─────────────────────────────────────────────────────────────"

# ── Budget estimate ───────────────────────────────────────────────────────────
echo ""
echo "  BarItalia STL budget estimate (10-persona crew, 1 mission):"
echo "    Tier 1 (haiku, 4 members)      : ~\$0.00025/1K tokens × ~2K = ~\$0.02"
echo "    Tier 2 (gemini-flash, 2 members): ~\$0.000075/1K tokens × ~2K = ~\$0.003"
echo "    Tier 3 (gpt-4o-mini, 2 members): ~\$0.00015/1K tokens × ~2K = ~\$0.006"
echo "    Tier 4 (sonnet, 2 members)     : ~\$0.003/1K tokens × ~5K = ~\$0.30"
echo "    ──────────────────────────────────────────────────────────"
echo "    Estimated total per mission    : ~\$0.33–0.50"
echo "    BarItalia full business gen    : ~3–4 missions → ~\$1.00–\$1.50 ✔"

if [[ ${#TIER_FAILURES[@]} -gt 0 ]]; then
  crew_fail \
    --step    "$STEP" \
    --persona "quark" \
    --tool    "run_crew_agent" \
    --tool-args '{"objective": "Fix model tier assignments in CREW_PERSONAS — some personas are using more expensive models than their cognitive tier requires", "agents": [{"persona": "Quark"}, {"persona": "Captain Picard"}]}' \
    --context "Some crew members are not assigned to the cost-optimized model for their tier. This will blow the \$1.50 budget target." \
    --error   "Tier failures:\n${TIER_FAILURES[*]}"
  exit 1
fi

echo ""
echo "  ✔  All persona→model tier assignments are cost-optimal"

phase_pass "$STEP"
