'use client';

/**
 * CodeExecutionPanel — Step 4: Apply code updates
 *
 * Shows the final result from the MCP orchestrator:
 * - Generated files / scaffolded domains
 * - Git diff summary
 * - Next actions recommended by the crew
 */

import React, { useState } from 'react';
import { type AgentExecution } from './ObservationLounge';
import { CREW } from '@/lib/crew-manifest';

interface CodeExecutionPanelProps {
  executions:  AgentExecution[];
  task:        string;
  project:     string;
  onNewTask:   () => void;
}

export default function CodeExecutionPanel({
  executions, task, project, onNewTask
}: CodeExecutionPanelProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const completed = executions.filter(e => e.status === 'SUCCESS');
  const failed    = executions.filter(e => e.status === 'ERROR');
  const running   = executions.filter(e => e.status === 'THINKING' || e.status === 'TOOL_CALL');

  const totalCost = executions.reduce((acc, e) => acc + (e.cost ?? 0), 0);
  const totalMs   = executions.reduce((acc, e) => acc + (e.durationMs ?? 0), 0);

  if (running.length > 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="text-4xl animate-pulse">⚙️</div>
        <p className="text-sm text-gray-400 font-mono">
          {running.length} agent{running.length !== 1 ? 's' : ''} still executing...
        </p>
        <div className="flex gap-2">
          {running.map(e => {
            const agent = CREW[e.handle];
            return (
              <span key={e.handle} className="text-2xl animate-bounce" title={agent?.displayName}>
                {agent?.emoji ?? '🤖'}
              </span>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-0 border-2 border-black bg-white">
      {/* Summary banner */}
      <div className="grid grid-cols-12 border-b-2 border-black">
        <div className="col-span-8 p-8 border-r-2 border-black">
          <h2 className="text-6xl font-black uppercase tracking-tighter leading-none mb-4">
            {failed.length === 0 ? 'Mission' : 'Partial'} <br /> Complete
          </h2>
          <p className="text-xs font-black uppercase tracking-widest text-zinc-400">
            Objective: <span className="text-black italic">{task}</span>
          </p>
        </div>
        <div className={[
          'col-span-4 p-8 flex flex-col justify-between text-white',
          failed.length === 0 ? 'bg-black' : 'bg-red-600'
        ].join(' ')}>
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">04 / Stats</span>
          <div className="space-y-1">
            <div className="flex justify-between font-black uppercase text-xs">
              <span>Cost</span> <span>${totalCost.toFixed(4)}</span>
            </div>
            <div className="flex justify-between font-black uppercase text-xs">
              <span>Time</span> <span>{(totalMs / 1000).toFixed(1)}s</span>
            </div>
          </div>
        </div>
      </div>

      {/* Agent results */}
      <div className="grid grid-cols-1 divide-y-2 divide-black border-b-2 border-black">
        {executions.map(exec => {
          const agent = CREW[exec.handle];
          const isExpanded = expanded === exec.handle;
          const lines = exec.output.split('\n');
          const preview = lines.slice(0, 4).join('\n');

          return (
            <div key={exec.handle} className="bg-white">
              <button
                onClick={() => setExpanded(isExpanded ? null : exec.handle)}
                className="w-full flex items-center justify-between p-6 hover:bg-zinc-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{agent?.emoji ?? '🤖'}</span>
                  <h4 className="text-lg font-black uppercase tracking-tighter">{agent?.displayName ?? exec.handle}</h4>
                </div>
                <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-widest">
                  {exec.cost !== undefined && (
                    <span className="text-zinc-400">Cost / ${exec.cost.toFixed(4)}</span>
                  )}
                  <span className={
                    exec.status === 'SUCCESS' ? 'text-black' : 'text-red-600'
                  }>
                    Status / {exec.status}
                  </span>
                  <span className="text-black">{isExpanded ? 'CLOSE' : 'OPEN'}</span>
                </div>
              </button>

              <div className={[
                'transition-all overflow-hidden bg-zinc-50 border-t-2 border-black',
                isExpanded ? 'max-h-[800px]' : 'max-h-0',
              ].join(' ')}>
                <pre className="p-8 text-[11px] font-mono font-medium text-black whitespace-pre-wrap break-words leading-tight overflow-y-auto max-h-[700px]">
                  {exec.output}
                </pre>
              </div>

              {exec.producedFiles && exec.producedFiles.length > 0 && isExpanded && (
                <div className="p-8 bg-white border-t-2 border-black">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-red-600 mb-4">05 / Artifact Traceability</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {exec.producedFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 border border-black text-[10px] font-mono truncate">
                        <span className="text-red-600">📄</span>
                        {file}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex divide-x-2 divide-black bg-black">
        <button
          onClick={onNewTask}
          className="flex-1 py-8 font-black uppercase tracking-[0.2em] text-sm text-white hover:bg-white hover:text-black transition-all"
        >
          01 / New Mission
        </button>
        <button
          onClick={() => {
            // ... (keep download logic)
            const blob = new Blob(
              [executions.map(e => `=== ${e.handle} ===\n${e.output}`).join('\n\n')],
              { type: 'text/plain' }
            );
          }}
          className="flex-1 py-8 font-black uppercase tracking-[0.2em] text-sm text-white hover:bg-white hover:text-black transition-all"
        >
          02 / Export Log
        </button>
      </div>
    </div>
  );
}
