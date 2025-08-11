import api from '../config/api';

/**
 * @description Envía un conjunto de lecturas manuales al backend.
 */
export const submitManualEntry = (entries: { sensorId: string; value: number }[]) => {
  return api.post('/data/manual', { entries });
};

/**
 * @description Solicita al backend que inicie la simulación para una lista de sensores.
 */
export const startEmitter = (sensorIds: string[]) => {
  return api.post('/data/emitter/start', { sensorIds });
};

/**
 * @description Solicita al backend que detenga la simulación para un sensor.
 */
export const stopEmitter = (sensorId: string) => {
  return api.post('/data/emitter/stop', { sensorId });
};

/**
 * @description Obtiene la lista de todas las simulaciones activas desde el backend.
 */
export const getEmitterStatus = async () => {
  const response = await api.get('/data/emitter/status');
  return response.data;
};