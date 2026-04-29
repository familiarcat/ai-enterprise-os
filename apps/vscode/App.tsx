import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Shield, Cpu, Activity, Trash2 } from 'lucide-react';

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
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const message = event.data;
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

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const clearLogs = () => {
        setLogs([]);
    };

    return (
        <div className="sovereign-viewport">
            <header>
                <div className="header-left">
                    <Activity size={16} className="icon-pulse" />
                    <span>Observation Lounge — Active Stream</span>
                </div>
                <button onClick={clearLogs} className="clear-btn" title="Clear Logs">
                    <Trash2 size={14} />
                </button>
            </header>
            
            <main className="log-container">
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
            </main>

            <footer>
                <div className="status-item">
                    <Shield size={12} />
                    <span>Worf Security: Active</span>
                </div>
                <div className="status-item">
                    <Terminal size={12} />
                    <span>Bridge: Connected</span>
                </div>
            </footer>
        </div>
    );
};

export default App;