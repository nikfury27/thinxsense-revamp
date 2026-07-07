import React from 'react';
import { useGatewayHealth } from '../../hooks/useGatewayHealth';

export const GatewayHealthList = ({ onNavigate }) => {
  const { gateways, loading } = useGatewayHealth();

  // Degraded gateways are offline or battery swap warning
  const degradedCount = gateways.filter(gw => gw.status !== 'online' || gw.isBatterySwapRisk).length;

  return (
    <div className="bg-white border border-outline-variant rounded-xl p-5 shadow-sm flex flex-col h-full">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-sm text-primary flex items-center gap-2">
          <span className="material-symbols-outlined text-red-500 font-bold">router</span>
          All Gateways Status
        </h3>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
          degradedCount > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
        }`}>
          {degradedCount} Urgent Action Required
        </span>
      </div>
      
      <div className="flex-1 space-y-3 overflow-y-auto max-h-[300px] pr-1">
        {loading ? (
          <div className="animate-pulse space-y-2 py-1">
            <div className="h-10 bg-outline-variant rounded w-full"></div>
          </div>
        ) : gateways.length === 0 ? (
          <p className="text-xs text-on-surface-variant italic py-4">No gateways registered in the system.</p>
        ) : (
          gateways.map(gw => {
            const needsAttention = gw.status !== 'online' || gw.isBatterySwapRisk;
            return (
              <div 
                key={gw.id} 
                className={`p-3 border rounded-lg flex items-center justify-between transition-all ${
                  needsAttention 
                    ? 'bg-red-50/40 border-red-200 hover:bg-red-50/60 shadow-sm' 
                    : 'bg-white border-outline-variant hover:bg-surface-container-low'
                }`}
              >
                <div className="text-xs">
                  <div className="flex items-center gap-1.5">
                    <button 
                      onClick={() => onNavigate && onNavigate('gateways', gw.id)}
                      className="font-bold text-primary hover:underline block text-left focus:outline-none"
                    >
                      {gw.id}
                    </button>
                    {needsAttention && (
                      <span className="w-2 h-2 rounded-full bg-error animate-pulse" title="Requires attention" />
                    )}
                  </div>
                  <span className="text-on-surface-variant block mt-0.5">Uptime: {gw.uptime}</span>
                </div>
                
                <div className="text-right">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase block mb-1 ${
                    gw.status === 'online' 
                      ? gw.isBatterySwapRisk 
                        ? 'bg-orange-100 text-orange-800' 
                        : 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800 animate-pulse font-extrabold'
                  }`}>
                    {gw.status === 'online' ? (gw.isBatterySwapRisk ? 'DEGRADED' : 'ONLINE') : 'OFFLINE'}
                  </span>
                  {gw.isBatterySwapRisk ? (
                    <span className="text-[9px] text-red-500 font-semibold block">
                      Battery: {gw.properties.Battery}% (Swap Required)
                    </span>
                  ) : (
                    <span className="text-[9px] text-on-surface-variant block">
                      Battery: {gw.properties.Battery}%
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default GatewayHealthList;
