import React, { useState, useEffect, useCallback } from 'react';
import { Download, FileText, Filter, Droplets, Plus, Clock, Loader } from 'lucide-react';
import { Card } from '../common/Card';
import { useAuth } from '../../hooks/useAuth';
import { LoadingSpinner } from '../common/LoadingSpinner';
import Swal from 'sweetalert2';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import * as tankService from '../../services/tankService';
import * as sensorService from '../../services/sensorService';
import * as reportService from '../../services/reportService';
import { Report, ReportType, Tank, Sensor } from '../../types';
import { cn } from '../../utils/cn';
import { socketService } from '../../services/socketService';

interface ReportFilters {
  tankId: string | null;
  sensorIds: string[];
  startDate: string;
  endDate: string;
}

export const Reports: React.FC = () => {
  const { user } = useAuth();
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const [reportForm, setReportForm] = useState<ReportFilters>({
      tankId: null,
      sensorIds: ['all'],
      startDate: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
      endDate: format(new Date(), 'yyyy-MM-dd'),
  });

  const fetchReports = useCallback(async () => {
    if (!user) return;
    try {
      const fetchedReports = await reportService.getReports(user.id);
      setReports(fetchedReports);
    } catch (error) {
      Swal.fire('Error', 'No se pudo cargar el historial de reportes.', 'error');
    }
  }, [user]);

  const fetchInitialData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [tanksData, reportsData] = await Promise.all([
        tankService.getTanks(user.id),
        reportService.getReports(user.id),
      ]);
      setTanks(tanksData);
      setReports(reportsData);
      
      if (tanksData.length > 0) {
        const firstTankId = tanksData[0].id;
        setReportForm(prev => ({ ...prev, tankId: firstTankId }));
        const sensorsData = await sensorService.getSensors(user.id);
        setSensors(sensorsData.filter(s => s.tankId === firstTankId));
      }
    } catch (error) {
      Swal.fire('Error', 'No se pudo cargar los datos iniciales.', 'error');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);
  
  useEffect(() => {
    const handleReportUpdate = (updatedReport: Report) => {
        setReports(prevReports => {
            const index = prevReports.findIndex(r => r.id === updatedReport.id);
            if (index !== -1) {
                const newReports = [...prevReports];
                newReports[index] = updatedReport;
                return newReports;
            }
            return prevReports;
        });
    };

    socketService.connect();
    socketService.onReportUpdate(handleReportUpdate);

    return () => {
        socketService.offReportUpdate(handleReportUpdate);
        socketService.disconnect();
    };
  }, []);
  
  useEffect(() => {
    if (reportForm.tankId && user) {
        sensorService.getSensors(user.id)
            .then(sensorsData => {
                const filteredSensors = sensorsData.filter(s => s.tankId === reportForm.tankId);
                setSensors(filteredSensors);
                setReportForm(prev => ({ ...prev, sensorIds: ['all'] }));
            });
    }
  }, [reportForm.tankId, user]);
  
  const handleToggleSensor = useCallback((sensorId: string) => {
    setReportForm(prev => {
      let newSensorIds: string[] = [];
      if (sensorId === 'all') {
        newSensorIds = prev.sensorIds.includes('all') ? [] : ['all'];
      } else {
        newSensorIds = prev.sensorIds.filter(id => id !== 'all');
        newSensorIds = newSensorIds.includes(sensorId)
            ? newSensorIds.filter(id => id !== sensorId)
            : [...newSensorIds, sensorId];
      }
      return { ...prev, sensorIds: newSensorIds };
    });
  }, []);

  const handleGenerateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);

    try {
      const start = new Date(reportForm.startDate);
      const end = new Date(reportForm.endDate);
      const now = new Date();

      if (start > end) {
        throw new Error('La fecha de inicio no puede ser posterior a la fecha de fin.');
      }
      if (end > now) {
        throw new Error('La fecha de fin no puede ser superior a la fecha actual.');
      }
      
      const tank = tanks.find(t => t.id === reportForm.tankId);
      if (!tank) {
          throw new Error('Debe seleccionar un tanque válido.');
      }
      
      const selectedSensors = reportForm.sensorIds.includes('all') || reportForm.sensorIds.length === 0
          ? sensors
          : sensors.filter(s => reportForm.sensorIds.includes(s.id));

      let title = `Reporte de ${tank.name}`;
      if (selectedSensors.length > 0 && selectedSensors.length < sensors.length) {
          title += ` (${selectedSensors.map(s => s.name).join(', ')})`;
      }
      title += ` - ${format(new Date(), 'dd-MM-yy HH:mm')}`;

      const newReport = await reportService.createReport({
        title,
        type: 'CUSTOM',
        tankId: reportForm.tankId,
        sensorIds: reportForm.sensorIds.includes('all') || reportForm.sensorIds.length === 0 ? sensors.map(s => s.id) : reportForm.sensorIds,
        startDate: reportForm.startDate,
        endDate: reportForm.endDate,
      });

      setReports(prevReports => [newReport, ...prevReports]);

      await Swal.fire({
        icon: 'success',
        title: 'Reporte solicitado',
        text: `El reporte "${title}" se está generando. Puedes ver su estado en la tabla.`,
        timer: 3000,
        showConfirmButton: false,
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Ocurrió un error inesperado.';
      await Swal.fire('Error', errorMessage, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const getStatusChip = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      PROCESSING: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      FAILED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    };
    return <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium', styles[status])}>{status}</span>;
  };
  
  if (loading) {
    return <LoadingSpinner fullScreen message="Cargando reportes..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gestión de Reportes</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Crea nuevos reportes y revisa su estado y descarga.</p>
        </div>
      </div>

      <Card title="Filtros de Reporte" subtitle="Selecciona los parámetros para generar un nuevo reporte." className="border-l-4 border-sena-orange">
        <form onSubmit={handleGenerateReport} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="label">Tanque</label>
              <select
                value={reportForm.tankId || ''}
                onChange={e => setReportForm(prev => ({ ...prev, tankId: e.target.value }))}
                className="form-select"
                required
              >
                <option value="" disabled>Seleccione un tanque</option>
                {tanks.map(tank => (
                  <option key={tank.id} value={tank.id}>{tank.name}</option>
                ))}
              </select>
            </div>
            <div>
                <label className="label">Sensores a incluir</label>
                <div className="mt-1 space-y-2 max-h-48 overflow-y-auto p-2 border rounded-md dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50">
                    {sensors.length > 0 ? (
                        <>
                            <div className="flex items-center">
                                <input
                                    id="all-sensors"
                                    type="checkbox"
                                    checked={reportForm.sensorIds.includes('all') || reportForm.sensorIds.length === 0}
                                    onChange={() => handleToggleSensor('all')}
                                    className="h-4 w-4 rounded border-gray-300 text-sena-green focus:ring-sena-green"
                                />
                                <label htmlFor="all-sensors" className="ml-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Todos los sensores</label>
                            </div>
                            {sensors.map(sensor => (
                                <div key={sensor.id} className="flex items-center">
                                    <input
                                        id={`sensor-${sensor.id}`}
                                        type="checkbox"
                                        checked={reportForm.sensorIds.includes(sensor.id)}
                                        onChange={() => handleToggleSensor(sensor.id)}
                                        className="h-4 w-4 rounded border-gray-300 text-sena-green focus:ring-sena-green"
                                    />
                                    <label htmlFor={`sensor-${sensor.id}`} className="ml-3 text-sm text-gray-700 dark:text-gray-300 capitalize">{sensor.name} ({sensor.type})</label>
                                </div>
                            ))}
                        </>
                    ) : <p className="text-sm text-gray-500 p-4 text-center">Seleccione un tanque para ver sensores.</p>}
                </div>
            </div>
            <div>
              <label className="label">Fechas</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                    type="date"
                    value={reportForm.startDate}
                    onChange={e => setReportForm(prev => ({ ...prev, startDate: e.target.value }))}
                    className="form-input"
                    required
                    max={reportForm.endDate || format(new Date(), 'yyyy-MM-dd')}
                />
                <input
                    type="date"
                    value={reportForm.endDate}
                    onChange={e => setReportForm(prev => ({ ...prev, endDate: e.target.value }))}
                    className="form-input"
                    required
                    min={reportForm.startDate}
                    max={format(new Date(), 'yyyy-MM-dd')}
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end pt-4 mt-4 border-t dark:border-gray-700">
            <button type="submit" disabled={isGenerating || !reportForm.tankId} className="btn-primary min-w-[200px] relative">
              {isGenerating ? <LoadingSpinner bare /> : <><FileText className="w-4 h-4 mr-2" /><span>Generar Reporte</span></>}
            </button>
          </div>
        </form>
      </Card>

      <Card title="Historial de Reportes Generados" subtitle={`Mostrando ${reports.length} reportes`}>
        {reports.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <FileText className="w-16 h-16 mx-auto mb-4" />
            <h3 className="text-lg font-semibold">No hay reportes generados aún</h3>
            <p className="mt-1 text-sm">Usa el formulario de arriba para crear tu primer reporte.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Título</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fechas</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Descarga</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {reports.map((report) => {
                    const parameters = JSON.parse(report.parameters as string);
                    return (
                        <tr key={report.id}>
                            <td className="px-6 py-4 whitespace-nowrap"><p className="text-sm font-medium text-gray-900 dark:text-white">{report.title}</p></td>
                            <td className="px-6 py-4 whitespace-nowrap"><p className="text-sm text-gray-500 dark:text-gray-400">{format(new Date(parameters.startDate), 'dd/MM/yyyy')} - {format(new Date(parameters.endDate), 'dd/MM/yyyy')}</p></td>
                            <td className="px-6 py-4 whitespace-nowrap">{getStatusChip(report.status)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              {report.status === 'COMPLETED' ? (
                                <div className="flex justify-end space-x-2">
                                    <button onClick={() => reportService.downloadReport(report.id, 'pdf')} className="btn-secondary">
                                      <FileText className="w-4 h-4 mr-2" /> PDF
                                    </button>
                                    <button onClick={() => reportService.downloadReport(report.id, 'xlsx')} className="btn-primary">
                                      <Download className="w-4 h-4 mr-2" /> Excel
                                    </button>
                                </div>
                              ) : (
                                <span className="text-gray-400 dark:text-gray-500 flex items-center justify-end">
                                  <Clock className="w-4 h-4 mr-2"/>
                                  {report.status === 'FAILED' ? 'Error' : 'En proceso...'}
                                </span>
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