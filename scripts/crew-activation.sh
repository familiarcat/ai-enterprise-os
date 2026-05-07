#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# scripts/crew-activation.sh — Global Crew Activation & Manifest Briefing
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
source "$ROOT/scripts/lounge/crew-observe.sh"

echo "🚀 Captain's Orders: Activating the Sovereign Crew..."

CREW_ROLES=(
  "captain_picard|Captain|Strategic coordination & mission planning"
  "commander_data|Second Officer|DDD Architecture & Logic Validation"
  "commander_riker|First Officer|Senior Full-Stack Development"
  "geordi_la_forge|Chief Engineer|System Infrastructure & MCP Wiring"
  "chief_obrien|Chief of Operations|Integration & Deployment"
  "lt_worf|Chief of Security|QA & Security Auditing"
  "counselor_troi|Ship's Counselor|UX & Intent Analysis"
  "dr_crusher|Chief Medical Officer|System Health & Environment Diagnostics"
  "lt_uhura|Communications Officer|Cross-System Sync & Webhooks"
  "quark|Economics Analyst|Cost Optimization & ROI"
  "tasha_yar|Tactical Officer|System Readiness & Smoke Testing"
)

HEADCOUNT=${#CREW_ROLES[@]}

echo "📊 Head Count: $HEADCOUNT officers reporting for duty."

# Post a summary from the Captain first
crew_observe \
  --member "Captain Picard" \
  --role "Captain" \
  --category "strategy" \
  --title "Mission Start: Sovereign Crew Activated" \
  --summary "The crew is assembled and initialized. All hands are on deck for Phase 2 operations." \
  --finding "Head count: $HEADCOUNT active personas verified." \
  --conclusion "Ready to execute missions via the Sovereign Factory." \
  --tags "activation,crew,picard"

# Have each member introduce themselves
for entry in "${CREW_ROLES[@]}"; do
  IFS='|' read -r id RANK ROLE <<< "$entry"

  # Skip Picard as he already spoke
  if [[ "$id" == "captain_picard" ]]; then continue; fi
  
  echo "  Initializing $id..."
  
  crew_observe \
    --member "$id" \
    --role "$RANK" \
    --category "architecture" \
    --title "Identity Briefing: $RANK ($id)" \
    --summary "Reporting for duty within the Sovereign Factory framework." \
    --finding "Assigned Domain: $ROLE" \
    --conclusion "Protocol initialized. Ready for tool-augmented tasks." \
    --tags "identity,activation,$id"
done

echo ""
echo "✅ All $HEADCOUNT crew members have checked into the Observation Lounge."
echo "Check your dashboard at ${NEXT_PUBLIC_MCP_URL_PROD:-http://localhost:3000}/lounge to view the logs."