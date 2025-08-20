import {
  Activity, BarChart3, TrendingUp, FileText, Cpu, DatabaseZap, Sparkles, User as UserIcon
} from 'lucide-react';
import { Module } from './types';

/**
 * @const {Module[]} modules
 * @description Configuración centralizada de los módulos de navegación.
 */
export const modules: Module[] = [
  { id: 'dashboard', name: 'Dashboard', icon: Activity, href: '/dashboard' },
  { id: 'reports', name: 'Reportes', icon: FileText, href: '/reports' },
  { id: 'predictions', name: 'Predictivo', icon: TrendingUp, href: '/predictions' },
  { id: 'analytics', name: 'Análisis', icon: BarChart3, href: '/analytics' },
  { id: 'ai-assistant', name: 'Asistencia IA', icon: Sparkles, href: '/ai-assistant' },
  { id: 'data-entry', name: 'Recolección', icon: DatabaseZap, href: '/data-entry', adminOnly: true },
  { id: 'tanks-and-sensors', name: 'Tanques y Sensores', icon: Cpu, href: '/tanks-and-sensors', adminOnly: true },
  { id: 'users', name: 'Usuarios', icon: UserIcon, href: '/users', adminOnly: true },
];