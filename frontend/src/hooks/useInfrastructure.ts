import { useState, useEffect, useCallback } from 'react';
import { User, Tank, Sensor, SensorData } from '../types';
import * as userService from '../services/userService';
import * as tankService from '../services/tankService';
import * as sensorService from '../services/sensorService';
import { socketService } from '../services/socketService';

/**
 * @hook useInfrastructure
 * @description Hook centralizado para obtener y manejar los datos de tanques,
 * sensores y usuarios para el módulo de gestión de infraestructura.
 * @param {boolean} isAdmin - Indica si el usuario actual es administrador.
 */
export const useInfrastructure = (isAdmin: boolean) => {
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDataForUser = useCallback(async (userId: string) => {
    if (!userId) {
      setTanks([]);
      setSensors([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const [tanksData, sensorsData] = await Promise.all([
        tankService.getTanks(userId),
        sensorService.getSensors(userId),
      ]);
      setTanks(tanksData);
      setSensors(sensorsData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      userService.getAllUsers().then(setUsers).catch(console.error);
    }
  }, [isAdmin]);

  useEffect(() => {
    socketService.connect();
    const handleNewData = (data: SensorData) => {
        setSensors(prevSensors => 
            prevSensors.map(sensor => 
                sensor.hardwareId === data.hardwareId 
                    ? { ...sensor, lastReading: data.value, lastUpdate: new Date().toISOString() } 
                    : sensor
            )
        );
    };
    socketService.onSensorData(handleNewData);
    
    return () => {
        socketService.offSensorData(handleNewData);
        socketService.disconnect();
    };
  }, []);

  return { tanks, sensors, users, loading, error, fetchDataForUser };
};