/**
 * @file SensorDetailModal.tsx
 * @description Modal para mostrar los detalles de un sensor.
 */
 import React from 'react';
 import { Modal } from '@/components/common/Modal';
 import { Sensor, SensorType } from '@/types';
 import { format, parseISO } from 'date-fns';
 import { es } from 'date-fns/locale';
 import { clsx } from 'clsx';
 
 const getStatusChip = (status: Sensor['status']) => {
     const styles = { ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', MAINTENANCE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300', INACTIVE: 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200', ERROR: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' };
     const text = { ACTIVE: 'Activo', MAINTENANCE: 'Mantenimiento', INACTIVE: 'Inactivo', ERROR: 'Error' };
     return <span className={clsx('px-2 py-1 rounded-full text-xs font-medium', styles[status])}>{text[status]}</span>;
 };
 const translateSensorType = (type: SensorType): string => ({ TEMPERATURE: 'Temperatura', PH: 'pH', OXYGEN: 'Oxígeno', LEVEL: 'Nivel', FLOW: 'Flujo' })[type] || type;
 const getSensorUnit = (type: SensorType): string => ({ TEMPERATURE: '°C', OXYGEN: 'mg/L', PH: '', LEVEL: '%', FLOW: 'L/min' })[type] || '';
 
 interface SensorDetailModalProps {
   isOpen: boolean;
   sensor: Sensor;
   onClose: () => void;
 }
 
 export const SensorDetailModal: React.FC<SensorDetailModalProps> = ({ isOpen, sensor, onClose }) => {
     return (
         <Modal title="Detalles del Sensor" isOpen={isOpen} onClose={onClose}>
             <div className="space-y-3 text-gray-800 dark:text-gray-200">
                 <div className="flex justify-between"><strong>Nombre:</strong> <span className="text-gray-700 dark:text-gray-300">{sensor.name}</span></div>
                 <div className="flex justify-between"><strong>Tipo:</strong> <span className="text-gray-700 dark:text-gray-300">{translateSensorType(sensor.type)}</span></div>
                 <div className="flex justify-between items-center"><strong>Estado:</strong> {getStatusChip(sensor.status)}</div>
                 <div className="flex justify-between"><strong>Hardware ID:</strong> <span className="font-mono text-sm p-1 bg-gray-100 dark:bg-gray-700 rounded">{sensor.hardwareId}</span></div>
                 <div className="flex justify-between"><strong>Última Lectura:</strong> <span className="text-gray-700 dark:text-gray-300">{sensor.lastReading?.toFixed(2) ?? 'N/A'} {getSensorUnit(sensor.type)}</span></div>
                 <div className="flex justify-between"><strong>Fecha de Calibración:</strong> <span className="text-gray-700 dark:text-gray-300">{format(parseISO(sensor.calibrationDate), 'dd/MM/yyyy', { locale: es })}</span></div>
                 <div className="flex justify-between"><strong>Última Actualización:</strong> <span className="text-gray-700 dark:text-gray-300">{sensor.lastUpdate ? format(parseISO(sensor.lastUpdate), 'dd/MM/yyyy HH:mm', { locale: es }) : 'N/A'}</span></div>
             </div>
         </Modal>
     );
 };