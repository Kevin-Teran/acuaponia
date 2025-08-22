'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/common/Card';
import { Skeleton } from '@/components/common/Skeleton';
import { SensorData, SensorType } from '@/types';
import { getLatestData } from '@/services/dataService';
import { Thermometer, Droplet, Zap } from 'lucide-react';

interface SummaryCardsProps {
  selectedTankId: string;
}

const cardConfig = {
  [SensorType.TEMPERATURE]: {
    title: 'Temperatura',
    icon: <Thermometer className="h-6 w-6 text-red-500" />,
    unit: '°C',
  },
  [SensorType.PH]: {
    title: 'pH',
    icon: <Droplet className="h-6 w-6 text-blue-500" />,
    unit: '',
  },
  [SensorType.TDS]: {
    title: 'TDS',
    icon: <Zap className="h-6 w-6 text-yellow-500" />,
    unit: 'ppm',
  },
};

export const SummaryCards: React.FC<SummaryCardsProps> = ({ selectedTankId }) => {
  const [latestData, setLatestData] = useState<SensorData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!selectedTankId) {
        setLatestData([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const data = await getLatestData(selectedTankId);
        setLatestData(data);
      } catch (error) {
        console.error('Error fetching latest data for summary cards:', error);
        setLatestData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedTankId]);

  const renderCard = (sensorType: SensorType) => {
    const config = cardConfig[sensorType];
    const data = latestData.find(d => d.sensor.type === sensorType);

    if (loading) {
      return (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{config.title}</CardTitle>
            {config.icon}
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-24" />
          </CardContent>
        </Card>
      );
    }
    
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{config.title}</CardTitle>
          {config.icon}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {data ? `${data.value.toFixed(2)} ${config.unit}` : 'N/A'}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {data ? new Date(data.timestamp).toLocaleString() : 'No hay datos recientes'}
          </p>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {renderCard(SensorType.TEMPERATURE)}
      {renderCard(SensorType.PH)}
      {renderCard(SensorType.TDS)}
    </div>
  );
};