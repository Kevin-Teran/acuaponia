'use client'; 

/**
 * @page DevicesPage
 * @route /devices
 * @description Módulo unificado para la gestión de infraestructura (Tanques y Sensores).
 */
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { MapPin, Cpu, AlertCircle, Plus, Edit, Trash2, ChevronDown, User as UserIcon, Thermometer, Droplets, Wind, Zap, BarChartHorizontal, Settings, Eye } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import Swal from 'sweetalert2';
import { useAuth } from '@/context/AuthContext';
import { useInfrastructure } from '@/hooks/useInfrastructure';
import { Tank, Sensor, SensorType } from '@/types';
import * as tankService from '@/services/tankService';
import * as sensorService from '@/services/sensorService';
import { TankModal } from '@/components/devices/TankModal';
import { SensorModal } from '@/components/devices/SensorModal';
import { SensorDetailModal } from '@/components/devices/SensorDetailModal';
import { clsx } from 'clsx';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

// --- Funciones de Utilidad y Constantes ---
const getStatusChip = (status: Tank['status'] | Sensor['status']) => {
    const styles: Record<string, string> = { ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', MAINTENANCE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300', INACTIVE: 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200', ERROR: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' };
    const text: Record<string, string> = { ACTIVE: 'Activo', MAINTENANCE: 'Mantenimiento', INACTIVE: 'Inactivo', ERROR: 'Error' };
    return <span className={clsx('px-2 py-1 rounded-full text-xs font-medium', styles[status])}>{text[status]}</span>;
};

const getSensorInfo = (type: SensorType) => ({
    TEMPERATURE: { Icon: Thermometer, unit: '°C', name: 'Temperatura', color: 'text-orange-500' },
    PH: { Icon: Droplets, unit: '', name: 'pH', color: 'text-green-500' },
    OXYGEN: { Icon: Wind, unit: 'mg/L', name: 'Oxígeno', color: 'text-blue-500' },
    LEVEL: { Icon: BarChartHorizontal, unit: '%', name: 'Nivel', color: 'text-gray-500' },
    FLOW: { Icon: Zap, unit: 'L/min', name: 'Flujo', color: 'text-yellow-500' }
}[type] || { Icon: Settings, unit: '', name: 'Desconocido', color: 'text-gray-500' });

const SENSOR_TYPES_AVAILABLE: SensorType[] = ['TEMPERATURE', 'PH', 'OXYGEN'];

// --- Componente Principal de la Página ---
export default function DevicesPage() {
    const { user: currentUser } = useAuth();
    const isAdmin = currentUser?.role === 'ADMIN';
    
    const [selectedUserId, setSelectedUserId] = useState<string | null>(currentUser?.id || null);
    const { tanks, sensors, users, loading, error, fetchDataForUser } = useInfrastructure(isAdmin);

    const [expandedTanks, setExpandedTanks] = useState<Set<string>>(new Set());
    const [modal, setModal] = useState<{ view: string | null; data?: any; }>({ view: null });
    
    useEffect(() => {
        if (selectedUserId) fetchDataForUser(selectedUserId);
    }, [selectedUserId, fetchDataForUser]);
    
    useEffect(() => {
        if (!loading && tanks.length > 0) setExpandedTanks(new Set(tanks.map(t => t.id)));
    }, [loading, tanks]);

    const sensorsByTank = useMemo(() => {
        const map = new Map<string, Sensor[]>();
        tanks.forEach(tank => map.set(tank.id, []));
        sensors.forEach(sensor => {
            if (map.has(sensor.tankId)) map.get(sensor.tankId)!.push(sensor);
        });
        return map;
    }, [sensors, tanks]);

    const handleOpenModal = useCallback((view: string, data: any = {}) => setModal({ view, data }), []);
    const handleCloseModal = useCallback(() => setModal({ view: null }), []);

    const handleDelete = useCallback(async (type: 'tanque' | 'sensor', item: Tank | Sensor) => {
        const result = await Swal.fire({
            title: `¿Eliminar ${type} "${item.name}"?`, text: "Esta acción es irreversible.", icon: 'warning',
            showCancelButton: true, confirmButtonColor: '#d33', cancelButtonText: 'Cancelar', confirmButtonText: 'Sí, eliminar'
        });
        if (result.isConfirmed) {
            const action = type === 'tanque' ? tankService.deleteTank : sensorService.deleteSensor;
            try {
                await action(item.id);
                Swal.fire({ icon: 'success', title: '¡Eliminado!', timer: 2000, showConfirmButton: false, toast: true, position: 'top-end' });
                if (selectedUserId) fetchDataForUser(selectedUserId);
            } catch (err: any) {
                Swal.fire('Error', err.response?.data?.message || `No se pudo eliminar el ${type}.`, 'error');
            }
        }
    }, [selectedUserId, fetchDataForUser]);

    if (loading) return <LoadingSpinner fullScreen message="Cargando infraestructura..." />;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div><h1 className="text-3xl font-bold">Gestión de Dispositivos</h1><p className="text-gray-600 dark:text-gray-400 mt-1">Administra los tanques y sensores del sistema.</p></div>
                <button onClick={() => handleOpenModal('create-tank', { userId: selectedUserId })} className="btn-primary"><MapPin className="w-5 h-5" /><span>Nuevo Tanque</span></button>
            </div>
            {isAdmin && (<Card><div className="flex items-center space-x-2 p-2"><UserIcon className="w-5 h-5" /><label className="font-medium">Viendo infraestructura de:</label><select value={selectedUserId || ''} onChange={(e) => setSelectedUserId(e.target.value)} className="form-select">{users.map(user => (<option key={user.id} value={user.id}>{user.name}</option>))}</select></div></Card>)}
            {error && <div className="text-center text-red-500 p-4 bg-red-50 rounded-md flex items-center justify-center"><AlertCircle className="w-6 h-6 mr-2"/> {error}</div>}
            
            <div className="space-y-4">
                {tanks.length === 0 ? (
                    <div className="text-center py-16 text-gray-500 border-2 border-dashed rounded-lg"><MapPin className="w-12 h-12 mx-auto mb-4" /><h3 className="text-lg font-semibold">No hay tanques registrados</h3><p className="mt-1 text-sm">Crea un nuevo tanque para empezar a añadir sensores.</p></div>
                ) : tanks.map(tank => {
                    const tankSensors = sensorsByTank.get(tank.id) || [];
                    const isExpanded = expandedTanks.has(tank.id);
                    return (
                        <Card key={tank.id} className="p-0 overflow-hidden">
                            <header className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50" onClick={() => setExpandedTanks(prev => { const next = new Set(prev); next.has(tank.id) ? next.delete(tank.id) : next.add(tank.id); return next; })}>
                                <div className="flex items-center space-x-4"><MapPin className="w-8 h-8 text-blue-500" /><div><h3 className="font-semibold text-lg">{tank.name}</h3><p className="text-sm text-gray-500">{tank.location}</p></div>{getStatusChip(tank.status)}</div>
                                <div className="flex items-center space-x-2"><button onClick={(e) => { e.stopPropagation(); handleOpenModal('edit-tank', tank); }} className="p-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full" title="Editar Tanque"><Edit className="w-4 h-4"/></button><button onClick={(e) => { e.stopPropagation(); handleDelete('tanque', tank); }} className="p-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full" title="Eliminar Tanque"><Trash2 className="w-4 h-4"/></button><ChevronDown className={`w-5 h-5 transition-transform ${isExpanded && "rotate-180"}`} /></div>
                            </header>
                            {isExpanded && (
                                <div className="p-4 border-t dark:border-gray-700">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                        {tankSensors.map(sensor => <SensorCard key={sensor.id} sensor={sensor} onOpenModal={handleOpenModal} onDelete={handleDelete} />)}
                                        {tankSensors.length < SENSOR_TYPES_AVAILABLE.length && (
                                            <button onClick={() => handleOpenModal('create-sensor', { tankId: tank.id })} className="flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border-2 border-dashed hover:border-green-500 text-green-600 dark:text-green-500 transition-colors h-full min-h-[150px]">
                                                <Plus className="w-8 h-8"/><span className="text-sm mt-2 font-medium">Añadir Sensor</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </Card>
                    );
                })}
            </div>

            {(modal.view === 'create-tank' || modal.view === 'edit-tank') && <TankModal isOpen={true} isEditing={modal.view === 'edit-tank'} tankData={modal.data} onClose={handleCloseModal} onSave={() => selectedUserId && fetchDataForUser(selectedUserId)} />}
            {(modal.view === 'create-sensor' || modal.view === 'edit-sensor') && <SensorModal isOpen={true} isEditing={modal.view === 'edit-sensor'} sensorData={modal.data} tanks={tanks} sensorsByTank={sensorsByTank} onClose={handleCloseModal} onSave={() => selectedUserId && fetchDataForUser(selectedUserId)} />}
            {modal.view === 'view-sensor' && <SensorDetailModal isOpen={true} sensor={modal.data} onClose={handleCloseModal} />}
        </div>
    );
}

// --- Componente Interno para la Tarjeta de Sensor ---
const SensorCard = ({ sensor, onOpenModal, onDelete }: { sensor: Sensor, onOpenModal: (view: string, data: any) => void, onDelete: (type: 'sensor', item: Sensor) => void }) => {
    const { Icon, unit, name: typeName, color } = getSensorInfo(sensor.type);
    return (
        <div className="flex flex-col justify-between p-4 bg-white dark:bg-gray-900 rounded-lg border dark:border-gray-700 h-full">
            <div>
                <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-3"><Icon className={clsx("w-5 h-5", color)} /><h4 className="font-semibold text-gray-900 dark:text-white">{sensor.name}</h4></div>
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400 capitalize">{typeName}</span>
                </div>
                <div className="flex items-baseline justify-center text-center my-4 text-gray-900 dark:text-white">
                    <span className="text-4xl font-bold">{sensor.lastReading?.toFixed(1) ?? '--'}</span>
                    <span className="text-lg text-gray-500 dark:text-gray-400 ml-1">{unit}</span>
                </div>
                <div className="text-xs text-center text-gray-500 dark:text-gray-400 h-4">
                    {sensor.lastUpdate ? `Actualizado: ${format(parseISO(sensor.lastUpdate), 'HH:mm:ss', { locale: es })}` : 'Sin datos'}
                </div>
            </div>
            <div className="flex justify-center space-x-2 mt-4 pt-3 border-t dark:border-gray-700">
                <button onClick={() => onOpenModal('view-sensor', sensor)} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-full" title="Ver Detalles"><Eye className="w-4 h-4"/></button>
                <button onClick={() => onOpenModal('edit-sensor', { sensor })} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-full" title="Editar Sensor"><Edit className="w-4 h-4"/></button>
                <button onClick={() => onDelete('sensor', sensor)} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-full" title="Eliminar Sensor"><Trash2 className="w-4 h-4"/></button>
            </div>
        </div>
    );
};