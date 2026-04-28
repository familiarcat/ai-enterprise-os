import * as v from 'vscode';
import { getMCPClient as getCl } from '../apps/vscode/src/services/MCPClient';
import { AgentViewportPanel as Avp } from '../apps/vscode/src/views/AgentViewportPanel';

export async function executeRunMission(ctx: v.ExtensionContext) {
  const c = getCl();
  if (!c || !c.isConnected) {
    return v.window.showErrorMessage('Sovereign Factory: MCP Bridge is offline. Please start the bridge to run missions.');
  }

  const ed = v.window.activeTextEditor;
  const s = ed?.document.getText(ed.selection);
  
  const obj = await v.window.showInputBox({
    prompt: 'Enter Mission Objective',
    value: s ? `Analyse and improve: ${s.slice(0, 200)}` : '',
    placeHolder: 'e.g. Scaffold a DDD domain for user authentication',
  });
  
  if (!obj) return;

  // Crew Selection: Assign the right lead for the mission
  const personas = [
    { label: 'Captain Picard', description: 'Strategic coordination & diplomatic rationale', id: 'captain_picard' },
    { label: 'Commander Riker', description: 'Bold tactical implementation & DDD execution', id: 'commander_riker' },
    { label: 'Commander Data', description: 'Architectural validation & precision', id: 'commander_data' },
    { label: 'Geordi La Forge', description: 'Engineering optimization & bridge wiring', id: 'geordi_la_forge' },
    { label: 'Lt. Worf', description: 'Security audit & tactical verification', id: 'lt_worf' }
  ];

  const selected = await v.window.showQuickPick(personas, {
    placeHolder: 'Select the Crew Member to lead this mission',
  });

  if (!selected) return;

  Avp.createOrShow(ctx.extensionUri, c);
  const ws = v.workspace.workspaceFolders?.[0]?.uri.fsPath ?? 'sovereign';
  c.outputChannel.appendLine(`[Mission Dispatch] Lead: ${selected.label} | Objective: ${obj}`);

  await v.window.withProgress({
    location: v.ProgressLocation.Notification,
    title: `Sovereign Factory: ${selected.label} is analyzing the mission...`,
    cancellable: false
  }, async () => {
    try {
      const r = await c.runMission(ws, obj, selected.id);
      if (r && typeof r !== 'string' && r.content) {
        const text = r.content.map((i: any) => i.text).join('\n');
        c.outputChannel.appendLine(`[Result] ${text}`);
        v.window.showInformationMessage(`Mission completed by ${selected.label}.`);
      }
    } catch (e: any) {
      v.window.showErrorMessage(`Mission Failure: ${e.message}`);
    }
  });
}