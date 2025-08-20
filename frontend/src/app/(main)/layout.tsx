'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Sidebar } from '@/components/layout/Sidebar';
import { useSidebar } from '@/hooks/useSidebar';

export default function MainAppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading, user, logout } = useAuth();
  const router = useRouter();

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
  
  const renderModule = () => {
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