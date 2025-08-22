/**
 * @page UsersPage
 * @route /users
 * @description Página para la gestión de usuarios. Acceso exclusivo para administradores.
 */
 'use client';

 import { useCallback } from 'react';
 import { withAuth } from '@/hoc/withAuth';
 import { Role } from '@/types';
 import { useAuth } from '@/context/AuthContext';
 import { PlusCircle, Edit, Trash2, AlertTriangle } from 'lucide-react';
 import { LoadingSpinner } from '@/components/common/LoadingSpinner';
 import Swal from 'sweetalert2';
 import { useUsers } from '@/hooks/useUsers'; // Hook personalizado para la lógica de usuarios
 
 const UsersManagementPage = () => {
   const { user: currentUser } = useAuth();
   const { users, loading, error, fetchUsers, deleteUser } = useUsers();
 
   const handleCreateUser = () => {
     Swal.fire('Función no implementada', 'Aquí se abriría el modal para crear un nuevo usuario.', 'info');
     // Futuro: llamar a una función `createUser` del hook `useUsers`
   };
 
   const handleEditUser = (userId: string) => {
     Swal.fire('Función no implementada', `Aquí se abriría el modal para editar al usuario con ID: ${userId}.`, 'info');
     // Futuro: llamar a una función `updateUser` del hook `useUsers`
   };
 
   const handleDeleteUser = useCallback((userId: string, userName: string) => {
     if (currentUser?.id === userId) {
       Swal.fire('Acción no permitida', 'No puedes eliminar tu propia cuenta.', 'error');
       return;
     }
     
     Swal.fire({
       title: `¿Estás seguro de eliminar a ${userName}?`,
       text: "Esta acción no se puede revertir.",
       icon: 'warning',
       showCancelButton: true,
       confirmButtonColor: '#d33',
       cancelButtonColor: '#3085d6',
       confirmButtonText: 'Sí, eliminar',
       cancelButtonText: 'Cancelar'
     }).then(async (result) => {
       if (result.isConfirmed) {
         try {
           await deleteUser(userId);
           Swal.fire('Eliminado', `${userName} ha sido eliminado.`, 'success');
         } catch (err: any) {
           Swal.fire('Error', err.message || 'No se pudo eliminar el usuario.', 'error');
         }
       }
     });
   }, [currentUser, deleteUser]);
   
   const renderContent = () => {
     if (loading) {
       return <div className="flex justify-center items-center p-10"><LoadingSpinner message="Cargando usuarios..." /></div>;
     }
 
     if (error) {
       return (
         <div className="text-center p-10 text-red-600 dark:text-red-400">
           <AlertTriangle className="mx-auto h-12 w-12" />
           <p className="mt-4 font-semibold">{error}</p>
           <button onClick={fetchUsers} className="mt-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
             Reintentar
           </button>
         </div>
       );
     }
     
     return (
       <div className="overflow-x-auto">
         <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
           <thead className="bg-gray-50 dark:bg-gray-700">
             <tr>
               <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Nombre</th>
               <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Rol</th>
               <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Estado</th>
               <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tanques</th>
               <th scope="col" className="relative px-6 py-3"><span className="sr-only">Acciones</span></th>
             </tr>
           </thead>
           <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
             {users.map((user) => (
               <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                 <td className="px-6 py-4 whitespace-nowrap">
                   <div className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</div>
                   <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                 </td>
                 <td className="px-6 py-4 whitespace-nowrap">
                   <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === Role.ADMIN ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'}`}>
                     {user.role}
                   </span>
                 </td>
                 <td className="px-6 py-4 whitespace-nowrap">
                   <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.status === 'ACTIVE' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                     {user.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                   </span>
                 </td>
                 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 text-center">{user._count.tanks}</td>
                 <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                   <div className="flex items-center justify-end space-x-4">
                     <button onClick={() => handleEditUser(user.id)} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300" title="Editar">
                       <Edit className="h-5 w-5"/>
                     </button>
                     {currentUser?.id !== user.id && (
                       <button onClick={() => handleDeleteUser(user.id, user.name)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300" title="Eliminar">
                         <Trash2 className="h-5 w-5"/>
                       </button>
                     )}
                   </div>
                 </td>
               </tr>
             ))}
           </tbody>
         </table>
       </div>
     );
   };
 
   return (
     <div className="p-4 md:p-8">
       <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
         <div>
           <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Gestión de Usuarios</h1>
           <p className="text-gray-500 dark:text-gray-400 mt-1">Administra los usuarios y sus permisos en el sistema.</p>
         </div>
         <button
           onClick={handleCreateUser}
           className="mt-4 md:mt-0 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg flex items-center transition-colors shadow-md hover:shadow-lg"
         >
           <PlusCircle className="mr-2 h-5 w-5" />
           Nuevo Usuario
         </button>
       </header>
       
       <main className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
         {renderContent()}
       </main>
     </div>
   );
 };
 
 export default withAuth(UsersManagementPage, { roles: [Role.ADMIN] });