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
  const [navigationTarget, setNavigationTarget] = useState(null);

  const handleNavigate = (view, targetId = null) => {
    if (targetId) {
      setNavigationTarget({ view, id: targetId });
    } else {
      setNavigationTarget(null);
    }
    setCurrentView(view);
  };

  // Page Routing resolver
  const renderActiveView = () => {
    switch (currentView) {
      case 'home':
        return <DashboardView onNavigate={handleNavigate} />;
      case 'groups':
        return <GroupsView />;
      case 'sensors':
        return (
          <SensorsView 
            navigationTarget={navigationTarget} 
            clearNavigationTarget={() => setNavigationTarget(null)} 
          />
        );
      case 'alerts':
        return <AlertsView />;
      case 'users':
        return <UsersView />;
      case 'gateways':
        return (
          <GatewaysView 
            navigationTarget={navigationTarget} 
            clearNavigationTarget={() => setNavigationTarget(null)} 
          />
        );
      default:
        return <DashboardView onNavigate={handleNavigate} />;
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
