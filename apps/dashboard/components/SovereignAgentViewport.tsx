'use client';

/**
 * SovereignAgentViewport
 *
 * Displays a single agent's real-time streaming output.
 * Ported from openrouter-crew-platform/SovereignAgentViewport.tsx
 * and adapted to use Tailwind classes from this app's config.
 */

import React from 'react';

export type AgentStatus = 'IDLE' | 'THINKING' | 'TOOL_CALL' | 'SUCCESS' | 'ERROR' | 'STOPPED';

export interface AgentViewportProps {
  agentName:    string;
  agentId:      string;
  emoji?:       string;
  status:       AgentStatus;
  streamContent: string;
  metadata?: {
    model?:           string;
    tokensUsed?:      number;
    cost?:            number;
    executionTimeMs?: number;
  };
  cached?:   boolean;
  isActive?: boolean;
}

const STATUS_CONFIG: Record<AgentStatus, { label: string; color: string; animate: string }> = {
  IDLE:      { label: 'IDLE',      color: 'text-gray-500',   animate: '' },
  THINKING:  { label: 'THINKING',  color: 'text-blue-400',   animate: 'animate-pulse' },
  TOOL_CALL: { label: 'TOOL_CALL', color: 'text-purple-400', animate: 'animate-spin' },
  SUCCESS:   { label: 'SUCCESS',   color: 'text-green-400',  animate: '' },
  ERROR:     { label: 'ERROR',     color: 'text-red-500',    animate: '' },
  STOPPED:   { label: 'STOPPED',   color: 'text-gray-600',   animate: '' },
};

export default function SovereignAgentViewport({
  agentName, agentId, emoji = '🤖', status, streamContent,
  metadata, cached = false, isActive = false,
}: AgentViewportProps) {
  const cfg = STATUS_CONFIG[status];

  return (
    <div className={[
      'relative flex flex-col h-full border rounded-xl overflow-hidden transition-all duration-300',
      isActive
        ? 'border-blue-500/50 shadow-lg shadow-blue-500/10'
        : 'border-white/10 hover:border-white/20',
    ].join(' ')}>

      {/* Header */}
      <div className={[
        'flex items-center justify-between px-3 py-2 border-b bg-white/5 backdrop-blur-md',
        isActive ? 'border-blue-500/30' : 'border-white/10',
      ].join(' ')}>
        <div className="flex items-center gap-2">
          <span className={`text-base ${cfg.color} ${cfg.animate}`}>{emoji}</span>
          <span className="font-semibold text-sm text-white">{agentName}</span>
          <span className="text-[10px] text-gray-500 font-mono">({agentId})</span>
        </div>

        <div className="flex items-center gap-3 text-xs text-gray-500">
          {cached && (
            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold tracking-tight text-[10px]">
              CACHED
            </span>
          )}
          {metadata?.cost !== undefined && (
            <span className="text-yellow-500/90">
              💰 ${metadata.cost.toFixed(4)}
            </span>
          )}
          {metadata?.executionTimeMs !== undefined && (
            <span className="text-green-500/90">
              ⚡ {metadata.executionTimeMs}ms
            </span>
          )}
          {metadata?.model && (
            <span className="text-gray-500/80 font-mono text-[10px]">
              {metadata.model.split('/').pop()}
            </span>
          )}
          <span className={`font-bold text-[10px] tracking-widest ${cfg.color}`}>
            {cfg.label}
          </span>
        </div>
      </div>

      {/* Stream content */}
      <div className="flex-1 p-4 overflow-y-auto bg-black/20 min-h-[120px]"
           style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
        {streamContent ? (
          <pre className="text-sm font-mono text-gray-300 whitespace-pre-wrap break-words leading-relaxed">
            {streamContent}
          </pre>
        ) : (
          <div className="text-sm text-gray-600 italic font-mono">
            {status === 'IDLE' ? 'Awaiting task...' : 'Initializing...'}
          </div>
        )}
      </div>
    </div>
  );
}
