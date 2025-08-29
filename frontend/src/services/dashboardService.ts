/**
 * @file useDashboard.ts
 * @description Hook para manejar la lógica de datos del Dashboard,
 * adaptado al patrón de useDataEntry.
 * @author Kevin Mariano
 * @version 2.0.0
 */
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { User, Tank } from '@/types';
import { getUsers } from '@/services/userService'; 
import { getTanksByUserId } from '@/services/tankService';

export const useDashboard = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  
  const [loading, setLoading] = useState({
    users: true,
    tanks: true,
  });

  // 1. Cargar usuarios (solo para admins)
  useEffect(() => {
    if (currentUser?.role === 'ADMIN') {
      const fetchUsers = async () => {
        setLoading(prev => ({ ...prev, users: true }));
        try {
          // Llamada a la función correcta del servicio
          const fetchedUsers = await getUsers();
          setUsers(fetchedUsers);
        } catch (error) {
          console.error("Error fetching users:", error);
        } finally {
          setLoading(prev => ({ ...prev, users: false }));
        }
      };
      fetchUsers();
    } else if (currentUser) {
      setUsers([currentUser as User]); // Si no es admin, la lista de usuarios es solo él mismo
      setLoading(prev => ({ ...prev, users: false }));
    }
  }, [currentUser]);

  // 2. Establecer el usuario seleccionado por defecto
  useEffect(() => {
    if (currentUser) {
      setSelectedUserId(currentUser.id.toString());
    }
  }, [currentUser]);

  // 3. Cargar tanques basados en el usuario seleccionado
  useEffect(() => {
    const fetchTanks = async () => {
      if (!selectedUserId) {
        setTanks([]);
        setLoading(prev => ({ ...prev, tanks: false }));
        return;
      }
      setLoading(prev => ({ ...prev, tanks: true }));
      try {
        // Llamada a la función correcta del servicio
        const fetchedTanks = await getTanksByUserId(selectedUserId);
        setTanks(fetchedTanks);
      } catch (error) {
        console.error(`Error fetching tanks for user ${selectedUserId}:`, error);
        setTanks([]);
      } finally {
        setLoading(prev => ({ ...prev, tanks: false }));
      }
    };
    fetchTanks();
  }, [selectedUserId]);
  
  const handleUserChange = (userId: string) => {
    setSelectedUserId(userId);
  };

  return {
    users,
    tanks,
    selectedUserId,
    handleUserChange,
    loading,
  };
};