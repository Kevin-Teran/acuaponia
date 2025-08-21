/**
 * @file index.ts
 * @description Define los tipos de datos compartidos en la aplicación frontend.
 * @author Kevin Mariano
 * @version 1.0.0
 */

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export enum Role {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export interface User {
  userId: string;
  email: string;
  role: Role;
}