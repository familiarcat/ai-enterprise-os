'use client';

/**
 * TaskLLMPanel — Step 2: Task definition + optimized LLM selection
 *
 * User describes the task → system estimates complexity →
 * recommends model tier + best crew agent for the job →
 * user can override before executing.
 */

import React, { useState, useEffect } from 'react';
import {
  CREW, MODEL_ID_MAP, MODEL_COST_LABEL,
  selectTierByComplexity, estimateComplexity,
  MISSION_FLOW, type ModelTier, type CrewAgent,
} from '@/lib/crew-manifest';

interface TaskLLMPanelProps {
  selectedCrew:     string[];
  onExecute:        (config: ExecutionConfig) => void;
  isLoading?:       boolean;
}

export interface ExecutionConfig {
  task:       string;
  project:    string;
  crewHandle: string;
  model:      string;
  tier:       ModelTier;
  complexity: number;
  runFullFlow: boolean;
}

const COMPLEXITY_LABEL = (s: number) =>
  s < 0.3 ? '🟢 Simple' : s < 0.7 ? '🟡 Medium' : '🔴 Complex';

export default function TaskLLMPanel({ selectedCrew, onExecute, isLoading }: TaskLLMPanelProps) {
  const [task,       setTask]       = useState('');
  const [project,    setProject]    = useState('enterprise-os');
  const [complexity, setComplexity] = useState(0.3);
  const [tier,       setTier]       = useState<ModelTier>('SONNET');
  const [crewHandle, setCrewHandle] = useState(selectedCrew[0] ?? 'captain_picard');
  const [runFullFlow, setRunFullFlow] = useState(false);
  const [overrideTier, setOverrideTier] = useState(false);

  // Auto-update complexity + tier when task text changes
  useEffect(() => {
    if (!task) return;
    const c = estimateComplexity(task);
    setComplexity(c);
    if (!overrideTier) setTier(selectTierByComplexity(c));
  }, [task, overrideTier]);

  // When crew selection changes externally, update local handle
  useEffect(() => {
    if (selectedCrew.length > 0) setCrewHandle(selectedCrew[0]);
  }, [selectedCrew]);

  const agent: CrewAgent | undefined = CREW[crewHandle];
  const model = MODEL_ID_MAP[tier];
  const costLabel = MODEL_COST_LABEL[tier];

  const tiers: ModelTier[] = ['HAIKU', 'GPT_4O', 'GEMINI_1_5_PRO', 'SONNET', 'OPUS'];

  function handleExecute() {
    if (!task.trim()) return;
    onExecute({ task, project, crewHandle, model, tier, complexity, runFullFlow });
  }

  return (
    <div className="space-y-5">
      {/* Task input */}
      <div>
        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
          Task / Objective
        </label>
        <textarea
          value={task}
          onChange={e => setTask(e.target.value)}
          rows={4}
          placeholder="Describe what you want the crew to accomplish...
e.g. Scaffold a new DDD domain for subscription billing with Stripe integration"
          className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-crew-green/40 resize-none leading-relaxed font-mono"
        />
      </div>

      {/* Project + complexity row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
            Project
          </label>
          <input
            value={project}
            onChange={e => setProject(e.target.value)}
            placeholder="project-name"
            className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-crew-green/40 font-mono"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
            Complexity
          </label>
          <div className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono">
            <span className="text-white">{COMPLEXITY_LABEL(complexity)}</span>
            <span className="text-gray-600 ml-2">{(complexity * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>

      {/* Model tier selection */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            Model Tier
          </label>
          <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
            <input
              type="checkbox"
              checked={overrideTier}
              onChange={e => setOverrideTier(e.target.checked)}
              className="rounded"
            />
            Manual override
          </label>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {tiers.map(t => {
            const costLbl = MODEL_COST_LABEL[t];
            const modelId = MODEL_ID_MAP[t].split('/').pop();
            const isActive = tier === t;
            return (
              <button
                key={t}
                onClick={() => { setOverrideTier(true); setTier(t); }}
                disabled={!overrideTier && tier !== t}
                className={[
                  'flex flex-col items-center p-2 rounded-lg border text-center transition-all',
                  isActive
                    ? 'border-crew-green/60 bg-crew-green/5 text-crew-green'
                    : 'border-white/10 bg-black/20 text-gray-500 hover:border-white/20',
                  !overrideTier && !isActive ? 'opacity-40 cursor-default' : 'cursor-pointer',
                ].join(' ')}
              >
                <span className="text-[10px] font-bold">{t}</span>
                <span className="text-[9px] mt-0.5 font-mono truncate w-full">{modelId}</span>
                <span className="text-[9px] text-yellow-500/70 mt-0.5">{costLbl}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-gray-600 font-mono">
          Selected: <span className="text-gray-400">{model}</span>
          {!overrideTier && <span className="text-gray-600 ml-2">(auto-selected from task complexity)</span>}
        </p>
      </div>

      {/* Agent selector for this task */}
      <div>
        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
          Primary Agent
        </label>
        <div className="grid grid-cols-5 gap-2">
          {(selectedCrew.length > 0 ? selectedCrew : Object.keys(CREW)).slice(0, 10).map(handle => {
            const a = CREW[handle];
            if (!a) return null;
            return (
              <button
                key={handle}
                onClick={() => setCrewHandle(handle)}
                className={[
                  'flex flex-col items-center py-2 px-1 rounded-lg border text-center transition-all',
                  crewHandle === handle
                    ? 'border-crew-green/60 bg-crew-green/5'
                    : 'border-white/10 bg-black/20 hover:border-white/20',
                ].join(' ')}
              >
                <span className="text-lg">{a.emoji}</span>
                <span className="text-[9px] text-gray-400 mt-1 font-semibold leading-tight">
                  {a.displayName.split(' ').pop()}
                </span>
              </button>
            );
          })}
        </div>
        {agent && (
          <p className="mt-2 text-[11px] text-gray-600">
            <span className="text-gray-400">{agent.emoji} {agent.displayName}</span>
            {' — '}
            <span>{agent.role.split('—')[0].trim()}</span>
          </p>
        )}
      </div>

      {/* Full mission flow toggle */}
      <div className="flex items-start gap-3 p-3 rounded-lg border border-white/5 bg-black/20">
        <input
          type="checkbox"
          id="fullflow"
          checked={runFullFlow}
          onChange={e => setRunFullFlow(e.target.checked)}
          className="mt-0.5"
        />
        <label htmlFor="fullflow" className="cursor-pointer">
          <div className="text-sm text-white font-semibold">Run Full Mission Flow</div>
          <div className="text-xs text-gray-500 mt-0.5">
            Picard → Troi → Data → Crusher → Quark → Worf → Riker → Uhura
            ({MISSION_FLOW.length} agents, cost-optimized per step)
          </div>
        </label>
      </div>

      {/* Execute button */}
      <button
        onClick={handleExecute}
        disabled={!task.trim() || isLoading}
        className={[
          'w-full py-3 rounded-xl font-bold text-sm tracking-widest uppercase transition-all',
          task.trim() && !isLoading
            ? 'bg-crew-green/20 border border-crew-green/50 text-crew-green hover:bg-crew-green/30 shadow-[0_0_16px_rgba(0,255,170,0.15)]'
            : 'bg-white/5 border border-white/10 text-gray-600 cursor-not-allowed',
        ].join(' ')}
      >
        {isLoading ? '⏳ Executing...' : `▶ Execute — ${agent?.emoji ?? ''} ${agent?.displayName ?? crewHandle}`}
      </button>
    </div>
  );
}
