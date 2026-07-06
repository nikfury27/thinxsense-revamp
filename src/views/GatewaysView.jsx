import React, { useState, useEffect } from 'react';
import { apiService } from '../api/apiService';

const GatewaysView = ({ navigationTarget, clearNavigationTarget }) => {
  const [gateways, setGateways] = useState([]);
  const [selectedGateway, setSelectedGateway] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchGateways = async () => {
    setLoading(true);
    try {
      const res = await apiService.getGateways();
      setGateways(res);
      if (res.length > 0) {
        setSelectedGateway(res[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGateways();
  }, []);

  // Listen to navigation target selections from the dashboard
  useEffect(() => {
    if (navigationTarget && navigationTarget.view === 'gateways' && navigationTarget.id && gateways.length > 0) {
      const found = gateways.find(g => g.id === navigationTarget.id);
      if (found) {
        setSelectedGateway(found);
      }
      clearNavigationTarget();
    }
  }, [navigationTarget, gateways]);

  const handleGatewaySelect = (gw) => {
    setSelectedGateway(gw);
  };

  const filteredGateways = gateways.filter(gw => 
    gw.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex overflow-hidden gap-6 relative h-full animate-fadeIn">
      {/* Left Column: Gateway List */}
      <section className="w-1/3 min-w-[300px] max-w-[360px] flex flex-col bg-white rounded-lg border border-outline-variant overflow-hidden shadow-sm">
        
        {/* Search */}
        <div className="p-4 border-b border-outline-variant bg-surface-container-lowest">
          <div className="relative focus-within:ring-2 focus-within:ring-primary rounded">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">
              search
            </span>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-outline-variant rounded focus:outline-none focus:border-primary font-body-md text-sm"
              placeholder="Search by Gateway ID"
              type="text"
            />
          </div>
        </div>

        {/* List Header */}
        <div className="grid grid-cols-2 bg-surface-container-low border-b border-outline-variant px-4 py-3 text-[11px] font-bold text-on-surface uppercase tracking-wider">
          <div>Gateway ID</div>
          <div className="text-right">Status</div>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse grid grid-cols-2 px-4 py-4 border-b border-outline-variant bg-white">
                <div className="h-4 bg-outline-variant rounded w-3/4"></div>
                <div className="h-4 bg-outline-variant rounded w-12 ml-auto"></div>
              </div>
            ))
          ) : filteredGateways.length === 0 ? (
            <div className="p-4 text-center text-on-surface-variant italic text-sm">
              No gateways found
            </div>
          ) : (
            filteredGateways.map((gw) => {
              const isSelected = selectedGateway && selectedGateway.id === gw.id;
              return (
                <div
                  key={gw.id}
                  onClick={() => handleGatewaySelect(gw)}
                  className={`grid grid-cols-2 px-4 py-4 border-b border-outline-variant cursor-pointer transition-colors duration-150 ${
                    isSelected 
                      ? 'bg-surface-container-highest font-bold' 
                      : 'hover:bg-surface-container-lowest'
                  }`}
                >
                  <div className={`text-sm ${isSelected ? 'text-primary font-bold' : 'text-on-surface'}`}>
                    {gw.id}
                  </div>
                  <div className="text-right flex items-center justify-end gap-1.5 text-[10px] font-bold">
                    {gw.isBatterySwapRisk && (
                      <span className="material-symbols-outlined text-[15px] text-red-500 font-bold" title={`Predictive Swap: low battery, dead in ~${gw.batteryDaysRemaining} days`}>
                        battery_alert
                      </span>
                    )}
                    <span className={gw.status === 'online' ? 'text-primary' : 'text-error'}>
                      {gw.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-outline-variant flex justify-center gap-2">
          <button className="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center text-secondary hover:bg-outline-variant transition-colors disabled:opacity-30" disabled>
            <span className="material-symbols-outlined text-sm">chevron_left</span>
          </button>
          <button className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xs">
            1
          </button>
          <button className="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center text-secondary hover:bg-outline-variant transition-colors disabled:opacity-30" disabled>
            <span className="material-symbols-outlined text-sm">chevron_right</span>
          </button>
        </div>
      </section>

      {/* Right Column: Details Panel */}
      <section className="flex-1 bg-white rounded-lg border border-outline-variant flex flex-col relative overflow-hidden shadow-sm">
        {selectedGateway ? (
          <>
            {/* Status Stripe indicator */}
            <div className={`absolute top-0 left-0 w-full h-1 ${
              selectedGateway.status === 'online' ? 'bg-primary' : 'bg-error'
            }`} />
            
            {/* Header */}
            <div className="p-6 border-b border-outline-variant flex justify-between items-start mt-1 shrink-0">
              <div>
                <div className="text-xs font-mono text-secondary mb-1">ID: {selectedGateway.id}</div>
                <h3 className="font-headline-md text-headline-md text-on-surface font-bold">Gateway Details</h3>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-xs text-secondary">
                  Last Updated: <span className="text-on-surface font-medium">{selectedGateway.properties["Last updated"]}</span>
                </div>
                
                <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 border ${
                  selectedGateway.status === 'online'
                    ? 'bg-primary/5 border-primary/20 text-primary'
                    : 'bg-error-container/20 border-error-container text-error'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    selectedGateway.status === 'online' ? 'bg-primary' : 'bg-error'
                  }`} />
                  {selectedGateway.status.toUpperCase()}
                </div>
              </div>
            </div>
            
            {/* Predictive Swaps Banner */}
            {selectedGateway.isBatterySwapRisk && (
              <div className="mx-6 mt-4 p-3.5 bg-red-500/10 border border-red-500/20 text-red-700 rounded-lg text-xs flex items-center gap-2 animate-fadeIn shrink-0">
                <span className="material-symbols-outlined text-red-500 font-bold">battery_alert</span>
                <div>
                  <strong className="font-bold block">Predictive swaps: Proactive swap recommended!</strong>
                  <span className="text-[10px] text-red-600 block mt-0.5">
                    Battery depletion forecast in ~<strong>{selectedGateway.batteryDaysRemaining} days</strong> (Daily usage rate: -{selectedGateway.properties.dailyDrainRate || '1.5'}%/day).
                  </span>
                </div>
              </div>
            )}

            {/* Properties Grid */}
            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
              <div className="border border-outline-variant rounded-lg p-6 bg-surface-container-lowest shadow-inner">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-y-4 gap-x-12 text-sm">
                  {Object.entries(selectedGateway.properties).map(([key, val]) => (
                    <div 
                      key={key} 
                      className="grid grid-cols-[160px_1fr] items-center py-2.5 border-b border-outline-variant/40"
                    >
                      <div className="text-secondary font-medium text-xs uppercase tracking-wider">{key}</div>
                      <div className={`text-on-surface font-semibold ${
                        val === 'OFFLINE' ? 'text-error font-extrabold' : val === 'ONLINE' ? 'text-primary font-extrabold' : ''
                      }`}>
                        : {val}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-on-surface-variant italic">
            Select a gateway to view properties
          </div>
        )}
      </section>
    </div>
  );
};

export default GatewaysView;
