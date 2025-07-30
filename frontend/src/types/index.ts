/**
 * @fileoverview Define las interfaces y tipos de TypeScript compartidos
 * entre el frontend y el backend para garantizar la consistencia de los datos.
 */

/**
 * @interface LoginCredentials
 * @desc Credenciales necesarias para que un usuario inicie sesión.
 */
 export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * @interface SensorData
 * @desc Representa una única lectura de un sensor. Esta estructura está normalizada
 * para almacenar cualquier tipo de dato de sensor en un formato consistente.
 */
export interface SensorData {
  id: string;
  timestamp: string;
  value: number;       // El valor numérico de la lectura.
  type: SensorType;  // El tipo de sensor que generó la lectura (ej. 'TEMPERATURE').
  sensorId: string;
  tankId: string;
}

/**
 * @interface User
 * @desc Representa a un usuario del sistema, con su rol, estado y relaciones.
 */
export interface User {
  id: string;
  email: string;
  role: 'ADMIN' | 'USER';
  name: string;
  createdAt: string;
  lastLogin?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'; // Se añade 'SUSPENDED'
  _count?: {
    tanks: number;
  };
  tanks?: { id: string; name: string; location: string }[];
}

/**
 * @interface AuthState
 * @desc Describe el estado de autenticación global en la aplicación.
 */
export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

/**
 * @interface DataSummary
 * @desc Agrupa estadísticas clave (mínimo, máximo, promedio, actual) para cada
 * tipo de dato principal, utilizado en los dashboards.
 */
export interface DataSummary {
  temperature: { min: number; max: number; avg: number; current: number; };
  ph: { min: number; max: number; avg: number; current: number; };
  oxygen: { min: number; max: number; avg: number; current: number; };
}

/**
 * @interface PredictionData
 * @desc Estructura para los datos de predicción, diferenciando entre valores
 * históricos (actual) y valores futuros (predicted).
 */
export interface PredictionData {
  timestamp: string;
  actual?: number;
  predicted: number;
}

/**
 * @type Theme
 * @desc Define los temas de apariencia disponibles en la aplicación.
 */
export type Theme = 'light' | 'dark';

/**
 * @type SensorType
 * @desc Define los tipos de sensores válidos en el sistema, alineado con el Enum de Prisma.
 */
export type SensorType = 'TEMPERATURE' | 'PH' | 'OXYGEN' | 'LEVEL' | 'FLOW';

/**
 * @interface Tank
 * @desc Representa un tanque de acuaponía en el sistema.
 * @note Se han eliminado los campos `capacity` y `currentLevel` para simplificar el modelo.
 */
export interface Tank {
  id: string;
  name: string;
  location: string;
  status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
  userId: string;
}

/**
 * @interface Sensor
 * @desc Representa un dispositivo de hardware (sensor).
 * @property {string} hardwareId - El identificador único y fijo del dispositivo físico.
 * @note Se ha añadido `hardwareId` y se ha eliminado `batteryLevel`.
 */
export interface Sensor {
  id: string;
  hardwareId: string; // <-- CAMBIO: ID físico del dispositivo
  name: string;
  type: SensorType;
  location: string;
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'ERROR';
  calibrationDate: string;
  lastReading?: number;
  lastUpdate?: string;
  createdAt: string;
  updatedAt: string;
  tankId: string;
}

/**
 * @interface Alert
 * @desc Representa una alerta generada por el sistema cuando un valor
 * excede los umbrales definidos.
 */
export interface Alert {
  id: string;
  type: 'TEMPERATURE_HIGH' | 'TEMPERATURE_LOW' | 'PH_HIGH' | 'PH_LOW' | 'OXYGEN_HIGH' | 'OXYGEN_LOW' | 'SENSOR_OFFLINE' | 'SYSTEM_ERROR';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  value?: number;
  threshold?: number;
  resolved: boolean;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
  sensorId: string;
  userId?: string;
}

/**
 * @interface Report
 * @desc Representa un reporte generado por el sistema.
 */
export interface Report {
  id: string;
  title: string;
  type: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';
  parameters: Record<string, any>;
  filePath?: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
  updatedAt: string;
  userId: string;
}