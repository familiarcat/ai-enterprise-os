import * as vscode from 'vscode';
import { getMCPClient } from '../services/MCPClient';
import { AgentViewportPanel } from '../views/AgentViewportPanel';

export async function executeSensorSweep(context: vscode.ExtensionContext) {
    const mcpClient = getMCPClient();
    
    AgentViewportPanel.createOrShow(context.extensionUri, mcpClient);
    AgentViewportPanel.currentPanel?.updateLog("Commander Data: Initiating level-one diagnostic sweep...");

    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "Commander Data is scanning system state...",
        cancellable: false
    }, async () => {
        try {
            const response = await mcpClient.callTool('sensor_sweep', {});
            
            if (response && response.content) {
                const report = JSON.parse(response.content[0].text);
                
                AgentViewportPanel.currentPanel?.updateLog(`STATUS: ${report.status}`);
                AgentViewportPanel.currentPanel?.updateLog(`Integrity: Redis (${report.integrity.redis}), Supabase (${report.integrity.supabase})`);
                AgentViewportPanel.currentPanel?.updateLog("--- Project Structure ---");
                AgentViewportPanel.currentPanel?.updateLog(report.structure);
                
                vscode.window.showInformationMessage(`Sensor Sweep Complete: System is ${report.status}`);
            }
        } catch (err) {
            AgentViewportPanel.currentPanel?.updateLog(`Sensor Sweep Error: ${err}`);
            vscode.window.showErrorMessage("Sensors offline: Bridge connection failed.");
        }
    });
}