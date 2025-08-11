// frontend/src/components/dashboard/LineChart.tsx
import React from 'react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { ProcessedDataPoint } from '../../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler
);

/**
 * @interface Thresholds
 * @description Define la estructura para los umbrales de cada parámetro.
 */
interface Thresholds {
  temperature: { low: number; high: number };
  ph: { low: number; high: number };
  oxygen: { low: number; high: number };
}

/**
 * @interface LineChartProps
 * @description Propiedades para el componente de gráficos de línea.
 */
interface LineChartProps {
  data: ProcessedDataPoint[];
  thresholds: Thresholds;
  height?: number;
}

/**
 * @component LineChart
 * @description Muestra gráficos de línea separados para cada sensor, marcando visualmente
 * los límites óptimos de forma dinámica según los umbrales recibidos.
 */
export const LineChart: React.FC<LineChartProps> = ({ data, thresholds, height = 300 }) => {
  const labels = data.map(item => format(new Date(item.timestamp), 'HH:mm', { locale: es }));

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const, labels: { color: document.documentElement.classList.contains('dark') ? '#d1d5db' : '#374151', usePointStyle: true, pointStyle: 'circle' } },
      tooltip: { backgroundColor: document.documentElement.classList.contains('dark') ? '#374151' : '#ffffff', titleColor: document.documentElement.classList.contains('dark') ? '#ffffff' : '#374151', bodyColor: document.documentElement.classList.contains('dark') ? '#d1d5db' : '#6b7280', borderColor: document.documentElement.classList.contains('dark') ? '#4b5563' : '#e5e7eb', borderWidth: 1 },
    },
    scales: {
      x: { grid: { color: document.documentElement.classList.contains('dark') ? '#374151' : '#f3f4f6' }, ticks: { color: document.documentElement.classList.contains('dark') ? '#9ca3af' : '#6b7280' } },
      y: { grid: { color: document.documentElement.classList.contains('dark') ? '#374151' : '#f3f4f6' }, ticks: { color: document.documentElement.classList.contains('dark') ? '#9ca3af' : '#6b7280' } },
    },
  };

  const createChartData = (key: 'temperature' | 'ph' | 'oxygen', label: string, color: string) => ({
    labels,
    datasets: [
      { label: `Actual`, data: data.map(d => d[key]), borderColor: color, backgroundColor: `${color}20`, tension: 0.4, fill: false, pointBackgroundColor: color, pointBorderColor: '#ffffff', pointBorderWidth: 2, pointRadius: 4 },
      { label: 'Zona Óptima', data: new Array(data.length).fill(thresholds[key].high), borderColor: 'transparent', backgroundColor: '#10B98120', tension: 0, fill: '+1', pointRadius: 0 },
      { label: '', data: new Array(data.length).fill(thresholds[key].low), borderColor: 'transparent', backgroundColor: 'transparent', tension: 0, fill: false, pointRadius: 0 },
    ],
  });

  return (
    <div className="space-y-6">
      {/* Gráfico de Temperatura */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Temperatura (°C)</h3>
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <div className="w-3 h-3 bg-green-500 rounded-full opacity-30"></div>
            <span>Zona Óptima: {thresholds.temperature.low}°C - {thresholds.temperature.high}°C</span>
          </div>
        </div>
        <div style={{ height: `${height}px` }}><Line data={createChartData('temperature', 'Temperatura', '#3B82F6')} options={commonOptions} /></div>
      </div>
      {/* Gráfico de pH */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Nivel de pH</h3>
           <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <div className="w-3 h-3 bg-green-500 rounded-full opacity-30"></div>
            <span>Zona Óptima: {thresholds.ph.low} - {thresholds.ph.high}</span>
          </div>
        </div>
        <div style={{ height: `${height}px` }}><Line data={createChartData('ph', 'pH', '#10B981')} options={commonOptions} /></div>
      </div>
      {/* Gráfico de Oxígeno */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Oxígeno Disuelto (mg/L)</h3>
           <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <div className="w-3 h-3 bg-green-500 rounded-full opacity-30"></div>
            <span>Zona Óptima: {thresholds.oxygen.low} - {thresholds.oxygen.high} mg/L</span>
          </div>
        </div>
        <div style={{ height: `${height}px` }}><Line data={createChartData('oxygen', 'Oxígeno', '#F97316')} options={commonOptions} /></div>
      </div>
    </div>
  );
};