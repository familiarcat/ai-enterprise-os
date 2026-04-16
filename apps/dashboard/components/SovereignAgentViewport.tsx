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
    producedFiles?:   string[];
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
      'relative flex flex-col h-full border-2 border-black rounded-none overflow-hidden transition-all duration-300 font-sans selection:bg-red-500 selection:text-white bg-white',
      isActive
        ? 'border-red-600 shadow-[8px_8px_0px_0px_rgba(220,38,38,1)] z-10'
        : 'border-black',
    ].join(' ')}>

      {/* Header Grid: Consistent with Billing.tsx 12-column logic */}
      <div className="grid grid-cols-12 border-b-2 border-black bg-white min-h-[80px]">
        <div className="col-span-9 p-4 border-r-2 border-black flex items-center gap-4">
          <span className={`text-3xl ${cfg.animate}`}>{emoji}</span>
          <h2 className="text-2xl font-black uppercase tracking-tighter leading-none truncate">
            {agentName}
          </h2>
        </div>
        <div className={[
          'col-span-3 p-4 flex flex-col justify-center items-end transition-colors',
          isAlert ? 'bg-red-600 text-white' : status === 'THINKING' ? 'bg-black text-white' : 'bg-white text-black'
        ].join(' ')}>
          <span className={['text-[9px] font-bold uppercase tracking-[0.2em] mb-1', isAlert ? 'text-white/70' : 'text-red-500'].join(' ')}>
            00 / STATE
          </span>
          <span className="text-xs font-black uppercase tracking-tighter">
            {status}
          </span>
        </div>
      </div>

      {/* Metadata Strip */}
      <div className="grid grid-cols-12 border-b-2 border-black text-[10px] font-black uppercase tracking-widest bg-white">
        <div className="col-span-4 p-4 border-r-2 border-black">
          <span className="text-red-600 block mb-1">01 / ID</span>
          <span className="text-black truncate block">{agentId}</span>
        </div>
        <div className="col-span-4 p-4 border-r-2 border-black">
          <span className="text-red-600 block mb-1">02 / MODEL</span>
          <span className="text-black truncate block">{metadata?.model?.split('/').pop() || 'None'}</span>
        </div>
        <div className="col-span-4 p-4">
          <span className="text-red-600 block mb-1">03 / COST</span>
          <span className="text-black block">
            {metadata?.cost !== undefined ? `$${metadata.cost.toFixed(4)}` : 'N/A'}
          </span>
        </div>
      </div>

      {/* Produced Files Breadcrumbs */}
      {metadata?.producedFiles && metadata.producedFiles.length > 0 && (
        <div className="px-6 py-2 border-b-2 border-black bg-zinc-50 flex gap-2 overflow-x-auto scrollbar-hide">
          <span className="text-[9px] font-black uppercase text-red-600 whitespace-nowrap">Artifacts:</span>
          {metadata.producedFiles.map((f, i) => (
            <span key={i} className="text-[9px] font-mono font-bold text-black bg-white border border-black px-1 whitespace-nowrap">
              {f.split('/').pop()}
            </span>
          ))}
        </div>
      )}

      {/* Stream content */}
      <div 
        className="flex-1 p-6 overflow-y-auto bg-white min-h-[150px] scrollbar-thin scrollbar-thumb-black scrollbar-track-zinc-100"
        style={{ scrollbarWidth: 'auto', scrollbarColor: 'black transparent' }}
      >
        {streamContent ? (
          <pre className="text-[11px] font-mono font-medium text-black whitespace-pre-wrap break-words leading-[1.4] selection:bg-black selection:text-white">
            {streamContent}
          </pre>
        ) : (
          <div className="text-sm text-zinc-200 italic font-black uppercase tracking-tighter">
            {status === 'IDLE' ? 'Awaiting task...' : 'Initializing...'}
          </div>
        )}
      </div>

      {/* Execution Time Accent */}
      {metadata?.executionTimeMs !== undefined && (
        <div className="absolute bottom-6 right-6 bg-black text-white px-3 py-1.5 text-[10px] font-black uppercase tracking-widest">
          {metadata.executionTimeMs}ms
        </div>
      )}

      {cached && (
        <div className="absolute bottom-6 right-6 bg-red-600 text-white px-3 py-1.5 text-[10px] font-black uppercase tracking-widest">
          CACHED
        </div>
      )}
    </div>
  );
}
