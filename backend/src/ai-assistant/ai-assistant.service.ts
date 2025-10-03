/**
 * @file ai-assistant.service.ts
 * @route backend/src/ai-assistant
 * @description Lógica de negocio para el asistente de IA (ACUAGENIUS), 
 * con filtrado por rol, contexto climático (priorizando settings), configuración de usuario y detección de comandos.
 * @author kevin mariano & Deiner
 * @version 1.1.2 // Versión Estabilizada Final: No JSON Visible al Usuario
 * @since 1.0.0
 * @copyright SENA 2025
 */

import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { sensors_type, Role, User, Prisma } from '@prisma/client'; 
import axios from 'axios';

type CurrentUser = Pick<User, 'id' | 'role'>;

// Interfaces para tipado de configuraciones
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
  private readonly groqApiKey: string;
  private readonly groqApiUrl: string;
  private readonly openWeatherMapApiKey: string;

  constructor(private prisma: PrismaService) {
    this.groqApiKey = process.env.GROQ_API_KEY;
    this.groqApiUrl = process.env.GROQ_API_URL || 'https://api.groq.com/openai/v1/chat/completions';
    this.openWeatherMapApiKey = process.env.OPENWEATHERMAP_API_KEY;
    
    if (!this.groqApiKey || this.groqApiKey.length < 10) { 
      throw new Error('GROQ_API_KEY no está definida o es inválida en el archivo .env');
    }
  }

  /**
   * Obtiene el clima actual de una ubicación específica.
   */
  private async getWeatherData(lat: string | number, lon: string | number) {
    // Coordenadas de respaldo (SENA Centro de la Tecnología del Diseño)
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
      console.error("Error al obtener datos del clima:", error.message);
      return { temperature: 'N/D', description: 'Error al consultar clima', windSpeed: 'N/D' };
    }
  }

  /**
   * Obtiene el contexto del sistema y la CONFIGURACIÓN DEL USUARIO (incluyendo Umbrales y Coordenadas).
   */
  private async getSystemContext(user: CurrentUser) {
    // Filtros de ámbito
    const baseTankWhere: Prisma.TankWhereInput = user.role === Role.USER ? { userId: user.id } : {};
    const activeTankWhere: Prisma.TankWhereInput = { ...baseTankWhere, status: 'ACTIVE' };

    // 1. Obtener la configuración del usuario (Settings)
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
            console.warn("Error al parsear la configuración del usuario:", e);
        }
    }
    
    // 2. Conteo de tanques activos, sensores y alertas
    const activeTanksCount = await this.prisma.tank.count({ where: activeTankWhere });
    const activeSensorsCount = await this.prisma.sensor.count({ where: { tank: activeTankWhere, status: 'ACTIVE' } });
    const alertWhere: Prisma.AlertWhereInput = user.role === Role.USER 
      ? { resolved: false, sensor: { tank: activeTankWhere } } 
      : { resolved: false };
    const unresolvedAlertsCount = await this.prisma.alert.count({ where: alertWhere });
    
    // 3. Función para obtener el historial de sensores
    const getSensorHistory = async (type: sensors_type) => {
      const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
      const readings = await this.prisma.sensorData.findMany({
        where: { type, timestamp: { gte: twelveHoursAgo }, tank: activeTankWhere },
        orderBy: { timestamp: 'desc' },
      });
      
      if (readings.length === 0) return { latest: null, avg: null, min: null, max: null };
      const values = readings.map(r => r.value);
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

    const isGlobalContext = user.role === Role.ADMIN;
    
    return { 
        role: user.role,
        userThresholds: userSettings.thresholds || null, // Se extraen solo los umbrales
        userCoords, // Coordenadas del usuario
        activeTanksCount: isGlobalContext ? await this.prisma.tank.count({ where: { status: 'ACTIVE' } }) : activeTanksCount, 
        activeSensorsCount: isGlobalContext ? await this.prisma.sensor.count({ where: { status: 'ACTIVE' } }) : activeSensorsCount,
        unresolvedAlertsCount: isGlobalContext ? await this.prisma.alert.count({ where: { resolved: false } }) : unresolvedAlertsCount, 
        temperature, ph, oxygen, 
    };
  }

  async getAIResponse(pregunta: string, user: CurrentUser): Promise<string> {
    
    // Ejecución secuencial para resolver dependencia
    const context = await this.getSystemContext(user);
    const weather = await this.getWeatherData(context.userCoords.latitude, context.userCoords.longitude);

    // Formatear umbrales del usuario para el prompt
    const userThresholds = context.userThresholds;
    const thresholdsPrompt = userThresholds
        ? `
      - T° Min/Max: ${userThresholds.temperatureMin?.toFixed(2) ?? 'N/D'}°C / ${userThresholds.temperatureMax?.toFixed(2) ?? 'N/D'}°C
      - pH Min/Max: ${userThresholds.phMin?.toFixed(2) ?? 'N/D'} / ${userThresholds.phMax?.toFixed(2) ?? 'N/D'}
      - O₂ Min/Max: ${userThresholds.oxygenMin?.toFixed(2) ?? 'N/D'} mg/L / ${userThresholds.oxygenMax?.toFixed(2) ?? 'N/D'} mg/L
      (Utiliza estos valores para el análisis).
      `
        : '\n- Umbrales de Usuario: No configurados. Usa rangos estándar acuapónicos.';

    // Construcción dinámica del contexto y reglas de rol en el prompt
    const isUserAdmin = context.role === Role.ADMIN;
    const roleLabel = isUserAdmin ? 'ADMINISTRADOR' : 'USUARIO REGULAR';
    const scope = isUserAdmin ? 'Sistema Global' : 'Su Cuenta';

    const contextDetails = `
      - ROL DEL USUARIO: ${roleLabel}
      - Tanques Activos (${scope}): ${context.activeTanksCount}
      - Sensores Activos (${scope}): ${context.activeSensorsCount}
      - Alertas sin Resolver (${scope}): ${context.unresolvedAlertsCount}
      `;
    
    const prompt = `
      == IDENTIDAD Y PERSONA ==
      Eres "ACUAGENIUS", un asistente de IA del SENA y un analista de datos experto. Tu tono es profesional, preciso y servicial. TUS RESPUESTAS DEBEN SER SIEMPRE CLARAS, CONCISAS Y DIRECTAS.
      
      == CONOCIMIENTO ARQUITECTÓNICO ==
      El sistema usa NestJS, Next.js, MySQL/Prisma y MQTT.

      == INSTRUCCIÓN DE ACCIÓN (COMANDO O RESPUESTA) ==
      1. Si la pregunta del usuario es una SOLICITUD CLARA para **crear un Reporte o una Predicción**, DEBES RESPONDER PRIMERO CON LA INFORMACIÓN VERBAL SOLICITADA (Ej. "Se espera que el pH suba ligeramente...") y luego, como ÚLTIMA LÍNEA, DEBES INCLUIR EL COMANDO JSON DENTRO DE UN COMENTARIO HTML PARA QUE EL SISTEMA LO INTERCEPTE.
      2. En CUALQUIER otro caso (saludo, consulta de estado, umbrales, sistema, etc.), DEBES RESPONDER **SOLO** CON TEXTO INFORMATIVO.

      **FORMATO DE COMANDO REQUERIDO (COMENTARIO HTML, ÚLTIMA LÍNEA):**
      **Instrucción de Lenguaje (Corrección Silenciosa):** Corrige cualquier error de ortografía o gramática internamente. NUNCA MENCIONES LA CORRECCIÓN.

      == CONFIGURACIÓN DE UMBRALES DEL USUARIO ==
      ${thresholdsPrompt}

      == CONTEXTO AMBIENTAL Y HORA ACTUAL ==
      - Fecha y Hora Actual: ${new Date().toLocaleString('es-ES', { timeZone: 'America/Bogota' })}
      - T° Ambiente: ${weather.temperature}
      - Clima: ${weather.description} (Basado en la configuración de la cuenta)

      == CONTEXTO Y DATOS DEL AGUA (ÚLTIMAS 12 HORAS) ==
      ${contextDetails}
      - T° Agua: Actual: ${context.temperature.latest?.toFixed(2) ?? 'N/D'} °C, Promedio: ${context.temperature.avg?.toFixed(2) ?? 'N/D'} °C
      - pH: Actual: ${context.ph.latest?.toFixed(2) ?? 'N/D'}, Promedio: ${context.ph.avg?.toFixed(2) ?? 'N/D'}
      - Oxígeno: Actual: ${context.oxygen.latest?.toFixed(2) ?? 'N/D'} mg/L, Promedio: ${context.oxygen.avg?.toFixed(2) ?? 'N/D'} mg/L
      
      == REGLAS DE INTERACCIÓN ==
      1.  **RESPUESTA DE SALUDO:** Si la pregunta es solo un saludo ("hola", etc.), responde presentándote y preguntando cómo puedes ayudar.
      2.  **PREDICCIÓN/REPORTE:** La respuesta verbal debe ser útil (descripción de la predicción, resumen del reporte) y DEBE IR ANTES del comando.
      3.  **CONCISIÓN:** No uses frases introductorias ni redundancia. Ve al grano.

      == PREGUNTA DEL USUARIO ==
      "${pregunta}"
    `;

    try {
      const response = await axios.post(
        this.groqApiUrl,
        {
          messages: [{ role: 'user', content: prompt }],
          model: 'llama-3.1-8b-instant',
        },
        { headers: { 'Authorization': `Bearer ${this.groqApiKey}`, 'Content-Type': 'application/json' } },
      );
      
      const content = response.data.choices[0]?.message?.content?.trim();
      if (content) {
          // Si el content contiene el comando HTML (), se devuelve.
          // El frontend debe detectar y remover este comentario antes de mostrar al usuario.
          return content;
      }
      return 'No se pudo obtener una respuesta.';
    } catch (error) {
      console.error("Error al contactar la API de Groq:", error.response?.data || error.message);
      const groqError = error.response?.data?.error?.message || 'Error desconocido al contactar la API.';
      throw new InternalServerErrorException(`No se pudo procesar la solicitud con la IA de Groq. Detalle: ${groqError}`);
    }
  }
}