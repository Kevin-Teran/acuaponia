import React, { useState, useEffect, useCallback } from 'react';
import { SlidersHorizontal, Send, Bot, Play, StopCircle, Loader, AlertCircle, Trash2, Pause } from 'lucide-react';
import { Card } from '../common/Card';
import { User, Tank, Sensor } from '../../types';
import * as userService from '../../services/userService';
import * as tankService from '../../services/tankService';
import * as sensorService from '../../services/sensorService';
import * as dataService from '../../services/dataService';
import Swal from 'sweetalert2';
import { cn } from '../../utils/cn';

// --- Sub-componente: Panel de Selección ---
const SelectionPanel = ({ users, tanks, sensors, loading, selections, onSelectUser, onSelectTank, onToggleSensor }: any) => (
    <Card title="1. Selección de Objetivos" icon={SlidersHorizontal}>
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Usuario</label>
                <select 
                    className="w-full mt-1 form-select" 
                    value={selections.user} 
                    onChange={(e) => onSelectUser(e.target.value)} 
                    disabled={loading.users}
                >
                    <option value="">{loading.users ? "Cargando..." : "Seleccione un usuario"}</option>
                    {users.map((user: User) => <option key={user.id} value={user.id}>{user.name}</option>)}
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium">Tanque</label>
                <select 
                    className="w-full mt-1 form-select" 
                    value={selections.tank} 
                    onChange={(e) => onSelectTank(e.target.value)} 
                    disabled={loading.tanks || !selections.user}
                >
                    <option value="">{loading.tanks ? "Cargando..." : "Seleccione un tanque"}</option>
                    {tanks.map((tank: Tank) => <option key={tank.id} value={tank.id}>{tank.name}</option>)}
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium">Sensores</label>
                <div className="mt-2 space-y-2 max-h-48 overflow-y-auto p-2 border rounded-md dark:border-gray-600">
                    {sensors.length > 0 ? sensors.map((sensor: Sensor) => (
                        <div key={sensor.id} className="flex items-center">
                            <input 
                                id={`sensor-${sensor.id}`} 
                                type="checkbox" 
                                checked={selections.sensors.includes(sensor.id)} 
                                onChange={() => onToggleSensor(sensor.id)}
                                className="h-4 w-4 rounded border-gray-300 text-sena-green focus:ring-sena-green"
                            />
                            <label htmlFor={`sensor-${sensor.id}`} className="ml-3 text-sm">{sensor.name} ({sensor.type})</label>
                        </div>
                    )) : <p className="text-sm text-gray-500">Seleccione un tanque para ver sus sensores.</p>}
                </div>
            </div>
        </div>
    </Card>
);

// --- Sub-componente: Formulario Manual Inteligente ---
const ManualEntryForm = ({ sensor, onSubmit }: { sensor: Sensor | null; onSubmit: (data: any) => void }) => {
    const [value, setValue] = useState('25.0');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (sensor) {
            if (sensor.type === 'PH') setValue('7.0');
            else if (sensor.type === 'OXYGEN') setValue('8.0');
            else setValue('25.0');
        }
    }, [sensor]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!sensor) return;
        setIsSubmitting(true);
        try {
            const payload = {
                sensorId: sensor.id,
                value: parseFloat(value),
                type: sensor.type,
            };
            await onSubmit(payload);
            Swal.fire('¡Enviado!', 'Los datos manuales se han enviado correctamente.', 'success');
        } catch (error) {
            Swal.fire('Error', 'No se pudieron enviar los datos.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const getLabel = () => {
        if (!sensor) return 'Valor';
        if (sensor.type === 'TEMPERATURE') return 'Temperatura (°C)';
        if (sensor.type === 'PH') return 'pH';
        if (sensor.type === 'OXYGEN') return 'Oxígeno (mg/L)';
        return 'Valor';
    };
    
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 h-10">
                {sensor ? `Enviando datos para el sensor de ${sensor.type}:` : "Seleccione un único sensor para habilitar este panel."}
            </p>
            <div className="grid grid-cols-1 gap-4">
                <div>
                    <label className="block text-sm">{getLabel()}</label>
                    <input type="number" step="0.1" value={value} onChange={e => setValue(e.target.value)} disabled={!sensor || isSubmitting} className="w-full mt-1 form-input" />
                </div>
            </div>
            <button type="submit" disabled={!sensor || isSubmitting} className="w-full bg-sena-blue text-white py-2 rounded-lg flex items-center justify-center disabled:bg-gray-400">
                {isSubmitting ? <Loader className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 mr-2" />}
                Enviar Dato
            </button>
        </form>
    );
};

// --- Sub-componente: Simulador ---
const SyntheticDataEmitter = ({ selectedSensorIds, onStart, activeEmitters, onPause, onResume, onStop }: any) => {
    return (
        <div className="space-y-4">
            <button onClick={onStart} disabled={selectedSensorIds.length === 0} className="w-full bg-sena-green text-white py-2 rounded-lg flex items-center justify-center disabled:bg-gray-400">
                <Play className="w-5 h-5 mr-2" />
                Iniciar Simulación para {selectedSensorIds.length} sensor(es)
            </button>
            <div className="space-y-2">
                <h4 className="text-sm font-medium">Procesos Activos:</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto p-1">
                    {activeEmitters && activeEmitters.length > 0 ? activeEmitters.map((emitter: any) => (
                        <div key={emitter.sensorId} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-md">
                            <div>
                                <p className="font-semibold text-sm">{emitter.sensorName}</p>
                                <p className="text-xs text-gray-500">{emitter.tankName} / {emitter.userName}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                                {emitter.status === 'active' ? 
                                    <button onClick={() => onPause(emitter.sensorId)} className="p-1.5 text-yellow-500 hover:bg-yellow-100 rounded-md" title="Pausar"><Pause className="w-4 h-4"/></button> :
                                    <button onClick={() => onResume(emitter.sensorId)} className="p-1.5 text-green-500 hover:bg-green-100 rounded-md" title="Reanudar"><Play className="w-4 h-4"/></button>
                                }
                                <button onClick={() => onStop(emitter.sensorId)} className="p-1.5 text-red-500 hover:bg-red-100 rounded-md" title="Detener y Eliminar"><StopCircle className="w-4 h-4"/></button>
                            </div>
                        </div>
                    )) : <p className="text-sm text-gray-500 italic">No hay procesos de simulación activos.</p>}
                </div>
            </div>
        </div>
    );
};

/**
 * @component DataEntry
 * @desc Módulo de recolección de datos para administradores.
 */
export const DataEntry: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [tanks, setTanks] = useState<Tank[]>([]);
    const [sensors, setSensors] = useState<Sensor[]>([]);
    const [loading, setLoading] = useState({ users: true, tanks: false, sensors: false });
    const [error, setError] = useState<string | null>(null);
    const [selectedUser, setSelectedUser] = useState<string>('');
    const [selectedTank, setSelectedTank] = useState<string>('');
    const [selectedSensors, setSelectedSensors] = useState<string[]>([]);
    const [activeEmitters, setActiveEmitters] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'manual' | 'emitter'>('manual');

    const fetchInitialData = useCallback(async () => {
        try {
            setLoading(prev => ({ ...prev, users: true }));
            const [usersData, emittersData] = await Promise.all([
                userService.getAllUsers(),
                dataService.getEmitterStatus()
            ]);
            setUsers(usersData);
            setActiveEmitters(emittersData || []); // CORRECCIÓN: Asegura que siempre sea un array
            setError(null);
        } catch (err) {
            setError("No se pudieron cargar los datos iniciales. Verifica la conexión con el backend.");
        } finally {
            setLoading(prev => ({ ...prev, users: false }));
        }
    }, []);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    const handleSelectUser = (userId: string) => {
        setSelectedUser(userId);
        setSelectedTank('');
        setSelectedSensors([]);
        setTanks([]);
        setSensors([]);
        if (userId) {
            const fetchTanks = async () => {
                setLoading(prev => ({ ...prev, tanks: true }));
                try { setTanks(await tankService.getTanksByUser(userId)); } 
                catch { setError("No se pudieron cargar los tanques."); } 
                finally { setLoading(prev => ({ ...prev, tanks: false })); }
            };
            fetchTanks();
        }
    };
    
    const handleSelectTank = (tankId: string) => {
        setSelectedTank(tankId);
        setSelectedSensors([]);
        setSensors([]);
        if (tankId) {
            const fetchSensors = async () => {
                setLoading(prev => ({ ...prev, sensors: true }));
                try { setSensors(await sensorService.getSensorsByTank(tankId)); } 
                catch { setError("No se pudieron cargar los sensores."); } 
                finally { setLoading(prev => ({ ...prev, sensors: false })); }
            };
            fetchSensors();
        }
    };
    
    const handleToggleSensor = (sensorId: string) => {
        setSelectedSensors(prev => 
            prev.includes(sensorId) 
                ? prev.filter(id => id !== sensorId) 
                : [...prev, sensorId]
        );
    };

    const handleEmitterAction = async (action: (id: string) => Promise<any>, id: string) => {
        await action(id);
        const emitters = await dataService.getEmitterStatus();
        setActiveEmitters(emitters || []);
    };

    const handleStartSimulation = async () => {
        await dataService.startEmitter(selectedSensors);
        const emitters = await dataService.getEmitterStatus();
        setActiveEmitters(emitters || []);
        setSelectedSensors([]);
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Recolección de Datos</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Herramientas de prueba y simulación para administradores.</p>
            </div>
            
            {error && <div className="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400" role="alert"><AlertCircle className="inline w-5 h-5 mr-2"/>{error}</div>}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                    <SelectionPanel 
                        users={users} 
                        tanks={tanks} 
                        sensors={sensors} 
                        loading={loading}
                        selections={{ user: selectedUser, tank: selectedTank, sensors: selectedSensors }}
                        onSelectUser={handleSelectUser}
                        onSelectTank={handleSelectTank}
                        onToggleSensor={handleToggleSensor}
                    />
                </div>
                
                <div className="lg:col-span-2">
                    <Card>
                        <div className="border-b border-gray-200 dark:border-gray-700">
                            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                                <button onClick={() => setActiveTab('manual')} className={cn('whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm', activeTab === 'manual' ? 'border-sena-green text-sena-green' : 'border-transparent text-gray-500 hover:border-gray-300')}>Entrada Manual</button>
                                <button onClick={() => setActiveTab('emitter')} className={cn('whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm', activeTab === 'emitter' ? 'border-sena-green text-sena-green' : 'border-transparent text-gray-500 hover:border-gray-300')}>Simulador</button>
                            </nav>
                        </div>

                        <div className="pt-6">
                            {activeTab === 'manual' && (
                                <ManualEntryForm 
                                    sensor={selectedSensors.length === 1 ? sensors.find(s => s.id === selectedSensors[0]) || null : null} 
                                    onSubmit={async (data) => {
                                        await dataService.submitManualEntry(data);
                                    }} 
                                />
                            )}
                            {activeTab === 'emitter' && (
                                <SyntheticDataEmitter 
                                    selectedSensorIds={selectedSensors}
                                    activeEmitters={activeEmitters}
                                    onStart={handleStartSimulation}
                                    onPause={(id: string) => handleEmitterAction(dataService.pauseEmitter, id)}
                                    onResume={(id: string) => handleEmitterAction(dataService.resumeEmitter, id)}
                                    onStop={(id: string) => handleEmitterAction(dataService.stopEmitter, id)}
                                />
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};