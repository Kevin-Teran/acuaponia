/**
 * @file AnalyticsControlPanel.tsx
 * @route frontend/src/components/analytics/
 * @description Panel de control con filtros para la página de analíticas.
 * @author kevin mariano
 * @version 1.0.0
 * @since 1.0.0
 * @copyright SENA 2025
 */

import { useState } from 'react';
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
  selectedUserId: string | null;
  onUserChange: (userId: string) => void;
  isLoading: boolean;
}

const DatePresetButton = ({ label, isActive, onClick }: any) => (
  <button onClick={onClick} className={`w-full px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-800 focus:ring-indigo-500 ${isActive ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600'}`}>
    {label}
  </button>
);

const FilterSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div className="border-t border-slate-200 dark:border-slate-700 pt-4 first:border-t-0 first:pt-0">
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">{title}</label>
        {children}
    </div>
);

export const AnalyticsControlPanel = ({
  filters, setFilters, tanksList, usersList, currentUser, selectedUserId, onUserChange, isLoading
}: ControlPanelProps) => {
  const [activePreset, setActivePreset] = useState('week');

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
    setFilters(prev => ({ ...prev, startDate: format(startDate, 'yyyy-MM-dd'), endDate: format(endDate, 'yyyy-MM-dd') }));
  };

  const selectClassName = "w-full rounded-lg border-slate-300 shadow-sm dark:border-slate-600 dark:bg-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="p-4 bg-white dark:bg-slate-800 rounded-xl shadow-lg space-y-4 h-full">
      <div className="flex items-center gap-3 pb-3">
        <SlidersHorizontal className="text-indigo-600 dark:text-indigo-400"/>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Panel de Análisis</h2>
      </div>

      {currentUser?.role === Role.ADMIN && (
        <FilterSection title="Filtrar por Usuario">
          <select value={selectedUserId || ''} onChange={(e) => onUserChange(e.target.value)} className={selectClassName} disabled={isLoading}>
            <option value="">{isLoading ? 'Cargando...' : 'Seleccionar usuario'}</option>
            {(usersList || []).map((user) => (<option key={user.id} value={user.id}>{user.name}</option>))}
          </select>
        </FilterSection>
      )}
      
      <FilterSection title="Seleccionar Tanque">
        <select value={filters.tankId} onChange={(e) => setFilters(prev => ({...prev, tankId: e.target.value}))} className={selectClassName} disabled={!selectedUserId || isLoading}>
          <option value="">
            {isLoading ? 'Cargando...' : (!selectedUserId ? 'Seleccione un usuario' : 'Seleccionar tanque')}
          </option>
          {(tanksList || []).map((tank) => (<option key={tank.id} value={tank.id}>{tank.name}</option>))}
        </select>
      </FilterSection>

      <FilterSection title="Periodo">
        <div className="grid grid-cols-2 gap-2">
            <DatePresetButton label="Hoy" isActive={activePreset === 'day'} onClick={() => setDateRange('day')} />
            <DatePresetButton label="Semana" isActive={activePreset === 'week'} onClick={() => setDateRange('week')} />
            <DatePresetButton label="Mes" isActive={activePreset === 'month'} onClick={() => setDateRange('month')} />
            <DatePresetButton label="Año" isActive={activePreset === 'year'} onClick={() => setDateRange('year')} />
        </div>
      </FilterSection>

      <FilterSection title="Parámetro Principal">
        <select value={filters.sensorType} onChange={(e) => setFilters(prev => ({...prev, sensorType: e.target.value}))} className={selectClassName}>
          {Object.values(SensorType).map((type) => (<option key={type} value={type}>{type}</option>))}
        </select>
      </FilterSection>

       <FilterSection title="Correlación (X vs Y)">
        <div className="flex gap-2">
            <select value={filters.sensorTypeX} onChange={(e) => setFilters(prev => ({...prev, sensorTypeX: e.target.value}))} className={selectClassName}>
              {Object.values(SensorType).map((type) => (<option key={`x-${type}`} value={type}>{type}</option>))}
            </select>
             <select value={filters.sensorTypeY} onChange={(e) => setFilters(prev => ({...prev, sensorTypeY: e.target.value}))} className={selectClassName}>
              {Object.values(SensorType).map((type) => (<option key={`y-${type}`} value={type}>{type}</option>))}
            </select>
        </div>
      </FilterSection>
    </div>
  );
};