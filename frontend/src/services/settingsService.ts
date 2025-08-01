import api from '../config/api';

// --- Perfil de Usuario ---
// (La actualización del perfil se maneja a través de userService, pero la lógica de contraseña podría ir aquí)

// --- Umbrales (Thresholds) ---
export const getThresholds = async () => {
  // En el futuro, esto llamará a: const response = await api.get('/settings/thresholds');
  // Por ahora, simulamos una respuesta exitosa con valores por defecto.
  console.log('Simulando carga de umbrales desde la API...');
  return Promise.resolve({
    temperature: { min: 20, max: 28, optimal: { min: 22, max: 26 } },
    ph: { min: 6.0, max: 8.5, optimal: { min: 6.8, max: 7.6 } },
    oxygen: { min: 4, max: 12, optimal: { min: 6, max: 10 } }
  });
};

export const saveThresholds = async (thresholds: any) => {
  // En el futuro: return api.put('/settings/thresholds', { thresholds });
  console.log('Simulando guardado de umbrales en la API:', thresholds);
  return Promise.resolve({ success: true, data: thresholds });
};

// --- Notificaciones ---
export const getNotificationSettings = async () => {
  console.log('Simulando carga de notificaciones...');
  return Promise.resolve({
    email: true,
    critical: true,
    reports: false,
    maintenance: true
  });
};

export const saveNotificationSettings = async (settings: any) => {
  console.log('Simulando guardado de notificaciones:', settings);
  return Promise.resolve({ success: true, data: settings });
};