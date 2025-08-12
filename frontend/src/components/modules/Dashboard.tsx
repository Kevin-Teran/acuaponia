// frontend/src/components/modules/Dashboard.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { Card } from '../common/Card';
import { DashboardFilters } from '../dashboard/DashboardFilters';
import { SummaryCards } from '../dashboard/SummaryCards';
import { AdminStatCards } from '../dashboard/AdminStatCards';
import { GaugeChart } from '../dashboard/GaugeChart'; // Se mantiene la importación
import * as userService from '../../services/userService';
import * as tankService from '../../services/tankService';
import * as sensorService from '../../services/sensorService';
import * as settingsService from '../../services/settingsService';
import { User, Tank, Sensor, SensorData } from '../../types';
import { MapPin, Cpu } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { socketService } from '../../services/socketService';

const DEFAULT_THRESHOLDS = {
    temperature: { min: 22, max: 26 },
    ph: { min: 6.8, max: 7.6 },
    oxygen: { min: 6, max: 10 },
};

/**
 * @function getDynamicGaugeScale
 * @description Calcula una escala (mínimo y máximo) para el medidor de forma dinámica para centrar visualmente el rango óptimo.
 * @param {object} thresholds - Los umbrales de la zona óptima.
 * @returns {{min: number, max: number}} Un objeto con los nuevos límites para la escala del medidor.
 */
const getDynamicGaugeScale = (thresholds?: { min: number; max: number }) => {
  if (!thresholds || typeof thresholds.min !== 'number' || typeof thresholds.max !== 'number') {
    return { min: 0, max: 100 }; // Fallback
  }
  const range = thresholds.max - thresholds.min;
  const padding = range * 1.5;

  return {
    min: Math.max(0, Math.floor(thresholds.min - padding)),
    max: Math.ceil(thresholds.max + padding),
  };
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

  // --- Lógica de carga de datos y WebSockets (versión estable) ---
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

  useEffect(() => {
    if (!selectedUserId) return;
    const fetchUserSettings = async () => {
      try {
        const settingsData = await settingsService.getSettings();
        setThresholds(settingsData?.thresholds || DEFAULT_THRESHOLDS);
      } catch (error) {
        console.error("Error al cargar settings:", error);
        setThresholds(DEFAULT_THRESHOLDS);
      }
    };
    fetchUserSettings();
  }, [selectedUserId]);

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
  }, [thresholds]);

  useEffect(() => {
    socketService.connect();
    socketService.onSensorData(handleNewData);
    return () => {
      socketService.offSensorData(handleNewData);
    };
  }, [handleNewData]);

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
    
    // Se obtienen los sensores actualizados en tiempo real
    const temperatureSensor = sensorsForSelectedTank.find(s => s.type === 'TEMPERATURE');
    const oxygenSensor = sensorsForSelectedTank.find(s => s.type === 'OXYGEN');
    const phSensor = sensorsForSelectedTank.find(s => s.type === 'PH');

    // Se calculan las escalas dinámicas
    const tempScale = getDynamicGaugeScale(thresholds.temperature);
    const oxygenScale = getDynamicGaugeScale(thresholds.oxygen);
    const phScale = getDynamicGaugeScale(thresholds.ph);
    
    return (
      <div className="space-y-6">
        {/* Las SummaryCards ya reciben los sensores actualizados y funcionan correctamente */}
        <SummaryCards sensors={sensorsForSelectedTank} thresholds={thresholds} />

        {/* Los GaugeChart ahora también leen de los sensores actualizados */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {temperatureSensor && (
            <GaugeChart
              label="Temperatura"
              value={temperatureSensor.lastReading ?? tempScale.min}
              previousValue={temperatureSensor.previousReading}
              min={tempScale.min} 
              max={tempScale.max} 
              unit="°C"
              thresholds={thresholds?.temperature}
            />
          )}
          {oxygenSensor && (
            <GaugeChart
              label="Oxígeno Disuelto"
              value={oxygenSensor.lastReading ?? oxygenScale.min}
              previousValue={oxygenSensor.previousReading}
              min={oxygenScale.min} 
              max={oxygenScale.max} 
              unit="mg/L"
              thresholds={thresholds?.oxygen}
            />
          )}
          {phSensor && (
            <GaugeChart
              label="Nivel de pH"
              value={phSensor.lastReading ?? phScale.min}
              previousValue={phSensor.previousReading}
              min={phScale.min} 
              max={phScale.max} 
              unit=""
              thresholds={thresholds?.ph}
            />
          )}
        </div>
      </div>
    );
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