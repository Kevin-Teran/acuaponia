import { useState, useEffect } from 'react';
import { User } from '../types';

// Mock de usuarios para demostración
const mockUsers: User[] = [
  { 
    id: '1', 
    email: 'admin@acuaponia.com', 
    role: 'admin', 
    name: 'Administrador Principal',
    createdAt: '2024-01-15T10:00:00Z',
    lastLogin: '2024-12-20T14:30:00Z',
    status: 'active',
    active: true
  },
  { 
    id: '2', 
    email: 'usuario@acuaponia.com', 
    role: 'user', 
    name: 'Usuario Operador',
    createdAt: '2024-02-01T09:15:00Z',
    lastLogin: '2024-12-19T16:45:00Z',
    status: 'active',
    active: true
  },
  { 
    id: '3', 
    email: 'tecnico@acuaponia.com', 
    role: 'user', 
    name: 'Técnico de Campo',
    createdAt: '2024-03-10T11:30:00Z',
    lastLogin: '2024-12-18T08:20:00Z',
    status: 'active',
    active: true
  },
  { 
    id: '4', 
    email: 'supervisor@acuaponia.com', 
    role: 'admin', 
    name: 'Supervisor de Planta',
    createdAt: '2024-04-05T14:00:00Z',
    status: 'inactive',
    active: false
  },
];

export const useUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simular carga de usuarios
    setTimeout(() => {
      setUsers(mockUsers);
      setLoading(false);
    }, 500);
  }, []);

  const addUser = async (userData: Omit<User, 'id' | 'createdAt'>): Promise<boolean> => {
    try {
      const newUser: User = {
        ...userData,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        status: userData.active ? 'active' : 'inactive'
      };
      
      setUsers(prev => [...prev, newUser]);
      return true;
    } catch (error) {
      console.error('Error creating user:', error);
      return false;
    }
  };

  const updateUser = async (id: string, userData: Partial<User>): Promise<boolean> => {
    try {
      setUsers(prev => prev.map(user => 
        user.id === id ? { 
          ...user, 
          ...userData,
          status: userData.active !== undefined ? (userData.active ? 'active' : 'inactive') : user.status
        } : user
      ));
      return true;
    } catch (error) {
      console.error('Error updating user:', error);
      return false;
    }
  };

  const deleteUser = async (id: string): Promise<boolean> => {
    try {
      setUsers(prev => prev.filter(user => user.id !== id));
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  };

  const toggleUserStatus = async (id: string): Promise<boolean> => {
    try {
      setUsers(prev => prev.map(user => 
        user.id === id 
          ? { 
              ...user, 
              status: user.status === 'active' ? 'inactive' : 'active',
              active: user.status !== 'active'
            }
          : user
      ));
      return true;
    } catch (error) {
      console.error('Error toggling user status:', error);
      return false;
    }
  };

  return {
    users,
    loading,
    addUser,
    updateUser,
    deleteUser,
    toggleUserStatus,
  };
};