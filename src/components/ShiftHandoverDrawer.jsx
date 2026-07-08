import React from 'react';
import { initialSensors, initialAlerts, initialGroups, initialGateways } from '../api/mockData';
import { handoverNoteStore } from './LoginSummaryModal';

const groupMap = Object.fromEntries(initialGroups.map(g => [g.name, g.location]));

// Derive highlights from live mock data
const warningSensors  = initialSensors.filter(s => s.status === 'warning');
const offlineSensors  = initialSensors.filter(s => s.status === 'offline');
const offlineGateways = initialGateways.filter(g => g.status === 'offline');
const resolvedAlerts  = initialAlerts.filter(a => a.state === 'acknowledged');
const activeAlerts    = initialAlerts.filter(a => a.state === 'unacknowledged');
const batteryLow      = initialSensors.filter(s => {
  const days = Math.round(s.batt / (s.dailyDrainRate || 1.5));
  return days <= 5;
});

const HIGHLIGHTS = [
  `${initialAlerts.length} alert${initialAlerts.length !== 1 ? 's' : ''} raised during shift`,
  `${resolvedAlerts.length} alert${resolvedAlerts.length !== 1 ? 's' : ''} resolved`,
  warningSensors.length > 0
    ? `${warningSensors.length} temperature excursion${warningSensors.length !== 1 ? 's' : ''} remain active`
    : 'No active temperature excursions',
  offlineSensors.length > 0
    ? `${offlineSensors.length} sensor${offlineSensors.length !== 1 ? 's' : ''} currently offline`
    : 'All sensors online',
  offlineGateways.length > 0
    ? `${offlineGateways.map(g => g.id).join(', ')} offline — data buffered locally`
    : 'All gateways online',
  batteryLow.length > 0
    ? `${batteryLow.length} sensor${batteryLow.length !== 1 ? 's' : ''} require battery replacement soon`
    : 'No battery replacements required',
];

const PENDING_ISSUES = [
  ...warningSensors.map(s => ({
    sensor: s.id,
    room: groupMap[s.group] ?? s.group,
    issue: `Temperature excursion active — ${s.temp}°C at ${s.location}. ESI: ${parseFloat(((s.temp - 25) * 45).toFixed(1))} °C·min.`,
    severity: 'error',
  })),
  ...offlineGateways.map(g => ({
    sensor: g.id,
    room: 'Gateway',
    issue: `Offline since ${g.properties['Last updated']}. Manual reboot required.`,
    severity: 'warning',
  })),
  ...batteryLow.map(s => ({
    sensor: s.id,
    room: groupMap[s.group] ?? s.group,
    issue: `Battery at ${s.batt}% — ~${Math.round(s.batt / (s.dailyDrainRate || 1.5))} days remaining.`,
    severity: 'battery',
  })),
];

const ShiftHandoverDrawer = ({ onClose, currentUser }) => {
  const handoverNote = handoverNoteStore[currentUser?.username] ?? null;

  const shiftLabel = currentUser?.shift ?? 'Current Shift';
  const shiftStart = shiftLabel.includes('·') ? shiftLabel.split('·')[1]?.trim() : '';

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex justify-end animate-fadeIn">
      <div className="flex-1" onClick={onClose} />

      <div className="w-full sm:w-[460px] bg-white h-full shadow-2xl border-l border-outline-variant flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant shrink-0">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[22px]">assignment</span>
            <h3 className="font-bold text-lg text-on-surface">Shift Handover Digest</h3>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-surface-variant rounded-full text-secondary transition-colors">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Shift info */}
          <div className="bg-surface-container-low rounded-xl border border-outline-variant/60 p-4 text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-secondary font-medium">Shift</span>
              <span className="font-bold text-on-surface">{shiftLabel.split('·')[0]?.trim()}</span>
            </div>
            {shiftStart && (
              <div className="flex justify-between">
                <span className="text-secondary font-medium">Hours</span>
                <span className="font-mono text-on-surface">{shiftStart}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-secondary font-medium">Current Operator</span>
              <span className="font-bold text-primary capitalize">{currentUser?.username}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary font-medium">Role</span>
              <span className="text-on-surface">{currentUser?.role}</span>
            </div>
          </div>

          {/* Shift highlights */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-secondary mb-3 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px]">summarize</span>
              Shift Highlights
            </div>
            <ul className="space-y-1.5">
              {HIGHLIGHTS.map((h, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-on-surface-variant">
                  <span className="text-secondary mt-0.5 shrink-0">•</span>
                  {h}
                </li>
              ))}
            </ul>
          </div>

          {/* Pending issues */}
          {PENDING_ISSUES.length > 0 && (
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-secondary mb-3 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px] text-error">crisis_alert</span>
                Pending Issues ({PENDING_ISSUES.length})
              </div>
              <div className="space-y-2">
                {PENDING_ISSUES.map((issue, i) => (
                  <div key={i} className={`p-3 rounded-lg text-xs border ${
                    issue.severity === 'error'   ? 'bg-error-container/20 border-error/20' :
                    issue.severity === 'battery' ? 'bg-yellow-50 border-yellow-200' :
                    'bg-surface-variant border-outline-variant'
                  }`}>
                    <div className={`font-bold ${
                      issue.severity === 'error'   ? 'text-error' :
                      issue.severity === 'battery' ? 'text-yellow-800' :
                      'text-secondary'
                    }`}>{issue.sensor} · {issue.room}</div>
                    <div className="text-on-surface-variant mt-0.5">{issue.issue}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Handover note — per current user */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-secondary mb-3 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px]">edit_note</span>
              Handover Note from Previous Shift
            </div>
            {handoverNote ? (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs text-secondary">
                  <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                    {handoverNote.fromInitials}
                  </div>
                  <span className="font-bold text-primary">{handoverNote.from}</span>
                  <span>· {handoverNote.shift} · {handoverNote.leftAt}</span>
                </div>
                <p className="text-sm text-on-surface leading-relaxed whitespace-pre-wrap border-t border-primary/10 pt-2">
                  {handoverNote.note}
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-surface-container-low border border-outline-variant rounded-lg text-xs text-secondary">
                <span className="material-symbols-outlined text-[16px]">info</span>
                No handover note was left. Previous shift completed normally.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShiftHandoverDrawer;
