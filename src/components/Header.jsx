import React, { useState, useEffect } from 'react';
import { apiService } from '../api/apiService';
import ShiftHandoverDrawer from './ShiftHandoverDrawer';

const Header = ({ currentUser }) => {
  const [drawerOpen,  setDrawerOpen]  = useState(false);
  const [hasUnread,   setHasUnread]   = useState(false);

  // Check on mount whether there's an unread handover note
  useEffect(() => {
    apiService.getShiftHandover().then(h => {
      setHasUnread(h.noteType === 'note' && !h.viewed);
    });
  }, []);

  const handleOpenDrawer = () => {
    setDrawerOpen(true);
    setHasUnread(false); // badge clears immediately on open
  };

  return (
    <>
      <header className="w-full h-header-height bg-white/80 backdrop-blur-md border-b border-outline-variant flex items-center justify-between px-margin-page sticky top-0 z-40 shrink-0 overflow-hidden shadow-sm">
        {/* Decorative gradients */}
        <div className="absolute left-0 top-0 w-48 h-full opacity-35 pointer-events-none"
          style={{ background: 'radial-gradient(circle at 0% 50%, #b7c4ff, transparent)' }} />
        <div className="absolute right-0 top-0 w-64 h-full opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(circle at 100% 50%, #3154ca, transparent)' }} />

        {/* Left — Shift Handover button */}
        <div className="flex items-center gap-3 relative z-10">
          <button
            onClick={handleOpenDrawer}
            className="relative flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-full hover:bg-primary/25 transition-all text-xs font-semibold active:scale-95 duration-100"
          >
            <span className="material-symbols-outlined text-[16px]">assignment</span>
            <span className="hidden sm:inline">Shift Handover Digest</span>
            {hasUnread && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-error rounded-full border-2 border-white animate-pulse" />
            )}
          </button>
        </div>

        {/* Center — Brand */}
        <div className="flex-1 flex justify-center relative z-10">
          <h2 className="font-headline-lg text-lg sm:text-headline-lg italic font-black text-primary select-none tracking-tight">
            thinxsense
          </h2>
        </div>

        {/* Right — actions */}
        <div className="flex items-center gap-3 relative z-10">
          <button
            onClick={() => alert('No new alerts inside this shift.')}
            className="relative w-10 h-10 rounded-full hover:bg-surface-variant flex items-center justify-center text-on-surface-variant hover:text-primary transition-all duration-200 active:scale-90"
          >
            <span className="material-symbols-outlined">notifications</span>
          </button>

          <button
            onClick={() => alert('Opening global settings...')}
            className="w-10 h-10 rounded-full hover:bg-surface-variant flex items-center justify-center text-on-surface-variant hover:text-primary transition-all duration-200 active:scale-90"
          >
            <span className="material-symbols-outlined">settings</span>
          </button>

          <div className="w-8 h-8 rounded-full bg-primary-container text-white flex items-center justify-center font-bold text-sm ml-2 cursor-pointer shadow-sm select-none hover:opacity-90 active:scale-95 transition-all">
            {currentUser?.initials ?? '?'}
          </div>
        </div>
      </header>

      {drawerOpen && (
        <ShiftHandoverDrawer onClose={() => setDrawerOpen(false)} currentUser={currentUser} />
      )}
    </>
  );
};

export default Header;
