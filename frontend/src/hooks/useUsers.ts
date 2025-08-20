'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const modules = [
  { id: 'dashboard', href: '/dashboard' },
  { id: 'reports', href: '/reports' },
  { id: 'predictions', href: '/predictions' },
  { id: 'analytics', href: '/analytics' },
  { id: 'data-entry', href: '/data-entry', adminOnly: true },
  { id: 'devices', href: '/devices', adminOnly: true },
  { id: 'ai-assistant', href: '/ai-assistant' },
  { id: 'users', href: '/users', adminOnly: true },
  { id: 'settings', href: '/settings' },
];

/**
 * Hook personalizado para manejar el estado de la barra lateral (Sidebar).
 * Gestiona el colapso, el tema y el módulo activo basado en la URL actual.
 *
 * @param {string} defaultModule - El ID del módulo por defecto.
 * @returns {object} Un objeto con el estado y los manejadores para el sidebar.
 */
export const useSidebar = (defaultModule = 'dashboard') => {
  const [collapsed, setCollapsed] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [currentModule, setCurrentModule] = useState(defaultModule);
  
  const router = useRouter();
  const pathname = usePathname();

  // Efecto para inicializar el estado del sidebar desde localStorage y el tema del sistema
  useEffect(() => {
    const savedCollapsed = localStorage.getItem('sidebarCollapsed');
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;

    if (savedCollapsed) {
      setCollapsed(JSON.parse(savedCollapsed));
    }
    if (savedTheme) {
      setTheme(savedTheme);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    }
  }, []);

  // Efecto para sincronizar el tema con la clase del <html> y guardarlo en localStorage
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);
  
  // Nuevo efecto para sincronizar el estado activo del sidebar con la URL actual
  useEffect(() => {
    const activeModule = modules.find(module => pathname.startsWith(module.href));
    if (activeModule) {
      setCurrentModule(activeModule.id);
    } else {
      setCurrentModule(defaultModule); // Vuelve al estado por defecto si no hay coincidencia.
    }
  }, [pathname, defaultModule]);

  const handleToggleCollapse = useCallback(() => {
    setCollapsed(prev => {
      const newState = !prev;
      localStorage.setItem('sidebarCollapsed', JSON.stringify(newState));
      return newState;
    });
  }, []);

  const handleToggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const handleModuleChange = useCallback((module: { id: string; href: string }) => {
    setCurrentModule(module.id);
    router.push(module.href);
  }, [router]);

  return {
    collapsed,
    theme,
    currentModule,
    handleToggleCollapse,
    handleToggleTheme,
    handleModuleChange,
  };
};