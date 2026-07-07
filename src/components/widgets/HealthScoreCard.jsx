import React from 'react';
import { useHealthScore } from '../../hooks/useHealthScore';

export const HealthScoreCard = () => {
  const { healthScore, verifiedCompliancePct, coveragePct, totalSeverity, loading } = useHealthScore();

  return (
    <div className="bg-white border border-outline-variant rounded-2xl p-8 shadow-md flex flex-col items-center justify-center text-center relative overflow-hidden h-full">
      {/* Subtle premium background gradient decorative element */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
      
      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="w-24 h-24 bg-outline-variant rounded-full mx-auto" />
          <div className="h-4 bg-outline-variant rounded w-32 mx-auto" />
        </div>
      ) : (
        <>
          <span className="text-xs font-bold uppercase tracking-widest text-secondary mb-4 block">
            Facility Health Score
          </span>
          
          <div className="relative w-48 h-48 flex items-center justify-center mb-6">
            {/* Outer circle decoration */}
            <div className="absolute inset-0 rounded-full border-[8px] border-primary/10" />
            
            {/* Styled dynamic indicator */}
            <svg className="absolute w-full h-full -rotate-90">
              <circle
                cx="96"
                cy="96"
                r="88"
                className="stroke-primary fill-none"
                strokeWidth="8"
                strokeDasharray={2 * Math.PI * 88}
                strokeDashoffset={2 * Math.PI * 88 * (1 - healthScore / 100)}
                strokeLinecap="round"
              />
            </svg>
            
            <div className="text-center z-10">
              <strong className="text-5xl font-black font-mono text-primary leading-none">
                {healthScore}
              </strong>
              <span className="text-[11px] font-bold text-secondary block mt-1">out of 100</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6 w-full max-w-sm pt-6 border-t border-outline-variant/60 text-xs">
            <div className="border-r border-outline-variant/30 pr-2">
              <span className="text-secondary block font-semibold text-[10px] uppercase">Compliance</span>
              <strong className="text-on-surface text-base font-bold font-mono mt-0.5 block">{verifiedCompliancePct}%</strong>
            </div>
            <div className="border-r border-outline-variant/30 pr-2">
              <span className="text-secondary block font-semibold text-[10px] uppercase">Coverage</span>
              <strong className="text-on-surface text-base font-bold font-mono mt-0.5 block">{coveragePct}%</strong>
            </div>
            <div>
              <span className="text-secondary block font-semibold text-[10px] uppercase">Active ESI</span>
              <strong className="text-error text-base font-bold font-mono mt-0.5 block">{totalSeverity}</strong>
            </div>
          </div>

          <div className="text-[9px] text-on-surface-variant mt-6 italic flex items-center justify-center gap-1 bg-primary/5 px-3 py-1.5 rounded-full border border-primary/10">
            <span className="material-symbols-outlined text-[12px] text-primary">info</span>
            <span>Weights: 40% QA Compliance, 30% Online Coverage, 30% Severity Clearance</span>
          </div>
        </>
      )}
    </div>
  );
};

export default HealthScoreCard;
