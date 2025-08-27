/**
 * @file page.tsx
 * @route /data-entry
 * @description Página unificada y optimizada para ingreso manual y simulación de datos de sensores.
 * Incluye interfaz mejorada, validación robusta y manejo de errores completo.
 * @author Kevin Mariano (Reconstruido y optimizado por Gemini)
 * @version 3.0.0
 * @since 1.0.0
 */
'use client';

import React from 'react';
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
  Send
} from 'lucide-react';
import { Sensor, SensorType } from '@/types';
import { clsx } from 'clsx';

/**
 * @constant sensorInfo
 * @description Configuración de información visual para cada tipo de sensor
 */
const sensorInfo: Record<SensorType, { 
  Icon: React.ElementType; 
  unit: string; 
  color: string;
  bgColor: string;
  placeholder: string;
}> = {
  TEMPERATURE: { 
    Icon: Thermometer, 
    unit: '°C',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    placeholder: 'Ej: 25.5'
  },
  PH: { 
    Icon: Droplets, 
    unit: 'pH',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    placeholder: 'Ej: 7.2'
  },
  OXYGEN: { 
    Icon: Wind, 
    unit: 'mg/L',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    placeholder: 'Ej: 8.5'
  },
};

/**
 * @component ConnectionStatus
 * @description Componente para mostrar el estado de conexión MQTT
 */
const ConnectionStatus: React.FC<{ status: 'connected' | 'connecting' | 'disconnected' }> = ({ status }) => {
  const statusConfig = {
    connected: {
      icon: Wifi,
      text: 'MQTT Conectado',
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    connecting: {
      icon: Activity,
      text: 'Conectando MQTT...',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    },
    disconnected: {
      icon: WifiOff,
      text: 'MQTT Desconectado',
      color: 'text-red-600',
      bgColor: 'bg-red-100'
    }
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className={clsx(
      'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium',
      config.color,
      config.bgColor
    )}>
      <Icon className="w-4 h-4 mr-2" />
      {config.text}
    </div>
  );
};

/**
 * @component SimulationStats
 * @description Componente para mostrar estadísticas de simulación
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
    <div className="text-xs text-gray-500 mt-1 space-y-1">
      <div className="flex items-center">
        <Clock className="w-3 h-3 mr-1" />
        Tiempo: {formatTime(status.uptime)}
      </div>
      <div className="flex items-center">
        <Send className="w-3 h-3 mr-1" />
        Mensajes: {status.messagesCount}
      </div>
    </div>
  );
};

/**
 * @component DataEntryPage
 * @description Componente principal de la página de ingreso de datos
 */
const DataEntryPage: React.FC = () => {
  const {
    users, selectedUserId, tanks, selectedTankId, sensors, loading, error, isAdmin,
    handleUserChange, handleTankChange,
    manualReadings, handleManualReadingChange, handleManualSubmit, isSubmittingManual,
    activeSimulations, mqttConnectionStatus, toggleSimulation, getSimulationStatus,
    getUnitForSensorType,
  } = useDataEntry();

  /**
   * @function renderErrorState
   * @description Renderiza el estado de error
   */
  const renderErrorState = () => (
    <div className="text-center py-10">
      <div className="max-w-md mx-auto">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Error al cargar datos
        </h3>
        <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Recargar página
        </button>
      </div>
    </div>
  );

  /**
   * @function renderLoadingState
   * @description Renderiza el estado de carga
   */
  const renderLoadingState = () => (
    <div className="py-10">
      <LoadingSpinner message="Cargando información de sensores..." />
    </div>
  );

  /**
   * @function renderEmptyState
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

  /**
   * @function renderSensorRow
   * @description Renderiza una fila de sensor con controles
   */
  const renderSensorRow = (sensor: Sensor) => {
    const info = sensorInfo[sensor.type] || { 
      Icon: Edit, 
      unit: '', 
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      placeholder: 'Valor'
    };
    const isSimulating = activeSimulations[sensor.id];
    const currentValue = manualReadings[sensor.id] || '';
    
    return (
      <div 
        key={sensor.id} 
        className={clsx(
          'grid grid-cols-1 lg:grid-cols-4 gap-4 p-4 rounded-lg border transition-all duration-200',
          isSimulating 
            ? 'border-green-300 bg-green-50 dark:bg-green-900/20' 
            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
        )}
      >
        {/* Información del Sensor */}
        <div className="lg:col-span-1 flex items-start">
          <div className={clsx('p-2 rounded-lg mr-3', info.bgColor)}>
            <info.Icon className={clsx('w-5 h-5', info.color)} />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 dark:text-white">
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
                Última lectura: {sensor.lastReading} {info.unit}
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
                'w-full pl-10 pr-12 py-2.5 border rounded-lg transition-colors',
                'focus:ring-2 focus:ring-[#39A900] focus:border-[#39A900]',
                'dark:bg-gray-700 dark:border-gray-600 dark:text-white',
                (isSubmittingManual || isSimulating) && 'opacity-50 cursor-not-allowed',
                isSimulating && 'bg-green-50 dark:bg-green-900/20'
              )}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
              {info.unit}
            </span>
          </div>
          {currentValue && !isNaN(parseFloat(currentValue)) && (
            <p className="text-xs text-green-600 mt-1">
              ✓ Valor válido: {parseFloat(currentValue)} {info.unit}
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
              'w-full flex items-center justify-center px-4 py-2.5 rounded-lg transition-all duration-200 font-semibold text-white shadow-sm',
              isSimulating 
                ? 'bg-red-600 hover:bg-red-700 shadow-red-200' 
                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200',
              mqttConnectionStatus !== 'connected' && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isSimulating ? (
              <>
                <Pause className="w-4 h-4 mr-2" />
                Detener
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Iniciar
              </>
            )}
          </button>
          
          {mqttConnectionStatus !== 'connected' && (
            <p className="text-xs text-red-600 mt-1">
              Conexión MQTT requerida
            </p>
          )}
        </div>

        {/* Estadísticas */}
        <div className="lg:col-span-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Estado
          </label>
          {isSimulating ? (
            <div className="space-y-2">
              <div className="flex items-center text-green-600">
                <Activity className="w-4 h-4 mr-2" />
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

  /**
   * @function renderMainContent
   * @description Renderiza el contenido principal
   */
  const renderMainContent = () => {
    if (loading) return renderLoadingState();
    if (error) return renderErrorState();
    if (tanks.length === 0) return renderEmptyState('No hay tanques disponibles para el usuario seleccionado.');
    if (sensors.length === 0) return renderEmptyState('El tanque seleccionado no tiene sensores configurados.');

    return (
      <form onSubmit={handleManualSubmit} className="space-y-6">
        {/* Lista de Sensores */}
        <div className="space-y-4">
          {sensors.map(renderSensorRow)}
        </div>

        {/* Botón de Envío */}
        <div className="border-t pt-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {Object.keys(manualReadings).filter(id => manualReadings[id]?.trim()).length} de {sensors.length} sensores con valores ingresados
            </div>
            
            <button
              type="submit"
              disabled={isSubmittingManual || Object.keys(manualReadings).filter(id => manualReadings[id]?.trim()).length === 0}
              className={clsx(
                'flex items-center justify-center px-6 py-3 rounded-lg font-semibold text-white shadow-md transition-all duration-200',
                'bg-[#39A900] hover:bg-[#2F8B00] shadow-green-200',
                'disabled:bg-gray-400 disabled:cursor-not-allowed disabled:shadow-none'
              )}
            >
              {isSubmittingManual ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Enviando...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  Guardar Datos Manuales
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    );
  };

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 max-w-7xl">
      {/* Encabezado */}
      <header className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Centro de Datos de Sensores
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Registre lecturas manualmente o inicie simuladores de datos en tiempo real
            </p>
          </div>
          
          <div className="mt-4 sm:mt-0">
            <ConnectionStatus status={mqttConnectionStatus} />
          </div>
        </div>
      </header>

      {/* Panel de Control */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Selector de Usuario (solo para admin) */}
          {isAdmin && (
            <div>
              <label htmlFor="user-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                <Users className="w-5 h-5 mr-2 text-gray-500" />
                Seleccionar Usuario
              </label>
              <select
                id="user-select"
                value={selectedUserId || ''}
                onChange={(e) => handleUserChange(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#39A900] focus:border-[#39A900] transition-colors"
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
            <label htmlFor="tank-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
              <TankIcon className="w-5 h-5 mr-2 text-gray-500" />
              Seleccionar Tanque
            </label>
            <select
              id="tank-select"
              value={selectedTankId}
              onChange={(e) => handleTankChange(e.target.value)}
              disabled={tanks.length === 0}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#39A900] focus:border-[#39A900] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">
                {tanks.length > 0 ? 'Seleccione un tanque...' : 'No hay tanques disponibles'}
              </option>
              {tanks.map(tank => (
                <option key={tank.id} value={tank.id}>
                  {tank.name} {tank.location && `(${tank.location})`}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Información adicional */}
        {selectedTankId && sensors.length > 0 && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                Tanque seleccionado: <span className="font-semibold">{tanks.find(t => t.id === selectedTankId)?.name}</span>
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                Sensores disponibles: <span className="font-semibold">{sensors.length}</span>
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                Simulaciones activas: <span className="font-semibold text-green-600">{Object.keys(activeSimulations).length}</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Contenido Principal */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        {renderMainContent()}
      </div>
    </div>
  );
};

export default DataEntryPage;