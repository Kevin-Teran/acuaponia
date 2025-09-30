/**
 * @file page.tsx
 * @route frontend/src/app/(main)/reports
 * @description Página de reportes completamente funcional con descarga corregida
 * @author Kevin Mariano
 * @version 2.0.0
 * @since 1.0.0
 * @copyright SENA 2025
 */

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Download, FileText, Clock, Loader, AlertCircle, Cpu, CheckSquare, Info } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { useAuth } from '@/context/AuthContext';
import Swal from 'sweetalert2';
import { format, subDays, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import * as tankService from '@/services/tankService';
import * as sensorService from '@/services/sensorService';
import * as reportService from '@/services/reportService';
import { Report, ReportStatus, Tank, Sensor } from '@/types';
import { cn } from '@/utils/cn';
import { socketManager } from '@/services/socketService';

interface ReportFilters {
  tankId: string | null;
  sensorIds: string[];
  startDate: string;
  endDate: string;
}

const statusTranslations: Record<ReportStatus, string> = {
  PENDING: 'Pendiente',
  PROCESSING: 'Procesando',
  COMPLETED: 'Completado',
  FAILED: 'Fallido',
};

/**
 * Componente de tarjeta de sensor seleccionable
 */
const SensorCard: React.FC<{ 
  sensor: Sensor; 
  isSelected: boolean; 
  onToggle: () => void;
}> = ({ sensor, isSelected, onToggle }) => {
  const isAllCard = sensor.id === 'all';
  
  return (
    <div
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle();
        }
      }}
      role="checkbox" 
      aria-checked={isSelected}
      tabIndex={0}
      className={cn(
        'p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 flex items-center space-x-3 text-left relative group',
        isSelected
          ? 'border-sena-green bg-sena-green/10 dark:bg-sena-green/20 shadow-lg' 
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-sena-green/50',
        'focus:outline-none focus:ring-2 focus:ring-sena-green focus:ring-offset-2 dark:focus:ring-offset-gray-900'
      )}
    >
      <div className={cn(
        "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
        isSelected 
          ? 'bg-sena-green text-white' 
          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
      )}>
        {isAllCard ? <CheckSquare className="w-5 h-5" /> : <Cpu className="w-5 h-5" />}
      </div>
      <div>
        <p className="font-bold text-sm text-gray-900 dark:text-white truncate">
          {sensor.name}
        </p>
        {!isAllCard && (
          <p className="text-xs text-gray-500 dark:text-gray-400 capitalize truncate">
            {sensor.type}
          </p>
        )}
      </div>
    </div>
  );
};

/**
 * Componente principal de la página de reportes
 */
export default function Reports() {
  const { user: currentUser } = useAuth();
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState<Record<string, boolean>>({});

  const [reportForm, setReportForm] = useState<ReportFilters>({
    tankId: null,
    sensorIds: ['all'],
    startDate: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  });

  /**
   * Carga inicial de datos
   */
  const fetchInitialData = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      console.log('🔄 [Reports] Cargando datos iniciales...');
      const [tanksData, reportsData] = await Promise.all([
        tankService.getTanks(currentUser.id),
        reportService.getReports(currentUser.id),
      ]);
      
      console.log('✅ [Reports] Datos cargados:', {
        tanks: tanksData.length,
        reports: reportsData.length
      });
      
      setTanks(tanksData);
      setReports(reportsData);
      
      if (tanksData.length > 0) {
        setReportForm(prev => ({ ...prev, tankId: tanksData[0].id }));
      }
    } catch (error: any) {
      console.error('❌ [Reports] Error cargando datos:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudieron cargar los datos iniciales.',
      });
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  /**
   * Configuración de WebSocket para actualizaciones en tiempo real
   */
  useEffect(() => {
    if (!socketManager) {
      console.warn('⚠️ [Reports] SocketManager no disponible');
      return;
    }

    const handleReportUpdate = (updatedReport: Report) => {
      console.log('📨 [Reports] Actualización de reporte recibida:', updatedReport.id);
      setReports(prevReports =>
        prevReports.map(r => r.id === updatedReport.id ? updatedReport : r)
      );
    };

    const handleConnect = () => {
      if (socketManager.socket) {
        console.log('✅ [Reports] Socket conectado, suscribiendo a eventos...');
        socketManager.socket.on('report_status_update', handleReportUpdate);
      }
    };
    
    const token = localStorage.getItem('accessToken');
    if (token) {
      if (!socketManager.getSocket() || !socketManager.getSocket()?.connected) {
        socketManager.connect(token);
      }
    }

    if (socketManager.getSocket()?.connected) {
      handleConnect();
    } else {
      socketManager.getSocket()?.on('connect', handleConnect);
    }
    
    return () => {
      if (socketManager && socketManager.socket) {
        socketManager.socket.off('report_status_update', handleReportUpdate);
        socketManager.socket.off('connect', handleConnect);
      }
    };
  }, []);

  /**
   * Carga sensores cuando cambia el tanque seleccionado
   */
  useEffect(() => {
    if (reportForm.tankId && currentUser) {
      console.log('🔄 [Reports] Cargando sensores para tanque:', reportForm.tankId);
      sensorService.getSensors(currentUser.id)
        .then(allSensors => {
          const tankSensors = allSensors.filter(s => s.tankId === reportForm.tankId);
          console.log('✅ [Reports] Sensores cargados:', tankSensors.length);
          setSensors(tankSensors);
          setReportForm(prev => ({ ...prev, sensorIds: ['all'] }));
        })
        .catch(error => {
          console.error('❌ [Reports] Error cargando sensores:', error);
        });
    } else {
      setSensors([]);
    }
  }, [reportForm.tankId, currentUser]);

  /**
   * Maneja la selección/deselección de sensores
   */
  const handleToggleSensor = useCallback((sensorId: string) => {
    setReportForm(prev => {
      if (sensorId === 'all') {
        return { ...prev, sensorIds: ['all'] };
      }

      let newSelection = prev.sensorIds.filter(id => id !== 'all');
      const isSelected = newSelection.includes(sensorId);

      newSelection = isSelected
        ? newSelection.filter(id => id !== sensorId)
        : [...newSelection, sensorId];

      if (sensors.length > 0 && newSelection.length === sensors.length) {
        return { ...prev, sensorIds: ['all'] };
      }
      
      if (newSelection.length === 0) {
        return { ...prev, sensorIds: [] };
      }

      return { ...prev, sensorIds: newSelection };
    });
  }, [sensors]);

  /**
   * Genera un nuevo reporte
   */
  const handleGenerateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    
    try {
      console.log('🚀 [Reports] Generando reporte...');
      
      // Validaciones
      if (!reportForm.tankId) {
        throw new Error('Debe seleccionar un tanque.');
      }
      if (reportForm.sensorIds.length === 0) {
        throw new Error('Debe seleccionar al menos un sensor.');
      }
      if (!currentUser) {
        throw new Error('Usuario no autenticado.');
      }

      const tank = tanks.find(t => t.id === reportForm.tankId);
      const title = `Reporte ${tank?.name} - ${format(new Date(), 'dd-MM-yy')}`;

      const reportData = {
        reportName: title,
        tankId: reportForm.tankId,
        sensorIds: reportForm.sensorIds.includes('all') 
          ? sensors.map(s => s.id) 
          : reportForm.sensorIds,
        startDate: reportForm.startDate,
        endDate: reportForm.endDate,
      };

      console.log('📤 [Reports] Enviando datos del reporte:', reportData);

      const newReport = await reportService.createReport(reportData);
      
      console.log('✅ [Reports] Reporte creado:', newReport.id);

      setReports(prevReports => [newReport, ...prevReports]);
      
      await Swal.fire({
        icon: 'success',
        title: 'Reporte Solicitado',
        text: `El reporte "${title}" se está generando. Recibirás una notificación cuando esté listo.`,
        timer: 3000,
        showConfirmButton: false,
      });
      
    } catch (error: any) {
      console.error('❌ [Reports] Error generando reporte:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Ocurrió un error al generar el reporte.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Descarga un reporte en el formato especificado
   */
  const handleDownload = async (reportId: string, format: 'pdf' | 'xlsx') => {
    const downloadKey = `${reportId}-${format}`;
    setIsDownloading(prev => ({ ...prev, [downloadKey]: true }));
    
    try {
      console.log(`📥 [Reports] Descargando reporte ${reportId} en formato ${format}...`);
      await reportService.downloadReport(reportId, format);
      console.log(`✅ [Reports] Descarga completada`);
      
      await Swal.fire({
        icon: 'success',
        title: 'Descarga Exitosa',
        text: `El archivo ${format.toUpperCase()} se ha descargado correctamente.`,
        timer: 2000,
        showConfirmButton: false,
      });
      
    } catch (error: any) {
      console.error(`❌ [Reports] Error en descarga:`, error);
      Swal.fire({
        icon: 'error',
        title: 'Error de Descarga',
        text: 'No se pudo descargar el archivo. Por favor, intenta nuevamente.',
      });
    } finally {
      setIsDownloading(prev => ({ ...prev, [downloadKey]: false }));
    }
  };

  /**
   * Chip de estado con estilos según el estado del reporte
   */
  const getStatusChip = (status: ReportStatus) => {
    const styles: Record<ReportStatus, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 animate-pulse',
      PROCESSING: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 animate-pulse',
      COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      FAILED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    };
    
    return (
      <span className={cn('px-3 py-1.5 rounded-full text-xs font-medium', styles[status])}>
        {statusTranslations[status]}
      </span>
    );
  };

  /**
   * Mapa de nombres de tanques para referencia rápida
   */
  const tankMap = useMemo(() => {
    return tanks.reduce((acc, tank) => {
      acc[tank.id] = tank.name;
      return acc;
    }, {} as Record<string, string>);
  }, [tanks]);

  const isAllSelected = reportForm.sensorIds.includes('all');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin mx-auto mb-4 text-sena-green" />
          <p className="text-gray-600 dark:text-gray-400">Cargando reportes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Encabezado */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Gestión de Reportes
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Crea nuevos reportes y descarga el historial de datos de tus tanques.
        </p>
      </div>

      {/* Información de reportes automáticos */}
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <div className="flex items-start space-x-3">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
              Reportes Automáticos
            </h3>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              El sistema genera reportes automáticamente cada 200 datos registrados y al final de cada día. 
              Puedes habilitar o deshabilitar esta función en la sección de{' '}
              <a href="/settings" className="underline font-medium hover:text-blue-600">
                Configuración → Notificaciones
              </a>.
            </p>
          </div>
        </div>
      </Card>

      {/* Formulario de generación de reportes */}
      <Card 
        title="Generar Nuevo Reporte" 
        className="border-l-4 border-sena-orange shadow-xl p-8"
      >
        <form onSubmit={handleGenerateReport}>
          <fieldset disabled={isGenerating} className="group space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              
              {/* Selección de Tanque */}
              <div className="order-1">
                <label className="label mb-4">Seleccione un Tanque</label>
                <select 
                  value={reportForm.tankId || ''} 
                  onChange={e => setReportForm(prev => ({ 
                    ...prev, 
                    tankId: e.target.value, 
                    sensorIds: ['all'] 
                  }))} 
                  className={cn(
                    "form-select w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600",
                    "rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-sena-orange",
                    "focus:border-sena-orange dark:bg-gray-700 dark:text-white",
                    "group-disabled:opacity-50 group-disabled:cursor-not-allowed"
                  )}
                  required
                >
                  <option value="" disabled>Seleccione...</option>
                  {tanks.map(tank => (
                    <option key={tank.id} value={tank.id}>{tank.name}</option>
                  ))}
                </select>
              </div>
              
              {/* Rango de Fechas */}
              <div className="md:col-span-1 order-3 md:order-2">
                <label className="label mb-4">Defina el Rango de Fechas</label>
                <div className="space-y-3">
                  <input 
                    type="date" 
                    value={reportForm.startDate} 
                    onChange={e => setReportForm(prev => ({ 
                      ...prev, 
                      startDate: e.target.value 
                    }))} 
                    className={cn(
                      "form-input w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600",
                      "rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-sena-orange",
                      "focus:border-sena-orange dark:bg-gray-700 dark:text-white",
                      "group-disabled:opacity-50"
                    )}
                    required 
                    max={reportForm.endDate || format(new Date(), 'yyyy-MM-dd')} 
                  />
                  <input 
                    type="date" 
                    value={reportForm.endDate} 
                    onChange={e => setReportForm(prev => ({ 
                      ...prev, 
                      endDate: e.target.value 
                    }))} 
                    className={cn(
                      "form-input w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600",
                      "rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-sena-orange",
                      "focus:border-sena-orange dark:bg-gray-700 dark:text-white",
                      "group-disabled:opacity-50"
                    )}
                    required 
                    min={reportForm.startDate} 
                    max={format(new Date(), 'yyyy-MM-dd')} 
                  />
                </div>
              </div>

              {/* Selección de Sensores */}
              <div className="md:col-span-2 lg:col-span-3 order-2 md:order-3">
                <label className="label mb-4">Seleccione Sensores</label>
                {sensors.length > 0 ? (
                  <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl mt-1 group-disabled:opacity-50">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                      <SensorCard 
                        sensor={{ id: 'all', name: 'Todos los Sensores' } as Sensor} 
                        isSelected={isAllSelected} 
                        onToggle={() => handleToggleSensor('all')} 
                      />
                      {sensors.map(sensor => (
                        <SensorCard 
                          key={sensor.id} 
                          sensor={sensor} 
                          isSelected={!isAllSelected && reportForm.sensorIds.includes(sensor.id)} 
                          onToggle={() => handleToggleSensor(sensor.id)} 
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 mt-2 p-4 text-center bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    Seleccione un tanque para ver sus sensores.
                  </p>
                )}
              </div>
            </div>
            
            {/* Botón de envío */}
            <div className="flex justify-end items-center pt-6 mt-6 border-t dark:border-gray-700 gap-4">
              {isGenerating && (
                <p className="text-sm text-sena-green animate-pulse flex items-center gap-2">
                  <Loader className="w-4 h-4 animate-spin"/>
                  Generando reporte, por favor espere...
                </p>
              )}
              <button 
                type="submit" 
                disabled={isGenerating || !reportForm.tankId || reportForm.sensorIds.length === 0} 
                className="btn-primary min-w-[200px] rounded-xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileText className="w-4 h-4 mr-2" />
                <span>Generar Reporte</span>
              </button>
            </div>
          </fieldset>
        </form>
      </Card>

      {/* Historial de Reportes */}
      <Card title="Historial de Reportes Generados" className="shadow-xl">
        {reports.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold">No hay reportes</h3>
            <p className="mt-1 text-sm">
              Usa el formulario de arriba para crear tu primer reporte.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50/50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                    Reporte
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                    Parámetros
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                    Estado
                  </th>
                  <th className="px-4 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {reports.map((report) => {
                  const params = JSON.parse(report.parameters as any);
                  const tankName = params.tankId ? tankMap[params.tankId] || 'Tanque Desconocido' : 'N/A';
                  
                  return (
                    <tr 
                      key={report.id} 
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors duration-150"
                    >
                      <td className="px-4 py-4 max-w-[200px] overflow-hidden">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {report.title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Creado: {format(parseISO(report.createdAt), 'dd/MM/yy HH:mm', { locale: es })}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-xs space-y-1 text-gray-700 dark:text-gray-300">
                        <p><strong>Tanque:</strong> {tankName}</p>
                        <p>
                          <strong>Fechas:</strong>{' '}
                          {format(new Date(params.startDate + 'T00:00:00'), 'dd-MM-yy', { locale: es })}{' '}
                          al{' '}
                          {format(new Date(params.endDate + 'T00:00:00'), 'dd-MM-yy', { locale: es })}
                        </p>
                        <p>
                          <strong>Sensores:</strong>{' '}
                          {params.sensorIds.length >= sensors.length 
                            ? 'Todos' 
                            : `${params.sensorIds.length} Sensores`}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        {getStatusChip(report.status)}
                      </td>
                      <td className="px-4 py-4 text-right whitespace-nowrap">
                        {report.status === 'COMPLETED' ? (
                          <div className="flex justify-end space-x-3 flex-shrink-0">
                            <button 
                              onClick={() => handleDownload(report.id, 'pdf')} 
                              disabled={isDownloading[`${report.id}-pdf`]} 
                              className="btn-secondary px-4 py-2 text-xs flex items-center rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isDownloading[`${report.id}-pdf`] ? (
                                <Loader className="w-3.5 h-3.5 animate-spin"/>
                              ) : (
                                <>
                                  <Download className="w-3.5 h-3.5 mr-1.5"/>
                                  PDF
                                </>
                              )}
                            </button>
                            <button 
                              onClick={() => handleDownload(report.id, 'xlsx')} 
                              disabled={isDownloading[`${report.id}-xlsx`]} 
                              className="btn-primary bg-sena-green px-4 py-2 text-xs flex items-center rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isDownloading[`${report.id}-xlsx`] ? (
                                <Loader className="w-3.5 h-3.5 animate-spin"/>
                              ) : (
                                <>
                                  <Download className="w-3.5 h-3.5 mr-1.5"/>
                                  Excel
                                </>
                              )}
                            </button>
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400 italic flex items-center justify-end flex-shrink-0">
                            {report.status === 'FAILED' ? (
                              <AlertCircle className="w-4 h-4 mr-2 text-red-500"/>
                            ) : (
                              <Clock className="w-4 h-4 mr-2"/>
                            )}
                            <span>{statusTranslations[report.status]}...</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}