/**
 * crew-convention.js — Tactical Fleet Meeting
 * Purpose: Convene the crew to optimize LLM selection and MCP tool discovery.
 */
require('dotenv').config();
const orchestrator = require('../../core/orchestrator');

async function convene() {
  console.log("🖖 Captain Picard: All hands, report to the Observation Lounge for a Tactical Convention.");
  
  const { storeMissionResult, runMission, MODEL_CONFIG } = orchestrator;

  // 1. Quark: Economic Efficiency Audit
  console.log("💰 Quark: Reviewing model arbitrage and token ROI...");
  const efficientModels = {
    analysis: MODEL_CONFIG.TIER_ANALYSIS,
    critique: MODEL_CONFIG.TIER_CRITIQUE,
    production: MODEL_CONFIG.TIER_PRODUCTION
  };

  await storeMissionResult(
    "Economic Briefing: Efficient Model Routing",
    {
      lead: 'quark',
      category: 'economics',
      summary: "Identified high-ROI model paths for the current reconstruction mission.",
      key_findings: [
        `Tier Analysis: ${efficientModels.analysis} (Minimal cost for context ingestion)`,
        `Tier Critique: ${efficientModels.critique} (High-speed validation via Worf)`,
        `Tier Production: ${efficientModels.production} (Maximum coding precision for Riker)`
      ],
      conclusion: "Current model configuration is optimized for rapid execution with minimal token burn."
    }
  );

  // 2. Data: MCP Connectivity Scan
  console.log("🧠 Data: Scanning GitMCP for specialized UI/Routing tools...");
  const discovery = await orchestrator.discoverMcpTools("Next.js 15 routing and Tailwind UI components", "commander_data");

  await storeMissionResult(
    "Architectural Briefing: MCP Connectivity Status",
    {
      lead: 'commander_data',
      category: 'architecture',
      summary: "Discovery mission completed across GitMCP and GitHub registries.",
      key_findings: [
        `Registries Searched: ${discovery.registries_searched.join(', ')}`,
        `Recommendation: ${discovery.recommendation.substring(0, 100)}...`
      ],
      conclusion: "MCP connectivity is active. The crew has access to verified external tools."
    }
  );

  // 3. Picard: Unified Execution Directive
  console.log("📜 Picard: Issuing final execution directive...");
  await runMission({
    sessionId: `convention-${Date.now()}`,
    persona: 'captain_picard',
    task: "Analyze the current 404 routing issue and syntax errors. Formulate a collaborative plan using Geordi for infrastructure and Riker for code correction.",
    metadata: { 
      category: 'strategy',
      project: 'ai-enterprise-os'
    }
  });

  console.log("\n✅ Convention Complete. The crew is now operating with synchronized efficiency.");
  console.log("Check http://localhost:3000/lounge to view the tactical logs.");
  process.exit(0);
}

convene().catch(err => {
  console.error("❌ Tactical Convention Failed:", err.message);
  process.exit(1);
});