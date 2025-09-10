/**
 * @file useDashboard.ts
 * @route frontend/src/hooks/
 * @description Hook definitivo para el dashboard. Fusiona la carga de datos inicial vía HTTP
 * con actualizaciones en tiempo real a través de WebSockets para una experiencia fluida.
 * @author Kevin Mariano & Gemini AI
 * @version 6.0.0 (Live & Final)
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
	SummaryData,
	RealtimeData,
	HistoricalData,
	UserForList,
	SensorData,
	SensorType,
	RealtimeSensorData,
} from '@/types';
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
	const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
	const [realtimeData, setRealtimeData] = useState<RealtimeData>({});
	const [historicalData, setHistoricalData] = useState<HistoricalData>({});
	const [usersList, setUsersList] = useState<UserForList[]>([]);
	const [loading, setLoading] = useState<LoadingState>({
		summary: true,
		realtime: true,
		historical: true,
		users: false,
	});
	const [error, setError] = useState<string | null>(null);

	// --- SOLUCIÓN: Lógica de Sockets para Datos en Vivo ---
	useEffect(() => {
		/**
		 * @function handleNewData
		 * @description Callback que se ejecuta cuando llega un nuevo dato por el socket.
		 * Actualiza los estados de tiempo real e histórico sin necesidad de una nueva petición HTTP.
		 * @param {SensorData} newData - El nuevo dato del sensor recibido.
		 */
		const handleNewData = (newData: SensorData) => {
			console.log('⚡️ Nuevo dato recibido vía Socket:', newData);

			const sensorType = newData.sensor.type;

			// 1. Actualizar Medidores en Tiempo Real (GaugeChart)
			setRealtimeData((prev) => {
				const currentTypeData = prev[sensorType] || [];
				let sensorFound = false;

				// Intenta actualizar un sensor existente
				const updatedTypeData = currentTypeData.map(
					(sensor: RealtimeSensorData) => {
						if (sensor.sensorId === newData.sensor.id) {
							sensorFound = true;
							return {
								...sensor,
								value: newData.value,
								timestamp: newData.timestamp,
							};
						}
						return sensor;
					},
				);

				// Si el sensor no estaba en la lista, lo añadimos
				if (!sensorFound) {
					updatedTypeData.push({
						sensorId: newData.sensor.id,
						sensorName: newData.sensor.name,
						tankName: newData.sensor.tank.name,
						value: newData.value,
						timestamp: newData.timestamp,
						hardwareId: newData.sensor.hardwareId,
						type: newData.sensor.type,
					});
				}

				return { ...prev, [sensorType]: updatedTypeData };
			});

			// 2. Actualizar Gráficos (LineChart)
			setHistoricalData((prev) => {
				// Solo actualiza si el tipo de sensor existe en el estado
				if (!prev[sensorType]) return prev;

				const currentData = prev[sensorType] || [];
				const newDataPoint = {
					time: new Date(newData.timestamp).toISOString(),
					value: newData.value,
				};

				// Añadimos el nuevo punto y nos aseguramos de no exceder el límite
				const updatedData = [...currentData, newDataPoint];
				if (updatedData.length > MAX_LIVE_DATA_POINTS) {
					updatedData.shift(); // Elimina el punto más antiguo
				}

				return { ...prev, [sensorType]: updatedData };
			});
		};

		// Suscribirse al evento
		socket.on('newData', handleNewData);

		// Limpieza: Desuscribirse al desmontar el componente para evitar fugas de memoria
		return () => {
			socket.off('newData', handleNewData);
		};
	}, []); // El array vacío asegura que esto se ejecute solo una vez.

	// --- Funciones para Obtener Datos Iniciales (HTTP) ---

	const fetchSummary = useCallback(async (filters: DashboardFiltersDto) => {
		try {
			setLoading((prev) => ({ ...prev, summary: true }));
			const data = await getSummary(filters);
			setSummaryData(data);
		} catch (err) {
			setError('Error al cargar el resumen de datos.');
			console.error(err);
		} finally {
			setLoading((prev) => ({ ...prev, summary: false }));
		}
	}, []);

	const fetchRealtimeData = useCallback(async (filters: DashboardFiltersDto) => {
		try {
			setLoading((prev) => ({ ...prev, realtime: true }));
			const data = await getRealtimeData(filters);
			setRealtimeData(data);
		} catch (err) {
			setError('Error al cargar los datos en tiempo real.');
			console.error(err);
		} finally {
			setLoading((prev) => ({ ...prev, realtime: false }));
		}
	}, []);

	const fetchHistoricalData = useCallback(
		async (filters: DashboardFiltersDto) => {
			if (!filters.startDate || !filters.endDate) {
				console.warn('fetchHistoricalData requiere startDate y endDate');
				return;
			}
			try {
				setLoading((prev) => ({ ...prev, historical: true }));
				const data = await getHistoricalData(filters);
				setHistoricalData(data);
			} catch (err) {
				setError('Error al cargar los datos históricos.');
				console.error(err);
			} finally {
				setLoading((prev) => ({ ...prev, historical: false }));
			}
		},
		[],
	);

	const fetchUsersList = useCallback(async () => {
		try {
			setLoading((prev) => ({ ...prev, users: true }));
			const data = await getUsersListForAdmin();
			setUsersList(data);
		} catch (err) {
			setError('Error al cargar la lista de usuarios.');
			console.error(err);
		} finally {
			setLoading((prev) => ({ ...prev, users: false }));
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

