/**
 * @file GaugeChart.tsx
 * @description Componente para mostrar medidores semicirculares, animados y de alta calidad (AGUJA TRIANGULAR DEFINITIVA).
 * @author Kevin Mariano & Claude & Gemini
 * @version 1.3.0
 * @since 1.0.0
 */
import React, { useMemo } from 'react';
import { RealtimeData, SensorType, Settings } from '@/types';
import { Skeleton } from '@/components/common/Skeleton';
import { Thermometer, Droplets, Wind, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

// --- Interfaces y Tipos ---
interface GaugeChartProps {
  data: RealtimeData | null;
  settings: Settings | null;
  loading: boolean;
}

interface StatusInfo {
    label: 'Bajo' | 'Óptimo' | 'Alto';
    color: string;
    textColorClass: string;
}

// --- Constantes y Configuración ---
const sensorInfo: Record<string, { icon: React.ElementType, name: string }> = {
  [SensorType.TEMPERATURE]: { icon: Thermometer, name: 'Temperatura' },
  [SensorType.PH]: { icon: Droplets, name: 'pH' },
  [SensorType.OXYGEN]: { icon: Wind, name: 'Oxígeno Disuelto' },
};

const getSensorConfig = (type: SensorType, settings: Settings | null) => {
    const defaultThresholds = {
        temperature: { min: 22, max: 28 },
        ph: { min: 6.8, max: 7.6 },
        oxygen: { min: 6, max: 10 },
    };
    const currentThresholds = settings?.thresholds || defaultThresholds;
    
    let config;
    let unit = '';
    const colors = { low: '#3b82f6', optimal: '#22c55e', high: '#ef4444' };

    switch (type) {
        case SensorType.TEMPERATURE: config = currentThresholds.temperature; unit = '°C'; break;
        case SensorType.PH: config = currentThresholds.ph; unit = ''; break;
        case SensorType.OXYGEN: config = currentThresholds.oxygen; unit = 'mg/L'; break;
        default: config = { min: 30, max: 70 };
    }

    const { min, max } = config;
    const range = max - min;
    const buffer = range > 0 ? range * 0.5 : 2; 

    return {
        unit,
        min: Math.max(0, min - buffer),
        max: max + buffer,
        optimal: { min, max },
        colors,
    };
};

// --- Componente Reutilizable para el Medidor (AGUJA TRIANGULAR DEFINITIVA) ---
const SemiCircularGauge = ({ percentage, strokeColor }: { percentage: number; strokeColor: string }) => {
    const radius = 35;
    const strokeWidth = 8;
    const needleLength = radius - 5;
    const needleBaseWidth = 8; // Ancho de la base de la aguja

    // Dimensiones y centro del SVG
    const svgWidth = 100;
    const svgHeight = 60;
    const centerX = svgWidth / 2;
    const centerY = svgHeight - 10;

    // Coordenadas del arco
    const startX = centerX - radius;
    const startY = centerY;
    const endX = centerX + radius;
    const endY = centerY;
    const circumference = Math.PI * radius;
    
    // Transición de la animación
    const transition = { duration: 1.5, ease: "circOut" };
    
    // --- Lógica de la Aguja Triangular con <path> ---
    // 1. Calculamos el ángulo en radianes basado en el porcentaje
    const needleAngleRad = (percentage / 100) * Math.PI;

    // 2. Calculamos la punta de la aguja usando la misma lógica que la línea original
    const needleTipX = centerX - Math.cos(needleAngleRad) * needleLength;
    const needleTipY = centerY - Math.sin(needleAngleRad) * needleLength;

    // 3. Calculamos los dos puntos de la base del triángulo.
    // El vector perpendicular a la aguja nos da la dirección para la base.
    const baseOffsetX = (needleBaseWidth / 2) * Math.sin(needleAngleRad);
    const baseOffsetY = (needleBaseWidth / 2) * -Math.cos(needleAngleRad);
    const base1X = centerX + baseOffsetX;
    const base1Y = centerY + baseOffsetY;
    const base2X = centerX - baseOffsetX;
    const base2Y = centerY - baseOffsetY;
    
    // 4. Creamos el string 'd' para el path del SVG que dibuja el triángulo
    const needlePathD = `M ${needleTipX} ${needleTipY} L ${base1X} ${base1Y} L ${base2X} ${base2Y} Z`;

    // 5. Creamos el 'd' para la posición inicial (percentage = 0) para que la animación comience correctamente
    const initialTipX = centerX - needleLength;
    const initialTipY = centerY;
    const initialBase1X = centerX;
    const initialBase1Y = centerY - (needleBaseWidth / 2);
    const initialBase2X = centerX;
    const initialBase2Y = centerY + (needleBaseWidth / 2);
    const initialNeedlePathD = `M ${initialTipX} ${initialTipY} L ${initialBase1X} ${initialBase1Y} L ${initialBase2X} ${initialBase2Y} Z`;

    return (
        <div className="relative w-full h-auto flex justify-center items-center">
            <svg
                width="100%"
                height="100%"
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="overflow-visible"
            >
                {/* Arco de fondo (sin cambios) */}
                <path
                    d={`M ${startX} ${startY} A ${radius} ${radius} 0 0 1 ${endX} ${endY}`}
                    className="stroke-current text-gray-200 dark:text-gray-700"
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeLinecap="round"
                />
                
                {/* Arco de progreso (sin cambios) */}
                <motion.path
                    d={`M ${startX} ${startY} A ${radius} ${radius} 0 0 1 ${endX} ${endY}`}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: circumference - (circumference * percentage) / 100 }}
                    transition={transition}
                />
                
                {/* Aguja Triangular (Path animado) */}
                <motion.path
                    fill={strokeColor}
                    initial={{ d: initialNeedlePathD }}
                    animate={{ d: needlePathD }}
                    transition={transition}
                />
                
                {/* Pivote central (sin cambios) */}
                <circle 
                    cx={centerX} 
                    cy={centerY} 
                    r="4" 
                    fill={strokeColor} 
                />
                <circle 
                    cx={centerX} 
                    cy={centerY} 
                    r="2" 
                    fill="white" 
                />
            </svg>
        </div>
    );
};

// --- Componente de Item Individual (sin cambios) ---
const GaugeItem = ({ data, type, settings }: { data: any, type: SensorType, settings: Settings | null }) => {
  const config = getSensorConfig(type, settings);
  const { icon: Icon, name } = sensorInfo[type];

  const getStatus = (value: number): StatusInfo => {
    if (value < config.optimal.min) return { label: 'Bajo', color: config.colors.low, textColorClass: 'text-blue-500' };
    if (value > config.optimal.max) return { label: 'Alto', color: config.colors.high, textColorClass: 'text-red-500' };
    return { label: 'Óptimo', color: config.colors.optimal, textColorClass: 'text-green-500' };
  };

  const status = getStatus(data.value);
  const rawPercent = ((data.value - config.min) / (config.max - config.min)) * 100;
  const valuePercent = Math.max(0, Math.min(100, rawPercent));

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white dark:bg-gray-800/60 p-4 rounded-2xl shadow-lg border border-black/5 backdrop-blur-sm flex flex-col justify-between"
    >
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-opacity-10 ${status.textColorClass.replace('text-','bg-')}`}>
                    <Icon className={`w-5 h-5 ${status.textColorClass}`} />
                </div>
                <span className="font-semibold text-gray-800 dark:text-gray-100">{name}</span>
            </div>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full text-white ${status.textColorClass.replace('text-','bg-')}`}>
                {status.label}
            </span>
        </div>
      
        <div className="relative my-2">
            <SemiCircularGauge percentage={valuePercent} strokeColor={status.color} />
        </div>

        <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 -mt-4">
            <span>{config.min.toFixed(1)}</span>
            <div className="flex flex-col items-center">
                <span className={`text-3xl font-bold ${status.textColorClass}`}>
                    {data.value.toFixed(1)}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400 -mt-1">{config.unit || 'pH'}</span>
            </div>
            <span>{config.max.toFixed(1)}</span>
        </div>
    </motion.div>
  );
};

// --- Componente Principal (sin cambios) ---
export const GaugeChart = ({ data, settings, loading }: GaugeChartProps) => {
    const sensorData = useMemo(() => {
        if (!data || !settings) return [];
        const allowedTypes = [SensorType.TEMPERATURE, SensorType.PH, SensorType.OXYGEN];
        return Object.entries(data)
            .flatMap(([type, values]) => values.map(v => ({ ...v, type: type as SensorType })))
            .filter(sensor => allowedTypes.includes(sensor.type))
            .sort((a, b) => allowedTypes.indexOf(a.type) - allowedTypes.indexOf(b.type));
    }, [data, settings]);

    if (loading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-[160px] w-full rounded-2xl" />)}
            </div>
        );
    }

    if (!data || sensorData.length === 0) {
        return (
            <div className="bg-white dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl shadow-lg p-8 text-center border border-black/5">
                <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No hay datos en tiempo real</h3>
                <p className="text-gray-500 dark:text-gray-400">No se encontraron lecturas para los sensores monitoreados.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {sensorData.map((sensor) => (
                <GaugeItem key={sensor.sensorId} data={sensor} type={sensor.type} settings={settings} />
            ))}
        </div>
    );
};