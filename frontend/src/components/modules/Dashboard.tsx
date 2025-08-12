// frontend/src/components/modules/Dashboard.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { Card } from '../common/Card';
import { DashboardFilters } from '../dashboard/DashboardFilters';
import { SummaryCards } from '../dashboard/SummaryCards';
import { AdminStatCards } from '../dashboard/AdminStatCards';
import * as userService from '../../services/userService';
import * as tankService from '../../services/tankService';
import * as sensorService from '../../services/sensorService';
import * as settingsService from '../../services/settingsService';
import { User, Tank, Sensor, SensorData } from '../../types'; // SensorData para el tipado
import { MapPin, Cpu } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { socketService } from '../../services/socketService';

const DEFAULT_THRESHOLDS = {
    temperature: { min: 22, max: 26 },
    ph: { min: 6.8, max: 7.6 },
    oxygen: { min: 6, max: 10 },
};

export const Dashboard: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [startDate, setStartDate] = useState(format(subDays(new Date(), 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedTankId, setSelectedTankId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allTanks, setAllTanks] = useState<Tank[]>([]); 
  const [allSensors, setAllSensors] = useState<Sensor[]>([]);

  const [thresholds, setThresholds] = useState(DEFAULT_THRESHOLDS);
  const [loadingInitialData, setLoadingInitialData] = useState(true);

  // Efecto para la carga inicial de datos (sin cambios)
  useEffect(() => {
    if (!user) return;
    const fetchInitialData = async () => {
      try {
        setLoadingInitialData(true);
        const [tanksData, usersData, sensorsData] = await Promise.all([
          tankService.getTanks(),
          isAdmin ? userService.getAllUsers() : Promise.resolve([]),
          sensorService.getSensors(),
        ]);
        
        setAllTanks(tanksData);
        setAllSensors(sensorsData);
        setAllUsers(isAdmin ? usersData : [user]);
        const initialUserId = user.id;
        setSelectedUserId(initialUserId);
        
        const userTanks = tanksData.filter(t => t.userId === initialUserId);
        if (userTanks.length > 0) setSelectedTankId(userTanks[0].id);
      } catch (error) { console.error("Error al cargar datos iniciales:", error); } 
      finally { setLoadingInitialData(false); }
    };
    fetchInitialData();
  }, [user, isAdmin]);

  // Efecto para cargar los umbrales del usuario seleccionado (sin cambios)
  useEffect(() => {
    if (!selectedUserId) return;
    const fetchUserSettings = async () => {
      try {
        const settingsData = await settingsService.getSettings(selectedUserId);
        setThresholds(settingsData?.thresholds || DEFAULT_THRESHOLDS);
      } catch (error) {
        console.error("Error al cargar settings:", error);
        setThresholds(DEFAULT_THRESHOLDS);
      }
    };
    fetchUserSettings();
  }, [selectedUserId]);

  /**
   * @effect
   * @description **SOLUCIÓN DEFINITIVA**: Este efecto ahora se suscribe a los datos del socket
   * de una manera estable, evitando el ciclo de reconexión.
   * @technical_requirements La función `handleNewData` se define con `useCallback` y el `useEffect` que se suscribe
   * se ejecuta solo cuando la función de callback cambia, estabilizando el comportamiento.
   */
  const handleNewData = useCallback((data: SensorData) => {
      setAllSensors(prevSensors =>
        prevSensors.map(sensor => {
          if (sensor.hardwareId === data.hardwareId) {
            const newReading = data.value;
            const oldReading = sensor.lastReading;

            let trend: Sensor['trend'] = 'stable';
            if (oldReading !== null && oldReading !== undefined) {
              if (newReading > oldReading) trend = 'up';
              else if (newReading < oldReading) trend = 'down';
            }

            const sensorTypeKey = sensor.type.toLowerCase() as keyof typeof thresholds;
            const threshold = thresholds[sensorTypeKey];
            let readingStatus: Sensor['readingStatus'] = 'Óptimo';
            if (threshold) {
              if (newReading < threshold.min) readingStatus = 'Bajo';
              else if (newReading > threshold.max) readingStatus = 'Alto';
            }
            
            return {
              ...sensor,
              previousReading: oldReading,
              lastReading: newReading,
              lastUpdate: new Date().toISOString(),
              trend,
              readingStatus,
            };
          }
          return sensor;
        })
      );
  }, [thresholds]); // Dependemos de `thresholds` para que la función se actualice si el usuario cambia los umbrales

  useEffect(() => {
    socketService.onSensorData(handleNewData);

    return () => {
      socketService.offSensorData(handleNewData);
    };
  }, [handleNewData]); // El efecto ahora solo depende de la función memoizada

  // ... (resto del componente y JSX sin cambios)

  const handleUserChange = (userId: string) => {
    setSelectedUserId(userId);
    const userTanks = allTanks.filter(tank => tank.userId === userId);
    setSelectedTankId(userTanks.length > 0 ? userTanks[0].id : null);
  };

  const filteredTanksForSelectedUser = useMemo(() => {
    if (!selectedUserId) return [];
    return allTanks.filter(tank => tank.userId === selectedUserId);
  }, [allTanks, selectedUserId]);

  const sensorsForSelectedTank = useMemo(() => {
    if (!selectedTankId) return [];
    return allSensors.filter(sensor => sensor.tankId === selectedTankId);
  }, [allSensors, selectedTankId]);

  if (authLoading || loadingInitialData) {
    return <LoadingSpinner fullScreen message="Cargando configuración del dashboard..." />;
  }
  
  const renderContent = () => {
    if (!selectedTankId) {
      return <Card><div className="text-center py-16 text-gray-500 dark:text-gray-400"><MapPin className="w-12 h-12 mx-auto mb-4" /><h3 className="text-lg font-semibold">No hay tanques para mostrar</h3><p className="mt-1 text-sm">{isAdmin ? "El usuario seleccionado no tiene tanques asignados." : "Aún no tienes tanques asignados."}</p></div></Card>;
    }
    if (sensorsForSelectedTank.length === 0) {
      return <Card><div className="text-center py-16 text-gray-500 dark:text-gray-400"><Cpu className="w-12 h-12 mx-auto mb-4" /><h3 className="text-lg font-semibold">No hay sensores disponibles</h3><p className="mt-1 text-sm">Este estanque no tiene ningún sensor registrado.</p></div></Card>;
    }
    
    return <SummaryCards sensors={sensorsForSelectedTank} thresholds={thresholds} />;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard de Monitoreo</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Estado en tiempo real de los sensores por estanque.</p>
      </div>
      
      <DashboardFilters
        startDate={startDate}
        endDate={endDate}
        selectedTankId={selectedTankId}
        selectedUserId={selectedUserId} 
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onTankChange={setSelectedTankId}
        onUserChange={handleUserChange} 
        tanks={filteredTanksForSelectedUser}
        users={allUsers} 
        isAdmin={isAdmin}
      />

      {isAdmin && <AdminStatCards sensors={sensorsForSelectedTank} />}
      
      <div className="mt-6">
        {renderContent()}
      </div>
    </div>
  );
};
