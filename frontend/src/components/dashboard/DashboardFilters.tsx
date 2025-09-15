/**
 * @file DashboardFilters.tsx
 * @route frontend/src/components/dashboard
 * @description Componente de filtros con todas las correcciones: selector de admin, sin "Todos los Tanques" y estilos de focus unificados.
 * @author Kevin Mariano
 * @version 1.0.0
 * @since 1.0.0
 * @copyright SENA 2025
 */

import React from 'react';
import { Role, Tank, UserFromApi as User } from '@/types';
import { cn } from '@/utils/cn';

interface DashboardFiltersProps {
  filters: any;
  onFiltersChange: (newFilters: any) => void;
  usersList: User[];
  tanksList: Tank[];
  currentUserRole: Role;
  loading: boolean;
}

export const DashboardFilters: React.FC<DashboardFiltersProps> = ({
  filters,
  onFiltersChange,
  usersList,
  tanksList,
  currentUserRole,
  loading,
}) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'userId') {
      onFiltersChange({ ...filters, userId: value, tankId: undefined });
    } else {
      onFiltersChange({ ...filters, [name]: value || undefined });
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const isAdmin = currentUserRole === Role.ADMIN;

  const inputBaseClasses = "w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 disabled:opacity-50";
  const inputFocusClasses = "focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
      <div className="p-6">
        <div
          className={cn(
            "grid grid-cols-1 sm:grid-cols-2 gap-4",
            isAdmin ? "lg:grid-cols-5" : "lg:grid-cols-4"
          )}
        >
          {isAdmin && (
            <div className="space-y-1">
              <label htmlFor="userId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Usuario
              </label>
              <select
                id="userId"
                name="userId"
                value={filters.userId || ''}
                onChange={handleInputChange}
                disabled={loading || usersList.length === 0}
                className={cn(inputBaseClasses, inputFocusClasses)}
              >
                {usersList.map(user => (
                  <option key={user.id} value={user.id}>{user.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Selector de Tanque */}
          <div className="space-y-1">
            <label htmlFor="tankId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Tanque
            </label>
            <select
              id="tankId"
              name="tankId"
              value={filters.tankId || ''}
              onChange={handleInputChange}
              disabled={loading || tanksList.length === 0}
              className={cn(inputBaseClasses, inputFocusClasses)}
            >
              {tanksList.length > 0 ? (
                tanksList.map(tank => (
                  <option key={tank.id} value={tank.id}>{tank.name}</option>
                ))
              ) : (
                <option value="">No hay tanques</option>
              )}
            </select>
          </div>

          {/* Selector de Tipo de Sensor */}
          <div className="space-y-1">
            <label htmlFor="sensorType" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Tipo de Sensor
            </label>
            <select
              id="sensorType"
              name="sensorType"
              value={filters.sensorType || ''}
              onChange={handleInputChange}
              disabled={loading}
              className={cn(inputBaseClasses, inputFocusClasses)}
            >
              <option value="">Todos los Sensores</option>
              <option value="TEMPERATURE">Temperatura</option>
              <option value="PH">pH</option>
              <option value="OXYGEN">Oxígeno</option>
            </select>
          </div>

          {/* Fecha de Inicio */}
          <div className="space-y-1">
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Fecha Inicio
            </label>
            <input
              type="date"
              id="startDate"
              name="startDate"
              value={filters.startDate || ''}
              onChange={handleInputChange}
              disabled={loading}
              max={filters.endDate || today}
              className={cn(inputBaseClasses, inputFocusClasses)}
            />
          </div>

          {/* Fecha de Fin */}
          <div className="space-y-1">
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Fecha Fin
            </label>
            <input
              type="date"
              id="endDate"
              name="endDate"
              value={filters.endDate || today}
              onChange={handleInputChange}
              disabled={loading}
              min={filters.startDate || ''}
              max={today}
              className={cn(inputBaseClasses, inputFocusClasses)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};