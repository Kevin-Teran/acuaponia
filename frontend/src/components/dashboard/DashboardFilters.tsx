/**
 * @file DashboardFilters.tsx
 * @description Componente de filtros controlado para el dashboard.
 * @author Kevin Mariano
 * @version 4.1.0
 */
'use client';

import { User, Tank, UserFromApi } from '@/types';
import React from 'react';
import { Users, LayoutGrid, Calendar } from 'lucide-react';
import clsx from 'clsx';

interface Props {
  users: UserFromApi[];
  tanks: Tank[];
  filters: {
    userId: string;
    tankId: string;
    startDate: string;
    endDate: string;
  };
  onFilterChange: (field: string, value: string) => void;
  isLoading: boolean;
}

export default function DashboardFilters({
  users,
  tanks,
  filters,
  onFilterChange,
  isLoading,
}: Props) {

  const isAdmin = users.length > 1;

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
      <div className={clsx("grid gap-4 items-end", isAdmin ? "grid-cols-1 md:grid-cols-4" : "grid-cols-1 md:grid-cols-3")}>
        {isAdmin && (
          <div className="relative">
            <label htmlFor="user-filter" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Usuario</label>
            <Users className="absolute left-3 top-10 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <select
              id="user-filter"
              value={filters.userId}
              onChange={(e) => onFilterChange('userId', e.target.value)}
              disabled={isLoading}
              className="w-full pl-10 pr-4 py-2.5 border rounded-lg bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-primary focus:border-primary transition-colors appearance-none cursor-pointer"
            >
              {users.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
            </select>
          </div>
        )}
        <div className="relative">
          <label htmlFor="tank-filter" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Tanque</label>
          <LayoutGrid className="absolute left-3 top-10 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <select
            id="tank-filter"
            value={filters.tankId}
            onChange={(e) => onFilterChange('tankId', e.target.value)}
            disabled={isLoading || tanks.length === 0}
            className="w-full pl-10 pr-4 py-2.5 border rounded-lg bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-primary focus:border-primary transition-colors appearance-none cursor-pointer"
          >
            {tanks.length > 0 ? (
              tanks.map(tank => <option key={tank.id} value={tank.id}>{tank.name}</option>)
            ) : (
              <option value="">Sin tanques</option>
            )}
          </select>
        </div>
        <div className="relative">
          <label htmlFor="start-date" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Fecha de Inicio</label>
          <Calendar className="absolute left-3 top-10 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            id="start-date"
            type="date"
            value={filters.startDate}
            onChange={(e) => onFilterChange('startDate', e.target.value)}
            disabled={isLoading}
            className="w-full pl-10 pr-4 py-2.5 border rounded-lg bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-primary focus:border-primary transition-colors"
          />
        </div>
        <div className="relative">
          <label htmlFor="end-date" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Fecha de Fin</label>
          <Calendar className="absolute left-3 top-10 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            id="end-date"
            type="date"
            value={filters.endDate}
            onChange={(e) => onFilterChange('endDate', e.target.value)}
            disabled={isLoading}
            className="w-full pl-10 pr-4 py-2.5 border rounded-lg bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-primary focus:border-primary transition-colors"
          />
        </div>
      </div>
    </div>
  );
}