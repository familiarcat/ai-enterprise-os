import React from 'react';
import { TokenUsage } from '../../../core/model';

interface BillingProps {
  usage?: Partial<TokenUsage> | null;
}

/**
 * Billing Component - Swiss Design (Müller-Brockmann)
 * Located in: apps/dashboard/src/components/Billing.tsx
 * Resolves: Prop naming mismatches and React environment integration.
 */
export const Billing = ({ usage }: BillingProps): JSX.Element => {
  // Instantiate the Domain Model to handle normalization and logic
  const model = new TokenUsage(usage || {});

  const percentage = model.usagePercentage || 0;
  const safePercentage = Math.min(Math.max(percentage, 0), 100);

  return (
    <div className="bg-zinc-50 text-black font-sans selection:bg-red-500 selection:text-white border-2 border-black px-6 py-3 flex items-center justify-between gap-8">
      {/* Compact Subheading Design */}
      <div className="flex items-center gap-4">
        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-red-600 whitespace-nowrap">
          00 / Billing & Tokens
        </h2>
        <div className="h-4 w-[1px] bg-black/20" />
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
          Project: <span className="text-black">{model.projectId}</span>
        </p>
      </div>

      <div className="flex-1 max-w-md flex items-center gap-4">
        <div className="flex-1 bg-zinc-200 h-2 rounded-none overflow-hidden relative">
          <div
            className="bg-red-600 h-full transition-all duration-1000"
            style={{ width: `${safePercentage}%` }}
          />
        </div>
        <span className="text-xs font-black italic">{Math.round(safePercentage)}%</span>
      </div>

      <div className="flex items-center gap-6">
        <div className="text-right">
          <span className="text-[10px] font-bold text-zinc-400 uppercase block leading-none">Processed</span>
          <span className="text-sm font-black uppercase tracking-tighter leading-none">{model.formatUsage?.() || '0'}</span>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-bold text-zinc-400 uppercase block leading-none">Quota</span>
          <span className="text-sm font-black uppercase tracking-tighter leading-none">{model.formatQuota?.() || 'N/A'}</span>
        </div>
      </div>
    </div>
  );
};