import * as vscode from 'vscode';
import EventSource from 'eventsource';

/**
 * MCPClient
 * Handles Server-Sent Events (SSE) communication with the Sovereign Bridge.
 */
export class MCPClient {
    public isConnected: boolean = false;
    public sessionId: string | null = null;
    public outputChannel: vscode.OutputChannel;
    private eventSource: EventSource | null = null;
    private baseUrl: string;

    constructor(outputChannel: vscode.OutputChannel, baseUrl: string = 'http://localhost:3002') {
        this.outputChannel = outputChannel;
        this.baseUrl = baseUrl;
    }

    /**
     * Establishes a session with the MCP Bridge.
     */
    public async connect(): Promise<void> {
        if (this.eventSource) {
            this.eventSource.close();
        }

        this.outputChannel.appendLine(`[MCP] Establishing bridge connection: ${this.baseUrl}/sse`);
        
        return new Promise((resolve, reject) => {
            try {
                const es = new EventSource(`${this.baseUrl}/sse`);
                this.eventSource = es;

                es.onopen = () => {
                    this.isConnected = true;
                    this.outputChannel.appendLine('[MCP] Bridge connection established.');
                    resolve();
                };

                es.onmessage = (event: any) => {
                    try {
                        const data = JSON.parse(event.data);
                        if (data.sessionId) {
                            this.sessionId = data.sessionId;
                            this.outputChannel.appendLine(`[MCP] Session ID assigned: ${this.sessionId}`);
                        }
                    } catch (err) {
                        this.outputChannel.appendLine(`[MCP] Warning: Received malformed message: ${event.data}`);
                    }
                };

                es.onerror = (err: any) => {
                    this.isConnected = false;
                    this.outputChannel.appendLine(`[MCP] Bridge error: ${JSON.stringify(err)}`);
                    reject(err);
                };
            } catch (err) {
                reject(err);
            }
        });
    }

    /**
     * Dispatches a tool call to the bridge via JSON-RPC.
     */
    public async executeTool(name: string, args: any): Promise<any> {
        if (!this.isConnected || !this.sessionId) {
            throw new Error("MCP Client is not connected. Initiate a session first.");
        }

        const url = `${this.baseUrl}/messages?sessionId=${this.sessionId}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'tools/call',
                params: { name, arguments: args },
                id: Date.now()
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Bridge Error (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        if (data.error) {
            throw new Error(`Bridge JSON-RPC Error: ${data.error.message || JSON.stringify(data.error)}`);
        }
        return data.result;
    }

    public dispose() {
        if (this.eventSource) {
            this.eventSource.close();
            this.isConnected = false;
            this.outputChannel.appendLine('[MCP] Client disconnected.');
        }
    }
}