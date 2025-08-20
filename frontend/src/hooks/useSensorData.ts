"use client";

import { useState, useEffect } from 'react';
import { SensorData, DataSummary, ProcessedDataPoint } from '@/types';
import { generarDatosSensoresSimulados, calcularResumenDatos } from '@/utils/mockData';

/**
 * @hook useSensorData
 * @description Hook personalizado que simula la obtención de datos de sensores en tiempo real.
 * Proporciona los datos brutos y un resumen calculado de los mismos.
 * @returns {{ data: SensorData[], summary: DataSummary | null }} Un objeto con los datos brutos y el resumen.
 */
export const useSensorData = () => {
  const [data, setData] = useState<SensorData[]>([]);
  const [summary, setSummary] = useState<DataSummary | null>(null);

  useEffect(() => {
    // Genera datos iniciales al montar el componente.
    const initialData = generarDatosSensoresSimulados(100);
    setData(initialData);
    setSummary(calcularResumenDatos(initialData));

    // Simula la adición de nuevos datos cada 30 segundos.
    const interval = setInterval(() => {
      setData(currentData => {
        // Genera un nuevo punto de dato simulado.
        const newDataPoint = generarDatosSensoresSimulados(1);
        const updatedData = [...currentData, ...newDataPoint].slice(-100); // Mantiene solo los últimos 100 puntos.
        setSummary(calcularResumenDatos(updatedData));
        return updatedData;
      });
    }, 30000); // 30 segundos

    // Limpia el intervalo al desmontar el componente.
    return () => clearInterval(interval);
  }, []);

  return { data, summary };
};