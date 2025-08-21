'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/common/Card';
import { Skeleton } from '@/components/common/Skeleton';
import { SensorType } from '@/types';
import { getLatestData } from '@/services/dataService';
import { Thermometer, Droplet, Zap } from 'lucide-react';

interface GaugeChartProps {
  sensorType: SensorType;
  tankId: string;
}

const gaugeConfig = {
  [SensorType.TEMPERATURE]: {
    title: 'Temperatura Actual',
    icon: <Thermometer className="h-5 w-5 text-gray-500" />,
    unit: '°C',
    min: 0,
    max: 40,
    color: 'from-red-400 to-red-600',
  },
  [SensorType.PH]: {
    title: 'Nivel de pH Actual',
    icon: <Droplet className="h-5 w-5 text-gray-500" />,
    unit: '',
    min: 0,
    max: 14,
    color: 'from-blue-400 to-blue-600',
  },
  [SensorType.TDS]: {
    title: 'TDS Actual',
    icon: <Zap className="h-5 w-5 text-gray-500" />,
    unit: 'ppm',
    min: 0,
    max: 1000,
    color: 'from-yellow-400 to-yellow-600',
  },
};

const GaugeChart: React.FC<GaugeChartProps> = ({ sensorType, tankId }) => {
  const [value, setValue] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const config = gaugeConfig[sensorType];

  useEffect(() => {
    const fetchData = async () => {
      if (!tankId) {
        setValue(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const data = await getLatestData(tankId, sensorType);
        if (data && data.length > 0) {
          setValue(data[0].value);
        } else {
          setValue(null);
        }
      } catch (err) {
        console.error(`Error al cargar datos para ${sensorType}:`, err);
        setValue(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [tankId, sensorType]);

  const percentage = value !== null ? ((value - config.min) / (config.max - config.min)) * 100 : 0;
  const rotation = value !== null ? Math.min(180, Math.max(0, (percentage / 100) * 180)) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-md font-medium text-gray-700">
          {config.icon}
          {config.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <div className="flex flex-col items-center justify-center">
            <div className="w-48 h-24 overflow-hidden relative">
              <div className="w-full h-full rounded-t-full border-t-8 border-l-8 border-r-8 border-gray-200"></div>
              <div
                className="absolute top-0 left-0 w-full h-full rounded-t-full"
                style={{ transform: `rotate(${rotation}deg)`, transformOrigin: 'bottom center', transition: 'transform 0.5s ease-in-out' }}
              >
                <div className={`w-2 h-24 bg-gradient-to-b ${config.color} rounded-full absolute bottom-0 left-1/2 -ml-1`}></div>
              </div>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-2 border-gray-300 rounded-full"></div>
            </div>
            <div className="text-center -mt-4">
              <p className="text-3xl font-bold text-gray-800">
                {value !== null ? value.toFixed(2) : 'N/A'}
              </p>
              <p className="text-sm text-gray-500">{config.unit || 'unidades'}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GaugeChart;
