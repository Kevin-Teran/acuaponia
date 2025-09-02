/**
 * @file DashboardFilters.tsx
 * @description Componente de filtros para el dashboard.
 * @author Kevin Mariano
 * @version 1.0.0
 * @since 1.0.0
 */
'use client';

import React from 'react';
import { Search, Calendar, Users, Container, Activity } from 'lucide-react';
import { SensorType, Role } from '@/types';

interface DashboardFiltersProps {
  filters: {
    userId?: string;
    tankId?: string;
    sensorType?: SensorType;
    startDate?: string;
    endDate?: string;
  };
  onFiltersChange: (filters: any) => void;
  usersList: Array<{ id: string; name: string; email: string; _count: { tanks: number } }>;
  tanksList: Array<{ id: string; name: string; location: string }>;
  currentUserRole: Role;
  loading?: boolean;
}

export const DashboardFilters: React.FC<DashboardFiltersProps> = ({
  filters,
  onFiltersChange,
  usersList,
  tanksList,
  currentUserRole,
  loading = false
}) => {
  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value || undefined };
    if (key === 'userId') {
      // Reset tankId cuando cambia el usuario
      newFilters.tankId = undefined;
    }
    onFiltersChange(newFilters);
  };

  const sensorTypes = [
    { value: 'TEMPERATURE', label: 'Temperatura' },
    { value: 'PH', label: 'pH' },
    { value: 'OXYGEN', label: 'Oxígeno' },
    { value: 'LEVEL', label: 'Nivel' },
    { value: 'FLOW', label: 'Caudal' }
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Filtro de Usuario (solo para admins) */}
        {currentUserRole === Role.ADMIN && (
          <div className="relative">
            <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <select
              value={filters.userId || ''}
              onChange={(e) => handleFilterChange('userId', e.target.value)}
              disabled={loading}
              className="w-full pl-10 pr-4 py-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-[#39A900] focus:border-[#39A900] disabled:opacity-50"
            >
              <option value="">Todos los usuarios</option>
              {usersList.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user._count.tanks} tanques)
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Filtro de Tanque */}
        <div className="relative">
          <Container className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <select
            value={filters.tankId || ''}
            onChange={(e) => handleFilterChange('tankId', e.target.value)}
            disabled={loading}
            className="w-full pl-10 pr-4 py-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-[#39A900] focus:border-[#39A900] disabled:opacity-50"
          >
            <option value="">Todos los tanques</option>
            {tanksList.map(tank => (
              <option key={tank.id} value={tank.id}>
                {tank.name} - {tank.location}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro de Tipo de Sensor */}
        <div className="relative">
          <Activity className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <select
            value={filters.sensorType || ''}
            onChange={(e) => handleFilterChange('sensorType', e.target.value)}
            disabled={loading}
            className="w-full pl-10 pr-4 py-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-[#39A900] focus:border-[#39A900] disabled:opacity-50"
          >
            <option value="">Todos los sensores</option>
            {sensorTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Fecha de Inicio */}
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="date"
            value={filters.startDate || ''}
            onChange={(e) => handleFilterChange('startDate', e.target.value)}
            disabled={loading}
            className="w-full pl-10 pr-4 py-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-[#39A900] focus:border-[#39A900] disabled:opacity-50"
          />
        </div>

        {/* Fecha de Fin */}
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="date"
            value={filters.endDate || ''}
            onChange={(e) => handleFilterChange('endDate', e.target.value)}
            disabled={loading}
            className="w-full pl-10 pr-4 py-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-[#39A900] focus:border-[#39A900] disabled:opacity-50"
          />
        </div>
      </div>
    </div>
  );
};