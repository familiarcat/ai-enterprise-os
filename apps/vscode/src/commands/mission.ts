import * as vscode from 'vscode';
import { getMCPClient } from '../services/MCPClient';
import { AgentViewportPanel } from '../views/AgentViewportPanel';

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

    // Crew Selection
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

    AgentViewportPanel.createOrShow(context.extensionUri, mcpClient);
    
    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `Sovereign Factory: ${selectedPersona.label} is analyzing the mission...`,
        cancellable: false
    }, async () => {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            const wsPath = workspaceFolder?.uri.fsPath ?? 'sovereign';
            const wsName = workspaceFolder?.name ?? 'sovereign';
            const activeFile = editor ? vscode.workspace.asRelativePath(editor.document.uri) : undefined;

            mcpClient.outputChannel.show();
            const result = await mcpClient.runMission(wsPath, objective, selectedPersona.id, wsName, activeFile);
            if (result && result.content) {
                const rawText = result.content.map((c: any) => c.text).join('\n');
                let text = rawText;
                
                // Attempt to parse the orchestrator's structured response for cleaner display
                try {
                    const parsed = JSON.parse(rawText);
                    if (parsed.content && parsed.content[0]?.text) text = parsed.content[0].text;
                } catch (e) { /* Fallback to raw text if not JSON */ }

                mcpClient.outputChannel.appendLine(`[Result] ${text}`);
                AgentViewportPanel.currentPanel?.updateLog(`Mission completed by ${selectedPersona.label}. Result: ${text}`);
                vscode.window.showInformationMessage(`Mission completed by ${selectedPersona.label}.`);
            }
        } catch (e: any) {
            vscode.window.showErrorMessage(`Mission Failure: ${e.message}`);
            AgentViewportPanel.currentPanel?.updateLog(`Mission Failure: ${e.message}`);
        }
    });
}