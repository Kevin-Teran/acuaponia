import api from '@/config/api';
import { Report } from '@/types';

/**
 * @fileoverview Servicio para interactuar con los endpoints de `/api/reports` del backend.
 */

/**
 * @function getReports
 * @description Obtiene el historial de reportes generados para un usuario.
 * @param {string | undefined} userId - ID del usuario. Si es admin, puede ser opcional.
 * @returns {Promise<Report[]>} Una promesa que se resuelve con un array de reportes.
 */
export const getReports = async (userId?: string): Promise<Report[]> => {
  const response = await api.get('/reports', { params: userId ? { userId } : {} });
  return response.data;
};

/**
 * @function createReport
 * @description Crea un registro de reporte en el backend.
 * @param {object} reportData - Datos del reporte a crear.
 * @returns {Promise<Report>} El nuevo reporte creado.
 */
export const createReport = async (reportData: any): Promise<Report> => {
  const response = await api.post('/reports', reportData);
  return response.data;
};

/**
 * @function downloadReport
 * @description Descarga un reporte generado desde el backend.
 * @param {string} reportId - ID del reporte a descargar.
 * @param {'pdf' | 'xlsx'} format - Formato de archivo deseado.
 * @returns {Promise<void>}
 */
export const downloadReport = async (reportId: string, format: 'pdf' | 'xlsx'): Promise<void> => {
  const response = await api.get(`/reports/download/${reportId}/${format}`, {
    responseType: 'blob',
  });

  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `reporte-${reportId}.${format}`);
  document.body.appendChild(link);
  link.click();
  link.remove();
};