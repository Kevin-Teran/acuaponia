import React, { useState, useEffect, useCallback } from 'react';
import { User, Bell, Gauge, Save, Edit, X, Loader } from 'lucide-react';
import { Card } from '../common/Card';
import { useAuth } from '../../hooks/useAuth';
import * as settingsService from '../../services/settingsService';
import Swal from 'sweetalert2';
import { LoadingSpinner } from '../common/LoadingSpinner';

const SettingRow = ({ title, description, children }: { title: string, description: string, children: React.ReactNode }) => (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
        <div className="mb-2 sm:mb-0 sm:mr-4 flex-grow">
            <h3 className="font-medium text-gray-900 dark:text-white">{title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
        </div>
        <div className="flex-shrink-0">
            {children}
        </div>
    </div>
);

const defaultThresholds = {
    temperature: { min: 20, max: 28 }, ph: { min: 6.8, max: 7.6 }, oxygen: { min: 6, max: 10 }
};
const defaultNotifications = {
    email: true, critical: true, reports: false
};

/**
 * @component Settings
 * @description Módulo donde el usuario puede editar su perfil y las preferencias del sistema.
 */
export const Settings: React.FC = () => {
  const { user, updateProfile, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [profileData, setProfileData] = useState({ name: user?.name || '', email: user?.email || '', newPassword: '', confirmPassword: '' });
  const [thresholds, setThresholds] = useState<any>(defaultThresholds);
  const [notifications, setNotifications] = useState<any>(defaultNotifications);
  
  const loadSettings = useCallback(async () => {
    setIsLoadingData(true);
    try {
      const settings = await settingsService.getSettings();
      setThresholds(settings.thresholds || defaultThresholds);
      setNotifications(settings.notifications || defaultNotifications);
    } catch (error) {
      console.error("Error al cargar configuraciones:", error);
      Swal.fire('Error', 'No se pudieron cargar sus configuraciones. Se usarán los valores por defecto.', 'error');
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);
  
  useEffect(() => {
    if (user) {
      setProfileData(prev => ({ ...prev, name: user.name, email: user.email }));
    }
  }, [user]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (profileData.newPassword && profileData.newPassword !== profileData.confirmPassword) {
      Swal.fire('Error de Validación', 'Las nuevas contraseñas no coinciden.', 'error');
      return;
    }
    if (profileData.newPassword && profileData.newPassword.length < 6) {
      Swal.fire('Contraseña Insegura', 'La nueva contraseña debe tener al menos 6 caracteres.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const dataToUpdate: { name: string; email: string; password?: string } = { 
        name: profileData.name.trim(), 
        email: profileData.email.trim() 
      };
      if (profileData.newPassword) {
        dataToUpdate.password = profileData.newPassword;
      }
      
      await updateProfile(dataToUpdate);
      
      Swal.fire({ icon: 'success', title: '¡Perfil Actualizado!', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
      setShowEditProfile(false);
      setProfileData({ ...profileData, newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      Swal.fire('Error al Actualizar', error.response?.data?.message || 'No se pudo actualizar el perfil.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveSettings = async (settingsKey: string, data: any, friendlyName: string) => {
    setIsSubmitting(true);
    try {
        await settingsService.updateSetting(settingsKey, data);
        Swal.fire({ icon: 'success', title: '¡Guardado!', text: `Tus ajustes de ${friendlyName} se han guardado.`, toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
    } catch (error) {
        Swal.fire('Error', `No se pudieron guardar los ajustes de ${friendlyName}.`, 'error');
    } finally {
        setIsSubmitting(false);
    }
  };

  const tabs = [
      { id: 'profile', label: 'Mi Perfil', icon: User }, 
      { id: 'thresholds', label: 'Umbrales de Alerta', icon: Gauge }, 
      { id: 'notifications', label: 'Notificaciones', icon: Bell }
  ];

  if (isLoadingData || authLoading) return <LoadingSpinner fullScreen message="Cargando configuraciones..." />;

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold text-gray-900 dark:text-white">Configuración</h1><p className="text-gray-600 dark:text-gray-400 mt-1">Personaliza tu perfil y las preferencias del sistema.</p></div>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1"><Card className="p-2"><nav className="space-y-1">{tabs.map((tab) => (<button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center space-x-3 px-4 py-3 text-left rounded-lg transition-colors ${activeTab === tab.id ? 'bg-sena-green text-white shadow' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/80'}`}><tab.icon className="w-5 h-5" /><span className="font-medium">{tab.label}</span></button>))}</nav></Card></div>
        <div className="lg:col-span-3">
          <Card>
            {activeTab === 'profile' && (<div className="space-y-6"><div className="flex items-center justify-between"><h2 className="text-xl font-semibold text-gray-900 dark:text-white">Información del Perfil</h2><button onClick={() => setShowEditProfile(!showEditProfile)} className={`flex items-center space-x-2 px-4 py-2 text-white rounded-lg transition-colors ${showEditProfile ? 'bg-gray-500 hover:bg-gray-600' : 'bg-sena-green hover:bg-green-700'}`}>{showEditProfile ? <X className="w-4 h-4" /> : <Edit className="w-4 h-4" />}<span>{showEditProfile ? 'Cancelar' : 'Editar'}</span></button></div>
              {!showEditProfile ? (<div className="flex items-center space-x-4"><div className="w-16 h-16 bg-gradient-to-r from-sena-green to-green-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">{user?.name.charAt(0).toUpperCase()}</div><div><h3 className="text-lg font-semibold text-gray-900 dark:text-white">{user?.name}</h3><p className="text-gray-600 dark:text-gray-400">{user?.email}</p><p className="text-sm text-sena-green font-medium">{user?.role === 'ADMIN' ? 'Administrador' : 'Usuario'}</p></div></div>) : (
                <form onSubmit={handleProfileSubmit} className="space-y-4"><div className="grid md:grid-cols-2 gap-4"><div><label className="label">Nombre Completo</label><input type="text" value={profileData.name} onChange={(e) => setProfileData({ ...profileData, name: e.target.value })} className="form-input" required /></div><div><label className="label">Email</label><input type="email" value={profileData.email} onChange={(e) => setProfileData({ ...profileData, email: e.target.value })} className="form-input" required /></div></div><div className="border-t pt-4 dark:border-gray-700"><h4 className="font-medium mb-3 text-gray-900 dark:text-white">Cambiar Contraseña</h4><div className="grid md:grid-cols-2 gap-4"><div><label className="label">Nueva Contraseña</label><input type="password" value={profileData.newPassword} onChange={(e) => setProfileData({ ...profileData, newPassword: e.target.value })} className="form-input" placeholder="Dejar en blanco para no cambiar" /></div><div><label className="label">Confirmar Contraseña</label><input type="password" value={profileData.confirmPassword} onChange={(e) => setProfileData({ ...profileData, confirmPassword: e.target.value })} className="form-input" /></div></div></div><div className="flex justify-end"><button type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting ? <Loader className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /><span>Guardar Cambios</span></> }</button></div></form>
              )}
            </div>)}
            {activeTab === 'thresholds' && (<form onSubmit={(e) => { e.preventDefault(); handleSaveSettings('thresholds', thresholds, 'Umbrales'); }} className="space-y-6"><h2 className="text-xl font-semibold text-gray-900 dark:text-white">Rangos Aceptables</h2>{Object.entries(thresholds).map(([key, values]: [string, any]) => (<div key={key} className="border dark:border-gray-700 rounded-lg p-4 space-y-4"><h3 className="text-lg font-medium text-gray-900 dark:text-white capitalize">{key === 'ph' ? 'pH' : key === 'oxygen' ? 'Oxígeno Disuelto' : 'Temperatura'}</h3><div><p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Define los valores mínimos y máximos. Una lectura fuera de este rango generará una alerta.</p><div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4"><label className="label sm:w-20">Mínimo:</label><input type="number" step="0.1" value={values.min} onChange={(e) => setThresholds({ ...thresholds, [key]: { ...values, min: parseFloat(e.target.value) } })} className="w-full form-input" /><label className="label sm:w-20 mt-2 sm:mt-0">Máximo:</label><input type="number" step="0.1" value={values.max} onChange={(e) => setThresholds({ ...thresholds, [key]: { ...values, max: parseFloat(e.target.value) } })} className="w-full form-input" /></div></div></div>))}<div className="flex justify-end mt-6"><button type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting ? <Loader className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /><span>Guardar Umbrales</span></> }</button></div></form>)}
            {activeTab === 'notifications' && (<div className="space-y-6"><h2 className="text-xl font-semibold text-gray-900 dark:text-white">Configuración de Notificaciones</h2><div className="space-y-4"><SettingRow title="Notificaciones por Email" description="Recibir alertas y reportes por correo electrónico."><input type="checkbox" checked={notifications.email} onChange={(e) => setNotifications({...notifications, email: e.target.checked})} className="toggle-checkbox" /></SettingRow><SettingRow title="Alertas Críticas" description="Recibir notificaciones inmediatas para valores críticos."><input type="checkbox" checked={notifications.critical} onChange={(e) => setNotifications({...notifications, critical: e.target.checked})} className="toggle-checkbox" /></SettingRow><SettingRow title="Reportes Automáticos" description="Envío automático de reportes semanales."><input type="checkbox" checked={notifications.reports} onChange={(e) => setNotifications({...notifications, reports: e.target.checked})} className="toggle-checkbox" /></SettingRow></div><div className="flex justify-end mt-6"><button onClick={() => handleSaveSettings('notifications', notifications, 'Notificaciones')} disabled={isSubmitting} className="btn-primary">{isSubmitting ? <Loader className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /><span>Guardar Notificaciones</span></> }</button></div></div>)}
          </Card>
        </div>
      </div>
      {/* Estilos para el interruptor (toggle switch) */}
      <style>{`
        .toggle-checkbox { 
          appearance: none; 
          width: 2.75rem; 
          height: 1.5rem; 
          background-color: #e5e7eb; 
          border-radius: 9999px; 
          position: relative; 
          transition: background-color 0.2s ease-in-out; 
          cursor: pointer; 
        } 
        .toggle-checkbox:checked { 
          background-color: #39A900; 
        } 
        .toggle-checkbox::before { 
          content: ''; 
          position: absolute; 
          top: 2px; 
          left: 2px; 
          width: 1.25rem; 
          height: 1.25rem; 
          background-color: white; 
          border-radius: 9999px; 
          transition: transform 0.2s ease-in-out; 
        } 
        .toggle-checkbox:checked::before { 
          transform: translateX(1.25rem); 
        } 
        .dark .toggle-checkbox { 
          background-color: #4b5563; 
        }
      `}</style>
    </div>
  );
};