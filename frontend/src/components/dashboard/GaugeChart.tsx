/**
 * @file GaugeChart.tsx
 * @description Componente de gauge chart para mostrar datos en tiempo real.
 * @author Kevin Mariano
 * @version 1.0.0
 * @since 1.0.0
 */
'use client';

import React from 'react';
import { Thermometer, Droplets, Wind, BarChart3, Gauge } from 'lucide-react';
import { SensorType } from '@/types';

interface GaugeData {
  sensorId: string;
  sensorName: string;
  tankName: string;
  value: number;
  timestamp: string;
  hardwareId: string;
}

interface GaugeChartProps {
  data: { [key in SensorType]?: GaugeData[] };
  loading: boolean;
}

const getSensorConfig = (type: SensorType) => {
  const configs = {
    TEMPERATURE: {
      icon: Thermometer,
      color: 'text-red-500',
      bgColor: 'bg-red-100 dark:bg-red-900/50',
      unit: '°C',
      min: 0,
      max: 40,
      optimal: { min: 22, max: 28 }
    },
    PH: {
      icon: Droplets,
      color: 'text-blue-500',
      bgColor: 'bg-blue-100 dark:bg-blue-900/50',
      unit: 'pH',
      min: 0,
      max: 14,
      optimal: { min: 6.8, max: 7.6 }
    },
    OXYGEN: {
      icon: Wind,
      color: 'text-green-500',
      bgColor: 'bg-green-100 dark:bg-green-900/50',
      unit: 'mg/L',
      min: 0,
      max: 15,
      optimal: { min: 6, max: 10 }
    },
    LEVEL: {
      icon: BarChart3,
      color: 'text-purple-500',
      bgColor: 'bg-purple-100 dark:bg-purple-900/50',
      unit: '%',
      min: 0,
      max: 100,
      optimal: { min: 50, max: 95 }
    },
    FLOW: {
      icon: Gauge,
      color: 'text-orange-500',
      bgColor: 'bg-orange-100 dark:bg-orange-900/50',
      unit: 'L/min',
      min: 0,
      max: 20,
      optimal: { min: 5, max: 15 }
    }
  };
  return configs[type];
};

const getStatusColor = (value: number, config: any) => {
  if (value >= config.optimal.min && value <= config.optimal.max) {
    return 'text-green-500';
  } else if (value < config.optimal.min * 0.8 || value > config.optimal.max * 1.2) {
    return 'text-red-500';
  }
  return 'text-yellow-500';
};

const GaugeItem: React.FC<{ data: GaugeData; type: SensorType }> = ({ data, type }) => {
  const config = getSensorConfig(type);
  const Icon = config.icon;
  const percentage = Math.min(Math.max((data.value / config.max) * 100, 0), 100);
  const statusColor = getStatusColor(data.value, config);
  const timeSinceUpdate = Math.floor((Date.now() - new Date(data.timestamp).getTime()) / 1000);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <div className={`h-8 w-8 rounded-lg ${config.bgColor} flex items-center justify-center`}>
            <Icon className={`h-5 w-5 ${config.color}`} />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{data.sensorName}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">{data.tankName}</p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-lg font-bold ${statusColor}`}>
            {data.value.toFixed(1)} {config.unit}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {timeSinceUpdate < 60 ? `${timeSinceUpdate}s` : `${Math.floor(timeSinceUpdate / 60)}m`}
          </p>
        </div>
      </div>
      
      {/* Gauge visual */}
      <div className="relative">
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-500 ${
              statusColor.includes('green') ? 'bg-green-500' :
              statusColor.includes('yellow') ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
          <span>{config.min}</span>
          <span className="text-green-600 dark:text-green-400">
            {config.optimal.min}-{config.optimal.max}
          </span>
          <span>{config.max}</span>
        </div>
      </div>
    </div>
  );
};

export const GaugeChart: React.FC<GaugeChartProps> = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 animate-pulse">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-gray-300 rounded-lg"></div>
                <div className="ml-3">
                  <div className="h-4 bg-gray-300 rounded w-24 mb-1"></div>
                  <div className="h-3 bg-gray-300 rounded w-16"></div>
                </div>
              </div>
              <div className="h-6 bg-gray-300 rounded w-16"></div>
            </div>
            <div className="h-2 bg-gray-300 rounded w-full"></div>
          </div>
        ))}
      </div>
    );
  }

  const allSensors = Object.entries(data).flatMap(([type, sensors]) => 
    sensors.map(sensor => ({ ...sensor, type: type as SensorType }))
  );

  if (allSensors.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center mb-6">
        <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No hay datos en tiempo real</h3>
        <p className="text-gray-500 dark:text-gray-400">No se encontraron sensores con datos recientes.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      {allSensors.map(sensor => (
        <GaugeItem key={sensor.sensorId} data={sensor} type={sensor.type} />
      ))}
    </div>
  );
};