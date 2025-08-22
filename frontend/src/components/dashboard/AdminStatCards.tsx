/**
 * @file AdminStatCards.tsx
 * @description Muestra tarjetas con estadísticas clave para el administrador.
 * @author kevin mariano
 * @version 1.1.0
 * @since 1.0.0
 */
'use client';

import { useEffect, useState } from 'react';
import { Users, Thermometer, Droplet, Layers } from 'lucide-react';
import { DataCard } from '@/components/common/DataCard';
import { userService } from '@/services/userService';
import { sensorService } from '@/services/sensorService';
import { Skeleton } from '@/components/common/Skeleton';

export const AdminStatCards = () => {
  const [userCount, setUserCount] = useState(0);
  const [sensorCount, setSensorCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // CORRECCIÓN: Se usan los nombres de función correctos.
        const users = await userService.getUsers();
        const sensors = await sensorService.getSensors();
        setUserCount(users.length);
        setSensorCount(sensors.length);
      } catch (error) {
        console.error('Error fetching admin stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <DataCard title="Usuarios Totales" value={userCount.toString()} icon={Users} />
      <DataCard title="Sensores Activos" value={sensorCount.toString()} icon={Thermometer} />
      {/* Otras tarjetas... */}
    </div>
  );
};