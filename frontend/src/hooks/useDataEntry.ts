/**
 * @file useDataEntry.ts
 * @description Hook unificado y optimizado para el ingreso de datos de sensores.
 * Maneja entrada manual y simulación MQTT con manejo de conexión robusto.
 * @author Kevin Mariano (Reconstruido y optimizado por Gemini)
 * @version 7.0.0 (Solución MQTT)
 * @since 1.0.0
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { Tank, Sensor, UserFromApi as User, SensorType, ManualEntryDto } from '@/types';
import * as tankService from '@/services/tankService';
import * as sensorService from '@/services/sensorService';
import * as userService from '@/services/userService';
import { addManualEntry } from '@/services/dataService';
import { mqttService } from '@/services/mqttService';
import { useAuth } from '@/context/AuthContext';
import Swal from 'sweetalert2';

// ... (El resto de las interfaces y funciones de ayuda se mantienen igual)
interface SimulationState {
  intervalId: NodeJS.Timeout;
  isActive: boolean;
  startTime: Date;
  messagesCount: number;
}

const generateRealisticValue = (type: SensorType, previousValue?: number): number => {
  let baseValue: number, variation: number;
  switch (type) {
    case 'TEMPERATURE':
      baseValue = previousValue || 25;
      variation = (Math.random() - 0.5) * 2;
      return parseFloat(Math.max(18, Math.min(32, baseValue + variation)).toFixed(1));
    case 'PH':
      baseValue = previousValue || 7.2;
      variation = (Math.random() - 0.5) * 0.4;
      return parseFloat(Math.max(6.0, Math.min(8.5, baseValue + variation)).toFixed(2));
    case 'OXYGEN':
      baseValue = previousValue || 7.5;
      variation = (Math.random() - 0.5) * 1.0;
      return parseFloat(Math.max(4.0, Math.min(12.0, baseValue + variation)).toFixed(1));
    default:
      return parseFloat((Math.random() * 100).toFixed(2));
  }
};

const getUnitForSensorType = (type: SensorType): string => {
  switch (type) {
    case 'TEMPERATURE': return '°C';
    case 'PH': return 'pH';
    case 'OXYGEN': return 'mg/L';
    default: return '';
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
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);
  
  const [activeSimulations, setActiveSimulations] = useState<Record<string, SimulationState>>({});
  const [mqttConnectionStatus, setMqttConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  
  const previousValues = useRef<Record<string, number>>({});

  /**
   * @effect Inicialización de MQTT (CORREGIDO)
   * @description Conecta a MQTT al montar y se desconecta de forma segura al desmontar.
   */
  useEffect(() => {
    let isMounted = true;

    const initializeMqtt = async () => {
      // Solo intentar conectar si no estamos ya conectados o conectando
      if (mqttService.isConnected() || mqttConnectionStatus === 'connecting') {
        setMqttConnectionStatus('connected');
        return;
      }
      
      try {
        setMqttConnectionStatus('connecting');
        await mqttService.connect();
        if (isMounted) {
          setMqttConnectionStatus('connected');
          setError(null);
        }
      } catch (err) {
        console.error("Error en la conexión inicial a MQTT", err);
        if (isMounted) {
          setMqttConnectionStatus('disconnected');
          setError("No se pudo conectar al servicio de simulación MQTT.");
        }
      }
    };

    initializeMqtt();

    // ⭐ LA SOLUCIÓN ESTÁ AQUÍ 👇
    // La función de limpieza ahora se encarga de detener simulaciones
    // y solo desconecta si es realmente necesario, evitando el problema de Strict Mode.
    return () => {
      isMounted = false;
      console.log("Limpiando el hook useDataEntry...");
      
      // Detener todas las simulaciones activas al salir del componente
      Object.values(activeSimulations).forEach(simulation => {
        if (simulation.intervalId) {
          clearInterval(simulation.intervalId);
        }
      });
      // La desconexión global de MQTT se puede manejar a nivel de la app,
      // pero si es específica de esta página, la dejamos.
      // mqttService.disconnect(); // Descomentar si la conexión solo debe vivir en esta página
    };
  }, []); // El array vacío asegura que esto se ejecute solo una vez al montar

  // ... (El resto de useEffects y funciones se mantienen exactamente igual)
  useEffect(() => {
    if (isAdmin) {
      const loadUsers = async () => {
        try {
          setLoading(true);
          const usersData = await userService.getUsers();
          setUsers(usersData);
          if (!selectedUserId && usersData.length > 0) {
            setSelectedUserId(usersData[0].id);
          }
        } catch (err) {
          console.error('Error cargando usuarios:', err);
          setError('No se pudo cargar la lista de usuarios.');
        } finally {
          setLoading(false);
        }
      };
      loadUsers();
    } else {
      setUsers([currentUser as User]);
      setSelectedUserId(currentUser?.id || null);
    }
  }, [isAdmin, currentUser, selectedUserId]);

  useEffect(() => {
    if (!selectedUserId) {
      setTanks([]);
      setSelectedTankId('');
      setSensors([]);
      return;
    }
    const loadTanks = async () => {
      try {
        setLoading(true);
        setError(null);
        const tanksData = await tankService.getTanks(selectedUserId);
        setTanks(tanksData);
        if (tanksData.length > 0) {
          setSelectedTankId(tanksData[0].id);
        } else {
          setSelectedTankId('');
          setSensors([]);
          setError('El usuario no tiene tanques configurados.');
        }
      } catch (err) {
        console.error('Error cargando tanques:', err);
        setError('No se pudieron cargar los tanques.');
        setTanks([]); setSelectedTankId(''); setSensors([]);
      } finally {
        setLoading(false);
      }
    };
    loadTanks();
  }, [selectedUserId]);

  useEffect(() => {
    if (!selectedTankId) {
      setSensors([]);
      return;
    }
    const loadSensors = async () => {
      try {
        setLoading(true);
        setError(null);
        const sensorsData = await sensorService.getSensorsByTank(selectedTankId);
        setSensors(sensorsData);
        if (sensorsData.length === 0) {
          setError('El tanque no tiene sensores configurados.');
        }
        setManualReadings({});
      } catch (err) {
        console.error('Error cargando sensores:', err);
        setError('No se pudieron cargar los sensores.');
        setSensors([]);
      } finally {
        setLoading(false);
      }
    };
    loadSensors();
  }, [selectedTankId]);

  const stopSimulation = useCallback((sensorId: string) => {
    const simulation = activeSimulations[sensorId];
    if (!simulation) return;

    clearInterval(simulation.intervalId);
    delete previousValues.current[sensorId];
    
    setActiveSimulations(prev => {
      const newState = { ...prev };
      delete newState[sensorId];
      return newState;
    });

    const sensor = sensors.find(s => s.id === sensorId);
    console.log(`⏹️ Simulación detenida para sensor "${sensor?.name || sensorId}"`);
  }, [activeSimulations, sensors]);

  const handleUserChange = useCallback((userId: string) => {
    Object.keys(activeSimulations).forEach(stopSimulation);
    setSelectedUserId(userId);
    setManualReadings({});
    setError(null);
  }, [activeSimulations, stopSimulation]);

  const handleTankChange = useCallback((tankId: string) => {
    Object.keys(activeSimulations).forEach(stopSimulation);
    setSelectedTankId(tankId);
    setManualReadings({});
    setError(null);
  }, [activeSimulations, stopSimulation]);

  const handleManualReadingChange = useCallback((sensorId: string, value: string) => {
    setManualReadings(prev => ({ ...prev, [sensorId]: value }));
  }, []);

  const handleManualSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingManual) return;
    const entries: ManualEntryDto[] = sensors
      .filter(sensor => {
        const value = manualReadings[sensor.id]?.trim();
        return value && !isNaN(parseFloat(value));
      })
      .map(sensor => ({
        sensorId: sensor.id,
        value: parseFloat(manualReadings[sensor.id]),
        timestamp: new Date(),
      }));

    if (entries.length === 0) {
      await Swal.fire('Atención', 'Debe ingresar al menos un valor numérico válido.', 'warning');
      return;
    }

    try {
      setIsSubmittingManual(true);
      await Promise.all(entries.map(addManualEntry));
      setManualReadings({});
      await Swal.fire('¡Éxito!', `Se guardaron ${entries.length} lecturas.`, 'success', { timer: 2000, showConfirmButton: false });
    } catch (err) {
      console.error('Error enviando datos manuales:', err);
      await Swal.fire('Error', 'No se pudieron guardar los datos.', 'error');
    } finally {
      setIsSubmittingManual(false);
    }
  }, [sensors, manualReadings, isSubmittingManual]);
  
  const startSimulation = useCallback((sensor: Sensor) => {
    if (mqttConnectionStatus !== 'connected') {
      Swal.fire('Conexión MQTT no disponible', 'No se puede iniciar la simulación.', 'error');
      return;
    }
    if (activeSimulations[sensor.id]) return;

    const startTime = new Date();
    let messagesCount = 0;
    let currentValue = generateRealisticValue(sensor.type);
    previousValues.current[sensor.id] = currentValue;

    const intervalId = setInterval(async () => {
      try {
        currentValue = generateRealisticValue(sensor.type, currentValue);
        previousValues.current[sensor.id] = currentValue;
        const payload = {
          value: currentValue,
          timestamp: new Date().toISOString(),
          unit: getUnitForSensorType(sensor.type),
          sensor: { name: sensor.name, type: sensor.type }
        };
        await mqttService.publish(sensor.hardwareId, JSON.stringify(payload));
        messagesCount++;
        setActiveSimulations(prev => ({
          ...prev, [sensor.id]: { ...prev[sensor.id], messagesCount }
        }));
      } catch (error) {
        console.error(`Error en simulación del sensor ${sensor.name}:`, error);
      }
    }, 5000);

    setActiveSimulations(prev => ({
      ...prev, [sensor.id]: { intervalId, isActive: true, startTime, messagesCount: 0 }
    }));
    console.log(`✅ Simulación iniciada para sensor "${sensor.name}"`);
  }, [mqttConnectionStatus, activeSimulations]);
  
  const toggleSimulation = useCallback((sensor: Sensor) => {
    if (activeSimulations[sensor.id]) {
      stopSimulation(sensor.id);
    } else {
      startSimulation(sensor);
    }
  }, [activeSimulations, startSimulation, stopSimulation]);

  const getSimulationStatus = useCallback((sensorId: string) => {
    const simulation = activeSimulations[sensorId];
    if (!simulation) return null;
    const uptime = Math.floor((Date.now() - simulation.startTime.getTime()) / 1000);
    return {
      isActive: simulation.isActive,
      uptime,
      messagesCount: simulation.messagesCount,
      startTime: simulation.startTime
    };
  }, [activeSimulations]);

  return {
    users, selectedUserId, tanks, selectedTankId, sensors, loading, error, isAdmin,
    manualReadings, isSubmittingManual, activeSimulations, mqttConnectionStatus,
    handleUserChange, handleTankChange, handleManualReadingChange, handleManualSubmit,
    toggleSimulation, startSimulation, stopSimulation, getSimulationStatus,
    getUnitForSensorType: (type: SensorType) => getUnitForSensorType(type),
  };
};