import React, { useState, useEffect } from 'react';
import { apiService } from '../../api/apiService';
import { useHealthScore } from '../../hooks/useHealthScore';
import HealthScoreCard from '../widgets/HealthScoreCard';
import TrendChart from '../widgets/TrendChart';

export const ExecHome = () => {
  const [groups, setGroups] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState('all');
  const [dateRange, setDateRange] = useState('90'); // '30' | '90' | '180' | 'custom'
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const res = await apiService.getGroups();
        setGroups(res);
      } catch (err) {
        console.error('Failed to load groups for filters', err);
      }
    };
    fetchGroups();
  }, []);

  const { roomScores, loading } = useHealthScore(selectedRoom);

  // Compute days count based on date range selection
  let daysCount = 90;
  if (dateRange === 'custom') {
    if (customStart && customEnd) {
      const start = new Date(customStart);
      const end = new Date(customEnd);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      daysCount = Math.max(2, diffDays || 90);
    }
  } else {
    daysCount = parseInt(dateRange, 10);
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-8">
      {/* Page Header */}
      <div>
        <h1 className="font-headline-lg text-headline-lg text-on-surface">Executive Overview</h1>
        <p className="text-xs text-on-surface-variant mt-1">
          High-level rolled-up facility status, performance trends, and room health compliance.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-outline-variant rounded-2xl p-5 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          {/* Room Selector */}
          <div className="flex flex-col w-full sm:w-64">
            <label className="text-[10px] font-bold uppercase tracking-wider text-secondary mb-1">
              Select Scope
            </label>
            <select
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value)}
              className="w-full px-3 py-2 border border-outline-variant bg-surface rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Rooms ( facility rollup )</option>
              {groups.map(g => (
                <option key={g.name} value={g.name}>{g.location || g.name}</option>
              ))}
            </select>
          </div>

          {/* Date Selector */}
          <div className="flex flex-col w-full sm:w-48">
            <label className="text-[10px] font-bold uppercase tracking-wider text-secondary mb-1">
              Date Range
            </label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full px-3 py-2 border border-outline-variant bg-surface rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
              <option value="180">Last 180 Days</option>
              <option value="custom">Custom Range...</option>
            </select>
          </div>
        </div>

        {/* Custom Range Inputs */}
        {dateRange === 'custom' && (
          <div className="flex gap-3 w-full md:w-auto items-center animate-fadeIn">
            <div className="flex flex-col w-1/2 md:w-32">
              <label className="text-[9px] font-bold uppercase text-secondary mb-0.5">Start Date</label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-full px-2 py-1.5 border border-outline-variant rounded-md text-xs font-mono font-semibold"
              />
            </div>
            <span className="text-secondary text-xs mt-4">to</span>
            <div className="flex flex-col w-1/2 md:w-32">
              <label className="text-[9px] font-bold uppercase text-secondary mb-0.5">End Date</label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-full px-2 py-1.5 border border-outline-variant rounded-md text-xs font-mono font-semibold"
              />
            </div>
          </div>
        )}
      </div>

      {/* Main Grid: Score Card & Line Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5">
          <HealthScoreCard selectedRoom={selectedRoom} />
        </div>
        <div className="lg:col-span-7">
          <TrendChart selectedRoom={selectedRoom} daysCount={daysCount} roomScores={roomScores} />
        </div>
      </div>

      {/* Room Ranking Table */}
      <div className="bg-white border border-outline-variant rounded-2xl p-6 shadow-md">
        <div className="flex justify-between items-center border-b border-outline-variant/30 pb-3 mb-4">
          <div>
            <h3 className="font-bold text-sm text-primary">Room Performance Standings</h3>
            <p className="text-xs text-on-surface-variant">Active rankings, sorted best-performing first</p>
          </div>
          <span className="text-[10px] text-secondary font-bold uppercase tracking-wider">
            Total Monitored: {roomScores.length} Rooms
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-surface-container-low text-secondary uppercase font-bold border-b border-outline-variant">
                <th className="py-3 px-4 text-left">Room / Facility Unit</th>
                <th className="py-3 px-4 text-center font-mono">Health Score</th>
                <th className="py-3 px-4 text-center font-mono">Verified Compliance</th>
                <th className="py-3 px-4 text-center font-mono">Active Coverage</th>
                <th className="py-3 px-4 text-center font-mono">Severity Clearance</th>
                <th className="py-3 px-4 text-center font-mono">Active ESI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant font-medium text-on-surface">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-6 text-center text-on-surface-variant italic">
                    Recalculating room metrics...
                  </td>
                </tr>
              ) : roomScores.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-6 text-center text-on-surface-variant italic">
                    No active rooms registered.
                  </td>
                </tr>
              ) : (
                [...roomScores].sort((a, b) => b.healthScore - a.healthScore).map((room, idx) => {
                  const isWorst = roomScores[0]?.groupId === room.groupId;
                  const isBest = idx === 0 && room.healthScore >= 90.0;
                  return (
                    <tr 
                      key={room.groupId} 
                      className={`hover:bg-surface-container-low transition-colors ${
                        isWorst ? 'bg-red-50/20' : isBest ? 'bg-green-50/20' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 font-bold flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[15px] text-secondary">meeting_room</span>
                        <span>{room.roomName}</span>
                        {isWorst && (
                          <span className="px-1.5 py-0.5 bg-red-100 text-red-800 text-[8px] font-bold rounded uppercase tracking-wider animate-pulse">
                            Worst Performer
                          </span>
                        )}
                        {isBest && (
                          <span className="px-1.5 py-0.5 bg-green-100 text-green-800 text-[8px] font-bold rounded uppercase tracking-wider">
                            Best Performer
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-black text-sm">
                        <span className={room.healthScore >= 90 ? 'text-green-600' : room.healthScore >= 70 ? 'text-yellow-600' : 'text-red-600'}>
                          {room.healthScore.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono">{room.verifiedCompliancePct.toFixed(1)}%</td>
                      <td className="py-3.5 px-4 text-center font-mono">{room.coveragePct.toFixed(1)}%</td>
                      <td className="py-3.5 px-4 text-center font-mono">{room.severityClearance.toFixed(1)}%</td>
                      <td className={`py-3.5 px-4 text-center font-mono font-bold ${
                        room.totalSeverity > 0 ? 'text-error' : 'text-on-surface-variant'
                      }`}>
                        {room.totalSeverity.toFixed(1)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ExecHome;
