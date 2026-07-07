import React, { useState, useEffect } from 'react';
import { apiService } from '../../api/apiService';

export const SensorHealthList = ({ onNavigate }) => {
  const [sensors, setSensors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await apiService.getSensors();
        setSensors(res);
      } catch (err) {
        console.error('Failed to load sensors for health list', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  // Compute number of items needing physical review/attention
  const attentionCount = sensors.filter(
    s => s.status === 'offline' || s.status === 'warning' || s.batt < 20 || s.isBatterySwapRisk || s.isTrendBreachRisk
  ).length;

  return (
    <div className="bg-white border border-outline-variant rounded-xl p-5 shadow-sm flex flex-col h-full">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-sm text-primary flex items-center gap-2">
          <span className="material-symbols-outlined text-orange-500 font-bold">battery_alert</span>
          All Sensors Status
        </h3>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
          attentionCount > 0 ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'
        }`}>
          {attentionCount} Action Required
        </span>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto max-h-[300px] pr-1">
        {loading ? (
          <div className="animate-pulse space-y-2 py-1">
            <div className="h-10 bg-outline-variant rounded w-full"></div>
          </div>
        ) : sensors.length === 0 ? (
          <p className="text-xs text-on-surface-variant italic py-4">No sensors registered in the system.</p>
        ) : (
          sensors.map(s => {
            const needsAttention = s.status === 'offline' || s.status === 'warning' || s.batt < 20 || s.isBatterySwapRisk || s.isTrendBreachRisk;
            return (
              <div 
                key={s.id} 
                className={`p-3 border rounded-lg flex items-center justify-between transition-all ${
                  needsAttention 
                    ? 'bg-orange-50/40 border-orange-200 hover:bg-orange-50/60 shadow-sm' 
                    : 'bg-white border-outline-variant hover:bg-surface-container-low'
                }`}
              >
                <div className="text-xs">
                  <div className="flex items-center gap-1.5">
                    <button 
                      onClick={() => onNavigate && onNavigate('sensors', s.id)}
                      className="font-bold text-primary hover:underline block text-left focus:outline-none"
                    >
                      {s.id}
                    </button>
                    {needsAttention && (
                      <span className="w-2 h-2 rounded-full bg-error animate-pulse" title="Requires attention" />
                    )}
                  </div>
                  <span className="text-on-surface-variant block mt-0.5 text-[10px]">
                    📍 {s.facilityLocation && s.facilityLocation !== 'Not Specified' ? `${s.facilityLocation}, ${s.location}` : s.location}
                  </span>
                </div>
                
                <div className="text-right">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase block mb-1 ${
                    s.status === 'online' 
                      ? 'text-status-green bg-status-green/10 font-bold' 
                      : s.status === 'warning'
                      ? 'text-error bg-error/10 animate-pulse font-extrabold'
                      : 'text-outline bg-outline-variant/30 font-extrabold'
                  }`}>
                    {s.status === 'warning' ? 'ALERT' : s.status.toUpperCase()}
                  </span>
                  
                  <div className="flex flex-col items-end text-[9px] font-semibold">
                    <span className={s.batt < 20 ? 'text-red-500 font-extrabold' : 'text-on-surface-variant'}>
                      Battery: {s.batt}%
                    </span>
                    {s.isTrendBreachRisk && (
                      <span className="text-orange-600 font-extrabold flex items-center gap-0.5 mt-0.5">
                        <span className="material-symbols-outlined text-[10px] font-black">trending_up</span>
                        Breach Risk (+{s.slope}°C/h)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default SensorHealthList;
