/**
 * @file useDataEntry.ts
 * @description Hook unificado y optimizado para el ingreso de datos de sensores.
 * Maneja entrada manual y simulación MQTT con payload simplificado y agrupación por tanques.
 * @author Kevin Mariano 
 * @version 8.0.0 (Optimización MQTT)
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
 * @description Estado de una simulación activa con información del tanque
 */
interface SimulationState {
  intervalId: NodeJS.Timeout;
  isActive: boolean;
  startTime: Date;
  messagesCount: number;
  tankId: string;
  tankName: string;
  sensorName: string;
  sensorType: SensorType;
}

/**
 * @interface TankSimulationGroup
 * @description Agrupación de simulaciones por tanque
 */
interface TankSimulationGroup {
  tankId: string;
  tankName: string;
  activeSimulations: string[]; // sensorIds
  totalMessages: number;
  startTime: Date;
}

/**
 * @function generateRealisticValue
 * @description Genera valores realistas para la simulación de sensores
 * @param {SensorType} type - Tipo de sensor
 * @param {number} [previousValue] - Valor anterior para continuidad
 * @returns {number} Valor generado
 */
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
 * @description Hook principal para el manejo de datos de sensores con optimizaciones MQTT
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
  
  // Estados de entrada manual
  const [manualReadings, setManualReadings] = useState<Record<string, string>>({});
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);
  
  // Estados de simulación optimizados
  const [activeSimulations, setActiveSimulations] = useState<Record<string, SimulationState>>({});
  const [tankSimulationGroups, setTankSimulationGroups] = useState<Record<string, TankSimulationGroup>>({});
  const [mqttConnectionStatus, setMqttConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  
  // Referencias para valores previos y control de simulaciones
  const previousValues = useRef<Record<string, number>>({});
  const simulationIntervals = useRef<Map<string, NodeJS.Timeout>>(new Map());

  /**
   * @effect Inicialización de MQTT
   * @description Conecta a MQTT al montar y se desconecta de forma segura al desmontar
   */
  useEffect(() => {
    let isMounted = true;

    const initializeMqtt = async () => {
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
          console.log('✅ [MQTT] Conexión establecida exitosamente');
        }
      } catch (err) {
        console.error('❌ [MQTT] Error en la conexión inicial:', err);
        if (isMounted) {
          setMqttConnectionStatus('disconnected');
          setError('No se pudo conectar al servicio de simulación MQTT.');
        }
      }
    };

    initializeMqtt();

    return () => {
      isMounted = false;
      console.log('🧹 [CLEANUP] Limpiando hook useDataEntry...');
      
      // Detener todas las simulaciones activas
      simulationIntervals.current.forEach((intervalId, sensorId) => {
        console.log(`⏹️ [CLEANUP] Deteniendo simulación para sensor: ${sensorId}`);
        clearInterval(intervalId);
      });
      simulationIntervals.current.clear();
      
      // Limpiar valores previos
      previousValues.current = {};
    };
  }, []);

  /**
   * @effect Carga de usuarios (solo para administradores)
   */
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
          console.error('❌ [USERS] Error cargando usuarios:', err);
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

  /**
   * @effect Carga de tanques por usuario
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
          setSelectedTankId(tanksData[0].id);
        } else {
          setSelectedTankId('');
          setSensors([]);
          setError('El usuario no tiene tanques configurados.');
        }
      } catch (err) {
        console.error('❌ [TANKS] Error cargando tanques:', err);
        setError('No se pudieron cargar los tanques.');
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
   * @effect Carga de sensores por tanque
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
          setError('El tanque no tiene sensores configurados.');
        }
        
        setManualReadings({});
      } catch (err) {
        console.error('❌ [SENSORS] Error cargando sensores:', err);
        setError('No se pudieron cargar los sensores.');
        setSensors([]);
      } finally {
        setLoading(false);
      }
    };

    loadSensors();
  }, [selectedTankId]);

  /**
   * @function updateTankSimulationGroups
   * @description Actualiza la agrupación de simulaciones por tanque
   */
  const updateTankSimulationGroups = useCallback(() => {
    const groups: Record<string, TankSimulationGroup> = {};
    
    Object.values(activeSimulations).forEach(simulation => {
      const { tankId, tankName } = simulation;
      
      if (!groups[tankId]) {
        groups[tankId] = {
          tankId,
          tankName,
          activeSimulations: [],
          totalMessages: 0,
          startTime: simulation.startTime
        };
      }
      
      groups[tankId].activeSimulations.push(simulation.intervalId.toString());
      groups[tankId].totalMessages += simulation.messagesCount;
      
      // Actualizar fecha de inicio si esta simulación es más antigua
      if (simulation.startTime < groups[tankId].startTime) {
        groups[tankId].startTime = simulation.startTime;
      }
    });
    
    setTankSimulationGroups(groups);
  }, [activeSimulations]);

  /**
   * @effect Actualizar agrupaciones cuando cambien las simulaciones activas
   */
  useEffect(() => {
    updateTankSimulationGroups();
  }, [updateTankSimulationGroups]);

  /**
   * @function stopSimulation
   * @description Detiene una simulación específica
   */
  const stopSimulation = useCallback((sensorId: string) => {
    const simulation = activeSimulations[sensorId];
    if (!simulation) return;

    // Limpiar intervalo
    clearInterval(simulation.intervalId);
    simulationIntervals.current.delete(sensorId);
    
    // Limpiar valor previo
    delete previousValues.current[sensorId];
    
    // Actualizar estado
    setActiveSimulations(prev => {
      const newState = { ...prev };
      delete newState[sensorId];
      return newState;
    });

    const sensor = sensors.find(s => s.id === sensorId);
    console.log(`⏹️ [SIMULATION] Simulación detenida para sensor "${sensor?.name || sensorId}"`);
  }, [activeSimulations, sensors]);

  /**
   * @function stopTankSimulations
   * @description Detiene todas las simulaciones de un tanque
   */
  const stopTankSimulations = useCallback((tankId: string) => {
    const simulationsToStop = Object.keys(activeSimulations).filter(
      sensorId => activeSimulations[sensorId].tankId === tankId
    );
    
    simulationsToStop.forEach(stopSimulation);
    
    const tankGroup = tankSimulationGroups[tankId];
    if (tankGroup) {
      console.log(`⏹️ [TANK-SIMULATION] Detenidas ${simulationsToStop.length} simulaciones del tanque "${tankGroup.tankName}"`);
    }
  }, [activeSimulations, tankSimulationGroups, stopSimulation]);

  /**
   * @function handleUserChange
   * @description Maneja el cambio de usuario
   */
  const handleUserChange = useCallback((userId: string) => {
    // Detener todas las simulaciones activas
    Object.keys(activeSimulations).forEach(stopSimulation);
    
    setSelectedUserId(userId);
    setManualReadings({});
    setError(null);
  }, [activeSimulations, stopSimulation]);

  /**
   * @function handleTankChange
   * @description Maneja el cambio de tanque
   */
  const handleTankChange = useCallback((tankId: string) => {
    // Detener simulaciones del tanque anterior si es diferente
    if (selectedTankId && selectedTankId !== tankId) {
      stopTankSimulations(selectedTankId);
    }
    
    setSelectedTankId(tankId);
    setManualReadings({});
    setError(null);
  }, [selectedTankId, stopTankSimulations]);

  /**
   * @function handleManualReadingChange
   * @description Maneja el cambio en las lecturas manuales
   */
  const handleManualReadingChange = useCallback((sensorId: string, value: string) => {
    setManualReadings(prev => ({ ...prev, [sensorId]: value }));
  }, []);

  /**
   * @function handleManualSubmit
   * @description Maneja el envío de datos manuales
   */
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
      console.log(`📝 [MANUAL] Enviando ${entries.length} entradas manuales`);
      
      await Promise.all(entries.map(addManualEntry));
      setManualReadings({});
      
      await Swal.fire({
        title: '¡Éxito!',
        text: `Se guardaron ${entries.length} lecturas correctamente.`,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (err) {
      console.error('❌ [MANUAL] Error enviando datos manuales:', err);
      await Swal.fire({
        title: 'Error',
        text: 'No se pudieron guardar los datos. Inténtelo nuevamente.',
        icon: 'error',
        confirmButtonText: 'Entendido'
      });
    } finally {
      setIsSubmittingManual(false);
    }
  }, [sensors, manualReadings, isSubmittingManual]);
  
  /**
   * @function startSimulation
   * @description Inicia una simulación de sensor con payload optimizado
   */
  const startSimulation = useCallback((sensor: Sensor) => {
    if (mqttConnectionStatus !== 'connected') {
      Swal.fire({
        title: 'Conexión MQTT no disponible',
        text: 'No se puede iniciar la simulación sin conexión MQTT.',
        icon: 'error',
        confirmButtonText: 'Entendido'
      });
      return;
    }

    if (activeSimulations[sensor.id]) {
      console.warn(`⚠️ [SIMULATION] El sensor ${sensor.id} ya tiene una simulación activa`);
      return;
    }

    const startTime = new Date();
    let messagesCount = 0;
    let currentValue = generateRealisticValue(sensor.type);
    previousValues.current[sensor.id] = currentValue;

    // Obtener información del tanque
    const tank = tanks.find(t => t.id === sensor.tankId);
    const tankName = tank?.name || 'Tanque desconocido';

    console.log(`🚀 [SIMULATION] Iniciando simulación para sensor "${sensor.name}" (${sensor.type}) - Tanque: ${tankName}`);

    const intervalId = setInterval(async () => {
      try {
        // Generar nuevo valor realista
        currentValue = generateRealisticValue(sensor.type, currentValue);
        previousValues.current[sensor.id] = currentValue;

        // 🎯 PAYLOAD OPTIMIZADO: Solo enviar el valor
        const optimizedPayload = currentValue;
        
        // Publicar con payload simplificado
        await mqttService.publish(sensor.hardwareId, optimizedPayload.toString());
        
        messagesCount++;
        
        // Actualizar contador de mensajes
        setActiveSimulations(prev => ({
          ...prev,
          [sensor.id]: {
            ...prev[sensor.id],
            messagesCount
          }
        }));
        
        // Log cada 10 mensajes para no saturar la consola
        if (messagesCount % 10 === 0) {
          console.log(`📊 [SIMULATION] Sensor "${sensor.name}": ${messagesCount} mensajes enviados (Último: ${currentValue})`);
        }

      } catch (error) {
        console.error(`❌ [SIMULATION] Error en simulación del sensor ${sensor.name}:`, error);
        
        // Si hay muchos errores consecutivos, detener la simulación
        const errorCount = (error as any).consecutiveErrors || 0;
        if (errorCount > 5) {
          console.error(`🚨 [SIMULATION] Demasiados errores, deteniendo simulación para ${sensor.name}`);
          stopSimulation(sensor.id);
        } else {
          (error as any).consecutiveErrors = errorCount + 1;
        }
      }
    }, 5000); // Enviar cada 5 segundos

    // Registrar intervalo
    simulationIntervals.current.set(sensor.id, intervalId);

    // Actualizar estado de simulaciones activas
    setActiveSimulations(prev => ({
      ...prev,
      [sensor.id]: {
        intervalId,
        isActive: true,
        startTime,
        messagesCount: 0,
        tankId: sensor.tankId,
        tankName,
        sensorName: sensor.name,
        sensorType: sensor.type
      }
    }));

    console.log(`✅ [SIMULATION] Simulación iniciada para "${sensor.name}" con payload optimizado`);
  }, [mqttConnectionStatus, activeSimulations, tanks, mqttService, stopSimulation]);
  
  /**
   * @function toggleSimulation
   * @description Alterna el estado de simulación de un sensor
   */
  const toggleSimulation = useCallback((sensor: Sensor) => {
    if (activeSimulations[sensor.id]) {
      stopSimulation(sensor.id);
    } else {
      startSimulation(sensor);
    }
  }, [activeSimulations, startSimulation, stopSimulation]);

  /**
   * @function getSimulationStatus
   * @description Obtiene el estado de una simulación específica
   */
  const getSimulationStatus = useCallback((sensorId: string) => {
    const simulation = activeSimulations[sensorId];
    if (!simulation) return null;

    const uptime = Math.floor((Date.now() - simulation.startTime.getTime()) / 1000);
    return {
      isActive: simulation.isActive,
      uptime,
      messagesCount: simulation.messagesCount,
      startTime: simulation.startTime,
      tankName: simulation.tankName,
      currentValue: previousValues.current[sensorId] || 0
    };
  }, [activeSimulations]);

  /**
   * @function getTankSimulationsSummary
   * @description Obtiene resumen de simulaciones agrupadas por tanque
   */
  const getTankSimulationsSummary = useCallback(() => {
    return Object.values(tankSimulationGroups).map(group => ({
      ...group,
      uptime: Math.floor((Date.now() - group.startTime.getTime()) / 1000),
      averageMessages: Math.floor(group.totalMessages / group.activeSimulations.length) || 0
    }));
  }, [tankSimulationGroups]);

  return {
    // Estados básicos
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
    tankSimulationGroups,
    mqttConnectionStatus,
    
    // Funciones de manejo
    handleUserChange,
    handleTankChange,
    handleManualReadingChange,
    handleManualSubmit,
    
    // Funciones de simulación
    toggleSimulation,
    startSimulation,
    stopSimulation,
    stopTankSimulations,
    getSimulationStatus,
    getTankSimulationsSummary,
    
    // Utilidades
    getUnitForSensorType: (type: SensorType) => getUnitForSensorType(type),
  };
};