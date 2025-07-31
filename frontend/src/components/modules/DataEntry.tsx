import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
    SlidersHorizontal, Send, Bot, Play, StopCircle, Loader, AlertCircle, Cpu
} from 'lucide-react';
import { Card } from '../common/Card';
import { LoadingSpinner } from '../common/LoadingSpinner';
import Swal from 'sweetalert2';
import { cn } from '../../utils/cn';
import * as userService from '../../services/userService';
import * as tankService from '../../services/tankService';
import * as sensorService from '../../services/sensorService';
import * as dataService from '../../services/dataService';
import { User, Tank, Sensor } from '../../types';

// --- FUNCIONES DE UTILIDAD ---

/**
 * @desc Traduce el tipo de sensor a un formato legible en español.
 * @param {Sensor['type']} type - El tipo de sensor desde la API.
 * @returns {string} El nombre del sensor en español.
 */
const translateSensorType = (type: Sensor['type']): string => {
    const names: Record<string, string> = {
        TEMPERATURE: 'temperatura',
        PH: 'pH',
        OXYGEN: 'oxígeno'
    };
    return names[type] || type.toLowerCase();
};

/**
 * @component DataEntry
 * @description Módulo para administradores que permite la inyección de datos manuales y la simulación de sensores.
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

    const handleSelectUser = async (userId: string) => {
        setSelections({ user: userId, tank: '', sensors: [] });
        setTanks([]);
        setSensors([]);
        if (userId) {
            setLoading(prev => ({ ...prev, tanks: true }));
            try { setTanks(await tankService.getTanksByUser(userId)); }
            catch { setError("No se pudieron cargar los tanques."); }
            finally { setLoading(prev => ({ ...prev, tanks: false })); }
        }
    };
    
    const handleSelectTank = async (tankId: string) => {
        setSelections(prev => ({ ...prev, tank: tankId, sensors: [] }));
        setSensors([]);
        if (tankId) {
            setLoading(prev => ({ ...prev, sensors: true }));
            try { setSensors(await sensorService.getSensorsByTank(tankId)); }
            catch { setError("No se pudieron cargar los sensores."); }
            finally { setLoading(prev => ({ ...prev, sensors: false })); }
        }
    };
    
    const handleToggleSensor = (sensorId: string) => {
        setSelections(prev => ({
            ...prev,
            sensors: prev.sensors.includes(sensorId) ? prev.sensors.filter(id => id !== sensorId) : [...prev.sensors, sensorId]
        }));
    };

    const handleAction = async (action: () => Promise<any>, successMsg: string) => {
        setLoading(prev => ({ ...prev, action: true }));
        try {
            await action();
            const emitters = await dataService.getEmitterStatus();
            setActiveEmitters(emitters || []);
            Swal.fire({ icon: 'success', title: successMsg, toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
            setSelections(prev => ({...prev, sensors: []}));
        } catch (error: any) {
            Swal.fire('Error', error.response?.data?.error?.message || 'La operación no se pudo completar.', 'error');
        } finally {
            setLoading(prev => ({ ...prev, action: false }));
        }
    };

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
                        <p className="text-orange-100">Simulaciones Activas</p>
                        <p className="text-3xl font-bold">{activeEmitters.length}</p>
                    </div>
                    <Cpu className="w-12 h-12 text-orange-200" />
                </div>
            </Card>
            
            {error && <div className="p-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400"><AlertCircle className="inline w-5 h-5 mr-2"/>{error}</div>}

            <Card title="1. Panel de Control" icon={SlidersHorizontal}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Usuario</label>
                        <select className="form-select mt-1" value={selections.user} onChange={(e) => handleSelectUser(e.target.value)} disabled={loading.users}>
                            <option value="">{loading.users ? "Cargando..." : "Seleccione un usuario"}</option>
                            {users.map((user: User) => <option key={user.id} value={user.id}>{user.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tanque</label>
                        <select className="form-select mt-1" value={selections.tank} onChange={(e) => handleSelectTank(e.target.value)} disabled={loading.tanks || !selections.user}>
                            <option value="">{loading.tanks ? "Cargando..." : "Seleccione un tanque"}</option>
                            {tanks.map((tank: Tank) => <option key={tank.id} value={tank.id}>{tank.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sensores a Afectar</label>
                        <div className="mt-1 space-y-2 max-h-48 overflow-y-auto p-2 border rounded-md dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50">
                            {loading.sensors ? <div className="text-center py-4"><Loader className="w-5 h-5 animate-spin mx-auto text-sena-green"/></div> :
                            sensors.length > 0 ? sensors.map((sensor: Sensor) => (
                                <div key={sensor.id} className="flex items-center">
                                    <input id={`sensor-${sensor.id}`} type="checkbox" checked={selections.sensors.includes(sensor.id)} onChange={() => handleToggleSensor(sensor.id)} className="h-4 w-4 rounded border-gray-300 text-sena-green focus:ring-sena-green"/>
                                    <label htmlFor={`sensor-${sensor.id}`} className="ml-3 text-sm text-gray-700 dark:text-gray-300 capitalize">{sensor.name} ({translateSensorType(sensor.type)})</label>
                                </div>
                            )) : <p className="text-sm text-gray-500 p-4 text-center">Seleccione un tanque para ver sensores.</p>}
                        </div>
                    </div>
                </div>
                <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700 text-center">
                     <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Modo de Envío</label>
                     <div className="flex bg-gray-100 dark:bg-gray-900/50 p-1 rounded-lg max-w-sm mx-auto">
                        <button onClick={() => setMode('manual')} className={cn("w-1/2 py-2 text-sm font-semibold rounded-md transition-colors", mode === 'manual' ? 'bg-white dark:bg-sena-blue text-sena-blue shadow' : 'text-gray-600 dark:text-gray-300')}>Entrada Manual</button>
                        <button onClick={() => setMode('emitter')} className={cn("w-1/2 py-2 text-sm font-semibold rounded-md transition-colors", mode === 'emitter' ? 'bg-white dark:bg-sena-green text-sena-green shadow' : 'text-gray-600 dark:text-gray-300')}>Simulador</button>
                     </div>
                </div>
            </Card>

            {mode === 'manual' ? (
                <ManualEntryForm 
                    selectedSensors={selectedSensorObjects}
                    onSubmit={(entries) => handleAction(() => dataService.submitManualEntry(entries), 'Datos manuales enviados.')} 
                />
            ) : (
                <SimulatorControls 
                    selectedSensorIds={selections.sensors}
                    onStart={() => handleAction(() => dataService.startEmitter(selections.sensors), 'Simulación iniciada.')}
                />
            )}
            
            <ActiveEmittersList
                activeEmitters={activeEmitters}
                onStop={(id) => handleAction(() => dataService.stopEmitter(id), 'Simulación detenida.')}
            />
        </div>
    );
};

// --- SUBCOMPONENTES ---

const ManualEntryForm = ({ selectedSensors, onSubmit }: { selectedSensors: Sensor[]; onSubmit: (entries: any[]) => void }) => {
    const [values, setValues] = useState<Record<string, string>>({});
    
    useEffect(() => {
        const initialValues: Record<string, string> = {};
        selectedSensors.forEach(sensor => {
            if (values[sensor.id]) return;
            if (sensor.type === 'PH') initialValues[sensor.id] = '7.0';
            else if (sensor.type === 'OXYGEN') initialValues[sensor.id] = '8.0';
            else initialValues[sensor.id] = '25.0';
        });
        setValues(prev => ({...prev, ...initialValues}));
    }, [selectedSensors]);

    const handleValueChange = (sensorId: string, value: string) => setValues(prev => ({...prev, [sensorId]: value }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const entries = selectedSensors.map(sensor => ({
            sensorId: sensor.id,
            value: parseFloat(values[sensor.id])
        })).filter(entry => !isNaN(entry.value));

        if (entries.length > 0) await onSubmit(entries);
        else Swal.fire('Atención', "No hay datos válidos para enviar.", 'warning');
    };
    
    return (
        <Card title="2. Envío de Datos Manuales" icon={Send} subtitle="Define y envía lecturas únicas a los sensores seleccionados.">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                    {selectedSensors.length > 0 ? selectedSensors.map(sensor => (
                        <div key={sensor.id} className="grid grid-cols-3 gap-2 items-center">
                            <label htmlFor={`manual-${sensor.id}`} className="text-sm font-medium text-gray-700 dark:text-gray-300 col-span-1 truncate">{sensor.name}</label>
                            <input id={`manual-${sensor.id}`} type="number" step="0.1" value={values[sensor.id] || ''} onChange={e => handleValueChange(sensor.id, e.target.value)} className="form-input col-span-2" required />
                        </div>
                    )) : (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                             <Send className="w-10 h-10 mx-auto mb-2 opacity-50" />
                            <p>Seleccione uno o más sensores para enviar datos manualmente.</p>
                        </div>
                    )}
                </div>
                <button type="submit" disabled={selectedSensors.length === 0} className="w-full bg-sena-blue hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center space-x-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    <Send className="w-5 h-5" />
                    <span>Enviar {selectedSensors.length > 0 ? `(${selectedSensors.length})` : ''} Dato(s)</span>
                </button>
            </form>
        </Card>
    );
};

const SimulatorControls = ({ selectedSensorIds, onStart }: { selectedSensorIds: string[], onStart: () => void }) => {
    return (
        <Card title="2. Simulador de Sensores" icon={Bot} subtitle="Inicia procesos en el servidor para enviar datos simulados.">
             <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Bot className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="mb-4">Seleccione los sensores y haga clic en 'Iniciar' para comenzar a enviar datos simulados cada 5 segundos.</p>
                <button onClick={onStart} disabled={selectedSensorIds.length === 0} className="w-full bg-sena-green hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center space-x-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    <Play className="w-5 h-5" />
                    <span>Iniciar Simulación ({selectedSensorIds.length})</span>
                </button>
            </div>
        </Card>
    );
};

const ActiveEmittersList = ({ activeEmitters, onStop }: { activeEmitters: any[], onStop: (id: string) => void }) => (
    <Card title="3. Procesos Activos" icon={Cpu}>
        <div className="space-y-2 max-h-72 overflow-y-auto p-1">
            {activeEmitters && activeEmitters.length > 0 ? activeEmitters.map((emitter: any) => (
                <div key={emitter.sensorId} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800/50 rounded-md shadow-sm">
                    <div>
                        <p className="font-semibold text-sm text-gray-900 dark:text-white">{emitter.sensorName} ({emitter.type})</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{emitter.tankName} / {emitter.userName}</p>
                    </div>
                    <button onClick={() => onStop(emitter.sensorId)} className="p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-md" title="Detener Simulación">
                        <StopCircle className="w-4 h-4"/>
                    </button>
                </div>
            )) : <p className="text-sm text-gray-500 italic p-4 text-center">No hay simulaciones activas en este momento.</p>}
        </div>
    </Card>
);