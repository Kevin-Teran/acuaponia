/**
 * @file useDashboard.ts
 * @route frontend/src/hooks/
 * @description Hook corregido para el dashboard con actualizaciones en tiempo real funcionando
 * @author Kevin Mariano & Claude AI
 * @version 6.1.0 (Live Fix)
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
    RealtimeData,
    HistoricalData,
    UserForList,
    SensorType,
    RealtimeSensorData,
} from '@/types';
import { DashboardFiltersDto, DashboardSummary } from '@/types/dashboard';
import { socket } from '@/services/socketService';
import { DashboardFiltersDto } from '@/types/dashboard';

// --- Tipos y Constantes ---
interface LoadingState {
	summary: boolean;
	realtime: boolean;
	historical: boolean;
	users: boolean;
}

// Límite de puntos a mostrar en la gráfica en modo "vivo" para mantener el rendimiento.
const MAX_LIVE_DATA_POINTS = 100;

export const useDashboard = () => {
	// --- Estados del Hook ---
	const [summaryData, setSummaryData] = useState<DashboardSummary | null>(null);	const [realtimeData, setRealtimeData] = useState<RealtimeData>({});
	const [historicalData, setHistoricalData] = useState<HistoricalData>({});
	const [usersList, setUsersList] = useState<UserForList[]>([]);
	const [loading, setLoading] = useState<LoadingState>({
		summary: true,
		realtime: true,
		historical: true,
		users: false,
	});
	const [error, setError] = useState<string | null>(null);

	// --- CORRECCIÓN: Escuchar el evento correcto del socket ---
	useEffect(() => {
		/**
		 * @function handleNewSensorData
		 * @description Maneja los nuevos datos de sensores que llegan por WebSocket
		 */
		const handleNewSensorData = (newSensorData: any) => {
			console.log('⚡️ Nuevo dato de sensor recibido:', newSensorData);

			// Verificar que el dato tenga la estructura esperada
			if (!newSensorData || !newSensorData.sensor) {
				console.warn('Datos de sensor inválidos recibidos:', newSensorData);
				return;
			}

			const sensorType = newSensorData.sensor.type as SensorType;
			const sensorId = newSensorData.sensor.id;

			// 1. Actualizar datos en tiempo real (para GaugeChart)
			setRealtimeData(prev => {
				const currentTypeData = prev[sensorType] || [];
				
				// Buscar si ya existe el sensor y actualizarlo, o agregarlo si no existe
				const existingSensorIndex = currentTypeData.findIndex(
					(sensor: RealtimeSensorData) => sensor.sensorId === sensorId
				);

				let updatedTypeData;
				if (existingSensorIndex >= 0) {
					// Actualizar sensor existente
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
					// Agregar nuevo sensor
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

			// 2. Actualizar datos históricos (para LineChart) solo si ya existe el tipo de sensor
			setHistoricalData(prev => {
				if (!prev[sensorType]) {
					// No actualizar si el tipo de sensor no está siendo mostrado actualmente
					return prev;
				}

				const currentData = prev[sensorType] || [];
				const newDataPoint = {
					time: new Date(newSensorData.timestamp).toISOString(),
					value: newSensorData.value,
				};

				// Agregar el nuevo punto y limitar el número de puntos
				const updatedData = [...currentData, newDataPoint]
					.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

				// Mantener solo los últimos MAX_LIVE_DATA_POINTS puntos
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
			// Aquí puedes manejar actualizaciones de reportes si es necesario
		};

		/**
		 * @function handleNewAlert
		 * @description Maneja las nuevas alertas
		 */
		const handleNewAlert = (alertData: any) => {
			console.log('🚨 Nueva alerta recibida:', alertData);
			// Actualizar el contador de alertas recientes si es necesario
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

		// CORRECCIÓN: Verificar conexión del socket antes de suscribirse
		if (socket.connected) {
			console.log('🔌 Socket ya conectado, suscribiendo a eventos...');
			subscribeToEvents();
		} else {
			console.log('🔌 Socket no conectado, esperando conexión...');
			socket.on('connect', () => {
				console.log('🔌 Socket conectado, suscribiendo a eventos...');
				subscribeToEvents();
			});
		}

		function subscribeToEvents() {
			// Suscribirse a los eventos con los nombres correctos del gateway
			socket.on('new_sensor_data', handleNewSensorData);
			socket.on('report_status_update', handleReportUpdate);
			socket.on('new-alert', handleNewAlert);
		}

		// Cleanup: Desuscribirse de todos los eventos
		return () => {
			socket.off('new_sensor_data', handleNewSensorData);
			socket.off('report_status_update', handleReportUpdate);
			socket.off('new-alert', handleNewAlert);
			socket.off('connect');
		};
	}, []); // Array vacío para que solo se ejecute una vez

	// --- Funciones para Obtener Datos Iniciales (HTTP) ---
	const fetchSummary = useCallback(async (filters: DashboardFiltersDto) => {
		try {
			setLoading(prev => ({ ...prev, summary: true }));
			const data = await getSummary(filters);
			setSummaryData(data);
			setError(null); // Limpiar errores previos
		} catch (err) {
			setError('Error al cargar el resumen de datos.');
			console.error('Error en fetchSummary:', err);
		} finally {
			setLoading(prev => ({ ...prev, summary: false }));
		}
	}, []);

	const fetchRealtimeData = useCallback(async (filters: DashboardFiltersDto) => {
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

	const fetchHistoricalData = useCallback(async (filters: DashboardFiltersDto) => {
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