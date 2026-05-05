import * as vscode from 'vscode';
import { MCPClient } from '../services/MCPClient';

export async function executeSensorSweep(context: vscode.ExtensionContext, mcpClient: MCPClient) {
    if (!mcpClient.isConnected) {
        return vscode.window.showErrorMessage('Sovereign Factory: MCP Bridge is offline. Please start the bridge.');
    }

    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Sovereign Factory: Running Sensor Sweep...',
        cancellable: false
    }, async () => {
        try {
            const result = await mcpClient.callTool('sensor_sweep', {});
            
            // Log to Sovereign Output Channel
            mcpClient.outputChannel.appendLine(`[Sensor Sweep Report]`);
            mcpClient.outputChannel.appendLine(JSON.stringify(result, null, 2));
            mcpClient.outputChannel.show();
            
            vscode.window.showInformationMessage('Sovereign Factory: Sensor Sweep Complete. See output channel for details.');
        } catch (e: any) {
            vscode.window.showErrorMessage(`Sovereign Factory: Sensor Sweep Failed: ${e?.message || String(e)}`);
        }
    });
}