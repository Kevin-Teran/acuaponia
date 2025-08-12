import React from 'react';
import { 
    Thermometer, 
    Droplets, 
    Wind, 
    Zap, 
    BarChartHorizontal, 
    Clock, 
    ServerOff, 
    Activity, 
    TrendingUp,
    TrendingDown,
    Minus,
    ArrowDownCircle,
    ArrowUpCircle
} from 'lucide-react';
import { Sensor } from '../../types';
import { Card } from '../common/Card';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '../../utils/cn';

/**
 * @interface Thresholds
 * @description Define la estructura del objeto de umbrales del usuario.
 */
interface Thresholds {
  temperature: { min: number; max: number };
  ph: { min: number; max: number };
  oxygen: { min: number; max: number };
}

/**
 * @interface SensorStatusCardProps
 * @description Propiedades para la tarjeta de estado de un sensor.
 */
interface SensorStatusCardProps {
  sensor: Sensor;
  threshold: { min: number; max: number };
}

/**
 * @constant SENSOR_ORDER
 * @description Define el orden de visualización para las tarjetas: Temperatura, Oxígeno Disuelto, Nivel de pH.
 */
const SENSOR_ORDER: Record<string, number> = {
    'TEMPERATURE': 1,
    'OXYGEN': 2,
    'PH': 3,
};

/**
 * @function getSensorInfo
 * @description Devuelve metadatos clave para un tipo de sensor.
 * @param {Sensor['type']} type - El tipo de sensor.
 * @returns Un objeto con ícono, unidad, nombre y colores asociados.
 */
const getSensorInfo = (type: Sensor['type']) => {
    const info = {
        TEMPERATURE: { icon: Thermometer, unit: '°C', name: 'Temperatura', color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-500/20' },
        PH: { icon: Droplets, unit: '', name: 'Nivel de pH', color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-500/20' },
        OXYGEN: { icon: Wind, unit: 'mg/L', name: 'Oxígeno Disuelto', color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-500/20' },
        LEVEL: { icon: BarChartHorizontal, unit: '%', name: 'Nivel', color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-500/20' },
        FLOW: { icon: Zap, unit: 'L/min', name: 'Flujo', color: 'text-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-500/20' }
    };
    return info[type] || { icon: Activity, unit: '', name: 'Desconocido', color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-500/20' };
};

/**
 * @component SensorStatusCard
 * @description Tarjeta de visualización avanzada para un sensor individual. Muestra la lectura actual,
 * la tendencia comparada con la anterior, y umbrales claros de mínimo y máximo con indicadores de color.
 * @param {SensorStatusCardProps} props - Propiedades del componente.
 * @returns {React.ReactElement}
 */
const SensorStatusCard: React.FC<SensorStatusCardProps> = ({ sensor, threshold }) => {
    const { icon: Icon, unit, name, color, bg } = getSensorInfo(sensor.type);
    const hasReading = sensor.lastReading !== null && sensor.lastReading !== undefined;
    
    const difference = hasReading && sensor.previousReading !== null && sensor.previousReading !== undefined 
        ? sensor.lastReading! - sensor.previousReading! 
        : null;

    const getTrendInfo = () => {
        if (difference === null || Math.abs(difference) < 0.01) {
            return { Icon: Minus, color: 'text-gray-500 dark:text-gray-400', text: 'Estable' };
        }
        if (difference > 0) {
            return { Icon: TrendingUp, color: 'text-green-500', text: `+${difference.toFixed(1)}${unit} vs. anterior` };
        }
        return { Icon: TrendingDown, color: 'text-red-500', text: `${difference.toFixed(1)}${unit} vs. anterior` };
    };

    const trendInfo = getTrendInfo();
    
    const statusInfo = {
        'Óptimo': { text: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30' },
        'Bajo': { text: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' },
        'Alto': { text: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30' }
    }[sensor.readingStatus || 'Óptimo'];

    return (
        <Card className="flex flex-col h-full p-4">
            <div className="flex-grow flex flex-col">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-full ${bg}`}>
                            <Icon className={`w-5 h-5 ${color}`} />
                        </div>
                        <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{name}</h3>
                    </div>
                    <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium', statusInfo.bg, statusInfo.text)}>{sensor.readingStatus}</span>
                </div>

                <div className="flex-grow flex flex-col items-center justify-center my-4">
                    {hasReading ? (
                        <div className="flex items-baseline text-center">
                            <span className="text-6xl font-bold text-gray-900 dark:text-white">
                                {sensor.lastReading!.toFixed(unit === '' ? 2 : 1)}
                            </span>
                            <span className="text-2xl font-semibold text-gray-500 dark:text-gray-400 ml-2">{unit}</span>
                        </div>
                    ) : (
                        <div className="text-center text-gray-400 dark:text-gray-500">
                            <ServerOff className="w-8 h-8 mx-auto mb-2" />
                            <p className="text-sm font-medium">Sin datos registrados</p>
                        </div>
                    )}
                </div>
            </div>
            
            <div className="space-y-3 mt-auto">
                <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg text-center">
                    <div className="w-1/2">
                        <p className="text-xs text-gray-600 dark:text-gray-300">Mínimo</p>
                        <p className="font-bold text-base text-blue-600 dark:text-blue-400">{threshold?.min ?? '--'}{unit}</p>
                        <ArrowDownCircle className="w-5 h-5 mx-auto text-blue-400 mt-1"/>
                    </div>
                    <div className="w-px h-10 bg-gray-200 dark:bg-gray-600"></div>
                    <div className="w-1/2">
                        <p className="text-xs text-gray-600 dark:text-gray-300">Máximo</p>
                        <p className="font-bold text-base text-red-600 dark:text-red-400">{threshold?.max ?? '--'}{unit}</p>
                        <ArrowUpCircle className="w-5 h-5 mx-auto text-red-400 mt-1"/>
                    </div>
                </div>

                <div className="flex flex-col items-center justify-center text-xs pt-2 space-y-1">
                    {hasReading && (
                        <div className={`flex items-center font-medium ${trendInfo.color}`}>
                            <trendInfo.Icon className="w-4 h-4 mr-1.5" />
                            <span>{trendInfo.text}</span>
                        </div>
                    )}
                    <div className="text-gray-500 dark:text-gray-400 flex items-center">
                        <Clock className="w-3 h-3 mr-1.5" />
                        {hasReading && sensor.lastUpdate
                            ? format(parseISO(sensor.lastUpdate), 'dd/MM/yy hh:mm:ss a', { locale: es })
                            : 'No disponible'
                        }
                    </div>
                </div>
            </div>
        </Card>
    );
};

/**
 * @component SummaryCards
 * @description Componente contenedor que ordena y renderiza las tarjetas de estado de los sensores.
 * @param {{ sensors: Sensor[]; thresholds: Thresholds }} props - Los sensores y sus umbrales.
 * @returns {React.ReactElement}
 */
export const SummaryCards: React.FC<{ sensors: Sensor[]; thresholds: Thresholds }> = ({ sensors, thresholds }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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