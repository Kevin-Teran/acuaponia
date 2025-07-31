import React from 'react';
import {
  Activity,
  BarChart3,
  TrendingUp,
  FileText,
  Database,
  Settings,
  Cpu,
  LogOut,
  Moon,
  Sun,
  ChevronLeft,
  ChevronRight,
  Sparkles, 
  User as UserIcon
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { User } from '../../types';

interface SidebarProps {
  currentModule: string;
  onModuleChange: (module: string) => void;
  user: User;
  onLogout: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const modules = [
  { id: 'dashboard', name: 'Dashboard', icon: Activity, description: 'Monitoreo en tiempo real' },
  { id: 'reports', name: 'Reportes', icon: FileText, description: 'Históricos y exportación' },
  { id: 'predictions', name: 'Predictivo', icon: TrendingUp, description: 'Modelos y forecast' },
  { id: 'analytics', name: 'Análisis', icon: BarChart3, description: 'Estadísticas avanzadas' },
  { id: 'sensors', name: 'Tanques y Sensores', icon: Cpu, description: 'Gestión de dispositivos IoT' },
  { id: 'data-entry', name: 'Recolección', icon: Database, description: 'Ingreso manual de datos', adminOnly: true },
  { id: 'ai-assistant', name: 'Asistencia con IA', icon: Sparkles, description: 'Asistente inteligente', disabled: true },
  { id: 'users', name: 'Usuarios', icon: UserIcon, description: 'Gestión de usuarios', adminOnly: true },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentModule,
  onModuleChange,
  user,
  onLogout,
  theme,
  onToggleTheme,
  collapsed,
  onToggleCollapse,
}) => {
  return (
    <aside className={cn(
      'h-full flex flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300',
      collapsed ? 'w-20' : 'w-64'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 h-16 border-b border-gray-200 dark:border-gray-700">
        {!collapsed && (
          <div className="flex items-center space-x-3">
            <img src="/logo-sena.png" alt="Logo SENA" className="h-8 w-8" />
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">Acuaponia</h1>
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className={cn(
            "p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors",
            collapsed && "mx-auto"
          )}
        >
          {collapsed ? <ChevronRight className="w-5 h-5 text-gray-500 dark:text-gray-400" /> : <ChevronLeft className="w-5 h-5 text-gray-500 dark:text-gray-400" />}
        </button>
      </div>

      {/* User Info */}
      <div className={cn("p-4 border-b border-gray-200 dark:border-gray-700", collapsed && "p-2")}>
        <div className={cn("flex items-center", collapsed ? "justify-center" : "space-x-3")}>
          <div className="w-10 h-10 bg-sena-green/20 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-sena-green font-semibold">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate" title={user.name}>
                {user.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {user.role === 'ADMIN' ? 'Administrador' : 'Usuario'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 overflow-y-auto">
        <ul className="space-y-1">
          {modules.map((module) => {
            const Icon = module.icon;
            const isActive = currentModule === module.id;

            if (module.adminOnly && user.role !== 'ADMIN') {
              return null;
            }

            return (
              <li key={module.id}>
                <button
                  onClick={() => !module.disabled && onModuleChange(module.id)}
                  disabled={module.disabled}
                  className={cn(
                    'w-full flex items-center px-3 py-2.5 text-left rounded-md transition-colors',
                    isActive
                      ? 'bg-sena-green/10 text-sena-green'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700',
                    collapsed && 'justify-center',
                    module.disabled && 'opacity-50 cursor-not-allowed hover:bg-transparent dark:hover:bg-transparent'
                  )}
                  title={collapsed ? module.name : (module.disabled ? 'Próximamente...' : module.description)}
                >
                  <Icon className={cn('w-5 h-5 flex-shrink-0', !collapsed && 'mr-3')} />
                  {!collapsed && (
                    <span className="font-medium text-sm">{module.name}</span>
                  )}
                  {!collapsed && module.disabled && (
                     <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">Próximamente</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom Actions */}
      <div className="p-2 border-t border-gray-200 dark:border-gray-700">
        <ul className="space-y-1">
            <li>
                <button
                    onClick={() => onModuleChange('settings')}
                    className={cn(
                        'w-full flex items-center px-3 py-2.5 text-left rounded-md transition-colors',
                        currentModule === 'settings'
                            ? 'bg-sena-green/10 text-sena-green'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700',
                        collapsed && 'justify-center'
                    )}
                    title={collapsed ? 'Configuración' : ''}
                >
                    <Settings className={cn('w-5 h-5', !collapsed && 'mr-3')} />
                    {!collapsed && <span className="text-sm">Configuración</span>}
                </button>
            </li>
            <li>
                <button
                    onClick={onToggleTheme}
                    className={cn(
                        'w-full flex items-center px-3 py-2.5 text-left rounded-md transition-colors text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700',
                        collapsed && 'justify-center'
                    )}
                    title={collapsed ? `Cambiar a tema ${theme === 'light' ? 'oscuro' : 'claro'}` : ''}
                >
                    {theme === 'light' ? <Moon className={cn('w-5 h-5', !collapsed && 'mr-3')} /> : <Sun className={cn('w-5 h-5', !collapsed && 'mr-3')} />}
                    {!collapsed && <span className="text-sm">{theme === 'light' ? 'Tema oscuro' : 'Tema claro'}</span>}
                </button>
            </li>
            <li>
                <button
                    onClick={onLogout}
                    className={cn(
                        'w-full flex items-center px-3 py-2.5 text-left rounded-md transition-colors text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20',
                        collapsed && 'justify-center'
                    )}
                    title={collapsed ? 'Cerrar sesión' : ''}
                >
                    <LogOut className={cn('w-5 h-5', !collapsed && 'mr-3')} />
                    {!collapsed && <span className="text-sm">Cerrar Sesión</span>}
                </button>
            </li>
        </ul>
      </div>
    </aside>
  );
};