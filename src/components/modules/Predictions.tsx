import React, { useState, useEffect } from 'react';
import { TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card } from '../common/Card';
import { useSensorData } from '../../hooks/useSensorData';
import { generatePredictionData } from '../../utils/mockData';
import { PredictionData } from '../../types';
import { Line } from 'react-chartjs-2';

export const Predictions: React.FC = () => {
  const { summary } = useSensorData();
  const [predictions, setPredictions] = useState<{
    temperature: PredictionData[];
    ph: PredictionData[];
    oxygen: PredictionData[];
  } | null>(null);

  useEffect(() => {
    if (summary) {
      setPredictions({
        temperature: generatePredictionData(summary.temperature.current),
        ph: generatePredictionData(summary.ph.current),
        oxygen: generatePredictionData(summary.oxygen.current),
      });
    }
  }, [summary]);

  const getRecommendations = () => {
    if (!summary) return [];

    const recommendations = [];

    if (summary.temperature.current < 20) {
      recommendations.push({
        type: 'warning',
        parameter: 'Temperatura',
        message: 'Temperatura baja detectada. Considere instalar calentadores o verificar el sistema de climatización.',
        action: 'Aumentar temperatura gradualmente a 22-26°C',
      });
    } else if (summary.temperature.current > 28) {
      recommendations.push({
        type: 'warning',
        parameter: 'Temperatura',
        message: 'Temperatura alta detectada. Verifique la ventilación y considere sistemas de enfriamiento.',
        action: 'Mejorar ventilación y agregar sombra',
      });
    }

    if (summary.ph.current < 6.8) {
      recommendations.push({
        type: 'alert',
        parameter: 'pH',
        message: 'pH ácido detectado. Riesgo para la salud de los peces y plantas.',
        action: 'Agregar bicarbonato de sodio o carbonato de calcio',
      });
    } else if (summary.ph.current > 7.6) {
      recommendations.push({
        type: 'alert',
        parameter: 'pH',
        message: 'pH alcalino detectado. Puede afectar la absorción de nutrientes.',
        action: 'Agregar ácido fosfórico o materia orgánica',
      });
    }

    if (summary.oxygen.current < 6) {
      recommendations.push({
        type: 'alert',
        parameter: 'Oxígeno',
        message: 'Nivel de oxígeno bajo. Riesgo crítico para los peces.',
        action: 'Aumentar aireación inmediatamente',
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        type: 'success',
        parameter: 'Sistema',
        message: 'Todos los parámetros están en rangos óptimos.',
        action: 'Mantener el monitoreo regular',
      });
    }

    return recommendations;
  };

  const createPredictionChart = (data: PredictionData[], label: string, color: string) => {
    const labels = data.map((_, index) => 
      index < 4 ? `Día -${3 - index}` : `Día +${index - 3}`
    );

    return {
      labels,
      datasets: [
        {
          label: `${label} (Histórico)`,
          data: data.map(d => d.actual || null),
          borderColor: color,
          backgroundColor: `${color}20`,
          tension: 0.4,
          borderDash: [0],
          pointBackgroundColor: color,
        },
        {
          label: `${label} (Predicción)`,
          data: data.map(d => d.predicted),
          borderColor: color,
          backgroundColor: `${color}10`,
          tension: 0.4,
          borderDash: [5, 5],
          pointBackgroundColor: `${color}80`,
          pointStyle: 'triangle',
        },
      ],
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

  const recommendations = getRecommendations();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Modelos Predictivos
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Forecasting y recomendaciones basadas en análisis de tendencias
        </p>
      </div>

      {/* Recomendaciones */}
      <Card title="Recomendaciones del Sistema" subtitle="Análisis automático y sugerencias de mejora">
        <div className="space-y-4">
          {recommendations.map((rec, index) => {
            const Icon = rec.type === 'success' ? CheckCircle : 
                       rec.type === 'warning' ? AlertTriangle : AlertTriangle;
            const colorClasses = rec.type === 'success' ? 'text-green-600 bg-green-50 dark:bg-green-900/20' :
                               rec.type === 'warning' ? 'text-orange-600 bg-orange-50 dark:bg-orange-900/20' :
                               'text-red-600 bg-red-50 dark:bg-red-900/20';

            return (
              <div key={index} className={`p-4 rounded-lg ${colorClasses.split(' ').slice(1).join(' ')}`}>
                <div className="flex items-start space-x-3">
                  <Icon className={`w-5 h-5 mt-0.5 ${colorClasses.split(' ')[0]}`} />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={`font-semibold ${colorClasses.split(' ')[0]}`}>
                        {rec.parameter}
                      </span>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 mb-2">
                      {rec.message}
                    </p>
                    <div className={`text-sm font-medium ${colorClasses.split(' ')[0]}`}>
                      Acción recomendada: {rec.action}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Gráficos predictivos */}
      {predictions && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Predicción de Temperatura" subtitle="Forecast a 7 días basado en tendencias históricas">
            <div style={{ height: '300px' }}>
              <Line
                data={createPredictionChart(predictions.temperature, 'Temperatura (°C)', '#3b82f6')}
                options={chartOptions}
              />
            </div>
          </Card>

          <Card title="Predicción de pH" subtitle="Proyección de niveles de acidez">
            <div style={{ height: '300px' }}>
              <Line
                data={createPredictionChart(predictions.ph, 'pH', '#10b981')}
                options={chartOptions}
              />
            </div>
          </Card>

          <Card title="Predicción de Oxígeno" subtitle="Estimación de oxígeno disuelto" className="lg:col-span-2">
            <div style={{ height: '300px' }}>
              <Line
                data={createPredictionChart(predictions.oxygen, 'Oxígeno (mg/L)', '#f97316')}
                options={chartOptions}
              />
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};