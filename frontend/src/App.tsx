import React, { useState, Suspense } from 'react';
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

/**
 * @component App
 * @description Componente principal de la aplicación que maneja el enrutamiento y layout básico
 * @returns {JSX.Element} Estructura principal de la aplicación
 */
function App() {
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [currentModule, setCurrentModule] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  /**
   * @function handleModuleChange
   * @description Maneja el cambio entre módulos
   * @param {string} module - Nombre del módulo a cargar
   */
  const handleModuleChange = (module: string) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentModule(module);
      setIsTransitioning(false);
    }, 300);
  };

  // Redirige al login si no está autenticado
  if (!isAuthenticated) {
    return <LoginForm />;
  }

  /**
   * @function renderCurrentModule
   * @description Renderiza el módulo actual basado en el estado
   * @returns {JSX.Element} Componente del módulo actual
   */
  const renderCurrentModule = () => {
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <div className="flex h-screen">
        <Sidebar
          currentModule={currentModule}
          onModuleChange={handleModuleChange} 
          user={user!}
          onLogout={logout}
          theme={theme}
          onToggleTheme={toggleTheme}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="p-6 animate-in fade-in duration-300">
            <Suspense fallback={null}>
              {renderCurrentModule()}
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;