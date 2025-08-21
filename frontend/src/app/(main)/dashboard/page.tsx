'use client';

/**
 * @file page.tsx
 * @description Dashboard principal que carga dinámicamente los datos para los filtros,
 * seleccionando el usuario actual por defecto.
 * @author Kevin Mariano
 */
import React, { useState, useEffect } from 'react';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { AdminStatCards } from '@/components/dashboard/AdminStatCards';
import { DashboardFilters } from '@/components/dashboard/DashboardFilters';
import { LineChart } from '@/components/dashboard/LineChart';
import { GaugeChart } from '@/components/dashboard/GaugeChart';
import { useAuth } from '@/context/AuthContext';
import { Role, Tank, User } from '@/types';
import { getAllTanks } from '@/services/tankService';
import { getAllUsers } from '@/services/userService';

const DashboardPage: React.FC = () => {
  const { user } = useAuth(); // Obtenemos el usuario de la sesión actual
  const isAdmin = user?.role === Role.ADMIN;

  // --- Estados para los datos de los filtros ---
  const [users, setUsers] = useState<User[]>([]);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [isLoadingFilters, setIsLoadingFilters] = useState(true);

  // --- Estados para los valores seleccionados en los filtros ---
  const [selectedTank, setSelectedTank] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  });

  /**
   * @effect
   * @description Carga los datos para los filtros (usuarios y tanques).
   */
  useEffect(() => {
    // Si no tenemos la información del usuario, no hacemos nada todavía.
    if (!user) return;

    // --- CAMBIO CLAVE: Se establece el usuario de la sesión como seleccionado por defecto ---
    // Hacemos esto al principio para que el filtro lo refleje inmediatamente.
    setSelectedUser(user.id);

    const fetchFilterData = async () => {
      setIsLoadingFilters(true);
      try {
        // Obtenemos los tanques. El servicio backend ya filtra por usuario si no es admin.
        const tanksData = await getAllTanks();
        setTanks(tanksData);
        
        // --- LOG DE DIAGNÓSTICO PARA TANQUES ---
        // Esto nos dirá en la consola del navegador si los tanques llegan vacíos.
        console.log('Tanques recibidos de la API:', tanksData);

        if (tanksData && tanksData.length > 0) {
          // Seleccionamos el primer tanque de la lista por defecto.
          setSelectedTank(tanksData[0].id);
        } else {
          console.warn('No se encontraron tanques para el usuario actual.');
        }

        // Si es admin, cargamos la lista de todos los usuarios para el selector.
        if (isAdmin) {
          const usersData = await getAllUsers();
          setUsers(usersData);
        }
      } catch (error) {
        // --- LOG DE DIAGNÓSTICO MEJORADO ---
        console.error("Error crítico al cargar datos para los filtros:", error);
        // Aquí podrías establecer un estado de error para mostrar un mensaje en la UI.
      } finally {
        setIsLoadingFilters(false);
      }
    };

    fetchFilterData();
  }, [user, isAdmin]); // Dependemos del objeto 'user' para asegurarnos de que exista.


  /**
   * @effect
   * @description Se activa cuando un filtro cambia para recargar los datos del dashboard.
   */
  useEffect(() => {
    if (!selectedTank || !selectedUser) {
      return;
    }
    
    console.log("Filtros actualizados, recargando datos del dashboard con:", {
      dateRange,
      selectedTank,
      selectedUser,
    });
    // Aquí iría tu lógica para llamar a la API y actualizar los gráficos/tarjetas.
    // Ejemplo: updateDashboardData({ dateRange, tankId: selectedTank, userId: selectedUser });
  }, [dateRange, selectedTank, selectedUser]);

  return (
    <div className="flex-1 space-y-8 p-8 pt-6">
      <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
        <h2 className="text-3xl font-bold tracking-tight text-gray-800 dark:text-white">
          Dashboard
        </h2>
        
        <DashboardFilters
          currentUserRole={user?.role}
          users={users}
          tanks={tanks}
          selectedTank={selectedTank}
          onTankChange={setSelectedTank}
          selectedUser={selectedUser}
          onUserChange={setSelectedUser}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          isLoading={isLoadingFilters}
        />
      </div>

      {/* El resto del contenido del dashboard */}
      <SummaryCards />
      {isAdmin && <AdminStatCards />}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4"><LineChart /></div>
        <div className="col-span-3"><GaugeChart /></div>
      </div>
    </div>
  );
};

export default DashboardPage;