import React from 'react';
import { useUnacknowledgedAlerts } from '../../hooks/useUnacknowledgedAlerts';

export const ActionQueue = ({ onNavigate }) => {
  const { alerts, loading } = useUnacknowledgedAlerts();

  return (
    <div className="bg-white border border-outline-variant rounded-xl p-5 shadow-sm flex flex-col h-full">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-sm text-primary flex items-center gap-2">
          <span className="material-symbols-outlined text-error font-bold">assignment_late</span>
          Action Queue: Needs Physical Check Today
        </h3>
        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
          alerts.length > 0 ? 'bg-red-500 text-white animate-pulse' : 'bg-green-100 text-green-800'
        }`}>
          {alerts.length} Pending
        </span>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto max-h-[400px] pr-1">
        {loading ? (
          <div className="animate-pulse space-y-2 py-1">
            <div className="h-12 bg-outline-variant rounded w-full"></div>
          </div>
        ) : alerts.length === 0 ? (
          <p className="text-xs text-on-surface-variant italic py-6 text-center">No unacknowledged alerts requiring a physical check.</p>
        ) : (
          alerts.map(alert => (
            <div key={alert.id} className="p-4 bg-surface rounded-xl border border-outline-variant flex items-center justify-between hover:bg-surface-variant/20 transition-all hover:shadow-sm">
              <div className="text-xs space-y-1 flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-bold text-error text-[13px]">{alert.id}</span>
                  <span className="text-on-surface font-bold text-sm">{alert.room || 'Storage Unit'}</span>
                </div>
                <div className="text-on-surface-variant font-medium">
                  Sensor:{' '}
                  <button 
                    onClick={() => onNavigate && onNavigate('sensors', alert.sensor)} 
                    className="font-bold text-primary hover:underline"
                  >
                    {alert.sensor}
                  </button>
                </div>
                <div className="text-on-surface-variant text-[10px] flex items-center gap-0.5 mt-0.5">
                  <span className="material-symbols-outlined text-[12px] text-secondary">location_on</span>
                  {alert.location || 'Cold Room'}
                </div>
                <div className="text-on-surface-variant text-[10px] pt-0.5">
                  Triggered: {alert.time}
                </div>
              </div>
              
              <div className="text-right flex flex-col items-end gap-2 shrink-0">
                <div className="text-xs font-bold text-error bg-error/5 border border-error/15 px-2.5 py-1 rounded-md font-mono text-[14px]">
                  ESI: {alert.esiScore}
                </div>
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                  alert.validationVerdict === 'Sensor Fault (Mismatched)'
                    ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                    : 'bg-red-100 text-red-800 border border-red-200'
                }`}>
                  {alert.validationVerdict === 'Sensor Fault (Mismatched)' ? '⚠️ Faulty Sensor' : '🚨 Verified Excursion'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ActionQueue;
