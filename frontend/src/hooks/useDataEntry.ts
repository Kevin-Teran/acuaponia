/**
 * @file useDataEntry.ts
 * @description Hook para gestionar la lógica de la página de entrada manual de datos.
 * @author Kevin Mariano 
 * @version 3.0.0
 * @since 1.0.0
 */
import { useState, useEffect, useCallback } from 'react';
import { Tank, Sensor, UserFromApi as User, SensorType, ManualEntryDto } from '@/types';
import * as tankService from '@/services/tankService';
import * as sensorService from '@/services/sensorService';
import * as userService from '@/services/userService';
import { addManualEntry } from '@/services/dataService'; 
import { useAuth } from '@/context/AuthContext';
import Swal from 'sweetalert2';

export const useDataEntry = () => {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'ADMIN';

  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(currentUser?.id || null);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [selectedTankId, setSelectedTankId] = useState<string>('');
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readings, setReadings] = useState<Record<string, { value: string; sensorId: string }>>({});

  useEffect(() => {
    if (isAdmin) {
      const fetchUsers = async () => {
        setLoading(true);
        try {
          const usersData = await userService.getUsers();
          setUsers(usersData);
          if (usersData.length > 0 && !selectedUserId) {
            setSelectedUserId(usersData[0].id);
          }
        } catch (err) {
          console.error('Error fetching users:', err);
          setError('No se pudo cargar la lista de usuarios.');
        } finally {
          setLoading(false);
        }
      };
      fetchUsers();
    }
  }, [isAdmin, selectedUserId]);

  useEffect(() => {
    if (selectedUserId) {
      setLoading(true);
      tankService.getTanks(selectedUserId)
        .then(data => {
          setTanks(data);
          if (data.length > 0) {
            setSelectedTankId(data[0].id);
          } else {
            setSelectedTankId('');
            setSensors([]);
          }
        })
        .catch(err => {
          console.error('Error fetching tanks:', err);
          setError('No se pudieron cargar los tanques.');
        })
        .finally(() => setLoading(false));
    } else if (!isAdmin) {
        setTanks([]);
        setSelectedTankId('');
        setSensors([]);
    }
  }, [selectedUserId, isAdmin]);

  useEffect(() => {
    if (selectedTankId) {
      setLoading(true);
      sensorService.getSensorsByTank(selectedTankId)
        .then(data => {
          setSensors(data);
          const initialReadings: Record<string, { value: string; sensorId: string }> = {};
          data.forEach(sensor => {
            initialReadings[sensor.type] = { value: '', sensorId: sensor.id };
          });
          setReadings(initialReadings);
        })
        .catch(err => {
          console.error('Error fetching sensors:', err);
          setError('No se pudieron cargar los sensores.');
        })
        .finally(() => setLoading(false));
    }
  }, [selectedTankId]);

  const handleReadingChange = (type: SensorType, value: string) => {
    setReadings(prev => ({
      ...prev,
      [type]: { ...prev[type], value },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const entries: ManualEntryDto[] = Object.values(readings)
      .filter(reading => reading.value !== '' && reading.sensorId)
      .map(reading => ({
        sensorId: reading.sensorId,
        value: parseFloat(reading.value),
        timestamp: new Date(),
      }));

    if (entries.length === 0) {
      Swal.fire('Atención', 'Debe ingresar al menos un valor.', 'warning');
      return;
    }

    try {
      for (const entry of entries) {
        await addManualEntry(entry);
      }
      
      Swal.fire('¡Éxito!', 'Datos guardados correctamente.', 'success');
      
      const clearedReadings = { ...readings };
      Object.keys(clearedReadings).forEach(key => {
        clearedReadings[key].value = '';
      });
      setReadings(clearedReadings);
    } catch (err) {
      console.error('Error submitting data:', err);
      Swal.fire('Error', 'No se pudieron guardar los datos.', 'error');
    }
  };
  
  const handleUserChange = (userId: string) => {
    setSelectedUserId(userId);
    setTanks([]);
    setSelectedTankId('');
    setSensors([]);
  };

  return {
    users,
    selectedUserId,
    tanks,
    selectedTankId,
    sensors,
    loading,
    error,
    readings,
    isAdmin,
    handleUserChange,
    setSelectedTankId,
    handleReadingChange,
    handleSubmit,
  };
};