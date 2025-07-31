import React, { useEffect } from 'react';
import { User as UserIcon, Droplets, Calendar } from 'lucide-react';
import { User, Tank } from '../../types';
import { format } from 'date-fns';

interface DashboardFiltersProps {
  // Estados de los filtros
  startDate: string;
  endDate: string;
  selectedTankId: string | null;
  selectedUserId?: string | null;
  
  // Callbacks para cambiar los filtros
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onTankChange: (tankId: string) => void;
  onUserChange?: (userId: string) => void;
  
  // Datos para poblar los selectores
  tanks: Tank[];
  users?: User[];
  isAdmin: boolean;
}

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

  // Efecto para auto-seleccionar el primer tanque si la selección actual no es válida o no existe
  useEffect(() => {
    if (tanks.length > 0 && !tanks.some(t => t.id === selectedTankId)) {
      onTankChange(tanks[0].id);
    } else if (tanks.length === 0 && selectedTankId !== null) {
      onTankChange(''); // Limpiar si no hay tanques disponibles para el usuario seleccionado
    }
  }, [tanks, selectedTankId, onTankChange]);

  const today = format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
        
        {/* Filtro de Usuario (Solo Admin) */}
        {isAdmin && (
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <UserIcon className="w-4 h-4 mr-2" />
              Usuario
            </label>
            <select
              value={selectedUserId || ''}
              onChange={e => onUserChange && onUserChange(e.target.value)}
              className="w-full form-select"
            >
              {users?.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Filtro de Tanque */}
        <div>
          <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <Droplets className="w-4 h-4 mr-2" />
            Estanque
          </label>
          <select
            value={selectedTankId || ''}
            onChange={e => onTankChange(e.target.value)}
            className="w-full form-select"
            disabled={tanks.length === 0}
          >
            {tanks.length === 0 ? (
                <option>No hay estanques disponibles</option>
            ) : (
                tanks.map(tank => (
                    <option key={tank.id} value={tank.id}>
                        {tank.name}
                    </option>
                ))
            )}
          </select>
        </div>

        {/* Filtro de Tiempo con Rango de Fechas */}
        <div className={isAdmin ? 'col-span-1' : 'md:col-span-2'}>
            <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Calendar className="w-4 h-4 mr-2" />
                Rango de Fechas
            </label>
            <div className="flex items-center gap-2">
                <input
                    type="date"
                    value={startDate}
                    onChange={(e) => onStartDateChange(e.target.value)}
                    className="w-full form-input"
                    max={endDate || today} // No puede ser mayor que la fecha de fin o que hoy
                />
                <span className="text-gray-500 dark:text-gray-400">-</span>
                <input
                    type="date"
                    value={endDate}
                    onChange={(e) => onEndDateChange(e.target.value)}
                    className="w-full form-input"
                    min={startDate} // No puede ser menor que la fecha de inicio
                    max={today}     // No puede ser una fecha futura
                />
            </div>
        </div>
      </div>
    </div>
  );
};