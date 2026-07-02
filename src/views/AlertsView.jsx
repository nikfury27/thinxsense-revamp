import React, { useState, useEffect } from 'react';
import { apiService } from '../api/apiService';

const AlertsView = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('time'); // 'time' | 'esi'
  const itemsPerPage = 8;

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await apiService.getAlerts(searchQuery);
      const allSensors = await apiService.getSensors();
      
      // Calculate ESI scores for mock display and check Neighbour Validation
      const withEsi = res.map(alert => {
        const esiScore = alert.param === 'Temperature' && alert.deviation 
          ? parseFloat((alert.deviation * alert.duration).toFixed(1)) 
          : alert.param === 'Humidity' && alert.deviation
          ? parseFloat((alert.deviation * (alert.duration / 10)).toFixed(1))
          : 0;

        let validationVerdict = 'Isolated';
        const alertSensor = allSensors.find(s => s.id === alert.sensor);
        if (alertSensor) {
          const group = alertSensor.group;
          const neighbors = allSensors.filter(s => s.group === group && s.id !== alert.sensor && s.status !== 'offline');
          
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
      
      setAlerts(withEsi);
      setCurrentPage(1); // Reset page on search
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [searchQuery]); // Re-fetch when searchQuery changes

  // Dynamic sorting logic based on selected toggle
  const sortedAlerts = [...alerts].sort((a, b) => {
    if (sortBy === 'esi') {
      return b.esiScore - a.esiScore;
    } else {
      // Sort by time descending (newest first)
      return new Date(b.time) - new Date(a.time);
    }
  });

  // Pagination calculation
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedAlerts.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedAlerts.length / itemsPerPage) || 1;

  const handlePageChange = (pageNum) => {
    if (pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum);
    }
  };

  return (
    <div className="space-y-6 h-full flex flex-col animate-fadeIn">
      {/* Excursions Sorting & Search Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-stack-sm shrink-0">
        
        {/* Search Input */}
        <div className="relative w-full max-w-sm">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-4 pr-10 py-2 bg-white border border-outline-variant rounded-full text-sm text-on-surface focus:ring-2 focus:ring-primary focus:border-primary transition-all shadow-sm"
            placeholder="Search alerts by Sensor ID..."
            type="text"
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <span className="material-symbols-outlined text-outline">search</span>
          </div>
        </div>

        {/* ESI vs Timestamp Toggle controls */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <span className="text-xs font-bold text-secondary uppercase tracking-wider">Sort Priority:</span>
          <div className="flex bg-surface-container-lowest border border-outline-variant rounded-lg p-1 shadow-sm shrink-0">
            <button
              onClick={() => setSortBy('time')}
              className={`px-4 py-1 rounded-md text-xs font-semibold transition-all duration-200 ${
                sortBy === 'time'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-on-surface-variant hover:bg-surface-variant'
              }`}
            >
              Time Recency
            </button>
            <button
              onClick={() => setSortBy('esi')}
              className={`px-4 py-1 rounded-md text-xs font-semibold transition-all duration-200 ${
                sortBy === 'esi'
                  ? 'bg-error text-white shadow-sm'
                  : 'text-on-surface-variant hover:bg-surface-variant'
              }`}
            >
              Severity Index (ESI)
            </button>
          </div>
        </div>

      </div>

      {/* Info Message Box explaining ESI */}
      <div className="bg-primary/5 border border-primary/15 rounded-lg p-3 text-xs text-on-surface-variant flex items-start gap-2 shrink-0">
        <span className="material-symbols-outlined text-primary text-[16px] mt-0.5">info</span>
        <p>
          <strong>Excursion Severity Index (ESI) formula:</strong> `Deviation Magnitude (°C/%) × Duration (mins)`. Sorting by **Severity Index** ranks high-risk, long-duration temperature breaches (e.g. Room B) above minor, short-lived spikes (e.g. Room A) regardless of timestamp.
        </p>
      </div>

      {/* Data Table Card */}
      <div className="bg-white rounded-xl border border-outline-variant flex flex-col flex-1 min-h-0 shadow-sm">
        {/* Table Container */}
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-low sticky top-0 z-10 border-b border-outline-variant">
              <tr>
                <th className="py-4 px-6 font-headline-md text-xs font-bold text-on-surface uppercase tracking-wider">Alert ID</th>
                <th className="py-4 px-6 font-headline-md text-xs font-bold text-on-surface uppercase tracking-wider">Sensor ID</th>
                <th className="py-4 px-6 font-headline-md text-xs font-bold text-on-surface uppercase tracking-wider">Storage Location</th>
                <th className="py-4 px-6 font-headline-md text-xs font-bold text-on-surface uppercase tracking-wider">Trigger Time</th>
                <th className="py-4 px-6 font-headline-md text-xs font-bold text-on-surface text-center uppercase tracking-wider">Duration</th>
                <th className="py-4 px-6 font-headline-md text-xs font-bold text-on-surface text-center uppercase tracking-wider">Deviation Magnitude</th>
                <th className="py-4 px-6 font-headline-md text-xs font-bold text-on-surface text-center uppercase tracking-wider bg-error/5">Severity Index (ESI)</th>
                <th className="py-4 px-6 font-headline-md text-xs font-bold text-on-surface uppercase tracking-wider text-center">Neighbour Validation</th>
                <th className="py-4 px-6 font-headline-md text-xs font-bold text-on-surface uppercase tracking-wider text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant font-body-md text-sm text-on-surface-variant">
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {[...Array(9)].map((_, j) => (
                      <td key={j} className="py-4 px-6">
                        <div className="h-4 bg-outline-variant rounded w-3/4"></div>
                      </td>
                    ))}
                  </tr>
                ))
              ) : currentItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-on-surface-variant italic">
                    No alert logs found matching search criteria.
                  </td>
                </tr>
              ) : (
                currentItems.map((alert) => {
                  const isTempParam = alert.param === 'Temperature';
                  const isHumParam = alert.param === 'Humidity';
                  
                  return (
                    <tr key={alert.id} className="hover:bg-surface-variant/20 transition-colors">
                      <td className="py-3 px-6 font-mono text-xs font-bold text-on-surface">{alert.id}</td>
                      <td className="py-3 px-6 font-semibold text-primary">{alert.sensor}</td>
                      
                      {/* Storage Location column (New Feature) */}
                      <td className="py-3 px-6 text-xs text-on-surface flex items-center gap-1 mt-2">
                        <span className="material-symbols-outlined text-[14px] text-secondary">location_on</span>
                        {alert.location || 'Cold Room'}
                      </td>
                      
                      <td className="py-3 px-6 text-xs">{alert.time}</td>
                      <td className="py-3 px-6 text-center font-mono font-medium">{alert.duration || 0} mins</td>
                      
                      {/* Deviation column */}
                      <td className="py-3 px-6 text-center">
                        <div className={`flex items-center justify-center gap-0.5 font-bold ${
                          isTempParam ? 'text-status-error' : 'text-status-success'
                        }`}>
                          +{alert.deviation || 0}{isTempParam ? '°C' : '%'}
                          {alert.arrow === 'upward' && (
                            <span className="material-symbols-outlined text-[16px] text-status-error font-black">arrow_upward</span>
                          )}
                          {alert.arrow === 'downward' && (
                            <span className="material-symbols-outlined text-[16px] text-status-error font-black">arrow_downward</span>
                          )}
                        </div>
                      </td>

                      {/* ESI score display */}
                      <td className="py-3 px-6 text-center font-bold text-error bg-error/5 text-base font-mono">
                        {alert.esiScore}
                      </td>
                      {/* Neighbour Validation Column */}
                      <td className="py-3 px-6 text-center text-xs">
                        <span className={`px-2.5 py-0.5 rounded font-bold ${
                          alert.validationVerdict === 'Sensor Fault (Mismatched)'
                            ? 'bg-yellow-500/20 text-yellow-800 border border-yellow-500/25'
                            : alert.validationVerdict === 'Excursion (Verified)'
                            ? 'bg-error-container text-error font-extrabold animate-pulse'
                            : 'bg-primary/10 text-primary border border-primary/20'
                        }`}>
                          {alert.validationVerdict === 'Sensor Fault (Mismatched)' ? '⚠️ Sensor Fault' : alert.validationVerdict === 'Excursion (Verified)' ? '🚨 Verified Excursion' : 'ℹ️ Isolated'}
                        </span>
                      </td>

                      <td className="py-3 px-6 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          alert.state === 'unacknowledged' ? 'bg-error-container text-on-error-container animate-pulse' : 'bg-surface-variant text-on-surface-variant'
                        }`}>
                          {alert.state}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="border-t border-outline-variant p-4 flex justify-center items-center gap-2 bg-surface-container-lowest rounded-b-xl shrink-0">
          <button 
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1 || loading}
            className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-variant transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-sm">keyboard_double_arrow_left</span>
          </button>
          
          <button 
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1 || loading}
            className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-variant transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-sm">chevron_left</span>
          </button>

          {[...Array(totalPages)].map((_, i) => {
            const pageNum = i + 1;
            return (
              <button
                key={pageNum}
                onClick={() => handlePageChange(pageNum)}
                className={`w-8 h-8 rounded-full text-xs font-bold transition-all duration-150 ${
                  currentPage === pageNum
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-variant'
                }`}
              >
                {pageNum}
              </button>
            );
          })}

          <button 
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages || loading}
            className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-variant transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-sm">chevron_right</span>
          </button>
          
          <button 
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages || loading}
            className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-variant transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-sm">keyboard_double_arrow_right</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlertsView;
