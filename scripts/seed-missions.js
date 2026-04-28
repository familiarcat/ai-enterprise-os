/**
 * seed-missions.js — Sovereign Factory
 * Purpose: Populates Supabase with 3 sample missions for the Agile Dashboard.
 */ 
require('dotenv').config();
const { storeMissionResult, getMemorySystems } = require('../core/orchestrator');
require('dotenv').config();

async function seed() {
  console.log("🖖 Data: Initiating mission seeding sequence...");

  const samples = [
    {
      project: 'civic',
      objective: 'Implement real-time traffic event consumer in Infrastructure layer',
      persona: 'commander_data',
      result: 'Scaffolded Kafka consumer in domains/civic/infrastructure/repository.js. Integrated with Supabase for persistence.'
    },
    {
      project: 'enterprise-os',
      objective: 'Refactor BridgeSidebar for universal navigation and proportional font scaling',
      persona: 'commander_riker',
      result: 'Updated BridgeSidebar.tsx to use text-sm floor. Lifted state to page.tsx for global navigation control.'
    },
    {
      project: 'ads',
      objective: 'Perform security audit on Google Ads API connector',
      persona: 'lt_worf',
      result: 'Audit complete. Identified and remediated 2 hardcoded secret patterns in the dev branch.'
    }
  ];

  for (const s of samples) {
    console.log(`  - Seeding Mission: ${s.objective} [${s.persona}]`);
    await storeMissionResult(
      `[AGILE MISSION] Project: ${s.project}\nObjective: ${s.objective}\nResult: ${s.result}`,
      {
        project: s.project,
        lead: s.persona,
        timestamp: new Date().toISOString(),
        status: 'SUCCESS'
      }
    );
  }

  console.log("✅ Seeding complete. Supabase RAG system is now hydrated.");
  process.exit(0);
}

seed().catch(err => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});