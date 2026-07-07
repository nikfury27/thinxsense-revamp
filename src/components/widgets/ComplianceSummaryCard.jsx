import React from 'react';
import { useVerifiedCompliance } from '../../hooks/useVerifiedCompliance';

export const ComplianceSummaryCard = () => {
  const { groupMetrics, loading } = useVerifiedCompliance();

  return (
    <div className="bg-white border border-outline-variant rounded-xl p-5 shadow-sm flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-sm text-primary flex items-center gap-2">
          <span className="material-symbols-outlined text-green-600 font-bold">verified</span>
          Group Compliance Summary
        </h3>
        <span className="text-[10px] text-secondary font-semibold font-mono">Formula: Coverage × Raw Compliance</span>
      </div>
      
      <div className="flex-1 space-y-4 overflow-y-auto max-h-[450px] pr-1">
        {loading ? (
          <div className="animate-pulse space-y-3 py-1">
            <div className="h-14 bg-outline-variant rounded w-full"></div>
            <div className="h-14 bg-outline-variant rounded w-full"></div>
          </div>
        ) : groupMetrics.length === 0 ? (
          <p className="text-xs text-on-surface-variant italic py-4">No active groups loaded.</p>
        ) : (
          groupMetrics.map(m => (
            <div key={m.groupName} className="p-4 bg-surface rounded-xl border border-outline-variant/60 flex items-center justify-between hover:shadow-sm transition-shadow">
              <div className="text-xs space-y-1">
                <h4 className="font-bold text-on-surface text-[14px]">{m.groupName}</h4>
                <span className="text-on-surface-variant block">📍 Facility: {m.location}</span>
                <div className="flex gap-4 text-[10px] text-on-surface-variant pt-1">
                  <span>Raw Compliance: <strong className="text-on-surface font-mono">{m.rawCompliance}%</strong></span>
                  <span>Coverage: <strong className="text-on-surface font-mono">{m.coveragePct}%</strong></span>
                </div>
              </div>
              
              <div className="text-right">
                <span className="text-[10px] text-secondary font-bold uppercase tracking-wider block">Verified Compliance</span>
                <strong className={`text-xl font-mono block ${
                  m.verifiedCompliancePct >= 95 ? 'text-status-success' : 'text-error'
                }`}>{m.verifiedCompliancePct}%</strong>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ComplianceSummaryCard;
