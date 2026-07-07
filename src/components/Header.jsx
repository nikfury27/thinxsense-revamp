import React, { useState } from 'react';
import { useCurrentUser } from '../hooks/useCurrentUser';

const Header = () => {
  const { currentUser } = useCurrentUser();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [handoverNotes, setHandoverNotes] = useState('');
  const [signedBy, setSignedBy] = useState('shwetha');
  const [isHandedOver, setIsHandedOver] = useState(false);

  const displayName = currentUser?.name || 'shwetha';
  const initials = displayName.slice(0, 2).toUpperCase();

  const handleHandoverSubmit = (e) => {
    e.preventDefault();
    if (!signedBy.trim()) return;
    setIsHandedOver(true);
    alert(`Shift successfully handed over by ${signedBy}! Handover log saved.`);
    setHandoverNotes('');
    setIsDrawerOpen(false);
    // Reset notification badge mock state
    setIsHandedOver(true);
  };

  return (
    <>
      <header className="w-full h-header-height bg-white/80 backdrop-blur-md border-b border-outline-variant flex items-center justify-between px-margin-page sticky top-0 z-40 shrink-0 overflow-hidden shadow-sm">
        {/* Abstract decorative background gradients */}
        <div
          className="absolute left-0 top-0 w-48 h-full opacity-35 pointer-events-none"
          style={{ background: 'radial-gradient(circle at 0% 50%, #b7c4ff, transparent)' }}
        />
        <div
          className="absolute right-0 top-0 w-64 h-full opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(circle at 100% 50%, #3154ca, transparent)' }}
        />

        {/* Left Side: Shift Handover Summary Trigger */}
        <div className="flex items-center gap-3 relative z-10">
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-full hover:bg-primary/25 transition-all text-xs font-semibold active:scale-95 duration-100"
          >
            <span className="material-symbols-outlined text-[16px]">assignment</span>
            <span className="hidden sm:inline">Shift Handover Digest</span>
            {!isHandedOver && (
              <span className="w-2.5 h-2.5 bg-error rounded-full animate-pulse" />
            )}
          </button>
        </div>

        {/* Brand Logo Centered */}
        <div className="flex-1 flex justify-center relative z-10">
          <h2 className="font-headline-lg text-lg sm:text-headline-lg italic font-black text-primary select-none tracking-tight">
            thinxsense
          </h2>
        </div>

        {/* Trailing Actions */}
        <div className="flex items-center gap-3 relative z-10">
          <button
            onClick={() => alert('No new alerts inside this shift.')}
            className="relative w-10 h-10 rounded-full hover:bg-surface-variant flex items-center justify-center text-on-surface-variant hover:text-primary transition-all duration-200 active:scale-90"
          >
            <span className="material-symbols-outlined">notifications</span>
            {!isHandedOver && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full" />
            )}
          </button>

          <button
            onClick={() => alert('Opening global settings...')}
            className="w-10 h-10 rounded-full hover:bg-surface-variant flex items-center justify-center text-on-surface-variant hover:text-primary transition-all duration-200 active:scale-90"
          >
            <span className="material-symbols-outlined">settings</span>
          </button>

          {/* User avatar indicator */}
          <div className="w-8 h-8 rounded-full bg-primary-container text-white flex items-center justify-center font-bold text-sm ml-2 cursor-pointer shadow-sm select-none hover:opacity-90 active:scale-95 transition-all uppercase">
            {initials}
          </div>
        </div>
      </header>

      {/* Slide-over Handover Digest Drawer */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex justify-end animate-fadeIn">
          {/* Backdrop Closer */}
          <div className="flex-1" onClick={() => setIsDrawerOpen(false)} />

          {/* Drawer Container */}
          <div className="w-full sm:w-[450px] bg-white h-full shadow-2xl border-l border-outline-variant flex flex-col p-6 overflow-y-auto animate-slideLeft relative">

            {/* Header */}
            <div className="flex justify-between items-center pb-4 border-b border-outline-variant mb-6">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-2xl">assignment</span>
                <h3 className="font-bold text-lg text-on-surface">Shift Handover Digest</h3>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-1 hover:bg-surface-variant rounded-full text-on-surface-variant"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Shift Context */}
            <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/60 mb-6 text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-secondary font-medium">Active Shift:</span>
                <span className="font-bold text-on-surface">Shift A (06:00 - 14:00)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary font-medium">In-Charge:</span>
                <span className="font-mono font-bold text-primary">{signedBy}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary font-medium">Handover State:</span>
                <span className={`font-bold ${isHandedOver ? 'text-status-success' : 'text-error animate-pulse'}`}>
                  {isHandedOver ? 'COMPLETED' : 'PENDING SIGN-OFF'}
                </span>
              </div>
            </div>

            {/* Metrics Digest Section */}
            <div className="space-y-4 mb-6">
              <h4 className="font-bold text-xs uppercase tracking-wider text-secondary">
                Shift Activity Digest (Last 10 Hours)
              </h4>

              <div className="space-y-2.5">
                {/* ESI Alert summary */}
                <div className="p-3 bg-error-container/20 border border-error/20 rounded-lg flex gap-3 items-start text-xs">
                  <span className="material-symbols-outlined text-error font-bold mt-0.5">report_problem</span>
                  <div>
                    <span className="font-bold text-error">1 Severe Excursion Alert</span>
                    <p className="text-on-surface-variant mt-0.5">
                      Cold Room 2 (Sensor H9B00045) reached 31.2°C with an ESI Score of <strong className="text-error">279</strong>.
                    </p>
                  </div>
                </div>

                {/* Neighbour validation flag */}
                <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg flex gap-3 items-start text-xs">
                  <span className="material-symbols-outlined text-primary font-bold mt-0.5">verified_user</span>
                  <div>
                    <span className="font-bold text-primary">Neighbour Validation Flagged Fault</span>
                    <p className="text-on-surface-variant mt-0.5">
                      Deviations on H9B00045 were compared to neighbors (H9B00046, H9B00047) reporting 24.1°C. **Suppressed room alarm** as a localized sensor fault.
                    </p>
                  </div>
                </div>

                {/* Gateway Outage */}
                <div className="p-3 bg-slate-500/10 border border-slate-500/20 rounded-lg flex gap-3 items-start text-xs">
                  <span className="material-symbols-outlined text-secondary font-bold mt-0.5">router</span>
                  <div>
                    <span className="font-bold text-secondary">1 Gateway Outage</span>
                    <p className="text-on-surface-variant mt-0.5">
                      Gateway GGWCL00060 offline since 16:26. Data backlog buffered locally.
                    </p>
                  </div>
                </div>

                {/* Compliance info */}
                <div className="p-3 bg-green-500/5 border border-green-500/20 rounded-lg flex gap-3 items-start text-xs">
                  <span className="material-symbols-outlined text-status-success font-bold mt-0.5">check_circle</span>
                  <div>
                    <span className="font-bold text-status-success">Facility Compliance Verified</span>
                    <p className="text-on-surface-variant mt-0.5">
                      Overall facility temperature compliance is verified at **98.2%** for the active shift window.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Handover Log Form */}
            <form onSubmit={handleHandoverSubmit} className="space-y-4 pt-4 border-t border-outline-variant mt-auto">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-1">
                  Outgoing Operator Notes
                </label>
                <textarea
                  required
                  value={handoverNotes}
                  onChange={(e) => setHandoverNotes(e.target.value)}
                  placeholder="e.g. Suppressed sensor alert is likely a fault. GGWCL00060 needs manual reboot on Rack 1. Vaccine batches remain secure."
                  className="w-full p-3 border border-outline-variant rounded focus:outline-none focus:ring-2 focus:ring-primary text-xs h-28"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-1">
                  Operator Signature (shwetha)
                </label>
                <input
                  required
                  type="text"
                  value={signedBy}
                  onChange={(e) => setSignedBy(e.target.value)}
                  className="w-full px-3 py-2 border border-outline-variant rounded focus:outline-none focus:ring-2 focus:ring-primary text-xs font-mono"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    alert('Generating PDF digest... HandoverReport_ShiftA.pdf ready for download.');
                  }}
                  className="flex-1 py-2 px-3 border border-outline-variant hover:bg-surface-container-low rounded text-xs font-semibold text-secondary flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">download</span>
                  <span>PDF Report</span>
                </button>

                <button
                  type="submit"
                  className="flex-[2] py-2 px-3 bg-primary hover:bg-primary/95 text-white rounded text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">verified</span>
                  <span>Sign & Complete Handover</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </>
  );
};

export default Header;
