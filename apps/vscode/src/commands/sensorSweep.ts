import * as vscode from 'vscode';
import { getMCPClient } from '../services/MCPClient';

export async function executeSensorSweep() {
    const mcpClient = getMCPClient();
    
    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "Sovereign: Running Sensor Sweep...",
        cancellable: false
    }, async () => {
        try {
            const result = await mcpClient.callTool('sensor_sweep', {});
            mcpClient.outputChannel.show();
            
            if (result && result.content) {
                const text = result.content.map((c: any) => c.text).join('\n');
                mcpClient.outputChannel.appendLine(`[Sensor Sweep] ${text}`);
            }
        } catch (e: any) {
            vscode.window.showErrorMessage(`Sensor Sweep failed: ${e.message}`);
        }
    });
}