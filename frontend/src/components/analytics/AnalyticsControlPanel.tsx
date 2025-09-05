/**
 * @file AnalyticsControlPanel.tsx
 * @route frontend/src/components/analytics/
 * @description Panel de control con filtros para la página de analíticas.
 * @author kevin mariano
 * @version 1.0.0
 * @since 1.0.0
 * @copyright SENA 2025
 */

import React from 'react';
import { Card } from '@/components/common/Card';
import { SensorType, Role, User, Tank } from '@/types';
import { SlidersHorizontal } from 'lucide-react';

interface AnalyticsControlPanelProps {
  filters: { tankId: string; sensorType: SensorType; sensorTypeX: SensorType; sensorTypeY: SensorType; startDate: string; endDate: string; };
  setFilters: React.Dispatch<React.SetStateAction<any>>;
  tanksList: Tank[];
  usersList: User[]; // Esta prop ahora recibe la variable `users` de tu hook
  currentUser: User | null;
  selectedUserId: string | null;
  onUserChange: (userId: string | null) => void;
  isLoading: boolean;
}

export const AnalyticsControlPanel: React.FC<AnalyticsControlPanelProps> = ({
  filters, setFilters, tanksList, usersList, currentUser,
  selectedUserId, onUserChange, isLoading
}) => {
  const isAdmin = currentUser?.role === Role.ADMIN;

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters((prev: any) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleUserChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUserChange(e.target.value === 'ALL' ? null : e.target.value);
  };
  
  return (
    <Card className="shadow-lg">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
        <SlidersHorizontal className="text-green-500" />
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Panel de Control</h3>
      </div>
      <div className="p-4 space-y-4">
        {isAdmin && (
          <div>
            <label htmlFor="user-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Usuario</label>
            <select
              id="user-select"
              value={selectedUserId || 'ALL'}
              onChange={handleUserChange}
              disabled={isLoading}
              className="mt-1 block w-full rounded-md border-slate-300 shadow-sm dark:border-slate-600 dark:bg-slate-700 focus:border-green-500 focus:ring-green-500"
            >
              <option value="ALL">Seleccione un usuario...</option>
              {/* Se asegura que `usersList` sea un array antes de mapearlo */}
              {(usersList || []).map((user) => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* El resto de los filtros no necesita cambios */}
        <div>
          <label htmlFor="tankId" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tanque</label>
          <select
            id="tankId" name="tankId" value={filters.tankId} onChange={handleFilterChange}
            disabled={isLoading || !selectedUserId || tanksList.length === 0}
            className="mt-1 block w-full rounded-md border-slate-300 shadow-sm dark:border-slate-600 dark:bg-slate-700 focus:border-green-500 focus:ring-green-500"
          >
            <option value="">{tanksList.length === 0 ? 'No hay tanques' : 'Seleccione un tanque...'}</option>
            {tanksList.map((tank) => ( <option key={tank.id} value={tank.id}>{tank.name}</option> ))}
          </select>
        </div>
        
        <div>
          <label htmlFor="startDate" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Fecha de Inicio</label>
          <input type="date" id="startDate" name="startDate" value={filters.startDate} onChange={handleFilterChange} disabled={isLoading} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm dark:border-slate-600 dark:bg-slate-700" />
        </div>
        <div>
          <label htmlFor="endDate" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Fecha de Fin</label>
          <input type="date" id="endDate" name="endDate" value={filters.endDate} onChange={handleFilterChange} disabled={isLoading} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm dark:border-slate-600 dark:bg-slate-700" />
        </div>
        <hr className="border-slate-200 dark:border-slate-700" />
        <div>
            <label htmlFor="sensorType" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Parámetro Principal</label>
            <select id="sensorType" name="sensorType" value={filters.sensorType} onChange={handleFilterChange} disabled={isLoading} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm dark:border-slate-600 dark:bg-slate-700 focus:border-green-500 focus:ring-green-500">
              {Object.values(SensorType).map((type) => (<option key={type} value={type}>{type}</option>))}
            </select>
        </div>
        <div className="space-y-2">
            <p className="block text-sm font-medium text-slate-700 dark:text-slate-300">Correlación</p>
            <div className="flex gap-2">
                <select name="sensorTypeX" value={filters.sensorTypeX} onChange={handleFilterChange} disabled={isLoading} className="block w-full rounded-md border-slate-300 shadow-sm dark:border-slate-600 dark:bg-slate-700" aria-label="Eje X">
                  {Object.values(SensorType).map((type) => (<option key={`x-${type}`} value={type}>{type}</option>))}
                </select>
                <select name="sensorTypeY" value={filters.sensorTypeY} onChange={handleFilterChange} disabled={isLoading} className="block w-full rounded-md border-slate-300 shadow-sm dark:border-slate-600 dark:bg-slate-700" aria-label="Eje Y">
                  {Object.values(SensorType).map((type) => (<option key={`y-${type}`} value={type}>{type}</option>))}
                </select>
            </div>
        </div>
      </div>
    </Card>
  );
};