/**
 * @file useDashboard.ts
 * @route frontend/src/hooks/
 * @description Hook corregido para el dashboard con actualizaciones en tiempo real funcionando
 * @author Kevin Mariano
 * @version 1.0.0
 * @since 1.0.0
 * @copyright SENA 2025
 */

 import { useState, useCallback, useEffect } from 'react';
 import {
     getSummary,
     getRealtimeData,
     getHistoricalData,
     getUsersListForAdmin,
 } from '@/services/dashboardService';
 import { DashboardFilters, DashboardSummary, RealtimeData, HistoricalData, RealtimeSensorData } from '@/types/dashboard';
 import { UserFromApi, SensorType } from '@/types';
 import { socketManager } from '@/services/socketService';
 // Importación de useAuth
 import { useAuth } from '@/context/AuthContext';
 
 interface LoadingState {
     summary: boolean;
     realtime: boolean;
     historical: boolean;
     users: boolean;
 }
 
 // Se define la interfaz del tipo de retorno del hook
 interface UseDashboardReturn {
     summaryData: DashboardSummary | null;
     realtimeData: RealtimeData;
     historicalData: HistoricalData;
     usersList: UserFromApi[];
     loading: LoadingState;
     error: string | null;
     fetchSummary: (filters: DashboardFilters) => Promise<void>;
     fetchRealtimeData: (filters: DashboardFilters) => Promise<void>;
     fetchHistoricalData: (filters: DashboardFilters) => Promise<void>;
     fetchUsersList: () => Promise<void>;
 }
 
 const MAX_LIVE_DATA_POINTS = 100;
 
 // Se asigna explícitamente el tipo de retorno `UseDashboardReturn` al hook
 export const useDashboard = (): UseDashboardReturn => {
     const { user } = useAuth();
     const [summaryData, setSummaryData] = useState<DashboardSummary | null>(null);
     // FIX aplicado anteriormente:
     const [realtimeData, setRealtimeData] = useState<RealtimeData>({} as RealtimeData);
     // NUEVO FIX: Coerción de tipo para inicializar HistoricalData.
     const [historicalData, setHistoricalData] = useState<HistoricalData>({} as HistoricalData); 
     const [usersList, setUsersList] = useState<UserFromApi[]>([]);
     const [loading, setLoading] = useState<LoadingState>({
         summary: true,
         realtime: true,
         historical: true,
         users: false,
     });
     const [error, setError] = useState<string | null>(null);
 
     useEffect(() => {
         const token = localStorage.getItem('accessToken');
         if (socketManager && token) {
             socketManager.connect(token);
         }
 
         /**
          * @function handleNewSensorData
          * @description Maneja los nuevos datos de sensores que llegan por WebSocket
          */
         const handleNewSensorData = (newSensorData: any) => {
             console.log('⚡️ Nuevo dato de sensor recibido:', newSensorData);
 
             if (!newSensorData || !newSensorData.sensor) {
                 console.warn('Datos de sensor inválidos recibidos:', newSensorData);
                 return;
             }
 
             const sensorType = newSensorData.sensor.type as SensorType;
             const sensorId = newSensorData.sensor.id;
 
             setRealtimeData(prev => {
                 const currentTypeData = prev[sensorType] || [];
 
                 const existingSensorIndex = currentTypeData.findIndex(
                     (sensor: RealtimeSensorData) => sensor.sensorId === sensorId
                 );
 
                 let updatedTypeData;
                 if (existingSensorIndex >= 0) {
                     updatedTypeData = currentTypeData.map((sensor: RealtimeSensorData, index) => {
                         if (index === existingSensorIndex) {
                             return {
                                 ...sensor,
                                 value: newSensorData.value,
                                 timestamp: newSensorData.timestamp,
                             };
                         }
                         return sensor;
                     });
                 } else {
                     const newSensorItem: RealtimeSensorData = {
                         sensorId: sensorId,
                         sensorName: newSensorData.sensor.name,
                         tankName: newSensorData.sensor.tank?.name || 'Tanque desconocido',
                         value: newSensorData.value,
                         timestamp: newSensorData.timestamp,
                         hardwareId: newSensorData.sensor.hardwareId,
                         type: sensorType,
                     };
                     updatedTypeData = [...currentTypeData, newSensorItem];
                 }
 
                 return {
                     ...prev,
                     [sensorType]: updatedTypeData,
                 };
             });
 
             setHistoricalData(prev => {
                 if (!prev[sensorType]) {
                     return prev;
                 }
 
                 const currentData = prev[sensorType] || [];
                 const newDataPoint = {
                     time: new Date(newSensorData.timestamp).toISOString(),
                     value: newSensorData.value,
                 };
 
                 const updatedData = [...currentData, newDataPoint]
                     .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
 
                 if (updatedData.length > MAX_LIVE_DATA_POINTS) {
                     updatedData.splice(0, updatedData.length - MAX_LIVE_DATA_POINTS);
                 }
 
                 return {
                     ...prev,
                     [sensorType]: updatedData,
                 };
             });
         };
 
         /**
          * @function handleReportUpdate
          * @description Maneja las actualizaciones de reportes
          */
         const handleReportUpdate = (reportData: any) => {
             console.log('📊 Actualización de reporte recibida:', reportData);
         };
 
         /**
          * @function handleNewAlert
          * @description Maneja las nuevas alertas
          */
         const handleNewAlert = (alertData: any) => {
             console.log('🚨 Nueva alerta recibida:', alertData);
             setSummaryData(prev => {
                 if (prev) {
                     return {
                         ...prev,
                         recentAlerts: prev.recentAlerts + 1,
                     };
                 }
                 return prev;
             });
         };
 
         /**
          * @function subscribeToEvents
          * @description Suscribe a los eventos del socket
          */
         function subscribeToEvents() {
             if (!socketManager || !socketManager.socket) {
                 console.error('❌ Socket no está disponible para suscribirse a eventos');
                 return;
             }
 
             const socket = socketManager.socket;
             socket.on('new_sensor_data', handleNewSensorData);
             socket.on('report_status_update', handleReportUpdate);
             socket.on('new-alert', handleNewAlert);
         }
 
         /**
          * @function handleConnect
          * @description Maneja la conexión del socket
          */
         const handleConnect = () => {
             console.log('🔌 Socket conectado, suscribiendo a eventos...');
             subscribeToEvents();
         };
 
         // Verificar si el socket está disponible y conectado
         if (socketManager && socketManager.socket) {
             if (socketManager.socket.connected) {
                 console.log('🔌 Socket ya está conectado, suscribiendo a eventos...');
                 subscribeToEvents();
             } else {
                 console.log('🔌 Socket no conectado, esperando conexión...');
                 socketManager.socket.on('connect', handleConnect);
             }
         } else {
             console.error('❌ SocketManager no está disponible');
         }
 
         // Cleanup function
         return () => {
             if (socketManager && socketManager.socket) {
                 const socket = socketManager.socket;
                 socket.off('new_sensor_data', handleNewSensorData);
                 socket.off('report_status_update', handleReportUpdate);
                 socket.off('new-alert', handleNewAlert);
                 socket.off('connect', handleConnect);
             }
         };
     }, []);
 
     const fetchSummary = useCallback(async (filters: DashboardFilters) => {
         try {
             setLoading(prev => ({ ...prev, summary: true }));
             const data = await getSummary(filters);
             setSummaryData(data as DashboardSummary);
             setError(null);
         } catch (err) {
             setError('Error al cargar el resumen de datos.');
             console.error('Error en fetchSummary:', err);
         } finally {
             setLoading(prev => ({ ...prev, summary: false }));
         }
     }, []);
 
     const fetchRealtimeData = useCallback(async (filters: DashboardFilters) => {
         try {
             setLoading(prev => ({ ...prev, realtime: true }));
             const data = await getRealtimeData(filters);
             setRealtimeData(data);
             setError(null);
         } catch (err) {
             setError('Error al cargar los datos en tiempo real.');
             console.error('Error en fetchRealtimeData:', err);
         } finally {
             setLoading(prev => ({ ...prev, realtime: false }));
         }
     }, []);
 
     const fetchHistoricalData = useCallback(async (filters: DashboardFilters) => {
         if (!filters.startDate || !filters.endDate) {
             console.warn('fetchHistoricalData requiere startDate y endDate');
             return;
         }
         try {
             setLoading(prev => ({ ...prev, historical: true }));
             const data = await getHistoricalData(filters);
             setHistoricalData(data);
             setError(null);
         } catch (err) {
             setError('Error al cargar los datos históricos.');
             console.error('Error en fetchHistoricalData:', err);
         } finally {
             setLoading(prev => ({ ...prev, historical: false }));
         }
     }, []);
 
     const fetchUsersList = useCallback(async () => {
         try {
             setLoading(prev => ({ ...prev, users: true }));
             const data = await getUsersListForAdmin();
             setUsersList(data);
             setError(null);
         } catch (err) {
             setError('Error al cargar la lista de usuarios.');
             console.error('Error en fetchUsersList:', err);
         } finally {
             setLoading(prev => ({ ...prev, users: false }));
         }
     }, []);
 
     return {
         summaryData,
         realtimeData,
         historicalData,
         usersList,
         loading,
         error,
         fetchSummary,
         fetchRealtimeData,
         fetchHistoricalData,
         fetchUsersList,
     };
 };
