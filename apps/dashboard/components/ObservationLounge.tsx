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
    <div>
      {/* Session header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-white">
            {sessionTitle ?? 'Observation Lounge'}
          </h3>
          <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
            {activeCount > 0  && <span className="text-blue-400">⏳ {activeCount} running</span>}
            {successCount > 0 && <span className="text-green-400">✓ {successCount} complete</span>}
            {errorCount > 0   && <span className="text-red-400">✗ {errorCount} errors</span>}
            {totalCost > 0    && <span className="text-yellow-500">💰 ${totalCost.toFixed(4)} total</span>}
          </div>
        </div>

        <div className="flex gap-1 border border-white/10 rounded-lg overflow-hidden text-xs">
          {(['live', 'history'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={[
                'px-3 py-1.5 font-bold uppercase tracking-wide transition-colors',
                activeTab === tab
                  ? 'bg-crew-green/20 text-crew-green'
                  : 'bg-transparent text-gray-500 hover:text-gray-300',
              ].join(' ')}
            >
              {tab === 'live' ? '▶ Live' : '📚 History'}
            </button>
          ))}
        </div>
      </div>

      {/* Live viewport grid */}
      {activeTab === 'live' && (
        <>
          {executions.length === 0 ? (
            <div className="flex items-center justify-center h-48 border border-white/5 rounded-xl bg-black/10">
              <p className="text-sm text-gray-600 font-mono italic">
                No active executions — run a task to see agent output here
              </p>
            </div>
          ) : (
            <div className={[
              'grid gap-4',
              executions.length === 1 ? 'grid-cols-1' :
              executions.length === 2 ? 'grid-cols-2' :
              'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3',
            ].join(' ')}>
              {executions.map(exec => {
                const agent = CREW[exec.handle];
                return (
                  <div key={exec.handle} className="h-64">
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
        <div>
          {loadingObs ? (
            <div className="flex items-center justify-center h-32">
              <span className="text-gray-500 text-sm font-mono animate-pulse">Loading crew memories...</span>
            </div>
          ) : observations.length === 0 ? (
            <div className="flex items-center justify-center h-32 border border-white/5 rounded-xl bg-black/10">
              <p className="text-sm text-gray-600 font-mono italic">
                No crew observations found in crew-memories/active/
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {observations.map((obs, i) => {
                const agent = Object.values(CREW).find(a =>
                  a.displayName.toLowerCase().includes(obs.crew_member.toLowerCase().split(' ')[0])
                );
                return (
                  <div key={i} className="p-4 border border-white/10 rounded-xl bg-black/20">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-xl">{agent?.emoji ?? '⭐'}</span>
                      <div>
                        <div className="font-semibold text-white text-sm">{obs.crew_member}</div>
                        <div className="text-xs text-gray-500">{obs.role} · {new Date(obs.timestamp).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed mb-3">{obs.summary}</p>
                    {obs.key_findings?.length > 0 && (
                      <div className="mb-2">
                        <div className="text-xs font-bold text-crew-green mb-1 uppercase tracking-wide">Key Findings</div>
                        <ul className="list-disc list-inside space-y-1">
                          {obs.key_findings.slice(0, 3).map((f, j) => (
                            <li key={j} className="text-xs text-gray-400">{f}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {obs.recommendations?.length > 0 && (
                      <div>
                        <div className="text-xs font-bold text-yellow-500/80 mb-1 uppercase tracking-wide">Recommendations</div>
                        <ul className="list-disc list-inside space-y-1">
                          {obs.recommendations.slice(0, 2).map((r, j) => (
                            <li key={j} className="text-xs text-gray-400">{r}</li>
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
