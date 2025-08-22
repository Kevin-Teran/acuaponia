/**
 * @file SensorModal.tsx
 * @description Modal para crear y editar Sensores.
 */
 import React, { useState, useEffect, useMemo, useCallback } from 'react';
 import { Save } from 'lucide-react';
 import { Modal } from '@/components/common/Modal';
 import { LoadingSpinner } from '@/components/common/LoadingSpinner';
 import * as sensorService from '@/services/sensorService';
 import { Tank, Sensor, SensorType } from '@/types';
 import Swal from 'sweetalert2';
 import { format, parseISO } from 'date-fns';
 
 const SENSOR_TYPES_AVAILABLE: SensorType[] = ['TEMPERATURE', 'PH', 'OXYGEN'];
 const translateSensorType = (type: SensorType): string => ({ TEMPERATURE: 'Temperatura', PH: 'pH', OXYGEN: 'Oxígeno', LEVEL: 'Nivel', FLOW: 'Flujo' })[type] || type;
 
 interface SensorModalProps {
   isOpen: boolean;
   isEditing: boolean;
   sensorData?: any;
   tanks: Tank[];
   sensorsByTank: Map<string, Sensor[]>;
   onClose: () => void;
   onSave: () => void;
 }
 
 export const SensorModal: React.FC<SensorModalProps> = ({ isOpen, isEditing, sensorData, tanks, sensorsByTank, onClose, onSave }) => {
     const sensor = sensorData?.sensor;
     const [formData, setFormData] = useState({ name: '', hardwareId: '', type: SENSOR_TYPES_AVAILABLE[0], tankId: '', calibrationDate: new Date().toISOString().split('T')[0] });
     const [isSubmitting, setIsSubmitting] = useState(false);
 
     useEffect(() => {
         const initialTankId = sensor?.tankId || sensorData?.tankId || tanks[0]?.id || '';
         const usedTypesOnInitialTank = (sensorsByTank.get(initialTankId) || []).map((s: Sensor) => s.type);
         const availableTypes = SENSOR_TYPES_AVAILABLE.filter(type => !usedTypesOnInitialTank.includes(type));
         
         setFormData({
             name: sensor?.name || '',
             hardwareId: sensor?.hardwareId || '',
             type: sensor?.type || availableTypes[0] || SENSOR_TYPES_AVAILABLE[0],
             tankId: initialTankId,
             calibrationDate: sensor ? format(parseISO(sensor.calibrationDate), 'yyyy-MM-dd') : new Date().toISOString().split('T')[0]
         });
     }, [sensorData, sensor, sensorsByTank, tanks]);
 
     const availableSensorTypes = useMemo(() => {
         if (!formData.tankId) return [];
         const usedTypes = (sensorsByTank.get(formData.tankId) || []).map((s: Sensor) => s.type);
         if (isEditing && sensor) {
              return SENSOR_TYPES_AVAILABLE.filter(type => type === sensor.type || !usedTypes.includes(type));
         }
         return SENSOR_TYPES_AVAILABLE.filter(type => !usedTypes.includes(type));
     }, [formData.tankId, isEditing, sensor, sensorsByTank]);
     
     const handleSubmit = useCallback(async (e: React.FormEvent) => {
         e.preventDefault(); 
         setIsSubmitting(true);
         try {
             const { name, hardwareId, type, tankId, calibrationDate } = formData;
             const dataToSend = isEditing ? { name, calibrationDate } : { name, hardwareId, type, tankId, calibrationDate };
             
             const action = isEditing 
                 ? () => sensorService.updateSensor(sensor.id, dataToSend) 
                 : () => sensorService.createSensor(dataToSend);
             
             await action();
             onSave();
             onClose();
             await Swal.fire({ icon: 'success', title: `Sensor ${isEditing ? 'actualizado' : 'creado'}`, toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
         } catch (error: any) {
             const message = error.response?.data?.message || 'Ocurrió un error inesperado.';
             await Swal.fire('Error', Array.isArray(message) ? message.join(', ') : message, 'error');
         } finally { 
             setIsSubmitting(false); 
         }
     }, [formData, isEditing, sensor, onSave, onClose]);
     
     const today = new Date().toISOString().split('T')[0];
     
     return (
         <Modal 
             title={isEditing ? "Editar Sensor" : "Nuevo Sensor"} 
             isOpen={isOpen} 
             onClose={onClose} 
             footer={
                 <>
                     <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
                     <button type="submit" form="sensor-form" disabled={isSubmitting} className="btn-primary min-w-[140px]">
                         {isSubmitting ? <LoadingSpinner size="sm" /> : <><Save className="w-4 h-4" /><span>{isEditing ? 'Guardar' : 'Crear'}</span></>}
                     </button>
                 </>
             }
         >
             <form id="sensor-form" onSubmit={handleSubmit} className="space-y-4">
                 <div><label className="label">Nombre del Sensor*</label><input type="text" value={formData.name} onChange={e => setFormData(d => ({ ...d, name: e.target.value }))} className="form-input" required /></div>
                 {!isEditing && (<div><label className="label">ID de Hardware* <span className="text-xs text-gray-400">(Identificador físico único)</span></label><input type="text" value={formData.hardwareId} onChange={e => setFormData(d => ({ ...d, hardwareId: e.target.value }))} className="form-input" required /></div>)}
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div>
                         <label className="label">Tipo de Sensor*</label>
                         <select value={formData.type} onChange={e => setFormData(d => ({ ...d, type: e.target.value as any}))} className="form-select" required disabled={isEditing}>
                             {isEditing ? <option value={formData.type}>{translateSensorType(formData.type)}</option> : (availableSensorTypes.length > 0 ? availableSensorTypes.map(type => <option key={type} value={type}>{translateSensorType(type)}</option>) : <option disabled>No hay tipos disponibles</option>)}
                         </select>
                     </div>
                     <div>
                         <label className="label">Asignar a Tanque*</label>
                         <select value={formData.tankId} onChange={e => setFormData(d => ({ ...d, tankId: e.target.value}))} className="form-select" required disabled={!!sensorData.tankId && !isEditing}>
                             {tanks.map(tank => <option key={tank.id} value={tank.id}>{tank.name}</option>)}
                         </select>
                     </div>
                 </div>
                 <div><label className="label">Fecha de Calibración*</label><input type="date" value={formData.calibrationDate} onChange={e => setFormData(d => ({ ...d, calibrationDate: e.target.value }))} className="form-input" required max={today} /></div>
             </form>
         </Modal>
     );
 };