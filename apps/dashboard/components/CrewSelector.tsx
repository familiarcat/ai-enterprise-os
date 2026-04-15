'use client';

/**
 * CrewSelector — Step 1: MCP Brain
 *
 * Lets the user pick one or more crew members (Star Trek personas).
 * Shows each agent's role, DDD function, preferred model tier, and capabilities.
 * Adapted from openrouter-crew-platform CrewCoordinationPanel + CrewAvatarCard.
 */

import React, { useState } from 'react';
import { CREW, MODEL_ID_MAP, type CrewAgent } from '@/lib/crew-manifest';

interface CrewSelectorProps {
  selected:   string[];
  onChange:   (handles: string[]) => void;
  singleSelect?: boolean;
}

const CAPABILITY_COLORS: Record<string, string> = {
  'planning':           'bg-purple-500/20 text-purple-300 border-purple-500/30',
  'coordination':       'bg-blue-500/20  text-blue-300  border-blue-500/30',
  'data-analysis':      'bg-cyan-500/20  text-cyan-300  border-cyan-500/30',
  'infrastructure':     'bg-orange-500/20 text-orange-300 border-orange-500/30',
  'security':           'bg-red-500/20   text-red-300   border-red-500/30',
  'content-generation': 'bg-pink-500/20  text-pink-300  border-pink-500/30',
  'cost-optimization':  'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  'business-logic':     'bg-green-500/20 text-green-300  border-green-500/30',
  'devops':             'bg-slate-500/20  text-slate-300  border-slate-500/30',
  'communications':     'bg-teal-500/20  text-teal-300   border-teal-500/30',
};

const TIER_BADGE: Record<string, { label: string; cls: string }> = {
  OPUS:           { label: 'OPUS',    cls: 'bg-purple-600/30 text-purple-200 border-purple-500/40' },
  SONNET:         { label: 'SONNET',  cls: 'bg-blue-600/30   text-blue-200   border-blue-500/40' },
  HAIKU:          { label: 'HAIKU',   cls: 'bg-gray-600/30   text-gray-300   border-gray-500/40' },
  GPT_4O:         { label: 'GPT-4o',  cls: 'bg-green-600/30  text-green-200  border-green-500/40' },
  GEMINI_1_5_PRO: { label: 'Gemini',  cls: 'bg-teal-600/30   text-teal-200   border-teal-500/40' },
};

function AgentCard({ agent, isSelected, onToggle }: {
  agent: CrewAgent;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const tier = TIER_BADGE[agent.preferredTier] ?? { label: agent.preferredTier, cls: 'bg-gray-600/30 text-gray-300 border-gray-500/40' };
  const model = MODEL_ID_MAP[agent.preferredTier];

  return (
    <button
      onClick={onToggle}
      className={[
        'w-full text-left p-4 rounded-xl border transition-all duration-200',
        'hover:border-crew-green/40 hover:bg-white/5',
        isSelected
          ? 'border-crew-green/60 bg-crew-green/5 shadow-[0_0_12px_rgba(0,255,170,0.1)]'
          : 'border-white/10 bg-black/20',
      ].join(' ')}
    >
      {/* Top row: emoji + name + tier badge */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{agent.emoji}</span>
          <div>
            <div className="font-semibold text-white text-sm">{agent.displayName}</div>
            <div className="text-[11px] text-gray-500 font-mono">{agent.handle}</div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${tier.cls}`}>
            {tier.label}
          </span>
          {isSelected && (
            <span className="text-[10px] text-crew-green font-bold">✓ SELECTED</span>
          )}
        </div>
      </div>

      {/* Role */}
      <p className="text-xs text-gray-400 leading-relaxed mb-3 line-clamp-2">
        {agent.role}
      </p>

      {/* Model */}
      <div className="text-[10px] text-gray-600 font-mono mb-2 truncate">
        {model}
      </div>

      {/* Capabilities */}
      <div className="flex flex-wrap gap-1">
        {agent.capabilities.map(cap => (
          <span
            key={cap}
            className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wide ${CAPABILITY_COLORS[cap] ?? 'bg-gray-500/20 text-gray-300 border-gray-500/30'}`}
          >
            {cap}
          </span>
        ))}
      </div>
    </button>
  );
}

export default function CrewSelector({ selected, onChange, singleSelect = false }: CrewSelectorProps) {
  const [filter, setFilter] = useState('');
  const crew = Object.values(CREW);

  const filtered = filter
    ? crew.filter(a =>
        a.displayName.toLowerCase().includes(filter.toLowerCase()) ||
        a.capabilities.some(c => c.includes(filter.toLowerCase())) ||
        a.role.toLowerCase().includes(filter.toLowerCase())
      )
    : crew;

  function toggle(handle: string) {
    if (singleSelect) {
      onChange(selected.includes(handle) ? [] : [handle]);
    } else {
      onChange(
        selected.includes(handle)
          ? selected.filter(h => h !== handle)
          : [...selected, handle]
      );
    }
  }

  function autoSelect(query: string) {
    const q = query.toLowerCase();
    const auto = crew
      .filter(a =>
        a.capabilities.some(c => q.includes(c) || c.includes(q)) ||
        q.includes(a.dddRole.toLowerCase())
      )
      .map(a => a.handle);
    onChange(auto.length ? auto : [crew[0].handle]);
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Filter by name, role, or capability..."
          className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-crew-green/40"
        />
        <button
          onClick={() => autoSelect(filter)}
          className="px-3 py-2 text-xs font-bold rounded-lg border border-crew-green/30 text-crew-green hover:bg-crew-green/10 transition-colors"
        >
          AUTO-SELECT
        </button>
        {selected.length > 0 && (
          <button
            onClick={() => onChange([])}
            className="px-3 py-2 text-xs font-bold rounded-lg border border-white/10 text-gray-400 hover:bg-white/5 transition-colors"
          >
            CLEAR
          </button>
        )}
      </div>

      {selected.length > 0 && (
        <div className="mb-3 text-xs text-crew-green font-mono">
          {selected.length} crew member{selected.length !== 1 ? 's' : ''} selected:{' '}
          {selected.map(h => CREW[h]?.emoji + ' ' + CREW[h]?.displayName).join(', ')}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {filtered.map(agent => (
          <AgentCard
            key={agent.handle}
            agent={agent}
            isSelected={selected.includes(agent.handle)}
            onToggle={() => toggle(agent.handle)}
          />
        ))}
      </div>
    </div>
  );
}
