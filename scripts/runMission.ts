import * as vscode from 'vscode';
import { getMCPClient } from '../apps/vscode/src/services/MCPClient';
import { AgentViewportPanel } from '../apps/vscode/src/views/AgentViewportPanel';

/**
 * Handles the 'sovereign.runMission' command.
 * Dispatches a mission to the MCP bridge and handles UI feedback.
 */
export async function executeRunMission(context: vscode.ExtensionContext) {
  const mcpClient = getMCPClient();

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

  // Activate the Crew: Select a lead persona for the mission
  const personas = [
    { label: 'Captain Picard', description: 'Strategic coordination & diplomatic rationale', id: 'captain_picard' },
    { label: 'Commander Riker', description: 'Bold tactical implementation & DDD execution', id: 'commander_riker' },
    { label: 'Commander Data', description: 'Architectural validation & positronic precision', id: 'commander_data' },
    { label: 'Geordi La Forge', description: 'Engineering optimization & bridge wiring', id: 'geordi_la_forge' }
  ];

  const selectedPersona = await vscode.window.showQuickPick(personas, {
    placeHolder: 'Select the Crew Member to lead this mission',
  });

  if (!selectedPersona) return;

  // Show the Agent Viewport panel to stream progress
  AgentViewportPanel.createOrShow(context.extensionUri, mcpClient);

  vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: `Sovereign Factory: ${selectedPersona.label} is analyzing the mission...`,
    cancellable: false
  }, async () => {
    try {
      const ws = vscode.workspace.workspaceFolders?.[0]?.name ?? 'sovereign';
      const result = await mcpClient.runMission(ws, objective, selectedPersona.id);
      
      if (result && typeof result !== 'string' && result.content) {
        const text = result.content.map((c: any) => c.text).join('\n');
        mcpClient.outputChannel.appendLine(`[Result] ${text}`);
        vscode.window.showInformationMessage('Mission dispatched successfully.');
      }
    } catch (e: any) {
      vscode.window.showErrorMessage(e.message);
    }
  });
}