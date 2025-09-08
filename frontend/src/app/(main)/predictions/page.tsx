/**
 * @file page.tsx
 * @route frontend/src/app/(main)/predictions
 * @description Versión FINAL con ESTILOS SINCRONIZADOS y contraste corregido.
 * @author Kevin Mariano
 * @version 2.2.0
 * @since 1.0.0
 * @copyright SENA 2025
 */
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardBody, Select, SelectItem, CircularProgress, Skeleton } from '@nextui-org/react';
import type { Selection } from '@nextui-org/react';
import { toast } from 'react-hot-toast';
import { Calendar, ChevronsRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getTanks, getTankById } from '@/services/tankService';
import { generatePrediction } from '@/services/predictionService';
import { Sensor, Tank } from '@/types';
import { PredictionCard } from '@/components/predictions/PredictionCard';

// --- CONFIGURACIÓN ---
const horizonOptions = [{ label: '7 Días', value: '7' }, { label: '15 Días', value: '15' }];

// --- COMPONENTE PRINCIPAL DE LA PÁGINA ---
export default function PredictionsPage() {
    const { user } = useAuth();
    const [tanks, setTanks] = useState<Tank[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedTankId, setSelectedTankId] = useState<string | null>(null);
    const [horizon, setHorizon] = useState<string>('7');
    const [resultsBySensor, setResultsBySensor] = useState({});
    const [sensors, setSensors] = useState<Sensor[]>([]);

    useEffect(() => {
        if (!user) return;
        const fetchInitialData = async () => {
          setIsLoading(true);
          try {
            const userTanks = await getTanks(user.id);
            setTanks(userTanks);
            if (userTanks.length > 0 && !selectedTankId) {
              setSelectedTankId(userTanks[0].id);
            } else if (userTanks.length === 0) {
              setIsLoading(false);
            }
          } catch (error) {
            toast.error('No se pudieron cargar los tanques.');
            setIsLoading(false);
          }
        };
        fetchInitialData();
    }, [user]);

    useEffect(() => {
        if (!selectedTankId || !horizon) return;
        const runPredictionsForTank = async () => {
            setIsLoading(true);
            try {
                const tankDetails = await getTankById(selectedTankId);
                setSensors(tankDetails.sensors || []);
                const newResults = {};
                if (tankDetails.sensors && tankDetails.sensors.length > 0) {
                  await Promise.all(
                      tankDetails.sensors.map(async (sensor) => {
                          const prediction = await generatePrediction({ tankId: selectedTankId, type: sensor.type, horizon: parseInt(horizon, 10) });
                          newResults[sensor.id] = { ...prediction, sensorId: sensor.id, sensorName: sensor.name, sensorType: sensor.type };
                      })
                  );
                }
                setResultsBySensor(newResults);
            } catch (error) {
                toast.error(`Error al generar predicciones.`);
                setResultsBySensor({});
                setSensors([]);
            } finally {
                setIsLoading(false);
            }
        };
        runPredictionsForTank();
    }, [selectedTankId, horizon]);

    const selectedTankKeys = useMemo(() => {
        if (selectedTankId && tanks.some(tank => tank.id === selectedTankId)) {
            return new Set([selectedTankId]);
        }
        return new Set();
    }, [selectedTankId, tanks]);
    
    const selectedHorizonKeys = useMemo(() => new Set([horizon]), [horizon]);

    const renderContent = () => {
        if (isLoading) {
            return Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className='w-full h-[400px] rounded-xl' />
            ));
        }
        if (sensors.length === 0) {
            return <div className="text-center py-16 text-default-500">El tanque seleccionado no tiene sensores registrados.</div>;
        }
        return sensors.map(sensor => {
            const result = resultsBySensor[sensor.id];
            return result ? <PredictionCard key={sensor.id} result={result} /> : <Skeleton key={sensor.id} className='w-full h-[400px] rounded-xl' />;
        });
    };

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Análisis Predictivo</h1>
          <p className='text-default-500'>Anticípate al futuro de tus cultivos. Visualiza tendencias y compara con los umbrales operativos.</p>
        </div>
        
        <Card className='shadow-md border border-default-200 dark:border-default-100'>
          <CardBody>
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <Select 
                label="Tanque"
                placeholder="Selecciona un tanque"
                labelPlacement="outside-left"
                items={tanks} 
                selectedKeys={selectedTankKeys} 
                onSelectionChange={(keys) => setSelectedTankId((keys as Set<string>).values().next().value)} 
                disabled={tanks.length === 0}
                className="min-w-64"
                // ✨ EL TOQUE FINAL DE ESTILO: Fondo sólido con buen contraste en ambos temas
                classNames={{
                  trigger: "shadow-sm bg-gray-100 dark:bg-zinc-800 data-[hover=true]:bg-gray-200 dark:data-[hover=true]:bg-zinc-700 border border-transparent dark:border-zinc-700",
                }}
              >
                {(tank) => <SelectItem key={tank.id} value={tank.id}>{tank.name}</SelectItem>}
              </Select>
              <Select 
                label="Horizonte"
                labelPlacement="outside-left"
                selectedKeys={selectedHorizonKeys} 
                onSelectionChange={(keys) => setHorizon((keys as Set<string>).values().next().value)} 
                disabled={!selectedTankId}
                className="min-w-64"
                // ✨ EL TOQUE FINAL DE ESTILO: Fondo sólido con buen contraste en ambos temas
                classNames={{
                  trigger: "shadow-sm bg-gray-100 dark:bg-zinc-800 data-[hover=true]:bg-gray-200 dark:data-[hover=true]:bg-zinc-700 border border-transparent dark:border-zinc-700",
                }}
              >
                {horizonOptions.map((option) => <SelectItem key={option.value}>{option.label}</SelectItem>)}
              </Select>
            </div>
          </CardBody>
        </Card>
        
        <div className="flex flex-col gap-6">
          {renderContent()}
        </div>
      </div>
    );
}