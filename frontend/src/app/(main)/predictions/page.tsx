"use client";

import React, { useState, useEffect } from 'react';
import { TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { useSensorData } from '@/hooks/useSensorData';
import { generarDatosPrediccion } from '@/utils/mockData';
import { PredictionData } from '@/types';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

/**
 * @interface Location
 * Define la estructura para almacenar las coordenadas geográficas.
 * @property {number} lat - Latitud.
 * @property {number} lon - Longitud.
 */
interface Location {
  lat: number;
  lon: number;
}

/**
 * @interface WeatherForecast
 * Define la estructura de los datos del pronóstico del tiempo procesados.
 */
interface WeatherForecast {
  date: string;
  temp: number;
}

/**
 * @async
 * @function fetchWeatherForecast
 * @description Obtiene y procesa el pronóstico del tiempo desde la API de OpenWeatherMap usando la ubicación proporcionada.
 * @param {Location} location - Un objeto con la latitud y longitud del usuario.
 * @returns {Promise<WeatherForecast[]>} Una promesa que se resuelve con el pronóstico del tiempo a 7 días.
 * @throws {Error} Si la llamada a la API falla.
 */
const fetchWeatherForecast = async (location: Location): Promise<WeatherForecast[]> => {
  const API_KEY = process.env.NEXT_PUBLIC_OPENWEATHERMAP_API_KEY;
  if (!API_KEY) {
    console.error("Error: La clave de API de OpenWeatherMap no está configurada en .env");
    return [];
  }

  const { lat, lon } = location;
  const apiUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error(`Error al obtener datos del clima: ${response.statusText}`);
    const data = await response.json();

    const dailyData: { [key: string]: number[] } = {};
    data.list.forEach((item: any) => {
      const date = item.dt_txt.split(' ')[0];
      if (!dailyData[date]) dailyData[date] = [];
      dailyData[date].push(item.main.temp);
    });

    return Object.keys(dailyData).slice(0, 7).map(date => {
      const temps = dailyData[date];
      const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;
      return { date, temp: parseFloat(avgTemp.toFixed(1)) };
    });
  } catch (error) {
    console.error("No se pudo obtener el pronóstico del tiempo:", error);
    return [];
  }
};

/**
 * @component Predictions
 * @description El componente Predictions muestra modelos predictivos y recomendaciones 
 * basadas en datos de sensores y pronósticos del tiempo geolocalizados.
 */
const Predictions: React.FC = () => {
  const { summary } = useSensorData();
  const [predictions, setPredictions] = useState<{
    temperature: PredictionData[];
    ph: PredictionData[];
    oxygen: PredictionData[];
  } | null>(null);

  const [weather, setWeather] = useState<WeatherForecast[] | null>(null);
  /**
   * @state {Location | null} location - Almacena la ubicación del usuario.
   */
  const [location, setLocation] = useState<Location | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Efecto para obtener la ubicación del usuario al montar el componente.
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          });
          setLocationError(null);
        },
        (error) => {
          console.warn(`ADVERTENCIA: ${error.message}. Usando ubicación predeterminada.`);
          setLocationError('No se pudo obtener la ubicación. Usando valores predeterminados.');
          // Ubicación de respaldo (Barranquilla, Colombia)
          setLocation({ lat: 10.96854, lon: -74.78132 });
        }
      );
    } else {
      console.warn("ADVERTENCIA: La geolocalización no es soportada por este navegador. Usando ubicación predeterminada.");
      setLocationError('Geolocalización no soportada. Usando valores predeterminados.');
      setLocation({ lat: 10.96854, lon: -74.78132 });
    }
  }, []);
  
  // Efecto para obtener el pronóstico del tiempo una vez que se tiene la ubicación.
  useEffect(() => {
    if (location) {
      fetchWeatherForecast(location).then(setWeather);
    }
  }, [location]);

  // Efecto para regenerar las predicciones cuando los datos de los sensores o del clima cambian.
  useEffect(() => {
    if (summary) {
      const weatherTemps = weather?.map(w => w.temp);
      setPredictions({
        temperature: generarDatosPrediccion(summary.temperature.current, weatherTemps),
        ph: generarDatosPrediccion(summary.ph.current),
        oxygen: generarDatosPrediccion(summary.oxygen.current),
      });
    }
  }, [summary, weather]);

  /**
   * @function getRecommendations
   * @description Genera una lista de recomendaciones para el sistema basándose en el estado actual y el pronóstico.
   * @returns {Array<object>} Un array de objetos de recomendación.
   */
  const getRecommendations = () => {
    if (!summary) return [];
    const recommendations = [];

    // Recomendaciones basadas en Temperatura del agua
    if (summary.temperature.current < 20) {
      recommendations.push({ type: 'warning', parameter: 'Temperatura', message: 'Temperatura baja detectada. Considere instalar calentadores.', action: 'Aumentar temperatura a 22-26°C' });
    } else if (summary.temperature.current > 28) {
      recommendations.push({ type: 'warning', parameter: 'Temperatura', message: 'Temperatura alta detectada. Verifique la ventilación.', action: 'Mejorar ventilación y sombra' });
    }
    
    // Recomendaciones basadas en pH
     if (summary.ph.current < 6.8) {
      recommendations.push({ type: 'alert', parameter: 'pH', message: 'pH ácido detectado. Riesgo para la salud de peces y plantas.', action: 'Agregar bicarbonato de sodio' });
    } else if (summary.ph.current > 7.6) {
      recommendations.push({ type: 'alert', parameter: 'pH', message: 'pH alcalino detectado. Afecta la absorción de nutrientes.', action: 'Agregar ácido fosfórico' });
    }

    // Recomendaciones basadas en Oxígeno
    if (summary.oxygen.current < 6) {
      recommendations.push({ type: 'alert', parameter: 'Oxígeno', message: 'Nivel de oxígeno bajo. Riesgo crítico para los peces.', action: 'Aumentar aireación inmediatamente' });
    }
    
    // Recomendaciones basadas en el clima
    if (weather && weather.length > 0) {
        const maxTempNextDays = Math.max(...weather.slice(0, 3).map(w => w.temp));
        if (maxTempNextDays > 30) {
            recommendations.push({
                type: 'warning',
                parameter: 'Clima',
                message: `Se esperan altas temperaturas en los próximos días (hasta ${maxTempNextDays}°C).`,
                action: 'Asegure una ventilación adecuada y considere agregar sombra adicional al sistema.',
            });
        }
    }

    // Mensaje de estado óptimo
    if (recommendations.length === 0) {
      recommendations.push({ type: 'success', parameter: 'Sistema', message: 'Todos los parámetros están en rangos óptimos.', action: 'Mantener el monitoreo regular' });
    }

    return recommendations;
  };
  
  /**
   * @function createPredictionChart
   * @description Configura los datos para un gráfico de línea de Chart.js con datos históricos y predichos.
   * @param {PredictionData[]} data - Los datos de predicción a graficar.
   * @param {string} label - La etiqueta para el conjunto de datos.
   * @param {string} color - El color de la línea del gráfico.
   * @returns {object} Un objeto de configuración de datos para Chart.js.
   */
  const createPredictionChart = (data: PredictionData[], label: string, color: string) => {
    const labels = data.map((_, index) => 
      index < 4 ? `Día -${3 - index}` : `Día +${index - 3}`
    );

    return {
      labels,
      datasets: [
        {
          label: `${label} (Histórico)`,
          data: data.map(d => d.actual),
          borderColor: color,
          backgroundColor: `${color}40`,
          tension: 0.4,
        },
        {
          label: `${label} (Predicción)`,
          data: data.map(d => d.predicted),
          borderColor: color,
          backgroundColor: `${color}20`,
          tension: 0.4,
          borderDash: [5, 5],
        },
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const },
    },
    scales: {
        y: { beginAtZero: false }
    }
  };

  const recommendations = getRecommendations();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Modelos Predictivos
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Forecasting y recomendaciones basadas en análisis de tendencias y clima local.
          {locationError && <span className="text-sm text-orange-500 block mt-1">{locationError}</span>}
        </p>
      </div>

      <Card title="Recomendaciones del Sistema" subtitle="Análisis automático y sugerencias de mejora">
        <div className="space-y-4">
          {recommendations.map((rec, index) => {
            const Icon = rec.type === 'success' ? CheckCircle : AlertTriangle;
            const colorClasses = 
                rec.type === 'success' ? 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/30' :
                rec.type === 'warning' ? 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-900/30' :
                'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/30';
            
            const textColor = colorClasses.split(' ')[0] + ' ' + colorClasses.split(' ')[2];
            const bgColor = colorClasses.split(' ')[1] + ' ' + colorClasses.split(' ')[3];

            return (
              <div key={index} className={`p-4 rounded-lg ${bgColor}`}>
                <div className="flex items-start space-x-3">
                  <Icon className={`w-5 h-5 mt-0.5 ${textColor}`} />
                  <div className="flex-1">
                    <span className={`font-semibold ${textColor}`}>{rec.parameter}</span>
                    <p className="text-gray-700 dark:text-gray-300 mt-1 mb-2">{rec.message}</p>
                    <div className={`text-sm font-medium ${textColor}`}>
                      Acción recomendada: {rec.action}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {predictions ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Predicción de Temperatura" subtitle="Forecast a 7 días (ajustado por clima local)">
            <div className="relative h-72">
              <Line data={createPredictionChart(predictions.temperature, 'Temperatura (°C)', '#3b82f6')} options={chartOptions}/>
            </div>
          </Card>
          <Card title="Predicción de pH" subtitle="Proyección de niveles de acidez">
            <div className="relative h-72">
              <Line data={createPredictionChart(predictions.ph, 'pH', '#10b981')} options={chartOptions}/>
            </div>
          </Card>
          <Card title="Predicción de Oxígeno" subtitle="Estimación de oxígeno disuelto" className="lg:col-span-2">
            <div className="relative h-72">
              <Line data={createPredictionChart(predictions.oxygen, 'Oxígeno (mg/L)', '#f97316')} options={chartOptions} />
            </div>
          </Card>
        </div>
      ) : (
         <Card title="Cargando Predicciones...">
            <div className="flex justify-center items-center h-72">
                <p className="text-gray-500">Obteniendo ubicación y datos del clima...</p>
            </div>
         </Card>
      )}
    </div>
  );
};

export default Predictions;