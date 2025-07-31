import React, { useState, useEffect, useMemo } from 'react';
import { useSensorData } from '../../hooks/useSensorData';
import { useAuth } from '../../hooks/useAuth';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { Card } from '../common/Card';
import { GaugeChart } from '../dashboard/GaugeChart';
import { LineChart } from '../dashboard/LineChart';
import { SummaryCards } from '../dashboard/SummaryCards';
import { DashboardFilters } from '../dashboard/DashboardFilters';
import * as userService from '../../services/userService';
import * as tankService from '../../services/tankService';
import { User, Tank, ProcessedDataPoint } from '../../types';
import { format, subDays } from 'date-fns';

export const Dashboard: React.FC = () => {
  const { user, loading: authLoading } = useAuth(); // Obtener también el estado de carga del hook de autenticación
  const isAdmin = user?.role === 'ADMIN';

  // --- Estados para los filtros ---
  const today = format(new Date(), 'yyyy-MM-dd');
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 1), 'yyyy-MM-dd')); // Iniciar con las últimas 24h
  const [endDate, setEndDate] = useState(today);
  const [selectedTankId, setSelectedTankId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // --- Estados para poblar los selectores ---
  const [users, setUsers] = useState<User[]>([]);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(true);

  // --- Carga de datos para los filtros y establece selecciones iniciales ---
  useEffect(() => {
    // No hacer nada hasta que el usuario esté cargado
    if (!user) return;

    // Establecer el usuario seleccionado inicial
    const initialUserId = isAdmin ? user.id : user.id;
    setSelectedUserId(initialUserId);

    const fetchFilterData = async () => {
      try {
        setLoadingFilters(true);
        const [tanksData, usersData] = await Promise.all([
          tankService.getTanks(), // El backend filtra por rol, así que esta llamada es segura
          isAdmin ? userService.getAllUsers() : Promise.resolve([]),
        ]);
        
        setTanks(tanksData);
        if (isAdmin) {
          setUsers(usersData);
        }
        
        // Seleccionar el primer tanque de la lista por defecto
        if (tanksData.length > 0) {
          setSelectedTankId(tanksData[0].id);
        } else {
          setSelectedTankId(null); // No hay tanques para mostrar
        }

      } catch (error) {
        console.error("Error fetching filter data:", error);
      } finally {
        setLoadingFilters(false);
      }
    };
    
    fetchFilterData();
  }, [user, isAdmin]);
  
  // --- Hook de datos que reacciona a los cambios en los filtros ---
  const { data, summary, loading, lastUpdate, refreshData } = useSensorData({
    tankId: selectedTankId,
    startDate,
    endDate,
    userId: selectedUserId, // Ahora es seguro usarlo porque esperamos a que 'user' se cargue
  });

  // Filtra la lista de tanques a mostrar cuando un admin selecciona un usuario
  const filteredTanks = useMemo(() => {
    if (isAdmin && selectedUserId) {
        return tanks.filter(tank => tank.userId === selectedUserId);
    }
    return tanks;
  }, [tanks, selectedUserId, isAdmin]);

  const handleUserChange = (userId: string) => {
    setSelectedUserId(userId);
    setSelectedTankId(null); // Forzar la reselección del primer tanque en el useEffect del filtro
  }

  // Muestra un estado de carga general mientras se determina el usuario y se cargan los filtros
  if (authLoading || loadingFilters || !selectedTankId) {
    return <LoadingSpinner fullScreen message="Cargando configuración del dashboard..." />;
  }

  const thresholds = {
    temperature: { low: 20, high: 28 },
    ph: { low: 6.8, high: 7.6 },
    oxygen: { low: 6, high: 10 },
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dashboard de Monitoreo
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Visualización de variables acuáticas por rango de fecha y estanque.
          </p>
        </div>
      </div>

      {/* --- Componente de Filtros --- */}
      <DashboardFilters
        startDate={startDate}
        endDate={endDate}
        selectedTankId={selectedTankId}
        selectedUserId={selectedUserId}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onTankChange={setSelectedTankId}
        onUserChange={handleUserChange}
        tanks={filteredTanks}
        users={users}
        isAdmin={isAdmin}
      />

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" message="Cargando datos del estanque..." />
        </div>
      ) : (
        <>
          {/* --- Contenido del Dashboard --- */}
          <Card title="Valores Actuales" subtitle="Mediciones en tiempo real con indicadores de estado">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <GaugeChart value={summary?.temperature.current ?? 0} min={15} max={35} label="Temperatura" unit="°C" thresholds={thresholds.temperature} />
              <GaugeChart value={summary?.ph.current ?? 0} min={6} max={9} label="pH" unit="" thresholds={thresholds.ph} />
              <GaugeChart value={summary?.oxygen.current ?? 0} min={0} max={15} label="Oxígeno Disuelto" unit="mg/L" thresholds={thresholds.oxygen} />
            </div>
          </Card>

          <Card title="Tendencia Temporal" subtitle={`Mostrando datos desde ${startDate} hasta ${endDate}`}>
            <LineChart data={data as ProcessedDataPoint[]} height={400} />
          </Card>

          {summary && (
             <SummaryCards summary={summary} lastUpdate={lastUpdate} onRefresh={refreshData} />
          )}
        </>
      )}
    </div>
  );
};