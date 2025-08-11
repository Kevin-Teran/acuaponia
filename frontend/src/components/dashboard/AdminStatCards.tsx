import React, { useMemo } from 'react';
import { Card } from '../common/Card';
import { Cpu, Zap } from 'lucide-react';
import { Sensor } from '../../types';

/**
 * @interface AdminStatCardsProps
 * @description Propiedades para el componente de tarjetas de estadísticas de sensores.
 */
interface AdminStatCardsProps {
  sensors: Sensor[]; 
}

/**
 * @component AdminStatCards
 * @description Muestra tarjetas discretas con el conteo de sensores totales y activos
 * para el estanque actualmente seleccionado en los filtros del dashboard.
 */
export const AdminStatCards: React.FC<AdminStatCardsProps> = ({ sensors }) => {
  const stats = useMemo(() => ({
    totalSensors: sensors.length,
    activeSensors: sensors.filter(s => s.status === 'ACTIVE').length,
  }), [sensors]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="p-4">
        <div className="flex items-center">
          <div className="p-3 rounded-md bg-gray-100 dark:bg-gray-700 mr-4">
            <Cpu className="w-6 h-6 text-gray-500 dark:text-gray-300" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Sensores en este Tanque</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalSensors}</p>
          </div>
        </div>
      </Card>
      <Card className="p-4">
        <div className="flex items-center">
           <div className="p-3 rounded-md bg-gray-100 dark:bg-gray-700 mr-4">
            <Zap className="w-6 h-6 text-sena-green" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Sensores Activos</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.activeSensors}</p>
          </div>
        </div>
      </Card>
    </div>
  );
};