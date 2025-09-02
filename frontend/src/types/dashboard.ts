/**
 * @file dashboard.ts
 * @description Tipos específicos para el módulo de dashboard.
 * @author Kevin Mariano
 * @version 1.0.0
 * @since 1.0.0
 */
import { SensorType } from './index';

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