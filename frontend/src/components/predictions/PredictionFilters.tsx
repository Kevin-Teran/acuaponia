/**
 * @file PredictionFilters.tsx
 * @route frontend/src/components/predictions
 * @description Barra de filtros pulida y consistente con el Dashboard.
 * @author Kevin Mariano
 * @version 2.0.0
 * @since 1.0.0
 * @copyright SENA 2025
 */
import React from 'react';
import { Card } from '@/components/common/Card';
import { Skeleton } from '@/components/common/Skeleton';
import { User, Tank, Role } from '@/types';

interface PredictionFiltersProps {
  filters: {
    userId: string;
    tankId: string;
    horizon: string;
  };
  onFiltersChange: (newFilters: Partial<PredictionFiltersProps['filters']>) => void;
  usersList: User[];
  tanksList: Tank[];
  currentUserRole: Role;
  loading: boolean;
}

export const PredictionFilters = ({
  filters,
  onFiltersChange,
  usersList,
  tanksList,
  currentUserRole,
  loading,
}: PredictionFiltersProps) => {
  const handleUserChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({ userId: e.target.value, tankId: undefined });
  };

  return (
    <Card>
      <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
        {currentUserRole === Role.ADMIN && (
          <div>
            <label htmlFor="user-filter" className="label">
              Usuario
            </label>
            {loading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <select
                id="user-filter"
                name="userId"
                className="form-select"
                value={filters.userId}
                onChange={handleUserChange}
              >
                {usersList.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        <div>
          <label htmlFor="tank-filter" className="label">
            Tanque
          </label>
          {loading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <select
              id="tank-filter"
              name="tankId"
              className="form-select"
              value={filters.tankId}
              onChange={(e) => onFiltersChange({ tankId: e.target.value })}
              disabled={tanksList.length === 0}
            >
              {tanksList.length > 0 ? (
                tanksList.map((tank) => (
                  <option key={tank.id} value={tank.id}>
                    {tank.name}
                  </option>
                ))
              ) : (
                <option value="">
                  {filters.userId ? 'Sin tanques' : 'Seleccione un usuario'}
                </option>
              )}
            </select>
          )}
        </div>
        
        <div>
          <label htmlFor="horizon-filter" className="label">
            Horizonte de Predicción
          </label>
          <select
            id="horizon-filter"
            name="horizon"
            className="form-select"
            value={filters.horizon}
            onChange={(e) => onFiltersChange({ horizon: e.target.value })}
            disabled={!filters.tankId}
          >
            <option value="7">Próximos 7 Días</option>
            <option value="15">Próximos 15 Días</option>
          </select>
        </div>
      </div>
    </Card>
  );
};