import React, { useState } from 'react';
import LogoutHandoverDialog from './LogoutHandoverDialog';

const Sidebar = ({ currentView, onViewChange, currentUser, onLogout }) => {
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const menuItems = [
    { id: 'home',       label: 'Home',       icon: 'home' },
    { id: 'thinxverse', label: 'ThinxVerse', icon: 'explore' },
    { id: 'groups',     label: 'Groups',     icon: 'group_work' },
    { id: 'sensors',    label: 'Sensors',    icon: 'sensors' },
    { id: 'alerts',     label: 'Alerts',     icon: 'notifications_active' },
    { id: 'users',      label: 'Users',      icon: 'person' },
    { id: 'gateways',   label: 'Gateways',   icon: 'router' },
    { id: 'support',    label: 'Support Chat', icon: 'support_agent' },
  ];

  return (
    <>
      <aside className="fixed left-0 top-0 h-full w-[72px] lg:w-[240px] z-50 bg-primary flex flex-col py-6 text-white shrink-0 shadow-lg border-r border-white/5">
        {/* Brand */}
        <div className="px-4 lg:px-6 mb-8 flex items-center justify-center lg:justify-start gap-3 w-full">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shrink-0 shadow-md">
            <span className="text-primary font-bold text-sm">GND</span>
          </div>
          <div className="hidden lg:block">
            <h1 className="font-headline-md text-[16px] font-bold text-white leading-tight tracking-wider">GND SOLUTIONS</h1>
            <p className="text-white/60 text-xs">Industrial IoT Platform</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 lg:px-3 w-full">
          <ul className="space-y-1 w-full">
            {menuItems.map((item) => {
              const isActive = currentView === item.id;
              return (
                <li key={item.id} className="w-full">
                  <button
                    onClick={() => onViewChange(item.id)}
                    className={`w-full flex items-center justify-center lg:justify-start gap-4 px-2 lg:px-4 py-3 rounded-lg transition-all duration-200 active:scale-95 text-left ${
                      isActive
                        ? 'bg-white/10 border-r-4 lg:border-r-0 lg:border-l-4 border-white text-white font-bold'
                        : 'text-white/70 hover:text-white hover:bg-white/5'
                    }`}
                    title={item.label}
                  >
                    <span className={`material-symbols-outlined text-[20px] ${isActive ? 'fill' : ''}`}>{item.icon}</span>
                    <span className="hidden lg:inline font-body-md text-sm">{item.label}</span>
                  </button>
                </li>
              );
            })}
            <li className="w-full">
              <button
                onClick={() => alert('Opening manual documentation...')}
                className="w-full flex items-center justify-center lg:justify-start gap-4 px-2 lg:px-4 py-3 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-all text-left"
                title="Manual"
              >
                <span className="material-symbols-outlined text-[20px]">menu_book</span>
                <span className="hidden lg:inline font-body-md text-sm">Manual</span>
              </button>
            </li>
          </ul>
        </nav>

        {/* Footer — user + logout */}
        <div className="flex flex-col mt-auto pt-4 border-t border-white/10 w-full px-2 lg:px-4">
          <div className="flex items-center gap-3 px-2 py-2 mb-2 justify-center lg:justify-start">
            <div className="w-8 h-8 rounded-full bg-white text-primary flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
              {currentUser?.initials ?? '?'}
            </div>
            <div className="hidden lg:block">
              <p className="font-bold text-sm text-white capitalize">{currentUser?.username}</p>
              <p className="text-xs text-white/70">{currentUser?.role}</p>
            </div>
          </div>

          <button
            onClick={() => setShowLogoutDialog(true)}
            className="w-full flex items-center justify-center lg:justify-start gap-4 px-2 lg:px-4 py-3 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-all active:scale-95 text-left"
            title="Logout"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            <span className="hidden lg:inline font-body-md text-sm">Logout</span>
          </button>
          <p className="hidden lg:block text-[10px] text-white/40 text-center mt-4">Version 2.0</p>
        </div>
      </aside>

      {showLogoutDialog && (
        <LogoutHandoverDialog
          currentUser={currentUser}
          onConfirmLogout={() => { setShowLogoutDialog(false); onLogout(); }}
          onCancel={() => setShowLogoutDialog(false)}
        />
      )}
    </>
  );
};

export default Sidebar;
