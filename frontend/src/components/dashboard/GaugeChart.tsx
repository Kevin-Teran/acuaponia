/**
 * @file GaugeChart.tsx
 * @description Componente de gráfico de tipo medidor (gauge) para visualizar una métrica clave.
 * @author Kevin Mariano
 * @version 2.0.0
 */
 'use client';

 import React, { useState, useEffect, useMemo } from 'react';
 import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/common/Card';
 import { Skeleton } from '@/components/common/Skeleton';
 import { useSpring, animated } from '@react-spring/web';
 import { Sensor, SensorType, Thresholds } from '@/types';
 import { getLatestSensorDataForType } from '@/services/dataService'; // Asumiendo este servicio
 import { getThresholds } from '@/services/settingsService';
 
 // --- Props para el componente ---
 interface GaugeChartProps {
   sensorType?: SensorType; // Permite configurar qué sensor mostrar
 }
 
 /**
  * @component GaugeChart
  * @description Visualiza el valor más reciente de un sensor específico en un gráfico de medidor.
  * El componente ahora es autocontenido, maneja su propia carga de datos y estados.
  */
 export const GaugeChart: React.FC<GaugeChartProps> = ({ 
   sensorType = SensorType.TEMPERATURE // Temperatura como valor por defecto
 }) => {
   const [sensor, setSensor] = useState<Sensor | null>(null);
   const [thresholds, setThresholds] = useState<Thresholds | null>(null);
   const [isLoading, setIsLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);
 
   /**
    * @effect
    * @description Carga los datos del sensor y los umbrales necesarios para el gráfico.
    */
   useEffect(() => {
     const fetchData = async () => {
       setIsLoading(true);
       setError(null);
       try {
         const [sensorData, thresholdData] = await Promise.all([
           getLatestSensorDataForType(sensorType),
           getThresholds(),
         ]);
         setSensor(sensorData);
         setThresholds(thresholdData);
       } catch (err) {
         console.error(`Error al cargar datos para ${sensorType}:`, err);
         setError(`No se pudo cargar el medidor de ${sensorType}.`);
       } finally {
         setIsLoading(false);
       }
     };
 
     fetchData();
   }, [sensorType]);
 
   // Extraemos los valores necesarios de forma segura, con valores por defecto.
   const { value = 0, unit = '', name = 'Cargando...' } = sensor || {};
   const { min = 0, max = 100 } = thresholds?.[sensorType.toLowerCase() as keyof Thresholds] || {};
 
   // Animación del valor numérico
   const { animatedValue } = useSpring({
     from: { animatedValue: 0 },
     to: { animatedValue: value },
     config: { duration: 750 },
   });
 
   // --- Lógica para el cálculo del medidor ---
   const percentage = useMemo(() => {
     if (max === min) return 0;
     return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
   }, [value, min, max]);
 
   const status = useMemo(() => {
     if (value < min || value > max) {
       return { label: 'Peligro', color: '#EF4444' }; // red-500
     }
     // Lógica opcional para advertencia
     return { label: 'Óptimo', color: '#22C55E' }; // green-500
   }, [value, min, max]);
 
   // --- Renderizado de Esqueleto (Estado de Carga) ---
   if (isLoading) {
     return (
       <Card>
         <CardHeader>
           <Skeleton className="h-6 w-3/4" />
           <Skeleton className="h-4 w-1/2 mt-2" />
         </CardHeader>
         <CardContent className="flex items-center justify-center">
           <Skeleton className="h-48 w-48 rounded-full" />
         </CardContent>
       </Card>
     );
   }
 
   // --- Renderizado de Error ---
   if (error || !sensor) {
     return (
       <Card>
         <CardHeader>
           <CardTitle>Error</CardTitle>
         </CardHeader>
         <CardContent>
           <p className="text-red-500">{error || 'Sensor no encontrado.'}</p>
         </CardContent>
       </Card>
     );
   }
 
   // --- Renderizado del Gráfico ---
   return (
     <Card>
       <CardHeader>
         <CardTitle>{name}</CardTitle>
         <CardDescription>Estado actual: {status.label}</CardDescription>
       </CardHeader>
       <CardContent>
         <div className="relative flex items-center justify-center h-48">
           <svg className="w-full h-full" viewBox="0 0 120 120">
             {/* Círculo de fondo */}
             <circle cx="60" cy="60" r="50" fill="none" strokeWidth="10" className="stroke-gray-200 dark:stroke-gray-700" />
             {/* Arco de progreso */}
             <circle
               cx="60"
               cy="60"
               r="50"
               fill="none"
               stroke={status.color}
               strokeWidth="10"
               strokeDasharray={2 * Math.PI * 50}
               strokeDashoffset={(100 - percentage) / 100 * (2 * Math.PI * 50)}
               transform="rotate(-90 60 60)"
               className="transition-all duration-500"
             />
           </svg>
           <div className="absolute flex flex-col items-center justify-center">
             <animated.div className="text-4xl font-bold" style={{ color: status.color }}>
               {/* Comprobación de seguridad antes de llamar a toFixed */}
               {animatedValue.to(val => val?.toFixed(1) || '0.0')}
             </animated.div>
             <span className="text-xl text-gray-500 dark:text-gray-400">{unit}</span>
           </div>
         </div>
       </CardContent>
     </Card>
   );
 };