/**
 * @file page.tsx
 * @description Página para la gestión de tanques y sensores.
 * @author Kevin Mariano
 * @version 1.2.0
 * @since 1.0.0
 */

'use client';

import { useState } from 'react';
import { useInfrastructure } from '@/hooks/useInfrastructure';
import { Tank } from '@/types';
import Card from '@/components/common/Card';
import TankModal from '@/components/devices/TankModal';
import SensorDetailModal from '@/components/devices/SensorDetailModal';
// --- CORRECCIÓN ---
// Se reemplaza @heroicons/react por lucide-react, que es la librería instalada.
import { Plus, Eye, Pencil, Trash2 } from 'lucide-react';

/**
 * @page TanksAndSensorsPage
 * @description Componente principal de la página de gestión de tanques y sensores.
 * Implementa el hook useInfrastructure para manejar el estado y las acciones,
 * garantizando la recarga automática y eficiente de la tabla de tanques.
 */
export default function TanksAndSensorsPage() {
  const { tanks, loading, error, addTank, updateTank, deleteTank } = useInfrastructure();

  const [isTankModalOpen, setIsTankModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedTank, setSelectedTank] = useState<Tank | null>(null);

  /**
   * @function handleOpenCreateModal
   * @description Abre el modal para crear un nuevo tanque.
   */
  const handleOpenCreateModal = () => {
    setSelectedTank(null);
    setIsTankModalOpen(true);
  };

  /**
   * @function handleOpenEditModal
   * @description Abre el modal para editar un tanque existente.
   * @param {Tank} tank - El tanque a editar.
   */
  const handleOpenEditModal = (tank: Tank) => {
    setSelectedTank(tank);
    setIsTankModalOpen(true);
  };

  /**
   * @function handleOpenDetailModal
   * @description Abre el modal para ver los detalles de un tanque.
   * @param {Tank} tank - El tanque del cual se mostrarán los detalles.
   */
  const handleOpenDetailModal = (tank: Tank) => {
    setSelectedTank(tank);
    setIsDetailModalOpen(true);
  };
  
  /**
   * @function handleDeleteTank
   * @description Pide confirmación y ejecuta el borrado lógico de un tanque.
   * @param {string} id - El ID del tanque a eliminar.
   */
  const handleDeleteTank = async (id: string) => {
    // Es una buena práctica usar un sistema de confirmación más robusto (como un modal)
    // pero window.confirm es válido para una implementación rápida.
    if (confirm('¿Estás seguro de que quieres eliminar este tanque?')) {
      try {
        await deleteTank(id);
        // Aquí podrías añadir una notificación de éxito (ej. con SweetAlert2)
      } catch (err) {
        // Y aquí una notificación de error
        console.error("Error al eliminar el tanque:", err);
      }
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-gray-100">Gestión de Tanques y Sensores</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-6">
        {/* --- MEJORA ESTÉTICA IMPLEMENTADA --- */}
        {/* Se usa una clase de color consistente con el tema (ej. bg-gray-800) */}
        <Card title="Total Tanques" value={loading ? '...' : tanks.length} color="bg-gray-800" />
        {/* Puedes añadir más tarjetas aquí si es necesario */}
      </div>

      <div className="bg-gray-900 p-4 rounded-lg">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl text-white">Tanques</h2>
            <button 
              onClick={handleOpenCreateModal} 
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded inline-flex items-center transition-colors duration-300"
            >
                <Plus className="h-5 w-5 mr-2"/>
                Añadir Tanque
            </button>
        </div>

        {/* --- RECARGA EFICIENTE IMPLEMENTADA --- */}
        {/* El estado de carga y error es manejado por el hook, actualizando solo esta sección. */}
        {loading && <p className="text-center text-white py-4">Cargando tanques...</p>}
        {error && <p className="text-center text-red-500 py-4">Error al cargar: {error.message}</p>}

        {!loading && !error && (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-gray-800 text-white rounded-md">
                  <thead className="bg-gray-700">
                      <tr>
                          <th className="py-3 px-4 text-left">Nombre</th>
                          <th className="py-3 px-4 text-left">Descripción</th>
                          <th className="py-3 px-4 text-center">Acciones</th>
                      </tr>
                  </thead>
                  <tbody>
                      {tanks.map((tank) => (
                          <tr key={tank.id} className="hover:bg-gray-700 border-b border-gray-700">
                              <td className="py-3 px-4">{tank.name}</td>
                              <td className="py-3 px-4">{tank.description}</td>
                              <td className="py-3 px-4 flex justify-center gap-3">
                                  {/* --- FUNCIONALIDAD VER DETALLES --- */}
                                  <button onClick={() => handleOpenDetailModal(tank)} className="p-1 text-gray-400 hover:text-blue-400" title="Ver Detalles"><Eye className="h-5 w-5"/></button>
                                  {/* --- FUNCIONALIDAD EDITAR --- */}
                                  <button onClick={() => handleOpenEditModal(tank)} className="p-1 text-gray-400 hover:text-yellow-400" title="Editar"><Pencil className="h-5 w-5"/></button>
                                  {/* --- FUNCIONALIDAD BORRAR (LÓGICO) --- */}
                                  <button onClick={() => handleDeleteTank(tank.id)} className="p-1 text-gray-400 hover:text-red-400" title="Eliminar"><Trash2 className="h-5 w-5"/></button>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
            </div>
        )}
      </div>

      {/* Renderizado condicional de Modales */}
      {isTankModalOpen && (
          <TankModal 
              tank={selectedTank}
              onClose={() => setIsTankModalOpen(false)}
              onSave={async (data) => {
                  if (selectedTank) {
                      await updateTank(selectedTank.id, data);
                  } else {
                      await addTank(data);
                  }
                  setIsTankModalOpen(false);
              }}
          />
      )}
      {isDetailModalOpen && selectedTank && (
          <SensorDetailModal
              tank={selectedTank}
              onClose={() => setIsDetailModalOpen(false)}
          />
      )}
    </div>
  );
}