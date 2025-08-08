import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';
import { Sidebar } from './Sidebar';
import { User } from '../../types';

interface AppLayoutProps {
  user: User;
  onLogout: () => void;
  children: React.ReactNode;
}

/**
 * @component AppLayout
 * @description Define la estructura visual principal de la aplicación (Sidebar + Contenido).
 * Es responsable de gestionar el estado de la navegación entre módulos y el cambio de tema.
 */
export const AppLayout: React.FC<AppLayoutProps> = ({ user, onLogout, children }) => {
  // CORRECCIÓN: La lógica del tema ahora vive aquí, en el layout principal.
  const { theme, toggleTheme } = useTheme();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  
  const currentModule = location.pathname.split('/')[1] || 'dashboard';

  const handleModuleChange = (module: string) => {
    navigate(`/${module}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <div className="flex h-screen">
        <Sidebar
          currentModule={currentModule}
          onModuleChange={handleModuleChange}
          user={user}
          onLogout={onLogout}
          theme={theme} // <-- Pasamos el tema actual al Sidebar
          onToggleTheme={toggleTheme} // <-- Pasamos la función para cambiar el tema
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 animate-in fade-in duration-300">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};