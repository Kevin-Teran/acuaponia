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
import { startOfDay, subDays, format } from 'date-fns';

type CurrentUser = Pick<User, 'id' | 'role'>;

enum ConversationState {
  IDLE = 'idle',
  AWAITING_CONFIRMATION = 'awaiting_confirmation'
}

interface UserContext {
  state: ConversationState;
  pendingAction?: {
    action: string;
    params: any;
  };
  timestamp: Date;
}

@Injectable()
export class AiAssistantService {
  private readonly logger = new Logger(AiAssistantService.name);
  private readonly groqApiKey: string;
  private readonly groqApiUrl: string;
  private readonly openWeatherMapApiKey: string;

  private readonly DEFAULT_LAT = 10.9685;
  private readonly DEFAULT_LON = -74.7813;
  private readonly DEFAULT_LOCATION_NAME = "Barranquilla, Atlántico";

  private userContexts = new Map<string, UserContext>();
  private readonly CONTEXT_TIMEOUT_MS = 15 * 60 * 1000;

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
    setInterval(() => this.cleanupOldContexts(), 5 * 60 * 1000);
  }

  // --- GESTIÓN DE CONTEXTO ---

  private getUserContext(userId: string): UserContext {
    const context = this.userContexts.get(userId);
    if (!context || (Date.now() - context.timestamp.getTime() > this.CONTEXT_TIMEOUT_MS)) {
      const newContext: UserContext = { state: ConversationState.IDLE, timestamp: new Date() };
      this.userContexts.set(userId, newContext);
      return newContext;
    }
    return context;
  }

  private updateUserContext(userId: string, updates: Partial<UserContext>): void {
    const current = this.getUserContext(userId);
    const updated: UserContext = { ...current, ...updates, timestamp: new Date() };
    this.userContexts.set(userId, updated);
  }

  private clearUserPendingAction(userId: string): void {
    this.updateUserContext(userId, { state: ConversationState.IDLE, pendingAction: undefined });
  }

  private cleanupOldContexts(): void {
    const now = Date.now();
    for (const [userId, context] of this.userContexts.entries()) {
      if (now - context.timestamp.getTime() > this.CONTEXT_TIMEOUT_MS) {
        this.userContexts.delete(userId);
      }
    }
  }

  // --- DETECCIÓN DE INTENCIÓN (SIN IA) ---

  private detectIntention(message: string): { action: string; params: any } | null {
    const msg = message.toLowerCase().trim();

    // CREAR MÚLTIPLES SENSORES (ph y temperatura, todos los sensores, etc.)
    if (msg.includes('sensor') && 
        (msg.includes('crear') || msg.includes('crea') || msg.includes('agregar') || msg.includes('agrega'))) {
      
      // Detectar si pide múltiples tipos
      const types: sensors_type[] = [];
      if (msg.includes('ph')) types.push('PH');
      if (msg.includes('temperatura') || msg.includes('temperature')) types.push('TEMPERATURE');
      if (msg.includes('oxígeno') || msg.includes('oxigeno') || msg.includes('oxygen')) types.push('OXYGEN');
      
      // Si dice "todos" o "que le faltan" o "completos", agregar todos los tipos
      if (msg.includes('todos') || msg.includes('todo') || msg.includes('falta') || 
          msg.includes('completo') || msg.includes('completa')) {
        types.push('TEMPERATURE', 'PH', 'OXYGEN');
      }

      // Si no detectó ningún tipo específico
      if (types.length === 0) {
        return null; // Mostrará mensaje de ayuda
      }

      // Buscar tanque especificado
      const tankNameMatch = msg.match(/(?:en\s+)?(?:el\s+)?(?:al\s+)?(?:del?\s+)?tanque\s+([\w\d\s]+?)(?:\s+crear|\s+los|\s+sensor|$)/i);
      const tankName = tankNameMatch ? tankNameMatch[1].trim() : null;

      return { 
        action: 'CREATE_SENSORS', 
        params: { 
          types: [...new Set(types)], // Eliminar duplicados
          tankName 
        } 
      };
    }

    // EDITAR UBICACIÓN DE TANQUE
    if ((msg.includes('cambiar') || msg.includes('cambia') || msg.includes('editar') || 
         msg.includes('edita') || msg.includes('modificar') || msg.includes('modifica')) && 
        (msg.includes('ubicación') || msg.includes('ubicacion') || msg.includes('localización') || 
         msg.includes('localizacion') || msg.includes('lugar') || msg.includes('dirección') || msg.includes('direccion'))) {
      
      // "cambiar ubicación tanque 005 a Cartagena, Bolívar"
      const pattern = /(?:cambiar|cambia|editar|edita|modificar|modifica)\s+(?:la\s+)?(?:ubicación|ubicacion|localización|localizacion|lugar|dirección|direccion)\s+(?:del?\s+)?tanque\s+([\w\d]+)\s+(?:a|por)\s+(.+)/i;
      const match = message.match(pattern);
      
      if (match) {
        return { 
          action: 'EDIT_TANK', 
          params: { 
            tankName: match[1].trim(), 
            newLocation: match[2].trim() 
          } 
        };
      }
    }

    // EDITAR NOMBRE DE TANQUE - MEJORADO: captura hasta el final o hasta palabras clave
    if ((msg.includes('cambiar') || msg.includes('cambia') || msg.includes('editar') || 
         msg.includes('edita') || msg.includes('renombrar') || msg.includes('renombra') || 
         msg.includes('modificar') || msg.includes('modifica')) && 
        (msg.includes('nombre') || msg.includes('tanque')) &&
        !(msg.includes('ubicación') || msg.includes('ubicacion') || msg.includes('localización'))) {
      
      // Mejorado: captura todo después de "a" hasta el final de la línea
      const patterns = [
        /(?:cambiar|cambia|editar|edita|renombrar|renombra|modificar|modifica)\s+(?:el\s+)?(?:nombre\s+)?(?:de\s+)?(?:del?\s+)?tanque\s+([\w\d]+)\s+(?:a|por)\s+(.+?)$/i,
        /tanque\s+([\w\d]+)\s+(?:a|por)\s+(.+?)$/i
      ];
      
      for (const pattern of patterns) {
        const match = message.match(pattern);
        if (match) {
          return { 
            action: 'EDIT_TANK', 
            params: { 
              tankName: match[1].trim(), 
              newName: match[2].trim() 
            } 
          };
        }
      }
    }

    // CREAR TANQUE (solo si NO menciona sensor)
    if ((msg.includes('crear') || msg.includes('crea')) && msg.includes('tanque') && !msg.includes('sensor')) {
      return { action: 'CREATE_TANK', params: {} };
    }

    // ELIMINAR TANQUE
    if ((msg.includes('eliminar') || msg.includes('elimina') || msg.includes('borrar') || 
         msg.includes('borra') || msg.includes('quitar') || msg.includes('quita')) && 
        msg.includes('tanque') && !msg.includes('sensor')) {
      const tankNameMatch = msg.match(/tanque\s+([\w\d\s]+?)(?:\s|$)/i);
      if (tankNameMatch) {
        return { action: 'DELETE_TANK', params: { tankName: tankNameMatch[1].trim() } };
      }
    }

    // ELIMINAR SENSOR
    if ((msg.includes('eliminar') || msg.includes('elimina') || msg.includes('borrar') || 
         msg.includes('borra') || msg.includes('quitar') || msg.includes('quita')) && 
        msg.includes('sensor')) {
      let type = 'TEMPERATURE';
      if (msg.includes('ph')) type = 'PH';
      if (msg.includes('oxígeno') || msg.includes('oxigeno') || msg.includes('oxygen')) type = 'OXYGEN';
      if (msg.includes('temperatura') || msg.includes('temperature')) type = 'TEMPERATURE';

      const tankNameMatch = msg.match(/(?:del?\s+)?tanque\s+([\w\d]+)/i);
      const tankName = tankNameMatch ? tankNameMatch[1].trim() : null;

      return { action: 'DELETE_SENSOR', params: { type, tankName } };
    }

    // GENERAR REPORTE
    if ((msg.includes('generar') || msg.includes('genera') || msg.includes('crear') || 
         msg.includes('crea') || msg.includes('hacer') || msg.includes('haz')) && 
        msg.includes('reporte')) {
      let range = 'today';
      if (msg.includes('semana')) range = 'week';
      if (msg.includes('mes')) range = 'month';

      return { action: 'CREATE_REPORT', params: { range } };
    }

    // ESTADO DEL SISTEMA
    if (msg.includes('estado') || msg.includes('resumen') || msg.includes('información') || 
        msg.includes('info') || msg.includes('status')) {
      return { action: 'SHOW_STATUS', params: {} };
    }

    return null;
  }

  private isAffirmative(message: string): boolean {
    const cleaned = message
      .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
      .replace(/[✅❌✔️✖️☑️]/g, '')
      .replace(/[,;:.!¡¿?]/g, '')
      .toLowerCase()
      .trim();

    return /^s[ií]$|^ok$|^dale$|^claro$|^confirmo$|^acepto$/.test(cleaned) || cleaned.includes('sí');
  }

  private isNegative(message: string): boolean {
    const cleaned = message
      .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
      .replace(/[✅❌✔️✖️☑️]/g, '')
      .toLowerCase()
      .trim();

    return /^no$|^cancela|^olvida/.test(cleaned);
  }

  // --- MÉTODO PRINCIPAL ---

  async getAIResponse(pregunta: string, user: CurrentUser): Promise<string> {
    try {
      const userContext = this.getUserContext(user.id);
      const context = await this.getSystemContext(user);

      // 🎯 MANEJO DE CONFIRMACIÓN
      if (userContext.state === ConversationState.AWAITING_CONFIRMATION && userContext.pendingAction) {
        
        if (this.isAffirmative(pregunta)) {
          try {
            const result = await this.executeAction(userContext.pendingAction, user, context.tanks);
            this.clearUserPendingAction(user.id);
            return result;
          } catch (error) {
            this.clearUserPendingAction(user.id);
            return `❌ Error: ${error.message}`;
          }
        }
        
        if (this.isNegative(pregunta)) {
          this.clearUserPendingAction(user.id);
          return `❌ Operación cancelada. ¿En qué más puedo ayudarte?`;
        }

        this.clearUserPendingAction(user.id);
        return `⚠️ No entendí. Di "sí" para confirmar o "no" para cancelar.`;
      }

      // 🎯 DETECCIÓN DE OPCIONES RÁPIDAS (1-8)
      const quickOption = pregunta.trim();
      if (/^[1-8]$/.test(quickOption)) {
        const optionMap = {
          '1': 'crear tanque',
          '2': 'cambiar nombre tanque',
          '3': 'cambiar ubicación tanque',
          '4': 'eliminar tanque',
          '5': 'crear sensor',
          '6': 'eliminar sensor',
          '7': 'generar reporte',
          '8': 'estado del sistema'
        };
        
        const command = optionMap[quickOption];
        if (command === 'estado del sistema') {
          return this.getSystemStatus(context);
        } else {
          return `Para ${command}, especifica los detalles.

Ejemplo:
• "crear sensor ph en tanque 004"
• "cambiar nombre tanque 003 a Principal"
• "eliminar tanque 005"`;
        }
      }

      // 🎯 DETECCIÓN DE INTENCIÓN (SIN USAR IA)
      const intention = this.detectIntention(pregunta);

      if (!intention) {
        return `🤔 No entendí tu solicitud. Aquí tienes opciones:

1️⃣ Crear tanque
2️⃣ Editar nombre de tanque
3️⃣ Editar ubicación de tanque
4️⃣ Eliminar tanque
5️⃣ Crear sensor (especifica tanque y tipo)
6️⃣ Eliminar sensor
7️⃣ Generar reporte
8️⃣ Ver estado del sistema

💡 Ejemplos:
• "crear tanque"
• "cambiar nombre tanque 00X a tanque 00Y"
• "crear sensor ph y temperatura en tanque 00X"
• "crear todos los sensores en tanque 00X"
• "eliminar tanque 00X"

Escribe el número o el comando completo.`;
      }

      // ACCIÓN INMEDIATA: Mostrar estado
      if (intention.action === 'SHOW_STATUS') {
        return this.getSystemStatus(context);
      }

      // ACCIONES QUE REQUIEREN CONFIRMACIÓN
      const confirmationMessage = this.buildConfirmationMessage(intention, context);
      
      this.updateUserContext(user.id, {
        state: ConversationState.AWAITING_CONFIRMATION,
        pendingAction: intention
      });

      return confirmationMessage;

    } catch (error) {
      this.logger.error('Error en getAIResponse:', error);
      return '❌ Error técnico. Por favor intenta nuevamente.';
    }
  }

  private async getSystemContext(user: CurrentUser) {
    try {
      const activeTanks = await this.prisma.tank.findMany({
        where: { userId: user.id },
        include: { sensors: true }
      });
      
      const activeAlerts = await this.alertsService.getUnresolvedAlerts(user.id);
      const reportsCount = await this.prisma.report.count({ where: { userId: user.id } });

      return { tanks: activeTanks, alertsCount: activeAlerts.length, reportsCount };
    } catch (error) {
      this.logger.error('Error construyendo contexto:', error);
      return { tanks: [], alertsCount: 0, reportsCount: 0 };
    }
  }

  private getSystemStatus(context: any): string {
    let status = `📊 **Estado del Sistema**\n\n`;
    status += `📦 Tanques: ${context.tanks.length}\n`;
    
    if (context.tanks.length > 0) {
      context.tanks.forEach((tank, idx) => {
        status += `   ${idx + 1}. "${tank.name}" - ${tank.sensors?.length || 0} sensores\n`;
      });
    }
    
    status += `\n🚨 Alertas activas: ${context.alertsCount}`;
    status += `\n📊 Reportes generados: ${context.reportsCount}`;
    
    return status;
  }

  private buildConfirmationMessage(intention: any, context: any): string {
    const nextTankName = this.calculateNextTankName(context.tanks);

    switch (intention.action) {
      case 'CREATE_TANK':
        return `Voy a crear el tanque "${nextTankName}" en ${this.DEFAULT_LOCATION_NAME}. ¿Confirmas?`;

      case 'EDIT_TANK':
        const tankToEdit = context.tanks.find(t => 
          t.name.toLowerCase().includes(intention.params.tankName?.toLowerCase()) ||
          t.name.toLowerCase().replace(/\s+/g, '') === intention.params.tankName?.toLowerCase().replace(/\s+/g, '')
        );
        if (!tankToEdit) {
          this.clearUserPendingAction('temp');
          return `❌ No encontré ningún tanque llamado "${intention.params.tankName}".`;
        }
        intention.params.tankId = tankToEdit.id;
        intention.params.oldName = tankToEdit.name;
        
        if (intention.params.newLocation) {
          return `Voy a cambiar la ubicación de "${tankToEdit.name}" a "${intention.params.newLocation}". ¿Confirmas?`;
        } else {
          return `Voy a cambiar el nombre de "${tankToEdit.name}" a "${intention.params.newName}". ¿Confirmas?`;
        }

      case 'DELETE_TANK':
        const tankToDelete = context.tanks.find(t => 
          t.name.toLowerCase().includes(intention.params.tankName?.toLowerCase())
        );
        if (!tankToDelete) {
          this.clearUserPendingAction('temp');
          return `❌ No encontré ningún tanque con ese nombre.`;
        }
        if (tankToDelete.sensors?.length > 0) {
          this.clearUserPendingAction('temp');
          return `⚠️ El tanque "${tankToDelete.name}" tiene ${tankToDelete.sensors.length} sensores. Elimínalos primero.`;
        }
        intention.params.tankId = tankToDelete.id;
        return `Voy a eliminar el tanque "${tankToDelete.name}". ¿Confirmas?`;

      case 'CREATE_SENSORS':
        // VALIDACIÓN: Tanque es obligatorio
        if (!intention.params.tankName) {
          this.clearUserPendingAction('temp');
          return `⚠️ Debes especificar el tanque

Ejemplo: "crear sensores en tanque 004"

Tus tanques:
${context.tanks.map((t, i) => `${i + 1}. ${t.name}`).join('\n') || 'Ninguno'}`;
        }
        
        const multiTank = context.tanks.find(t => 
          t.name.toLowerCase().includes(intention.params.tankName?.toLowerCase())
        );
        
        if (!multiTank) {
          this.clearUserPendingAction('temp');
          return `❌ No encontré el tanque "${intention.params.tankName}".`;
        }
        
        // Filtrar sensores que ya existen
        const existingTypes = multiTank.sensors?.map(s => s.type) || [];
        const typesToCreate = intention.params.types.filter(t => !existingTypes.includes(t));
        
        if (typesToCreate.length === 0) {
          this.clearUserPendingAction('temp');
          return `✅ El tanque "${multiTank.name}" ya tiene todos los sensores solicitados.`;
        }
        
        intention.params.tankId = multiTank.id;
        intention.params.tankName = multiTank.name;
        intention.params.types = typesToCreate;
        
        const typeNames = {
          TEMPERATURE: 'Temperatura',
          PH: 'pH',
          OXYGEN: 'Oxígeno'
        };
        
        const sensorsList = typesToCreate.map(t => typeNames[t]).join(', ');
        return `Voy a crear ${typesToCreate.length} sensor(es) en "${multiTank.name}": ${sensorsList}. ¿Confirmas?`;

      case 'DELETE_SENSOR':
        if (!intention.params.tankName && context.tanks.length > 0) {
          intention.params.tankName = context.tanks[0].name;
        }
        const sensorTank = context.tanks.find(t => 
          t.name.toLowerCase().includes(intention.params.tankName?.toLowerCase())
        );
        if (!sensorTank) {
          this.clearUserPendingAction('temp');
          return `❌ No encontré el tanque.`;
        }
        const sensorToDelete = sensorTank.sensors?.find(s => s.type === intention.params.type);
        if (!sensorToDelete) {
          this.clearUserPendingAction('temp');
          return `❌ El tanque "${sensorTank.name}" no tiene sensor de ${intention.params.type}.`;
        }
        intention.params.tankId = sensorTank.id;
        intention.params.tankName = sensorTank.name;
        return `Voy a eliminar el sensor de ${intention.params.type} del tanque "${sensorTank.name}". ¿Confirmas?`;

      case 'CREATE_REPORT':
        if (context.tanks.length === 0) {
          this.clearUserPendingAction('temp');
          return `⚠️ No tienes tanques para generar reportes.`;
        }
        const rangeText = intention.params.range === 'week' ? 'última semana' : 
                         intention.params.range === 'month' ? 'último mes' : 'hoy';
        return `Voy a generar un reporte de ${rangeText}. ¿Confirmas?`;

      default:
        return '⚠️ Acción no reconocida.';
    }
  }

  private calculateNextTankName(tanks: any[]): string {
    let maxNum = 0;
    const regex = /^Tanque\s+(\d+)$/i;

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

  /**
   * Calcula el siguiente número secuencial de sensor (global, no por tanque)
   * Ejemplo: Sensor-001, Sensor-002, Sensor-003...
   */
  private async calculateNextSensorNumber(userId: string): Promise<number> {
    try {
      // Obtener TODOS los sensores del usuario
      const allSensors = await this.prisma.sensor.findMany({
        where: {
          tank: {
            userId: userId
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      let maxNum = 0;
      const regex = /Sensor[-\s](\d+)/i;

      allSensors.forEach(s => {
        // Buscar en nombre
        const nameMatch = s.name.match(regex);
        if (nameMatch) {
          const num = parseInt(nameMatch[1], 10);
          if (num > maxNum) maxNum = num;
        }

        // Buscar en hardwareId
        const hwMatch = s.hardwareId.match(regex);
        if (hwMatch) {
          const num = parseInt(hwMatch[1], 10);
          if (num > maxNum) maxNum = num;
        }
      });

      return maxNum + 1;
    } catch (error) {
      this.logger.error('Error calculando número de sensor:', error);
      return 1; // Por defecto empezar en 1
    }
  }

  private async executeAction(action: any, user: CurrentUser, userTanks: any[]): Promise<string> {
    this.logger.log(`🤖 Ejecutando: ${action.action} para usuario ${user.id}`);

    switch (action.action) {
      case 'CREATE_TANK':
        return await this.handleCreateTank(action.params, user, userTanks);
      case 'EDIT_TANK':
        return await this.handleEditTank(action.params, user, userTanks);
      case 'DELETE_TANK':
        return await this.handleDeleteTank(action.params, user, userTanks);
      case 'CREATE_SENSORS':
        return await this.handleCreateMultipleSensors(action.params, user, userTanks);
      case 'DELETE_SENSOR':
        return await this.handleDeleteSensor(action.params, user, userTanks);
      case 'CREATE_REPORT':
        return await this.handleCreateReport(action.params, user, userTanks);
      default:
        return "❌ Acción no reconocida.";
    }
  }

  // --- MANEJADORES ---

  private async handleCreateTank(params: any, user: CurrentUser, existingTanks: any[]) {
    try {
      const fullUser = await this.prisma.user.findUnique({ where: { id: user.id }});
      if (!fullUser) throw new Error('Usuario no encontrado');

      const tankName = this.calculateNextTankName(existingTanks);
      const location = this.DEFAULT_LOCATION_NAME;

      const newTank = await this.tanksService.create({
        name: tankName,
        location: location,
        userId: user.id
      }, fullUser);

      return `✅ Tanque creado: "${newTank.name}"
📍 ${newTank.location}

🔗 [Ver Tanques](/tanks-and-sensors)`;

    } catch (error) {
      this.logger.error('Error creando tanque:', error);
      return `❌ Error: ${error.message}`;
    }
  }

  private async handleEditTank(params: any, user: CurrentUser, tanks: any[]) {
    try {
      const fullUser = await this.prisma.user.findUnique({ where: { id: user.id }});
      if (!fullUser) throw new Error('Usuario no encontrado');

      const tank = tanks.find(t => 
        t.name.toLowerCase().includes(params.tankName?.toLowerCase()) ||
        t.id === params.tankId
      );

      if (!tank) return `❌ Tanque no encontrado.`;

      const updateData: any = {};
      if (params.newName) updateData.name = params.newName;
      if (params.newLocation) updateData.location = params.newLocation;

      if (Object.keys(updateData).length === 0) return `⚠️ Sin cambios especificados.`;

      await this.tanksService.update(tank.id, updateData, fullUser);

      if (params.newLocation) {
        return `✅ Tanque actualizado
📍 Nueva ubicación: "${params.newLocation}"

🔗 [Ver Tanques](/tanks-and-sensors)`;
      } else {
        return `✅ Tanque actualizado
🔄 "${params.oldName || tank.name}" → "${params.newName}"

🔗 [Ver Tanques](/tanks-and-sensors)`;
      }

    } catch (error) {
      this.logger.error('Error editando tanque:', error);
      return `❌ Error: ${error.message}`;
    }
  }

  private async handleCreateMultipleSensors(params: any, user: CurrentUser, tanks: any[]) {
    try {
      const tank = tanks.find(t => t.name.toLowerCase().includes(params.tankName?.toLowerCase()));
      if (!tank) return `❌ Tanque no encontrado.`;

      const typeNames = {
        TEMPERATURE: 'Temperatura',
        PH: 'pH',
        OXYGEN: 'Oxígeno'
      };

      const createdSensors: string[] = [];
      const errors: string[] = [];

      for (const type of params.types) {
        try {
          // Calcular siguiente número secuencial
          const nextNum = await this.calculateNextSensorNumber(user.id);
          const numStr = nextNum.toString().padStart(3, '0');

          const sensorName = `Sensor ${typeNames[type]} ${numStr}`;
          const hardwareId = `Sensor-${numStr}`;
          
          await this.sensorsService.create({
            name: sensorName,
            type: type,
            tankId: tank.id,
            hardwareId: hardwareId,
            calibrationDate: new Date().toISOString()
          });

          createdSensors.push(`${typeNames[type]} (${hardwareId})`);
        } catch (error) {
          errors.push(`${typeNames[type]}: ${error.message}`);
        }
      }

      let response = '';
      
      if (createdSensors.length > 0) {
        response += `✅ ${createdSensors.length} sensor(es) creado(s):\n`;
        createdSensors.forEach(s => response += `   📡 ${s}\n`);
        response += `\n📦 Tanque: "${tank.name}"\n`;
      }

      if (errors.length > 0) {
        response += `\n⚠️ Errores:\n`;
        errors.forEach(e => response += `   • ${e}\n`);
      }

      response += `\n🔗 [Ver Sensores](/tanks-and-sensors)`;
      
      return response;
    } catch (error) {
      this.logger.error('Error creando sensores múltiples:', error);
      return `❌ Error: ${error.message}`;
    }
  }

  private async handleDeleteTank(params: any, user: CurrentUser, tanks: any[]) {
    try {
      const tank = tanks.find(t => t.name.toLowerCase().includes(params.tankName?.toLowerCase()));
      if (!tank) return `❌ Tanque no encontrado.`;

      const fullUser = await this.prisma.user.findUnique({ where: { id: user.id }});
      await this.tanksService.remove(tank.id, fullUser);

      return `✅ Tanque "${tank.name}" eliminado
🔗 [Ver Tanques](/tanks-and-sensors)`;
    } catch (error) {
      return `❌ Error: ${error.message}`;
    }
  }

  private async handleCreateSensor(params: any, user: CurrentUser, tanks: any[]) {
    try {
      const tank = tanks.find(t => t.name.toLowerCase().includes(params.tankName?.toLowerCase()));
      if (!tank) return `❌ Tanque no encontrado.`;

      const type = params.type as sensors_type;
      const existingSensor = tank.sensors?.find(s => s.type === type);
      if (existingSensor) return `⚠️ Ya existe un sensor de ${type} en este tanque.`;

      // Calcular siguiente número secuencial
      const nextNum = await this.calculateNextSensorNumber(user.id);
      const numStr = nextNum.toString().padStart(3, '0');

      // Nombres de tipos en español
      const typeNames = {
        TEMPERATURE: 'Temperatura',
        PH: 'pH',
        OXYGEN: 'Oxígeno'
      };

      // Generar nombre y hardware ID secuenciales
      const sensorName = `Sensor ${typeNames[type]} ${numStr}`;
      const hardwareId = `Sensor-${numStr}`;
      
      await this.sensorsService.create({
        name: sensorName,
        type: type,
        tankId: tank.id,
        hardwareId: hardwareId,
        calibrationDate: new Date().toISOString()
      });

      return `✅ Sensor creado
📡 ${sensorName}
🔧 ID: ${hardwareId}
📦 Tanque: "${tank.name}"

🔗 [Ver Sensores](/tanks-and-sensors)`;
    } catch (error) {
      this.logger.error('Error creando sensor:', error);
      return `❌ Error: ${error.message}`;
    }
  }

  private async handleDeleteSensor(params: any, user: CurrentUser, tanks: any[]) {
    try {
      const tank = tanks.find(t => t.name.toLowerCase().includes(params.tankName?.toLowerCase()));
      if (!tank) return `❌ Tanque no encontrado.`;

      const sensor = tank.sensors?.find(s => s.type === params.type);
      if (!sensor) return `❌ Sensor no encontrado.`;

      await this.sensorsService.remove(sensor.id, user.id, user.role as Role);

      return `✅ Sensor ${params.type} eliminado
🔗 [Ver Sensores](/tanks-and-sensors)`;
    } catch (error) {
      return `❌ Error: ${error.message}`;
    }
  }

  private async handleCreateReport(params: any, user: CurrentUser, tanks: any[]) {
    try {
      if (tanks.length === 0) return `⚠️ No tienes tanques.`;

      const targetTank = tanks[0];
      if (targetTank.sensors?.length === 0) return `⚠️ El tanque no tiene sensores.`;

      const endDate = new Date();
      let startDate = startOfDay(endDate);
      let rangeText = 'hoy';

      if (params.range === 'week') {
        startDate = subDays(endDate, 7);
        rangeText = 'última semana';
      } else if (params.range === 'month') {
        startDate = subDays(endDate, 30);
        rangeText = 'último mes';
      }

      const report = await this.reportService.createReport({
        reportName: `Reporte IA - ${rangeText}`,
        userId: user.id,
        tankId: targetTank.id,
        sensorIds: targetTank.sensors.map(s => s.id),
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
        isAutomatic: false
      });

      return `✅ Reporte generado
📅 ${rangeText}
🔗 [Ver Reporte](/reports)`;
    } catch (error) {
      return `❌ Error: ${error.message}`;
    }
  }
}