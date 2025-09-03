/**
 * @file DashboardFilters.tsx
 * @route frontend/src/components/dashboard/
 * @description Componente de filtros para el dashboard.
 * @author Kevin Mariano
 * @version 1.1.0
 * @since 1.0.00
 * @copyright SENA 2025
 */

import React from 'react';
import { Role, SensorType, Tank, UserFromApi as User } from '@/types';
import { Users, Container, Cpu } from 'lucide-react';
import { cn } from '@/utils/cn'; // Se importa la utilidad para clases condicionales

interface DashboardFiltersProps {
  filters: any;
  onFiltersChange: (newFilters: any) => void;
  usersList: User[];
  tanksList: Tank[];
  currentUserRole: Role;
  loading: boolean;
}

const allowedSensorTypes = [
  { value: SensorType.TEMPERATURE, label: 'Temperatura' },
  { value: SensorType.PH, label: 'pH' },
  { value: SensorType.OXYGEN, label: 'Oxígeno Disuelto' },
];

export const DashboardFilters = ({
  filters,
  onFiltersChange,
  usersList,
  tanksList,
  currentUserRole,
  loading,
}: DashboardFiltersProps) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    onFiltersChange({ ...filters, [e.target.name]: e.target.value });
  };
  
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md mb-6 transition-colors duration-300">
      {/* El layout de la grilla ahora es dinámico */}
      <div className={cn(
        "grid grid-cols-1 md:grid-cols-2 gap-4 items-end",
        currentUserRole === Role.ADMIN ? "lg:grid-cols-5" : "lg:grid-cols-4"
      )}>
        
        {currentUserRole === Role.ADMIN && (
          <div className="flex flex-col">
            <label htmlFor="userId" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center">
              {/* Icono con color */}
              <Users className="w-4 h-4 mr-2 text-blue-500" />
              Usuario
            </label>
            <select
              id="userId"
              name="userId"
              value={filters.userId || ''}
              onChange={handleInputChange}
              disabled={loading || usersList.length === 0}
              className="form-select rounded-lg"
            >
              {usersList.map(user => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex flex-col">
          <label htmlFor="tankId" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center">
            {/* Icono con color */}
            <Container className="w-4 h-4 mr-2 text-sky-500" />
            Tanque
          </label>
          <select
            id="tankId"
            name="tankId"
            value={filters.tankId || ''}
            onChange={handleInputChange}
            disabled={loading || tanksList.length === 0}
            className="form-select rounded-lg"
          >
            {tanksList.map(tank => (
              <option key={tank.id} value={tank.id}>{tank.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col">
          <label htmlFor="sensorType" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center">
            {/* Icono con color */}
            <Cpu className="w-4 h-4 mr-2 text-orange-500" />
            Sensor
          </label>
          <select
            id="sensorType"
            name="sensorType"
            value={filters.sensorType || ''}
            onChange={handleInputChange}
            disabled={loading}
            className="form-select rounded-lg"
          >
            <option value="">Todos los Sensores</option>
            {allowedSensorTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col">
          <label htmlFor="startDate" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
            className="form-input rounded-lg"
          />
        </div>

        <div className="flex flex-col">
          <label htmlFor="endDate" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Fecha Fin
          </label>
          <input
            type="date"
            id="endDate"
            name="endDate"
            value={filters.endDate || ''}
            onChange={handleInputChange}
            disabled={loading}
            min={filters.startDate || ''}
            max={today}
            className="form-input rounded-lg"
          />
        </div>
      </div>
    </div>
  );
};