import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
    SlidersHorizontal, Send, Bot, Play, StopCircle, Loader, AlertCircle
} from 'lucide-react';
import { Card } from '../common/Card';
import { Modal } from '../common/Modal';
import { LoadingSpinner } from '../common/LoadingSpinner';
import Swal from 'sweetalert2';
import { cn } from '../../utils/cn';
import * as userService from '../../services/userService';
import * as tankService from '../../services/tankService';
import * as sensorService from '../../services/sensorService';
import * as dataService from '../../services/dataService';
import { User, Tank, Sensor } from '../../types';

/**
 * @component DataEntry
 * @description Módulo de recolección de datos para administradores. Permite la selección
 * jerárquica de usuario, tanque y sensores para la inyección de datos manuales o sintéticos.
 */
export const DataEntry: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [tanks, setTanks] = useState<Tank[]>([]);
    const [sensors, setSensors] = useState<Sensor[]>([]);
    const [loading, setLoading] = useState({ users: true, tanks: false, sensors: false });
    const [error, setError] = useState<string | null>(null);
    const [selections, setSelections] = useState({ user: '', tank: '', sensors: [] as string[] });
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
            setActiveEmitters(emittersData || []);
            setError(null);
        } catch (err) {
            setError("No se pudieron cargar los datos iniciales. Verifica la conexión con el backend.");
        } finally {
            setLoading(prev => ({ ...prev, users: false }));
        }
    }, []);

    useEffect(() => { fetchInitialData(); }, [fetchInitialData]);

    const handleSelectUser = async (userId: string) => {
        setSelections({ user: userId, tank: '', sensors: [] });
        setTanks([]);
        setSensors([]);
        if (userId) {
            setLoading(prev => ({ ...prev, tanks: true }));
            try {
                setTanks(await tankService.getTanksByUser(userId));
            } catch {
                setError("No se pudieron cargar los tanques de este usuario.");
            } finally {
                setLoading(prev => ({ ...prev, tanks: false }));
            }
        }
    };
    
    const handleSelectTank = async (tankId: string) => {
        setSelections(prev => ({ ...prev, tank: tankId, sensors: [] }));
        setSensors([]);
        if (tankId) {
            setLoading(prev => ({ ...prev, sensors: true }));
            try {
                setSensors(await sensorService.getSensorsByTank(tankId));
            } catch {
                setError("No se pudieron cargar los sensores de este tanque.");
            } finally {
                setLoading(prev => ({ ...prev, sensors: false }));
            }
        }
    };
    
    const handleToggleSensor = (sensorId: string) => {
        setSelections(prev => ({
            ...prev,
            sensors: prev.sensors.includes(sensorId)
                ? prev.sensors.filter(id => id !== sensorId)
                : [...prev.sensors, sensorId]
        }));
    };

    const handleEmitterAction = async (action: (id: string | string[]) => Promise<any>, sensorId: string | string[], successMsg: string) => {
        try {
            await action(sensorId);
            const emitters = await dataService.getEmitterStatus();
            setActiveEmitters(emitters || []);
            Swal.fire({ icon: 'success', title: successMsg, toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
            if (Array.isArray(sensorId)) {
                setSelections(prev => ({...prev, sensors: []})); // Limpiar selección al iniciar
            }
        } catch (error) {
            Swal.fire('Error', 'La operación no se pudo completar.', 'error');
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Recolección de Datos</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Herramientas de prueba y simulación para administradores.</p>
            </div>
            
            {error && <div className="p-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400"><AlertCircle className="inline w-5 h-5 mr-2"/>{error}</div>}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                    <SelectionPanel 
                        users={users} tanks={tanks} sensors={sensors} loading={loading}
                        selections={selections} onSelectUser={handleSelectUser} onSelectTank={handleSelectTank} onToggleSensor={handleToggleSensor}
                    />
                </div>
                
                <div className="lg:col-span-2">
                    <Card>
                        <div className="border-b border-gray-200 dark:border-gray-700">
                            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                                <TabButton name="Entrada Manual" tabKey="manual" activeTab={activeTab} setActiveTab={setActiveTab} />
                                <TabButton name="Simulador de Sensores" tabKey="emitter" activeTab={activeTab} setActiveTab={setActiveTab} />
                            </nav>
                        </div>
                        <div className="pt-6">
                            {activeTab === 'manual' && (
                                <ManualEntryForm 
                                    sensor={selections.sensors.length === 1 ? sensors.find(s => s.id === selections.sensors[0]) : null} 
                                    onSubmit={(data) => dataService.submitManualEntry(data)} 
                                />
                            )}
                            {activeTab === 'emitter' && (
                                <SyntheticDataEmitter 
                                    selectedSensorIds={selections.sensors}
                                    activeEmitters={activeEmitters}
                                    onStart={() => handleEmitterAction(dataService.startEmitter, selections.sensors, 'Simulación iniciada.')}
                                    onStop={(id) => handleEmitterAction(dataService.stopEmitter, id, 'Simulación detenida.')}
                                />
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

// --- SUBCOMPONENTES ---

const SelectionPanel: React.FC<any> = ({ users, tanks, sensors, loading, selections, onSelectUser, onSelectTank, onToggleSensor }) => (
    <Card title="1. Selección de Objetivos" icon={SlidersHorizontal}>
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Usuario</label>
                <select className="form-select mt-1" value={selections.user} onChange={(e) => onSelectUser(e.target.value)} disabled={loading.users}>
                    <option value="">{loading.users ? "Cargando..." : "Seleccione un usuario"}</option>
                    {users.map((user: User) => <option key={user.id} value={user.id}>{user.name}</option>)}
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tanque</label>
                <select className="form-select mt-1" value={selections.tank} onChange={(e) => onSelectTank(e.target.value)} disabled={loading.tanks || !selections.user}>
                    <option value="">{loading.tanks ? "Cargando..." : "Seleccione un tanque"}</option>
                    {tanks.map((tank: Tank) => <option key={tank.id} value={tank.id}>{tank.name}</option>)}
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sensores (múltiple para simulador, uno para manual)</label>
                <div className="mt-2 space-y-2 max-h-48 overflow-y-auto p-2 border rounded-md dark:border-gray-600">
                    {loading.sensors ? <div className="text-center"><Loader className="w-5 h-5 animate-spin mx-auto"/></div> :
                     sensors.length > 0 ? sensors.map((sensor: Sensor) => (
                        <div key={sensor.id} className="flex items-center">
                            <input id={`sensor-${sensor.id}`} type="checkbox" checked={selections.sensors.includes(sensor.id)} onChange={() => onToggleSensor(sensor.id)} className="h-4 w-4 rounded border-gray-300 text-sena-green focus:ring-sena-green"/>
                            <label htmlFor={`sensor-${sensor.id}`} className="ml-3 text-sm text-gray-700 dark:text-gray-300">{sensor.name} ({sensor.type})</label>
                        </div>
                    )) : <p className="text-sm text-gray-500">Seleccione un tanque para ver sus sensores.</p>}
                </div>
            </div>
        </div>
    </Card>
);

const ManualEntryForm = ({ sensor, onSubmit }: { sensor: Sensor | null; onSubmit: (data: any) => void }) => {
    const [value, setValue] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (sensor) {
            if (sensor.type === 'PH') setValue('7.0');
            else if (sensor.type === 'OXYGEN') setValue('8.0');
            else setValue('25.0');
        } else {
            setValue('');
        }
    }, [sensor]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!sensor) return;
        setIsSubmitting(true);
        try {
            await onSubmit({ sensorId: sensor.id, value: parseFloat(value) });
            await Swal.fire({ icon: 'success', title: '¡Dato Enviado!', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
        } catch (error) {
            await Swal.fire('Error', 'No se pudo enviar el dato.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <Card title="2. Envío de Dato Manual" icon={Send} subtitle="Envía una única lectura a un sensor específico vía MQTT.">
            <form onSubmit={handleSubmit} className="space-y-4">
                <p className="text-sm text-gray-500 dark:text-gray-400 h-10">{sensor ? `Enviando datos para: ${sensor.name} (${sensor.type})` : "Seleccione un único sensor para habilitar."}</p>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{sensor?.type || 'Valor'}</label>
                    <input type="number" step="0.1" value={value} onChange={e => setValue(e.target.value)} disabled={!sensor || isSubmitting} className="form-input" required />
                </div>
                <button type="submit" disabled={!sensor || isSubmitting} className="w-full bg-sena-blue hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center space-x-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    {isSubmitting ? <LoadingSpinner size="sm" /> : <Send className="w-5 h-5" />}
                    <span>Enviar Dato</span>
                </button>
            </form>
        </Card>
    );
};

const SyntheticDataEmitter = ({ selectedSensorIds, activeEmitters, onStart, onStop }: any) => {
    const [isStarting, setIsStarting] = useState(false);

    const handleStart = async () => {
        setIsStarting(true);
        await onStart();
        setIsStarting(false);
    };

    return (
        <Card title="2. Simulador de Sensores (MQTT)" icon={Bot} subtitle="Inicia un proceso en el servidor que enviará datos simulados cada 5 segundos.">
            <div className="space-y-4">
                <button onClick={handleStart} disabled={selectedSensorIds.length === 0 || isStarting} className="w-full bg-sena-green hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center space-x-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    {isStarting ? <LoadingSpinner size="sm" /> : <Play className="w-5 h-5" />}
                    <span>Iniciar Simulación ({selectedSensorIds.length})</span>
                </button>
                <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200">Procesos Activos:</h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto p-1 border rounded-md dark:border-gray-600">
                        {activeEmitters && activeEmitters.length > 0 ? activeEmitters.map((emitter: any) => (
                            <div key={emitter.sensorId} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-md">
                                <div>
                                    <p className="font-semibold text-sm text-gray-900 dark:text-white">{emitter.sensorName} ({emitter.type})</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{emitter.tankName} / {emitter.userName}</p>
                                </div>
                                <button onClick={() => onStop(emitter.sensorId)} className="p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-md" title="Detener Simulación">
                                    <StopCircle className="w-4 h-4"/>
                                </button>
                            </div>
                        )) : <p className="text-sm text-gray-500 italic p-4 text-center">No hay procesos de simulación activos.</p>}
                    </div>
                </div>
            </div>
        </Card>
    );
};

const TabButton = ({ name, tabKey, activeTab, setActiveTab }) => (
    <button onClick={() => setActiveTab(tabKey)} className={cn('whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors', activeTab === tabKey ? 'border-sena-green text-sena-green' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600')}>
        {name}
    </button>
);