import * as v from 'vscode';
import { MCPClient as Cl } from './services/MCPClient';
import { AgentViewportPanel as Avp } from './views/AgentViewportPanel';
import { executeRunMission as run } from './commands/runMission';

let c: Cl, sb: v.StatusBarItem, oc: v.OutputChannel;
export const getMCPClient = () => { if (!c) throw '!c'; return c; };

export async function activate(ctx: v.ExtensionContext) {
  oc = v.window.createOutputChannel('Sovereign');
  ctx.subscriptions.push(oc);
  oc.appendLine('Activating...');

  // ── Status bar ─────────────────────────────────────────────────────────────
  sb = v.window.createStatusBarItem(v.StatusBarAlignment.Right, 100);
  sb.command = 'sovereign.healthCheck';
  updateStatusBar('connecting');
  sb.show();
  ctx.subscriptions.push(sb);

  // ── MCP Client ─────────────────────────────────────────────────────────────
  const cfg = v.workspace.getConfiguration('sovereign');
  c = new Cl(cfg.get<string>('mcpUrl') || 'http://localhost:3002', oc);
  c.onDisconnect(() => updateStatusBar('disconnected'));

  if (cfg.get<boolean>('autoConnect') ?? true) {
    await connectMCP();
  }

  // ── Commands ───────────────────────────────────────────────────────────────
  ctx.subscriptions.push(
    v.commands.registerCommand('sovereign.runMission', () => run(ctx)),

    v.commands.registerCommand('sovereign.assignCrew', async () => {
      if (!assertConnected()) return;
      const personas = await c.getPersonas();
      const items = Object.entries(personas).map(([key, p]) => ({
        label: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        description: p.role,
        detail: `Model: ${p.model}`,
        key,
      }));
      const picked = await v.window.showQuickPick(items, {
        title: 'Assign Crew Member',
        placeHolder: 'Select a Star Trek crew persona',
      });
      if (!picked) return;
      await v.workspace.getConfiguration('sovereign').update(
        'defaultPersona', picked.key, v.ConfigurationTarget.Workspace
      );
      updateStatusBar('connected', picked.label);
      v.window.showInformationMessage(`Crew: ${picked.label}`);
    }),

    v.commands.registerCommand('sovereign.searchCode', async () => {
      if (!assertConnected()) return;
      const fnName = await v.window.showInputBox({ prompt: 'Name to search' });
      if (!fnName) return;
      const ws = v.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '.';
      const res = await c.searchCode(ws, fnName);
      oc.show();
      oc.appendLine(`\n── Search: ${fnName} ──`);
      oc.appendLine(res.content.map((c) => c.text).join('\n'));
    }),

    v.commands.registerCommand('sovereign.scaffoldDomain', async () => {
      if (!assertConnected()) return;
      const domain = await v.window.showInputBox({
        prompt: 'DDD domain name (e.g. user-auth, payments)',
        placeHolder: 'my-domain',
      });
      if (!domain) return;
      const ws = v.workspace.workspaceFolders?.[0]?.name ?? 'sovereign';
      const result = await c.runMission(ws,
        `Scaffold domain "${domain}"`
      );
      oc.show();
      oc.appendLine(result.content.map((c: any) => c.text).join('\n'));
    }),

    v.commands.registerCommand('sovereign.healthCheck', async () => {
      if (!c) {
        await connectMCP();
        return;
      }
      updateStatusBar('checking');
      try {
        const result = await c.callTool('health_check', {});
        const text = result.content.map((c: any) => c.text).join('\n');
        oc.appendLine('\n── Health Check ──\n' + text);
        updateStatusBar('connected');
        v.window.showInformationMessage('Sovereign: all systems nominal');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        updateStatusBar('error');
        v.window.showErrorMessage('Health check failed: ' + msg);
      }
    }),

    v.commands.registerCommand('sovereign.gitOperation', async () => {
      if (!assertConnected()) return;
      const action = await v.window.showQuickPick(['commit', 'push', 'status'], {
        title: 'Git Operation',
      });
      if (!action) return;
      let message: string | undefined;
      if (action === 'commit') {
        message = await v.window.showInputBox({ prompt: 'Commit message' });
        if (!message) return;
      }
      const result = await c.callTool('git_operation', { action, message });
      oc.show();
      oc.appendLine(result.content.map((c: any) => c.text).join('\n'));
    }),

    v.commands.registerCommand('sovereign.openDashboard', async () => {
      const cfg = v.workspace.getConfiguration('sovereign');
      const mcpUrl = cfg.get<string>('mcpUrl') ?? 'http://localhost:3002';
      const dashUrl = mcpUrl.replace(':3002', ':3000');
      await v.env.openExternal(v.Uri.parse(dashUrl));
    }),
  );

  oc.appendLine('Sovereign Factory activated.');
}

async function connectMCP() {
  if (!c) return;
  updateStatusBar('connecting');
  try {
    await c.connect();
    updateStatusBar('connected');
    oc.appendLine(`Connected to MCP bridge.`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    updateStatusBar('error');
    oc.appendLine('[ERROR] MCP connect failed: ' + msg);
    v.window.showWarningMessage(
      `Sovereign: MCP bridge unreachable (${msg}). Start mcp-http-bridge.mjs first.`
    );
  }
}

function assertConnected(): boolean {
  if (!c) {
    v.window.showWarningMessage('Sovereign: not connected to MCP bridge. Run "Sovereign: Health Check" to connect.');
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
}

export function deactivate() {
  c?.disconnect();
}
