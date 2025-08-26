/**
 * @file SensorDetailModal.tsx
 * @description Modal enriquecido para mostrar los detalles completos de un sensor.
 * @author Kevin Mariano
 * @version 7.0.0
 * @since 1.0.0
 */
import React from 'react';
import { Sensor, SensorStatus, SensorType, Tank } from '@/types';
import { Modal } from '@/components/common/Modal';
import { X, Thermometer, Droplets, Wind, Info, Calendar, MapPin, Tag, Hash, Clock, HardDrive, Edit, Settings } from 'lucide-react';
import { clsx } from 'clsx';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const getSensorInfo = (type: SensorType) => {
    const info = {
        [SensorType.TEMPERATURE]: { Icon: Thermometer, unit: '°C', name: 'Temperatura' },
        [SensorType.PH]: { Icon: Droplets, unit: '', name: 'pH' },
        [SensorType.OXYGEN]: { Icon: Wind, unit: 'mg/L', name: 'Oxígeno Disuelto' },
    };
    return info[type] || { Icon: Settings, unit: '', name: 'Desconocido' };
};

const getStatusInfo = (status: SensorStatus) => {
    const styles: Record<string, string> = { [SensorStatus.ACTIVE]: 'bg-green-100 text-green-800', [SensorStatus.INACTIVE]: 'bg-gray-100 text-gray-800', [SensorStatus.ERROR]: 'bg-red-100 text-red-800', [SensorStatus.CALIBRATING]: 'bg-blue-100 text-blue-800' };
    const text: Record<string, string> = { [SensorStatus.ACTIVE]: 'Activo', [SensorStatus.INACTIVE]: 'Inactivo', [SensorStatus.ERROR]: 'Error', [SensorStatus.CALIBRATING]: 'Calibrando' };
    return { style: clsx('px-3 py-1 rounded-full text-sm font-medium', styles[status]), text: text[status] || 'Desconocido' };
};

const DetailRow = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string | React.ReactNode }) => (
    <div className="flex items-start py-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
        <Icon className="h-5 w-5 text-gray-400 mr-4 mt-1 flex-shrink-0" />
        <div className="flex-1">
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">{label}</p>
            <div className="text-md text-gray-900 dark:text-white break-words">{value}</div>
        </div>
    </div>
);

export const SensorDetailModal = ({ isOpen, sensor, onClose }: { isOpen: boolean, sensor: Sensor & { tank?: Tank, lastReading?: number, lastUpdate?: string }, onClose: () => void }) => {
    if (!isOpen) return null;

    const { Icon, unit, name: typeName } = getSensorInfo(sensor.type);
    const statusInfo = getStatusInfo(sensor.status);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Detalles del Sensor">
            <div className="pt-4">
                <div className="flex flex-col items-center justify-center pb-4 border-b dark:border-gray-700 mb-4">
                    <Icon className="w-12 h-12 text-blue-500" />
                    <h3 className="text-2xl font-bold mt-3 text-gray-900 dark:text-white">{sensor.name}</h3>
                    <p className="text-md text-gray-500 dark:text-gray-400">{typeName}</p>
                </div>
                <div>
                    <DetailRow icon={Info} label="Estado Actual" value={<span className={statusInfo.style}>{statusInfo.text}</span>} />
                    <DetailRow icon={Tag} label="Última Lectura" value={sensor.lastReading !== null && sensor.lastReading !== undefined ? `${sensor.lastReading.toFixed(2)} ${unit}` : 'N/A'} />
                    <DetailRow icon={Calendar} label="Última Actualización" value={sensor.lastUpdate ? format(parseISO(sensor.lastUpdate), "PPPp", { locale: es }) : 'Nunca'} />
                    <DetailRow icon={HardDrive} label="Tanque Asignado" value={sensor.tank?.name || 'No disponible'} />
                    <DetailRow icon={MapPin} label="Ubicación" value={sensor.location || 'No especificada'} />
                    <DetailRow icon={Edit} label="Fecha de Calibración" value={sensor.calibrationDate ? format(parseISO(sensor.calibrationDate), "PPP", { locale: es }) : 'No registrada'} />
                    <DetailRow icon={Clock} label="Fecha de Creación" value={format(parseISO(sensor.createdAt), "PPPp", { locale: es })} />
                    <DetailRow icon={Hash} label="ID de Hardware" value={<code className="text-xs bg-gray-100 dark:bg-gray-700 p-1 rounded">{sensor.hardwareId}</code>} />
                </div>
                <div className="flex justify-end mt-6 pt-4 border-t dark:border-gray-700">
                    <button type="button" onClick={onClose} className="btn-secondary"><X className="h-4 w-4 mr-2" />Cerrar</button>
                </div>
            </div>
        </Modal>
    );
};