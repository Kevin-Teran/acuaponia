import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
    Users, MapPin, Cpu, CheckSquare, Square, Bot, Send, Play, StopCircle, AlertCircle, Timer, ChevronDown, Repeat
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
import { useAuth } from '../../hooks/useAuth';

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
 * @param {object} props - Propiedades del componente.
 * @param {Sensor} props.sensor - El objeto del sensor a mostrar.
 * @param {boolean} props.isSelected - Indica si la tarjeta está seleccionada.
 * @param {() => void} props.onToggle - Función a ejecutar al hacer clic.
 * @returns {React.ReactElement}
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
 * @component SensorSkeleton
 * @description Componente de placeholder para simular la carga de las tarjetas de sensor.
 * @returns {React.ReactElement}
 */
const SensorSkeleton: React.FC = () => (
    <div className="p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 animate-pulse">
        <div className="w-12 h-12 mb-3 rounded-full bg-gray-200 dark:bg-gray-700 mx-auto"></div>
        <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded-md mx-auto mb-2"></div>
        <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded-md mx-auto"></div>
    </div>
);

/**
 * @component ManualEntryForm
 * @description Formulario para enviar valores individuales para cada sensor seleccionado vía MQTT.
 * @param {object} props - Propiedades del componente.
 * @param {Sensor[]} props.selectedSensors - Array de sensores seleccionados.
 * @param {(entries: { sensorId: string; value: number }[]) => Promise<void>} props.onSubmit - Función a ejecutar al enviar el formulario.
 * @param {boolean} props.isSubmitting - Indica si se está procesando un envío.
 * @returns {React.ReactElement}
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
        if (entries.length > 0) {
            await onSubmit(entries);
        } else {
            Swal.fire('Atención', "No hay datos válidos para enviar.", 'warning');
        }
    }, [selectedSensors, values, onSubmit]);

    return (
        <form onSubmit={handleSubmit} className="space-y-4 p-4">
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                {selectedSensors.map(sensor => (
                    <div key={sensor.id} className="grid grid-cols-3 gap-3 items-center">
                        <label htmlFor={`manual-${sensor.id}`} className="label col-span-1 truncate">{sensor.name}</label>
                        <input id={`manual-${sensor.id}`} type="number" step="0.1" value={values[sensor.id] || ''} onChange={e => handleValueChange(sensor.id, e.target.value)} className="form-input col-span-2" required />
                    </div>
                ))}
            </div>
            <div className="flex items-center justify-end pt-4 border-t dark:border-gray-700">
                <button type="submit" disabled={selectedSensors.length === 0 || isSubmitting} className="btn-primary min-w-[160px]">
                    {isSubmitting ? <LoadingSpinner bare size="sm" /> : <><Send className="w-5 h-5 mr-2" /><span>Enviar Valores</span></>}
                </button>
            </div>
        </form>
    );
};

/**
 * @component ActiveEmitterRow
 * @description Fila individual para un simulador activo, mostrando temporizador y control de parada.
 * @param {object} props - Propiedades del componente.
 * @param {any} props.emitter - Datos del emisor activo.
 * @param {() => void} props.onStop - Función para detener el emisor.
 * @param {boolean} props.isStopping - Indica si se está procesando la detención.
 * @returns {React.ReactElement}
 */
const ActiveEmitterRow: React.FC<{ emitter: any; onStop: () => void; isStopping: boolean }> = ({ emitter, onStop, isStopping }) => {
    const { time: elapsedTime, totalSeconds } = useTimer(emitter.startTime);
    const totalPackets = Math.floor(totalSeconds / 5);

    return (
        <div className="flex items-center justify-between p-3">
            <div className="flex items-center space-x-3 min-w-0">
                <div className="w-2 h-2 rounded-full bg-sena-green animate-pulse flex-shrink-0"></div>
                <Cpu className="w-5 h-5 text-gray-400 flex-shrink-0"/>
                <div className="flex-grow min-w-0">
                    <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{emitter.sensorName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{emitter.tankName} ({emitter.userName})</p>
                </div>
            </div>
            <div className="flex items-center space-x-4 flex-shrink-0">
                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 font-mono" title="Paquetes enviados">
                    <Repeat className="w-4 h-4 mr-1.5"/>{totalPackets}
                </div>
                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 font-mono" title="Tiempo de ejecución">
                    <Timer className="w-4 h-4 mr-1.5"/>{elapsedTime}
                </div>
                <button onClick={onStop} disabled={isStopping} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full disabled:opacity-50 disabled:cursor-wait" title="Terminar Proceso">
                    {isStopping ? <LoadingSpinner bare size="sm" /> : <StopCircle className="w-5 h-5"/>}
                </button>
            </div>
        </div>
    );
};

/**
 * @component DataEntry
 * @description Módulo principal con flujo unificado para la recolección y simulación de datos.
 * @returns {React.ReactElement}
 */
export const DataEntry: React.FC = () => {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [tanks, setTanks] = useState<Tank[]>([]);
    const [sensors, setSensors] = useState<Sensor[]>([]);
    const [activeEmitters, setActiveEmitters] = useState<any[]>([]);
    const [selections, setSelections] = useState<{ user: string; tank: string; sensors: string[] }>({ user: '', tank: '', sensors: [] });
    
    const [loading, setLoading] = useState({ initial: true, users: true, tanks: false, submittingManual: false, startingEmitter: false });
    const [stoppingEmitters, setStoppingEmitters] = useState<Set<string>>(new Set());
    const [stoppingAll, setStoppingAll] = useState<Set<string>>(new Set());
    
    const [error, setError] = useState<string | null>(null);
    const [mode, setMode] = useState<'manual' | 'emitter'>('manual');
    const [expandedTanks, setExpandedTanks] = useState<Set<string>>(new Set());

    const handleClearSelection = useCallback(() => setSelections(prev => ({ ...prev, sensors: [] })), []);

    const fetchInitialData = useCallback(async () => {
        try {
            const emittersData = await dataService.getEmitterStatus();
            setActiveEmitters(emittersData || []);
            if (users.length === 0) {
                setLoading(prev => ({...prev, users: true}));
                const usersData = await userService.getAllUsers();
                setUsers(usersData);
            }
        } catch (err) { setError("No se pudieron cargar los datos iniciales."); }
        finally { setLoading(prev => ({ ...prev, initial: false, users: false })); }
    }, [users.length]);

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
            if (tanksData.length > 0) {
                const firstTankId = tanksData[0].id;
                setSelections(prev => ({ ...prev, tank: firstTankId }));
                setExpandedTanks(new Set([tanksData.find(t=>t.id === firstTankId)!.name]));
            } else {
                setExpandedTanks(new Set());
            }
        } catch (err) { setError("Error al cargar datos del usuario."); }
        finally { setLoading(prev => ({ ...prev, tanks: false })); }
    }, []);

    useEffect(() => {
        if (currentUser && users.length > 0 && !selections.user) {
            handleSelectUser(currentUser.id);
        }
    }, [currentUser, users, selections.user, handleSelectUser]);
    
    const handleMqttSubmit = useCallback(async (entries: { sensorId: string, value: number }[]) => {
        setLoading(prev => ({ ...prev, submittingManual: true }));
        try {
            for (const entry of entries) {
                const sensor = sensors.find(s => s.id === entry.sensorId);
                if (sensor?.hardwareId) {
                    const topic = `sena/acuaponia/sensors/${sensor.hardwareId}/data`;
                    const payload = JSON.stringify({ value: entry.value, timestamp: new Date().toISOString() });
                    await mqttService.publish(topic, payload);
                }
            }
        } catch (error: any) {
            Swal.fire('Error', error.response?.data?.message || 'La publicación en MQTT falló.', 'error');
        } finally {
            setLoading(prev => ({ ...prev, submittingManual: false }));
        }
    }, [sensors]);

    const handleStartEmitters = useCallback(async () => {
        setLoading(prev => ({ ...prev, startingEmitter: true }));
        try {
            await dataService.startEmitter(selections.sensors);
            await fetchInitialData();
            Swal.fire({ icon: 'success', title: 'Simulación iniciada', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
            handleClearSelection();
        } catch (error: any) {
            Swal.fire('Error', error.response?.data?.message || 'No se pudo iniciar la simulación.', 'error');
        } finally {
            setLoading(prev => ({ ...prev, startingEmitter: false }));
        }
    }, [selections.sensors, fetchInitialData, handleClearSelection]);

    const handleStopEmitter = useCallback(async (sensorId: string) => {
        setStoppingEmitters(prev => new Set(prev).add(sensorId));
        try {
            await dataService.stopEmitter(sensorId);
            await fetchInitialData();
        } catch (error: any) {
            const sensorName = activeEmitters.find(e => e.sensorId === sensorId)?.sensorName || `ID ${sensorId}`;
            Swal.fire('Error', `No se pudo detener la simulación para ${sensorName}.`, 'error');
        } finally {
            setStoppingEmitters(prev => {
                const newSet = new Set(prev);
                newSet.delete(sensorId);
                return newSet;
            });
        }
    }, [activeEmitters, fetchInitialData]);

    const handleStopAllForTank = useCallback(async (tankName: string, sensorIds: string[]) => {
        setStoppingAll(prev => new Set(prev).add(tankName));
        try {
            await Promise.all(sensorIds.map(id => dataService.stopEmitter(id)));
            await fetchInitialData();
            Swal.fire({ icon: 'success', title: `Simulaciones para ${tankName} detenidas`, toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
        } catch (error) {
            Swal.fire('Error', `No se pudieron detener todas las simulaciones para ${tankName}.`, 'error');
        } finally {
             setStoppingAll(prev => {
                const newSet = new Set(prev);
                newSet.delete(tankName);
                return newSet;
            });
        }
    }, [fetchInitialData]);
    
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

    if (loading.initial) return <LoadingSpinner fullScreen message="Cargando módulo de recolección..." />;

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Recolección y Simulación de Datos</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Herramienta para generar datos de prueba de forma manual o automática.</p>
            </div>
            {error && <div className="p-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400 flex items-center"><AlertCircle className="inline w-5 h-5 mr-3"/>{error}</div>}

            <Card title="Configuración de Simulación">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <div className="space-y-6">
                        <div>
                            <label className="label flex items-center"><Users className="w-4 h-4 mr-2"/>Usuario</label>
                            <select className="form-select" value={selections.user} onChange={(e) => handleSelectUser(e.target.value)} disabled={loading.tanks || loading.users}>
                                <option value="">{loading.users ? "Cargando..." : "Seleccione..."}</option>
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
                    
                    <div>
                        {selections.tank && (
                            <div className="animate-in fade-in duration-300">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-semibold text-gray-900 dark:text-white">Sensores Disponibles ({sensorsForSelectedTank.length})</h3>
                                    <div className="flex space-x-2">
                                        <button onClick={handleSelectAllSensors} title="Seleccionar Todos" disabled={sensorsForSelectedTank.length === 0} className="btn-secondary px-2 py-1"><CheckSquare className="w-4 h-4"/></button>
                                        <button onClick={handleClearSelection} title="Limpiar Selección" disabled={selections.sensors.length === 0} className="btn-secondary px-2 py-1"><Square className="w-4 h-4"/></button>
                                    </div>
                                </div>
                                {loading.tanks ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                        <SensorSkeleton /><SensorSkeleton /><SensorSkeleton />
                                    </div>
                                ) : sensorsForSelectedTank.length > 0 ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                        {sensorsForSelectedTank.map(sensor => <SensorCard key={sensor.id} sensor={sensor} isSelected={selections.sensors.includes(sensor.id)} onToggle={() => handleToggleSensor(sensor.id)} />)}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-gray-500 dark:text-gray-400"><Cpu className="w-10 h-10 mx-auto mb-2 opacity-50"/><p>Este tanque no tiene sensores.</p></div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </Card>
            
            {selections.sensors.length > 0 && (
                <div className="animate-in fade-in duration-500">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Acción a Realizar ({selections.sensors.length} seleccionados)</h2>
                    <div className="bg-white dark:bg-gray-800 p-2 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                        <div className="flex rounded-md overflow-hidden bg-gray-100 dark:bg-gray-900/50">
                            <button onClick={() => setMode('manual')} className={cn("w-1/2 py-3 text-sm font-semibold transition-colors flex items-center justify-center gap-2", mode === 'manual' ? 'bg-white dark:bg-sena-blue text-sena-blue shadow' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700')}><Send className="w-5 h-5"/>Envío Manual</button>
                            <button onClick={() => setMode('emitter')} className={cn("w-1/2 py-3 text-sm font-semibold transition-colors flex items-center justify-center gap-2", mode === 'emitter' ? 'bg-white dark:bg-sena-green text-sena-green shadow' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700')}><Bot className="w-5 h-5"/>Simulador</button>
                        </div>
                        {mode === 'manual' ? (
                            <div className="mt-2">
                                <ManualEntryForm selectedSensors={sensors.filter(s => selections.sensors.includes(s.id))} onSubmit={handleMqttSubmit} isSubmitting={loading.submittingManual} />
                            </div>
                        ) : (
                             <div className="mt-2 p-4">
                                <button onClick={handleStartEmitters} disabled={loading.startingEmitter || selections.sensors.length === 0} className="w-full btn-primary py-3 text-base flex items-center justify-center gap-2">
                                    {loading.startingEmitter ? <LoadingSpinner bare size="sm" /> : <><Play className="w-6 h-6" /><span>Iniciar Simulación</span></>}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeEmitters.length > 0 && (
                 <Card title="Panel de Control de Simuladores" icon={Bot}>
                     <div className="space-y-4">
                         {Object.entries(simulatorsByTank).map(([tankName, { user, sensors: tankSensors }]) => (
                             <div key={tankName} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                                 <div className="w-full flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50">
                                     <button onClick={() => toggleTankExpansion(tankName)} className="flex-grow flex items-center gap-3 text-left">
                                         <MapPin className="w-5 h-5 text-sena-blue"/>
                                         <h3 className="font-semibold text-gray-800 dark:text-white">{tankName}<span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">({user})</span></h3>
                                     </button>
                                     <div className="flex items-center gap-4">
                                         <div className="flex items-center gap-3 text-xs text-green-600"><div className="w-2 h-2 rounded-full bg-sena-green animate-pulse"></div>{tankSensors.length} Activo(s)</div>
                                         <button
                                            onClick={() => handleStopAllForTank(tankName, tankSensors.map(e => e.sensorId))}
                                            disabled={stoppingAll.has(tankName)}
                                            className="btn-secondary bg-red-100 hover:bg-red-200 dark:bg-red-900/50 dark:hover:bg-red-900/80 text-red-600 dark:text-red-300 px-2 py-1 text-xs flex items-center gap-1.5"
                                         >
                                            {stoppingAll.has(tankName) ? <LoadingSpinner bare size="sm" /> : <><StopCircle className="w-4 h-4"/><span>Terminar Todo</span></>}
                                         </button>
                                         <button onClick={() => toggleTankExpansion(tankName)}>
                                            <ChevronDown className={cn("w-5 h-5 text-gray-500 transition-transform", expandedTanks.has(tankName) && "rotate-180")} />
                                         </button>
                                     </div>
                                 </div>
                                 {expandedTanks.has(tankName) && (
                                     <div className="bg-white dark:bg-gray-800 p-2">
                                         <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                                            {tankSensors.map(emitter => 
                                                <ActiveEmitterRow 
                                                    key={emitter.sensorId} 
                                                    emitter={emitter} 
                                                    onStop={() => handleStopEmitter(emitter.sensorId)}
                                                    isStopping={stoppingEmitters.has(emitter.sensorId)}
                                                />
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