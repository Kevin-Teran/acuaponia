/**
 * @file SidebarHeader.tsx
 * @route frontend/src/components/layout/sidebar
 * @description 
 * @author Kevin Mariano
 * @version 1.0.0
 * @since 1.0.0
 * @copyright SENA 2025
*/

import React from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';

interface SidebarHeaderProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const SidebarHeader: React.FC<SidebarHeaderProps> = React.memo(({ collapsed, onToggleCollapse }) => (
  <div className="flex items-center p-4 h-16 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
    {!collapsed && (
      <div className={clsx("flex items-center space-x-3")}>
        {/* Contenedor con position: relative - ES NECESARIO para fill */}
        <div className="relative w-9 h-9"> 
          <Image
            src="/logo-sena.png"
            alt="Logo del SENA, Servicio Nacional de Aprendizaje de Colombia"
            fill
            className="object-contain"
            priority
          />
        </div>
        <h1 className="text-lg font-bold text-gray-900 dark:text-white whitespace-nowrap">Acuaponia</h1>
      </div>
    )}
    <button
      onClick={onToggleCollapse}
      className={clsx(
        "p-1 rounded-full text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white",
        "hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors",
        collapsed ? "mx-auto" : "ml-auto"
      )}
      aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
      title={collapsed ? 'Expandir' : 'Colapsar'}
    >
      {collapsed ? <ChevronRight /> : <ChevronLeft />}
    </button>
  </div>
));
SidebarHeader.displayName = 'SidebarHeader';