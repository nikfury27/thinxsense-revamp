import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardView from './views/DashboardView';
import GroupsView from './views/GroupsView';
import SensorsView from './views/SensorsView';
import AlertsView from './views/AlertsView';
import UsersView from './views/UsersView';
import GatewaysView from './views/GatewaysView';

function App() {
  const [currentView, setCurrentView] = useState('home');

  // Page Routing resolver
  const renderActiveView = () => {
    switch (currentView) {
      case 'home':
        return <DashboardView />;
      case 'groups':
        return <GroupsView />;
      case 'sensors':
        return <SensorsView />;
      case 'alerts':
        return <AlertsView />;
      case 'users':
        return <UsersView />;
      case 'gateways':
        return <GatewaysView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-on-surface select-none">
      {/* Fixed Left Navigation Sidebar */}
      <Sidebar 
        currentView={currentView} 
        onViewChange={setCurrentView} 
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col ml-[240px] h-full overflow-hidden bg-surface">
        {/* Top AppBar */}
        <Header />

        {/* Dynamic Page Canvas wrapper */}
        <main className="flex-1 overflow-y-auto p-margin-page bg-surface-container-low relative">
          <div className="max-w-7xl mx-auto h-full">
            {renderActiveView()}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
