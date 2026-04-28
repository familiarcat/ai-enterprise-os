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
import { BridgeStatusBar } from './BridgeStatusBar';

interface TaskLLMPanelProps {
  selectedCrew:     string[];
  onExecute:        (config: ExecutionConfig) => void;
  isLoading?:       boolean;
  externalProject?: string;
  onProjectChange?: (val: string) => void;
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

export default function TaskLLMPanel({ selectedCrew, onExecute, isLoading, externalProject, onProjectChange }: TaskLLMPanelProps) {
  const [task,       setTask]       = useState('');
  const [complexity, setComplexity] = useState(0.3);
  const [tier,       setTier]       = useState<ModelTier>('SONNET');
  const [crewHandle, setCrewHandle] = useState(selectedCrew[0] ?? 'captain_picard');
  const [runFullFlow, setRunFullFlow] = useState(false);
  const [overrideTier, setOverrideTier] = useState(false);
  const [estimates, setEstimates] = useState<Partial<Record<ModelTier, number>>>({});
  const [costThreshold, setCostThreshold] = useState<number>(0.05);

  const project = externalProject ?? 'enterprise-os';

  // ModelCostCalculator Logic
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!task) return;
      
      const estimatedTokens = Math.ceil(task.length / 4) + 2000; // Task + Base context/history overhead
      const rates: Partial<Record<ModelTier, number>> = {
        HAIKU: 0.25,          // $0.25 / 1M tokens
        GPT_4O: 5.00,         // $5.00 / 1M tokens
        GEMINI_1_5_PRO: 3.50, // $3.50 / 1M tokens
        SONNET: 3.00,         // $3.00 / 1M tokens
        OPUS: 15.00,          // $15.00 / 1M tokens
      };

      const newEstimates = (Object.keys(rates) as ModelTier[]).reduce((acc, t) => {
        acc[t] = (estimatedTokens / 1_000_000) * (rates[t] ?? 0);
        return acc;
      }, {} as Partial<Record<ModelTier, number>>);

      setEstimates(newEstimates);
    }, 400);
    return () => clearTimeout(timer);
  }, [task]);

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
    const est = estimates[tier] || 0;
    if (est > costThreshold) {
      alert(`[COST CIRCUIT BREAKER] Mission aborted. Estimated cost ($${est.toFixed(4)}) exceeds threshold ($${costThreshold.toFixed(4)}).`);
      return;
    }
    onExecute({ task, project: project, crewHandle, model, tier, complexity, runFullFlow });
  }

  return (
    <div className="space-y-0 border-2 border-black bg-white">
      {/* Telemetry Header */}
      <BridgeStatusBar />

      {/* Task input */}
      <div className="border-b-2 border-black">
        <label className="block text-xs font-black text-red-600 uppercase tracking-[0.2em] p-4 pb-0">
          01 / Task Objective
        </label>
        <textarea
          value={task}
          onChange={e => setTask(e.target.value)}
          rows={4}
          placeholder="DESCRIBE MISSION OBJECTIVE..."
          className="w-full bg-white px-4 py-4 text-2xl font-black uppercase tracking-tighter text-black placeholder-zinc-200 focus:outline-none resize-none leading-none"
        />
      </div>

      {/* Project + complexity row */}
      <div className="grid grid-cols-12 border-b-2 border-black divide-x-2 divide-black">
        <div className="col-span-6 p-4">
          <label className="block text-xs font-black text-red-600 uppercase tracking-[0.2em] mb-2">
            02 / Project Reference
          </label>
          <input
            value={project}
            onChange={e => onProjectChange?.(e.target.value)}
            placeholder="project-name"
            className="w-full bg-white text-xl font-black uppercase tracking-tighter text-black focus:outline-none"
          />
        </div>
        <div className="col-span-3 p-4">
          <label className="block text-xs font-black text-red-600 uppercase tracking-[0.2em] mb-2">
            02b / Safety Cap ($)
          </label>
          <input
            type="number"
            step="0.01"
            value={costThreshold}
            onChange={e => setCostThreshold(parseFloat(e.target.value) || 0)}
            className="w-full bg-white text-xl font-black uppercase tracking-tighter text-red-600 focus:outline-none"
          />
        </div>
        <div className="col-span-3 p-4 flex flex-col justify-center">
          <label className="block text-xs font-black text-red-600 uppercase tracking-[0.2em] mb-1">
            03 / Complexity
          </label>
          <div className="text-lg font-black uppercase tracking-tighter">
            {COMPLEXITY_LABEL(complexity)}
          </div>
        </div>
      </div>

      {/* Model tier selection */}
      <div className="border-b-2 border-black">
        <div className="flex items-center justify-between p-4 border-b-2 border-black">
          <label className="text-xs font-black text-red-600 uppercase tracking-[0.2em]">
            04 / Model Architecture
          </label>
          <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest cursor-pointer">
            {task && (
              <div className="mr-4 flex gap-3 items-center">
                {(['HAIKU', 'SONNET', 'OPUS'] as const).map(t => (
                  <span 
                    key={t} 
                    className={`px-1.5 py-0.5 border ${tier === t ? 'border-[#00ffaa] text-[#00ffaa]' : 'border-zinc-200 text-zinc-400'}`}
                  > 
                    {t}: ${(estimates[t] ?? 0).toFixed(4)}
                  </span>
                ))}
              </div>
            )}
            <input
              type="checkbox"
              checked={overrideTier}
              onChange={e => setOverrideTier(e.target.checked)}
              className="rounded-none border-2 border-black accent-black"
            />
            Override
          </label>
        </div>
        <div className="grid grid-cols-5 divide-x-2 divide-black">
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
                  'flex flex-col items-center p-4 text-center transition-all',
                  isActive
                    ? 'bg-black text-white'
                    : 'bg-white text-black hover:bg-zinc-50',
                  !overrideTier && !isActive ? 'opacity-10 cursor-default' : 'cursor-pointer',
                ].join(' ')}
              >
                <span className="text-xs font-black uppercase tracking-[0.2em]">{t}</span>
                <span className="text-xs mt-1 font-bold truncate w-full opacity-60 uppercase">{modelId}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Agent selector */}
      <div className="border-b-2 border-black">
        <div className="p-4 border-b-2 border-black">
          <label className="text-xs font-black text-red-600 uppercase tracking-[0.2em]">
            05 / Deployment Handle
          </label>
        </div>
        <div className="grid grid-cols-5 divide-x-2 divide-black border-b-2 border-black bg-zinc-50">
          {(selectedCrew.length > 0 ? selectedCrew : Object.keys(CREW)).slice(0, 10).map(handle => {
            const a = CREW[handle];
            if (!a) return null;
            return (
              <button
                key={handle}
                onClick={() => setCrewHandle(handle)}
                className={[
                  'flex flex-col items-center py-4 text-center transition-all',
                  crewHandle === handle
                    ? 'bg-red-600 text-white'
                    : 'bg-transparent text-zinc-400 hover:text-black',
                ].join(' ')}
              >
                <span className="text-2xl">{a.emoji}</span>
                <span className="text-xs font-black uppercase tracking-widest mt-1">
                  {a.displayName.split(' ').pop()}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Full mission flow toggle */}
      <div className="p-6 bg-black text-white flex items-center justify-between">
        <div className="flex items-center gap-4">
          <input
            type="checkbox"
            id="fullflow"
            checked={runFullFlow}
            onChange={e => setRunFullFlow(e.target.checked)}
            className="w-6 h-6 rounded-none border-2 border-white bg-transparent accent-red-600"
          />
          <label htmlFor="fullflow" className="cursor-pointer">
            <div className="text-xl font-black uppercase tracking-tighter">Canonical Mission Flow</div>
              <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-1">
              Sequential Multi-Agent Execution (8 Stages)
            </div>
          </label>
        </div>
        <button
          onClick={handleExecute}
          disabled={!task.trim() || isLoading}
          className={[
            'px-12 py-4 font-black uppercase tracking-[0.2em] text-sm transition-all border-2',
            task.trim() && !isLoading
              ? 'bg-red-600 border-red-600 text-white hover:bg-white hover:text-black'
              : 'bg-zinc-800 border-zinc-800 text-zinc-500 cursor-not-allowed',
          ].join(' ')}
        >
          {isLoading ? 'EXECUTING...' : 'INITIATE MISSION'}
        </button>
      </div>
    </div>
  );
}
