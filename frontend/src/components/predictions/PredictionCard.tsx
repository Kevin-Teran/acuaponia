/**
 * @file PredictionCard.tsx
 * @route frontend/src/components/predictions
 * @description Tarjeta de predicción final, pulida y con toda la información.
 * @author Kevin Mariano
 * @version 1.1.0
 * @since 1.0.0
 * @copyright SENA 2025
 */
import { Card, CardHeader, CardBody } from '@nextui-org/react';
import { ChevronsRight, AlertTriangle, Thermometer, Droplet, Wind } from 'lucide-react';
import { PredictionChart } from './PredictionChart';
import { ThresholdGauge } from './ThresholdGauge';
import { cn } from '@/utils/cn';
import { SensorType } from '@/types'; 

interface PredictedDataPoint {
  timestamp: string;
  value: number;
}

interface PredictionThresholds {
  minCritical: number;
  maxCritical: number;
  minWarning: number;
  maxWarning: number;
}

interface PredictionResult {
  predicted: PredictedDataPoint[];
  thresholds: PredictionThresholds;
  sensorType: SensorType;
  sensorName: string;
  message?: string;
}

interface PredictionCardProps {
  result: PredictionResult;
}

const sensorInfo = {
  [SensorType.TEMPERATURE]: { icon: Thermometer, unit: '°C', color: 'text-danger-500' },
  [SensorType.PH]: { icon: Droplet, unit: '', color: 'text-primary-500' },
  [SensorType.OXYGEN]: { icon: Wind, unit: 'mg/L', color: 'text-secondary-500' },
};

export const PredictionCard: React.FC<PredictionCardProps> = ({ result }) => {
  const info = sensorInfo[result.sensorType] || {};
  const Icon = info.icon || ChevronsRight;
  const { predicted, thresholds } = result;

  const chartData = predicted?.map((d, i) => ({
      time: i === 0 ? 'Hoy' : new Date(d.timestamp).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }),
      value: d.value,
  })) || [];

  const initialValue = predicted?.[0]?.value;
  const finalValue = predicted?.[predicted.length - 1]?.value;

  const getStatus = () => {
    if (!thresholds || initialValue === undefined) return { text: 'Sin Datos', color: 'bg-default-200 text-default-600' };
    if (initialValue < thresholds.minCritical || initialValue > thresholds.maxCritical) return { text: 'Crítico', color: 'bg-danger-100 text-danger-600' };
    if (initialValue < thresholds.minWarning || initialValue > thresholds.maxWarning) return { text: 'Alerta', color: 'bg-warning-100 text-warning-600' };
    return { text: 'Normal', color: 'bg-success-100 text-success-600' };
  };
  const status = getStatus();

  return (
    <Card className="w-full shadow-lg border border-default-200 dark:border-default-100 p-2">
      <CardHeader className="flex justify-between items-start">
        <div className='flex items-center gap-3'>
          <Icon className={cn("w-7 h-7", info.color)} />
          <div>
            <h3 className="text-lg font-bold">{result.sensorName}</h3>
            <p className="text-sm text-default-500">{result.sensorType}</p>
          </div>
        </div>
        <div className={cn("px-3 py-1 text-xs font-semibold rounded-full", status.color)}>
          {status.text}
        </div>
      </CardHeader>
      <CardBody>
        {predicted && predicted.length > 1 ? (
          <div className='flex flex-col h-full'>
            <div className='text-center my-4'>
              <p className='text-sm text-default-500'>Valor Proyectado Final</p>
              <p className='text-5xl font-bold text-default-800 dark:text-white'>
                {finalValue.toFixed(1)}
                <span className='text-2xl font-medium text-default-400'>{info.unit}</span>
              </p>
            </div>

            {initialValue !== undefined && thresholds && (
                <div className="px-4 mb-4">
                    <p className='text-sm text-center text-default-500 mb-2'>Valor Actual</p>
                    <ThresholdGauge value={initialValue} thresholds={thresholds} unit={info.unit} />
                </div>
            )}
            
            <div className="flex-grow h-52 w-full">
              <PredictionChart data={chartData} thresholds={thresholds} />
            </div>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-center text-default-500">
            <AlertTriangle className="w-10 h-10 text-warning-500 mb-2" />
            <p className="px-4 text-sm">{result.message || 'No hay datos para la proyección.'}</p>
          </div>
        )}
      </CardBody>
    </Card>
  );
};