import React, { useState } from 'react';
import { Calendar, Download, FileText, Filter, CheckCircle } from 'lucide-react';
import { Card } from '../common/Card';
import { useSensorData } from '../../hooks/useSensorData';
import { generatePDFReport, generateExcelReport } from '../../utils/reportGenerator';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import Swal from 'sweetalert2';

export const Reports: React.FC = () => {
  const { data } = useSensorData();
  const [dateRange, setDateRange] = useState({
    startDate: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  });
  const [selectedParameter, setSelectedParameter] = useState('all');
  const [generating, setGenerating] = useState(false);

  const handleExportPDF = async () => {
    if (filteredData.length === 0) {
      await Swal.fire({
        icon: 'warning',
        title: 'Sin datos',
        text: 'No hay datos para exportar en el rango seleccionado.',
        confirmButtonColor: '#FF671F'
      });
      return;
    }

    setGenerating(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      generatePDFReport(filteredData, { ...dateRange, selectedParameter });
      
      await Swal.fire({
        icon: 'success',
        title: '¡PDF Generado!',
        text: 'El reporte PDF se ha descargado exitosamente.',
        timer: 2000,
        showConfirmButton: false,
        confirmButtonColor: '#FF671F'
      });
    } catch (error) {
      console.error('Error generando PDF:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Hubo un problema al generar el PDF. Intente nuevamente.',
        confirmButtonColor: '#FF671F'
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleExportExcel = async () => {
    if (filteredData.length === 0) {
      await Swal.fire({
        icon: 'warning',
        title: 'Sin datos',
        text: 'No hay datos para exportar en el rango seleccionado.',
        confirmButtonColor: '#FF671F'
      });
      return;
    }

    setGenerating(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      generateExcelReport(filteredData, { ...dateRange, selectedParameter });
      
      await Swal.fire({
        icon: 'success',
        title: '¡Excel Generado!',
        text: 'El reporte Excel se ha descargado exitosamente.',
        timer: 2000,
        showConfirmButton: false,
        confirmButtonColor: '#FF671F'
      });
    } catch (error) {
      console.error('Error generando Excel:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Hubo un problema al generar el Excel. Intente nuevamente.',
        confirmButtonColor: '#FF671F'
      });
    } finally {
      setGenerating(false);
    }
  };

  const filteredData = data.filter(item => {
    const itemDate = format(new Date(item.timestamp), 'yyyy-MM-dd');
    return itemDate >= dateRange.startDate && itemDate <= dateRange.endDate;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Reportes
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Generar y exportar reportes de datos históricos
        </p>
      </div>

      {/* Filtros */}
      <Card title="Filtros de Reporte" className="border-l-4 border-sena-orange">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Fecha de inicio
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-sena-orange bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Fecha de fin
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-sena-orange bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Parámetro
            </label>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={selectedParameter}
                onChange={(e) => setSelectedParameter(e.target.value)}
                className="w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-sena-orange bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none"
              >
                <option value="all">Todos los parámetros</option>
                <option value="temperature">Temperatura</option>
                <option value="ph">pH</option>
                <option value="oxygen">Oxígeno Disuelto</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Acciones de exportación */}
      <Card title="Exportar Datos" subtitle={`${filteredData.length} registros seleccionados`} className="border-l-4 border-sena-green">
        <div className="flex flex-wrap gap-4">
          <button
            onClick={handleExportPDF}
            disabled={generating || filteredData.length === 0}
            className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:bg-gray-400 text-white rounded-lg transition-all duration-200 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
          >
            <FileText className="w-5 h-5" />
            <span>{generating ? 'Generando PDF...' : 'Exportar PDF'}</span>
          </button>
          
          <button
            onClick={handleExportExcel}
            disabled={generating || filteredData.length === 0}
            className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-sena-green to-green-700 hover:from-green-700 hover:to-green-800 disabled:bg-gray-400 text-white rounded-lg transition-all duration-200 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
          >
            <Download className="w-5 h-5" />
            <span>{generating ? 'Generando Excel...' : 'Exportar Excel'}</span>
          </button>
        </div>
        
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start space-x-3">
            <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 dark:text-blue-100">Contenido del reporte</h4>
              <ul className="text-sm text-blue-700 dark:text-blue-300 mt-1 space-y-1">
                <li>• Estadísticas resumen (promedio, mínimo, máximo, desviación estándar)</li>
                <li>• Datos detallados del período seleccionado</li>
                <li>• Formato profesional con colores institucionales SENA</li>
                <li>• Información de generación y metadatos</li>
              </ul>
            </div>
          </div>
        </div>
      </Card>

      {/* Tabla de datos */}
      <Card title={`Datos Históricos`} subtitle={`Mostrando ${Math.min(filteredData.length, 20)} de ${filteredData.length} registros`} className="border-l-4 border-sena-blue">
        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead>
              <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                <th className="text-left py-4 px-4 font-semibold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700">
                  Fecha y Hora
                </th>
                <th className="text-left py-4 px-4 font-semibold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700">
                  Temperatura (°C)
                </th>
                <th className="text-left py-4 px-4 font-semibold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700">
                  pH
                </th>
                <th className="text-left py-4 px-4 font-semibold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700">
                  Oxígeno (mg/L)
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredData.slice(-20).reverse().map((item, index) => (
                <tr
                  key={index}
                  className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <td className="py-4 px-4 text-gray-900 dark:text-white font-medium">
                    {format(new Date(item.timestamp), 'dd/MM/yyyy HH:mm', { locale: es })}
                  </td>
                  <td className="py-4 px-4 text-gray-900 dark:text-white">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                      {item.temperature.toFixed(1)}°C
                    </span>
                  </td>
                  <td className="py-4 px-4 text-gray-900 dark:text-white">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                      {item.ph.toFixed(2)}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-gray-900 dark:text-white">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400">
                      {item.oxygen.toFixed(1)} mg/L
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredData.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 dark:text-gray-500 mb-4">
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No hay datos disponibles</p>
                <p className="text-sm">Ajuste los filtros para ver información</p>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};