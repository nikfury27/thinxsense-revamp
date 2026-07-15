import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardView from './views/DashboardView';
import GroupsView from './views/GroupsView';
import SensorsView from './views/SensorsView';
import AlertsView from './views/AlertsView';
import UsersView from './views/UsersView';
import GatewaysView from './views/GatewaysView';
import ThinxVerseView from './views/ThinxVerseView';
import LoginScreen from './components/LoginScreen';
import LoginSummaryModal from './components/LoginSummaryModal';
import ChatbotWidget from './components/ChatbotWidget';
import SupportConsoleView from './views/SupportConsoleView';

function App() {
  const [currentUser,      setCurrentUser]      = useState(null);   // null = logged out
  const [showLoginSummary, setShowLoginSummary] = useState(false);
  const [currentView,      setCurrentView]      = useState('home');
  const [navigationTarget, setNavigationTarget] = useState(null);

  const handleLogin = (user) => {
    setCurrentUser(user);
    setShowLoginSummary(true);   // always show summary after login
    setCurrentView('home');
  };

  const handleLogout = () => {
    localStorage.removeItem('thinxsense_chat_session_id');
    setCurrentUser(null);
    setShowLoginSummary(false);
    setCurrentView('home');
  };

  const handleNavigate = (view, targetId = null) => {
    setNavigationTarget(targetId ? { view, id: targetId } : null);
    setCurrentView(view);
  };

  // Not logged in — show login screen
  if (!currentUser) return <LoginScreen onLogin={handleLogin} />;

  const renderActiveView = () => {
    switch (currentView) {
      case 'home':       return <DashboardView onNavigate={handleNavigate} />;
      case 'groups':     return <GroupsView />;
      case 'sensors':    return <SensorsView navigationTarget={navigationTarget} clearNavigationTarget={() => setNavigationTarget(null)} />;
      case 'alerts':     return <AlertsView />;
      case 'users':      return <UsersView />;
      case 'gateways':   return <GatewaysView navigationTarget={navigationTarget} clearNavigationTarget={() => setNavigationTarget(null)} />;
      case 'thinxverse': return <ThinxVerseView onNavigate={handleNavigate} />;
      case 'support':    return <SupportConsoleView />;
      default:           return <DashboardView onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-on-surface select-none">
      <Sidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      <div className={`flex-1 flex flex-col ml-[72px] lg:ml-[240px] h-full overflow-hidden bg-surface transition-all duration-300 ${showLoginSummary ? 'blur-sm pointer-events-none' : ''}`}>
        <Header currentUser={currentUser} />
        <main className="flex-1 overflow-y-auto p-margin-page bg-surface-container-low relative">
          <div className="max-w-7xl mx-auto h-full">
            {renderActiveView()}
          </div>
        </main>
      </div>

      {showLoginSummary && (
        <LoginSummaryModal
          currentUser={currentUser}
          onDismiss={() => setShowLoginSummary(false)}
        />
      )}
      <ChatbotWidget />
    </div>
  );
}

export default App;
