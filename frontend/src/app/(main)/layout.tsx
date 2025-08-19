'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Sidebar } from '@/components/layout/Sidebar';
import { useSidebar } from '@/hooks/useSidebar'; // Importa el nuevo hook

export default function MainAppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading, user, logout } = useAuth();
  const router = useRouter();

  // Usa el hook para controlar el estado del Sidebar
  const {
    collapsed,
    theme,
    currentModule,
    handleToggleCollapse,
    handleToggleTheme,
    handleModuleChange
  } = useSidebar('dashboard');

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, loading, router]);

  if (loading || !isAuthenticated) {
    return <LoadingSpinner fullScreen message="Cargando sesión..." />;
  }
  
  // Aquí decides qué componente mostrar basado en 'currentModule'
  // Por ahora, solo mostramos los children que vienen de la página actual.
  // Más adelante, podrías tener una lógica para cambiar entre vistas si no usas rutas.
  const renderModule = () => {
    // switch (currentModule) {
    //   case 'dashboard':
    //     return children; // Asume que /dashboard es la página
    //   case 'reports':
    //     return <ReportsPage />; // Componente de la página de reportes
    //   default:
    //     return children;
    // }
    return children;
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar
        user={user}
        onLogout={logout}
        collapsed={collapsed}
        onToggleCollapse={handleToggleCollapse}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        currentModule={currentModule}
        onModuleChange={handleModuleChange}
      />

      <main className="flex-1 overflow-y-auto p-6">
        {renderModule()}
      </main>
    </div>
  );
}