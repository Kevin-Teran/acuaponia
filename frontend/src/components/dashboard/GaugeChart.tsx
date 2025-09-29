/**
 * @file GaugeChart.tsx
 * @route frontend/src/components/dashboard
 * @description Componente mejorado para mostrar medidores semicirculares. Ahora centrado y con un diseño más pulido.
 * @author Kevin Mariano 
 * @version 1.0.1
 * @since 1.0.0
 * @copyright SENA 2025
 */

import React, { useMemo } from 'react';
import { UserSettings, SensorType } from '@/types';
import { RealtimeData } from '@/types/dashboard';
import { Skeleton } from '@/components/common/Skeleton';
import { Thermometer, Droplets, Wind, Activity, Clock } from 'lucide-react';
import { motion, circOut } from 'framer-motion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface GaugeChartProps {
    data: RealtimeData | null;
    settings: UserSettings | null;
    loading: boolean;
}

interface StatusInfo {
    label: 'Bajo' | 'Óptimo' | 'Alto';
    color: string;
    textColorClass: string;
}

const sensorInfo: Record<string, { icon: React.ElementType; name: string }> = {
    [SensorType.TEMPERATURE]: { icon: Thermometer, name: 'Temperatura' },
    [SensorType.PH]: { icon: Droplets, name: 'pH' },
    [SensorType.OXYGEN]: { icon: Wind, name: 'Oxígeno Disuelto' },
};

/**
 * @function getSensorConfig
 * @description Obtiene la configuración específica para un tipo de sensor, incluyendo rangos y colores.
 * @param {SensorType} type - El tipo de sensor.
 * @param {Settings | null} settings - La configuración del sistema.
 * @returns {object} - La configuración del medidor.
 */
const getSensorConfig = (type: SensorType, settings: UserSettings | null) => {
    const defaultThresholds = {
        temperature: { min: 22, max: 28 },
        ph: { min: 6.8, max: 7.6 },
        oxygen: { min: 5, max: 8 },
    };
    const currentThresholds = settings?.thresholds;
    let config;
    let unit = '';
    const colors = {
        low: '#3b82f6',
        optimal: '#22c55e',
        high: '#ef4444',
    };

    switch (type) {
        case SensorType.TEMPERATURE:
            config = currentThresholds
                ? { min: currentThresholds.temperatureMin, max: currentThresholds.temperatureMax }
                : defaultThresholds.temperature;
            unit = '°C';
            break;
        case SensorType.PH:
            config = currentThresholds
                ? { min: currentThresholds.phMin, max: currentThresholds.phMax }
                : defaultThresholds.ph;
            unit = 'pH';
            break;
        case SensorType.OXYGEN:
            config = currentThresholds
                ? { min: currentThresholds.oxygenMin, max: currentThresholds.oxygenMax }
                : defaultThresholds.oxygen;
            unit = 'mg/L';
            break;
        default:
            config = { min: 0, max: 100 };
            unit = '';
            break;
    }

    const { min, max } = config;
    const range = max - min;
    const buffer = range > 0 ? range * 0.6 : 3;

    return {
        unit,
        min: Math.max(0, min - buffer),
        max: max + buffer,
        optimal: { min, max },
        colors,
    };
};

/**
 * @component SemiCircularGauge
 * @description Renderiza el medidor semicircular con la aguja animada.
 * @param {{ percentage: number; strokeColor: string }} props - Propiedades del componente.
 * @returns {React.ReactElement}
 */
const SemiCircularGauge = ({
    percentage,
    strokeColor,
}: {
    percentage: number;
    strokeColor: string;
}) => {
    const radius = 35;
    const strokeWidth = 8;
    const needleLength = radius - 5;
    const needleBaseWidth = 8;

    const svgWidth = 100;
    const svgHeight = 60;
    const centerX = svgWidth / 2;
    const centerY = svgHeight - 10;

    const startX = centerX - radius;
    const startY = centerY;
    const endX = centerX + radius;
    const endY = centerY;
    const circumference = Math.PI * radius;

    const transition = { duration: 1.5, ease: circOut };

    const needleAngleRad = (percentage / 100) * Math.PI;

    const needleTipX = centerX - Math.cos(needleAngleRad) * needleLength;
    const needleTipY = centerY - Math.sin(needleAngleRad) * needleLength;
    const baseOffsetX = (needleBaseWidth / 2) * Math.sin(needleAngleRad);
    const baseOffsetY = (needleBaseWidth / 2) * -Math.cos(needleAngleRad);
    const base1X = centerX + baseOffsetX;
    const base1Y = centerY + baseOffsetY;
    const base2X = centerX - baseOffsetX;
    const base2Y = centerY - baseOffsetY;

    const needlePathD = `M ${needleTipX} ${needleTipY} L ${base1X} ${base1Y} L ${base2X} ${base2Y} Z`;
    const initialNeedlePathD = `M ${
        centerX - needleLength
    } ${centerY} L ${centerX} ${centerY - needleBaseWidth / 2} L ${centerX} ${
        centerY + needleBaseWidth / 2
    } Z`;

    return (
        <div className='relative w-full h-auto flex justify-center items-center'>
            <svg
                width='100%'
                height='100%'
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className='overflow-visible'
            >
                {/* Arco de fondo */}
                <path
                    d={`M ${startX} ${startY} A ${radius} ${radius} 0 0 1 ${endX} ${endY}`}
                    className='stroke-current text-gray-200 dark:text-gray-700'
                    strokeWidth={strokeWidth}
                    fill='none'
                    strokeLinecap='round'
                />

                {/* Arco de progreso (animado) */}
                <motion.path
                    d={`M ${startX} ${startY} A ${radius} ${radius} 0 0 1 ${endX} ${endY}`}
                    fill='none'
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeLinecap='round'
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{
                        strokeDashoffset:
                            circumference - (circumference * percentage) / 100,
                    }}
                    transition={transition}
                />

                {/* Aguja Triangular (animada) */}
                <motion.path
                    fill={strokeColor}
                    initial={{ d: initialNeedlePathD }}
                    animate={{ d: needlePathD }}
                    transition={transition}
                />

                {/* Pivote central de la aguja */}
                <circle cx={centerX} cy={centerY} r='4' fill={strokeColor} />
                <circle cx={centerX} cy={centerY} r='2' fill='white' />
            </svg>
        </div>
    );
};

/**
 * @component GaugeItem
 * @description Tarjeta individual para un medidor de sensor.
 * @param {{ data: any; type: SensorType; settings: Settings | null }} props - Propiedades del componente.
 * @returns {React.ReactElement}
 */
const GaugeItem = ({
    data,
    type,
    settings,
}: {
    data: any;
    type: SensorType;
    settings: UserSettings | null;
}) => {
    const config = getSensorConfig(type, settings);
    const { icon: Icon, name } = sensorInfo[type];

    const getStatus = (value: number): StatusInfo => {
        if (value < config.optimal.min)
            return {
                label: 'Bajo',
                color: config.colors.low,
                textColorClass: 'text-blue-500',
            };
        if (value > config.optimal.max)
            return {
                label: 'Alto',
                color: config.colors.high,
                textColorClass: 'text-red-500',
            };
        return {
            label: 'Óptimo',
            color: config.colors.optimal,
            textColorClass: 'text-green-500',
        };
    };

    const status = getStatus(data.value);
    const rawPercent =
        ((data.value - config.min) / (config.max - config.min)) * 100;
    const valuePercent = Math.max(0, Math.min(100, rawPercent));

    const formattedTimestamp = useMemo(() => {
        if (!data.timestamp) return null;
        try {
            return format(new Date(data.timestamp), "d MMM, HH:mm:ss", { locale: es });
        } catch (error) {
            console.error("Error formatting date:", error);
            return "Fecha inválida";
        }
    }, [data.timestamp]);


    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            whileHover={{ y: -5, scale: 1.03 }}
            className='bg-white dark:bg-gray-800/60 p-4 rounded-2xl shadow-lg border border-black/5 backdrop-blur-sm flex flex-col justify-between w-full max-w-sm sm:max-w-xs md:max-w-sm'
        >
            <div className='flex items-center justify-between'>
                <div className='flex items-center gap-3'>
                    <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center bg-opacity-10 ${status.textColorClass.replace(
                            'text-',
                            'bg-',
                        )}`}
                    >
                        <Icon className={`w-5 h-5 ${status.textColorClass}`} />
                    </div>
                    <span className='font-semibold text-gray-800 dark:text-gray-100'>
                        {name}
                    </span>
                </div>
                <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full text-white ${status.textColorClass.replace(
                        'text-',
                        'bg-',
                    )}`}
                >
                    {status.label}
                </span>
            </div>

            <div className='relative my-2'>
                <SemiCircularGauge
                    percentage={valuePercent}
                    strokeColor={status.color}
                />
            </div>

            <div className='flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 -mt-4'>
                <span>{config.min.toFixed(1)}</span>
                <div className='flex flex-col items-center'>
                    <span className={`text-3xl font-bold ${status.textColorClass}`}>
                        {data.value.toFixed(1)}
                    </span>
                    <span className='text-sm text-gray-500 dark:text-gray-400 -mt-1'>
                        {config.unit || 'pH'}
                    </span>
                </div>
                <span>{config.max.toFixed(1)}</span>
            </div>

            {formattedTimestamp && (
                <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <motion.p
                        className="text-xs text-gray-500 dark:text-gray-400 font-medium"
                        animate={{ opacity: [0.7, 1, 0.7] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    >
                        Última lectura: {formattedTimestamp}
                    </motion.p>
                </div>
            )}
        </motion.div>
    );
};

/**
 * @component GaugeChart
 * @description Componente principal que renderiza una cuadrícula de medidores de sensores.
 * @param {GaugeChartProps} props - Propiedades del componente.
 * @returns {React.ReactElement}
 */
export const GaugeChart = ({ data, settings, loading }: GaugeChartProps) => {
    const sensorData = useMemo(() => {
        if (!data) return []; 
        const allowedTypes = [
            SensorType.TEMPERATURE,
            SensorType.PH,
            SensorType.OXYGEN,
        ];
        return Object.entries(data)
            .flatMap(([type, values]) => {
                const normalizedType = type.toUpperCase() as SensorType; 

                return Array.isArray(values) 
                    ? values.map((v) => ({ ...v, type: normalizedType }))
                    : []; 
            })
            .filter((sensor) => allowedTypes.includes(sensor.type))
            .sort(
                (a, b) => allowedTypes.indexOf(a.type) - allowedTypes.indexOf(b.type),
            );
    }, [data, settings]); 

    if (loading) {
        return (
            <div className='flex justify-center flex-wrap gap-6'>
                {[...Array(3)].map((_, i) => (
                    <Skeleton
                        key={i}
                        className='h-[160px] w-full max-w-sm sm:max-w-xs md:max-w-sm rounded-2xl'
                    />
                ))}
            </div>
        );
    }

    if (!data || sensorData.length === 0) {
        return (
            <div className='flex flex-col items-center justify-center bg-white dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl shadow-lg p-8 text-center border border-black/5 min-h-[160px]'>
                <Activity className='h-12 w-12 text-gray-400 mx-auto mb-4' />
                <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>
                    No hay datos en tiempo real
                </h3>
                <p className='text-gray-500 dark:text-gray-400 mt-1'>
                    No se encontraron lecturas recientes para los sensores.
                </p>
            </div>
        );
    }

    return (
        <div className='flex justify-center flex-wrap gap-6'>
            {sensorData.map((sensor) => (
                <GaugeItem
                    key={sensor.sensorId}
                    data={sensor}
                    type={sensor.type}
                    settings={settings}
                />
            ))}
        </div>
    );
};