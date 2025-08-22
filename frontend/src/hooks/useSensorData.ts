"use client";

import { useState, useEffect, useCallback } from 'react';
import { SensorData, ProcessedDataPoint } from '@/types';
import { getSensorData } from '@/services/dataService';
import { socketService } from '@/services/socketService';

/**
 * @function processRawData
 * @description Procesa los datos crudos de los sensores para adaptarlos al formato requerido por los gráficos.
 * @param rawData - Un array de datos de sensores en formato crudo.
 * @returns Un array de puntos de datos procesados para los gráficos.
 */
export const processRawData = (rawData: SensorData[]): ProcessedDataPoint[] => {
    return rawData.map(d => ({
        timestamp: new Date(d.timestamp).getTime(),
        temperature: d.type === 'TEMPERATURE' ? d.value : null,
        ph: d.type === 'PH' ? d.value : null,
        oxygen: d.type === 'OXYGEN' ? d.value : null,
    }));
};

/**
 * @hook useSensorData
 * @description Hook personalizado para obtener y gestionar los datos de los sensores de un estanque específico.
 * Combina la carga de datos históricos con actualizaciones en tiempo real a través de WebSockets.
 * @param {string | null} tankId - El ID del estanque del cual se quieren obtener los datos.
 * @returns Un objeto con los datos de los sensores, el estado de carga y posibles errores.
 */
export const useSensorData = (tankId: string | null) => {
  const [data, setData] = useState<SensorData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInitialData = useCallback(async () => {
    if (!tankId) {
        setData([]);
        setLoading(false);
        return;
    }

    setLoading(true);
    setError(null);
    try {
      const initialData = await getSensorData(tankId);
      setData(initialData);
    } catch (err) {
      console.error(`Error al cargar los datos para el estanque ${tankId}:`, err);
      setError('No se pudieron cargar los datos iniciales.');
    } finally {
      setLoading(false);
    }
  }, [tankId]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const handleNewData = useCallback((newDataPoint: SensorData) => {
    if (newDataPoint.tankId === tankId) {
      setData(currentData => {
        const updatedData = [...currentData, newDataPoint];
        return updatedData.slice(-500); 
      });
    }
  }, [tankId]);

  useEffect(() => {
    socketService.connect();
    socketService.onSensorData(handleNewData);

    return () => {
      socketService.offSensorData(handleNewData);
      socketService.disconnect();
    };
  }, [handleNewData]);

  return { data, loading, error };
};