import React, { useCallback } from 'react';
import { clsx } from 'clsx';
import { LogOut, Moon, Settings, Sun } from 'lucide-react';
import { SidebarProps } from './types';
import { SidebarHeader } from './SidebarHeader';
import { SidebarNav } from './SidebarNav';
import { UserProfile } from './UserProfile';
import { ActionButton } from './ActionButton';

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  onLogout,
  collapsed,
  onToggleCollapse,
  theme,
  onToggleTheme,
  currentModuleId,
  onModuleChange,
}) => {

  const handleSettingsClick = useCallback(() => {
    onModuleChange({ id: 'settings', href: '/settings' });
  }, [onModuleChange]);

  return (
    <aside
      className={clsx(
        'h-full flex flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300',
        'hidden md:flex',
        collapsed ? 'w-20' : 'w-64'
      )}
      aria-label="Barra lateral de navegación principal"
    >
      <SidebarHeader collapsed={collapsed} onToggleCollapse={onToggleCollapse} />
      <SidebarNav
        userRole={user?.role}
        currentModuleId={currentModuleId}
        collapsed={collapsed}
        onModuleChange={onModuleChange}
      />
      <div className="p-2 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
        <UserProfile user={user} collapsed={collapsed} />
        <ActionButton
            onClick={handleSettingsClick}
            title="Configuración"
            aria-label="Abrir configuración"
            isActive={currentModuleId === 'settings'}
            isCollapsed={collapsed}
        >
            <Settings className={clsx('w-5 h-5', !collapsed && 'mr-3')} />
            {!collapsed && <span className="text-sm">Configuración</span>}
        </ActionButton>
        <ActionButton
            onClick={onToggleTheme}
            title={theme === 'light' ? 'Activar tema oscuro' : 'Activar tema claro'}
            aria-label={theme === 'light' ? 'Cambiar a tema oscuro' : 'Cambiar a tema claro'}
            isCollapsed={collapsed}
        >
            {theme === 'light'
                ? <Moon className={clsx('w-5 h-5', !collapsed && 'mr-3')} />
                : <Sun className={clsx('w-5 h-5', !collapsed && 'mr-3')} />
            }
            {!collapsed && <span className="text-sm">{theme === 'light' ? 'Tema oscuro' : 'Tema claro'}</span>}
        </ActionButton>
        <ActionButton
            onClick={onLogout}
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
            isCollapsed={collapsed}
            className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
            <LogOut className={clsx('w-5 h-5', !collapsed && 'mr-3')} />
            {!collapsed && <span className="text-sm">Cerrar Sesión</span>}
        </ActionButton>
      </div>
    </aside>
  );
};
Sidebar.displayName = 'Sidebar';