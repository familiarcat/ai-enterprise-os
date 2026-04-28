import * as vscode from 'vscode';
import { MCPClient } from '../services/MCPClient';

export class AgentViewportPanel {
    public static currentPanel: AgentViewportPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._panel.webview.html = this._getHtmlForWebview();
        
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    }

    public static createOrShow(extensionUri: vscode.Uri, client: MCPClient) {
        const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

        if (AgentViewportPanel.currentPanel) {
            AgentViewportPanel.currentPanel._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'agentViewport',
            'Sovereign: Agent Viewport',
            column || vscode.ViewColumn.One,
            { enableScripts: true }
        );
        AgentViewportPanel.currentPanel = new AgentViewportPanel(panel, extensionUri);
    }

    public updateLog(text: string) {
        this._panel.webview.postMessage({ command: 'log', text });
    }

    public dispose() {
        AgentViewportPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) x.dispose();
        }
    }

    private _getHtmlForWebview() {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: 'Courier New', Courier, monospace; background: #0d1022; color: #00ffaa; padding: 20px; }
                    .log-entry { margin-bottom: 5px; border-left: 2px solid #00ffaa; padding-left: 10px; opacity: 0; animation: fadeIn 0.5s forwards; }
                    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                </style>
            </head>
            <body>
                <h1>Sovereign Agent Viewport</h1>
                <div id="log"></div>
                <script>
                    const vscode = acquireVsCodeApi();
                    const logContainer = document.getElementById('log');
                    window.addEventListener('message', event => {
                        const message = event.data;
                        if (message.command === 'log') {
                            const entry = document.createElement('div');
                            entry.className = 'log-entry';
                            entry.textContent = \`[\${new Date().toLocaleTimeString()}] \${message.text}\`;
                            logContainer.appendChild(entry);
                            window.scrollTo(0, document.body.scrollHeight);
                        }
                    });
                </script>
            </body>
            </html>`;
    }
}