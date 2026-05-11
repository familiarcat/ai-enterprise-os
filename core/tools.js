/**
 * Shared MCP Tool Definitions - Sovereign Factory
 * 
 * This file serves as the Single Source of Truth (SSOT) for all tool schemas
 * exposed via the Model Context Protocol. Consolidating these here ensures 
 * consistency between the stdio server and the HTTP bridge.
 */

const TOOL_DEFINITIONS = [
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
        context: {
          type: "object",
          properties: {
            sessionId: { type: "string" },
            persona: { type: "string", description: "Star Trek persona (e.g., captain_picard)" },
            task: { type: "string", description: "The objective of the mission" },
            memory: {
              type: "object",
              properties: {
                shortTerm: { type: "array", items: { type: "string" } },
                longTerm: { type: "array", items: { type: "string" } }
              }
            },
            constraints: { type: "array", items: { type: "string" } },
            metadata: { type: "object" }
          },
          required: ["sessionId", "task"]
        }
      },
      required: ["context"]
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
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "create_adr",
    description: "Create a new Architectural Decision Record (ADR) in the /versions directory.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "The title of the architectural decision" },
        status: { type: "string", enum: ["proposed", "accepted", "deprecated", "superseded"], default: "accepted" },
        content: { type: "string", description: "The full markdown content of the ADR" },
        deciders: { type: "array", items: { type: "string" }, description: "List of crew members involved in the decision" }
      },
      required: ["title", "content"]
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
    description: "Execute a complex multi-agent CrewAI workflow. Agents can specify a 'persona' (Star Trek crew name) to auto-select the cost-optimised model for that role.",
    inputSchema: {
      type: "object",
      properties: {
        objective: { type: "string" },
        agents: { 
          type: "array",
          items: { 
            type: "object",
            description: "Agent config. Include 'persona' (e.g. 'Geordi La Forge') to auto-map role+model."
          } 
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
        fix: { type: "boolean", description: "If true, attempts to automatically install missing Python dependencies." },
        rebuildVenv: { type: "boolean", description: "If true, deletes and recreates the .venv folder from scratch." }
      }
    }
  },
  {
    name: "git_operation",
    description: "Perform git actions like commit or push to save platform progress.",
    inputSchema: {
      type: "object",
      properties: {
        action: { type: "string", enum: ["commit", "push", "status", "branch", "merge-to-main"] },
        message: { type: "string", description: "Commit message" }
      },
      required: ["action"]
    }
  },
  {
    name: "docker_build",
    description: "Build a local Docker image from a context and Dockerfile.",
    inputSchema: {
      type: "object",
      properties: {
        tag: { type: "string", description: "Tag for the image (e.g. mcp-server:latest)" },
        dockerfile: { type: "string", description: "Path to Dockerfile relative to root" },
        context: { type: "string", description: "Build context path relative to root" }
      },
      required: ["tag", "dockerfile"]
    }
  },
  {
    name: "terraform_plan",
    description: "Execute a terraform plan in a specified directory to preview infrastructure changes.",
    inputSchema: {
      type: "object",
      properties: { dir: { type: "string", description: "Directory containing terraform files" } },
      required: ["dir"]
    }
  },
  {
    name: "sensor_sweep",
    description: "Perform a comprehensive architectural scan of all components, domains, and system integrity.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "deep_latency_check",
    description: "Measure real-time latency for all LLM endpoints configured in the system.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "gitmcp_search",
    description: "Search https://gitmcp.io/ for verified MCP server implementations and documentation",
    inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] }
  },
  {
    name: "integrate_mcp_tool",
    description: "Autonomous integration: Search GitMCP, clear via Worf, and visually add tool to project UI",
    inputSchema: { type: "object", properties: { project: { type: "string" }, query: { type: "string" }, persona: { type: "string" }, deploymentConfig: { type: "object" } }, required: ["project", "query"] }
  },
  {
    name: "deploy_production",
    description: "Trigger production deployment for a specific domain (e.g., civic)",
    inputSchema: { type: "object", properties: { domain: { type: "string" }, rationale: { type: "string" } }, required: ["domain", "rationale"] }
  },
  {
    name: "crew_roll_call",
    description: "Validate crew presence and memory system access in the Observation Lounge",
    inputSchema: { type: "object", properties: {} }
  }
];

module.exports = { TOOL_DEFINITIONS };