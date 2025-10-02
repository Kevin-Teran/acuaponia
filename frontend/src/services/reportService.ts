/**
 * @file reportService.ts
 * @route frontend/src/services
 * @description Servicio frontend para gestión de reportes (CORREGIDO)
 * @author Kevin Mariano
 * @version 2.0.0
 * @since 1.0.0
 * @copyright SENA 2025
 */

import api from '@/config/api';
import { Report, ReportStatus } from '@/types';

export interface CreateReportDto {
  reportName: string;
  tankId: string;
  sensorIds: string[];
  startDate: string;
  endDate: string;
}

/**
 * Obtiene todos los reportes de un usuario
 */
export const getReports = async (userId?: string): Promise<Report[]> => {
  try {
    console.log('📊 [ReportService] Obteniendo reportes...');
    const params = userId ? { userId } : {};
    const response = await api.get('/reports', { params });
    console.log('✅ [ReportService] Reportes obtenidos:', response.data.length);
    return response.data;
  } catch (error: any) {
    console.error('❌ [ReportService] Error obteniendo reportes:', error);
    throw error;
  }
};

/**
 * Crea un nuevo reporte
 */
export const createReport = async (reportData: CreateReportDto): Promise<Report> => {
  try {
    console.log('🆕 [ReportService] Creando reporte:', reportData.reportName);
    const response = await api.post('/reports', reportData);
    console.log('✅ [ReportService] Reporte creado:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ [ReportService] Error creando reporte:', error);
    throw error;
  }
};

/**
 * Descarga un reporte en el formato especificado
 */
export const downloadReport = async (
  reportId: string,
  format: 'pdf' | 'xlsx'
): Promise<void> => {
  try {
    console.log(`📥 [ReportService] Descargando reporte ${reportId} en formato ${format.toUpperCase()}...`);
    
    const response = await api.get(`/reports/${reportId}/download`, {
      params: { format },
      responseType: 'blob', // IMPORTANTE: debe ser blob para archivos binarios
    });

    // Crear un enlace temporal para descargar el archivo
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    
    // Determinar el nombre del archivo
    const extension = format === 'pdf' ? 'pdf' : 'xlsx';
    link.setAttribute('download', `reporte_${reportId}.${extension}`);
    
    // Agregar al DOM, hacer clic y remover
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Liberar el objeto URL
    window.URL.revokeObjectURL(url);
    
    console.log(`✅ [ReportService] Reporte ${reportId} descargado exitosamente`);
  } catch (error: any) {
    console.error(`❌ [ReportService] Error descargando reporte:`, error);
    console.error('Detalles del error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
    });
    throw error;
  }
};

/**
 * Elimina un reporte
 */
export const deleteReport = async (reportId: string): Promise<void> => {
  try {
    console.log(`🗑️ [ReportService] Eliminando reporte ${reportId}...`);
    await api.delete(`/reports/${reportId}`);
    console.log(`✅ [ReportService] Reporte ${reportId} eliminado exitosamente`);
  } catch (error: any) {
    console.error(`❌ [ReportService] Error eliminando reporte:`, error);
    throw error;
  }
};

/**
 * @description Función para agregar al archivo reportService.ts existente
 * @route frontend/src/services/reportService.ts
 */

/**
 * @description Exporta un reporte completo de predicciones
 * @param {object} params - Parámetros del reporte
 * @returns {Promise<void>}
 */
 export const exportPredictionsReport = async (params: {
  tankId: string;
  results: Record<string, any>;
  horizon: number;
  weatherData?: any[];
}): Promise<void> => {
  try {
    const { tankId, results, horizon, weatherData } = params;
    
    // Preparar datos para el backend
    const reportData = {
      reportName: `Predicciones_${new Date().toISOString().split('T')[0]}`,
      tankId,
      horizon,
      predictions: Object.values(results),
      weather: weatherData || [],
      generatedAt: new Date().toISOString(),
    };

    // Llamar al endpoint de exportación
    const response = await api.post('/reports/predictions/export', reportData, {
      responseType: 'blob', // Para archivos descargables
    });

    // Crear y descargar el archivo
    const blob = new Blob([response.data], { 
      type: 'application/pdf' 
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Reporte_Predicciones_${new Date().getTime()}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    console.log('✅ Reporte exportado exitosamente');
  } catch (error) {
    console.error('❌ Error exportando reporte:', error);
    throw error;
  }
};