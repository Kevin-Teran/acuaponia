/**
 * @file page.tsx
 * @route /users
 * @description Página completa para la gestión integral de usuarios del sistema de acuaponía.
 * Incluye funcionalidades de listado, creación, edición, eliminación y búsqueda de usuarios.
 * Acceso exclusivo para administradores con validaciones de seguridad robustas.
 * @author Kevin Mariano
 * @version 4.0.0
 * @since 1.0.0
 */
 'use client';

 import { useCallback, useState, useMemo } from 'react';
 import { withAuth } from '@/hoc/withAuth';
 import { Role, UserFromApi } from '@/types';
 import { useAuth } from '@/context/AuthContext';
 import {
   PlusCircle,
   Edit,
   Trash2,
   AlertTriangle,
   Search,
   RefreshCw,
   Users,
   Shield,
   Clock,
   Database
 } from 'lucide-react';
 import { LoadingSpinner } from '@/components/common/LoadingSpinner';
 import Swal from 'sweetalert2';
 import { useUsers } from '@/hooks/useUsers';
 
 /**
  * @typedef {object} UserStatsType
  * @description Estadísticas calculadas de los usuarios del sistema.
  * @property {number} total - Total de usuarios registrados
  * @property {number} admins - Cantidad de administradores
  * @property {number} regularUsers - Cantidad de usuarios regulares
  * @property {number} activeUsers - Usuarios con estado activo
  * @property {number} totalTanks - Total de tanques en el sistema
  */
 interface UserStatsType {
     total: number;
     admins: number;
     regularUsers: number;
     activeUsers: number;
     totalTanks: number;
 }
 
 
 /**
  * @component UsersManagementPage
  * @description Componente principal para la gestión completa de usuarios.
  * Proporciona una interfaz administrativa completa con estadísticas, búsqueda,
  * filtros y operaciones CRUD con confirmaciones de seguridad.
  * @returns {React.ReactElement} Página completa de gestión de usuarios
  * @example
  * // Ruta protegida para administradores
  * <Route path="/users" element={<UsersManagementPage />} />
  */
 const UsersManagementPage = () => {
   const { user: currentUser } = useAuth();
   const {
     users,
     loading,
     error,
     deleteUser,
     fetchUsers,
     clearError
   } = useUsers();
 
   // Estado local para búsqueda y filtros
   const [searchTerm, setSearchTerm] = useState('');
   const [statusFilter, setStatusFilter] = useState<'all' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'>('all');
   const [roleFilter, setRoleFilter] = useState<'all' | Role>('all');
 
   /**
    * @method filteredUsers
    * @description Computed property que filtra usuarios basado en término de búsqueda y filtros.
    * @returns {UserFromApi[]} Lista filtrada de usuarios
    */
   const filteredUsers = useMemo(() => {
     let filtered = users;
 
     if (searchTerm.trim()) {
       const term = searchTerm.toLowerCase().trim();
       filtered = filtered.filter(user =>
         user.name.toLowerCase().includes(term) ||
         user.email.toLowerCase().includes(term)
       );
     }
 
     if (statusFilter !== 'all') {
       filtered = filtered.filter(user => user.status === statusFilter);
     }
 
     if (roleFilter !== 'all') {
       filtered = filtered.filter(user => user.role === roleFilter);
     }
 
     return filtered;
   }, [users, searchTerm, statusFilter, roleFilter]);
 
   /**
    * @method userStats
    * @description Calcula estadísticas en tiempo real de los usuarios.
    * @returns {UserStatsType} Objeto con estadísticas.
    */
   const userStats = useMemo((): UserStatsType => {
     return users.reduce((acc, user) => {
         acc.total++;
         if (user.role === Role.ADMIN) acc.admins++;
         if (user.role === Role.USER) acc.regularUsers++;
         if (user.status === 'ACTIVE') acc.activeUsers++;
         // Asumiendo que `_count` existe en tu tipo UserFromApi
         // acc.totalTanks += user._count?.tanks || 0;
         return acc;
     }, {
         total: 0,
         admins: 0,
         regularUsers: 0,
         activeUsers: 0,
         totalTanks: 0, // Debes ajustar cómo obtienes este dato si no viene en la API
     });
 }, [users]);
 
 
   /**
    * @method handleCreateUser
    * @description Maneja la acción de crear un nuevo usuario.
    */
   const handleCreateUser = useCallback(() => {
     Swal.fire({
       title: 'Función en Desarrollo',
       html: `
         <p>La funcionalidad de crear usuarios estará disponible en la próxima versión.</p>
         <p>Por ahora, los usuarios se crean desde la configuración del sistema.</p>
       `,
       icon: 'info',
       confirmButtonText: 'Entendido',
       confirmButtonColor: '#3085d6',
     });
   }, []);
 
   /**
    * @method handleEditUser
    * @description Maneja la acción de editar un usuario existente.
    * @param {string} userId - ID del usuario a editar
    * @param {string} userName - Nombre del usuario
    */
   const handleEditUser = useCallback((userId: string, userName: string) => {
     Swal.fire({
       title: 'Función en Desarrollo',
       html: `
         <p>La edición de <strong>${userName}</strong> estará disponible próximamente.</p>
         <p>Incluirá cambio de rol, estado y datos personales.</p>
       `,
       icon: 'info',
       confirmButtonText: 'Entendido',
       confirmButtonColor: '#3085d6',
     });
   }, []);
 
   /**
    * @method handleDeleteUser
    * @description Maneja la eliminación de un usuario con confirmaciones.
    * @param {string} userId - ID del usuario
    * @param {string} userName - Nombre del usuario
    * @param {Role} userRole - Rol del usuario
    */
   const handleDeleteUser = useCallback(async (
     userId: string,
     userName: string,
     userRole: Role
   ) => {
     if (currentUser?.id === userId) {
       Swal.fire('Acción No Permitida', 'No puedes eliminar tu propia cuenta.', 'error');
       return;
     }
 
     if (userRole === Role.ADMIN && userStats.admins <= 1) {
         Swal.fire('Eliminación Bloqueada', 'No se puede eliminar el último administrador.', 'error');
         return;
     }
 
     const result = await Swal.fire({
       title: `¿Estás seguro de eliminar a ${userName}?`,
       text: "Esta acción es irreversible.",
       icon: 'warning',
       showCancelButton: true,
       confirmButtonColor: '#d33',
       cancelButtonColor: '#3085d6',
       confirmButtonText: 'Sí, eliminar',
       cancelButtonText: 'Cancelar',
     });
 
     if (result.isConfirmed) {
       try {
         await deleteUser(userId);
         Swal.fire('Eliminado', `${userName} ha sido eliminado.`, 'success');
       } catch (err: any) {
         Swal.fire('Error', err.message || 'No se pudo eliminar el usuario.', 'error');
       }
     }
   }, [currentUser, deleteUser, userStats.admins]);
 
   /**
    * @method handleRefresh
    * @description Recarga la lista de usuarios desde el servidor.
    */
   const handleRefresh = useCallback(async () => {
     await fetchUsers();
   }, [fetchUsers]);
 
   /**
    * @method renderStats
    * @description Renderiza las tarjetas de estadísticas.
    * @returns {React.ReactElement}
    */
   const renderStats = () => (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
       <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex items-center">
         <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
         <div className="ml-3">
           <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Usuarios</p>
           <p className="text-2xl font-bold text-gray-900 dark:text-white">{userStats.total}</p>
         </div>
       </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex items-center">
         <Shield className="h-8 w-8 text-purple-600 dark:text-purple-400" />
         <div className="ml-3">
           <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Administradores</p>
           <p className="text-2xl font-bold text-gray-900 dark:text-white">{userStats.admins}</p>
         </div>
       </div>
       <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex items-center">
         <Clock className="h-8 w-8 text-green-600 dark:text-green-400" />
         <div className="ml-3">
           <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Usuarios Activos</p>
           <p className="text-2xl font-bold text-gray-900 dark:text-white">{userStats.activeUsers}</p>
         </div>
       </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex items-center">
         <Database className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
         <div className="ml-3">
           <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Tanques</p>
           <p className="text-2xl font-bold text-gray-900 dark:text-white">{userStats.totalTanks}</p>
         </div>
       </div>
     </div>
   );
 
   /**
    * @method renderFilters
    * @description Renderiza la barra de búsqueda y filtros.
    * @returns {React.ReactElement}
    */
   const renderFilters = () => (
     <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6">
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
         <div className="relative lg:col-span-2">
           <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
           <input
             type="text"
             placeholder="Buscar por nombre o email..."
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
             className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
           />
         </div>
         <select
           value={statusFilter}
           onChange={(e) => setStatusFilter(e.target.value as any)}
           className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
         >
           <option value="all">Todos los estados</option>
           <option value="ACTIVE">Activo</option>
           <option value="INACTIVE">Inactivo</option>
           <option value="SUSPENDED">Suspendido</option>
         </select>
         <select
           value={roleFilter}
           onChange={(e) => setRoleFilter(e.target.value as any)}
            className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
         >
           <option value="all">Todos los roles</option>
           <option value={Role.ADMIN}>Administrador</option>
           <option value={Role.USER}>Usuario</option>
         </select>
       </div>
        <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          Mostrando {filteredUsers.length} de {users.length} usuarios
        </div>
     </div>
   );
 
   /**
    * @method renderContent
    * @description Renderiza el contenido principal (tabla, loading o error).
    * @returns {React.ReactElement}
    */
   const renderContent = () => {
     if (loading && users.length === 0) {
       return <div className="text-center py-10"><LoadingSpinner message="Cargando usuarios..." /></div>;
     }
 
     if (error) {
       return (
         <div className="text-center p-10 bg-red-50 dark:bg-red-900/10 rounded-lg">
           <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
           <h3 className="text-lg font-medium text-red-800 dark:text-red-300 mb-2">Error al Cargar</h3>
           <p className="text-red-600 dark:text-red-400 mb-6">{error}</p>
            <button onClick={handleRefresh} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Reintentar
           </button>
         </div>
       );
     }
 
     return (
       <div className="overflow-x-auto shadow-md rounded-lg">
         <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
           <thead className="bg-gray-50 dark:bg-gray-700">
             <tr>
               <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Usuario</th>
               <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Rol</th>
               <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Estado</th>
               <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Último Acceso</th>
               <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Acciones</th>
             </tr>
           </thead>
           <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
             {filteredUsers.map((user) => (
               <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                 <td className="px-6 py-4 whitespace-nowrap">
                   <div className="flex items-center">
                     <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                       {user.name.charAt(0).toUpperCase()}
                     </div>
                     <div className="ml-4">
                       <div className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</div>
                       <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                     </div>
                   </div>
                 </td>
                 <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.role === Role.ADMIN
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300'
                        : 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                    }`}>
                     {user.role}
                   </span>
                 </td>
                 <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.status === 'ACTIVE'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                    }`}>
                     {user.status}
                   </span>
                 </td>
                 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                   {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Nunca'}
                 </td>
                 <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                   <button onClick={() => handleEditUser(user.id, user.name)} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-200 mr-4">
                     <Edit className="h-5 w-5"/>
                   </button>
                   <button onClick={() => handleDeleteUser(user.id, user.name, user.role)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-200">
                     <Trash2 className="h-5 w-5"/>
                   </button>
                 </td>
               </tr>
             ))}
           </tbody>
         </table>
       </div>
     );
   };
   
   return (
     <div className="container mx-auto p-4 md:p-6 lg:p-8">
         <div className="flex justify-between items-center mb-6">
             <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                 Gestión de Usuarios
             </h1>
             <div className="flex items-center space-x-2">
                 <button
                     onClick={handleRefresh}
                     disabled={loading}
                     className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                     title="Actualizar lista"
                 >
                     <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                 </button>
                 <button
                     onClick={handleCreateUser}
                     className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                 >
                     <PlusCircle className="h-5 w-5 mr-2" />
                     Añadir Usuario
                 </button>
             </div>
         </div>
 
         {/* Renderizado de Secciones */}
         {renderStats()}
         {renderFilters()}
         <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
             {renderContent()}
         </div>
     </div>
   );
 };
 
 export default withAuth(UsersManagementPage, [Role.ADMIN]);