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
  ChevronRight
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
  { id: 'data-entry', name: 'Recolección', icon: Database, description: 'Ingreso manual' },
  { id: 'analytics', name: 'Análisis', icon: BarChart3, description: 'Estadísticas avanzadas' },
  { id: 'sensors', name: 'Sensores', icon: Cpu, description: 'Gestión IoT y tanques' },
  { id: 'users', name: 'Usuarios', icon: Settings, description: 'Gestión de usuarios', adminOnly: true },
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
    <div className={cn(
      'h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300',
      collapsed ? 'w-16' : 'w-64'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        {!collapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">A</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">Acuaponia</h1>
            </div>
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          ) : (
            <ChevronLeft className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          )}
        </button>
      </div>

      {/* User Info */}
      {!collapsed && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
              <span className="text-blue-600 dark:text-blue-300 font-semibold">
                {user.name.charAt(0)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {user.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {user.role === 'admin' ? 'Administrador' : 'Usuario'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-2">
        <ul className="space-y-1">
          {modules.map((module) => {
            const Icon = module.icon;
            const isActive = currentModule === module.id;
            
            // Restringir acceso basado en roles
            if (user.role === 'user' && ['data-entry', 'analytics', 'sensors', 'users'].includes(module.id)) {
              return null;
            }
            
            // Módulos solo para administradores
            if (module.adminOnly && user.role !== 'admin') {
              return null;
            }

            return (
              <li key={module.id}>
                <button
                  onClick={() => onModuleChange(module.id)}
                  className={cn(
                    'w-full flex items-center px-3 py-2 text-left rounded-md transition-colors',
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 border-r-2 border-blue-600'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  )}
                  title={collapsed ? `${module.name} - ${module.description}` : ''}
                >
                  <Icon className={cn('w-5 h-5', collapsed ? '' : 'mr-3')} />
                  {!collapsed && (
                    <div>
                      <div className="font-medium">{module.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {module.description}
                      </div>
                    </div>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom Actions */}
      <div className="p-2 border-t border-gray-200 dark:border-gray-700">
        <div className="space-y-1">
          <button
            onClick={onToggleTheme}
            className={cn(
              'w-full flex items-center px-3 py-2 text-left rounded-md transition-colors',
              'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            )}
            title={collapsed ? `Cambiar a tema ${theme === 'light' ? 'oscuro' : 'claro'}` : ''}
          >
            {theme === 'light' ? (
              <Moon className={cn('w-5 h-5', collapsed ? '' : 'mr-3')} />
            ) : (
              <Sun className={cn('w-5 h-5', collapsed ? '' : 'mr-3')} />
            )}
            {!collapsed && (
              <span>{theme === 'light' ? 'Tema oscuro' : 'Tema claro'}</span>
            )}
          </button>

          {user.role === 'admin' && (
            <button
              onClick={() => onModuleChange('users')}
              className={cn(
                'w-full flex items-center px-3 py-2 text-left rounded-md transition-colors',
                currentModule === 'users'
                  ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              )}
              title={collapsed ? 'Gestión de Usuarios' : ''}
            >
              <Settings className={cn('w-5 h-5', collapsed ? '' : 'mr-3')} />
              {!collapsed && <span>Gestión de Usuarios</span>}
            </button>
          )}

          {user.role === 'admin' && (
            <button
              onClick={() => onModuleChange('settings')}
              className={cn(
                'w-full flex items-center px-3 py-2 text-left rounded-md transition-colors',
                currentModule === 'settings'
                  ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              )}
              title={collapsed ? 'Configuración del Sistema' : ''}
            >
              <Settings className={cn('w-5 h-5', collapsed ? '' : 'mr-3')} />
              {!collapsed && <span>Configuración</span>}
            </button>
          )}

          <button
            onClick={onLogout}
            className={cn(
              'w-full flex items-center px-3 py-2 text-left rounded-md transition-colors',
              'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
            )}
            title={collapsed ? 'Cerrar sesión' : ''}
          >
            <LogOut className={cn('w-5 h-5', collapsed ? '' : 'mr-3')} />
            {!collapsed && <span>Cerrar Sesión</span>}
          </button>
        </div>
      </div>
    </div>
  );
};