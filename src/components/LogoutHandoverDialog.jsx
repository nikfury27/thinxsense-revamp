import React, { useState } from 'react';
import { handoverNoteStore } from './LoginSummaryModal';

// Maps username → the other user who will receive the note
const NEXT_OPERATOR = { shwetha: 'rajesh', rajesh: 'shwetha' };
const INITIALS      = { shwetha: 'S', rajesh: 'R' };
const SHIFT_LABEL   = { shwetha: 'Morning Shift · 08:00 – 16:00', rajesh: 'Night Shift · 00:00 – 08:00' };

const LogoutHandoverDialog = ({ currentUser, onConfirmLogout, onCancel }) => {
  const [mode,    setMode]    = useState(null); // null | 'note'
  const [note,    setNote]    = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmitNote = async () => {
    if (!note.trim()) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    // Write note into the store so the next operator sees it on login
    const nextUser = NEXT_OPERATOR[currentUser.username];
    if (nextUser) {
      handoverNoteStore[nextUser] = {
        from: currentUser.username.charAt(0).toUpperCase() + currentUser.username.slice(1),
        fromInitials: INITIALS[currentUser.username] ?? currentUser.initials,
        shift: SHIFT_LABEL[currentUser.username] ?? currentUser.shift,
        leftAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        note: note.trim(),
      };
    }
    setLoading(false);
    onConfirmLogout();
  };

  const handleNothing = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 400));
    // Explicitly clear any previous note — next operator gets no badge
    const nextUser = NEXT_OPERATOR[currentUser.username];
    if (nextUser) handoverNoteStore[nextUser] = null;
    setLoading(false);
    onConfirmLogout();
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div className="relative z-10 w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl border border-outline-variant">

        {/* Header */}
        <div className="flex items-start justify-between p-5 pb-4 border-b border-outline-variant">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm shrink-0">
              {currentUser?.initials ?? '?'}
            </div>
            <div>
              <h2 className="font-bold text-base text-on-surface">Shift Handover</h2>
              <p className="text-xs text-secondary mt-0.5">
                {currentUser?.username} · {currentUser?.shift}
              </p>
            </div>
          </div>
          <button onClick={onCancel} className="p-1.5 hover:bg-surface-variant rounded-full text-secondary transition-colors">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="p-5 space-y-4">

          {mode === null && (
            <>
              <p className="text-sm text-on-surface-variant">
                Before you log out — would you like to leave a note for the next shift?
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => setMode('note')}
                  className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-outline-variant hover:border-primary hover:bg-primary/5 transition-all text-left group"
                >
                  <span className="material-symbols-outlined text-[22px] text-secondary group-hover:text-primary transition-colors">edit_note</span>
                  <div>
                    <div className="font-semibold text-sm text-on-surface">Leave a Handover Note</div>
                    <div className="text-xs text-secondary mt-0.5">Write observations for the next operator — they'll see a notification badge</div>
                  </div>
                </button>

                <button
                  onClick={handleNothing}
                  disabled={loading}
                  className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-outline-variant hover:border-green-500 hover:bg-green-50 transition-all text-left group disabled:opacity-60"
                >
                  <span className="material-symbols-outlined text-[22px] text-secondary group-hover:text-green-600 transition-colors">check_circle</span>
                  <div>
                    <div className="font-semibold text-sm text-on-surface">Nothing Important to Report</div>
                    <div className="text-xs text-secondary mt-0.5">Shift completed normally — no notification will be sent to the next operator</div>
                  </div>
                </button>
              </div>
            </>
          )}

          {mode === 'note' && (
            <>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">
                  Your Handover Note
                </label>
                <textarea
                  autoFocus
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="e.g. Compressor in Cold Room 3 restarted at 2:10 AM. Temperature returning to normal. Please monitor Room 3 until next shift. Gateway GGWCL00060 needs manual reboot."
                  className="w-full p-3 border border-outline-variant rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm h-36 resize-none"
                />
                <div className="text-[10px] text-secondary mt-1">
                  This note will appear in the next operator's Login Summary with a notification badge.
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setMode(null)}
                  className="flex-1 py-2.5 border border-outline-variant rounded-lg text-sm font-semibold text-secondary hover:bg-surface-container-low transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmitNote}
                  disabled={!note.trim() || loading}
                  className="flex-[2] py-2.5 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                  {loading ? 'Saving…' : 'Submit & Logout'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LogoutHandoverDialog;
