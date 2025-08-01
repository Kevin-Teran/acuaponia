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
import { ProcessedDataPoint } from '../../types';
import { Card } from '../common/Card';

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
  data: ProcessedDataPoint[];
  labels: string[];
  height?: number;
}

/**
 * Tarjeta para mostrar cuando un sensor no tiene datos en el período seleccionado.
 */
const InactiveSensorCard: React.FC<{ title: string }> = ({ title }) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 flex flex-col justify-center items-center h-[450px]">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
        <div className="text-center text-gray-500 dark:text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 11-12.728 0M12 12h.01M12 9v.01" />
            </svg>
            <p className="mt-2 text-sm">Sensor inactivo o sin datos para este período.</p>
        </div>
    </div>
);

/**
 * El componente de gráfico reutilizable y dividido por parámetro.
 */
export const LineChart: React.FC<LineChartProps> = ({ data, labels, height = 350 }) => {
  const limits = {
    temperature: { min: 20, max: 28, optimal: { min: 22, max: 26 } },
    ph: { min: 6.0, max: 8.5, optimal: { min: 6.8, max: 7.6 } },
    oxygen: { min: 4, max: 12, optimal: { min: 6, max: 10 } }
  };

  const optimalColor = '#10B98133'; // Verde SENA con transparencia
  const limitColor = '#FF671F';   // Naranja SENA

  const createChartOptions = (paramKey: keyof typeof limits): any => {
    const paramLimits = limits[paramKey];
    const range = paramLimits.max - paramLimits.min;
    return {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { type: 'category', labels, grid: { color: document.documentElement.classList.contains('dark') ? '#374151' : '#f3f4f6' }, ticks: { color: document.documentElement.classList.contains('dark') ? '#9ca3af' : '#6b7280', autoSkip: true, maxTicksLimit: 10 } },
          y: { grid: { color: document.documentElement.classList.contains('dark') ? '#374151' : '#f3f4f6' }, ticks: { color: document.documentElement.classList.contains('dark') ? '#9ca3af' : '#6b7280' }, suggestedMin: paramLimits.min - range * 0.2, suggestedMax: paramLimits.max + range * 0.2 }
        },
        plugins: {
          legend: { display: false },
          tooltip: { backgroundColor: document.documentElement.classList.contains('dark') ? '#374151' : '#ffffff', titleColor: document.documentElement.classList.contains('dark') ? '#ffffff' : '#374151', bodyColor: document.documentElement.classList.contains('dark') ? '#d1d5db' : '#6b7280', borderColor: document.documentElement.classList.contains('dark') ? '#4b5563' : '#e5e7eb', borderWidth: 1 }
        }
      };
  };

  const createChartDatasets = (param: 'temperature' | 'ph' | 'oxygen', color: string) => {
    const paramLimits = limits[param];
    return [
        // La línea de datos principal, sin fondo de color (fill: false)
        { label: 'Valor', data: data.map(d => d[param]), borderColor: color, tension: 0.4, pointRadius: 2, pointBackgroundColor: color, fill: false, spanGaps: true, order: 2 },
        // Dataset para dibujar la zona óptima sombreada
        { data: new Array(labels.length).fill(paramLimits.optimal.max), pointRadius: 0, fill: { target: { value: paramLimits.optimal.min }, above: optimalColor }, order: 1 },
        // Datasets para dibujar las líneas de límite (no óptimo)
        { data: new Array(labels.length).fill(paramLimits.max), borderColor: limitColor, borderDash: [5, 5], borderWidth: 1.5, pointRadius: 0 },
        { data: new Array(labels.length).fill(paramLimits.min), borderColor: limitColor, borderDash: [5, 5], borderWidth: 1.5, pointRadius: 0 }
      ];
  };
  
  const ChartCard = ({ title, chartData, options, optimalLimits, unit }: any) => (
      <Card className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          <div className="flex items-center space-x-4 text-xs sm:text-sm">
            <div className="flex items-center space-x-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: optimalColor }}></div><span className="text-gray-600 dark:text-gray-400">Óptima: {optimalLimits.min} - {optimalLimits.max}{unit}</span></div>
            <div className="flex items-center space-x-2"><div className="w-3 h-0.5 border-t-2 border-dashed" style={{ borderColor: limitColor, width: '0.75rem' }}></div><span className="text-gray-600 dark:text-gray-400">Límites</span></div>
          </div>
        </div>
        <div style={{ height: `${height}px` }}><Line data={chartData} options={options} /></div>
      </Card>
  );
  
  if (data.length === 0) {
      return <Card><p className="text-center text-gray-500 py-10">No se encontraron datos para el período o estanque seleccionado.</p></Card>;
  }
  
  const isTemperatureDataValid = data.some(d => d.temperature != null);
  const isPhDataValid = data.some(d => d.ph != null);
  const isOxygenDataValid = data.some(d => d.oxygen != null);

  return (
    <div className="space-y-6">
      {isTemperatureDataValid ? <ChartCard title="Temperatura (°C)" chartData={{ labels, datasets: createChartDatasets('temperature', '#3B82F6') }} options={createChartOptions('temperature')} optimalLimits={limits.temperature.optimal} unit="°C" /> : <InactiveSensorCard title="Temperatura (°C)" />}
      {isPhDataValid ? <ChartCard title="Nivel de pH" chartData={{ labels, datasets: createChartDatasets('ph', '#10B981') }} options={createChartOptions('ph')} optimalLimits={limits.ph.optimal} unit="" /> : <InactiveSensorCard title="Nivel de pH" />}
      {isOxygenDataValid ? <ChartCard title="Oxígeno Disuelto (mg/L)" chartData={{ labels, datasets: createChartDatasets('oxygen', '#F97316') }} options={createChartOptions('oxygen')} optimalLimits={limits.oxygen.optimal} unit=" mg/L" /> : <InactiveSensorCard title="Oxígeno Disuelto (mg/L)" />}
    </div>
  );
};