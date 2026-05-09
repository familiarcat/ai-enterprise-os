const { handleToolCall } = require('./core/orchestrator');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

async function runTroiMission() {
  const objective = "Analyze the UX intent and strategic empathy of the current Observation Lounge UI components. Ensure the OS evolution remains human-centric and intuitive.";
  
  console.log("[Counselor Troi] Opening a channel for UX intent analysis...");
  try {
    const result = await handleToolCall('run_factory_mission', {
      context: {
        sessionId: `troi-ux-${Date.now()}`,
        persona: 'counselor_troi',
        task: objective,
        metadata: { project: 'sovereign-factory', domain: 'ux-audit' }
      }
    });
    console.log("\n[Troi Analysis Report]:\n", JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("[Counselor Troi] Mission failed:", err.message);
  }
}

runTroiMission();