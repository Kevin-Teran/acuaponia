import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { SensorData } from '../../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface LineChartProps {
  data: SensorData[];
  height?: number;
}

/**
 * Componente LineChart que muestra tres gráficos separados para cada sensor
 * con límites óptimos marcados visualmente
 */
export const LineChart: React.FC<LineChartProps> = ({ data, height = 300 }) => {
  // Definir límites óptimos para cada parámetro
  const limits = {
    temperature: { min: 20, max: 28, optimal: { min: 22, max: 26 } },
    ph: { min: 6.0, max: 8.5, optimal: { min: 6.8, max: 7.6 } },
    oxygen: { min: 4, max: 12, optimal: { min: 6, max: 10 } }
  };

  // Preparar etiquetas de tiempo
  const labels = data.map(item => 
    format(new Date(item.timestamp), 'HH:mm', { locale: es })
  );

  // Configuración común para los gráficos
  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: document.documentElement.classList.contains('dark') ? '#d1d5db' : '#374151',
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      tooltip: {
        backgroundColor: document.documentElement.classList.contains('dark') ? '#374151' : '#ffffff',
        titleColor: document.documentElement.classList.contains('dark') ? '#ffffff' : '#374151',
        bodyColor: document.documentElement.classList.contains('dark') ? '#d1d5db' : '#6b7280',
        borderColor: document.documentElement.classList.contains('dark') ? '#4b5563' : '#e5e7eb',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        grid: {
          color: document.documentElement.classList.contains('dark') ? '#374151' : '#f3f4f6',
        },
        ticks: {
          color: document.documentElement.classList.contains('dark') ? '#9ca3af' : '#6b7280',
        },
      },
      y: {
        grid: {
          color: document.documentElement.classList.contains('dark') ? '#374151' : '#f3f4f6',
        },
        ticks: {
          color: document.documentElement.classList.contains('dark') ? '#9ca3af' : '#6b7280',
        },
      },
    },
  };

  // Crear dataset para temperatura
  const temperatureData = {
    labels,
    datasets: [
      {
        label: 'Temperatura Actual',
        data: data.map(d => d.temperature),
        borderColor: '#3B82F6',
        backgroundColor: '#3B82F620',
        tension: 0.4,
        fill: false,
        pointBackgroundColor: '#3B82F6',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
      },
      {
        label: 'Límite Mínimo',
        data: new Array(data.length).fill(limits.temperature.min),
        borderColor: '#EF4444',
        backgroundColor: 'transparent',
        borderDash: [5, 5],
        tension: 0,
        fill: false,
        pointRadius: 0,
      },
      {
        label: 'Límite Máximo',
        data: new Array(data.length).fill(limits.temperature.max),
        borderColor: '#EF4444',
        backgroundColor: 'transparent',
        borderDash: [5, 5],
        tension: 0,
        fill: false,
        pointRadius: 0,
      },
      {
        label: 'Zona Óptima',
        data: new Array(data.length).fill(limits.temperature.optimal.max),
        borderColor: '#10B98120',
        backgroundColor: '#10B98120',
        tension: 0,
        fill: '+1',
        pointRadius: 0,
      },
      {
        label: '',
        data: new Array(data.length).fill(limits.temperature.optimal.min),
        borderColor: 'transparent',
        backgroundColor: 'transparent',
        tension: 0,
        fill: false,
        pointRadius: 0,
      },
    ],
  };

  // Crear dataset para pH
  const phData = {
    labels,
    datasets: [
      {
        label: 'pH Actual',
        data: data.map(d => d.ph),
        borderColor: '#10B981',
        backgroundColor: '#10B98120',
        tension: 0.4,
        fill: false,
        pointBackgroundColor: '#10B981',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
      },
      {
        label: 'Límite Mínimo',
        data: new Array(data.length).fill(limits.ph.min),
        borderColor: '#EF4444',
        backgroundColor: 'transparent',
        borderDash: [5, 5],
        tension: 0,
        fill: false,
        pointRadius: 0,
      },
      {
        label: 'Límite Máximo',
        data: new Array(data.length).fill(limits.ph.max),
        borderColor: '#EF4444',
        backgroundColor: 'transparent',
        borderDash: [5, 5],
        tension: 0,
        fill: false,
        pointRadius: 0,
      },
      {
        label: 'Zona Óptima',
        data: new Array(data.length).fill(limits.ph.optimal.max),
        borderColor: '#10B98120',
        backgroundColor: '#10B98120',
        tension: 0,
        fill: '+1',
        pointRadius: 0,
      },
      {
        label: '',
        data: new Array(data.length).fill(limits.ph.optimal.min),
        borderColor: 'transparent',
        backgroundColor: 'transparent',
        tension: 0,
        fill: false,
        pointRadius: 0,
      },
    ],
  };

  // Crear dataset para oxígeno
  const oxygenData = {
    labels,
    datasets: [
      {
        label: 'Oxígeno Actual',
        data: data.map(d => d.oxygen),
        borderColor: '#F97316',
        backgroundColor: '#F9731620',
        tension: 0.4,
        fill: false,
        pointBackgroundColor: '#F97316',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
      },
      {
        label: 'Límite Mínimo',
        data: new Array(data.length).fill(limits.oxygen.min),
        borderColor: '#EF4444',
        backgroundColor: 'transparent',
        borderDash: [5, 5],
        tension: 0,
        fill: false,
        pointRadius: 0,
      },
      {
        label: 'Límite Máximo',
        data: new Array(data.length).fill(limits.oxygen.max),
        borderColor: '#EF4444',
        backgroundColor: 'transparent',
        borderDash: [5, 5],
        tension: 0,
        fill: false,
        pointRadius: 0,
      },
      {
        label: 'Zona Óptima',
        data: new Array(data.length).fill(limits.oxygen.optimal.max),
        borderColor: '#10B98120',
        backgroundColor: '#10B98120',
        tension: 0,
        fill: '+1',
        pointRadius: 0,
      },
      {
        label: '',
        data: new Array(data.length).fill(limits.oxygen.optimal.min),
        borderColor: 'transparent',
        backgroundColor: 'transparent',
        tension: 0,
        fill: false,
        pointRadius: 0,
      },
    ],
  };

  return (
    <div className="space-y-6">
      {/* Gráfico de Temperatura */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Temperatura (°C)
          </h3>
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full opacity-30"></div>
              <span className="text-gray-600 dark:text-gray-400">Zona Óptima: {limits.temperature.optimal.min}°C - {limits.temperature.optimal.max}°C</span>
            </div>
          </div>
        </div>
        <div style={{ height: `${height}px` }}>
          <Line data={temperatureData} options={commonOptions} />
        </div>
      </div>

      {/* Gráfico de pH */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Nivel de pH
          </h3>
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full opacity-30"></div>
              <span className="text-gray-600 dark:text-gray-400">Zona Óptima: {limits.ph.optimal.min} - {limits.ph.optimal.max}</span>
            </div>
          </div>
        </div>
        <div style={{ height: `${height}px` }}>
          <Line data={phData} options={commonOptions} />
        </div>
      </div>

      {/* Gráfico de Oxígeno */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Oxígeno Disuelto (mg/L)
          </h3>
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full opacity-30"></div>
              <span className="text-gray-600 dark:text-gray-400">Zona Óptima: {limits.oxygen.optimal.min} - {limits.oxygen.optimal.max} mg/L</span>
            </div>
          </div>
        </div>
        <div style={{ height: `${height}px` }}>
          <Line data={oxygenData} options={commonOptions} />
        </div>
      </div>
    </div>
  );
};