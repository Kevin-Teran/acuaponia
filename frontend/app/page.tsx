'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  ChartBarIcon, 
  CogIcon, 
  ChatBubbleLeftRightIcon,
  DocumentChartBarIcon,
  BeakerIcon,
  ChartPieIcon,
  UserGroupIcon,
  CircleStackIcon
} from '@heroicons/react/24/outline'

/**
 * @typedef {Object} ModuleCard
 * @property {string} name - Nombre del módulo
 * @property {string} description - Descripción del módulo
 * @property {string} href - Ruta del módulo
 * @property {React.ComponentType} icon - Icono del módulo
 * @property {string} color - Color del módulo
 */
interface ModuleCard {
  name: string;
  description: string;
  href: string;
  icon: React.ComponentType<any>;
  color: string;
}

/**
 * Página principal de la aplicación
 * @returns {JSX.Element} Componente de la página principal
 * @example
 * // Renderizada automáticamente en la ruta '/'
 * <HomePage />
 */
export default function HomePage(): JSX.Element {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  /**
   * Efecto para actualizar la hora cada segundo
   */
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  /**
   * Lista de módulos disponibles en la aplicación
   * @type {ModuleCard[]}
   */
  const modules: ModuleCard[] = [
    {
      name: 'Dashboard',
      description: 'Monitoreo en tiempo real con filtros avanzados',
      href: '/dashboard',
      icon: ChartBarIcon,
      color: 'bg-blue-500',
    },
    {
      name: 'Analytics',
      description: 'Análisis detallado con sugerencias inteligentes',
      href: '/analytics',
      icon: ChartPieIcon,
      color: 'bg-purple-500',
    },
    {
      name: 'Predicciones',
      description: 'Predicciones basadas en IA y datos climáticos',
      href: '/predictions',
      icon: DocumentChartBarIcon,
      color: 'bg-green-500',
    },
    {
      name: 'Asistente IA',
      description: 'Chat inteligente para consultas y soporte',
      href: '/ai-assistant',
      icon: ChatBubbleLeftRightIcon,
      color: 'bg-indigo-500',
    },
    {
      name: 'Entrada de Datos',
      description: 'Simulación de sensores para pruebas',
      href: '/data-entry',
      icon: BeakerIcon,
      color: 'bg-orange-500',
    },
    {
      name: 'Reportes',
      description: 'Generación de reportes manuales y automáticos',
      href: '/reports',
      icon: DocumentChartBarIcon,
      color: 'bg-red-500',
    },
    {
      name: 'Tanques y Sensores',
      description: 'Configuración y gestión de equipos',
      href: '/tanks-sensors',
      icon: CircleStackIcon,
      color: 'bg-teal-500',
    },
    {
      name: 'Usuarios',
      description: 'Gestión de usuarios del sistema',
      href: '/users',
      icon: UserGroupIcon,
      color: 'bg-pink-500',
    },
    {
      name: 'Configuración',
      description: 'Ajustes generales del sistema',
      href: '/settings',
      icon: CogIcon,
      color: 'bg-gray-500',
    },
  ];

  /**
   * Formatea la fecha y hora actual
   * @returns {string} Fecha y hora formateada
   */
  const formatDateTime = (): string => {
    return currentTime.toLocaleString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <CircleStackIcon className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Sistema Acuaponía
                </h1>
                <p className="text-sm text-gray-600">
                  Monitoreo Inteligente IoT
                </p>
              </div>
            </div>
            
            <div className="text-right">
              <p className="text-sm text-gray-600 capitalize">
                {formatDateTime()}
              </p>
              <div className="flex items-center space-x-2 mt-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-green-600 font-medium">
                  Sistema Activo
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Welcome Section */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Bienvenido al Sistema de Acuaponía
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Plataforma integral para el monitoreo, análisis y gestión de sistemas de acuaponía 
            con tecnología IoT, inteligencia artificial y análisis predictivo.
          </p>
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {modules.map((module, index) => (
            <Link
              key={module.name}
              href={module.href}
              className="group block"
            >
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 border border-white/20 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 card-hover animate-fade-in"
                   style={{ animationDelay: `${index * 100}ms` }}>
                <div className="flex items-center space-x-4 mb-6">
                  <div className={`w-14 h-14 ${module.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                    <module.icon className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                      {module.name}
                    </h3>
                  </div>
                </div>
                
                <p className="text-gray-600 leading-relaxed mb-6">
                  {module.description}
                </p>
                
                <div className="flex items-center text-indigo-600 font-medium group-hover:text-indigo-700">
                  <span>Acceder al módulo</span>
                  <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" 
                       fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Stats Section */}
        <div className="mt-20 bg-white/60 backdrop-blur-sm rounded-3xl p-8 border border-white/20">
          <h3 className="text-2xl font-bold text-gray-900 text-center mb-8">
            Estado del Sistema
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CircleStackIcon className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">12</p>
              <p className="text-gray-600">Tanques Activos</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BeakerIcon className="w-8 h-8 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">48</p>
              <p className="text-gray-600">Sensores Online</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <DocumentChartBarIcon className="w-8 h-8 text-yellow-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">3</p>
              <p className="text-gray-600">Alertas Pendientes</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserGroupIcon className="w-8 h-8 text-purple-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">8</p>
              <p className="text-gray-600">Usuarios Activos</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white/50 backdrop-blur-sm border-t border-white/20 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-gray-600">
              © 2024 Sistema de Acuaponía SENA. Desarrollado con tecnología avanzada para el futuro sostenible.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}