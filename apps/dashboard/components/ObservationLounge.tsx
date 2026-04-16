'use client';

/**
 * ObservationLounge — Step 3: Compare agent responses
 *
 * Shows SovereignAgentViewport panes for each active agent,
 * displays the Observation Lounge session history from crew-memories/,
 * and lets the user see what each crew member learned.
 *
 * Adapted from openrouter-crew-platform/apps/alex-dashboard/app/observation-lounge/page.tsx
 */

import React, { useState, useEffect } from 'react';
import SovereignAgentViewport, { type AgentStatus } from './SovereignAgentViewport';
import { CREW } from '@/lib/crew-manifest';

export interface AgentExecution {
  handle:       string;
  status:       AgentStatus;
  output:       string;
  model?:       string;
  cost?:        number;
  durationMs?:  number;
  cached?:      boolean;
}

interface ObservationLoungeProps {
  executions:    AgentExecution[];
  sessionTitle?: string;
}

interface CrewObservation {
  crew_member:  string;
  role:         string;
  summary:      string;
  key_findings: string[];
  recommendations: string[];
  timestamp:    string;
}

export default function ObservationLounge({ executions, sessionTitle }: ObservationLoungeProps) {
  const [observations, setObservations] = useState<CrewObservation[]>([]);
  const [loadingObs, setLoadingObs]     = useState(false);
  const [activeTab, setActiveTab]       = useState<'live' | 'history'>('live');

  useEffect(() => {
    if (activeTab === 'history') fetchObservations();
  }, [activeTab]);

  async function fetchObservations() {
    setLoadingObs(true);
    try {
      const res = await fetch('/api/lounge/observations');
      if (res.ok) {
        const data = await res.json();
        setObservations(data.observations ?? []);
      }
    } catch {
      // non-fatal
    } finally {
      setLoadingObs(false);
    }
  }

  const activeCount  = executions.filter(e => e.status === 'THINKING' || e.status === 'TOOL_CALL').length;
  const successCount = executions.filter(e => e.status === 'SUCCESS').length;
  const errorCount   = executions.filter(e => e.status === 'ERROR').length;
  const totalCost    = executions.reduce((acc, e) => acc + (e.cost ?? 0), 0);

  return (
    <div className="bg-white text-black font-sans">
      {/* Session header */}
      <div className="grid grid-cols-12 border-b-2 border-black mb-12">
        <div className="col-span-8 p-8 border-r-2 border-black">
          <h1 className="text-6xl font-black uppercase tracking-tighter leading-none mb-4">
            Observation <br /> Lounge
          </h1>
          <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-widest text-zinc-400">
            {activeCount > 0  && <span className="text-black">01 / {activeCount} running</span>}
            {successCount > 0 && <span className="text-black">02 / {successCount} success</span>}
            {errorCount > 0   && <span className="text-red-600">03 / {errorCount} alerts</span>}
            {totalCost > 0    && <span className="text-black">04 / ${totalCost.toFixed(4)} cost</span>}
          </div>
        </div>

        <div className="col-span-4 p-8 flex flex-col justify-end gap-2 bg-black">
          {(['live', 'history'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={[
                'px-6 py-3 font-black uppercase tracking-[0.2em] text-xs border-2 transition-all text-left',
                activeTab === tab
                  ? 'bg-white text-black border-white'
                  : 'bg-transparent text-white border-zinc-800 hover:border-white',
              ].join(' ')}
            >
              {tab === 'live' ? '01 / Live Stream' : '02 / Historical'}
            </button>
          ))}
        </div>
      </div>

      {/* Live viewport grid */}
      {activeTab === 'live' && (
        <>
          {executions.length === 0 ? (
            <div className="flex items-center justify-center h-64 border-2 border-black bg-zinc-50">
              <p className="text-xs font-black uppercase tracking-widest text-zinc-300">
                No active executions — run a task to see agent output here
              </p>
            </div>
          ) : (
            <div className={[
              'grid gap-8',
              executions.length === 1 ? 'grid-cols-1' :
              'grid-cols-1 lg:grid-cols-2',
            ].join(' ')}>
              {executions.map(exec => {
                const agent = CREW[exec.handle];
                return (
                  <div key={exec.handle} className="h-[400px]">
                    <SovereignAgentViewport
                      agentName={agent?.displayName ?? exec.handle}
                      agentId={exec.handle}
                      emoji={agent?.emoji}
                      status={exec.status}
                      streamContent={exec.output}
                      metadata={{
                        model:           exec.model,
                        cost:            exec.cost,
                        executionTimeMs: exec.durationMs,
                      }}
                      cached={exec.cached}
                      isActive={exec.status === 'THINKING' || exec.status === 'TOOL_CALL'}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* History panel */}
      {activeTab === 'history' && (
        <div className="bg-white">
          {loadingObs ? (
            <div className="flex items-center justify-center h-64 border-2 border-black">
              <span className="text-xs font-black uppercase tracking-[0.2em] animate-pulse">00 / Loading Memories...</span>
            </div>
          ) : observations.length === 0 ? (
            <div className="flex items-center justify-center h-64 border-2 border-black bg-zinc-50">
              <p className="text-xs font-black uppercase tracking-widest text-zinc-300">
                No crew observations found in crew-memories/active/
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border-t-2 border-l-2 border-black">
              {observations.map((obs, i) => {
                const agent = Object.values(CREW).find(a =>
                  a.displayName.toLowerCase().includes(obs.crew_member.toLowerCase().split(' ')[0])
                );
                return (
                  <div key={i} className="p-8 border-r-2 border-b-2 border-black bg-white transition-colors hover:bg-zinc-50">
                    <div className="flex items-start justify-between mb-8">
                      <div className="flex items-center gap-4">
                        <span className="text-4xl">{agent?.emoji ?? '⭐'}</span>
                        <div>
                          <div className="font-black uppercase tracking-tighter text-2xl leading-none">{obs.crew_member}</div>
                          <div className="text-[10px] font-bold uppercase tracking-widest text-red-600 mt-1">{obs.role}</div>
                        </div>
                      </div>
                      <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                        {new Date(obs.timestamp).toLocaleDateString()}
                      </div>
                    </div>
                    <p className="text-lg font-medium leading-tight tracking-tight text-black mb-8">{obs.summary}</p>
                    {obs.key_findings?.length > 0 && (
                      <div className="mb-6">
                        <div className="text-[9px] font-black text-zinc-400 mb-2 uppercase tracking-[0.2em]">01 / Key Findings</div>
                        <ul className="space-y-1">
                          {obs.key_findings.slice(0, 3).map((f, j) => (
                            <li key={j} className="text-xs font-bold uppercase tracking-tight flex items-start gap-2">
                              <span className="text-red-600">▪</span> {f}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {obs.recommendations?.length > 0 && (
                      <div>
                        <div className="text-[9px] font-black text-zinc-400 mb-2 uppercase tracking-[0.2em]">02 / Recommendations</div>
                        <ul className="space-y-1">
                          {obs.recommendations.slice(0, 2).map((r, j) => (
                            <li key={j} className="text-xs font-bold uppercase tracking-tight flex items-start gap-2">
                              <span className="text-black">▪</span> {r}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
