// frontend/src/types/index.ts

/**
 * @fileoverview Archivo central que define las interfaces y tipos de TypeScript
 * compartidos en toda la aplicación para garantizar la consistencia de los datos.
 */

// --- Tipos de Enumeraciones (Alineados con Prisma) ---
export type Role = "ADMIN" | "USER";
export type UserStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";
export type TankStatus = "ACTIVE" | "MAINTENANCE" | "INACTIVE";
export type SensorType = "TEMPERATURE" | "PH" | "OXYGEN" | "LEVEL" | "FLOW";
export type SensorStatus = "ACTIVE" | "INACTIVE" | "MAINTENANCE" | "ERROR";

// --- Tipos de Autenticación y UI ---
export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export type Theme = 'light' | 'dark';

// --- Tipos de Entidades Principales ---
export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: UserStatus;
  createdAt: string;
  lastLogin?: string;
  tanks?: Tank[];
  _count?: {
    tanks?: number;
  };
}

export interface Tank {
  id: string;
  name: string;
  location: string;
  status: TankStatus;
  userId: string;
  user?: { name: string };
  sensors?: Sensor[];
  _count?: {
    sensors?: number;
  };
}

export interface Sensor {
  id: string;
  hardwareId: string;
  name: string;
  type: SensorType;
  status: SensorStatus;
  location: string;
  calibrationDate: string;
  lastUpdate?: string;
  tankId: string;
  tank?: { name: string };
  lastReading?: number | null;
  trend?: 'up' | 'down' | 'stable';
  readingStatus?: 'Óptimo' | 'Bajo' | 'Alto';
}

// --- Tipos de Datos y Reportes ---

export interface SensorData {
  timestamp: string;
  value: number;
  type: SensorType;
  tankId: string;
  sensorId: string;
}

export interface ProcessedDataPoint {
  timestamp: string;
  temperature: number | null;
  ph: number | null;
  oxygen: number | null;
}

export interface DataSummaryValues {
  min: number;
  max: number;
  avg: number;
  current: number;
  previous?: number; 
}

export interface DataSummary {
  temperature: DataSummaryValues;
  ph: DataSummaryValues;
  oxygen: DataSummaryValues;
}

export interface PredictionData {
  timestamp: string;
  actual?: number;
  predicted: number;
}