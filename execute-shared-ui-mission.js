const { handleToolCall } = require('./core/orchestrator');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

/**
 * Executes a mission to scaffold the central 'shared-ui' domain.
 * This domain is the cornerstone for UI/UX universality across the Sovereign Factory.
 */
async function runSharedUIMission() {
  const objective = `Scaffold a new 'shared-ui' domain to centralize universal UI/UX patterns as part of the Unified Language Initiative. 
  This domain must include:
  1. domain/: Types for MissionControl state, CrewPersona configs, and SSE event schemas.
  2. application/: Shared hooks for MCP SSE streaming and cost accumulation logic.
  3. infrastructure/: Tailwind configuration extensions and global CSS variables for the 'space-dark' theme (#0d1022).
  4. ui/: Atomic components (BridgeStatusBar, PhaseProgressPanel, CrewAvatarCard, MissionProgressBar, CrewMemoryBrowser).
  5. tests/: Component smoke tests and theme validation.
  6. docs/: Usage guidelines for universal UX goals.`;
  
  console.log("[Captain Picard] Initiating shared-ui domain scaffolding mission. Make it so.");
  try {
    const result = await handleToolCall('run_factory_mission', {
      sessionId: `shared-ui-scaffold-${Date.now()}`,
      persona: 'captain_picard',
      task: objective,
      metadata: { project: 'sovereign-factory', domain: 'shared-ui' }
    });
    console.log("\n[Captain Picard] Mission Report:\n", JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("[Captain Picard] Mission failed:", err.message);
  }
}

runSharedUIMission();