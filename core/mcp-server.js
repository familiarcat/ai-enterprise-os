const path = require("path");
const fs = require("fs");
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), override: true });

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { CallToolRequestSchema, ListToolsRequestSchema } = require("@modelcontextprotocol/sdk/types.js");
const { 
  handleToolCall,
  verifyIntegrity
} = require("./orchestrator.js");
const { TOOL_DEFINITIONS } = require("./tools.js");

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

  try {
    const result = await handleToolCall(name, args, {
      notify: (message) => {
        server.notification({
          method: "notifications/message",
          params: {
            level: "info",
            logger: "SovereignFactory",
            data: message
          }
        });
      }
    });

    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (error) {
    return {
      isError: true,
      content: [{ type: "text", text: error.message }]
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("MCP Server Error:", error);
  process.exit(1);
});