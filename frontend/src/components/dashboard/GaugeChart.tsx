/**
 * @file GaugeChart.tsx
 * @description Componente visual de velocímetro. Recibe valor, min y max como props.
 * @author Kevin Mariano
 * @version 3.1.0
 */
'use client';
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/common/Card';
import { SensorType } from '@/types';
import { Thermometer, Droplet, Wind, HelpCircle } from 'lucide-react';

interface GaugeChartProps {
  sensorType: SensorType;
  value: number | null | undefined;
  min?: number;
  max?: number;
}

const gaugeConfig = {
  [SensorType.TEMPERATURE]: { title: 'Temperatura', icon: <Thermometer className="h-5 w-5 text-gray-500" />, unit: '°C', defaultMin: 0, defaultMax: 40, color: 'from-red-400 to-red-600' },
  [SensorType.PH]: { title: 'Nivel de pH', icon: <Droplet className="h-5 w-5 text-gray-500" />, unit: '', defaultMin: 0, defaultMax: 14, color: 'from-blue-400 to-blue-600' },
  [SensorType.OXYGEN]: { title: 'Oxígeno Disuelto', icon: <Wind className="h-5 w-5 text-gray-500" />, unit: 'mg/L', defaultMin: 0, defaultMax: 15, color: 'from-sky-400 to-sky-600' },
};

export const GaugeChart: React.FC<GaugeChartProps> = ({ sensorType, value, min, max }) => {
  const config = gaugeConfig[sensorType as keyof typeof gaugeConfig];
  if (!config) return null;

  const gaugeMin = typeof min === 'number' ? min : config.defaultMin;
  const gaugeMax = typeof max === 'number' ? max : config.defaultMax;

  const hasValue = typeof value === 'number' && !isNaN(value);
  const percentage = hasValue ? ((value - gaugeMin) / (gaugeMax - gaugeMin)) * 100 : 0;
  const rotation = hasValue ? Math.min(180, Math.max(0, (percentage / 100) * 180)) : 0;

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2 text-md font-medium text-gray-700 dark:text-gray-200">{config.icon} {config.title}</CardTitle></CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center">
          <div className="w-48 h-24 overflow-hidden relative">
            <div className="w-full h-full rounded-t-full border-t-8 border-l-8 border-r-8 border-gray-200 dark:border-gray-700"></div>
            {hasValue && (
              <div
                  className="absolute top-0 left-0 w-full h-full rounded-t-full"
                  style={{ transform: `rotate(${rotation}deg)`, transformOrigin: 'bottom center', transition: 'transform 0.5s ease-in-out' }}
              ><div className={`w-2 h-24 bg-gradient-to-b ${config.color} rounded-full absolute bottom-0 left-1/2 -ml-1`}></div></div>
            )}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-full"></div>
            {!hasValue && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full"><HelpCircle className="h-8 w-8 text-gray-400" /></div>}
          </div>
          <div className="text-center -mt-4">
            <p className="text-3xl font-bold text-gray-800 dark:text-white">{hasValue ? value.toFixed(2) : 'Sin datos'}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{config.unit || 'unidades'}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};