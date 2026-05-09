const { handleToolCall } = require('./orchestrator');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function activateSovereignFactory() {
  console.log("═══════════════════════════════════════════════════");
  console.log("  [Captain Picard] Activating Sovereign Factory...");
  console.log("═══════════════════════════════════════════════════\n");

  try {
    // 1. Crew Roll Call in the Observation Lounge
    console.log("[Bridge] Conducting Crew Roll Call...");
    const rollCall = await handleToolCall('crew_roll_call', {}, { notify: (m) => console.log(`  > ${m.data || m}`) });
    console.log(JSON.stringify(rollCall, null, 2));

    if (rollCall.status !== 'NOMINAL') {
      throw new Error("Crew alignment failed. Check synaptic links.");
    }

    // 2. Health Check & Local Docker Activation
    console.log("\n[Bridge] Verifying infrastructure status...");
    const health = await handleToolCall('health_check', {});

    if (health.status === 'healthy') {
      console.log("  > Systems are already nominal. Skipping Docker build.");
    } else {
      console.log("\n[Geordi] Systems degraded or offline. Initiating local container builds...");
      const buildResult = await handleToolCall('docker_build', {
        tag: 'mcp-server:latest',
        dockerfile: 'apps/api/Dockerfile',
        context: '.'
      }, { notify: (m) => console.log(`  > ${m.data || m}`) });
      console.log(`  Build Status: ${buildResult.status}`);
    }

    // 3. Terraform State Audit
    console.log("\n[Data] Performing Terraform plan for local infrastructure...");
    const planResult = await handleToolCall('terraform_plan', {
      dir: 'terraform/modules/secrets'
    }, { notify: (m) => console.log(`  > ${m.data || m}`) });
    console.log(`  Plan Status: ${planResult.status}`);

    // 4. Introspective System Activation
    const objective = `
      [INTROSPECTIVE DIRECTIVE]: Conduct a comprehensive system-wide review of the ai-enterprise-os codebase. 
      1. Analyze the 'orchestrator' and 'memory' logic to identify paths for autonomous self-improvement.
      2. Evaluate the efficiency of current model tier routing (MODEL_CONFIG) against historical mission scores.
      3. Formulate a strategy for the crew to act as 'introspective agents' that can suggest and implement their own architectural refactors via MCP tool discovery.
      4. Validate that local Docker and Terraform states are ready to support this continuous self-learning loop.
      
      Goal: Evolve from a guided builder into a self-reflective autonomous entity that learns from every mission outcome.
    `;

    console.log("\n[Captain Picard] Mission: Sovereign Introspection. Engaging v11 loop...");
    const missionResult = await handleToolCall('run_factory_mission', {
      sessionId: `activation-${Date.now()}`,
      persona: 'captain_picard',
      task: objective,
      metadata: { project: 'core-infrastructure', domain: 'evolutionary-engineering' }
    }, { notify: (m) => console.log(`  > ${m.data || m}`) });

    console.log("\n[Activation Report]:\n", JSON.stringify(missionResult, null, 2));
  } catch (err) {
    console.error("\n❌ Activation Failed:", err.message);
  }
}

activateSovereignFactory();