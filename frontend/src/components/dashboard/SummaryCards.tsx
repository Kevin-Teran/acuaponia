// frontend/src/components/dashboard/SummaryCards.tsx
import React from 'react';
import { Thermometer, Droplets, Wind, Zap, BarChartHorizontal, Clock, ServerOff, Activity, SlidersHorizontal } from 'lucide-react';
import { Sensor } from '../../types';
import { Card } from '../common/Card';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '../../utils/cn';

interface Thresholds {
  temperature: { low: number; high: number };
  ph: { low: number; high: number };
  oxygen: { low: number; high: number };
}

interface SensorStatusCardProps {
  sensor: Sensor;
  threshold: { low: number; high: number };
}

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

const getStatusChip = (status: Sensor['status']) => {
    const styles: Record<string, string> = { ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', INACTIVE: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300', MAINTENANCE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300', ERROR: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' };
    return <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium', styles[status])}>{status}</span>;
};

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
                    <span>Umbral: <span className="font-semibold text-gray-700 dark:text-gray-300">{threshold?.low ?? '-'} - {threshold?.high ?? '-'}{unit}</span></span>
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

export const SummaryCards: React.FC<{ sensors: Sensor[]; thresholds: Thresholds }> = ({ sensors, thresholds }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sensors.map(sensor => {
                const sensorTypeKey = sensor.type.toLowerCase() as keyof Thresholds;
                const sensorThreshold = thresholds?.[sensorTypeKey] || { low: 0, high: 0 };
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