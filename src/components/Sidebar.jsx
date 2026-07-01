import React from 'react';

const Sidebar = ({ currentView, onViewChange }) => {
  const menuItems = [
    { id: 'home', label: 'Home', icon: 'home' },
    { id: 'groups', label: 'Groups', icon: 'group_work' },
    { id: 'sensors', label: 'Sensors', icon: 'sensors' },
    { id: 'alerts', label: 'Alerts', icon: 'notifications_active' },
    { id: 'users', label: 'Users', icon: 'person' },
    { id: 'gateways', label: 'Gateways', icon: 'router' },
  ];

  return (
    <aside className="fixed left-0 top-0 h-full w-[240px] z-50 bg-primary flex flex-col py-6 text-white shrink-0 shadow-lg">
      {/* Brand Header */}
      <div className="px-6 mb-8 flex items-center gap-3">
        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shrink-0 shadow-md">
          <span className="text-primary font-bold text-sm">GND</span>
        </div>
        <div>
          <h1 className="font-headline-md text-[16px] font-bold text-white leading-tight tracking-wider">
            GND SOLUTIONS
          </h1>
          <p className="text-white/60 text-xs">Industrial IoT Platform</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => onViewChange(item.id)}
                  className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-200 active:scale-95 text-left ${
                    isActive
                      ? 'bg-white/10 border-l-4 border-white text-white font-bold'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className={`material-symbols-outlined text-[20px] ${isActive ? 'fill' : ''}`}>
                    {item.icon}
                  </span>
                  <span className="font-body-md text-sm">{item.label}</span>
                </button>
              </li>
            );
          })}
          
          {/* Static Item: Manual */}
          <li>
            <button
              onClick={() => alert('Opening manual documentation...')}
              className="w-full flex items-center gap-4 px-4 py-3 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-all text-left"
            >
              <span className="material-symbols-outlined text-[20px]">menu_book</span>
              <span className="font-body-md text-sm">Manual</span>
            </button>
          </li>
        </ul>
      </nav>

      {/* Footer Profile & Logout */}
      <div className="px-4 mt-auto pt-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-4 py-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-white text-primary flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
            S
          </div>
          <div>
            <p className="font-bold text-sm text-white">shwetha</p>
            <p className="text-xs text-white/70">ADMIN</p>
          </div>
        </div>
        
        <button
          onClick={() => {
            if (confirm('Are you sure you want to log out?')) {
              alert('Logged out. (Mock action)');
            }
          }}
          className="w-full flex items-center gap-4 px-4 py-3 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-all active:scale-95 text-left"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          <span className="font-body-md text-sm">Logout</span>
        </button>
        <p className="text-[10px] text-white/40 text-center mt-4">Version 2.0</p>
      </div>
    </aside>
  );
};

export default Sidebar;
