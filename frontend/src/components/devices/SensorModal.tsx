/**
 * @file SensorModal.tsx
 * @description Modal para crear y editar sensores con lógica de validación avanzada.
 * @author Kevin Mariano
 * @version 9.0.0
 * @since 1.0.0
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Save } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { createSensor, updateSensor } from '@/services/sensorService';
import { Tank, Sensor, SensorType } from '@/types';
import Swal from 'sweetalert2';
import { format, parseISO } from 'date-fns';

const SENSOR_TYPE_OPTIONS = Object.values(SensorType).map(type => ({
    value: type,
    label: {
        [SensorType.TEMPERATURE]: 'Temperatura',
        [SensorType.PH]: 'pH',
        [SensorType.OXYGEN]: 'Oxígeno Disuelto',
    }[type]
}));

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
    const originalSensor = isEditing ? sensorData?.sensor : null;
    const [formData, setFormData] = useState({ name: '', hardwareId: '', type: '' as SensorType, tankId: '', calibrationDate: new Date().toISOString().split('T')[0] });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const availableSensorTypesForCreation = useMemo(() => {
        if (isEditing || !formData.tankId) return [];
        const usedTypes = sensorsByTank.get(formData.tankId)?.map(s => s.type) || [];
        return SENSOR_TYPE_OPTIONS.filter(opt => !usedTypes.includes(opt.value));
    }, [formData.tankId, isEditing, sensorsByTank]);

    useEffect(() => {
        if (isOpen) {
            setError(null);
            const initialTankId = originalSensor?.tankId || sensorData?.tankId || tanks[0]?.id || '';
            setFormData({
                name: originalSensor?.name || '',
                hardwareId: originalSensor?.hardwareId || '',
                type: originalSensor?.type || '',
                tankId: initialTankId,
                calibrationDate: originalSensor?.calibrationDate ? format(parseISO(originalSensor.calibrationDate), 'yyyy-MM-dd') : new Date().toISOString().split('T')[0],
            });
        }
    }, [isOpen, originalSensor, sensorData, tanks]);

    useEffect(() => {
        if (!isEditing && formData.tankId) {
            setFormData(d => ({ ...d, type: availableSensorTypesForCreation[0]?.value || '' }));
        }
    }, [formData.tankId, isEditing, availableSensorTypesForCreation]);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        if (isEditing && originalSensor?.tankId !== formData.tankId) {
            const targetTankSensors = sensorsByTank.get(formData.tankId) || [];
            if (targetTankSensors.some(s => s.type === originalSensor.type)) {
                setError(`El tanque de destino ya tiene un sensor de tipo '${originalSensor.type}'.`);
                setIsSubmitting(false);
                return;
            }
        }

        try {
            const dataToSubmit = { name: formData.name, tankId: formData.tankId, calibrationDate: new Date(formData.calibrationDate).toISOString() };
            if (isEditing) {
                await updateSensor(originalSensor.id, dataToSubmit);
            } else {
                await createSensor({ ...dataToSubmit, hardwareId: formData.hardwareId, type: formData.type });
            }
            onSave();
            onClose();
            await Swal.fire({ icon: 'success', title: `Sensor ${isEditing ? 'actualizado' : 'creado'}`, toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
        } catch (err: any) {
            const message = err.response?.data?.message || 'Ocurrió un error inesperado.';
            setError(message);
        } finally {
            setIsSubmitting(false);
        }
    }, [formData, isEditing, originalSensor, onSave, onClose, sensorsByTank]);

    return (
        <Modal
            title={isEditing ? "Editar Sensor" : "Nuevo Sensor"}
            isOpen={isOpen}
            onClose={onClose}
            footer={
                <>
                    <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
                    <button type="submit" form="sensor-form" disabled={isSubmitting || (!isEditing && !formData.type)} className="btn-primary min-w-[140px]">
                        {isSubmitting ? <LoadingSpinner size="sm" /> : <><Save className="w-4 h-4" /><span>{isEditing ? 'Guardar' : 'Crear'}</span></>}
                    </button>
                </>
            }
        >
            <form id="sensor-form" onSubmit={handleSubmit} className="space-y-4">
                <div><label className="label">Nombre del Sensor*</label><input type="text" value={formData.name} onChange={e => setFormData(d => ({ ...d, name: e.target.value }))} className="form-input" required /></div>
                {!isEditing && (<div><label className="label">ID de Hardware*</label><input type="text" value={formData.hardwareId} onChange={e => setFormData(d => ({ ...d, hardwareId: e.target.value }))} className="form-input" required /></div>)}
                <div><label className="label">Asignar a Tanque*</label><select value={formData.tankId} onChange={e => setFormData(d => ({ ...d, tankId: e.target.value}))} className="form-select" required><option value="" disabled>Selecciona un tanque</option>{tanks.map(tank => <option key={tank.id} value={tank.id}>{tank.name}</option>)}</select></div>
                <div><label className="label">Tipo de Sensor*</label>
                    <select value={formData.type} onChange={e => setFormData(d => ({ ...d, type: e.target.value as any}))} className="form-select" required disabled={isEditing}>
                        {isEditing ? <option value={originalSensor?.type}>{SENSOR_TYPE_OPTIONS.find(o => o.value === originalSensor?.type)?.label}</option> : (availableSensorTypesForCreation.length > 0 ? availableSensorTypesForCreation.map(type => <option key={type.value} value={type.value}>{type.label}</option>) : <option disabled>No hay tipos disponibles</option>)}
                    </select>
                </div>
                <div><label className="label">Fecha de Calibración*</label><input type="date" value={formData.calibrationDate} onChange={e => setFormData(d => ({ ...d, calibrationDate: e.target.value }))} className="form-input" required max={new Date().toISOString().split('T')[0]} /></div>
                {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            </form>
        </Modal>
    );
};