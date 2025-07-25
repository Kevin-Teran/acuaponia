export interface SensorData {
  timestamp: string;
  temperature: number;
  ph: number;
  oxygen: number;
}

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'user';
  name: string;
  createdAt: string;
  lastLogin?: string;
  status: 'active' | 'inactive';
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