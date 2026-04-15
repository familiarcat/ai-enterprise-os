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

  const percentage = model.usagePercentage;
  const safePercentage = Math.min(Math.max(percentage, 0), 100);

  return (
    <div className="bg-white text-black p-0 font-sans selection:bg-red-500 selection:text-white">
      {/* Header Grid Section */}
      <div className="grid grid-cols-12 border-b-2 border-black">
        <div className="col-span-12 md:col-span-8 p-8 border-r-0 md:border-r-2 border-black">
          <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter leading-none">
            Billing <br /> & Tokens
          </h1>
        </div>
        <div className="col-span-12 md:col-span-4 p-8 flex flex-col justify-end">
          <p className="text-sm font-bold uppercase tracking-widest">Project ID</p>
          <p className="text-xl font-medium break-all">{model.projectId}</p>
        </div>
      </div>

      {/* Data Visualization Grid */}
      <div className="grid grid-cols-12 min-h-[300px]">
        <div className="col-span-12 md:col-span-4 p-8 border-b-2 md:border-b-0 md:border-r-2 border-black">
          <p className="text-xs font-bold uppercase mb-12">01 / Consumption</p>
          <div className="text-9xl font-black leading-none italic">
            {Math.round(safePercentage)}%
          </div>
        </div>
        
        <div className="col-span-12 md:col-span-8 p-8 flex flex-col justify-between bg-black text-white">
          <p className="text-xs font-bold uppercase text-red-500">02 / Quota Statistics</p>
          <div className="space-y-4">
            <div className="flex justify-between items-baseline border-b border-zinc-800 pb-2">
              <span className="uppercase text-sm font-bold">Total Tokens Processed</span>
              <span className="text-4xl font-light">{model.formatUsage()}</span>
            </div>
            <div className="w-full bg-zinc-800 h-12 rounded-none overflow-hidden">
              <div 
                className="bg-red-600 h-full transition-all duration-1000" 
                style={{ width: `${safePercentage}%` }} 
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};