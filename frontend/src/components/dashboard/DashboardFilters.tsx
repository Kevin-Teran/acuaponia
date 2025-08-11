import React from 'react';
import { User as UserIcon, Droplets, Calendar } from 'lucide-react';
import { User, Tank } from '../../types';
import { format } from 'date-fns';
import { Card } from '../common/Card';

/**
 * @interface DashboardFiltersProps
 * @description Define las propiedades que recibe el componente de filtros del dashboard.
 */
interface DashboardFiltersProps {
  startDate: string;
  endDate: string;
  selectedTankId: string | null;
  selectedUserId?: string | null;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onTankChange: (tankId: string) => void;
  onUserChange?: (userId: string) => void;
  tanks: Tank[]; // Recibe la lista de tanques YA FILTRADA para el usuario seleccionado.
  users?: User[];
  isAdmin: boolean;
}

/**
 * @component DashboardFilters
 * @description Componente de UI para seleccionar los filtros. Es un componente "controlado" que
 * solo muestra las props que recibe y notifica los cambios al componente padre.
 */
export const DashboardFilters: React.FC<DashboardFiltersProps> = ({
  startDate,
  endDate,
  selectedTankId,
  selectedUserId,
  onStartDateChange,
  onEndDateChange,
  onTankChange,
  onUserChange,
  tanks,
  users,
  isAdmin,
}) => {
  const today = format(new Date(), 'yyyy-MM-dd');

  return (
    <Card>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
        
        {/* Filtro de Usuario (Solo para Administradores) */}
        {isAdmin && users && (
          <div className="lg:col-span-1">
            <label className="label flex items-center mb-2">
              <UserIcon className="w-4 h-4 mr-2" />
              Usuario
            </label>
            <select
              value={selectedUserId || ''}
              onChange={e => onUserChange && onUserChange(e.target.value)}
              className="form-select w-full"
            >
              {/* Muestra la lista de todos los usuarios disponibles */}
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Filtro de Tanque */}
        <div className="lg:col-span-1">
          <label className="label flex items-center mb-2">
            <Droplets className="w-4 h-4 mr-2" />
            Tanque
          </label>
          <select
            value={selectedTankId || ''}
            onChange={e => onTankChange(e.target.value)}
            className="form-select w-full"
            disabled={tanks.length === 0}
          >
            {tanks.length === 0 ? (
                <option value="">No hay tanques disponibles</option>
            ) : (
                // Muestra únicamente los tanques que le llegan a través de la prop 'tanks'
                tanks.map(tank => (
                    <option key={tank.id} value={tank.id}>
                        {tank.name}
                    </option>
                ))
            )}
          </select>
        </div>

        {/* Filtro de Rango de Fechas (Restaurado) */}
        <div className="md:col-span-2 lg:col-span-2">
            <label className="label flex items-center mb-2">
                <Calendar className="w-4 h-4 mr-2" />
                Rango de Fechas
            </label>
            <div className="flex items-center gap-2">
                <input
                    type="date"
                    value={startDate}
                    onChange={(e) => onStartDateChange(e.target.value)}
                    className="form-input w-full"
                    max={endDate || today}
                />
                <span className="text-gray-500 dark:text-gray-400">-</span>
                <input
                    type="date"
                    value={endDate}
                    onChange={(e) => onEndDateChange(e.target.value)}
                    className="form-input w-full"
                    min={startDate}
                    max={today}
                />
            </div>
        </div>
      </div>
    </Card>
  );
};