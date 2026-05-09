const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

// Import the necessary functions and constants from the orchestrator
const { handleToolCall, CREW_PERSONAS } = require('./core/orchestrator');

async function executeGeordiMission() {
  const geordiPersona = CREW_PERSONAS.geordi_la_forge;

  const toolArgs = {
    objective: "Analyze the Python environment dependencies for the Sovereign Factory.",
    agents: [
      {
        persona: "geordi_la_forge",
        role: geordiPersona.role,
        goal: geordiPersona.goal,
        model: geordiPersona.model,
      }
    ]
  };

  console.log("[Orchestrator] Initiating Geordi La Forge's mission to analyze Python environment dependencies...");
  try {
    const result = await handleToolCall('run_crew_agent', toolArgs);
    console.log("\n[Geordi La Forge] Mission Report:\n", JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("\n[Geordi La Forge] Mission Failed:", error.message);
  }
}

executeGeordiMission();