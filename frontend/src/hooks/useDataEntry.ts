/**
 * @file useDataEntry.ts
 * @description Hook mejorado y optimizado para el ingreso de datos con simulaciones persistentes.
 * @author Kevin Mariano 
 * @version 10.0.0
 * @since 1.0.0
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { Tank, Sensor, UserFromApi as User, SensorType, ManualEntryDto } from '@/types';
import * as tankService from '@/services/tankService';
import * as sensorService from '@/services/sensorService';
import * as userService from '@/services/userService';
import * as dataService from '@/services/dataService';
import { EmitterStatus, SimulationMetrics } from '@/services/dataService';
import { mqttService } from '@/services/mqttService';
import { useAuth } from '@/context/AuthContext';
import Swal from 'sweetalert2';

interface ActiveSimulationsSummary {
  totalActive: number;
  byTank: Record<string, { count: number; tankName: string; simulations: EmitterStatus[] }>;
  byType: Record<SensorType, number>;
  totalMessages: number;
  systemUptime: number;
}

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
  
  // Estados de simulación mejorados
  const [activeSimulations, setActiveSimulations] = useState<EmitterStatus[]>([]);
  const [simulationMetrics, setSimulationMetrics] = useState<SimulationMetrics | null>(null);
  const [mqttConnectionStatus, setMqttConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [isTogglingSimulation, setIsTogglingSimulation] = useState<Set<string>>(new Set());
  
  // Referencias y control
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncTime = useRef<Date>(new Date());

  /**
   * @effect Inicialización de MQTT y sincronización
   */
  useEffect(() => {
    let isMounted = true;

    const initializeServices = async () => {
      try {
        // Conectar MQTT
        setMqttConnectionStatus('connecting');
        if (!mqttService.isConnected()) {
          await mqttService.connect();
        }
        
        if (isMounted) {
          setMqttConnectionStatus('connected');
          console.log('✅ [MQTT] Conexión establecida');
        }
      } catch (err) {
        console.error('❌ [MQTT] Error en conexión:', err);
        if (isMounted) {
          setMqttConnectionStatus('disconnected');
          setError('Error de conexión MQTT. Las simulaciones podrían no funcionar correctamente.');
        }
      }
    };

    // Función de sincronización mejorada
    const syncSimulationStatus = async () => {
      if (!isMounted) return;
      
      try {
        const [statusData, metricsData] = await Promise.all([
          dataService.getEmitterStatus(),
          dataService.getSimulationMetrics()
        ]);
        
        if (isMounted) {
          setActiveSimulations(statusData);
          setSimulationMetrics(metricsData);
          lastSyncTime.current = new Date();
          
          // Log cada 30 segundos para no saturar
          const now = Date.now();
          if (now % 30000 < 5000) {
            console.log(`🔄 [SYNC] Estado actualizado: ${statusData.length} simulaciones activas`);
          }
        }
      } catch (error) {
        console.error('❌ [SYNC] Error sincronizando estado:', error);
        if (isMounted && error instanceof Error && error.message.includes('403')) {
          setError('Sin permisos para acceder a las simulaciones');
        }
      }
    };

    // Inicializar servicios y configurar sincronización
    initializeServices();
    syncSimulationStatus(); // Sincronización inicial
    
    // Configurar sincronización periódica más inteligente
    syncIntervalRef.current = setInterval(syncSimulationStatus, 10000); // Cada 10 segundos

    return () => {
      isMounted = false;
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
      console.log('🧹 [CLEANUP] Limpiando hook useDataEntry');
    };
  }, []);

  /**
   * @effect Suscriptor a cambios de estado MQTT
   */
  useEffect(() => {
    const unsubscribe = mqttService.onStatusChange(status => {
      if (status.connected) {
        setMqttConnectionStatus('connected');
        setError(null);
      } else if (status.connecting) {
        setMqttConnectionStatus('connecting');
      } else {
        setMqttConnectionStatus('disconnected');
        if (status.error) {
          setError(`Error MQTT: ${status.error}`);
        }
      }
    });

    return unsubscribe;
  }, []);

  /**
   * @effect Carga de usuarios
   */
  useEffect(() => {
    const loadUsers = async () => {
      if (!isAdmin) {
        if (currentUser) {
          setUsers([currentUser as User]);
          setSelectedUserId(currentUser.id);
        }
        return;
      }

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
   * @function handleUserChange
   */
  const handleUserChange = useCallback((userId: string) => {
    setSelectedUserId(userId);
    setManualReadings({});
    setError(null);
  }, []);

  /**
   * @function handleTankChange
   */
  const handleTankChange = useCallback((tankId: string) => {
    setSelectedTankId(tankId);
    setManualReadings({});
    setError(null);
  }, []);

  /**
   * @function handleManualReadingChange
   */
  const handleManualReadingChange = useCallback((sensorId: string, value: string) => {
    setManualReadings(prev => ({ ...prev, [sensorId]: value }));
  }, []);

  /**
   * @function handleManualSubmit
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
      
      await dataService.addManualEntries(entries);
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
   * @function toggleSimulation - Mejorada para manejar simulaciones persistentes
   */
  const toggleSimulation = useCallback(async (sensor: Sensor) => {
    if (isTogglingSimulation.has(sensor.id)) return;

    const isActive = activeSimulations.some(sim => sim.sensorId === sensor.id);
    
    setIsTogglingSimulation(prev => new Set(prev).add(sensor.id));

    try {
      if (isActive) {
        const result = await dataService.stopEmitter(sensor.id);
        console.log(`⏹️ [SIMULATION] Simulación detenida para ${sensor.name}:`, result);
        
        await Swal.fire({
          title: 'Simulación detenida',
          text: `La simulación del sensor "${sensor.name}" ha sido detenida.`,
          icon: 'info',
          timer: 2000,
          showConfirmButton: false
        });
      } else {
        if (mqttConnectionStatus !== 'connected') {
          await Swal.fire({
            title: 'Conexión MQTT requerida',
            text: 'No se puede iniciar la simulación sin conexión MQTT activa.',
            icon: 'warning',
            confirmButtonText: 'Entendido'
          });
          return;
        }

        const result = await dataService.startEmitters([sensor.id]);
        console.log(`🚀 [SIMULATION] Resultado inicio simulación:`, result);
        
        if (result.started.length > 0) {
          await Swal.fire({
            title: 'Simulación iniciada',
            text: `La simulación del sensor "${sensor.name}" ha sido iniciada exitosamente.`,
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
          });
        } else if (result.errors.length > 0) {
          await Swal.fire({
            title: 'Error al iniciar simulación',
            text: result.errors[0],
            icon: 'error',
            confirmButtonText: 'Entendido'
          });
        }
      }
      
      // Forzar sincronización inmediata
      setTimeout(async () => {
        try {
          const [statusData, metricsData] = await Promise.all([
            dataService.getEmitterStatus(),
            dataService.getSimulationMetrics()
          ]);
          setActiveSimulations(statusData);
          setSimulationMetrics(metricsData);
        } catch (error) {
          console.error('❌ [SYNC] Error en sincronización forzada:', error);
        }
      }, 1000);

    } catch (error) {
      console.error(`❌ [SIMULATION] Error alternando simulación para ${sensor.name}:`, error);
      await Swal.fire({
        title: 'Error',
        text: 'No se pudo cambiar el estado de la simulación.',
        icon: 'error',
        confirmButtonText: 'Entendido'
      });
    } finally {
      setIsTogglingSimulation(prev => {
        const newSet = new Set(prev);
        newSet.delete(sensor.id);
        return newSet;
      });
    }
  }, [activeSimulations, mqttConnectionStatus, isTogglingSimulation]);

  /**
   * @function startMultipleSimulations
   */
  const startMultipleSimulations = useCallback(async (sensorIds: string[]) => {
    if (mqttConnectionStatus !== 'connected') {
      await Swal.fire({
        title: 'Conexión MQTT requerida',
        text: 'No se pueden iniciar simulaciones sin conexión MQTT.',
        icon: 'warning',
        confirmButtonText: 'Entendido'
      });
      return;
    }

    try {
      const result = await dataService.startEmitters(sensorIds);
      
      if (result.started.length > 0 || result.skipped.length > 0) {
        let message = `Se iniciaron ${result.started.length} simulaciones`;
        if (result.skipped.length > 0) {
          message += ` (${result.skipped.length} ya estaban activas)`;
        }
        if (result.errors.length > 0) {
          message += `. ${result.errors.length} tuvieron errores`;
        }
        
        await Swal.fire({
          title: 'Simulaciones iniciadas',
          text: message,
          icon: 'success',
          timer: 3000,
          showConfirmButton: false
        });
      } else {
        await Swal.fire({
          title: 'No se pudieron iniciar simulaciones',
          text: result.errors.join('. '),
          icon: 'error',
          confirmButtonText: 'Entendido'
        });
      }
      
      // Sincronización forzada
      setTimeout(async () => {
        try {
          const [statusData, metricsData] = await Promise.all([
            dataService.getEmitterStatus(),
            dataService.getSimulationMetrics()
          ]);
          setActiveSimulations(statusData);
          setSimulationMetrics(metricsData);
        } catch (error) {
          console.error('❌ Error en sincronización:', error);
        }
      }, 1000);
      
    } catch (error) {
      console.error('❌ Error iniciando múltiples simulaciones:', error);
      await Swal.fire({
        title: 'Error',
        text: 'No se pudieron iniciar las simulaciones.',
        icon: 'error',
        confirmButtonText: 'Entendido'
      });
    }
  }, [mqttConnectionStatus]);

  /**
   * @function stopMultipleSimulations
   */
  const stopMultipleSimulations = useCallback(async (sensorIds: string[]) => {
    try {
      const result = await dataService.stopMultipleEmitters(sensorIds);
      
      let message = `Se detuvieron ${result.stopped.length} simulaciones`;
      if (result.notFound.length > 0) {
        message += `. ${result.notFound.length} no estaban activas`;
      }
      if (result.noPermission.length > 0) {
        message += `. Sin permisos para ${result.noPermission.length}`;
      }
      
      await Swal.fire({
        title: 'Simulaciones detenidas',
        text: message,
        icon: 'info',
        timer: 3000,
        showConfirmButton: false
      });
      
      // Sincronización forzada
      setTimeout(async () => {
        try {
          const [statusData, metricsData] = await Promise.all([
            dataService.getEmitterStatus(),
            dataService.getSimulationMetrics()
          ]);
          setActiveSimulations(statusData);
          setSimulationMetrics(metricsData);
        } catch (error) {
          console.error('❌ Error en sincronización:', error);
        }
      }, 1000);
      
    } catch (error) {
      console.error('❌ Error deteniendo múltiples simulaciones:', error);
      await Swal.fire({
        title: 'Error',
        text: 'No se pudieron detener las simulaciones.',
        icon: 'error',
        confirmButtonText: 'Entendido'
      });
    }
  }, []);

  /**
   * @function getActiveSimulationsSummary
   */
  const getActiveSimulationsSummary = useCallback((): ActiveSimulationsSummary => {
    const byTank: Record<string, { count: number; tankName: string; simulations: EmitterStatus[] }> = {};
    const byType: Record<SensorType, number> = {
      TEMPERATURE: 0,
      PH: 0,
      OXYGEN: 0
    };
    let totalMessages = 0;

    activeSimulations.forEach(sim => {
      // Agrupar por tanque
      if (!byTank[sim.tankId]) {
        byTank[sim.tankId] = {
          count: 0,
          tankName: sim.tankName,
          simulations: []
        };
      }
      byTank[sim.tankId].count++;
      byTank[sim.tankId].simulations.push(sim);

      // Contar por tipo
      byType[sim.type as SensorType]++;
      
      // Sumar mensajes
      totalMessages += sim.messagesCount;
    });

    return {
      totalActive: activeSimulations.length,
      byTank,
      byType,
      totalMessages,
      systemUptime: simulationMetrics?.systemUptime || 0
    };
  }, [activeSimulations, simulationMetrics]);

  /**
   * @function getSimulationStatus
   */
  const getSimulationStatus = useCallback((sensorId: string) => {
    return activeSimulations.find(sim => sim.sensorId === sensorId) || null;
  }, [activeSimulations]);

  /**
   * @function isSimulationActive
   */
  const isSimulationActive = useCallback((sensorId: string) => {
    return activeSimulations.some(sim => sim.sensorId === sensorId);
  }, [activeSimulations]);

  /**
   * @function getUnitForSensorType
   */
  const getUnitForSensorType = useCallback((type: SensorType): string => {
    switch (type) {
      case 'TEMPERATURE': return '°C';
      case 'PH': return 'pH';
      case 'OXYGEN': return 'mg/L';
      default: return '';
    }
  }, []);

  /**
   * @function forceSyncSimulations - Función para sincronizar manualmente
   */
  const forceSyncSimulations = useCallback(async () => {
    try {
      const [statusData, metricsData] = await Promise.all([
        dataService.getEmitterStatus(),
        dataService.getSimulationMetrics()
      ]);
      setActiveSimulations(statusData);
      setSimulationMetrics(metricsData);
      lastSyncTime.current = new Date();
      console.log('🔄 [SYNC] Sincronización manual completada');
    } catch (error) {
      console.error('❌ [SYNC] Error en sincronización manual:', error);
      throw error;
    }
  }, []);

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
    
    // Estados de simulación mejorados
    activeSimulations,
    simulationMetrics,
    mqttConnectionStatus,
    isTogglingSimulation,
    
    // Funciones de manejo básico
    handleUserChange,
    handleTankChange,
    handleManualReadingChange,
    handleManualSubmit,
    
    // Funciones de simulación mejoradas
    toggleSimulation,
    startMultipleSimulations,
    stopMultipleSimulations,
    getSimulationStatus,
    isSimulationActive,
    getActiveSimulationsSummary,
    forceSyncSimulations,
    
    // Utilidades
    getUnitForSensorType,
    lastSyncTime: lastSyncTime.current,
  };
};