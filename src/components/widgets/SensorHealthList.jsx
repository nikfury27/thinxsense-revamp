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

  // Outages (offline) & Low Battery (batt < 20% or battery swap risk <= 5 days remaining)
  const issues = sensors.filter(s => s.status === 'offline' || s.batt < 20 || s.isBatterySwapRisk);

  return (
    <div className="bg-white border border-outline-variant rounded-xl p-5 shadow-sm flex flex-col h-full">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-sm text-primary flex items-center gap-2">
          <span className="material-symbols-outlined text-orange-500 font-bold">battery_alert</span>
          Sensor Outages & Low Battery
        </h3>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
          issues.length > 0 ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'
        }`}>
          {issues.length} Issues
        </span>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto max-h-[300px] pr-1">
        {loading ? (
          <div className="animate-pulse space-y-2 py-1">
            <div className="h-10 bg-outline-variant rounded w-full"></div>
          </div>
        ) : issues.length === 0 ? (
          <p className="text-xs text-on-surface-variant italic py-4">All sensors operating online with healthy battery levels.</p>
        ) : (
          issues.map(s => (
            <div key={s.id} className="p-3 bg-orange-50/30 border border-orange-200/50 rounded-lg flex items-center justify-between hover:bg-orange-50 transition-colors">
              <div className="text-xs">
                <button 
                  onClick={() => onNavigate && onNavigate('sensors', s.id)}
                  className="font-bold text-primary hover:underline block text-left focus:outline-none"
                >
                  {s.id}
                </button>
                <span className="text-on-surface-variant block mt-0.5">
                  📍 {s.facilityLocation && s.facilityLocation !== 'Not Specified' ? `${s.facilityLocation}, ${s.location}` : s.location}
                </span>
              </div>
              <div className="text-right">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase block mb-1 ${
                  s.status === 'offline' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {s.status === 'offline' ? 'OFFLINE' : 'LOW BATT'}
                </span>
                <span className="text-[9px] text-on-surface-variant block">
                  Battery: {s.batt}% {s.isBatterySwapRisk && `(~${s.batteryDaysRemaining}d left)`}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SensorHealthList;
