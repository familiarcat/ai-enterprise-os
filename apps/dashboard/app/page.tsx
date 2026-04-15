'use client';

/**
 * Mission Control — Main 4-step workflow
 *
 *  Step 1 · MCP Brain     — Select crew identity & role
 *  Step 2 · Task + LLM    — Define task, auto-route to optimal model
 *  Step 3 · Observation   — Watch agents execute, compare output
 *  Step 4 · Code Updates  — Review & apply scaffolded changes
 */

import React, { useState, useEffect } from 'react';
import CrewSelector from '@/components/CrewSelector';
import TaskLLMPanel, { type ExecutionConfig } from '@/components/TaskLLMPanel';
import ObservationLounge, { type AgentExecution } from '@/components/ObservationLounge';
import CodeExecutionPanel from '@/components/CodeExecutionPanel';
import { CREW, MISSION_FLOW, MODEL_ID_MAP } from '@/lib/crew-manifest';

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4;

const STEPS: { id: Step; label: string; icon: string; description: string }[] = [
  { id: 1, label: 'MCP Brain',     icon: '🧠', description: 'Select crew identity & role' },
  { id: 2, label: 'Task + LLM',    icon: '⚙️', description: 'Define task, auto-route model' },
  { id: 3, label: 'Observation',   icon: '🔭', description: 'Watch agents execute & compare' },
  { id: 4, label: 'Code Updates',  icon: '💾', description: 'Review & apply changes' },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function MissionControl() {
  const [step,          setStep]          = useState<Step>(1);
  const [selectedCrew,  setSelectedCrew]  = useState<string[]>([]);
  const [executions,    setExecutions]    = useState<AgentExecution[]>([]);
  const [isLoading,     setIsLoading]     = useState(false);
  const [config,        setConfig]        = useState<ExecutionConfig | null>(null);
  const [bridgeStatus,  setBridgeStatus]  = useState<'unknown' | 'online' | 'offline'>('unknown');
  const [sessionTitle,  setSessionTitle]  = useState<string>('');

  // Check MCP bridge health on mount
  useEffect(() => {
    fetch('/api/mcp/status')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(() => setBridgeStatus('online'))
      .catch(() => setBridgeStatus('offline'));
  }, []);

  // ── Execute mission ─────────────────────────────────────────────────────────

  async function handleExecute(cfg: ExecutionConfig) {
    setConfig(cfg);
    setIsLoading(true);
    setStep(3);

    // Build agent list: full flow or single agent
    const agentHandles = cfg.runFullFlow
      ? MISSION_FLOW.map(s => s.agent as string)
      : [cfg.crewHandle];

    // Init all agents as THINKING
    const initExecs: AgentExecution[] = agentHandles.map(handle => ({
      handle,
      status:  'THINKING',
      output:  '',
      model:   MODEL_ID_MAP[CREW[handle]?.preferredTier ?? cfg.tier],
    }));
    setExecutions(initExecs);
    setSessionTitle(`${cfg.project} — ${cfg.task.slice(0, 60)}${cfg.task.length > 60 ? '…' : ''}`);

    // Call /api/mcp/execute — sequential for full flow, single call otherwise
    try {
      if (cfg.runFullFlow) {
        await runFullMissionFlow(cfg, agentHandles);
      } else {
        await runSingleAgent(cfg);
      }
    } finally {
      setIsLoading(false);
      setStep(4);
    }
  }

  async function runSingleAgent(cfg: ExecutionConfig) {
    const start = Date.now();
    try {
      const res = await fetch('/api/mcp/execute', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          tool:    'run_factory_mission',
          args:    { project: cfg.project, objective: cfg.task, persona: cfg.crewHandle },
        }),
      });

      const data = await res.json();
      const output = data.content?.[0]?.text ?? data.error ?? JSON.stringify(data, null, 2);

      setExecutions([{
        handle:      cfg.crewHandle,
        status:      res.ok && !data.isError ? 'SUCCESS' : 'ERROR',
        output,
        model:       cfg.model,
        durationMs:  Date.now() - start,
        cost:        estimateCost(cfg.tier, output.length),
      }]);
    } catch (err) {
      setExecutions([{
        handle:  cfg.crewHandle,
        status:  'ERROR',
        output:  String(err),
        model:   cfg.model,
        durationMs: Date.now() - start,
      }]);
    }
  }

  async function runFullMissionFlow(cfg: ExecutionConfig, handles: string[]) {
    for (let i = 0; i < MISSION_FLOW.length; i++) {
      const step = MISSION_FLOW[i];
      const handle = handles[i];
      const agent = CREW[handle];
      const start = Date.now();

      // Mark this agent as active
      setExecutions(prev => prev.map(e =>
        e.handle === handle ? { ...e, status: 'THINKING' } : e
      ));

      try {
        const res = await fetch('/api/mcp/execute', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            tool: 'run_crew_agent',
            args: {
              project:   cfg.project,
              objective: cfg.task,
              persona:   handle,
              step:      step.description,
            },
          }),
        });

        const data = await res.json();
        const output = data.content?.[0]?.text ?? data.error ?? JSON.stringify(data, null, 2);
        const tier = agent?.preferredTier ?? cfg.tier;

        setExecutions(prev => prev.map(e =>
          e.handle === handle
            ? {
                ...e,
                status:     res.ok && !data.isError ? 'SUCCESS' : 'ERROR',
                output,
                model:      MODEL_ID_MAP[tier],
                durationMs: Date.now() - start,
                cost:       estimateCost(tier, output.length),
              }
            : e
        ));
      } catch (err) {
        setExecutions(prev => prev.map(e =>
          e.handle === handle
            ? { ...e, status: 'ERROR', output: String(err), durationMs: Date.now() - start }
            : e
        ));
      }

      // Brief pause between agents so UI updates are visible
      await new Promise(r => setTimeout(r, 300));
    }
  }

  function resetMission() {
    setStep(1);
    setExecutions([]);
    setConfig(null);
    setSessionTitle('');
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-alex-gradient">
      {/* Top navigation */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-space-darker/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🚀</span>
            <div>
              <h1 className="text-sm font-bold text-white tracking-tight">AI Enterprise OS</h1>
              <p className="text-[10px] text-gray-600 font-mono">Mission Control</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Bridge status */}
            <div className="flex items-center gap-1.5 text-xs font-mono">
              <span className={[
                'w-1.5 h-1.5 rounded-full',
                bridgeStatus === 'online'  ? 'bg-crew-green animate-pulse' :
                bridgeStatus === 'offline' ? 'bg-red-500' :
                'bg-gray-600 animate-pulse',
              ].join(' ')} />
              <span className={
                bridgeStatus === 'online'  ? 'text-crew-green' :
                bridgeStatus === 'offline' ? 'text-red-400' :
                'text-gray-600'
              }>
                MCP Bridge {bridgeStatus === 'online' ? ':3002' : bridgeStatus}
              </span>
            </div>

            {/* Crew count */}
            {selectedCrew.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-gray-400">
                {selectedCrew.slice(0, 4).map(h => (
                  <span key={h} title={CREW[h]?.displayName}>{CREW[h]?.emoji}</span>
                ))}
                {selectedCrew.length > 4 && <span>+{selectedCrew.length - 4}</span>}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Step indicator */}
        <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-2">
          {STEPS.map((s, idx) => {
            const isDone    = step > s.id;
            const isActive  = step === s.id;
            const canClick  = isDone || isActive;
            return (
              <React.Fragment key={s.id}>
                <button
                  onClick={() => canClick && setStep(s.id)}
                  disabled={!canClick}
                  className={[
                    'flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-semibold whitespace-nowrap transition-all',
                    isActive
                      ? 'border-crew-green/50 bg-crew-green/10 text-crew-green shadow-[0_0_12px_rgba(0,255,170,0.1)]'
                      : isDone
                        ? 'border-crew-green/20 bg-crew-green/5 text-crew-green/60 hover:bg-crew-green/10 cursor-pointer'
                        : 'border-white/5 bg-black/10 text-gray-600 cursor-default',
                  ].join(' ')}
                >
                  <span className={isActive ? '' : 'opacity-60'}>{s.icon}</span>
                  <span>
                    <span className="text-[10px] font-mono mr-1.5 opacity-50">0{s.id}</span>
                    {s.label}
                  </span>
                  {isDone && <span className="text-[10px] text-crew-green/60 font-mono">✓</span>}
                </button>
                {idx < STEPS.length - 1 && (
                  <div className={[
                    'w-8 h-px flex-shrink-0',
                    step > s.id ? 'bg-crew-green/30' : 'bg-white/5',
                  ].join(' ')} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Step content card */}
        <div className="border border-white/8 rounded-2xl bg-space-card backdrop-blur-sm overflow-hidden">
          <div className="border-b border-white/5 px-6 py-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">{STEPS[step - 1].icon}</span>
                <h2 className="font-bold text-white">{STEPS[step - 1].label}</h2>
              </div>
              <p className="text-xs text-gray-500 mt-0.5 ml-8">{STEPS[step - 1].description}</p>
            </div>

            {step > 1 && (
              <button
                onClick={resetMission}
                className="text-xs text-gray-500 hover:text-gray-300 border border-white/10 px-3 py-1.5 rounded-lg transition-colors"
              >
                ↺ Reset
              </button>
            )}
          </div>

          <div className="p-6">
            {/* Step 1: MCP Brain — Crew selection */}
            {step === 1 && (
              <div>
                <CrewSelector
                  selected={selectedCrew}
                  onChange={setSelectedCrew}
                />
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setStep(2)}
                    disabled={selectedCrew.length === 0}
                    className={[
                      'px-6 py-3 rounded-xl font-bold text-sm tracking-widest uppercase transition-all',
                      selectedCrew.length > 0
                        ? 'bg-crew-green/20 border border-crew-green/50 text-crew-green hover:bg-crew-green/30'
                        : 'bg-white/5 border border-white/10 text-gray-600 cursor-not-allowed',
                    ].join(' ')}
                  >
                    Configure Task →
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Task + LLM */}
            {step === 2 && (
              <TaskLLMPanel
                selectedCrew={selectedCrew}
                onExecute={handleExecute}
                isLoading={isLoading}
              />
            )}

            {/* Step 3: Observation Lounge */}
            {step === 3 && (
              <ObservationLounge
                executions={executions}
                sessionTitle={sessionTitle}
              />
            )}

            {/* Step 4: Code Updates */}
            {step === 4 && config && (
              <CodeExecutionPanel
                executions={executions}
                task={config.task}
                project={config.project}
                onNewTask={resetMission}
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-gray-700 font-mono">
          AI Enterprise OS · MCP Bridge :{process.env.NEXT_PUBLIC_MCP_BRIDGE_URL?.split(':').pop() ?? '3002'}
          {' · '}Star Trek crew via OpenRouter
        </div>
      </main>
    </div>
  );
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function estimateCost(tier: string, outputChars: number): number {
  const ratePerM: Record<string, number> = {
    HAIKU:          0.25,
    SONNET:         3.0,
    OPUS:           15.0,
    GPT_4O:         0.15,
    GEMINI_1_5_PRO: 0.075,
    BUDGET:         0.25,
    STANDARD:       3.0,
    PREMIUM:        15.0,
  };
  const rate = ratePerM[tier] ?? 3.0;
  const tokens = outputChars / 4; // rough estimate
  return (tokens / 1_000_000) * rate;
}
