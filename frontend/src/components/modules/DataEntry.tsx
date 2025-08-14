// frontend/src/components/modules/DataEntry.tsx

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
    Users, MapPin, Cpu, CheckSquare, Square, Bot, Send, Play, StopCircle, AlertCircle, ArrowRight
} from 'lucide-react';
import { Card } from '../common/Card';
import { LoadingSpinner } from '../common/LoadingSpinner';
import Swal from 'sweetalert2';
import { cn } from '../../utils/cn';
import * as userService from '../../services/userService';
import * as tankService from '../../services/tankService';
import * as sensorService from '../../services/sensorService';
import * as dataService from '../../services/dataService';
import { mqttService } from '../../services/mqttService';
import { User, Tank, Sensor, SensorType } from '../../types';

// --- Funciones de Utilidad y Subcomponentes Visuales ---

const translateSensorType = (type: SensorType): string => ({
    TEMPERATURE: 'Temperatura', PH: 'pH', OXYGEN: 'Oxígeno'
}[type] || type);

const SensorCard: React.FC<{ sensor: Sensor; isSelected: boolean; onToggle: () => void; }> = 
({ sensor, isSelected, onToggle }) => (
    <div
        onClick={onToggle}
        className={cn(
            'p-4 rounded-lg border-2 cursor-pointer transition-all duration-200',
            'flex flex-col items-center justify-center text-center relative',
            isSelected
                ? 'border-sena-green bg-sena-green/10 dark:bg-sena-green/20 shadow-lg'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-sena-green/50'
        )}
    >
        <div className={cn("w-12 h-12 mb-3 rounded-full flex items-center justify-center", isSelected ? 'bg-sena-green text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300')}>
            <Cpu className="w-6 h-6" />
        </div>
        <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{sensor.name}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{translateSensorType(sensor.type)}</p>
    </div>
);

const ManualValueInput: React.FC<{ onSubmit: (value: number) => void, disabled: boolean }> = ({ onSubmit, disabled }) => {
    const [value, setValue] = useState('25.0');
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const numericValue = parseFloat(value);
        if (!isNaN(numericValue)) onSubmit(numericValue);
        else Swal.fire('Valor Inválido', 'Por favor, ingrese un número.', 'warning');
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-3">
            <label htmlFor="manual-value" className="label">Valor Numérico a Enviar</label>
            <input id="manual-value" type="number" step="0.1" value={value} onChange={e => setValue(e.target.value)} className="form-input" required disabled={disabled} />
            <button type="submit" className="w-full btn-primary" disabled={disabled}>
                <Send className="w-4 h-4"/><span>Enviar a Sensores Seleccionados</span>
            </button>
        </form>
    );
};

/**
 * @component DataEntry
 * @description Módulo principal con flujo paso a paso para la recolección y simulación de datos.
 */
export const DataEntry: React.FC = () => {
    // --- Estados del Componente ---
    const [users, setUsers] = useState<User[]>([]);
    const [tanks, setTanks] = useState<Tank[]>([]);
    const [sensors, setSensors] = useState<Sensor[]>([]);
    const [activeEmitters, setActiveEmitters] = useState<any[]>([]);
    const [selections, setSelections] = useState<{ user: string; tank: string; sensors: string[] }>({ user: '', tank: '', sensors: [] });
    const [loading, setLoading] = useState({ users: true, tanks: false, sensors: false, action: false });
    const [error, setError] = useState<string | null>(null);
    const [mode, setMode] = useState<'manual' | 'emitter'>('manual');
    
    // --- Lógica de Carga y Manejo de Datos ---
    const fetchInitialData = useCallback(async () => {
        setLoading(prev => ({ ...prev, users: true, action: false }));
        try {
            const [usersData, emittersData] = await Promise.all([userService.getAllUsers(), dataService.getEmitterStatus()]);
            setUsers(usersData);
            setActiveEmitters(emittersData || []);
        } catch (err) { setError("No se pudieron cargar los datos iniciales."); }
        finally { setLoading(prev => ({ ...prev, users: false })); }
    }, []);

    useEffect(() => {
        mqttService.connect().catch(err => console.error("Fallo la conexión a MQTT:", err));
        fetchInitialData();
    }, [fetchInitialData]);

    const handleSelectUser = useCallback(async (userId: string) => {
        setSelections({ user: userId, tank: '', sensors: [] });
        if (!userId) { setTanks([]); setSensors([]); return; }
        setLoading(prev => ({ ...prev, tanks: true }));
        try {
            const [tanksData, sensorsData] = await Promise.all([tankService.getTanks(userId), sensorService.getSensors(userId)]);
            setTanks(tanksData);
            setSensors(sensorsData);
            if (tanksData.length > 0) setSelections(prev => ({ ...prev, tank: tanksData[0].id }));
        } catch (err) { setError("Error al cargar datos del usuario."); }
        finally { setLoading(prev => ({ ...prev, tanks: false })); }
    }, []);

    const handleSelectTank = useCallback((tankId: string) => setSelections(prev => ({ ...prev, tank: tankId, sensors: [] })), []);
    const handleToggleSensor = useCallback((sensorId: string) => {
        setSelections(prev => ({ ...prev, sensors: prev.sensors.includes(sensorId) ? prev.sensors.filter(id => id !== sensorId) : [...prev.sensors, sensorId] }));
    }, []);
    
    const handleSelectAllSensors = useCallback(() => setSelections(prev => ({ ...prev, sensors: sensors.filter(s => s.tankId === prev.tank).map(s => s.id) })), [sensors]);
    const handleClearSelection = useCallback(() => setSelections(prev => ({ ...prev, sensors: [] })), []);

    const handleApiAction = useCallback(async (action: () => Promise<any>, successMsg: string) => {
        setLoading(prev => ({ ...prev, action: true }));
        try {
            await action();
            await fetchInitialData();
            Swal.fire({ icon: 'success', title: successMsg, toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
            handleClearSelection();
        } catch (error: any) { Swal.fire('Error', error.response?.data?.message || 'La operación falló.', 'error'); }
        finally { setLoading(prev => ({ ...prev, action: false })); }
    }, [fetchInitialData, handleClearSelection]);

    const handleMqttSubmit = useCallback(async (value: number) => {
        setLoading(prev => ({ ...prev, action: true }));
        try {
            for (const sensorId of selections.sensors) {
                const sensor = sensors.find(s => s.id === sensorId);
                if (sensor?.hardwareId) {
                    const topic = `sena/acuaponia/sensors/${sensor.hardwareId}/data`;
                    const payload = JSON.stringify({ value, timestamp: new Date().toISOString() });
                    await mqttService.publish(topic, payload);
                }
            }
            Swal.fire({ icon: 'success', title: '¡Datos publicados en MQTT!', toast: true, position: 'top-end', showConfirmButton: false, timer: 2500 });
            handleClearSelection();
        } catch (error) { console.error("Error en handleMqttSubmit:", error); }
        finally { setLoading(prev => ({ ...prev, action: false })); }
    }, [sensors, selections.sensors, handleClearSelection]);

    const sensorsForSelectedTank = useMemo(() => sensors.filter(sensor => sensor.tankId === selections.tank), [sensors, selections.tank]);
    const emittersByTank = useMemo(() => activeEmitters.reduce((acc, emitter) => {
        const tankName = emitter.tankName || 'Desconocido';
        if (!acc[tankName]) acc[tankName] = [];
        acc[tankName].push(emitter);
        return acc;
    }, {} as Record<string, any[]>), [activeEmitters]);

    if (loading.users) return <LoadingSpinner fullScreen message="Cargando módulo de recolección..." />;

    return (
        <div className="space-y-6">
            {loading.action && <LoadingSpinner fullScreen message="Procesando solicitud..." />}
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Asistente de Simulación</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Sigue los pasos para generar datos de prueba de forma manual o automática.</p>
            </div>
            
            {error && <div className="p-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400 flex items-center"><AlertCircle className="inline w-5 h-5 mr-3"/>{error}</div>}

            {/* Paso 1: Selección de Objetivo */}
            <Card title="Paso 1: Seleccionar Objetivo">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    <div>
                        <label className="label flex items-center"><Users className="w-4 h-4 mr-2"/>Usuario</label>
                        <select className="form-select" value={selections.user} onChange={(e) => handleSelectUser(e.target.value)} disabled={loading.tanks}>
                            <option value="">Seleccione un usuario...</option>
                            {users.map((user: User) => <option key={user.id} value={user.id}>{user.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="label flex items-center"><MapPin className="w-4 h-4 mr-2"/>Tanque</label>
                        <select className="form-select" value={selections.tank} onChange={(e) => handleSelectTank(e.target.value)} disabled={!selections.user || loading.tanks}>
                            <option value="">{loading.tanks ? "Cargando..." : "Seleccione un tanque..."}</option>
                            {tanks.map((tank: Tank) => <option key={tank.id} value={tank.id}>{tank.name}</option>)}
                        </select>
                    </div>
                </div>
            </Card>

            {/* Paso 2: Selección de Sensores (visible solo si hay un tanque seleccionado) */}
            {selections.tank && (
                <Card className="animate-in fade-in duration-500">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Paso 2: Seleccionar Sensores</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Seleccionados: {selections.sensors.length} de {sensorsForSelectedTank.length}</p>
                        </div>
                        <div className="flex space-x-2 mt-2 sm:mt-0">
                            <button onClick={handleSelectAllSensors} disabled={sensorsForSelectedTank.length === 0} className="btn-secondary px-3 py-1.5 text-xs flex items-center gap-2"><CheckSquare className="w-4 h-4"/>Todos</button>
                            <button onClick={handleClearSelection} disabled={selections.sensors.length === 0} className="btn-secondary px-3 py-1.5 text-xs flex items-center gap-2"><Square className="w-4 h-4"/>Ninguno</button>
                        </div>
                    </div>
                    {loading.sensors ? <LoadingSpinner /> : sensorsForSelectedTank.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {sensorsForSelectedTank.map(sensor => <SensorCard key={sensor.id} sensor={sensor} isSelected={selections.sensors.includes(sensor.id)} onToggle={() => handleToggleSensor(sensor.id)} />)}
                        </div>
                    ) : (
                        <div className="text-center py-10 text-gray-500 dark:text-gray-400"><Cpu className="w-10 h-10 mx-auto mb-2 opacity-50"/><p>Este tanque no tiene sensores.</p></div>
                    )}
                </Card>
            )}

            {/* Paso 3: Acción (visible solo si hay sensores seleccionados) */}
            {selections.sensors.length > 0 && (
                <Card title="Paso 3: Ejecutar Acción" className="animate-in fade-in duration-500">
                    <div className="flex bg-gray-100 dark:bg-gray-900/50 p-1 rounded-lg max-w-sm mx-auto">
                        <button onClick={() => setMode('manual')} className={cn("w-1/2 py-2 text-sm font-semibold rounded-md transition-colors flex items-center justify-center gap-2", mode === 'manual' ? 'bg-white dark:bg-sena-blue text-sena-blue shadow' : 'text-gray-600 dark:text-gray-300')}><Send className="w-4 h-4"/>Envío Manual</button>
                        <button onClick={() => setMode('emitter')} className={cn("w-1/2 py-2 text-sm font-semibold rounded-md transition-colors flex items-center justify-center gap-2", mode === 'emitter' ? 'bg-white dark:bg-sena-green text-sena-green shadow' : 'text-gray-600 dark:text-gray-300')}><Bot className="w-4 h-4"/>Simulador Backend</button>
                    </div>
                    <div className="mt-4 max-w-sm mx-auto">
                        {mode === 'manual' ? <ManualValueInput onSubmit={handleMqttSubmit} disabled={loading.action} /> : (
                            <div className="p-4 text-center">
                                <button onClick={() => handleApiAction(() => dataService.startEmitter(selections.sensors), 'Simulación iniciada.')} disabled={loading.action} className="w-full btn-primary flex items-center justify-center gap-2">
                                    <Play className="w-5 h-5" /><span>Iniciar Simulación</span>
                                </button>
                            </div>
                        )}
                    </div>
                </Card>
            )}

            {/* Panel de Simuladores Activos (visible solo si hay emisores) */}
            {activeEmitters.length > 0 && (
                <Card title="Panel de Control de Simuladores Activos" icon={Bot} className="animate-in fade-in duration-500">
                    <div className="space-y-4">
                        {Object.entries(emittersByTank).map(([tankName, emitters]) => (
                            <div key={tankName} className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="font-semibold text-gray-800 dark:text-white">{tankName} <span className="text-sm font-normal text-gray-500 dark:text-gray-400">- {emitters[0].userName}</span></h3>
                                    <button
                                        onClick={() => handleApiAction(() => Promise.all(emitters.map(e => dataService.stopEmitter(e.sensorId))), `Simulación detenida para todo el tanque ${tankName}.`)}
                                        className="btn-secondary bg-red-500 hover:bg-red-600 text-white px-2 py-1 text-xs flex items-center gap-1"
                                    >
                                        <StopCircle className="w-4 h-4"/> Detener Todo
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {emitters.map(emitter => (
                                        <div key={emitter.sensorId} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded-md shadow-sm">
                                            <div className="flex items-center space-x-3"><div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                                <div>
                                                    <p className="font-semibold text-sm text-gray-900 dark:text-white">{emitter.sensorName}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{translateSensorType(emitter.type)}</p>
                                                </div>
                                            </div>
                                            <button onClick={() => handleApiAction(() => dataService.stopEmitter(emitter.sensorId), `Simulación detenida para ${emitter.sensorName}`)} className="p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-md" title="Detener Simulación">
                                                <StopCircle className="w-5 h-5"/>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}
        </div>
    );
};