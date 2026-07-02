import React, { useState, useEffect } from 'react';
import { apiService } from '../api/apiService';

const SensorsView = ({ navigationTarget, clearNavigationTarget }) => {
  const [sensors, setSensors] = useState([]);
  const [selectedSensor, setSelectedSensor] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('Graph'); // 'Graph' | 'Alerts' | 'Logs'
  const [loading, setLoading] = useState(true);

  // Fetch sensors
  const fetchSensors = async () => {
    setLoading(true);
    try {
      const res = await apiService.getSensors();
      setSensors(res);
      if (res.length > 0) {
        setSelectedSensor(res[0]); // Select first sensor by default
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSensors();
  }, []);

  // Listen to navigation target selections from the dashboard
  useEffect(() => {
    if (navigationTarget && navigationTarget.view === 'sensors' && navigationTarget.id && sensors.length > 0) {
      const found = sensors.find(s => s.id === navigationTarget.id);
      if (found) {
        setSelectedSensor(found);
      }
      clearNavigationTarget();
    }
  }, [navigationTarget, sensors]);

  const handleSensorSelect = (sensor) => {
    setSelectedSensor(sensor);
  };

  // Local sensor searching
  const filteredSensors = sensors.filter(sensor => 
    sensor.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Statistics
  const onlineCount = sensors.filter(s => s.status === 'online').length;
  const offlineCount = sensors.filter(s => s.status === 'offline').length;
  const warningCount = sensors.filter(s => s.status === 'warning').length;
  const totalCount = sensors.length;

  // Retrieve neighbors in the same group (excluding selected sensor)
  const getNeighbors = (sensor) => {
    if (!sensor) return [];
    return sensors.filter(s => s.group === sensor.group && s.id !== sensor.id);
  };

  // Neighbour validation evaluation logic using a 3.0°C deviation threshold
  const evaluateNeighbourValidation = (sensor) => {
    const neighbors = getNeighbors(sensor).filter(n => n.status !== 'offline');
    if (neighbors.length === 0) {
      return {
        status: 'isolated',
        message: 'No active neighboring sensors available in the same group for comparison.',
        action: 'Isolated node monitoring. Inspect sensor if alerts persist.'
      };
    }

    const neighborAverage = neighbors.reduce((acc, curr) => acc + curr.temp, 0) / neighbors.length;
    const deviation = Math.abs(sensor.temp - neighborAverage);
    const DEVIATION_THRESHOLD = 3.0; // 3.0°C deviation limit

    const isBreach = sensor.temp > 25.0; // Threshold breach limit

    if (isBreach) {
      if (deviation > DEVIATION_THRESHOLD) {
        return {
          status: 'fault',
          message: `Neighbour Mismatch: Selected sensor deviates from neighbor average (${neighborAverage.toFixed(1)}°C) by ${deviation.toFixed(1)}°C (Threshold: 3.0°C).`,
          action: 'Flagged as Local Hotspot / Faulty Sensor. Action: Inspect space (check for door opening event or sensor calibration).'
        };
      } else {
        return {
          status: 'critical',
          message: `Group Consensus: Sibling sensors also reporting elevated temperatures (average: ${neighborAverage.toFixed(1)}°C).`,
          action: 'Verified Room Excursion. Action: Inspect main cooling/HVAC systems immediately.'
        };
      }
    } else {
      return {
        status: 'healthy',
        message: `Verified Agreement: Sensor is within safety limits and aligned with neighbors (average: ${neighborAverage.toFixed(1)}°C).`,
        action: 'Environmental status stable. No physical inspection required.'
      };
    }
  };

  // Render SVG Chart for Sensor History
  const renderSVGChart = (history) => {
    if (!history || history.length === 0) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center bg-surface-container-low/30 relative py-12">
          <div className="absolute inset-0 opacity-10 pointer-events-none grid-lines" />
          <div className="text-center text-on-surface-variant font-body-md text-sm z-10 flex flex-col items-center gap-4">
            <span className="material-symbols-outlined text-5xl text-outline-variant/60">query_stats</span>
            <p>No time-series data found in the requested window.</p>
          </div>
        </div>
      );
    }

    const width = 600;
    const height = 200;
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const temps = history.map(h => h.temp);
    const hums = history.map(h => h.hum);
    const maxVal = Math.max(...temps, ...hums, 40);
    const minVal = Math.min(...temps, ...hums, 10);
    const valRange = maxVal - minVal || 1;

    const getX = (index) => padding + (index / (history.length - 1)) * chartWidth;
    const getY = (val) => height - padding - ((val - minVal) / valRange) * chartHeight;

    const tempPoints = history.map((h, i) => `${getX(i)},${getY(h.temp)}`).join(' ');
    const humPoints = history.map((h, i) => `${getX(i)},${getY(h.hum)}`).join(' ');

    return (
      <div className="w-full overflow-hidden p-4 bg-white relative flex-1 flex flex-col justify-center">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
          {[...Array(5)].map((_, i) => {
            const yVal = minVal + (valRange / 4) * i;
            const yPos = getY(yVal);
            return (
              <g key={i}>
                <line x1={padding} y1={yPos} x2={width - padding} y2={yPos} stroke="#e2e8f0" strokeDasharray="4 4" />
                <text x={padding - 8} y={yPos + 4} fontSize="9" fill="#747685" textAnchor="end" className="font-mono">
                  {yVal.toFixed(0)}
                </text>
              </g>
            );
          })}
          
          {history.filter((_, i) => i % 6 === 0).map((h, i) => {
            const index = i * 6;
            return (
              <text key={i} x={getX(index)} y={height - padding + 16} fontSize="9" fill="#747685" textAnchor="middle" className="font-mono">
                {h.time}
              </text>
            );
          })}

          <polyline fill="none" stroke="#3154ca" strokeWidth="3" strokeLinecap="round" points={tempPoints} />
          <path d={`M ${getX(0)} ${height - padding} L ${tempPoints} L ${getX(history.length - 1)} ${height - padding} Z`} fill="url(#tempGlow)" opacity="0.1" />

          <polyline fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" points={humPoints} />
          <path d={`M ${getX(0)} ${height - padding} L ${humPoints} L ${getX(history.length - 1)} ${height - padding} Z`} fill="url(#humGlow)" opacity="0.1" />

          <defs>
            <linearGradient id="tempGlow" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3154ca" /><stop offset="100%" stopColor="#ffffff" /></linearGradient>
            <linearGradient id="humGlow" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ef4444" /><stop offset="100%" stopColor="#ffffff" /></linearGradient>
          </defs>
        </svg>
      </div>
    );
  };

  return (
    <div className="flex-1 flex overflow-hidden gap-6 relative h-full">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 opacity-10 pointer-events-none w-1/3 h-64 bg-gradient-to-bl from-primary-fixed-dim to-transparent rounded-bl-full" />

      {/* Left Panel: Sensor List */}
      <section className="w-1/3 min-w-[280px] max-w-[340px] flex flex-col bg-white border border-outline-variant rounded-xl overflow-hidden shadow-sm z-10">
        
        {/* Search */}
        <div className="p-4 border-b border-outline-variant bg-surface-container-lowest">
          <div className="relative focus-within:ring-2 focus-within:ring-primary rounded-lg">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">
              search
            </span>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surface border border-outline-variant rounded-lg text-sm focus:outline-none focus:border-primary transition-colors"
              placeholder="Search by Sensor ID"
              type="text"
            />
          </div>
        </div>

        {/* List Header */}
        <div className="grid grid-cols-2 px-4 py-3 bg-surface-container-low border-b border-outline-variant text-[11px] font-bold text-secondary uppercase tracking-wider">
          <div>Sensor ID</div>
          <div className="text-right">Status</div>
        </div>

        {/* Sensor List Container */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            [...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse grid grid-cols-2 px-4 py-3.5 border-b border-outline-variant/30 bg-white">
                <div className="h-4 bg-outline-variant rounded w-1/2"></div>
                <div className="h-5 bg-outline-variant rounded w-16 ml-auto"></div>
              </div>
            ))
          ) : filteredSensors.length === 0 ? (
            <div className="p-4 text-center text-on-surface-variant italic text-sm">
              No sensors found
            </div>
          ) : (
            filteredSensors.map((sensor) => {
              const isSelected = selectedSensor && selectedSensor.id === sensor.id;
              
              // Calculate Neighbour Mismatch warning for list indicator
              const neighbors = sensors.filter(s => s.group === sensor.group && s.id !== sensor.id && s.status !== 'offline');
              let isMismatch = false;
              if (neighbors.length > 0 && sensor.temp > 25.0) {
                const neighborAverage = neighbors.reduce((acc, curr) => acc + curr.temp, 0) / neighbors.length;
                const deviation = Math.abs(sensor.temp - neighborAverage);
                if (deviation > 3.0) {
                  isMismatch = true;
                }
              }

              return (
                <div
                  key={sensor.id}
                  onClick={() => handleSensorSelect(sensor)}
                  className={`grid grid-cols-2 px-4 py-3 cursor-pointer transition-colors border-b border-outline-variant/40 ${
                    isSelected ? 'bg-primary/5 border-l-4 border-l-primary' : 'bg-white hover:bg-surface-container-highest'
                  }`}
                >
                  <div className="pl-1">
                    <div className={`font-body-md text-sm ${isSelected ? 'text-primary font-semibold' : 'text-on-surface'}`}>
                      {sensor.id}
                    </div>
                    {/* Location Badge on items */}
                    <div className="text-[9px] text-secondary truncate w-28">
                      {sensor.location?.split(',')[0]}
                    </div>
                  </div>
                  <div className="text-right flex items-center justify-end gap-1">
                    {isMismatch && (
                      <span className="material-symbols-outlined text-[15px] text-yellow-600 font-bold" title="Neighbour Validation Mismatch (Local Hotspot / Sensor Fault)">
                        warning
                      </span>
                    )}
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                      sensor.status === 'online' 
                        ? 'text-status-green bg-status-green/10' 
                        : sensor.status === 'warning'
                        ? 'text-error bg-error/10'
                        : 'text-outline bg-outline-variant/30'
                    }`}>
                      {sensor.status === 'warning' ? 'ALERT' : sensor.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Right Panel: Sensor Details & Graphs */}
      <section className="flex-1 flex flex-col gap-5 overflow-hidden z-10">
        
        {/* Statistics & Summary Row */}
        <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-outline-variant shadow-sm shrink-0">
          <div className="flex gap-5 font-body-md text-xs">
            <div className="flex items-center gap-2 text-secondary font-medium">
              <span>Sensors</span>
              <span className="w-px h-4 bg-outline-variant" />
            </div>
            <div className="flex items-center gap-2 text-on-surface">
              <span className="text-status-green font-medium">Online :</span>
              <span className="font-bold">{onlineCount}</span>
            </div>
            <div className="flex items-center gap-2 text-on-surface">
              <span className="text-error font-medium">Offline :</span>
              <span className="font-bold">{offlineCount}</span>
            </div>
            <div className="flex items-center gap-2 text-on-surface">
              <span className="text-secondary font-medium">Total :</span>
              <span className="font-bold">{totalCount}</span>
            </div>
          </div>

          <div className="flex bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden p-1 shadow-sm shrink-0">
            {['Graph', 'Alerts', 'Logs'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-1 rounded-md text-xs font-medium transition-all duration-200 ${
                  activeTab === tab
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-variant'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Sensor View Area */}
        {selectedSensor && (
          <div className="flex-1 flex flex-col gap-5 min-h-0">
            
            {/* Top Details & Logging coverage (Twin metrics) */}
            <div className="bg-white p-5 border border-outline-variant rounded-xl shadow-sm shrink-0 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Info Column */}
              <div>
                <span className="text-xs text-secondary font-bold uppercase tracking-wider">Selected Sensor</span>
                <h3 className="font-headline-md text-xl text-primary font-bold mt-1">{selectedSensor.id}</h3>
                
                {/* Physical Location Badge */}
                <div className="text-xs text-on-surface-variant flex items-center gap-1 mt-2">
                  <span className="material-symbols-outlined text-[16px] text-secondary">location_on</span>
                  <span>Physical Location: <strong className="text-on-surface font-semibold">{selectedSensor.location || 'Not Specified'}</strong></span>
                </div>
              </div>

              {/* Threshold Compliance Card */}
              <div className="bg-primary/[0.02] border border-primary/10 rounded-lg p-3 flex flex-col justify-center">
                <div className="text-center">
                  <span className="text-[10px] text-secondary font-bold uppercase tracking-wider block">Threshold Compliance Rating</span>
                  <strong className={`text-2xl font-mono block mt-1 ${
                    selectedSensor.complianceScore > 95 ? 'text-status-success' : 'text-error'
                  }`}>{selectedSensor.complianceScore}%</strong>
                </div>
                
                <div className="text-[9px] text-on-surface-variant leading-normal flex items-center justify-center gap-1 mt-2 border-t border-outline-variant/40 pt-1.5">
                  <span className="material-symbols-outlined text-[12px] text-primary">verified</span>
                  <p>
                    Represents the percentage of logs captured within safety thresholds.
                  </p>
                </div>
              </div>
            </div>

            {/* Neighbour Validation Panel (New Feature) */}
            <div className="bg-white p-5 border border-outline-variant rounded-xl shadow-sm shrink-0">
              <h4 className="font-bold text-xs uppercase tracking-wider text-secondary mb-3 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-[16px]">groups</span>
                Neighbour Validation Dashboard
              </h4>

              {(() => {
                const validation = evaluateNeighbourValidation(selectedSensor);
                const neighbors = getNeighbors(selectedSensor);
                
                return (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Selected Sensor state */}
                    <div className="p-3 bg-surface rounded-lg border border-outline-variant/60 text-xs">
                      <span className="text-secondary block">Selected Sensor Reading:</span>
                      <strong className="text-sm font-mono mt-1 block">{selectedSensor.id} : {selectedSensor.temp}°C</strong>
                      <span className={`text-[10px] font-bold uppercase block mt-1 ${
                        selectedSensor.status === 'online' ? 'text-status-green' : 'text-error animate-pulse'
                      }`}>{selectedSensor.status === 'warning' ? 'ALERT' : selectedSensor.status}</span>
                    </div>

                    {/* Neighbors list */}
                    <div className="p-3 bg-surface rounded-lg border border-outline-variant/60 text-xs">
                      <span className="text-secondary block">Neighbouring Sensor Readings:</span>
                      <div className="mt-1 space-y-1 font-mono">
                        {neighbors.length === 0 ? (
                          <span className="text-outline italic">No neighbors in room</span>
                        ) : (
                          neighbors.slice(0, 2).map(n => (
                            <div key={n.id} className="flex justify-between">
                              <span>{n.id}:</span>
                              <strong className="text-on-surface">{n.temp}°C</strong>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Validation assessment */}
                    <div className={`p-3 rounded-lg border text-xs flex flex-col justify-between ${
                      validation.status === 'fault'
                        ? 'bg-yellow-500/10 border-yellow-500/20'
                        : validation.status === 'critical'
                        ? 'bg-error-container/20 border-error/20'
                        : 'bg-green-500/5 border-green-500/15'
                    }`}>
                      <div>
                        <strong className={`font-bold flex items-center gap-1 ${
                          validation.status === 'fault'
                            ? 'text-yellow-700'
                            : validation.status === 'critical'
                            ? 'text-error animate-pulse'
                            : 'text-status-success'
                        }`}>
                          <span className="material-symbols-outlined text-[14px]">
                            {validation.status === 'healthy' ? 'check_circle' : 'report'}
                          </span>
                          {validation.status === 'fault' ? 'Neighbour Mismatch' : validation.status === 'critical' ? 'Verified Excursion' : 'Verified Agreement'}
                        </strong>
                        <p className="text-on-surface-variant mt-1 text-[10px] leading-tight">{validation.message}</p>
                      </div>
                      <div className="text-[10px] font-bold text-on-surface mt-2 border-t border-black/5 pt-1">
                        Action: {validation.action}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Chart Area Panel */}
            <div className="flex-1 bg-white border border-outline-variant rounded-xl shadow-sm flex flex-col min-h-0 overflow-hidden">
              <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-lowest shrink-0">
                <div className="flex gap-6 text-[10px] text-secondary font-bold uppercase tracking-wider">
                  <div>
                    <span className="font-bold text-on-surface">Group Name:</span> {selectedSensor.group}
                  </div>
                  <div>
                    <span className="font-bold text-on-surface">Last Seen:</span> {selectedSensor.lastSeen}
                  </div>
                </div>
                
                {activeTab === 'Graph' && selectedSensor.history.length > 0 && (
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-xs font-semibold">
                      <span className="w-3 h-3 rounded-full bg-primary" />
                      <span className="text-on-surface">Temp</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-semibold">
                      <span className="w-3 h-3 rounded-full bg-error" />
                      <span className="text-on-surface">Humidity</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex-1 flex flex-col min-h-0">
                {activeTab === 'Graph' && renderSVGChart(selectedSensor.history)}
                
                {activeTab === 'Alerts' && (
                  <div className="p-6 overflow-y-auto flex-1 custom-scrollbar text-sm">
                    <h4 className="font-bold text-on-surface mb-3">Triggered Alerts History ({selectedSensor.id})</h4>
                    {selectedSensor.status === 'warning' ? (
                      <div className="space-y-3">
                        <div className="p-3 bg-error-container/20 border border-error/20 rounded flex justify-between items-center">
                          <div>
                            <span className="font-semibold text-error text-xs uppercase tracking-wider">ALT-9921 Temperature Alert</span>
                            <p className="text-xs text-on-surface-variant mt-1">Temperature reached 31.2°C (Limit: &gt; 25°C)</p>
                          </div>
                          <span className="text-xs text-secondary font-mono">1 min ago</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-on-surface-variant italic">No recent alerts triggered for this sensor.</p>
                    )}
                  </div>
                )}

                {activeTab === 'Logs' && (
                  <div className="p-6 overflow-y-auto flex-1 font-mono text-[11px] bg-slate-900 text-slate-300 custom-scrollbar">
                    <div className="text-emerald-400 mb-2">// Reading sensor metrics payload...</div>
                    <div>[2026-07-01 12:28:15] INFO: Connecting to MQTT broker...</div>
                    <div>[2026-07-01 12:28:17] RECEIVED: {`{"sensor_id":"${selectedSensor.id}","temp":${selectedSensor.temp},"hum":${selectedSensor.hum},"batt":${selectedSensor.batt}}`}</div>
                    <div>[2026-07-01 12:28:18] INFO: Threshold compliance verified: {selectedSensor.complianceScore}% success.</div>
                  </div>
                )}
              </div>

            </div>

          </div>
        )}
      </section>
    </div>
  );
};

export default SensorsView;
