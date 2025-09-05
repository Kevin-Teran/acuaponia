/**
 * @file AnalyticsFilters.tsx
 * @route frontend/src/components/analytics/
 * @description Componente para los filtros de la página de analíticas.
 * @author kevin mariano
 * @version 1.0.0
 * @since 1.0.0
 * @copyright SENA 2025
 */

import { SensorType, Role } from '@/types';

interface AnalyticsFiltersProps {
  filters: any;
  onFiltersChange: (newFilters: any) => void;
  tanksList: any[];
  usersList: any[];
  currentUserRole?: Role;
  loading: boolean;
}

export const AnalyticsFilters = ({
  filters,
  onFiltersChange,
  tanksList,
  usersList,
  currentUserRole,
  loading,
}: AnalyticsFiltersProps) => {
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    onFiltersChange({ [e.target.name]: e.target.value });
  };

  return (
    <div className="grid grid-cols-1 gap-4 rounded-lg bg-white p-4 dark:bg-gray-800 md:grid-cols-2 lg:grid-cols-5">
      {/* Filtros de Fecha */}
      <div>
        <label
          htmlFor="startDate"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Fecha Inicio
        </label>
        <input
          type="date"
          name="startDate"
          id="startDate"
          value={filters.startDate}
          onChange={handleInputChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:border-gray-600 dark:bg-gray-700"
          disabled={loading}
        />
      </div>
      <div>
        <label
          htmlFor="endDate"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Fecha Fin
        </label>
        <input
          type="date"
          name="endDate"
          id="endDate"
          value={filters.endDate}
          onChange={handleInputChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:border-gray-600 dark:bg-gray-700"
          disabled={loading}
        />
      </div>

      {/* Filtro de Usuario (solo para Admins) */}
      {currentUserRole === Role.ADMIN && (
        <div>
          <label
            htmlFor="userId"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Usuario
          </label>
          <select
            name="userId"
            id="userId"
            value={filters.userId}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:border-gray-600 dark:bg-gray-700"
            disabled={loading}
          >
            <option value="">Todos los Usuarios</option>
            {/* AQUÍ ESTÁ LA CORRECCIÓN */}
            {(usersList || []).map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Filtro de Tanque */}
      <div>
        <label
          htmlFor="tankId"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Tanque
        </label>
        <select
          name="tankId"
          id="tankId"
          value={filters.tankId}
          onChange={handleInputChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:border-gray-600 dark:bg-gray-700"
          disabled={loading}
        >
          <option value="">Todos los Tanques</option>
          {/* AQUÍ ESTÁ LA CORRECCIÓN */}
          {(tanksList || []).map((tank) => (
            <option key={tank.id} value={tank.id}>
              {tank.name}
            </option>
          ))}
        </select>
      </div>

      {/* Filtro de Tipo de Sensor */}
      <div>
        <label
          htmlFor="sensorType"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Parámetro
        </label>
        <select
          name="sensorType"
          id="sensorType"
          value={filters.sensorType}
          onChange={handleInputChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:border-gray-600 dark:bg-gray-700"
          disabled={loading}
        >
          {Object.values(SensorType).map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};