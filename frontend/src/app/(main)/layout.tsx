'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar/Sidebar';
import { modules } from '@/components/layout/sidebar/constants';
import { useAuth } from '@/context/AuthContext';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, logout } = useAuth();

  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

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
  const onToggleTheme = useCallback(() => {
    setTheme(currentTheme => {
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';
      document.documentElement.classList.toggle('dark', newTheme === 'dark');
      return newTheme;
    });
  }, []);

  const handleModuleChange = useCallback((module: { id: string; href: string; }) => {
    setCurrentModuleId(module.id);
    router.push(module.href);
  }, [router]);

  const handleLogout = useCallback(() => {
    logout();
  }, [logout]);

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
      <Sidebar
        user={user}
        onLogout={handleLogout}
        collapsed={collapsed}
        onToggleCollapse={onToggleCollapse}
        theme={theme}
        onToggleTheme={onToggleTheme}
        currentModuleId={currentModuleId}
        onModuleChange={handleModuleChange}
      />
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}