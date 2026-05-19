'use client';

import React, { useState } from 'react';

export type DashboardTab = 'live' | 'history' | 'fleet' | 'integrity';

interface BridgeSidebarProps {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
  currentProject?: string;
  currentObjective?: string;
  currentSprintStatus?: string;
  onGoToActiveTask?: () => void;
}

/**
 * BridgeSidebar — Sovereign Factory
 * Persistent navigation sidebar for global system access.
 */
export const BridgeSidebar: React.FC<BridgeSidebarProps> = ({ 
  activeTab, onTabChange, currentProject, currentObjective, currentSprintStatus, onGoToActiveTask
}) => {
  const [isSprintOpen, setIsSprintOpen] = useState(true);

  const menuItems: { id: DashboardTab; label: string; icon: string }[] = [
    { id: 'fleet', label: 'Project Fleet', icon: '🖖' },
    { id: 'live', label: 'Active Sprints', icon: '🛰️' },
    { id: 'history', label: 'Memory Bank', icon: '📜' },
    { id: 'integrity', label: 'Registry Health', icon: '🛡️' },
  ];

  return (
    <aside className="w-64 min-h-screen bg-black border-r-2 border-black flex flex-col sticky top-0">
      <div className="p-8 border-b-2 border-white/10">
        <div className="text-xs font-black text-red-600 uppercase tracking-[0.3em] mb-2">Registry / 00</div>
        <div className="text-2xl font-black text-white uppercase tracking-tighter leading-none">
          Sovereign <br /> Factory
        </div>
      </div>

      <nav className="flex-1 py-8">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`w-full p-6 flex items-center gap-4 border-l-4 transition-all uppercase text-sm font-black tracking-[0.2em] ${
              activeTab === item.id
                ? 'bg-white text-black border-[#00ffaa]'
                : 'text-zinc-500 border-transparent hover:text-white hover:bg-zinc-900'
            }`}
          >
            <span className="text-xl grayscale">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Active Sprint Summary - Accordion Style */}
      {currentProject && (
        <div className="border-t-2 border-white/10 px-6 py-4 bg-zinc-900/30">
          <button 
            onClick={() => {
              setIsSprintOpen(!isSprintOpen);
              onGoToActiveTask?.();
            }}
            className="w-full flex items-center justify-between group"
          >
            <span className="text-xs font-black text-red-600 uppercase tracking-[0.2em]">01 / Active Sprint</span>
            <span className={`text-white transition-transform duration-200 ${isSprintOpen ? 'rotate-180' : ''}`}>▾</span>
          </button>
          
          {isSprintOpen && (
            <div className="mt-4 space-y-3">
              <div>
                <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Project</div>
                <div className="text-sm font-black text-white uppercase truncate">{currentProject}</div>
              </div>
              <div>
                <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Status</div>
                <div className="text-sm font-black text-[#00ffaa] uppercase">{currentSprintStatus || 'Idle'}</div>
              </div>
              {currentObjective && (
                <div>
                  <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Objective</div>
                  <div className="text-xs font-medium text-zinc-300 line-clamp-3 leading-tight italic">
                    "{currentObjective}"
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="p-8 border-t-2 border-white/10 bg-zinc-900/50 mt-auto">
        <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Current Sector</div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-[#00ffaa] rounded-full animate-pulse" />
          <div className="text-xs text-white font-black uppercase">Main Deck</div>
        </div>
      </div>
    </aside>
  );
};