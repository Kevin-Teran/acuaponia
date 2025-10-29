/**
 * @file useDashboard.ts
 * @route frontend/src/hooks/
 * @description Hook optimizado para el dashboard con mejor manejo de errores y logging
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
import { 
    DashboardFilters, 
    DashboardSummary, 
    RealtimeData, 
    HistoricalData, 
    RealtimeSensorData 
} from '@/types/dashboard';
import { UserFromApi, SensorType } from '@/types';
import { socketManager } from '@/services/socketService';
import { useAuth } from '@/context/AuthContext';

interface LoadingState {
    summary: boolean;
    realtime: boolean;
    historical: boolean;
    users: boolean;
}

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

export const useDashboard = (): UseDashboardReturn => {
    const { user } = useAuth();
    
    const [summaryData, setSummaryData] = useState<DashboardSummary | null>(null);
    const [realtimeData, setRealtimeData] = useState<RealtimeData>({
        TEMPERATURE: [],
        PH: [],
        OXYGEN: [],
    });
    const [historicalData, setHistoricalData] = useState<HistoricalData>({
        TEMPERATURE: [],
        PH: [],
        OXYGEN: [],
    });
    const [usersList, setUsersList] = useState<UserFromApi[]>([]);
    const [loading, setLoading] = useState<LoadingState>({
        summary: true,
        realtime: true,
        historical: true,
        users: false,
    });
    const [error, setError] = useState<string | null>(null);

    /**
     * @function handleNewSensorData
     * @description Maneja los datos de sensores que llegan por WebSocket
     */
    const handleNewSensorData = useCallback((newSensorData: any) => {
        //console.log('⚡️ [useDashboard] Nuevo dato de sensor recibido:', newSensorData);

        if (!newSensorData || !newSensorData.sensor) {
            console.warn('⚠️ [useDashboard] Datos de sensor inválidos:', newSensorData);
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
    }, []);

    /**
     * @function handleReportUpdate
     * @description Maneja las actualizaciones de reportes
     */
    const handleReportUpdate = useCallback((reportData: any) => {
        //console.log('📋 [useDashboard] Actualización de reporte recibida:', reportData);
    }, []);

    /**
     * @function handleNewAlert
     * @description Maneja las nuevas alertas
     */
    const handleNewAlert = useCallback((alertData: any) => {
        //console.log('🚨 [useDashboard] Nueva alerta recibida:', alertData);
        setSummaryData(prev => {
            if (prev) {
                return {
                    ...prev,
                    recentAlerts: prev.recentAlerts + 1,
                };
            }
            return prev;
        });
    }, []);

    /**
     * Configurar eventos de WebSocket
     */
    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        if (socketManager && token) {
            //console.log('🔌 [useDashboard] Configurando conexión de socket');
            socketManager.connect(token);
        }

        const subscribeToEvents = () => {
            if (!socketManager || !socketManager.socket) {
                console.error('❌ [useDashboard] Socket no disponible');
                return;
            }

            const socket = socketManager.socket;
            socket.on('new_sensor_data', handleNewSensorData);
            socket.on('report_status_update', handleReportUpdate);
            socket.on('new-alert', handleNewAlert);

            //console.log('✅ [useDashboard] Eventos de socket suscritos');
        };

        const handleConnect = () => {
            //console.log('🔌 [useDashboard] Socket conectado, suscribiendo eventos');
            subscribeToEvents();
        };

        if (socketManager && socketManager.socket) {
            if (socketManager.socket.connected) {
                subscribeToEvents();
            } else {
                socketManager.socket.on('connect', handleConnect);
            }
        }

        return () => {
            if (socketManager && socketManager.socket) {
                const socket = socketManager.socket;
                socket.off('new_sensor_data', handleNewSensorData);
                socket.off('report_status_update', handleReportUpdate);
                socket.off('new-alert', handleNewAlert);
                socket.off('connect', handleConnect);
            }
        };
    }, [handleNewSensorData, handleReportUpdate, handleNewAlert]);

    /**
     * @function fetchSummary
     * @description Obtiene el resumen de estadísticas
     */
    const fetchSummary = useCallback(async (filters: DashboardFilters) => {
        try {
            //console.log('📊 [useDashboard] Obteniendo resumen...');
            setLoading(prev => ({ ...prev, summary: true }));
            setError(null);

            const data = await getSummary(filters);
            setSummaryData(data);

            //console.log('✅ [useDashboard] Resumen obtenido:', data);
        } catch (err: any) {
            const errorMsg = err.message || 'Error al cargar el resumen de datos';
            setError(errorMsg);
            console.error('❌ [useDashboard] Error en fetchSummary:', err);
        } finally {
            setLoading(prev => ({ ...prev, summary: false }));
        }
    }, []);

    /**
     * @function fetchRealtimeData
     * @description Obtiene los datos en tiempo real
     */
    const fetchRealtimeData = useCallback(async (filters: DashboardFilters) => {
        try {
            //console.log('⚡ [useDashboard] Obteniendo datos en tiempo real...');
            setLoading(prev => ({ ...prev, realtime: true }));
            setError(null);

            const data = await getRealtimeData(filters);
            setRealtimeData(data);

            /**
             * console.log('✅ [useDashboard] Datos en tiempo real obtenidos:', {
             *    TEMPERATURE: data.TEMPERATURE?.length || 0,
             *    PH: data.PH?.length || 0,
             *    OXYGEN: data.OXYGEN?.length || 0,
             * });
            */
        } catch (err: any) {
            const errorMsg = err.message || 'Error al cargar los datos en tiempo real';
            setError(errorMsg);
            console.error('❌ [useDashboard] Error en fetchRealtimeData:', err);
            
            setRealtimeData({ TEMPERATURE: [], PH: [], OXYGEN: [] });
        } finally {
            setLoading(prev => ({ ...prev, realtime: false }));
        }
    }, []);

    /**
     * @function fetchHistoricalData
     * @description Obtiene los datos históricos
     */
    const fetchHistoricalData = useCallback(async (filters: DashboardFilters) => {
        if (!filters.tankId) {
            console.warn('⚠️ [useDashboard] No se puede obtener datos históricos sin tankId');
            return;
        }

        try {
            //console.log('📈 [useDashboard] Obteniendo datos históricos...');
            setLoading(prev => ({ ...prev, historical: true }));
            setError(null);

            const data = await getHistoricalData(filters);
            setHistoricalData(data);

            /**
             * console.log('✅ [useDashboard] Datos históricos obtenidos:', {
             *     TEMPERATURE: data.TEMPERATURE?.length || 0,
             *     PH: data.PH?.length || 0,
             *     OXYGEN: data.OXYGEN?.length || 0,
             * });
            */
        } catch (err: any) {
            const errorMsg = err.message || 'Error al cargar los datos históricos';
            setError(errorMsg);
            console.error('❌ [useDashboard] Error en fetchHistoricalData:', err);
            
            setHistoricalData({ TEMPERATURE: [], PH: [], OXYGEN: [] });
        } finally {
            setLoading(prev => ({ ...prev, historical: false }));
        }
    }, []);

    /**
     * @function fetchUsersList
     * @description Obtiene la lista de usuarios (solo admins)
     */
    const fetchUsersList = useCallback(async () => {
        try {
            //console.log('👥 [useDashboard] Obteniendo lista de usuarios...');
            setLoading(prev => ({ ...prev, users: true }));
            setError(null);

            const data = await getUsersListForAdmin();
            setUsersList(data);

            //console.log('✅ [useDashboard] Usuarios obtenidos:', data.length);
        } catch (err: any) {
            const errorMsg = err.message || 'Error al cargar la lista de usuarios';
            setError(errorMsg);
            console.error('❌ [useDashboard] Error en fetchUsersList:', err);
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
}