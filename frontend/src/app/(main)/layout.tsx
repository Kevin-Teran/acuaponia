/**
 * @file layout.tsx
 * @description Layout principal para las rutas protegidas de la aplicación.
 * @author Kevin Mariano
 * @version 3.1.0
 */
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar/Sidebar';
import { modules } from '@/components/layout/sidebar/constants';
import { useAuth } from '@/context/AuthContext';

/**
 * @component MainLayout
 * @description Provee la estructura principal (Sidebar y contenido) para las páginas autenticadas.
 * @param {object} props - Propiedades del componente.
 * @param {React.ReactNode} props.children - Los componentes de la página actual a renderizar.
 * @returns {React.ReactElement | null} El layout de la aplicación o null durante la verificación.
 */
export default function MainLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, logout, theme, toggleTheme } = useAuth();

  const [collapsed, setCollapsed] = useState(false);

  const getModuleIdFromPath = (path: string): string => {
    if (path.startsWith('/settings')) return 'settings';
    const activeModule = modules.find(m => path.startsWith(m.href));
    return activeModule?.id || 'dashboard';
  };

  const [currentModuleId, setCurrentModuleId] = useState(getModuleIdFromPath(pathname));

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [isLoading, user, router]);

  useEffect(() => {
      setCurrentModuleId(getModuleIdFromPath(pathname));
  }, [pathname]);

  const onToggleCollapse = useCallback(() => setCollapsed(prev => !prev), []);
  
  const handleModuleChange = useCallback((module: { id: string; href: string; }) => {
    setCurrentModuleId(module.id);
    router.push(module.href);
  }, [router]);

  const handleLogout = useCallback(() => {
    logout();
  }, [logout]);

  if (isLoading || !user) {
    return null; 
  }
  
  return (
    <div className={`flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 transition-colors duration-300 ${theme}`}>
      <Sidebar
        user={user}
        onLogout={handleLogout}
        collapsed={collapsed}
        onToggleCollapse={onToggleCollapse}
        theme={theme}
        onToggleTheme={toggleTheme}
        currentModuleId={currentModuleId}
        onModuleChange={handleModuleChange}
      />
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 transition-all duration-300">
        {children}
      </main>
    </div>
  );
}