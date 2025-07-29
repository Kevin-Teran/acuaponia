export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SensorData {
  timestamp: string;
  temperature: number;
  ph: number;
  oxygen: number;
}

export interface User {
  id: string;
  email: string;
  role: 'ADMIN' | 'USER';
  name: string;
  createdAt: string;
  lastLogin?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  _count?: {
    tanks: number;
  };
  tanks?: { id: string; name: string; location: string }[];
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

export interface DataSummary {
  temperature: {
    min: number;
    max: number;
    avg: number;
    current: number;
  };
  ph: {
    min: number;
    max: number;
    avg: number;
    current: number;
  };
  oxygen: {
    min: number;
    max: number;
    avg: number;
    current: number;
  };
}

export interface PredictionData {
  timestamp: string;
  actual?: number;
  predicted: number;
}

export type Theme = 'light' | 'dark';

// Nuevos tipos que podrían ser útiles
export interface Tank {
  id: string;
  name: string;
  location: string;
  capacity: number;
  currentLevel: number;
  status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export interface Sensor {
  id: string;
  name: string;
  type: 'TEMPERATURE' | 'PH' | 'OXYGEN' | 'LEVEL' | 'FLOW';
  location: string;
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'ERROR';
  batteryLevel: number;
  calibrationDate: string;
  lastReading?: number;
  lastUpdate?: string;
  createdAt: string;
  updatedAt: string;
  tankId: string;
}

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