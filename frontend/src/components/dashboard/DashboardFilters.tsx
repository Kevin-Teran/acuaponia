/**
 * @file page.tsx
 * @description Página principal del dashboard que muestra datos y gráficos.
 * @author kevin mariano
 * @version 1.1.0
 * @since 1.0.0
 */
'use client';

import { useAuth } from '@/context/AuthContext';
import { AdminStatCards } from '@/components/dashboard/AdminStatCards';
import { sensorService } from '@/services/sensorService'; // Asegúrate que la importación es correcta
import { useEffect } from 'react';

export default function DashboardPage() {
  const { user } = useAuth();

  useEffect(() => {
    const fetchTankData = async () => {
      if (user) {
        try {
          // CORRECCIÓN: Llama a la función con el nombre correcto.
          // Aquí asumimos que quieres los sensores del primer tanque, ajusta la lógica según necesites.
          // const sensors = await sensorService.getSensorsByTank('ID_DEL_TANQUE');
          // console.log(sensors);
        } catch (error) {
          console.error("Failed to fetch tank sensors", error);
        }
      }
    };
    fetchTankData();
  }, [user]);

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
      </div>
      {user?.role === 'ADMIN' && <AdminStatCards />}
      {/* ...el resto de tu dashboard */}
    </div>
  );
}