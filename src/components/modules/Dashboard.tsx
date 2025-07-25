import React from 'react';
import { useSensorData } from '../../hooks/useSensorData';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { Card } from '../common/Card';
import { GaugeChart } from '../dashboard/GaugeChart';
import { LineChart } from '../dashboard/LineChart';
import { SummaryCards } from '../dashboard/SummaryCards';

export const Dashboard: React.FC = () => {
  const { data, summary, loading, lastUpdate, refreshData } = useSensorData();

  if (loading || !summary) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Definir umbrales para cada parámetro
  const thresholds = {
    temperature: { low: 20, high: 28 },
    ph: { low: 6.8, high: 7.6 },
    oxygen: { low: 6, high: 10 },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dashboard de Monitoreo
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Visualización en tiempo real de variables acuáticas
          </p>
        </div>
      </div>

      {/* Velocímetros */}
      <Card title="Valores Actuales" subtitle="Mediciones en tiempo real con indicadores de estado">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <GaugeChart
            value={summary.temperature.current}
            min={15}
            max={35}
            label="Temperatura"
            unit="°C"
            color="#3b82f6"
            thresholds={thresholds.temperature}
          />
          <GaugeChart
            value={summary.ph.current}
            min={6}
            max={9}
            label="pH"
            unit=""
            color="#10b981"
            thresholds={thresholds.ph}
          />
          <GaugeChart
            value={summary.oxygen.current}
            min={0}
            max={15}
            label="Oxígeno Disuelto"
            unit="mg/L"
            color="#f97316"
            thresholds={thresholds.oxygen}
          />
        </div>
      </Card>

      {/* Gráfico de líneas */}
      <Card title="Tendencia Temporal" subtitle="Evolución de las variables en las últimas mediciones">
        <LineChart data={data.slice(-20)} height={400} />
      </Card>

      {/* Tarjetas resumen */}
      <SummaryCards
        summary={summary}
        lastUpdate={lastUpdate}
        onRefresh={refreshData}
      />
    </div>
  );
};