/**
 * @file page.tsx
 * @route frontend/src/app/(main)/reports
 * @description 
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
 import { LoadingSpinner } from '@/components/common/LoadingSpinner';
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
            className={cn(
                'p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 flex items-center space-x-3 text-left relative',
                isSelected
                    ? 'border-sena-green bg-sena-green/10 dark:bg-sena-green/20 shadow-md'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-sena-green/50'
            )}
        >
            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0", isSelected ? 'bg-sena-green text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300')}>
                {isAllCard ? <CheckSquare className="w-5 h-5" /> : <Cpu className="w-5 h-5" />}
            </div>
            <div>
                <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{sensor.name}</p>
                {!isAllCard && <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{sensor.type}</p>}
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
    if (!socketManager || !socketManager.socket) {
        console.warn('Socket no está disponible. No se pueden recibir actualizaciones en tiempo real.');
        return;
    }

    const handleReportUpdate = (updatedReport: Report) => {
        setReports(prevReports =>
            prevReports.map(r => r.id === updatedReport.id ? updatedReport : r)
        );
    };

    socketManager.socket.on('report_status_update', handleReportUpdate);
    socketManager.init();
    
    return () => {
      if (socketManager && socketManager.socket) {
        socketManager.socket.off('report_status_update', handleReportUpdate);
      }
    };
  }, []);

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
    return <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium', styles[status])}>{statusTranslations[status]}</span>;
  };

  if (loading) return <LoadingSpinner fullScreen message="Cargando módulo de reportes..." />;

  const isAllSelected = reportForm.sensorIds.includes('all');

  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gestión de Reportes</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Crea nuevos reportes y descarga el historial de datos.</p>
        </div>

      <Card title="Generar Nuevo Reporte" className="border-l-4 border-sena-orange">
        <form onSubmit={handleGenerateReport}>
          <fieldset disabled={isGenerating} className="group space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="label">1. Seleccione un Tanque</label>
                <select value={reportForm.tankId || ''} onChange={e => setReportForm(prev => ({ ...prev, tankId: e.target.value, sensorIds: ['all'] }))} className="form-select group-disabled:opacity-50" required>
                  <option value="" disabled>Seleccione...</option>
                  {tanks.map(tank => <option key={tank.id} value={tank.id}>{tank.name}</option>)}
                </select>
              </div>
              <div className="lg:col-span-2">
                  <label className="label">2. Seleccione Sensores</label>
                  {sensors.length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-1 group-disabled:opacity-50">
                           <SensorCard sensor={{ id: 'all', name: 'Todos los Sensores' } as Sensor} isSelected={isAllSelected} onToggle={() => handleToggleSensor('all')} />
                          {sensors.map(sensor => <SensorCard key={sensor.id} sensor={sensor} isSelected={!isAllSelected && reportForm.sensorIds.includes(sensor.id)} onToggle={() => handleToggleSensor(sensor.id)} />)}
                      </div>
                  ) : <p className="text-sm text-gray-500 mt-2 p-4 text-center bg-gray-50 dark:bg-gray-700/50 rounded-md">Seleccione un tanque para ver sus sensores.</p>}
              </div>
              <div>
                <label className="label">3. Defina el Rango de Fechas</label>
                <div className="space-y-2">
                  <input type="date" value={reportForm.startDate} onChange={e => setReportForm(prev => ({ ...prev, startDate: e.target.value }))} className="form-input group-disabled:opacity-50" required max={reportForm.endDate || format(new Date(), 'yyyy-MM-dd')} />
                  <input type="date" value={reportForm.endDate} onChange={e => setReportForm(prev => ({ ...prev, endDate: e.target.value }))} className="form-input group-disabled:opacity-50" required min={reportForm.startDate} max={format(new Date(), 'yyyy-MM-dd')} />
                </div>
              </div>
            </div>
            <div className="flex justify-end items-center pt-4 mt-4 border-t dark:border-gray-700 gap-4">
              {isGenerating && <p className="text-sm text-sena-green animate-pulse flex items-center gap-2"><Loader className="w-4 h-4 animate-spin"/>Generando reporte, por favor espere...</p>}
              <button type="submit" disabled={isGenerating || !reportForm.tankId || reportForm.sensorIds.length === 0} className="btn-primary min-w-[200px]">
                <FileText className="w-4 h-4 mr-2" /><span>Generar Reporte</span>
              </button>
            </div>
          </fieldset>
        </form>
      </Card>

      <Card title="Historial de Reportes Generados">
        {reports.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400"><FileText className="w-16 h-16 mx-auto mb-4" /><h3 className="text-lg font-semibold">No hay reportes</h3><p className="mt-1 text-sm">Usa el formulario para crear tu primer reporte.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50/50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium">Reporte</th>
                  <th className="px-4 py-3 text-left text-xs font-medium">Parámetros</th>
                  <th className="px-4 py-3 text-left text-xs font-medium">Estado</th>
                  <th className="px-4 py-3 text-right text-xs font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {reports.map((report) => {
                    const params = JSON.parse(report.parameters as any);
                    return (
                        <tr key={report.id}>
                            <td className="px-4 py-4"><p className="text-sm font-semibold">{report.title}</p><p className="text-xs text-gray-500">Creado: {format(parseISO(report.createdAt), 'dd/MM/yy HH:mm')}</p></td>
                            <td className="px-4 py-4 text-xs space-y-1"><p><strong>Fechas:</strong> {format(new Date(params.startDate + 'T00:00:00'), 'dd-MM-yy')} al {format(new Date(params.endDate + 'T00:00:00'), 'dd-MM-yy')}</p><p><strong>Sensores:</strong> {params.sensorIds.length >= sensors.length ? 'Todos' : `${params.sensorIds.length} Sensores`}</p></td>
                            <td className="px-4 py-4">{getStatusChip(report.status)}</td>
                            <td className="px-4 py-4 text-right">
                              {report.status === 'COMPLETED' ? (
                                <div className="flex justify-end space-x-2">
                                    <button onClick={() => handleDownload(report.id, 'pdf')} disabled={isDownloading[`${report.id}-pdf`]} className="btn-secondary px-3 py-1 text-xs">{isDownloading[`${report.id}-pdf`] ? <Loader className="w-4 h-4 animate-spin"/> : 'PDF'}</button>
                                    <button onClick={() => handleDownload(report.id, 'xlsx')} disabled={isDownloading[`${report.id}-xlsx`]} className="btn-primary bg-sena-green px-3 py-1 text-xs">{isDownloading[`${report.id}-xlsx`] ? <Loader className="w-4 h-4 animate-spin"/> : 'Excel'}</button>
                                </div>
                              ) : (
                                <div className="text-xs text-gray-400 italic flex items-center justify-end">
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