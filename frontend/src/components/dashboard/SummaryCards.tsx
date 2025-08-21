/**
 * @file SummaryCards.tsx
 * @description Muestra tarjetas de resumen para cada tipo de sensor con su estado actual.
 * @author Kevin Mariano
 * @version 2.1.0
 */
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/common/Card';
import { Skeleton } from '@/components/common/Skeleton';
import { Thermometer, Droplet, Wind } from 'lucide-react';
import { Sensor, SensorType, Thresholds } from '@/types';
import { getLatestSensorData } from '@/services/dataService'; // Servicio para obtener datos
import { getThresholds } from '@/services/settingsService'; // Servicio para obtener umbrales

// --- Constantes para Iconos y Orden ---
const SENSOR_ICONS = {
  TEMPERATURE: <Thermometer className="h-6 w-6 text-gray-500 dark:text-gray-400" />,
  PH: <Droplet className="h-6 w-6 text-gray-500 dark:text-gray-400" />,
  OXYGEN: <Wind className="h-6 w-6 text-gray-500 dark:text-gray-400" />,
};

const SENSOR_ORDER: { [key in SensorType]: number } = {
  TEMPERATURE: 1,
  PH: 2,
  OXYGEN: 3,
};

/**
 * @component SummaryCards
 * @description Componente que busca y muestra los últimos datos de los sensores.
 * Ahora maneja su propio estado de carga y datos para ser más modular.
 */
export const SummaryCards: React.FC = () => {
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [thresholds, setThresholds] = useState<Thresholds | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * @effect
   * @description Carga los datos iniciales (últimos valores de sensores y umbrales)
   * desde la API cuando el componente se monta.
   */
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [sensorData, thresholdData] = await Promise.all([
          getLatestSensorData(),
          getThresholds(),
        ]);
        setSensors(sensorData);
        setThresholds(thresholdData);
      } catch (err) {
        setError('No se pudieron cargar los datos de los sensores.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  /**
   * @function getStatusColor
   * @description Determina el color del indicador de estado basado en el valor y los umbrales.
   * @param {number} value - El valor actual del sensor.
   * @param {keyof Thresholds} type - El tipo de sensor.
   * @returns {string} Una clase de color de Tailwind CSS.
   */
  const getStatusColor = (value: number, type: keyof Thresholds): string => {
    if (!thresholds) return 'bg-gray-400';

    const { min, max } = thresholds[type];
    if (value < min || value > max) {
      return 'bg-red-500'; // Peligro
    }
    // Opcional: Podrías añadir una lógica para un estado de 'advertencia'.
    return 'bg-green-500'; // Óptimo
  };
  
  // --- Renderizado del Estado de Carga (Skeletons) ---
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-6" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-4 w-full mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // --- Renderizado del Estado de Error ---
  if (error) {
    return <div className="text-red-500 text-center">{error}</div>;
  }
  
  // --- Renderizado de los Datos ---
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Verificación clave: Aseguramos que 'sensors' sea un array antes de mapearlo.
        Esto previene el error 'not iterable'.
      */}
      {Array.isArray(sensors) && [...sensors]
        .sort((a, b) => (SENSOR_ORDER[a.type] || 99) - (SENSOR_ORDER[b.type] || 99))
        .map(sensor => {
          const sensorTypeKey = sensor.type.toLowerCase() as keyof Thresholds;
          const statusColor = getStatusColor(sensor.value, sensorTypeKey);
          
          return (
            <Card key={sensor.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {sensor.name}
                </CardTitle>
                {SENSOR_ICONS[sensor.type]}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {sensor.value.toFixed(2)} {sensor.unit}
                </div>
                <div className="flex items-center text-xs text-muted-foreground mt-1">
                  <span className={`h-2 w-2 rounded-full mr-2 ${statusColor}`}></span>
                  Estado: {statusColor.includes('green') ? 'Óptimo' : 'Alerta'}
                </div>
              </CardContent>
            </Card>
          );
        })}
    </div>
  );
};