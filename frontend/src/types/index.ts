/**
 * @file types/index.ts
 * @description Definiciones de tipos TypeScript para el sistema de acuaponía.
 * Incluye interfaces, enums y tipos personalizados para autenticación, usuarios y entidades del sistema.
 * @author Sistema de Acuaponía SENA
 * @version 3.0.0
 * @since 1.0.0
 */

/**
 * @typedef {Object} LoginCredentials
 * @description Credenciales requeridas para el proceso de autenticación.
 * @property {string} email - Correo electrónico del usuario
 * @property {string} password - Contraseña en texto plano
 * @property {boolean} rememberMe - Mantener sesión activa por más tiempo
 */
export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

/**
 * @enum {string} Role
 * @description Roles disponibles en el sistema de acuaponía.
 * Determina los permisos y accesos de cada usuario.
 */
export enum Role {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

/**
 * @enum {string} UserStatus
 * @description Estados posibles de un usuario en el sistema.
 */
export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

/**
 * @typedef {Object} User
 * @description Información básica del usuario autenticado.
 * Contiene datos esenciales para la sesión y autorización.
 */
export interface User {
  userId: string;
  email: string;
  name: string;
  role: Role;
  status?: UserStatus;
  lastLogin?: Date;
}

/**
 * @typedef {Object} UserProfile
 * @description Perfil completo del usuario con información adicional.
 * Extiende la interfaz User con datos adicionales del perfil.
 */
export interface UserProfile extends User {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  settings?: UserSettings;
  stats?: UserStats;
}

/**
 * @typedef {Object} UserSettings
 * @description Configuraciones personalizables del usuario.
 */
export interface UserSettings {
  language: 'es' | 'en';
  timezone: string;
  notifications: NotificationSettings;
  theme: 'light' | 'dark' | 'auto';
}

/**
 * @typedef {Object} NotificationSettings
 * @description Configuración de notificaciones del usuario.
 */
export interface NotificationSettings {
  email: boolean;
  browser: boolean;
  criticalAlerts: boolean;
  reports: boolean;
}

/**
 * @typedef {Object} UserStats
 * @description Estadísticas de actividad del usuario.
 */
export interface UserStats {
  tanksCount: number;
  activeTanksCount: number;
  sensorsCount: number;
  activeAlertsCount: number;
  totalAlertsCount: number;
  reportsCount: number;
}

/**
 * @typedef {Object} AuthError
 * @description Estructura de errores de autenticación.
 * Proporciona información detallada sobre fallos de autenticación.
 */
export interface AuthError {
  message: string;
  code: number;
  type: 'UNAUTHORIZED' | 'VALIDATION_ERROR' | 'NETWORK_ERROR' | 'UNKNOWN_ERROR';
  details?: string[];
}

/**
 * @typedef {Object} LoginResponse
 * @description Respuesta del servidor tras un login exitoso.
 */
export interface LoginResponse {
  access_token: string;
  refresh_token?: string;
  user: User;
  expires_in: number;
  message: string;
}

/**
 * @enum {string} TankStatus
 * @description Estados posibles de un tanque de acuaponía.
 */
export enum TankStatus {
  ACTIVE = 'ACTIVE',
  MAINTENANCE = 'MAINTENANCE',
  INACTIVE = 'INACTIVE',
}

/**
 * @typedef {Object} Tank
 * @description Información de un tanque de acuaponía.
 */
export interface Tank {
  id: string;
  name: string;
  location: string;
  status: TankStatus;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  sensors?: Sensor[];
  latestData?: SensorData[];
}

/**
 * @enum {string} SensorType
 * @description Tipos de sensores disponibles en el sistema.
 */
export enum SensorType {
  TEMPERATURE = 'TEMPERATURE',
  PH = 'PH',
  OXYGEN = 'OXYGEN',
}

/**
 * @enum {string} SensorStatus
 * @description Estados posibles de un sensor.
 */
export enum SensorStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  MAINTENANCE = 'MAINTENANCE',
  ERROR = 'ERROR',
}

/**
 * @typedef {Object} Sensor
 * @description Información de un sensor del sistema.
 */
export interface Sensor {
  id: string;
  hardwareId: string;
  name: string;
  type: SensorType;
  location: string;
  status: SensorStatus;
  calibrationDate: Date;
  lastReading?: number;
  lastUpdate?: Date;
  tankId: string;
}

/**
 * @typedef {Object} SensorData
 * @description Datos de lectura de un sensor.
 */
export interface SensorData {
  id: string;
  value: number;
  type: SensorType;
  timestamp: Date;
  createdAt: Date;
  sensorId: string;
  tankId: string;
}

/**
 * @enum {string} AlertType
 * @description Tipos de alertas del sistema.
 */
export enum AlertType {
  TEMPERATURE_HIGH = 'TEMPERATURE_HIGH',
  TEMPERATURE_LOW = 'TEMPERATURE_LOW',
  PH_HIGH = 'PH_HIGH',
  PH_LOW = 'PH_LOW',
  OXYGEN_HIGH = 'OXYGEN_HIGH',
  OXYGEN_LOW = 'OXYGEN_LOW',
  SENSOR_OFFLINE = 'SENSOR_OFFLINE',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
}

/**
 * @enum {string} AlertSeverity
 * @description Niveles de severidad de las alertas.
 */
export enum AlertSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * @typedef {Object} Alert
 * @description Estructura de una alerta del sistema.
 */
export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  value?: number;
  threshold?: number;
  resolved: boolean;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  sensorId: string;
  userId?: string;
}

/**
 * @enum {string} ReportType
 * @description Tipos de reportes disponibles.
 */
export enum ReportType {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  CUSTOM = 'CUSTOM',
}

/**
 * @enum {string} ReportStatus
 * @description Estados de generación de reportes.
 */
export enum ReportStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

/**
 * @typedef {Object} Report
 * @description Estructura de un reporte del sistema.
 */
export interface Report {
  id: string;
  title: string;
  type: ReportType;
  parameters: string;
  filePath?: string;
  status: ReportStatus;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

/**
 * @typedef {Object} ApiResponse<T>
 * @description Estructura genérica de respuestas de la API.
 * @template T Tipo de datos contenidos en la respuesta
 */
export interface ApiResponse<T = any> {
  data: T;
  message: string;
  statusCode: number;
  timestamp: Date;
}

/**
 * @typedef {Object} PaginatedResponse<T>
 * @description Respuesta paginada de la API.
 * @template T Tipo de elementos en la lista
 */
export interface PaginatedResponse<T = any> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * @typedef {Object} SearchFilters
 * @description Filtros comunes para búsquedas.
 */
export interface SearchFilters {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, any>;
}

/**
 * @typedef {Object} DashboardStats
 * @description Estadísticas para el dashboard principal.
 */
export interface DashboardStats {
  totalTanks: number;
  activeTanks: number;
  totalSensors: number;
  activeSensors: number;
  activeAlerts: number;
  criticalAlerts: number;
  totalUsers: number;
  activeUsers: number;
}

/**
 * @typedef {Object} SystemHealth
 * @description Estado general del sistema.
 */
export interface SystemHealth {
  status: 'healthy' | 'warning' | 'error';
  uptime: number;
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  cpuUsage: number;
  database: {
    connected: boolean;
    responseTime: number;
  };
  lastCheck: Date;
}