/**
 * @file PredictionSummaryCards.tsx
 * @route frontend/src/components/predictions
 * @description Tarjetas de resumen con KPIs de las predicciones.
 * @author Kevin Mariano
 * @version 1.0.0
 * @since 1.0.0
 * @copyright SENA 2025
 */
import React from 'react';
import { AlertTriangle, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { SensorType } from '@/types';

interface PredictionThresholds {
  minCritical: number;
  maxCritical: number;
  minWarning: number;
  maxWarning: number;
}

interface PredictionDataPoint {
  timestamp: string;
  value: number;
}

export interface PredictionResult {
  predicted: PredictionDataPoint[];
  thresholds: PredictionThresholds;
  sensorType: SensorType;
  sensorName: string;
  message?: string;
}

interface PredictionSummaryCardsProps {
  results: Record<string, PredictionResult>;
  horizon: string;
}

export const PredictionSummaryCards = ({ results, horizon }: PredictionSummaryCardsProps) => {
  const summary = React.useMemo(() => {
    let warnings = 0;
    let criticals = 0;
    let stable = 0;

    Object.values(results).forEach(res => {
      if (res && res.predicted.length > 0 && res.thresholds) {
        const finalValue = res.predicted[res.predicted.length - 1].value;
        const { minCritical, maxCritical, minWarning, maxWarning } = res.thresholds;

        if (finalValue < minCritical || finalValue > maxCritical) {
          criticals++;
        } else if (finalValue < minWarning || finalValue > maxWarning) {
          warnings++;
        } else {
          stable++;
        }
      }
    });
    return { warnings, criticals, stable, total: warnings + criticals + stable };
  }, [results]);

  let overallStatus = {
    text: 'Estable',
    icon: CheckCircle,
    color: 'text-green-500',
  };
  if (summary.criticals > 0) {
    overallStatus = { text: 'Crítico', icon: AlertTriangle, color: 'text-red-500' };
  } else if (summary.warnings > 0) {
    overallStatus = { text: 'Alerta', icon: AlertTriangle, color: 'text-yellow-500' };
  }
  const StatusIcon = overallStatus.icon;

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <Card className="p-4">
        <div className="flex items-center">
          <div className={`mr-4 rounded-md p-2 bg-opacity-10 ${overallStatus.color.replace('text-', 'bg-')}`}>
            <StatusIcon className={`h-6 w-6 ${overallStatus.color}`} />
          </div>
          <div>
            <p className="text-sm font-medium text-text-secondary">Estado General Proyectado</p>
            <p className={`text-2xl font-bold ${overallStatus.color}`}>{overallStatus.text}</p>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center">
          <div className="mr-4 rounded-md bg-yellow-100 p-2 dark:bg-yellow-900/20">
            <AlertTriangle className="h-6 w-6 text-yellow-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-text-secondary">Alertas Proyectadas</p>
            <p className="text-2xl font-bold">{summary.warnings}</p>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center">
          <div className="mr-4 rounded-md bg-red-100 p-2 dark:bg-red-900/20">
            <AlertTriangle className="h-6 w-6 text-red-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-text-secondary">Críticos Proyectados</p>
            <p className="text-2xl font-bold">{summary.criticals}</p>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center">
          <div className="mr-4 rounded-md bg-blue-100 p-2 dark:bg-blue-900/20">
            <Clock className="h-6 w-6 text-blue-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-text-secondary">Horizonte</p>
            <p className="text-2xl font-bold">{horizon} Días</p>
          </div>
        </div>
      </Card>
    </div>
  );
};