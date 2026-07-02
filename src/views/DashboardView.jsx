import React, { useState, useEffect } from 'react';
import { apiService } from '../api/apiService';

const DashboardView = () => {
  const [sensors, setSensors] = useState([]);
  const [gateways, setGateways] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [sensorsRes, gatewaysRes, alertsRes] = await Promise.all([
        apiService.getSensors(),
        apiService.getGateways(),
        apiService.getAlerts()
      ]);
      
      // Displays online H9B series and offline BRR sensors with physical locations
      setSensors(sensorsRes.slice(0, 6)); 
      setGateways(gatewaysRes);
      
      // Calculate ESI score and Neighbour Validation verdict for alerts
      const alertsWithEsi = alertsRes.map(alert => {
        const esiScore = alert.param === 'Temperature' && alert.deviation 
          ? parseFloat((alert.deviation * alert.duration).toFixed(1)) 
          : 0;

        let validationVerdict = 'Isolated';
        const alertSensor = sensorsRes.find(s => s.id === alert.sensor);
        if (alertSensor) {
          const group = alertSensor.group;
          const neighbors = sensorsRes.filter(s => s.group === group && s.id !== alert.sensor && s.status !== 'offline');
          
          if (neighbors.length > 0) {
            if (alert.param === 'Temperature') {
              const neighborAverage = neighbors.reduce((acc, curr) => acc + curr.temp, 0) / neighbors.length;
              const deviation = Math.abs(parseFloat(alert.val) - neighborAverage);
              const DEVIATION_THRESHOLD = 3.0; // 3.0°C limit
              
              if (deviation > DEVIATION_THRESHOLD) {
                validationVerdict = 'Sensor Fault (Mismatched)';
              } else {
                validationVerdict = 'Excursion (Verified)';
              }
            } else {
              validationVerdict = 'Excursion (Verified)';
            }
          } else {
            validationVerdict = 'Isolated Monitoring';
          }
        }

        return { ...alert, esiScore, validationVerdict };
      });
      
      // Sort alerts by ESI severity score descending (ranking severe prolonged deviations to the top)
      const sortedAlerts = alertsWithEsi
        .filter(a => a.state === 'unacknowledged')
        .sort((a, b) => b.esiScore - a.esiScore);

      setAlerts(sortedAlerts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-6 animate-fadeIn pb-8">
      {/* View Title & Toolbar */}
      <div className="flex items-center justify-between">
        <h1 className="font-headline-lg text-headline-lg text-on-surface">Demo POC Overview</h1>
        
        <button
          onClick={fetchDashboardData}
          disabled={loading}
          className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded flex items-center gap-2 font-body-md text-sm transition-colors shadow-sm disabled:opacity-50"
        >
          <span className={`material-symbols-outlined text-[20px] ${loading ? 'animate-spin' : ''}`}>
            refresh
          </span>
          Refresh Data
        </button>
      </div>

      {/* ESI Evaluation Explanation Panel (New Feature Showcase) */}
      <div className="bg-white border-2 border-primary/20 rounded-xl p-5 shadow-sm">
        <h3 className="font-bold text-sm text-primary mb-3 flex items-center gap-2">
          <span className="material-symbols-outlined">analytics</span>
          Excursion Severity Index (ESI) Evaluation
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 text-xs">
          {/* Room A Card */}
          <div className="p-3 bg-surface-container-low rounded-lg border border-outline-variant/60 flex flex-col justify-between">
            <div>
              <span className="font-bold text-on-surface">Room A: Cold Room 1 (Minor Spikes)</span>
              <p className="text-secondary mt-1">3 temperature spikes exceeding threshold by 0.5°C, lasting 5 mins each.</p>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-700 rounded font-bold uppercase text-[9px]">
                Low Severity Priority
              </span>
              <strong className="font-mono text-secondary">Avg ESI Score: 2.5</strong>
            </div>
          </div>

          {/* Room B Card */}
          <div className="p-3 bg-error-container/20 rounded-lg border border-error/30 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute right-0 top-0 w-2 h-full bg-error" />
            <div>
              <span className="font-bold text-error">Room B: Cold Room 2 (Severe Prolonged Deviation)</span>
              <p className="text-on-error-container mt-1">Single continuous deviation exceeding limit by 6.2°C, lasting 45 mins.</p>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="px-2 py-0.5 bg-error/25 text-error rounded font-bold uppercase text-[9px] animate-pulse">
                Critical Priority
              </span>
              <strong className="font-mono text-error">Max ESI Score: 279.0</strong>
            </div>
          </div>
        </div>

        <div className="text-xs text-on-surface-variant flex items-start gap-2 bg-primary/5 p-3 rounded-lg border border-primary/10">
          <span className="material-symbols-outlined text-[16px] text-primary mt-0.5">info</span>
          <p>
            <strong>UI Sorting logic:</strong> The alerts list below dynamically prioritizes deviations by their ESI score rather than simple chronological timestamps or incident counts. This guarantees that Room B is flagged for urgent action first, preventing dangerous, prolonged temperature exposures from being buried.
          </p>
        </div>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-12 gap-gutter-md">
        
        {/* Sensors Overview (Wide) */}
        <div className="col-span-12 lg:col-span-8 bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden flex flex-col shadow-sm">
          <div className="px-6 py-4 border-b border-outline-variant bg-surface flex justify-between items-center">
            <h2 className="font-headline-md text-headline-md font-bold">Active Sensors</h2>
            <span className="text-status-green font-status-label text-status-label flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-status-green animate-pulse"></span> Live
            </span>
          </div>
          
          <div className="p-6 flex-1 bg-surface-container-lowest">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="animate-pulse flex space-x-4 bg-surface p-4 rounded-lg border border-outline-variant h-32">
                    <div className="flex-1 space-y-4 py-1">
                      <div className="h-4 bg-outline-variant rounded w-3/4"></div>
                      <div className="space-y-2">
                        <div className="h-4 bg-outline-variant rounded"></div>
                        <div className="h-4 bg-outline-variant rounded w-5/6"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {sensors.map((sensor) => (
                  <div 
                    key={sensor.id} 
                    className="relative bg-white border border-outline-variant rounded-lg p-4 flex flex-col gap-3 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
                  >
                    <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${
                      sensor.status === 'online' ? 'bg-status-green' : sensor.status === 'warning' ? 'bg-error' : 'bg-outline'
                    }`} />
                    
                    <div className="flex justify-between items-start pl-2">
                      <div>
                        <div className="font-label-sm text-sm text-on-surface font-bold">{sensor.id}</div>
                        {/* Physical Location Tag (New Feature) */}
                        <div className="text-[10px] text-secondary flex items-center gap-0.5 mt-0.5">
                          <span className="material-symbols-outlined text-[12px]">location_on</span>
                          {sensor.location || 'Storage Facility'}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-on-surface-variant">
                        <span className={`material-symbols-outlined text-[16px] ${sensor.batt < 20 ? 'text-error animate-pulse' : 'text-primary'}`}>
                          {sensor.batt < 20 ? 'battery_alert' : 'battery_full'}
                        </span>
                        {sensor.batt}%
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 pl-2 mt-1">
                      <div>
                        <div className="text-[10px] text-on-surface-variant mb-0.5">Temp</div>
                        <div className={`font-headline-md text-base font-bold ${sensor.temp > 28 ? 'text-error font-extrabold' : 'text-on-surface'}`}>
                          {sensor.temp}°C
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-on-surface-variant mb-0.5">Humidity</div>
                        <div className={`font-headline-md text-base font-bold ${sensor.hum > 80 ? 'text-error' : 'text-on-surface'}`}>
                          {sensor.hum}%
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-[10px] text-on-surface-variant pl-2 mt-auto text-right">
                      Last update: {sensor.lastSeen}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Gateways Status (Narrow) */}
        <div className="col-span-12 lg:col-span-4 bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden flex flex-col shadow-sm">
          <div className="px-6 py-4 border-b border-outline-variant bg-surface">
            <h2 className="font-headline-md text-headline-md font-bold">Gateway Status</h2>
          </div>
          
          <div className="p-4 flex-1 flex flex-col gap-4 overflow-y-auto max-h-[350px]">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse bg-surface rounded border border-outline-variant p-3 h-16 flex items-center justify-between">
                  <div className="space-y-2 w-1/2">
                    <div className="h-3 bg-outline-variant rounded w-3/4"></div>
                    <div className="h-3 bg-outline-variant rounded w-1/2"></div>
                  </div>
                  <div className="h-5 bg-outline-variant rounded w-16"></div>
                </div>
              ))
            ) : (
              gateways.map((gw) => (
                <div key={gw.id} className="bg-surface rounded border border-outline-variant p-3 flex items-center justify-between hover:shadow-sm transition-shadow">
                  <div>
                    <div className="font-label-sm text-sm font-bold text-on-surface">{gw.id}</div>
                    <div className="text-xs text-on-surface-variant mt-1">Uptime: {gw.uptime}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      gw.status === 'online' ? 'bg-status-green/20 text-status-green' : 'bg-error/20 text-error'
                    }`}>
                      {gw.status}
                    </span>
                    <div className="text-[10px] text-on-surface-variant flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">signal_cellular_alt</span>
                      {gw.signal} dBm
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Alerts Table (Full Width sorted by ESI) */}
        <div className="col-span-12 bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-outline-variant bg-surface flex justify-between items-center">
            <h2 className="font-headline-md text-headline-md text-error font-bold flex items-center gap-2">
              <span className="material-symbols-outlined fill text-error animate-pulse">report</span>
              Active Excursions (Sorted by Severity Index)
            </h2>
            <div className="text-xs text-secondary font-semibold font-mono">
              Formula: Severity (ESI) = Duration (mins) × Deviation Magnitude (°C)
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-variant/30 text-on-surface-variant font-label-sm text-xs uppercase">
                <tr>
                  <th className="py-3 px-6 font-medium">Alert ID</th>
                  <th className="py-3 px-6 font-medium">Facility / Room</th>
                  <th className="py-3 px-6 font-medium">Sensor ID</th>
                  <th className="py-3 px-6 font-medium">Physical Location</th>
                  <th className="py-3 px-6 font-medium text-center">Deviation / Duration</th>
                  <th className="py-3 px-6 font-medium text-center text-error bg-error/5">Severity Index (ESI)</th>
                  <th className="py-3 px-6 font-medium text-center">Neighbour Validation</th>
                  <th className="py-3 px-6 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant font-body-md text-sm text-on-surface">
                {loading ? (
                  [...Array(3)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {[...Array(8)].map((_, j) => (
                        <td key={j} className="py-4 px-6">
                          <div className="h-4 bg-outline-variant rounded w-3/4"></div>
                        </td>
                      ))}
                    </tr>
                  ))
                ) : alerts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-6 px-6 text-center text-on-surface-variant italic">
                      No active excursions.
                    </td>
                  </tr>
                ) : (
                  alerts.map((alert) => (
                    <tr key={alert.id} className="hover:bg-surface-container-low transition-colors">
                      <td className="py-3 px-6 font-mono text-xs font-bold">{alert.id}</td>
                      <td className="py-3 px-6 font-bold text-on-surface">{alert.room || 'Storage Facility'}</td>
                      <td className="py-3 px-6 font-semibold text-primary">{alert.sensor}</td>
                      <td className="py-3 px-6 text-xs text-on-surface-variant flex items-center gap-1 mt-3">
                        <span className="material-symbols-outlined text-[14px]">location_on</span>
                        {alert.location || 'Cold Room'}
                      </td>
                      <td className="py-3 px-6 text-center text-xs font-mono">
                        +{alert.deviation || 0}°C for {alert.duration || 0} mins
                      </td>
                      {/* ESI Highlight Column */}
                      <td className="py-3 px-6 text-center font-bold text-error bg-error/5 text-base font-mono">
                        {alert.esiScore}
                      </td>
                      {/* Neighbour Validation Column */}
                      <td className="py-3 px-6 text-center text-xs">
                        <span className={`px-2 py-0.5 rounded font-bold ${
                          alert.validationVerdict === 'Sensor Fault (Mismatched)'
                            ? 'bg-yellow-500/20 text-yellow-800 border border-yellow-500/25'
                            : alert.validationVerdict === 'Excursion (Verified)'
                            ? 'bg-error-container text-error font-extrabold animate-pulse'
                            : 'bg-primary/10 text-primary border border-primary/20'
                        }`}>
                          {alert.validationVerdict === 'Sensor Fault (Mismatched)' ? '⚠️ Sensor Fault' : alert.validationVerdict === 'Excursion (Verified)' ? '🚨 Verified Excursion' : 'ℹ️ Isolated'}
                        </span>
                      </td>
                      <td className="py-3 px-6">
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                          alert.esiScore > 100 
                            ? 'bg-error text-white animate-pulse'
                            : 'bg-yellow-500/20 text-yellow-700 border border-yellow-500/25'
                        }`}>
                          {alert.state}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default DashboardView;
