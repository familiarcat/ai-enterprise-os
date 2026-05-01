/**
 * MCPClient.ts — Sovereign Factory VSCode Extension
 *
 * Implements the MCP client over Node.js http transport, matching the protocol
 * exposed by apps/api/mcp-http-bridge.mjs.
 */
import * as vscode from 'vscode';
import * as http from 'http';
import { URL } from 'url';

export class MCPClient {
    private static instance: MCPClient;
    private sessionId: string | null = null;
    private bridgeUrl: string;
    public outputChannel: vscode.OutputChannel;
    private isConnecting: boolean = false;
    private connectionPromise: Promise<string> | null = null;
    private sseRequest: http.ClientRequest | null = null;
    private sseResponse: http.IncomingMessage | null = null;

    private _onProgress = new vscode.EventEmitter<string>();
    private _onDisconnect = new vscode.EventEmitter<void>();

    public readonly onProgress = this._onProgress.event;
    public readonly onDisconnect = this._onDisconnect.event;

    private constructor() {
        const config = vscode.workspace.getConfiguration('sovereign');
        this.bridgeUrl = config.get<string>('mcpBridgeUrl') || 'http://localhost:3002';
        this.outputChannel = vscode.window.createOutputChannel('Sovereign Factory');
        this.outputChannel.appendLine(`[Init] MCP Bridge Client initialized with URL: ${this.bridgeUrl}`);

        // Listen for configuration changes to update bridgeUrl dynamically
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('sovereign.mcpBridgeUrl')) {
                const newConfig = vscode.workspace.getConfiguration('sovereign');
                const newBridgeUrl = newConfig.get<string>('mcpBridgeUrl') || 'http://localhost:3002';
                if (this.bridgeUrl !== newBridgeUrl) {
                    this.outputChannel.appendLine(`[Config] MCP Bridge URL changed from ${this.bridgeUrl} to ${newBridgeUrl}.`);
                    this.bridgeUrl = newBridgeUrl;
                    this.disconnect(); // Disconnect existing session to force re-establishment with new URL
                }
            }
        });
    }

    public static getInstance(): MCPClient {
        if (!MCPClient.instance) {
            MCPClient.instance = new MCPClient();
        }
        return MCPClient.instance;
    }

    public get isConnected(): boolean {
        return !!this.sessionId;
    }

    /**
     * Reveals the output channel and prints the current bridge connection status.
     * Useful for diagnostics without triggering a full tool-based health check.
     */
    public logStatus(): void {
        this.outputChannel.show();
        this.outputChannel.appendLine(`\n[Status] --- Sovereign Bridge Diagnostics ---`);
        this.outputChannel.appendLine(`[Status] Target URL: ${this.bridgeUrl}`);
        this.outputChannel.appendLine(`[Status] Connection: ${this.sessionId ? 'CONNECTED' : 'DISCONNECTED'}`);
        this.outputChannel.appendLine(`[Status] Protocol: SSE + JSON-RPC`);
        if (this.sessionId) {
            this.outputChannel.appendLine(`[Status] Active Session: ${this.sessionId}`);
        }
        this.outputChannel.appendLine(`[Status] ------------------------------------\n`);
    }

    public async callTool(name: string, args: Record<string, any>): Promise<any> {
        const sessId = await this.ensureSession();
        this.outputChannel.appendLine(`[MCP] Calling tool: ${name} with args: ${JSON.stringify(args)}`);

        const payload = {
            jsonrpc: '2.0',
            id: Date.now(),
            method: 'tools/call',
            params: { name, arguments: args },
        };
        const body = JSON.stringify(payload);

        return new Promise((resolve, reject) => {
            const url = new URL(`${this.bridgeUrl}/messages?sessionId=${sessId}`);
            const options = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(body)
                }
            };

            const req = http.request(url, options, (res) => {
                let data = '';
                res.on('data', (chunk: any) => data += chunk.toString());
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        this.outputChannel.appendLine(`[MCP] Received response for tool: ${name}`);
                        if (parsed.error) {
                            this.outputChannel.appendLine(`[MCP] Tool error: ${parsed.error.message}`);
                            reject(new Error(parsed.error.message));
                        } else {
                            resolve(parsed.result);
                        }
                    } catch (e) {
                        reject(new Error(`Failed to parse response: ${data}`));
                    }
                });
            });

            req.on('error', (e) => reject(e));
            req.write(body);
            req.end();
        });
    }

    public async runMission(project: string, objective: string, persona: string = 'captain_picard'): Promise<any> {
        return this.callTool('run_factory_mission', { project, objective, persona });
    }

    private async ensureSession(): Promise<string> {
        if (this.sessionId) return this.sessionId;
        if (this.connectionPromise) return this.connectionPromise;

        this.isConnecting = true;
        this.outputChannel.appendLine(`[MCP] Connecting to SSE at ${this.bridgeUrl}/sse...`);

        this.connectionPromise = new Promise<string>((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.disconnect();
                reject(new Error('SSE session timeout after 5000ms'));
            }, 5000);

            this.sseRequest = http.get(`${this.bridgeUrl}/sse`, { headers: { 'Accept': 'text/event-stream' } }, (res) => {
                this.sseResponse = res;
                let buffer = '';

                res.on('data', (chunk: any) => {
                    buffer += chunk.toString();
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const rawData = line.substring(6).trim();
                            const sessionMatch = rawData.match(/sessionId=([^&"\s\r\n]+)/);
                            if (sessionMatch) {
                                clearTimeout(timeout);
                                this.sessionId = sessionMatch[1];
                                this.outputChannel.appendLine(`[MCP] Session ID established: ${this.sessionId}`);
                                this.isConnecting = false;
                                this.connectionPromise = null;
                                resolve(this.sessionId);
                            } else {
                                // Stream all other SSE data events as progress to the viewport
                                this._onProgress.fire(rawData);
                            }
                        }
                    }
                });

                res.on('end', () => this.disconnect());

                res.on('error', (e) => {
                    this.outputChannel.appendLine(`[MCP] SSE Response error: ${e.message}`);
                    this.disconnect();
                });
            });

            this.sseRequest.on('error', (e) => {
                clearTimeout(timeout);
                this.isConnecting = false;
                this.connectionPromise = null;
                reject(e);
            });
        });

        return this.connectionPromise;
    }

    public disconnect(): void {
        if (this.sseRequest) this.sseRequest.destroy();
        if (this.sseResponse) this.sseResponse.destroy();
        this.sseRequest = null;
        this.sseResponse = null;
        this.sessionId = null;
        this.isConnecting = false;
        this.connectionPromise = null;
        this._onDisconnect.fire();
        this.outputChannel.appendLine('[MCP] Disconnected.');
    }
}

export function getMCPClient(): MCPClient {
    return MCPClient.getInstance();
}