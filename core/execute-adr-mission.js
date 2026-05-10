const { handleToolCall } = require('./orchestrator');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function triggerADRMission() {
  const objective = `
    [MISSION: CODIFY WARP SPEED PROTOCOL]
    As Commander Data, synthesize the 'Warp Speed Protocol' (Standardized Context + Model Fluidity) 
    based on our recent architectural evolution and YouTube ingestion findings.
    
    1. Use the 'create_adr' tool to document this decision in the /versions directory.
    2. Title: "Warp Speed Protocol: Token Optimization and Model Fluidity"
    3. Status: "accepted"
    4. Content: Detail the rationale for model arbitrage (Haiku/Flash for routing/validation vs Sonnet/Opus for synthesis) 
       and the implementation of complexity scoring to reduce latency and costs.
    5. Deciders: ["Captain Picard", "Commander Data", "Quark"]
  `;

  console.log("═══════════════════════════════════════════════════");
  console.log("  [Captain Picard] Directive: Codify Warp Speed Protocol");
  console.log("═══════════════════════════════════════════════════\n");

  try {
    const result = await handleToolCall('run_factory_mission', {
      sessionId: `adr-warp-speed-${Date.now()}`,
      persona: 'commander_data',
      task: objective,
      metadata: { project: 'core-infrastructure', domain: 'architecture' }
    }, {
      notify: (m) => console.log(`  > ${m.data || m}`)
    });

    console.log("\n[Mission Success]: The Warp Speed Protocol has been codified.");
  } catch (err) {
    console.error("\n❌ Mission Failed:", err.message);
  }
}

triggerADRMission();