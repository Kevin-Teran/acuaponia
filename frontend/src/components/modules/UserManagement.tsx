import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Users, Plus, Edit, Trash2, Shield, ShieldCheck, Save, Loader, AlertCircle, Eye } from 'lucide-react';
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
 * @description Interfaz completa para la administración de usuarios del sistema.
 * Permite a los administradores ver, crear, editar y eliminar usuarios, aplicando
 * reglas de negocio para la seguridad de las cuentas y una experiencia de usuario clara.
 */
export const UserManagement: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { users, addUser, updateUser, deleteUser, loading, error, fetchUsers } = useUsers();
  
  const [modalState, setModalState] = useState<{ mode: 'edit' | 'create' | 'view' | null; user: User | null }>({ mode: null, user: null });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [detailedUser, setDetailedUser] = useState<User | null>(null);

  const [formData, setFormData] = useState({
    name: '', email: '', password: '',
    role: 'USER' as 'ADMIN' | 'USER',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
  });

  // Carga inicial de usuarios cuando el componente se monta.
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  /**
   * @function handleOpenModal
   * @description Abre el modal en un modo específico (crear, editar, ver) y carga los datos necesarios.
   * @param {'create' | 'edit' | 'view'} mode - El modo en que se abrirá el modal.
   * @param {User} [user] - El usuario sobre el cual se realizará la acción (opcional).
   */
  const handleOpenModal = useCallback(async (mode: 'create' | 'edit' | 'view', user?: User) => {
    // Si es para ver detalles, primero busca la información completa del usuario, incluyendo sus tanques.
    if (user && mode === 'view') {
        try {
            setIsModalLoading(true);
            const fullUserData = await userService.getUserById(user.id);
            setDetailedUser(fullUserData);
        } catch (err) {
            Swal.fire('Error', 'No se pudieron cargar los detalles completos del usuario.', 'error');
            return;
        } finally {
            setIsModalLoading(false);
        }
    }
    setModalState({ mode, user: user || null });

    // Rellena el formulario con los datos del usuario si se está editando o viendo.
    if (user && (mode === 'edit' || mode === 'view')) {
        setFormData({ name: user.name, email: user.email, password: '', role: user.role, status: user.status });
    } else {
        // Resetea el formulario para la creación de un nuevo usuario.
        setFormData({ name: '', email: '', password: '', role: 'USER', status: 'ACTIVE' });
    }
  }, []);

  /**
   * @function handleCloseModal
   * @description Cierra el modal y resetea los estados relacionados.
   */
  const handleCloseModal = () => {
    setModalState({ mode: null, user: null });
    setDetailedUser(null);
  };

  /**
   * @function handleSubmit
   * @description Maneja el envío del formulario para crear o editar un usuario.
   */
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const dataToSubmit: Partial<User> = {
        name: formData.name.trim(), email: formData.email.trim().toLowerCase(),
        role: formData.role, status: formData.status
      };
      if (formData.password.trim()) {
        if (formData.password.length < 6) {
          throw new Error("La contraseña debe tener al menos 6 caracteres.");
        }
        (dataToSubmit as any).password = formData.password;
      }
    
      modalState.mode === 'edit' 
        ? await updateUser(modalState.user!.id, dataToSubmit) 
        : await addUser(dataToSubmit);

      await Swal.fire({ 
          icon: 'success', title: `Usuario ${modalState.mode === 'edit' ? 'actualizado' : 'creado'}`,
          toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 
      });
      handleCloseModal();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Ocurrió un error inesperado.';
      await Swal.fire('Error', Array.isArray(errorMessage) ? errorMessage.join(', ') : errorMessage, 'error');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, modalState, addUser, updateUser]);

  /**
   * @function handleDelete
   * @description Maneja la lógica para eliminar un usuario, con una confirmación previa.
   */
  const handleDelete = useCallback(async (userToDelete: User) => {
    if (userToDelete.id === currentUser?.id) {
        Swal.fire('Acción no permitida', 'No puedes eliminar tu propia cuenta.', 'error');
        return;
    }
    const result = await Swal.fire({
        title: `¿Estás seguro de eliminar a ${userToDelete.name}?`,
        text: "Esta acción no se puede deshacer.",
        icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33',
        cancelButtonColor: '#6B7280', confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
        const success = await deleteUser(userToDelete.id);
        if (success) {
            Swal.fire('¡Eliminado!', 'El usuario ha sido eliminado.', 'success');
        } else {
            Swal.fire('Error', 'No se pudo eliminar el usuario.', 'error');
        }
    }
  }, [currentUser, deleteUser]);

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
          <p className="text-gray-600 dark:text-gray-400 mt-1">Administra los usuarios del sistema de monitoreo.</p>
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
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
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
                        <td className="p-4"><div className="flex items-center space-x-3"><div className="w-10 h-10 bg-sena-green/20 rounded-full flex items-center justify-center text-sena-green font-semibold">{user.name.charAt(0).toUpperCase()}</div><div><p className="font-medium text-gray-900 dark:text-white">{user.name}</p><p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p></div></div></td>
                        <td className="p-4"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.role === 'ADMIN' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}`}>{user.role}</span></td>
                        <td className="p-4 text-center"><span className="font-medium text-gray-800 dark:text-gray-200">{user._count?.tanks ?? 0}</span></td>
                        <td className="p-4"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : user.status === 'INACTIVE' ? 'bg-gray-100 text-gray-800' : 'bg-red-100 text-red-800'}`}>{user.status}</span></td>
                        <td className="p-4 text-gray-600 dark:text-gray-400">{user.lastLogin ? format(new Date(user.lastLogin), 'dd MMM, yyyy HH:mm', { locale: es }) : 'Nunca'}</td>
                        <td className="p-4"><div className="flex items-center justify-center space-x-2"><button onClick={() => handleOpenModal('view', user)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg" title="Ver detalles"><Eye className="w-4 h-4" /></button><button onClick={() => handleOpenModal('edit', user)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Editar usuario"><Edit className="w-4 h-4" /></button><button onClick={() => handleDelete(user)} disabled={user.id === currentUser?.id} className="p-2 text-red-600 rounded-lg disabled:text-gray-400 disabled:cursor-not-allowed enabled:hover:bg-red-50" title={user.id === currentUser?.id ? "No puedes eliminar tu propia cuenta" : "Eliminar usuario"}><Trash2 className="w-4 h-4" /></button></div></td>
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
          title={modalState.mode === 'create' ? 'Crear Nuevo Usuario' : modalState.mode === 'edit' ? 'Editar Usuario' : 'Detalles del Usuario'}
          footer={modalState.mode !== 'view' ? (<><button type="button" onClick={handleCloseModal} className="px-4 py-2 rounded-lg bg-gray-200" disabled={isSubmitting}>Cancelar</button><button type="submit" form="user-form" disabled={isSubmitting} className="px-4 py-2 bg-sena-green text-white rounded-lg flex items-center space-x-2 disabled:opacity-50">{isSubmitting ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}<span>{modalState.mode === 'edit' ? 'Guardar Cambios' : 'Crear Usuario'}</span></button></>) : null}
        >
            {isModalLoading ? <div className="flex justify-center p-8"><Loader className="w-8 h-8 animate-spin text-sena-green"/></div> : 
            modalState.mode === 'view' && detailedUser && (
                <div className="space-y-4 text-sm"><div className="flex justify-between"><strong>Nombre:</strong> <span>{detailedUser.name}</span></div><div className="flex justify-between"><strong>Email:</strong> <span>{detailedUser.email}</span></div><div className="flex justify-between"><strong>Rol:</strong> <span>{detailedUser.role}</span></div><div className="flex justify-between"><strong>Estado:</strong> <span>{detailedUser.status}</span></div><div className="flex justify-between"><strong>Miembro desde:</strong> <span>{format(new Date(detailedUser.createdAt), "dd 'de' MMMM 'de' yyyy", { locale: es })}</span></div><div><strong className="block mb-1">Tanques Asignados ({detailedUser.tanks?.length || 0}):</strong>{detailedUser.tanks && detailedUser.tanks.length > 0 ? (<ul className="list-disc list-inside ml-2 mt-1 space-y-1">{detailedUser.tanks.map(tank => <li key={tank.id} className="text-gray-700 dark:text-gray-300">{tank.name} <span className="text-gray-500">({tank.location})</span></li>)}</ul>) : (<span className="ml-2 text-gray-500 italic">Este usuario no tiene tanques asignados.</span>)}</div></div>
            )}
            
            {(modalState.mode === 'create' || modalState.mode === 'edit') && (
                <form id="user-form" onSubmit={handleSubmit} className="space-y-4">
                    <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Nombre Completo *" required className="form-input"/>
                    <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="Email *" required className="form-input"/>
                    <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder={modalState.mode === 'edit' ? 'Nueva contraseña (opcional)' : 'Contraseña *'} required={modalState.mode === 'create'} className="form-input"/>
                    <div className="grid grid-cols-2 gap-4">
                        <select value={formData.role} disabled={isSubmitting || modalState.user?.id === currentUser?.id} title={modalState.user?.id === currentUser?.id ? 'No puedes cambiar tu propio rol' : ''} onChange={(e) => setFormData({ ...formData, role: e.target.value as any })} className="form-select disabled:opacity-50 disabled:cursor-not-allowed">
                            <option value="USER">Usuario</option>
                            <option value="ADMIN">Administrador</option>
                        </select>
                        <select value={formData.status} disabled={isSubmitting || modalState.user?.id === currentUser?.id} title={modalState.user?.id === currentUser?.id ? 'No puedes cambiar tu propio estado' : ''} onChange={(e) => setFormData({ ...formData, status: e.target.value as any })} className="form-select disabled:opacity-50 disabled:cursor-not-allowed">
                            <option value="ACTIVE">Activo</option>
                            <option value="INACTIVE">Inactivo</option>
                            <option value="SUSPENDED">Suspendido</option>
                        </select>
                    </div>
                    {modalState.user?.id === currentUser?.id && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-3 text-yellow-800">
                            <div className="flex items-center"><AlertCircle className="w-4 h-4 mr-2" /><p className="text-sm">Para editar tu perfil (nombre, email, contraseña), ve a la sección de **Configuraciones**.</p></div>
                        </div>
                    )}
                </form>
            )}
        </Modal>
      )}
    </div>
  );
};