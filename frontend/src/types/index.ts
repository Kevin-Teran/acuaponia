/**
 * @file index.ts
 * @description Archivo central para la definición de tipos y enumeraciones de TypeScript
 * utilizados en toda la aplicación frontend.
 */

export enum Role {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export enum SensorType {
  TEMPERATURE = 'TEMPERATURE',
  PH = 'PH',
  OXYGEN = 'OXYGEN',
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  createdAt: string;
  lastLogin?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export type UserFromApi = Pick<User, 'id' | 'name' | 'email' | 'role' | 'status'> & {
  _count: { tanks: number };
  lastLogin?: string;
  createdAt: string;
};