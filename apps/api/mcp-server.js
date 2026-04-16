const path = require("path");
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { CallToolRequestSchema, ListToolsRequestSchema } = require("@modelcontextprotocol/sdk/types.js");
const { 
  invokeUnzipSearchTool, runMission, runMissions, getVersionsHierarchy, 
  manageProject, manageSprint, manageTask, invokeCrewAgent, gitOperation,
  verifyIntegrity, listAvailableMCPs
} = require("../../core/orchestrator.js");

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
  tools: [
    {
      name: "search_code",
      description: "Search for functions, classes, or patterns in a zip or folder",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string" },
          function_name: { type: "string" },
          item_type: { type: "string", enum: ["function", "class", "type", "enum"] }
        },
        required: ["path", "function_name"]
      }
    },
    {
      name: "run_factory_mission",
      description: "Trigger a full mission to analyze evolution and scaffold new DDD domains",
      inputSchema: {
        type: "object",
        properties: {
          project: { type: "string" },
          objective: { type: "string" }
        },
        required: ["project", "objective"]
      }
    },
    {
      name: "run_batch_missions",
      description: "Trigger multiple missions concurrently and return a summary of pnpm recursive tests across generated domains",
      inputSchema: {
        type: "object",
        properties: {
          missions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                project: { type: "string" },
                objective: { type: "string" }
              },
              required: ["project", "objective"]
            }
          },
          limit: { type: "number", description: "Maximum number of concurrent missions (default is 5)" }
        },
        required: ["missions"]
      }
    },
    {
      name: "get_versions_hierarchy",
      description: "Extract a structured JSON hierarchy of all project versions in the /versions folder",
      inputSchema: {
        type: "object",
        properties: {}
      }
    },
    {
      name: "manage_project",
      description: "Initialize or update project-level metadata and context.",
      inputSchema: {
        type: "object",
        properties: {
          project: { type: "string" },
          action: { type: "string", enum: ["create", "update", "archive"] },
          details: { type: "object" }
        },
        required: ["project", "action"]
      }
    },
    {
      name: "manage_sprint",
      description: "Manage Agile sprints (create, start, or close) within a project.",
      inputSchema: {
        type: "object",
        properties: {
          project: { type: "string" },
          action: { type: "string", enum: ["create", "start", "close"] },
          sprint_name: { type: "string" },
          details: { type: "object" }
        },
        required: ["project", "action", "sprint_name"]
      }
    },
    {
      name: "manage_task",
      description: "Create, move, or assign tasks within a project or sprint.",
      inputSchema: {
        type: "object",
        properties: {
          project: { type: "string" },
          action: { type: "string", enum: ["create", "assign", "move", "complete"] },
          task_id: { type: "string" },
          details: { type: "object" }
        },
        required: ["project", "action"]
      }
    },
    {
      name: "run_crew_agent",
      description: "Execute a complex multi-agent workflow using the CrewAI framework.",
      inputSchema: {
        type: "object",
        properties: {
          objective: { type: "string" },
          agents: { 
            type: "array",
            items: { type: "object" } 
          }
        },
        required: ["objective", "agents"]
      }
    },
    {
      name: "health_check",
      description: "Verify the integrity of the workspace, environment variables, and memory systems.",
      inputSchema: {
        type: "object",
        properties: {
          fix: { 
            type: "boolean", 
            description: "If true, attempts to automatically install missing Python dependencies." 
          },
          rebuildVenv: {
            type: "boolean",
            description: "If true, deletes and recreates the .venv folder from scratch."
          }
        }
      }
    },
    {
      name: "git_operation",
      description: "Perform git actions like commit or push to save platform progress.",
      inputSchema: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["commit", "push", "status"] },
          message: { type: "string", description: "Commit message" }
        },
        required: ["action"]
      }
    },
    {
      name: "list_available_mcps",
      description: "Lists available MCP servers from the factory registry with Worf's security audit.",
      inputSchema: {
        type: "object",
        properties: {}
      }
    }
  ]
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
    result = await runMission(args.project, args.objective);
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
  } else if (name === "list_available_mcps") {
    result = await listAvailableMCPs();
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