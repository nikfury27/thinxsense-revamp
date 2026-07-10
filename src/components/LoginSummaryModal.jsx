import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Chart, registerables } from 'chart.js';
import {
  initialSensors,
  initialAlerts,
  initialGroups,
} from '../api/mockData';

// Register Chart.js elements
Chart.register(...registerables);

// ─── Per-user handover note store (module-level, survives re-renders) ─────────
// Keyed by the user who RECEIVES the note (i.e. the one logging in).
// Populated when the previous user submits their logout handover.
export const handoverNoteStore = {
  // shwetha logs in → she sees Rajesh's note (pre-seeded for POC)
  shwetha: {
    from: 'Rajesh K',
    fromInitials: 'R',
    shift: 'Night Shift · 21:30 – 06:30',
    leftAt: '06:28 AM',
    note: 'Compressor in Cold Room 3 restarted around 2:10 AM. Temperature is slowly returning to normal — currently at 24.1°C and dropping. Maintenance has been informed and will inspect at 9:00 AM. Please continue monitoring Room 3 closely.\n\nGateway GGWCL00060 went offline at 4:26 AM, data is buffered locally — needs manual reboot on Rack 1.\n\nH9B00045 in Cold Room 2 is still showing elevated readings (31.2°C). Based on neighbour comparison with H9B00046 (24.1°C) and H9B00047 (23.8°C), this appears to be a sensor fault rather than a room-wide excursion.',
  },
  // rajesh logs in → no note left by shwetha yet (she hasn't logged out)
  rajesh: null,
};

// ─── Derive live data from mockData ──────────────────────────────────────────
const groupMap = Object.fromEntries(initialGroups.map(g => [g.name, g.location]));

// Sensors currently in warning state → active excursions
const ACTIVE_EXCURSIONS = initialSensors
  .filter(s => s.status === 'warning')
  .map(s => ({
    id: s.id,
    temp: `${s.temp}°C`,
    location: s.location,
    group: groupMap[s.group] ?? s.group,
    batt: s.batt,
    esi: s.status === 'warning'
      ? parseFloat(((s.temp - 25) * 45).toFixed(1))
      : 0,
  }));

// Sensors currently offline
const OFFLINE_SENSORS = initialSensors
  .filter(s => s.status === 'offline')
  .map(s => ({
    id: s.id,
    location: s.location,
    group: `${s.group} · ${groupMap[s.group] ?? ''}`,
    lastSeen: s.lastSeen,
    lastReading: `${s.temp}°C`,
  }));

// Battery warnings (batt ≤ 15% or dailyDrainRate high)
const BATTERY_WARNINGS = initialSensors
  .filter(s => {
    const days = Math.round(s.batt / (s.dailyDrainRate || 1.5));
    return days <= 5;
  })
  .map(s => ({
    id: s.id,
    batt: s.batt,
    daysLeft: Math.round(s.batt / (s.dailyDrainRate || 1.5)),
    location: groupMap[s.group] ?? s.group,
  }));

// Alerts from mockData — enrich with ESI
const ALERTS = initialAlerts.map(a => ({
  ...a,
  val: a.param === 'Temperature' ? `${a.val}°C`
     : a.param === 'Humidity'    ? `${a.val}%`
     : a.val,
  esi: a.param === 'Temperature' && a.deviation
    ? parseFloat((a.deviation * (a.duration || 0)).toFixed(1))
    : 0,
}));

const highestEsi = Math.max(...ALERTS.map(a => a.esi), 0);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const timeAway = (from, to) => {
  const m = Math.floor((new Date(to) - new Date(from)) / 60000);
  const h = Math.floor(m / 60), mins = m % 60;
  if (h === 0) return `${mins} Minutes`;
  if (mins === 0) return `${h} Hour${h !== 1 ? 's' : ''}`;
  return `${h} Hour${h !== 1 ? 's' : ''} ${mins} Minute${mins !== 1 ? 's' : ''}`;
};

const fmtDT = (iso) => {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }),
    time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
};

// ─── Sub-components ───────────────────────────────────────────────────────────
const Stat = ({ label, value, color = 'text-on-surface' }) => (
  <div className="flex flex-col items-center justify-center bg-slate-50 rounded-xl p-2 gap-0.5 border border-slate-100 shadow-sm flex-1">
    <span className={`text-base md:text-lg font-black font-mono tracking-tight ${color}`}>{value}</span>
    <span className="text-[9px] font-bold text-secondary text-center leading-none truncate w-full">{label}</span>
  </div>
);

const Section = ({ icon, title, children }) => (
  <div className="space-y-2">
    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-secondary">
      <span className="material-symbols-outlined text-[14px]">{icon}</span>
      {title}
    </div>
    {children}
  </div>
);

const AlertRow = ({ a }) => {
  const active = a.state === 'unacknowledged';
  return (
    <div className={`flex items-start gap-3 p-2.5 rounded-xl border text-xs transition-all ${
      active 
        ? 'bg-red-50/30 border-red-100/70 text-on-surface'
        : 'bg-slate-50/40 border-slate-100 text-secondary'
    }`}>
      <span className={`material-symbols-outlined text-[16px] mt-0.5 shrink-0 ${active ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}>
        {active ? 'warning' : 'check_circle'}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-on-surface">{a.sensor}</span>
          <span className="text-secondary/70">·</span>
          <span className="text-secondary/80 truncate font-medium">{a.location}</span>
          {a.esi > 0 && (
            <span className="ml-auto bg-red-100 text-red-700 font-bold text-[8px] px-1.5 py-0.5 rounded">
              ESI {a.esi}
            </span>
          )}
        </div>
        <div className="text-secondary/80 text-[10px] mt-0.5">
          {a.param} · {a.val} · {a.time}
        </div>
      </div>
      <span className={`shrink-0 px-2 py-0.5 rounded text-[8px] font-extrabold uppercase leading-none tracking-wider ${
        active ? 'bg-red-200 text-red-800' : 'bg-slate-200 text-slate-600'
      }`}>
        {active ? 'Active' : 'Resolved'}
      </span>
    </div>
  );
};

const ExcursionRow = ({ s }) => (
  <div className="flex items-start justify-between gap-2.5 p-2.5 rounded-xl border bg-red-50/60 border-red-100/80 text-xs text-red-800 transition-all hover:bg-red-50">
    <div className="flex items-start gap-2 min-w-0">
      <span className="material-symbols-outlined text-[16px] text-red-500 shrink-0 mt-0.5">device_thermostat</span>
      <div className="min-w-0">
        <div className="font-extrabold text-red-900 truncate">{s.id}</div>
        <div className="text-[10px] text-red-600/80 font-medium truncate">{s.location} · {s.group}</div>
      </div>
    </div>
    <div className="text-right shrink-0 flex flex-col items-end gap-1">
      <span className="font-bold text-red-900">{s.temp}</span>
      <span className="bg-red-500 text-white font-black text-[8px] px-1.5 py-0.5 rounded-full leading-none">ESI {s.esi}</span>
    </div>
  </div>
);

const BatteryRow = ({ s }) => (
  <div className="flex items-start justify-between gap-2.5 p-2.5 rounded-xl border bg-amber-50/60 border-amber-100/80 text-xs text-amber-800 transition-all hover:bg-amber-50">
    <div className="flex items-start gap-2 min-w-0">
      <span className="material-symbols-outlined text-[16px] text-amber-600 shrink-0 mt-0.5">battery_alert</span>
      <div className="min-w-0">
        <div className="font-extrabold text-amber-950 truncate">{s.id}</div>
        <div className="text-[10px] text-amber-600/80 font-medium truncate">{s.location}</div>
      </div>
    </div>
    <div className="text-right shrink-0 flex flex-col items-end gap-1">
      <span className="font-bold text-amber-950">{s.batt}%</span>
      <span className="bg-amber-500 text-white font-black text-[8px] px-1.5 py-0.5 rounded-full leading-none">Swap in {s.daysLeft}d</span>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const LoginSummaryModal = ({ onDismiss, currentUser }) => {
  const [tab, setTab] = useState('overview');

  const last    = fmtDT(currentUser.lastLogoutAt);
  const current = fmtDT(currentUser.currentLoginAt);
  const away    = timeAway(currentUser.lastLogoutAt, currentUser.currentLoginAt);

  const activeAlerts   = ALERTS.filter(a => a.state === 'unacknowledged');
  const resolvedAlerts = ALERTS.filter(a => a.state === 'acknowledged');

  // Warning Sensors for the Trend Graph
  const warningSensors = initialSensors.filter(s => s.status === 'warning');
  const [selectedSensorId, setSelectedSensorId] = useState(warningSensors[0]?.id || initialSensors[0]?.id);
  const selectedSensor = initialSensors.find(s => s.id === selectedSensorId) || initialSensors[0];

  const history = useMemo(() => selectedSensor?.history || [], [selectedSensor]);

  // Per-user handover note — null means no note was left
  const handoverNote = handoverNoteStore[currentUser.username] ?? null;
  const hasNote = !!handoverNote;

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'alerts',   label: `Alerts (${ALERTS.length})` },
    { id: 'offline',  label: `Offline (${OFFLINE_SENSORS.length})` },
    { id: 'issues',   label: `Issues (${ACTIVE_EXCURSIONS.length + BATTERY_WARNINGS.length})` },
    { id: 'handover', label: 'Handover', badge: hasNote },
  ];

  // Calculate Away Period Hours
  const awayHours = Math.min(24, (new Date(currentUser.currentLoginAt) - new Date(currentUser.lastLogoutAt)) / 3600000);

  // Selected Sensor Trend Metrics
  const temps = history.map(h => h.temp);
  const avgTemp = (temps.reduce((acc, c) => acc + c, 0) / (temps.length || 1)).toFixed(1);
  const peakTemp = Math.max(...temps, 0).toFixed(1);
  const breachHours = history.filter(h => h.temp > 25).length;

  // Chart.js Setup
  const canvasRef = useRef(null);
  const chartInstanceRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || history.length === 0) return;

    // Destroy existing chart instance
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext('2d');

    const labels = history.map(h => h.time);
    const tempsData = history.map(h => h.temp);
    const humsData = history.map(h => h.hum);

    // Gradients
    const tempGrad = ctx.createLinearGradient(0, 0, 0, 180);
    tempGrad.addColorStop(0, 'rgba(49, 84, 202, 0.18)');
    tempGrad.addColorStop(1, 'rgba(49, 84, 202, 0.00)');

    const humGrad = ctx.createLinearGradient(0, 0, 0, 180);
    humGrad.addColorStop(0, 'rgba(16, 185, 129, 0.12)');
    humGrad.addColorStop(1, 'rgba(16, 185, 129, 0.00)');

    // Custom Plugin to draw the "Away Period" shading & 25°C limit
    const customVisualsPlugin = {
      id: 'customVisuals',
      beforeDraw(chart) {
        const { ctx, chartArea: { top, bottom, left, right }, scales: { x, yTemp } } = chart;
        if (!x || !yTemp) return;

        ctx.save();

        // 1. Shaded Away Period Rect
        const totalPoints = history.length;
        const awayPoints = Math.round(awayHours);
        const startIndex = Math.max(0, totalPoints - awayPoints);
        const startX = x.getPixelForValue(startIndex);

        if (startX >= left && startX <= right) {
          // Shaded Rect
          ctx.fillStyle = 'rgba(239, 68, 68, 0.04)';
          ctx.fillRect(startX, top, right - startX, bottom - top);

          // Dashed border line
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(startX, top);
          ctx.lineTo(startX, bottom);
          ctx.stroke();

          // Label
          ctx.fillStyle = 'rgba(239, 68, 68, 0.6)';
          ctx.font = 'bold 8px Inter, sans-serif';
          ctx.fillText('AWAY PERIOD', startX + 8, top + 14);
        }

        // 2. Red dotted breach threshold line at 25°C
        const y25 = yTemp.getPixelForValue(25);
        if (y25 >= top && y25 <= bottom) {
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
          ctx.lineWidth = 1;
          ctx.setLineDash([6, 3]);
          ctx.beginPath();
          ctx.moveTo(left, y25);
          ctx.lineTo(right, y25);
          ctx.stroke();

          ctx.fillStyle = '#ef4444';
          ctx.font = 'bold 8px monospace';
          ctx.fillText('25°C LIMIT', right - 62, y25 - 4);
        }

        ctx.restore();
      }
    };

    chartInstanceRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Temperature (°C)',
            data: tempsData,
            borderColor: '#3154ca',
            borderWidth: 2,
            backgroundColor: tempGrad,
            fill: true,
            tension: 0.3,
            yAxisID: 'yTemp',
            pointRadius: 0.5,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: '#3154ca',
            pointHoverBorderColor: '#fff',
            pointHoverBorderWidth: 2,
          },
          {
            label: 'Humidity (%)',
            data: humsData,
            borderColor: '#10b981',
            borderWidth: 1.5,
            backgroundColor: humGrad,
            fill: true,
            tension: 0.3,
            yAxisID: 'yHum',
            pointRadius: 0.5,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: '#10b981',
            pointHoverBorderColor: '#fff',
            pointHoverBorderWidth: 2,
            borderDash: [3, 3]
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              boxWidth: 10,
              boxHeight: 10,
              font: {
                size: 9,
                weight: 'bold',
                family: 'Inter, sans-serif'
              },
              color: '#475569',
              padding: 10
            }
          },
          tooltip: {
            backgroundColor: '#1e293b',
            titleFont: { size: 9, family: 'Inter, sans-serif', weight: 'bold' },
            bodyFont: { size: 9, family: 'Inter, sans-serif' },
            padding: 8,
            cornerRadius: 6,
            displayColors: true,
            callbacks: {
              label: function(context) {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.parsed.y !== null) {
                  label += context.parsed.y + (context.datasetIndex === 0 ? '°C' : '%');
                }
                return label;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              maxTicksLimit: 6,
              color: '#64748b',
              font: {
                size: 8,
                family: 'Inter, sans-serif'
              }
            }
          },
          yTemp: {
            type: 'linear',
            display: true,
            position: 'left',
            grid: {
              color: '#f1f5f9'
            },
            ticks: {
              color: '#3154ca',
              font: {
                size: 8,
                family: 'mono',
                weight: 'bold'
              },
              callback: value => `${value}°C`
            },
            min: Math.min(...tempsData, 20) - 2,
            max: Math.max(...tempsData, 26) + 2
          },
          yHum: {
            type: 'linear',
            display: true,
            position: 'right',
            grid: {
              drawOnChartArea: false,
            },
            ticks: {
              color: '#10b981',
              font: {
                size: 8,
                family: 'mono',
                weight: 'bold'
              },
              callback: value => `${value}%`
            },
            min: Math.min(...humsData, 20) - 5,
            max: Math.max(...humsData, 90) + 5
          }
        },
        animations: {
          y: {
            easing: 'easeInOutQuad',
            duration: 500
          }
        }
      },
      plugins: [customVisualsPlugin]
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [selectedSensorId, history, awayHours]);

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center animate-fadeIn">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onDismiss} />

      {/* Modal Container */}
      <div className="relative z-10 w-full max-w-5xl mx-4 bg-white rounded-2xl shadow-2xl border border-outline-variant flex flex-col md:flex-row h-[90vh] md:h-[80vh] max-h-[750px] overflow-hidden">
        
        {/* Floating Close Button */}
        <button 
          onClick={onDismiss} 
          className="absolute top-3.5 right-3.5 z-[310] p-1.5 bg-white/90 hover:bg-slate-100 rounded-full border border-slate-200/60 shadow-sm text-secondary hover:text-on-surface transition-all flex items-center justify-center"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>

        {/* LEFT COLUMN: Visual Analytics & Time Strip */}
        <div className="w-full h-[52%] md:h-full md:w-[58%] border-b md:border-b-0 md:border-r border-outline-variant p-5 flex flex-col justify-between overflow-y-auto bg-slate-50/50">
          
          <div className="space-y-3.5">
            {/* Header */}
            <div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">analytics</span>
                <h2 className="font-extrabold text-lg text-on-surface tracking-tight">Login Activity Dashboard</h2>
              </div>
              <p className="text-[11px] text-secondary mt-0.5">
                Welcome back, <span className="font-semibold text-on-surface capitalize">{currentUser.username}</span> — view what occurred during your shift away.
              </p>
            </div>

            {/* Time strip */}
            <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200/50 shadow-sm relative overflow-hidden shrink-0">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
              
              <div className="pl-2">
                <div className="flex items-center gap-1 text-[8px] font-extrabold text-slate-400 uppercase tracking-wider">
                  <span className="material-symbols-outlined text-[10px]">logout</span>
                  Last Logout
                </div>
                <div className="font-extrabold text-xs text-slate-800 mt-0.5">{last.date}</div>
                <div className="text-[9px] text-slate-500 font-medium">{last.time}</div>
              </div>
              
              <div className="flex flex-col items-center justify-center text-center px-4 border-x border-slate-100">
                <div className="flex items-center gap-1 text-[8px] font-extrabold text-slate-400 uppercase tracking-wider">
                  <span className="material-symbols-outlined text-[10px]">schedule</span>
                  Time Away
                </div>
                <div className="font-black text-primary text-xs mt-0.5 leading-none tracking-tight">{away}</div>
              </div>
              
              <div className="text-right">
                <div className="flex items-center justify-end gap-1 text-[8px] font-extrabold text-slate-400 uppercase tracking-wider">
                  <span className="material-symbols-outlined text-[10px]">login</span>
                  Current Login
                </div>
                <div className="font-extrabold text-xs text-slate-800 mt-0.5">{current.date}</div>
                <div className="text-[9px] text-slate-500 font-medium">{current.time}</div>
              </div>
            </div>

            {/* Visuals Panel */}
            <div className="bg-white rounded-xl border border-slate-200/50 p-3.5 shadow-sm space-y-2.5">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">Environmental Away Trends</span>
                <span className="text-[9px] bg-red-50 text-red-500 border border-red-150 px-2 py-0.5 rounded-full font-bold">
                  {warningSensors.length} Excursions Active
                </span>
              </div>

              {/* Sensor selector pills */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                {warningSensors.map(s => {
                  const isSelected = s.id === selectedSensorId;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelectedSensorId(s.id)}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 border transition-all whitespace-nowrap active:scale-95 ${
                        isSelected 
                          ? 'bg-red-500 border-red-600 text-white shadow-md'
                          : 'bg-white border-slate-200 text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-red-500 animate-pulse'}`} />
                      {s.id} · {s.temp}°C
                    </button>
                  );
                })}
              </div>

              {/* Chart.js Canvas Graph */}
              <div className="relative border border-slate-200/40 rounded-xl bg-slate-50/20 p-2 h-[180px] md:h-[220px]">
                <canvas ref={canvasRef} />
              </div>

              {/* Sensor Trend metrics summary */}
              <div className="grid grid-cols-4 gap-2 pt-0.5">
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 text-center">
                  <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Current</div>
                  <div className="font-extrabold text-xs text-error mt-0.5">{selectedSensor.temp}°C</div>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 text-center">
                  <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">24h Peak</div>
                  <div className="font-extrabold text-xs text-slate-800 mt-0.5">{peakTemp}°C</div>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 text-center">
                  <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">24h Avg</div>
                  <div className="font-extrabold text-xs text-slate-800 mt-0.5">{avgTemp}°C</div>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 text-center">
                  <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Exceeded</div>
                  <div className="font-extrabold text-xs text-error mt-0.5">{breachHours} hrs</div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick analysis summary */}
          <div className="mt-3.5 text-[10px] leading-normal text-secondary bg-slate-100/50 border border-slate-200/40 p-3 rounded-lg flex items-start gap-2 shrink-0">
            <span className="material-symbols-outlined text-[14px] text-primary mt-0.5">insights</span>
            <p>
              <strong>Shift Trend Insights:</strong> Sensor <span className="font-bold text-on-surface">{selectedSensorId}</span> (located at {selectedSensor.location}) entered excursion {breachHours} hours ago. With other sensors in the group showing normal values, this suggests a localized or specific sensor issue.
            </p>
          </div>

        </div>

        {/* RIGHT COLUMN: Tab Navigation, Facility Stats & Lists */}
        <div className="w-full h-[48%] md:h-full md:w-[42%] flex flex-col bg-white overflow-hidden">
          
          {/* Tabs header */}
          <div className="flex border-b border-slate-200 shrink-0 px-4 gap-0.5 pt-4 bg-slate-50/40 overflow-x-auto">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`relative px-3 py-2 text-xs font-bold whitespace-nowrap transition-all duration-150 shrink-0 pb-3 -mb-[1px] ${
                  tab === t.id 
                    ? 'text-primary border-b-2 border-primary' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span className="relative z-10 flex items-center gap-1">
                  {t.label}
                  {t.badge && (
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
                  )}
                </span>
              </button>
            ))}
          </div>

          {/* Tab content area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            
            {/* ── Tab: Overview ── */}
            {tab === 'overview' && (
              <>
                <Section icon="bar_chart" title="Facility Summary">
                  <div className="grid grid-cols-5 gap-1.5">
                    <Stat label="New"       value={ALERTS.length}             color="text-error" />
                    <Stat label="Resolved"  value={resolvedAlerts.length}     color="text-status-success" />
                    <Stat label="Active"    value={activeAlerts.length}       color="text-error" />
                    <Stat label="Offline"   value={OFFLINE_SENSORS.length}    color="text-secondary" />
                    <Stat label="Max ESI"   value={highestEsi}                color={highestEsi > 50 ? 'text-error' : 'text-on-surface'} />
                  </div>
                </Section>

                <Section icon="crisis_alert" title="Requires Immediate Attention">
                  <div className="space-y-1.5 max-h-[190px] overflow-y-auto pr-1">
                    {ACTIVE_EXCURSIONS.length === 0 && BATTERY_WARNINGS.length === 0 ? (
                      <div className="flex flex-col items-center justify-center p-6 text-center bg-slate-50 border border-slate-100 rounded-xl">
                        <span className="material-symbols-outlined text-green-500 text-2xl mb-1">check_circle</span>
                        <span className="text-[11px] font-bold text-slate-700">All Systems Normal</span>
                        <span className="text-[9px] text-slate-400 mt-0.5">No immediate sensor or power issues detected.</span>
                      </div>
                    ) : (
                      <>
                        {ACTIVE_EXCURSIONS.map(s => <ExcursionRow key={s.id} s={s} />)}
                        {BATTERY_WARNINGS.map(s => <BatteryRow key={s.id} s={s} />)}
                      </>
                    )}
                  </div>
                </Section>
              </>
            )}

            {/* ── Tab: Alerts ── */}
            {tab === 'alerts' && (
              <Section icon="notifications_active" title={`All Alerts During Absence (${ALERTS.length})`}>
                <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                  {ALERTS.map(a => <AlertRow key={a.id} a={a} />)}
                </div>
              </Section>
            )}

            {/* ── Tab: Offline ── */}
            {tab === 'offline' && (
              <Section icon="sensors_off" title={`Sensors Offline (${OFFLINE_SENSORS.length})`}>
                <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                  {OFFLINE_SENSORS.map(s => (
                    <div key={s.id} className="flex items-center justify-between p-2.5 rounded-xl border bg-slate-50 border-slate-100 text-xs transition-all hover:bg-slate-100/60">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="material-symbols-outlined text-[16px] text-slate-400 shrink-0">sensors_off</span>
                        <div className="min-w-0">
                          <div className="font-extrabold text-slate-800 truncate">{s.id}</div>
                          <div className="text-[9px] text-slate-500 font-medium truncate">{s.location} · {s.group}</div>
                        </div>
                      </div>
                      <div className="text-right shrink-0 text-slate-500 text-[9px] flex flex-col items-end justify-center">
                        <div className="font-bold">Last seen {s.lastSeen}</div>
                        <div className="font-mono text-slate-400 mt-0.5">Val: {s.lastReading}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* ── Tab: Issues ── */}
            {tab === 'issues' && (
              <div className="space-y-4 max-h-[290px] overflow-y-auto pr-1">
                <Section icon="device_thermostat" title={`Active Excursions (${ACTIVE_EXCURSIONS.length})`}>
                  <div className="space-y-2">
                    {ACTIVE_EXCURSIONS.length === 0 ? (
                      <div className="text-[10px] text-slate-400 italic p-3 text-center bg-slate-50 rounded-lg">No active excursions.</div>
                    ) : (
                      ACTIVE_EXCURSIONS.map(s => <ExcursionRow key={s.id} s={s} />)
                    )}
                  </div>
                </Section>
                <Section icon="battery_alert" title={`Battery Warnings (${BATTERY_WARNINGS.length})`}>
                  <div className="space-y-2">
                    {BATTERY_WARNINGS.length === 0 ? (
                      <div className="text-[10px] text-slate-400 italic p-3 text-center bg-slate-50 rounded-lg">No battery warnings.</div>
                    ) : (
                      BATTERY_WARNINGS.map(s => <BatteryRow key={s.id} s={s} />)
                    )}
                  </div>
                </Section>
              </div>
            )}

            {/* ── Tab: Handover Note ── */}
            {tab === 'handover' && (
              <Section icon="edit_note" title="Operator Handover Note">
                {hasNote ? (
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3 relative overflow-hidden">
                    <span className="material-symbols-outlined text-[64px] text-primary/5 absolute -right-2 -bottom-2 pointer-events-none select-none font-black">format_quote</span>
                    
                    <div className="flex items-center gap-2 relative z-10">
                      <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                        {handoverNote.fromInitials}
                      </div>
                      <div>
                        <div className="font-bold text-xs text-on-surface">{handoverNote.from}</div>
                        <div className="text-[9px] text-secondary">{handoverNote.shift} · Left at {handoverNote.leftAt}</div>
                      </div>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap border-t border-primary/10 pt-2.5 relative z-10">
                      {handoverNote.note}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
                    <span className="material-symbols-outlined text-[32px] text-secondary">assignment_late</span>
                    <div className="font-semibold text-xs text-on-surface">No handover note</div>
                    <div className="text-[10px] text-secondary max-w-xs">
                      The previous operator did not leave a note. The shift completed normally.
                    </div>
                  </div>
                )}
              </Section>
            )}

          </div>

          {/* Right Column Footer */}
          <div className="px-4 py-4 border-t border-slate-200 shrink-0 flex items-center justify-between bg-slate-50/50">
            <span className="text-[10px] truncate max-w-[140px]">
              {activeAlerts.length > 0
                ? <span className="text-error font-bold">⚠ {activeAlerts.length} alert{activeAlerts.length !== 1 ? 's' : ''} active</span>
                : <span className="text-secondary font-medium">All alerts resolved</span>
              }
            </span>
            <button
              onClick={onDismiss}
              className="px-4 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary/95 transition-all shadow-sm flex items-center gap-1 active:scale-95"
            >
              <span>Go to Dashboard</span>
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};

export default LoginSummaryModal;
