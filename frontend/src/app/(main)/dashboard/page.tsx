/**
 * @file page.tsx
 * @route frontend/src/app/(main)/dashboard/
 * @description Página principal del dashboard, con lógica de estado, efectos y manejo de fechas corregidos.
 * @author Kevin Mariano & Gemini AI
 * @version 2.0.0
 * @since 1.0.0
 * @copyright SENA 2025
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useDashboard } from '@/hooks/useDashboard';
import { useInfrastructure } from '@/hooks/useInfrastructure';
import {
	DashboardFilters,
	SummaryCards,
	GaugeChart,
	AdminStatCards,
} from '@/components/dashboard';
import { Card } from '@/components/common/Card';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Role, SensorType, Settings } from '@/types';
import { getSettings } from '@/services/settingsService';
import { Container } from 'lucide-react';
import { parseISO } from 'date-fns';

const LineChart = dynamic(
	() =>
		import('@/components/dashboard/LineChart').then((mod) => mod.LineChart),
	{
		ssr: false,
		loading: () => (
			<div className='h-80 w-full animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700' />
		),
	},
);

const DashboardPage: React.FC = () => {
	const { user } = useAuth();
	const { tanks, fetchDataForUser } = useInfrastructure(
		user?.role === Role.ADMIN,
	);
	const {
		summaryData,
		realtimeData,
		historicalData,
		usersList,
		loading,
		fetchSummary,
		fetchRealtimeData,
		fetchHistoricalData,
		fetchUsersList,
	} = useDashboard();

	const [settings, setSettings] = useState<Settings | null>(null);
	const [filters, setFilters] = useState({
		startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
			.toISOString()
			.split('T')[0],
		endDate: new Date().toISOString().split('T')[0],
		userId: user?.id,
		tankId: undefined as string | undefined,
		sensorType: undefined as SensorType | undefined,
	});

	useEffect(() => {
		if (user) {
			getSettings().then(setSettings);
			if (user.role === Role.ADMIN) {
				fetchUsersList();
			}
			setFilters((prev) => ({ ...prev, userId: prev.userId || user.id }));
		}
	}, [user, fetchUsersList]);

	useEffect(() => {
		if (filters.userId) {
			fetchDataForUser(filters.userId);
		}
	}, [filters.userId, fetchDataForUser]);

	useEffect(() => {
		if (tanks.length > 0) {
			const currentTankIsValid = tanks.some((t) => t.id === filters.tankId);
			if (!currentTankIsValid) {
				setFilters((prev) => ({ ...prev, tankId: tanks[0].id }));
			}
		} else {
			setFilters((prev) => ({ ...prev, tankId: undefined }));
		}
	}, [tanks, filters.tankId]);

	const memoizedFetchData = useCallback(() => {
		if (filters.tankId && filters.startDate && filters.endDate) {
			fetchSummary(filters);
			fetchRealtimeData(filters);
			fetchHistoricalData(filters);
		}
	}, [filters, fetchSummary, fetchRealtimeData, fetchHistoricalData]);

	useEffect(() => {
		memoizedFetchData();
	}, [memoizedFetchData]);

	const handleFiltersChange = (newFilters: Partial<typeof filters>) => {
		setFilters((prev) => {
			const updated = { ...prev, ...newFilters };
			if (newFilters.userId && newFilters.userId !== prev.userId) {
				updated.tankId = undefined;
				updated.sensorType = undefined;
			}
			return updated;
		});
	};

	if (!user) {
		return (
			<div className='flex h-screen items-center justify-center'>
				<LoadingSpinner message='Verificando sesión...' />
			</div>
		);
	}

	const isAdmin = user.role === Role.ADMIN;

	const dateRange =
		filters.startDate && filters.endDate
			? { from: parseISO(filters.startDate), to: parseISO(filters.endDate) }
			: undefined;

	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.5 }}
			className='container mx-auto space-y-8 p-4 md:p-6 lg:p-8'
		>
			<div>
				<h1 className='text-3xl font-bold text-gray-900 dark:text-white'>
					Dashboard de Monitoreo
				</h1>
				<p className='mt-1 text-gray-500 dark:text-gray-400'>
					Bienvenido, {user.name}. Estado de tu sistema en tiempo real.
				</p>
			</div>

			<DashboardFilters
				filters={filters}
				onFiltersChange={handleFiltersChange}
				tanksList={tanks}
				usersList={usersList}
				currentUserRole={user.role}
				loading={loading.users || loading.tanks}
			/>

			{(loading.summary || loading.historical) && !summaryData && (
				<div className='py-12 text-center'>
					<LoadingSpinner />
				</div>
			)}

			{!filters.tankId && !loading.tanks ? (
				<div className='rounded-xl border border-amber-200 bg-amber-50 p-8 text-center dark:border-amber-800 dark:bg-amber-900/20'>
					<Container className='mx-auto mb-4 h-16 w-16 text-amber-500' />
					<h3 className='mb-2 text-xl font-semibold text-amber-800 dark:text-amber-200'>
						Selecciona un tanque
					</h3>
					<p className='text-amber-600 dark:text-amber-400'>
						Para poder visualizar los datos, primero debes seleccionar un tanque.
					</p>
				</div>
			) : (
				<>
					{isAdmin && (
						<AdminStatCards
							stats={summaryData?.adminStats}
							loading={loading.summary}
						/>
					)}
					<SummaryCards
						data={summaryData}
						loading={loading.summary}
						currentUserRole={user.role}
					/>
					<section>
						<h2 className='mb-4 text-2xl font-bold text-gray-900 dark:text-white'>
							Lecturas en Tiempo Real
						</h2>
						<GaugeChart
							data={realtimeData}
							settings={settings}
							loading={loading.realtime}
						/>
					</section>

					<section>
						<h2 className='mb-4 text-2xl font-bold text-gray-900 dark:text-white'>
							Tendencias Históricas
						</h2>
						<div className='mx-auto max-w-7xl space-y-8'>
							<Card>
								<LineChart
									data={historicalData?.TEMPERATURE || []}
									title='Temperatura'
									yAxisLabel='°C'
									sensorType={SensorType.TEMPERATURE}
									settings={settings}
									loading={loading.historical}
									isLive={false}
									dateRange={dateRange}
								/>
							</Card>
							<Card>
								<LineChart
									data={historicalData?.PH || []}
									title='pH'
									yAxisLabel='pH'
									sensorType={SensorType.PH}
									settings={settings}
									loading={loading.historical}
									isLive={false}
									dateRange={dateRange}
								/>
							</Card>
							<Card>
								<LineChart
									data={historicalData?.OXYGEN || []}
									title='Oxígeno Disuelto'
									yAxisLabel='mg/L'
									sensorType={SensorType.OXYGEN}
									settings={settings}
									loading={loading.historical}
									isLive={false}
									dateRange={dateRange}
								/>
							</Card>
						</div>
					</section>
				</>
			)}
		</motion.div>
	);
};

export default DashboardPage;
