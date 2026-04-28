#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# p1-s5-civic-bootstrap.sh — Bootstrap STL Civic Intelligence Domain
# Assigned: Captain Picard (Strategy) & Commander Data (BI Architecture)
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
source "$ROOT/scripts/lounge/crew-observe.sh"

echo "🖖 Captain Picard: Initializing STL Civic Intelligence Mission..."

# 1. Seed the Manager Persona into Supabase Memory
crew_observe \
  --member "Captain Picard" \
  --category "architecture" \
  --role "Manager, Business Intelligence (STL)" \
  --title "STL BI Strategy: Unified Civic Data Lake" \
  --summary "Integrating St. Louis Permits, 311, and Budget data with P. Brady Georgen's architectural standards." \
  --finding "Requirement: Multi-departmental BI oversight and legacy migration." \
  --finding "Expertise: 15+ years full-stack, Bayer Command Center Architect, Charter React integration." \
  --conclusion "The system will utilize Kafka for real-time events and Postgres for transactional integrity." \
  --recommend "Deploy the Civic Dynamic Dashboard to bridge executive and operational views." \
  --tags "stl,civic,bi,architecture,resume-match"

# 2. Pinnacle Integration: Build MVP + Discovery + Deployment Prep
echo "🏗️  Executing Pinnacle Integration: Discovery → Security → UI → Deployment..."
node -e "
  const { integrateMcpTool } = require('./core/orchestrator');
  integrateMcpTool('ai-enterprise-os', 'civic-data-stl', 'captain_picard', { 
    subdomain: 'civic', 
    isLandingPage: true 
  })
    .then(r => {
      console.log('✅ Pinnacle Mission Success:', r.tool);
      console.log('🔗 Deployment target: civic.pbradygeorgen.com');
    })
    .catch(console.error);
"

# 3. Explicitly create the CivicDashboard.tsx in its correct DDD location
echo "🏗️  Scaffolding CivicDashboard.tsx to domains/civic/ui/ ..."

CIVIC_DASHBOARD_PATH="$ROOT/domains/civic/ui/CivicDashboard.tsx"

mkdir -p "$(dirname "$CIVIC_DASHBOARD_PATH")"

cat > "$CIVIC_DASHBOARD_PATH" <<'EOF'
/**
 * @generated_by SovereignFactory
 * @domain civic
 * @layer ui
 * @persona Manager_BI_STL
 */

import React, { useState, useEffect } from 'react';

export const CivicDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState({ permits: 124, 311_calls: 842, budget_status: 'NOMINAL', ward_7_alert: true });
  const [streams, setStreams] = useState<string[]>([]);

  return (
    <div className="bg-[#0d1022] text-[#00ffaa] p-8 font-mono min-h-screen">
      <header className="border-b-2 border-[#00ffaa] pb-4 mb-8">
        <div className="flex justify-between items-start">
          <h1 className="text-3xl font-black uppercase tracking-tighter">City of St. Louis — BI Command Center</h1>
          <div className="text-right">
            <span className="bg-red-600 text-white px-2 py-1 text-[10px] font-bold animate-pulse">WARD 7: ANOMALY DETECTED</span>
          </div>
        </div>
        <p className="text-xs uppercase tracking-widest">Lead Architect: P. Brady Georgen | System Status: ACTIVE</p>
      </header>

      <div className="grid grid-cols-3 gap-6 mb-12">
        <div className="border-2 border-[#00ffaa] p-6 bg-black/50">
          <h3 className="text-xs font-bold uppercase mb-2">Permit Approval Rate</h3>
          <p className="text-5xl font-black">{metrics.permits}%</p>
          <span className="text-[10px] text-red-500">↑ 4% from last quarter</span>
        </div>
        <div className="border-2 border-[#00ffaa] p-6 bg-black/50">
          <h3 className="text-xs font-bold uppercase mb-2">311 Response Volume</h3>
          <p className="text-5xl font-black">{metrics['311_calls']}</p>
          <span className="text-[10px]">REAL-TIME EVENT STREAM</span>
        </div>
        <div className="border-2 border-[#00ffaa] p-6 bg-black/50">
          <h3 className="text-xs font-bold uppercase mb-2">Budget Utilization</h3>
          <p className="text-5xl font-black">{metrics.budget_status}</p>
          <span className="text-[10px] text-green-500">OPTIMIZED VIA QUARK_ECONOMICS</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-12">
        <section className="border-t-2 border-[#00ffaa] pt-4">
          <h2 className="text-xl font-black uppercase mb-4">Kafka: Operations Feed</h2>
          <div className="h-64 overflow-y-auto bg-black p-4 text-[10px] space-y-2">
            <div className="text-yellow-400">[KAFKA] traffic.events: Heavy congestion on I-64 at Kingshighway</div>
            <div className="text-blue-400">[311-API] service.requests: Pothole reported in Soulard (Ref: STL-9923)</div>
            <div className="text-red-400">[ALERTS] emergency.alerts: Water main break — Grand Ave</div>
            <div className="text-[#00ffaa]/50">[SYSTEM] normalization_agent: Ingesting CSV from St. Louis County Census...</div>
          </div>
        </section>

        <section className="border-t-2 border-[#00ffaa] pt-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-black uppercase">AI Command Center</h2>
            <span className="text-[10px] border border-[#00ffaa] px-2">6-AGENT LOOP ACTIVE</span>
          </div>
          <div className="border-2 border-red-600 p-4 bg-red-900/10">
            <p className="text-sm italic">"Commander Data: Analysis of Ward 7 permit backlog suggests a 22% correlation with legacy database latency. Normalization complete."</p>
            <div className="flex gap-4 mt-4">
              <button className="px-4 py-2 bg-red-600 text-white font-black uppercase text-xs">Trigger Riker: Remediate</button>
              <button className="px-4 py-2 border-2 border-[#00ffaa] text-[#00ffaa] font-black uppercase text-xs">Ask Troi: UX Impact</button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
EOF

echo "  ✔ CivicDashboard.tsx moved to domains/civic/ui/CivicDashboard.tsx"

# 3. Explicitly create the CivicDashboard.tsx in its correct DDD location
echo "🏗️  Scaffolding CivicDashboard.tsx to domains/civic/ui/ ..."

CIVIC_DASHBOARD_PATH="$ROOT/domains/civic/ui/CivicDashboard.tsx"

mkdir -p "$ROOT/domains/civic/ui"

cat > "$CIVIC_DASHBOARD_PATH" <<'EOF'
/**
 * @generated_by SovereignFactory
 * @domain civic
 * @layer ui
 * @persona Manager_BI_STL
 */

import React, { useState, useEffect } from 'react';

export const CivicDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState({ permits: 124, 311_calls: 842, budget_status: 'NOMINAL', ward_7_alert: true });
  const [streams, setStreams] = useState<string[]>([]);

  return (
    <div className="bg-[#0d1022] text-[#00ffaa] p-8 font-mono min-h-screen">
      <header className="border-b-2 border-[#00ffaa] pb-4 mb-8">
        <div className="flex justify-between items-start">
          <h1 className="text-3xl font-black uppercase tracking-tighter">City of St. Louis — BI Command Center</h1>
          <div className="text-right">
            <span className="bg-red-600 text-white px-2 py-1 text-[10px] font-bold animate-pulse">WARD 7: ANOMALY DETECTED</span>
          </div>
        </div>
        <p className="text-xs uppercase tracking-widest">Lead Architect: P. Brady Georgen | System Status: ACTIVE</p>
      </header>

      <div className="grid grid-cols-3 gap-6 mb-12">
        <div className="border-2 border-[#00ffaa] p-6 bg-black/50">
          <h3 className="text-xs font-bold uppercase mb-2">Permit Approval Rate</h3>
          <p className="text-5xl font-black">{metrics.permits}%</p>
          <span className="text-[10px] text-red-500">↑ 4% from last quarter</span>
        </div>
        <div className="border-2 border-[#00ffaa] p-6 bg-black/50">
          <h3 className="text-xs font-bold uppercase mb-2">311 Response Volume</h3>
          <p className="text-5xl font-black">{metrics['311_calls']}</p>
          <span className="text-[10px]">REAL-TIME EVENT STREAM</span>
        </div>
        <div className="border-2 border-[#00ffaa] p-6 bg-black/50">
          <h3 className="text-xs font-bold uppercase mb-2">Budget Utilization</h3>
          <p className="text-5xl font-black">{metrics.budget_status}</p>
          <span className="text-[10px] text-green-500">OPTIMIZED VIA QUARK_ECONOMICS</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-12">
        <section className="border-t-2 border-[#00ffaa] pt-4">
          <h2 className="text-xl font-black uppercase mb-4">Kafka: Operations Feed</h2>
          <div className="h-64 overflow-y-auto bg-black p-4 text-[10px] space-y-2">
            <div className="text-yellow-400">[KAFKA] traffic.events: Heavy congestion on I-64 at Kingshighway</div>
            <div className="text-blue-400">[311-API] service.requests: Pothole reported in Soulard (Ref: STL-9923)</div>
            <div className="text-red-400">[ALERTS] emergency.alerts: Water main break — Grand Ave</div>
            <div className="text-[#00ffaa]/50">[SYSTEM] normalization_agent: Ingesting CSV from St. Louis County Census...</div>
          </div>
        </section>

        <section className="border-t-2 border-[#00ffaa] pt-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-black uppercase">AI Command Center</h2>
            <span className="text-[10px] border border-[#00ffaa] px-2">6-AGENT LOOP ACTIVE</span>
          </div>
          <div className="border-2 border-red-600 p-4 bg-red-900/10">
            <p className="text-sm italic">"Commander Data: Analysis of Ward 7 permit backlog suggests a 22% correlation with legacy database latency. Normalization complete."</p>
            <div className="flex gap-4 mt-4">
              <button className="px-4 py-2 bg-red-600 text-white font-black uppercase text-xs">Trigger Riker: Remediate</button>
              <button className="px-4 py-2 border-2 border-[#00ffaa] text-[#00ffaa] font-black uppercase text-xs">Ask Troi: UX Impact</button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
EOF

echo "  ✔ CivicDashboard.tsx moved to domains/civic/ui/CivicDashboard.tsx"