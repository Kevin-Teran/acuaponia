/**
 * @file dashboard.ts
 * @route frontend/src/types
 * @description Tipos específicos para el módulo de dashboard.
 * @author Kevin Mariano
 * @version 1.0.0
 * @since 1.0.0
 * @copyright SENA 2025
 */
import { SensorType } from './index';
import { EmitterStatus } from '@/services/dataService';

export interface DashboardFilters {
  userId?: string;
  tankId?: string;
  sensorType?: SensorType;
  startDate?: string;
  endDate?: string;
}

export interface DashboardSummary {
  tanksCount: number;
  sensorsCount: number;
  activeSimulations: number;
  recentAlerts: number;
  totalDataPoints: number;
}

export interface RealtimeSensorData {
  sensorId: string;
  sensorName: string;
  tankName: string;
  value: number;
  timestamp: string;
  hardwareId: string;
}

export interface HistoricalDataPoint {
  timestamp: string;
  value: number;
  sensorName: string;
  sensorType: SensorType;
  tankName: string;
}

export interface TankOverview {
  id: string;
  name: string;
  location: string;
  status: string;
  sensorsCount: number;
  lastReading: string | null;
  sensors: Array<{
    id: string;
    name: string;
    type: SensorType;
    status: string;
    lastValue: number | null;
    lastUpdate: string | null;
  }>;
}

export interface DashboardUserOption {
  id: string;
  name: string;
  email: string;
  _count: { tanks: number };
}

/**
 * @typedef {object} RealtimeData
 * @description Contiene los datos en tiempo real de los sensores, agrupados por tipo.
 * @property {RealtimeSensorData[]} [TEMPERATURE] - Datos del sensor de temperatura (opcional).
 * @property {RealtimeSensorData[]} [PH] - Datos del sensor de pH (opcional).
 * @property {RealtimeSensorData[]} [OXYGEN] - Datos del sensor de oxígeno (opcional).
 * @property {RealtimeSensorData[]} [TDS] - Datos del sensor de TDS (opcional).
 */
 export interface RealtimeData {
  [key: string]: RealtimeSensorData[];
}

export interface SimulationSummaryByTank {
  tankName: string;
  count: number;
  simulations: EmitterStatus[];
}

export interface SimulationSummary {
  totalActive: number;
  totalMessages: number;
  byTank: Record<string, SimulationSummaryByTank>;
  byType: Record<string, number>;
}