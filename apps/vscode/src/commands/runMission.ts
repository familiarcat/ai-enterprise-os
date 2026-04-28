import * as vscode from 'vscode';
import { getMCPClient } from '../services/MCPClient';
import { AgentViewportPanel } from '../views/AgentViewportPanel';

export async function executeRunMission(context: vscode.ExtensionContext) {
    const mcpClient = getMCPClient();
    const editor = vscode.window.activeTextEditor;
    const selection = editor?.document.getText(editor.selection);

    const objective = await vscode.window.showInputBox({
        prompt: 'Mission objective',
        value: selection ? `Analyse: ${selection.slice(0, 100)}` : '',
        placeHolder: 'e.g. Scaffold a DDD domain for user authentication',
    });
    
    if (!objective) return;

    const personas = [
        { label: 'Captain Picard', id: 'captain_picard' },
        { label: 'Commander Riker', id: 'commander_riker' },
        { label: 'Commander Data', id: 'commander_data' }
    ];

    const selected = await vscode.window.showQuickPick(personas, { placeHolder: 'Select lead persona' });
    if (!selected) return;

    AgentViewportPanel.createOrShow(context.extensionUri, mcpClient);
    AgentViewportPanel.currentPanel?.updateLog(`Mission initiated: ${objective}`);

    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `Sovereign: ${selected.label} is engaging...`,
    }, async () => {
        const ws = vscode.workspace.workspaceFolders?.[0]?.name ?? 'sovereign';
        const result = await mcpClient.runMission(ws, objective, selected.id);
        
        if (result && result.content) {
            AgentViewportPanel.currentPanel?.updateLog("Mission Outcome Received.");
            vscode.window.showInformationMessage('Mission complete.');
        }
    });
}