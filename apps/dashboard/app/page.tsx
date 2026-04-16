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
import { Billing } from '@/components/Billing';
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
    <div className="min-h-screen bg-white text-black font-sans selection:bg-red-500 selection:text-white">
      {/* Top navigation */}
      <header className="sticky top-0 z-50 border-b-2 border-black bg-white">
        <div className="max-w-[1600px] mx-auto px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl font-black">SF</span>
            <div>
              <h1 className="text-base font-black uppercase tracking-tighter leading-none">AI Enterprise OS</h1>
              <p className="text-[10px] text-black font-bold uppercase tracking-widest mt-1">Mission Control</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Bridge status */}
            <div className="flex items-center gap-1.5 text-xs font-mono">
              <span className={[
                'w-2 h-2 rounded-none',
                bridgeStatus === 'online'  ? 'bg-red-600' :
                bridgeStatus === 'offline' ? 'bg-red-500' :
                'bg-gray-600 animate-pulse',
              ].join(' ')} />
              <span className={
                bridgeStatus === 'online'  ? 'text-black font-bold' :
                bridgeStatus === 'offline' ? 'text-red-400' :
                'text-gray-400'
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

      <main className="max-w-[1600px] mx-auto px-8 py-12">
        {/* Global Statistics / Economics */}
        <div className="mb-12 border-2 border-black">
          <Billing />
        </div>

        {/* Step indicator */}
        <div className="grid grid-cols-4 gap-0 mb-12 border-2 border-black">
          {STEPS.map((s, idx) => {
            const isDone    = step > s.id;
            const isActive  = step === s.id;
            const canClick  = isDone || isActive;
            return (
              <button
                key={s.id}
                onClick={() => canClick && setStep(s.id)}
                disabled={!canClick}
                className={[
                  'flex flex-col p-6 text-left border-r-2 last:border-r-0 border-black transition-all',
                  isActive
                    ? 'bg-black text-white'
                    : isDone
                      ? 'bg-white text-black/40 hover:text-black cursor-pointer'
                      : 'bg-white text-black/20 cursor-default',
                ].join(' ')}
              >
                <span className="text-xs font-bold uppercase tracking-widest mb-4">0{s.id}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{s.icon}</span>
                  <span className="text-lg font-black uppercase tracking-tighter leading-none">{s.label}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Step content card */}
        <div className="border-2 border-black bg-white rounded-none overflow-hidden">
          <div className="border-b-2 border-black px-8 py-6 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">{STEPS[step - 1].icon}</span>
                <h2 className="text-4xl font-black uppercase tracking-tighter">{STEPS[step - 1].label}</h2>
              </div>
              <p className="text-xs font-bold uppercase tracking-widest mt-1 ml-8">{STEPS[step - 1].description}</p>
            </div>

            {step > 1 && (
              <button
                onClick={resetMission}
                className="text-xs font-black uppercase border-2 border-black px-4 py-2 hover:bg-black hover:text-white transition-colors"
              >
                ↺ Reset
              </button>
            )}
          </div>

          <div className="p-8">
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
                      'px-10 py-4 rounded-none font-black text-sm tracking-widest uppercase transition-all',
                      selectedCrew.length > 0
                        ? 'bg-red-600 text-white hover:bg-black'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed',
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
        <div className="mt-12 text-center text-[10px] text-black font-black uppercase tracking-[0.2em]">
          AI Enterprise OS · MCP Bridge :{process.env.NEXT_PUBLIC_MCP_BRIDGE_URL?.split(':').pop() ?? '3002'}
          {' / '}Star Trek crew via OpenRouter
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
