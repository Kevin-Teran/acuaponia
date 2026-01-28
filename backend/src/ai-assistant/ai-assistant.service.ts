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
  AWAITING_CONFIRMATION = 'awaiting_confirmation',
  AWAITING_FORM_DATA = 'awaiting_form_data'
}

interface UserContext {
  state: ConversationState;
  pendingAction?: {
    action: string;
    params: any;
  };
  formData?: {
    fields: FormField[];
    action: string;
    defaultParams: any;
  };
  timestamp: Date;
}

interface FormField {
  name: string;
  label: string;
  type: 'text' | 'select';
  defaultValue: string;
  options?: string[];
  required: boolean;
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

  // --- FUNCIONES DE TOLERANCIA A ERRORES ---

  /**
   * Calcula la distancia de Levenshtein entre dos palabras
   * Permite detectar palabras con errores de escritura
   */
  private levenshteinDistance(a: string, b: string): number {
    const matrix = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  /**
   * Detecta si una palabra está en el texto (tolerante a 2 errores de escritura)
   */
  private containsWordFlex(text: string, word: string, tolerance: number = 2): boolean {
    const normalized = text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''); // Eliminar acentos
    
    const normalizedWord = word.toLowerCase();
    
    // Búsqueda exacta
    if (normalized.includes(normalizedWord)) return true;
    
    // Búsqueda con tolerancia a errores
    const words = normalized.split(/\s+/);
    for (const w of words) {
      if (this.levenshteinDistance(w, normalizedWord) <= tolerance) {
        return true;
      }
    }
    
    return false;
  }

  // --- DETECCIÓN DE INTENCIÓN (ULTRA-FLEXIBLE) ---

  private detectIntention(message: string): { action: string; params: any } | null {
    const msg = message.toLowerCase().trim();

    // Detectar acciones principales (tolerante a errores)
    const isCreate = this.containsWordFlex(msg, 'crear') || this.containsWordFlex(msg, 'crea') || 
                     this.containsWordFlex(msg, 'agregar') || this.containsWordFlex(msg, 'agrega') ||
                     this.containsWordFlex(msg, 'anadir') || this.containsWordFlex(msg, 'anade');
    
    const isDelete = this.containsWordFlex(msg, 'eliminar') || this.containsWordFlex(msg, 'elimina') ||
                     this.containsWordFlex(msg, 'borrar') || this.containsWordFlex(msg, 'borra') ||
                     this.containsWordFlex(msg, 'quitar') || this.containsWordFlex(msg, 'quita');
    
    const isEdit = this.containsWordFlex(msg, 'cambiar') || this.containsWordFlex(msg, 'cambia') ||
                   this.containsWordFlex(msg, 'editar') || this.containsWordFlex(msg, 'edita') ||
                   this.containsWordFlex(msg, 'renombrar') || this.containsWordFlex(msg, 'renombra') ||
                   this.containsWordFlex(msg, 'modificar') || this.containsWordFlex(msg, 'modifica');

    const isTank = this.containsWordFlex(msg, 'tanque') || this.containsWordFlex(msg, 'tank');
    const isSensor = this.containsWordFlex(msg, 'sensor') || this.containsWordFlex(msg, 'sensore');
    const isReport = this.containsWordFlex(msg, 'reporte') || this.containsWordFlex(msg, 'informe');
    const isStatus = this.containsWordFlex(msg, 'estado') || this.containsWordFlex(msg, 'resumen') || 
                     this.containsWordFlex(msg, 'info') || this.containsWordFlex(msg, 'status');

    // Detectar tipos de sensor
    const hasTemperature = this.containsWordFlex(msg, 'temperatura') || this.containsWordFlex(msg, 'temp');
    const hasPH = msg.includes('ph');
    const hasOxygen = this.containsWordFlex(msg, 'oxigeno') || this.containsWordFlex(msg, 'oxygen') || msg.includes('o2');

    // Detectar "todos" o "completo"
    const hasAll = this.containsWordFlex(msg, 'todos') || this.containsWordFlex(msg, 'todo') || 
                   this.containsWordFlex(msg, 'completo') || this.containsWordFlex(msg, 'falta');

    // --- ELIMINAR SENSOR (POR NOMBRE/NÚMERO O POR TIPO) ---
    if (isDelete && isSensor) {
      // Buscar si menciona un número de sensor específico (ej: "elimina sensor 003" o "elimina Sensor Temperatura 003")
      const sensorNumberMatch = message.match(/sensor\s*.*?\s*(\d{3,})/i);
      
      if (sensorNumberMatch) {
        return {
          action: 'DELETE_SENSOR_BY_ID',
          params: { sensorNumber: sensorNumberMatch[1] }
        };
      }

      // Si no hay número, eliminar por tipo
      let type = 'TEMPERATURE';
      if (hasPH) type = 'PH';
      else if (hasOxygen) type = 'OXYGEN';
      else if (hasTemperature) type = 'TEMPERATURE';

      const tankNameMatch = msg.match(/(?:del?\s+)?tanque\s+([\w\d\s]+?)(?:\s|$)/i);
      const tankName = tankNameMatch ? tankNameMatch[1].trim() : null;

      return { action: 'DELETE_SENSOR', params: { type, tankName } };
    }

    // --- CREAR MÚLTIPLES SENSORES ---
    if (isCreate && isSensor) {
      const types: sensors_type[] = [];
      if (hasPH) types.push('PH');
      if (hasTemperature) types.push('TEMPERATURE');
      if (hasOxygen) types.push('OXYGEN');
      
      if (hasAll) {
        types.push('TEMPERATURE', 'PH', 'OXYGEN');
      }

      if (types.length === 0) {
        return null; // Sin tipos especificados
      }

      // Buscar tanque especificado
      const tankNameMatch = msg.match(/(?:en\s+)?(?:el\s+)?(?:al\s+)?(?:del?\s+)?tanque\s+([\w\d\s]+?)(?:\s+crear|\s+los|\s+sensor|\s+que|$)/i);
      const tankName = tankNameMatch ? tankNameMatch[1].trim() : null;

      return { 
        action: 'CREATE_SENSORS', 
        params: { 
          types: [...new Set(types)],
          tankName 
        } 
      };
    }

    // --- EDITAR UBICACIÓN DE TANQUE ---
    if (isEdit && (this.containsWordFlex(msg, 'ubicacion') || this.containsWordFlex(msg, 'localizacion') || 
                   this.containsWordFlex(msg, 'lugar') || this.containsWordFlex(msg, 'direccion'))) {
      
      const pattern = /(?:cambiar|cambia|editar|edita|modificar|modifica)\s+(?:la\s+)?(?:ubicacion|localizacion|lugar|direccion)\s+(?:del?\s+)?tanque\s+([\w\d]+)\s+(?:a|por)\s+(.+)/i;
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

    // --- EDITAR NOMBRE DE TANQUE ---
    if (isEdit && isTank && !this.containsWordFlex(msg, 'ubicacion')) {
      // Captura todo después de "a" hasta el final
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

    // --- CREAR TANQUE ---
    if (isCreate && isTank && !isSensor) {
      return { action: 'CREATE_TANK', params: {} };
    }

    // --- ELIMINAR TANQUE ---
    if (isDelete && isTank && !isSensor) {
      const tankNameMatch = msg.match(/tanque\s+([\w\d\s]+?)(?:\s|$)/i);
      if (tankNameMatch) {
        return { action: 'DELETE_TANK', params: { tankName: tankNameMatch[1].trim() } };
      }
    }

    // --- GENERAR REPORTE ---
    if (isReport || (isCreate && this.containsWordFlex(msg, 'reporte'))) {
      let range = 'today';
      if (this.containsWordFlex(msg, 'semana')) range = 'week';
      if (this.containsWordFlex(msg, 'mes')) range = 'month';
      return { action: 'CREATE_REPORT', params: { range } };
    }

    // --- ESTADO DEL SISTEMA ---
    if (isStatus) {
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

    const patterns = [
      /^s[ií]$/,
      /^s[ií]\s+confirmo$/,
      /^ok$/,
      /^dale$/,
      /^claro$/,
      /^confirmo$/,
      /^adelante$/,
      /^acepto$/,
      /s[ií]/,
    ];

    return patterns.some(p => p.test(cleaned));
  }

  private isNegative(message: string): boolean {
    const cleaned = message
      .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
      .replace(/[✅❌✔️✖️☑️]/g, '')
      .replace(/[,;:.!¡¿?]/g, '')
      .toLowerCase()
      .trim();

    // Detectar "no" al inicio o solo
    if (/^no[\s,]|^no$/.test(cleaned)) return true;
    
    const patterns = [/^nop/, /cancela/, /olvida/, /^para$/];
    return patterns.some(p => p.test(cleaned));
  }

  // --- GENERADOR DE FORMULARIOS INTERACTIVOS ---

  private generateForm(action: string, defaultParams: any, context: any): string {
    let form = '📋 **Formulario de Personalización**\n\n';
    
    switch (action) {
      case 'CREATE_TANK':
        const nextTankName = this.calculateNextTankName(context.tanks);
        form += `Complete los datos (o envía "continuar" para usar valores por defecto):\n\n`;
        form += `1️⃣ Nombre: **${nextTankName}**\n`;
        form += `2️⃣ Ubicación: **${this.DEFAULT_LOCATION_NAME}**\n\n`;
        form += `Para cambiar, envía:\n`;
        form += `\`\`\`\n`;
        form += `nombre: Mi Tanque Especial\n`;
        form += `ubicación: Cartagena, Bolívar\n`;
        form += `\`\`\`\n\n`;
        form += `O simplemente escribe "continuar" para crear con los valores mostrados.`;
        break;

      case 'CREATE_SENSORS':
        const typeNames = {
          TEMPERATURE: 'Temperatura',
          PH: 'pH',
          OXYGEN: 'Oxígeno'
        };
        const sensorTypes = defaultParams.types.map(t => typeNames[t]).join(', ');
        form += `Se crearán sensores de: **${sensorTypes}**\n`;
        form += `En el tanque: **${defaultParams.tankName}**\n\n`;
        form += `Los nombres serán generados automáticamente.\n\n`;
        form += `Envía "continuar" para crear con estos valores.`;
        break;

      case 'EDIT_TANK':
        if (defaultParams.newName) {
          form += `Cambiar nombre del tanque "${defaultParams.tankName}"\n\n`;
          form += `Nuevo nombre: **${defaultParams.newName}**\n\n`;
          form += `Para modificar, envía:\n`;
          form += `\`\`\`\n`;
          form += `nombre: Otro Nombre\n`;
          form += `\`\`\`\n\n`;
        } else if (defaultParams.newLocation) {
          form += `Cambiar ubicación del tanque "${defaultParams.tankName}"\n\n`;
          form += `Nueva ubicación: **${defaultParams.newLocation}**\n\n`;
          form += `Para modificar, envía:\n`;
          form += `\`\`\`\n`;
          form += `ubicación: Santa Marta, Magdalena\n`;
          form += `\`\`\`\n\n`;
        }
        form += `O escribe "continuar" para aplicar los cambios.`;
        break;

      default:
        form += `Datos por defecto preparados.\n\n`;
        form += `Envía "continuar" para confirmar.`;
    }

    return form;
  }

  private parseFormResponse(response: string, action: string, defaultParams: any): any {
    const normalized = response.toLowerCase().trim();
    
    // Si dice "continuar", usar valores por defecto
    if (normalized === 'continuar' || normalized === 'ok' || normalized === 'confirmar') {
      return defaultParams;
    }

    // Parsear cambios del usuario
    const params = { ...defaultParams };
    let hasChanges = false;
    
    // Método 1: Parsear líneas con formato "campo: valor"
    const lines = response.split('\n');
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;
      
      // Buscar patrón "nombre:" o "ubicación:"
      if (trimmedLine.match(/^(nombre|ubicacion|ubicación|location):/i)) {
        const colonIndex = trimmedLine.indexOf(':');
        const field = trimmedLine.substring(0, colonIndex).toLowerCase().trim();
        const value = trimmedLine.substring(colonIndex + 1).trim();
        
        if (value) {
          if (field === 'nombre') {
            params.name = value;
            if (action === 'EDIT_TANK') params.newName = value;
            hasChanges = true;
          } else if (field.includes('ubica') || field === 'location') {
            params.location = value;
            if (action === 'EDIT_TANK') params.newLocation = value;
            hasChanges = true;
          }
        }
      }
    }

    // Método 2: Si no hay formato estructurado, intentar detectar cambios en texto libre
    if (!hasChanges && response.length > 10) {
      // Si hay texto significativo sin formato, asumimos que es el nombre
      if (action === 'CREATE_TANK' || action === 'EDIT_TANK') {
        params.name = response.trim();
        if (action === 'EDIT_TANK') params.newName = response.trim();
        hasChanges = true;
      }
    }

    return params;
  }

  // --- MÉTODO PRINCIPAL ---

  async getAIResponse(pregunta: string, user: CurrentUser): Promise<string> {
    try {
      const userContext = this.getUserContext(user.id);
      const context = await this.getSystemContext(user);

      // 🎯 MANEJO DE DATOS DE FORMULARIO
      if (userContext.state === ConversationState.AWAITING_FORM_DATA && userContext.formData) {
        const parsedParams = this.parseFormResponse(
          pregunta, 
          userContext.formData.action, 
          userContext.formData.defaultParams
        );

        // Actualizar estado a confirmación
        this.updateUserContext(user.id, {
          state: ConversationState.AWAITING_CONFIRMATION,
          pendingAction: {
            action: userContext.formData.action,
            params: parsedParams
          },
          formData: undefined
        });

        // Generar mensaje de confirmación
        return this.buildConfirmationMessage(
          { action: userContext.formData.action, params: parsedParams },
          context
        );
      }

      // 🎯 MANEJO DE CONFIRMACIÓN
      if (userContext.state === ConversationState.AWAITING_CONFIRMATION && userContext.pendingAction) {
        
        // Detectar si quiere personalizar
        if (pregunta.toLowerCase().includes('personalizar') || 
            pregunta.toLowerCase().includes('cambiar') ||
            pregunta.toLowerCase().includes('modificar')) {
          
          // Mostrar formulario
          const formMessage = this.generateForm(
            userContext.pendingAction.action,
            userContext.pendingAction.params,
            context
          );

          this.updateUserContext(user.id, {
            state: ConversationState.AWAITING_FORM_DATA,
            formData: {
              fields: [],
              action: userContext.pendingAction.action,
              defaultParams: userContext.pendingAction.params
            }
          });

          return formMessage;
        }
        
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
        return `⚠️ No entendí. Responde "sí" para confirmar, "no" para cancelar, o "personalizar" para modificar los datos.`;
      }

      // 🎯 OPCIONES RÁPIDAS (1-8)
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

Ejemplos:
• "crear sensor ph en tanque 004"
• "cambiar nombre tanque 003 a Principal"
• "eliminar tanque 005"`;
        }
      }

      // 🎯 DETECCIÓN DE INTENCIÓN
      const intention = this.detectIntention(pregunta);

      if (!intention) {
        return `🤔 No entendí tu solicitud. Opciones:

1️⃣ Crear tanque
2️⃣ Editar nombre de tanque
3️⃣ Editar ubicación de tanque
4️⃣ Eliminar tanque
5️⃣ Crear sensor
6️⃣ Eliminar sensor
7️⃣ Generar reporte
8️⃣ Ver estado del sistema

💡 Ejemplos:
• "crear sensor ph y temperatura en tanque 004"
• "elimina sensor 003"
• "cambiar nombre tanque 004 a tanque lol"`;
      }

      // ACCIÓN INMEDIATA: Mostrar estado
      if (intention.action === 'SHOW_STATUS') {
        return this.getSystemStatus(context);
      }

      // ACCIONES QUE REQUIEREN CONFIRMACIÓN O FORMULARIO
      const confirmationMessage = this.buildConfirmationMessageWithForm(intention, context);
      
      this.updateUserContext(user.id, {
        state: ConversationState.AWAITING_CONFIRMATION,
        pendingAction: intention
      });

      return confirmationMessage;

    } catch (error) {
      this.logger.error('Error en getAIResponse:', error);
      return '❌ Error técnico. Intenta nuevamente.';
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
    let status = `📊 Estado del Sistema\n\n`;
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

  private buildConfirmationMessageWithForm(intention: any, context: any): string {
    const baseMessage = this.buildConfirmationMessage(intention, context);
    
    // Agregar opción de personalizar para acciones que lo permitan
    const canCustomize = ['CREATE_TANK', 'CREATE_SENSORS', 'EDIT_TANK'].includes(intention.action);
    
    if (canCustomize) {
      return `${baseMessage}\n\n💡 Responde:\n• "Sí" para continuar\n• "Personalizar" para modificar los datos\n• "No" para cancelar`;
    }
    
    return baseMessage;
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

      case 'DELETE_SENSOR_BY_ID':
        // Buscar el sensor por su número en todos los tanques
        let foundSensor = null;
        let foundTank = null;
        
        for (const tank of context.tanks) {
          for (const sensor of tank.sensors || []) {
            if (sensor.name.includes(intention.params.sensorNumber) || 
                sensor.hardwareId.includes(intention.params.sensorNumber)) {
              foundSensor = sensor;
              foundTank = tank;
              break;
            }
          }
          if (foundSensor) break;
        }

        if (!foundSensor) {
          this.clearUserPendingAction('temp');
          return `❌ No encontré el sensor "${intention.params.sensorNumber}".`;
        }

        intention.params.sensorId = foundSensor.id;
        intention.params.tankName = foundTank.name;
        
        return `Voy a eliminar "${foundSensor.name}" del tanque "${foundTank.name}". ¿Confirmas?`;

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
   * Calcula el siguiente número secuencial para un TIPO específico de sensor
   * Ejemplo: Si hay "Sensor Temperatura 003", el siguiente será 004
   */
  private async calculateNextSensorNumberByType(userId: string, type: sensors_type): Promise<number> {
    try {
      const typeNames = {
        TEMPERATURE: 'Temperatura',
        PH: 'pH',
        OXYGEN: 'Oxígeno'
      };
      const typeName = typeNames[type];

      // Buscar sensores del mismo tipo del usuario
      const sensorsOfType = await this.prisma.sensor.findMany({
        where: {
          tank: {
            userId: userId
          },
          type: type
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      let maxNum = 0;
      const regex = new RegExp(`Sensor\\s+${typeName}\\s+(\\d+)`, 'i');

      sensorsOfType.forEach(s => {
        const match = s.name.match(regex);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      });

      return maxNum + 1;
    } catch (error) {
      this.logger.error('Error calculando número de sensor por tipo:', error);
      return 1;
    }
  }

  /**
   * Genera un Hardware ID único GLOBAL (verifica en TODA la base de datos)
   */
  private async generateUniqueHardwareId(): Promise<string> {
    try {
      let attempts = 0;
      const maxAttempts = 100;

      while (attempts < maxAttempts) {
        // Buscar el último Hardware ID usado globalmente
        const lastSensor = await this.prisma.sensor.findFirst({
          where: {
            hardwareId: {
              startsWith: 'Sensor-'
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        });

        let nextNum = 1;
        if (lastSensor) {
          const match = lastSensor.hardwareId.match(/Sensor-(\d+)/);
          if (match) {
            nextNum = parseInt(match[1], 10) + 1;
          }
        }

        const hardwareId = `Sensor-${nextNum.toString().padStart(3, '0')}`;

        // Verificar que no exista
        const exists = await this.prisma.sensor.findUnique({
          where: { hardwareId }
        });

        if (!exists) {
          return hardwareId;
        }

        attempts++;
      }

      // Fallback: usar timestamp
      return `Sensor-${Date.now().toString().slice(-6)}`;
    } catch (error) {
      this.logger.error('Error generando Hardware ID único:', error);
      return `Sensor-${Date.now().toString().slice(-6)}`;
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
      case 'DELETE_SENSOR_BY_ID':
        return await this.handleDeleteSensorById(action.params, user, userTanks);
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
          // Calcular siguiente número para ESTE TIPO específico
          const nextNum = await this.calculateNextSensorNumberByType(user.id, type);
          const numStr = nextNum.toString().padStart(3, '0');

          // Generar Hardware ID único GLOBAL
          const hardwareId = await this.generateUniqueHardwareId();

          const sensorName = `Sensor ${typeNames[type]} ${numStr}`;
          
          await this.sensorsService.create({
            name: sensorName,
            type: type,
            tankId: tank.id,
            hardwareId: hardwareId,
            calibrationDate: new Date().toISOString()
          });

          createdSensors.push(`${typeNames[type]} ${numStr} (${hardwareId})`);
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

  private async handleDeleteSensorById(params: any, user: CurrentUser, tanks: any[]) {
    try {
      const sensorNumber = params.sensorNumber;
      
      // Buscar el sensor por su número en TODOS los tanques del usuario
      for (const tank of tanks) {
        for (const sensor of tank.sensors || []) {
          if (sensor.name.includes(sensorNumber) || sensor.hardwareId.includes(sensorNumber)) {
            await this.sensorsService.remove(sensor.id, user.id, user.role as Role);
            
            return `✅ Sensor eliminado
📡 ${sensor.name}
📦 Tanque: "${tank.name}"

🔗 [Ver Sensores](/tanks-and-sensors)`;
          }
        }
      }

      return `❌ No encontré ningún sensor con el número "${sensorNumber}".`;
    } catch (error) {
      this.logger.error('Error eliminando sensor por ID:', error);
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