import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
    Thermometer, Droplets, Wind, Plus, Edit, Trash2, Settings, MapPin,
    Wifi, WifiOff, ChevronDown, Cpu, AlertCircle, Save, BarChartHorizontal,
    TrendingUp, TrendingDown, Eye
} from 'lucide-react';
import { Card } from '../common/Card';
import { Modal } from '../common/Modal';
import { LoadingSpinner } from '../common/LoadingSpinner';
import Swal from 'sweetalert2';
import { cn } from '../../utils/cn';
import * as tankService from '../../services/tankService';
import * as sensorService from '../../services/sensorService';
import { Tank, Sensor } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const SENSOR_TYPES_AVAILABLE: Sensor['type'][] = ['TEMPERATURE', 'PH', 'OXYGEN'];

// --- FUNCIONES DE UTILIDAD (A NIVEL DE MÓDULO PARA SER ACCESIBLES GLOBALMENTE) ---

/**
 * @desc Traduce el tipo de sensor a un formato legible en español.
 * @param {Sensor['type']} type - El tipo de sensor desde la API.
 * @returns {string} El nombre del sensor en español.
 */
const translateSensorType = (type: Sensor['type']): string => {
    const names: Record<string, string> = {
        TEMPERATURE: 'Temperatura',
        PH: 'pH',
        OXYGEN: 'Oxígeno'
    };
    return names[type] || type.toLowerCase();
};

/**
 * @desc Obtiene la unidad de medida para un tipo de sensor.
 * @param {Sensor['type']} type - El tipo de sensor.
 * @returns {string} La unidad de medida.
 */
const getSensorUnit = (type: Sensor['type']): string => {
    const units: Record<string, string> = {
        TEMPERATURE: '°C',
        OXYGEN: 'mg/L',
        PH: ''
    };
    return units[type] || '';
};

/**
 * @desc Obtiene el estilo y texto para el chip de estado.
 * @param {Tank['status'] | Sensor['status']} status - El estado del item.
 * @returns {JSX.Element} Un chip de estado con el color y texto correctos.
 */
const getStatusChip = (status: Tank['status'] | Sensor['status']) => {
    const styles: Record<string, string> = {
      ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      MAINTENANCE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      INACTIVE: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      ERROR: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    };
    const text: Record<string, string> = { ACTIVE: 'Activo', MAINTENANCE: 'Mantenimiento', INACTIVE: 'Inactivo', ERROR: 'Error' };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>{text[status]}</span>;
};

/**
 * @component Sensors
 * @description Módulo de gestión de infraestructura para tanques y sensores.
 * @returns {JSX.Element} El componente de la interfaz de usuario.
 */
export const Sensors: React.FC = () => {
    const { user } = useAuth();
    const [sensors, setSensors] = useState<Sensor[]>([]);
    const [tanks, setTanks] = useState<Tank[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedTanks, setExpandedTanks] = useState<Set<string>>(new Set());
    
    // Un solo estado para manejar todos los modales, simplificando la lógica
    const [modal, setModal] = useState<{
        view: 'view-sensor' | 'edit-tank' | 'create-tank' | 'edit-sensor' | 'create-sensor' | null;
        data?: any;
    }>({ view: null, data: null });

    const fetchData = useCallback(async () => {
        try {
            if (!loading) setLoading(true);
            setError(null);
            
            const [tanksData, sensorsData] = await Promise.all([
                tankService.getTanks(),
                sensorService.getSensors(),
            ]);
            setTanks(tanksData);
            setSensors(sensorsData);

            if (tanksData.length > 0 && expandedTanks.size === 0) {
                setExpandedTanks(new Set([tanksData[0].id]));
            }
        } catch (err: any) {
            setError(err.response?.data?.error?.message || 'No se pudo conectar con el servidor.');
        } finally {
            setLoading(false);
        }
    }, [loading]); // Dependencia `loading` para permitir recarga manual

    useEffect(() => { fetchData(); }, []); // Solo se ejecuta una vez al montar

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

    const stats = useMemo(() => {
        // CORRECCIÓN: Filtrar los sensores para que coincidan solo con los tanques del usuario.
        const tankIds = new Set(tanks.map(t => t.id));
        const userSensors = sensors.filter(s => tankIds.has(s.tankId));
        return {
            totalTanks: tanks.length,
            activeTanks: tanks.filter(t => t.status === 'ACTIVE').length,
            totalSensors: userSensors.length,
        };
    }, [tanks, sensors]);

    const handleOpenModal = (view: 'create-tank' | 'edit-tank' | 'create-sensor' | 'edit-sensor' | 'view-sensor', data: any = {}) => {
        setModal({ view, data });
    };

    const handleCloseModal = () => {
        setModal({ view: null, data: null });
    };

    const handleDelete = async (type: 'tanque' | 'sensor', item: Tank | Sensor) => {
        if (type === 'tanque' && (sensorsByTank.get(item.id) || []).length > 0) {
            await Swal.fire('Acción no permitida', 'Debes eliminar los sensores de este tanque antes de poder eliminarlo.', 'warning');
            return;
        }
        const result = await Swal.fire({
            title: `¿Eliminar ${type} "${item.name}"?`, text: "Esta acción es irreversible.", icon: 'warning',
            showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#6B7280',
            confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            const action = type === 'tanque' ? () => tankService.deleteTank(item.id) : () => sensorService.deleteSensor(item.id);
            try {
                await action();
                await Swal.fire({ icon: 'success', title: '¡Eliminado!', text: `El ${type} ha sido eliminado.`, timer: 2000, showConfirmButton: false, toast: true, position: 'top-end' });
                await fetchData();
            } catch (error: any) {
                await Swal.fire('Error', error.response?.data?.error?.message || `No se pudo eliminar el ${type}.`, 'error');
            }
        }
    };

    const getSensorIcon = (type: Sensor['type']) => {
        const icons: Record<string, React.ElementType> = { TEMPERATURE: Thermometer, PH: Droplets, OXYGEN: Wind };
        return icons[type] || Settings;
    };

    const toggleTankExpansion = (tankId: string) => {
        setExpandedTanks(prev => {
            const newSet = new Set(prev);
            newSet.has(tankId) ? newSet.delete(tankId) : newSet.add(tankId);
            return newSet;
        });
    };

    if (loading) return <LoadingSpinner fullScreen message="Cargando infraestructura..." />;
    if (error) return <div className="text-center text-red-500 p-4 bg-red-50 dark:bg-red-900/20 rounded-md flex items-center justify-center"><AlertCircle className="w-6 h-6 mr-2"/> {error}</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gestión de Infraestructura</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Administra tus tanques y los sensores IoT asociados.</p>
                </div>
                <button onClick={() => handleOpenModal('create-tank')} className="bg-sena-green hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors shadow-md">
                    <MapPin className="w-5 h-5" />
                    <span>Nuevo Tanque</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-gradient-to-r from-sena-blue to-blue-600 text-white"><div className="flex items-center justify-between"><div><p className="text-blue-100">Mis Tanques</p><p className="text-3xl font-bold">{stats.totalTanks}</p></div><MapPin className="w-12 h-12 text-blue-200" /></div></Card>
                <Card className="bg-gradient-to-r from-sena-green to-green-600 text-white"><div className="flex items-center justify-between"><div><p className="text-green-100">Tanques Activos</p><p className="text-3xl font-bold">{stats.activeTanks}</p></div><BarChartHorizontal className="w-12 h-12 text-green-200" /></div></Card>
                <Card className="bg-gradient-to-r from-sena-orange to-orange-600 text-white"><div className="flex items-center justify-between"><div><p className="text-orange-100">Mis Sensores</p><p className="text-3xl font-bold">{stats.totalSensors}</p></div><Cpu className="w-12 h-12 text-orange-200" /></div></Card>
            </div>
            
            <div className="space-y-4">
                {tanks.length === 0 && !loading && (
                    <div className="text-center py-16 text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                        <MapPin className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                        <h3 className="text-lg font-semibold">No tienes tanques registrados</h3>
                        <p className="mt-1 text-sm">Crea un nuevo tanque para empezar a añadir sensores.</p>
                    </div>
                )}
                {tanks.map(tank => {
                    const tankSensors = sensorsByTank.get(tank.id) || [];
                    const isExpanded = expandedTanks.has(tank.id);
                    const canAddMoreSensors = tankSensors.length < SENSOR_TYPES_AVAILABLE.length;

                    return (
                        <Card key={tank.id} className="p-0 overflow-hidden transition-all duration-300">
                             <header className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 cursor-pointer" onClick={() => toggleTankExpansion(tank.id)}>
                                <div className="flex items-center space-x-4 min-w-0">
                                    <MapPin className="w-8 h-8 md:w-6 md:h-6 text-sena-blue flex-shrink-0" />
                                    <div className="min-w-0">
                                        <h3 className="font-semibold text-lg text-gray-900 dark:text-white truncate">{tank.name}</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{tank.location}</p>
                                    </div>
                                    {getStatusChip(tank.status)}
                                </div>
                                <div className="flex items-center space-x-2 md:space-x-4 flex-shrink-0">
                                    <button onClick={(e) => { e.stopPropagation(); handleOpenModal('edit-tank', tank); }} className="p-1.5 text-blue-600 hover:bg-blue-100 dark:hover:bg-gray-700 rounded-md" title="Editar Tanque"><Edit className="w-4 h-4"/></button>
                                    <button onClick={(e) => { e.stopPropagation(); handleDelete('tanque', tank); }} className="p-1.5 text-red-600 hover:bg-red-100 dark:hover:bg-gray-700 rounded-md" title="Eliminar Tanque"><Trash2 className="w-4 h-4"/></button>
                                    <span className="text-sm text-gray-600 dark:text-gray-300 hidden md:inline">{tankSensors.length} Sensores</span>
                                    <ChevronDown className={cn("w-5 h-5 text-gray-500 transition-transform", isExpanded && "transform rotate-180")} />
                                </div>
                            </header>
                            {isExpanded && (
                                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {tankSensors.map(sensor => {
                                            const Icon = getSensorIcon(sensor.type);
                                            const trend = (sensor as any).trend;

                                            return (
                                                <div key={sensor.id} className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col justify-between">
                                                    <div>
                                                        <div className="flex items-start justify-between mb-3">
                                                            <div className="flex items-center space-x-3"><Icon className="w-5 h-5 text-sena-green"/><h4 className="font-semibold text-gray-800 dark:text-white">{sensor.name}</h4></div>
                                                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 capitalize">{translateSensorType(sensor.type)}</span>
                                                        </div>
                                                        <div className="flex items-baseline justify-center text-center my-4">
                                                            <span className="text-4xl font-bold text-gray-900 dark:text-white">{sensor.lastReading?.toFixed(2) ?? '--'}</span>
                                                            <span className="text-lg text-gray-500 dark:text-gray-400 ml-1">{getSensorUnit(sensor.type)}</span>
                                                            {trend === 'up' && <TrendingUp className="w-5 h-5 text-green-500 ml-2" />}
                                                            {trend === 'down' && <TrendingDown className="w-5 h-5 text-red-500 ml-2" />}
                                                        </div>
                                                    </div>
                                                    <div className="flex justify-center space-x-2 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/50">
                                                        <button onClick={() => handleOpenModal('view-sensor', { sensor })} className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md" title="Ver Detalles"><Eye className="w-4 h-4"/></button>
                                                        <button onClick={() => handleOpenModal('edit-sensor', { sensor })} className="p-1.5 text-blue-600 hover:bg-blue-100 dark:hover:bg-gray-700 rounded-md" title="Editar Sensor"><Edit className="w-4 h-4"/></button>
                                                        <button onClick={() => handleDelete('sensor', sensor)} className="p-1.5 text-red-600 hover:bg-red-100 dark:hover:bg-gray-700 rounded-md" title="Eliminar Sensor"><Trash2 className="w-4 h-4"/></button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {canAddMoreSensors && (
                                            <div className="flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-sena-green hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">
                                                <button onClick={() => handleOpenModal('create-sensor', { tankId: tank.id })} className="text-sena-green flex flex-col items-center">
                                                    <Plus className="w-8 h-8"/><span className="text-sm mt-1 font-medium">Añadir Sensor</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </Card>
                    );
                })}
            </div>

            {/* Modales */}
            {(modal.view === 'create-tank' || modal.view === 'edit-tank') && (
                <TankModal
                    isOpen={true}
                    isEditing={modal.view === 'edit-tank'}
                    tank={modal.data}
                    onClose={handleCloseModal}
                    onSave={fetchData}
                />
            )}
            
            {(modal.view === 'create-sensor' || modal.view === 'edit-sensor') && (
                 <SensorModal
                    isOpen={true}
                    isEditing={modal.view === 'edit-sensor'}
                    sensor={modal.data?.sensor}
                    tankId={modal.data?.tankId}
                    tanks={tanks}
                    sensorsByTank={sensorsByTank}
                    onClose={handleCloseModal}
                    onSave={fetchData}
                 />
            )}

            {modal.view === 'view-sensor' && (
                <SensorDetailModal
                    isOpen={true}
                    sensor={modal.data.sensor}
                    onClose={handleCloseModal}
                />
            )}
        </div>
    );
};

// --- SUBCOMPONENTES DE MODALES ---

/**
 * @component TankModal
 * @description Modal para crear o editar un tanque.
 */
const TankModal = ({ isOpen, isEditing, tank, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        name: tank?.name || '',
        location: tank?.location || '',
        status: tank?.status || 'ACTIVE'
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const action = isEditing
                ? () => tankService.updateTank(tank.id, formData)
                : () => tankService.createTank(formData as any);
            await action();
            onSave();
            onClose();
            await Swal.fire({ icon: 'success', title: `Tanque ${isEditing ? 'actualizado' : 'creado'}`, toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
        } catch (error: any) {
            await Swal.fire('Error', error.response?.data?.error?.message || 'No se pudo guardar el tanque.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal size="md" title={isEditing ? "Editar Tanque" : "Nuevo Tanque"} isOpen={isOpen} onClose={onClose} footer={<>
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">Cancelar</button>
            <button type="submit" form="tank-form" disabled={isSubmitting} className="w-36 h-10 bg-sena-green hover:bg-green-700 text-white font-semibold rounded-lg flex items-center justify-center transition-colors disabled:opacity-50">
                {isSubmitting ? <LoadingSpinner size="sm" /> : <><Save className="w-4 h-4 mr-2" /><span>{isEditing ? 'Guardar' : 'Crear'}</span></>}
            </button>
        </>}>
            <form id="tank-form" onSubmit={handleSubmit} className="space-y-4">
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre del Tanque*</label><input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="form-input" required /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ubicación*</label><input type="text" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} className="form-input" required /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Estado</label><select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as any })} className="form-select"><option value="ACTIVE">Activo</option><option value="MAINTENANCE">Mantenimiento</option><option value="INACTIVE">Inactivo</option></select></div>
            </form>
        </Modal>
    );
};

/**
 * @component SensorModal
 * @description Modal para crear o editar un sensor.
 */
const SensorModal = ({ isOpen, isEditing, sensor, tankId, tanks, sensorsByTank, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        name: sensor?.name || '',
        hardwareId: sensor?.hardwareId || '',
        type: sensor?.type || 'TEMPERATURE',
        tankId: sensor?.tankId || tankId || '',
        calibrationDate: sensor ? format(parseISO(sensor.calibrationDate), 'yyyy-MM-dd') : new Date().toISOString().split('T')[0],
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const action = isEditing
                ? () => sensorService.updateSensor(sensor.id, formData)
                : () => sensorService.createSensor(formData);
            await action();
            onSave();
            onClose();
            await Swal.fire({ icon: 'success', title: `Sensor ${isEditing ? 'actualizado' : 'creado'}`, toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
        } catch (error: any) {
            await Swal.fire('Error', error.response?.data?.error?.message || 'No se pudo guardar el sensor.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <Modal size="lg" title={isEditing ? "Editar Sensor" : "Nuevo Sensor"} isOpen={isOpen} onClose={onClose} footer={<>
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">Cancelar</button>
            <button type="submit" form="sensor-form" disabled={isSubmitting} className="w-36 h-10 bg-sena-green text-white font-semibold rounded-lg flex items-center justify-center disabled:opacity-50">
                {isSubmitting ? <LoadingSpinner size="sm" /> : <><Save className="w-4 h-4 mr-2" /><span>{isEditing ? 'Guardar' : 'Crear'}</span></>}
            </button>
        </>}>
            <SensorForm
                formData={formData}
                setFormData={setFormData}
                isEditing={isEditing}
                tanks={tanks}
                sensorsByTank={sensorsByTank}
                onSubmit={handleSubmit}
            />
        </Modal>
    );
};

/**
 * @component SensorDetailModal
 * @description Modal para ver los detalles completos de un sensor.
 */
const SensorDetailModal = ({ isOpen, sensor, onClose }) => {
    return (
        <Modal size="md" title="Detalles del Sensor" isOpen={isOpen} onClose={onClose}>
            <div className="space-y-4">
                <div className="flex justify-between items-center"><span className="font-medium text-gray-600 dark:text-gray-400">Nombre:</span><span className="text-gray-900 dark:text-white">{sensor.name}</span></div>
                <div className="flex justify-between items-center"><span className="font-medium text-gray-600 dark:text-gray-400">Tipo:</span><span className="text-gray-900 dark:text-white capitalize">{translateSensorType(sensor.type)}</span></div>
                <div className="flex justify-between items-center"><span className="font-medium text-gray-600 dark:text-gray-400">Estado:</span>{getStatusChip(sensor.status)}</div>
                <div className="flex justify-between items-center"><span className="font-medium text-gray-600 dark:text-gray-400">Hardware ID:</span><span className="font-mono text-sm p-1 bg-gray-100 dark:bg-gray-700 rounded">{sensor.hardwareId}</span></div>
                <div className="flex justify-between items-center"><span className="font-medium text-gray-600 dark:text-gray-400">Última Lectura:</span><span className="text-gray-900 dark:text-white">{sensor.lastReading?.toFixed(2) ?? 'N/A'} {getSensorUnit(sensor.type)}</span></div>
                <div className="flex justify-between items-center"><span className="font-medium text-gray-600 dark:text-gray-400">Fecha de Calibración:</span><span className="text-gray-900 dark:text-white">{format(parseISO(sensor.calibrationDate), 'dd/MM/yyyy')}</span></div>
                <div className="flex justify-between items-center"><span className="font-medium text-gray-600 dark:text-gray-400">Última Actualización:</span><span className="text-gray-900 dark:text-white">{sensor.lastUpdate ? format(parseISO(sensor.lastUpdate), 'dd/MM/yyyy HH:mm') : 'N/A'}</span></div>
            </div>
        </Modal>
    );
};

/**
 * @component SensorForm
 * @description Formulario reutilizable para la creación y edición de sensores.
 */
const SensorForm: React.FC<any> = ({ formData, setFormData, isEditing, tanks, sensorsByTank, onSubmit }) => {
    
    const availableSensorTypesForNew = useMemo(() => {
        if (!formData.tankId || isEditing) return SENSOR_TYPES_AVAILABLE;
        const usedTypes = (sensorsByTank.get(formData.tankId) || []).map(s => s.type);
        return SENSOR_TYPES_AVAILABLE.filter(type => !usedTypes.includes(type));
    }, [formData.tankId, isEditing, sensorsByTank]);

    const validDestinationTanks = useMemo(() => {
        if (!isEditing) return tanks.filter(tank => tank.id === formData.tankId);
        return tanks.filter(tank => {
            if (tank.id === formData.tankId) return true;
            const usedTypesInDest = (sensorsByTank.get(tank.id) || []).map(s => s.type);
            return !usedTypesInDest.includes(formData.type);
        });
    }, [isEditing, formData.type, formData.tankId, tanks, sensorsByTank]);
    
    useEffect(() => {
        if (!isEditing && availableSensorTypesForNew.length > 0 && formData.type !== availableSensorTypesForNew[0]) {
            setFormData(d => ({ ...d, type: availableSensorTypesForNew[0] }));
        }
    }, [isEditing, availableSensorTypesForNew, formData.type, setFormData]);

    const today = new Date().toISOString().split('T')[0];

    return (
        <form id="sensor-form" onSubmit={onSubmit} className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre del Sensor*</label><input type="text" value={formData.name} onChange={e => setFormData(d => ({ ...d, name: e.target.value }))} className="form-input" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ID de Hardware* <span className="text-xs text-gray-400">(Identificador del dispositivo físico)</span></label><input type="text" value={formData.hardwareId} onChange={e => setFormData(d => ({ ...d, hardwareId: e.target.value }))} className="form-input" required disabled={isEditing} /></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de Sensor*</label>
                    <select value={formData.type} onChange={e => setFormData(d => ({ ...d, type: e.target.value as any }))} className="form-select" required disabled={isEditing}>
                        {isEditing ? <option value={formData.type}>{translateSensorType(formData.type)}</option> : (
                            availableSensorTypesForNew.length > 0 
                                ? availableSensorTypesForNew.map(type => <option key={type} value={type}>{translateSensorType(type)}</option>) 
                                : <option value="" disabled>No hay tipos disponibles</option>
                        )}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Asignar a Tanque*</label>
                    <select value={formData.tankId} onChange={e => setFormData(d => ({ ...d, tankId: e.target.value }))} className="form-select" required disabled={!isEditing && !!formData.tankId}>
                         {isEditing ? (
                            validDestinationTanks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)
                         ) : (
                            <option value={formData.tankId}>{(tanks.find(t => t.id === formData.tankId))?.name || 'Seleccione...'}</option>
                         )}
                    </select>
                </div>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha de Calibración*</label><input type="date" value={formData.calibrationDate} onChange={e => setFormData(d => ({ ...d, calibrationDate: e.target.value }))} className="form-input" required max={today} /></div>
        </form>
    );
};