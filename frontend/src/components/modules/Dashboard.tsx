import React, { useState, useEffect, useMemo } from 'react';
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
import { User, Tank, Sensor } from '../../types';
import { MapPin, Cpu } from 'lucide-react';
import { format, subDays } from 'date-fns';

const DEFAULT_THRESHOLDS = {
    temperature: { low: 22, high: 26 },
    ph: { low: 6.8, high: 7.6 },
    oxygen: { low: 6, high: 10 },
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

  useEffect(() => {
    if (!user) return;

    const fetchInitialData = async () => {
      try {
        setLoadingInitialData(true);
        const [tanksData, usersData, sensorsData, settingsData] = await Promise.all([
          tankService.getTanks(),
          isAdmin ? userService.getAllUsers() : Promise.resolve([]),
          sensorService.getSensors(),
          settingsService.getSettings(),
        ]);
        
        setAllTanks(tanksData);
        setAllSensors(sensorsData);
        setAllUsers(isAdmin ? usersData : [user]);
        if (settingsData?.thresholds) setThresholds(settingsData.thresholds);

        const initialUserId = user.id;
        setSelectedUserId(initialUserId);
        
        const userTanks = tanksData.filter(t => t.userId === initialUserId);
        if (userTanks.length > 0) {
            setSelectedTankId(userTanks[0].id);
        }
      } catch (error) {
        console.error("Error al cargar datos iniciales del dashboard:", error);
      } finally {
        setLoadingInitialData(false);
      }
    };
    
    fetchInitialData();
  }, [user, isAdmin]);

  /**
   * @function handleUserChange
   * @description Lógica centralizada para manejar el cambio de usuario por parte de un admin.
   */
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