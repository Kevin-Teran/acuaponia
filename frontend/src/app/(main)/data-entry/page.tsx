/**
 * @file page.tsx
 * @route /data-entry
 * @description Página unificada para ingreso manual y simulación de datos de sensores.
 * @author Kevin Mariano (Reconstruido por Gemini)
 * @version 2.1.0
 * @since 1.0.0
 */
'use client';

import React from 'react';
import { useDataEntry } from '@/hooks/useDataEntry';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Save, Users, Container as TankIcon, AlertCircle, Play, Pause, Thermometer, Droplets, Wind, Edit } from 'lucide-react';
import { Sensor, SensorType } from '@/types';
import { clsx } from 'clsx';

const sensorInfo: Record<SensorType, { Icon: React.ElementType; unit: string; }> = {
  TEMPERATURE: { Icon: Thermometer, unit: '°C' },
  PH: { Icon: Droplets, unit: 'pH' },
  OXYGEN: { Icon: Wind, unit: 'mg/L' },
};

const DataEntryPage = () => {
  const {
    users, selectedUserId, tanks, selectedTankId, sensors, loading, error, isAdmin,
    handleUserChange, handleTankChange,
    manualReadings, handleManualReadingChange, handleManualSubmit,
    activeSimulations, toggleSimulation,
  } = useDataEntry();

  const renderContent = () => {
    if (loading) return <div className="py-10"><LoadingSpinner message="Cargando..." /></div>;
    if (error) return <p className="text-red-500 text-center py-10">{error}</p>;
    if (tanks.length === 0 && !loading) return <p className="text-center text-gray-500 dark:text-gray-400 py-10">No hay tanques disponibles.</p>;
    if (sensors.length === 0 && !loading) return <p className="text-center text-gray-500 dark:text-gray-400 py-10">Este tanque no tiene sensores.</p>;

    return (
      <form onSubmit={handleManualSubmit}>
        <div className="space-y-4">
          {sensors.map(sensor => {
            // Aseguramos que `info` y `isSimulating` no causen errores
            const info = sensorInfo[sensor.type] || { Icon: Edit, unit: '' };
            const isSimulating = activeSimulations && activeSimulations[sensor.id];
            
            return (
              <div key={sensor.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                {/* Info del Sensor */}
                <div className="md:col-span-1 flex items-center">
                  <info.Icon className="w-5 h-5 mr-3 text-gray-500 dark:text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{sensor.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{sensor.hardwareId}</p>
                  </div>
                </div>

                {/* Input Manual */}
                <div className="md:col-span-1">
                  <div className="relative">
                    <Edit className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      step="0.01"
                      placeholder={`Valor manual (${info.unit})`}
                      value={manualReadings[sensor.id] || ''}
                      onChange={(e) => handleManualReadingChange(sensor.id, e.target.value)}
                      disabled={!!isSimulating}
                      className="w-full pl-10 pr-4 py-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-[#39A900] focus:border-[#39A900] disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Botón de Simulación */}
                <div className="md:col-span-1">
                  <button
                    type="button"
                    onClick={() => toggleSimulation(sensor)}
                    className={clsx(
                      "w-full flex items-center justify-center px-4 py-2.5 rounded-lg transition-colors font-semibold text-white",
                      isSimulating ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
                    )}
                  >
                    {isSimulating ? <Pause className="w-5 h-5 mr-2" /> : <Play className="w-5 h-5 mr-2" />}
                    {isSimulating ? 'Detener Simulación' : 'Iniciar Simulación'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="pt-8">
          <button
            type="submit"
            className="w-full flex items-center justify-center px-6 py-4 bg-[#39A900] text-white rounded-lg hover:bg-[#2F8B00] shadow-md disabled:bg-gray-400"
          >
            <Save className="w-5 h-5 mr-2" />
            Guardar Datos Manuales
          </button>
        </div>
      </form>
    );
  };

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Ingreso y Simulación de Datos</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Registre lecturas manualmente o inicie un simulador de datos en tiempo real.
        </p>
      </header>

      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-md p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {isAdmin && (
            <div>
              <label htmlFor="user-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                <Users className="w-5 h-5 mr-2" /> Usuario
              </label>
              <select
                id="user-select"
                value={selectedUserId || ''}
                onChange={(e) => handleUserChange(e.target.value)}
                className="w-full px-4 py-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-[#39A900] focus:border-[#39A900]"
              >
                {users.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label htmlFor="tank-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
              <TankIcon className="w-5 h-5 mr-2" /> Tanque
            </label>
            <select
              id="tank-select"
              value={selectedTankId}
              onChange={(e) => handleTankChange(e.target.value)}
              disabled={tanks.length === 0}
              className="w-full px-4 py-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-[#39A900] focus:border-[#39A900]"
            >
              {tanks.length > 0 ? (
                tanks.map(tank => <option key={tank.id} value={tank.id}>{tank.name}</option>)
              ) : (
                <option>Seleccione un usuario</option>
              )}
            </select>
          </div>
        </div>
        <hr className="border-gray-200 dark:border-gray-600 mb-8" />
        {renderContent()}
      </div>
    </div>
  );
};

export default DataEntryPage;