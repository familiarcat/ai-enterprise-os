/**
 * lib/mcp-client.ts
 *
 * Client for the MCP HTTP bridge running at port 3002.
 * Wraps JSON-RPC tool calls and SSE session management.
 */

const BRIDGE_URL = process.env.NEXT_PUBLIC_MCP_BRIDGE_URL || 'http://localhost:3002';

export interface MCPToolResult {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

export interface CrewPersona {
  role:      string;
  goal:      string;
  backstory: string;
  model:     string;
}

export interface AgentStreamEvent {
  type:     'progress' | 'result' | 'error' | 'done';
  agent?:   string;
  message?: string;
  data?:    unknown;
}

// ── REST helpers ──────────────────────────────────────────────────────────────

export async function checkHealth(): Promise<{ status: string; bridge: string }> {
  const res = await fetch(`${BRIDGE_URL}/health`);
  if (!res.ok) throw new Error(`MCP bridge offline: ${res.status}`);
  return res.json();
}

export async function getCrewPersonas(): Promise<Record<string, CrewPersona>> {
  const res = await fetch(`${BRIDGE_URL}/crew/personas`);
  if (!res.ok) throw new Error(`Failed to fetch personas: ${res.status}`);
  return res.json();
}

// ── SSE session + JSON-RPC ────────────────────────────────────────────────────

let _sessionId: string | null = null;

/** Open (or reuse) an SSE session, return the sessionId */
export async function getSessionId(): Promise<string> {
  if (_sessionId) return _sessionId;

  // The bridge creates the sessionId on SSE connect; we need the server-side
  // session. For client components call the Next.js API proxy instead.
  throw new Error('getSessionId() must be called from the server-side API route');
}

/** Call an MCP tool via the bridge POST /messages endpoint */
export async function callTool(
  sessionId: string,
  toolName: string,
  args: Record<string, unknown>
): Promise<MCPToolResult> {
  const payload = {
    jsonrpc: '2.0',
    id:      Date.now(),
    method:  'tools/call',
    params:  { name: toolName, arguments: args },
  };

  const res = await fetch(`${BRIDGE_URL}/messages?sessionId=${sessionId}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`MCP tool call failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

// ── High-level mission helpers ────────────────────────────────────────────────

export interface MissionRequest {
  project:   string;
  objective: string;
  persona?:  string;
}

/** Run a factory mission via the health_check or run_factory_mission tool */
export async function runFactoryMission(
  sessionId: string,
  req: MissionRequest
): Promise<MCPToolResult> {
  return callTool(sessionId, 'run_factory_mission', {
    project:   req.project,
    objective: req.objective,
    ...(req.persona ? { persona: req.persona } : {}),
  });
}

export async function searchCode(
  sessionId: string,
  query: string,
  path?: string
): Promise<MCPToolResult> {
  return callTool(sessionId, 'search_code', { query, ...(path ? { path } : {}) });
}

export async function healthCheck(sessionId: string): Promise<MCPToolResult> {
  return callTool(sessionId, 'health_check', {});
}
