/**
 * @file useDataEntry.ts
 * @description Hook unificado para el ingreso de datos, ahora con control de simulación persistente en backend.
 * Sincroniza el estado de la UI con los emisores activos en el servidor.
 * @author Kevin Mariano 
 * @version 9.1.0 
 * @since 1.0.0
 */
import { useState, useEffect, useCallback } from 'react';
import { Tank, Sensor, UserFromApi as User, ManualEntryDto } from '@/types';
import * as tankService from '@/services/tankService';
import * as sensorService from '@/services/sensorService';
import * as userService from '@/services/userService';
import * as dataService from '@/services/dataService';
import { mqttService } from '@/services/mqttService';
import { useAuth } from '@/context/AuthContext';
import Swal from 'sweetalert2';

export const useDataEntry = () => {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'ADMIN';

  // Estados de UI y datos
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(currentUser?.id || null);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [selectedTankId, setSelectedTankId] = useState<string>('');
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estado de entrada manual
  const [manualReadings, setManualReadings] = useState<Record<string, string>>({});
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);
  
  // Estado de simulación y conexión
  const [activeSimulations, setActiveSimulations] = useState<Set<string>>(new Set());
  const [isTogglingSimulation, setIsTogglingSimulation] = useState<Set<string>>(new Set());
  const [mqttConnectionStatus, setMqttConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');

  // --- SINCRONIZACIÓN CON BACKEND Y MQTT ---

  /**
   * @effect
   * @description Se suscribe a los cambios de estado de MQTT y sincroniza los emisores activos.
   * Este es el núcleo de la lógica reactiva y persistente.
   */
  useEffect(() => {
    // 1. Intentar conectar al cargar el componente
    mqttService.connect().catch(err => {
        console.error("Fallo en el intento de conexión inicial de MQTT:", err);
        // El listener de abajo se encargará de actualizar el estado a 'disconnected'
    });

    // 2. Suscribirse a los cambios de estado del servicio MQTT
    const unsubscribeStatus = mqttService.onStatusChange(status => {
        if (status.connected) {
            setMqttConnectionStatus('connected');
        } else if (status.connecting) {
            setMqttConnectionStatus('connecting');
        } else {
            setMqttConnectionStatus('disconnected');
            if(status.error) {
                console.error("Error de conexión MQTT reportado por el servicio:", status.error);
                setError('No se pudo conectar al servicio de simulación.');
            }
        }
    });

    // 3. Sincronizar el estado de los emisores con el backend
    const syncEmittersStatus = async () => {
        try {
            const status = await dataService.getEmitterStatus();
            const activeIds = new Set(status.map(emitter => emitter.sensorId));
            setActiveSimulations(activeIds);
        } catch (err) {
            console.error('❌ [SYNC] Error al sincronizar el estado de los simuladores:', err);
        }
    };

    syncEmittersStatus(); // Sincronización inicial
    const syncInterval = setInterval(syncEmittersStatus, 15000); // Sincroniza periódicamente

    // 4. Limpiar suscripciones e intervalos al desmontar el componente
    return () => {
        unsubscribeStatus();
        clearInterval(syncInterval);
    };
  }, []); // Se ejecuta solo una vez al montar


  // --- CARGA DE DATOS (Usuarios, Tanques, Sensores) ---

  useEffect(() => {
    const loadInitialData = async () => {
        setLoading(true);
        try {
            if (isAdmin) {
                const usersData = await userService.getUsers();
                setUsers(usersData);
                if (!selectedUserId && usersData.length > 0) {
                    setSelectedUserId(usersData[0].id);
                }
            } else if (currentUser) {
                setUsers([currentUser as User]);
                setSelectedUserId(currentUser.id);
            }
        } catch (err) {
            setError('No se pudo cargar la lista de usuarios.');
        } finally {
            setLoading(false);
        }
    };
    loadInitialData();
  }, [isAdmin, currentUser]);

  useEffect(() => {
    if (!selectedUserId) {
        setTanks([]);
        setSensors([]);
        setSelectedTankId('');
        return;
    };
    const loadTanks = async () => {
        setLoading(true);
        try {
            const tanksData = await tankService.getTanks(selectedUserId);
            setTanks(tanksData);
            const newSelectedTankId = tanksData[0]?.id || '';
            setSelectedTankId(newSelectedTankId);
            if (!newSelectedTankId) setSensors([]);
        } catch (err) {
            setError('No se pudieron cargar los tanques.');
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
    };
    const loadSensors = async () => {
        setLoading(true);
        try {
            const sensorsData = await sensorService.getSensorsByTank(selectedTankId);
            setSensors(sensorsData);
        } catch (err) {
            setError('No se pudieron cargar los sensores.');
        } finally {
            setLoading(false);
        }
    };
    loadSensors();
  }, [selectedTankId]);

  // --- MANEJADORES DE EVENTOS ---

  const handleUserChange = (userId: string) => {
    setSelectedUserId(userId);
  };

  const handleTankChange = (tankId: string) => {
    setSelectedTankId(tankId);
  };
  
  const handleManualReadingChange = (sensorId: string, value: string) => {
    setManualReadings(prev => ({ ...prev, [sensorId]: value }));
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const entries: ManualEntryDto[] = Object.entries(manualReadings)
      .map(([sensorId, value]) => ({ sensorId, value: parseFloat(value) }))
      .filter(entry => !isNaN(entry.value));

    if (entries.length === 0) {
      Swal.fire('Atención', 'Debe ingresar al menos un valor numérico válido.', 'warning');
      return;
    }
    
    setIsSubmittingManual(true);
    try {
      await dataService.addManualEntries(entries);
      setManualReadings({});
      Swal.fire('¡Éxito!', `Se guardaron ${entries.length} lecturas.`, 'success');
    } catch (err) {
      Swal.fire('Error', 'No se pudieron guardar los datos.', 'error');
    } finally {
      setIsSubmittingManual(false);
    }
  };
  
  const toggleSimulation = async (sensorId: string) => {
    setIsTogglingSimulation(prev => new Set(prev).add(sensorId));
    try {
      const isCurrentlyActive = activeSimulations.has(sensorId);
      if (isCurrentlyActive) {
        await dataService.stopEmitter(sensorId);
      } else {
        await dataService.startEmitters([sensorId]);
      }
      await syncEmittersStatus(); // Forzar una sincronización inmediata tras la acción
    } catch (error) {
      console.error(`❌ Error al cambiar estado de simulación para ${sensorId}:`, error);
      Swal.fire('Error', 'No se pudo completar la operación.', 'error');
    } finally {
      setIsTogglingSimulation(prev => {
        const newSet = new Set(prev);
        newSet.delete(sensorId);
        return newSet;
      });
    }
  };
  
  const getSimulationsForTank = (tankId: string) => {
    const tankSensorIds = sensors.filter(s => s.tankId === tankId).map(s => s.id);
    return Array.from(activeSimulations).filter(id => tankSensorIds.includes(id));
  };

  return {
    users, selectedUserId, tanks, selectedTankId, sensors, loading, error, isAdmin,
    handleUserChange, handleTankChange,
    manualReadings, handleManualReadingChange, handleManualSubmit, isSubmittingManual,
    activeSimulations, isTogglingSimulation, toggleSimulation, getSimulationsForTank, mqttConnectionStatus
  };
};