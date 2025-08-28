/**
 * @file DataEntryPage.tsx
 * @description Página de entrada de datos con componentes estilizados directamente con Tailwind CSS.
 * @author Kevin Mariano (Adaptado por Gemini)
 * @version 5.0.0
 * @since 1.0.0
 */
'use client';

import React, { useState } from 'react';
import { useDataEntry } from '@/hooks/useDataEntry';
import { 
  Play, Square, Loader2, Thermometer, Beaker, Wind, Activity, Users,
  Database, Clock, Signal, AlertTriangle, CheckCircle2, XCircle, BarChart3
} from 'lucide-react';
import clsx from 'clsx'; // Usaremos clsx para clases condicionales

const DataEntryPage: React.FC = () => {
  const {
    users, selectedUserId, tanks, selectedTankId, sensors, loading, error, isAdmin,
    manualReadings, isSubmittingManual, activeSimulations, simulationMetrics,
    mqttConnectionStatus, isTogglingSimulation, handleUserChange, handleTankChange,
    handleManualReadingChange, handleManualSubmit, toggleSimulation,
    startMultipleSimulations, stopMultipleSimulations, getSimulationStatus,
    isSimulationActive, getActiveSimulationsSummary, getUnitForSensorType,
    forceSyncSimulations, lastSyncTime,
  } = useDataEntry();

  const [selectedSensorsForBatch, setSelectedSensorsForBatch] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'simulation' | 'manual'>('simulation');

  // Obtener resumen de simulaciones activas
  const simulationsSummary = getActiveSimulationsSummary();

  // --- Funciones auxiliares ---
  const getSensorIcon = (type: string) => {
    switch (type) {
      case 'TEMPERATURE': return <Thermometer className="h-4 w-4" />;
      case 'PH': return <Beaker className="h-4 w-4" />;
      case 'OXYGEN': return <Wind className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getMqttStatusIcon = () => {
    switch (mqttConnectionStatus) {
      case 'connected': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'connecting': return <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />;
      case 'disconnected': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  // --- Handlers de UI ---
  const handleBatchSensorSelection = (sensorId: string) => {
    setSelectedSensorsForBatch(prev => {
      const newSet = new Set(prev);
      newSet.has(sensorId) ? newSet.delete(sensorId) : newSet.add(sensorId);
      return newSet;
    });
  };

  const handleStartSelectedSimulations = async () => {
    if (selectedSensorsForBatch.size === 0) return;
    await startMultipleSimulations(Array.from(selectedSensorsForBatch));
    setSelectedSensorsForBatch(new Set());
  };

  const handleStopSelectedSimulations = async () => {
    if (selectedSensorsForBatch.size === 0) return;
    await stopMultipleSimulations(Array.from(selectedSensorsForBatch));
    setSelectedSensorsForBatch(new Set());
  };

  // --- Componente de Carga ---
  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mr-3 text-gray-500" />
          <span className="text-gray-700">Cargando datos...</span>
        </div>
      </div>
    );
  }

  // --- Renderizado Principal ---
  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Entrada de Datos</h1>
          <p className="text-gray-500">
            Gestión de datos manuales y simulaciones MQTT
          </p>
        </div>
        <div className="flex items-center gap-2">
          {getMqttStatusIcon()}
          <span className="text-sm font-medium text-gray-700">
            MQTT: {mqttConnectionStatus.charAt(0).toUpperCase() + mqttConnectionStatus.slice(1)}
          </span>
          <button onClick={forceSyncSimulations} className="ml-2 inline-flex items-center justify-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
            <Activity className="h-4 w-4 mr-1" />
            Sincronizar
          </button>
        </div>
      </div>

      {/* Alerta de Error */}
      {error && (
        <div role="alert" className="relative w-full rounded-lg border p-4 border-red-300 bg-red-50 text-red-700">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="font-medium">{error}</span>
          </div>
        </div>
      )}

      {/* Layout Principal */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Columna Izquierda: Controles */}
        <div className="xl:col-span-2 space-y-6">
          {/* Card: Selección de Usuario y Tanque */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-800">
                <Users className="h-5 w-5" />
                Selección de Usuario y Tanque
              </h2>
            </div>
            <div className="p-6 space-y-4">
              {isAdmin && (
                <div className="space-y-2">
                  <label htmlFor="user-select" className="text-sm font-medium text-gray-700">Usuario</label>
                  <select id="user-select" value={selectedUserId || ''} onChange={(e) => handleUserChange(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md bg-white shadow-sm focus:ring-indigo-500 focus:border-indigo-500">
                    <option value="">Seleccionar usuario...</option>
                    {users.map((user) => <option key={user.id} value={user.id}>{user.name} ({user.email})</option>)}
                  </select>
                </div>
              )}
              <div className="space-y-2">
                <label htmlFor="tank-select" className="text-sm font-medium text-gray-700">Tanque</label>
                <select id="tank-select" value={selectedTankId} onChange={(e) => handleTankChange(e.target.value)} disabled={!selectedUserId || tanks.length === 0} className="w-full p-2 border border-gray-300 rounded-md bg-white shadow-sm focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50">
                  <option value="">Seleccionar tanque...</option>
                  {tanks.map((tank) => <option key={tank.id} value={tank.id}>{tank.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Card: Tabs de Entrada de Datos */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200">
            <div className="border-b">
              <div className="grid w-full grid-cols-2">
                <button onClick={() => setActiveTab('simulation')} className={clsx("inline-flex items-center justify-center p-4 font-medium gap-2 border-b-2", activeTab === 'simulation' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300')}>
                  <Signal className="h-4 w-4" /> Simulación MQTT
                </button>
                <button onClick={() => setActiveTab('manual')} className={clsx("inline-flex items-center justify-center p-4 font-medium gap-2 border-b-2", activeTab === 'manual' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300')}>
                  <Database className="h-4 w-4" /> Entrada Manual
                </button>
              </div>
            </div>
            
            {/* Contenido de las Tabs */}
            <div className="p-6">
              {activeTab === 'simulation' && (
                <div className="space-y-4">
                  {sensors.length > 0 && (
                    <div className="flex flex-col sm:flex-row gap-2 p-3 bg-gray-50 rounded-lg">
                      <button onClick={handleStartSelectedSimulations} disabled={selectedSensorsForBatch.size === 0} className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-md shadow-sm hover:bg-indigo-700 disabled:bg-gray-400 inline-flex items-center">
                        <Play className="h-4 w-4 mr-1" /> Iniciar Seleccionados ({selectedSensorsForBatch.size})
                      </button>
                      <button onClick={handleStopSelectedSimulations} disabled={selectedSensorsForBatch.size === 0} className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-md shadow-sm hover:bg-red-700 disabled:bg-gray-400 inline-flex items-center">
                        <Square className="h-4 w-4 mr-1" /> Detener Seleccionados ({selectedSensorsForBatch.size})
                      </button>
                      <button onClick={() => setSelectedSensorsForBatch(new Set())} disabled={selectedSensorsForBatch.size === 0} className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 disabled:opacity-50">
                        Limpiar Selección
                      </button>
                    </div>
                  )}
                  <div className="space-y-3">
                    {sensors.length > 0 ? (
                      sensors.map((sensor) => {
                        const isActive = isSimulationActive(sensor.id);
                        const status = getSimulationStatus(sensor.id);
                        const isToggling = isTogglingSimulation.has(sensor.id);
                        const isSelected = selectedSensorsForBatch.has(sensor.id);
                        return (
                          <div key={sensor.id} className={clsx("p-4 border rounded-lg transition-colors", isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200')}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <input type="checkbox" checked={isSelected} onChange={() => handleBatchSensorSelection(sensor.id)} className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500" />
                                {getSensorIcon(sensor.type)}
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-800">{sensor.name}</span>
                                    <span className={clsx("px-2 py-0.5 text-xs font-semibold rounded-full", isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800")}>
                                      {isActive ? 'Activo' : 'Inactivo'}
                                    </span>
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {sensor.type} • {getUnitForSensorType(sensor.type)}
                                    {status && <span className="ml-2">• {status.messagesCount} msgs • {formatUptime(status.uptime)} • {status.currentValue}{status.unit}</span>}
                                  </div>
                                </div>
                              </div>
                              <button onClick={() => toggleSimulation(sensor)} disabled={isToggling || mqttConnectionStatus !== 'connected'} className={clsx("px-2 py-2 text-sm font-medium text-white rounded-md shadow-sm inline-flex items-center", isActive ? "bg-red-600 hover:bg-red-700" : "bg-indigo-600 hover:bg-indigo-700", "disabled:bg-gray-400")}>
                                {isToggling ? <Loader2 className="h-4 w-4 animate-spin" /> : isActive ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : <div className="text-center py-8 text-gray-500">{selectedTankId ? 'No hay sensores configurados' : 'Selecciona un tanque'}</div>}
                  </div>
                </div>
              )}
              {activeTab === 'manual' && (
                <form onSubmit={handleManualSubmit} className="space-y-4">
                  <div className="space-y-3">
                    {sensors.length > 0 ? (
                      sensors.map((sensor) => (
                        <div key={sensor.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                          {getSensorIcon(sensor.type)}
                          <div className="flex-1">
                            <label htmlFor={`sensor-${sensor.id}`} className="font-medium text-gray-800">{sensor.name}</label>
                            <div className="text-xs text-gray-500">{sensor.type} • {getUnitForSensorType(sensor.type)}</div>
                          </div>
                          <input id={`sensor-${sensor.id}`} type="number" step="0.01" placeholder="Valor" value={manualReadings[sensor.id] || ''} onChange={(e) => handleManualReadingChange(sensor.id, e.target.value)} className="w-32 p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />
                        </div>
                      ))
                    ) : <div className="text-center py-8 text-gray-500">{selectedTankId ? 'No hay sensores configurados' : 'Selecciona un tanque'}</div>}
                  </div>
                  <button type="submit" disabled={isSubmittingManual || sensors.length === 0} className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                    {isSubmittingManual ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Database className="h-4 w-4 mr-2" />}
                    Guardar Lecturas
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Columna Derecha: Panel de Simulaciones */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-md border border-gray-200">
            <div className="p-6 border-b"><h2 className="text-lg font-semibold flex items-center gap-2 text-gray-800"><BarChart3 className="h-5 w-5" />Estado del Sistema</h2></div>
            <div className="p-6 space-y-3">
              <div className="flex justify-between text-sm"><span className="text-gray-500">Estado MQTT:</span><div className="flex items-center gap-1 font-medium">{getMqttStatusIcon()}{mqttConnectionStatus.charAt(0).toUpperCase() + mqttConnectionStatus.slice(1)}</div></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Simulaciones Activas:</span><span className="font-medium text-gray-800">{simulationsSummary.totalActive}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Mensajes Enviados:</span><span className="font-medium text-gray-800">{simulationsSummary.totalMessages.toLocaleString()}</span></div>
              {simulationMetrics && <div className="flex justify-between text-sm"><span className="text-gray-500">Tiempo Activo:</span><span className="font-medium text-gray-800">{formatUptime(simulationMetrics.systemUptime)}</span></div>}
              <div className="flex justify-between text-xs"><span className="text-gray-400">Última sincronización:</span><span className="text-gray-400">{new Date(lastSyncTime).toLocaleTimeString()}</span></div>
            </div>
          </div>

          {simulationsSummary.totalActive > 0 && (
            <>
              <div className="bg-white rounded-xl shadow-md border border-gray-200">
                <div className="p-6 border-b"><h2 className="text-lg font-semibold flex items-center gap-2 text-gray-800"><Activity className="h-5 w-5" />Simulaciones Activas</h2></div>
                <div className="p-6">
                  <div className="space-y-4">
                    {Object.entries(simulationsSummary.byTank).map(([tankId, tankInfo]) => (
                      <div key={tankId} className="space-y-2">
                        <div className="flex items-center justify-between"><h4 className="font-medium text-sm text-gray-800">{tankInfo.tankName}</h4><span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">{tankInfo.count} activa{tankInfo.count !== 1 ? 's' : ''}</span></div>
                        <div className="space-y-2">
                          {tankInfo.simulations.map((sim) => (
                            <div key={sim.sensorId} className="flex items-center justify-between text-xs bg-gray-50 p-2 rounded">
                              <div className="flex items-center gap-2 text-gray-700">{getSensorIcon(sim.type)}<span>{sim.sensorName}</span></div>
                              <div className="text-right">
                                <div className="font-medium text-gray-800">{sim.currentValue} {sim.unit}</div>
                                <div className="text-gray-500">{sim.messagesCount} msg • {formatUptime(sim.uptime)}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md border border-gray-200">
                <div className="p-6 border-b"><h2 className="text-lg font-semibold flex items-center gap-2 text-gray-800"><Clock className="h-5 w-5" />Por Tipo de Sensor</h2></div>
                <div className="p-6">
                  <div className="space-y-2">
                    {Object.entries(simulationsSummary.byType).map(([type, count]) => count > 0 && (
                      <div key={type} className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-gray-700">{getSensorIcon(type)}<span>{type}</span></div>
                        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DataEntryPage;