/**
 * @file LineChart.tsx
 * @route frontend/src/components/dashboard/LineChart.tsx
 * @description Componente de gráfico de líneas avanzado con visualización de umbrales,
 * área de estado dinámica y gestión inteligente de datos en vivo e históricos.
 * @author Kevin Mariano & Gemini
 * @version 1.0.1
 * @since 1.0.0
 * @copyright SENA 2025
 */

'use client';

import React, { useMemo } from 'react';
import {
	LineChart as RechartsLineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	ReferenceLine,
	AreaChart,
	Area,
	Legend,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Settings, SensorType } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// --- INTERFACES Y TIPOS ---

/**
 * @interface ChartDataPoint
 * @description Define la estructura de un punto de dato en el gráfico.
 * @property {string} time - La marca de tiempo en formato ISO o legible.
 * @property {number} value - El valor numérico de la métrica.
 */
interface ChartDataPoint {
	time: string;
	value: number;
}

/**
 * @interface LineChartProps
 * @description Propiedades para el componente LineChart.
 */
interface LineChartProps {
	data: ChartDataPoint[];
	title: string;
	yAxisLabel: string;
	sensorType: SensorType; // Para obtener los umbrales correctos
	settings: Settings | null; // Configuraciones que incluyen los umbrales
	loading: boolean;
	isLive: boolean; // Indica si el gráfico está en modo "en vivo"
	dateRange?: { from: Date; to: Date }; // Rango de fechas para el modo histórico
}

// --- SUBCOMPONENTES VISUALES ---

/**
 * @component CustomTooltip
 * @description Tooltip personalizado para una mejor experiencia de usuario.
 */
const CustomTooltip = ({ active, payload, label }: any) => {
	if (active && payload && payload.length) {
		const formattedLabel = format(
			new Date(label),
			'd MMM yyyy, HH:mm:ss',
			{ locale: es },
		);
		return (
			<motion.div
				initial={{ opacity: 0, scale: 0.9 }}
				animate={{ opacity: 1, scale: 1 }}
				className='bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-3 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl'
			>
				<p className='font-semibold text-gray-900 dark:text-white mb-1 text-sm'>
					{formattedLabel}
				</p>
				<p
					className='text-sm flex items-center'
					style={{ color: payload[0].stroke }}
				>
					<span className='font-bold'>{`${
						payload[0].name
					}: ${payload[0].value.toFixed(2)}`}</span>
				</p>
			</motion.div>
		);
	}
	return null;
};

/**
 * @component TrendIndicator
 * @description Muestra la tendencia general de los datos (alcista, bajista o estable).
 */
const TrendIndicator = ({ data }: { data: ChartDataPoint[] }) => {
	const trend = useMemo(() => {
		if (data.length < 2) return null;
		const first = data[0].value;
		const last = data[data.length - 1].value;
		const diff = last - first;
		const percentChange = first === 0 ? 0 : (diff / Math.abs(first)) * 100;

		if (Math.abs(percentChange) < 1)
			return {
				Icon: Minus,
				color: 'text-gray-500',
				bg: 'bg-gray-100 dark:bg-gray-700',
				text: 'Estable',
			};
		if (diff > 0)
			return {
				Icon: TrendingUp,
				color: 'text-green-600 dark:text-green-400',
				bg: 'bg-green-100 dark:bg-green-900/30',
				text: `+${percentChange.toFixed(1)}%`,
			};
		return {
			Icon: TrendingDown,
			color: 'text-red-600 dark:text-red-400',
			bg: 'bg-red-100 dark:bg-red-900/30',
			text: `${percentChange.toFixed(1)}%`,
		};
	}, [data]);

	if (!trend) return null;

	return (
		<div
			className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${trend.bg} ${trend.color}`}
		>
			<trend.Icon className='w-4 h-4' />
			<span>{trend.text}</span>
		</div>
	);
};

/**
 * @component EmptyState
 * @description Se muestra cuando no hay datos disponibles para el gráfico.
 */
const EmptyState = ({ title }: { title: string }) => (
	<motion.div
		initial={{ opacity: 0 }}
		animate={{ opacity: 1 }}
		className='flex h-80 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 p-8 text-center'
	>
		<BarChart3 className='h-16 w-16 text-gray-400 mb-4' />
		<h3 className='text-xl font-semibold text-gray-800 dark:text-gray-200'>
			No hay datos para {title}
		</h3>
		<p className='text-sm text-gray-500 dark:text-gray-400 mt-2'>
			Prueba a cambiar el rango de fechas o seleccionar otro tanque.
		</p>
	</motion.div>
);

/**
 * @component LoadingState
 * @description Se muestra mientras los datos del gráfico se están cargando.
 */
const LoadingState = () => (
	<div className='h-80 w-full flex items-center justify-center'>
		<div className='w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin'></div>
	</div>
);

// --- COMPONENTE PRINCIPAL ---
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
	const stats = useMemo(() => {
		if (!data || data.length === 0)
			return { min: 0, max: 0, avg: 0, yDomain: [0, 10] };

		const values = data.map((d) => d.value);
		const min = Math.min(...values);
		const max = Math.max(...values);
		const avg = values.reduce((s, v) => s + v, 0) / values.length;
		const range = max - min;
		const padding = range > 0 ? range * 0.2 : 2; // Mayor padding para mejor visualización

		const yDomain: [number, number] = [
			Math.max(0, min - padding),
			max + padding,
		];
		return { min, max, avg, yDomain };
	}, [data]);

	const thresholds = useMemo(() => {
		if (!settings || !settings.thresholds) return null;
		switch (sensorType) {
			case SensorType.TEMPERATURE:
				return settings.thresholds.temperature;
			case SensorType.PH:
				return settings.thresholds.ph;
			case SensorType.OXYGEN:
				return settings.thresholds.oxygen;
			default:
				return null;
		}
	}, [settings, sensorType]);

	const chartTitle = isLive
		? title
		: `Histórico ${title} (${
				dateRange
					? `${format(dateRange.from, 'd MMM')} - ${format(
							dateRange.to,
							'd MMM',
					  )}`
					: ''
		  })`;

	const xAxisFormatter = (tick: string) => {
		const date = new Date(tick);
		if (
			date.getDate() === new Date().getDate() &&
			date.getMonth() === new Date().getMonth()
		) {
			return format(date, 'HH:mm'); // Muestra hora y minuto para hoy
		}
		return format(date, 'd MMM'); // Muestra día y mes para otras fechas
	};

	if (loading) return <LoadingState />;
	if (!data || data.length === 0) return <EmptyState title={title} />;

	// Colores para el tema claro y oscuro
	const gridColor = '#e5e7eb';
	const axisColor = '#6b7280';
	const darkGridColor = '#374151';
	const darkAxisColor = '#9ca3af';

	const lineColor = '#4f46e5'; // Un color de línea consistente
	const colorLow = '#3b82f6';
	const colorOptimal = '#22c55e';
	const colorHigh = '#ef4444';

	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			className='w-full'
		>
			<div className='mb-6'>
				<div className='flex flex-col md:flex-row md:items-center md:justify-between'>
					<div>
						<div className='flex items-center gap-3'>
							<h3 className='text-xl font-bold text-gray-900 dark:text-white'>
								{chartTitle}
							</h3>
							{isLive && (
								<div className='flex items-center gap-2 text-xs text-green-600 dark:text-green-400'>
									<span className='relative flex h-2 w-2'>
										<span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75'></span>
										<span className='relative inline-flex rounded-full h-2 w-2 bg-green-500'></span>
									</span>
									En vivo
								</div>
							)}
						</div>
						<p className='text-sm text-gray-500 dark:text-gray-400'>
							Mostrando {data.length} puntos de datos.
						</p>
					</div>
					<div className='mt-2 md:mt-0'>
						<TrendIndicator data={data} />
					</div>
				</div>
			</div>

			<div className='h-80 w-full'>
				<ResponsiveContainer>
					<AreaChart
						data={data}
						margin={{ top: 5, right: 20, left: -10, bottom: 20 }}
					>
						<defs>
							<linearGradient id='colorGradient' x1='0' y1='0' x2='0' y2='1'>
								<stop
									offset='0%'
									stopColor={colorHigh}
									stopOpacity={0.4}
								/>
								<stop
									offset='50%'
									stopColor={colorOptimal}
									stopOpacity={0.1}
								/>
								<stop
									offset='100%'
									stopColor={colorLow}
									stopOpacity={0.4}
								/>
							</linearGradient>
						</defs>

						<CartesianGrid
							strokeDasharray='3 3'
							className='stroke-gray-200 dark:stroke-gray-700'
						/>
						<XAxis
							dataKey='time'
							tickFormatter={xAxisFormatter}
							className='stroke-gray-600 dark:stroke-gray-400'
							tick={{ fontSize: 12 }}
							dy={10}
							interval='preserveStartEnd'
						/>
						<YAxis
							className='stroke-gray-600 dark:stroke-gray-400'
							tick={{ fontSize: 12 }}
							domain={stats.yDomain}
							label={{
								value: yAxisLabel,
								angle: -90,
								position: 'insideLeft',
								style: {
									fill: 'currentColor',
									fontSize: '14px',
								},
								className: 'fill-gray-600 dark:fill-gray-400',
							}}
						/>
						<Tooltip
							content={<CustomTooltip />}
							cursor={{
								stroke: lineColor,
								strokeWidth: 1.5,
								strokeDasharray: '4 4',
							}}
						/>

						{/* Líneas de umbral */}
						{thresholds && (
							<ReferenceLine
								y={thresholds.max}
								label={{
									value: 'Alto',
									position: 'right',
									className: 'fill-red-500 text-xs',
								}}
								stroke={colorHigh}
								strokeWidth={1.5}
								strokeDasharray='4 4'
							/>
						)}
						{thresholds && (
							<ReferenceLine
								y={thresholds.min}
								label={{
									value: 'Bajo',
									position: 'right',
									className: 'fill-blue-500 text-xs',
								}}
								stroke={colorLow}
								strokeWidth={1.5}
								strokeDasharray='4 4'
							/>
						)}

						{/* Área de color dinámico */}
						<Area
							type='monotone'
							dataKey='value'
							stroke='transparent'
							fill='url(#colorGradient)'
							name={title}
						/>

						{/* Línea principal */}
						<Line
							type='monotone'
							dataKey='value'
							name={title}
							stroke={lineColor}
							strokeWidth={2.5}
							dot={false}
							activeDot={{
								r: 6,
								fill: lineColor,
								stroke: 'white',
								strokeWidth: 2,
							}}
							connectNulls
							animationDuration={1000}
						/>
					</AreaChart>
				</ResponsiveContainer>
			</div>

			<div className='mt-4 grid grid-cols-3 gap-4 text-center text-sm'>
				<div className='p-2 rounded-lg bg-gray-100 dark:bg-gray-700/50'>
					<p className='text-gray-500'>Mínimo</p>
					<p className='font-bold text-lg text-blue-600 dark:text-blue-400'>
						{stats.min.toFixed(2)}
					</p>
				</div>
				<div className='p-2 rounded-lg bg-gray-100 dark:bg-gray-700/50'>
					<p className='text-gray-500'>Promedio</p>
					<p className='font-bold text-lg text-green-600 dark:text-green-400'>
						{stats.avg.toFixed(2)}
					</p>
				</div>
				<div className='p-2 rounded-lg bg-gray-100 dark:bg-gray-700/50'>
					<p className='text-gray-500'>Máximo</p>
					<p className='font-bold text-lg text-purple-600 dark:text-purple-400'>
						{stats.max.toFixed(2)}
					</p>
				</div>
			</div>
		</motion.div>
	);
};