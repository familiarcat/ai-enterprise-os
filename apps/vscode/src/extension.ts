import * as vscode from 'vscode';
import { MCPClient } from './services/MCPClient';
import { AgentViewportPanel } from './views/AgentViewportPanel';
import { executeRunMission } from './commands/runMission';
import { executeHealthCheck } from './commands/healthCheck';
import { executeSensorSweep } from './commands/sensorSweep';
import { executeMission } from './commands/mission'; // Assuming this is a real command file based on error

export function activate(context: vscode.ExtensionContext) {
    console.log('Sovereign Factory extension is now active!');

    const mcpClient = new MCPClient();
    context.subscriptions.push(mcpClient); // Ensure dispose is called on deactivate

    // Attempt to connect to the MCP Bridge
    Promise.resolve(mcpClient.connect()) // Ensure it's a full Promise for .catch()
        .then(() => {
            vscode.window.showInformationMessage('Sovereign Factory: MCP Bridge Connected!');
        })
        .catch((err: any) => {
            vscode.window.showErrorMessage(`Sovereign Factory: Failed to connect to MCP Bridge: ${err.message || err}`);
        });

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('sovereign.runMission', () => executeRunMission(context, mcpClient)),
        vscode.commands.registerCommand('sovereign.healthCheck', () => executeHealthCheck(context, mcpClient)),
        vscode.commands.registerCommand('sovereign.sensorSweep', () => executeSensorSweep(context, mcpClient)),
        vscode.commands.registerCommand('sovereign.checkBridgeStatus', () => mcpClient.logStatus()),
        // If 'sovereign.mission' is intended to be a command, register it here:
        // vscode.commands.registerCommand('sovereign.mission', () => executeMission(context, mcpClient))
    );

    // Register webview panel
    context.subscriptions.push(
        vscode.commands.registerCommand('sovereign.openAgentViewport', () => {
            AgentViewportPanel.createOrShow(context.extensionUri, mcpClient);
        })
    );
}

export function deactivate() {
    console.log('Sovereign Factory extension is deactivated.');
    // mcpClient.dispose() is handled by context.subscriptions
}