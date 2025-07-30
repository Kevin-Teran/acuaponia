import React, { useState, useEffect } from 'react';
import { Card } from '../../common/Card'; // <-- CORRECCIÓN: Ruta relativa
import { Sensor } from '../../../types';
import * as dataService from '../../../services/dataService'; // <-- CORRECCIÓN: Ruta relativa
import { Bot, Play, StopCircle, Loader } from 'lucide-react';

interface SyntheticEmitterProps {
  sensors: Sensor[];
}

export const SyntheticDataEmitter: React.FC<SyntheticEmitterProps> = ({ sensors }) => {
  const [activeEmitters, setActiveEmitters] = useState<string[]>([]);
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    dataService.getEmitterStatus().then(setActiveEmitters);
  }, []);

  const handleToggleEmitter = async (sensorId: string) => {
    setLoadingMap(prev => ({ ...prev, [sensorId]: true }));
    const isEmitterActive = activeEmitters.includes(sensorId);
    if (isEmitterActive) {
      await dataService.stopEmitter(sensorId);
    } else {
      await dataService.startEmitter(sensorId);
    }
    await dataService.getEmitterStatus().then(setActiveEmitters);
    setLoadingMap(prev => ({ ...prev, [sensorId]: false }));
  };

  return (
    <Card title="2. Simulador de Sensores (MQTT)" icon={Bot}>
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {sensors.length > 0 ? sensors.map(sensor => {
          const isActive = activeEmitters.includes(sensor.id);
          const isLoading = loadingMap[sensor.id];
          return (
            <div key={sensor.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-md">
              <span className="font-medium text-sm">{sensor.name}</span>
              <button 
                onClick={() => handleToggleEmitter(sensor.id)} 
                className={`px-3 py-1 text-xs rounded-full flex items-center space-x-2 text-white ${isActive ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}
                disabled={isLoading}
              >
                {isLoading ? <Loader className="w-4 h-4 animate-spin" /> : 
                 isActive ? <><StopCircle className="w-4 h-4"/><span>Detener</span></> : <><Play className="w-4 h-4"/><span>Iniciar</span></>}
              </button>
            </div>
          );
        }) : <p className="text-sm text-gray-500">Seleccione un tanque para ver sus sensores.</p>}
      </div>
    </Card>
  );
};