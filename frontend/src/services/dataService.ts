/**
 * @file dataService.ts
 * @description Servicio para interactuar con la API de datos de sensores.
 * Incluye funciones para entrada manual, datos históricos, y gestión de simuladores.
 * @author Kevin Mariano (Optimizado por Gemini)
 * @version 3.0.0
 * @since 1.0.0
 */
import api from '@/config/api';
import { SensorData, HistoricalDataParams, ManualEntryDto } from '@/types';

/**
 * @interface EmitterStatus
 * @description Estado de un simulador de sensor
 */
interface EmitterStatus {
  sensorId: string;
  sensorName: string;
  type: string;
  tankName: string;
  userName: string;
  thresholds: { min: number; max: number };
  currentValue: number;
  state: 'STABLE' | 'RISING' | 'FALLING';
  startTime: string;
  uptime: number;
  unit: string;
}

/**
 * @interface ApiResponse
 * @description Respuesta genérica de la API
 */
interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  success?: boolean;
}

/**
 * @function addManualEntry
 * @description Envía una entrada manual de datos de sensor
 * @param {ManualEntryDto} entry - Datos de la entrada manual
 * @returns {Promise<SensorData>} Datos del sensor creados
 * @throws {Error} Si ocurre un error en la petición
 * 
 * @example
 * ```typescript
 * const entry = {
 *   sensorId: 'sensor-123',
 *   value: 25.5,
 *   timestamp: new Date()
 * };
 * const result = await addManualEntry(entry);
 * console.log('Datos guardados:', result);
 * ```
 */
export const addManualEntry = async (entry: ManualEntryDto): Promise<SensorData> => {
  try {
    console.log('📝 [DATA-SERVICE] Enviando entrada manual:', entry);
    
    // Validar datos antes de enviar
    if (!entry.sensorId || entry.sensorId.trim() === '') {
      throw new Error('El ID del sensor es requerido');
    }
    
    if (typeof entry.value !== 'number' || isNaN(entry.value)) {
      throw new Error('El valor debe ser un número válido');
    }
    
    // Preparar payload como array (la API espera un array de entradas)
    const payload = [entry];
    
    const response = await api.post<ApiResponse<SensorData[]>>('/data/manual', payload);
    
    if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
      throw new Error('Respuesta inválida del servidor');
    }
    
    const createdData = response.data[0];
    console.log('✅ [DATA-SERVICE] Entrada manual creada exitosamente:', createdData.id);
    
    return createdData;
    
  } catch (error: any) {
    console.error('❌ [DATA-SERVICE] Error en addManualEntry:', error);
    
    // Mejorar mensajes de error para el usuario
    if (error.response?.status === 404) {
      throw new Error('El sensor especificado no fue encontrado');
    } else if (error.response?.status === 403) {
      throw new Error('No tiene permisos para agregar datos a este sensor');
    } else if (error.response?.status === 400) {
      throw new Error(`Datos inválidos: ${error.response.data?.message || 'Verifique los valores ingresados'}`);
    } else if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    } else {
      throw new Error(`Error al guardar los datos: ${error.message || 'Error desconocido'}`);
    }
  }
};

/**
 * @function addManualEntries
 * @description Envía múltiples entradas manuales de datos
 * @param {ManualEntryDto[]} entries - Array de entradas manuales
 * @returns {Promise<SensorData[]>} Array de datos de sensores creados
 * @throws {Error} Si ocurre un error en la petición
 * 
 * @example
 * ```typescript
 * const entries = [
 *   { sensorId: 'sensor-1', value: 25.5, timestamp: new Date() },
 *   { sensorId: 'sensor-2', value: 7.2, timestamp: new Date() }
 * ];
 * const results = await addManualEntries(entries);
 * console.log(`Se guardaron ${results.length} entradas`);
 * ```
 */
export const addManualEntries = async (entries: ManualEntryDto[]): Promise<SensorData[]> => {
  try {
    console.log(`📝 [DATA-SERVICE] Enviando ${entries.length} entradas manuales`);
    
    // Validar que hay entradas
    if (!Array.isArray(entries) || entries.length === 0) {
      throw new Error('Debe proporcionar al menos una entrada de datos');
    }
    
    // Validar cada entrada
    entries.forEach((entry, index) => {
      if (!entry.sensorId || entry.sensorId.trim() === '') {
        throw new Error(`Entrada ${index + 1}: El ID del sensor es requerido`);
      }
      if (typeof entry.value !== 'number' || isNaN(entry.value)) {
        throw new Error(`Entrada ${index + 1}: El valor debe ser un número válido`);
      }
    });
    
    const response = await api.post<ApiResponse<SensorData[]>>('/data/manual', entries);
    
    if (!response.data || !Array.isArray(response.data)) {
      throw new Error('Respuesta inválida del servidor');
    }
    
    console.log(`✅ [DATA-SERVICE] Se crearon ${response.data.length} entradas exitosamente`);
    return response.data;
    
  } catch (error: any) {
    console.error('❌ [DATA-SERVICE] Error en addManualEntries:', error);
    throw new Error(`Error al guardar las entradas: ${error.message || 'Error desconocido'}`);
  }
};

/**
 * @function getLatestData
 * @description Obtiene los datos más recientes de sensores de un tanque
 * @param {Object} params - Parámetros de consulta
 * @param {string} params.tankId - ID del tanque
 * @param {string} [params.type] - Tipo de sensor (opcional)
 * @returns {Promise<SensorData[]>} Array de datos más recientes
 * @throws {Error} Si ocurre un error en la petición
 * 
 * @example
 * ```typescript
 * const latestData = await getLatestData({ tankId: 'tank-123', type: 'TEMPERATURE' });
 * console.log('Datos más recientes:', latestData);
 * ```
 */
export const getLatestData = async (params: { tankId: string; type?: string }): Promise<SensorData[]> => {
  try {
    console.log('📊 [DATA-SERVICE] Obteniendo datos más recientes:', params);
    
    if (!params.tankId) {
      throw new Error('El ID del tanque es requerido');
    }
    
    const queryParams = new URLSearchParams({ tankId: params.tankId });
    if (params.type) {
      queryParams.append('type', params.type);
    }
    
    const response = await api.get<SensorData[]>(`/data/latest?${queryParams.toString()}`);
    
    if (!response.data || !Array.isArray(response.data)) {
      console.warn('⚠️ [DATA-SERVICE] No se encontraron datos más recientes');
      return [];
    }
    
    console.log(`✅ [DATA-SERVICE] Se obtuvieron ${response.data.length} registros más recientes`);
    return response.data;
    
  } catch (error: any) {
    console.error('❌ [DATA-SERVICE] Error en getLatestData:', error);
    
    if (error.response?.status === 403) {
      throw new Error('No tiene permisos para acceder a los datos de este tanque');
    } else if (error.response?.status === 404) {
      throw new Error('El tanque especificado no fue encontrado');
    } else {
      throw new Error(`Error al obtener datos recientes: ${error.message || 'Error desconocido'}`);
    }
  }
};

/**
 * @function getHistoricalData
 * @description Obtiene datos históricos de sensores en un rango de fechas
 * @param {HistoricalDataParams} params - Parámetros de consulta histórica
 * @returns {Promise<SensorData[]>} Array de datos históricos
 * @throws {Error} Si ocurre un error en la petición
 * 
 * @example
 * ```typescript
 * const params = {
 *   tankId: 'tank-123',
 *   startDate: '2024-01-01',
 *   endDate: '2024-01-31'
 * };
 * const historicalData = await getHistoricalData(params);
 * console.log(`Datos históricos: ${historicalData.length} registros`);
 * ```
 */
export const getHistoricalData = async (params: HistoricalDataParams): Promise<SensorData[]> => {
  try {
    console.log('📈 [DATA-SERVICE] Obteniendo datos históricos:', params);
    
    // Validar parámetros requeridos
    if (!params.tankId) {
      throw new Error('El ID del tanque es requerido');
    }
    if (!params.startDate) {
      throw new Error('La fecha de inicio es requerida');
    }
    if (!params.endDate) {
      throw new Error('La fecha de fin es requerida');
    }
    
    // Validar formato de fechas
    const startDate = new Date(params.startDate);
    const endDate = new Date(params.endDate);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error('Las fechas proporcionadas no son válidas');
    }
    
    if (startDate > endDate) {
      throw new Error('La fecha de inicio debe ser anterior a la fecha de fin');
    }
    
    const queryParams = new URLSearchParams({
      tankId: params.tankId,
      startDate: params.startDate,
      endDate: params.endDate
    });
    
    const response = await api.get<{ data: SensorData[] }>(`/data/historical?${queryParams.toString()}`);
    
    if (!response.data?.data || !Array.isArray(response.data.data)) {
      console.warn('⚠️ [DATA-SERVICE] No se encontraron datos históricos');
      return [];
    }
    
    console.log(`✅ [DATA-SERVICE] Se obtuvieron ${response.data.data.length} registros históricos`);
    return response.data.data;
    
  } catch (error: any) {
    console.error('❌ [DATA-SERVICE] Error en getHistoricalData:', error);
    
    if (error.response?.status === 403) {
      throw new Error('No tiene permisos para acceder a los datos históricos de este tanque');
    } else if (error.response?.status === 404) {
      throw new Error('El tanque especificado no fue encontrado');
    } else if (error.response?.status === 400) {
      throw new Error(`Parámetros inválidos: ${error.response.data?.message || 'Verifique las fechas'}`);
    } else {
      throw new Error(`Error al obtener datos históricos: ${error.message || 'Error desconocido'}`);
    }
  }
};

/**
 * @function startEmitters
 * @description Inicia simuladores de datos para sensores específicos
 * @param {string[]} sensorIds - Array de IDs de sensores para simular
 * @returns {Promise<void>} Promesa que resuelve cuando se inician los simuladores
 * @throws {Error} Si ocurre un error en la petición
 * 
 * @example
 * ```typescript
 * await startEmitters(['sensor-1', 'sensor-2']);
 * console.log('Simuladores iniciados');
 * ```
 */
export const startEmitters = async (sensorIds: string[]): Promise<void> => {
  try {
    console.log(`🚀 [DATA-SERVICE] Iniciando simuladores para ${sensorIds.length} sensores`);
    
    // Validar entrada
    if (!Array.isArray(sensorIds) || sensorIds.length === 0) {
      throw new Error('Debe proporcionar al menos un ID de sensor');
    }
    
    // Validar que todos los IDs sean válidos
    sensorIds.forEach((id, index) => {
      if (!id || typeof id !== 'string' || id.trim() === '') {
        throw new Error(`ID de sensor inválido en posición ${index + 1}`);
      }
    });
    
    const payload = { sensorIds };
    const response = await api.post<ApiResponse>('/data/emitter/start', payload);
    
    console.log('✅ [DATA-SERVICE] Simuladores iniciados exitosamente');
    
  } catch (error: any) {
    console.error('❌ [DATA-SERVICE] Error en startEmitters:', error);
    
    if (error.response?.status === 403) {
      throw new Error('No tiene permisos para iniciar simuladores');
    } else if (error.response?.status === 404) {
      throw new Error('Uno o más sensores no fueron encontrados');
    } else {
      throw new Error(`Error al iniciar simuladores: ${error.response?.data?.message || error.message || 'Error desconocido'}`);
    }
  }
};

/**
 * @function stopEmitter
 * @description Detiene el simulador de un sensor específico
 * @param {string} sensorId - ID del sensor cuyo simulador se debe detener
 * @returns {Promise<void>} Promesa que resuelve cuando se detiene el simulador
 * @throws {Error} Si ocurre un error en la petición
 * 
 * @example
 * ```typescript
 * await stopEmitter('sensor-123');
 * console.log('Simulador detenido');
 * ```
 */
export const stopEmitter = async (sensorId: string): Promise<void> => {
  try {
    console.log(`⏹️ [DATA-SERVICE] Deteniendo simulador para sensor: ${sensorId}`);
    
    if (!sensorId || typeof sensorId !== 'string' || sensorId.trim() === '') {
      throw new Error('El ID del sensor es requerido');
    }
    
    const payload = { sensorId };
    const response = await api.post<ApiResponse>('/data/emitter/stop', payload);
    
    console.log('✅ [DATA-SERVICE] Simulador detenido exitosamente');
    
  } catch (error: any) {
    console.error('❌ [DATA-SERVICE] Error en stopEmitter:', error);
    
    if (error.response?.status === 403) {
      throw new Error('No tiene permisos para detener simuladores');
    } else if (error.response?.status === 404) {
      throw new Error('El sensor especificado no fue encontrado o no tiene simulador activo');
    } else {
      throw new Error(`Error al detener simulador: ${error.response?.data?.message || error.message || 'Error desconocido'}`);
    }
  }
};

/**
 * @function getEmitterStatus
 * @description Obtiene el estado actual de todos los simuladores activos
 * @returns {Promise<EmitterStatus[]>} Array con el estado de simuladores activos
 * @throws {Error} Si ocurre un error en la petición
 * 
 * @example
 * ```typescript
 * const status = await getEmitterStatus();
 * console.log(`Simuladores activos: ${status.length}`);
 * status.forEach(s => console.log(`${s.sensorName}: ${s.currentValue} ${s.unit}`));
 * ```
 */
export const getEmitterStatus = async (): Promise<EmitterStatus[]> => {
  try {
    console.log('📊 [DATA-SERVICE] Obteniendo estado de simuladores');
    
    const response = await api.get<EmitterStatus[]>('/data/emitter/status');
    
    if (!response.data || !Array.isArray(response.data)) {
      console.warn('⚠️ [DATA-SERVICE] No se encontraron simuladores activos');
      return [];
    }
    
    console.log(`✅ [DATA-SERVICE] Estado obtenido para ${response.data.length} simuladores`);
    return response.data;
    
  } catch (error: any) {
    console.error('❌ [DATA-SERVICE] Error en getEmitterStatus:', error);
    
    if (error.response?.status === 403) {
      throw new Error('No tiene permisos para consultar el estado de simuladores');
    } else {
      throw new Error(`Error al obtener estado de simuladores: ${error.message || 'Error desconocido'}`);
    }
  }
};

/**
 * @function validateSensorValue
 * @description Valida que un valor de sensor esté dentro de rangos razonables
 * @param {number} value - Valor a validar
 * @param {string} sensorType - Tipo de sensor ('TEMPERATURE', 'PH', 'OXYGEN')
 * @returns {Object} Resultado de validación con estado y mensaje
 * 
 * @example
 * ```typescript
 * const validation = validateSensorValue(25.5, 'TEMPERATURE');
 * if (!validation.valid) {
 *   console.warn('Valor fuera de rango:', validation.message);
 * }
 * ```
 */
export const validateSensorValue = (value: number, sensorType: string): { valid: boolean; message?: string; warning?: boolean } => {
  if (typeof value !== 'number' || isNaN(value)) {
    return { valid: false, message: 'El valor debe ser un número válido' };
  }

  const ranges: Record<string, { min: number; max: number; optimal?: { min: number; max: number } }> = {
    TEMPERATURE: { 
      min: -10, 
      max: 50, 
      optimal: { min: 20, max: 30 } 
    },
    PH: { 
      min: 0, 
      max: 14, 
      optimal: { min: 6.5, max: 8.0 } 
    },
    OXYGEN: { 
      min: 0, 
      max: 20, 
      optimal: { min: 5, max: 12 } 
    }
  };

  const range = ranges[sensorType];
  if (!range) {
    return { valid: true, warning: true, message: 'Tipo de sensor no reconocido, no se puede validar el rango' };
  }

  if (value < range.min || value > range.max) {
    return { 
      valid: false, 
      message: `Valor fuera de rango válido para ${sensorType}. Rango permitido: ${range.min} - ${range.max}` 
    };
  }

  if (range.optimal && (value < range.optimal.min || value > range.optimal.max)) {
    return { 
      valid: true, 
      warning: true, 
      message: `Valor fuera del rango óptimo para ${sensorType}. Rango óptimo: ${range.optimal.min} - ${range.optimal.max}` 
    };
  }

  return { valid: true };
};

/**
 * @function formatSensorValue
 * @description Formatea un valor de sensor con la precisión y unidad correcta
 * @param {number} value - Valor a formatear
 * @param {string} sensorType - Tipo de sensor
 * @returns {string} Valor formateado con unidad
 * 
 * @example
 * ```typescript
 * const formatted = formatSensorValue(25.567, 'TEMPERATURE');
 * console.log(formatted); // "25.6°C"
 * ```
 */
export const formatSensorValue = (value: number, sensorType: string): string => {
  if (typeof value !== 'number' || isNaN(value)) {
    return 'N/A';
  }

  const config: Record<string, { precision: number; unit: string }> = {
    TEMPERATURE: { precision: 1, unit: '°C' },
    PH: { precision: 2, unit: 'pH' },
    OXYGEN: { precision: 1, unit: 'mg/L' }
  };

  const sensorConfig = config[sensorType] || { precision: 2, unit: '' };
  const formattedValue = value.toFixed(sensorConfig.precision);
  
  return `${formattedValue}${sensorConfig.unit}`;
};

/**
 * @function getSensorTypeInfo
 * @description Obtiene información completa sobre un tipo de sensor
 * @param {string} sensorType - Tipo de sensor
 * @returns {Object} Información del tipo de sensor
 * 
 * @example
 * ```typescript
 * const info = getSensorTypeInfo('TEMPERATURE');
 * console.log(info.name); // "Temperatura"
 * console.log(info.unit); // "°C"
 * ```
 */
export const getSensorTypeInfo = (sensorType: string) => {
  const sensorTypes: Record<string, {
    name: string;
    unit: string;
    description: string;
    icon: string;
    color: string;
    ranges: { min: number; max: number; optimal?: { min: number; max: number } };
  }> = {
    TEMPERATURE: {
      name: 'Temperatura',
      unit: '°C',
      description: 'Medición de temperatura del agua',
      icon: 'thermometer',
      color: '#EF4444',
      ranges: { min: -10, max: 50, optimal: { min: 20, max: 30 } }
    },
    PH: {
      name: 'pH',
      unit: 'pH',
      description: 'Nivel de acidez o alcalinidad del agua',
      icon: 'droplets',
      color: '#3B82F6',
      ranges: { min: 0, max: 14, optimal: { min: 6.5, max: 8.0 } }
    },
    OXYGEN: {
      name: 'Oxígeno Disuelto',
      unit: 'mg/L',
      description: 'Concentración de oxígeno disuelto en el agua',
      icon: 'wind',
      color: '#10B981',
      ranges: { min: 0, max: 20, optimal: { min: 5, max: 12 } }
    }
  };

  return sensorTypes[sensorType] || {
    name: 'Sensor Desconocido',
    unit: '',
    description: 'Tipo de sensor no reconocido',
    icon: 'help-circle',
    color: '#6B7280',
    ranges: { min: 0, max: 100 }
  };
};

/**
 * @function calculateStatistics
 * @description Calcula estadísticas básicas para un conjunto de datos de sensor
 * @param {SensorData[]} data - Array de datos de sensor
 * @returns {Object} Estadísticas calculadas
 * 
 * @example
 * ```typescript
 * const stats = calculateStatistics(sensorDataArray);
 * console.log(`Promedio: ${stats.average}, Mín: ${stats.min}, Máx: ${stats.max}`);
 * ```
 */
export const calculateStatistics = (data: SensorData[]) => {
  if (!Array.isArray(data) || data.length === 0) {
    return {
      count: 0,
      average: 0,
      min: 0,
      max: 0,
      latest: null,
      oldest: null
    };
  }

  const values = data.map(d => d.value).filter(v => typeof v === 'number' && !isNaN(v));
  
  if (values.length === 0) {
    return {
      count: data.length,
      average: 0,
      min: 0,
      max: 0,
      latest: null,
      oldest: null
    };
  }

  const sortedByTime = [...data].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return {
    count: values.length,
    average: values.reduce((sum, value) => sum + value, 0) / values.length,
    min: Math.min(...values),
    max: Math.max(...values),
    latest: sortedByTime[0] || null,
    oldest: sortedByTime[sortedByTime.length - 1] || null
  };
};

/**
 * @function exportSensorData
 * @description Exporta datos de sensores a formato CSV
 * @param {SensorData[]} data - Array de datos de sensor
 * @param {string} [filename] - Nombre del archivo (opcional)
 * @returns {void} Descarga el archivo CSV
 * 
 * @example
 * ```typescript
 * exportSensorData(sensorDataArray, 'datos_sensores_enero_2024.csv');
 * ```
 */
export const exportSensorData = (data: SensorData[], filename?: string): void => {
  try {
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('No hay datos para exportar');
    }

    // Encabezados CSV en español
    const headers = [
      'Fecha y Hora',
      'Sensor ID',
      'Nombre del Sensor',
      'Tipo',
      'Valor',
      'Unidad',
      'Tanque ID',
      'Hardware ID'
    ];

    // Convertir datos a filas CSV
    const rows = data.map(item => [
      new Date(item.timestamp).toLocaleString('es-CO'),
      item.sensorId,
      item.sensor?.name || 'N/A',
      item.type,
      item.value,
      getSensorTypeInfo(item.type).unit,
      item.tankId,
      item.sensor?.hardwareId || 'N/A'
    ]);

    // Combinar encabezados y filas
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    // Crear y descargar archivo
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename || `datos_sensores_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log('✅ [DATA-SERVICE] Datos exportados exitosamente');
    
  } catch (error) {
    console.error('❌ [DATA-SERVICE] Error exportando datos:', error);
    throw new Error(`Error al exportar datos: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
};

/**
 * @function generateRealtimeDataUrl
 * @description Genera URL para WebSocket de datos en tiempo real
 * @param {string} tankId - ID del tanque
 * @returns {string} URL del WebSocket
 * 
 * @example
 * ```typescript
 * const wsUrl = generateRealtimeDataUrl('tank-123');
 * const socket = new WebSocket(wsUrl);
 * ```
 */
export const generateRealtimeDataUrl = (tankId: string): string => {
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const baseUrl = process.env.NEXT_PUBLIC_WS_URL || `${wsProtocol}//${window.location.host}`;
  return `${baseUrl}/ws?tankId=${encodeURIComponent(tankId)}`;
};

/**
 * @function retryWithBackoff
 * @description Ejecuta una función con reintentos y backoff exponencial
 * @param {Function} fn - Función a ejecutar
 * @param {number} maxRetries - Número máximo de reintentos
 * @param {number} baseDelay - Delay base en milisegundos
 * @returns {Promise} Promesa con el resultado de la función
 * @private
 */
const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Error desconocido');
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      const delay = baseDelay * Math.pow(2, attempt);
      console.warn(`⚠️ [DATA-SERVICE] Intento ${attempt + 1} falló, reintentando en ${delay}ms:`, lastError.message);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
};

/**
 * @function createRetryWrapper
 * @description Crea una versión con reintentos de una función de API
 * @param {Function} apiFunction - Función de API a envolver
 * @param {number} maxRetries - Número máximo de reintentos
 * @returns {Function} Función envuelta con lógica de reintentos
 * 
 * @example
 * ```typescript
 * const reliableGetLatestData = createRetryWrapper(getLatestData, 3);
 * const data = await reliableGetLatestData({ tankId: 'tank-123' });
 * ```
 */
export const createRetryWrapper = <T extends (...args: any[]) => Promise<any>>(
  apiFunction: T,
  maxRetries: number = 3
): T => {
  return ((...args: Parameters<T>) => {
    return retryWithBackoff(() => apiFunction(...args), maxRetries);
  }) as T;
};

// Versiones con reintentos de las funciones principales
export const reliableGetLatestData = createRetryWrapper(getLatestData);
export const reliableGetHistoricalData = createRetryWrapper(getHistoricalData);
export const reliableAddManualEntry = createRetryWrapper(addManualEntry);

/**
 * @constant API_ENDPOINTS
 * @description Constantes con los endpoints de la API
 */
export const API_ENDPOINTS = {
  MANUAL_ENTRY: '/data/manual',
  LATEST_DATA: '/data/latest',
  HISTORICAL_DATA: '/data/historical',
  START_EMITTERS: '/data/emitter/start',
  STOP_EMITTER: '/data/emitter/stop',
  EMITTER_STATUS: '/data/emitter/status'
} as const;

/**
 * @constant DEFAULT_QUERY_OPTIONS
 * @description Opciones por defecto para consultas
 */
export const DEFAULT_QUERY_OPTIONS = {
  timeout: 30000, // 30 segundos
  retries: 3,
  retryDelay: 1000 // 1 segundo
} as const;