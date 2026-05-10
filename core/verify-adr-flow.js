const { handleToolCall } = require('./orchestrator');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

/**
 * Automated verification flow for the Warp Speed ADR mission.
 */
async function verifyADRFlow() {
  console.log("[Bridge] Initiating Warp Speed ADR Mission...");
  
  // Logic mirrored from execute-adr-mission.js
  await handleToolCall('run_factory_mission', {
    sessionId: `adr-warp-speed-${Date.now()}`,
    persona: 'commander_data',
    task: "[MISSION: CODIFY WARP SPEED PROTOCOL] Codify Warp Speed Protocol ADR.",
    metadata: { project: 'core-infrastructure', domain: 'architecture' }
  }, {
    notify: (m) => console.log(`  > ${m.data || m}`)
  });

  console.log("\n[Bridge] Mission complete. Verifying ADR persistence via sensor sweep...");
  
  const sweepResult = await handleToolCall('sensor_sweep', {});
  
  console.log("═══════════════════════════════════════════════════");
  console.log(`  Verification Success: ADR Count is ${sweepResult.adr_count}`);
  console.log("═══════════════════════════════════════════════════");
}

verifyADRFlow().catch(err => console.error("Verification failed:", err.message));