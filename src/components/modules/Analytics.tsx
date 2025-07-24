import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Activity,
  AlertTriangle,
  CheckCircle,
  Info,
  Calendar,
  Filter
} from 'lucide-react';
import { Card } from '../common/Card';
import { useSensorData } from '../../hooks/useSensorData';
import { Bar, Line, Scatter } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export const Analytics: React.FC = () => {
  const { data } = useSensorData();
  const [timeRange, setTimeRange] = useState('7d');
  const [selectedMetric, setSelectedMetric] = useState('all');

  // Análisis estadístico avanzado
  const calculateAdvancedStats = () => {
    if (data.length === 0) return null;

    const temps = data.map(d => d.temperature);
    const phs = data.map(d => d.ph);
    const oxygens = data.map(d => d.oxygen);

    const calculateStats = (values: number[]) => {
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);
      const sorted = [...values].sort((a, b) => a - b);
      const median = sorted.length % 2 === 0 
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];
      
      return {
        mean,
        median,
        stdDev,
        variance,
        min: Math.min(...values),
        max: Math.max(...values),
        range: Math.max(...values) - Math.min(...values),
        cv: (stdDev / mean) * 100 // Coeficiente de variación
      };
    };

    return {
      temperature: calculateStats(temps),
      ph: calculateStats(phs),
      oxygen: calculateStats(oxygens),
      correlations: {
        tempPh: calculateCorrelation(temps, phs),
        tempOxygen: calculateCorrelation(temps, oxygens),
        phOxygen: calculateCorrelation(phs, oxygens)
      }
    };
  };

  const calculateCorrelation = (x: number[], y: number[]) => {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

    const correlation = (n * sumXY - sumX * sumY) / 
      Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return isNaN(correlation) ? 0 : correlation;
  };

  // Detección de anomalías
  const detectAnomalies = () => {
    const stats = calculateAdvancedStats();
    if (!stats) return [];

    const anomalies = [];
    
    data.forEach((item, index) => {
      // Temperatura
      if (Math.abs(item.temperature - stats.temperature.mean) > 2 * stats.temperature.stdDev) {
        anomalies.push({
          timestamp: item.timestamp,
          parameter: 'Temperatura',
          value: item.temperature,
          expected: stats.temperature.mean,
          severity: Math.abs(item.temperature - stats.temperature.mean) > 3 * stats.temperature.stdDev ? 'alta' : 'media'
        });
      }

      // pH
      if (Math.abs(item.ph - stats.ph.mean) > 2 * stats.ph.stdDev) {
        anomalies.push({
          timestamp: item.timestamp,
          parameter: 'pH',
          value: item.ph,
          expected: stats.ph.mean,
          severity: Math.abs(item.ph - stats.ph.mean) > 3 * stats.ph.stdDev ? 'alta' : 'media'
        });
      }

      // Oxígeno
      if (Math.abs(item.oxygen - stats.oxygen.mean) > 2 * stats.oxygen.stdDev) {
        anomalies.push({
          timestamp: item.timestamp,
          parameter: 'Oxígeno',
          value: item.oxygen,
          expected: stats.oxygen.mean,
          severity: Math.abs(item.oxygen - stats.oxygen.mean) > 3 * stats.oxygen.stdDev ? 'alta' : 'media'
        });
      }
    });

    return anomalies.slice(-10); // Últimas 10 anomalías
  };

  const stats = calculateAdvancedStats();
  const anomalies = detectAnomalies();

  // Gráfico de distribución
  const createDistributionChart = () => {
    if (!stats) return null;

    const bins = 10;
    const createHistogram = (values: number[], label: string, color: string) => {
      const min = Math.min(...values);
      const max = Math.max(...values);
      const binWidth = (max - min) / bins;
      const histogram = new Array(bins).fill(0);
      
      values.forEach(value => {
        const binIndex = Math.min(Math.floor((value - min) / binWidth), bins - 1);
        histogram[binIndex]++;
      });

      return {
        label,
        data: histogram,
        backgroundColor: color + '80',
        borderColor: color,
        borderWidth: 1
      };
    };

    const temps = data.map(d => d.temperature);
    const phs = data.map(d => d.ph);
    const oxygens = data.map(d => d.oxygen);

    return {
      labels: Array.from({length: bins}, (_, i) => `Bin ${i + 1}`),
      datasets: [
        createHistogram(temps, 'Temperatura', '#FF671F'),
        createHistogram(phs, 'pH', '#39A900'),
        createHistogram(oxygens, 'Oxígeno', '#007BBF')
      ]
    };
  };

  // Gráfico de correlación
  const createCorrelationChart = () => {
    if (!data.length) return null;

    return {
      datasets: [
        {
          label: 'Temperatura vs pH',
          data: data.map(d => ({ x: d.temperature, y: d.ph })),
          backgroundColor: '#FF671F80',
          borderColor: '#FF671F',
        },
        {
          label: 'Temperatura vs Oxígeno',
          data: data.map(d => ({ x: d.temperature, y: d.oxygen })),
          backgroundColor: '#39A90080',
          borderColor: '#39A900',
        }
      ]
    };
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: document.documentElement.classList.contains('dark') ? '#d1d5db' : '#374151',
        },
      },
      tooltip: {
        backgroundColor: document.documentElement.classList.contains('dark') ? '#374151' : '#ffffff',
        titleColor: document.documentElement.classList.contains('dark') ? '#ffffff' : '#374151',
        bodyColor: document.documentElement.classList.contains('dark') ? '#d1d5db' : '#6b7280',
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Análisis Estadístico Avanzado
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Correlaciones, distribuciones y detección de anomalías
          </p>
        </div>
        
        <div className="flex space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="1d">Último día</option>
            <option value="7d">Última semana</option>
            <option value="30d">Último mes</option>
          </select>
        </div>
      </div>

      {/* Estadísticas descriptivas */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card title="Temperatura - Estadísticas" className="border-l-4 border-orange-500">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Media:</span>
                  <span className="font-semibold text-gray-900 dark:text-white ml-2">
                    {stats.temperature.mean.toFixed(2)}°C
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Mediana:</span>
                  <span className="font-semibold text-gray-900 dark:text-white ml-2">
                    {stats.temperature.median.toFixed(2)}°C
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Desv. Est:</span>
                  <span className="font-semibold text-gray-900 dark:text-white ml-2">
                    {stats.temperature.stdDev.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Coef. Var:</span>
                  <span className="font-semibold text-gray-900 dark:text-white ml-2">
                    {stats.temperature.cv.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </Card>

          <Card title="pH - Estadísticas" className="border-l-4 border-green-500">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Media:</span>
                  <span className="font-semibold text-gray-900 dark:text-white ml-2">
                    {stats.ph.mean.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Mediana:</span>
                  <span className="font-semibold text-gray-900 dark:text-white ml-2">
                    {stats.ph.median.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Desv. Est:</span>
                  <span className="font-semibold text-gray-900 dark:text-white ml-2">
                    {stats.ph.stdDev.toFixed(3)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Coef. Var:</span>
                  <span className="font-semibold text-gray-900 dark:text-white ml-2">
                    {stats.ph.cv.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </Card>

          <Card title="Oxígeno - Estadísticas" className="border-l-4 border-blue-500">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Media:</span>
                  <span className="font-semibold text-gray-900 dark:text-white ml-2">
                    {stats.oxygen.mean.toFixed(2)} mg/L
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Mediana:</span>
                  <span className="font-semibold text-gray-900 dark:text-white ml-2">
                    {stats.oxygen.median.toFixed(2)} mg/L
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Desv. Est:</span>
                  <span className="font-semibold text-gray-900 dark:text-white ml-2">
                    {stats.oxygen.stdDev.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Coef. Var:</span>
                  <span className="font-semibold text-gray-900 dark:text-white ml-2">
                    {stats.oxygen.cv.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Matriz de correlación */}
      {stats && (
        <Card title="Matriz de Correlación" subtitle="Relaciones entre variables (-1 a 1)">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.correlations.tempPh.toFixed(3)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Temperatura ↔ pH
              </div>
              <div className={`text-xs mt-1 ${Math.abs(stats.correlations.tempPh) > 0.7 ? 'text-red-600' : Math.abs(stats.correlations.tempPh) > 0.3 ? 'text-orange-600' : 'text-green-600'}`}>
                {Math.abs(stats.correlations.tempPh) > 0.7 ? 'Fuerte' : Math.abs(stats.correlations.tempPh) > 0.3 ? 'Moderada' : 'Débil'}
              </div>
            </div>
            
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.correlations.tempOxygen.toFixed(3)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Temperatura ↔ Oxígeno
              </div>
              <div className={`text-xs mt-1 ${Math.abs(stats.correlations.tempOxygen) > 0.7 ? 'text-red-600' : Math.abs(stats.correlations.tempOxygen) > 0.3 ? 'text-orange-600' : 'text-green-600'}`}>
                {Math.abs(stats.correlations.tempOxygen) > 0.7 ? 'Fuerte' : Math.abs(stats.correlations.tempOxygen) > 0.3 ? 'Moderada' : 'Débil'}
              </div>
            </div>
            
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.correlations.phOxygen.toFixed(3)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                pH ↔ Oxígeno
              </div>
              <div className={`text-xs mt-1 ${Math.abs(stats.correlations.phOxygen) > 0.7 ? 'text-red-600' : Math.abs(stats.correlations.phOxygen) > 0.3 ? 'text-orange-600' : 'text-green-600'}`}>
                {Math.abs(stats.correlations.phOxygen) > 0.7 ? 'Fuerte' : Math.abs(stats.correlations.phOxygen) > 0.3 ? 'Moderada' : 'Débil'}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Gráficos avanzados */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Distribución de Frecuencias" subtitle="Histograma de valores por parámetro">
          <div style={{ height: '300px' }}>
            {createDistributionChart() && (
              <Bar data={createDistributionChart()!} options={chartOptions} />
            )}
          </div>
        </Card>

        <Card title="Análisis de Correlación" subtitle="Dispersión entre variables">
          <div style={{ height: '300px' }}>
            {createCorrelationChart() && (
              <Scatter data={createCorrelationChart()!} options={chartOptions} />
            )}
          </div>
        </Card>
      </div>

      {/* Detección de anomalías */}
      <Card title="Detección de Anomalías" subtitle={`${anomalies.length} anomalías detectadas en los últimos datos`}>
        <div className="space-y-3">
          {anomalies.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">
                No se detectaron anomalías significativas
              </p>
            </div>
          ) : (
            anomalies.map((anomaly, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border-l-4 ${
                  anomaly.severity === 'alta' 
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-500' 
                    : 'bg-orange-50 dark:bg-orange-900/20 border-orange-500'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className={`w-5 h-5 ${
                      anomaly.severity === 'alta' ? 'text-red-600' : 'text-orange-600'
                    }`} />
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {anomaly.parameter} - Anomalía {anomaly.severity}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">
                        Valor: {anomaly.value.toFixed(2)} | Esperado: ~{anomaly.expected.toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {format(new Date(anomaly.timestamp), 'dd/MM HH:mm', { locale: es })}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};