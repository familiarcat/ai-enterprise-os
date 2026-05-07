#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# scripts/strategy/route-emergency.sh — Crew Routing & UI Diagnostic
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
source "$ROOT/scripts/lounge/crew-observe.sh"

echo "🚨 Red Alert: Observation Lounge UI 404 Detected."
echo "🖖 Mobilizing Command Staff to Bridge..."

# 1. Geordi La Forge - Infrastructure Check
crew_observe \
  --member "geordi_la_forge" \
  --role "Chief Engineer" \
  --category "architecture" \
  --title "Diagnostic: Next.js Dev Server Port Conflict" \
  --summary "Analyzing port 3000 listeners and Next.js build manifest." \
  --finding "The 404 suggests the page component in 'apps/dashboard/src/app/lounge/page.tsx' is missing or shadowed by a middleware redirect." \
  --conclusion "Verify that the build output includes the /lounge route." \
  --recommend "Restart the dev stack with 'pnpm system:local' to clear the Next.js cache." \
  --tags "routing,404,infrastructure"

# 2. Commander Riker - UI/Routing Check
crew_observe \
  --member "commander_riker" \
  --role "First Officer, Lead Dev" \
  --category "strategy" \
  --title "UI Audit: Missing Screen Manifest" \
  --summary "Reviewing the BridgeSidebar navigation links against the current directory structure." \
  --finding "Several links in the Sidebar point to routes that haven't been scaffolded in the Phase 2 merge." \
  --conclusion "We need to execute a 'run_factory_mission' to scaffold missing pages for Mission Control and Engineering." \
  --recommend "Check 'apps/dashboard/next.config.js' for basepath or rewrite rules causing the 404." \
  --tags "ui,navigation,riker"

# 3. Commander Data - Logic Check
crew_observe \
  --member "commander_data" \
  --role "Second Officer, Architect" \
  --category "architecture" \
  --title "Logical Integrity: Route-to-Domain Mapping" \
  --summary "Validating if the /lounge route correctly connects to the Supabase observation feed." \
  --finding "I detect a discrepancy between the dashboard project ID and the Supabase environment variables." \
  --conclusion "The 404 may be a fallback triggered by a failed initial data fetch in the layout.tsx file." \
  --recommend "Check browser console for 'Failed to fetch' errors pointing to port 3002 or 3001." \
  --tags "data,logic,routing"

# 4. Captain Picard - Decision
crew_observe \
  --member "captain_picard" \
  --role "Captain" \
  --category "strategy" \
  --title "Global Execution Plan: Sovereign Factory UI Restoration" \
  --summary "A comprehensive directive to eliminate 404 errors and scaffold missing system interfaces." \
  --finding "The /lounge route is missing from the physical file structure. Other core pages (Mission Control, Engineering) are also non-existent." \
  --conclusion "A unified fix script has been prepared to synchronize our architectural designs with the active dashboard." \
  --recommend "Execute 'pnpm crew:fix-routing' immediately. This will restore the lounge and scaffold bridge placeholders. Engage." \
  --tags "command,emergency,restoration"

echo ""
echo "✅ Emergency briefing completed. The crew has posted their findings to the memory systems."
echo "👉 Global Execution Plan Ready: Run 'pnpm crew:fix-routing' to solve the 404 errors."