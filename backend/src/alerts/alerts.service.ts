/**
 * @file alerts.service.ts
 * @route backend/src/alerts
 * @description Servicio de alertas CORREGIDO con mapeo completo de datos
 * @author kevin mariano
 * @version 1.3.0 // VERSIÓN CORREGIDA
 * @since 1.0.0
 * @copyright SENA 2025
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { EventsGateway } from '../events/events.gateway';
import { Sensor, AlertType, AlertSeverity, sensors_type, SystemConfig, User, Prisma, Alert, Role } from '@prisma/client';

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  /**
   * Verifica si un usuario tiene activadas las notificaciones por email.
   */
  private userWantsEmail(user: User): boolean {
    if (!user.settings) return true; 
    try {
      const settings = JSON.parse(user.settings);
      return settings.notifications?.email !== false; 
    } catch (e) {
      this.logger.warn(`Error parseando settings for user ${user.id}, defaulting to send email.`);
      return true; 
    }
  }

  private getAlertTypeAndSeverity(sensorType: sensors_type, isHigh: boolean): { type: AlertType; severity: AlertSeverity } {
    const typeMapping: Partial<Record<sensors_type, { high: AlertType; low: AlertType }>> = {
      TEMPERATURE: { high: 'TEMPERATURE_HIGH', low: 'TEMPERATURE_LOW' },
      PH: { high: 'PH_HIGH', low: 'PH_LOW' },
      OXYGEN: { high: 'OXYGEN_HIGH', low: 'OXYGEN_LOW' },
    };

    const type = typeMapping[sensorType] ? (isHigh ? typeMapping[sensorType].high : typeMapping[sensorType].low) : 'SYSTEM_ERROR';

    let severity: AlertSeverity = 'MEDIUM';
    if (sensorType === 'OXYGEN' && !isHigh) severity = 'CRITICAL';
    if (sensorType === 'PH') severity = 'HIGH';

    return { type, severity };
  }

  private getThresholdsForSensor(
    sensorType: sensors_type, 
    configs: SystemConfig[],
    userThresholds?: any 
  ): { high: number | null; low: number | null } {
    
    const findSystemValue = (key: string) => {
      const config = configs.find(c => c.key === key);
      return config ? parseFloat(config.value) : null;
    };

    const userHigh = userThresholds?.[sensorType.toLowerCase()]?.max;
    const userLow = userThresholds?.[sensorType.toLowerCase()]?.min;

    switch (sensorType) {
      case 'TEMPERATURE':
        return { 
          high: userHigh ?? findSystemValue('maxTemperature'), 
          low: userLow ?? findSystemValue('minTemperature')  
        };
      case 'PH':
        return { 
          high: userHigh ?? findSystemValue('maxPh'), 
          low: userLow ?? findSystemValue('minPh') 
        };
      case 'OXYGEN':
        return { 
          high: userHigh ?? findSystemValue('maxOxygen'), 
          low: userLow ?? findSystemValue('minOxygen') 
        };
      default:
        return { high: null, low: null };
    }
  }

  async checkThresholds(
    sensor: Sensor & { tank: { name: string, user: User } }, 
    value: number
  ) {
    let userSettings: any = {};
    if (sensor.tank.user && sensor.tank.user.settings) {
      try {
        userSettings = JSON.parse(sensor.tank.user.settings);
      } catch (e) {
        this.logger.warn(`Error parseando settings para tanque ${sensor.tank.name}`);
      }
    }

    const systemConfigs = await this.prisma.systemConfig.findMany();
    
    const { high: highThreshold, low: lowThreshold } = this.getThresholdsForSensor(
      sensor.type, 
      systemConfigs, 
      userSettings.thresholds 
    );
    
    let thresholdExceeded: 'high' | 'low' | null = null;
    let threshold: number | null = null;

    if (highThreshold !== null && value > highThreshold) {
      thresholdExceeded = 'high';
      threshold = highThreshold;
    } else if (lowThreshold !== null && value < lowThreshold) {
      thresholdExceeded = 'low';
      threshold = lowThreshold;
    }

    if (thresholdExceeded && threshold !== null) {
      const { type, severity } = this.getAlertTypeAndSeverity(sensor.type, thresholdExceeded === 'high');
      
      const message = `Alerta ${severity}: El sensor '${sensor.name}' del tanque '${sensor.tank.name}' registró un valor de ${value.toFixed(2)}, superando el umbral de ${threshold}.`;

      await this.createAlert({
        sensorId: sensor.id,
        type,
        severity,
        message,
        value,
        threshold,
      }, sensor.tank.user );
    }
  }

  private async createAlert(
    data: {
      sensorId: string;
      type: AlertType;
      severity: AlertSeverity;
      message: string;
      value: number;
      threshold: number;
    },
    affectedUser: User 
  ) {
    // 🔥 CORRECCIÓN CLAVE: Incluir relaciones completas en la creación
    const newAlert = await this.prisma.alert.create({ 
      data,
      include: { 
        sensor: { 
          include: { 
            tank: {
              include: {
                user: true // ✅ Incluir usuario para tener info completa
              }
            } 
          } 
        } 
      }
    });

    this.logger.log(`🚨 Nueva alerta creada: ${newAlert.id} - ${newAlert.type} (${newAlert.severity})`);

    // Obtener admins con sus datos completos
    const admins = await this.prisma.user.findMany({ 
      where: { role: Role.ADMIN },
      select: {
        id: true,
        name: true,
        email: true,
        settings: true,
        role: true
      }
    });

    const recipients = new Map<string, User>();

    // Agregar admins que quieran email
    for (const admin of admins) {
      if (this.userWantsEmail(admin as User)) {
        recipients.set(admin.email, admin as User);
      }
    }

    // Agregar usuario afectado
    if (this.userWantsEmail(affectedUser)) {
      recipients.set(affectedUser.email, affectedUser);
    }

    // 🔥 CORRECCIÓN CLAVE: Broadcast con datos completos y serializables
    const alertPayload = {
      id: newAlert.id,
      type: newAlert.type,
      severity: newAlert.severity,
      message: newAlert.message,
      value: newAlert.value,
      threshold: newAlert.threshold,
      resolved: newAlert.resolved,
      createdAt: newAlert.createdAt.toISOString(), // ✅ Serializar fecha
      resolvedAt: newAlert.resolvedAt?.toISOString() || null,
      sensorId: newAlert.sensorId,
      sensor: {
        id: newAlert.sensor.id,
        name: newAlert.sensor.name,
        type: newAlert.sensor.type,
        hardwareId: newAlert.sensor.hardwareId,
        tank: {
          id: newAlert.sensor.tank.id,
          name: newAlert.sensor.tank.name,
          location: newAlert.sensor.tank.location,
          userId: newAlert.sensor.tank.userId
        }
      }
    };

    // Broadcast a admins
    const adminIds = admins.map(admin => admin.id);
    this.logger.log(`📡 Broadcasting alerta a ${adminIds.length} admins`);
    this.eventsGateway.broadcastNewAlertToAdmins(adminIds, alertPayload);

    // Enviar emails
    if (recipients.size === 0) {
      this.logger.warn(`Alerta ${newAlert.id} creada, pero no se encontraron destinatarios con notificaciones de email activadas.`);
      return;
    }

    this.logger.log(`📧 Enviando notificaciones de alerta ${newAlert.id} a: [${Array.from(recipients.keys()).join(', ')}]`);

    for (const user of recipients.values()) {
      try {
        await this.emailService.sendAlertEmail(user, newAlert as any);
      } catch (error) {
        this.logger.error(`Error al enviar correo de alerta a ${user.email}:`, error);
      }
    }
  }
  
  /**
   * 🔥 CORRECCIÓN CLAVE: Retornar alertas con TODAS las relaciones necesarias
   */
  async getUnresolvedAlerts(userId: string): Promise<Alert[]> {
    this.logger.log(`Obteniendo alertas no resueltas para el usuario: ${userId}`);
    
    const user = await this.prisma.user.findUnique({ 
      where: { id: userId }, 
      select: { role: true } 
    });
    
    if (!user) {
      return [];
    }

    const where: Prisma.AlertWhereInput = {
      resolved: false,
    };
    
    // Si NO es admin, filtrar por tanques del usuario
    if (user.role !== Role.ADMIN) {
      where.sensor = {
        tank: {
          userId: userId,
        },
      };
    }

    // 🔥 CORRECCIÓN CLAVE: Include completo con relaciones
    const alerts = await this.prisma.alert.findMany({
      where: where,
      orderBy: { createdAt: 'desc' },
      include: { 
        sensor: { 
          include: { 
            tank: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true
                  }
                }
              }
            } 
          } 
        } 
      },
      take: 50,
    });

    this.logger.log(`✅ Retornando ${alerts.length} alertas no resueltas`);
    
    return alerts;
  }

  async resolveAlert(alertId: string, resolvedByUserId: string): Promise<Alert> {
    this.logger.log(`Resolviendo alerta ${alertId} por el usuario ${resolvedByUserId}`);
    return this.prisma.alert.update({
      where: { id: alertId, resolved: false },
      data: {
        resolved: true,
        resolvedAt: new Date(),
      },
    });
  }

  async resolveOldAlerts(daysOld: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld); 

    this.logger.log(`Intentando resolver alertas no resueltas creadas antes de: ${cutoffDate.toISOString()}`);

    const result = await this.prisma.alert.updateMany({
      where: {
        resolved: false,
        createdAt: {
          lt: cutoffDate,
        },
      },
      data: {
        resolved: true,
        resolvedAt: new Date(),
      },
    });

    this.logger.log(`Resolución automática completada: ${result.count} alertas marcadas como resueltas.`);
    return result.count;
  }
}