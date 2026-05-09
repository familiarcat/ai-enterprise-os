const { handleToolCall } = require('./core/orchestrator');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

async function runPicardMission() {
  const objective = "Scaffold a new DDD domain for 'Smart City Logistics'. Include Domain, Application, Infrastructure, and UI layers. The domain should focus on autonomous route optimization and real-time fleet telemetry. Ensure the architecture follows Sovereign Factory standards for autonomous business units.";
  
  console.log("[Captain Picard] Initiating mission: Smart City Logistics. Make it so.");
  try {
    const result = await handleToolCall('run_factory_mission', {
      context: {
        sessionId: `picard-logistics-${Date.now()}`,
        persona: 'captain_picard',
        task: objective,
        metadata: { 
          project: 'smart-city-logistics', 
          domain: 'logistics'
        }
      }
    });
    console.log("\n[Captain Picard] Mission Log Updated:\n", JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("[Captain Picard] Command failure:", err.message);
  }
}

runPicardMission();