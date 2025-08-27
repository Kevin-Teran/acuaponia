/**
 * @file useDataEntry.ts
 * @description Hook unificado para Ingreso de Datos, manejando entrada manual y simulación MQTT en el cliente.
 * @author Kevin Mariano (Reconstruido por Gemini)
 * @version 5.1.0
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

  // Conectar a MQTT al iniciar y desconectar al salir
  useEffect(() => {
    mqttService.connect().catch(err => {
      console.error("Fallo en la conexión inicial a MQTT", err);
      setError("No se pudo conectar al servicio de simulación (MQTT).");
    });
    return () => {
      // Limpiar todos los intervalos al desmontar el componente
      Object.values(activeSimulations).forEach(clearInterval);
      mqttService.disconnect();
    };
  }, []); // El array de dependencias vacío asegura que esto solo se ejecute una vez

  // Cargar usuarios (solo si es admin)
  useEffect(() => {
    if (isAdmin) {
      setLoading(true);
      userService.getUsers()
        .then(setUsers)
        .catch(() => setError('No se pudo cargar la lista de usuarios.'))
        .finally(() => setLoading(false));
    }
  }, [isAdmin]);

  // Cargar tanques cuando cambia el usuario seleccionado
  useEffect(() => {
    if (!selectedUserId) {
      setTanks([]);
      setSelectedTankId('');
      setSensors([]);
      return;
    }
    setLoading(true);
    tankService.getTanks(selectedUserId)
      .then(data => {
        setTanks(data);
        if (data.length > 0) {
          setSelectedTankId(data[0].id);
        } else {
          setSelectedTankId('');
          setSensors([]);
        }
      })
      .catch(() => setError('No se pudieron cargar los tanques.'))
      .finally(() => setLoading(false));
  }, [selectedUserId]);

  // Cargar sensores cuando cambia el tanque seleccionado
  useEffect(() => {
    if (!selectedTankId) {
      setSensors([]);
      return;
    }
    setLoading(true);
    sensorService.getSensorsByTank(selectedTankId)
      .then(setSensors)
      .catch(() => setError('No se pudieron cargar los sensores del tanque.'))
      .finally(() => setLoading(false));
  }, [selectedTankId]);


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
      }, 5000);
      setActiveSimulations(prev => ({ ...prev, [sensor.id]: intervalId }));
    }
  };
  
  const handleUserChange = (userId: string) => {
    setSelectedUserId(userId);
  };
  
  const handleTankChange = (tankId: string) => {
    setSelectedTankId(tankId);
  }

  return {
    users, selectedUserId, tanks, selectedTankId, sensors, loading, error, isAdmin,
    handleUserChange, handleTankChange,
    manualReadings, handleManualReadingChange, handleManualSubmit,
    activeSimulations, toggleSimulation,
  };
};