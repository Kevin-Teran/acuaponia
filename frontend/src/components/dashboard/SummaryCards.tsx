import React from 'react';
import { Thermometer, Droplets, Wind, Zap, BarChartHorizontal, Clock, ServerOff, Activity, SlidersHorizontal } from 'lucide-react';
import { Sensor } from '../../types';
import { Card } from '../common/Card';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '../../utils/cn';

/**
 * @interface Thresholds
 * @description Define la estructura del objeto de umbrales.
 * @technical_requirements CORRECCIÓN: Se ajustaron las propiedades a `min` y `max` para coincidir con la estructura de datos guardada en el campo `settings` del usuario.
 */
interface Thresholds {
  temperature: { min: number; max: number };
  ph: { min: number; max: number };
  oxygen: { min: number; max: number };
}

/**
 * @interface SensorStatusCardProps
 * @description Define las propiedades para la tarjeta de estado individual de un sensor.
 */
interface SensorStatusCardProps {
  sensor: Sensor;
  threshold: { min: number; max: number };
}

/**
 * @constant SENSOR_ORDER
 * @description Define el orden de visualización deseado para las tarjetas de sensores en el dashboard.
 * Un número menor indica una posición anterior.
 */
const SENSOR_ORDER: Record<string, number> = {
    'TEMPERATURE': 1,
    'OXYGEN': 2,
    'PH': 3,
};

/**
 * @function getSensorInfo
 * @description Función de utilidad para obtener metadatos de un sensor según su tipo.
 * @param {Sensor['type']} type - El tipo de sensor.
 * @returns Un objeto con el ícono, la unidad y el nombre del sensor.
 */
const getSensorInfo = (type: Sensor['type']) => {
    const info = {
        TEMPERATURE: { icon: Thermometer, unit: '°C', name: 'Temperatura' },
        PH: { icon: Droplets, unit: '', name: 'pH' },
        OXYGEN: { icon: Wind, unit: 'mg/L', name: 'Oxígeno' },
        LEVEL: { icon: BarChartHorizontal, unit: '%', name: 'Nivel' },
        FLOW: { icon: Zap, unit: 'L/min', name: 'Flujo' }
    };
    return info[type] || { icon: Activity, unit: '', name: 'Desconocido' };
};

/**
 * @function getStatusChip
 * @description Devuelve un chip de color estilizado según el estado operativo del sensor.
 * @param {Sensor['status']} status - El estado actual del sensor.
 * @returns {React.ReactElement} Un componente span estilizado.
 */
const getStatusChip = (status: Sensor['status']) => {
    const styles: Record<string, string> = { ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', INACTIVE: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300', MAINTENANCE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300', ERROR: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' };
    return <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium', styles[status])}>{status}</span>;
};

/**
 * @component SensorStatusCard
 * @description Tarjeta individual que muestra el estado detallado de un sensor.
 * @param {SensorStatusCardProps} props - Propiedades del componente.
 * @returns {React.ReactElement}
 */
const SensorStatusCard: React.FC<SensorStatusCardProps> = ({ sensor, threshold }) => {
    const { icon: Icon, unit } = getSensorInfo(sensor.type);
    const hasReading = sensor.lastReading !== null && sensor.lastReading !== undefined;

    return (
        <Card className="flex flex-col justify-between hover:shadow-lg transition-shadow">
            <div>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                        <Icon className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                        <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{sensor.name}</h3>
                    </div>
                    {getStatusChip(sensor.status)}
                </div>

                {hasReading ? (
                    <div className="text-center my-4">
                        <span className="text-5xl font-bold text-gray-900 dark:text-white">
                            {sensor.lastReading!.toFixed(unit === '' ? 2 : 1)}
                        </span>
                        <span className="text-xl text-gray-500 dark:text-gray-400 ml-1">{unit}</span>
                    </div>
                ) : (
                    <div className="text-center my-8 text-gray-400 dark:text-gray-500">
                        <ServerOff className="w-8 h-8 mx-auto mb-2" />
                        <p className="text-sm font-medium">Sin datos registrados</p>
                    </div>
                )}
            </div>
            
            <div className="space-y-2">
                 <div className="text-center text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 p-2 rounded-md flex items-center justify-center space-x-2">
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    {/* CORRECCIÓN: Se usan `threshold.min` y `threshold.max` para mostrar los datos correctos. */}
                    <span>Umbral: <span className="font-semibold text-gray-700 dark:text-gray-300">{threshold?.min ?? '--'} - {threshold?.max ?? '--'}{unit}</span></span>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-700 mt-2 pt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center">
                    <Clock className="w-3.5 h-3.5 mr-2" />
                    {hasReading && sensor.lastUpdate
                        ? `Última lectura: ${format(parseISO(sensor.lastUpdate), 'dd/MM/yy h:mm:ss a', { locale: es })}`
                        : 'Aún no reporta datos'
                    }
                </div>
            </div>
        </Card>
    );
};

/**
 * @component SummaryCards
 * @description Componente contenedor que ordena y renderiza una cuadrícula de `SensorStatusCard`.
 * @param {{ sensors: Sensor[]; thresholds: Thresholds }} props - Propiedades del componente.
 * @returns {React.ReactElement}
 */
export const SummaryCards: React.FC<{ sensors: Sensor[]; thresholds: Thresholds }> = ({ sensors, thresholds }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* CORRECCIÓN: Se ordena el array de sensores antes de mapearlo para asegurar un orden de visualización consistente. */}
            {[...sensors]
                .sort((a, b) => (SENSOR_ORDER[a.type] || 99) - (SENSOR_ORDER[b.type] || 99))
                .map(sensor => {
                    const sensorTypeKey = sensor.type.toLowerCase() as keyof Thresholds;
                    const sensorThreshold = thresholds?.[sensorTypeKey] || { min: 0, max: 0 };
                    return (
                        <SensorStatusCard 
                            key={sensor.id} 
                            sensor={sensor}
                            threshold={sensorThreshold}
                        />
                    );
                })}
        </div>
    );
};