/**
 * @file useDashboard.ts
 * @description Hook centralizado para la lógica y datos del Dashboard.
 * @author Kevin Mariano
 * @version 3.0.0
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { User, Tank, UserFromApi, ProcessedDataPoint } from '@/types';
import { getUsers } from '@/services/userService';
import { getTanks } from '@/services/tankService';
import { getHistoricalData, getLatestData } from '@/services/dataService';

const getFormattedDate = (date: Date) => date.toISOString().split('T')[0];

export const useDashboard = () => {
  const { user: currentUser } = useAuth();
  
  const [filters, setFilters] = useState({ userId: '', tankId: '', startDate: '', endDate: '' });
  const [users, setUsers] = useState<UserFromApi[]>([]);
  const [tanks, setTanks] = useState<Tank[]>([]);
  
  // Datos para los componentes
  const [latestData, setLatestData] = useState<any>(null);
  const [historicalData, setHistoricalData] = useState<ProcessedDataPoint[]>([]);
  const [summary, setSummary] = useState({
      temperature: { min: 0, max: 0, avg: 0 },
      ph: { min: 0, max: 0, avg: 0 },
      oxygen: { min: 0, max: 0, avg: 0 },
  });

  const [loading, setLoading] = useState({ base: true, data: false });

  // Carga inicial de usuarios y tanques
  useEffect(() => {
    const loadBaseData = async () => {
      if (!currentUser) return;
      setLoading(prev => ({ ...prev, base: true }));
      let userList: UserFromApi[] = currentUser.role === 'ADMIN' ? await getUsers() : [{ ...currentUser, _count: { tanks: 0 } } as UserFromApi];
      setUsers(userList);
      
      const initialUserId = String(currentUser.id);
      const userTanks = await getTanks(initialUserId);
      setTanks(userTanks);

      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      setFilters({
        userId: initialUserId,
        tankId: userTanks.length > 0 ? userTanks[0].id : '',
        startDate: getFormattedDate(oneWeekAgo),
        endDate: getFormattedDate(new Date()),
      });
      setLoading(prev => ({ ...prev, base: false }));
    };
    loadBaseData();
  }, [currentUser]);

  // Carga de datos del dashboard (automático)
  useEffect(() => {
    const fetchAllDashboardData = async () => {
      if (!filters.tankId) return;
      
      setLoading(prev => ({ ...prev, data: true }));
      try {
        const [latest, historical] = await Promise.all([
          getLatestData(filters.tankId),
          getHistoricalData(filters.tankId, filters.startDate, filters.endDate),
        ]);
        
        setLatestData(latest);
        setHistoricalData(historical);

        // Calcular resumen a partir de datos históricos
        if (historical.length > 0) {
            const tempValues = historical.map(d => d.temperature).filter(v => v !== null) as number[];
            const phValues = historical.map(d => d.ph).filter(v => v !== null) as number[];
            const oxygenValues = historical.map(d => d.oxygen).filter(v => v !== null) as number[];
            
            setSummary({
                temperature: {
                    min: Math.min(...tempValues), max: Math.max(...tempValues),
                    avg: tempValues.reduce((a, b) => a + b, 0) / tempValues.length,
                },
                ph: {
                    min: Math.min(...phValues), max: Math.max(...phValues),
                    avg: phValues.reduce((a, b) => a + b, 0) / phValues.length,
                },
                oxygen: {
                    min: Math.min(...oxygenValues), max: Math.max(...oxygenValues),
                    avg: oxygenValues.reduce((a, b) => a + b, 0) / oxygenValues.length,
                },
            });
        }

      } catch (error) {
        console.error("Error al obtener datos del dashboard:", error);
      } finally {
        setLoading(prev => ({ ...prev, data: false }));
      }
    };
    fetchAllDashboardData();
  }, [filters]);

  const handleFilterChange = useCallback((field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  }, []);

  return { loading, users, tanks, filters, handleFilterChange, latestData, historicalData, summary, currentUser };
};