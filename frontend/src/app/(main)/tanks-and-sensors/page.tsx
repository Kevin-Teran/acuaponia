/**
 * @file page.tsx
 * @route /tanks-and-sensors
 * @description Página robusta para la gestión de Tanques y Sensores.
 * CORRECCIÓN: Se arregla la visibilidad del selector de usuarios para admin y se mejora la disposición de los filtros.
 * @author Kevin Mariano
 * @version 8.1.0
 * @since 1.0.0
 */
'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useInfrastructure } from '@/hooks/useInfrastructure';
import { Tank, Sensor, SensorType } from '@/types';
import * as tankService from '@/services/tankService';
import { deleteSensor } from '@/services/sensorService';
import { TankModal } from '@/components/devices/TankModal';
import { SensorModal } from '@/components/devices/SensorModal';
import { SensorDetailModal } from '@/components/devices/SensorDetailModal';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import {
  MapPin, Cpu, AlertCircle, Plus, Edit, Trash2, ChevronDown, User as UserIcon,
  Thermometer, Droplets, Wind, Zap, BarChartHorizontal, Settings, Eye,
  Search, CheckCircle2, AlertTriangle as WarningIcon, SlidersHorizontal,
  LayoutGrid
} from 'lucide-react';
import Swal from 'sweetalert2';
import { clsx } from 'clsx';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const MAX_SENSORS_PER_TANK = 5;

const getStatusChip = (status: Tank['status'] | Sensor['status']) => {
    const styles: Record<string, string> = {
        ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
        MAINTENANCE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
        INACTIVE: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
        ERROR: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
        CALIBRATING: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    };
    const text: Record<string, string> = {
        ACTIVE: 'Activo',
        MAINTENANCE: 'Mantenimiento',
        INACTIVE: 'Inactivo',
        ERROR: 'Error',
        CALIBRATING: 'Calibrando'
    };
    return <span className={clsx('px-2 py-1 rounded-full text-xs font-medium', styles[status])}>{text[status] || 'Desconocido'}</span>;
};

const getSensorInfo = (type: SensorType) => ({
    TEMPERATURE: { Icon: Thermometer, unit: '°C', name: 'Temperatura', color: 'text-orange-500' },
    PH: { Icon: Droplets, unit: '', name: 'pH', color: 'text-green-500' },
    OXYGEN: { Icon: Wind, unit: 'mg/L', name: 'Oxígeno', color: 'text-blue-500' },
    LEVEL: { Icon: BarChartHorizontal, unit: '%', name: 'Nivel', color: 'text-purple-500' },
    FLOW: { Icon: Zap, unit: 'L/min', name: 'Flujo', color: 'text-yellow-500' }
}[type] || { Icon: Settings, unit: '', name: 'Desconocido', color: 'text-gray-500' });


export default function DevicesPage() {
    const { user: currentUser } = useAuth();
    const isAdmin = currentUser?.role === 'ADMIN';

    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const { tanks = [], sensors = [], users = [], loading, error, fetchDataForUser, refetchData } = useInfrastructure(isAdmin);

    const [modal, setModal] = useState<{ view: string | null; data?: any; }>({ view: null });
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE'>('all');
    const [expandedTanks, setExpandedTanks] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (currentUser && !selectedUserId) {
            setSelectedUserId(currentUser.id);
        }
    }, [currentUser, selectedUserId]);

    useEffect(() => {
        if (selectedUserId) {
            fetchDataForUser(selectedUserId);
        }
    }, [selectedUserId, fetchDataForUser]);

    useEffect(() => {
        if (!loading && tanks.length > 0) {
            setExpandedTanks(new Set(tanks.map(t => t.id)));
        }
    }, [loading, tanks]);

    const stats = useMemo(() => ({
        totalTanks: tanks.length,
        totalSensors: sensors.length,
        activeTanks: tanks.filter(t => t.status === 'ACTIVE').length,
        maintenanceTanks: tanks.filter(t => t.status === 'MAINTENANCE').length,
    }), [tanks, sensors]);

    const filteredTanks = useMemo(() => {
        return tanks.filter(tank => {
            const term = searchTerm.toLowerCase().trim();
            const nameMatch = tank.name.toLowerCase().includes(term);
            const locationMatch = tank.location?.toLowerCase().includes(term) || false;
            const statusMatch = statusFilter === 'all' || tank.status === statusFilter;
            return (nameMatch || locationMatch) && statusMatch;
        });
    }, [tanks, searchTerm, statusFilter]);

    const sensorsByTank = useMemo(() => {
        const map = new Map<string, Sensor[]>();
        tanks.forEach(tank => map.set(tank.id, []));
        sensors.forEach(sensor => {
            if (map.has(sensor.tankId)) {
                map.get(sensor.tankId)!.push(sensor);
            }
        });
        return map;
    }, [sensors, tanks]);

    const handleOpenModal = useCallback((view: string, data: any = {}) => setModal({ view, data }), []);
    const handleCloseModal = useCallback(() => setModal({ view: null }), []);

    const handleActionCompletion = useCallback(() => {
        handleCloseModal();
        if (selectedUserId) {
            refetchData(selectedUserId);
        }
    }, [selectedUserId, refetchData, handleCloseModal]);

    const handleUserChange = (userId: string) => {
        setSelectedUserId(userId);
    };

    const handleDelete = useCallback(async (type: 'tanque' | 'sensor', item: Tank | Sensor) => {
        const result = await Swal.fire({
            title: `¿Eliminar ${type} "${item.name}"?`,
            text: "Esta acción es irreversible.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            customClass: { popup: 'rounded-2xl' }
        });

        if (result.isConfirmed) {
            const action = type === 'tanque' ? tankService.deleteTank : deleteSensor;
            try {
                await action(item.id);
                await Swal.fire({ title: '¡Eliminado!', icon: 'success', timer: 1500, showConfirmButton: false });
                handleActionCompletion();
            } catch (err: any) {
                await Swal.fire('Error', err.response?.data?.message || `No se pudo eliminar el ${type}.`, 'error');
            }
        }
    }, [handleActionCompletion]);

    if (loading && tanks.length === 0) {
        return <LoadingSpinner fullScreen message="Cargando infraestructura..." />;
    }

    return (
        <div className="container mx-auto p-4 md:p-6 lg:p-8">
            <header className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gestión de Tanques y Sensores</h1>
                <button
                    onClick={() => handleOpenModal('create-tank', { userId: selectedUserId })}
                    className="flex items-center px-4 py-2 bg-[#39A900] text-white rounded-lg hover:bg-[#2F8B00] transition-colors shadow-md disabled:bg-gray-400"
                    disabled={!selectedUserId}
                >
                    <MapPin className="w-5 h-5 mr-2" />
                    <span>Nuevo Tanque</span>
                </button>
            </header>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard icon={LayoutGrid} title="Total Tanques" value={stats.totalTanks} color="text-blue-500" />
                <StatCard icon={Cpu} title="Total Sensores" value={stats.totalSensors} color="text-indigo-500" />
                <StatCard icon={CheckCircle2} title="Tanques Activos" value={stats.activeTanks} color="text-green-500" />
                <StatCard icon={WarningIcon} title="En Mantenimiento" value={stats.maintenanceTanks} color="text-yellow-500" />
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="relative lg:col-span-2">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o ubicación..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-[#39A900] focus:border-[#39A900]"
                        />
                    </div>
                    
                    {isAdmin && users.length > 0 && (
                        <div className="relative">
                            <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                            <select
                                value={selectedUserId || ''}
                                onChange={(e) => handleUserChange(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-[#39A900] focus:border-[#39A900]"
                            >
                                {users.map(user => (
                                    <option key={user.id} value={user.id}>{user.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="relative">
                        <SlidersHorizontal className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as any)}
                            className="w-full pl-10 pr-4 py-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-[#39A900] focus:border-[#39A900]"
                        >
                            <option value="all">Todos los estados</option>
                            <option value="ACTIVE">Activo</option>
                            <option value="MAINTENANCE">Mantenimiento</option>
                            <option value="INACTIVE">Inactivo</option>
                        </select>
                    </div>
                </div>
            </div>

            {error && (
                <div className="text-center text-red-500 p-4 bg-red-50 dark:bg-red-900/20 rounded-md flex items-center justify-center mb-6">
                    <AlertCircle className="w-6 h-6 mr-2" /> {error}
                </div>
            )}

            {loading && <div className="flex justify-center items-center py-8"><LoadingSpinner size="lg" message="Cargando datos..." /></div>}

            <div className="space-y-4">
                {!loading && !selectedUserId && isAdmin && (
                    <EmptyState icon={UserIcon} title="Selecciona un usuario" message="Elige un usuario de la lista para ver sus tanques y sensores." />
                )}
                {!loading && selectedUserId && filteredTanks.length === 0 && (
                     <EmptyState icon={MapPin} title="No se encontraron tanques" message="Prueba a cambiar los filtros o crea un nuevo tanque para este usuario." />
                )}
                {!loading && filteredTanks.map(tank => {
                    const tankSensors = sensorsByTank.get(tank.id) || [];
                    const isExpanded = expandedTanks.has(tank.id);
                    return (
                        <div key={tank.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden transition-all duration-300">
                            <header
                                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                onClick={() => setExpandedTanks(prev => {
                                    const next = new Set(prev);
                                    next.has(tank.id) ? next.delete(tank.id) : next.add(tank.id);
                                    return next;
                                })}
                            >
                                <div className="flex items-center space-x-4">
                                    <MapPin className="w-8 h-8 text-[#39A900]" />
                                    <div>
                                        <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{tank.name}</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{tank.location}</p>
                                        <p className="text-xs text-gray-400">
                                            {tankSensors.length} de {MAX_SENSORS_PER_TANK} sensores instalados
                                        </p>
                                    </div>
                                    {getStatusChip(tank.status)}
                                </div>
                                <div className="flex items-center space-x-2">
                                    <ActionButton icon={Edit} title="Editar Tanque" onClick={(e) => { e.stopPropagation(); handleOpenModal('edit-tank', tank); }} />
                                    <ActionButton icon={Trash2} title="Eliminar Tanque" onClick={(e) => { e.stopPropagation(); handleDelete('tanque', tank); }} />
                                    <ChevronDown className={`w-5 h-5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                                </div>
                            </header>
                            {isExpanded && (
                                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                        {tankSensors.map(sensor => (
                                            <SensorCard key={sensor.id} sensor={sensor} onOpenModal={handleOpenModal} onDelete={handleDelete} />
                                        ))}
                                        {tankSensors.length < MAX_SENSORS_PER_TANK && (
                                            <button onClick={() => handleOpenModal('create-sensor', { tankId: tank.id })} className="flex flex-col items-center justify-center p-4 bg-white dark:bg-gray-900/50 rounded-lg border-2 border-dashed hover:border-[#39A900] text-[#39A900] transition-colors h-full min-h-[150px]">
                                                <Plus className="w-8 h-8" />
                                                <span className="text-sm mt-2 font-medium">Añadir Sensor</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {(modal.view === 'create-tank' || modal.view === 'edit-tank') && <TankModal isOpen={true} isEditing={modal.view === 'edit-tank'} tankData={modal.data} onClose={handleCloseModal} onSave={handleActionCompletion} />}
            {(modal.view === 'create-sensor' || modal.view === 'edit-sensor') && <SensorModal isOpen={true} isEditing={modal.view === 'edit-sensor'} sensorData={modal.data} tanks={tanks} sensorsByTank={sensorsByTank} onClose={handleCloseModal} onSave={handleActionCompletion} />}
            {modal.view === 'view-sensor' && modal.data && <SensorDetailModal isOpen={true} sensor={modal.data} onClose={handleCloseModal} />}
        </div>
    );
}

const StatCard = ({ icon: Icon, title, value, color }: { icon: React.ElementType, title: string, value: number | string, color: string }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex items-center">
        <Icon className={clsx("h-8 w-8", color)} />
        <div className="ml-4">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
    </div>
);

const ActionButton = ({ icon: Icon, title, onClick }: { icon: React.ElementType, title: string, onClick: (e: React.MouseEvent) => void }) => (
    <button onClick={onClick} className="p-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full" title={title}><Icon className="w-4 h-4" /></button>
);

const EmptyState = ({ icon: Icon, title, message }: { icon: React.ElementType, title: string, message: string }) => (
    <div className="text-center py-16 text-gray-500 border-2 border-dashed rounded-lg bg-white dark:bg-gray-800">
        <Icon className="w-12 h-12 mx-auto mb-4" />
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="mt-1 text-sm">{message}</p>
    </div>
);

const SensorCard = ({ sensor, onOpenModal, onDelete }: { sensor: Sensor; onOpenModal: (view: string, data: any) => void; onDelete: (type: 'sensor', item: Sensor) => void; }) => {
    const { Icon, unit, name: typeName, color } = getSensorInfo(sensor.type);
    return (
        <div className="flex flex-col justify-between p-4 bg-white dark:bg-gray-900 rounded-lg border dark:border-gray-700 shadow h-full">
            <div>
                <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-3">
                        <Icon className={clsx("w-5 h-5", color)} />
                        <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white">{sensor.name}</h4>
                            <p className="text-xs text-gray-500">{typeName}</p>
                        </div>
                    </div>
                    {getStatusChip(sensor.status)}
                </div>
                <div className="flex items-baseline justify-center text-center my-4 text-gray-900 dark:text-white">
                    <span className="text-4xl font-bold">{sensor.lastReading !== null && sensor.lastReading !== undefined ? sensor.lastReading.toFixed(1) : '--'}</span>
                    <span className="text-lg text-gray-500 dark:text-gray-400 ml-1">{unit}</span>
                </div>
                <div className="text-xs text-center text-gray-500 dark:text-gray-400 h-4">
                    {sensor.lastUpdate ? `Actualizado: ${format(parseISO(sensor.lastUpdate), 'HH:mm:ss', { locale: es })}` : 'Sin datos'}
                </div>
            </div>
            <div className="flex justify-center space-x-2 mt-4 pt-3 border-t dark:border-gray-700">
                <ActionButton icon={Eye} title="Ver Detalles" onClick={() => onOpenModal('view-sensor', sensor)} />
                <ActionButton icon={Edit} title="Editar Sensor" onClick={() => onOpenModal('edit-sensor', { sensor })} />
                <ActionButton icon={Trash2} title="Eliminar Sensor" onClick={() => onDelete('sensor', sensor)} />
            </div>
        </div>
    );
};