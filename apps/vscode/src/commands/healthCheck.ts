import * as vscode from 'vscode';
import { getMCPClient } from '../services/MCPClient';
import { AgentViewportPanel } from '../views/AgentViewportPanel';

export async function executeHealthCheck() {
    const mcpClient = getMCPClient();

    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "Sovereign: Performing Health Check...",
        cancellable: false
    }, async () => {
        try {
            const result = await mcpClient.callTool('health_check', {});
            mcpClient.outputChannel.show();

            if (result && result.content) {
                const report = JSON.parse(result.content[0].text);
                mcpClient.outputChannel.appendLine(`[Health Check] Status: ${JSON.stringify(report, null, 2)}`);
                AgentViewportPanel.currentPanel?.updateLog(`Health Check Status: ${JSON.stringify(report)}`);
                vscode.window.showInformationMessage('System health check complete. Check output for details.');
            }
        } catch (e: any) {
            vscode.window.showErrorMessage(`Health Check failed: ${e.message}`);
            AgentViewportPanel.currentPanel?.updateLog(`Health Check Failed: ${e.message}`);
        }
    });
}