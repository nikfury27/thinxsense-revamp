import React from 'react';
import { useHealthScore } from '../../hooks/useHealthScore';

export const HealthScoreCard = ({ selectedRoom = 'all' }) => {
  const {
    healthScore,
    verifiedCompliancePct,
    rawCompliance,
    coveragePct,
    totalSeverity,
    severityClearance,
    loading
  } = useHealthScore(selectedRoom);

  // Math constants for SVG gauge
  const radius = 88;
  const circumference = 2 * Math.PI * radius;
  
  // Calculate precise SVG stroke dashoffset
  const scoreRatio = (healthScore || 100.0) / 100.0;
  const strokeDashoffset = circumference * (1.0 - scoreRatio);

  // Development Assertion Check
  if (process.env.NODE_ENV !== 'production' && !loading) {
    const renderedPercentage = (circumference - strokeDashoffset) / circumference;
    const expectedPercentage = scoreRatio;
    // Allow minor floating point difference under 0.001
    if (Math.abs(renderedPercentage - expectedPercentage) > 0.001) {
      throw new Error(
        `Gauge assertion failed: Rendered fill does not equal displayed score! rendered=${renderedPercentage.toFixed(4)}, expected=${expectedPercentage.toFixed(4)}`
      );
    }
  }

  return (
    <div className="bg-white border border-outline-variant rounded-2xl p-8 shadow-md flex flex-col items-center justify-center text-center relative overflow-hidden h-full">
      {/* Premium subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
      
      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="w-24 h-24 bg-outline-variant rounded-full mx-auto" />
          <div className="h-4 bg-outline-variant rounded w-32 mx-auto" />
        </div>
      ) : (
        <>
          <span className="text-xs font-bold uppercase tracking-widest text-secondary mb-4 block">
            {selectedRoom === 'all' ? 'Facility Health Index' : 'Room Health Index'}
          </span>
          
          <div className="relative w-48 h-48 flex items-center justify-center mb-6">
            {/* Outer circle decoration */}
            <div className="absolute inset-0 rounded-full border-[8px] border-primary/10" />
            
            {/* Precision SVG circle indicator */}
            <svg className="absolute w-full h-full -rotate-90">
              <circle
                cx="96"
                cy="96"
                r={radius}
                className="stroke-primary fill-none transition-all duration-500 ease-out"
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>
            
            <div className="text-center z-10">
              <strong className="text-5xl font-black font-mono text-primary leading-none">
                {healthScore.toFixed(1)}
              </strong>
              <span className="text-[11px] font-bold text-secondary block mt-1">out of 100</span>
            </div>
          </div>

          <div className="w-full max-w-sm space-y-4 pt-6 border-t border-outline-variant/60 text-xs">
            {/* Detailed breakdowns & math transparency */}
            <div className="flex justify-between items-center">
              <span className="text-secondary font-medium text-left">Verified Compliance</span>
              <div className="text-right">
                <strong className={`font-mono text-sm block ${
                  verifiedCompliancePct >= 95.0 ? 'text-status-success' : 'text-error'
                }`}>
                  {verifiedCompliancePct.toFixed(1)}%
                </strong>
                <span className="text-[10px] text-on-surface-variant block">
                  {rawCompliance.toFixed(1)}% raw × {coveragePct.toFixed(1)}% coverage
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center border-t border-outline-variant/30 pt-3">
              <span className="text-secondary font-medium text-left">Sensor Coverage</span>
              <strong className="text-on-surface font-mono text-sm">
                {coveragePct.toFixed(1)}%
              </strong>
            </div>

            <div className="flex justify-between items-center border-t border-outline-variant/30 pt-3">
              <span className="text-secondary font-medium text-left">Severity Clearance</span>
              <div className="text-right">
                <strong className="text-on-surface font-mono text-sm block">
                  {severityClearance.toFixed(1)}%
                </strong>
                <span className="text-[10px] text-on-surface-variant block">
                  Active ESI Score: {totalSeverity.toFixed(1)}
                </span>
              </div>
            </div>
          </div>

          <div className="text-[9px] text-on-surface-variant mt-6 italic flex items-center justify-center gap-1 bg-primary/5 px-3 py-1.5 rounded-full border border-primary/10">
            <span className="material-symbols-outlined text-[12px] text-primary">info</span>
            <span>Weights: 40% Compliance, 30% Coverage, 30% Severity Clearance</span>
          </div>
        </>
      )}
    </div>
  );
};

export default HealthScoreCard;
