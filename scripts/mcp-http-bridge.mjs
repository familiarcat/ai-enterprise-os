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
require('dotenv').config({ path: resolve(__dirname, '../../.env'), override: true });

const {
  handleToolCall,
  CREW_PERSONAS,
  getMemorySystems
} = require('../../core/orchestrator.js');
const { TOOL_DEFINITIONS } = require('../../core/tools.js');

// ── MCP Server factory ────────────────────────────────────────────────────────
function createMCPServer() {
  const server = new Server(
    { name: 'sovereign-factory', version: '1.0.0' },
    { capabilities: { tools: {}, logging: {} } }
  );

  // ── List tools ──────────────────────────────────────────────────────────
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOL_DEFINITIONS }));

  // ── Execute tools ───────────────────────────────────────────────────────
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    console.log(`[MCP Bridge] 🛠️  Executing tool: ${name}`);

    try {
      const result = await handleToolCall(name, args, {
        notify: (msg) => {
          server.notification({
            method: 'notifications/message',
            params: { level: 'info', logger: 'SovereignFactory', data: msg },
          });
        }
      });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      return { isError: true, content: [{ type: 'text', text: err.message }] };
    }
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

// ── GET /api/billing/usage — Query Supabase billing table ────────────────────
app.get('/api/billing/usage', async (req, res) => {
  const { projectId } = req.query;
  if (!projectId) {
    return res.status(400).json({ error: 'Missing projectId query parameter' });
  }

  try {
    const { supabase } = getMemorySystems();
    const { data, error } = await supabase
      .from('billing')
      .select('*')
      .eq('project_id', projectId)
      .maybeSingle();

    if (error) throw error;
    res.json(data || { project_id: projectId, tokens_used: 0, quota_limit: 1000000 });
  } catch (err) {
    console.error(`[MCP Bridge] Billing fetch error:`, err.message);
    res.status(500).json({ error: err.message });
  }
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
