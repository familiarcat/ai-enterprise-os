import * as vscode from 'vscode';
import { getMCPClient, MCPClient } from './services/MCPClient';
import { executeRunMission } from './commands/mission';
import { executeSensorSweep } from './commands/sensorSweep';
import { executeHealthCheck } from './commands/healthCheck';
import { AgentViewportPanel } from './views/AgentViewportPanel'; // Import the new panel class

export function activate(context: vscode.ExtensionContext) {
    console.log('Sovereign Factory Extension is now active.');

    // Register commands defined in package.json
    let runMission = vscode.commands.registerCommand('sovereign.runMission', () => executeRunMission(context));
    let sensorSweep = vscode.commands.registerCommand('sovereign.sensorSweep', () => executeSensorSweep());
    let healthCheck = vscode.commands.registerCommand('sovereign.healthCheck', () => executeHealthCheck());
    let checkBridgeStatus = vscode.commands.registerCommand('sovereign.checkBridgeStatus', () => getMCPClient().logStatus());

    context.subscriptions.push(runMission, sensorSweep, healthCheck, checkBridgeStatus);

    // Webview View Provider for the Agent Viewport
    const provider = new SovereignAgentViewProvider(context.extensionUri, getMCPClient());
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('sovereign.agentViewport', provider)
    );
}

class SovereignAgentViewProvider implements vscode.WebviewViewProvider {
    private _webview?: vscode.Webview; // Store webview reference
    private _mcpClient: MCPClient;

    constructor(private readonly _extensionUri: vscode.Uri, mcpClient: MCPClient) {
        this._mcpClient = mcpClient;
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._webview = webviewView.webview; // Store reference
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Listen for progress events from MCPClient and forward to webview
        this._mcpClient.onProgress((message: string) => {
            this._webview?.postMessage({ command: 'progress', message });
        }, null, []);

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage((message: any) => {
            switch (message.command) {
                case 'alert':
                    vscode.window.showErrorMessage(message.text);
                    return;
                case 'notifyOffline':
                    vscode.window.showWarningMessage(message.text);
                    return;
                case 'openSettings':
                    vscode.commands.executeCommand('workbench.action.openSettings', 'sovereign');
                    return;
                case 'checkStatus':
                    this._mcpClient.logStatus();
                    return;
                case 'exportLogs':
                    vscode.window.showSaveDialog({
                        defaultUri: vscode.Uri.file(message.defaultFilename),
                        filters: {
                            'Markdown': ['md']
                        }
                    }).then(fileUri => {
                        if (fileUri) {
                            vscode.workspace.fs.writeFile(fileUri, Buffer.from(message.content, 'utf8'))
                                .then(() => {
                                    vscode.window.showInformationMessage(`Logs exported to ${fileUri.fsPath}`);
                                })
                                .catch(err => {
                                    vscode.window.showErrorMessage(`Failed to export logs: ${err.message}`);
                                });
                        }
                    });
                    return;
                case 'mcpCall':
                    this._mcpClient.callTool(message.toolName, message.args)
                        .then((result: any) => webviewView.webview.postMessage({ command: 'mcpResult', result, toolName: message.toolName, silent: message.silent }))
                        .catch((error: any) => webviewView.webview.postMessage({ command: 'mcpError', error: error.message, toolName: message.toolName, silent: message.silent }));
                    return;
            }
        }, undefined, []);
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js'));
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.css')); // Assuming a CSS bundle too

        // Use a nonce to only allow a specific script to be run.
        const nonce = getNonce();

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}';">
            <link href="${styleUri}" rel="stylesheet">
            <title>Sovereign Agent Viewport</title>
        </head>
        <body>
            <div id="root"></div>
            <script nonce="${nonce}" src="${scriptUri}"></script>
        </body>
        </html>`;
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

export function deactivate() {}