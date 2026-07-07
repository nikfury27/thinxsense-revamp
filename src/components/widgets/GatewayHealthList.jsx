import React from 'react';
import { useGatewayHealth } from '../../hooks/useGatewayHealth';

export const GatewayHealthList = ({ onNavigate }) => {
  const { gateways, loading } = useGatewayHealth();

  // Degraded gateways are offline or battery swap warning
  const degradedGateways = gateways.filter(gw => gw.status !== 'online' || gw.isBatterySwapRisk);

  return (
    <div className="bg-white border border-outline-variant rounded-xl p-5 shadow-sm flex flex-col h-full">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-sm text-primary flex items-center gap-2">
          <span className="material-symbols-outlined text-red-500 font-bold">router</span>
          Gateway Outages & Degradation
        </h3>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
          degradedGateways.length > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
        }`}>
          {degradedGateways.length} Urgent
        </span>
      </div>
      
      <div className="flex-1 space-y-3 overflow-y-auto max-h-[300px] pr-1">
        {loading ? (
          <div className="animate-pulse space-y-2 py-1">
            <div className="h-10 bg-outline-variant rounded w-full"></div>
          </div>
        ) : degradedGateways.length === 0 ? (
          <p className="text-xs text-on-surface-variant italic py-4">All gateways operating within healthy limits.</p>
        ) : (
          degradedGateways.map(gw => (
            <div key={gw.id} className="p-3 bg-red-50/30 border border-red-200/50 rounded-lg flex items-center justify-between hover:bg-red-50 transition-colors">
              <div className="text-xs">
                <button 
                  onClick={() => onNavigate && onNavigate('gateways', gw.id)}
                  className="font-bold text-primary hover:underline block text-left focus:outline-none"
                >
                  {gw.id}
                </button>
                <span className="text-on-surface-variant block mt-0.5">Uptime: {gw.uptime}</span>
              </div>
              <div className="text-right">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase block mb-1 ${
                  gw.status === 'online' ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800'
                }`}>
                  {gw.status === 'online' ? 'DEGRADED' : 'OFFLINE'}
                </span>
                {gw.isBatterySwapRisk && (
                  <span className="text-[9px] text-red-500 font-semibold block">
                    Battery: {gw.properties.Battery}% (Swap required)
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default GatewayHealthList;
