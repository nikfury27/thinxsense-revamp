import React, { useState } from 'react';
import {
  initialSensors,
  initialAlerts,
  initialGroups,
} from '../api/mockData';

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
  <div className="flex flex-col items-center bg-surface-container-low rounded-xl p-3 gap-1 min-w-[76px] flex-1">
    <span className={`text-2xl font-black font-mono ${color}`}>{value}</span>
    <span className="text-[10px] text-secondary text-center leading-tight">{label}</span>
  </div>
);

const Section = ({ icon, title, children }) => (
  <div className="space-y-2">
    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-secondary">
      <span className="material-symbols-outlined text-[15px]">{icon}</span>
      {title}
    </div>
    {children}
  </div>
);

const AlertRow = ({ a }) => {
  const active = a.state === 'unacknowledged';
  return (
    <div className="flex items-start gap-3 p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/40 text-xs">
      <span className={`material-symbols-outlined text-[16px] mt-0.5 shrink-0 ${active ? 'text-error' : 'text-secondary'}`}>
        {active ? 'warning' : 'check_circle'}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-on-surface">{a.sensor}</span>
          <span className="text-secondary">·</span>
          <span className="text-secondary truncate">{a.location}</span>
          {a.esi > 0 && <span className="ml-auto font-mono font-bold text-error shrink-0">ESI {a.esi}</span>}
        </div>
        <div className="text-secondary mt-0.5">
          {a.param} · {a.val} · {a.time}
        </div>
      </div>
      <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-bold ${
        active ? 'bg-error-container text-on-error-container' : 'bg-surface-variant text-secondary'
      }`}>
        {active ? 'Active' : 'Resolved'}
      </span>
    </div>
  );
};

const ExcursionRow = ({ s }) => (
  <div className="flex items-start gap-2.5 p-2.5 rounded-lg border bg-error-container/20 border-error/20 text-xs text-error">
    <span className="material-symbols-outlined text-[16px] shrink-0 mt-0.5">device_thermostat</span>
    <div className="flex-1">
      <div className="font-bold">{s.id} — {s.group}</div>
      <div className="opacity-70 mt-0.5">{s.temp} at {s.location} · ESI {s.esi}</div>
    </div>
  </div>
);

const BatteryRow = ({ s }) => (
  <div className="flex items-start gap-2.5 p-2.5 rounded-lg border bg-yellow-50 border-yellow-200 text-xs text-yellow-800">
    <span className="material-symbols-outlined text-[16px] shrink-0 mt-0.5">battery_alert</span>
    <div>
      <div className="font-bold">{s.id} — {s.location}</div>
      <div className="opacity-70 mt-0.5">{s.batt}% remaining · swap within {s.daysLeft} day{s.daysLeft !== 1 ? 's' : ''}</div>
    </div>
  </div>
);

// ─── Main ─────────────────────────────────────────────────────────────────────
const LoginSummaryModal = ({ onDismiss, currentUser }) => {
  const [tab, setTab] = useState('overview');

  const last    = fmtDT(currentUser.lastLogoutAt);
  const current = fmtDT(currentUser.currentLoginAt);
  const away    = timeAway(currentUser.lastLogoutAt, currentUser.currentLoginAt);

  const activeAlerts   = ALERTS.filter(a => a.state === 'unacknowledged');
  const resolvedAlerts = ALERTS.filter(a => a.state === 'acknowledged');

  // Per-user handover note — null means no note was left
  const handoverNote = handoverNoteStore[currentUser.username] ?? null;
  const hasNote = !!handoverNote;

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'alerts',   label: `Alerts (${ALERTS.length})` },
    { id: 'offline',  label: `Offline (${OFFLINE_SENSORS.length})` },
    { id: 'issues',   label: `Issues (${ACTIVE_EXCURSIONS.length + BATTERY_WARNINGS.length})` },
    { id: 'handover', label: 'Handover Note', badge: hasNote },
  ];

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div className="relative z-10 w-full max-w-xl mx-4 bg-white rounded-2xl shadow-2xl border border-outline-variant flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-start justify-between p-5 pb-4 border-b border-outline-variant shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[22px]">login</span>
              <h2 className="font-bold text-lg text-on-surface">Login Activity Summary</h2>
            </div>
            <p className="text-xs text-secondary mt-0.5">
              Welcome back, <span className="font-semibold text-on-surface capitalize">{currentUser.username}</span> — here's what happened while you were away
            </p>
          </div>
          <button onClick={onDismiss} className="p-1.5 hover:bg-surface-variant rounded-full text-secondary transition-colors">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Time strip */}
        <div className="grid grid-cols-3 gap-3 px-5 py-4 bg-surface-container-low border-b border-outline-variant shrink-0">
          <div>
            <div className="text-[10px] text-secondary uppercase tracking-wider font-semibold mb-1">Last Logout</div>
            <div className="font-bold text-sm text-on-surface">{last.date}</div>
            <div className="text-xs text-secondary">{last.time}</div>
          </div>
          <div className="flex flex-col items-center justify-center text-center">
            <div className="text-[10px] text-secondary uppercase tracking-wider font-semibold mb-1">Time Away</div>
            <div className="font-black text-primary text-sm">{away}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-secondary uppercase tracking-wider font-semibold mb-1">Current Login</div>
            <div className="font-bold text-sm text-on-surface">{current.date}</div>
            <div className="text-xs text-secondary">{current.time}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-outline-variant shrink-0 px-4 gap-0.5 pt-1 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative px-3 py-2 text-xs font-semibold whitespace-nowrap transition-colors shrink-0 ${
                tab === t.id ? 'text-primary border-b-2 border-primary' : 'text-secondary hover:text-on-surface'
              }`}
            >
              {t.label}
              {t.badge && (
                <span className="ml-1.5 w-2 h-2 bg-error rounded-full inline-block align-middle" />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* ── Overview ── */}
          {tab === 'overview' && (
            <>
              <Section icon="bar_chart" title="Facility Summary">
                <div className="flex gap-2 flex-wrap">
                  <Stat label="New Alerts"       value={ALERTS.length}             color="text-error" />
                  <Stat label="Resolved"         value={resolvedAlerts.length}     color="text-status-success" />
                  <Stat label="Still Active"     value={activeAlerts.length}       color="text-error" />
                  <Stat label="Offline Sensors"  value={OFFLINE_SENSORS.length}    color="text-secondary" />
                  <Stat label="Highest ESI"      value={highestEsi}                color={highestEsi > 50 ? 'text-error' : 'text-on-surface'} />
                </div>
              </Section>

              <Section icon="crisis_alert" title="Requires Immediate Attention">
                {ACTIVE_EXCURSIONS.map(s => <ExcursionRow key={s.id} s={s} />)}
                {BATTERY_WARNINGS.map(s => <BatteryRow key={s.id} s={s} />)}
              </Section>

              <Section icon="notifications_active" title="Recent Alerts">
                {ALERTS.slice(0, 3).map(a => <AlertRow key={a.id} a={a} />)}
                {ALERTS.length > 3 && (
                  <button onClick={() => setTab('alerts')} className="text-xs text-primary font-semibold hover:underline">
                    View all {ALERTS.length} alerts →
                  </button>
                )}
              </Section>

              {/* Handover note preview — conditional on user */}
              <Section icon="edit_note" title="Handover Note from Previous Shift">
                {hasNote ? (
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2 text-xs text-secondary">
                      <div className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                        {handoverNote.fromInitials}
                      </div>
                      <span className="font-bold text-primary">{handoverNote.from}</span>
                      <span>· {handoverNote.shift} · {handoverNote.leftAt}</span>
                    </div>
                    <p className="text-xs text-on-surface-variant line-clamp-3">{handoverNote.note}</p>
                    <button onClick={() => setTab('handover')} className="text-xs text-primary font-semibold hover:underline mt-2 block">
                      Read full note →
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-3 bg-surface-container-low border border-outline-variant rounded-lg text-xs text-secondary">
                    <span className="material-symbols-outlined text-[16px]">info</span>
                    No handover note was left by the previous operator. Shift completed normally.
                  </div>
                )}
              </Section>
            </>
          )}

          {/* ── Alerts ── */}
          {tab === 'alerts' && (
            <Section icon="notifications_active" title={`All Alerts During Absence (${ALERTS.length})`}>
              {ALERTS.map(a => <AlertRow key={a.id} a={a} />)}
            </Section>
          )}

          {/* ── Offline ── */}
          {tab === 'offline' && (
            <Section icon="sensors_off" title={`Sensors Offline (${OFFLINE_SENSORS.length})`}>
              {OFFLINE_SENSORS.map(s => (
                <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/40 text-xs">
                  <span className="material-symbols-outlined text-[16px] text-secondary shrink-0">sensors_off</span>
                  <div className="flex-1">
                    <span className="font-bold text-on-surface">{s.id}</span>
                    <span className="text-secondary ml-2">{s.location} · {s.group}</span>
                  </div>
                  <div className="text-right shrink-0 text-secondary">
                    <div>Last seen {s.lastSeen}</div>
                    <div>Reading: {s.lastReading}</div>
                  </div>
                </div>
              ))}
            </Section>
          )}

          {/* ── Issues ── */}
          {tab === 'issues' && (
            <>
              <Section icon="device_thermostat" title={`Active Excursions (${ACTIVE_EXCURSIONS.length})`}>
                {ACTIVE_EXCURSIONS.map(s => <ExcursionRow key={s.id} s={s} />)}
              </Section>
              <Section icon="battery_alert" title={`Battery Warnings (${BATTERY_WARNINGS.length})`}>
                {BATTERY_WARNINGS.map(s => <BatteryRow key={s.id} s={s} />)}
              </Section>
            </>
          )}

          {/* ── Handover Note ── */}
          {tab === 'handover' && (
            <Section icon="edit_note" title="Operator Handover Note">
              {hasNote ? (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm shrink-0">
                      {handoverNote.fromInitials}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-on-surface">{handoverNote.from}</div>
                      <div className="text-xs text-secondary">{handoverNote.shift} · Left at {handoverNote.leftAt}</div>
                    </div>
                  </div>
                  <p className="text-sm text-on-surface leading-relaxed whitespace-pre-wrap border-t border-primary/10 pt-3">
                    {handoverNote.note}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                  <span className="material-symbols-outlined text-[40px] text-secondary">assignment_late</span>
                  <div className="font-semibold text-sm text-on-surface">No handover note</div>
                  <div className="text-xs text-secondary max-w-xs">
                    The previous operator did not leave a note. This means the shift was completed normally with nothing important to report.
                  </div>
                </div>
              )}
            </Section>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-outline-variant shrink-0 flex items-center justify-between">
          <span className="text-xs">
            {activeAlerts.length > 0
              ? <span className="text-error font-semibold">⚠ {activeAlerts.length} alert{activeAlerts.length !== 1 ? 's' : ''} still active</span>
              : <span className="text-secondary">All alerts resolved</span>
            }
          </span>
          <button
            onClick={onDismiss}
            className="px-5 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors active:scale-95"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginSummaryModal;
