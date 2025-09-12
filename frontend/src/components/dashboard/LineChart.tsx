/**
 * @file LineChart.tsx
 * @route frontend/src/components/dashboard/LineChart.tsx
 * @description Componente de gráfico de líneas con diseño premium, iconos y colores dinámicos.
 * @author Kevin Mariano & Gemini AI
 * @version 5.0.0 (Corrección Visual de Estadísticas)
 * @since 1.0.0
 * @copyright SENA 2025
 */

'use client';

import React, { useMemo } from 'react';
import {
	Area,
	AreaChart,
	CartesianGrid,
	Line,
	ReferenceLine,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';
import {
	BarChart3,
	Minus,
	Thermometer,
	TrendingDown,
	TrendingUp,
	Waves,
	Wind,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Settings, SensorType } from '@/types';
import { format, differenceInDays, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatInTimeZone } from 'date-fns-tz';

// --- Interfaces y Tipos ---
interface ChartDataPoint {
	time: string;
	value: number;
}
interface LineChartProps {
	data: ChartDataPoint[];
	title: string;
	yAxisLabel: string;
	sensorType: SensorType;
	settings: Settings | null;
	loading: boolean;
	isLive: boolean;
	dateRange?: { from: Date; to: Date };
}

// --- Constantes y Configuración de Diseño ---
const TIME_ZONE = 'America/Bogota';

const SENSOR_THEMES = {
	[SensorType.TEMPERATURE]: {
		icon: Thermometer,
		color: '#3b82f6', // blue-500
		gradientId: 'tempGradient',
		name: 'Temperatura',
	},
	[SensorType.PH]: {
		icon: Waves,
		color: '#22c55e', // green-500
		gradientId: 'phGradient',
		name: 'pH',
	},
	[SensorType.OXYGEN]: {
		icon: Wind,
		color: '#06b6d4', // cyan-500
		gradientId: 'oxygenGradient',
		name: 'Oxígeno',
	},
	// Se puede extender a otros tipos de sensores si es necesario.
	[SensorType.LEVEL]: {
		icon: BarChart3, // Icono de ejemplo
		color: '#a855f7', // purple-500
		gradientId: 'levelGradient',
		name: 'Nivel',
	},
	[SensorType.FLOW]: {
		icon: Waves, // Icono de ejemplo
		color: '#f97316', // orange-500
		gradientId: 'flowGradient',
		name: 'Flujo',
	},
};

// --- Componentes Internos ---

const CustomTooltip = ({ active, payload, label, themeColor }: any) => {
	if (active && payload && payload.length) {
		const formattedLabel = formatInTimeZone(
			new Date(label),
			TIME_ZONE,
			'd MMM yyyy, HH:mm:ss',
			{ locale: es },
		);
		return (
			<motion.div
				initial={{ opacity: 0, scale: 0.9 }}
				animate={{ opacity: 1, scale: 1 }}
				className='rounded-xl border border-gray-200 bg-white/80 p-3 shadow-xl backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/80'
			>
				<p className='mb-1 text-sm font-semibold text-gray-900 dark:text-white'>
					{formattedLabel}
				</p>
				<p
					className='flex items-center text-base font-bold'
					style={{ color: themeColor }}
				>
					{`${payload[0].name}: ${payload[0].value.toFixed(2)}`}
				</p>
			</motion.div>
		);
	}
	return null;
};

const TrendIndicator = ({ data }: { data: ChartDataPoint[] }) => {
	const trend = useMemo(() => {
		if (data.length < 2) return null;
		const first = data[0].value;
		const last = data[data.length - 1].value;
		const diff = last - first;
		if (Math.abs(diff) < 0.1)
			return { Icon: Minus, color: 'text-gray-500', text: 'Estable' };
		if (diff > 0)
			return {
				Icon: TrendingUp,
				color: 'text-green-600 dark:text-green-400',
				text: 'Al alza',
			};
		return {
			Icon: TrendingDown,
			color: 'text-red-600 dark:text-red-400',
			text: 'A la baja',
		};
	}, [data]);

	if (!trend) return null;
	return (
		<div
			className={`inline-flex items-center gap-2 rounded-full border bg-gray-50 px-3 py-1 text-sm font-medium dark:border-gray-700 dark:bg-gray-800 ${trend.color}`}
		>
			<trend.Icon className='h-4 w-4' />
			<span>{trend.text}</span>
		</div>
	);
};

const EmptyState = ({ title }: { title: string }) => (
	<div className='flex h-full min-h-[400px] w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-800/50'>
		<motion.div
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: 0.1 }}
		>
			<BarChart3 className='mx-auto h-16 w-16 text-gray-400 dark:text-gray-500' />
			<h3 className='mt-4 text-xl font-semibold text-gray-800 dark:text-gray-200'>
				No hay datos para {title}
			</h3>
			<p className='mt-2 text-sm text-gray-500 dark:text-gray-400'>
				Prueba a cambiar el rango de fechas o seleccionar otro tanque.
			</p>
		</motion.div>
	</div>
);

const LoadingState = () => (
	<div className='flex h-full min-h-[480px] w-full animate-pulse items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800/50' />
);

// --- Componente Principal ---
export const LineChart: React.FC<LineChartProps> = ({
	data,
	title,
	yAxisLabel,
	sensorType,
	settings,
	loading,
	isLive,
	dateRange,
}) => {
	const theme = SENSOR_THEMES[sensorType] || SENSOR_THEMES.TEMPERATURE;
	const IconComponent = theme.icon;

	const { stats, xAxisConfig } = useMemo(() => {
		if (!data || data.length === 0) {
			return {
				stats: { min: 0, max: 0, avg: 0, yDomain: [0, 10] },
				xAxisConfig: { tickFormatter: () => '', domain: ['auto', 'auto'] },
			};
		}
		const values = data.map((d) => d.value);
		const min = Math.min(...values);
		const max = Math.max(...values);
		const avg = values.reduce((s, v) => s + v, 0) / values.length;
		const range = max - min;
		const padding = range > 0 ? range * 0.2 : 5;
		const yDomain: [number | string, number | string] = [
			`dataMin - ${padding}`,
			`dataMax + ${padding}`,
		];

		const firstDate = parseISO(data[0].time);
		const lastDate = parseISO(data[data.length - 1].time);
		const dayDiff = differenceInDays(lastDate, firstDate);
		const dateFormat = dayDiff <= 2 ? 'HH:mm' : 'd MMM';
		const tickFormatter = (tick: string) =>
			formatInTimeZone(new Date(tick), TIME_ZONE, dateFormat, { locale: es });

		return {
			stats: { min, max, avg, yDomain },
			xAxisConfig: { tickFormatter, domain: ['dataMin', 'dataMax'] },
		};
	}, [data]);

	const thresholds = useMemo(() => {
		if (!settings || !settings.thresholds) return null;
		return (
			settings.thresholds[
				sensorType.toLowerCase() as keyof typeof settings.thresholds
			] || null
		);
	}, [settings, sensorType]);

	const chartTitle = isLive
		? `Tiempo Real: ${title}`
		: `Histórico ${title} (${
				dateRange
					? `${format(dateRange.from, 'd MMM', {
							locale: es,
					  })} - ${format(dateRange.to, 'd MMM', { locale: es })}`
					: '...'
		  })`;

	if (loading) return <LoadingState />;
	if (!data || data.length === 0) return <EmptyState title={title} />;

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5 }}
			className='w-full'
		>
			<div className='mb-6'>
				<div className='flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center'>
					<div className='flex items-center gap-4'>
						<div
							className='flex h-12 w-12 items-center justify-center rounded-lg'
							style={{ backgroundColor: `${theme.color}20` }}
						>
							<IconComponent
								className='h-6 w-6'
								style={{ color: theme.color }}
							/>
						</div>
						<div>
							<h3 className='text-xl font-bold text-gray-900 dark:text-white'>
								{chartTitle}
							</h3>
							<p className='text-sm text-gray-500 dark:text-gray-400'>
								Mostrando {data.length} puntos de datos.
							</p>
						</div>
					</div>
					<div className='flex items-center gap-4'>
						{isLive && (
							<div className='flex items-center gap-2 text-xs font-semibold uppercase text-green-600 dark:text-green-400'>
								<span className='relative flex h-3 w-3'>
									<span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75'></span>
									<span className='relative inline-flex h-3 w-3 rounded-full bg-green-500'></span>
								</span>
								En Vivo
							</div>
						)}
						<TrendIndicator data={data} />
					</div>
				</div>
			</div>

			<div className='h-80 w-full'>
				<ResponsiveContainer>
					<AreaChart
						data={data}
						margin={{ top: 5, right: 30, left: -10, bottom: 20 }}
					>
						<defs>
							<linearGradient id={theme.gradientId} x1='0' y1='0' x2='0' y2='1'>
								<stop offset='0%' stopColor={theme.color} stopOpacity={0.4} />
								<stop offset='75%' stopColor={theme.color} stopOpacity={0.05} />
							</linearGradient>
						</defs>
						<CartesianGrid
							strokeDasharray='3 3'
							className='stroke-gray-200/50 dark:stroke-gray-700/50'
						/>
						<XAxis
							dataKey='time'
							tickFormatter={xAxisConfig.tickFormatter}
							className='text-xs text-gray-600 dark:text-gray-400'
							dy={10}
							interval='preserveStartEnd'
							domain={xAxisConfig.domain as [string, string]}
							type='category'
						/>
						<YAxis
							type='number'
							className='text-xs text-gray-600 dark:text-gray-400'
							domain={stats.yDomain}
							label={{
								value: yAxisLabel,
								angle: -90,
								position: 'insideLeft',
								style: { fill: 'currentColor', fontSize: '14px' },
								className: 'fill-gray-600 dark:fill-gray-400 font-medium',
							}}
							allowDataOverflow={true}
						/>
						<Tooltip
							content={<CustomTooltip themeColor={theme.color} />}
							cursor={{
								stroke: theme.color,
								strokeWidth: 1,
								strokeDasharray: '4 4',
							}}
						/>
						{thresholds && (
							<>
								<ReferenceLine
									y={thresholds.max}
									label={{
										value: 'Alto',
										position: 'right',
										className: 'fill-red-500 text-xs font-semibold',
									}}
									stroke='#ef4444'
									strokeWidth={1.5}
									strokeDasharray='4 4'
									ifOverflow='extendDomain'
								/>
								<ReferenceLine
									y={thresholds.min}
									label={{
										value: 'Bajo',
										position: 'right',
										className: 'fill-blue-500 text-xs font-semibold',
									}}
									stroke='#3b82f6'
									strokeWidth={1.5}
									strokeDasharray='4 4'
									ifOverflow='extendDomain'
								/>
							</>
						)}
						<Area
							type='monotone'
							dataKey='value'
							stroke='transparent'
							fill={`url(#${theme.gradientId})`}
							name={title}
						/>
						<Line
							type='monotone'
							dataKey='value'
							name={title}
							stroke={theme.color}
							strokeWidth={2.5}
							dot={false}
							activeDot={{
								r: 6,
								fill: theme.color,
								stroke: 'var(--card-background)',
								strokeWidth: 2,
							}}
							connectNulls
							animationDuration={1000}
						/>
					</AreaChart>
				</ResponsiveContainer>
			</div>

            {/* --- SOLUCIÓN: SECCIÓN DE ESTADÍSTICAS CORREGIDA --- */}
			{/* Los colores ahora son dinámicos y corresponden al tema del sensor actual. */}
			<div className='mt-8 grid grid-cols-1 divide-y divide-gray-200 rounded-xl border border-gray-200 bg-white dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-800/50 sm:grid-cols-3 sm:divide-x sm:divide-y-0'>
				<div className='flex flex-col gap-y-2 p-6 text-center'>
					<p className='text-sm font-medium text-gray-500 dark:text-gray-400'>
						Mínimo
					</p>
					<p
						className='text-3xl font-bold tracking-tight'
						style={{ color: theme.color }}
					>
						{stats.min.toFixed(2)}
					</p>
				</div>
				<div className='flex flex-col gap-y-2 p-6 text-center'>
					<p className='text-sm font-medium text-gray-500 dark:text-gray-400'>
						Promedio
					</p>
					<p
						className='text-3xl font-bold tracking-tight'
						style={{ color: theme.color }}
					>
						{stats.avg.toFixed(2)}
					</p>
				</div>
				<div className='flex flex-col gap-y-2 p-6 text-center'>
					<p className='text-sm font-medium text-gray-500 dark:text-gray-400'>
						Máximo
					</p>
					<p
						className='text-3xl font-bold tracking-tight'
						style={{ color: theme.color }}
					>
						{stats.max.toFixed(2)}
					</p>
				</div>
			</div>
		</motion.div>
	);
};