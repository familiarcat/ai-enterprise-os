'use client';

import React, { useState, useEffect } from 'react';
import { CREW } from '@/lib/crew-manifest';

interface CrewObservation {
  crew_member: string;
  title: string;
  summary: string;
  key_findings: string[];
  recommendations: string[];
  score: number;
  timestamp: string;
  metadata?: any;
}

/**
 * CrewMemoryBrowser — Sovereign Factory
 * Filterable explorer for historical mission observations.
 */
export const CrewMemoryBrowser: React.FC = () => {
  const [observations, setObservations] = useState<CrewObservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [selectedCrew, setSelectedCrew] = useState('all');

  useEffect(() => {
    const fetchMemories = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/lounge/observations');
        if (res.ok) {
          const data = await res.json();
          setObservations(data.observations || []);
        }
      } catch (e) {
        console.error('Failed to fetch memories:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchMemories();
  }, []);

  const filtered = observations.filter(obs => {
    const matchesSearch = (obs.title?.toLowerCase() || '').includes(filter.toLowerCase()) || 
                          (obs.summary?.toLowerCase() || '').includes(filter.toLowerCase());
    const matchesCrew = selectedCrew === 'all' || obs.crew_member.toLowerCase().includes(selectedCrew.toLowerCase());
    return matchesSearch && matchesCrew;
  });

  return (
    <div className="bg-white border-2 border-black font-sans">
      {/* Filter Header */}
      <div className="grid grid-cols-12 border-b-2 border-black bg-zinc-50">
        <div className="col-span-8 p-4 border-r-2 border-black">
          <label className="block text-xs font-black text-red-600 uppercase tracking-[0.2em] mb-1">Search Memories</label>
          <input 
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="FILTER BY MISSION OR FINDING..."
            className="w-full bg-transparent text-xl font-black uppercase tracking-tighter focus:outline-none placeholder-zinc-300"
          />
        </div>
        <div className="col-span-4 p-4">
          <label className="block text-xs font-black text-red-600 uppercase tracking-[0.2em] mb-1">Crew Member</label>
          <select 
            value={selectedCrew}
            onChange={e => setSelectedCrew(e.target.value)}
            className="w-full bg-transparent text-sm font-black uppercase tracking-tighter focus:outline-none appearance-none cursor-pointer"
          >
            <option value="all">ALL DEPARTMENTS</option>
            {Object.values(CREW).map(c => (
              <option key={c.handle} value={c.displayName}>{c.displayName}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Results List */}
      <div className="divide-y-2 divide-black max-h-[600px] overflow-y-auto">
        {loading ? (
          <div className="p-20 text-center animate-pulse text-xs font-black uppercase tracking-[0.3em]">Retrieving Positronic Logs...</div>
        ) : filtered.length === 0 ? (
          <div className="p-20 text-center text-zinc-300 text-xs font-black uppercase tracking-[0.3em]">No Historical Data Found</div>
        ) : (
          filtered.map((obs, i) => (
            <div key={i} className="p-8 hover:bg-zinc-50 transition-colors">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-1">
                    {new Date(obs.timestamp).toLocaleString()} — SCORE: {obs.score}/10
                  </div>
                  <h3 className="text-3xl font-black uppercase tracking-tighter leading-none">{obs.title}</h3>
                  <div className="text-xs font-bold text-red-600 uppercase mt-1">Logged by: {obs.crew_member}</div>
                </div>
                <div className="text-4xl grayscale opacity-20">📜</div>
              </div>

              <p className="text-lg font-medium leading-tight mb-6">{obs.summary}</p>
              
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <span className="text-xs font-black uppercase tracking-widest text-zinc-400 block mb-2">Findings</span>
                  <ul className="text-xs font-bold uppercase space-y-1">
                    {obs.key_findings.map((f, j) => <li key={j} className="flex gap-2"><span className="text-red-600">▪</span> {f}</li>)}
                  </ul>
                </div>
                <div>
                  <span className="text-xs font-black uppercase tracking-widest text-zinc-400 block mb-2">Recommendations</span>
                  <ul className="text-xs font-bold uppercase space-y-1">
                    {obs.recommendations.map((r, j) => <li key={j} className="flex gap-2"><span className="text-black">▪</span> {r}</li>)}
                  </ul>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};