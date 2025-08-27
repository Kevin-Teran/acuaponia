/**
 * @file useDataEntry.ts
 * @description Hook unificado y optimizado para el ingreso de datos de sensores.
 * Maneja entrada manual y simulación MQTT con el nuevo formato de topic simplificado.
 * @author Kevin Mariano (Reconstruido y optimizado por Gemini)
 * @version 6.0.0
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

/**
 * @interface SimulationState
 * @description Estado de la simulación para cada sensor
 * @property {NodeJS.Timeout} intervalId - ID del intervalo de simulación
 * @property {boolean} isActive - Si la simulación está activa
 * @property {Date} startTime - Momento de inicio de la simulación
 * @property {number} messagesCount - Número de mensajes enviados
 */
interface SimulationState {
  intervalId: NodeJS.Timeout;
  isActive: boolean;
  startTime: Date;
  messagesCount: number;
}

/**
 * @function generateRealisticValue
 * @description Genera valores realistas según el tipo de sensor con variaciones naturales
 * @param {SensorType} type - Tipo de sensor
 * @param {number} [previousValue] - Valor anterior para generar variación gradual
 * @returns {number} Valor simulado realista
 */
const generateRealisticValue = (type: SensorType, previousValue?: number): number => {
  let baseValue: number;
  let variation: number;
  
  switch (type) {
    case 'TEMPERATURE':
      baseValue = previousValue || 25; // °C
      variation = (Math.random() - 0.5) * 2; // ±1°C
      return parseFloat(Math.max(18, Math.min(32, baseValue + variation)).toFixed(1));
      
    case 'PH':
      baseValue = previousValue || 7.2; // pH
      variation = (Math.random() - 0.5) * 0.4; // ±0.2 pH
      return parseFloat(Math.max(6.0, Math.min(8.5, baseValue + variation)).toFixed(2));
      
    case 'OXYGEN':
      baseValue = previousValue || 7.5; // mg/L
      variation = (Math.random() - 0.5) * 1.0; // ±0.5 mg/L
      return parseFloat(Math.max(4.0, Math.min(12.0, baseValue + variation)).toFixed(1));
      
    default:
      return parseFloat((Math.random() * 100).toFixed(2));
  }
};

/**
 * @function getUnitForSensorType
 * @description Obtiene la unidad de medida para un tipo de sensor
 * @param {SensorType} type - Tipo de sensor
 * @returns {string} Unidad de medida
 */
const getUnitForSensorType = (type: SensorType): string => {
  switch (type) {
    case 'TEMPERATURE': return '°C';
    case 'PH': return 'pH';
    case 'OXYGEN': return 'mg/L';
    default: return '';
  }
};

/**
 * @hook useDataEntry
 * @description Hook principal para el manejo de ingreso de datos y simulaciones
 * @returns {Object} Objeto con estado y funciones para el manejo de datos
 */
export const useDataEntry = () => {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'ADMIN';

  // Estados principales
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(currentUser?.id || null);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [selectedTankId, setSelectedTankId] = useState<string>('');
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para entrada manual
  const [manualReadings, setManualReadings] = useState<Record<string, string>>({});
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);
  
  // Estados para simulación
  const [activeSimulations, setActiveSimulations] = useState<Record<string, SimulationState>>({});
  const [mqttConnectionStatus, setMqttConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  
  // Refs para valores anteriores de simulación
  const previousValues = useRef<Record<string, number>>({});

  /**
   * @effect Inicialización de MQTT
   * @description Conecta al servicio MQTT al montar el componente y limpia al desmontar
   */
  useEffect(() => {
    let isMounted = true;

    const initializeMqtt = async () => {
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
          setError("No se pudo conectar al servicio de simulación MQTT. Verifique la configuración.");
        }
      }
    };

    initializeMqtt();

    return () => {
      isMounted = false;
      // Limpiar todas las simulaciones activas
      Object.values(activeSimulations).forEach(simulation => {
        if (simulation.intervalId) {
          clearInterval(simulation.intervalId);
        }
      });
      mqttService.disconnect();
    };
  }, []); // Solo se ejecuta una vez al montar

  /**
   * @effect Cargar usuarios (solo administradores)
   * @description Carga la lista de usuarios si el usuario actual es administrador
   */
  useEffect(() => {
    if (isAdmin) {
      const loadUsers = async () => {
        try {
          setLoading(true);
          const usersData = await userService.getUsers();
          setUsers(usersData);
          
          // Seleccionar el primer usuario si no hay ninguno seleccionado
          if (!selectedUserId && usersData.length > 0) {
            setSelectedUserId(usersData[0].id);
          }
        } catch (err) {
          console.error('Error cargando usuarios:', err);
          setError('No se pudo cargar la lista de usuarios. Por favor, recargue la página.');
        } finally {
          setLoading(false);
        }
      };

      loadUsers();
    } else {
      // Para usuarios no admin, usar su propio ID
      setUsers([currentUser as User]);
      setSelectedUserId(currentUser?.id || null);
    }
  }, [isAdmin, currentUser, selectedUserId]);

  /**
   * @effect Cargar tanques cuando cambia el usuario seleccionado
   * @description Obtiene los tanques del usuario seleccionado
   */
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
          // Seleccionar el primer tanque automáticamente
          setSelectedTankId(tanksData[0].id);
        } else {
          setSelectedTankId('');
          setSensors([]);
          setError('El usuario seleccionado no tiene tanques configurados.');
        }
      } catch (err) {
        console.error('Error cargando tanques:', err);
        setError('No se pudieron cargar los tanques. Verifique su conexión.');
        setTanks([]);
        setSelectedTankId('');
        setSensors([]);
      } finally {
        setLoading(false);
      }
    };

    loadTanks();
  }, [selectedUserId]);

  /**
   * @effect Cargar sensores cuando cambia el tanque seleccionado
   * @description Obtiene los sensores del tanque seleccionado
   */
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
          setError('El tanque seleccionado no tiene sensores configurados.');
        }
        
        // Limpiar lecturas manuales al cambiar de tanque
        setManualReadings({});
        
      } catch (err) {
        console.error('Error cargando sensores:', err);
        setError('No se pudieron cargar los sensores del tanque seleccionado.');
        setSensors([]);
      } finally {
        setLoading(false);
      }
    };

    loadSensors();
  }, [selectedTankId]);

  /**
   * @callback handleUserChange
   * @description Maneja el cambio de usuario seleccionado
   * @param {string} userId - ID del usuario seleccionado
   */
  const handleUserChange = useCallback((userId: string) => {
    // Detener todas las simulaciones activas al cambiar de usuario
    Object.keys(activeSimulations).forEach(sensorId => {
      stopSimulation(sensorId);
    });
    
    setSelectedUserId(userId);
    setManualReadings({});
    setError(null);
  }, [activeSimulations]);

  /**
   * @callback handleTankChange
   * @description Maneja el cambio de tanque seleccionado
   * @param {string} tankId - ID del tanque seleccionado
   */
  const handleTankChange = useCallback((tankId: string) => {
    // Detener todas las simulaciones activas al cambiar de tanque
    Object.keys(activeSimulations).forEach(sensorId => {
      stopSimulation(sensorId);
    });
    
    setSelectedTankId(tankId);
    setManualReadings({});
    setError(null);
  }, [activeSimulations]);

  /**
   * @callback handleManualReadingChange
   * @description Maneja cambios en las lecturas manuales
   * @param {string} sensorId - ID del sensor
   * @param {string} value - Valor ingresado
   */
  const handleManualReadingChange = useCallback((sensorId: string, value: string) => {
    setManualReadings(prev => ({ ...prev, [sensorId]: value }));
  }, []);

  /**
   * @callback handleManualSubmit
   * @description Maneja el envío de datos manuales
   * @param {React.FormEvent} e - Evento del formulario
   */
  const handleManualSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmittingManual) return;
    
    // Filtrar solo sensores con valores válidos
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
      await Swal.fire({
        title: 'Atención',
        text: 'Debe ingresar al menos un valor numérico válido.',
        icon: 'warning',
        confirmButtonText: 'Entendido'
      });
      return;
    }

    try {
      setIsSubmittingManual(true);
      
      // Enviar todas las entradas
      const promises = entries.map(entry => addManualEntry(entry));
      await Promise.all(promises);

      // Limpiar formulario
      setManualReadings({});
      
      await Swal.fire({
        title: '¡Éxito!',
        text: `Se guardaron ${entries.length} lecturas manuales correctamente.`,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
      
    } catch (err) {
      console.error('Error enviando datos manuales:', err);
      await Swal.fire({
        title: 'Error',
        text: 'No se pudieron guardar los datos manuales. Por favor, inténtelo nuevamente.',
        icon: 'error',
        confirmButtonText: 'Entendido'
      });
    } finally {
      setIsSubmittingManual(false);
    }
  }, [sensors, manualReadings, isSubmittingManual]);

  /**
   * @callback startSimulation
   * @description Inicia la simulación para un sensor específico
   * @param {Sensor} sensor - Sensor a simular
   */
  const startSimulation = useCallback((sensor: Sensor) => {
    if (mqttConnectionStatus !== 'connected') {
      Swal.fire({
        title: 'Conexión MQTT no disponible',
        text: 'No se puede iniciar la simulación sin conexión al servicio MQTT.',
        icon: 'error',
        confirmButtonText: 'Entendido'
      });
      return;
    }

    if (activeSimulations[sensor.id]) {
      return; // Ya está activa
    }

    const startTime = new Date();
    let messagesCount = 0;
    
    // Obtener valor inicial realista
    let currentValue = generateRealisticValue(sensor.type);
    previousValues.current[sensor.id] = currentValue;

    const intervalId = setInterval(async () => {
      try {
        // Generar nuevo valor basado en el anterior
        currentValue = generateRealisticValue(sensor.type, currentValue);
        previousValues.current[sensor.id] = currentValue;
        
        // Crear payload con formato mejorado
        const payload = {
          value: currentValue,
          timestamp: new Date().toISOString(),
          unit: getUnitForSensorType(sensor.type),
          sensor: {
            name: sensor.name,
            type: sensor.type
          }
        };

        // Publicar usando el nuevo formato de topic: solo hardwareId
        const topic = sensor.hardwareId;
        await mqttService.publish(topic, JSON.stringify(payload));
        
        messagesCount++;
        
        // Actualizar estado de simulación
        setActiveSimulations(prev => ({
          ...prev,
          [sensor.id]: {
            ...prev[sensor.id],
            messagesCount
          }
        }));

      } catch (error) {
        console.error(`Error en simulación del sensor ${sensor.name}:`, error);
      }
    }, 5000); // Enviar datos cada 5 segundos

    // Registrar nueva simulación
    setActiveSimulations(prev => ({
      ...prev,
      [sensor.id]: {
        intervalId,
        isActive: true,
        startTime,
        messagesCount: 0
      }
    }));

    console.log(`✅ Simulación iniciada para sensor "${sensor.name}" (${sensor.hardwareId})`);
  }, [mqttConnectionStatus, activeSimulations]);

  /**
   * @callback stopSimulation
   * @description Detiene la simulación para un sensor específico
   * @param {string} sensorId - ID del sensor
   */
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

  /**
   * @callback toggleSimulation
   * @description Alterna el estado de simulación para un sensor
   * @param {Sensor} sensor - Sensor a alternar
   */
  const toggleSimulation = useCallback((sensor: Sensor) => {
    const isSimulating = activeSimulations[sensor.id];
    
    if (isSimulating) {
      stopSimulation(sensor.id);
    } else {
      startSimulation(sensor);
    }
  }, [activeSimulations, startSimulation, stopSimulation]);

  /**
   * @callback getSimulationStatus
   * @description Obtiene el estado de simulación de un sensor
   * @param {string} sensorId - ID del sensor
   * @returns {Object|null} Estado de simulación o null si no está activa
   */
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
    // Estados principales
    users,
    selectedUserId,
    tanks,
    selectedTankId,
    sensors,
    loading,
    error,
    isAdmin,
    
    // Estados de entrada manual
    manualReadings,
    isSubmittingManual,
    
    // Estados de simulación
    activeSimulations,
    mqttConnectionStatus,
    
    // Funciones de manejo de estado
    handleUserChange,
    handleTankChange,
    
    // Funciones de entrada manual
    handleManualReadingChange,
    handleManualSubmit,
    
    // Funciones de simulación
    toggleSimulation,
    startSimulation,
    stopSimulation,
    getSimulationStatus,
    
    // Funciones de utilidad
    getUnitForSensorType: (type: SensorType) => getUnitForSensorType(type),
  };
};