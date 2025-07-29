import React, { useState, Suspense } from 'react';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';
import { LoginForm } from './components/auth/LoginForm';
import { Sidebar } from './components/layout/Sidebar';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import { Dashboard } from './components/modules/Dashboard';
import { Reports } from './components/modules/Reports';
import { Predictions } from './components/modules/Predictions';
import { DataEntry } from './components/modules/DataEntry';
import { Analytics } from './components/modules/Analytics';
import { Settings } from './components/modules/Settings';
import { UserManagement } from './components/modules/UserManagement';
import { Sensors } from './components/modules/Sensors';

function App() {
  const { user, isAuthenticated, loading: authLoading, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [currentModule, setCurrentModule] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Modificación mínima para agregar transición
  const handleModuleChange = (module: string) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentModule(module);
      setIsTransitioning(false);
    }, 300); // Ajusta este tiempo según necesites
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Cargando...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  const renderCurrentModule = () => {
    if (isTransitioning) {
      return (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="md" />
        </div>
      );
    }

    switch (currentModule) {
      case 'dashboard': return <Dashboard />;
      case 'reports': return <Reports />;
      case 'predictions': return <Predictions />;
      case 'data-entry': return <DataEntry />;
      case 'users': return <UserManagement />;
      case 'analytics': return <Analytics />;
      case 'sensors': return <Sensors />;
      case 'settings': return <Settings />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="flex h-screen">
        <Sidebar
          currentModule={currentModule}
          onModuleChange={handleModuleChange} // Usamos la nueva función
          user={user!}
          onLogout={logout}
          theme={theme}
          onToggleTheme={toggleTheme}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

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