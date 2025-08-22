import { ApiResponse } from '../types';

/**
 * Utilidad para crear respuestas API estandarizadas
 * @class ResponseUtil
 */
export class ResponseUtil {
  /**
   * Crea una respuesta exitosa
   * @static
   * @template T
   * @param {T} data - Datos a incluir en la respuesta
   * @param {string} [message='Operación exitosa'] - Mensaje de éxito
   * @returns {ApiResponse<T>} Respuesta API exitosa
   * @example
   * const response = ResponseUtil.success({ id: 1, name: 'Tank 1' }, 'Tanque creado');
   * // { success: true, message: 'Tanque creado', data: { id: 1, name: 'Tank 1' } }
   */
  static success<T>(data: T, message: string = 'Operación exitosa'): ApiResponse<T> {
    return {
      success: true,
      message,
      data,
    };
  }

  /**
   * Crea una respuesta de error
   * @static
   * @param {string} message - Mensaje de error
   * @param {string} [error] - Detalles adicionales del error
   * @returns {ApiResponse} Respuesta API de error
   * @example
   * const response = ResponseUtil.error('Usuario no encontrado', 'USER_NOT_FOUND');
   * // { success: false, message: 'Usuario no encontrado', error: 'USER_NOT_FOUND' }
   */
  static error(message: string, error?: string): ApiResponse {
    return {
      success: false,
      message,
      error,
    };
  }
}

/**
 * Función para calcular paginación
 * @param {number} page - Número de página
 * @param {number} limit - Elementos por página
 * @returns {{ skip: number; take: number }} Objeto con skip y take para TypeORM
 * @throws {Error} Si page o limit son menores a 1
 * @example
 * const pagination = calculatePagination(2, 10);
 * // { skip: 10, take: 10 }
 */
export const calculatePagination = (page: number, limit: number): { skip: number; take: number } => {
  if (page < 1 || limit < 1) {
    throw new Error('Page y limit deben ser mayores a 0');
  }
  
  return {
    skip: (page - 1) * limit,
    take: limit,
  };
};