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
import { SensorType, Role, User, Tank, Sensor } from '@/types';
import { SlidersHorizontal } from 'lucide-react';
import { sensorTypeTranslations, rangeTranslations } from '@/utils/translations';

interface AnalyticsControlPanelProps {
  users: User[];
  selectedUserId: string | null;
  onUserChange: (userId: string | null) => void;
  isAdmin: boolean;
  tanks: Tank[];
  selectedTankId: string;
  onTankChange: (tankId: string) => void;
  selectedSensorType: SensorType;
  onSensorTypeChange: (type: SensorType) => void;
  availableSensors: Sensor[];
  selectedSensorId: string;
  onSensorChange: (sensorId: string) => void;
  availableRanges: { day: boolean; week: boolean; month: boolean; year: boolean; };
  selectedRange: string;
  onRangeChange: (range: string) => void;
  isLoading: boolean;
}

export const AnalyticsControlPanel: React.FC<AnalyticsControlPanelProps> = ({
  users, selectedUserId, onUserChange, isAdmin,
  tanks, selectedTankId, onTankChange,
  selectedSensorType, onSensorTypeChange,
  availableSensors, selectedSensorId, onSensorChange,
  availableRanges, selectedRange, onRangeChange,
  isLoading
}) => {
  return (
    <Card className="shadow-lg">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
        <SlidersHorizontal className="text-green-500" />
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Panel de Análisis</h3>
      </div>
      <div className="p-4 space-y-4">
        {isAdmin && (
          <div>
            <label htmlFor="user-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Usuario</label>
            <select
              id="user-select" value={selectedUserId || ''}
              onChange={(e) => onUserChange(e.target.value || null)}
              disabled={isLoading || !users}
              className="mt-1 block w-full rounded-md border-slate-300 shadow-sm dark:border-slate-600 dark:bg-slate-700 focus:border-green-500 focus:ring-green-500"
            >
              {(users || []).map((user) => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label htmlFor="tank-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tanque</label>
          <select
            id="tank-select" value={selectedTankId} onChange={(e) => onTankChange(e.target.value)}
            disabled={isLoading || !selectedUserId}
            className="mt-1 block w-full rounded-md border-slate-300 shadow-sm dark:border-slate-600 dark:bg-slate-700 focus:border-green-500 focus:ring-green-500"
          >
            <option value="ALL">Todos los Tanques</option>
            {(tanks || []).map((tank) => (
              <option key={tank.id} value={tank.id}>{tank.name}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label htmlFor="sensor-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Parámetro</label>
          <select
            id="sensor-select" value={selectedSensorId} onChange={(e) => onSensorChange(e.target.value)}
            disabled={isLoading || !selectedUserId}
            className="mt-1 block w-full rounded-md border-slate-300 shadow-sm dark:border-slate-600 dark:bg-slate-700 focus:border-green-500 focus:ring-green-500"
          >
            <option value="ALL">Todos los Sensores</option>
            {Object.entries(sensorTypeTranslations).map(([key, value]) => (
              <optgroup key={key} label={value}>
                {availableSensors.filter(s => s.type === key).map(sensor => (
                  <option key={sensor.id} value={sensor.id}>{sensor.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="range-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Período</label>
          <select
            id="range-select" value={selectedRange} onChange={(e) => onRangeChange(e.target.value)}
            disabled={isLoading || !selectedUserId}
            className="mt-1 block w-full rounded-md border-slate-300 shadow-sm dark:border-slate-600 dark:bg-slate-700 focus:border-green-500 focus:ring-green-500"
          >
            {Object.entries(rangeTranslations).map(([key, value]) => (
              (availableRanges as any)[key] && <option key={key} value={key}>{value}</option>
            ))}
          </select>
        </div>
      </div>
    </Card>
  );
};