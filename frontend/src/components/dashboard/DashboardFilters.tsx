/**
 * @file DashboardFilters.tsx
 * @description Componente visual para los filtros del dashboard. Ya no carga datos.
 * @author Kevin Mariano
 * @version 2.3.0
 */
'use client';

import React from 'react';
import { Filter, Calendar, BarChart2, User as UserIcon } from 'lucide-react';
import { Tank, User, Role } from '@/types';

/**
 * @interface DateRange
 * @description Define la estructura para el rango de fechas seleccionado.
 */
interface DateRange {
  from: string; // Formato YYYY-MM-DD
  to: string;   // Formato YYYY-MM-DD
}

/**
 * @interface DashboardFiltersProps
 * @description Define las props que el componente DashboardFilters espera recibir.
 */
interface DashboardFiltersProps {
  currentUserRole?: Role;
  users: User[];
  tanks: Tank[];
  selectedTank: string;
  onTankChange: (tankId: string) => void;
  selectedUser: string;
  onUserChange: (userId: string) => void;
  dateRange: DateRange;
  onDateRangeChange: (newRange: DateRange) => void;
  isLoading?: boolean;
}

/**
 * @component DashboardFilters
 * @description Renderiza los controles de filtrado para el dashboard.
 * Es un componente "tonto" que solo muestra los datos que se le pasan.
 */
export const DashboardFilters: React.FC<DashboardFiltersProps> = ({
  currentUserRole = Role.USER,
  users = [],
  tanks = [],
  selectedTank,
  onTankChange,
  selectedUser,
  onUserChange,
  dateRange,
  onDateRangeChange,
  isLoading = false,
}) => {
  const isAdmin = currentUserRole === Role.ADMIN;
  
  /**
   * @function handleDateChange
   * @description Maneja los cambios en los inputs de fecha y aplica validaciones.
   */
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'from' | 'to') => {
    const newDate = e.target.value;
    let newRange = { ...dateRange };

    if (type === 'from') {
      // La fecha de inicio no puede ser posterior a la de fin
      if (new Date(newDate) > new Date(dateRange.to)) {
        newRange = { from: newDate, to: newDate };
      } else {
        newRange.from = newDate;
      }
    }

    if (type === 'to') {
      // La fecha de fin no puede ser anterior a la de inicio
      if (new Date(newDate) < new Date(dateRange.from)) {
        return; 
      }
      newRange.to = newDate;
    }

    onDateRangeChange(newRange);
  };
  
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="flex flex-col sm:flex-row flex-wrap items-center gap-4">
      <div className="flex items-center text-gray-600 dark:text-gray-300">
        <Filter size={20} className="mr-2" />
        <span className="font-semibold">Filtros</span>
      </div>

      {/* Selector de Usuario (Solo para Admins) */}
      {isAdmin && (
        <div className="relative flex items-center w-full sm:w-auto">
          <UserIcon size={18} className="absolute left-3 text-gray-400" />
          <select
            value={selectedUser}
            onChange={e => onUserChange(e.target.value)}
            className="w-full sm:w-auto pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            disabled={isLoading || users.length === 0}
          >
            {isLoading ? (
              <option>Cargando...</option>
            ) : users.length === 0 ? (
              <option>No hay usuarios</option>
            ) : (
              users.map(user => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))
            )}
          </select>
        </div>
      )}

      {/* Selector de Estanque */}
      <div className="relative flex items-center w-full sm:w-auto">
        <BarChart2 size={18} className="absolute left-3 text-gray-400" />
        <select
          value={selectedTank}
          onChange={e => onTankChange(e.target.value)}
          className="w-full sm:w-auto pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
          disabled={isLoading || tanks.length === 0}
        >
          {isLoading ? (
            <option>Cargando...</option>
          ) : tanks.length === 0 ? (
            <option>No hay tanques</option>
          ) : (
            tanks.map(tank => (
              <option key={tank.id} value={tank.id}>{tank.name}</option>
            ))
          )}
        </select>
      </div>
      
      {/* Selector de Fecha de Inicio */}
      <div className="relative flex items-center w-full sm:w-auto">
        <Calendar size={18} className="absolute left-3 text-gray-400" />
        <input
          type="date"
          value={dateRange.from}
          onChange={e => handleDateChange(e, 'from')}
          className="w-full sm:w-auto pl-10 pr-4 py-2 text-left border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
          max={dateRange.to}
          disabled={isLoading}
        />
      </div>

      {/* Selector de Fecha de Fin */}
      <div className="relative flex items-center w-full sm:w-auto">
        <Calendar size={18} className="absolute left-3 text-gray-400" />
        <input
          type="date"
          value={dateRange.to}
          onChange={e => handleDateChange(e, 'to')}
          className="w-full sm:w-auto pl-10 pr-4 py-2 text-left border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
          min={dateRange.from}
          max={today}
          disabled={isLoading}
        />
      </div>
    </div>
  );
};