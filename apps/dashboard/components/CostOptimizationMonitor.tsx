'use client';

import React from 'react';

interface CostOptimizationMonitorProps {
  estimates: Partial<Record<string, number>>;
  tier: string;
}

export const CostOptimizationMonitor: React.FC<CostOptimizationMonitorProps> = ({ estimates, tier }) => {
  return (
    <div className="p-4 border-t-2 border-black bg-zinc-50 text-xs font-black uppercase tracking-widest">
      <span className="text-red-600">00 / Cost Optimization Monitor</span>
      <div className="mt-2 flex flex-wrap gap-3">
        {Object.entries(estimates).map(([t, cost]) => (
          <span key={t} className={`px-2 py-1 border ${tier === t ? 'border-[#00ffaa] text-[#00ffaa]' : 'border-zinc-200 text-zinc-400'}`}>
            {t}: ${cost?.toFixed(4) ?? 'N/A'}
          </span>
        ))}
      </div>
    </div>
  );
};
