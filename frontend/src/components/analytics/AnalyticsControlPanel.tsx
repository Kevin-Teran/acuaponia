/**
 * @file AnalyticsControlPanel.tsx
 * @route frontend/src/components/analytics/
 * @description Panel de control con filtros para la página de analíticas.
 * @author kevin mariano
 * @version 1.0.0
 * @since 1.0.0
 * @copyright SENA 2025
 */

import { useState } from 'react'; // <-- ¡AQUÍ ESTÁ LA CORRECCIÓN!
import { Role, SensorType, User } from '@/types';
import { format, subDays, startOfWeek, startOfMonth, startOfYear } from 'date-fns';
import { es } from 'date-fns/locale';
import { SlidersHorizontal } from 'lucide-react';

interface ControlPanelProps {
  filters: any;
  setFilters: (filters: any) => void;
  tanksList: any[];
  usersList: any[];
  currentUser: User | null;
  onAdminUserChange: (userId: string) => void;
  isLoading: boolean;
}

const DatePresetButton = ({ label, isActive, onClick }: any) => (
  <button
    onClick={onClick}
    className={`w-full px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-blue-500 ${
      isActive
        ? 'bg-blue-600 text-white shadow-sm'
        : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
    }`}
  >
    {label}
  </button>
);

const FilterSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{title}</label>
        {children}
    </div>
);

export const AnalyticsControlPanel = ({
  filters,
  setFilters,
  tanksList,
  usersList,
  currentUser,
  onAdminUserChange,
  isLoading
}: ControlPanelProps) => {

  const [activePreset, setActivePreset] = useState('week');

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };
  
  const setDateRange = (preset: 'day' | 'week' | 'month' | 'year') => {
    setActivePreset(preset);
    const endDate = new Date();
    let startDate: Date;

    switch (preset) {
      case 'week': startDate = startOfWeek(endDate, { locale: es }); break;
      case 'month': startDate = startOfMonth(endDate); break;
      case 'year': startDate = startOfYear(endDate); break;
      default: startDate = subDays(endDate, 0); break;
    }
    setFilters(prev => ({ 
        ...prev, 
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd')
    }));
  };

  const selectClassName = "w-full rounded-lg border-gray-300 shadow-sm dark:border-gray-600 dark:bg-gray-700 focus:border-blue-500 focus:ring-blue-500 transition";

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-xl shadow-lg space-y-6 h-full">
      <div className="flex items-center gap-3 border-b border-gray-200 dark:border-gray-700 pb-4">
        <SlidersHorizontal className="text-blue-600 dark:text-blue-400"/>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Panel de Control</h2>
      </div>

      {currentUser?.role === Role.ADMIN && (
        <FilterSection title="Usuario">
          <select
            value={filters.userId}
            onChange={(e) => onAdminUserChange(e.target.value)}
            className={selectClassName}
            disabled={isLoading}
          >
            <option value="">{isLoading ? 'Cargando...' : 'Seleccionar usuario'}</option>
            {(usersList || []).map((user) => (
              <option key={user.id} value={user.id}>{user.name}</option>
            ))}
          </select>
        </FilterSection>
      )}
      
      <FilterSection title="Tanque">
        <select
          value={filters.tankId}
          onChange={(e) => handleFilterChange('tankId', e.target.value)}
          className={selectClassName}
          disabled={!filters.userId || isLoading}
        >
          <option value="">
            {isLoading ? 'Cargando...' : (!filters.userId ? 'Selecciona un usuario' : 'Seleccionar tanque')}
          </option>
          {(tanksList || []).map((tank) => (
            <option key={tank.id} value={tank.id}>{tank.name}</option>
          ))}
        </select>
      </FilterSection>

      <FilterSection title="Periodo de Análisis">
        <div className="grid grid-cols-2 gap-2 mb-3">
            <DatePresetButton label="Hoy" isActive={activePreset === 'day'} onClick={() => setDateRange('day')} />
            <DatePresetButton label="Semana" isActive={activePreset === 'week'} onClick={() => setDateRange('week')} />
            <DatePresetButton label="Mes" isActive={activePreset === 'month'} onClick={() => setDateRange('month')} />
            <DatePresetButton label="Año" isActive={activePreset === 'year'} onClick={() => setDateRange('year')} />
        </div>
      </FilterSection>

      <FilterSection title="Parámetro Principal">
        <select
          value={filters.sensorType}
          onChange={(e) => handleFilterChange('sensorType', e.target.value)}
          className={selectClassName}
        >
          {Object.values(SensorType).map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </FilterSection>

       <FilterSection title="Correlación (Eje X vs Eje Y)">
        <div className="flex gap-2">
            <select
              value={filters.sensorTypeX}
              onChange={(e) => handleFilterChange('sensorTypeX', e.target.value)}
              className={selectClassName}
            >
              {Object.values(SensorType).map((type) => (<option key={`x-${type}`} value={type}>{type}</option>))}
            </select>
             <select
              value={filters.sensorTypeY}
              onChange={(e) => handleFilterChange('sensorTypeY', e.target.value)}
              className={selectClassName}
            >
              {Object.values(SensorType).map((type) => (<option key={`y-${type}`} value={type}>{type}</option>))}
            </select>
        </div>
      </FilterSection>
    </div>
  );
};