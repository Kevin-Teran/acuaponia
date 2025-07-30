import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Thermometer, Droplets, Wind, Plus, Edit, Trash2, Settings, MapPin, Wifi, WifiOff, ChevronDown, Cpu, Loader, AlertCircle, Save, Hash } from 'lucide-react';
import { Card } from '../common/Card';
import { Modal } from '../common/Modal';
import Swal from 'sweetalert2';
import { cn } from '../../utils/cn';
import * as tankService from '../../services/tankService';
import * as sensorService from '../../services/sensorService';
import { Tank, Sensor } from '../../types';
import { format } from 'date-fns';

const SENSOR_TYPES: Sensor['type'][] = ['TEMPERATURE', 'PH', 'OXYGEN'];

/**
 * @component Sensors
 * @desc Módulo para la gestión integral de tanques y sensores. Permite a los administradores
 * crear, ver, actualizar y eliminar tanques, así como los sensores asociados a ellos,
 * utilizando un ID de hardware físico para la vinculación.
 */
export const Sensors: React.FC = () => {
  // --- Estados del Componente ---
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedTanks, setExpandedTanks] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Estados para Modales y Formularios ---
  const [showTankModal, setShowTankModal] = useState(false);
  const [editingTank, setEditingTank] = useState<Tank | null>(null);
  const [tankFormData, setTankFormData] = useState({ name: '', location: '', status: 'ACTIVE' as Tank['status'] });

  const [showSensorModal, setShowSensorModal] = useState(false);
  const [editingSensor, setEditingSensor] = useState<Sensor | null>(null);
  const [sensorFormData, setSensorFormData] = useState({
    name: '',
    hardwareId: '', // <-- CAMBIO: Añadido para el ID físico
    type: 'TEMPERATURE' as Sensor['type'],
    tankId: '',
    calibrationDate: new Date().toISOString().split('T')[0],
    status: 'ACTIVE' as Sensor['status'],
  });
  const [availableSensorTypes, setAvailableSensorTypes] = useState<Sensor['type'][]>(SENSOR_TYPES);

  // --- Carga y Sincronización de Datos ---
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [tanksData, sensorsData] = await Promise.all([
        tankService.getTanks(),
        sensorService.getSensors(),
      ]);
      setTanks(tanksData);
      setSensors(sensorsData);
      if (tanksData.length > 0 && expandedTanks.size === 0) {
        setExpandedTanks(new Set([tanksData[0].id]));
      }
      setError(null);
    } catch (err) {
      setError('No se pudo conectar con el servidor. Por favor, verifica que esté funcionando y recarga la página.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [expandedTanks.size]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  // --- Manejadores de Modales ---
  const handleOpenTankModal = (tank?: Tank) => {
    if (tank) {
      setEditingTank(tank);
      setTankFormData({ name: tank.name, location: tank.location, status: tank.status });
    } else {
      setEditingTank(null);
      setTankFormData({ name: '', location: '', status: 'ACTIVE' });
    }
    setShowTankModal(true);
  };

  const handleOpenSensorModal = (sensor?: Sensor, tankId?: string) => {
    const targetTankId = sensor?.tankId || tankId || (tanks[0]?.id ?? '');
    const existingTypes = (sensorsByTank.get(targetTankId) || []).map(s => s.type);
    const availableTypes = SENSOR_TYPES.filter(type => !existingTypes.includes(type));
    setAvailableSensorTypes(availableTypes);

    if (sensor) {
        setEditingSensor(sensor);
        setSensorFormData({ 
            name: sensor.name, 
            hardwareId: sensor.hardwareId, // <-- CAMBIO: Poblar hardwareId
            type: sensor.type, 
            tankId: sensor.tankId, 
            calibrationDate: format(new Date(sensor.calibrationDate), 'yyyy-MM-dd'), 
            status: sensor.status 
        });
    } else {
        setEditingSensor(null);
        setSensorFormData({ 
            name: '', 
            hardwareId: '', // <-- CAMBIO: Inicializar hardwareId
            type: availableTypes[0] || 'TEMPERATURE', 
            tankId: targetTankId, 
            calibrationDate: new Date().toISOString().split('T')[0], 
            status: 'ACTIVE' 
        });
    }
    setShowSensorModal(true);
  };

  const handleCloseModals = () => {
    setShowTankModal(false);
    setShowSensorModal(false);
  };

  // --- Lógica de Negocio (CRUD) ---
  const handleTankSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
        // CORRECCIÓN: Se eliminan capacity y currentLevel del objeto enviado
        const data = { ...tankFormData };
        if (editingTank) {
            await tankService.updateTank(editingTank.id, data);
        } else {
            await tankService.createTank(data as any);
        }
        Swal.fire('¡Éxito!', `Tanque ${editingTank ? 'actualizado' : 'creado'} correctamente.`, 'success');
        handleCloseModals();
        fetchData();
    } catch (error) {
        const err = error as any;
        Swal.fire('Error', err.response?.data?.error?.message || 'No se pudo guardar el tanque.', 'error');
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleSensorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
        if (editingSensor) {
            await sensorService.updateSensor(editingSensor.id, sensorFormData);
        } else {
            await sensorService.createSensor(sensorFormData);
        }
        Swal.fire('¡Éxito!', `Sensor ${editingSensor ? 'actualizado' : 'creado'} correctamente.`, 'success');
        handleCloseModals();
        fetchData();
    } catch (error) {
        const err = error as any;
        Swal.fire('Error', err.response?.data?.error?.message || 'No se pudo guardar el sensor.', 'error');
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const handleDeleteTank = (tank: Tank) => {
    const tankSensors = sensorsByTank.get(tank.id) || [];
    if (tankSensors.length > 0) {
        Swal.fire('Acción no permitida', 'Debes eliminar o reasignar los sensores de este tanque antes de poder eliminarlo.', 'warning');
        return;
    }
    Swal.fire({
      title: `¿Eliminar el tanque "${tank.name}"?`,
      text: "Esta acción no se puede deshacer.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await tankService.deleteTank(tank.id);
          Swal.fire('¡Eliminado!', 'El tanque ha sido eliminado.', 'success');
          fetchData();
        } catch (error) {
          Swal.fire('Error', 'No se pudo eliminar el tanque.', 'error');
        }
      }
    });
  };

  const handleDeleteSensor = (sensor: Sensor) => {
    Swal.fire({
      title: `¿Eliminar el sensor "${sensor.name}"?`,
      text: "Esta acción no se puede deshacer.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await sensorService.deleteSensor(sensor.id);
          Swal.fire('¡Eliminado!', 'El sensor ha sido eliminado.', 'success');
          fetchData();
        } catch (error) {
          Swal.fire('Error', 'No se pudo eliminar el sensor.', 'error');
        }
      }
    });
  };

  // --- Funciones de Utilidad ---
  const getSensorIcon = (type: Sensor['type']) => {
    const icons = { TEMPERATURE: Thermometer, PH: Droplets, OXYGEN: Wind, LEVEL: Droplets, FLOW: Wind };
    return icons[type] || Settings;
  };
  
  const getStatusChip = (status: Tank['status'] | Sensor['status']) => {
    const styles = {
      ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      MAINTENANCE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      INACTIVE: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      ERROR: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    };
    const text = { ACTIVE: 'Activo', MAINTENANCE: 'Mantenimiento', INACTIVE: 'Inactivo', ERROR: 'Error' };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>{text[status]}</span>;
  };

  const toggleTankExpansion = (tankId: string) => {
    setExpandedTanks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tankId)) newSet.delete(tankId);
      else newSet.add(tankId);
      return newSet;
    });
  };

  const availableTanksForSensor = (sensor: Sensor) => {
    return tanks.filter(tank => {
        if (tank.id === sensor.tankId) return true;
        const existingTypes = (sensorsByTank.get(tank.id) || []).map(s => s.type);
        return !existingTypes.includes(sensor.type);
    });
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader className="w-12 h-12 animate-spin text-sena-green" /></div>;
  }

  if (error) {
    return <div className="text-center text-red-500 p-4 bg-red-50 dark:bg-red-900/20 rounded-md flex items-center justify-center"><AlertCircle className="w-6 h-6 mr-2"/> {error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gestión de Infraestructura</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Administra los tanques y los sensores IoT asociados.</p>
        </div>
        <div className="flex items-center space-x-3">
            <button onClick={() => handleOpenTankModal()} className="bg-sena-blue hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors shadow-md"><MapPin className="w-5 h-5" /><span>Nuevo Tanque</span></button>
        </div>
      </div>

      <div className="space-y-6">
        {tanks.map(tank => {
            const tankSensors = sensorsByTank.get(tank.id) || [];
            const isExpanded = expandedTanks.has(tank.id);
            const existingSensorTypes = tankSensors.map(s => s.type);
            const availableTypesForNewSensor = SENSOR_TYPES.filter(type => !existingSensorTypes.includes(type));

            return (
                <Card key={tank.id} className="p-0 overflow-hidden">
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 cursor-pointer" onClick={() => toggleTankExpansion(tank.id)}>
                        <div className="flex items-center space-x-4">
                            <MapPin className="w-6 h-6 text-sena-blue" />
                            <div>
                                <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{tank.name}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{tank.location}</p>
                            </div>
                            {getStatusChip(tank.status)}
                        </div>
                        <div className="flex items-center space-x-4">
                            <button onClick={(e) => { e.stopPropagation(); handleOpenTankModal(tank); }} className="p-1.5 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-md"><Edit className="w-4 h-4"/></button>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteTank(tank); }} className="p-1.5 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-md"><Trash2 className="w-4 h-4"/></button>
                            <span className="text-sm text-gray-600 dark:text-gray-300">{tankSensors.length} / {SENSOR_TYPES.length} Sensores</span>
                            <ChevronDown className={cn("w-5 h-5 text-gray-500 transition-transform", isExpanded && "transform rotate-180")} />
                        </div>
                    </div>

                    {isExpanded && (
                        <div className="p-4 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {tankSensors.map(sensor => {
                                    const Icon = getSensorIcon(sensor.type);
                                    return (
                                        <div key={sensor.id} className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex items-center space-x-3">
                                                        <Icon className="w-5 h-5 text-sena-green"/>
                                                        <h4 className="font-semibold text-gray-800 dark:text-white">{sensor.name}</h4>
                                                    </div>
                                                    {sensor.status === 'ACTIVE' ? <Wifi className="w-4 h-4 text-green-500" /> : <WifiOff className="w-4 h-4 text-red-500" />}
                                                </div>
                                                <div className="space-y-2 text-sm">
                                                    <div className="flex justify-between"><span className="text-gray-500">Hardware ID:</span><span className="font-mono text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{sensor.hardwareId}</span></div>
                                                    <div className="flex justify-between"><span className="text-gray-500">Estado:</span>{getStatusChip(sensor.status)}</div>
                                                    <div className="flex justify-between"><span className="text-gray-500">Lectura:</span><span className="font-medium text-gray-900 dark:text-white">{sensor.lastReading?.toFixed(1) ?? 'N/A'} {sensor.type === 'TEMPERATURE' ? '°C' : sensor.type === 'PH' ? '' : 'mg/L'}</span></div>
                                                    <div className="flex justify-between"><span className="text-gray-500">Calibrado:</span><span className="font-medium text-gray-900 dark:text-white">{format(new Date(sensor.calibrationDate), 'dd/MM/yyyy')}</span></div>
                                                </div>
                                            </div>
                                            <div className="flex justify-end space-x-2 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                                                <button onClick={() => handleOpenSensorModal(sensor)} className="p-1.5 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-md"><Edit className="w-4 h-4"/></button>
                                                <button onClick={() => handleDeleteSensor(sensor)} className="p-1.5 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-md"><Trash2 className="w-4 h-4"/></button>
                                            </div>
                                        </div>
                                    );
                                })}
                                
                                {availableTypesForNewSensor.length > 0 && (
                                    <div className="flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                                        <button onClick={() => handleOpenSensorModal(undefined, tank.id)} className="text-sena-green hover:text-green-700 flex flex-col items-center">
                                            <Plus className="w-8 h-8"/>
                                            <span className="text-sm mt-1">Añadir Sensor</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </Card>
            );
        })}
         {tanks.length === 0 && !loading && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                <MapPin className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold">No hay tanques registrados</h3>
                <p className="mt-1 text-sm">Comience creando un nuevo tanque para poder añadir sensores.</p>
            </div>
        )}
      </div>

      <Modal title={editingTank ? "Editar Tanque" : "Nuevo Tanque"} isOpen={showTankModal} onClose={handleCloseModals} footer={
          <>
            <button type="button" onClick={handleCloseModals} className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors">Cancelar</button>
            <button type="submit" form="tank-form" disabled={isSubmitting} className="px-4 py-2 bg-sena-green hover:bg-green-700 text-white rounded-lg flex items-center space-x-2 transition-colors disabled:bg-green-300">{isSubmitting ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}<span>{editingTank ? 'Guardar Cambios' : 'Crear Tanque'}</span></button>
          </>
      }>
        <form id="tank-form" onSubmit={handleTankSubmit} className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre del Tanque</label><input type="text" value={tankFormData.name} onChange={(e) => setTankFormData({ ...tankFormData, name: e.target.value })} className="w-full form-input" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ubicación</label><input type="text" value={tankFormData.location} onChange={(e) => setTankFormData({ ...tankFormData, location: e.target.value })} className="w-full form-input" required /></div>
            {editingTank && <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Estado</label><select value={tankFormData.status} onChange={(e) => setTankFormData({ ...tankFormData, status: e.target.value as any })} className="w-full form-select"><option value="ACTIVE">Activo</option><option value="MAINTENANCE">Mantenimiento</option><option value="INACTIVE">Inactivo</option></select></div>}
        </form>
      </Modal>

      <Modal title={editingSensor ? "Editar Sensor" : "Nuevo Sensor"} isOpen={showSensorModal} onClose={handleCloseModals} footer={
          <>
            <button type="button" onClick={handleCloseModals} className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors">Cancelar</button>
            <button type="submit" form="sensor-form" disabled={isSubmitting} className="px-4 py-2 bg-sena-green hover:bg-green-700 text-white rounded-lg flex items-center space-x-2 transition-colors disabled:bg-green-300">{isSubmitting ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}<span>{editingSensor ? 'Guardar Cambios' : 'Crear Sensor'}</span></button>
          </>
      }>
        <form id="sensor-form" onSubmit={handleSensorSubmit} className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre del Sensor</label><input type="text" value={sensorFormData.name} onChange={(e) => setSensorFormData({ ...sensorFormData, name: e.target.value })} className="w-full form-input" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ID del Hardware (MQTT)</label><input type="text" placeholder="Ej: TANQUE1-TEMP" value={sensorFormData.hardwareId} onChange={(e) => setSensorFormData({ ...sensorFormData, hardwareId: e.target.value })} className="w-full form-input" required /></div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de Sensor</label>
                    <select value={sensorFormData.type} onChange={(e) => setSensorFormData({ ...sensorFormData, type: e.target.value as any })} className="w-full form-select" required disabled={!!editingSensor}>
                        {editingSensor ? <option value={editingSensor.type}>{editingSensor.type}</option> :
                          availableSensorTypes.map(type => <option key={type} value={type}>{type}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Asignar a Tanque</label>
                    <select value={sensorFormData.tankId} onChange={(e) => setSensorFormData({ ...sensorFormData, tankId: e.target.value })} className="w-full form-select" required disabled={!editingSensor}>
                        {editingSensor ? availableTanksForSensor(editingSensor).map(tank => <option key={tank.id} value={tank.id}>{tank.name}</option>) :
                         <option value={sensorFormData.tankId}>{tanks.find(t => t.id === sensorFormData.tankId)?.name}</option>}
                    </select>
                </div>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha de Calibración</label><input type="date" value={sensorFormData.calibrationDate} onChange={(e) => setSensorFormData({ ...sensorFormData, calibrationDate: e.target.value })} className="w-full form-input" required /></div>
            {editingSensor && <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Estado</label><select value={sensorFormData.status} onChange={(e) => setSensorFormData({ ...sensorFormData, status: e.target.value as any })} className="w-full form-select"><option value="ACTIVE">Activo</option><option value="MAINTENANCE">Mantenimiento</option><option value="INACTIVE">Inactivo</option><option value="ERROR">Error</option></select></div>}
        </form>
      </Modal>
    </div>
  );
};