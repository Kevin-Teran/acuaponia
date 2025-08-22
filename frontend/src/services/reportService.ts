/**
 * @file reportService.ts
 * @description Servicio para la creación y gestión de reportes.
 * @author Sistema de Acuaponía SENA
 * @version 1.2.0
 * @since 1.0.0
 */

import api from '@/config/api';
import { Report, CreateReportDto } from '@/types';

/**
 * Obtiene una lista de todos los reportes generados.
 * @returns {Promise<Report[]>} Una promesa que se resuelve con un array de reportes.
 * @throws {Error} Si ocurre un error durante la llamada a la API.
 */
export const getReports = async (): Promise<Report[]> => {
  const response = await api.get('/reports');
  return response.data;
};

/**
 * Crea una solicitud para generar un nuevo reporte.
 * @param {CreateReportDto} reportData - Los parámetros para el nuevo reporte.
 * @returns {Promise<Report>} Una promesa que se resuelve con los datos del reporte creado.
 * @throws {Error} Si ocurre un error durante la llamada a la API.
 */
export const createReport = async (reportData: CreateReportDto): Promise<Report> => {
  const response = await api.post('/reports', reportData);
  return response.data;
};

/**
 * Descarga un archivo de reporte generado.
 * @param {string} reportId - El ID del reporte a descargar.
 * @param {'pdf' | 'csv' | 'xlsx'} format - El formato en el que se desea descargar el reporte.
 * @returns {Promise<Blob>} Una promesa que se resuelve con el archivo del reporte como un Blob.
 * @throws {Error} Si ocurre un error durante la llamada a la API.
 */
export const downloadReport = async (reportId: string, format: 'pdf' | 'csv' | 'xlsx'): Promise<Blob> => {
  const response = await api.get(`/reports/download/${reportId}/${format}`, {
    responseType: 'blob', // Importante para manejar la descarga de archivos
  });
  return response.data;
};