'use client';

import React from 'react';
import { X } from 'lucide-react';

interface DocModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children?: React.ReactNode;
}

/**
 * DocModal: A tactical overlay for displaying architectural documentation 
 * and mission logs. Styled for the Sovereign Factory.
 */
export const DocModal: React.FC<DocModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-4xl max-h-[90vh] bg-[#0d1022] border-2 border-[#00ffaa]/30 rounded-lg shadow-[0_0_50px_-12px_rgba(0,255,170,0.25)] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#00ffaa]/10 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-[#00ffaa] animate-pulse" />
            <h3 className="text-[#00ffaa] font-bold uppercase tracking-widest text-sm">
              Tactical Documentation // {title}
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1 hover:bg-white/10 rounded"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 text-slate-300 font-mono text-sm leading-relaxed">
          {children}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#00ffaa]/10 bg-black/20 text-right">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-[#00ffaa] text-black font-black uppercase text-xs hover:bg-white transition-all tracking-tighter"
          >
            Close Terminal
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocModal;