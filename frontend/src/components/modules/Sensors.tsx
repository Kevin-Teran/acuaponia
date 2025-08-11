import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
    Thermometer, Droplets, Wind, Plus, Edit, Trash2, Settings, MapPin,
    ChevronDown, Cpu, AlertCircle, Save, BarChartHorizontal, Eye, User as UserIcon, Zap
} from 'lucide-react';
import { Card } from '../common/Card';
import { Modal } from '../common/Modal';
import { LoadingSpinner } from '../common/LoadingSpinner';
import Swal from 'sweetalert2';
import { cn } from '../../utils/cn';
import * as tankService from '../../services/tankService';
import * as sensorService from '../../services/sensorService';
import { Tank, Sensor, User, SensorType } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useInfrastructure } from '../../hooks/useInfrastructure';

// --- Constantes y Funciones de Utilidad ---
const SENSOR_TYPES_AVAILABLE: SensorType[] = ['TEMPERATURE', 'PH', 'OXYGEN'];
const SENSOR_ORDER: Record<SensorType, number> = { 'TEMPERATURE': 1, 'OXYGEN': 2, 'PH': 3, 'LEVEL': 4, 'FLOW': 5 };

const translateSensorType = (type: SensorType): string => ({ TEMPERATURE: 'Temperatura', PH: 'pH', OXYGEN: 'Oxígeno', LEVEL: 'Nivel', FLOW: 'Flujo' })[type] || type;
const getSensorUnit = (type: SensorType): string => ({ TEMPERATURE: '°C', OXYGEN: 'mg/L', PH: '', LEVEL: '%', FLOW: 'L/min' })[type] || '';
const getStatusChip = (status: Tank['status'] | Sensor['status']) => {
    const styles: Record<string, string> = { ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', MAINTENANCE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300', INACTIVE: 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200', ERROR: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' };
    const text: Record<string, string> = { ACTIVE: 'Activo', MAINTENANCE: 'Mantenimiento', INACTIVE: 'Inactivo', ERROR: 'Error' };
    return <span className={cn('px-2 py-1 rounded-full text-xs font-medium', styles[status])}>{text[status]}</span>;
};
const getSensorIcon = (type: SensorType) => ({ TEMPERATURE: Thermometer, PH: Droplets, OXYGEN: Wind, LEVEL: BarChartHorizontal, FLOW: Zap })[type] || Settings;

const formatApiError = (error: any): string => {
    if (error.response?.data?.message) {
        const messages = error.response.data.message;
        return Array.isArray(messages) ? messages.join('\n') : messages;
    }
    return error.message || 'Ocurrió un error inesperado.';
};

/**
 * @component Sensors
 * @description Módulo unificado para la gestión de infraestructura (Tanques y Sensores).
 */
export const Sensors: React.FC = () => {
    const { user: currentUser, loading: authLoading } = useAuth();
    const isAdmin = currentUser?.role === 'ADMIN';
    
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const { tanks, sensors, users, loading, error, fetchDataForUser } = useInfrastructure(isAdmin);

    const [expandedTanks, setExpandedTanks] = useState<Set<string>>(new Set());
    const [modal, setModal] = useState<{ view: string | null; data?: any; }>({ view: null });

    useEffect(() => {
        if (!authLoading && currentUser && !selectedUserId) {
            setSelectedUserId(currentUser.id);
        }
    }, [authLoading, currentUser, selectedUserId]);

    useEffect(() => {
        if (selectedUserId) {
            fetchDataForUser(selectedUserId);
        }
    }, [selectedUserId, fetchDataForUser]);
    
    useEffect(() => {
        if (!loading && tanks.length > 0 && expandedTanks.size === 0) {
            setExpandedTanks(new Set([tanks[0].id]));
        } else if (tanks.length === 0) {
            setExpandedTanks(new Set());
        }
    }, [loading, tanks]);

    const sensorsByTank = useMemo(() => {
        const map = new Map<string, Sensor[]>();
        tanks.forEach(tank => map.set(tank.id, []));
        sensors.forEach(sensor => {
            if (map.has(sensor.tankId)) {
                map.get(sensor.tankId)!.push(sensor);
            }
        });
        map.forEach((sensorList) => {
            sensorList.sort((a, b) => (SENSOR_ORDER[a.type] || 99) - (SENSOR_ORDER[b.type] || 99));
        });
        return map;
    }, [sensors, tanks]);
    
    const stats = useMemo(() => ({
        totalTanks: tanks.length, activeTanks: tanks.filter(t => t.status === 'ACTIVE').length,
        totalSensors: sensors.length,
    }), [tanks, sensors]);

    const handleOpenModal = useCallback((view: string, data: any = {}) => setModal({ view, data }), []);
    const handleCloseModal = useCallback(() => setModal({ view: null, data: undefined }), []);

    const handleDelete = useCallback(async (type: 'tanque' | 'sensor', item: Tank | Sensor) => {
        const result = await Swal.fire({
            title: `¿Eliminar ${type} "${item.name}"?`, text: "Esta acción es irreversible.", icon: 'warning',
            showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#6B7280',
            confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar'
        });
        if (result.isConfirmed) {
            const action = type === 'tanque' ? () => tankService.deleteTank(item.id) : () => sensorService.deleteSensor(item.id);
            try {
                await action();
                await Swal.fire({ icon: 'success', title: '¡Eliminado!', timer: 2000, showConfirmButton: false, toast: true, position: 'top-end' });
                if (selectedUserId) await fetchDataForUser(selectedUserId);
            } catch (error: any) {
                await Swal.fire('Error', formatApiError(error), 'error');
            }
        }
    }, [selectedUserId, fetchDataForUser]);

    const toggleTankExpansion = useCallback((tankId: string) => {
        setExpandedTanks(prev => {
            const newSet = new Set(prev);
            newSet.has(tankId) ? newSet.delete(tankId) : newSet.add(tankId);
            return newSet;
        });
    }, []);
    
    if (authLoading || !selectedUserId) {
        return <LoadingSpinner fullScreen message="Cargando..." />;
    }

    const canManage = isAdmin || selectedUserId === currentUser?.id;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div><h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gestión de Infraestructura</h1><p className="text-gray-600 dark:text-gray-400 mt-1">Administra tanques y sensores del sistema.</p></div>
                {canManage && (<button onClick={() => handleOpenModal('create-tank', { userId: selectedUserId })} className="btn-primary"><MapPin className="w-5 h-5" /><span>Nuevo Tanque</span></button>)}
            </div>
            {isAdmin && (<Card><div className="flex items-center space-x-2"><UserIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" /><label className="font-medium text-gray-800 dark:text-white">Viendo infraestructura de:</label><select value={selectedUserId || ''} onChange={(e) => setSelectedUserId(e.target.value)} className="form-select">{users.map(user => (<option key={user.id} value={user.id}>{user.id === currentUser!.id ? `${user.name} (Yo)` : user.name}</option>))}</select></div></Card>)}
            
            {loading ? <LoadingSpinner message="Cargando datos de infraestructura..." /> : error ? <div className="text-center text-red-500 p-4 bg-red-50 dark:bg-red-900/20 rounded-md flex items-center justify-center"><AlertCircle className="w-6 h-6 mr-2"/> {error}</div> : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">{/* ...Tarjetas de estadísticas... */}</div>
                    <div className="space-y-4">
                        {tanks.length === 0 ? (<div className="text-center py-16 text-gray-500 dark:text-gray-400 border-2 border-dashed rounded-lg"><MapPin className="w-12 h-12 mx-auto mb-4" /><h3 className="text-lg font-semibold">No hay tanques registrados</h3><p className="mt-1 text-sm">{!canManage ? 'Este usuario no tiene tanques.' : 'Crea un nuevo tanque para empezar.'}</p></div>) : tanks.map(tank => {
                            const tankSensors = sensorsByTank.get(tank.id) || [];
                            const isExpanded = expandedTanks.has(tank.id);
                            const canAddMoreSensors = tankSensors.length < SENSOR_TYPES_AVAILABLE.length;
                            return (<Card key={tank.id} className="p-0 overflow-hidden"><header className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 cursor-pointer" onClick={() => toggleTankExpansion(tank.id)}><div className="flex items-center space-x-4 min-w-0"><MapPin className="w-8 h-8 text-sena-blue flex-shrink-0" /><div><h3 className="font-semibold text-lg truncate text-gray-900 dark:text-white">{tank.name}</h3><p className="text-sm text-gray-500 dark:text-gray-400 truncate">{tank.location}</p></div>{getStatusChip(tank.status)}</div><div className="flex items-center space-x-4 flex-shrink-0"><button onClick={(e) => { e.stopPropagation(); handleOpenModal('edit-tank', tank); }} disabled={!canManage} className="p-1.5 text-blue-600 rounded-md disabled:text-gray-400 enabled:hover:bg-blue-100 dark:enabled:hover:bg-blue-900/30" title="Editar Tanque"><Edit className="w-4 h-4"/></button><button onClick={(e) => { e.stopPropagation(); handleDelete('tanque', tank); }} disabled={!canManage} className="p-1.5 text-red-600 rounded-md disabled:text-gray-400 enabled:hover:bg-red-100 dark:enabled:hover:bg-red-900/30" title="Eliminar Tanque"><Trash2 className="w-4 h-4"/></button><span className="text-sm text-gray-600 dark:text-gray-300 hidden md:inline">{tankSensors.length} Sensores</span><ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded && "rotate-180"}`} /></div></header>
                                {isExpanded && (<div className="p-4 border-t dark:border-gray-700"><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{tankSensors.map(sensor => { const Icon = getSensorIcon(sensor.type); return (<div key={sensor.id} className="p-4 bg-white dark:bg-gray-900 rounded-lg border dark:border-gray-700"><div><div className="flex items-start justify-between mb-2"><div className="flex items-center space-x-3"><Icon className="w-5 h-5 text-sena-green"/><h4 className="font-semibold text-gray-900 dark:text-white">{sensor.name}</h4></div><span className="text-xs font-medium text-gray-600 dark:text-gray-400 capitalize">{translateSensorType(sensor.type)}</span></div><div className="flex items-baseline justify-center text-center my-4 text-gray-900 dark:text-white"><span className="text-4xl font-bold">{sensor.lastReading?.toFixed(1) ?? '--'}</span><span className="text-lg text-gray-500 dark:text-gray-400 ml-1">{getSensorUnit(sensor.type)}</span></div><div className="text-xs text-center text-gray-500 dark:text-gray-400 h-4">{sensor.lastUpdate ? `Actualizado: ${format(parseISO(sensor.lastUpdate), 'HH:mm:ss', { locale: es })}` : 'Sin datos'}</div></div><div className="flex justify-center space-x-2 mt-4 pt-3 border-t dark:border-gray-700"><button onClick={() => handleOpenModal('view-sensor', { sensor })} className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md" title="Ver Detalles"><Eye className="w-4 h-4"/></button><button onClick={() => handleOpenModal('edit-sensor', { sensor })} disabled={!canManage} className="p-1.5 text-blue-600 rounded-md disabled:text-gray-400 enabled:hover:bg-blue-100 dark:enabled:hover:bg-blue-900/30" title="Editar Sensor"><Edit className="w-4 h-4"/></button><button onClick={() => handleDelete('sensor', sensor)} disabled={!canManage} className="p-1.5 text-red-600 rounded-md disabled:text-gray-400 enabled:hover:bg-red-100 dark:enabled:hover:bg-red-900/30" title="Eliminar Sensor"><Trash2 className="w-4 h-4"/></button></div></div>);})}{canManage && canAddMoreSensors && (<div className="flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border-2 border-dashed dark:border-gray-700 hover:border-sena-green dark:hover:border-sena-green"><button onClick={() => handleOpenModal('create-sensor', { tankId: tank.id })} className="text-sena-green flex flex-col items-center"><Plus className="w-8 h-8"/><span className="text-sm mt-1 font-medium">Añadir Sensor</span></button></div>)}</div></div>)}
                            </Card>);
                        })}
                    </div>
                </>
            )}
            {(modal.view === 'create-tank' || modal.view === 'edit-tank') && <TankModal isOpen={true} isEditing={modal.view === 'edit-tank'} tankData={modal.data} onClose={handleCloseModal} onSave={() => selectedUserId && fetchDataForUser(selectedUserId)} />}
            {(modal.view === 'create-sensor' || modal.view === 'edit-sensor') && <SensorModal isOpen={true} isEditing={modal.view === 'edit-sensor'} sensorData={modal.data} tanks={tanks} sensorsByTank={sensorsByTank} onClose={handleCloseModal} onSave={() => selectedUserId && fetchDataForUser(selectedUserId)} />}
            {modal.view === 'view-sensor' && <SensorDetailModal isOpen={true} sensor={modal.data.sensor} onClose={handleCloseModal} />}
        </div>
    );
};

// --- Subcomponentes de Modales ---

const TankModal: React.FC<any> = ({ isOpen, isEditing, tankData, onClose, onSave }) => {
    const [formData, setFormData] = useState({ name: '', location: '', status: 'ACTIVE', userId: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    useEffect(() => {
        if (tankData) {
            setFormData({ name: tankData.name || '', location: tankData.location || '', status: tankData.status || 'ACTIVE', userId: tankData.userId });
        }
    }, [tankData]);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault(); setIsSubmitting(true);
        try {
            const dataToSend = { name: formData.name, location: formData.location, status: formData.status };
            const action = isEditing ? () => tankService.updateTank(tankData!.id, dataToSend) : () => tankService.createTank({ ...dataToSend, userId: formData.userId });
            await action();
            onSave();
            onClose();
            await Swal.fire({ icon: 'success', title: `Tanque ${isEditing ? 'actualizado' : 'creado'}`, toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
        } catch (error: any) {
            await Swal.fire('Error', formatApiError(error), 'error');
        } finally { setIsSubmitting(false); }
    }, [formData, isEditing, tankData, onSave, onClose]);

    return (<Modal size="md" title={isEditing ? "Editar Tanque" : "Nuevo Tanque"} isOpen={isOpen} onClose={onClose} footer={<><button type="button" onClick={onClose} className="btn-secondary">Cancelar</button><button type="submit" form="tank-form" disabled={isSubmitting} className="btn-primary min-w-[140px] relative">{isSubmitting ? <div className="absolute inset-0 flex items-center justify-center"><LoadingSpinner bare /></div> : <><Save className="w-4 h-4 mr-2" /><span>{isEditing ? 'Guardar' : 'Crear'}</span></>}</button></>}><form id="tank-form" onSubmit={handleSubmit} className="space-y-4"><div><label className="label">Nombre del Tanque*</label><input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="form-input" required /></div><div><label className="label">Ubicación*</label><input type="text" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} className="form-input" required /></div><div><label className="label">Estado</label><select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as any })} className="form-select"><option value="ACTIVE">Activo</option><option value="MAINTENANCE">Mantenimiento</option><option value="INACTIVE">Inactivo</option></select></div></form></Modal>);
};

const SensorModal: React.FC<any> = ({ isOpen, isEditing, sensorData, tanks, sensorsByTank, onClose, onSave }) => {
    const sensor = sensorData?.sensor;
    const [formData, setFormData] = useState({ name: '', hardwareId: '', type: SENSOR_TYPES_AVAILABLE[0], tankId: '', calibrationDate: new Date().toISOString().split('T')[0] });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const initialTankId = sensor?.tankId || sensorData?.tankId || '';
        const usedTypesOnInitialTank = (sensorsByTank.get(initialTankId) || []).map((s: Sensor) => s.type);
        const availableTypes = SENSOR_TYPES_AVAILABLE.filter(type => !usedTypesOnInitialTank.includes(type));
        
        setFormData({
            name: sensor?.name || '',
            hardwareId: sensor?.hardwareId || '',
            type: sensor?.type || availableTypes[0] || '',
            tankId: initialTankId,
            calibrationDate: sensor ? format(parseISO(sensor.calibrationDate), 'yyyy-MM-dd') : new Date().toISOString().split('T')[0]
        });
    }, [sensorData, sensor, sensorsByTank]);

    const availableSensorTypes = useMemo(() => {
        if (!formData.tankId || !isEditing) return SENSOR_TYPES_AVAILABLE;
        const usedTypes = (sensorsByTank.get(formData.tankId) || []).map((s: Sensor) => s.type);
        return SENSOR_TYPES_AVAILABLE.filter(type => !usedTypes.includes(type));
    }, [formData.tankId, isEditing, sensorsByTank]);
    
    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault(); setIsSubmitting(true);
        try {
            const dataToSend = isEditing 
                ? { name: formData.name, tankId: formData.tankId, calibrationDate: formData.calibrationDate }
                : formData;
            const action = isEditing ? () => sensorService.updateSensor(sensor.id, dataToSend) : () => sensorService.createSensor(dataToSend);
            await action();
            onSave();
            onClose();
            await Swal.fire({ icon: 'success', title: `Sensor ${isEditing ? 'actualizado' : 'creado'}`, toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
        } catch (error: any) {
            await Swal.fire('Error', formatApiError(error), 'error');
        } finally { setIsSubmitting(false); }
    }, [formData, isEditing, sensor, onSave, onClose]);
    
    const today = new Date().toISOString().split('T')[0];
    return (<Modal size="lg" title={isEditing ? "Editar Sensor" : "Nuevo Sensor"} isOpen={isOpen} onClose={onClose} footer={<><button type="button" onClick={onClose} className="btn-secondary">Cancelar</button><button type="submit" form="sensor-form" disabled={isSubmitting} className="btn-primary min-w-[140px] relative">{isSubmitting ? <div className="absolute inset-0 flex items-center justify-center"><LoadingSpinner bare /></div> : <><Save className="w-4 h-4 mr-2" /><span>{isEditing ? 'Guardar' : 'Crear'}</span></>}</button></>}><form id="sensor-form" onSubmit={handleSubmit} className="space-y-4"><div><label className="label">Nombre del Sensor*</label><input type="text" value={formData.name} onChange={e => setFormData(d => ({ ...d, name: e.target.value }))} className="form-input" required /></div>{!isEditing && (<div><label className="label">ID de Hardware* <span className="text-xs text-gray-400">(Identificador físico único)</span></label><input type="text" value={formData.hardwareId} onChange={e => setFormData(d => ({ ...d, hardwareId: e.target.value }))} className="form-input" required /></div>)}<div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><label className="label">Tipo de Sensor*</label><select value={formData.type} onChange={e => setFormData(d => ({ ...d, type: e.target.value as any}))} className="form-select" required disabled={isEditing}>{isEditing ? <option value={formData.type}>{translateSensorType(formData.type)}</option> : (availableSensorTypes.length > 0 ? availableSensorTypes.map(type => <option key={type} value={type}>{translateSensorType(type)}</option>) : <option disabled>No hay tipos disponibles</option>)}</select></div><div><label className="label">Asignar a Tanque*</label><select value={formData.tankId} className="form-select" required disabled={isEditing || !!sensorData.tankId}><option value={formData.tankId} disabled>{tanks.find(t => t.id === formData.tankId)?.name || 'Tanque Asignado'}</option></select></div></div><div><label className="label">Fecha de Calibración*</label><input type="date" value={formData.calibrationDate} onChange={e => setFormData(d => ({ ...d, calibrationDate: e.target.value }))} className="form-input" required max={today} /></div></form></Modal>);
};

const SensorDetailModal: React.FC<{isOpen: boolean, sensor: Sensor, onClose: () => void}> = ({ isOpen, sensor, onClose }) => {
    return (<Modal size="md" title="Detalles del Sensor" isOpen={isOpen} onClose={onClose}><div className="space-y-4 text-gray-800 dark:text-gray-200"><div className="flex justify-between"><strong>Nombre:</strong> <span className="text-gray-700 dark:text-gray-300">{sensor.name}</span></div><div className="flex justify-between"><strong>Tipo:</strong> <span className="text-gray-700 dark:text-gray-300">{translateSensorType(sensor.type)}</span></div><div className="flex justify-between items-center"><strong>Estado:</strong> {getStatusChip(sensor.status)}</div><div className="flex justify-between"><strong>Hardware ID:</strong> <span className="font-mono text-sm p-1 bg-gray-100 dark:bg-gray-700 rounded">{sensor.hardwareId}</span></div><div className="flex justify-between"><strong>Última Lectura:</strong> <span className="text-gray-700 dark:text-gray-300">{sensor.lastReading?.toFixed(2) ?? 'N/A'} {getSensorUnit(sensor.type)}</span></div><div className="flex justify-between"><strong>Fecha de Calibración:</strong> <span className="text-gray-700 dark:text-gray-300">{format(parseISO(sensor.calibrationDate), 'dd/MM/yyyy', { locale: es })}</span></div><div className="flex justify-between"><strong>Última Actualización:</strong> <span className="text-gray-700 dark:text-gray-300">{sensor.lastUpdate ? format(parseISO(sensor.lastUpdate), 'dd/MM/yyyy HH:mm', { locale: es }) : 'N/A'}</span></div></div></Modal>);
};