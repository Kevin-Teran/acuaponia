import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
    Thermometer, Droplets, Wind, Plus, Edit, Trash2, Settings, MapPin,
    ChevronDown, Cpu, AlertCircle, Save, BarChartHorizontal,
    TrendingUp, TrendingDown, Eye, User as UserIcon, Loader, Zap
} from 'lucide-react';
import { Card } from '../common/Card';
import { Modal } from '../common/Modal';
import { LoadingSpinner } from '../common/LoadingSpinner';
import Swal from 'sweetalert2';
import { cn } from '../../utils/cn';
import * as tankService from '../../services/tankService';
import * as sensorService from '../../services/sensorService';
import * as userService from '../../services/userService';
import { Tank, Sensor, User, SensorType, SensorData } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { socketService } from '../../services/socketService';

// --- Constantes y Funciones de Utilidad ---
const SENSOR_TYPES_AVAILABLE: SensorType[] = ['TEMPERATURE', 'PH', 'OXYGEN', 'LEVEL', 'FLOW'];
const SENSOR_THRESHOLDS: Partial<Record<SensorType, { low: number; high: number }>> = {
    TEMPERATURE: { low: 22, high: 28 }, PH: { low: 6.5, high: 7.5 }, OXYGEN: { low: 5, high: 9 },
};

const translateSensorType = (type: SensorType): string => {
    const names: Record<SensorType, string> = { TEMPERATURE: 'Temperatura', PH: 'pH', OXYGEN: 'Oxígeno', LEVEL: 'Nivel', FLOW: 'Flujo' };
    return names[type] || type;
};
const getSensorUnit = (type: SensorType): string => {
    const units: Record<SensorType, string> = { TEMPERATURE: '°C', OXYGEN: 'mg/L', PH: '', LEVEL: '%', FLOW: 'L/min' };
    return units[type] || '';
};
const getStatusChip = (status: Tank['status'] | Sensor['status']) => {
    const styles: Record<string, string> = { ACTIVE: 'bg-green-100 text-green-800', MAINTENANCE: 'bg-yellow-100 text-yellow-800', INACTIVE: 'bg-gray-100 text-gray-800', ERROR: 'bg-red-100 text-red-800' };
    const text: Record<string, string> = { ACTIVE: 'Activo', MAINTENANCE: 'Mantenimiento', INACTIVE: 'Inactivo', ERROR: 'Error' };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>{text[status]}</span>;
};
const getSensorIcon = (type: SensorType) => {
    const icons: Record<SensorType, React.ElementType> = { TEMPERATURE: Thermometer, PH: Droplets, OXYGEN: Wind, LEVEL: BarChartHorizontal, FLOW: Zap };
    return icons[type] || Settings;
};

/**
 * @component Sensors
 * @description Módulo unificado para la gestión de infraestructura (Tanques y Sensores).
 */
export const Sensors: React.FC = () => {
    const { user: currentUser } = useAuth();
    const isAdmin = currentUser?.role === 'ADMIN';
    const [sensors, setSensors] = useState<Sensor[]>([]);
    const [tanks, setTanks] = useState<Tank[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedTanks, setExpandedTanks] = useState<Set<string>>(new Set());
    const [modal, setModal] = useState<{ view: string | null; data?: any; }>({ view: null });
    
    // CORRECCIÓN: Inicializamos el estado del filtro de forma segura como null.
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

    // CORRECCIÓN: Usamos un efecto para establecer el valor inicial del filtro
    // solo cuando 'currentUser' esté disponible.
    useEffect(() => {
        if (currentUser) {
            setSelectedUserId(currentUser.id);
        }
    }, [currentUser]);

    useEffect(() => {
        if (isAdmin) {
            userService.getAllUsers().then(usersData => {
                if (currentUser && !usersData.find(u => u.id === currentUser.id)) setUsers([currentUser, ...usersData]);
                else setUsers(usersData);
            }).catch(console.error);
        }
    }, [isAdmin, currentUser]);
    
    const fetchData = useCallback(async () => {
        // No hacemos nada si el filtro de usuario aún no está listo.
        if (!selectedUserId) return;

        try {
            setLoading(true);
            setError(null);
            const [tanksData, sensorsData] = await Promise.all([
                tankService.getTanks(selectedUserId),
                sensorService.getSensors(selectedUserId),
            ]);
            setTanks(tanksData);
            setSensors(sensorsData);
            if (tanksData.length > 0 && expandedTanks.size === 0) setExpandedTanks(new Set([tanksData[0].id]));
            else if (tanksData.length === 0) setExpandedTanks(new Set());
        } catch (err: any) {
            setError(err.response?.data?.message || 'No se pudo conectar con el servidor.');
        } finally {
            setLoading(false);
        }
    }, [selectedUserId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    useEffect(() => {
        socketService.connect();
        const handleNewData = (data: SensorData) => {
            setSensors(prevSensors => 
                prevSensors.map(sensor => {
                    if (sensor.hardwareId === data.hardwareId) {
                        const previousReading = sensor.lastReading;
                        const newReading = data.value;
                        let trend: 'up' | 'down' | 'stable' = 'stable';
                        if (previousReading !== null && typeof previousReading !== 'undefined') {
                            if (newReading > previousReading) trend = 'up';
                            else if (newReading < previousReading) trend = 'down';
                        }
                        let readingStatus: 'Óptimo' | 'Bajo' | 'Alto' = 'Óptimo';
                        const thresholds = SENSOR_THRESHOLDS[sensor.type];
                        if (thresholds && typeof newReading === 'number') {
                            if (newReading < thresholds.low) readingStatus = 'Bajo';
                            else if (newReading > thresholds.high) readingStatus = 'Alto';
                        }
                        return { ...sensor, lastReading: newReading, trend, readingStatus, lastUpdate: new Date().toISOString() };
                    }
                    return sensor;
                })
            );
        };
        socketService.onSensorData(handleNewData);
        return () => {
            socketService.offSensorData(handleNewData);
            socketService.disconnect();
        };
    }, []);

    const sensorsByTank = useMemo(() => {
        const map = new Map<string, Sensor[]>();
        tanks.forEach(tank => map.set(tank.id, []));
        sensors.forEach(sensor => {
            if (map.has(sensor.tankId)) map.get(sensor.tankId)!.push(sensor);
        });
        return map;
    }, [sensors, tanks]);
    
    const stats = useMemo(() => ({
        totalTanks: tanks.length, activeTanks: tanks.filter(t => t.status === 'ACTIVE').length,
        totalSensors: sensors.length,
    }), [tanks, sensors]);

    const handleOpenModal = (view: string, data: any = {}) => setModal({ view, data });
    const handleCloseModal = () => setModal({ view: null, data: null });

    const handleDelete = async (type: 'tanque' | 'sensor', item: Tank | Sensor) => {
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
                await fetchData();
            } catch (error: any) {
                await Swal.fire('Error', error.response?.data?.message || `No se pudo eliminar el ${type}.`, 'error');
            }
        }
    };

    const toggleTankExpansion = (tankId: string) => {
        setExpandedTanks(prev => {
            const newSet = new Set(prev);
            newSet.has(tankId) ? newSet.delete(tankId) : newSet.add(tankId);
            return newSet;
        });
    };

    const getReadingStatusChip = (status?: 'Óptimo' | 'Bajo' | 'Alto') => {
        if (!status) return null;
        const styles = { 'Óptimo': 'bg-green-100 text-green-800', 'Bajo': 'bg-blue-100 text-blue-800', 'Alto': 'bg-red-100 text-red-800' };
        return <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>{status}</span>;
    };

    if (loading || !selectedUserId) return <LoadingSpinner fullScreen message="Cargando infraestructura..." />;
    if (error) return <div className="text-center text-red-500 p-4 bg-red-50 dark:bg-red-900/20 rounded-md flex items-center justify-center"><AlertCircle className="w-6 h-6 mr-2"/> {error}</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div><h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gestión de Infraestructura</h1><p className="text-gray-600 dark:text-gray-400 mt-1">Administra tanques y sensores IoT.</p></div>
                {selectedUserId === currentUser?.id && (<button onClick={() => handleOpenModal('create-tank')} className="bg-sena-green hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors shadow-md"><MapPin className="w-5 h-5" /><span>Nuevo Tanque</span></button>)}
            </div>
            {isAdmin && (<Card><div className="flex items-center space-x-2"><UserIcon className="w-5 h-5 text-gray-500" /><label className="font-medium">Viendo infraestructura de:</label><select value={selectedUserId || ''} onChange={(e) => setSelectedUserId(e.target.value)} className="form-select">{users.map(user => (<option key={user.id} value={user.id}>{user.id === currentUser!.id ? `${user.name} (Yo)` : user.name}</option>))}</select></div></Card>)}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-gradient-to-r from-sena-blue to-blue-600 text-white"><div className="flex items-center justify-between"><div><p className="text-blue-100">Tanques</p><p className="text-3xl font-bold">{stats.totalTanks}</p></div><MapPin className="w-12 h-12 text-blue-200" /></div></Card>
                <Card className="bg-gradient-to-r from-sena-green to-green-600 text-white"><div className="flex items-center justify-between"><div><p className="text-green-100">Tanques Activos</p><p className="text-3xl font-bold">{stats.activeTanks}</p></div><BarChartHorizontal className="w-12 h-12 text-green-200" /></div></Card>
                <Card className="bg-gradient-to-r from-sena-orange to-orange-600 text-white"><div className="flex items-center justify-between"><div><p className="text-orange-100">Sensores</p><p className="text-3xl font-bold">{stats.totalSensors}</p></div><Cpu className="w-12 h-12 text-orange-200" /></div></Card>
            </div>
            <div className="space-y-4">
                {tanks.length === 0 && !loading && (<div className="text-center py-16 text-gray-500 border-2 border-dashed rounded-lg"><MapPin className="w-12 h-12 mx-auto mb-4" /><h3 className="text-lg font-semibold">No hay tanques registrados</h3><p className="mt-1 text-sm">{isAdmin && selectedUserId !== currentUser?.id ? 'Este usuario no tiene tanques.' : 'Crea un nuevo tanque para empezar.'}</p></div>)}
                {tanks.map(tank => {
                    const tankSensors = sensorsByTank.get(tank.id) || [];
                    const isExpanded = expandedTanks.has(tank.id);
                    const canAddMoreSensors = tankSensors.length < SENSOR_TYPES_AVAILABLE.length;
                    const isOwnerView = selectedUserId === currentUser?.id;
                    return (<Card key={tank.id} className="p-0 overflow-hidden"><header className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 cursor-pointer" onClick={() => toggleTankExpansion(tank.id)}><div className="flex items-center space-x-4 min-w-0"><MapPin className="w-8 h-8 text-sena-blue flex-shrink-0" /><div><h3 className="font-semibold text-lg truncate">{tank.name}</h3><p className="text-sm text-gray-500 truncate">{tank.location}</p></div>{getStatusChip(tank.status)}</div><div className="flex items-center space-x-4 flex-shrink-0"><button onClick={(e) => { e.stopPropagation(); handleOpenModal('edit-tank', tank); }} disabled={!isOwnerView} className="p-1.5 text-blue-600 rounded-md disabled:text-gray-400 enabled:hover:bg-blue-100" title="Editar Tanque"><Edit className="w-4 h-4"/></button><button onClick={(e) => { e.stopPropagation(); handleDelete('tanque', tank); }} disabled={!isOwnerView} className="p-1.5 text-red-600 rounded-md disabled:text-gray-400 enabled:hover:bg-red-100" title="Eliminar Tanque"><Trash2 className="w-4 h-4"/></button><span className="text-sm text-gray-600 dark:text-gray-300 hidden md:inline">{tankSensors.length} Sensores</span><ChevronDown className={cn("w-5 h-5 text-gray-500 transition-transform", isExpanded && "rotate-180")} /></div></header>
                            {isExpanded && (<div className="p-4 border-t"><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{tankSensors.map(sensor => { const Icon = getSensorIcon(sensor.type); return (<div key={sensor.id} className="p-4 bg-white dark:bg-gray-900 rounded-lg border"><div><div className="flex items-start justify-between mb-2"><div className="flex items-center space-x-3"><Icon className="w-5 h-5 text-sena-green"/><h4 className="font-semibold">{sensor.name}</h4></div><span className="text-xs font-medium capitalize">{translateSensorType(sensor.type)}</span></div><div className="flex items-baseline justify-center text-center my-4"><span className="text-4xl font-bold">{sensor.lastReading?.toFixed(1) ?? '--'}</span><span className="text-lg text-gray-500 ml-1">{getSensorUnit(sensor.type)}</span></div><div className="flex items-center justify-center space-x-2 h-6">{getReadingStatusChip(sensor.readingStatus as any)}{sensor.trend === 'up' && <TrendingUp className="w-5 h-5 text-green-500" />}{sensor.trend === 'down' && <TrendingDown className="w-5 h-5 text-red-500" />}</div></div><div className="flex justify-center space-x-2 mt-4 pt-3 border-t"><button onClick={() => handleOpenModal('view-sensor', { sensor })} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md" title="Ver Detalles"><Eye className="w-4 h-4"/></button><button onClick={() => handleOpenModal('edit-sensor', { sensor })} disabled={!isOwnerView} className="p-1.5 text-blue-600 rounded-md disabled:text-gray-400 enabled:hover:bg-blue-100" title="Editar Sensor"><Edit className="w-4 h-4"/></button><button onClick={() => handleDelete('sensor', sensor)} disabled={!isOwnerView} className="p-1.5 text-red-600 rounded-md disabled:text-gray-400 enabled:hover:bg-red-100" title="Eliminar Sensor"><Trash2 className="w-4 h-4"/></button></div></div>);})}{canAddMoreSensors && isOwnerView && (<div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg border-2 border-dashed hover:border-sena-green"><button onClick={() => handleOpenModal('create-sensor', { tankId: tank.id })} className="text-sena-green flex flex-col items-center"><Plus className="w-8 h-8"/><span className="text-sm mt-1 font-medium">Añadir Sensor</span></button></div>)}</div></div>)}
                        </Card>
                    );
                })}
            </div>
            {(modal.view === 'create-tank' || modal.view === 'edit-tank') && <TankModal isOpen={true} isEditing={modal.view === 'edit-tank'} tank={modal.data} onClose={handleCloseModal} onSave={fetchData} />}
            {(modal.view === 'create-sensor' || modal.view === 'edit-sensor') && <SensorModal isOpen={true} isEditing={modal.view === 'edit-sensor'} sensor={modal.data?.sensor} tankId={modal.data?.tankId} tanks={tanks} sensorsByTank={sensorsByTank} onClose={handleCloseModal} onSave={fetchData} />}
            {modal.view === 'view-sensor' && <SensorDetailModal isOpen={true} sensor={modal.data.sensor} onClose={handleCloseModal} />}
        </div>
    );
};
const TankModal: React.FC<any> = ({ isOpen, isEditing, tank, onClose, onSave }) => {
    const { user } = useAuth();
    const [formData, setFormData] = useState({ name: tank?.name || '', location: tank?.location || '', status: tank?.status || 'ACTIVE', userId: tank?.userId || user!.id });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const action = isEditing ? () => tankService.updateTank(tank.id, formData) : () => tankService.createTank(formData);
            await action();
            onSave();
            onClose();
            await Swal.fire({ icon: 'success', title: `Tanque ${isEditing ? 'actualizado' : 'creado'}`, toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
        } catch (error: any) {
            await Swal.fire('Error', error.response?.data?.message || 'No se pudo guardar el tanque.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };
    return (<Modal size="md" title={isEditing ? "Editar Tanque" : "Nuevo Tanque"} isOpen={isOpen} onClose={onClose} footer={<><button type="button" onClick={onClose} className="btn-secondary">Cancelar</button><button type="submit" form="tank-form" disabled={isSubmitting} className="btn-primary w-36 h-10">{isSubmitting ? <LoadingSpinner size="sm" /> : <><Save className="w-4 h-4 mr-2" /><span>{isEditing ? 'Guardar' : 'Crear'}</span></>}</button></>}><form id="tank-form" onSubmit={handleSubmit} className="space-y-4"><div><label className="label">Nombre del Tanque*</label><input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="form-input" required /></div><div><label className="label">Ubicación*</label><input type="text" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} className="form-input" required /></div><div><label className="label">Estado</label><select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as any })} className="form-select"><option value="ACTIVE">Activo</option><option value="MAINTENANCE">Mantenimiento</option><option value="INACTIVE">Inactivo</option></select></div></form></Modal>);
};
const SensorModal: React.FC<any> = ({ isOpen, isEditing, sensor, tankId, tanks, sensorsByTank, onClose, onSave }) => {
    const [formData, setFormData] = useState({ name: sensor?.name || '', hardwareId: sensor?.hardwareId || '', type: sensor?.type || 'TEMPERATURE', tankId: sensor?.tankId || tankId || '', calibrationDate: sensor ? format(parseISO(sensor.calibrationDate), 'yyyy-MM-dd') : new Date().toISOString().split('T')[0] });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const action = isEditing ? () => sensorService.updateSensor(sensor.id, formData) : () => sensorService.createSensor(formData);
            await action();
            onSave();
            onClose();
            await Swal.fire({ icon: 'success', title: `Sensor ${isEditing ? 'actualizado' : 'creado'}`, toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
        } catch (error: any) {
            await Swal.fire('Error', error.response?.data?.message || 'No se pudo guardar el sensor.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };
    return (<Modal size="lg" title={isEditing ? "Editar Sensor" : "Nuevo Sensor"} isOpen={isOpen} onClose={onClose} footer={<><button type="button" onClick={onClose} className="btn-secondary">Cancelar</button><button type="submit" form="sensor-form" disabled={isSubmitting} className="btn-primary w-36 h-10">{isSubmitting ? <LoadingSpinner size="sm" /> : <><Save className="w-4 h-4 mr-2" /><span>{isEditing ? 'Guardar' : 'Crear'}</span></>}</button></>}><SensorForm formData={formData} setFormData={setFormData} isEditing={isEditing} tanks={tanks} sensorsByTank={sensorsByTank} /></Modal>);
};
const SensorDetailModal: React.FC<any> = ({ isOpen, sensor, onClose }) => {
    return (<Modal size="md" title="Detalles del Sensor" isOpen={isOpen} onClose={onClose}><div className="space-y-4"><div className="flex justify-between"><strong>Nombre:</strong> <span>{sensor.name}</span></div><div className="flex justify-between"><strong>Tipo:</strong> <span>{translateSensorType(sensor.type)}</span></div><div className="flex justify-between"><strong>Estado:</strong> {getStatusChip(sensor.status)}</div><div className="flex justify-between"><strong>Hardware ID:</strong> <span className="font-mono text-sm p-1 bg-gray-100 rounded">{sensor.hardwareId}</span></div><div className="flex justify-between"><strong>Última Lectura:</strong> <span>{sensor.lastReading?.toFixed(2) ?? 'N/A'} {getSensorUnit(sensor.type)}</span></div><div className="flex justify-between"><strong>Fecha de Calibración:</strong> <span>{format(parseISO(sensor.calibrationDate), 'dd/MM/yyyy')}</span></div><div className="flex justify-between"><strong>Última Actualización:</strong> <span>{sensor.lastUpdate ? format(parseISO(sensor.lastUpdate), 'dd/MM/yyyy HH:mm') : 'N/A'}</span></div></div></Modal>);
};
const SensorForm: React.FC<any> = ({ formData, setFormData, isEditing, tanks, sensorsByTank }) => {
    const availableSensorTypesForNew = useMemo(() => {
        if (!formData.tankId || isEditing) return SENSOR_TYPES_AVAILABLE;
        const usedTypes = (sensorsByTank.get(formData.tankId) || []).map((s: Sensor) => s.type);
        return SENSOR_TYPES_AVAILABLE.filter(type => !usedTypes.includes(type));
    }, [formData.tankId, isEditing, sensorsByTank]);
    useEffect(() => {
        if (!isEditing && availableSensorTypesForNew.length > 0 && formData.type !== availableSensorTypesForNew[0]) {
            setFormData((d: any) => ({ ...d, type: availableSensorTypesForNew[0] }));
        }
    }, [isEditing, availableSensorTypesForNew, formData.type, setFormData]);
    const today = new Date().toISOString().split('T')[0];
    return (<form id="sensor-form" className="space-y-4"><div><label className="label">Nombre del Sensor*</label><input type="text" value={formData.name} onChange={e => setFormData((d: any) => ({ ...d, name: e.target.value }))} className="form-input" required /></div><div><label className="label">ID de Hardware* <span className="text-xs text-gray-400">(Identificador físico)</span></label><input type="text" value={formData.hardwareId} onChange={e => setFormData((d: any) => ({ ...d, hardwareId: e.target.value }))} className="form-input" required disabled={isEditing} /></div><div className="grid grid-cols-2 gap-4"><div><label className="label">Tipo de Sensor*</label><select value={formData.type} onChange={e => setFormData((d: any) => ({ ...d, type: e.target.value as any }))} className="form-select" required disabled={isEditing}>{isEditing ? <option value={formData.type}>{translateSensorType(formData.type)}</option> : (availableSensorTypesForNew.length > 0 ? availableSensorTypesForNew.map(type => <option key={type} value={type}>{translateSensorType(type)}</option>) : <option disabled>No hay tipos disponibles</option>)}</select></div><div><label className="label">Asignar a Tanque*</label><select value={formData.tankId} onChange={e => setFormData((d: any) => ({ ...d, tankId: e.target.value }))} className="form-select" required disabled={!isEditing && !!formData.tankId}>{tanks.map((t: Tank) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div></div><div><label className="label">Fecha de Calibración*</label><input type="date" value={formData.calibrationDate} onChange={e => setFormData((d: any) => ({ ...d, calibrationDate: e.target.value }))} className="form-input" required max={today} /></div></form>);
};