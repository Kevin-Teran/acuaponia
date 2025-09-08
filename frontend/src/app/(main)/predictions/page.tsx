/**
 * @file page.tsx
 * @route frontend/src/app/(main)/predictions
 * @description 
 * @author Kevin Mariano
 * @version 1.0.0
 * @since 1.0.0
 * @copyright SENA 2025
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Select,
  SelectItem,
  CircularProgress,
  Divider,
  Skeleton,
} from '@nextui-org/react';
import { toast } from 'react-hot-toast';
import {
  Calendar,
  ChevronsRight,
  Thermometer,
  Droplet,
  Wind,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { getTanks, getTankById } from '@/services/tankService';
import { generatePrediction } from '@/services/predictionService';

import { LineChart } from '@/components/dashboard/LineChart';
import { Sensor, Tank, SensorType } from '@/types';

const horizonOptions = [
  { label: 'Proyección a 7 Días', value: '7' },
  { label: 'Proyección a 15 Días', value: '15' },
];

const sensorInfo = {
  TEMPERATURE: {
    icon: <Thermometer className="w-6 h-6 text-danger-500" />,
    unit: '°C',
  },
  PH: { icon: <Droplet className="w-6 h-6 text-primary-500" />, unit: '' },
  OXYGEN: { icon: <Wind className="w-6 h-6 text-secondary-500" />, unit: 'mg/L' },
};

const PredictionCardSkeleton = () => (
  <Card className="w-full shadow-lg border border-default-200">
    <CardHeader className="flex gap-3">
      <Skeleton className="w-8 h-8 rounded-full" />
      <div className="flex flex-col gap-1 w-full">
        <Skeleton className="h-4 w-2/5 rounded-lg" />
        <Skeleton className="h-3 w-1/5 rounded-lg" />
      </div>
    </CardHeader>
    <Divider />
    <CardBody className="min-h-[300px] flex justify-center items-center">
      <Skeleton className="h-48 w-full rounded-lg" />
    </CardBody>
    <Divider />
    <CardFooter>
      <Skeleton className="h-4 w-3/5 rounded-lg" />
    </CardFooter>
  </Card>
);

/**
 * @description Tarjeta que muestra predicciones y gráfico de un sensor.
 */
 const PredictionCard = ({ result }) => {
  // 🔹 Transformamos datos históricos y predichos al formato que usa nuestro LineChart (Dashboard)
  const historicalData =
    result.historical?.map((d) => ({
      time: new Date(d.timestamp).toLocaleDateString('es-CO', {
        day: '2-digit',
        month: 'short',
      }),
      value: d.value,
    })) || [];

  const predictedData =
    result.predicted?.map((d) => ({
      time: new Date(d.timestamp).toLocaleDateString('es-CO', {
        day: '2-digit',
        month: 'short',
      }),
      value: d.value,
    })) || [];

  // 🔹 Combinamos para que Recharts lo pinte
  const chartData = [...historicalData, ...predictedData];

  const lastPredictedValue =
    result.predicted?.[result.predicted.length - 1]?.value;

  const info = sensorInfo[result.sensorType] || {};

  return (
    <Card className="w-full shadow-lg border border-default-200 dark:border-default-100">
      <CardHeader className="flex gap-3">
        {info.icon || <ChevronsRight />}
        <div className="flex flex-col">
          <p className="text-md font-semibold">{result.sensorName}</p>
          <p className="text-sm text-default-500">{result.sensorType}</p>
        </div>
      </CardHeader>
      <Divider />
      <CardBody className="min-h-[300px] flex justify-center items-center">
        {chartData.length > 0 ? (
          <LineChart
            data={chartData}
            title={`Historial y Proyección`}
            yAxisLabel={info.unit || 'Valor'}
            lineColor="#2563eb"
            loading={false}
          />
        ) : (
          <div className="text-center text-default-500 flex flex-col items-center gap-2">
            <AlertTriangle className="w-8 h-8 text-warning-500" />
            <p className="text-sm px-4">{result.message}</p>
          </div>
        )}
      </CardBody>
      <Divider />
      <CardFooter className="text-sm text-default-600">
        <TrendingUp className="w-4 h-4 mr-2 text-success-500" />
        {lastPredictedValue !== undefined ? (
          <p>
            Valor final proyectado:{' '}
            <span className="font-bold text-lg">
              {lastPredictedValue}
              {info.unit}
            </span>
          </p>
        ) : (
          <p>Proyección no disponible.</p>
        )}
      </CardFooter>
    </Card>
  );
};

export default function PredictionsPage() {
  const { user } = useAuth();
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [isLoadingTanks, setIsLoadingTanks] = useState(true);
  const [selectedTank, setSelectedTank] = useState<Tank | null>(null);
  const [horizon, setHorizon] = useState<string>('7');
  const [resultsBySensor, setResultsBySensor] = useState({});

  useEffect(() => {
    if (!user) return;
    const fetchUserTanks = async () => {
      setIsLoadingTanks(true);
      try {
        const userTanks = await getTanks(user.id);
        setTanks(userTanks);
        if (userTanks?.length > 0) {
          const tankDetails = await getTankById(userTanks[0].id);
          setSelectedTank(tankDetails);
        }
      } catch (error) {
        toast.error('No se pudieron cargar los tanques.');
      } finally {
        setIsLoadingTanks(false);
      }
    };
    fetchUserTanks();
  }, [user]);

  useEffect(() => {
    if (!selectedTank?.sensors) return;

    const runPredictions = async () => {
      const newResults = {};
      await Promise.all(
        selectedTank.sensors.map(async (sensor: Sensor) => {
          try {
            const prediction = await generatePrediction({
              tankId: selectedTank.id,
              type: sensor.type,
              horizon: parseInt(horizon, 10),
            });
            newResults[sensor.id] = {
              ...prediction,
              sensorId: sensor.id,
              sensorName: sensor.name,
              sensorType: sensor.type,
            };
          } catch (error) {
            console.error(`Fallo en la predicción para ${sensor.name}:`, error);
            toast.error(`Error en la predicción para ${sensor.name}`);
            newResults[sensor.id] = {
              sensorId: sensor.id,
              sensorName: sensor.name,
              sensorType: sensor.type,
              message: 'Ocurrió un error inesperado.',
              historical: [],
              predicted: [],
            };
          }
        }),
      );
      setResultsBySensor(newResults);
    };
    runPredictions();
  }, [selectedTank, horizon]);

  const handleTankChange = async (keys) => {
    if (!keys || keys.size === 0) return;
    const tankId = keys.values().next().value;
    if (tankId && tankId !== selectedTank?.id) {
      const tankDetails = await getTankById(tankId);
      setSelectedTank(tankDetails);
      setResultsBySensor({});
    }
  };

  const renderContent = () => {
    if (isLoadingTanks)
      return (
        <div className="col-span-full flex justify-center py-16">
          <CircularProgress label="Cargando tanques..." />
        </div>
      );
    if (tanks.length === 0)
      return (
        <div className="col-span-full text-center text-default-500 py-16">
          No tienes tanques registrados. Por favor, crea uno para ver sus
          proyecciones.
        </div>
      );
    if (selectedTank?.sensors?.length === 0)
      return (
        <div className="col-span-full text-center text-default-500 py-16">
          El tanque seleccionado no tiene sensores registrados.
        </div>
      );
    if (Object.keys(resultsBySensor).length > 0)
      return selectedTank.sensors.map((sensor) => {
        const result = resultsBySensor[sensor.id];
        return result ? (
          <PredictionCard key={sensor.id} result={result} />
        ) : (
          <PredictionCardSkeleton key={sensor.id} />
        );
      });
    return (
      <div className="col-span-full text-center text-default-500 py-16">
        Selecciona un tanque para ver las proyecciones de sus sensores.
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Proyecciones de Sensores</h1>
      <Card>
        <CardBody>
          <div className="flex flex-col md:flex-row gap-4">
            <Select
              label="Tanque"
              placeholder="Selecciona un tanque"
              items={tanks}
              selectedKeys={selectedTank ? [selectedTank.id] : []}
              onSelectionChange={handleTankChange}
              isLoading={isLoadingTanks}
              disabled={isLoadingTanks || tanks.length === 0}
              startContent={<ChevronsRight className="text-default-400" />}
              className="flex-1"
            >
              {(tank) => (
                <SelectItem key={tank.id} value={tank.id}>
                  {tank.name}
                </SelectItem>
              )}
            </Select>
            <Select
              label="Horizonte de Proyección"
              selectedKeys={horizon ? [horizon] : []}
              onSelectionChange={(keys) => {
                if (keys.size > 0)
                  setHorizon(keys.values().next().value);
              }}
              disabled={!selectedTank}
              startContent={<Calendar className="text-default-400" />}
              className="flex-1 md:max-w-xs"
            >
              {horizonOptions.map((option) => (
                <SelectItem key={option.value}>{option.label}</SelectItem>
              ))}
            </Select>
          </div>
        </CardBody>
      </Card>
      <div className="flex flex-col gap-6">{renderContent()}</div>
    </div>
  );
}