const path = require("path");
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { CallToolRequestSchema, ListToolsRequestSchema } = require("@modelcontextprotocol/sdk/types.js");
const { spawnSync } = require('child_process');
const { verifyIntegrity, handleToolCall } = require("../core/orchestrator.js");
const { TOOL_DEFINITIONS } = require("../core/tools.js");

const server = new Server({
  name: "sovereign-factory",
  version: "1.0.0",
}, {
  capabilities: {
    tools: {},
    logging: {},
  },
});

/**
 * SELF-HEALING WATCHDOG
 * Periodically verifies the health of the crew_manager (Python environment).
 * If the crew sub-system is unreachable, the server exits to trigger a restart.
 */
async function performSelfHealingCheck() {
  const healthScript = path.resolve(__dirname, 'verify_health.sh');
  
  try {
    const check = spawnSync('zsh', [healthScript]);
    
    if (check.status !== 0) {
      console.error(`[WATCHDOG] Critical health check failed (Exit: ${check.status}).`);
      console.error(`[WATCHDOG] Output: ${check.stdout.toString() || check.stderr.toString()}`);
      console.error("[WATCHDOG] Initiating self-healing restart...");
      process.exit(1); // Exit to trigger container/PM2 restart
    }
  } catch (error) {
    console.error("[WATCHDOG] Failed to execute health check:", error.message);
  }
}

// Run health check every 60 seconds after a 10-second warm-up
const HEALTH_CHECK_INTERVAL = 60000;

/**
 * List available tools for the MCP Agent
 */
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOL_DEFINITIONS
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  const LLM_TOOLS = ["run_factory_mission", "run_batch_missions", "run_crew_agent", "search_code"];
  if (LLM_TOOLS.includes(name) && !process.env.OPENROUTER_API_KEY) {
    return {
      isError: true,
      content: [{ type: "text", text: "Error: OPENROUTER_API_KEY environment variable is not set on the MCP server." }]
    };
  }

  if (name === "deploy_production" && (!process.env.GITHUB_TOKEN || !process.env.GITHUB_REPO)) {
    return {
      isError: true,
      content: [{ type: "text", text: "Error: GITHUB_TOKEN or GITHUB_REPO environment variables are not set on the MCP server. Deployment aborted." }]
    };
  }

  const result = await handleToolCall(name, args, {
    notify: (msg) => {
      server.notification({
        method: "notifications/message",
        params: { level: "info", logger: "SovereignFactory", data: msg },
      });
    }
  });

  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  // Start the health watchdog loop
  setTimeout(() => {
    console.error("[WATCHDOG] Monitoring Crew Manager health...");
    setInterval(performSelfHealingCheck, HEALTH_CHECK_INTERVAL);
  }, 10000);
}

main().catch((error) => {
  console.error("MCP Server Error:", error);
  process.exit(1);
});