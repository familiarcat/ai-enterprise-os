import React from 'react';
import { Shield, ShieldAlert, ShieldCheck } from 'lucide-react';

interface TrustScoreBadgeProps {
  score: number;
}

export const TrustScoreBadge: React.FC<TrustScoreBadgeProps> = ({ score }) => {
  const getColorClass = () => {
    if (score >= 90) return 'text-green-500 bg-green-500/10 border-green-500/20';
    if (score >= 75) return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
    if (score >= 50) return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
    return 'text-red-500 bg-red-500/10 border-red-500/20';
  };

  const getIcon = () => {
    if (score >= 90) return <ShieldCheck className="w-4 h-4 mr-1" />;
    if (score >= 75) return <Shield className="w-4 h-4 mr-1" />;
    return <ShieldAlert className="w-4 h-4 mr-1" />;
  };

  const getLabel = () => {
    if (score >= 90) return 'Honorable';
    if (score >= 75) return 'Verified';
    if (score >= 50) return 'Caution';
    return 'Dishonorable';
  };

  return (
    <div className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-medium ${getColorClass()}`}>
      {getIcon()}
      <span>{getLabel()} ({score}%)</span>
    </div>
  );
};