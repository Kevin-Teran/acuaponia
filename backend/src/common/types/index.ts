/**
 * @typedef {Object} ApiResponse
 * @property {boolean} success - Indica si la operación fue exitosa
 * @property {string} message - Mensaje descriptivo de la respuesta
 * @property {T} [data] - Datos de la respuesta (opcional)
 * @property {string} [error] - Mensaje de error (opcional)
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

/**
 * @typedef {Object} PaginationOptions
 * @property {number} page - Número de página (base 1)
 * @property {number} limit - Cantidad de elementos por página
 * @property {string} [sortBy] - Campo por el cual ordenar
 * @property {'ASC'|'DESC'} [sortOrder] - Orden de clasificación
 */
export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

/**
 * @typedef {Object} PaginatedResponse
 * @property {T[]} items - Array de elementos
 * @property {number} total - Total de elementos
 * @property {number} page - Página actual
 * @property {number} limit - Límite por página
 * @property {number} totalPages - Total de páginas
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * @typedef {Object} DateRange
 * @property {Date} startDate - Fecha de inicio
 * @property {Date} endDate - Fecha de fin
 */
export interface DateRange {
  startDate: Date;
  endDate: Date;
}

/**
 * Enumeración de roles de usuario
 * @enum {string}
 */
export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

/**
 * Enumeración de estados de tanque
 * @enum {string}
 */
export enum TankStatus {
  ACTIVE = 'ACTIVE',
  MAINTENANCE = 'MAINTENANCE',
  INACTIVE = 'INACTIVE',
}

/**
 * Enumeración de tipos de sensor
 * @enum {string}
 */
export enum SensorType {
  TEMPERATURE = 'TEMPERATURE',
  PH = 'PH',
  OXYGEN = 'OXYGEN',
}

/**
 * Enumeración de estados de sensor
 * @enum {string}
 */
export enum SensorStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  MAINTENANCE = 'MAINTENANCE',
  ERROR = 'ERROR',
}