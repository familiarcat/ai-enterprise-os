import * as vscode from 'vscode';
import { MCPClient } from '../services/MCPClient';

/**
 * Manages the Sovereign Agent Viewport webview panel.
 * This panel hosts the React-based UI for real-time agent interaction and mission progress.
 */
export class AgentViewportPanel {
    /**
     * Track the currently active panel. Only allow a single panel to exist at a time.
     */
    public static currentPanel: AgentViewportPanel | undefined;

    public static readonly viewType = 'sovereign.agentViewportPanel'; // A unique ID for this panel type

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    private _mcpClient: MCPClient;

    public static createOrShow(extensionUri: vscode.Uri, mcpClient: MCPClient) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it.
        if (AgentViewportPanel.currentPanel) {
            AgentViewportPanel.currentPanel._panel.reveal(column);
            return;
        }

        // Otherwise, create a new panel.
        const panel = vscode.window.createWebviewPanel(
            AgentViewportPanel.viewType,
            'Sovereign Agent Viewport',
            column || vscode.ViewColumn.One,
            {
                // Enable JavaScript in the webview
                enableScripts: true,
                // And restrict the webview to only loading content from our extension's `media` directory.
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
            }
        );

        AgentViewportPanel.currentPanel = new AgentViewportPanel(panel, extensionUri, mcpClient);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, mcpClient: MCPClient) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._mcpClient = mcpClient;

        // Set the webview's initial html content
        this._update();

        // Listen for when the panel is disposed
        // This happens when the user closes the panel or when the panel is closed programmatically
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'alert':
                        vscode.window.showErrorMessage(message.text);
                        return;
                    case 'mcpCall':
                        // Example: webview requests an MCP call
                        this._mcpClient.callTool(message.toolName, message.args)
                            .then(result => {
                                this._panel.webview.postMessage({ command: 'mcpResult', result });
                            })
                            .catch(error => {
                                this._panel.webview.postMessage({ command: 'mcpError', error: error.message });
                            });
                        return;
                }
            },
            null,
            this._disposables
        );

        // Listen for progress events from MCPClient and forward to webview
        this._mcpClient.onProgress(message => {
            this._panel.webview.postMessage({ command: 'progress', message });
        }, null, this._disposables);

        // Listen for disconnect events
        this._mcpClient.onDisconnect(() => {
            this._panel.webview.postMessage({ command: 'disconnected' });
        }, null, this._disposables);
    }

    public dispose() {
        AgentViewportPanel.currentPanel = undefined;

        // Clean up our resources
        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _update() {
        const webview = this._panel.webview;
        this._panel.title = 'Sovereign Agent Viewport';
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js'));
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.css'));
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

    public updateLog(message: string) {
        this._panel.webview.postMessage({ command: 'log', text: message });
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