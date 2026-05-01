import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Shield, Cpu, Activity, Trash2, Wifi, WifiOff, RefreshCw, Settings, ArrowUp, Info } from 'lucide-react';

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

            // Process standard logs
            const newEntry: LogEntry = {
                id: Date.now(),
                timestamp: new Date().toLocaleTimeString(),
                text: message.message || message.text || JSON.stringify(message.result),
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

    const scrollToTop = () => {
        containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="sovereign-viewport">
            <header>
                <div className="header-left">
                    <Activity size={16} className="icon-pulse" />
                    <span>Observation Lounge — Active Stream</span>
                </div>
                <div className="header-right">
                    <button onClick={checkStatus} className="diag-btn" title="Check Bridge Status">
                        <Info size={14} />
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
                        <span className="text">{log.text}</span>
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