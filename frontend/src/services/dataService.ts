/**
 * @file useDataEntry.ts
 * @description Hook unificado para Ingreso de Datos, manejando entrada manual y simulación MQTT en el cliente.
 * @author Kevin Mariano (Reconstruido por Gemini)
 * @version 5.0.0
 * @since 1.0.0
 */
import { useState, useEffect, useCallback } from 'react';
import { Tank, Sensor, UserFromApi as User, SensorType, ManualEntryDto } from '@/types';
import * as tankService from '@/services/tankService';
import * as sensorService from '@/services/sensorService';
import * as userService from '@/services/userService';
import { addManualEntry } from '@/services/dataService';
import { mqttService } from '@/services/mqttService';
import { useAuth } from '@/context/AuthContext';
import Swal from 'sweetalert2';

const generateRealisticValue = (type: SensorType): number => {
  switch (type) {
    case 'TEMPERATURE': return parseFloat((Math.random() * 10 + 20).toFixed(2));
    case 'PH': return parseFloat((Math.random() * 2 + 6).toFixed(2));
    case 'OXYGEN': return parseFloat((Math.random() * 5 + 5).toFixed(2));
    default: return 0;
  }
};

export const useDataEntry = () => {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'ADMIN';

  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(currentUser?.id || null);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [selectedTankId, setSelectedTankId] = useState<string>('');
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [manualReadings, setManualReadings] = useState<Record<string, string>>({});
  const [activeSimulations, setActiveSimulations] = useState<Record<string, NodeJS.Timeout>>({});

  // Conectar a MQTT al iniciar el hook y desconectar al salir
  useEffect(() => {
    mqttService.connect().catch(err => {
      console.error("Fallo en la conexión inicial a MQTT", err);
      setError("No se pudo conectar al servicio de simulación (MQTT).");
    });
    return () => {
      mqttService.disconnect();
    };
  }, []);

  // Carga de datos de la API
  const loadApiData = useCallback(async (userId: string | null) => {
    if (!userId) return;
    setLoading(true);
    try {
      const tanksData = await tankService.getTanks(userId);
      setTanks(tanksData);
      if (tanksData.length > 0) {
        const firstTankId = tanksData[0].id;
        setSelectedTankId(firstTankId);
        const sensorsData = await sensorService.getSensorsByTank(firstTankId);
        setSensors(sensorsData);
      } else {
        setSelectedTankId('');
        setSensors([]);
      }
    } catch (err) {
      setError('Error al cargar tanques y sensores.');
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    if (isAdmin) {
      userService.getUsers().then(setUsers).catch(() => setError('No se pudo cargar la lista de usuarios.'));
    }
    loadApiData(selectedUserId);
  }, [isAdmin, selectedUserId, loadApiData]);


  const handleManualReadingChange = (sensorId: string, value: string) => {
    setManualReadings(prev => ({ ...prev, [sensorId]: value }));
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const entries: ManualEntryDto[] = sensors
      .filter(sensor => manualReadings[sensor.id]?.trim())
      .map(sensor => ({
        sensorId: sensor.id,
        value: parseFloat(manualReadings[sensor.id]),
        timestamp: new Date(),
      }));

    if (entries.length === 0) {
      Swal.fire('Atención', 'Debe ingresar al menos un valor manual.', 'warning');
      return;
    }

    try {
      await Promise.all(entries.map(entry => addManualEntry(entry)));
      Swal.fire('¡Éxito!', 'Datos manuales guardados.', 'success');
      setManualReadings({});
    } catch (err) {
      Swal.fire('Error', 'No se pudieron guardar los datos manuales.', 'error');
    }
  };

  const toggleSimulation = (sensor: Sensor) => {
    const isSimulating = activeSimulations[sensor.id];

    if (isSimulating) {
      clearInterval(isSimulating);
      setActiveSimulations(prev => {
        const newState = { ...prev };
        delete newState[sensor.id];
        return newState;
      });
    } else {
      const intervalId = setInterval(() => {
        const value = generateRealisticValue(sensor.type);
        const topic = `acuaponia/sensor/${sensor.hardwareId}`;
        const payload = JSON.stringify({ value, timestamp: new Date().toISOString() });
        mqttService.publish(topic, payload);
      }, 5000); // Enviar datos cada 5 segundos
      setActiveSimulations(prev => ({ ...prev, [sensor.id]: intervalId }));
    }
  };
  
  const handleUserChange = (userId: string) => {
    setSelectedUserId(userId);
  };
  
  const handleTankChange = async (tankId: string) => {
    setSelectedTankId(tankId);
    setLoading(true);
    try {
      const sensorsData = await sensorService.getSensorsByTank(tankId);
      setSensors(sensorsData);
    } catch(err) {
      setError('Error al cargar los sensores del tanque.');
    } finally {
      setLoading(false);
    }
  }

  return {
    users, selectedUserId, tanks, selectedTankId, sensors, loading, error, isAdmin,
    handleUserChange, handleTankChange,
    manualReadings, handleManualReadingChange, handleManualSubmit,
    activeSimulations, toggleSimulation,
  };
};