/**
 * @file LineChart.tsx
 * @route frontend/src/components/dashboard
 * @description Componente de gráfico de líneas con diseño premium, iconos y colores dinámicos.
 * @author Kevin Mariano
 * @version 1.0.0 
 * @since 1.0.0
 * @copyright SENA 2025
 */

'use client';

import React, { useMemo } from 'react';
import {
    Area,
    AreaChart,
    CartesianGrid,
    Line,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import {
    BarChart3,
    Minus,
    Thermometer,
    TrendingDown,
    TrendingUp,
    Waves,
    Wind,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Settings, SensorType } from '@/types';
import { format, differenceInDays, differenceInHours, differenceInMinutes, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatInTimeZone } from 'date-fns-tz';

// --- Interfaces y Tipos ---
interface ChartDataPoint {
    time: string;
    value: number;
}

interface LineChartProps {
    data: ChartDataPoint[];
    title: string;
    yAxisLabel: string;
    sensorType: SensorType;
    settings: Settings | null;
    loading: boolean;
    isLive: boolean;
    dateRange?: { from: Date; to: Date };
}

interface SampledDataPoint extends ChartDataPoint {
    originalIndex: number;
}

// --- Constantes y Configuración ---
const TIME_ZONE = 'America/Bogota';

/**
 * @constant MAX_VISIBLE_POINTS
 * @description Límite máximo de puntos visibles en el gráfico para mantener rendimiento
 */
const MAX_VISIBLE_POINTS = 150;

/**
 * @constant MIN_POINTS_FOR_SAMPLING
 * @description Mínimo de puntos necesarios para activar el muestreo inteligente
 */
const MIN_POINTS_FOR_SAMPLING = 50;

/**
 * @enum TimeRangeType
 * @description Tipos de rangos temporales para determinar el formato del eje X
 */
enum TimeRangeType {
    MINUTES = 'MINUTES',
    HOURS = 'HOURS', 
    DAYS = 'DAYS',
    WEEKS = 'WEEKS',
    MONTHS = 'MONTHS',
    YEARS = 'YEARS'
}

const SENSOR_THEMES = {
    [SensorType.TEMPERATURE]: {
        icon: Thermometer,
        color: '#3b82f6',
        gradientId: 'tempGradient',
        name: 'Temperatura',
    },
    [SensorType.PH]: {
        icon: Waves,
        color: '#22c55e',
        gradientId: 'phGradient',
        name: 'pH',
    },
    [SensorType.OXYGEN]: {
        icon: Wind,
        color: '#06b6d4',
        gradientId: 'oxygenGradient',
        name: 'Oxígeno',
    },
    [SensorType.LEVEL]: {
        icon: BarChart3,
        color: '#a855f7',
        gradientId: 'levelGradient',
        name: 'Nivel',
    },
    [SensorType.FLOW]: {
        icon: Waves,
        color: '#f97316',
        gradientId: 'flowGradient',
        name: 'Flujo',
    },
};

// --- Funciones de Utilidad ---

/**
 * @function determineTimeRangeType
 * @description Determina el tipo de rango temporal basado en las fechas de inicio y fin
 * @param {Date} startDate - Fecha de inicio
 * @param {Date} endDate - Fecha de fin
 * @returns {TimeRangeType} Tipo de rango temporal
 */
const determineTimeRangeType = (startDate: Date, endDate: Date): TimeRangeType => {
    const diffInMinutes = differenceInMinutes(endDate, startDate);
    const diffInHours = differenceInHours(endDate, startDate);
    const diffInDays = differenceInDays(endDate, startDate);

    if (diffInMinutes <= 120) { // Menos de 2 horas
        return TimeRangeType.MINUTES;
    } else if (diffInHours <= 48) { // Menos de 2 días
        return TimeRangeType.HOURS;
    } else if (diffInDays <= 14) { // Menos de 2 semanas
        return TimeRangeType.DAYS;
    } else if (diffInDays <= 90) { // Menos de 3 meses
        return TimeRangeType.WEEKS;
    } else if (diffInDays <= 730) { // Menos de 2 años
        return TimeRangeType.MONTHS;
    } else {
        return TimeRangeType.YEARS;
    }
};

/**
 * @function getTickFormatter
 * @description Obtiene el formateador apropiado para los ticks del eje X según el tipo de rango
 * @param {TimeRangeType} rangeType - Tipo de rango temporal
 * @returns {function} Función formateadora
 */
const getTickFormatter = (rangeType: TimeRangeType) => {
    const formatters = {
        [TimeRangeType.MINUTES]: (tick: string) => 
            formatInTimeZone(new Date(tick), TIME_ZONE, 'HH:mm:ss', { locale: es }),
        
        [TimeRangeType.HOURS]: (tick: string) => 
            formatInTimeZone(new Date(tick), TIME_ZONE, 'HH:mm', { locale: es }),
        
        [TimeRangeType.DAYS]: (tick: string) => 
            formatInTimeZone(new Date(tick), TIME_ZONE, 'dd/MM', { locale: es }),
        
        [TimeRangeType.WEEKS]: (tick: string) => 
            formatInTimeZone(new Date(tick), TIME_ZONE, 'dd MMM', { locale: es }),
        
        [TimeRangeType.MONTHS]: (tick: string) => 
            formatInTimeZone(new Date(tick), TIME_ZONE, 'MMM yyyy', { locale: es }),
        
        [TimeRangeType.YEARS]: (tick: string) => 
            formatInTimeZone(new Date(tick), TIME_ZONE, 'yyyy', { locale: es }),
    };

    return formatters[rangeType];
};

/**
 * @function intelligentSampling
 * @description Aplica muestreo inteligente a los datos para mantener un número óptimo de puntos
 * conservando la representatividad visual de los datos
 * @param {ChartDataPoint[]} data - Datos originales
 * @param {number} maxPoints - Número máximo de puntos a conservar
 * @returns {ChartDataPoint[]} Datos muestreados
 */
const intelligentSampling = (data: ChartDataPoint[], maxPoints: number): ChartDataPoint[] => {
    if (data.length <= maxPoints) {
        return data;
    }

    const sampledData: SampledDataPoint[] = [];
    const step = data.length / maxPoints;
    
    // Siempre incluir el primer punto
    sampledData.push({ ...data[0], originalIndex: 0 });
    
    // Muestreo inteligente: seleccionar puntos representativos
    for (let i = 1; i < maxPoints - 1; i++) {
        const targetIndex = Math.round(i * step);
        const actualIndex = Math.min(targetIndex, data.length - 1);
        
        // Buscar variaciones significativas en el rango local
        const windowStart = Math.max(0, actualIndex - Math.floor(step / 2));
        const windowEnd = Math.min(data.length - 1, actualIndex + Math.floor(step / 2));
        
        let selectedIndex = actualIndex;
        let maxVariation = 0;
        
        // Buscar el punto con mayor variación en la ventana
        for (let j = windowStart; j <= windowEnd; j++) {
            const prevValue = j > 0 ? data[j - 1].value : data[j].value;
            const nextValue = j < data.length - 1 ? data[j + 1].value : data[j].value;
            const variation = Math.abs(data[j].value - prevValue) + Math.abs(data[j].value - nextValue);
            
            if (variation > maxVariation) {
                maxVariation = variation;
                selectedIndex = j;
            }
        }
        
        sampledData.push({ ...data[selectedIndex], originalIndex: selectedIndex });
    }
    
    // Siempre incluir el último punto
    const lastIndex = data.length - 1;
    sampledData.push({ ...data[lastIndex], originalIndex: lastIndex });
    
    // Remover duplicados basados en originalIndex y ordenar por tiempo
    const uniqueSampled = sampledData
        .filter((item, index, arr) => 
            arr.findIndex(other => other.originalIndex === item.originalIndex) === index
        )
        .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
    
    return uniqueSampled.map(({ originalIndex, ...rest }) => rest);
};

/**
 * @function getTickInterval
 * @description Calcula el intervalo apropiado para los ticks del eje X
 * @param {number} dataLength - Cantidad de datos
 * @param {TimeRangeType} rangeType - Tipo de rango temporal
 * @returns {number | string} Intervalo de ticks
 */
const getTickInterval = (dataLength: number, rangeType: TimeRangeType): number | string => {
    const maxTicks = 8; // Máximo número de ticks visibles
    
    if (dataLength <= maxTicks) {
        return 0; // Mostrar todos los ticks
    }
    
    const interval = Math.ceil(dataLength / maxTicks);
    
    // Ajustes específicos por tipo de rango
    switch (rangeType) {
        case TimeRangeType.MINUTES:
            return Math.max(interval, 2);
        case TimeRangeType.HOURS:
            return Math.max(interval, 3);
        case TimeRangeType.DAYS:
            return Math.max(interval, 2);
        default:
            return interval;
    }
};

// --- Componentes Internos ---

/**
 * @component CustomTooltip
 * @description Tooltip personalizado que muestra información detallada del punto de datos
 */
const CustomTooltip = ({ active, payload, label, themeColor, rangeType }: any) => {
    if (active && payload && payload.length) {
        let formattedLabel: string;
        
        // Formato detallado según el tipo de rango
        switch (rangeType) {
            case TimeRangeType.MINUTES:
            case TimeRangeType.HOURS:
                formattedLabel = formatInTimeZone(
                    new Date(label),
                    TIME_ZONE,
                    'd MMM yyyy, HH:mm:ss',
                    { locale: es }
                );
                break;
            case TimeRangeType.DAYS:
            case TimeRangeType.WEEKS:
                formattedLabel = formatInTimeZone(
                    new Date(label),
                    TIME_ZONE,
                    'EEEE, d MMM yyyy, HH:mm',
                    { locale: es }
                );
                break;
            default:
                formattedLabel = formatInTimeZone(
                    new Date(label),
                    TIME_ZONE,
                    'd MMM yyyy',
                    { locale: es }
                );
        }
        
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className='rounded-xl border border-gray-200 bg-white/90 p-3 shadow-xl backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/90'
            >
                <p className='mb-1 text-sm font-semibold text-gray-900 dark:text-white'>
                    {formattedLabel}
                </p>
                <p
                    className='flex items-center text-base font-bold'
                    style={{ color: themeColor }}
                >
                    {`${payload[0].name}: ${payload[0].value.toFixed(2)}`}
                </p>
            </motion.div>
        );
    }
    return null;
};

/**
 * @component TrendIndicator
 * @description Indicador visual de la tendencia de los datos
 */
const TrendIndicator = ({ data }: { data: ChartDataPoint[] }) => {
    const trend = useMemo(() => {
        if (data.length < 2) return null;
        const first = data[0].value;
        const last = data[data.length - 1].value;
        const diff = last - first;
        if (Math.abs(diff) < 0.1)
            return { Icon: Minus, color: 'text-gray-500', text: 'Estable' };
        if (diff > 0)
            return {
                Icon: TrendingUp,
                color: 'text-green-600 dark:text-green-400',
                text: 'Al alza',
            };
        return {
            Icon: TrendingDown,
            color: 'text-red-600 dark:text-red-400',
            text: 'A la baja',
        };
    }, [data]);

    if (!trend) return null;
    return (
        <div
            className={`inline-flex items-center gap-2 rounded-full border bg-gray-50 px-3 py-1 text-sm font-medium dark:border-gray-700 dark:bg-gray-800 ${trend.color}`}
        >
            <trend.Icon className='h-4 w-4' />
            <span>{trend.text}</span>
        </div>
    );
};

/**
 * @component EmptyState
 * @description Estado vacío cuando no hay datos disponibles
 */
const EmptyState = ({ title }: { title: string }) => (
    <div className='flex h-full min-h-[400px] w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-800/50'>
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
        >
            <BarChart3 className='mx-auto h-16 w-16 text-gray-400 dark:text-gray-500' />
            <h3 className='mt-4 text-xl font-semibold text-gray-800 dark:text-gray-200'>
                No hay datos para {title}
            </h3>
            <p className='mt-2 text-sm text-gray-500 dark:text-gray-400'>
                Prueba a cambiar el rango de fechas o seleccionar otro tanque.
            </p>
        </motion.div>
    </div>
);

/**
 * @component LoadingState
 * @description Estado de carga del componente
 */
const LoadingState = () => (
    <div className='flex h-full min-h-[480px] w-full animate-pulse items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800/50' />
);

// --- Componente Principal ---

/**
 * @component LineChart
 * @description Componente principal del gráfico de líneas con muestreo inteligente
 * @param {LineChartProps} props - Propiedades del componente
 * @returns {React.ReactElement} Elemento del gráfico
 */
export const LineChart: React.FC<LineChartProps> = ({
    data,
    title,
    yAxisLabel,
    sensorType,
    settings,
    loading,
    isLive,
    dateRange,
}) => {
    const theme = SENSOR_THEMES[sensorType] || SENSOR_THEMES.TEMPERATURE;
    const IconComponent = theme.icon;

    /**
     * @memo processedData
     * @description Procesa los datos aplicando muestreo inteligente y configuración del eje X
     */
    const { processedData, stats, xAxisConfig, rangeType, dataInfo } = useMemo(() => {
        if (!data || data.length === 0) {
            return {
                processedData: [],
                stats: { min: 0, max: 0, avg: 0, yDomain: [0, 10] },
                xAxisConfig: { 
                    tickFormatter: () => '', 
                    interval: 'preserveStartEnd',
                    domain: ['auto', 'auto'] 
                },
                rangeType: TimeRangeType.HOURS,
                dataInfo: { 
                    original: 0, 
                    displayed: 0, 
                    samplingRatio: 0,
                    timeSpan: 'Sin datos'
                }
            };
        }

        // Determinar el tipo de rango temporal
        const firstDate = parseISO(data[0].time);
        const lastDate = parseISO(data[data.length - 1].time);
        const detectedRangeType = dateRange 
            ? determineTimeRangeType(dateRange.from, dateRange.to)
            : determineTimeRangeType(firstDate, lastDate);

        // Aplicar muestreo inteligente si es necesario
        const shouldSample = data.length > MIN_POINTS_FOR_SAMPLING;
        const sampledData = shouldSample 
            ? intelligentSampling(data, MAX_VISIBLE_POINTS)
            : data;

        // Calcular estadísticas
        const values = data.map((d) => d.value); // Usar datos originales para estadísticas
        const min = Math.min(...values);
        const max = Math.max(...values);
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const range = max - min;
        const padding = range > 0 ? range * 0.15 : 2;
        const yDomain: [string, string] = [
            `dataMin - ${padding}`,
            `dataMax + ${padding}`
        ];

        // Configurar eje X
        const tickFormatter = getTickFormatter(detectedRangeType);
        const tickInterval = getTickInterval(sampledData.length, detectedRangeType);

        // Información de los datos
        const samplingRatio = data.length > 0 ? (sampledData.length / data.length) * 100 : 0;
        const timeSpanLabels = {
            [TimeRangeType.MINUTES]: 'Minutos',
            [TimeRangeType.HOURS]: 'Horas', 
            [TimeRangeType.DAYS]: 'Días',
            [TimeRangeType.WEEKS]: 'Semanas',
            [TimeRangeType.MONTHS]: 'Meses',
            [TimeRangeType.YEARS]: 'Años'
        };

        return {
            processedData: sampledData,
            stats: { min, max, avg, yDomain },
            xAxisConfig: { 
                tickFormatter, 
                interval: tickInterval,
                domain: ['dataMin', 'dataMax'] as [string, string]
            },
            rangeType: detectedRangeType,
            dataInfo: {
                original: data.length,
                displayed: sampledData.length,
                samplingRatio: Math.round(samplingRatio),
                timeSpan: timeSpanLabels[detectedRangeType]
            }
        };
    }, [data, dateRange]);

    /**
     * @memo thresholds
     * @description Obtiene los umbrales de configuración para el sensor
     */
    const thresholds = useMemo(() => {
        if (!settings || !settings.thresholds) return null;
        return (
            settings.thresholds[
                sensorType.toLowerCase() as keyof typeof settings.thresholds
            ] || null
        );
    }, [settings, sensorType]);

    /**
     * @memo chartTitle
     * @description Genera el título del gráfico basado en el contexto
     */
    const chartTitle = useMemo(() => {
        if (isLive) {
            return `Tiempo Real: ${title}`;
        }
        
        if (dateRange) {
            const startFormat = rangeType === TimeRangeType.MINUTES || rangeType === TimeRangeType.HOURS 
                ? 'd MMM, HH:mm' 
                : 'd MMM';
            const endFormat = rangeType === TimeRangeType.MINUTES || rangeType === TimeRangeType.HOURS
                ? 'd MMM, HH:mm'
                : 'd MMM';
                
            const startStr = format(dateRange.from, startFormat, { locale: es });
            const endStr = format(dateRange.to, endFormat, { locale: es });
            
            return `${title} (${startStr} - ${endStr})`;
        }
        
        return `Histórico ${title}`;
    }, [title, isLive, dateRange, rangeType]);

    // Estados de carga y vacío
    if (loading) return <LoadingState />;
    if (!data || data.length === 0) return <EmptyState title={title} />;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className='w-full'
        >
            {/* Encabezado del gráfico */}
            <div className='mb-6'>
                <div className='flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center'>
                    <div className='flex items-center gap-4'>
                        <div
                            className='flex h-12 w-12 items-center justify-center rounded-lg'
                            style={{ backgroundColor: `${theme.color}20` }}
                        >
                            <IconComponent
                                className='h-6 w-6'
                                style={{ color: theme.color }}
                            />
                        </div>
                        <div>
                            <h3 className='text-xl font-bold text-gray-900 dark:text-white'>
                                {chartTitle}
                            </h3>
                            <p className='text-sm text-gray-500 dark:text-gray-400'>
                                Mostrando {dataInfo.displayed} de {dataInfo.original} puntos 
                                ({dataInfo.samplingRatio}% - Rango: {dataInfo.timeSpan})
                            </p>
                        </div>
                    </div>
                    <div className='flex items-center gap-4'>
                        {isLive && (
                            <div className='flex items-center gap-2 text-xs font-semibold uppercase text-green-600 dark:text-green-400'>
                                <span className='relative flex h-3 w-3'>
                                    <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75'></span>
                                    <span className='relative inline-flex h-3 w-3 rounded-full bg-green-500'></span>
                                </span>
                                En Vivo
                            </div>
                        )}
                        <TrendIndicator data={processedData} />
                    </div>
                </div>
            </div>

            {/* Gráfico principal */}
            <div className='h-80 w-full'>
                <ResponsiveContainer>
                    <AreaChart
                        data={processedData}
                        margin={{ top: 5, right: 30, left: -10, bottom: 20 }}
                    >
                        <defs>
                            <linearGradient id={theme.gradientId} x1='0' y1='0' x2='0' y2='1'>
                                <stop offset='0%' stopColor={theme.color} stopOpacity={0.4} />
                                <stop offset='75%' stopColor={theme.color} stopOpacity={0.05} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid
                            strokeDasharray='3 3'
                            className='stroke-gray-200/50 dark:stroke-gray-700/50'
                        />
                        <XAxis
                            dataKey='time'
                            tickFormatter={xAxisConfig.tickFormatter}
                            className='text-xs text-gray-600 dark:text-gray-400'
                            dy={10}
                            interval={xAxisConfig.interval}
                            domain={xAxisConfig.domain}
                            type='category'
                            angle={rangeType === TimeRangeType.MINUTES ? -45 : 0}
                            textAnchor={rangeType === TimeRangeType.MINUTES ? 'end' : 'middle'}
                            height={rangeType === TimeRangeType.MINUTES ? 60 : 40}
                        />
                        <YAxis
                            type='number'
                            className='text-xs text-gray-600 dark:text-gray-400'
                            domain={stats.yDomain as [string, string]}
                            label={{
                                value: yAxisLabel,
                                angle: -90,
                                position: 'insideLeft',
                                style: { fill: 'currentColor', fontSize: '14px' },
                                className: 'fill-gray-600 dark:fill-gray-400 font-medium',
                            }}
                            allowDataOverflow={true}
                        />
                        <Tooltip
                            content={<CustomTooltip themeColor={theme.color} rangeType={rangeType} />}
                            cursor={{
                                stroke: theme.color,
                                strokeWidth: 1,
                                strokeDasharray: '4 4',
                            }}
                        />
                        {/* Líneas de referencia de umbrales */}
                        {thresholds && (
                            <>
                                <ReferenceLine
                                    y={thresholds.max}
                                    label={{
                                        value: 'Alto',
                                        position: 'right',
                                        className: 'fill-red-500 text-xs font-semibold',
                                    }}
                                    stroke='#ef4444'
                                    strokeWidth={1.5}
                                    strokeDasharray='4 4'
                                    ifOverflow='extendDomain'
                                />
                                <ReferenceLine
                                    y={thresholds.min}
                                    label={{
                                        value: 'Bajo',
                                        position: 'right',
                                        className: 'fill-blue-500 text-xs font-semibold',
                                    }}
                                    stroke='#3b82f6'
                                    strokeWidth={1.5}
                                    strokeDasharray='4 4'
                                    ifOverflow='extendDomain'
                                />
                            </>
                        )}
                        {/* Área de fondo */}
                        <Area
                            type='monotone'
                            dataKey='value'
                            stroke='transparent'
                            fill={`url(#${theme.gradientId})`}
                            name={title}
                        />
                        {/* Línea principal */}
                        <Line
                            type='monotone'
                            dataKey='value'
                            name={title}
                            stroke={theme.color}
                            strokeWidth={2.5}
                            dot={processedData.length <= 20} // Mostrar puntos solo si hay pocos datos
                            activeDot={{
                                r: 6,
                                fill: theme.color,
                                stroke: 'var(--card-background)',
                                strokeWidth: 2,
                            }}
                            connectNulls
                            animationDuration={1000}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Sección de estadísticas */}
            <div className='mt-8 grid grid-cols-1 divide-y divide-gray-200 rounded-xl border border-gray-200 bg-white dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-800/50 sm:grid-cols-3 sm:divide-x sm:divide-y-0'>
                <div className='flex flex-col gap-y-2 p-6 text-center'>
                    <p className='text-sm font-medium text-gray-500 dark:text-gray-400'>
                        Mínimo
                    </p>
                    <p
                        className='text-3xl font-bold tracking-tight'
                        style={{ color: theme.color }}
                    >
                        {stats.min.toFixed(2)}
                    </p>
                </div>
                <div className='flex flex-col gap-y-2 p-6 text-center'>
                    <p className='text-sm font-medium text-gray-500 dark:text-gray-400'>
                        Promedio
                    </p>
                    <p
                        className='text-3xl font-bold tracking-tight'
                        style={{ color: theme.color }}
                    >
                        {stats.avg.toFixed(2)}
                    </p>
                </div>
                <div className='flex flex-col gap-y-2 p-6 text-center'>
                    <p className='text-sm font-medium text-gray-500 dark:text-gray-400'>
                        Máximo
                    </p>
                    <p
                        className='text-3xl font-bold tracking-tight'
                        style={{ color: theme.color }}
                    >
                        {stats.max.toFixed(2)}
                    </p>
                </div>
            </div>
        </motion.div>
    );
};