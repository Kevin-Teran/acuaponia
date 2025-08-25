/**
 * @file page.tsx
 * @route /users
 * @description Versión final y pulida de la gestión de usuarios. Incluye modales de diseño profesional,
 * campos de filtro mejorados y toda la lógica de negocio y seguridad implementada.
 * @author Kevin Mariano
 * @version 17.0.0
 * @since 1.0.0
 */
'use client';

import React, { useCallback, useState, useMemo } from 'react';
import { withAuth } from '@/hoc/withAuth';
import { Role, UserFromApi, users_status } from '@/types';
import { useAuth } from '@/context/AuthContext';
import {
  PlusCircle,
  Edit,
  Trash2,
  AlertTriangle,
  Search,
  Users,
  Shield,
  Clock,
  FileText,
  Container,
  Save,
  X,
  Lock,
  Mail,
  ShieldCheck,
  CalendarDays,
  LogIn,
} from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import Swal from 'sweetalert2';
import { useUsers } from '@/hooks/useUsers';
import { Modal } from '@/components/common/Modal';

// --- Componente del Formulario para Crear/Editar ---
const UserForm = ({ user, onSubmit, onCancel, currentUser }: { user?: UserFromApi | null, onSubmit: (data: any) => void, onCancel: () => void, currentUser: UserFromApi | null }) => {
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    role: user?.role || Role.USER,
    status: user?.status || 'ACTIVE',
  });

  const isEditingSelf = user?.id === currentUser?.id;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dataToSend = { ...formData };
    if (!dataToSend.password) delete (dataToSend as any).password;
    if (isEditingSelf) {
        delete (dataToSend as any).role;
        delete (dataToSend as any).status;
    }
    onSubmit(dataToSend);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre Completo</label>
        <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600" required />
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Correo Electrónico</label>
        <input type="email" name="email" id="email" value={formData.email} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600" required />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Contraseña</label>
        <input type="password" name="password" id="password" value={formData.password} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600" placeholder={user ? '(Dejar en blanco para no cambiar)' : ''} required={!user} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Rol</label>
          <select name="role" id="role" value={formData.role} onChange={handleChange} disabled={isEditingSelf} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 disabled:bg-gray-200 dark:disabled:bg-gray-800 dark:bg-gray-700 dark:border-gray-600">
            <option value={Role.USER}>Usuario</option>
            <option value={Role.ADMIN}>Administrador</option>
          </select>
        </div>
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Estado</label>
          <select name="status" id="status" value={formData.status} onChange={handleChange} disabled={isEditingSelf} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 disabled:bg-gray-200 dark:disabled:bg-gray-800 dark:bg-gray-700 dark:border-gray-600">
            <option value="ACTIVE">Activo</option>
            <option value="INACTIVE">Inactivo</option>
            <option value="SUSPENDED">Suspendido</option>
          </select>
        </div>
      </div>
      {isEditingSelf && <p className="text-xs text-center text-yellow-600 dark:text-yellow-400"><Lock className="inline h-3 w-3 mr-1" />No puedes editar tu propio rol o estado.</p>}
      <div className="flex justify-end space-x-3 pt-4">
        <button type="button" onClick={onCancel} className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-500 dark:hover:bg-gray-600">
          <X className="h-4 w-4 mr-2" />Cancelar
        </button>
        <button type="submit" className="flex items-center px-4 py-2 text-sm font-medium text-white bg-[#39A900] border border-transparent rounded-lg hover:bg-[#2F8B00]">
          <Save className="h-4 w-4 mr-2" />Guardar Cambios
        </button>
      </div>
    </form>
  );
};

// --- Componente para Mostrar Detalles ---
const UserDetails = ({ user }: { user: UserFromApi }) => (
  <div className="space-y-4 text-sm pt-2">
    <div className="flex justify-between items-center"><span className="flex items-center text-gray-500 dark:text-gray-400 font-semibold"><Mail className="h-4 w-4 mr-2" />Email</span><span>{user.email}</span></div>
    <div className="flex justify-between items-center"><span className="flex items-center text-gray-500 dark:text-gray-400 font-semibold"><ShieldCheck className="h-4 w-4 mr-2" />Rol</span><span>{user.role}</span></div>
    <div className="flex justify-between items-center"><span className="flex items-center text-gray-500 dark:text-gray-400 font-semibold"><Clock className="h-4 w-4 mr-2" />Estado</span><span>{user.status}</span></div>
    <div className="flex justify-between items-center"><span className="flex items-center text-gray-500 dark:text-gray-400 font-semibold"><CalendarDays className="h-4 w-4 mr-2" />Registrado</span><span>{new Date(user.createdAt).toLocaleDateString()}</span></div>
    <div className="flex justify-between items-center"><span className="flex items-center text-gray-500 dark:text-gray-400 font-semibold"><LogIn className="h-4 w-4 mr-2" />Último Acceso</span><span>{user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Nunca'}</span></div>
    <hr className="my-3 border-gray-200 dark:border-gray-600" />
    <h4 className="font-semibold text-gray-500 dark:text-gray-400">Tanques Asignados ({user._count?.tanks ?? 0})</h4>
    {user.tanks?.length > 0 ? (
      <ul className="list-disc list-inside">{user.tanks.map(tank => <li key={tank.id}>{tank.name}</li>)}</ul>
    ) : (
      <p className="text-gray-500">No tiene tanques asignados.</p>
    )}
  </div>
);

// --- Componente Principal de la Página ---
const UsersManagementPage = () => {
  const { user: currentUser } = useAuth();
  const { users, loading, error, deleteUser, addUser, editUser } = useUsers();
  const [modal, setModal] = useState<{ isOpen: boolean; type: 'create' | 'edit' | 'details' | null; data?: UserFromApi | null }>({ isOpen: false, type: null, data: null });

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | users_status>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | Role>('all');

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const term = searchTerm.toLowerCase().trim();
      const nameMatch = user.name.toLowerCase().includes(term);
      const emailMatch = user.email.toLowerCase().includes(term);
      const statusMatch = statusFilter === 'all' || user.status === statusFilter;
      const roleMatch = roleFilter === 'all' || user.role === roleFilter;
      return (nameMatch || emailMatch) && statusMatch && roleMatch;
    });
  }, [users, searchTerm, statusFilter, roleFilter]);

  const userStats = useMemo(() => {
    return users.reduce((acc, user) => {
        acc.total++;
        if (user.role === Role.ADMIN) acc.admins++;
        if (user.status === 'ACTIVE') acc.activeUsers++;
        return acc;
    }, { total: 0, admins: 0, activeUsers: 0 });
  }, [users]);

  const handleFormSubmit = async (formData: any) => {
    try {
      if (modal.type === 'create') {
        await addUser(formData);
        Swal.fire({ title: 'Usuario Creado', icon: 'success', timer: 1500, showConfirmButton: false, customClass: { popup: 'rounded-2xl' } });
      } else if (modal.type === 'edit' && modal.data) {
        await editUser(modal.data.id, formData);
        Swal.fire({ title: 'Usuario Actualizado', icon: 'success', timer: 1500, showConfirmButton: false, customClass: { popup: 'rounded-2xl' } });
      }
      setModal({ isOpen: false, type: null });
    } catch (err: any) {
      Swal.fire({ title: 'Error', text: err.message || 'Ocurrió un error.', icon: 'error', customClass: { popup: 'rounded-2xl' } });
    }
  };
  
  const handleDeleteUser = useCallback(async (user: UserFromApi) => {
    if (currentUser?.id === user.id) {
        Swal.fire({ title: 'Acción No Permitida', text: 'No puedes eliminar tu propia cuenta.', icon: 'error', customClass: { popup: 'rounded-2xl' } });
        return;
      }
    Swal.fire({
      title: `¿Eliminar a ${user.name}?`, text: "Esta acción es irreversible.", icon: 'warning',
      showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar',
      customClass: { popup: 'rounded-2xl' }
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await deleteUser(user.id);
          Swal.fire({ title: 'Eliminado', text: `${user.name} ha sido eliminado.`, icon: 'success', timer: 1500, showConfirmButton: false, customClass: { popup: 'rounded-2xl' } });
        } catch (err: any) {
          Swal.fire({ title: 'Error', text: err.message || 'No se pudo eliminar el usuario.', icon: 'error', customClass: { popup: 'rounded-2xl' } });
        }
      }
    });
  }, [deleteUser, currentUser]);

  const renderStats = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
       <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex items-center"><Users className="h-8 w-8 text-blue-500" /><div className="ml-4"><p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Usuarios</p><p className="text-2xl font-bold text-gray-900 dark:text-white">{userStats.total}</p></div></div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex items-center"><Shield className="h-8 w-8 text-purple-500" /><div className="ml-4"><p className="text-sm font-medium text-gray-500 dark:text-gray-400">Administradores</p><p className="text-2xl font-bold text-gray-900 dark:text-white">{userStats.admins}</p></div></div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex items-center"><Clock className="h-8 w-8 text-green-500" /><div className="ml-4"><p className="text-sm font-medium text-gray-500 dark:text-gray-400">Usuarios Activos</p><p className="text-2xl font-bold text-gray-900 dark:text-white">{userStats.activeUsers}</p></div></div>
    </div>
  );

  const renderFilters = () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative lg:col-span-2">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input type="text" placeholder="Buscar por nombre o email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-[#39A900] focus:border-[#39A900]"/>
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="w-full px-4 py-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-[#39A900] focus:border-[#39A900]">
            <option value="all">Todos los estados</option><option value="ACTIVE">Activo</option><option value="INACTIVE">Inactivo</option><option value="SUSPENDED">Suspendido</option>
        </select>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as any)} className="w-full px-4 py-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-[#39A900] focus:border-[#39A900]">
            <option value="all">Todos los roles</option><option value={Role.ADMIN}>Administrador</option><option value={Role.USER}>Usuario</option>
        </select>
      </div>
    </div>
  );
  
  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gestión de Usuarios</h1>
        <button onClick={() => setModal({ isOpen: true, type: 'create' })} className="flex items-center px-4 py-2 bg-[#39A900] text-white rounded-lg hover:bg-[#2F8B00] transition-colors shadow-md">
          <PlusCircle className="h-5 w-5 mr-2" /> Añadir Usuario
        </button>
      </div>
      
      {renderStats()}
      {renderFilters()}
      
      <div className="overflow-x-auto bg-white dark:bg-gray-800 shadow-md rounded-lg mt-6">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
           <thead className="bg-gray-50 dark:bg-gray-700"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Usuario</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Rol</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Estado</th><th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Tanques Asignados</th><th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Acciones</th></tr></thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-6 py-4 whitespace-nowrap"><div className="flex items-center"><div className="h-10 w-10 rounded-full bg-[#39A900] flex items-center justify-center text-white font-bold">{user.name.charAt(0).toUpperCase()}</div><div className="ml-4"><div className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</div><div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div></div></div></td>
                <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${ user.role === Role.ADMIN ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300' : 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' }`}>{user.role}</span></td>
                <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${ user.status === 'ACTIVE' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' }`}>{user.status}</span></td>
                <td className="px-6 py-4 whitespace-nowrap text-center"><div className="flex items-center justify-center space-x-2"><Container className="h-5 w-5 text-gray-400 dark:text-gray-500" /><span className="font-bold text-gray-800 dark:text-gray-200">{user._count?.tanks ?? 0}</span></div></td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                  <div className="flex items-center justify-center space-x-4">
                    <button onClick={() => setModal({ isOpen: true, type: 'details', data: user })} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors" title="Ver Detalles"><FileText className="h-5 w-5"/></button>
                    <button onClick={() => setModal({ isOpen: true, type: 'edit', data: user })} className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 transition-colors" title="Editar"><Edit className="h-5 w-5"/></button>
                    <button onClick={() => handleDeleteUser(user)} className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors" title="Eliminar"><Trash2 className="h-5 w-5"/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={modal.isOpen}
        onClose={() => setModal({ isOpen: false, type: null })}
        title={
            modal.type === 'create' ? 'Crear Nuevo Usuario' :
            modal.type === 'edit' ? `Editar a ${modal.data?.name}` :
            modal.type === 'details' ? `Ficha de ${modal.data?.name}` : ''
        }
      >
        {modal.type === 'create' && <UserForm onSubmit={handleFormSubmit} onCancel={() => setModal({ isOpen: false, type: null })} currentUser={currentUser} />}
        {modal.type === 'edit' && modal.data && <UserForm user={modal.data} onSubmit={handleFormSubmit} onCancel={() => setModal({ isOpen: false, type: null })} currentUser={currentUser} />}
        {modal.type === 'details' && modal.data && <UserDetails user={modal.data} />}
      </Modal>
    </div>
  );
};

export default withAuth(UsersManagementPage, [Role.ADMIN]);