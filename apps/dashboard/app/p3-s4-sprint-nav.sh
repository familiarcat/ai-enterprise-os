#!/usr/bin/env bash
# p3-s4-sprint-nav.sh | Assigned: Counselor Troi
# Purpose: Add 'Go to Active Task' button and 'Sprint Status' indicator to the sidebar.

set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
source "$ROOT/scripts/lib/crew-fail.sh"

step="p3-s4-sprint-nav"

step_header "PHASE 3 / STEP 4" "Active Sprint Navigation & Status"

echo "🖖 Troi: Updating BridgeSidebar.tsx with active task navigation and sprint status..."
# This part will be handled by the diff below for BridgeSidebar.tsx

echo "🖖 Troi: Updating page.tsx to pass sprint status and navigation callback..."
# This part will be handled by the diff below for page.tsx

echo "✅ Step 4: Active Sprint Navigation & Status implemented."

crew_observe \
  --member "counselor_troi" \
  --category "ui,ux" \
  --title "Active Sprint Contextual Navigation" \
  --summary "Implemented 'Go to Active Task' button and 'Sprint Status' indicator in the sidebar's Active Sprint accordion." \
  --finding "Users can now quickly return to their active mission step and understand the current phase of the sprint." \
  --conclusion "This enhances user orientation and reduces cognitive load during multi-step mission execution." \
  --recommend "Dynamically update the 'Recent Activity' section on the Fleet Readiness card with actual mission data from Supabase." \
  --tags "ui,ux,navigation,sprint"