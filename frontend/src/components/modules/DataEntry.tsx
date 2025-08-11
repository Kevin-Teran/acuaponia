import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
    SlidersHorizontal, Send, Bot, Play, StopCircle, Cpu, AlertCircle, ChevronDown, MapPin
} from 'lucide-react';
import mqtt, { MqttClient } from 'mqtt';
import { Card } from '../common/Card';
import { LoadingSpinner } from '../common/LoadingSpinner';
import Swal from 'sweetalert2';
import { cn } from '../../utils/cn';
import * as userService from '../../services/userService';
import * as tankService from '../../services/tankService';
import * as sensorService from '../../services/sensorService';
import * as dataService from '../../services/dataService';
import { User, Tank, Sensor } from '../../types';

const MQTT_URL = import.meta.env.VITE_MQTT_URL || 'ws://localhost:9001';
let mqttClient: MqttClient | null = null;

/**
 * @typedef {import('../../types').SensorType} SensorType
 */

/**
 * Traduce el tipo de sensor a un formato legible en español.
 * @param {SensorType} type - El tipo de sensor (ej. 'TEMPERATURE').
 * @returns {string} El nombre del sensor en español.
 */
const translateSensorType = (type: Sensor['type']): string => ({
    TEMPERATURE: 'temperatura', PH: 'pH', OXYGEN: 'oxígeno'
})[type] || type.toLowerCase();

/**
 * @component ManualEntryForm
 * @description Formulario para la entrada y envío manual de lecturas de sensores.
 * @param {{
 * selectedSensors: Sensor[];
 * onSubmit: (entries: { sensorId: string; value: number }[]) => Promise<void>;
 * }} props - Propiedades del componente.
 * @returns {React.ReactElement}
 */
const ManualEntryForm: React.FC<{
  selectedSensors: Sensor[];
  onSubmit: (entries: { sensorId: string; value: number }[]) => Promise<void>;
}> = ({ selectedSensors, onSubmit }) => {
    const [values, setValues] = useState<Record<string, string>>({});

    useEffect(() => {
        const initialValues: Record<string, string> = {};
        selectedSensors.forEach((sensor: Sensor) => {
            if (values[sensor.id]) return;
            if (sensor.type === 'PH') initialValues[sensor.id] = '7.0';
            else if (sensor.type === 'OXYGEN') initialValues[sensor.id] = '8.0';
            else initialValues[sensor.id] = '25.0';
        });
        setValues(prev => ({...prev, ...initialValues}));
    }, [selectedSensors]);

    const handleValueChange = (sensorId: string, value: string) => setValues(prev => ({...prev, [sensorId]: value }));

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        const entries = selectedSensors.map((sensor: Sensor) => ({
            sensorId: sensor.id,
            value: parseFloat(values[sensor.id])
        })).filter((entry: { value: number; }) => !isNaN(entry.value));

        if (entries.length > 0) await onSubmit(entries);
        else Swal.fire('Atención', "No hay datos válidos para enviar.", 'warning');
    }, [selectedSensors, values, onSubmit]);

    return (
        <Card title="2. Envío de Datos Manuales (Vía MQTT)" icon={Send} subtitle="Define y publica lecturas únicas como si fueras un sensor real.">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                    {selectedSensors.length > 0 ? selectedSensors.map((sensor: Sensor) => (
                        <div key={sensor.id} className="grid grid-cols-3 gap-2 items-center">
                            <label htmlFor={`manual-${sensor.id}`} className="label col-span-1 truncate">{sensor.name}</label>
                            <input id={`manual-${sensor.id}`} type="number" step="0.1" value={values[sensor.id] || ''} onChange={e => handleValueChange(sensor.id, e.target.value)} className="form-input col-span-2" required />
                        </div>
                    )) : (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                             <Send className="w-10 h-10 mx-auto mb-2 opacity-50" />
                            <p>Seleccione uno o más sensores para enviar datos manualmente.</p>
                        </div>
                    )}
                </div>
                <button type="submit" disabled={selectedSensors.length === 0} className="w-full btn-primary">
                    <Send className="w-5 h-5" />
                    <span>Publicar {selectedSensors.length > 0 ? `(${selectedSensors.length})` : ''} Dato(s) en MQTT</span>
                </button>
            </form>
        </Card>
    );
};

/**
 * @component SimulatorControls
 * @description Controles para iniciar y detener la simulación de datos en el backend.
 * @param {{
 * selectedSensorIds: string[];
 * onStart: () => Promise<void>;
 * }} props - Propiedades del componente.
 * @returns {React.ReactElement}
 */
const SimulatorControls: React.FC<{
  selectedSensorIds: string[];
  onStart: () => Promise<void>;
}> = ({ selectedSensorIds, onStart }) => {
    return (
        <Card title="2. Simulador de Sensores (Vía API)" icon={Bot} subtitle="Inicia procesos en el servidor para enviar datos simulados.">
             <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Bot className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="mb-4">Seleccione los sensores y haga clic en 'Iniciar' para que el servidor comience a enviar datos simulados cada 5 segundos.</p>
                <button onClick={onStart} disabled={selectedSensorIds.length === 0} className="w-full btn-primary">
                    <Play className="w-5 h-5" />
                    <span>Iniciar Simulación ({selectedSensorIds.length})</span>
                </button>
            </div>
        </Card>
    );
};

/**
 * @component ActiveEmittersList
 * @description Muestra los procesos de simulación activos, agrupados por tanque.
 * @param {{
 * activeEmitters: any[];
 * onStop: (id: string) => void;
 * }} props - Propiedades del componente.
 * @returns {React.ReactElement}
 */
const ActiveEmittersList: React.FC<{ activeEmitters: any[], onStop: (id: string) => void }> = ({ activeEmitters, onStop }) => {
    const [expandedTanks, setExpandedTanks] = useState<Set<string>>(new Set());

    const emittersByTank = useMemo(() => {
        return activeEmitters.reduce((acc, emitter) => {
            const tankName = emitter.tankName || 'Tanque Desconocido';
            if (!acc[tankName]) {
                acc[tankName] = [];
            }
            acc[tankName].push(emitter);
            return acc;
        }, {} as Record<string, any[]>);
    }, [activeEmitters]);

    useEffect(() => {
        const tankNames = Object.keys(emittersByTank);
        if (tankNames.length > 0 && expandedTanks.size === 0) {
            setExpandedTanks(new Set([tankNames[0]]));
        }
    }, [emittersByTank, expandedTanks.size]);

    const toggleTankExpansion = useCallback((tankName: string) => {
        setExpandedTanks(prev => {
            const newSet = new Set(prev);
            newSet.has(tankName) ? newSet.delete(tankName) : newSet.add(tankName);
            return newSet;
        });
    }, []);

    if (activeEmitters.length === 0) {
        return (
            <Card title="3. Procesos Activos" icon={Cpu}>
                <p className="text-sm text-gray-500 italic p-4 text-center">No hay simulaciones activas en este momento.</p>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                <Cpu className="w-6 h-6 mr-3 text-sena-green" />
                3. Procesos Activos
            </h2>
            {Object.entries(emittersByTank).map(([tankName, emitters]) => {
                const isExpanded = expandedTanks.has(tankName);
                return (
                    <Card key={tankName} className="p-0 overflow-hidden">
                        <header
                            className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 cursor-pointer"
                            onClick={() => toggleTankExpansion(tankName)}
                        >
                            <div className="flex items-center space-x-4 min-w-0">
                                <MapPin className="w-6 h-6 text-sena-blue flex-shrink-0" />
                                <div>
                                    <h3 className="font-semibold text-lg truncate text-gray-900 dark:text-white">{tankName}</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{emitters[0].userName}</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-4 flex-shrink-0">
                                <span className="text-sm font-medium text-white bg-sena-green rounded-full px-3 py-1">{emitters.length} Activo(s)</span>
                                <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded && "rotate-180"}`} />
                            </div>
                        </header>
                        {isExpanded && (
                            <div className="p-4 border-t dark:border-gray-700 space-y-2">
                                {emitters.map((emitter) => (
                                    <div key={emitter.sensorId} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded-md shadow-sm">
                                        <div className="flex items-center space-x-2">
                                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                            <div>
                                                <p className="font-semibold text-sm text-gray-900 dark:text-white">{emitter.sensorName}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{translateSensorType(emitter.type)}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => onStop(emitter.sensorId)}
                                            className="p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-md"
                                            title="Detener Simulación"
                                        >
                                            <StopCircle className="w-4 h-4"/>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                );
            })}
        </div>
    );
};


/**
 * @component DataEntry
 * @description Módulo para administradores que permite la inyección de datos manuales
 * y la simulación de lecturas de sensores en tiempo real. La entrada manual se realiza
 * publicando mensajes en un broker MQTT para simular un dispositivo IoT real.
 * @returns {React.ReactElement}
 */
export const DataEntry: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [tanks, setTanks] = useState<Tank[]>([]);
    const [sensors, setSensors] = useState<Sensor[]>([]);
    const [loading, setLoading] = useState({ users: true, tanks: false, sensors: false, action: false });
    const [error, setError] = useState<string | null>(null);
    const [selections, setSelections] = useState<{ user: string; tank: string; sensors: string[] }>({ user: '', tank: '', sensors: [] });
    const [activeEmitters, setActiveEmitters] = useState<any[]>([]);
    const [mode, setMode] = useState<'manual' | 'emitter'>('manual');

    useEffect(() => {
        if (!mqttClient) {
            mqttClient = mqtt.connect(MQTT_URL);
            mqttClient.on('connect', () => console.log('🔌 Conectado al broker MQTT para simulación.'));
            mqttClient.on('error', (err) => console.error('Error de conexión MQTT:', err));
        }

        return () => {
            if (mqttClient) {
                mqttClient.end();
                mqttClient = null;
            }
        };
    }, []);

    const fetchInitialData = useCallback(async () => {
        try {
            setLoading(prev => ({ ...prev, users: true, action: false, tanks: false, sensors: false }));
            const [usersData, emittersData] = await Promise.all([
                userService.getAllUsers(),
                dataService.getEmitterStatus()
            ]);
            setUsers(usersData);
            setActiveEmitters(emittersData || []);
        } catch (err) {
            setError("No se pudieron cargar los datos iniciales. Verifique la conexión.");
        } finally {
            setLoading(prev => ({ ...prev, users: false }));
        }
    }, []);

    useEffect(() => { fetchInitialData(); }, [fetchInitialData]);

    const handleSelectUser = useCallback(async (userId: string) => {
        setSelections({ user: userId, tank: '', sensors: [] });
        setTanks([]);
        setSensors([]);
        if (userId) {
            setLoading(prev => ({ ...prev, tanks: true, sensors: true }));
            try {
                const [tanksData, sensorsData] = await Promise.all([
                    tankService.getTanks(userId),
                    sensorService.getSensors(userId)
                ]);
                setTanks(tanksData);
                setSensors(sensorsData);
                if (tanksData.length > 0) {
                    setSelections(prev => ({ ...prev, tank: tanksData[0].id }));
                }
            } catch {
                setError("No se pudieron cargar los tanques y sensores del usuario.");
            } finally {
                setLoading(prev => ({ ...prev, tanks: false, sensors: false }));
            }
        }
    }, []);

    const handleSelectTank = useCallback(async (tankId: string) => {
        setSelections(prev => ({ ...prev, tank: tankId, sensors: [] }));
    }, []);

    const handleToggleSensor = useCallback((sensorId: string) => {
        setSelections(prev => ({
            ...prev,
            sensors: prev.sensors.includes(sensorId) ? prev.sensors.filter(id => id !== sensorId) : [...prev.sensors, sensorId]
        }));
    }, []);

    const handleApiAction = useCallback(async (action: () => Promise<any>, successMsg: string) => {
        setLoading(prev => ({ ...prev, action: true }));
        try {
            await action();
            const emitters = await dataService.getEmitterStatus();
            setActiveEmitters(emitters || []);
            Swal.fire({ icon: 'success', title: successMsg, toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
            setSelections(prev => ({...prev, sensors: []}));
        } catch (error: any) {
            Swal.fire('Error', error.response?.data?.message || 'La operación no se pudo completar.', 'error');
        } finally {
            setLoading(prev => ({ ...prev, action: false }));
        }
    }, []);

    const handleMqttSubmit = useCallback(async (entries: { sensorId: string; value: number }[]) => {
        if (!mqttClient || !mqttClient.connected) {
            Swal.fire('Error de Conexión', 'No se puede publicar, el cliente MQTT no está conectado.', 'error');
            return;
        }

        setLoading(prev => ({ ...prev, action: true }));
        try {
            const sensorsToPublish = sensors.filter(s => entries.some(e => e.sensorId === s.id));

            for (const entry of entries) {
                const sensor = sensorsToPublish.find(s => s.id === entry.sensorId);
                if (sensor && sensor.hardwareId) {
                    const topic = `sena/acuaponia/sensors/${sensor.hardwareId}/data`;
                    const payload = JSON.stringify({
                        value: entry.value,
                        timestamp: new Date().toISOString()
                    });
                    mqttClient.publish(topic, payload);
                }
            }

            Swal.fire({ icon: 'success', title: 'Datos publicados en MQTT!', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
            setSelections(prev => ({...prev, sensors: []}));
        } catch (error: any) {
            Swal.fire('Error', 'Ocurrió un problema al publicar los datos en MQTT.', 'error');
        } finally {
            setLoading(prev => ({ ...prev, action: false }));
        }
    }, [sensors]);

    const sensorsForSelectedTank = useMemo(() =>
        sensors.filter(sensor => sensor.tankId === selections.tank),
    [sensors, selections.tank]);

    const selectedSensorObjects = useMemo(() =>
        sensors.filter(s => selections.sensors.includes(s.id)),
    [sensors, selections.sensors]);

    if (loading.users) {
        return <LoadingSpinner fullScreen message="Cargando módulo de recolección..." />;
    }

    return (
        <div className="space-y-6 relative">
            {loading.action && <LoadingSpinner fullScreen message="Procesando solicitud..." />}

            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Recolección de Datos</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Herramientas de prueba y simulación para administradores.</p>
            </div>

            <Card className="bg-gradient-to-r from-sena-orange to-orange-600 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-orange-100">Simulaciones Activas (Backend)</p>
                        <p className="text-3xl font-bold">{activeEmitters.length}</p>
                    </div>
                    <Cpu className="w-12 h-12 text-orange-200" />
                </div>
            </Card>

            {error && <div className="p-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400"><AlertCircle className="inline w-5 h-5 mr-2"/>{error}</div>}

            <Card title="1. Panel de Control" icon={SlidersHorizontal}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div>
                        <label className="label">Usuario</label>
                        <select className="form-select" value={selections.user} onChange={(e) => handleSelectUser(e.target.value)} disabled={loading.users}>
                            <option value="">{loading.users ? "Cargando..." : "Seleccione un usuario"}</option>
                            {users.map((user: User) => <option key={user.id} value={user.id}>{user.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="label">Tanque</label>
                        <select className="form-select" value={selections.tank} onChange={(e) => handleSelectTank(e.target.value)} disabled={loading.tanks || !selections.user}>
                            <option value="">{loading.tanks ? "Cargando..." : "Seleccione un tanque"}</option>
                            {tanks.map((tank: Tank) => <option key={tank.id} value={tank.id}>{tank.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="label">Sensores a Afectar</label>
                        <div className="mt-1 space-y-2 max-h-48 overflow-y-auto p-2 border rounded-md dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50">
                            {loading.sensors ? <div className="text-center py-4"><LoadingSpinner size="sm" /></div> :
                            sensorsForSelectedTank.length > 0 ? sensorsForSelectedTank.map((sensor: Sensor) => (
                                <div key={sensor.id} className="flex items-center">
                                    <input id={`sensor-${sensor.id}`} type="checkbox" checked={selections.sensors.includes(sensor.id)} onChange={() => handleToggleSensor(sensor.id)} className="h-4 w-4 rounded border-gray-300 text-sena-green focus:ring-sena-green"/>
                                    <label htmlFor={`sensor-${sensor.id}`} className="ml-3 text-sm text-gray-700 dark:text-gray-300 capitalize">{sensor.name} ({translateSensorType(sensor.type)})</label>
                                </div>
                            )) : <p className="text-sm text-gray-500 p-4 text-center">Seleccione un tanque para ver sensores.</p>}
                        </div>
                    </div>
                </div>
                <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700 text-center">
                     <label className="label text-center mb-2">Modo de Envío</label>
                     <div className="flex bg-gray-100 dark:bg-gray-900/50 p-1 rounded-lg max-w-sm mx-auto">
                        <button onClick={() => setMode('manual')} className={cn("w-1/2 py-2 text-sm font-semibold rounded-md transition-colors", mode === 'manual' ? 'bg-white dark:bg-sena-blue text-sena-blue shadow' : 'text-gray-600 dark:text-gray-300')}>Simulador MQTT</button>
                        <button onClick={() => setMode('emitter')} className={cn("w-1/2 py-2 text-sm font-semibold rounded-md transition-colors", mode === 'emitter' ? 'bg-white dark:bg-sena-green text-sena-green shadow' : 'text-gray-600 dark:text-gray-300')}>Simulador Backend</button>
                     </div>
                </div>
            </Card>

            {mode === 'manual' ? (
                <ManualEntryForm
                    selectedSensors={selectedSensorObjects}
                    onSubmit={handleMqttSubmit}
                />
            ) : (
                <SimulatorControls
                    selectedSensorIds={selections.sensors}
                    onStart={() => handleApiAction(() => dataService.startEmitter(selections.sensors), 'Simulación de backend iniciada.')}
                />
            )}

            <ActiveEmittersList
                activeEmitters={activeEmitters}
                onStop={(id) => handleApiAction(() => dataService.stopEmitter(id), 'Simulación de backend detenida.')}
            />
        </div>
    );
};