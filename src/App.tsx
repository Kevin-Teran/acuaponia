import React, { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';
import { LoginForm } from './components/auth/LoginForm';
import { Sidebar } from './components/layout/Sidebar';
import { Dashboard } from './components/modules/Dashboard';
import { Reports } from './components/modules/Reports';
import { Predictions } from './components/modules/Predictions';
import { DataEntry } from './components/modules/DataEntry';
import { Analytics } from './components/modules/Analytics';
import { Settings } from './components/modules/Settings';
import { UserManagement } from './components/modules/UserManagement';
import { Sensors } from './components/modules/Sensors';
import { LoadingSpinner } from './components/common/LoadingSpinner';

function App() {
  const { user, isAuthenticated, loading: authLoading, login, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [currentModule, setCurrentModule] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginForm onLogin={login} loading={authLoading} />;
  }

  const renderCurrentModule = () => {
    switch (currentModule) {
      case 'dashboard':
        return <Dashboard />;
      case 'reports':
        return <Reports />;
      case 'predictions':
        return <Predictions />;
      case 'data-entry':
        return <DataEntry />;
      case 'users':
        return <UserManagement />;
      case 'analytics':
        return <Analytics />;
      case 'sensors':
        return <Sensors />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="flex h-screen">
        {/* Sidebar */}
        <Sidebar
          currentModule={currentModule}
          onModuleChange={setCurrentModule}
          user={user!}
          onLogout={logout}
          theme={theme}
          onToggleTheme={toggleTheme}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            {renderCurrentModule()}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;