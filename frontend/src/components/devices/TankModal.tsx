/**
 * @file TankModal.tsx
 * @description Modal para crear y editar Tanques.
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
 }
 
 export const TankModal: React.FC<TankModalProps> = ({ isOpen, isEditing, tankData, onClose, onSave }) => {
     const [formData, setFormData] = useState({ name: '', location: '', status: 'ACTIVE', userId: '' });
     const [isSubmitting, setIsSubmitting] = useState(false);
     
     useEffect(() => {
         if (tankData) {
             setFormData({ 
                 name: tankData.name || '', 
                 location: tankData.location || '', 
                 status: tankData.status || 'ACTIVE', 
                 userId: tankData.userId 
             });
         }
     }, [tankData]);
 
     const handleSubmit = useCallback(async (e: React.FormEvent) => {
         e.preventDefault();
         setIsSubmitting(true);
         try {
             const dataToSend = { name: formData.name, location: formData.location, status: formData.status };
             const action = isEditing 
                 ? () => tankService.updateTank(tankData!.id, dataToSend) 
                 : () => tankService.createTank({ ...dataToSend, userId: formData.userId });
             
             await action();
             onSave();
             onClose();
             await Swal.fire({ icon: 'success', title: `Tanque ${isEditing ? 'actualizado' : 'creado'}`, toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
         } catch (error: any) {
             const message = error.response?.data?.message || 'Ocurrió un error inesperado.';
             await Swal.fire('Error', Array.isArray(message) ? message.join(', ') : message, 'error');
         } finally { 
             setIsSubmitting(false); 
         }
     }, [formData, isEditing, tankData, onSave, onClose]);
 
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
                 <div><label className="label">Nombre del Tanque*</label><input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="form-input" required /></div>
                 <div><label className="label">Ubicación*</label><input type="text" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} className="form-input" required /></div>
                 <div><label className="label">Estado</label><select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as any })} className="form-select"><option value="ACTIVE">Activo</option><option value="MAINTENANCE">Mantenimiento</option><option value="INACTIVE">Inactivo</option></select></div>
             </form>
         </Modal>
     );
 };