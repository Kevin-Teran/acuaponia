import React, { useState, useMemo, useEffect } from 'react';
import { Users, Plus, Edit, Trash2, Shield, ShieldCheck, Save, X, Loader, AlertCircle, Eye, MapPin } from 'lucide-react';
import { useUsers } from '../../hooks/useUsers';
import { useAuth } from '../../hooks/useAuth';
import { User } from '../../types';
import { Card } from '../common/Card';
import Swal from 'sweetalert2';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import * as userService from '../../services/userService';
import { cn } from '../../utils/cn';

/**
 * @component UserManagement
 * @desc Interfaz completa para la administración de usuarios del sistema, conectada a la API.
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
    if (user && (mode === 'edit' || mode === 'view')) {
      if (mode === 'view') {
        const fullUserData = await userService.getUserById(user.id);
        setDetailedUser(fullUserData);
      }
      setModalState({ mode, user });
      setFormData({ name: user.name, email: user.email, password: '', role: user.role, status: user.status });
    } else {
      setModalState({ mode: 'create', user: null });
      setFormData({ name: '', email: '', password: '', role: 'USER', status: 'ACTIVE' });
    }
  };

  const handleCloseModal = () => {
    setModalState({ mode: null, user: null });
    setDetailedUser(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const dataToSubmit: Partial<User> = { ...formData };
    if (modalState.mode === 'edit' && !formData.password) {
      delete dataToSubmit.password;
    }

    const result = modalState.mode === 'edit' ? await updateUser(modalState.user!.id, dataToSubmit) : await addUser(dataToSubmit);
    setIsSubmitting(false);

    if (result) {
      Swal.fire({ icon: 'success', title: `Usuario ${modalState.mode === 'edit' ? 'actualizado' : 'creado'}`, toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, timerProgressBar: true });
      handleCloseModal();
    } else {
      Swal.fire({ icon: 'error', title: 'Error', text: `No se pudo ${modalState.mode === 'edit' ? 'actualizar' : 'crear'} el usuario.` });
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
        cancelButtonText: 'Cancelar',
        customClass: { popup: 'dark:bg-gray-800 dark:text-gray-200' }
      }).then(async (result) => {
        if (result.isConfirmed) {
            const success = await deleteUser(userToDelete.id);
            if (success) Swal.fire({ title: '¡Eliminado!', text: 'El usuario ha sido eliminado.', icon: 'success', customClass: { popup: 'dark:bg-gray-800 dark:text-gray-200' }});
            else Swal.fire({ title: 'Error', text: 'No se pudo eliminar el usuario.', icon: 'error', customClass: { popup: 'dark:bg-gray-800 dark:text-gray-200' }});
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
        <button onClick={() => handleOpenModal('create')} className="bg-sena-green hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors shadow-md">
          <Plus className="w-5 h-5" />
          <span>Nuevo Usuario</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white"><div className="flex items-center justify-between"><div><p className="text-blue-100">Total Usuarios</p><p className="text-3xl font-bold">{loading ? '...' : stats.total}</p></div><Users className="w-12 h-12 text-blue-200" /></div></Card>
        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white"><div className="flex items-center justify-between"><div><p className="text-green-100">Usuarios Activos</p><p className="text-3xl font-bold">{loading ? '...' : stats.active}</p></div><Shield className="w-12 h-12 text-green-200" /></div></Card>
        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white"><div className="flex items-center justify-between"><div><p className="text-orange-100">Administradores</p><p className="text-3xl font-bold">{loading ? '...' : stats.admins}</p></div><ShieldCheck className="w-12 h-12 text-orange-200" /></div></Card>
      </div>
      
      <Card>
          {loading && <div className="flex justify-center p-8"><Loader className="w-8 h-8 animate-spin text-sena-green"/></div>}
          {error && <div className="text-red-600 dark:text-red-400 text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-md flex items-center justify-center"><AlertCircle className="w-5 h-5 mr-2"/>{error}</div>}
          {!loading && !error && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Usuario</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Rol</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-900 dark:text-white">Tanques</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Estado</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Último Acceso</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-900 dark:text-white">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const isCurrentUser = user.id === currentUser?.id;
                    return (
                      <tr key={user.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="py-3 px-4"><div className="flex items-center space-x-3"><div className="w-10 h-10 bg-sena-green/20 rounded-full flex items-center justify-center text-sena-green font-semibold">{user.name.charAt(0).toUpperCase()}</div><div><p className="font-medium text-gray-900 dark:text-white">{user.name}</p><p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p></div></div></td>
                        <td className="py-3 px-4"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.role === 'ADMIN' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'}`}>{user.role === 'ADMIN' ? <><ShieldCheck className="w-3 h-3 mr-1" />Administrador</> : <><Shield className="w-3 h-3 mr-1" />Usuario</>}</span></td>
                        <td className="py-3 px-4 text-center"><span className="font-medium text-gray-800 dark:text-gray-200">{user._count?.tanks ?? 0 > 0 ? user._count?.tanks : 'Ninguno'}</span></td>
                        <td className="py-3 px-4"><div title={isCurrentUser ? "No puedes cambiar tu propio estado" : ""}><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.status === 'ACTIVE' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'} ${isCurrentUser ? 'cursor-not-allowed opacity-70' : ''}`}>{user.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}</span></div></td>
                        <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{user.lastLogin ? format(new Date(user.lastLogin), 'dd MMM, yyyy HH:mm', { locale: es }) : 'Nunca'}</td>
                        <td className="py-3 px-4"><div className="flex items-center justify-center space-x-2"><button onClick={() => handleOpenModal('view', user)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"><Eye className="w-4 h-4" /></button><button onClick={() => handleOpenModal('edit', user)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit className="w-4 h-4" /></button><div title={isCurrentUser ? "No puedes eliminar tu propia cuenta" : "Eliminar usuario"}><button onClick={() => handleDelete(user)} disabled={isCurrentUser} className="p-2 text-red-600 rounded-lg disabled:text-gray-400 disabled:cursor-not-allowed enabled:hover:bg-red-50"><Trash2 className="w-4 h-4" /></button></div></div></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
      </Card>
      
      {modalState.mode && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95">
            {modalState.mode === 'view' && detailedUser && (
              <>
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Detalles del Usuario</h3>
                  <button onClick={handleCloseModal} className="p-1 text-gray-400 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><X className="w-5 h-5"/></button>
                </div>
                <div className="p-6 space-y-4">
                  <p><strong>Nombre:</strong> {detailedUser.name}</p>
                  <p><strong>Email:</strong> {detailedUser.email}</p>
                  <p><strong>Rol:</strong> {detailedUser.role}</p>
                  <p><strong>Estado:</strong> {detailedUser.status}</p>
                  <p><strong>Miembro desde:</strong> {format(new Date(detailedUser.createdAt), 'dd MMMM, yyyy', { locale: es })}</p>
                  <div>
                    <strong>Tanques Asignados:</strong>
                    {detailedUser.tanks && detailedUser.tanks.length > 0 ? (
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        {detailedUser.tanks.map(tank => <li key={tank.id}>{tank.name} ({tank.location})</li>)}
                      </ul>
                    ) : (<p className="text-gray-500">Ninguno</p>)}
                  </div>
                </div>
              </>
            )}

            {(modalState.mode === 'create' || modalState.mode === 'edit') && (
              <>
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{modalState.mode === 'edit' ? 'Editar Usuario' : 'Crear Nuevo Usuario'}</h3>
                  <button onClick={handleCloseModal} className="p-1 text-gray-400 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><X className="w-5 h-5"/></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre Completo</label><input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-sena-green bg-white dark:bg-gray-700" required /></div>
                  <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label><input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-sena-green bg-white dark:bg-gray-700" required /></div>
                  <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contraseña {modalState.mode === 'edit' && '(dejar en blanco para no cambiar)'}</label><input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-sena-green bg-white dark:bg-gray-700" required={modalState.mode !== 'edit'} /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rol</label><select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value as any })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-sena-green bg-white dark:bg-gray-700"><option value="USER">Usuario</option><option value="ADMIN">Administrador</option></select></div>
                    <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Estado</label><select value={formData.status} disabled={modalState.user?.id === currentUser?.id} title={modalState.user?.id === currentUser?.id ? 'No puedes cambiar tu propio estado' : ''} onChange={(e) => setFormData({ ...formData, status: e.target.value as any })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-sena-green bg-white dark:bg-gray-700 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:cursor-not-allowed"><option value="ACTIVE">Activo</option><option value="INACTIVE">Inactivo</option><option value="SUSPENDED">Suspendido</option></select></div>
                  </div>
                  <div className="flex justify-end space-x-3 pt-4">
                    <button type="button" onClick={handleCloseModal} className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors">Cancelar</button>
                    <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-sena-green hover:bg-green-700 text-white rounded-lg flex items-center space-x-2 transition-colors disabled:bg-green-300">
                        {isSubmitting ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        <span>{modalState.mode === 'edit' ? 'Guardar Cambios' : 'Crear Usuario'}</span>
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};