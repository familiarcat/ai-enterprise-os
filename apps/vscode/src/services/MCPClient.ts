import * as vscode from 'vscode';
import EventSource from 'eventsource';

/**
 * MCPClient: The primary agent bus for the VSCode Extension.
 * Connects to the Sovereign Bridge via SSE and dispatches tool calls.
 */
export class MCPClient {
    private _eventSource: EventSource | undefined;
    private _sessionId: string | undefined;
    private _bridgeUrl: string;
    private _onProgress = new vscode.EventEmitter<string>();
    private _onDisconnect = new vscode.EventEmitter<void>();
    private _responseResolvers = new Map<number | string, (res: any) => void>();

    public readonly onProgress = this._onProgress.event;
    public readonly onDisconnect = this._onDisconnect.event;
    public readonly outputChannel: vscode.OutputChannel;

    constructor() {
        const config = vscode.workspace.getConfiguration('sovereign');
        this._bridgeUrl = config.get<string>('bridgeUrl') || 'http://localhost:3002';
        this.outputChannel = vscode.window.createOutputChannel('Sovereign Bridge');
    }

    public async connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            const eventSource = new EventSource(`${this._bridgeUrl}/sse`);
            this._eventSource = eventSource;

            eventSource.onmessage = (event: any) => {
                const data = event.data;
                // Extract sessionId from endpoint URL: data: /messages?sessionId=...
                const urlMatch = data.match(/sessionId=([^&]+)/);
                if (urlMatch && !this._sessionId) {
                    this._sessionId = urlMatch[1];
                    console.log(`[MCP Client] Connected. Session: ${this._sessionId}`);
                    resolve();
                }
                
                // Handle JSON-RPC notifications and progress
                try {
                    const parsed = JSON.parse(data);
                    // Handle JSON-RPC tool results
                    if (parsed.id && this._responseResolvers.has(parsed.id)) {
                        const resolve = this._responseResolvers.get(parsed.id);
                        this._responseResolvers.delete(parsed.id);
                        resolve?.(parsed.result || parsed);
                    }
                    // Handle progress notifications
                    if (parsed.method === 'notifications/message') {
                        this._onProgress.fire(parsed.params.data);
                    }
                } catch (e) {}
            };

            eventSource.onerror = (err: any) => {
                console.error(`[MCP Client] SSE Error: ${err}`);
                this._onDisconnect.fire();
                if (!this._sessionId) {
                    reject(new Error(`SSE Connection failed: ${err}`));
                }
            };
        });
    }

    public async callTool(name: string, args: any): Promise<any> {
        if (!this._sessionId) throw new Error('MCP Client not connected.');

        const id = Date.now();
        const resultPromise = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this._responseResolvers.delete(id);
                reject(new Error(`Tool call '${name}' timed out.`));
            }, 120000); // 2 minute timeout for missions

            this._responseResolvers.set(id, (res) => {
                clearTimeout(timeout);
                resolve(res);
            });
        });

        const response = await fetch(`${this._bridgeUrl}/messages?sessionId=${this._sessionId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: id,
                method: 'tools/call',
                params: { name, arguments: args }
            })
        });

        if (!response.ok) throw new Error(`Tool call failed: ${response.statusText}`);
        
        // Await the response from the SSE stream
        return resultPromise;
    }

    public logStatus() {
        this.outputChannel.appendLine(`[Status] Bridge URL: ${this._bridgeUrl}`);
        this.outputChannel.appendLine(`[Status] Session ID: ${this._sessionId || 'Not Connected'}`);
        this.outputChannel.show();
    }

    public dispose() {
        this._eventSource?.close();
        this._onProgress.dispose();
        this._onDisconnect.dispose();
        this.outputChannel.dispose();
    }

    public get isConnected(): boolean {
        return !!this._sessionId;
    }
}