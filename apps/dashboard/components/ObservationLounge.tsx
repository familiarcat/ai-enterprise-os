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

import React, { useState } from 'react';
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
  producedFiles?: string[];
  usedTools?:     { name: string; isSecure: boolean }[];
}

interface ObservationLoungeProps {
  executions:    AgentExecution[];
  sessionTitle?: string;
}

export default function ObservationLounge({ executions, sessionTitle }: ObservationLoungeProps) {
  return (
    <div>
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
    </div>
  );
}
