/**
 * @file SummaryCards.tsx
 * @description Componente de tarjetas de resumen. Ahora es más robusto y maneja datos faltantes.
 * @author Kevin Mariano
 * @version 3.0.0
 */
'use client';
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/common/Card';
import { SensorData, SensorType } from '@/types';
import { Thermometer, Droplet, Wind } from 'lucide-react';

interface SummaryCardsProps {
  latestData: SensorData[]; // Recibe la lista completa de las últimas lecturas
}

const cardConfig = {
  [SensorType.TEMPERATURE]: { title: 'Temperatura', icon: <Thermometer className="h-6 w-6 text-red-500" />, unit: '°C' },
  [SensorType.PH]: { title: 'pH', icon: <Droplet className="h-6 w-6 text-blue-500" />, unit: '' },
  [SensorType.OXYGEN]: { title: 'Oxígeno', icon: <Wind className="h-6 w-6 text-sky-500" />, unit: 'mg/L' },
};

export const SummaryCards: React.FC<SummaryCardsProps> = ({ latestData }) => {
  const renderCard = (sensorType: SensorType) => {
    const config = cardConfig[sensorType];
    // Busca la lectura correspondiente en los datos recibidos
    const data = Array.isArray(latestData) ? latestData.find(d => d.sensor.type === sensorType) : null;

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{config.title}</CardTitle>
          {config.icon}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {/* Muestra el valor si existe, si no, muestra 'N/A' */}
            {data && typeof data.value === 'number' ? `${data.value.toFixed(2)} ${config.unit}` : 'N/A'}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
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
      {renderCard(SensorType.OXYGEN)}
    </div>
  );
};