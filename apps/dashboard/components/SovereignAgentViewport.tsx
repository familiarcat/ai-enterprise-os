'use client';

/**
 * SovereignAgentViewport
 *
 * Displays a single agent's real-time streaming output.
 * Ported from openrouter-crew-platform/SovereignAgentViewport.tsx
 * and adapted to use Tailwind classes from this app's config.
 */

import React from 'react';
import { AgentExecution } from './ObservationLounge';

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
  IDLE:      { label: 'IDLE',      color: 'text-gray-400',   animate: '' },
  THINKING:  { label: 'THINKING',  color: 'text-black',      animate: 'animate-pulse' },
  TOOL_CALL: { label: 'TOOL_CALL', color: 'text-red-600',    animate: 'animate-pulse' },
  SUCCESS:   { label: 'SUCCESS',   color: 'text-black',      animate: '' },
  ERROR:     { label: 'ERROR',     color: 'text-red-600',    animate: '' },
  STOPPED:   { label: 'STOPPED',   color: 'text-gray-400',   animate: '' },
};
 
/**
 * SovereignAgentViewport - Swiss Design Refactor
 * Implements the Müller-Brockmann aesthetic: high contrast, 2px borders, 
 * and strict grid alignment to match Billing.tsx.
 */
export default function SovereignAgentViewport({
  agentName, agentId, emoji = '🤖', status, streamContent,
  metadata, cached = false, isActive = false,
}: AgentViewportProps) {
  const cfg = STATUS_CONFIG[status];
  const isAlert = status === 'ERROR' || status === 'TOOL_CALL';

  return (
    <div className={[
      'relative flex flex-col h-full border-2 rounded-none overflow-hidden transition-all duration-300 font-sans selection:bg-red-500 selection:text-white bg-white',
      isActive
        ? 'border-red-600 shadow-[4px_4px_0px_0px_rgba(220,38,38,1)]'
        : 'border-black',
    ].join(' ')}>

      {/* Header Grid: Consistent with Billing.tsx 12-column logic */}
      <div className="grid grid-cols-12 border-b-2 border-black bg-white">
        <div className="col-span-8 p-3 border-r-2 border-black flex items-center gap-3">
          <span className={`text-xl ${cfg.animate}`}>{emoji}</span>
          <h2 className="text-xl font-black uppercase tracking-tighter leading-none truncate">
            {agentName}
          </h2>
        </div>
        <div className={[
          'col-span-4 p-3 flex flex-col justify-center items-end transition-colors',
          isAlert ? 'bg-red-600 text-white' : status === 'THINKING' ? 'bg-black text-white' : 'bg-white text-black'
        ].join(' ')}>
          <span className={['text-[10px] font-bold uppercase tracking-widest', isAlert ? 'text-white/80' : 'text-red-500'].join(' ')}>
            Status
          </span>
          <span className="text-xs font-black uppercase tracking-tighter">
            {status}
          </span>
        </div>
      </div>

      {/* Metadata Strip */}
      <div className="grid grid-cols-12 border-b-2 border-black text-[9px] font-bold uppercase tracking-widest bg-white">
        <div className="col-span-4 p-2 border-r-2 border-black">
          <span className="text-zinc-400 block mb-0.5">01 / ID</span>
          <span className="font-mono text-black truncate block">{agentId}</span>
        </div>
        <div className="col-span-4 p-2 border-r-2 border-black">
          <span className="text-zinc-400 block mb-0.5">02 / Model</span>
          <span className="text-black truncate block">{metadata?.model?.split('/').pop() || 'None'}</span>
        </div>
        <div className="col-span-4 p-2">
          <span className="text-zinc-400 block mb-0.5">03 / Resource</span>
          <span className="text-black block">
            {metadata?.cost !== undefined ? `$${metadata.cost.toFixed(4)}` : 'N/A'}
          </span>
        </div>
      </div>

      {/* Stream content */}
      <div 
        className="flex-1 p-4 overflow-y-auto bg-white min-h-[120px] scrollbar-thin scrollbar-thumb-black scrollbar-track-transparent"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'black transparent' }}
      >
        {streamContent ? (
          <pre className="text-xs font-mono text-black whitespace-pre-wrap break-words leading-tight">
            {streamContent}
          </pre>
        ) : (
          <div className="text-sm text-zinc-300 italic font-mono uppercase tracking-tight">
            {status === 'IDLE' ? 'Awaiting task...' : 'Initializing...'}
          </div>
        )}
      </div>

      {/* Execution Time Accent */}
      {metadata?.executionTimeMs !== undefined && (
        <div className="absolute bottom-4 right-4 bg-black text-white px-2 py-1 text-[10px] font-black uppercase tracking-widest">
          {metadata.executionTimeMs}ms
        </div>
      )}

      {cached && (
        <div className="absolute bottom-4 right-4 bg-red-600 text-white px-2 py-1 text-[10px] font-black uppercase tracking-widest">
          CACHED
        </div>
      )}
    </div>
  );
}
