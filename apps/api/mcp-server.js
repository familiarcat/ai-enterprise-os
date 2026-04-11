const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { CallToolRequestSchema, ListToolsRequestSchema } = require("@modelcontextprotocol/sdk/types.js");
const { invokeUnzipSearchTool, runMission, runMissions, getVersionsHierarchy } = require("../../core/orchestrator.js");

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
  }

  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});

const transport = new StdioServerTransport();
await server.connect(transport);