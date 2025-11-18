/**
 * @file ai-assistant.service.ts
 * @route backend/src/ai-assistant
 * @description Lógica de negocio para el asistente de IA (ACUAGENIUS) - Respuestas solo en texto natural
 * @author kevin mariano & Deiner
 * @version 1.2.1 - Corrección de consulta Prisma
 * @since 1.0.0
 * @copyright SENA 2025
 */

import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { sensors_type, Role, User, Prisma } from '@prisma/client'; 
import axios from 'axios';

type CurrentUser = Pick<User, 'id' | 'role'>;

interface ThresholdSettings {
  temperatureMin: number;
  temperatureMax: number;
  phMin: number;
  phMax: number;
  oxygenMin: number;
  oxygenMax: number;
}
interface LocationSettings {
  latitude?: string | number;
  longitude?: string | number;
}
interface UserSettingsData {
  thresholds?: ThresholdSettings;
  location?: LocationSettings;
}

@Injectable()
export class AiAssistantService {
  private readonly logger = new Logger(AiAssistantService.name);
  private readonly groqApiKey: string;
  private readonly groqApiUrl: string;
  private readonly openWeatherMapApiKey: string;

  constructor(private prisma: PrismaService) {
    this.groqApiKey = process.env.GROQ_API_KEY;
    this.groqApiUrl = process.env.GROQ_API_URL || 'https://api.groq.com/openai/v1/chat/completions';
    this.openWeatherMapApiKey = process.env.OPENWEATHERMAP_API_KEY;
    
    if (!this.groqApiKey || this.groqApiKey.length < 10) { 
      // Se mantiene el throw, ya que sin API Key la función es crítica
      throw new Error('GROQ_API_KEY no está definida o es inválida en el archivo .env');
    }
  }

  private async getWeatherData(lat: string | number, lon: string | number) {
    // ... (Lógica de getWeatherData es correcta)
    const DEFAULT_LAT = 4.711; 
    const DEFAULT_LON = -74.0721;
    
    const finalLat = lat || DEFAULT_LAT;
    const finalLon = lon || DEFAULT_LON;

    if (!this.openWeatherMapApiKey) {
      return { 
          temperature: 'N/D', 
          description: 'No disponible (Falta API Key)', 
          windSpeed: 'N/D' 
      };
    }

    try {
      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?lat=${finalLat}&lon=${finalLon}&appid=${this.openWeatherMapApiKey}&units=metric&lang=es`
      );
      
      const data = response.data;
      return {
        temperature: data.main.temp.toFixed(1) + ' °C',
        description: data.weather[0].description,
        windSpeed: data.wind.speed.toFixed(1) + ' m/s',
      };
    } catch (error) {
      this.logger.error("Error al obtener datos del clima:", error.message);
      return { temperature: 'N/D', description: 'Error al consultar clima', windSpeed: 'N/D' };
    }
  }

  private async getSystemContext(user: CurrentUser) {
    try {
      // IMPORTANTE: SIEMPRE filtrar por usuario actual, incluso si es ADMIN
      const userTankWhere: Prisma.TankWhereInput = { userId: user.id, status: 'ACTIVE' };

      const userSettingsResult = await this.prisma.user.findUnique({
          where: { id: user.id },
          select: { settings: true },
      });
      
      let userSettings: UserSettingsData = {};
      let userCoords: LocationSettings = {};

      if (userSettingsResult?.settings) {
          try {
              const settingsObject: UserSettingsData = JSON.parse(userSettingsResult.settings);
              userSettings = settingsObject;
              userCoords = settingsObject.location || {};
          } catch (e) {
              this.logger.warn("Error al parsear la configuración del usuario:", e);
          }
      }
      
      // Contar SOLO los tanques del usuario actual
      const activeTanksCount = await this.prisma.tank.count({ where: userTankWhere });
      
      // Contar sensores activos por tipo
      const temperatureSensorsCount = await this.prisma.sensor.count({ 
        where: { tank: userTankWhere, status: 'ACTIVE', type: sensors_type.TEMPERATURE } 
      });
      const phSensorsCount = await this.prisma.sensor.count({ 
        where: { tank: userTankWhere, status: 'ACTIVE', type: sensors_type.PH } 
      });
      const oxygenSensorsCount = await this.prisma.sensor.count({ 
        where: { tank: userTankWhere, status: 'ACTIVE', type: sensors_type.OXYGEN } 
      });
      
      const totalActiveSensorsCount = temperatureSensorsCount + phSensorsCount + oxygenSensorsCount;
      
      const alertWhere: Prisma.AlertWhereInput = { 
        resolved: false, 
        sensor: { tank: userTankWhere } 
      };
      const unresolvedAlertsCount = await this.prisma.alert.count({ where: alertWhere });
      
      // Obtener SOLO los datos de sensores de los tanques del usuario
      const getSensorHistory = async (type: sensors_type) => {
        const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
        
        // CORRECCIÓN CLAVE: Filtrar usando la relación 'sensor' y luego 'tank'
        const readings = await this.prisma.sensorData.findMany({
          where: { 
            timestamp: { gte: twelveHoursAgo }, 
            sensor: { // <-- ACCESO A LA RELACIÓN DEL SENSOR
                type,
                tank: userTankWhere, // <-- FILTRADO POR TANQUE DEL USUARIO
            }
          },
          orderBy: { timestamp: 'desc' },
          take: 100, // Limitar lecturas para eficiencia
        });
        
        if (readings.length === 0) return { latest: null, avg: null, min: null, max: null };
        
        const values = readings.map(r => 
            typeof r.value === 'number' ? r.value : (r.value as any).toNumber()
        );
        
        return { 
            latest: values[0], 
            avg: values.reduce((acc, val) => acc + val, 0) / values.length, 
            min: Math.min(...values), 
            max: Math.max(...values) 
        };
      };

      const [temperature, ph, oxygen] = await Promise.all([
          getSensorHistory(sensors_type.TEMPERATURE),
          getSensorHistory(sensors_type.PH),
          getSensorHistory(sensors_type.OXYGEN)
      ]);
      
      return { 
          role: user.role,
          userThresholds: userSettings.thresholds || null,
          userCoords,
          activeTanksCount,
          activeSensorsCount: totalActiveSensorsCount,
          temperatureSensorsCount,
          phSensorsCount,
          oxygenSensorsCount,
          unresolvedAlertsCount,
          temperature, 
          ph, 
          oxygen, 
      };
    } catch (error) {
      this.logger.error('Error al construir el contexto del sistema para la IA:', error);
      // Lanzar un error controlado para evitar el 500 silencioso
      throw new InternalServerErrorException('Error al recuperar datos del sistema para el asistente de IA.');
    }
  }

  async getAIResponse(pregunta: string, user: CurrentUser): Promise<string> {
    // ... (El resto del método getAIResponse es correcto)
    // Lógica para Groq API
    const context = await this.getSystemContext(user);
    const weather = await this.getWeatherData(context.userCoords.latitude, context.userCoords.longitude);

    // ... (El resto del prompt y la llamada a Groq API son correctos)
    const userThresholds = context.userThresholds;
    const thresholdsPrompt = userThresholds
        ? `
      - T° Min/Max: ${userThresholds.temperatureMin?.toFixed(2) ?? 'N/D'}°C / ${userThresholds.temperatureMax?.toFixed(2) ?? 'N/D'}°C
      - pH Min/Max: ${userThresholds.phMin?.toFixed(2) ?? 'N/D'} / ${userThresholds.phMax?.toFixed(2) ?? 'N/D'}
      - O₂ Min/Max: ${userThresholds.oxygenMin?.toFixed(2) ?? 'N/D'} mg/L / ${userThresholds.oxygenMax?.toFixed(2) ?? 'N/D'} mg/L
      (Utiliza estos valores para el análisis).
      `
        : '\n- Umbrales de Usuario: No configurados. Usa rangos estándar acuapónicos.';

    const isUserAdmin = context.role === Role.ADMIN;
    const roleLabel = isUserAdmin ? 'ADMINISTRADOR' : 'USUARIO REGULAR';

    const contextDetails = `
      - ROL DEL USUARIO: ${roleLabel}
      - Tanques Activos en tu cuenta: ${context.activeTanksCount}
      - Total de Sensores Activos en tus tanques: ${context.activeSensorsCount}
        * Sensores de Temperatura: ${context.temperatureSensorsCount}
        * Sensores de pH: ${context.phSensorsCount}
        * Sensores de Oxígeno: ${context.oxygenSensorsCount}
      - Alertas sin Resolver en tus tanques: ${context.unresolvedAlertsCount}
      `;
    
    const prompt = `
      == IDENTIDAD Y PERSONA ==
      Eres "ACUAGENIUS", un asistente de IA del SENA especializado en sistemas acuapónicos. Tu tono es profesional, preciso y servicial.
      
      == INSTRUCCIONES CRÍTICAS DE FORMATO ==
      IMPORTANTE: NUNCA incluyas código, JSON, bloques de código, o cualquier formato técnico en tus respuestas.
      SOLO responde con TEXTO NATURAL en español, como si hablaras con una persona.
      PROHIBIDO usar: {}, [], "", '', \`\`\`, comentarios HTML, o cualquier símbolo de programación.
      
      == ÁMBITO DE INFORMACIÓN ==
      CRÍTICO: Toda la información que te proporciono es EXCLUSIVAMENTE de la cuenta del usuario que está preguntando.
      - Los tanques, sensores y alertas son SOLO los que pertenecen a ESTE usuario específico.
      - NO tienes acceso a información de otros usuarios del sistema.
      - Cuando respondas, habla sobre "tus tanques", "tu sistema", "tu cuenta".
      - NUNCA menciones información global o de otros usuarios.
      
      Si el usuario te pide crear un reporte o predicción, describe verbalmente lo que encontraste EN SUS DATOS.
      Ejemplo CORRECTO: "En tu sistema, el pH ha mostrado una tendencia estable..."
      Ejemplo INCORRECTO: "En el sistema global..." o "Todos los usuarios..."
      
      == CORRECCIÓN DE LENGUAJE ==
      Si detectas errores ortográficos en la pregunta del usuario, entiende su intención y responde normalmente. NUNCA menciones los errores.

      == CONFIGURACIÓN DE UMBRALES DEL USUARIO ==
      ${thresholdsPrompt}

      == CONTEXTO AMBIENTAL Y HORA ACTUAL ==
      - Fecha y Hora Actual: ${new Date().toLocaleString('es-ES', { timeZone: 'America/Bogota' })}
      - T° Ambiente en tu ubicación: ${weather.temperature}
      - Clima en tu ubicación: ${weather.description}
      - Viento: ${weather.windSpeed}

      == CONTEXTO Y DATOS DE TU SISTEMA (ÚLTIMAS 12 HORAS) ==
      ${contextDetails}
      - T° Agua en tus tanques: Actual: ${context.temperature.latest?.toFixed(2) ?? 'N/D'} °C, Promedio: ${context.temperature.avg?.toFixed(2) ?? 'N/D'} °C, Mín: ${context.temperature.min?.toFixed(2) ?? 'N/D'} °C, Máx: ${context.temperature.max?.toFixed(2) ?? 'N/D'} °C
      - pH en tus tanques: Actual: ${context.ph.latest?.toFixed(2) ?? 'N/D'}, Promedio: ${context.ph.avg?.toFixed(2) ?? 'N/D'}, Mín: ${context.ph.min?.toFixed(2) ?? 'N/D'}, Máx: ${context.ph.max?.toFixed(2) ?? 'N/D'}
      - Oxígeno en tus tanques: Actual: ${context.oxygen.latest?.toFixed(2) ?? 'N/D'} mg/L, Promedio: ${context.oxygen.avg?.toFixed(2) ?? 'N/D'} mg/L, Mín: ${context.oxygen.min?.toFixed(2) ?? 'N/D'} mg/L, Máx: ${context.oxygen.max?.toFixed(2) ?? 'N/D'} mg/L
      
      == REGLAS DE INTERACCIÓN ==
      1. Si es un saludo, preséntate brevemente y pregunta cómo puedes ayudar.
      2. Para consultas sobre el sistema, proporciona la información relevante de SU cuenta específicamente.
      3. Para análisis o predicciones, describe los patrones observados en SUS datos.
      4. Sé conciso pero completo. No uses listas numeradas a menos que sea absolutamente necesario.
      5. NUNCA incluyas formatos técnicos, solo texto conversacional.
      6. Siempre habla en segunda persona: "tu sistema", "tus tanques", "tus sensores".

      == PREGUNTA DEL USUARIO ==
      "${pregunta}"
      
      Responde de forma natural y conversacional, enfocándote SOLO en los datos de este usuario:
    `;

    try {
      const response = await axios.post(
        this.groqApiUrl,
        {
          messages: [{ role: 'user', content: prompt }],
          model: 'llama-3.1-8b-instant',
          temperature: 0.7,
        },
        { headers: { 'Authorization': `Bearer ${this.groqApiKey}`, 'Content-Type': 'application/json' } },
      );
      
      const content = response.data.choices[0]?.message?.content?.trim();
      if (content) {
          return content;
      }
      return 'No se pudo obtener una respuesta.';
    } catch (error) {
      this.logger.error("Error al contactar la API de Groq:", error.response?.data || error.message);
      const groqError = error.response?.data?.error?.message || 'Error desconocido al contactar la API.';
      throw new InternalServerErrorException(`No se pudo procesar la solicitud con la IA de Groq. Detalle: ${groqError}`);
    }
  }
}