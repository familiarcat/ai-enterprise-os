#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# p1-s2-mcp-client.sh — Phase 1, Step 2: MCP client service stub
#
# Generates the MCPClient TypeScript service (EventSource SSE + JSON-RPC POST)
# inside the VSCode extension's src/services/ directory if it doesn't exist.
# Assigned crew: Geordi La Forge (engineer robust systems, MCP integration).
# MCP tool on failure: run_factory_mission
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
source "$SCRIPT_DIR/lib/crew-fail.sh"

STEP="p1-s2-mcp-client"
step_header "PHASE 1 — VSCODE EXTENSION MVP" "Step 2: MCP Client Service"

EXT_DIR="$ROOT/apps/vscode"
SERVICES_DIR="$EXT_DIR/src/services"
MCP_CLIENT="$SERVICES_DIR/MCPClient.ts"

mkdir -p "$SERVICES_DIR"

if [[ -f "$MCP_CLIENT" ]]; then
  # Validate key signatures exist
  MISSING_SIG=()
  for sig in "listTools" "callTool" "openSSE" "sessionId"; do
    grep -q "$sig" "$MCP_CLIENT" || MISSING_SIG+=("$sig")
  done

  if [[ ${#MISSING_SIG[@]} -eq 0 ]]; then
    echo "  ✔  MCPClient.ts exists and has required method signatures"
    phase_pass "$STEP"
    exit 0
  else
    echo "  ⚠  MCPClient.ts exists but missing: ${MISSING_SIG[*]} — regenerating"
  fi
fi

echo "  Writing MCPClient.ts..."
cat > "$MCP_CLIENT" <<'MCPCLIENT'
/**
 * MCPClient.ts — Sovereign Factory VSCode Extension
 *
 * Implements the MCP client over HTTP/SSE transport, matching the protocol
 * exposed by apps/api/mcp-http-bridge.mjs.
 *
 * Protocol:
 *   GET  /sse          → EventSource SSE stream; receives sessionId via endpoint event
 *   POST /messages     → JSON-RPC 2.0 method calls routed by ?sessionId=
 *   GET  /crew/personas→ Star Trek persona→model map
 */
import * as vscode from 'vscode';
import EventSource from 'eventsource';

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface MCPResult {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

export type PersonaKey =
  | 'captain_picard' | 'commander_data' | 'commander_riker'
  | 'geordi_la_forge' | 'chief_obrien' | 'lt_worf'
  | 'counselor_troi' | 'dr_crusher' | 'lt_uhura' | 'quark';

export interface CrewPersona {
  role: string;
  model: string;
}

export class MCPClient {
  private bridgeUrl: string;
  private sessionId: string | null = null;
  private eventSource: EventSource | null = null;
  private requestId = 0;
  private pendingRequests = new Map<number, {
    resolve: (value: unknown) => void;
    reject: (reason: Error) => void;
  }>();
  private _onProgress: ((msg: string) => void) | null = null;
  private _onDisconnect: (() => void) | null = null;
  private outputChannel: vscode.OutputChannel;

  constructor(bridgeUrl: string, outputChannel: vscode.OutputChannel) {
    this.bridgeUrl = bridgeUrl.replace(/\/$/, '');
    this.outputChannel = outputChannel;
  }

  // ── SSE connection ─────────────────────────────────────────────────────────
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.log('Connecting to MCP bridge at ' + this.bridgeUrl + '/sse');

      this.eventSource = new EventSource(this.bridgeUrl + '/sse');

      this.eventSource.addEventListener('endpoint', (e: MessageEvent) => {
        // Bridge sends: data: /messages?sessionId=<uuid>
        const match = e.data.match(/sessionId=([^&\s]+)/);
        if (match) {
          this.sessionId = match[1];
          this.log('SSE session established: ' + this.sessionId);
          this.sendInitialize().then(resolve).catch(reject);
        }
      });

      this.eventSource.addEventListener('message', (e: MessageEvent) => {
        try {
          const msg = JSON.parse(e.data);
          this.handleMessage(msg);
        } catch {
          // Notification or non-JSON — log only
          this.log('[notification] ' + e.data.slice(0, 200));
        }
      });

      this.eventSource.onerror = (err) => {
        this.log('[SSE error] ' + JSON.stringify(err));
        this._onDisconnect?.();
        if (!this.sessionId) reject(new Error('SSE connection failed'));
      };

      // Timeout
      setTimeout(() => {
        if (!this.sessionId) {
          this.eventSource?.close();
          reject(new Error('SSE connect timeout (5s)'));
        }
      }, 5000);
    });
  }

  disconnect() {
    this.eventSource?.close();
    this.eventSource = null;
    this.sessionId = null;
    this.pendingRequests.clear();
  }

  get isConnected(): boolean {
    return this.sessionId !== null;
  }

  onProgress(cb: (msg: string) => void) { this._onProgress = cb; }
  onDisconnect(cb: () => void) { this._onDisconnect = cb; }

  // ── JSON-RPC send ──────────────────────────────────────────────────────────
  private async sendRPC(method: string, params: unknown): Promise<unknown> {
    if (!this.sessionId) throw new Error('Not connected — call connect() first');

    const id = ++this.requestId;
    const body = JSON.stringify({ jsonrpc: '2.0', id, method, params });

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      fetch(`${this.bridgeUrl}/messages?sessionId=${this.sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      }).then(async (res) => {
        if (!res.ok) {
          this.pendingRequests.delete(id);
          reject(new Error(`HTTP ${res.status}: ${await res.text()}`));
        }
        // Response comes via SSE message event, not HTTP body
      }).catch((err) => {
        this.pendingRequests.delete(id);
        reject(err);
      });

      // Timeout long-running tool calls (60s)
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`MCP request timeout: ${method} (id=${id})`));
        }
      }, 60_000);
    });
  }

  private handleMessage(msg: { id?: number; result?: unknown; error?: { message: string }; method?: string; params?: unknown }) {
    if (msg.id !== undefined) {
      const pending = this.pendingRequests.get(msg.id);
      if (pending) {
        this.pendingRequests.delete(msg.id);
        if (msg.error) {
          pending.reject(new Error(msg.error.message));
        } else {
          pending.resolve(msg.result);
        }
      }
    } else if (msg.method === 'notifications/progress' || msg.method === 'notifications/message') {
      // Progress notification from run_batch_missions
      const text = JSON.stringify(msg.params);
      this._onProgress?.(text);
      this.log('[progress] ' + text.slice(0, 200));
    }
  }

  private async sendInitialize() {
    await this.sendRPC('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'sovereign-factory-vscode', version: '0.1.0' },
    });
    await this.sendRPC('notifications/initialized', {});
  }

  // ── Public MCP methods ─────────────────────────────────────────────────────
  async listTools(): Promise<MCPTool[]> {
    const result = await this.sendRPC('tools/list', {}) as { tools: MCPTool[] };
    return result.tools ?? [];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<MCPResult> {
    const result = await this.sendRPC('tools/call', { name, arguments: args }) as MCPResult;
    return result;
  }

  async healthCheck(fix = false): Promise<MCPResult> {
    return this.callTool('health_check', { fix, rebuildVenv: false });
  }

  async runMission(project: string, objective: string): Promise<MCPResult> {
    return this.callTool('run_factory_mission', { project, objective });
  }

  async runBatchMissions(missions: Array<{ project: string; objective: string }>, limit = 5): Promise<MCPResult> {
    return this.callTool('run_batch_missions', { missions, limit });
  }

  async runCrewAgent(objective: string, agents: Array<{ persona: PersonaKey; [k: string]: unknown }>): Promise<MCPResult> {
    return this.callTool('run_crew_agent', { objective, agents });
  }

  async searchCode(path: string, functionName: string, itemType = 'function'): Promise<MCPResult> {
    return this.callTool('search_code', { path, function_name: functionName, item_type: itemType });
  }

  async gitOperation(action: 'commit' | 'push' | 'status', message?: string): Promise<MCPResult> {
    return this.callTool('git_operation', { action, message });
  }

  async getVersionsHierarchy(): Promise<MCPResult> {
    return this.callTool('get_versions_hierarchy', {});
  }

  async getPersonas(): Promise<Record<PersonaKey, CrewPersona>> {
    const res = await fetch(`${this.bridgeUrl}/crew/personas`);
    const data = await res.json() as { personas: Record<PersonaKey, CrewPersona> };
    return data.personas;
  }

  private log(msg: string) {
    this.outputChannel.appendLine(`[MCP] ${msg}`);
  }
}
MCPCLIENT
echo "  ✔  MCPClient.ts written ($MCP_CLIENT)"

# ── Verify it parses as valid TS (if tsc available) ──────────────────────────
if command -v tsc &>/dev/null; then
  echo "  Checking TypeScript syntax..."
  if ! tsc --noEmit --allowSyntheticDefaultImports --module commonjs \
       --target ES2020 --lib ES2020 --skipLibCheck "$MCP_CLIENT" 2>/tmp/p1s2-tsc.txt; then
    crew_fail \
      --step    "$STEP" \
      --persona "geordi_la_forge" \
      --tool    "run_factory_mission" \
      --tool-args '{"project": "ai-enterprise-os", "objective": "Fix TypeScript compilation errors in apps/vscode/src/services/MCPClient.ts"}' \
      --context "MCPClient.ts was generated but tsc reports type errors." \
      --error   "$(cat /tmp/p1s2-tsc.txt)"
    exit 1
  fi
  echo "  ✔  TypeScript syntax valid"
else
  echo "  ⚠  tsc not found — syntax not validated (install TypeScript globally to enable)"
fi

phase_pass "$STEP"
