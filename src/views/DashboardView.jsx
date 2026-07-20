import React, { useState, useEffect } from 'react';
import { apiService } from '../api/apiService';

const DashboardView = ({ onNavigate, currentUser }) => {
  const [sensors, setSensors] = useState([]);
  const [gateways, setGateways] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [trendWarnings, setTrendWarnings] = useState([]);
  const [batteryProjections, setBatteryProjections] = useState([]);
  const [loading, setLoading] = useState(true);

  // Personal Notes States
  const [notes, setNotes] = useState([]);
  const [newNoteText, setNewNoteText] = useState('');
  const [priority, setPriority] = useState('medium');
  const [remindOnLogin, setRemindOnLogin] = useState(true);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [noteFilter, setNoteFilter] = useState('active'); // 'active' | 'completed' | 'all'

  // Load notes on mount / user change
  useEffect(() => {
    if (!currentUser) return;
    const key = `thinxsense_personal_notes_${currentUser.username}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      setNotes(JSON.parse(stored));
    } else {
      // Pre-seed notes for demonstration
      let initial = [];
      if (currentUser.username === 'shwetha') {
        initial = [
          {
            id: 1,
            text: 'Double-check Cold Room 3 temperature readings at 10:00 AM.',
            priority: 'high',
            remindOnLogin: true,
            completed: false,
            createdAt: new Date(Date.now() - 2 * 3600000).toISOString()
          },
          {
            id: 2,
            text: 'Reboot Gateway GGWCL00060 if it remains offline.',
            priority: 'medium',
            remindOnLogin: true,
            completed: false,
            createdAt: new Date(Date.now() - 4 * 3600000).toISOString()
          },
          {
            id: 3,
            text: 'Prepare shift report for weekly review.',
            priority: 'low',
            remindOnLogin: false,
            completed: true,
            createdAt: new Date(Date.now() - 24 * 3600000).toISOString()
          }
        ];
      } else if (currentUser.username === 'rajesh') {
        initial = [
          {
            id: 1,
            text: 'Inspect BLE sensor battery levels on Rack 2.',
            priority: 'medium',
            remindOnLogin: true,
            completed: false,
            createdAt: new Date(Date.now() - 1 * 3600000).toISOString()
          },
          {
            id: 2,
            text: 'Acknowledge the environmental excursion alarm for Room 2.',
            priority: 'high',
            remindOnLogin: true,
            completed: false,
            createdAt: new Date(Date.now() - 3 * 3600000).toISOString()
          }
        ];
      }
      setNotes(initial);
      localStorage.setItem(key, JSON.stringify(initial));
    }
  }, [currentUser]);

  const saveNotes = (updatedNotes) => {
    setNotes(updatedNotes);
    if (currentUser) {
      localStorage.setItem(`thinxsense_personal_notes_${currentUser.username}`, JSON.stringify(updatedNotes));
    }
  };

  const handleAddNote = (e) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    const newNote = {
      id: Date.now(),
      text: newNoteText.trim(),
      priority,
      remindOnLogin,
      completed: false,
      createdAt: new Date().toISOString()
    };

    const updated = [newNote, ...notes];
    saveNotes(updated);
    setNewNoteText('');
    setPriority('medium');
    setRemindOnLogin(true);
  };

  const handleToggleComplete = (id) => {
    const updated = notes.map(n => n.id === id ? { ...n, completed: !n.completed } : n);
    saveNotes(updated);
  };

  const handleDeleteNote = (id) => {
    const updated = notes.filter(n => n.id !== id);
    saveNotes(updated);
  };

  const handleStartEdit = (note) => {
    setEditingNoteId(note.id);
    setEditingText(note.text);
  };

  const handleSaveEdit = (id) => {
    if (!editingText.trim()) return;
    const updated = notes.map(n => n.id === id ? { ...n, text: editingText.trim() } : n);
    saveNotes(updated);
    setEditingNoteId(null);
  };

  const handleCancelEdit = () => {
    setEditingNoteId(null);
  };

  const filteredNotes = React.useMemo(() => {
    return notes.filter(note => {
      if (noteFilter === 'active') return !note.completed;
      if (noteFilter === 'completed') return note.completed;
      return true;
    });
  }, [notes, noteFilter]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [sensorsRes, gatewaysRes, alertsRes] = await Promise.all([
        apiService.getSensors(),
        apiService.getGateways(),
        apiService.getAlerts({ state: 'unacknowledged' })
      ]);
      
      // Displays online H9B series and offline BRR sensors with physical locations
      setSensors(sensorsRes.slice(0, 6)); 
      setGateways(gatewaysRes);
      
      // Filter predictions
      const trends = sensorsRes.filter(s => s.isTrendBreachRisk);
      const battProjs = [
        ...sensorsRes.filter(s => s.isBatterySwapRisk).map(s => ({
          id: s.id,
          type: 'sensor',
          days: s.batteryDaysRemaining,
          location: s.facilityLocation && s.facilityLocation !== 'Not Specified' ? `${s.facilityLocation}, ${s.location}` : s.location,
          level: s.batt
        })),
        ...gatewaysRes.filter(g => g.isBatterySwapRisk).map(g => ({
          id: g.id,
          type: 'gateway',
          days: g.batteryDaysRemaining,
          location: 'Gateway Node',
          level: parseInt(g.properties.Battery) || 16
        }))
      ].sort((a, b) => a.days - b.days);

      setTrendWarnings(trends);
      setBatteryProjections(battProjs);

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
      const sortedAlerts = alertsWithEsi.sort((a, b) => b.esiScore - a.esiScore);

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

      {/* Proactive Diagnostics, Predictive swaps & Personal Notes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Trend Warning Card */}
        <div className="bg-white border border-outline-variant rounded-xl p-5 shadow-sm flex flex-col justify-between min-h-[340px]">
          <h3 className="font-bold text-sm text-primary mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-orange-500 font-bold">trending_up</span>
            Early Warning: Temperature Trend Risks
          </h3>
          <div className="flex-1 space-y-3 overflow-y-auto max-h-[220px] pr-1 scrollbar-thin">
            {loading ? (
              <div className="animate-pulse space-y-2 py-1">
                <div className="h-10 bg-outline-variant rounded w-full"></div>
              </div>
            ) : trendWarnings.length === 0 ? (
              <p className="text-xs text-on-surface-variant italic py-2">No sensors showing climbing temperature breach risks.</p>
            ) : (
              trendWarnings.map(sensor => (
                <div key={sensor.id} className="p-3 bg-orange-50/50 border border-orange-200/50 rounded-lg flex items-center justify-between hover:bg-orange-50 transition-colors">
                  <div className="text-xs">
                    <button 
                      onClick={() => onNavigate('sensors', sensor.id)}
                      className="font-bold text-primary hover:underline block text-left focus:outline-none"
                    >
                      {sensor.id} (Group: {sensor.group})
                    </button>
                    <span className="text-on-surface-variant block mt-0.5 text-[10px]">
                      📍 {sensor.facilityLocation && sensor.facilityLocation !== 'Not Specified' ? `${sensor.facilityLocation}, ${sensor.location}` : sensor.location}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-orange-600 block text-xs">+{sensor.slope}°C/hr</span>
                    <span className="text-[10px] text-orange-500 font-semibold block mt-0.5">Breaches in ~{sensor.projectedHoursToBreach} hrs ({sensor.temp}°C)</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Battery Swap Projections Card */}
        <div className="bg-white border border-outline-variant rounded-xl p-5 shadow-sm flex flex-col justify-between min-h-[340px]">
          <h3 className="font-bold text-sm text-primary mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-red-500 font-bold">battery_alert</span>
            Predictive swaps: Approaching Depletion
          </h3>
          <div className="flex-1 space-y-3 overflow-y-auto max-h-[220px] pr-1 scrollbar-thin">
            {loading ? (
              <div className="animate-pulse space-y-2 py-1">
                <div className="h-10 bg-outline-variant rounded w-full"></div>
              </div>
            ) : batteryProjections.length === 0 ? (
              <p className="text-xs text-on-surface-variant italic py-2">No units forecasting battery depletion within 5 days.</p>
            ) : (
              batteryProjections.map(proj => (
                <div key={proj.id} className="p-3 bg-red-50/50 border border-red-200/50 rounded-lg flex items-center justify-between hover:bg-red-50 transition-colors">
                  <div className="text-xs">
                    <button 
                      onClick={() => onNavigate(proj.type === 'sensor' ? 'sensors' : 'gateways', proj.id)}
                      className="font-bold text-primary hover:underline block text-left focus:outline-none"
                    >
                      {proj.id} ({proj.type === 'sensor' ? 'Sensor' : 'Gateway'})
                    </button>
                    <span className="text-on-surface-variant block mt-0.5 text-[10px]">
                      📍 {proj.location}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-red-600 block text-xs">🔋 {proj.level}% Remaining</span>
                    <span className="text-[10px] text-red-500 font-semibold block mt-0.5">Depleted in ~{proj.days} days</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Personal Notes & Checklist Card */}
        <div className="bg-white border border-outline-variant rounded-xl p-5 shadow-sm flex flex-col justify-between min-h-[340px]">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-sm text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-primary font-bold">push_pin</span>
              My Notes & Reminders
            </h3>
            <span className="text-[10px] bg-primary text-white px-2 py-0.5 rounded-full font-bold">
              {notes.filter(n => !n.completed).length} Active
            </span>
          </div>

          {/* Quick Filters */}
          <div className="flex gap-2 mb-3 text-[10px] border-b border-outline-variant/40 pb-2">
            {['active', 'completed', 'all'].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setNoteFilter(f)}
                className={`capitalize font-bold px-2 py-0.5 rounded-full border transition-all ${
                  noteFilter === f
                    ? 'bg-primary border-primary text-white shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-700'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* List area */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 mb-3 max-h-[160px] scrollbar-thin">
            {filteredNotes.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs italic">
                {noteFilter === 'active' 
                  ? 'No pending reminders. Write one below!' 
                  : noteFilter === 'completed' 
                  ? 'No completed tasks yet.' 
                  : 'Your reminders list is empty.'}
              </div>
            ) : (
              filteredNotes.map(note => {
                const isEditing = editingNoteId === note.id;
                return (
                  <div 
                    key={note.id} 
                    className={`group flex items-start gap-2.5 p-2.5 rounded-lg border transition-all duration-200 ${
                      note.completed 
                        ? 'bg-slate-50/70 border-slate-100/80 opacity-70' 
                        : 'bg-white border-outline-variant/50 hover:border-primary/40'
                    }`}
                  >
                    {/* Checkbox */}
                    <button
                      type="button"
                      onClick={() => handleToggleComplete(note.id)}
                      className="mt-0.5 shrink-0 text-slate-400 hover:text-primary transition-colors flex items-center justify-center focus:outline-none"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {note.completed ? 'check_box' : 'check_box_outline_blank'}
                      </span>
                    </button>

                    {/* Note Content */}
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="flex items-center gap-1.5 w-full">
                          <input
                            type="text"
                            value={editingText}
                            onChange={e => setEditingText(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSaveEdit(note.id)}
                            className="flex-1 px-2 py-1 text-xs border border-primary rounded focus:outline-none bg-white font-body-md"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(note.id)}
                            className="p-1 text-status-success hover:bg-slate-50 rounded"
                          >
                            <span className="material-symbols-outlined text-[14px]">done</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="p-1 text-slate-400 hover:bg-slate-50 rounded"
                          >
                            <span className="material-symbols-outlined text-[14px]">close</span>
                          </button>
                        </div>
                      ) : (
                        <div>
                          <p className={`text-xs text-on-surface leading-snug break-words font-body-md ${note.completed ? 'line-through text-slate-400' : 'font-semibold'}`}>
                            {note.text}
                          </p>
                          {/* Badges footer */}
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase font-status-label ${
                              note.priority === 'high' 
                                ? 'bg-red-50 text-red-600 border border-red-200/50' 
                                : note.priority === 'medium'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200/50'
                                : 'bg-blue-50 text-blue-600 border border-blue-200/50'
                            }`}>
                              {note.priority}
                            </span>
                            {note.remindOnLogin && (
                              <span className="flex items-center gap-0.5 text-[8px] text-amber-600 font-bold bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded">
                                <span className="material-symbols-outlined text-[10px]">notifications_active</span>
                                On Login
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action buttons (Visible on hover) */}
                    {!isEditing && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(note)}
                          className="p-0.5 text-slate-400 hover:text-primary rounded hover:bg-slate-50"
                          title="Edit Note"
                        >
                          <span className="material-symbols-outlined text-[14px]">edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteNote(note.id)}
                          className="p-0.5 text-slate-400 hover:text-error rounded hover:bg-slate-50"
                          title="Delete Note"
                        >
                          <span className="material-symbols-outlined text-[14px]">delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Add form */}
          <form onSubmit={handleAddNote} className="space-y-2 mt-auto border-t border-outline-variant/40 pt-3 shrink-0">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newNoteText}
                onChange={e => setNewNoteText(e.target.value)}
                placeholder="Add a note for yourself..."
                className="flex-1 px-3 py-2 border border-outline-variant rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary bg-slate-50/50 focus:bg-white transition-all font-body-md"
              />
              <button
                type="submit"
                disabled={!newNoteText.trim()}
                className="p-2 bg-primary text-white rounded-lg hover:bg-primary/95 transition-colors disabled:opacity-50 flex items-center justify-center shrink-0"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
              </button>
            </div>
            
            {/* Inline controls */}
            <div className="flex items-center justify-between text-[10px] text-slate-500 pl-1">
              <div className="flex items-center gap-2 font-body-md">
                <span>Priority:</span>
                <select
                  value={priority}
                  onChange={e => setPriority(e.target.value)}
                  className="bg-transparent font-bold text-slate-700 outline-none cursor-pointer focus:underline"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <label className="flex items-center gap-1 cursor-pointer select-none font-body-md">
                <input
                  type="checkbox"
                  checked={remindOnLogin}
                  onChange={e => setRemindOnLogin(e.target.checked)}
                  className="rounded text-primary focus:ring-primary w-3 h-3 cursor-pointer"
                />
                <span className="font-semibold text-slate-600">Remind on Login</span>
              </label>
            </div>
          </form>
        </div>
      </div>

      {/* ESI Evaluation Explanation Panel (New Feature Showcase) */}
      <div className="bg-white border border-outline-variant rounded-xl p-5 shadow-sm">
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
            <div className="flex items-center gap-2">
              <h2 className="font-headline-md text-headline-md font-bold">Active Sensors</h2>
              <button 
                onClick={() => onNavigate('sensors')} 
                className="text-xs text-primary hover:underline font-semibold flex items-center gap-0.5 ml-2 focus:outline-none"
                title="Go to Sensors Page"
              >
                <span>View All</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </button>
            </div>
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
                        <button 
                          onClick={() => onNavigate('sensors', sensor.id)}
                          className="font-label-sm text-sm text-primary hover:underline font-bold text-left block focus:outline-none"
                          title="Inspect Sensor Validation Details"
                        >
                          {sensor.id}
                        </button>
                        {/* Physical Location Tag (New Feature) */}
                        <div className="text-[10px] text-secondary flex items-center gap-0.5 mt-0.5" title={(sensor.facilityLocation && sensor.facilityLocation !== 'Not Specified') ? `${sensor.facilityLocation}, ${sensor.location || ''}` : (sensor.location || 'Storage Facility')}>
                          <span className="material-symbols-outlined text-[12px]">location_on</span>
                          {(sensor.facilityLocation && sensor.facilityLocation !== 'Not Specified') ? `${sensor.facilityLocation}, ${sensor.location || ''}` : (sensor.location || 'Storage Facility')}
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
          <div className="px-6 py-4 border-b border-outline-variant bg-surface flex justify-between items-center">
            <h2 className="font-headline-md text-headline-md font-bold">Gateway Status</h2>
            <button 
              onClick={() => onNavigate('gateways')} 
              className="text-xs text-primary hover:underline font-semibold flex items-center gap-0.5 focus:outline-none"
              title="Go to Gateways Page"
            >
              <span>View All</span>
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </button>
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
                    <button 
                      onClick={() => onNavigate('gateways', gw.id)}
                      className="font-label-sm text-sm font-bold text-primary hover:underline text-left block focus:outline-none"
                      title="Inspect Gateway Properties"
                    >
                      {gw.id}
                    </button>
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
            <div className="flex items-center gap-2">
              <h2 className="font-headline-md text-headline-md text-error font-bold flex items-center gap-2">
                <span className="material-symbols-outlined fill text-error animate-pulse">report</span>
                Active Excursions (Sorted by Severity Index)
              </h2>
              <button 
                onClick={() => onNavigate('alerts')} 
                className="text-xs text-primary hover:underline font-semibold flex items-center gap-0.5 ml-2 focus:outline-none"
                title="Go to Alerts Log Page"
              >
                <span>View All Logs</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </button>
            </div>
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
                      <td className="py-3 px-6 font-mono text-xs font-bold">
                        <button 
                          onClick={() => onNavigate('alerts')}
                          className="text-primary hover:underline font-bold focus:outline-none"
                          title="Go to Alerts Page"
                        >
                          {alert.id}
                        </button>
                      </td>
                      <td className="py-3 px-6 font-bold text-on-surface">{alert.room || 'Storage Facility'}</td>
                      <td className="py-3 px-6 font-semibold text-primary">
                        <button 
                          onClick={() => onNavigate('sensors', alert.sensor)}
                          className="text-primary hover:underline font-bold focus:outline-none"
                          title="Inspect Sensor Validation Details"
                        >
                          {alert.sensor}
                        </button>
                      </td>
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
