/**
 * @page DashboardPage
 * @route /dashboard
 * @description Página principal de monitoreo que muestra datos de sensores en tiempo real,
 * históricos y estadísticas. Es el centro de control de la aplicación.
 */
 'use client';

 import React, { useState, useEffect, useMemo, useCallback } from 'react';
 import { useAuth } from "@/context/AuthContext";
 import { LoadingSpinner } from '@/components/common/LoadingSpinner';
 import { Card } from '@/components/common/Card';
 import { DashboardFilters } from '@/components/dashboard/DashboardFilters';
 import { SummaryCards } from '@/components/dashboard/SummaryCards';
 import { AdminStatCards } from '@/components/dashboard/AdminStatCards';
 import { GaugeChart } from '@/components/dashboard/GaugeChart';
 import { LineChart } from '@/components/dashboard/LineChart';
 import * as userService from '@/services/userService';
 import * as tankService from '@/services/tankService';
 import * as sensorService from '@/services/sensorService';
 import * as settingsService from '@/services/settingsService';
 import { User, Tank, Sensor, SensorData, ProcessedDataPoint } from '@/types';
 import { MapPin, Cpu, BarChart3, AlertTriangle } from 'lucide-react';
 import { format, subDays } from 'date-fns';
 import { socketService } from '@/services/socketService';
 import api from '@/config/api';
 import { processRawData } from '@/hooks/useSensorData';
 
 /**
  * @constant DEFAULT_THRESHOLDS
  * @description Umbrales por defecto para los sensores. Se utilizan como fallback
  * si el usuario no ha configurado los suyos.
  */
 const DEFAULT_THRESHOLDS = {
     temperature: { min: 22, max: 28 },
     ph: { min: 6.8, max: 7.6 },
     oxygen: { min: 6, max: 10 },
 };
 
 /**
  * @function getDynamicGaugeScale
  * @description Calcula los límites mínimo y máximo para los medidores (gauges) de forma dinámica,
  * basándose en los umbrales para dar un rango visual más amplio y contextual.
  * @param thresholds - Los umbrales de mínimo y máximo para un tipo de sensor.
  * @returns Un objeto con los valores `min` y `max` para la escala del medidor.
  */
 const getDynamicGaugeScale = (thresholds?: { min: number; max: number }) => {
   if (!thresholds || typeof thresholds.min !== 'number' || typeof thresholds.max !== 'number') {
     return { min: 0, max: 100 }; // Fallback genérico
   }
   const range = thresholds.max - thresholds.min;
   const padding = range * 1.5; // Amplía el rango visual para que los valores no queden en los bordes
   return {
     min: Math.max(0, Math.floor(thresholds.min - padding)),
     max: Math.ceil(thresholds.max + padding),
   };
 };
 
 /**
  * @component DashboardContent
  * @description Componente interno que renderiza el contenido principal del dashboard una vez que los datos iniciales han sido cargados.
  * Esto ayuda a separar la lógica de carga principal de la lógica de renderizado.
  */
 const DashboardContent: React.FC = () => {
   const { user } = useAuth();
   const isAdmin = user?.role === 'ADMIN';
 
   // --- Estados de Filtros y Datos ---
   const [filters, setFilters] = useState({
     startDate: format(subDays(new Date(), 1), 'yyyy-MM-dd'),
     endDate: format(new Date(), 'yyyy-MM-dd'),
     selectedTankId: null as string | null,
     selectedUserId: user?.id ?? null,
   });
 
   const [initialData, setInitialData] = useState<{ users: User[]; tanks: Tank[]; sensors: Sensor[] }>({ users: [], tanks: [], sensors: [] });
   const [historicalData, setHistoricalData] = useState<ProcessedDataPoint[]>([]);
   const [thresholds, setThresholds] = useState(DEFAULT_THRESHOLDS);
 
   // --- Estados de Carga y Errores ---
   const [loading, setLoading] = useState({ initial: true, historical: false });
   const [error, setError] = useState<string | null>(null);
 
   /**
    * @effect fetchInitialData
    * @description Efecto para cargar los datos iniciales (usuarios, tanques, sensores) una sola vez.
    * Selecciona el primer tanque del usuario actual por defecto.
    */
   useEffect(() => {
     if (!user) return;
     const fetchInitialData = async () => {
       setLoading(prev => ({ ...prev, initial: true }));
       setError(null);
       try {
         const [tanksData, usersData, sensorsData] = await Promise.all([
           tankService.getTanks(),
           isAdmin ? userService.getAllUsers() : Promise.resolve([user]),
           sensorService.getSensors(),
         ]);
         
         const userTanks = tanksData.filter(t => t.userId === user.id);
         const initialTankId = userTanks.length > 0 ? userTanks[0].id : null;
 
         setInitialData({ tanks: tanksData, users: usersData, sensors: sensorsData });
         setFilters(prev => ({ ...prev, selectedTankId: initialTankId, selectedUserId: user.id }));
       } catch (err) {
         console.error("Error al cargar datos iniciales:", err);
         setError("No se pudieron cargar los datos iniciales. Por favor, recarga la página.");
       } finally {
         setLoading(prev => ({ ...prev, initial: false }));
       }
     };
     fetchInitialData();
   }, [user, isAdmin]);
 
   /**
    * @effect fetchHistoricalData
    * @description Efecto para cargar los datos históricos cada vez que los filtros (tanque, fechas) cambian.
    */
   useEffect(() => {
     if (!filters.selectedTankId || !filters.startDate || !filters.endDate) {
       setHistoricalData([]);
       return;
     }
     const fetchChartData = async () => {
       setLoading(prev => ({ ...prev, historical: true }));
       try {
         const params = new URLSearchParams({ tankId: filters.selectedTankId, startDate: filters.startDate, endDate: filters.endDate });
         const response = await api.get<{ data: SensorData[] }>(`/data/historical?${params.toString()}`);
         const processed = processRawData(response.data.data);
         setHistoricalData(processed);
       } catch (err) {
         console.error("Error al cargar datos históricos:", err);
         setHistoricalData([]); // Limpia datos en caso de error
       } finally {
         setLoading(prev => ({ ...prev, historical: false }));
       }
     };
     fetchChartData();
   }, [filters.selectedTankId, filters.startDate, filters.endDate]);
 
   /**
    * @effect fetchUserSettings
    * @description Carga las configuraciones (umbrales) del usuario seleccionado.
    */
   useEffect(() => {
     if (!filters.selectedUserId) return;
     const fetchUserSettings = async () => {
       try {
         const settingsData = await settingsService.getSettings(filters.selectedUserId);
         setThresholds({
             temperature: { ...DEFAULT_THRESHOLDS.temperature, ...settingsData?.thresholds?.temperature },
             ph: { ...DEFAULT_THRESHOLDS.ph, ...settingsData?.thresholds?.ph },
             oxygen: { ...DEFAULT_THRESHOLDS.oxygen, ...settingsData?.thresholds?.oxygen },
         });
       } catch (error) {
         console.error("Error al cargar configuraciones:", error);
         setThresholds(DEFAULT_THRESHOLDS); // Resetea a los valores por defecto si falla
       }
     };
     fetchUserSettings();
   }, [filters.selectedUserId]);
 
   /**
    * @callback handleNewData
    * @description Callback para manejar los datos en tiempo real que llegan vía WebSocket.
    * Actualiza el estado del sensor correspondiente de forma eficiente.
    */
   const handleNewData = useCallback((data: SensorData) => {
       setInitialData(prev => ({
         ...prev,
         sensors: prev.sensors.map(sensor => 
           sensor.hardwareId === data.hardwareId
             ? { ...sensor, previousReading: sensor.lastReading, lastReading: data.value, lastUpdate: new Date().toISOString() }
             : sensor
         )
       }));
   }, []);
 
   /**
    * @effect setupSocketConnection
    * @description Establece y limpia la conexión con el WebSocket para recibir datos en tiempo real.
    */
   useEffect(() => {
     socketService.connect();
     socketService.onSensorData(handleNewData);
     return () => {
       socketService.offSensorData(handleNewData);
       socketService.disconnect();
     };
   }, [handleNewData]);
 
   /**
    * @callback handleUserChange
    * @description Maneja el cambio de usuario en el filtro (solo para Admins).
    * Actualiza el usuario seleccionado y resetea el tanque al primero de la lista del nuevo usuario.
    */
   const handleUserChange = (userId: string) => {
     const userTanks = initialData.tanks.filter(tank => tank.userId === userId);
     setFilters(prev => ({
       ...prev,
       selectedUserId: userId,
       selectedTankId: userTanks.length > 0 ? userTanks[0].id : null,
     }));
   };
 
   // --- Memos para optimizar cálculos ---
   const filteredTanksForSelectedUser = useMemo(() => {
     if (!filters.selectedUserId) return [];
     return initialData.tanks.filter(tank => tank.userId === filters.selectedUserId);
   }, [initialData.tanks, filters.selectedUserId]);
 
   const sensorsForSelectedTank = useMemo(() => {
     if (!filters.selectedTankId) return [];
     return initialData.sensors.filter(sensor => sensor.tankId === filters.selectedTankId);
   }, [initialData.sensors, filters.selectedTankId]);
 
   // --- Renderizado Condicional ---
   if (loading.initial) {
     return <LoadingSpinner fullScreen message="Cargando configuración del dashboard..." />;
   }
 
   if (error) {
     return <Card><div className="text-center py-16 text-red-600 dark:text-red-400"><AlertTriangle className="w-12 h-12 mx-auto mb-4" /><h3 className="text-lg font-semibold">Ocurrió un Error</h3><p className="mt-1 text-sm">{error}</p></div></Card>;
   }
 
   const renderDashboardContent = () => {
     if (!filters.selectedTankId) {
       return <Card><div className="text-center py-16 text-gray-500 dark:text-gray-400"><MapPin className="w-12 h-12 mx-auto mb-4" /><h3 className="text-lg font-semibold">No hay tanques para mostrar</h3><p className="mt-1 text-sm">{isAdmin ? "El usuario seleccionado no tiene tanques asignados." : "Aún no tienes tanques asignados."}</p></div></Card>;
     }
     if (sensorsForSelectedTank.length === 0) {
       return <Card><div className="text-center py-16 text-gray-500 dark:text-gray-400"><Cpu className="w-12 h-12 mx-auto mb-4" /><h3 className="text-lg font-semibold">No hay sensores disponibles</h3><p className="mt-1 text-sm">Este estanque no tiene ningún sensor registrado.</p></div></Card>;
     }
     
     const temperatureSensor = sensorsForSelectedTank.find(s => s.type === 'TEMPERATURE');
     const oxygenSensor = sensorsForSelectedTank.find(s => s.type === 'OXYGEN');
     const phSensor = sensorsForSelectedTank.find(s => s.type === 'PH');
 
     const tempScale = getDynamicGaugeScale(thresholds.temperature);
     const oxygenScale = getDynamicGaugeScale(thresholds.oxygen);
     const phScale = getDynamicGaugeScale(thresholds.ph);
     
     return (
       <div className="space-y-6">
         <SummaryCards sensors={sensorsForSelectedTank} thresholds={thresholds} />
 
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {temperatureSensor && ( <GaugeChart label="Temperatura" value={temperatureSensor.lastReading ?? tempScale.min} previousValue={temperatureSensor.previousReading} min={tempScale.min} max={tempScale.max} unit="°C" thresholds={thresholds?.temperature} /> )}
           {oxygenSensor && ( <GaugeChart label="Oxígeno Disuelto" value={oxygenSensor.lastReading ?? oxygenScale.min} previousValue={oxygenSensor.previousReading} min={oxygenScale.min} max={oxygenScale.max} unit="mg/L" thresholds={thresholds?.oxygen} /> )}
           {phSensor && ( <GaugeChart label="Nivel de pH" value={phSensor.lastReading ?? phScale.min} previousValue={phSensor.previousReading} min={phScale.min} max={phScale.max} unit="" thresholds={thresholds?.ph} /> )}
         </div>
         
         {loading.historical ? (
           <Card><div className="h-96 flex items-center justify-center"><LoadingSpinner message="Cargando gráficos históricos..." /></div></Card>
         ) : historicalData.length > 0 ? (
           <LineChart data={historicalData} thresholds={thresholds} startDate={filters.startDate} endDate={filters.endDate} />
         ) : (
           <Card>
             <div className="text-center py-16 text-gray-500 dark:text-gray-400">
               <BarChart3 className="w-12 h-12 mx-auto mb-4" />
               <h3 className="text-lg font-semibold">No hay datos históricos</h3>
               <p className="mt-1 text-sm">No se encontraron datos para el rango de fechas seleccionado.</p>
             </div>
           </Card>
         )}
       </div>
     );
   };
 
   return (
     <div className="space-y-6 animate-in fade-in duration-500">
       <div>
         <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard de Monitoreo</h1>
         <p className="text-gray-600 dark:text-gray-400 mt-1">Estado en tiempo real de los sensores por estanque.</p>
       </div>
       
       <DashboardFilters
         startDate={filters.startDate} endDate={filters.endDate} selectedTankId={filters.selectedTankId} selectedUserId={filters.selectedUserId}
         onStartDateChange={(d) => setFilters(f => ({...f, startDate: d}))}
         onEndDateChange={(d) => setFilters(f => ({...f, endDate: d}))}
         onTankChange={(id) => setFilters(f => ({...f, selectedTankId: id}))}
         onUserChange={handleUserChange}
         tanks={filteredTanksForSelectedUser} users={initialData.users} isAdmin={isAdmin}
       />
 
       {isAdmin && <AdminStatCards sensors={sensorsForSelectedTank} />}
       
       {renderDashboardContent()}
     </div>
   );
 };
 
 
 /**
  * @page Dashboard
  * @description Componente principal que envuelve el DashboardContent.
  * Muestra un spinner de carga global mientras se verifica la sesión del usuario.
  */
 export default function Dashboard() {
   const { loading: authLoading } = useAuth();
 
   if (authLoading) {
     return <LoadingSpinner fullScreen message="Verificando sesión..." />;
   }
 
   return <DashboardContent />;
 }