import React, { useState, useMemo } from 'react';
import { Users, Plus, Edit, Trash2, Shield, ShieldCheck, Save, X, Loader, AlertCircle, Eye, MapPin } from 'lucide-react';
import { useUsers } from '../../hooks/useUsers';
import { useAuth } from '../../hooks/useAuth';
import { User } from '../../types';
import { Card } from '../common/Card';
import { Modal } from '../common/Modal';
import Swal from 'sweetalert2';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import * as userService from '../../services/userService';

/**
 * @component UserManagement
 * @desc Interfaz completa para la administración de usuarios del sistema.
 */
export const UserManagement: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { users, addUser, updateUser, deleteUser, loading, error } = useUsers();
  
  const [modalState, setModalState] = useState<{ mode: 'edit' | 'create' | 'view' | null; user: User | null }>({ mode: null, user: null });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [detailedUser, setDetailedUser] = useState<User | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'USER' as 'ADMIN' | 'USER',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
  });

  const handleOpenModal = async (mode: 'create' | 'edit' | 'view', user?: User) => {
    if (user && mode === 'view') {
        try {
            const fullUserData = await userService.getUserById(user.id);
            setDetailedUser(fullUserData);
        } catch (err) {
            console.error('Error cargando detalles del usuario:', err);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudieron cargar los detalles del usuario.'
            });
            return;
        }
    }
    setModalState({ mode, user: user || null });
    if (user && (mode === 'edit' || mode === 'view')) {
        setFormData({ 
            name: user.name, 
            email: user.email, 
            password: '', 
            role: user.role, 
            status: user.status 
        });
    } else {
        setFormData({ 
            name: '', 
            email: '', 
            password: '', 
            role: 'USER', 
            status: 'ACTIVE' 
        });
    }
  };

  const handleCloseModal = () => {
    setModalState({ mode: null, user: null });
    setDetailedUser(null);
    setFormData({ name: '', email: '', password: '', role: 'USER', status: 'ACTIVE' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
        // Validaciones básicas del frontend
        if (!formData.name.trim()) {
            throw new Error('El nombre es requerido');
        }
        if (!formData.email.trim()) {
            throw new Error('El email es requerido');
        }
        if (modalState.mode === 'create' && !formData.password.trim()) {
            throw new Error('La contraseña es requerida');
        }

        const dataToSubmit: Partial<User> = {
            name: formData.name.trim(),
            email: formData.email.trim().toLowerCase(),
            role: formData.role,
            status: formData.status
        };

        // Solo incluir password si se proporcionó
        if (formData.password.trim()) {
            (dataToSubmit as any).password = formData.password;
        }
    
        const result = modalState.mode === 'edit' 
            ? await updateUser(modalState.user!.id, dataToSubmit) 
            : await addUser(dataToSubmit);

        if (result) {
            await Swal.fire({ 
                icon: 'success', 
                title: `Usuario ${modalState.mode === 'edit' ? 'actualizado' : 'creado'} exitosamente`,
                text: `El usuario ${formData.name} ha sido ${modalState.mode === 'edit' ? 'actualizado' : 'creado'} correctamente.`,
                toast: true, 
                position: 'top-end', 
                showConfirmButton: false, 
                timer: 3000 
            });
            handleCloseModal();
        }
    } catch (err: any) {
        console.error('Error en handleSubmit:', err);
        
        let errorMessage = 'Error desconocido';
        
        if (err.response?.data?.error?.message) {
            errorMessage = err.response.data.error.message;
        } else if (err.response?.data?.message) {
            errorMessage = err.response.data.message;
        } else if (err.message) {
            errorMessage = err.message;
        }

        await Swal.fire({ 
            icon: 'error', 
            title: 'Error', 
            text: errorMessage,
            confirmButtonText: 'Entendido'
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDelete = (userToDelete: User) => {
    if (userToDelete.id === currentUser?.id) {
        Swal.fire('Acción no permitida', 'No puedes eliminar tu propia cuenta.', 'error');
        return;
    }
    Swal.fire({
        title: `¿Eliminar a ${userToDelete.name}?`,
        text: "Esta acción no se puede deshacer.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6B7280',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
      }).then(async (result) => {
        if (result.isConfirmed) {
            const success = await deleteUser(userToDelete.id);
            if (success) {
                Swal.fire('¡Eliminado!', 'El usuario ha sido eliminado exitosamente.', 'success');
            } else {
                Swal.fire('Error', 'No se pudo eliminar el usuario.', 'error');
            }
        }
      });
  };

  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter(u => u.status === 'ACTIVE').length,
    admins: users.filter(u => u.role === 'ADMIN').length
  }), [users]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gestión de Usuarios</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Administrar usuarios del sistema de monitoreo</p>
        </div>
        <button 
            onClick={() => handleOpenModal('create')} 
            className="bg-sena-green hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors shadow-md"
        >
          <Plus className="w-5 h-5" />
          <span>Nuevo Usuario</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-blue-100">Total Usuarios</p>
                    <p className="text-3xl font-bold">{loading ? '...' : stats.total}</p>
                </div>
                <Users className="w-12 h-12 text-blue-200" />
            </div>
        </Card>
        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-green-100">Usuarios Activos</p>
                    <p className="text-3xl font-bold">{loading ? '...' : stats.active}</p>
                </div>
                <Shield className="w-12 h-12 text-green-200" />
            </div>
        </Card>
        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-orange-100">Administradores</p>
                    <p className="text-3xl font-bold">{loading ? '...' : stats.admins}</p>
                </div>
                <ShieldCheck className="w-12 h-12 text-orange-200" />
            </div>
        </Card>
      </div>
      
      <Card>
          {loading && (
            <div className="flex justify-center p-8">
                <Loader className="w-8 h-8 animate-spin text-sena-green"/>
            </div>
          )}
          {error && (
            <div className="text-red-600 dark:text-red-400 text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-md flex items-center justify-center">
                <AlertCircle className="w-5 h-5 mr-2"/>
                {error}
            </div>
          )}
          {!loading && !error && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="p-4 text-left font-semibold text-gray-900 dark:text-white">Usuario</th>
                    <th className="p-4 text-left font-semibold text-gray-900 dark:text-white">Rol</th>
                    <th className="p-4 text-center font-semibold text-gray-900 dark:text-white">Tanques</th>
                    <th className="p-4 text-left font-semibold text-gray-900 dark:text-white">Estado</th>
                    <th className="p-4 text-left font-semibold text-gray-900 dark:text-white">Último Acceso</th>
                    <th className="p-4 text-center font-semibold text-gray-900 dark:text-white">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                      <tr key={user.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="p-4">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-sena-green/20 rounded-full flex items-center justify-center text-sena-green font-semibold">
                                    {user.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-white">{user.name}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                                </div>
                            </div>
                        </td>
                        <td className="p-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                user.role === 'ADMIN' 
                                    ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400' 
                                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                            }`}>
                                {user.role}
                            </span>
                        </td>
                        <td className="p-4 text-center">
                            <span className="font-medium text-gray-800 dark:text-gray-200">
                                {user._count?.tanks ?? 0}
                            </span>
                        </td>
                        <td className="p-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                user.status === 'ACTIVE' 
                                    ? 'bg-green-100 text-green-800' 
                                    : user.status === 'INACTIVE'
                                    ? 'bg-gray-100 text-gray-800'
                                    : 'bg-red-100 text-red-800'
                            }`}>
                                {user.status}
                            </span>
                        </td>
                        <td className="p-4 text-gray-600 dark:text-gray-400">
                            {user.lastLogin ? format(new Date(user.lastLogin), 'dd MMM, yyyy HH:mm', { locale: es }) : 'Nunca'}
                        </td>
                        <td className="p-4">
                            <div className="flex items-center justify-center space-x-2">
                                <button 
                                    onClick={() => handleOpenModal('view', user)} 
                                    className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                                    title="Ver detalles"
                                >
                                    <Eye className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={() => handleOpenModal('edit', user)} 
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                                    title="Editar usuario"
                                >
                                    <Edit className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={() => handleDelete(user)} 
                                    disabled={user.id === currentUser?.id} 
                                    className="p-2 text-red-600 rounded-lg disabled:text-gray-400 disabled:cursor-not-allowed enabled:hover:bg-red-50"
                                    title={user.id === currentUser?.id ? "No puedes eliminar tu propia cuenta" : "Eliminar usuario"}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
      </Card>
      
      {modalState.mode && (
        <Modal 
          isOpen={!!modalState.mode} 
          onClose={handleCloseModal} 
          title={
            modalState.mode === 'create' ? 'Crear Nuevo Usuario' : 
            modalState.mode === 'edit' ? 'Editar Usuario' : 
            'Detalles del Usuario'
          }
          footer={modalState.mode !== 'view' ? (
              <>
                <button 
                    type="button" 
                    onClick={handleCloseModal} 
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                    disabled={isSubmitting}
                >
                    Cancelar
                </button>
                <button 
                    type="submit" 
                    form="user-form" 
                    disabled={isSubmitting} 
                    className="px-4 py-2 bg-sena-green text-white rounded-lg flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSubmitting ? (
                        <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                        <Save className="w-4 h-4" />
                    )}
                    <span>{modalState.mode === 'edit' ? 'Guardar Cambios' : 'Crear Usuario'}</span>
                </button>
              </>
            ) : null}
        >
            {modalState.mode === 'view' && detailedUser && (
                <div className="space-y-4">
                  <div>
                    <strong className="text-gray-700 dark:text-gray-300">Nombre:</strong>
                    <span className="ml-2 text-gray-900 dark:text-white">{detailedUser.name}</span>
                  </div>
                  <div>
                    <strong className="text-gray-700 dark:text-gray-300">Email:</strong>
                    <span className="ml-2 text-gray-900 dark:text-white">{detailedUser.email}</span>
                  </div>
                  <div>
                    <strong className="text-gray-700 dark:text-gray-300">Rol:</strong>
                    <span className="ml-2 text-gray-900 dark:text-white">{detailedUser.role}</span>
                  </div>
                  <div>
                    <strong className="text-gray-700 dark:text-gray-300">Estado:</strong>
                    <span className="ml-2 text-gray-900 dark:text-white">{detailedUser.status}</span>
                  </div>
                  <div>
                    <strong className="text-gray-700 dark:text-gray-300">Miembro desde:</strong>
                    <span className="ml-2 text-gray-900 dark:text-white">
                        {format(new Date(detailedUser.createdAt), 'dd \'de\' MMMM \'de\' yyyy', { locale: es })}
                    </span>
                  </div>
                  <div>
                    <strong className="text-gray-700 dark:text-gray-300">Tanques Asignados:</strong>
                    {detailedUser.tanks && detailedUser.tanks.length > 0 ? (
                      <ul className="list-disc list-inside ml-2 mt-1">
                        {detailedUser.tanks.map(tank => (
                            <li key={tank.id} className="text-gray-900 dark:text-white">
                                {tank.name} ({tank.location})
                            </li>
                        ))}
                      </ul>
                    ) : (
                        <span className="ml-2 text-gray-500 dark:text-gray-400">Ninguno</span>
                    )}
                  </div>
                </div>
            )}
            {(modalState.mode === 'create' || modalState.mode === 'edit') && (
                <form id="user-form" onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Nombre Completo *
                        </label>
                        <input 
                            type="text" 
                            value={formData.name} 
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sena-green focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            required 
                            disabled={isSubmitting}
                            placeholder="Ingrese el nombre completo"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Email *
                        </label>
                        <input 
                            type="email" 
                            value={formData.email} 
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sena-green focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            required 
                            disabled={isSubmitting}
                            placeholder="ejemplo@correo.com"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Contraseña {modalState.mode === 'edit' && '(dejar en blanco para no cambiar)'}
                            {modalState.mode === 'create' && ' *'}
                        </label>
                        <input 
                            type="password" 
                            value={formData.password} 
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })} 
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sena-green focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            required={modalState.mode === 'create'} 
                            disabled={isSubmitting}
                            placeholder={modalState.mode === 'edit' ? 'Dejar en blanco para no cambiar' : 'Mínimo 6 caracteres'}
                            minLength={modalState.mode === 'create' ? 6 : 0}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Rol *
                            </label>
                            <select 
                                value={formData.role} 
                                onChange={(e) => setFormData({ ...formData, role: e.target.value as any })} 
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sena-green focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                disabled={isSubmitting}
                            >
                                <option value="USER">Usuario</option>
                                <option value="ADMIN">Administrador</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Estado *
                            </label>
                            <select 
                                value={formData.status} 
                                disabled={modalState.user?.id === currentUser?.id || isSubmitting} 
                                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })} 
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sena-green focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                title={modalState.user?.id === currentUser?.id ? 'No puedes cambiar tu propio estado' : ''}
                            >
                                <option value="ACTIVE">Activo</option>
                                <option value="INACTIVE">Inactivo</option>
                                <option value="SUSPENDED">Suspendido</option>
                            </select>
                        </div>
                    </div>
                    {modalState.user?.id === currentUser?.id && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-3">
                            <div className="flex items-center">
                                <AlertCircle className="w-4 h-4 text-yellow-600 mr-2" />
                                <p className="text-sm text-yellow-800">
                                    No puedes cambiar tu propio rol o estado para evitar bloquear tu cuenta.
                                </p>
                            </div>
                        </div>
                    )}
                </form>
            )}
        </Modal>
      )}
    </div>
  );
};