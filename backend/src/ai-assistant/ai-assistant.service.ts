/**
 * @file ai-assistant.service.ts
 * @route backend/src/ai-assistant
 * @description Lógica de negocio para el asistente de IA (ACUAGENIUS)
 * POTENCIADO: Análisis Estadístico (Pearson) + Clima + Datos en Tiempo Real.
 * @author kevin mariano & Deiner
 * @version 2.1.0
 * @since 1.0.0
 * @copyright SENA 2025
 */

import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { ReportService } from '../reports/reports.service';
import { AlertsService } from '../alerts/alerts.service';
import { TanksService } from '../tanks/tanks.service';
import { SensorsService } from '../sensors/sensors.service'; 
import { sensors_type, Role, User, Prisma } from '@prisma/client'; 
import axios from 'axios';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';

type CurrentUser = Pick<User, 'id' | 'role'>;

// Interfaces para el manejo de acciones de la IA
interface AiAction {
  action: 'CREATE_REPORT' | 'CREATE_TANK' | 'DELETE_TANK' | 'CREATE_SENSOR' | 'DELETE_SENSOR';
  params?: any;
}

@Injectable()
export class AiAssistantService {
  private readonly logger = new Logger(AiAssistantService.name);
  private readonly groqApiKey: string;
  private readonly groqApiUrl: string;
  private readonly openWeatherMapApiKey: string;

  // Coordenadas fijas para Barranquilla, Atlántico
  private readonly DEFAULT_LAT = 10.9685; 
  private readonly DEFAULT_LON = -74.7813;
  private readonly DEFAULT_LOCATION_NAME = "Barranquilla, Atlántico";

  // 🔥 MEMORIA DE CORTO PLAZO (Para recordar qué se le preguntó al usuario)
  // Key: UserId, Value: Última respuesta del Asistente
  private userContexts = new Map<string, string>();

  constructor(
    private prisma: PrismaService,
    private analyticsService: AnalyticsService,
    private reportService: ReportService,
    private alertsService: AlertsService,
    private tanksService: TanksService,
    private sensorsService: SensorsService
  ) {
    this.groqApiKey = process.env.GROQ_API_KEY;
    this.groqApiUrl = process.env.GROQ_API_URL || 'https://api.groq.com/openai/v1/chat/completions';
    this.openWeatherMapApiKey = process.env.OPENWEATHERMAP_API_KEY;
  }

  // --- MÉTODOS PRIVADOS ---

  private async getWeatherData(location: any) {
     if (!this.openWeatherMapApiKey) {
      return { summary: 'N/D', temperature: 'N/D', locationName: 'Barranquilla (Default)' };
    }
    try {
      let lat = this.DEFAULT_LAT;
      let lon = this.DEFAULT_LON;
      if (location && typeof location === 'string' && location.includes(',')) {
         const parts = location.split(',');
         lat = parseFloat(parts[0]);
         lon = parseFloat(parts[1]);
      } else if (location?.latitude && location?.longitude) {
         lat = Number(location.latitude);
         lon = Number(location.longitude);
      }
      const queryUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${this.openWeatherMapApiKey}&units=metric&lang=es`;
      const response = await axios.get(queryUrl);
      const data = response.data;
      return {
        summary: `${data.weather[0].description}, Viento: ${data.wind.speed} m/s`,
        temperature: data.main.temp.toFixed(1) + ' °C',
        humidity: data.main.humidity + '%',
        feels_like: data.main.feels_like.toFixed(1) + ' °C',
        locationName: data.name
      };
    } catch (error) {
      return { summary: 'Cálido', temperature: '30 °C', locationName: 'Barranquilla' };
    }
  }

  private async getSystemContext(user: CurrentUser) {
    try {
      // 🔒 SEGURIDAD: Filtro estricto por userId
      const userTankWhere: Prisma.TankWhereInput = { userId: user.id };
      
      const activeTanks = await this.prisma.tank.findMany({ 
          where: userTankWhere,
          include: { sensors: true }
      });
      
      const activeAlerts = await this.alertsService.getUnresolvedAlerts(user.id);
      const alertsSummary = activeAlerts.map(a => 
        `- [${a.severity}] ${a.message}`
      ).join('\n');

      return {
        tanks: activeTanks,
        alertsCount: activeAlerts.length,
        alertsText: alertsSummary || "Sin alertas.",
        userLocation: null 
      };
    } catch (error) {
      this.logger.error('Error construyendo contexto:', error);
      throw new InternalServerErrorException('Error cargando datos del sistema.');
    }
  }

  // --- MÉTODO PRINCIPAL ---

  async getAIResponse(pregunta: string, user: CurrentUser): Promise<string> {
    if (!this.groqApiKey) return "Error de configuración interna (API Key).";

    const context = await this.getSystemContext(user);
    const weather = await this.getWeatherData(context.userLocation);

    // Recuperar memoria: ¿Qué le dijimos al usuario la última vez?
    const lastAssistantResponse = this.userContexts.get(user.id) || "Ninguno (Inicio de conversación)";

    // Calcular el siguiente nombre secuencial
    const nextTankName = this.calculateNextTankName(context.tanks);

    const prompt = `
      == ROL ==
      Eres "ACUAGENIUS", el gestor de infraestructura inteligente.
      Ubicación: ${weather.locationName}.
      
      == INFRAESTRUCTURA DEL USUARIO ==
      Tanques:
      ${context.tanks.map(t => `- "${t.name}" (ID: ${t.id}, Sensores: ${t.sensors.map(s => s.type).join(', ') || 'Ninguno'})`).join('\n')}
      
      == MEMORIA DE CONVERSACIÓN (IMPORTANTE) ==
      Lo último que TÚ (Asistente) dijiste fue: "${lastAssistantResponse}"
      El Usuario ahora dice: "${pregunta}"

      == CAPACIDADES ==
      Puedes realizar las siguientes acciones reales:
      1. CREAR TANQUE: Sugerencia automática: "${nextTankName}". Ubicación por defecto: "${this.DEFAULT_LOCATION_NAME}".
      2. ELIMINAR TANQUE.
      3. CREAR SENSOR (Tipos: TEMPERATURE, PH, OXYGEN).
      4. ELIMINAR SENSOR.
      5. CREAR REPORTE.

      == LÓGICA DE CONFIRMACIÓN ==
      1. Si en "Lo último que tú dijiste" estabas pidiendo confirmación (ej: "¿Confirmas?", "¿Seguro?", "Voy a crear...") Y el usuario responde afirmativamente ("Sí", "Confirmo", "Claro", "Ok", "Dale"), ENTONCES DEBES GENERAR EL BLOQUE :::ACTION::: correspondiente a lo que propusiste antes.
      2. Si el usuario pide algo nuevo (ej: "Crea un tanque"), NO generes la acción aún. Responde describiendo lo que harás y pidiendo confirmación.

      == FORMATO DE ACCIÓN (SOLO SI ESTÁ CONFIRMADO) ==
      :::ACTION
      {
        "action": "CREATE_TANK",
        "params": { "name": "default" }
      }
      :::

      == PREGUNTA DEL USUARIO ==
      "${pregunta}"
      
      == TU RESPUESTA ==
      (Si confirmas una acción, genera el bloque :::ACTION::: y un texto amable. Si no, responde conversacionalmente).
    `;

    try {
      const response = await axios.post(
        this.groqApiUrl,
        {
          messages: [{ role: 'user', content: prompt }],
          model: 'llama-3.1-8b-instant',
          temperature: 0.4, // Temperatura baja para que sea obediente con la lógica
        },
        { headers: { 'Authorization': `Bearer ${this.groqApiKey}`, 'Content-Type': 'application/json' } },
      );
      
      const content = response.data.choices[0]?.message?.content?.trim() || 'Sin respuesta.';

      // --- PARSER DE ACCIONES ---
      const actionRegex = /:::ACTION([\s\S]*?):::/;
      const match = content.match(actionRegex);
      
      let finalResponse = content;
      let actionExecuted = false;

      if (match) {
          const jsonStr = match[1].trim();
          // Ocultar JSON al usuario
          finalResponse = content.replace(actionRegex, '').trim(); 

          try {
              const command = JSON.parse(jsonStr) as AiAction;
              
              // Ejecutar en Backend
              const executionResult = await this.executeAction(command, user, context.tanks);
              
              finalResponse += `\n\n${executionResult}`;
              actionExecuted = true;
              
          } catch (e) {
               this.logger.error("Error ejecutando acción IA:", e);
               finalResponse += "\n\n❌ Error técnico procesando la acción.";
          }
      }

      // 🔥 GUARDAR MEMORIA
      // Si ejecutamos una acción, limpiamos la memoria para no repetir la acción si el usuario dice "sí" de nuevo.
      // Si solo estamos charlando o pidiendo confirmación, guardamos el texto.
      if (actionExecuted) {
        this.userContexts.set(user.id, "Acción completada con éxito.");
      } else {
        this.userContexts.set(user.id, finalResponse); // Guardamos lo que le mostramos al usuario
      }

      return finalResponse;

    } catch (error) {
      this.logger.error("Error Groq:", error);
      throw new InternalServerErrorException('ACUAGENIUS no está disponible.');
    }
  }

  /**
   * @description Calcula el siguiente nombre "Tanque 00X"
   */
  private calculateNextTankName(tanks: any[]): string {
    let maxNum = 0;
    const regex = /^Tanque (\d+)$/i;

    tanks.forEach(t => {
      const match = t.name.match(regex);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });

    const nextNum = maxNum + 1;
    return `Tanque ${nextNum.toString().padStart(3, '0')}`;
  }

  private async executeAction(command: AiAction, user: CurrentUser, userTanks: any[]): Promise<string> {
    this.logger.log(`🤖 Acción IA: ${command.action} para usuario ${user.id}`);

    switch (command.action) {
      case 'CREATE_REPORT':
        return await this.handleCreateReport(command.params, user, userTanks);
      
      case 'CREATE_TANK':
        return await this.handleCreateTank(command.params, user, userTanks);

      case 'DELETE_TANK':
        return await this.handleDeleteTank(command.params, user, userTanks);

      case 'CREATE_SENSOR':
        return await this.handleCreateSensor(command.params, user, userTanks);
      
      case 'DELETE_SENSOR':
        return await this.handleDeleteSensor(command.params, user, userTanks);

      default:
        return "Acción no reconocida.";
    }
  }

  // --- MANEJADORES DE ACCIONES ---

  private async handleCreateTank(params: any, user: CurrentUser, existingTanks: any[]) {
    try {
      const fullUser = await this.prisma.user.findUnique({ where: { id: user.id }});
      
      let tankName = params.name;
      if (!tankName || tankName === 'default') {
          tankName = this.calculateNextTankName(existingTanks);
      }
      
      const location = params.location || this.DEFAULT_LOCATION_NAME;

      const newTank = await this.tanksService.create({
        name: tankName,
        location: location,
        userId: user.id
      }, fullUser);

      return `✅ **Éxito:** Tanque creado correctamente.\n\n🔗 **[Ver Tanque Creado](/tanks-and-sensors)**`;
    } catch (error) {
      return `❌ No se pudo crear el tanque. Posiblemente el nombre ya existe.`;
    }
  }

  private async handleDeleteTank(params: any, user: CurrentUser, tanks: any[]) {
    const tankName = params.tankName;
    const tank = tanks.find(t => t.name.toLowerCase() === tankName.toLowerCase());

    if (!tank) return `❌ No encontré ningún tanque llamado "${tankName}".`;

    try {
      const fullUser = await this.prisma.user.findUnique({ where: { id: user.id }});
      await this.tanksService.remove(tank.id, fullUser);
      return `🗑️ **Eliminado:** El tanque "${tankName}" ha sido eliminado.\n\n🔗 **[Ver Mis Tanques](/tanks-and-sensors)**`;
    } catch (error) {
      return `❌ Error al eliminar: ${error.message} (Si tiene sensores, elimínalos primero).`;
    }
  }

  private async handleCreateSensor(params: any, user: CurrentUser, tanks: any[]) {
    const tankName = params.tankName;
    const type = params.type as sensors_type;
    
    if (!['TEMPERATURE', 'PH', 'OXYGEN'].includes(type)) {
        return "❌ Tipo de sensor inválido. Usa: TEMPERATURE, PH u OXYGEN.";
    }

    const tank = tanks.find(t => t.name.toLowerCase() === tankName.toLowerCase());
    if (!tank) return `❌ No encontré el tanque "${tankName}".`;

    try {
        const hardwareId = `ESP32-${type.substring(0,3)}-${Math.floor(Math.random()*10000)}`;
        
        await this.sensorsService.create({
            name: `Sensor ${type} (IA)`,
            type: type,
            tankId: tank.id,
            hardwareId: hardwareId,
            calibrationDate: new Date().toISOString()
        });

        return `✅ **Sensor Creado:** He agregado un sensor de ${type} al tanque "${tankName}".\n\n🔗 **[Ver Sensores](/tanks-and-sensors)**`;
    } catch (error) {
        return `❌ Error creando sensor: ${error.message}`;
    }
  }

  private async handleDeleteSensor(params: any, user: CurrentUser, tanks: any[]) {
     const tankName = params.tankName;
     const type = params.type;

     const tank = tanks.find(t => t.name.toLowerCase() === tankName.toLowerCase());
     if (!tank) return `❌ No encontré el tanque.`;

     const sensor = tank.sensors.find(s => s.type === type);
     if (!sensor) return `❌ El tanque "${tankName}" no tiene un sensor de tipo ${type}.`;

     try {
         await this.sensorsService.remove(sensor.id, user.id, user.role);
         return `🗑️ **Sensor Eliminado:** El sensor de ${type} ha sido removido.\n\n🔗 **[Ver Resultado](/tanks-and-sensors)**`;
     } catch (error) {
         return `❌ Error eliminando sensor: ${error.message}`;
     }
  }

  private async handleCreateReport(params: any, user: CurrentUser, tanks: any[]) {
    if (tanks.length === 0) return "⚠️ No tienes tanques para reportar.";

    let targetTank = tanks[0];
    if (params.tankName && params.tankName !== 'all') {
      const found = tanks.find(t => t.name.toLowerCase().includes(params.tankName.toLowerCase()));
      if (found) targetTank = found;
    }

    const endDate = new Date();
    let startDate = new Date();
    if (params.range === 'week') startDate = subDays(endDate, 7);
    else if (params.range === 'month') startDate = subDays(endDate, 30);
    else startDate = startOfDay(endDate);

    try {
      const report = await this.reportService.createReport({
        reportName: `Reporte IA - ${targetTank.name} (${params.range || 'hoy'})`,
        userId: user.id, 
        tankId: targetTank.id,
        sensorIds: targetTank.sensors.map(s => s.id),
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
        isAutomatic: false
      });

      return `✅ **Reporte Generado:** "${report.title}".\n\n🔗 **[Ir a Reportes](/reports)**`;
    } catch (error) {
      return "❌ Error técnico generando el reporte. Asegúrate de tener datos.";
    }
  }
}