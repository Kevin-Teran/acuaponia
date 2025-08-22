/**
 * @file reportService.ts
 * @description Servicio para gestionar la creación y descarga de reportes de datos.
 */

import { api } from '@/config/api'; // <-- CORRECCIÓN APLICADA: Importación nombrada
import { Report, CreateReportDto } from '@/types';

/**
 * Obtiene el historial de reportes generados por un usuario.
 *
 * @param {string} userId - El ID del usuario para obtener sus reportes.
 * @returns {Promise<Report[]>} Una promesa que resuelve a un arreglo de reportes.
 * @throws Lanza un error si la petición a la API falla.
 */
export const getReports = async (userId: string): Promise<Report[]> => {
  try {
    const response = await api.get(`/reports?userId=${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error al obtener los reportes:', error);
    throw error;
  }
};

/**
 * Solicita la creación de un nuevo reporte en el backend.
 *
 * @param {CreateReportDto} reportData - Los parámetros para generar el reporte.
 * @returns {Promise<Report>} Una promesa que resuelve con el objeto del reporte recién creado (en estado PENDING o PROCESSING).
 * @throws Lanza un error si la petición a la API falla.
 */
export const createReport = async (reportData: CreateReportDto): Promise<Report> => {
  try {
    const response = await api.post('/reports', reportData);
    return response.data;
  } catch (error) {
    console.error('Error al crear el reporte:', error);
    throw error;
  }
};

/**
 * Descarga un reporte generado en el formato especificado (PDF o XLSX).
 *
 * @param {string} reportId - El ID del reporte a descargar.
 * @param {'pdf' | 'xlsx'} format - El formato deseado para la descarga.
 * @throws Lanza un error si la descarga falla.
 */
export const downloadReport = async (reportId: string, format: 'pdf' | 'xlsx'): Promise<void> => {
  try {
    const response = await api.get(`/reports/${reportId}/download?format=${format}`, {
      responseType: 'blob', // Importante para manejar la descarga de archivos
    });

    // Crear un enlace temporal en el navegador para iniciar la descarga
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    const contentDisposition = response.headers['content-disposition'];
    let filename = `reporte-${reportId}.${format}`; // Nombre por defecto
    if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch.length > 1) {
            filename = filenameMatch[1];
        }
    }
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error(`Error al descargar el reporte ${reportId}:`, error);
    throw new Error('No se pudo descargar el archivo.');
  }
};