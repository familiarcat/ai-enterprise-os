#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# p1-s4-ext-commands.sh — Phase 1, Step 4: Extension entry point & commands
#
# Writes src/extension.ts (activation, command registrations, MCPClient wiring)
# and validates all commands declared in package.json are implemented.
# Assigned crew: Commander Riker (Senior Developer, production-quality implementation).
# MCP tool on failure: run_factory_mission
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
source "$SCRIPT_DIR/lib/crew-fail.sh"

STEP="p1-s4-ext-commands"
step_header "PHASE 1 — VSCODE EXTENSION MVP" "Step 4: Extension Entry Point & Commands"

EXT_DIR="$ROOT/apps/vscode"
EXT_MAIN="$EXT_DIR/src/extension.ts"
CMD_DIR="$EXT_DIR/src/commands"
mkdir -p "$CMD_DIR"

# ── extension.ts ──────────────────────────────────────────────────────────────
if [[ ! -f "$EXT_MAIN" ]]; then
  echo "  Writing src/extension.ts..."
  cat > "$EXT_MAIN" <<'EXTS'
/**
 * extension.ts — Sovereign Factory VSCode Extension entry point
 *
 * Activates the MCP client, registers all commands, and wires the
 * Agent Viewport WebView panel and status bar item.
 */
import * as vscode from 'vscode';
import { MCPClient } from './services/MCPClient';
import { AgentViewportPanel } from './views/AgentViewportPanel';

let mcpClient: MCPClient | undefined;
let statusBarItem: vscode.StatusBarItem;
let outputChannel: vscode.OutputChannel;

export async function activate(context: vscode.ExtensionContext) {
  outputChannel = vscode.window.createOutputChannel('Sovereign Factory');
  context.subscriptions.push(outputChannel);
  outputChannel.appendLine('Sovereign Factory activating...');

  // ── Status bar ─────────────────────────────────────────────────────────────
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'sovereign.healthCheck';
  updateStatusBar('connecting');
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // ── MCP Client ─────────────────────────────────────────────────────────────
  const config = vscode.workspace.getConfiguration('sovereign');
  const mcpUrl = config.get<string>('mcpUrl') ?? 'http://localhost:3002';

  mcpClient = new MCPClient(mcpUrl, outputChannel);
  mcpClient.onDisconnect(() => updateStatusBar('disconnected'));

  const autoConnect = config.get<boolean>('autoConnect') ?? true;
  if (autoConnect) {
    await connectMCP();
  }

  // ── Commands ───────────────────────────────────────────────────────────────
  context.subscriptions.push(

    vscode.commands.registerCommand('sovereign.runMission', async () => {
      if (!assertConnected()) return;
      const editor = vscode.window.activeTextEditor;
      const selection = editor?.document.getText(editor.selection);
      const defaultObjective = selection
        ? `Analyse and improve: ${selection.slice(0, 200)}`
        : '';
      const objective = await vscode.window.showInputBox({
        prompt: 'Mission objective',
        value: defaultObjective,
        placeHolder: 'e.g. Scaffold a DDD domain for user authentication',
      });
      if (!objective) return;
      const panel = AgentViewportPanel.createOrShow(context.extensionUri, mcpClient!);
      panel; // focuses the panel; message is sent via WebView's sendMission
      // Post objective directly
      outputChannel.appendLine(`[Mission] ${objective}`);
      const ws = vscode.workspace.workspaceFolders?.[0]?.name ?? 'sovereign';
      const result = await mcpClient!.runMission(ws, objective);
      outputChannel.appendLine(result.content.map((c) => c.text).join('\n'));
    }),

    vscode.commands.registerCommand('sovereign.assignCrew', async () => {
      if (!assertConnected()) return;
      const personas = await mcpClient!.getPersonas();
      const items = Object.entries(personas).map(([key, p]) => ({
        label: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        description: p.role,
        detail: `Model: ${p.model}`,
        key,
      }));
      const picked = await vscode.window.showQuickPick(items, {
        title: 'Assign Crew Member',
        placeHolder: 'Select a Star Trek crew persona',
      });
      if (!picked) return;
      await vscode.workspace.getConfiguration('sovereign').update(
        'defaultPersona', picked.key, vscode.ConfigurationTarget.Workspace
      );
      updateStatusBar('connected', picked.label);
      vscode.window.showInformationMessage(`Crew: ${picked.label} (${picked.detail})`);
    }),

    vscode.commands.registerCommand('sovereign.searchCode', async () => {
      if (!assertConnected()) return;
      const fnName = await vscode.window.showInputBox({ prompt: 'Function or class name to search' });
      if (!fnName) return;
      const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '.';
      const result = await mcpClient!.searchCode(ws, fnName);
      outputChannel.show();
      outputChannel.appendLine(`\n── Search: ${fnName} ──`);
      outputChannel.appendLine(result.content.map((c) => c.text).join('\n'));
    }),

    vscode.commands.registerCommand('sovereign.scaffoldDomain', async () => {
      if (!assertConnected()) return;
      const domain = await vscode.window.showInputBox({
        prompt: 'DDD domain name (e.g. user-auth, payments)',
        placeHolder: 'my-domain',
      });
      if (!domain) return;
      const ws = vscode.workspace.workspaceFolders?.[0]?.name ?? 'sovereign';
      const result = await mcpClient!.runMission(ws,
        `Scaffold a complete DDD domain called "${domain}" with domain/application/infrastructure/ui layers and tests`
      );
      outputChannel.show();
      outputChannel.appendLine(result.content.map((c) => c.text).join('\n'));
    }),

    vscode.commands.registerCommand('sovereign.healthCheck', async () => {
      if (!mcpClient?.isConnected) {
        await connectMCP();
        return;
      }
      updateStatusBar('checking');
      try {
        const result = await mcpClient.healthCheck();
        const text = result.content.map((c) => c.text).join('\n');
        outputChannel.appendLine('\n── Health Check ──\n' + text);
        updateStatusBar('connected');
        vscode.window.showInformationMessage('Sovereign: all systems nominal');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        updateStatusBar('error');
        vscode.window.showErrorMessage('Health check failed: ' + msg);
      }
    }),

    vscode.commands.registerCommand('sovereign.gitOperation', async () => {
      if (!assertConnected()) return;
      const action = await vscode.window.showQuickPick(['commit', 'push', 'status'], {
        title: 'Git Operation',
      });
      if (!action) return;
      let message: string | undefined;
      if (action === 'commit') {
        message = await vscode.window.showInputBox({ prompt: 'Commit message' });
        if (!message) return;
      }
      const result = await mcpClient!.gitOperation(action as 'commit' | 'push' | 'status', message);
      outputChannel.show();
      outputChannel.appendLine(result.content.map((c) => c.text).join('\n'));
    }),

    vscode.commands.registerCommand('sovereign.openDashboard', async () => {
      const config = vscode.workspace.getConfiguration('sovereign');
      const mcpUrl = config.get<string>('mcpUrl') ?? 'http://localhost:3002';
      const dashUrl = mcpUrl.replace(':3002', ':3000');
      await vscode.env.openExternal(vscode.Uri.parse(dashUrl));
    }),
  );

  outputChannel.appendLine('Sovereign Factory activated.');
}

async function connectMCP() {
  if (!mcpClient) return;
  updateStatusBar('connecting');
  try {
    await mcpClient.connect();
    const tools = await mcpClient.listTools();
    updateStatusBar('connected');
    outputChannel.appendLine(`Connected: ${tools.length} MCP tools available`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    updateStatusBar('error');
    outputChannel.appendLine('[ERROR] MCP connect failed: ' + msg);
    vscode.window.showWarningMessage(
      `Sovereign: MCP bridge unreachable (${msg}). Start mcp-http-bridge.mjs first.`
    );
  }
}

function assertConnected(): boolean {
  if (!mcpClient?.isConnected) {
    vscode.window.showWarningMessage('Sovereign: not connected to MCP bridge. Run "Sovereign: Health Check" to connect.');
    return false;
  }
  return true;
}

type StatusState = 'connecting' | 'connected' | 'disconnected' | 'checking' | 'error';
function updateStatusBar(state: StatusState, persona?: string) {
  const icons: Record<StatusState, string> = {
    connecting:   '$(loading~spin)',
    connected:    '$(plug)',
    disconnected: '$(debug-disconnect)',
    checking:     '$(search)',
    error:        '$(error)',
  };
  const label = persona ? ` ${persona}` : '';
  statusBarItem.text = `${icons[state]} Sovereign${label}`;
  statusBarItem.tooltip = state === 'connected'
    ? `Sovereign Factory — MCP bridge connected${persona ? ' · ' + persona : ''}`
    : `Sovereign Factory — ${state}`;
  statusBarItem.backgroundColor = state === 'error'
    ? new vscode.ThemeColor('statusBarItem.errorBackground')
    : undefined;
}

export function deactivate() {
  mcpClient?.disconnect();
}
EXTS
  echo "  ✔  src/extension.ts written"
else
  echo "  ✔  src/extension.ts already exists"
fi

# ── Validate all package.json commands are registered in extension.ts ──────────
echo ""
echo "  Validating command registrations..."
PKG="$EXT_DIR/package.json"
MISSING_CMDS=()

if [[ -f "$PKG" ]]; then
  DECLARED_CMDS=$(node -e "
    const p = require('$PKG');
    const cmds = p.contributes?.commands?.map(c => c.command) ?? [];
    cmds.forEach(c => console.log(c));
  " 2>/dev/null || true)

  while IFS= read -r cmd; do
    [[ -z "$cmd" ]] && continue
    if ! grep -q "$cmd" "$EXT_MAIN" 2>/dev/null; then
      MISSING_CMDS+=("$cmd")
    fi
  done <<< "$DECLARED_CMDS"
fi

if [[ ${#MISSING_CMDS[@]} -gt 0 ]]; then
  crew_fail \
    --step    "$STEP" \
    --persona "commander_riker" \
    --tool    "run_factory_mission" \
    --tool-args '{"project": "ai-enterprise-os", "objective": "Register all declared VSCode commands in apps/vscode/src/extension.ts — missing commands: '"${MISSING_CMDS[*]}"'"}' \
    --context "package.json declares commands that are not registered with vscode.commands.registerCommand in extension.ts." \
    --error   "Unregistered commands: ${MISSING_CMDS[*]}"
  exit 1
fi
echo "  ✔  All declared commands are registered in extension.ts"

phase_pass "$STEP"
