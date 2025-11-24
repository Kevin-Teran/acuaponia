/**
 * @file alerts.service.ts
 * @route backend/src/alerts
 * @description Servicio de alertas CORREGIDO con resolución automática
 * @author kevin mariano
 * @version 2.0.0
 * @since 1.0.0
 * @copyright SENA 2025
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { EventsGateway } from '../events/events.gateway';
import { Sensor, AlertType, AlertSeverity, sensors_type, SystemConfig, User, Prisma, Alert, Role } from '@prisma/client';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  /**
   * 🔥 NUEVO: Tarea programada para resolver alertas antiguas automáticamente
   * Se ejecuta cada 5 minutos
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async autoResolveOldAlerts() {
    this.logger.log('🔄 Ejecutando resolución automática de alertas...');
    
    try {
      const now = new Date();
      
      // 🎯 Alertas CRÍTICAS: resolver después de 60 minutos
      const criticalCutoff = new Date(now.getTime() - 60 * 60 * 1000);
      
      // 🎯 Alertas de ALTA/MEDIA severidad: resolver después de 30 minutos
      const normalCutoff = new Date(now.getTime() - 30 * 60 * 1000);
      
      // Resolver alertas críticas antiguas
      const criticalResolved = await this.prisma.alert.updateMany({
        where: {
          resolved: false,
          severity: AlertSeverity.CRITICAL,
          createdAt: {
            lt: criticalCutoff,
          },
        },
        data: {
          resolved: true,
          resolvedAt: now,
        },
      });

      // Resolver alertas normales antiguas
      const normalResolved = await this.prisma.alert.updateMany({
        where: {
          resolved: false,
          severity: {
            in: [AlertSeverity.HIGH, AlertSeverity.MEDIUM],
          },
          createdAt: {
            lt: normalCutoff,
          },
        },
        data: {
          resolved: true,
          resolvedAt: now,
        },
      });

      const totalResolved = criticalResolved.count + normalResolved.count;

      if (totalResolved > 0) {
        this.logger.log(
          `✅ Resolución automática completada: ${criticalResolved.count} críticas + ${normalResolved.count} normales = ${totalResolved} total`
        );
      }

      return totalResolved;
    } catch (error) {
      this.logger.error('❌ Error en resolución automática de alertas:', error);
      return 0;
    }
  }

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
    // 🔥 CORRECCIÓN: Obtener el sensor con todas las relaciones
    const sensorWithDetails = await this.prisma.sensor.findUnique({
      where: { id: data.sensorId },
      include: {
        tank: {
          include: {
            user: true
          }
        }
      }
    });

    if (!sensorWithDetails) {
      this.logger.error(`❌ Sensor ${data.sensorId} no encontrado`);
      return;
    }

    // 🔥 CORRECCIÓN CRÍTICA: Asignar el userId del propietario del tanque
    const newAlert = await this.prisma.alert.create({ 
      data: {
        ...data,
        userId: sensorWithDetails.tank.userId, // ✅ CORRECCIÓN: Asignar userId correcto
      },
      include: { 
        sensor: { 
          include: { 
            tank: {
              include: {
                user: true
              }
            } 
          } 
        } 
      }
    });

    this.logger.log(`🚨 Nueva alerta creada: ${newAlert.id} - ${newAlert.type} (${newAlert.severity}) para usuario ${newAlert.userId}`);

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

    // Broadcast con datos completos
    const alertPayload = {
      id: newAlert.id,
      type: newAlert.type,
      severity: newAlert.severity,
      message: newAlert.message,
      value: newAlert.value,
      threshold: newAlert.threshold,
      resolved: newAlert.resolved,
      userId: newAlert.userId, // ✅ CORRECCIÓN: Incluir userId
      createdAt: newAlert.createdAt.toISOString(),
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

    // Broadcast solo a admins
    const adminIds = admins.map(admin => admin.id);
    this.logger.log(`📡 Broadcasting alerta a ${adminIds.length} admins`);
    this.eventsGateway.broadcastNewAlertToAdmins(adminIds, alertPayload);

    // 🔥 CORRECCIÓN: Broadcast también al usuario afectado
    this.eventsGateway.broadcastNewAlertToUser(affectedUser.id, alertPayload);

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
   * 🔥 CORRECCIÓN: Filtrar alertas por usuario correctamente
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
    
    // 🔥 CORRECCIÓN: Si NO es admin, filtrar por userId directo
    if (user.role !== Role.ADMIN) {
      where.userId = userId; // ✅ Filtrar por userId del alert
    }

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

    this.logger.log(`✅ Retornando ${alerts.length} alertas no resueltas para usuario ${userId}`);
    
    return alerts;
  }

  /**
   * 🔥 CORRECCIÓN: Verificar permisos al resolver
   */
  async resolveAlert(alertId: string, resolvedByUserId: string): Promise<Alert> {
    this.logger.log(`Resolviendo alerta ${alertId} por el usuario ${resolvedByUserId}`);
    
    // Verificar que el usuario tenga permiso
    const alert = await this.prisma.alert.findUnique({
      where: { id: alertId },
      include: {
        sensor: {
          include: {
            tank: true
          }
        }
      }
    });

    if (!alert) {
      throw new Error('Alerta no encontrada');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: resolvedByUserId }
    });

    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    // 🔥 CORRECCIÓN: Verificar permisos
    if (user.role !== Role.ADMIN && alert.userId !== resolvedByUserId) {
      throw new Error('No tiene permisos para resolver esta alerta');
    }

    return this.prisma.alert.update({
      where: { id: alertId, resolved: false },
      data: {
        resolved: true,
        resolvedAt: new Date(),
      },
    });
  }

  /**
   * Función original para resolver alertas antiguas (mantener por compatibilidad)
   */
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