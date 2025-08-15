import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
    Users, MapPin, Cpu, CheckSquare, Square, Bot, Send, Play, StopCircle, AlertCircle, Timer, ChevronDown
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

const SENSOR_ORDER: Record<SensorType, number> = { 'TEMPERATURE': 1, 'OXYGEN': 2, 'PH': 3, 'LEVEL': 4, 'FLOW': 5 };

/**
 * Traduce el tipo de sensor a una cadena de texto legible en español.
 * @param {SensorType} type - El tipo de sensor a traducir.
 * @returns {string} El nombre del sensor traducido.
 */
const translateSensorType = (type: SensorType): string => ({ TEMPERATURE: 'Temperatura', PH: 'Nivel de pH', OXYGEN: 'Oxígeno Disuelto' }[type] || type);

/**
 * Hook para un temporizador que muestra el tiempo transcurrido desde un punto de inicio.
 * @param {Date | string | undefined} startTime - La fecha y hora de inicio.
 * @returns {{ time: string; totalSeconds: number }} El tiempo transcurrido en formato MM:SS y en segundos.
 */
const useTimer = (startTime?: Date | string): { time: string; totalSeconds: number } => {
    const [totalSeconds, setTotalSeconds] = useState(0);

    useEffect(() => {
        if (!startTime) {
            setTotalSeconds(0);
            return;
        }
        const start = new Date(startTime).getTime();
        const intervalId = setInterval(() => {
            setTotalSeconds(Math.floor((Date.now() - start) / 1000));
        }, 1000);
        return () => clearInterval(intervalId);
    }, [startTime]);

    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return { time: `${minutes}:${seconds}`, totalSeconds };
};

/**
 * @component SensorCard
 * @description Tarjeta visual interactiva para la selección de un sensor.
 */
const SensorCard: React.FC<{ sensor: Sensor; isSelected: boolean; onToggle: () => void; }> = ({ sensor, isSelected, onToggle }) => (
    <div
        onClick={onToggle}
        className={cn('p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 flex flex-col items-center justify-center text-center relative', isSelected ? 'border-sena-green bg-sena-green/10 dark:bg-sena-green/20 shadow-lg' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-sena-green/50')}
    >
        <div className={cn("w-12 h-12 mb-3 rounded-full flex items-center justify-center", isSelected ? 'bg-sena-green text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300')}>
            <Cpu className="w-6 h-6" />
        </div>
        <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{sensor.name}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{translateSensorType(sensor.type)}</p>
    </div>
);

/**
 * @component ManualEntryForm
 * @description Formulario para enviar valores individuales para cada sensor seleccionado vía MQTT.
 */
const ManualEntryForm: React.FC<{ selectedSensors: Sensor[]; onSubmit: (entries: { sensorId: string; value: number }[]) => Promise<void>; isSubmitting: boolean; }> = ({ selectedSensors, onSubmit, isSubmitting }) => {
    const [values, setValues] = useState<Record<string, string>>({});

    useEffect(() => {
        const initialValues: Record<string, string> = {};
        selectedSensors.forEach(sensor => {
            if (values[sensor.id]) return;
            switch(sensor.type) {
                case 'PH': initialValues[sensor.id] = '7.0'; break;
                case 'OXYGEN': initialValues[sensor.id] = '8.0'; break;
                default: initialValues[sensor.id] = '25.0'; break;
            }
        });
        setValues(prev => ({...initialValues, ...prev}));
    }, [selectedSensors]);

    const handleValueChange = (sensorId: string, value: string) => setValues(prev => ({ ...prev, [sensorId]: value }));

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        const entries = selectedSensors.map(sensor => ({ sensorId: sensor.id, value: parseFloat(values[sensor.id]) })).filter(entry => !isNaN(entry.value));
        if (entries.length > 0) await onSubmit(entries);
        else Swal.fire('Atención', "No hay datos válidos para enviar.", 'warning');
    }, [selectedSensors, values, onSubmit]);

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                {selectedSensors.map(sensor => (
                    <div key={sensor.id} className="grid grid-cols-3 gap-3 items-center">
                        <label htmlFor={`manual-${sensor.id}`} className="label col-span-1 truncate">{sensor.name}</label>
                        <input id={`manual-${sensor.id}`} type="number" step="0.1" value={values[sensor.id] || ''} onChange={e => handleValueChange(sensor.id, e.target.value)} className="form-input col-span-2" required />
                    </div>
                ))}
            </div>
            <button type="submit" disabled={selectedSensors.length === 0 || isSubmitting} className="w-full btn-primary">
                {isSubmitting ? <LoadingSpinner bare size="sm" /> : <><Send className="w-5 h-5" /><span>Enviar Valores</span></>}
            </button>
        </form>
    );
};

/**
 * @component ActiveEmitterRow
 * @description Fila individual para un simulador activo, mostrando temporizador y control de parada.
 */
const ActiveEmitterRow: React.FC<{ emitter: any; onStop: () => void; }> = ({ emitter, onStop }) => {
    const { time: elapsedTime, totalSeconds } = useTimer(emitter.startTime);
    const totalPackets = Math.floor(totalSeconds / 5);

    return (
        <div className="flex items-center justify-between p-3">
            <div className="flex items-center space-x-3 min-w-0">
                <div className="w-2 h-2 rounded-full bg-sena-green animate-pulse flex-shrink-0"></div>
                <Cpu className="w-5 h-5 text-gray-400 flex-shrink-0"/>
                <div className="flex-grow min-w-0">
                    <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{emitter.sensorName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{translateSensorType(emitter.type)}</p>
                </div>
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0">
                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 font-mono" title={`${totalPackets} envíos de datos`}>
                    <Timer className="w-4 h-4 mr-1.5"/>{elapsedTime}
                </div>
                <button onClick={onStop} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full" title="Terminar Proceso"><StopCircle className="w-5 h-5"/></button>
            </div>
        </div>
    );
};

/**
 * @component DataEntry
 * @description Módulo principal con flujo unificado para la recolección y simulación de datos.
 */
export const DataEntry: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [tanks, setTanks] = useState<Tank[]>([]);
    const [sensors, setSensors] = useState<Sensor[]>([]);
    const [activeEmitters, setActiveEmitters] = useState<any[]>([]);
    const [selections, setSelections] = useState<{ user: string; tank: string; sensors: string[] }>({ user: '', tank: '', sensors: [] });
    const [loading, setLoading] = useState({ users: true, tanks: false, sensors: false, action: false });
    const [error, setError] = useState<string | null>(null);
    const [mode, setMode] = useState<'manual' | 'emitter'>('manual');
    const [expandedTanks, setExpandedTanks] = useState<Set<string>>(new Set());

    const handleClearSelection = useCallback(() => setSelections(prev => ({ ...prev, sensors: [] })), []);

    const fetchInitialData = useCallback(async () => {
        setLoading(prev => ({ ...prev, action: true }));
        try {
            const emittersData = await dataService.getEmitterStatus();
            setActiveEmitters(emittersData || []);
            if (users.length === 0) {
                const usersData = await userService.getAllUsers();
                setUsers(usersData);
            }
        } catch (err) { setError("No se pudieron cargar los datos iniciales."); }
        finally { setLoading(prev => ({ ...prev, users: false, action: false })); }
    }, [users.length]);

    useEffect(() => {
        mqttService.connect().catch(err => console.error("Fallo la conexión a MQTT:", err));
        fetchInitialData();
    }, [fetchInitialData]);

    const handleApiAction = useCallback(async (action: () => Promise<any>, successMsg?: string) => {
        setLoading(prev => ({ ...prev, action: true }));
        try {
            await action();
            await fetchInitialData();
            if(successMsg) Swal.fire({ icon: 'success', title: successMsg, toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
            handleClearSelection();
        } catch (error: any) { Swal.fire('Error', error.response?.data?.message || 'La operación falló.', 'error'); }
        finally { setLoading(prev => ({ ...prev, action: false })); }
    }, [fetchInitialData, handleClearSelection]);
    
    const handleMqttSubmit = useCallback(async (entries: { sensorId: string, value: number }[]) => {
        await handleApiAction(async () => {
            for (const entry of entries) {
                const sensor = sensors.find(s => s.id === entry.sensorId);
                if (sensor?.hardwareId) {
                    const topic = `sena/acuaponia/sensors/${sensor.hardwareId}/data`;
                    const payload = JSON.stringify({ value: entry.value, timestamp: new Date().toISOString() });
                    await mqttService.publish(topic, payload);
                }
            }
        }, '¡Datos publicados en MQTT!');
    }, [sensors, handleApiAction]);

    const handleSelectUser = useCallback(async (userId: string) => {
        setSelections({ user: userId, tank: '', sensors: [] });
        if (!userId) { setTanks([]); setSensors([]); return; }
        setLoading(prev => ({ ...prev, tanks: true }));
        try {
            const [tanksData, sensorsData] = await Promise.all([tankService.getTanks(userId), sensorService.getSensors(userId)]);
            setTanks(tanksData);
            setSensors(sensorsData);
            if (tanksData.length > 0) {
                setSelections(prev => ({ ...prev, tank: tanksData[0].id }));
                setExpandedTanks(new Set([tanksData[0].name]));
            }
        } catch (err) { setError("Error al cargar datos del usuario."); }
        finally { setLoading(prev => ({ ...prev, tanks: false })); }
    }, []);
    
    const handleSelectTank = useCallback((tankId: string) => setSelections(prev => ({ ...prev, tank: tankId, sensors: [] })), []);
    const handleToggleSensor = useCallback((sensorId: string) => setSelections(prev => ({ ...prev, sensors: prev.sensors.includes(sensorId) ? prev.sensors.filter(id => id !== sensorId) : [...prev.sensors, sensorId] })), []);
    const handleSelectAllSensors = useCallback(() => setSelections(prev => ({ ...prev, sensors: sensors.filter(s => s.tankId === prev.tank).map(s => s.id) })), [sensors, selections.tank]);
    
    const sensorsForSelectedTank = useMemo(() => sensors.filter(s => s.tankId === selections.tank).sort((a, b) => (SENSOR_ORDER[a.type] || 99) - (SENSOR_ORDER[b.type] || 99)), [sensors, selections.tank]);
    
    const simulatorsByTank = useMemo(() => {
        return activeEmitters
            .sort((a,b) => (SENSOR_ORDER[a.type] || 99) - (SENSOR_ORDER[b.type] || 99))
            .reduce((acc, emitter) => {
                const tankName = emitter.tankName || 'Desconocido';
                if (!acc[tankName]) acc[tankName] = { user: emitter.userName, sensors: [] };
                acc[tankName].sensors.push(emitter);
                return acc;
            }, {} as Record<string, { user: string, sensors: any[] }>);
    }, [activeEmitters]);
    
    const toggleTankExpansion = (tankName: string) => setExpandedTanks(prev => { const newSet = new Set(prev); if (newSet.has(tankName)) newSet.delete(tankName); else newSet.add(tankName); return newSet; });

    if (loading.users) return <LoadingSpinner fullScreen message="Cargando módulo..." />;

    return (
        <div className="space-y-6">
            {loading.action && <div className="fixed top-4 right-4 z-50 animate-in fade-in"><LoadingSpinner size="sm" message="Procesando..."/></div>}
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Recolección y Simulación de Datos</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Herramienta para generar datos de prueba de forma manual o automática.</p>
            </div>
            {error && <div className="p-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400 flex items-center"><AlertCircle className="inline w-5 h-5 mr-3"/>{error}</div>}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <Card title="Configuración de Simulación">
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="label flex items-center"><Users className="w-4 h-4 mr-2"/>Usuario</label>
                                <select className="form-select" value={selections.user} onChange={(e) => handleSelectUser(e.target.value)} disabled={loading.tanks}>
                                    <option value="">Seleccione...</option>
                                    {users.map((user: User) => <option key={user.id} value={user.id}>{user.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="label flex items-center"><MapPin className="w-4 h-4 mr-2"/>Tanque</label>
                                <select className="form-select" value={selections.tank} onChange={(e) => handleSelectTank(e.target.value)} disabled={!selections.user || loading.tanks}>
                                    <option value="">{loading.tanks ? "Cargando..." : "Seleccione..."}</option>
                                    {tanks.map((tank: Tank) => <option key={tank.id} value={tank.id}>{tank.name}</option>)}
                                </select>
                            </div>
                        </div>
                        {selections.tank && (
                            <div className="border-t border-gray-200 dark:border-gray-700 pt-6 animate-in fade-in duration-300">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-semibold text-gray-900 dark:text-white">Sensores Disponibles ({sensorsForSelectedTank.length})</h3>
                                    <div className="flex space-x-2">
                                        <button onClick={handleSelectAllSensors} title="Seleccionar Todos" disabled={sensorsForSelectedTank.length === 0} className="btn-secondary px-2 py-1"><CheckSquare className="w-4 h-4"/></button>
                                        <button onClick={handleClearSelection} title="Limpiar Selección" disabled={selections.sensors.length === 0} className="btn-secondary px-2 py-1"><Square className="w-4 h-4"/></button>
                                    </div>
                                </div>
                                {loading.tanks ? <LoadingSpinner /> : sensorsForSelectedTank.length > 0 ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                        {sensorsForSelectedTank.map(sensor => <SensorCard key={sensor.id} sensor={sensor} isSelected={selections.sensors.includes(sensor.id)} onToggle={() => handleToggleSensor(sensor.id)} />)}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-gray-500 dark:text-gray-400"><Cpu className="w-10 h-10 mx-auto mb-2 opacity-50"/><p>Este tanque no tiene sensores.</p></div>
                                )}
                            </div>
                        )}
                    </div>
                </Card>
                
                {selections.sensors.length > 0 && (
                    <Card title={`Acción a Realizar (${selections.sensors.length} seleccionados)`} className="animate-in fade-in duration-500 lg:sticky lg:top-6">
                        <div className="flex bg-gray-100 dark:bg-gray-900/50 p-1 rounded-lg">
                            <button onClick={() => setMode('manual')} className={cn("w-1/2 py-2 text-sm font-semibold rounded-md transition-colors flex items-center justify-center gap-2", mode === 'manual' ? 'bg-white dark:bg-sena-blue text-sena-blue shadow' : 'text-gray-600 dark:text-gray-300')}><Send className="w-4 h-4"/>Envío Manual</button>
                            <button onClick={() => setMode('emitter')} className={cn("w-1/2 py-2 text-sm font-semibold rounded-md transition-colors flex items-center justify-center gap-2", mode === 'emitter' ? 'bg-white dark:bg-sena-green text-sena-green shadow' : 'text-gray-600 dark:text-gray-300')}><Bot className="w-4 h-4"/>Simulador</button>
                        </div>
                        <div className="mt-4">
                            {mode === 'manual' ? (
                                <ManualEntryForm selectedSensors={sensors.filter(s => selections.sensors.includes(s.id))} onSubmit={handleMqttSubmit} isSubmitting={loading.action} />
                            ) : (
                                <div className="p-4 text-center bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <button onClick={() => handleApiAction(() => dataService.startEmitter(selections.sensors), 'Simulación iniciada.')} disabled={loading.action} className="w-full btn-primary flex items-center justify-center gap-2">
                                        {loading.action ? <LoadingSpinner bare size="sm" /> : <><Play className="w-5 h-5" /><span>Iniciar Simulación</span></>}
                                    </button>
                                </div>
                            )}
                        </div>
                    </Card>
                )}
            </div>

            {activeEmitters.length > 0 && (
                 <Card title="Panel de Control de Simuladores" icon={Bot}>
                     <div className="space-y-4">
                         {Object.entries(simulatorsByTank).map(([tankName, { user, sensors: tankSensors }]) => (
                             <div key={tankName} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                                 <button onClick={() => toggleTankExpansion(tankName)} className="w-full flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700/80 transition-colors">
                                     <div className="flex items-center gap-3"><MapPin className="w-5 h-5 text-sena-blue"/><h3 className="font-semibold text-gray-800 dark:text-white">{tankName}<span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">({user})</span></h3></div>
                                     <div className="flex items-center gap-4">
                                         <div className="flex items-center gap-3 text-xs text-green-600"><div className="w-2 h-2 rounded-full bg-sena-green animate-pulse"></div>{tankSensors.length} Activo(s)</div>
                                         <ChevronDown className={cn("w-5 h-5 text-gray-500 transition-transform", expandedTanks.has(tankName) && "rotate-180")} />
                                     </div>
                                 </button>
                                 {expandedTanks.has(tankName) && (
                                     <div className="bg-white dark:bg-gray-800 p-2">
                                         <div className="flex justify-end gap-2 mb-2 px-1">
                                            <button onClick={() => handleApiAction(() => Promise.all(tankSensors.map(e => dataService.stopEmitter(e.sensorId))), `Simulaciones terminadas para ${tankName}.`)} disabled={tankSensors.length === 0 || loading.action} className="btn-secondary bg-red-100 hover:bg-red-200 dark:bg-red-900/50 dark:hover:bg-red-900/80 text-red-600 dark:text-red-300 px-2 py-1 text-xs flex items-center gap-1.5"><StopCircle className="w-4 h-4"/>Terminar Todo</button>
                                         </div>
                                         <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                                            {tankSensors.map(emitter => 
                                                <ActiveEmitterRow key={emitter.sensorId} emitter={emitter} onStop={() => handleApiAction(() => dataService.stopEmitter(emitter.sensorId), `Simulación terminada para ${emitter.sensorName}`)} />
                                            )}
                                         </div>
                                     </div>
                                 )}
                             </div>
                         ))}
                     </div>
                 </Card>
            )}
        </div>
    );
};