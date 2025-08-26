/**
 * @file TankModal.tsx
 * @description Modal para crear y editar tanques, con manejo de errores de validación del backend.
 * @author Kevin Mariano
 * @version 7.0.0
 * @since 1.0.0
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Save } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import * as tankService from '@/services/tankService';
import { Tank } from '@/types';
import Swal from 'sweetalert2';

interface TankModalProps {
  isOpen: boolean;
  isEditing: boolean;
  tankData?: any;
  onClose: () => void;
  onSave: () => void;
  userId?: string | null;
}

export const TankModal: React.FC<TankModalProps> = ({ isOpen, isEditing, tankData, onClose, onSave, userId }) => {
    const [formData, setFormData] = useState({ name: '', location: '', status: 'ACTIVE' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setError(null);
            if (isEditing && tankData) {
                setFormData({
                    name: tankData.name || '',
                    location: tankData.location || '',
                    status: tankData.status || 'ACTIVE',
                });
            } else {
                setFormData({ name: '', location: '', status: 'ACTIVE' });
            }
        }
    }, [isOpen, isEditing, tankData]);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);
        try {
            const dataToSend = { name: formData.name, location: formData.location, status: formData.status };

            if (isEditing) {
                await tankService.updateTank(tankData!.id, dataToSend);
            } else {
                if (!userId) {
                    throw new Error("No se ha seleccionado un usuario para asignar el tanque.");
                }
                await tankService.createTank({ ...dataToSend, userId: userId });
            }
            onSave();
            await Swal.fire({ icon: 'success', title: `Tanque ${isEditing ? 'actualizado' : 'creado'}`, toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
        } catch (err: any) {
            const message = err.response?.data?.message || 'Ocurrió un error inesperado.';
            setError(message);
        } finally {
            setIsSubmitting(false);
        }
    }, [formData, isEditing, tankData, onSave, userId]);

    return (
        <Modal
            title={isEditing ? "Editar Tanque" : "Nuevo Tanque"}
            isOpen={isOpen}
            onClose={onClose}
            footer={
                <>
                    <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
                    <button type="submit" form="tank-form" disabled={isSubmitting} className="btn-primary min-w-[140px]">
                        {isSubmitting ? <LoadingSpinner size="sm" /> : <><Save className="w-4 h-4" /><span>{isEditing ? 'Guardar' : 'Crear'}</span></>}
                    </button>
                </>
            }
        >
            <form id="tank-form" onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="label">Nombre del Tanque*</label>
                    <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="form-input" required />
                </div>
                <div>
                    <label className="label">Ubicación*</label>
                    <input type="text" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} className="form-input" required />
                </div>
                <div>
                    <label className="label">Estado</label>
                    <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as any })} className="form-select">
                        <option value="ACTIVE">Activo</option>
                        <option value="MAINTENANCE">Mantenimiento</option>
                        <option value="INACTIVE">Inactivo</option>
                    </select>
                </div>
                {error && <p className="text-red-500 text-sm text-center mt-2">{error}</p>}
            </form>
        </Modal>
    );
};