/**
 * @file useSensorData.ts
 * @description Hook personalizado y funciones de utilidad para obtener, procesar y actualizar
 * datos de sensores en tiempo real y de forma histórica.
 */
 import { SensorData, ProcessedDataPoint } from '@/types';

 /**
  * @utility
  * @function processRawData
  * @description Transforma un array de lecturas individuales en un array de puntos de datos consolidados por marca de tiempo.
  * Esto es crucial para que los gráficos puedan mostrar múltiples líneas (temp, pH, O2) en el mismo eje de tiempo.
  * @param {SensorData[]} rawData - Array de lecturas de sensor sin procesar.
  * @returns {ProcessedDataPoint[]} Array de puntos de datos procesados y listos para graficar.
  */
 export const processRawData = (rawData: SensorData[]): ProcessedDataPoint[] => {
   const dataMap = new Map<string, ProcessedDataPoint>();
   
   const sortedData = [...rawData].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
 
   sortedData.forEach(item => {
     const groupTimestamp = new Date(Math.floor(new Date(item.timestamp).getTime() / 10000) * 10000).toISOString();
     
     if (!dataMap.has(groupTimestamp)) {
       dataMap.set(groupTimestamp, { timestamp: groupTimestamp, temperature: null, ph: null, oxygen: null });
     }
     
     const point = dataMap.get(groupTimestamp)!;
     const key = item.type.toLowerCase() as keyof Omit<ProcessedDataPoint, 'timestamp'>;
 
     if (key in point) {
       (point as any)[key] = item.value;
     }
   });
 
   return Array.from(dataMap.values());
 };
 