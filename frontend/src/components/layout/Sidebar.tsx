import React from 'react';
import Image from 'next/image';
import {
  Activity, BarChart3, TrendingUp, FileText, Settings, Cpu, DatabaseZap,
  LogOut, Moon, Sun, ChevronLeft, ChevronRight, Sparkles, User as UserIcon
} from 'lucide-react';
import { clsx } from 'clsx';
import { User } from '@/types';

/**
 * Define la estructura de un módulo de navegación para la barra lateral.
 * @typedef {Object} Module
 * @property {string} id - Identificador único del módulo.
 * @property {string} name - Nombre legible del módulo.
 * @property {React.ElementType} icon - El componente de icono de 'lucide-react'.
 * @property {string} href - La ruta de navegación.
 * @property {boolean} [adminOnly] - Opcional. Indica si el módulo es solo para administradores.
 */
const modules = [
  { id: 'dashboard', name: 'Dashboard', icon: Activity, href: '/dashboard' },
  { id: 'reports', name: 'Reportes', icon: FileText, href: '/reports' },
  { id: 'predictions', name: 'Predictivo', icon: TrendingUp, href: '/predictions' },
  { id: 'analytics', name: 'Análisis', icon: BarChart3, href: '/analytics' },
  { id: 'data-entry', name: 'Recolección', icon: DatabaseZap, href: '/data-entry', adminOnly: true },
  { id: 'devices', name: 'Dispositivos', icon: Cpu, href: '/devices', adminOnly: true },
  { id: 'ai-assistant', name: 'Asistencia IA', icon: Sparkles, href: '/ai-assistant' },
  { id: 'users', name: 'Usuarios', icon: UserIcon, href: '/users', adminOnly: true },
];

/**
 * Propiedades del componente Sidebar.
 * @interface SidebarProps
 * @property {User | null} user - Objeto de usuario autenticado. Puede ser nulo.
 * @property {() => void} onLogout - Función para manejar el cierre de sesión.
 * @property {boolean} collapsed - Indica si la barra lateral está colapsada.
 * @property {() => void} onToggleCollapse - Función para alternar el estado de colapso.
 * @property {'light' | 'dark'} theme - El tema actual de la aplicación.
 * @property {() => void} onToggleTheme - Función para alternar entre el tema claro y oscuro.
 * @property {string} currentModule - El ID del módulo activo actualmente.
 * @property {(module: { id: string; href: string; }) => void} onModuleChange - Función para manejar el cambio de módulo.
 */
interface SidebarProps {
  user: User | null;
  onLogout: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  currentModule: string;
  onModuleChange: (module: { id: string; href: string; }) => void;
}

/**
 * Componente de barra lateral (Sidebar) para la aplicación.
 * Gestiona la navegación principal, el perfil del usuario, la configuración y el cambio de tema.
 * @component
 * @param {SidebarProps} props - Las propiedades del componente.
 * @returns {React.FC<SidebarProps>} El componente de la barra lateral.
 */
export const Sidebar: React.FC<SidebarProps> = React.memo(({
  user,
  onLogout,
  collapsed,
  onToggleCollapse,
  theme,
  onToggleTheme,
  currentModule,
  onModuleChange,
}) => {
  return (
    <aside
      className={clsx(
        'h-full flex flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300',
        collapsed ? 'w-20' : 'w-64'
      )}
      aria-label="Barra lateral de navegación principal"
    >
      
      {/* Encabezado con Logo y Botón de Colapsar */}
      <div className="flex items-center p-4 h-16 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        {!collapsed && (
          <div className="flex items-center space-x-3">
            <Image src="/logo-sena.png" alt="Logo SENA" width={32} height={32} priority />
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">Acuaponia</h1>
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className={clsx("p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors", collapsed ? 'ml-auto' : 'ml-auto')}
          aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          title={collapsed ? 'Expandir' : 'Colapsar'}
        >
          {collapsed ? <ChevronRight /> : <ChevronLeft />}
        </button>
      </div>

      {/* Navegación Principal */}
      <nav className="flex-1 p-2 overflow-y-auto">
        <ul className="space-y-1">
          {modules.map((module) => {
            if (module.adminOnly && user?.role !== 'ADMIN') return null;
            const Icon = module.icon;
            const isActive = currentModule === module.id;
            
            return (
              <li key={module.id}>
                <a
                  href={module.href}
                  onClick={(e) => { e.preventDefault(); onModuleChange(module); }}
                  className={clsx(
                    'w-full flex items-center px-3 py-2.5 text-left rounded-md transition-colors',
                    isActive
                      ? 'bg-green-600/10 text-green-600 dark:bg-green-500/20 dark:text-green-400 font-semibold'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700',
                    collapsed && 'justify-center'
                  )}
                  title={module.name}
                  aria-label={`Navegar a ${module.name}`}
                >
                  <Icon className={clsx('w-5 h-5 flex-shrink-0', !collapsed && 'mr-3')} />
                  {!collapsed && <span className="text-sm font-medium">{module.name}</span>}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Perfil y Acciones Inferiores */}
      <div className="p-2 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className={clsx("flex items-center w-full p-2 rounded-lg mb-1", collapsed ? 'justify-center' : 'space-x-3')}>
            <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-green-600 dark:text-green-400 font-semibold">
                {user?.name?.[0]?.toUpperCase() ?? '?'}
                </span>
            </div>
            {!collapsed && (
                <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user?.name ?? 'Usuario'}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{user?.role === 'ADMIN' ? 'Administrador' : 'Usuario'}</p>
                </div>
            )}
        </div>

        <button
            onClick={() => onModuleChange({ id: 'settings', href: '/settings' })}
            className={clsx(
                'w-full flex items-center px-3 py-2.5 text-left rounded-md transition-colors',
                currentModule === 'settings'
                    ? 'bg-green-600/10 text-green-600 dark:bg-green-500/20 dark:text-green-400 font-semibold'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700',
                collapsed && 'justify-center'
            )}
            title="Configuración"
            aria-label="Abrir configuración"
        >
            <Settings className={clsx('w-5 h-5', !collapsed && 'mr-3')} />
            {!collapsed && <span className="text-sm">Configuración</span>}
        </button>
        <button
            onClick={onToggleTheme}
            className="w-full flex items-center px-3 py-2.5 text-left rounded-md transition-colors text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            title={theme === 'light' ? 'Activar tema oscuro' : 'Activar tema claro'}
            aria-label={theme === 'light' ? 'Cambiar a tema oscuro' : 'Cambiar a tema claro'}
        >
            {theme === 'light' ? <Moon className={clsx('w-5 h-5', !collapsed && 'mr-3')} /> : <Sun className={clsx('w-5 h-5', !collapsed && 'mr-3')} />}
            {!collapsed && <span className="text-sm">{theme === 'light' ? 'Tema oscuro' : 'Tema claro'}</span>}
        </button>
        <button
            onClick={onLogout}
            className="w-full flex items-center px-3 py-2.5 text-left rounded-md transition-colors text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
        >
            <LogOut className={clsx('w-5 h-5', !collapsed && 'mr-3')} />
            {!collapsed && <span className="text-sm">Cerrar Sesión</span>}
        </button>
      </div>
    </aside>
  );
});

Sidebar.displayName = 'Sidebar';