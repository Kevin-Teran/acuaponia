import React, { useMemo, useCallback } from 'react';
import { NavItem } from './NavItem';
import { modules } from './constants';
import { Module } from './types';
import { User } from '@/types';

interface SidebarNavProps {
  userRole: User['role'];
  currentModuleId: string;
  collapsed: boolean;
  onModuleChange: (module: Module) => void;
}

export const SidebarNav: React.FC<SidebarNavProps> = React.memo(({ userRole, currentModuleId, collapsed, onModuleChange }) => {
  const filteredModules = useMemo(() =>
    modules.filter(module => !module.adminOnly || userRole === 'ADMIN'),
    [userRole]
  );

  const handleModuleClick = useCallback((module: Module) => {
    onModuleChange(module);
  }, [onModuleChange]);

  return (
    <nav className="flex-1 p-2 overflow-y-auto" aria-label="Navegación principal">
      <ul className="space-y-1">
        {filteredModules.map((module) => (
          <NavItem
            key={module.id}
            module={module}
            isActive={currentModuleId === module.id}
            collapsed={collapsed}
            onClick={handleModuleClick}
          />
        ))}
      </ul>
    </nav>
  );
});
SidebarNav.displayName = 'SidebarNav';