'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ObservationLounge() {
  const [observations, setObservations] = useState<any[]>([]);

  useEffect(() => {
    const fetchObservations = async () => {
      const { data } = await supabase
        .from('observations')
        .select('*')
        .order('timestamp', { ascending: false });
      if (data) setObservations(data);
    };

    fetchObservations();

    const channel = supabase
      .channel('realtime_observations')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'observations' }, (payload) => {
        setObservations((prev) => [payload.new, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="p-8 font-mono bg-black text-green-400 min-h-screen">
      <h1 className="text-2xl font-bold mb-6 border-b border-green-800 pb-2 flex items-center gap-2">
        🖖 Observation Lounge | Sovereign Factory
      </h1>
      <div className="space-y-4">
        {observations.length === 0 && <p className="animate-pulse">Waiting for crew frequencies...</p>}
        {observations.map((obs) => (
          <div key={obs.id} className="border border-green-900 p-4 rounded bg-gray-900 shadow-lg transition-all hover:border-green-400">
            <div className="flex justify-between text-[10px] text-green-600 mb-2 uppercase tracking-widest">
              <span className="font-bold">{obs.crew_member}</span>
              <span className="opacity-70">{obs.role}</span>
              <span>{new Date(obs.timestamp).toLocaleTimeString()}</span>
            </div>
            <h2 className="text-lg font-semibold text-white">{obs.title}</h2>
            <p className="text-sm mt-1 text-gray-400 italic">"{obs.summary}"</p>
            {obs.key_findings && (
              <ul className="mt-3 space-y-1">
                {obs.key_findings.map((f: string, i: number) => (
                  <li key={i} className="text-xs text-green-500 flex gap-2">
                    <span className="text-green-800">▶</span> {f}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}