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
    <div className="border-2 border-black bg-white">
      {/* Filter Header */}
      <div className="grid grid-cols-12 border-b-2 border-black">
        <div className="col-span-12 md:col-span-8 border-b-2 md:border-b-0 md:border-r-2 border-black">
          <input
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="SEARCH CREW BY ROLE / CAPABILITY..."
            className="w-full p-6 text-2xl font-black uppercase tracking-tighter text-black placeholder-zinc-200 focus:outline-none"
          />
        </div>
        <div className="col-span-12 md:col-span-4 flex divide-x-2 divide-black">
          <button
            onClick={() => autoSelect(filter)}
            className="flex-1 p-4 font-black uppercase tracking-[0.2em] text-[10px] hover:bg-black hover:text-white transition-all"
          >
            Auto-Select
          </button>
          {selected.length > 0 && (
            <button
              onClick={() => onChange([])}
              className="flex-1 p-4 font-black uppercase tracking-[0.2em] text-[10px] bg-black text-white hover:bg-red-600 transition-all"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Selection Status */}
      {selected.length > 0 && (
        <div className="bg-zinc-50 border-b-2 border-black p-4">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-red-600 mb-1">
            00 / Deployment Status
          </div>
          <div className="text-xs font-bold uppercase tracking-tight text-black">
            {selected.length} Agents active: {selected.map(h => CREW[h]?.displayName).join(' + ')}
          </div>
        </div>
      )}

      {/* Agent Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 border-b-0">
        {filtered.map(agent => (
          <button
            key={agent.handle}
            onClick={() => toggle(agent.handle)}
            className={[
              'group relative flex flex-col p-8 text-left border-r-2 border-b-2 border-black transition-all',
              selected.includes(agent.handle)
                ? 'bg-red-600 text-white border-red-600 z-10'
                : 'bg-white text-black hover:bg-zinc-50'
            ].join(' ')}
          >
            <div className="flex justify-between items-start mb-8">
              <span className="text-5xl">{agent.emoji}</span>
              <div className="text-right">
                <span className={['text-[9px] font-black uppercase tracking-[0.2em]', selected.includes(agent.handle) ? 'text-white/70' : 'text-red-500'].join(' ')}>
                  01 / TIER
                </span>
                <div className="text-sm font-black uppercase tracking-tighter">{agent.preferredTier}</div>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-3xl font-black uppercase tracking-tighter leading-none mb-2">
                {agent.displayName}
              </h3>
              <div className={['text-[10px] font-bold uppercase tracking-widest', selected.includes(agent.handle) ? 'text-white' : 'text-zinc-400'].join(' ')}>
                {agent.dddRole}
              </div>
            </div>

            <p className={['text-xs font-medium leading-tight mb-8 line-clamp-3', selected.includes(agent.handle) ? 'text-white/90' : 'text-zinc-600'].join(' ')}>
              {agent.role}
            </p>

            <div className="mt-auto pt-8 border-t border-current opacity-30">
              <div className="text-[9px] font-black uppercase tracking-[0.2em] mb-4">
                02 / Capabilities
              </div>
              <div className="flex flex-wrap gap-2">
                {agent.capabilities.map(cap => (
                  <span
                    key={cap}
                    className="text-[9px] font-black uppercase tracking-widest border border-current px-2 py-1"
                  >
                    {cap}
                  </span>
                ))}
              </div>
            </div>

            {selected.includes(agent.handle) && (
              <div className="absolute top-4 left-4 bg-white text-red-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest">
                Selected
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
