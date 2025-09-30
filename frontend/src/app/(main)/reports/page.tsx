/**
 * @file page.tsx
 * @route frontend/src/app/(main)/reports
 * @description Página de la sección de reportes.
 * @author Kevin Mariano
 * @version 1.0.0
 * @since 1.0.0
 * @copyright SENA 2025
 */

 'use client';

 import React, { useState, useEffect, useCallback, useMemo } from 'react';
 import { Download, FileText, Clock, Loader, AlertCircle, Cpu, CheckSquare } from 'lucide-react';
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

 /**
 * @typedef {object} ReportFilters
 * @property {string | null} tankId
 * @property {string[]} sensorIds
 * @property {string} startDate
 * @property {string} endDate
 */
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
 * @param {object} props
 * @param {Sensor} props.sensor
 * @param {boolean} props.isSelected
 * @param {() => void} props.onToggle
 * @returns {React.ReactElement}
 */
const SensorCard: React.FC<{ sensor: Sensor; isSelected: boolean; onToggle: () => void; }> = ({ sensor, isSelected, onToggle }) => {
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
            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0", isSelected ? 'bg-sena-green text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300')}>
                {isAllCard ? <CheckSquare className="w-5 h-5" /> : <Cpu className="w-5 h-5" />}
            </div>
            <div>
                <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{sensor.name}</p>
                {!isAllCard && <p className="text-xs text-gray-500 dark:text-gray-400 capitalize truncate">{sensor.type}</p>}
            </div>
        </div>
    );
};

/**
 * @component Reports
 * @description Módulo para la generación y gestión de reportes.
 * @returns {React.ReactElement}
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

  const fetchInitialData = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const [tanksData, reportsData] = await Promise.all([
        tankService.getTanks(currentUser.id),
        // @ts-ignore
        reportService.getReports(currentUser.id),
      ]);
      setTanks(tanksData);
      setReports(reportsData);
      if (tanksData.length > 0) {
        setReportForm(prev => ({ ...prev, tankId: tanksData[0].id }));
      }
    } catch (error) {
      Swal.fire('Error', 'No se pudieron cargar los datos iniciales.', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    if (!socketManager) {
        console.warn('SocketManager no está disponible. No se pueden recibir actualizaciones en tiempo real.');
        return;
    }

    const handleReportUpdate = (updatedReport: Report) => {
        setReports(prevReports =>
            prevReports.map(r => r.id === updatedReport.id ? updatedReport : r)
        );
    };

    const handleConnect = () => {
      if (socketManager.socket) {
        console.log('🔌 Socket conectado, suscribiendo a eventos de reportes...');
        socketManager.socket.on('report_status_update', handleReportUpdate);
      }
    };
    
    const token = localStorage.getItem('accessToken');
    if (token) {
        if (!socketManager.getSocket() || !socketManager.getSocket()?.connected) {
            socketManager.connect(token);
        }
    } else {
        console.warn('No hay token de acceso, el socket no se conectará.');
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
  }, [fetchInitialData, currentUser]);

  useEffect(() => {
    if (reportForm.tankId && currentUser) {
        sensorService.getSensors(currentUser.id).then(allSensors => {
            setSensors(allSensors.filter(s => s.tankId === reportForm.tankId));
            setReportForm(prev => ({ ...prev, sensorIds: ['all'] }));
        });
    } else {
        setSensors([]);
    }
  }, [reportForm.tankId, currentUser]);

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

  const handleGenerateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    try {
      if (!reportForm.tankId) throw new Error('Debe seleccionar un tanque.');
      if (reportForm.sensorIds.length === 0) throw new Error('Debe seleccionar al menos un sensor.');
      if (!currentUser) throw new Error('Usuario no autenticado.');

      const tank = tanks.find(t => t.id === reportForm.tankId);
      const title = `Reporte ${tank?.name} - ${format(new Date(), 'dd-MM-yy')}`;

      const newReport = await reportService.createReport({
        reportName: title, 
        userId: currentUser.id,
        tankId: reportForm.tankId,
        sensorIds: reportForm.sensorIds.includes('all') ? sensors.map(s => s.id) : reportForm.sensorIds,
        startDate: reportForm.startDate, endDate: reportForm.endDate,
    });

      setReports(prevReports => [newReport, ...prevReports]);
      Swal.fire({ icon: 'success', title: 'Reporte Solicitado', text: `El reporte "${title}" se está generando.`, timer: 3000, showConfirmButton: false });
    } catch (error: any) {
      Swal.fire('Error', error.message || 'Ocurrió un error.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async (reportId: string, format: 'pdf' | 'xlsx') => {
    const downloadKey = `${reportId}-${format}`;
    setIsDownloading(prev => ({ ...prev, [downloadKey]: true }));
    try {
        await reportService.downloadReport(reportId, format);
    } catch (error) {
        Swal.fire('Error de Descarga', 'No se pudo descargar el archivo.', 'error');
    } finally {
        setIsDownloading(prev => ({ ...prev, [downloadKey]: false }));
    }
  };

  const getStatusChip = (status: ReportStatus) => {
    const styles: Record<ReportStatus, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 animate-pulse',
      PROCESSING: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 animate-pulse',
      COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      FAILED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    };
    return <span className={cn('px-3 py-1.5 rounded-full text-xs font-medium', styles[status])}>{statusTranslations[status]}</span>;
  };

  const tankMap = useMemo(() => {
    return tanks.reduce((acc, tank) => {
        acc[tank.id] = tank.name;
        return acc;
    }, {} as Record<string, string>);
  }, [tanks]);

  const isAllSelected = reportForm.sensorIds.includes('all');

  return (
    <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gestión de Reportes</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Crea nuevos reportes y descarga el historial de datos.</p>
        </div>

      {/* Uso de p-8 en la Card para dar el margen de separación interior/exterior solicitado */}
      <Card title="Generar Nuevo Reporte" className="border-l-4 border-sena-orange shadow-xl p-8"> 
        <form onSubmit={handleGenerateReport}>
          <fieldset disabled={isGenerating} className="group space-y-8"> {/* Espacio vertical aumentado en el fieldset */}
            {/* Diseño Responsivo Optimizado: 1 columna en móvil, 2 columnas en tablet, 3 columnas en desktop */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8"> 
              
              {/* Columna 1: Tanque */}
              <div className="order-1">
                <label className="label mb-4">Seleccione un Tanque</label>
                <select 
                    value={reportForm.tankId || ''} 
                    onChange={e => setReportForm(prev => ({ ...prev, tankId: e.target.value, sensorIds: ['all'] }))} 
                    className={cn(
                        "form-select", 
                        "w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-sena-orange focus:border-sena-orange dark:bg-gray-700 dark:text-white group-disabled:opacity-50"
                    )}
                    required
                >
                  <option value="" disabled>Seleccione...</option>
                  {tanks.map(tank => <option key={tank.id} value={tank.id}>{tank.name}</option>)}
                </select>
              </div>
              
              {/* Columna 3: Rango de Fechas (orden 3 en móvil, 2 en tablet/desktop) */}
              <div className="md:col-span-1 order-3 md:order-2">
                <label className="label mb-4">Defina el Rango de Fechas</label>
                <div className="space-y-3"> {/* Espacio vertical aumentado */}
                  <input 
                    type="date" 
                    value={reportForm.startDate} 
                    onChange={e => setReportForm(prev => ({ ...prev, startDate: e.target.value }))} 
                    className={cn(
                        "form-input",
                        "w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-sena-orange focus:border-sena-orange dark:bg-gray-700 dark:text-white group-disabled:opacity-50"
                    )}
                    required 
                    max={reportForm.endDate || format(new Date(), 'yyyy-MM-dd')} 
                  />
                  <input 
                    type="date" 
                    value={reportForm.endDate} 
                    onChange={e => setReportForm(prev => ({ ...prev, endDate: e.target.value }))} 
                    className={cn(
                        "form-input",
                        "w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-sena-orange focus:focus:border-sena-orange dark:bg-gray-700 dark:text-white group-disabled:opacity-50"
                    )}
                    required 
                    min={reportForm.startDate} 
                    max={format(new Date(), 'yyyy-MM-dd')} 
                  />
                </div>
              </div>

              {/* Columna 2: Sensores. Ocupa todo el ancho en tablet y desktop para estabilidad. */}
              <div className="md:col-span-2 lg:col-span-3 order-2 md:order-3"> 
                  <label className="label mb-4">Seleccione Sensores</label>
                  {sensors.length > 0 ? (
                      <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl mt-1 group-disabled:opacity-50">
                          {/* Grid de Sensores ajustado para pantallas pequeñas y grandes */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                              <SensorCard sensor={{ id: 'all', name: 'Todos los Sensores' } as Sensor} isSelected={isAllSelected} onToggle={() => handleToggleSensor('all')} />
                              {sensors.map(sensor => <SensorCard key={sensor.id} sensor={sensor} isSelected={!isAllSelected && reportForm.sensorIds.includes(sensor.id)} onToggle={() => handleToggleSensor(sensor.id)} />)}
                          </div>
                      </div>
                  ) : <p className="text-sm text-gray-500 mt-2 p-4 text-center bg-gray-50 dark:bg-gray-700/50 rounded-xl">Seleccione un tanque para ver sus sensores.</p>}
              </div>
            </div>
            
            <div className="flex justify-end items-center pt-6 mt-6 border-t dark:border-gray-700 gap-4">
              {isGenerating && <p className="text-sm text-sena-green animate-pulse flex items-center gap-2"><Loader className="w-4 h-4 animate-spin"/>Generando reporte, por favor espere...</p>}
              <button type="submit" disabled={isGenerating || !reportForm.tankId || reportForm.sensorIds.length === 0} className="btn-primary min-w-[200px] rounded-xl shadow-md">
                <FileText className="w-4 h-4 mr-2" /><span>Generar Reporte</span>
              </button>
            </div>
          </fieldset>
        </form>
      </Card>

      <Card title="Historial de Reportes Generados" className="shadow-xl">
        {reports.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400"><FileText className="w-16 h-16 mx-auto mb-4" /><h3 className="text-lg font-semibold">No hay reportes</h3><p className="mt-1 text-sm">Usa el formulario para crear tu primer reporte.</p></div>
        ) : (
          <div className="overflow-x-auto w-full"> 
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50/50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">Reporte</th>
                  <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">Parámetros</th>
                  <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">Estado</th>
                  <th className="px-4 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {reports.map((report) => {
                    const params = JSON.parse(report.parameters as any);
                    // CORRECCIÓN: Acceder a tankId desde params
                    const tankName = params.tankId ? tankMap[params.tankId] || 'Tanque Desconocido' : 'N/A';
                    return (
                        <tr key={report.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors duration-150">
                            <td className="px-4 py-4 max-w-[200px] overflow-hidden">
                                <p className="text-sm font-semibold">{report.title}</p>
                                <p className="text-xs text-gray-500">Creado: {format(parseISO(report.createdAt), 'dd/MM/yy HH:mm')}</p>
                            </td>
                            <td className="px-4 py-4 text-xs space-y-1 text-gray-700 dark:text-gray-300">
                                <p><strong>Tanque:</strong> {tankName}</p>
                                <p><strong>Fechas:</strong> {format(new Date(params.startDate + 'T00:00:00'), 'dd-MM-yy')} al {format(new Date(params.endDate + 'T00:00:00'), 'dd-MM-yy')}</p>
                                <p><strong>Sensores:</strong> {params.sensorIds.length >= sensors.length ? 'Todos' : `${params.sensorIds.length} Sensores`}</p>
                            </td>
                            <td className="px-4 py-4">{getStatusChip(report.status)}</td>
                            <td className="px-4 py-4 text-right whitespace-nowrap">
                              {report.status === 'COMPLETED' ? (
                                <div className="flex justify-end space-x-3 flex-shrink-0">
                                    <button 
                                        onClick={() => handleDownload(report.id, 'pdf')} 
                                        disabled={isDownloading[`${report.id}-pdf`]} 
                                        className="btn-secondary px-4 py-2 text-xs flex items-center rounded-xl font-medium"
                                    >
                                        {isDownloading[`${report.id}-pdf`] ? <Loader className="w-3.5 h-3.5 animate-spin"/> : <><Download className="w-3.5 h-3.5 mr-1.5"/>PDF</>}
                                    </button>
                                    <button 
                                        onClick={() => handleDownload(report.id, 'xlsx')} 
                                        disabled={isDownloading[`${report.id}-xlsx`]} 
                                        className="btn-primary bg-sena-green px-4 py-2 text-xs flex items-center rounded-xl font-medium"
                                    >
                                        {isDownloading[`${report.id}-xlsx`] ? <Loader className="w-3.5 h-3.5 animate-spin"/> : <><Download className="w-3.5 h-3.5 mr-1.5"/>Excel</>}
                                    </button>
                                </div>
                              ) : (
                                <div className="text-xs text-gray-400 italic flex items-center justify-end flex-shrink-0">
                                  {report.status === 'FAILED' ? <AlertCircle className="w-4 h-4 mr-2 text-red-500"/> : <Clock className="w-4 h-4 mr-2"/>}
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
};