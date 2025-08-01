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
  ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { ProcessedDataPoint } from '../../types';
import { Card } from '../common/Card';
import { Thermometer, Droplets, Wind, WifiOff } from 'lucide-react';
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

/**
 * @typedef {object} Thresholds
 * @property {{min: number, max: number}} temperature - Umbrales para temperatura.
 * @property {{min: number, max: number}} ph - Umbrales para pH.
 * @property {{min: number, max: number}} oxygen - Umbrales para oxígeno.
 */

/**
 * @typedef {object} LineChartProps
 * @property {ProcessedDataPoint[]} data - Array de puntos de datos procesados y muestreados para graficar.
 * @property {string[]} labels - Array de etiquetas para el eje X, correspondientes a los datos muestreados.
 * @property {Thresholds} [thresholds] - Objeto con los umbrales de alerta para dibujar las zonas óptimas.
 * @property {number} [height=350] - Altura del contenedor del gráfico en píxeles.
 */
interface LineChartProps {
  data: ProcessedDataPoint[];
  labels: string[];
  thresholds?: any;
  height?: number;
}

/**
 * @component InactiveSensorCard
 * @description Tarjeta informativa que se muestra cuando un sensor no tiene datos para el período seleccionado.
 * @param {{title: string, icon: React.ElementType}} props - Propiedades del componente.
 * @returns {JSX.Element}
 */
const InactiveSensorCard: React.FC<{ title: string, icon: React.ElementType }> = ({ title, icon: Icon }) => (
    <Card className="flex flex-col justify-center items-center h-full min-h-[300px]">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
        <div className="text-center text-gray-500 dark:text-gray-400">
            <Icon className="mx-auto h-12 w-12 text-gray-400" strokeWidth={1.5} />
            <p className="mt-2 text-sm">Sensor inactivo o sin datos para este período.</p>
        </div>
    </Card>
);

/**
 * @component LineChart
 * @description Componente de gráfico de línea que muestra la tendencia de los sensores.
 * Se divide en gráficos individuales para cada parámetro, manejando dinámicamente la
 * visualización basada en la disponibilidad de datos y los umbrales de configuración.
 * @param {LineChartProps} props - Propiedades para configurar el gráfico.
 * @returns {JSX.Element}
 */
export const LineChart: React.FC<LineChartProps> = ({ data, labels, thresholds, height = 350 }) => {
  
  const defaultThresholds = {
    temperature: { min: 22, max: 26 },
    ph: { min: 6.8, max: 7.6 },
    oxygen: { min: 6, max: 10 }
  };

  const finalThresholds = thresholds || defaultThresholds;

  const optimalColor = 'rgba(57, 169, 0, 0.2)'; // Verde SENA con transparencia

  /**
   * @function createChartOptions
   * @description Crea las opciones de configuración para un gráfico de Chart.js.
   * @returns {ChartOptions<'line'>} Opciones del gráfico.
   */
  const createChartOptions = (): ChartOptions<'line'> => {
    return {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { 
            labels, 
            grid: { color: document.documentElement.classList.contains('dark') ? '#374151' : '#f3f4f6' }, 
            ticks: { color: document.documentElement.classList.contains('dark') ? '#9ca3af' : '#6b7280', autoSkip: true, maxTicksLimit: 12 } 
          },
          y: { 
            grid: { color: document.documentElement.classList.contains('dark') ? '#374151' : '#f3f4f6' }, 
            ticks: { color: document.documentElement.classList.contains('dark') ? '#9ca3af' : '#6b7280' }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: { 
            backgroundColor: document.documentElement.classList.contains('dark') ? '#374151' : '#ffffff', 
            titleColor: document.documentElement.classList.contains('dark') ? '#ffffff' : '#374151', 
            bodyColor: document.documentElement.classList.contains('dark') ? '#d1d5db' : '#6b7280', 
            borderColor: document.documentElement.classList.contains('dark') ? '#4b5563' : '#e5e7eb', 
            borderWidth: 1,
            callbacks: {
              title: (tooltipItems) => {
                const index = tooltipItems[0].dataIndex;
                const timestamp = data[index]?.timestamp;
                return timestamp ? format(new Date(timestamp), 'dd MMM yyyy, HH:mm', { locale: es }) : '';
              },
              label: (context) => {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.parsed.y !== null) {
                  label += `${context.parsed.y.toFixed(2)}`;
                }
                return label;
              }
            }
          }
        }
      };
  };

  /**
   * @function createChartDatasets
   * @description Crea los datasets para un gráfico, incluyendo la línea de datos y las zonas de umbrales.
   * @param {'temperature' | 'ph' | 'oxygen'} param - El tipo de sensor.
   * @param {string} color - El color principal para la línea del gráfico.
   * @returns {any[]} Array de datasets para Chart.js.
   */
  const createChartDatasets = (param: 'temperature' | 'ph' | 'oxygen', color: string) => {
    const paramLimits = finalThresholds[param];
    if (!paramLimits) return []; // Seguridad si los umbrales no están definidos
    
    return [
        { 
          label: param.charAt(0).toUpperCase() + param.slice(1), 
          data: data.map(d => d[param]), 
          borderColor: color, 
          tension: 0.4, 
          pointRadius: 2, 
          pointBackgroundColor: color, 
          fill: false, 
          spanGaps: true // Conecta puntos aunque haya datos nulos intermedios
        },
        { 
          label: 'Zona Óptima',
          data: new Array(labels.length).fill(paramLimits.max), 
          pointRadius: 0, 
          fill: { target: { value: paramLimits.min }, above: optimalColor },
          borderColor: 'transparent',
          backgroundColor: optimalColor
        }
      ];
  };
  
  const ChartCard = ({ title, chartData, options, thresholds, unit }: any) => (
      <Card className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          {thresholds && (
            <div className="flex items-center space-x-2 text-xs sm:text-sm">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: optimalColor }}></div>
              <span className="text-gray-600 dark:text-gray-400">Óptima: {thresholds.min} - {thresholds.max}{unit}</span>
            </div>
          )}
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
  const hasAnyData = isTemperatureDataValid || isPhDataValid || isOxygenDataValid;

  if (!hasAnyData) {
    return <InactiveSensorCard title="Sin Datos de Sensores" icon={WifiOff} />;
  }

  return (
    <div className="space-y-6">
      {isTemperatureDataValid ? <ChartCard title="Temperatura (°C)" chartData={{ labels, datasets: createChartDatasets('temperature', '#3B82F6') }} options={createChartOptions()} thresholds={finalThresholds.temperature} unit="°C" /> : <InactiveSensorCard title="Temperatura (°C)" icon={Thermometer} />}
      {isPhDataValid ? <ChartCard title="Nivel de pH" chartData={{ labels, datasets: createChartDatasets('ph', '#10B981') }} options={createChartOptions()} thresholds={finalThresholds.ph} unit="" /> : <InactiveSensorCard title="Nivel de pH" icon={Droplets} />}
      {isOxygenDataValid ? <ChartCard title="Oxígeno Disuelto (mg/L)" chartData={{ labels, datasets: createChartDatasets('oxygen', '#F97316') }} options={createChartOptions()} thresholds={finalThresholds.oxygen} unit=" mg/L" /> : <InactiveSensorCard title="Oxígeno Disuelto (mg/L)" icon={Wind} />}
    </div>
  );
};
