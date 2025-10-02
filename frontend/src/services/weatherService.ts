/**
 * @file weatherService.ts
 * @route frontend/src/services
 * @description Servicio CORREGIDO para obtener datos del clima desde OpenWeatherMap API
 * @author Kevin Mariano
 * @version 2.0.0
 * @since 1.0.0
 * @copyright SENA 2025
 */

const WEATHER_API_KEY = process.env.NEXT_PUBLIC_OPENWEATHERMAP_API_KEY || '56661711020895ed3c361ae25d46de7a';

export interface WeatherForecast {
  date: string;
  temp: number;
  temp_min: number;
  temp_max: number;
  feels_like: number;
  humidity: number;
  description: string;
  icon: string;
}

/**
 * @description Valida y extrae coordenadas de diferentes formatos de ubicación
 * @param {string} location - Puede ser: "lat,lon", "lat, lon", o texto descriptivo
 * @returns {{ lat: number; lon: number } | null} Coordenadas válidas o null
 */
const parseLocation = (location: string): { lat: number; lon: number } | null => {
  if (!location || typeof location !== 'string') {
    console.warn('Ubicación vacía o inválida');
    return null;
  }

  // Limpiar espacios
  const cleaned = location.trim();

  // Intentar parsear como "lat,lon"
  if (cleaned.includes(',')) {
    const parts = cleaned.split(',').map(part => parseFloat(part.trim()));
    
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      const [lat, lon] = parts;
      
      // Validar rangos válidos
      if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
        return { lat, lon };
      }
    }
  }

  console.warn('No se pudo parsear la ubicación:', location);
  return null;
};

/**
 * @description Obtiene el pronóstico del clima para una ubicación específica
 * @param {string} location - Coordenadas en formato "lat,lon" (ej: "4.7110,-74.0721")
 * @param {number} days - Número de días de pronóstico (máx 5 días con API gratuita)
 * @returns {Promise<WeatherForecast[]>} Array con pronósticos diarios
 */
export const getWeatherForecast = async (
  location: string, 
  days: number = 7
): Promise<WeatherForecast[]> => {
  try {
    // Intentar parsear la ubicación
    const coords = parseLocation(location);
    
    if (!coords) {
      console.warn('⚠️ Ubicación no válida, omitiendo datos del clima');
      return []; // Retornar array vacío en lugar de lanzar error
    }

    const { lat, lon } = coords;

    console.log(`🌤️ Obteniendo clima para: ${lat}, ${lon}`);

    // Llamar a la API de OpenWeatherMap (5 day / 3 hour forecast)
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&units=metric&lang=es`,
      { cache: 'no-store' } // Evitar cache para datos actuales
    );

    if (!response.ok) {
      console.error(`Error de API del clima: ${response.status}`);
      return []; // Retornar vacío en lugar de error
    }

    const data = await response.json();

    if (!data.list || data.list.length === 0) {
      console.warn('API del clima retornó datos vacíos');
      return [];
    }

    // Procesar datos y agrupar por día
    const dailyForecasts = processForecastData(data.list, days);
    
    console.log(`✅ Clima obtenido: ${dailyForecasts.length} días`);
    
    return dailyForecasts;
  } catch (error: any) {
    console.error('❌ Error obteniendo pronóstico del clima:', error.message);
    // NO lanzar error, solo retornar array vacío
    return [];
  }
};

/**
 * @description Procesa los datos de la API y agrupa por día
 * @param {any[]} forecastList - Lista de pronósticos de la API
 * @param {number} days - Número de días a procesar
 * @returns {WeatherForecast[]} Pronósticos diarios procesados
 */
const processForecastData = (forecastList: any[], days: number): WeatherForecast[] => {
  const dailyData: { [date: string]: any[] } = {};

  // Agrupar por fecha
  forecastList.forEach((item) => {
    const date = new Date(item.dt * 1000).toLocaleDateString('es-CO');
    
    if (!dailyData[date]) {
      dailyData[date] = [];
    }
    
    dailyData[date].push(item);
  });

  // Calcular promedios diarios
  const dailyForecasts: WeatherForecast[] = Object.entries(dailyData)
    .slice(0, days)
    .map(([date, items]) => {
      const temps = items.map(i => i.main.temp);
      const temps_min = items.map(i => i.main.temp_min);
      const temps_max = items.map(i => i.main.temp_max);
      const feels_like = items.map(i => i.main.feels_like);
      const humidity = items.map(i => i.main.humidity);
      
      // Usar el pronóstico del mediodía para descripción e icono
      const middayItem = items[Math.floor(items.length / 2)];

      return {
        date,
        temp: average(temps),
        temp_min: Math.min(...temps_min),
        temp_max: Math.max(...temps_max),
        feels_like: average(feels_like),
        humidity: average(humidity),
        description: middayItem.weather[0].description,
        icon: middayItem.weather[0].icon,
      };
    });

  return dailyForecasts;
};

/**
 * @description Calcula el promedio de un array de números
 */
const average = (arr: number[]): number => {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
};

/**
 * @description Obtiene la URL del icono del clima
 * @param {string} iconCode - Código del icono (ej: "01d")
 * @returns {string} URL completa del icono
 */
export const getWeatherIconUrl = (iconCode: string): string => {
  return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
};