import * as vscode from 'vscode';
import { getMCPClient } from '../services/MCPClient';
import { AgentViewportPanel } from '../views/AgentViewportPanel';

export async function executeHealthCheck() {
    const mcpClient = getMCPClient();

    // Reveal the output channel immediately so the user sees the start of the trace
    mcpClient.outputChannel.show();

    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "Sovereign: Performing Health Check...",
        cancellable: false
    }, async () => {
        try {
            const result = await mcpClient.callTool('health_check', {});
            if (result && Array.isArray(result.content) && result.content.length > 0) {
                const report = JSON.parse(result.content[0].text || '{}');
                const prettyReport = JSON.stringify(report, null, 2);
                
                mcpClient.outputChannel.appendLine(`[Health Check] System Report:`);
                mcpClient.outputChannel.appendLine(prettyReport);
                
                if (AgentViewportPanel.currentPanel) {
                    AgentViewportPanel.currentPanel.updateLog(`Health Check Result: ${prettyReport}`);
                }
                
                vscode.window.showInformationMessage('System health check complete. Check output for details.');
            }
        } catch (e: any) {
            vscode.window.showErrorMessage(`Health Check failed: ${e.message}`);
            AgentViewportPanel.currentPanel?.updateLog(`Health Check Failed: ${e.message}`);
        }
    });
}