/**
 * @file layout.tsx
 * @route frontend/src/app/(main)
 * @description Layout principal para las rutas protegidas de la aplicación.
 * Gestiona la verificación de sesión y presenta una pantalla de carga global
 * para evitar parpadeos o pantallas en blanco durante la autenticación inicial.
 * @author Kevin Mariano
 * @version 1.0.0
 * @since 1.0.0
 * @copyright SENA 2025
 */

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar/Sidebar';
import { modules } from '@/components/layout/sidebar/constants';
import { useAuth } from '@/context/AuthContext';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import LoadingScreen from './loading'; // Importamos el componente de carga

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading: authLoading, logout, theme, toggleTheme } = useAuth();

  const [collapsed, setCollapsed] = useState(false);
  
  // **SOLUCIÓN PARA CARGA CONSISTENTE**
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);
  
  // Cuando la ruta cambie, significa que la navegación ha terminado.
  useEffect(() => {
    setIsNavigating(false);
  }, [pathname]);

  const getModuleIdFromPath = (path: string): string => {
    if (path.startsWith('/settings')) return 'settings';
    const activeModule = modules.find(m => path.startsWith(m.href));
    return activeModule?.id || 'dashboard';
  };

  const [currentModuleId, setCurrentModuleId] = useState(getModuleIdFromPath(pathname));
  useEffect(() => {
    setCurrentModuleId(getModuleIdFromPath(pathname));
  }, [pathname]);

  const onToggleCollapse = useCallback(() => setCollapsed(prev => !prev), []);
  
  const handleModuleChange = useCallback((module: { id: string; href: string; }) => {
    // Si ya estamos en la página de destino, no hacemos nada.
    if (pathname === module.href) return;
    
    // Activamos el estado de navegación ANTES de cambiar la ruta.
    setIsNavigating(true);
    setCurrentModuleId(module.id);
    router.push(module.href);
  }, [router, pathname]);

  const handleLogout = useCallback(() => {
    logout();
  }, [logout]);

  // Pantalla de carga inicial (verificación de sesión)
  if (authLoading) {
    return <LoadingSpinner fullScreen message="Verificando sesión..." />;
  }

  if (!user) {
    return null; // Evita parpadeos
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
        {/*
         * Si estamos navegando, muestra la pantalla de carga.
         * Si no, muestra el contenido de la página actual.
         * Esto garantiza que el loader SIEMPRE se vea.
        */}
        {isNavigating ? <LoadingScreen /> : children}
      </main>
    </div>
  );
}