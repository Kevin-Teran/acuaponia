/**
 * @file LineChart.tsx
 * @route frontend/src/components/dashboard/
 * @description Componente de gráfico de líneas con actualización en tiempo real,
 * animaciones fluidas y diseño mejorado.
 * @author Kevin Mariano & Gemini
 * @version 3.0.0
 * @since 1.0.0
 * @copyright SENA 2025
 */

'use client';

import React, { useMemo, useState, useEffect } from 'react';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';

// --- Interfaces (sin cambios) ---
interface ChartDataPoint {
  time: string;
  value: number;
}
interface LineChartProps {
  data: ChartDataPoint[];
  title: string;
  yAxisLabel: string;
  lineColor: string;
  loading: boolean;
}

// --- Sub-componentes (con pequeñas mejoras de estilo) ---
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-3 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl"
      >
        <p className="font-semibold text-gray-900 dark:text-white mb-1 text-sm">{label}</p>
        <p className="text-sm flex items-center" style={{ color: payload[0].color }}>
          <span className="font-bold">{`${payload[0].name}: ${payload[0].value.toFixed(2)}`}</span>
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
    const percentChange = first === 0 ? 0 : (diff / first) * 100;
    
    if (Math.abs(percentChange) < 1) return { Icon: Minus, color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-700', text: 'Estable' };
    if (diff > 0) return { Icon: TrendingUp, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30', text: `+${percentChange.toFixed(1)}%` };
    return { Icon: TrendingDown, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30', text: `${percentChange.toFixed(1)}%` };
  }, [data]);

  if (!trend) return null;
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${trend.bg} ${trend.color}`}>
      <trend.Icon className="w-4 h-4" />
      <span>{trend.text}</span>
    </div>
  );
};

const EmptyState = ({ title }: { title: string }) => (
  <motion.div 
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="flex h-80 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 p-8 text-center"
  >
    <BarChart3 className="h-16 w-16 text-gray-400 mb-4" />
    <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">No hay datos para {title}</h3>
    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Prueba a cambiar el rango de fechas o seleccionar otro tanque.</p>
  </motion.div>
);

const LoadingState = () => (
    <div className="h-80 w-full flex items-center justify-center"><div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>
);


// --- Componente Principal ---
export const LineChart: React.FC<LineChartProps> = ({ data: initialData, title, yAxisLabel, lineColor, loading }) => {
  const [chartData, setChartData] = useState(initialData);

  // ✅ 1. ACTUALIZACIÓN EN TIEMPO REAL
  // Este efecto simula la llegada de nuevos datos cada 5 segundos.
  // En una aplicación real, aquí conectarías tu WebSocket (socket.io) o cliente MQTT.
  useEffect(() => {
    // Sincroniza el estado si los datos iniciales cambian (ej. al cambiar de tanque)
    setChartData(initialData);

    const interval = setInterval(() => {
      setChartData(prevData => {
        if (prevData.length === 0) return prevData;

        // Simular un nuevo punto de dato
        const lastPoint = prevData[prevData.length - 1];
        const newTime = new Date();
        const newValue = lastPoint.value + (Math.random() - 0.5) * 0.2; // Pequeña variación

        const newDataPoint = {
          time: `${String(newTime.getHours()).padStart(2, '0')}:${String(newTime.getMinutes()).padStart(2, '0')}`,
          value: newValue,
        };

        // Mantener un máximo de 50 puntos para que el gráfico no se sature
        const updatedData = [...prevData, newDataPoint];
        if (updatedData.length > 50) {
          updatedData.shift(); // Elimina el punto más antiguo
        }
        return updatedData;
      });
    }, 5000); // Actualiza cada 5 segundos

    return () => clearInterval(interval); // Limpia el intervalo al desmontar el componente
  }, [initialData]);


  const stats = useMemo(() => {
    if (!chartData || chartData.length === 0) return { min: 0, max: 0, avg: 0 };
    const values = chartData.map(d => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((s, v) => s + v, 0) / values.length;
    const range = max - min;
    const padding = range > 0 ? range * 0.15 : 1;
    const yDomain: [number, number] = [Math.max(0, min - padding), max + padding];
    return { min, max, avg, yDomain };
  }, [chartData]);
  
  if (loading) return <LoadingState />;
  if (!chartData || chartData.length === 0) return <EmptyState title={title} />;

  const gridColor = '#e5e7eb';
  const axisColor = '#6b7280';

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full"
    >
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h3>
              {/* ✅ 3. INDICADOR "EN VIVO" */}
              <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                En vivo
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Mostrando los últimos {chartData.length} puntos de datos.</p>
          </div>
          <div className="mt-2 md:mt-0">
            <TrendIndicator data={chartData} />
          </div>
        </div>
      </div>

      <div className="h-80 w-full">
        <ResponsiveContainer>
          <RechartsLineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} strokeOpacity={0.3} />
            <XAxis dataKey="time" stroke={axisColor} tick={{ fontSize: 12 }} dy={10} />
            <YAxis
              stroke={axisColor}
              tick={{ fontSize: 12 }}
              domain={stats.yDomain}
              label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', style: { fill: axisColor, fontSize: '14px' } }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: lineColor, strokeWidth: 1.5, strokeDasharray: '4 4' }}/>
            <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '20px' }} />
            <Line
              type="monotone"
              dataKey="value"
              name={title}
              stroke={lineColor}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 6, fill: lineColor, stroke: 'white', strokeWidth: 2 }}
              connectNulls
              // ✅ 2. ANIMACIÓN DE ENTRADA
              animationDuration={1500}
            />
          </RechartsLineChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-4 grid grid-cols-3 gap-4 text-center text-sm">
        <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700/50">
          <p className="text-gray-500">Mínimo</p>
          <p className="font-bold text-lg text-blue-600 dark:text-blue-400">{stats.min.toFixed(2)}</p>
        </div>
        <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700/50">
          <p className="text-gray-500">Promedio</p>
          <p className="font-bold text-lg text-green-600 dark:text-green-400">{stats.avg.toFixed(2)}</p>
        </div>
        <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700/50">
          <p className="text-gray-500">Máximo</p>
          <p className="font-bold text-lg text-purple-600 dark:text-purple-400">{stats.max.toFixed(2)}</p>
        </div>
      </div>
    </motion.div>
  );
};