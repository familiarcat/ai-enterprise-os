/**
 * MCPClient.ts — Sovereign Factory VSCode Extension
 *
 * Implements the MCP client over HTTP/SSE transport, matching the protocol
 * exposed by apps/api/mcp-http-bridge.mjs.
 */
import * as vscode from 'vscode';
import * as http from 'http';
import { EventEmitter } from 'events';

/** Internal types for SSE parsing to avoid external dependencies */
interface ParsedEvent {
    type: 'event';
    data: string;
}
interface ReconnectInterval {
    type: 'reconnect-interval';
    value: number;
}

/** Simple inline SSE parser to handle bridge notifications */
function createParser(onEvent: (event: ParsedEvent | ReconnectInterval) => void) {
    let buffer = '';
    return {
        feed(chunk: string) {
            buffer += chunk;
            const messages = buffer.split(/\r?\n\r?\n/);
            buffer = messages.pop() || '';
            for (const message of messages) {
                const dataMatch = message.match(/^data:\s*(.+)$/m);
                if (dataMatch) {
                    onEvent({ type: 'event', data: dataMatch[1].trim() });
                }
            }
        }
    };
}

export class MCPClient extends EventEmitter {
    private static instance: MCPClient;
    private sessionId: string | null = null;
    private bridgeUrl: string;
    public outputChannel: vscode.OutputChannel;
    private isConnecting: boolean = false;
    private connectionPromise: Promise<string> | null = null;
    private sseRequest: http.ClientRequest | null = null;
    private sseResponse: http.IncomingMessage | null = null;

    private constructor() {
        super();
        const config = vscode.workspace.getConfiguration('sovereign');
        this.bridgeUrl = config.get<string>('mcpBridgeUrl') || 'http://localhost:3002';
        this.outputChannel = vscode.window.createOutputChannel('Sovereign Factory');
    }

    public static getInstance(): MCPClient {
        if (!MCPClient.instance) {
            MCPClient.instance = new MCPClient();
        }
        return MCPClient.instance;
    }

    public async callTool(name: string, args: Record<string, any>): Promise<any> {
        const sessId = await this.ensureSession();
        this.outputChannel.appendLine(`[MCP] Calling tool: ${name}`);
        this.outputChannel.show(true);

        const url = new URL(`${this.bridgeUrl}/messages?sessionId=${sessId}`);
        const body = JSON.stringify({
            jsonrpc: "2.0",
            id: Date.now(),
            method: "tools/call",
            params: { name, arguments: args }
        });

        return new Promise((resolve, reject) => {
            const req = http.request(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(body)
                }
            }, (res) => {
                let data = '';
                res.on('data', (chunk: Buffer) => data += chunk.toString());
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.error) {
                            this.outputChannel.appendLine(`[MCP] Tool error: ${parsed.error.message}`);
                            reject(new Error(parsed.error.message));
                        } else {
                            this.outputChannel.appendLine(`[MCP] Tool response received.`);
                            resolve(parsed.result);
                        }
                    } catch (err: unknown) {
                        const e = err as Error;
                        const errorMessage = e.message || String(e);
                        reject(new Error(`Failed to parse response: ${data}. Error: ${errorMessage}`));
                    }
                });
            });

            req.on('error', (e: Error) => {
                this.outputChannel.appendLine(`[MCP] Tool request error: ${e.message}`);
                reject(e);
            });
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

        const promise = new Promise<string>((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.disconnect();
                reject(new Error('SSE session timeout after 5000ms'));
            }, 5000);

            this.sseRequest = http.get(`${this.bridgeUrl}/sse`, { headers: { 'Accept': 'text/event-stream' } }, (res: http.IncomingMessage) => {
                this.sseResponse = res;

                const parser = createParser((event: ParsedEvent | ReconnectInterval) => {
                    if (event.type === 'event') {
                        const rawData = event.data;
                        
                        // Attempt to extract sessionId if not already established
                        if (!this.sessionId) {
                            const sessionMatch = rawData.match(/sessionId=([^&"\s\r\n]+)/);
                            if (sessionMatch) {
                                const id = sessionMatch[1];
                                clearTimeout(timeout);
                                this.sessionId = id;
                                this.outputChannel.appendLine(`[MCP] Session ID established: ${this.sessionId}`);
                                this.isConnecting = false;
                                this.connectionPromise = null;
                                resolve(id);
                            }
                        }

                        // Parse and emit progress notifications
                        if (rawData.startsWith('{')) {
                            try {
                                const json = JSON.parse(rawData);
                                if (json.method === 'notifications/progress') {
                                    this.emit('progress', json.params.message);
                                }
                            } catch (e) { /* ignore non-JSON events like endpoint announcements */ }
                        }
                    }
                });

                res.on('data', (chunk: Buffer) => {
                    parser.feed(chunk.toString());
                });

                res.on('end', () => this.disconnect());
                res.on('error', (e: Error) => {
                    this.outputChannel.appendLine(`[MCP] SSE error: ${e.message}`);
                    this.disconnect();
                });
            });

            this.sseRequest.on('error', (e: Error) => {
                clearTimeout(timeout);
                this.isConnecting = false;
                this.connectionPromise = null;
                reject(e);
            });
        });

        this.connectionPromise = promise;
        return promise;
    }

    public disconnect(): void {
        if (this.sseRequest) this.sseRequest.destroy();
        if (this.sseResponse) this.sseResponse.destroy();
        this.sseRequest = null;
        this.sseResponse = null;
        this.sessionId = null;
        this.isConnecting = false;
        this.connectionPromise = null;
        this.outputChannel.appendLine('[MCP] Disconnected.');
    }
}

export function getMCPClient(): MCPClient {
    return MCPClient.getInstance();
}