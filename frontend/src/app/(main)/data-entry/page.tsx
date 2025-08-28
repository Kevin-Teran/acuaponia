/** * @file page.tsx 
 * @route /data-entry 
 * @description Página optimizada para ingreso manual y simulación de datos de sensores. 
 * Incluye agrupación por tanques, métricas de rendimiento y payload MQTT simplificado. 
 * @author Kevin Mariano (Optimizado por Gemini) 
 * @version 4.0.0 (Optimización MQTT) 
 * @since 1.0.0 
 */
'use client';

import React, { useState, useEffect } from 'react';
import { useDataEntry } from '@/hooks/useDataEntry';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { 
  Save, 
  Users, 
  Container as TankIcon, 
  AlertCircle, 
  Play, 
  Pause, 
  Thermometer, 
  Droplets, 
  Wind, 
  Edit, 
  Wifi, 
  WifiOff, 
  Activity, 
  Clock, 
  Send, 
  BarChart3, 
  Zap, 
  Database, 
  CheckCircle, 
  XCircle, 
  TrendingUp, 
  Eye, 
  EyeOff
} from 'lucide-react';
import { Sensor, SensorType } from '@/types';
import { clsx } from 'clsx';
import { mqttService } from '@/services/mqttService';

/** * @constant sensorInfo 
 * @description Configuración visual optimizada para cada tipo de sensor 
 */
const sensorInfo: Record<SensorType, { 
  Icon: React.ElementType; 
  unit: string; 
  color: string;
  bgColor: string;
  placeholder: string;
  gradient: string;
}> = {
  TEMPERATURE: { 
    Icon: Thermometer, 
    unit: '°C',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    gradient: 'from-red-400 to-red-600',
    placeholder: 'Ej: 25.5'
  },
  PH: { 
    Icon: Droplets, 
    unit: 'pH',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    gradient: 'from-blue-400 to-blue-600',
    placeholder: 'Ej: 7.2'
  },
  OXYGEN: { 
    Icon: Wind, 
    unit: 'mg/L',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    gradient: 'from-green-400 to-green-600',
    placeholder: 'Ej: 8.5'
  },
};

/** * @component ConnectionStatus 
 * @description Componente optimizado para mostrar el estado de conexión MQTT 
 */
const ConnectionStatus: React.FC<{ status: 'connected' | 'connecting' | 'disconnected' }> = ({ status }) => {
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = mqttService.onMetrics(setMetrics);
    return unsubscribe;
  }, []);

  const statusConfig = {
    connected: {
      icon: Wifi,
      text: 'MQTT Conectado',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      borderColor: 'border-green-200'
    },
    connecting: {
      icon: Activity,
      text: 'Conectando MQTT...',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      borderColor: 'border-yellow-200'
    },
    disconnected: {
      icon: WifiOff,
      text: 'MQTT Desconectado',
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      borderColor: 'border-red-200'
    }
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className={clsx(
      'inline-flex flex-col p-3 rounded-xl border-2 transition-all duration-200',
      config.color,
      config.bgColor,
      config.borderColor
    )}>
      <div className="flex items-center mb-1">
        <Icon className={clsx('w-5 h-5 mr-2', status === 'connecting' && 'animate-spin')} />
        <span className="font-semibold">{config.text}</span>
      </div>
      
      {metrics && status === 'connected' && (
        <div className="text-xs text-gray-600 space-y-1">
          <div className="flex justify-between">
            <span>Mensajes:</span>
            <span className="font-semibold">{metrics.successfulMessages}</span>
          </div>
          <div className="flex justify-between">
            <span>Latencia:</span>
            <span className="font-semibold">{metrics.averageLatency.toFixed(0)}ms</span>
          </div>
          {metrics.totalMessages > 0 && (
            <div className="flex justify-between">
              <span>Éxito:</span>
              <span className="font-semibold">
                {((metrics.successfulMessages / metrics.totalMessages) * 100).toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/** * @component TankSimulationCard 
 * @description Componente para mostrar simulaciones agrupadas por tanque 
 */
const TankSimulationCard: React.FC<{ 
  tankGroup: any; 
  onStopTankSimulations: (tankId: string) => void;
}> = ({ tankGroup, onStopTankSimulations }) => {
  const [expanded, setExpanded] = useState(false);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <TankIcon className="w-6 h-6 text-green-600 mr-3" />
          <div>
            <h4 className="font-bold text-gray-900">{tankGroup.tankName}</h4>
            <p className="text-sm text-gray-600">
              {tankGroup.activeSimulations.length} simulaciones activas
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            {expanded ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          
          <button
            onClick={() => onStopTankSimulations(tankGroup.tankId)}
            className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
          >
            Detener Todo
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div className="flex items-center">
          <Clock className="w-4 h-4 text-green-600 mr-2" />
          <div>
            <p className="text-gray-500">Tiempo Total</p>
            <p className="font-semibold">{formatTime(tankGroup.uptime)}</p>
          </div>
        </div>
        
        <div className="flex items-center">
          <Send className="w-4 h-4 text-blue-600 mr-2" />
          <div>
            <p className="text-gray-500">Mensajes</p>
            <p className="font-semibold">{tankGroup.totalMessages}</p>
          </div>
        </div>
        
        <div className="flex items-center">
          <BarChart3 className="w-4 h-4 text-purple-600 mr-2" />
          <div>
            <p className="text-gray-500">Promedio</p>
            <p className="font-semibold">{tankGroup.averageMessages}/sensor</p>
          </div>
        </div>
        
        <div className="flex items-center">
          <Activity className="w-4 h-4 text-orange-600 mr-2" />
          <div>
            <p className="text-gray-500">Estado</p>
            <p className="font-semibold text-green-600">Activo</p>
          </div>
        </div>
      </div>
      
      {expanded && (
        <div className="mt-4 pt-4 border-t border-green-200">
          <h5 className="font-semibold text-gray-900 mb-2">Detalles de Sensores:</h5>
          <div className="text-xs text-gray-600 space-y-1">
            <p>• Frecuencia de envío: Cada 5 segundos</p>
            <p>• Protocolo: MQTT v3.1.1 con QoS 1</p>
          </div>
        </div>
      )}
    </div>
  );
};

/** * @component SimulationStats 
 * @description Componente optimizado para mostrar estadísticas de simulación individual 
 */
const SimulationStats: React.FC<{ 
  sensorId: string; 
  getSimulationStatus: (sensorId: string) => any;
}> = ({ sensorId, getSimulationStatus }) => {
  const status = getSimulationStatus(sensorId);

  if (!status) return null;

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="text-xs text-gray-500 space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Clock className="w-3 h-3 mr-1" />
          <span>Tiempo: {formatTime(status.uptime)}</span>
        </div>
        <div className="flex items-center">
          <Zap className="w-3 h-3 mr-1 text-green-500" />
          <span className="font-medium">{status.currentValue}</span>
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Send className="w-3 h-3 mr-1" />
          <span>Msgs: {status.messagesCount}</span>
        </div>
        <div className="flex items-center">
          <Database className="w-3 h-3 mr-1 text-blue-500" />
          <span>Payload</span>
        </div>
      </div>
      
      {status.messagesCount > 0 && (
        <div className="flex items-center text-green-600">
          <TrendingUp className="w-3 h-3 mr-1" />
          <span>~{((status.messagesCount * 8) / 1024).toFixed(1)}KB ahorrados</span>
        </div>
      )}
    </div>
  );
};

/** * @component OptimizationMetrics 
 * @description Componente para mostrar métricas de optimización global 
 */
const OptimizationMetrics: React.FC<{ activeSimulations: any }> = ({ activeSimulations }) => {
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = mqttService.onMetrics(setMetrics);
    return unsubscribe;
  }, []);

  if (!metrics || Object.keys(activeSimulations).length === 0) return null;

  const estimatedSavings = metrics.successfulMessages * 0.08; 
};

/** * @component DataEntryPage 
 * @description Componente principal optimizado de la página de ingreso de datos 
 */
const DataEntryPage: React.FC = () => {
  const {
    users, selectedUserId, tanks, selectedTankId, sensors, loading, error, isAdmin,
    handleUserChange, handleTankChange,
    manualReadings, handleManualReadingChange, handleManualSubmit, isSubmittingManual,
    activeSimulations, tankSimulationGroups, mqttConnectionStatus, 
    toggleSimulation, getSimulationStatus, getTankSimulationsSummary, stopTankSimulations,
    getUnitForSensorType,
  } = useDataEntry();

  const [showOptimizationDetails, setShowOptimizationDetails] = useState(false);

  /** * @function renderErrorState 
   * @description Renderiza el estado de error con opciones de recuperación 
   */
  const renderErrorState = () => (
    <div className="text-center py-10">
      <div className="max-w-md mx-auto">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Error al cargar datos
        </h3>
        <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
        <div className="space-x-2">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Recargar página
          </button>
          <button
            onClick={() => mqttService.resetConnection()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Reconectar MQTT
          </button>
        </div>
      </div>
    </div>
  );

  /** * @function renderLoadingState 
   * @description Renderiza el estado de carga optimizado 
   */
  const renderLoadingState = () => (
    <div className="py-10">
      <LoadingSpinner message="Cargando información de sensores optimizada..." />
    </div>
  );

  /** * @function renderEmptyState 
   * @description Renderiza el estado cuando no hay datos 
   */
  const renderEmptyState = (message: string) => (
    <div className="text-center py-10">
      <div className="max-w-md mx-auto">
        <TankIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          No hay datos disponibles
        </h3>
        <p className="text-gray-500 dark:text-gray-400">{message}</p>
      </div>
    </div>
  );

  /** * @function renderSensorRow 
   * @description Renderiza una fila de sensor con controles optimizados 
   */
  const renderSensorRow = (sensor: Sensor) => {
    const info = sensorInfo[sensor.type] || { 
      Icon: Edit, 
      unit: '', 
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      gradient: 'from-gray-400 to-gray-600',
      placeholder: 'Valor'
    };
    const isSimulating = activeSimulations[sensor.id];
    const currentValue = manualReadings[sensor.id] || '';

    return (
      <div 
        key={sensor.id} 
        className={clsx(
          'grid grid-cols-1 lg:grid-cols-4 gap-4 p-4 rounded-xl border-2 transition-all duration-300',
          isSimulating 
            ? 'border-green-300 bg-gradient-to-r from-green-50 to-emerald-50 shadow-lg' 
            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300'
        )}
      >
        {/* Información del Sensor */}
        <div className="lg:col-span-1 flex items-start">
          <div className={clsx('p-3 rounded-xl mr-3 shadow-sm', info.bgColor)}>
            <info.Icon className={clsx('w-6 h-6', info.color)} />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-gray-900 dark:text-white">
              {sensor.name}
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              ID: {sensor.hardwareId}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Tipo: {sensor.type}
            </p>
            {sensor.lastReading !== null && (
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Última: {sensor.lastReading} {info.unit}
              </p>
            )}
          </div>
        </div>

        {/* Input Manual */}
        <div className="lg:col-span-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Ingreso Manual
          </label>
          <div className="relative">
            <Edit className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="number"
              step={sensor.type === 'PH' ? '0.01' : '0.1'}
              placeholder={info.placeholder}
              value={currentValue}
              onChange={(e) => handleManualReadingChange(sensor.id, e.target.value)}
              disabled={isSubmittingManual || !!isSimulating}
              className={clsx(
                'w-full pl-10 pr-16 py-3 border-2 rounded-xl transition-all duration-200',
                'focus:ring-2 focus:ring-[#39A900] focus:border-[#39A900]',
                'dark:bg-gray-700 dark:border-gray-600 dark:text-white',
                (isSubmittingManual || isSimulating) && 'opacity-50 cursor-not-allowed',
                isSimulating && 'bg-green-50 dark:bg-green-900/20 border-green-300'
              )}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500">
              {info.unit}
            </span>
          </div>
          {currentValue && !isNaN(parseFloat(currentValue)) && (
            <p className="text-xs text-green-600 mt-2 flex items-center">
              <CheckCircle className="w-3 h-3 mr-1" />
              Valor válido: {parseFloat(currentValue)} {info.unit}
            </p>
          )}
        </div>

        {/* Control de Simulación */}
        <div className="lg:col-span-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Simulación MQTT
          </label>
          <button
            type="button"
            onClick={() => toggleSimulation(sensor)}
            disabled={mqttConnectionStatus !== 'connected'}
            className={clsx(
              'w-full flex items-center justify-center px-4 py-3 rounded-xl transition-all duration-200 font-semibold text-white shadow-lg',
              isSimulating 
                ? `bg-gradient-to-r ${info.gradient} shadow-red-200 hover:shadow-red-300` 
                : `bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-blue-200`,
              mqttConnectionStatus !== 'connected' && 'opacity-50 cursor-not-allowed grayscale'
            )}
          >
            {isSimulating ? (
              <>
                <Pause className="w-5 h-5 mr-2" />
                Detener
              </>
            ) : (
              <>
                <Play className="w-5 h-5 mr-2" />
                Iniciar
              </>
            )}
          </button>
          
          {mqttConnectionStatus !== 'connected' && (
            <p className="text-xs text-red-600 mt-2 flex items-center">
              <XCircle className="w-3 h-3 mr-1" />
              Conexión MQTT requerida
            </p>
          )}
          
          {isSimulating && (
            <p className="text-xs text-green-600 mt-2 flex items-center">
              <Zap className="w-3 h-3 mr-1" />
              Enviando solo valor numérico
            </p>
          )}
        </div>

        {/* Estadísticas Optimizadas */}
        <div className="lg:col-span-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Estado y Métricas
          </label>
          {isSimulating ? (
            <div className="space-y-2">
              <div className="flex items-center text-green-600">
                <Activity className="w-4 h-4 mr-2 animate-pulse" />
                <span className="text-sm font-medium">Simulación activa</span>
              </div>
              <SimulationStats 
                sensorId={sensor.id} 
                getSimulationStatus={getSimulationStatus}
              />
            </div>
          ) : (
            <div className="flex items-center text-gray-500">
              <Pause className="w-4 h-4 mr-2" />
              <span className="text-sm">Inactivo</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  /** * @function renderTankSimulations 
   * @description Renderiza las simulaciones agrupadas por tanque 
   */
  const renderTankSimulations = () => {
    const tankSummary = getTankSimulationsSummary();
    
    if (tankSummary.length === 0) return null;

    return (
      <div className="mb-8">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
          <TankIcon className="w-6 h-6 text-blue-600 mr-2" />
          Simulaciones por Tanque
        </h3>
        
        <div className="space-y-4">
          {tankSummary.map(tankGroup => (
            <TankSimulationCard 
              key={tankGroup.tankId}
              tankGroup={tankGroup}
              onStopTankSimulations={stopTankSimulations}
            />
          ))}
        </div>
      </div>
    );
  };

  /** * @function renderMainContent 
   * @description Renderiza el contenido principal optimizado 
   */
  const renderMainContent = () => {
    if (loading) return renderLoadingState();
    if (error) return renderErrorState();
    if (tanks.length === 0) return renderEmptyState('No hay tanques disponibles para el usuario seleccionado.');
    if (sensors.length === 0) return renderEmptyState('El tanque seleccionado no tiene sensores configurados.');

    const activeSensorCount = Object.keys(activeSimulations).length;
    const validManualReadings = Object.keys(manualReadings).filter(id => manualReadings[id]?.trim()).length;

    return (
      <div className="space-y-8">
        {/* Métricas de Optimización */}
        <OptimizationMetrics activeSimulations={activeSimulations} />
        
        {/* Simulaciones por Tanque */}
        {renderTankSimulations()}
        
        {/* Formulario Principal */}
        <form onSubmit={handleManualSubmit} className="space-y-6">
          {/* Lista de Sensores */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
              <BarChart3 className="w-6 h-6 text-green-600 mr-2" />
              Sensores del Tanque
            </h3>
            {sensors.map(renderSensorRow)}
          </div>

          {/* Panel de Control */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl p-6 border-2 border-gray-200 dark:border-gray-600">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              <div className="flex-1">
                <h4 className="font-bold text-gray-900 dark:text-white mb-2">
                  Resumen de Actividad
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center">
                    <Edit className="w-4 h-4 text-blue-500 mr-2" />
                    <span className="text-gray-600 dark:text-gray-400">
                      Datos manuales: <span className="font-semibold">{validManualReadings}/{sensors.length}</span>
                    </span>
                  </div>
                  
                  <div className="flex items-center">
                    <Activity className="w-4 h-4 text-green-500 mr-2" />
                    <span className="text-gray-600 dark:text-gray-400">
                      Simulaciones: <span className="font-semibold">{activeSensorCount}/{sensors.length}</span>
                    </span>
                  </div>
                </div>
              </div>
              
              <button
                type="submit"
                disabled={isSubmittingManual || validManualReadings === 0}
                className={clsx(
                  'flex items-center justify-center px-8 py-4 rounded-xl font-bold text-white shadow-lg transition-all duration-300',
                  'bg-gradient-to-r from-[#39A900] to-[#2F8B00] hover:from-[#2F8B00] hover:to-[#266B00]',
                  'shadow-green-200 hover:shadow-green-300',
                  'disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed disabled:shadow-none',
                  'transform hover:scale-105 disabled:transform-none'
                )}
              >
                {isSubmittingManual ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5 mr-3" />
                    Guardar Datos Manuales ({validManualReadings})
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  };

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 max-w-7xl">
      {/* Encabezado Optimizado */}
      <header className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
          <div className="mb-4 lg:mb-0">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text">
              Centro de Datos
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2 text-lg">
              Simulación MQTT • Entrada manual
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <ConnectionStatus status={mqttConnectionStatus} />
          </div>
        </div>
        
      </header>
      
      {/* Panel de Control */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 mb-8 border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Selector de Usuario (solo para admin) */}
          {isAdmin && (
            <div>
              <label htmlFor="user-select" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                <Users className="w-5 h-5 mr-2 text-blue-500" />
                Seleccionar Usuario
              </label>
              <select
                id="user-select"
                value={selectedUserId || ''}
                onChange={(e) => handleUserChange(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#39A900] focus:border-[#39A900] transition-all duration-200"
              >
                <option value="">Seleccione un usuario...</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
            </div>
          )}
          
          {/* Selector de Tanque */}
          <div>
            <label htmlFor="tank-select" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
              <TankIcon className="w-5 h-5 mr-2 text-green-500" />
              Seleccionar Tanque
            </label>
            <select
              id="tank-select"
              value={selectedTankId}
              onChange={(e) => handleTankChange(e.target.value)}
              disabled={tanks.length === 0}
              className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#39A900] focus:border-[#39A900] transition-all duration-200"
            >
              <option value="">
                {tanks.length > 0 ? 'Seleccione un tanque...' : 'No hay tanques disponibles'}
              </option>
              {tanks.map(tank => (
                <option key={tank.id} value={tank.id}>
                  {tank.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Contenido Principal */}
      <main className="mt-8">
        {renderMainContent()}
      </main>
    </div>
  );
};

export default DataEntryPage;