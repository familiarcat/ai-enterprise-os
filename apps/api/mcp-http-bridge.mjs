/**
 * MCP HTTP Bridge — Sovereign Factory
 *
 * Converts the stdio-only MCP server into an HTTP/SSE transport so that
 * the alex-dashboard (openrouter-crew-platform) and any other HTTP MCP
 * client can reach ai-enterprise-os over the network.
 *
 * Protocol:
 *   GET  /sse          → Establishes an SSE stream; client receives MCP events
 *   POST /messages     → Client sends MCP JSON-RPC; routed to the right session
 *   GET  /health       → Quick liveness check (no MCP needed)
 *
 * Each SSE connection gets its own MCP Server instance so session state
 * is fully isolated. The sessionId (injected into the /messages URL by
 * SSEServerTransport) acts as the routing key.
 *
 * Star Trek Crew Persona → CrewAI Role → OpenRouter Model mapping is
 * applied automatically when run_crew_agent receives a persona name,
 * so openrouter-crew-platform's crew webhook system routes to the
 * cheapest capable model for each character.
 *
 * Usage:
 *   node apps/api/mcp-http-bridge.mjs
 *   PORT=3002 node apps/api/mcp-http-bridge.mjs
 */

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import express from 'express';
import cors from 'cors';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

// ── CJS interop ──────────────────────────────────────────────────────────────
const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
require('dotenv').config({ path: resolve(__dirname, '../../.env') });

const {
  invokeUnzipSearchTool,
  runMission,
  runMissions,
  getVersionsHierarchy,
  manageProject,
  manageSprint,
  manageTask,
  invokeCrewAgent,
  gitOperation,
  verifyIntegrity,
} = require('../../core/orchestrator.js');

// ── Star Trek Crew Persona → Agent Role + Model mapping ──────────────────────
// These personas come from openrouter-crew-platform's .env webhook system.
// Each is mapped to the cheapest OpenRouter model that fits the role's
// cognitive demands, honouring the $1.50/execution budget target.
const CREW_PERSONAS = {
  captain_picard:    { role: 'Sovereign Crew Manager',     goal: 'Provide strategic direction and coordinate the crew toward mission success', model: process.env.MODEL_CREW_MANAGER  || 'anthropic/claude-3-haiku' },
  commander_data:    { role: 'DDD Architect',               goal: 'Validate structural decisions and enforce architectural constraints',        model: process.env.MODEL_ARCHITECT     || 'anthropic/claude-3-haiku' },
  commander_riker:   { role: 'Senior Full-Stack Developer', goal: 'Implement mission-critical features with production quality',                model: process.env.MODEL_DEVELOPER     || 'anthropic/claude-3-5-sonnet' },
  geordi_la_forge:   { role: 'Senior Full-Stack Developer', goal: 'Engineer robust systems and solve complex technical problems',               model: process.env.MODEL_DEVELOPER     || 'anthropic/claude-3-5-sonnet' },
  chief_obrien:      { role: 'Senior Full-Stack Developer', goal: 'Integrate components and ensure reliable implementation',                    model: process.env.MODEL_INTEGRATION   || 'openai/gpt-4o-mini' },
  lt_worf:           { role: 'Senior QA Auditor',           goal: 'Aggressively challenge every assumption and find failure modes',             model: process.env.MODEL_QA_AUDITOR    || 'openai/gpt-4o-mini' },
  counselor_troi:    { role: 'Expert System Analyst',       goal: 'Interpret user intent and surface UX signal from data patterns',            model: process.env.MODEL_ANALYST       || 'anthropic/claude-3-haiku' },
  dr_crusher:        { role: 'Expert System Analyst',       goal: 'Diagnose system health and prescribe corrective actions',                   model: process.env.MODEL_ANALYST       || 'anthropic/claude-3-haiku' },
  lt_uhura:          { role: 'Expert System Analyst',       goal: 'Analyze communication patterns and cross-system integration signals',        model: process.env.MODEL_ANALYST       || 'google/gemini-flash-1.5' },
  quark:             { role: 'Expert System Analyst',       goal: 'Maximize ROI, minimize cost, exploit arbitrage opportunities in model routing', model: process.env.MODEL_COST_OPT  || 'google/gemini-flash-1.5' },
};

// Normalise a crew name to its persona key (handles spaces, case, dashes)
function normalisePersonaKey(name) {
  return name
    .toLowerCase()
    .replace(/^(captain|commander|lieutenant|lt\.|lt|counselor|dr\.|dr|chief)\s+/, (_, prefix) => {
      const map = { captain: 'captain', commander: 'commander', lieutenant: 'lt', 'lt.': 'lt', lt: 'lt', counselor: 'counselor', 'dr.': 'dr', dr: 'dr', chief: 'chief' };
      return (map[prefix.trim()] || prefix.trim()) + '_';
    })
    .replace(/[\s\-]+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

/**
 * Enrich a run_crew_agent agents[] array with persona defaults.
 * Agents that already have an explicit model keep it; persona-matched
 * agents get the cost-optimised model injected.
 */
function enrichAgentsWithPersonas(agents = []) {
  return agents.map((agent) => {
    const key = normalisePersonaKey(agent.persona || agent.role || '');
    const persona = CREW_PERSONAS[key];
    if (!persona) return agent;
    return {
      role:      agent.role      || persona.role,
      goal:      agent.goal      || persona.goal,
      backstory: agent.backstory || `You are ${(agent.persona || agent.role)}, a specialist in the Sovereign Factory crew.`,
      model:     agent.model     || persona.model,  // per-agent model override
      ...agent,
    };
  });
}

// ── Tool definitions (shared across all Server instances) ────────────────────
const TOOL_LIST = [
  {
    name: 'search_code',
    description: 'Search for functions, classes, or patterns in a zip or folder',
    inputSchema: { type: 'object', properties: { path: { type: 'string' }, function_name: { type: 'string' }, item_type: { type: 'string', enum: ['function', 'class', 'type', 'enum'] } }, required: ['path', 'function_name'] },
  },
  {
    name: 'run_factory_mission',
    description: 'Trigger a full mission to analyse evolution and scaffold new DDD domains',
    inputSchema: { type: 'object', properties: { project: { type: 'string' }, objective: { type: 'string' } }, required: ['project', 'objective'] },
  },
  {
    name: 'run_batch_missions',
    description: 'Trigger multiple missions concurrently and return a summary of pnpm recursive tests across generated domains',
    inputSchema: {
      type: 'object',
      properties: {
        missions: { type: 'array', items: { type: 'object', properties: { project: { type: 'string' }, objective: { type: 'string' } }, required: ['project', 'objective'] } },
        limit: { type: 'number', description: 'Maximum concurrent missions (default 5)' },
      },
      required: ['missions'],
    },
  },
  {
    name: 'get_versions_hierarchy',
    description: 'Extract a structured JSON hierarchy of all project versions in the /versions folder',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'manage_project',
    description: 'Initialise or update project-level metadata and context',
    inputSchema: { type: 'object', properties: { project: { type: 'string' }, action: { type: 'string', enum: ['create', 'update', 'archive'] }, details: { type: 'object' } }, required: ['project', 'action'] },
  },
  {
    name: 'manage_sprint',
    description: 'Manage Agile sprints (create, start, or close) within a project',
    inputSchema: { type: 'object', properties: { project: { type: 'string' }, action: { type: 'string', enum: ['create', 'start', 'close'] }, sprint_name: { type: 'string' }, details: { type: 'object' } }, required: ['project', 'action', 'sprint_name'] },
  },
  {
    name: 'manage_task',
    description: 'Create, move, or assign tasks within a project or sprint',
    inputSchema: { type: 'object', properties: { project: { type: 'string' }, action: { type: 'string', enum: ['create', 'assign', 'move', 'complete'] }, task_id: { type: 'string' }, details: { type: 'object' } }, required: ['project', 'action'] },
  },
  {
    name: 'run_crew_agent',
    description: 'Execute a complex multi-agent CrewAI workflow. Agents can specify a "persona" (Star Trek crew name) to auto-select the cost-optimised model for that role.',
    inputSchema: {
      type: 'object',
      properties: {
        objective: { type: 'string' },
        agents: {
          type: 'array',
          items: {
            type: 'object',
            description: 'Agent config. Include "persona" (e.g. "Geordi La Forge") to auto-map role+model.',
          },
        },
      },
      required: ['objective', 'agents'],
    },
  },
  {
    name: 'health_check',
    description: 'Verify the integrity of the workspace, environment variables, and memory systems',
    inputSchema: { type: 'object', properties: { fix: { type: 'boolean' }, rebuildVenv: { type: 'boolean' } } },
  },
  {
    name: 'git_operation',
    description: 'Perform git actions (commit, push, status) to save platform progress',
    inputSchema: { type: 'object', properties: { action: { type: 'string', enum: ['commit', 'push', 'status'] }, message: { type: 'string' } }, required: ['action'] },
  },
];

// ── MCP Server factory ────────────────────────────────────────────────────────
// Creates a fully wired Server instance for one SSE session. A closure
// over `serverRef` lets batch-mission progress notifications reach the
// correct SSE channel without a global lookup.

function createMCPServer() {
  const serverRef = { instance: null };

  const server = new Server(
    { name: 'sovereign-factory', version: '1.0.0' },
    { capabilities: { tools: {}, logging: {} } }
  );

  serverRef.instance = server;

  // ── List tools ──────────────────────────────────────────────────────────
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOL_LIST }));

  // ── Execute tools ───────────────────────────────────────────────────────
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    const LLM_TOOLS = ['run_factory_mission', 'run_batch_missions', 'run_crew_agent', 'search_code'];
    if (LLM_TOOLS.includes(name) && !process.env.OPENROUTER_API_KEY) {
      return { isError: true, content: [{ type: 'text', text: `Error: OPENROUTER_API_KEY is not set on the MCP bridge. Required for tool: ${name}` }] };
    }

    let result;

    switch (name) {
      case 'search_code':
        result = await invokeUnzipSearchTool(args);
        break;

      case 'run_factory_mission':
        result = await runMission(args.project, args.objective);
        break;

      case 'run_batch_missions':
        result = await runMissions(args.missions, args.limit, (info) => {
          // Stream progress events back through this session's SSE channel
          server.notification({
            method: 'notifications/message',
            params: {
              level: 'info',
              logger: 'SovereignFactory',
              data: `[Batch] ${info.index + 1}/${info.total}: ${info.objective}`,
            },
          });
        });
        break;

      case 'get_versions_hierarchy':
        result = await getVersionsHierarchy();
        break;

      case 'manage_project':
        result = await manageProject(args.project, args.action, args.details);
        break;

      case 'manage_sprint':
        result = await manageSprint(args.project, args.action, args.sprint_name, args.details);
        break;

      case 'manage_task':
        result = await manageTask(args.project, args.action, args.task_id, args.details);
        break;

      case 'run_crew_agent': {
        // Inject Star Trek persona → role/goal/backstory/model before handing
        // off to the Python CrewAI engine, enabling per-character cost routing.
        const enrichedArgs = {
          ...args,
          agents: enrichAgentsWithPersonas(args.agents || []),
        };
        result = await invokeCrewAgent(enrichedArgs);
        break;
      }

      case 'git_operation':
        result = await gitOperation(args.project, args.action, args.message);
        break;

      case 'health_check': {
        const { spawnSync } = require('child_process');
        const scriptPath = resolve(__dirname, '../../scripts/verify_health.sh');
        const scriptArgs = [scriptPath];
        if (args.fix) scriptArgs.push('--fix');
        if (args.rebuildVenv) scriptArgs.push('--rebuild');
        const check = spawnSync('zsh', scriptArgs);
        const integrity = await verifyIntegrity();
        result = {
          status: (check.status === 0 && Object.values(integrity).every(v => v === 'healthy')) ? 'healthy' : 'degraded',
          python_report: check.stdout?.toString() || '',
          memory_systems: integrity,
        };
        break;
      }

      default:
        return { isError: true, content: [{ type: 'text', text: `Unknown tool: ${name}` }] };
    }

    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  return server;
}

// ── Express HTTP server ───────────────────────────────────────────────────────
const app = express();
const PORT = process.env.MCP_BRIDGE_PORT || 3002;

// Active SSE transports keyed by sessionId
const transports = new Map();

app.use(cors({
  origin: process.env.MCP_BRIDGE_CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-Id'],
}));

// Raw body needed by SSEServerTransport.handlePostMessage
app.use('/messages', express.raw({ type: '*/*', limit: '4mb' }));
app.use(express.json());

// ── GET /health — quick liveness probe (used by dev-local.sh + Docker) ───────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'mcp-http-bridge',
    version: '1.0.0',
    sessions: transports.size,
    timestamp: new Date().toISOString(),
  });
});

// ── GET /sse — establish an SSE connection and bind a new MCP Server ──────────
app.get('/sse', async (req, res) => {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  if (process.env.MCP_BRIDGE_API_KEY && apiKey !== process.env.MCP_BRIDGE_API_KEY) {
    return res.status(401).json({ error: 'Unauthorised: invalid api key' });
  }

  const server = createMCPServer();
  const transport = new SSEServerTransport('/messages', res);

  // Store before connect so concurrent POSTs can find it immediately
  transports.set(transport.sessionId, transport);
  console.log(`[MCP Bridge] SSE session opened: ${transport.sessionId} (active: ${transports.size})`);

  req.on('close', () => {
    transports.delete(transport.sessionId);
    console.log(`[MCP Bridge] SSE session closed: ${transport.sessionId} (active: ${transports.size})`);
  });

  try {
    await server.connect(transport);
  } catch (err) {
    console.error(`[MCP Bridge] Server connect error (${transport.sessionId}):`, err.message);
    transports.delete(transport.sessionId);
    if (!res.headersSent) res.status(500).end();
  }
});

// ── POST /messages — route incoming MCP JSON-RPC to the correct session ───────
app.post('/messages', async (req, res) => {
  const sessionId = req.query.sessionId;
  if (!sessionId) {
    return res.status(400).json({ error: 'Missing sessionId query parameter' });
  }

  const transport = transports.get(sessionId);
  if (!transport) {
    return res.status(404).json({ error: `Session not found: ${sessionId}` });
  }

  try {
    await transport.handlePostMessage(req, res);
  } catch (err) {
    console.error(`[MCP Bridge] handlePostMessage error (${sessionId}):`, err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

// ── GET /crew/personas — expose persona→model map for the dashboard ───────────
app.get('/crew/personas', (req, res) => {
  const summary = Object.entries(CREW_PERSONAS).reduce((acc, [key, cfg]) => {
    acc[key] = { role: cfg.role, model: cfg.model };
    return acc;
  }, {});
  res.json({ personas: summary, count: Object.keys(summary).length });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 MCP HTTP Bridge running on http://localhost:${PORT}`);
  console.log(`   SSE endpoint : GET  http://localhost:${PORT}/sse`);
  console.log(`   Message POST : POST http://localhost:${PORT}/messages?sessionId=<id>`);
  console.log(`   Health       : GET  http://localhost:${PORT}/health`);
  console.log(`   Crew personas: GET  http://localhost:${PORT}/crew/personas`);
  console.log(`\n   Active crew model routing:`);
  Object.entries(CREW_PERSONAS).forEach(([k, v]) => {
    console.log(`     ${k.padEnd(20)} → ${v.model}`);
  });
  console.log('');
});
