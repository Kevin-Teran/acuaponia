import React, { useState } from 'react';
import { Thermometer, Droplets, Wind, Plus, Edit, Trash2, Settings, MapPin, Wifi, WifiOff } from 'lucide-react';
import { Card } from '../common/Card';
import Swal from 'sweetalert2';

interface Sensor {
  id: string;
  name: string;
  type: 'temperature' | 'ph' | 'oxygen';
  location: string;
  status: 'active' | 'inactive' | 'maintenance';
  lastReading: number;
  lastUpdate: string;
  batteryLevel: number;
  calibrationDate: string;
}

interface Tank {
  id: string;
  name: string;
  location: string;
  capacity: number;
  currentLevel: number;
  sensors: string[];
  status: 'active' | 'maintenance' | 'inactive';
}

export const Sensors: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'sensors' | 'tanks'>('sensors');
  const [showSensorModal, setShowSensorModal] = useState(false);
  const [showTankModal, setShowTankModal] = useState(false);
  const [editingSensor, setEditingSensor] = useState<Sensor | null>(null);
  const [editingTank, setEditingTank] = useState<Tank | null>(null);

  const [sensors, setSensors] = useState<Sensor[]>([
    {
      id: '1',
      name: 'Sensor Temperatura Principal',
      type: 'temperature',
      location: 'Tanque Principal A',
      status: 'active',
      lastReading: 24.5,
      lastUpdate: new Date().toISOString(),
      batteryLevel: 85,
      calibrationDate: '2024-01-15'
    },
    {
      id: '2',
      name: 'Sensor pH Primario',
      type: 'ph',
      location: 'Tanque Principal A',
      status: 'active',
      lastReading: 7.2,
      lastUpdate: new Date().toISOString(),
      batteryLevel: 92,
      calibrationDate: '2024-01-10'
    },
    {
      id: '3',
      name: 'Sensor Oxígeno Disuelto',
      type: 'oxygen',
      location: 'Tanque Secundario B',
      status: 'maintenance',
      lastReading: 8.1,
      lastUpdate: new Date(Date.now() - 3600000).toISOString(),
      batteryLevel: 45,
      calibrationDate: '2024-01-05'
    }
  ]);

  const [tanks, setTanks] = useState<Tank[]>([
    {
      id: '1',
      name: 'Tanque Principal A',
      location: 'Área Norte',
      capacity: 5000,
      currentLevel: 4200,
      sensors: ['1', '2'],
      status: 'active'
    },
    {
      id: '2',
      name: 'Tanque Secundario B',
      location: 'Área Sur',
      capacity: 3000,
      currentLevel: 2800,
      sensors: ['3'],
      status: 'maintenance'
    }
  ]);

  const [sensorForm, setSensorForm] = useState({
    name: '',
    type: 'temperature' as 'temperature' | 'ph' | 'oxygen',
    location: '',
    calibrationDate: ''
  });

  const [tankForm, setTankForm] = useState({
    name: '',
    location: '',
    capacity: 0,
    currentLevel: 0
  });

  const getSensorIcon = (type: string) => {
    switch (type) {
      case 'temperature': return Thermometer;
      case 'ph': return Droplets;
      case 'oxygen': return Wind;
      default: return Settings;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'inactive': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const handleSensorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingSensor) {
      setSensors(prev => prev.map(sensor => 
        sensor.id === editingSensor.id 
          ? { ...sensor, ...sensorForm }
          : sensor
      ));
      await Swal.fire({
        icon: 'success',
        title: 'Sensor actualizado',
        text: 'El sensor se ha actualizado correctamente.',
        timer: 2000,
        showConfirmButton: false
      });
    } else {
      const newSensor: Sensor = {
        id: Date.now().toString(),
        ...sensorForm,
        status: 'active',
        lastReading: 0,
        lastUpdate: new Date().toISOString(),
        batteryLevel: 100
      };
      setSensors(prev => [...prev, newSensor]);
      await Swal.fire({
        icon: 'success',
        title: 'Sensor creado',
        text: 'El nuevo sensor se ha agregado correctamente.',
        timer: 2000,
        showConfirmButton: false
      });
    }
    
    setShowSensorModal(false);
    setEditingSensor(null);
    setSensorForm({ name: '', type: 'temperature', location: '', calibrationDate: '' });
  };

  const handleTankSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingTank) {
      setTanks(prev => prev.map(tank => 
        tank.id === editingTank.id 
          ? { ...tank, ...tankForm }
          : tank
      ));
      await Swal.fire({
        icon: 'success',
        title: 'Tanque actualizado',
        text: 'El tanque se ha actualizado correctamente.',
        timer: 2000,
        showConfirmButton: false
      });
    } else {
      const newTank: Tank = {
        id: Date.now().toString(),
        ...tankForm,
        sensors: [],
        status: 'active'
      };
      setTanks(prev => [...prev, newTank]);
      await Swal.fire({
        icon: 'success',
        title: 'Tanque creado',
        text: 'El nuevo tanque se ha agregado correctamente.',
        timer: 2000,
        showConfirmButton: false
      });
    }
    
    setShowTankModal(false);
    setEditingTank(null);
    setTankForm({ name: '', location: '', capacity: 0, currentLevel: 0 });
  };

  const handleDeleteSensor = async (id: string) => {
    const result = await Swal.fire({
      title: '¿Eliminar sensor?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      setSensors(prev => prev.filter(sensor => sensor.id !== id));
      await Swal.fire({
        icon: 'success',
        title: 'Sensor eliminado',
        text: 'El sensor se ha eliminado correctamente.',
        timer: 2000,
        showConfirmButton: false
      });
    }
  };

  const handleDeleteTank = async (id: string) => {
    const result = await Swal.fire({
      title: '¿Eliminar tanque?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      setTanks(prev => prev.filter(tank => tank.id !== id));
      await Swal.fire({
        icon: 'success',
        title: 'Tanque eliminado',
        text: 'El tanque se ha eliminado correctamente.',
        timer: 2000,
        showConfirmButton: false
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Gestión de Sensores y Tanques
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Administrar dispositivos IoT y infraestructura acuática
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('sensors')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'sensors'
                ? 'border-sena-orange text-sena-orange'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Sensores IoT
          </button>
          <button
            onClick={() => setActiveTab('tanks')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'tanks'
                ? 'border-sena-orange text-sena-orange'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Tanques y Estanques
          </button>
        </nav>
      </div>

      {/* Sensors Tab */}
      {activeTab === 'sensors' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Sensores IoT ({sensors.length})
            </h2>
            <button
              onClick={() => setShowSensorModal(true)}
              className="bg-gradient-to-r from-sena-orange to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <Plus className="w-5 h-5" />
              <span>Nuevo Sensor</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sensors.map((sensor) => {
              const Icon = getSensorIcon(sensor.type);
              return (
                <Card key={sensor.id} className="hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-sena-orange/10 rounded-lg">
                        <Icon className="w-6 h-6 text-sena-orange" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {sensor.name}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {sensor.location}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      {sensor.status === 'active' ? (
                        <Wifi className="w-4 h-4 text-green-500" />
                      ) : (
                        <WifiOff className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Estado:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(sensor.status)}`}>
                        {sensor.status === 'active' ? 'Activo' : sensor.status === 'maintenance' ? 'Mantenimiento' : 'Inactivo'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Última lectura:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {sensor.lastReading.toFixed(1)}
                        {sensor.type === 'temperature' ? '°C' : sensor.type === 'ph' ? '' : ' mg/L'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Batería:</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                          <div
                            className={`h-2 rounded-full ${
                              sensor.batteryLevel > 50 ? 'bg-green-500' : 
                              sensor.batteryLevel > 20 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${sensor.batteryLevel}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">{sensor.batteryLevel}%</span>
                      </div>
                    </div>

                    <div className="flex justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                      <button
                        onClick={() => {
                          setEditingSensor(sensor);
                          setSensorForm({
                            name: sensor.name,
                            type: sensor.type,
                            location: sensor.location,
                            calibrationDate: sensor.calibrationDate
                          });
                          setShowSensorModal(true);
                        }}
                        className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteSensor(sensor.id)}
                        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Tanks Tab */}
      {activeTab === 'tanks' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Tanques y Estanques ({tanks.length})
            </h2>
            <button
              onClick={() => setShowTankModal(true)}
              className="bg-gradient-to-r from-sena-green to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <Plus className="w-5 h-5" />
              <span>Nuevo Tanque</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tanks.map((tank) => (
              <Card key={tank.id} className="hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-sena-blue/10 rounded-lg">
                      <MapPin className="w-6 h-6 text-sena-blue" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {tank.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {tank.location}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(tank.status)}`}>
                    {tank.status === 'active' ? 'Activo' : tank.status === 'maintenance' ? 'Mantenimiento' : 'Inactivo'}
                  </span>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-500 dark:text-gray-400">Nivel de agua</span>
                      <span className="font-medium">{((tank.currentLevel / tank.capacity) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-sena-blue to-blue-600 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${(tank.currentLevel / tank.capacity) * 100}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <span>{tank.currentLevel}L</span>
                      <span>{tank.capacity}L</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Sensores conectados:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {tank.sensors.length}
                    </span>
                  </div>

                  <div className="flex justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => {
                        setEditingTank(tank);
                        setTankForm({
                          name: tank.name,
                          location: tank.location,
                          capacity: tank.capacity,
                          currentLevel: tank.currentLevel
                        });
                        setShowTankModal(true);
                      }}
                      className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteTank(tank.id)}
                      className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Sensor Modal */}
      {showSensorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingSensor ? 'Editar Sensor' : 'Nuevo Sensor'}
              </h3>
              <button
                onClick={() => {
                  setShowSensorModal(false);
                  setEditingSensor(null);
                  setSensorForm({ name: '', type: 'temperature', location: '', calibrationDate: '' });
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSensorSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nombre del Sensor
                </label>
                <input
                  type="text"
                  value={sensorForm.name}
                  onChange={(e) => setSensorForm({ ...sensorForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-sena-orange focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tipo de Sensor
                </label>
                <select
                  value={sensorForm.type}
                  onChange={(e) => setSensorForm({ ...sensorForm, type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-sena-orange focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="temperature">Temperatura</option>
                  <option value="ph">pH</option>
                  <option value="oxygen">Oxígeno Disuelto</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Ubicación
                </label>
                <input
                  type="text"
                  value={sensorForm.location}
                  onChange={(e) => setSensorForm({ ...sensorForm, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-sena-orange focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Fecha de Calibración
                </label>
                <input
                  type="date"
                  value={sensorForm.calibrationDate}
                  onChange={(e) => setSensorForm({ ...sensorForm, calibrationDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-sena-orange focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowSensorModal(false);
                    setEditingSensor(null);
                    setSensorForm({ name: '', type: 'temperature', location: '', calibrationDate: '' });
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-sena-orange to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg transition-all duration-200"
                >
                  {editingSensor ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tank Modal */}
      {showTankModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingTank ? 'Editar Tanque' : 'Nuevo Tanque'}
              </h3>
              <button
                onClick={() => {
                  setShowTankModal(false);
                  setEditingTank(null);
                  setTankForm({ name: '', location: '', capacity: 0, currentLevel: 0 });
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleTankSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nombre del Tanque
                </label>
                <input
                  type="text"
                  value={tankForm.name}
                  onChange={(e) => setTankForm({ ...tankForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-sena-green focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Ubicación
                </label>
                <input
                  type="text"
                  value={tankForm.location}
                  onChange={(e) => setTankForm({ ...tankForm, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-sena-green focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Capacidad (Litros)
                </label>
                <input
                  type="number"
                  min="0"
                  value={tankForm.capacity}
                  onChange={(e) => setTankForm({ ...tankForm, capacity: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-sena-green focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nivel Actual (Litros)
                </label>
                <input
                  type="number"
                  min="0"
                  value={tankForm.currentLevel}
                  onChange={(e) => setTankForm({ ...tankForm, currentLevel: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-sena-green focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowTankModal(false);
                    setEditingTank(null);
                    setTankForm({ name: '', location: '', capacity: 0, currentLevel: 0 });
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-sena-green to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg transition-all duration-200"
                >
                  {editingTank ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};