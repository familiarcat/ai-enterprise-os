#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# p1-s3-webview-port.sh — Phase 1, Step 3: Port SovereignAgentViewport to extension
#
# Copies or generates the WebView panel provider that renders the streaming
# agent output inside VSCode, based on SovereignAgentViewport.tsx from
# openrouter-crew-platform.
# Assigned crew: Counselor Troi (interpret signals, user-facing UX wiring).
# MCP tool on failure: run_factory_mission
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
source "$SCRIPT_DIR/lib/crew-fail.sh"

STEP="p1-s3-webview-port"
step_header "PHASE 1 — VSCODE EXTENSION MVP" "Step 3: AgentViewport WebView"

EXT_DIR="$ROOT/apps/vscode"
VIEWS_DIR="$EXT_DIR/src/views"
VIEWPORT_FILE="$VIEWS_DIR/AgentViewportPanel.ts"

mkdir -p "$VIEWS_DIR"

# ── Try to locate the source component in openrouter-crew-platform ────────────
ORC_CANDIDATES=(
  "$(dirname "$ROOT")/openrouter-crew-platform"
  "$HOME/Dev/openrouter-crew-platform"
)
ORC_ROOT=""
for c in "${ORC_CANDIDATES[@]}"; do [[ -d "$c" ]] && ORC_ROOT="$c" && break; done

SOURCE_COMPONENT=""
if [[ -n "$ORC_ROOT" ]]; then
  SOURCE_COMPONENT=$(find "$ORC_ROOT" -name "SovereignAgentViewport.tsx" 2>/dev/null | head -1 || true)
  [[ -n "$SOURCE_COMPONENT" ]] && echo "  ✔  Found source: $SOURCE_COMPONENT"
fi

if [[ -f "$VIEWPORT_FILE" ]]; then
  echo "  ✔  AgentViewportPanel.ts already exists"
  phase_pass "$STEP"
  exit 0
fi

echo "  Writing AgentViewportPanel.ts..."
cat > "$VIEWPORT_FILE" <<'VIEWPORT'
/**
 * AgentViewportPanel.ts — Sovereign Factory VSCode Extension
 *
 * Renders a WebView panel that streams MCP agent output in real-time.
 * Mirrors the SovereignAgentViewport.tsx component from alex-dashboard,
 * adapted for VSCode's WebView API.
 */
import * as vscode from 'vscode';
import type { MCPClient } from '../services/MCPClient';

export class AgentViewportPanel {
  public static currentPanel: AgentViewportPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];
  private _mcpClient: MCPClient;
  private _messageHistory: Array<{ role: string; content: string; ts: number }> = [];

  static createOrShow(extensionUri: vscode.Uri, mcpClient: MCPClient) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (AgentViewportPanel.currentPanel) {
      AgentViewportPanel.currentPanel._panel.reveal(column);
      return AgentViewportPanel.currentPanel;
    }

    const panel = vscode.window.createWebviewPanel(
      'sovereign.agentViewport',
      'Sovereign — Agent Viewport',
      column ?? vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')],
      }
    );

    AgentViewportPanel.currentPanel = new AgentViewportPanel(panel, mcpClient);
    return AgentViewportPanel.currentPanel;
  }

  private constructor(panel: vscode.WebviewPanel, mcpClient: MCPClient) {
    this._panel = panel;
    this._mcpClient = mcpClient;

    this._panel.webview.html = this._getHtml();

    // Wire progress notifications from MCP into the WebView
    this._mcpClient.onProgress((msg) => {
      this._panel.webview.postMessage({ type: 'progress', text: msg });
    });

    // Handle messages sent from the WebView JS back to the extension
    this._panel.webview.onDidReceiveMessage(
      async (message: { command: string; text?: string; persona?: string }) => {
        switch (message.command) {
          case 'runMission':
            await this._handleRunMission(message.text ?? '', message.persona);
            break;
          case 'healthCheck':
            await this._handleHealthCheck();
            break;
          case 'clearHistory':
            this._messageHistory = [];
            this._panel.webview.postMessage({ type: 'clearHistory' });
            break;
        }
      },
      null,
      this._disposables
    );

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
  }

  private async _handleRunMission(objective: string, persona?: string) {
    if (!objective.trim()) return;

    this._panel.webview.postMessage({ type: 'thinking', persona });

    try {
      let result;
      if (persona) {
        result = await this._mcpClient.runCrewAgent(objective, [
          { persona: persona as never },
        ]);
      } else {
        const ws = vscode.workspace.workspaceFolders?.[0]?.name ?? 'sovereign';
        result = await this._mcpClient.runMission(ws, objective);
      }
      const text = result.content.map((c) => c.text).join('\n');
      this._messageHistory.push({ role: 'agent', content: text, ts: Date.now() });
      this._panel.webview.postMessage({ type: 'result', text, persona });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this._panel.webview.postMessage({ type: 'error', text: errMsg });
    }
  }

  private async _handleHealthCheck() {
    this._panel.webview.postMessage({ type: 'thinking', persona: 'dr_crusher' });
    try {
      const result = await this._mcpClient.healthCheck();
      const text = result.content.map((c) => c.text).join('\n');
      this._panel.webview.postMessage({ type: 'result', text, persona: 'dr_crusher' });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this._panel.webview.postMessage({ type: 'error', text: errMsg });
    }
  }

  private _getHtml(): string {
    return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sovereign Agent Viewport</title>
  <style>
    :root { --accent: #00d4aa; --bg: #0d1117; --surface: #161b22; --text: #e6edf3; --muted: #8b949e; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: var(--bg); color: var(--text); font-family: 'Segoe UI', system-ui, sans-serif; height: 100vh; display: flex; flex-direction: column; }
    #toolbar { background: var(--surface); padding: 8px 12px; display: flex; gap: 8px; align-items: center; border-bottom: 1px solid #30363d; }
    #toolbar select { background: var(--bg); color: var(--text); border: 1px solid #30363d; border-radius: 4px; padding: 4px 8px; font-size: 12px; }
    #toolbar button { background: var(--accent); color: #000; border: none; border-radius: 4px; padding: 6px 14px; font-size: 12px; font-weight: 600; cursor: pointer; }
    #toolbar button.secondary { background: transparent; color: var(--muted); border: 1px solid #30363d; }
    #viewport { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
    .message { padding: 12px 16px; border-radius: 8px; line-height: 1.6; font-size: 13px; max-width: 100%; white-space: pre-wrap; }
    .message.agent  { background: var(--surface); border-left: 3px solid var(--accent); }
    .message.error  { background: #1a0a0a; border-left: 3px solid #f85149; color: #f85149; }
    .message.system { color: var(--muted); font-size: 11px; font-style: italic; }
    .thinking { display: flex; align-items: center; gap: 8px; color: var(--muted); font-size: 12px; padding: 8px 16px; }
    .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); animation: pulse 1s infinite; }
    .dot:nth-child(2) { animation-delay: 0.2s; } .dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes pulse { 0%,100%{opacity:.3} 50%{opacity:1} }
    #input-area { background: var(--surface); padding: 12px; border-top: 1px solid #30363d; display: flex; gap: 8px; }
    #objective { flex: 1; background: var(--bg); color: var(--text); border: 1px solid #30363d; border-radius: 6px; padding: 8px 12px; font-size: 13px; resize: none; min-height: 48px; }
    #send-btn { background: var(--accent); color: #000; border: none; border-radius: 6px; padding: 8px 16px; font-weight: 600; cursor: pointer; align-self: flex-end; }
  </style>
</head>
<body>
  <div id="toolbar">
    <select id="persona-select">
      <option value="">Auto (no persona)</option>
      <option value="captain_picard">Captain Picard — Strategy</option>
      <option value="commander_data">Commander Data — Architecture</option>
      <option value="commander_riker" selected>Commander Riker — Development</option>
      <option value="geordi_la_forge">Geordi La Forge — Engineering</option>
      <option value="chief_obrien">Chief O'Brien — Integration</option>
      <option value="lt_worf">Lt. Worf — QA Audit</option>
      <option value="counselor_troi">Counselor Troi — UX Analysis</option>
      <option value="dr_crusher">Dr. Crusher — Health Check</option>
      <option value="lt_uhura">Lt. Uhura — Communications</option>
      <option value="quark">Quark — Cost Optimization</option>
    </select>
    <button onclick="runHealthCheck()">Health Check</button>
    <button class="secondary" onclick="clearHistory()">Clear</button>
  </div>
  <div id="viewport"></div>
  <div id="input-area">
    <textarea id="objective" placeholder="Enter mission objective... (Shift+Enter to send)" rows="2"></textarea>
    <button id="send-btn" onclick="sendMission()">Send</button>
  </div>
  <script>
    const vscode = acquireVsCodeApi();
    const viewport = document.getElementById('viewport');

    function addMessage(cls, text) {
      const el = document.createElement('div');
      el.className = 'message ' + cls;
      el.textContent = text;
      viewport.appendChild(el);
      viewport.scrollTop = viewport.scrollHeight;
      return el;
    }
    function setThinking(persona) {
      const el = document.createElement('div');
      el.className = 'thinking';
      el.id = 'thinking-indicator';
      el.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>'
        + '<span>' + (persona || 'Agent') + ' is thinking...</span>';
      viewport.appendChild(el);
      viewport.scrollTop = viewport.scrollHeight;
    }
    function clearThinking() { document.getElementById('thinking-indicator')?.remove(); }

    function sendMission() {
      const objective = document.getElementById('objective').value.trim();
      if (!objective) return;
      const persona = document.getElementById('persona-select').value;
      addMessage('system', '▶ Mission: ' + objective.slice(0, 80) + (objective.length > 80 ? '…' : ''));
      document.getElementById('objective').value = '';
      vscode.postMessage({ command: 'runMission', text: objective, persona: persona || undefined });
    }
    function runHealthCheck() {
      addMessage('system', '▶ Running health check via Dr. Crusher...');
      vscode.postMessage({ command: 'healthCheck' });
    }
    function clearHistory() { vscode.postMessage({ command: 'clearHistory' }); }

    document.getElementById('objective').addEventListener('keydown', (e) => {
      if (e.shiftKey && e.key === 'Enter') { e.preventDefault(); sendMission(); }
    });

    window.addEventListener('message', (event) => {
      const msg = event.data;
      clearThinking();
      if (msg.type === 'thinking')  { setThinking(msg.persona); }
      else if (msg.type === 'result')  { addMessage('agent', msg.text); }
      else if (msg.type === 'error')   { addMessage('error', '✗ ' + msg.text); }
      else if (msg.type === 'progress'){ addMessage('system', msg.text); }
      else if (msg.type === 'clearHistory') { viewport.innerHTML = ''; }
    });

    addMessage('system', 'Sovereign Factory Agent Viewport — connected to MCP bridge');
  </script>
</body>
</html>`;
  }

  dispose() {
    AgentViewportPanel.currentPanel = undefined;
    this._panel.dispose();
    this._disposables.forEach((d) => d.dispose());
    this._disposables = [];
  }
}
VIEWPORT

echo "  ✔  AgentViewportPanel.ts written ($VIEWPORT_FILE)"

if [[ -n "$SOURCE_COMPONENT" ]]; then
  echo "  ℹ  Source reference: $SOURCE_COMPONENT"
  echo "     Any streaming enhancements in SovereignAgentViewport.tsx can be ported manually."
fi

phase_pass "$STEP"
