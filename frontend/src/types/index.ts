/**
 * @file index.ts
 * @description Archivo central para la definición de tipos y interfaces de la aplicación.
 */

export interface User {
    id: string;
    name: string;
    email: string;
    role: 'ADMIN' | 'USER';
    isActive: boolean;
  }
  
  export interface LoginCredentials {
    identifier: string; 
    password: string;
  }