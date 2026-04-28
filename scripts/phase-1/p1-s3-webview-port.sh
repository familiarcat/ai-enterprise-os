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
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
source "$ROOT/scripts/lib/crew-fail.sh"

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
import * as vscode from 'vscode';
import type { MCPClient } from '../services/MCPClient';

export class AgentViewportPanel {
  public static cur: AgentViewportPanel | undefined;
  private readonly _p: vscode.WebviewPanel;
  private _d: vscode.Disposable[] = [];
  private _c: MCPClient;

  static createOrShow(uri: vscode.Uri, c: MCPClient) {
    const col = vscode.window.activeTextEditor?.viewColumn || vscode.ViewColumn.One;
    if (this.cur) return this.cur._p.reveal(col);
    this.cur = new AgentViewportPanel(vscode.window.createWebviewPanel('avp', 'Sovereign Viewport', col, { enableScripts: true }), c);
  }

  private constructor(p: vscode.WebviewPanel, c: MCPClient) {
    this._p = p; this._c = c;
    this._p.webview.html = this._getHtml();
    this._c.onProgress(m => this._p.webview.postMessage({ t: 'p', m }));
    this._p.webview.onDidReceiveMessage(async m => {
      if (m.c === 'run') {
        this._p.webview.postMessage({ t: 'th', p: m.p });
        const res = await this._c.runMission(vscode.workspace.name || '.', m.o, m.p);
        this._p.webview.postMessage({ t: 'r', m: res.content.map((c: any) => c.text).join('\n') });
      }
    }, null, this._d);
    this._p.onDidDispose(() => this.dispose(), null, this._d);
  }

  private _getHtml() {
    return `<html><body style="background:#0d1022;color:#e6edf3;font-family:sans-serif;margin:0;display:flex;flex-direction:column;height:100vh;">
      <div id="v" style="flex:1;overflow-y:auto;padding:15px;scrollbar-width:thin;"></div>
      <div style="background:#161b33;padding:10px;border-top:1px solid #30363d;display:flex;gap:8px;">
        <textarea id="i" style="flex:1;background:#0d1022;color:#00ffaa;border:1px solid #30363d;padding:8px;border-radius:4px;outline:none;font-size:12px;"></textarea>
        <button onclick="s()" style="background:#00ffaa;color:#0d1022;border:none;padding:0 15px;border-radius:4px;font-weight:bold;cursor:pointer;">Engage</button>
        <button onclick="v.innerHTML=''" style="background:transparent;color:#8b949e;border:1px solid #30363d;padding:0 10px;border-radius:4px;cursor:pointer;font-size:11px;">Clear</button>
      </div>
      <script>
        const vs = acquireVsCodeApi();
        const v = document.getElementById('v');
        const s = () => { const o = document.getElementById('i').value; if(!o)return; vs.postMessage({c:'run',o}); document.getElementById('i').value=''; };
        window.addEventListener('message', e => {
          const m = document.createElement('div');
          m.style.padding = '8px 0'; m.style.borderBottom = '1px solid #161b33';
          m.innerHTML = (e.data.t === 'th' ? '<i>Thinking...</i>' : (e.data.m || '')).replace(/\n/g, '<br/>');
          v.appendChild(m); v.scrollTop = v.scrollHeight;
        });
      </script></body></html>`;
  }

  dispose() { AgentViewportPanel.cur = undefined; this._p.dispose(); this._d.forEach(d => d.dispose()); }
}
VIEWPORT

echo "  ✔  AgentViewportPanel.ts written ($VIEWPORT_FILE)"

if [[ -n "$SOURCE_COMPONENT" ]]; then
  echo "  ℹ  Source reference: $SOURCE_COMPONENT"
  echo "     Any streaming enhancements in SovereignAgentViewport.tsx can be ported manually."
fi

phase_pass "$STEP"
