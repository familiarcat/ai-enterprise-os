import React, { useState, useEffect, useRef } from 'react';
import { Shield, Cpu, Activity, Trash2, Wifi, WifiOff, RefreshCw, Settings, ArrowUp, Info, Download } from 'lucide-react';

declare const acquireVsCodeApi: () => any;
const vscode = acquireVsCodeApi();

interface LogEntry {
    id: number;
    text: string;
    type: 'progress' | 'log' | 'error';
    timestamp: string;
}

const App: React.FC = () => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [bridgeStatus, setBridgeStatus] = useState<'online' | 'offline' | 'checking'>('checking');
    const [offlineCount, setOfflineCount] = useState(0);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const renderLogText = (text: string) => {
        const marker = '--- [v11 REFLECTION: LT. WORF] ---';
        if (text && typeof text === 'string' && text.includes(marker)) {
            const [output, reflection] = text.split(marker);
            return (
                <div className="log-text-parsed">
                    <div className="output-text">{output}</div>
                    <div className="reflection-block">
                        <div className="reflection-header">
                            <Shield size={10} strokeWidth={2.5} />
                            <span>TACTICAL REFLECTION // LT. WORF</span>
                        </div>
                        <div className="reflection-body">{reflection}</div>
                    </div>
                </div>
            );
        }
        return text;
    };

    const formatResultText = (result: any): string => {
        if (!result) return '';
        if (typeof result === 'string') return result;

        // Handle MCP-level errors (if tool execution failed at the protocol layer)
        if (result.isError) {
            const errorMsg = Array.isArray(result.content) 
                ? result.content.map((c: any) => c.text).join('\n')
                : JSON.stringify(result);
            return `[BRIDGE ERROR] ${errorMsg}`;
        }

        // Handle standard MCP structured content response
        if (result.content && Array.isArray(result.content)) {
            return result.content.map((item: any) => {
                const itemText = item.text || '';
                // The bridge often stringifies internal orchestrator results into a text block.
                // We attempt to parse it to see if it contains a structured mission result.
                try {
                    const inner = JSON.parse(itemText);
                    if (inner && typeof inner === 'object') {
                        // Orchestrator success with nested content array
                        if (inner.status === 'SUCCESS' && Array.isArray(inner.content)) {
                            return inner.content.map((c: any) => c.text).join('\n');
                        }
                        // v11 Compliant stored package format (used in RAG recall)
                        if (inner.output && inner.reflection) {
                            return `${inner.output}\n\n--- [v11 REFLECTION: LT. WORF] ---\n${inner.reflection}`;
                        }
                        if (inner.status === 'ERROR') {
                            return `[MISSION FAILED] ${inner.error || inner.message || itemText}`;
                        }
                    }
                } catch {
                    // Not JSON or parsing failed, use raw text
                }
                return itemText;
            }).join('\n');
        }

        return typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result);
    };

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const message = event.data;

            // Handle Health Check results for the Status Indicator
            if (message.toolName === 'health_check') {
                if (message.command === 'mcpResult') {
                    setBridgeStatus('online');
                    setOfflineCount(0);
                    if (message.silent) return;
                }
                if (message.command === 'mcpError') {
                    setBridgeStatus('offline');
                    setOfflineCount(prev => {
                        const next = prev + 1;
                        // Notify if offline for more than 3 consecutive polls (on the 4th)
                        if (next === 4) {
                            vscode.postMessage({ 
                                command: 'notifyOffline', 
                                text: 'Sovereign Bridge has been offline for more than 3 consecutive checks. Please verify your connection.' 
                            });
                        }
                        return next;
                    });
                    if (message.silent) return;
                }
            }

            // Standardize text extraction for structured results and progress strings
            let text = message.message || message.text || message.error || "";

            if (message.result) {
                text = formatResultText(message.result);
            }

            // Process standard logs
            const newEntry: LogEntry = {
                id: Date.now(),
                timestamp: new Date().toLocaleTimeString(),
                text: text,
                type: message.command === 'progress' ? 'progress' : 'log'
            };

            if (message.command === 'mcpError') {
                newEntry.type = 'error';
            }

            setLogs(prev => [...prev, newEntry]);
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    // Health Polling Loop
    useEffect(() => {
        const checkHealth = () => {
            vscode.postMessage({ command: 'mcpCall', toolName: 'health_check', args: {}, silent: true });
        };

        // Initial check
        checkHealth();

        const interval = setInterval(checkHealth, 30000); // Check every 30 seconds
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const handleScroll = (e: React.UIEvent<HTMLElement>) => {
        const scrollTop = e.currentTarget.scrollTop;
        setShowScrollTop(scrollTop > 200);
    };

    const openSettings = () => {
        vscode.postMessage({ command: 'openSettings' });
    };

    const checkStatus = () => {
        vscode.postMessage({ command: 'checkStatus' });
    };

    const clearLogs = () => {
        setLogs([]);
    };

    const reconnect = () => {
        setBridgeStatus('checking');
        vscode.postMessage({ command: 'mcpCall', toolName: 'health_check', args: {}, silent: true });
    };

    const exportLogs = () => {
        if (logs.length === 0) {
            vscode.postMessage({ command: 'alert', text: 'No logs to export.' });
            return;
        }

        const markdownContent = logs.map(log => {
            const typeIcon = log.type === 'error' ? '❌' : log.type === 'progress' ? '⚙️' : '💬';
            return `### ${typeIcon} ${log.type.toUpperCase()} [${log.timestamp}]\n\n\`\`\`\n${log.text}\n\`\`\`\n`;
        }).join('\n---\n\n');

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        vscode.postMessage({ 
            command: 'exportLogs', 
            content: markdownContent,
            defaultFilename: `sovereign-mission-log-${timestamp}.md`
        });
    };

    const scrollToTop = () => {
        containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="sovereign-viewport">
            <style>{`
                .reflection-block {
                    margin-top: 12px;
                    margin-bottom: 4px;
                    border: 1px solid var(--vscode-charts-red, #f14c4c);
                    background: rgba(241, 76, 76, 0.05);
                    border-left: 3px solid var(--vscode-charts-red, #f14c4c);
                    padding: 10px;
                    font-family: var(--vscode-editor-font-family, monospace);
                    border-radius: 2px;
                }
                .reflection-header {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    color: var(--vscode-charts-red, #f14c4c);
                    font-weight: 800;
                    font-size: 9px;
                    letter-spacing: 1px;
                    margin-bottom: 8px;
                }
                .reflection-body {
                    font-size: 11px;
                    line-height: 1.5;
                    white-space: pre-wrap;
                    color: var(--vscode-editor-foreground, #cccccc);
                }
                .output-text { white-space: pre-wrap; }
                .error-boundary-fallback {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 8px;
                    border: 1px dashed var(--vscode-charts-red, #f14c4c);
                    color: var(--vscode-errorForeground, #f14c4c);
                    font-size: 10px;
                    text-transform: uppercase;
                    background: rgba(241, 76, 76, 0.02);
                }
            `}</style>
            <header>
                <div className="header-left">
                    <Activity size={16} className="icon-pulse" />
                    <span>Observation Lounge — Active Stream</span>
                </div>
                <div className="header-right">
                    <button onClick={checkStatus} className="diag-btn" title="Check Bridge Status">
                        <Info size={14} />
                    </button>
                    <button onClick={exportLogs} className="export-btn" title="Export Logs">
                        <Download size={14} />
                    </button>
                    <button onClick={openSettings} className="settings-btn" title="Open Settings">
                        <Settings size={14} />
                    </button>
                    <button onClick={clearLogs} className="clear-btn" title="Clear Logs">
                        <Trash2 size={14} />
                    </button>
                </div>
            </header>
            
            <main className="log-container" ref={containerRef} onScroll={handleScroll}>
                {logs.length === 0 && (
                    <div className="empty-state">
                        <Cpu size={48} opacity={0.2} />
                        <p>Awaiting crew mission dispatch...</p>
                    </div>
                )}
                {logs.map(log => (
                    <div key={log.id} className={`log-entry ${log.type}`}>
                        <span className="timestamp">[{log.timestamp}]</span>
                        <span className="text">{renderLogText(log.text)}</span>
                    </div>
                ))}
                <div ref={scrollRef} />
                {showScrollTop && (
                    <button onClick={scrollToTop} className="scroll-top-btn" title="Scroll to Top">
                        <ArrowUp size={16} />
                    </button>
                )}
            </main>

            <footer>
                <div className="status-item">
                    <Shield size={12} />
                    <span>Worf Security: Active</span>
                </div>
                <div className="status-item">
                    {bridgeStatus === 'online' ? (
                        <><Wifi size={12} className="status-online" /> <span>Bridge: Online</span></>
                    ) : bridgeStatus === 'offline' ? (
                        <>
                            <WifiOff size={12} className="status-offline" /> 
                            <span>Bridge: Offline</span>
                            <button onClick={reconnect} className="reconnect-btn" title="Manual Reconnect">
                                <RefreshCw size={10} />
                            </button>
                        </>
                    ) : (
                        <><Activity size={12} className="icon-pulse" /> <span>Bridge: Checking...</span></>
                    )}
                </div>
            </footer>
        </div>
    );
};

export default App;