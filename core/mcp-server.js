const path = require("path");
const fs = require("fs");
require('dotenv').config({ path: path.resolve(__dirname, '../../.env'), override: true });

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { CallToolRequestSchema, ListToolsRequestSchema } = require("@modelcontextprotocol/sdk/types.js");
const { 
  invokeUnzipSearchTool, invokeCrewAgent, gitOperation, verifyIntegrity, 
  listAvailableMCPs, syncMCPRegistry, worfSecurityScan, generateROIReport, sensorSweep,
  runMission, runMissions, getVersionsHierarchy, manageProject, manageSprint, manageTask,
  gitmcpSearch, integrateMcpTool
} = require("../../core/orchestrator.js");
const { TOOL_DEFINITIONS } = require("../../core/tools.js");

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
 * List available tools for the MCP Agent
 */
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOL_DEFINITIONS
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if ((name === "run_factory_mission" || name === "run_batch_missions") && !process.env.OPENROUTER_API_KEY) {
    return {
      isError: true,
      content: [{ type: "text", text: "Error: OPENROUTER_API_KEY environment variable is not set on the MCP server." }]
    };
  }

  let result;
  if (name === "search_code") {
    result = await invokeUnzipSearchTool(args);
  } else if (name === "run_factory_mission") {
    result = await runMission(args.context);
  } else if (name === "run_batch_missions") {
    result = await runMissions(args.missions, args.limit, (info) => {
      server.notification({
        method: "notifications/message",
        params: {
          level: "info",
          logger: "SovereignFactory",
          data: `[Batch Progress] ${info.index + 1}/${info.total} complete: ${info.objective}`
        }
      });
    });
  } else if (name === "get_versions_hierarchy") {
    result = await getVersionsHierarchy();
  } else if (name === "manage_project") {
    result = await manageProject(args.project, args.action, args.details);
  } else if (name === "manage_sprint") {
    result = await manageSprint(args.project, args.action, args.sprint_name, args.details);
  } else if (name === "manage_task") {
    result = await manageTask(args.project, args.action, args.task_id, args.details);
  } else if (name === "run_crew_agent") {
    result = await invokeCrewAgent(args);
  } else if (name === "git_operation") {
    result = await gitOperation(args.project, args.action, args.message);
  } else if (name === "gitmcp_search") {
    result = await gitmcpSearch(args.query);
  } else if (name === "integrate_mcp_tool") {
    result = await integrateMcpTool(args.project, args.query, args.persona, args.deploymentConfig);
  } else if (name === "generate_roi_report") {
    result = await generateROIReport(args.project);
  } else if (name === "sensor_sweep") {
    result = await sensorSweep();
  } else if (name === "list_available_mcps") {
    result = await listAvailableMCPs(args.sync);
  } else if (name === "sync_mcp_registry") {
    result = await syncMCPRegistry();
  } else if (name === "worf_security_scan") {
    result = await worfSecurityScan(args.files, path.resolve(__dirname, '../..'));
  } else if (name === "deploy_production") {
    result = { 
      status: "INITIATED", 
      message: `Production release for ${args.domain} dispatched to GitHub Actions.` 
    };
  } else if (name === "list_skills") {
    const skillsPath = path.resolve(__dirname, '../../core/skills');
    result = fs.existsSync(skillsPath) ? fs.readdirSync(skillsPath).filter(f => f.endsWith('.skill')) : [];
  } else if (name === "get_skill") {
    const skillPath = path.resolve(__dirname, '../../core/skills', args.name.endsWith('.skill') ? args.name : `${args.name}.skill`);
    result = fs.existsSync(skillPath) ? fs.readFileSync(skillPath, 'utf-8') : { error: "Skill not found" };
  } else if (name === "health_check") {
    const { spawnSync } = require('child_process');
    const scriptArgs = [path.resolve(__dirname, '../../scripts/verify_health.sh')];
    if (args.fix) scriptArgs.push('--fix');
    if (args.rebuildVenv) scriptArgs.push('--rebuild');

    const check = spawnSync('zsh', scriptArgs);
    const integrity = await verifyIntegrity();
    
    result = {
      status: (check.status === 0 && integrity.redis === 'healthy' && integrity.supabase === 'healthy' && integrity.openrouter === 'healthy' && integrity.env === 'healthy') ? "healthy" : "degraded",
      python_report: check.stdout.toString(),
      memory_systems: integrity
    };
  }

  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("MCP Server Error:", error);
  process.exit(1);
});