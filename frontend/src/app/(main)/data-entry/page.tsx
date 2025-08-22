'use client';

/**
 * @page DataEntryPage
 * @route /data-entry
 * @description Módulo para la recolección manual de datos y la gestión de simuladores de sensores.
 * Es una herramienta de administrador para pruebas y generación de datos.
 */
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Users, MapPin, Cpu, CheckSquare, Square, Bot, Send, Play, StopCircle, Timer, ChevronDown, Repeat } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import Swal from 'sweetalert2';
import { clsx } from 'clsx';
import * as userService from '@/services/userService';
import * as tankService from '@/services/tankService';
import * as sensorService from '@/services/sensorService';
import * as dataService from '@/services/dataService';
import { mqttService } from '@/services/mqttService';
import { User, Tank, Sensor, SensorType } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useDataEntry } from '@/hooks/useDataEntry';

// --- Constantes y Funciones de Utilidad ---
const SENSOR_ORDER: Record<SensorType, number> = { 'TEMPERATURE': 1, 'OXYGEN': 2, 'PH': 3, 'LEVEL': 4, 'FLOW': 5 };
const translateSensorType = (type: SensorType): string => ({ TEMPERATURE: 'Temperatura', PH: 'Nivel de pH', OXYGEN: 'Oxígeno Disuelto' }[type] || type);

/**
 * @hook useTimer
 * @description Hook para un temporizador que calcula y formatea el tiempo transcurrido.
 * @param {Date | string | undefined} startTime - La fecha y hora de inicio.
 * @returns {{ time: string; totalSeconds: number }} El tiempo transcurrido.
 */
const useTimer = (startTime?: Date | string) => {
    const [totalSeconds, setTotalSeconds] = useState(0);
    useEffect(() => {
        if (!startTime) { setTotalSeconds(0); return; }
        const start = new Date(startTime).getTime();
        const intervalId = setInterval(() => setTotalSeconds(Math.floor((Date.now() - start) / 1000)), 1000);
        return () => clearInterval(intervalId);
    }, [startTime]);
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return { time: `${minutes}:${seconds}`, totalSeconds };
};


// --- Componente Principal de la Página ---
export default function DataEntryPage() {
    const { users, tanks, sensors, activeEmitters, selections, loading, stoppingEmitters, handleSelectUser, setSelections, handleMqttSubmit, handleStartEmitters, handleStopEmitter } = useDataEntry();
    const [mode, setMode] = useState<'manual' | 'emitter'>('manual');
    const [expandedTanks, setExpandedTanks] = useState<Set<string>>(new Set());

    const sensorsForSelectedTank = useMemo(() => sensors.filter(s => s.tankId === selections.tank).sort((a,b) => (SENSOR_ORDER[a.type] || 99) - (SENSOR_ORDER[b.type] || 99)), [sensors, selections.tank]);
    const simulatorsByTank = useMemo(() => activeEmitters.reduce((acc, emitter) => {
        const tankName = emitter.tankName || 'Desconocido';
        if (!acc[tankName]) acc[tankName] = { user: emitter.userName, sensors: [] };
        acc[tankName].sensors.push(emitter);
        return acc;
    }, {} as Record<string, { user: string, sensors: any[] }>), [activeEmitters]);

    if (loading.initial) return <LoadingSpinner fullScreen message="Cargando módulo de recolección..." />;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold">Recolección y Simulación</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Herramienta de administrador para generar datos de prueba.</p>
            </div>

            <Card title="Configuración de Simulación">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <div className="space-y-6">
                        <div><label className="label flex items-center"><Users className="w-4 h-4 mr-2"/>Usuario</label><select className="form-select" value={selections.user} onChange={(e) => handleSelectUser(e.target.value)} disabled={loading.tanks || loading.users}><option value="">{loading.users ? "Cargando..." : "Seleccione..."}</option>{users.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}</select></div>
                        <div><label className="label flex items-center"><MapPin className="w-4 h-4 mr-2"/>Tanque</label><select className="form-select" value={selections.tank} onChange={(e) => setSelections(p => ({...p, tank: e.target.value, sensors: []}))} disabled={!selections.user || loading.tanks}><option value="">{loading.tanks ? "Cargando..." : "Seleccione..."}</option>{tanks.map(tank => <option key={tank.id} value={tank.id}>{tank.name}</option>)}</select></div>
                    </div>
                    <div>{selections.tank && (<div className="animate-in fade-in"><div className="flex justify-between items-center mb-4"><h3 className="font-semibold">Sensores Disponibles ({sensorsForSelectedTank.length})</h3><div className="flex space-x-2"><button onClick={() => setSelections(p => ({...p, sensors: sensorsForSelectedTank.map(s => s.id)}))} title="Todos"><CheckSquare className="w-5 h-5"/></button><button onClick={() => setSelections(p => ({...p, sensors: []}))} title="Ninguno"><Square className="w-5 h-5"/></button></div></div>{loading.tanks ? <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">{[...Array(3)].map((_,i)=><div key={i} className="p-4 rounded-lg border-2 bg-gray-50 animate-pulse"><div className="w-12 h-12 mb-3 rounded-full bg-gray-200 mx-auto"></div><div className="h-4 w-20 bg-gray-200 rounded mx-auto mb-2"></div><div className="h-3 w-16 bg-gray-200 rounded mx-auto"></div></div>)}</div> : sensorsForSelectedTank.length > 0 ? <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">{sensorsForSelectedTank.map(s => <SensorCard key={s.id} sensor={s} isSelected={selections.sensors.includes(s.id)} onToggle={() => setSelections(p => ({...p, sensors: p.sensors.includes(s.id) ? p.sensors.filter(id => id !== s.id) : [...p.sensors, s.id]}))} />)}</div> : <div className="text-center py-8 text-gray-500"><Cpu className="w-10 h-10 mx-auto mb-2 opacity-50"/><p>Este tanque no tiene sensores.</p></div>}</div>)}</div>
                </div>
            </Card>
            
            {selections.sensors.length > 0 && (<div className="animate-in fade-in"><h2 className="text-xl font-semibold mb-3">Acción a Realizar ({selections.sensors.length} seleccionados)</h2><div className="bg-white dark:bg-gray-800 p-2 rounded-lg shadow-md border"><div className="flex rounded-md overflow-hidden bg-gray-100 dark:bg-gray-900/50"><button onClick={() => setMode('manual')} className={clsx("w-1/2 py-3 font-semibold transition-colors flex items-center justify-center gap-2", mode === 'manual' ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow' : 'hover:bg-gray-200')}><Send className="w-5 h-5"/>Envío Manual</button><button onClick={() => setMode('emitter')} className={clsx("w-1/2 py-3 font-semibold transition-colors flex items-center justify-center gap-2", mode === 'emitter' ? 'bg-white dark:bg-green-600 text-green-600 dark:text-white shadow' : 'hover:bg-gray-200')}><Bot className="w-5 h-5"/>Simulador</button></div>{mode === 'manual' ? <ManualEntryForm selectedSensors={sensors.filter(s => selections.sensors.includes(s.id))} onSubmit={handleMqttSubmit} isSubmitting={loading.submitting} /> : <div className="p-4"><button onClick={handleStartEmitters} disabled={loading.emitterAction} className="w-full btn-primary py-3 text-base"><Play className="w-6 h-6" /><span>Iniciar Simulación</span></button></div>}</div></div>)}

            {activeEmitters.length > 0 && (<Card title="Panel de Control de Simuladores">{Object.entries(simulatorsByTank).map(([tankName, { user, sensors: tankSensors }]) => (<div key={tankName} className="border rounded-lg overflow-hidden mb-4"><div className="w-full flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50"><button onClick={() => setExpandedTanks(p => {const n=new Set(p); n.has(tankName)?n.delete(tankName):n.add(tankName); return n;})} className="flex-grow flex items-center gap-3 text-left"><MapPin className="w-5 h-5 text-blue-500"/><h3 className="font-semibold">{tankName}<span className="text-sm font-normal text-gray-500 ml-2">({user})</span></h3></button><button onClick={() => setExpandedTanks(p => {const n=new Set(p); n.has(tankName)?n.delete(tankName):n.add(tankName); return n;})}><ChevronDown className={clsx("w-5 h-5 transition-transform", expandedTanks.has(tankName) && "rotate-180")} /></button></div>{expandedTanks.has(tankName) && (<div className="bg-white dark:bg-gray-800 p-2 divide-y dark:divide-gray-700/50">{tankSensors.map(emitter => <ActiveEmitterRow key={emitter.sensorId} emitter={emitter} onStop={() => handleStopEmitter(emitter.sensorId)} isStopping={stoppingEmitters.has(emitter.sensorId)} />)}</div>)}</div>))}</Card>)}
        </div>
    );
}

// --- Sub-componentes de UI (definidos dentro del mismo archivo por simplicidad) ---
const SensorCard: React.FC<{ sensor: Sensor; isSelected: boolean; onToggle: () => void; }> = ({ sensor, isSelected, onToggle }) => (
    <div onClick={onToggle} className={clsx('p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 flex flex-col items-center justify-center text-center relative', isSelected ? 'border-green-500 bg-green-500/10' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-green-500/50')}>
        <div className={clsx("w-12 h-12 mb-3 rounded-full flex items-center justify-center", isSelected ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300')}><Cpu className="w-6 h-6" /></div>
        <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{sensor.name}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{translateSensorType(sensor.type)}</p>
    </div>
);

const ManualEntryForm: React.FC<{ selectedSensors: Sensor[]; onSubmit: (entries: { sensorId: string; value: number }[]) => Promise<void>; isSubmitting: boolean; }> = ({ selectedSensors, onSubmit, isSubmitting }) => {
    const [values, setValues] = useState<Record<string, string>>({});
    useEffect(() => {
        const initialValues: Record<string, string> = {};
        selectedSensors.forEach(sensor => {
            if (values[sensor.id]) return;
            initialValues[sensor.id] = sensor.type === 'PH' ? '7.0' : sensor.type === 'OXYGEN' ? '8.0' : '25.0';
        });
        setValues(prev => ({...initialValues, ...prev}));
    }, [selectedSensors]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const entries = selectedSensors.map(s => ({ sensorId: s.id, value: parseFloat(values[s.id]) })).filter(e => !isNaN(e.value));
        if (entries.length > 0) await onSubmit(entries);
        else Swal.fire('Atención', "No hay datos válidos para enviar.", 'warning');
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 p-4">
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">{selectedSensors.map(sensor => (<div key={sensor.id} className="grid grid-cols-3 gap-3 items-center"><label htmlFor={`manual-${sensor.id}`} className="label col-span-1 truncate">{sensor.name}</label><input id={`manual-${sensor.id}`} type="number" step="0.1" value={values[sensor.id] || ''} onChange={e => setValues(prev => ({...prev, [sensor.id]: e.target.value}))} className="form-input col-span-2" required /></div>))}</div>
            <div className="flex items-center justify-end pt-4 border-t dark:border-gray-700"><button type="submit" disabled={selectedSensors.length === 0 || isSubmitting} className="btn-primary min-w-[160px]">{isSubmitting ? <LoadingSpinner size="sm" /> : <><Send className="w-5 h-5" /><span>Enviar Valores</span></>}</button></div>
        </form>
    );
};

const ActiveEmitterRow: React.FC<{ emitter: any; onStop: () => void; isStopping: boolean }> = ({ emitter, onStop, isStopping }) => {
    const { time, totalSeconds } = useTimer(emitter.startTime);
    return (
        <div className="flex items-center justify-between p-3">
            <div className="flex items-center space-x-3 min-w-0"><div className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0"></div><Cpu className="w-5 h-5 text-gray-400 flex-shrink-0"/><div className="flex-grow min-w-0"><p className="font-semibold text-sm truncate">{emitter.sensorName}</p><p className="text-xs text-gray-500 truncate">{emitter.tankName} ({emitter.userName})</p></div></div>
            <div className="flex items-center space-x-4 flex-shrink-0"><div className="flex items-center text-xs font-mono" title="Paquetes enviados"><Repeat className="w-4 h-4 mr-1.5"/>{Math.floor(totalSeconds / 5)}</div><div className="flex items-center text-xs font-mono" title="Tiempo de ejecución"><Timer className="w-4 h-4 mr-1.5"/>{time}</div><button onClick={onStop} disabled={isStopping} className="p-2 text-gray-400 hover:text-red-500 rounded-full disabled:cursor-wait" title="Detener"><StopCircle className="w-5 h-5"/></button></div>
        </div>
    );
};