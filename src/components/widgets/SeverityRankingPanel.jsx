import React from 'react';
import { useTopExcursions } from '../../hooks/useTopExcursions';

export const SeverityRankingPanel = ({ onNavigate }) => {
  const { excursions, loading } = useTopExcursions();

  // Show alerts that are unacknowledged and prioritize severe ones
  const pendingSignOffs = excursions.filter(ex => ex.state === 'unacknowledged');

  return (
    <div className="bg-white border border-outline-variant rounded-xl p-5 shadow-sm flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-sm text-primary flex items-center gap-2">
          <span className="material-symbols-outlined text-error font-bold">analytics</span>
          Top Excursions (Needs QA Sign-Off)
        </h3>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
          pendingSignOffs.length > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
        }`}>
          {pendingSignOffs.length} Total
        </span>
      </div>
      
      <div className="flex-1 space-y-3 overflow-y-auto max-h-[450px] pr-1">
        {loading ? (
          <div className="animate-pulse space-y-2 py-1">
            <div className="h-10 bg-outline-variant rounded w-full"></div>
          </div>
        ) : pendingSignOffs.length === 0 ? (
          <p className="text-xs text-on-surface-variant italic py-6 text-center">No excursions requiring quality sign-off.</p>
        ) : (
          pendingSignOffs.map(ex => (
            <div key={ex.id} className="p-3.5 bg-surface border border-outline-variant rounded-xl flex items-center justify-between hover:shadow-sm transition-all hover:bg-surface-variant/10">
              <div className="text-xs space-y-1 min-w-0 flex-1 pr-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-bold text-error text-[13px]">{ex.id}</span>
                  <span className="text-on-surface font-bold text-sm">{ex.room}</span>
                </div>
                <p className="text-on-surface-variant mt-0.5">
                  Sensor:{' '}
                  <button 
                    onClick={() => onNavigate && onNavigate('sensors', ex.sensor)} 
                    className="font-bold text-primary hover:underline"
                  >
                    {ex.sensor}
                  </button>
                </p>
                <span className="text-on-surface-variant block text-[10px] flex items-center gap-0.5 mt-0.5">
                  <span className="material-symbols-outlined text-[12px] text-secondary">location_on</span>
                  {ex.location}
                </span>
              </div>
              
              <div className="text-right flex flex-col items-end gap-1 shrink-0">
                <span className="text-[10px] text-secondary font-bold uppercase tracking-wider block">ESI Severity</span>
                <strong className="text-[17px] font-mono text-error font-extrabold">{ex.esiScore}</strong>
                <span className="text-[9px] bg-error/10 text-error border border-error/25 px-2 py-0.5 rounded font-bold uppercase tracking-wide">
                  Needs Sign-off
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SeverityRankingPanel;
