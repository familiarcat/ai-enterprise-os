import * as vscode from 'vscode';
import { MCPClient } from '../services/MCPClient';
import { AgentViewportPanel } from '../views/AgentViewportPanel';
import { executeAgentTask } from '../views/executor';

export async function executeMission(context: vscode.ExtensionContext, mcpClient: MCPClient) {
    if (!mcpClient.isConnected) {
        return vscode.window.showErrorMessage('Sovereign Factory: MCP Bridge is offline. Please start the bridge to run missions.');
    }

    const objective = await vscode.window.showInputBox({
        prompt: 'Enter Generic Mission Objective',
        placeHolder: 'e.g. Analyze codebase for performance bottlenecks',
    });

    if (!objective) return;

    AgentViewportPanel.createOrShow(context.extensionUri, mcpClient);
    const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? 'sovereign';
    mcpClient.outputChannel.appendLine(`[Generic Mission Dispatch] Objective: ${objective}`);

    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `Sovereign Factory: Executing generic mission...`,
        cancellable: false
    }, async () => {
        try {
            const r = await executeAgentTask(mcpClient, 'captain_picard', objective, {
                project: ws,
                triggeredBy: 'vscode-generic-mission-command'
            });
            if (r && typeof r !== 'string' && r.content) {
                const text = r.content.map((i: any) => i.text).join('\n');
                mcpClient.outputChannel.appendLine(`[Result] ${text}`);
                vscode.window.showInformationMessage(`Generic mission completed.`);
            }
        } catch (e: any) {
            vscode.window.showErrorMessage(`Generic Mission Failure: ${e.message || e}`);
        }
    });
}