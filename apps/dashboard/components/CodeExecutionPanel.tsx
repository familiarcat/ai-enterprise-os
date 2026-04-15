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
    <div className="space-y-6">
      {/* Summary banner */}
      <div className={[
        'p-4 rounded-xl border',
        failed.length === 0
          ? 'border-crew-green/30 bg-crew-green/5'
          : 'border-yellow-500/30 bg-yellow-500/5',
      ].join(' ')}>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">
            {failed.length === 0 ? '✅' : '⚠️'}
          </span>
          <div>
            <div className="font-bold text-white">
              {failed.length === 0 ? 'Mission Complete' : 'Mission Partial'}
            </div>
            <div className="text-xs text-gray-400 font-mono mt-0.5">
              {project} · {completed.length}/{executions.length} agents succeeded
              {totalCost > 0 && ` · $${totalCost.toFixed(4)} total cost`}
              {totalMs > 0 && ` · ${(totalMs / 1000).toFixed(1)}s`}
            </div>
          </div>
        </div>
        <p className="text-sm text-gray-300 leading-relaxed italic border-t border-white/10 pt-2 mt-2">
          "{task}"
        </p>
      </div>

      {/* Agent results */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
          Agent Outputs
        </h3>
        {executions.map(exec => {
          const agent = CREW[exec.handle];
          const isExpanded = expanded === exec.handle;
          const lines = exec.output.split('\n');
          const preview = lines.slice(0, 4).join('\n');

          return (
            <div
              key={exec.handle}
              className={[
                'border rounded-xl overflow-hidden transition-all',
                exec.status === 'SUCCESS' ? 'border-green-500/20' :
                exec.status === 'ERROR'   ? 'border-red-500/20' :
                'border-white/10',
              ].join(' ')}
            >
              <button
                onClick={() => setExpanded(isExpanded ? null : exec.handle)}
                className="w-full flex items-center justify-between px-4 py-3 bg-white/3 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span>{agent?.emoji ?? '🤖'}</span>
                  <span className="font-semibold text-sm text-white">
                    {agent?.displayName ?? exec.handle}
                  </span>
                  {exec.model && (
                    <span className="text-[10px] text-gray-500 font-mono">
                      {exec.model.split('/').pop()}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs">
                  {exec.cost !== undefined && (
                    <span className="text-yellow-500/80">💰 ${exec.cost.toFixed(4)}</span>
                  )}
                  <span className={
                    exec.status === 'SUCCESS' ? 'text-green-400 font-bold' :
                    exec.status === 'ERROR'   ? 'text-red-400 font-bold' :
                    'text-gray-500'
                  }>
                    {exec.status}
                  </span>
                  <span className="text-gray-600">{isExpanded ? '▲' : '▼'}</span>
                </div>
              </button>

              <div className={[
                'transition-all overflow-hidden',
                isExpanded ? 'max-h-[600px]' : 'max-h-16',
              ].join(' ')}>
                <pre className="px-4 py-3 text-xs font-mono text-gray-300 whitespace-pre-wrap break-words leading-relaxed bg-black/30 overflow-y-auto max-h-[580px]">
                  {isExpanded ? exec.output : preview + (lines.length > 4 ? '\n...' : '')}
                </pre>
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={onNewTask}
          className="flex-1 py-3 rounded-xl font-bold text-sm tracking-widest uppercase border border-crew-green/40 text-crew-green bg-crew-green/10 hover:bg-crew-green/20 transition-colors"
        >
          ▶ New Mission
        </button>
        <button
          onClick={() => {
            const blob = new Blob(
              [executions.map(e => `=== ${e.handle} ===\n${e.output}`).join('\n\n')],
              { type: 'text/plain' }
            );
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `mission-${project}-${Date.now()}.txt`;
            a.click();
          }}
          className="px-4 py-3 rounded-xl font-bold text-sm tracking-widest uppercase border border-white/10 text-gray-400 hover:bg-white/5 transition-colors"
        >
          ⬇ Export
        </button>
      </div>
    </div>
  );
}
