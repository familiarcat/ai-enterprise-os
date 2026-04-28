import React, { useEffect, useState } from 'react';

interface BridgeStatus {
  status: 'ok' | 'degraded' | 'error' | 'unknown';
  sessions: number;
  timestamp: string;
}

/**
 * BridgeStatusBar — Sovereign Factory
 * Persistent bar showing the status of the MCP HTTP Bridge and session costs.
 */
export const BridgeStatusBar: React.FC<{ sessionCost?: number }> = ({ sessionCost = 0 }) => {
  const [status, setStatus] = useState<BridgeStatus>({ 
    status: 'unknown', 
    sessions: 0, 
    timestamp: new Date().toISOString() 
  });

  const checkStatus = async () => {
    try {
      const res = await fetch('/api/mcp/status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      } else {
        setStatus(prev => ({ ...prev, status: 'error' }));
      }
    } catch (e) {
      setStatus(prev => ({ ...prev, status: 'error' }));
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    switch (status.status) {
      case 'ok': return 'bg-[#00ffaa]'; // crew-green
      case 'degraded': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="bg-[#0d1022] border-b border-white/10 px-4 py-2 flex items-center justify-between text-xs font-mono uppercase tracking-[0.2em] text-white/70">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full animate-pulse ${getStatusColor()}`} />
          <span>Bridge: <span className={status.status === 'ok' ? 'text-[#00ffaa]' : ''}>{status.status}</span></span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white/30">Sessions:</span>
          <span className="text-white font-bold">{status.sessions}</span>
        </div>
      </div>

      <div className="flex items-center gap-8">
        <div className="flex items-center gap-2">
          <span className="text-white/30">Active Session Cost:</span>
          <span className="text-[#00ffaa] font-black">${sessionCost.toFixed(6)}</span>
        </div>
        <button 
          onClick={checkStatus}
          className="hover:text-[#00ffaa] transition-colors border border-white/10 px-2 py-0.5 rounded bg-white/5 active:scale-95"
        >
          Refresh
        </button>
      </div>
    </div>
  );
};