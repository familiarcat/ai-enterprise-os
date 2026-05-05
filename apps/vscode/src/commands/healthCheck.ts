import * as vscode from 'vscode';
import { MCPClient } from '../services/MCPClient';

export async function executeHealthCheck(context: vscode.ExtensionContext, mcpClient: MCPClient) {
    if (!mcpClient.isConnected) {
        return vscode.window.showErrorMessage('Sovereign Factory: MCP Bridge is offline. Please start the bridge.');
    }

    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Sovereign Factory: Running Health Check...',
        cancellable: false
    }, async () => {
        try {
            const result = await mcpClient.callTool('health_check', {});
            mcpClient.outputChannel.appendLine(`[Health Check Result]`);
            mcpClient.outputChannel.appendLine(JSON.stringify(result, null, 2));
            mcpClient.outputChannel.show();
            vscode.window.showInformationMessage('Sovereign Factory: Health Check Complete. See output channel for details.');
        } catch (e: any) {
            vscode.window.showErrorMessage(`Sovereign Factory: Health Check Failed: ${e.message || e}`);
        }
    });
}