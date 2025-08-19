/**
 * @page UserManagement
 * @description Página para la administración completa de usuarios del sistema.
 * Permite a los administradores ver, crear, editar y eliminar usuarios.
 */
 'use client';

 import React, { useState, useMemo, useCallback } from 'react';
 import { Users, Plus, Edit, Trash2, Shield, ShieldCheck, Save, AlertCircle, Eye } from 'lucide-react';
 import { useUsers } from '@/hooks/useUsers';
 import { useAuth } from '@/context/AuthContext';
 import { User } from '@/types';
 import { Card } from '@/components/common/Card';
 import { Modal } from '@/components/common/Modal';
 import { LoadingSpinner } from '@/components/common/LoadingSpinner';
 import Swal from 'sweetalert2';
 import { format } from 'date-fns';
 import { es } from 'date-fns/locale';
 import * as userService from '@/services/userService';
 
 /**
  * @component UserManagement
  * @description Componente principal que renderiza la interfaz de gestión de usuarios.
  */
 export default function UserManagement() {
   const { user: currentUser } = useAuth();
   const { users, addUser, updateUser, deleteUser, loading, error } = useUsers();
 
   const [modalState, setModalState] = useState<{ mode: 'edit' | 'create' | 'view' | null; user: User | null }>({ mode: null, user: null });
   const [isSubmitting, setIsSubmitting] = useState(false);
   
   const [formData, setFormData] = useState({
     name: '', email: '', password: '',
     role: 'USER' as 'ADMIN' | 'USER',
     status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
   });
 
   const handleOpenModal = useCallback(async (mode: 'create' | 'edit' | 'view', user?: User) => {
     setModalState({ mode, user: user || null });
     if (user && (mode === 'edit' || mode === 'view')) {
       setFormData({ name: user.name, email: user.email, password: '', role: user.role, status: user.status });
     } else {
       setFormData({ name: '', email: '', password: '', role: 'USER', status: 'ACTIVE' });
     }
   }, []);
 
   const handleCloseModal = () => {
     setModalState({ mode: null, user: null });
   };
 
   const handleSubmit = useCallback(async (e: React.FormEvent) => {
     e.preventDefault();
     setIsSubmitting(true);
     try {
       const dataToSubmit: Partial<User> = { name: formData.name.trim(), email: formData.email.trim(), role: formData.role, status: formData.status };
       if (formData.password.trim()) { (dataToSubmit as any).password = formData.password; }
 
       if (modalState.mode === 'edit' && modalState.user) {
         await updateUser(modalState.user.id, dataToSubmit);
       } else {
         await addUser(dataToSubmit);
       }
       handleCloseModal();
       Swal.fire({ icon: 'success', title: `Usuario ${modalState.mode === 'edit' ? 'actualizado' : 'creado'} con éxito`, toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
     } catch (err: any) {
       const errorMessage = err.response?.data?.message || err.message || 'Ocurrió un error inesperado.';
       Swal.fire('Error', Array.isArray(errorMessage) ? errorMessage.join(', ') : errorMessage, 'error');
     } finally {
       setIsSubmitting(false);
     }
   }, [formData, modalState, addUser, updateUser]);
 
   const handleDelete = useCallback(async (userToDelete: User) => {
     if (userToDelete.id === currentUser?.id) {
       Swal.fire('Acción no permitida', 'No puedes eliminar tu propia cuenta.', 'error');
       return;
     }
     const result = await Swal.fire({
         title: `¿Estás seguro de eliminar a ${userToDelete.name}?`,
         text: "Esta acción es irreversible.",
         icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33',
         cancelButtonColor: '#6B7280', confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar'
     });
 
     if (result.isConfirmed) {
         try {
             await deleteUser(userToDelete.id);
             Swal.fire('¡Eliminado!', 'El usuario ha sido eliminado.', 'success');
         } catch (err: any) {
             Swal.fire('Error', err.response?.data?.message || 'No se pudo eliminar el usuario.', 'error');
         }
     }
   }, [currentUser, deleteUser]);
 
   const stats = useMemo(() => ({
     total: users.length,
     active: users.filter(u => u.status === 'ACTIVE').length,
     admins: users.filter(u => u.role === 'ADMIN').length
   }), [users]);
 
   return (
     <div className="space-y-6 animate-in fade-in duration-500">
       <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
         <div>
           <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gestión de Usuarios</h1>
           <p className="text-gray-600 dark:text-gray-400 mt-1">Administra los usuarios del sistema de monitoreo.</p>
         </div>
         <button onClick={() => handleOpenModal('create')} className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-colors">
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
           {loading && <div className="p-8"><LoadingSpinner message="Cargando usuarios..." /></div>}
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
                         <td className="p-4"><div className="flex items-center space-x-3"><div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center text-green-600 dark:text-green-400 font-semibold">{user.name.charAt(0).toUpperCase()}</div><div><p className="font-medium text-gray-900 dark:text-white">{user.name}</p><p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p></div></div></td>
                         <td className="p-4"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.role === 'ADMIN' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'}`}>{user.role}</span></td>
                         <td className="p-4 text-center"><span className="font-medium text-gray-800 dark:text-gray-200">{user._count?.tanks ?? 0}</span></td>
                         <td className="p-4"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.status === 'ACTIVE' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : user.status === 'INACTIVE' ? 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'}`}>{user.status}</span></td>
                         <td className="p-4 text-gray-600 dark:text-gray-400">{user.lastLogin ? format(new Date(user.lastLogin), 'dd MMM, yyyy HH:mm', { locale: es }) : 'Nunca'}</td>
                         <td className="p-4"><div className="flex items-center justify-center space-x-2"><button onClick={() => handleOpenModal('view', user)} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg" title="Ver detalles"><Eye className="w-4 h-4" /></button><button onClick={() => handleOpenModal('edit', user)} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg" title="Editar usuario"><Edit className="w-4 h-4" /></button><button onClick={() => handleDelete(user)} disabled={user.id === currentUser?.id} className="p-2 text-red-600 rounded-lg disabled:text-gray-400 disabled:cursor-not-allowed enabled:hover:bg-red-50 dark:enabled:hover:bg-red-900/30" title={user.id === currentUser?.id ? "No puedes eliminar tu propia cuenta" : "Eliminar usuario"}><Trash2 className="w-4 h-4" /></button></div></td>
                       </tr>
                     ))}
                 </tbody>
               </table>
             </div>
           )}
       </Card>
 
       <Modal
         isOpen={!!modalState.mode}
         onClose={handleCloseModal}
         title={modalState.mode === 'create' ? 'Crear Nuevo Usuario' : modalState.mode === 'edit' ? 'Editar Usuario' : 'Detalles del Usuario'}
         footer={modalState.mode !== 'view' ? (<><button type="button" onClick={handleCloseModal} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300" disabled={isSubmitting}>Cancelar</button><button type="submit" form="user-form" disabled={isSubmitting} className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-colors min-w-[150px]">{isSubmitting ? <LoadingSpinner size="sm" /> : <><Save className="w-4 h-4" /><span>{modalState.mode === 'edit' ? 'Guardar Cambios' : 'Crear Usuario'}</span></> }</button></>) : null}
       >
         {modalState.mode === 'view' && modalState.user && (
             <div className="space-y-4 text-sm text-gray-800 dark:text-gray-200"><div className="flex justify-between"><strong>Nombre:</strong> <span className="text-gray-700 dark:text-gray-300">{modalState.user.name}</span></div><div className="flex justify-between"><strong>Email:</strong> <span className="text-gray-700 dark:text-gray-300">{modalState.user.email}</span></div><div className="flex justify-between"><strong>Rol:</strong> <span>{modalState.user.role}</span></div><div className="flex justify-between"><strong>Estado:</strong> <span>{modalState.user.status}</span></div><div className="flex justify-between"><strong>Miembro desde:</strong> <span className="text-gray-700 dark:text-gray-300">{format(new Date(modalState.user.createdAt), "dd 'de' MMMM 'de' yyyy", { locale: es })}</span></div><div><strong className="block mb-1">Tanques Asignados ({modalState.user._count?.tanks || 0}):</strong>{modalState.user._count?.tanks ? (<span className="ml-2 text-gray-500 italic">Los detalles de los tanques no están disponibles en esta vista.</span>) : (<span className="ml-2 text-gray-500 italic">Este usuario no tiene tanques asignados.</span>)}</div></div>
         )}
 
         {(modalState.mode === 'create' || modalState.mode === 'edit') && (
             <form id="user-form" onSubmit={handleSubmit} className="space-y-4">
                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre Completo</label>
                 <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Nombre del nuevo usuario" required className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"/>
                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Correo Electrónico</label>
                 <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="ejemplo@sena.edu.co" required className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"/>
                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Contraseña</label>
                 <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder={modalState.mode === 'edit' ? 'Nueva contraseña (dejar en blanco para no cambiar)' : 'Mínimo 6 caracteres'} required={modalState.mode === 'create'} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"/>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div>
                         <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Rol de Usuario</label>
                         <select value={formData.role} disabled={isSubmitting || modalState.user?.id === currentUser?.id} title={modalState.user?.id === currentUser?.id ? 'No puedes cambiar tu propio rol' : ''} onChange={(e) => setFormData({ ...formData, role: e.target.value as any })} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed">
                             <option value="USER">Usuario</option>
                             <option value="ADMIN">Administrador</option>
                         </select>
                     </div>
                     <div>
                         <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Estado de la Cuenta</label>
                         <select value={formData.status} disabled={isSubmitting || modalState.user?.id === currentUser?.id} title={modalState.user?.id === currentUser?.id ? 'No puedes cambiar tu propio estado' : ''} onChange={(e) => setFormData({ ...formData, status: e.target.value as any })} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed">
                             <option value="ACTIVE">Activo</option>
                             <option value="INACTIVE">Inactivo</option>
                             <option value="SUSPENDED">Suspendido</option>
                         </select>
                     </div>
                 </div>
             </form>
         )}
       </Modal>
     </div>
   );
 };