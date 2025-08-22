'use client'

import { useState, useEffect } from 'react'
import { 
  ChartBarIcon, 
  AdjustmentsHorizontalIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

/**
 * @typedef {Object} SensorData
 * @property {string} timestamp - Marca de tiempo
 * @property {number} temperature - Temperatura en °C
 * @property {number} ph - Nivel de pH
 * @property {number} oxygen - Oxígeno en mg/L
 */
interface SensorData {
  timestamp: string;
  temperature: number;
  ph: number;
  oxygen: number;
}

/**
 * @typedef {Object} Alert
 * @property {string} id - ID de la alerta
 * @property {string} type - Tipo de alerta
 * @property {string} message - Mensaje de la alerta
 * @property {string} severity - Severidad de la alerta
 * @property {boolean} resolved - Estado de resolución
 */
interface Alert {
  id: string;
  type: string;
  message: string;
  severity: string;
  resolved: boolean;
}

/**
 * Página del Dashboard principal
 * @returns {JSX.Element} Componente del dashboard
 * @example
 * // Renderizada en la ruta '/dashboard'
 * <DashboardPage />
 */
export default function DashboardPage(): JSX.Element {
  const [sensorData, setSensorData] = useState<SensorData[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedTank, setSelectedTank] = useState<string>('tank-1');
  const [dateRange, setDateRange] = useState<string>('7d');
  const [loading, setLoading] = useState<boolean>(true);

  /**
   * Genera datos simulados de sensores
   * @returns {SensorData[]} Array de datos de sensores
   */
  const generateMockData = (): SensorData[] => {
    const data: SensorData[] = [];
    const now = new Date();
    
    for (let i = 23; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
      data.push({
        timestamp: timestamp.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        temperature: 22 + Math.random() * 6,
        ph: 6.5 + Math.random() * 1.5,
        oxygen: 5 + Math.random() * 3,
      });
    }
    
    return data;
  };

  /**
   * Genera alertas simuladas
   * @returns {Alert[]} Array de alertas
   */
  const generateMockAlerts = (): Alert[] => {
    return [
      {
        id: '1',
        type: 'TEMPERATURE_HIGH',
        message: 'Temperatura alta detectada en Tanque Principal (28.5°C)',
        severity: 'MEDIUM',
        resolved: false,
      },
      {
        id: '2',
        type: 'PH_LOW',
        message: 'Nivel de pH bajo en Tanque Secundario (6.2)',
        severity: 'LOW',
        resolved: false,
      },
      {
        id: '3',
        type: 'OXYGEN_OPTIMAL',
        message: 'Niveles de oxígeno óptimos en todos los tanques',
        severity: 'INFO',
        resolved: true,
      },
    ];
  };

  /**
   * Efecto para cargar datos iniciales
   */
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      
      // Simular carga de datos
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSensorData(generateMockData());
      setAlerts(generateMockAlerts());
      setLoading(false);
    };

    loadData();
  }, [selectedTank, dateRange]);

  /**
   * Obtiene el color de severidad para las alertas
   * @param {string} severity - Nivel de severidad
   * @returns {string} Clase CSS para el color
   */
  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'HIGH':
      case 'CRITICAL':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'MEDIUM':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'LOW':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <ChartBarIcon className="w-8 h-8 text-indigo-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-sm text-gray-600">Monitoreo en tiempo real</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <AdjustmentsHorizontalIcon className="w-6 h-6 text-gray-400" />
              <span className="text-sm text-gray-600">Filtros activos</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filtros */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-white/20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tanque
              </label>
              <select 
                value={selectedTank}
                onChange={(e) => setSelectedTank(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="tank-1">Tanque Principal</option>
                <option value="tank-2">Tanque Secundario</option>
                <option value="tank-3">Tanque de Pruebas</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rango de Fechas
              </label>
              <select 
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="24h">Últimas 24 horas</option>
                <option value="7d">Últimos 7 días</option>
                <option value="30d">Últimos 30 días</option>
                <option value="custom">Personalizado</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <button className="w-full bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
                Aplicar Filtros
              </button>
            </div>
          </div>
        </div>

        {/* Métricas Principales */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Temperatura Promedio</p>
                <p className="text-3xl font-bold text-gray-900">25.2°C</p>
                <p className="text-sm text-green-600">↑ 0.5°C desde ayer</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">🌡️</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">pH Promedio</p>
                <p className="text-3xl font-bold text-gray-900">7.1</p>
                <p className="text-sm text-blue-600">→ Estable</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">⚗️</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Oxígeno Promedio</p>
                <p className="text-3xl font-bold text-gray-900">6.8 mg/L</p>
                <p className="text-sm text-green-600">↑ 0.2 mg/L desde ayer</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">💨</span>
              </div>
            </div>
          </div>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Gráfico de Líneas - Tendencias */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Tendencias de Sensores (24h)
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={sensorData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="temperature" stroke="#ef4444" strokeWidth={2} name="Temperatura (°C)" />
                <Line type="monotone" dataKey="ph" stroke="#3b82f6" strokeWidth={2} name="pH" />
                <Line type="monotone" dataKey="oxygen" stroke="#22c55e" strokeWidth={2} name="Oxígeno (mg/L)" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfico de Barras - Comparación */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Comparación por Horas
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sensorData.slice(-6)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="temperature" fill="#ef4444" name="Temperatura" />
                <Bar dataKey="ph" fill="#3b82f6" name="pH" />
                <Bar dataKey="oxygen" fill="#22c55e" name="Oxígeno" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Alertas */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Alertas del Sistema
            </h3>
            <span className="text-sm text-gray-600">
              {alerts.filter(alert => !alert.resolved).length} alertas activas
            </span>
          </div>
          
          <div className="space-y-4">
            {alerts.map((alert) => (
              <div 
                key={alert.id}
                className={`p-4 rounded-lg border ${getSeverityColor(alert.severity)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    {alert.resolved ? (
                      <CheckCircleIcon className="w-5 h-5 text-green-600 mt-0.5" />
                    ) : (
                      <ExclamationTriangleIcon className="w-5 h-5 text-current mt-0.5" />
                    )}
                    <div>
                      <p className="font-medium text-current">
                        {alert.message}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        Tipo: {alert.type} • Severidad: {alert.severity}
                      </p>
                    </div>
                  </div>
                  
                  {!alert.resolved && (
                    <button className="text-sm bg-white px-3 py-1 rounded-md border hover:bg-gray-50 transition-colors">
                      Resolver
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}