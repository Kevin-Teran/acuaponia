/**
 * @file email.service.ts
 * @route backend/src/email
 * @description Servicio de envío de correos con plantillas HTML profesionales.
 * @author kevin mariano
 * @version 1.3.0 
 * @since 1.0.0
 * @copyright SENA 2025
 */

import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
// V ↓↓↓ Se añade AlertSeverity a la importación ↓↓↓ V
import { User, Alert, Sensor, Tank, AlertType, sensors_type, AlertSeverity } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { Attachment } from 'nodemailer/lib/mailer';

@Injectable()
export class EmailService implements OnModuleInit {
  private transporter: Transporter;
  private readonly logger = new Logger(EmailService.name);

  private logoAttachment: Attachment;
  private logoPath: string;
  private logoCid = 'logo-sena@sena.edu.co'; // ID único para la imagen

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    try {
      this.transporter = nodemailer.createTransport({
        host: this.configService.get('MAIL_HOST'), 
        port: parseInt(this.configService.get('MAIL_PORT', '587')), 
        secure: false, 
        auth: {
          user: this.configService.get('MAIL_USER'), 
          pass: this.configService.get('MAIL_PASS'), 
        },
      });
      this.logger.log('✅ Transportador de Nodemailer inicializado.');

      // Ruta al logo (desde 'dist/email' -> 'dist/assets')
      this.logoPath = path.join(__dirname, '..', 'assets', 'logo-sena.png');

      if (fs.existsSync(this.logoPath)) {
        this.logoAttachment = {
          filename: 'logo-sena.png',
          path: this.logoPath,
          cid: this.logoCid 
        };
        this.logger.log('✅ Logo para emails cargado exitosamente.');
      } else {
        this.logger.warn(`Logo no encontrado en ${this.logoPath}. Los correos no mostrarán el logo.`);
      }

    } catch (error) {
      this.logger.error('❌ Error al inicializar el EmailService:', error);
    }
  }

  async sendReportEmail(userEmail: string, subject: string, htmlContent: string, attachments: { filename: string, content: Buffer, contentType: string }[]): Promise<void> {
    if (!this.transporter) {
      this.logger.error('El transportador de correo no está inicializado.');
      return;
    }
    
    // Corrección para el tipo de adjunto
    const allAttachments: Attachment[] = [...attachments];
    if (this.logoAttachment) {
      allAttachments.push(this.logoAttachment);
    }

    const mailOptions = {
      from: `Reportes Acuaponía <${this.configService.get('MAIL_FROM')}>`,
      to: userEmail,
      subject: subject,
      html: htmlContent, 
      attachments: allAttachments,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`📧 Correo de reporte enviado exitosamente a ${userEmail}`);
    } catch (error) {
      this.logger.error(`🚨 Fallo al enviar correo de reporte a ${userEmail}:`, error);
    }
  }


  async sendAlertEmail(user: User, alert: Alert & { sensor: Sensor & { tank: Tank } }): Promise<void> {
    if (!this.transporter) {
      this.logger.error('El transportador de correo no está inicializado.');
      return;
    }

    // 1. Obtener los detalles, causas y acciones
    const details = this.getAlertDetails(alert.type);

    // 2. Traducir todo
    const translatedAlertType = this.translateAlertType(alert.type);
    const translatedSensorType = this.translateSensorType(alert.sensor.type);
    const translatedSeverity = this.translateSeverity(alert.severity); // <-- NUEVA TRADUCCIÓN

    // 3. Construir el HTML para las listas
    const causesHtml = details.possibleCauses.map(cause => `<li>${cause}</li>`).join('');
    const actionsHtml = details.suggestedActions.map(action => `<li>${action}</li>`).join('');

    // 4. Crear el HTML final reemplazando los valores
    const htmlBody = this.getHtmlTemplate()
      .replace('{{logoCid}}', this.logoCid)
      .replace('{{userName}}', user.name.split(' ')[0])
      .replace('{{alertTitle}}', translatedAlertType)
      .replace('{{severity}}', translatedSeverity) // <-- VALOR TRADUCIDO
      .replace('{{severityColor}}', details.color)
      .replace('{{message}}', alert.message)
      .replace('{{tankName}}', alert.sensor.tank.name)
      .replace('{{sensorName}}', alert.sensor.name)
      .replace('{{parameter}}', translatedSensorType)
      .replace('{{value}}', alert.value.toFixed(2))
      .replace('{{threshold}}', alert.threshold.toFixed(2))
      .replace('{{timestamp}}', alert.createdAt.toLocaleString('es-CO', { timeZone: 'America/Bogota' }))
      .replace('{{possibleCausesHtml}}', causesHtml)
      .replace('{{suggestedActionsHtml}}', actionsHtml);

    const mailOptions = {
      from: `Sistema de Alertas Acuaponía <${this.configService.get('MAIL_FROM')}>`,
      to: user.email,
      subject: `Alerta ${translatedSeverity}: ${translatedAlertType}`, // <-- Asunto con severidad traducida
      text: alert.message, 
      html: htmlBody, 
      attachments: this.logoAttachment ? [this.logoAttachment] : [] 
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`📧 Correo de alerta HTML enviado exitosamente a ${user.email}`);
    } catch (error) {
      this.logger.error(`🚨 Fallo al enviar correo de alerta a ${user.email}:`, error);
    }
  }

  async sendResetPasswordEmail(email: string, url: string): Promise<void> {
    // ... (Esta función no cambia, pero se beneficia de que el logo ya está cargado)
    if (!this.transporter) {
      this.logger.error('El transportador de correo no está inicializado.');
      return;
    }
    const mailOptions = {
      from: this.configService.get('MAIL_FROM'),
      to: email,
      subject: 'Restablecimiento de Contraseña',
      text: `Para restablecer tu contraseña, haz clic en el siguiente enlace: ${url}`,
      html: `<p>Para restablecer tu contraseña, haz clic en el siguiente enlace: <a href="${url}">${url}</a></p>`,
      attachments: this.logoAttachment ? [this.logoAttachment] : [] 
    };
    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`📧 Correo de restablecimiento de contraseña enviado a ${email}`);
    } catch (error) {
      this.logger.error(`🚨 Fallo al enviar correo de restablecimiento a ${email}:`, error);
    }
  }

  // V ↓↓↓ NUEVA FUNCIÓN 'translateSeverity' ↓↓↓ V
  /**
   * Traduce los enums de AlertSeverity a español.
   */
  private translateSeverity(severity: AlertSeverity): string {
    const translations: Record<AlertSeverity, string> = {
      LOW: 'Baja',
      MEDIUM: 'Media',
      HIGH: 'Alta',
      CRITICAL: 'Crítica'
    };
    return translations[severity] || severity;
  }
  // V ↑↑↑ NUEVA FUNCIÓN 'translateSeverity' ↑↑↑ V

  /**
   * Traduce los enums de AlertType a español.
   */
  private translateAlertType(alertType: AlertType): string {
    const translations: Record<AlertType, string> = {
      TEMPERATURE_HIGH: 'Temperatura Alta',
      TEMPERATURE_LOW: 'Temperatura Baja',
      PH_HIGH: 'pH Alto (Alcalino)',
      PH_LOW: 'pH Bajo (Ácido)',
      OXYGEN_HIGH: 'Oxígeno Alto (Sobresaturación)',
      OXYGEN_LOW: 'Oxígeno Bajo',
      SENSOR_OFFLINE: 'Sensor Desconectado',
      SYSTEM_ERROR: 'Error del Sistema'
    };
    return translations[alertType] || alertType;
  }

  /**
   * Traduce los enums de sensors_type a español.
   */
  private translateSensorType(sensorType: sensors_type): string {
    const translations: Record<sensors_type, string> = {
      TEMPERATURE: 'Temperatura',
      PH: 'pH',
      OXYGEN: 'Oxígeno Disuelto'
    };
    return translations[sensorType] || sensorType;
  }

  // V ↓↓↓ 'getAlertDetails' ACTUALIZADA CON IA Y CLIMA ↓↓↓ V
  /**
   * Genera el contenido específico (causas, acciones) para cada tipo de alerta.
   */
  private getAlertDetails(alertType: AlertType): { color: string; possibleCauses: string[]; suggestedActions: string[] } {
    
    let details = {
      color: '#f97316', // Naranja por defecto
      possibleCauses: ['Causa desconocida, contacte a soporte.'],
      suggestedActions: [
        'Revisar el estado del sensor y del tanque manualmente.',
        'Consulte al **Asistente de IA** para un análisis detallado.'
      ]
    };

    switch (alertType) {
      case 'OXYGEN_LOW':
        details = {
          color: '#ef4444', // Rojo (Crítico)
          possibleCauses: [
            'Fallo en el sistema de aireación (bomba, difusores).',
            'Exceso de materia orgánica (sobrealimentación, heces).',
            'Aumento de la temperatura del agua (verificar **API de Clima**).',
            'Alta densidad de peces.'
          ],
          suggestedActions: [
            'Revisar el funcionamiento de la bomba de aire INMEDIATAMENTE.',
            'Medir el oxígeno manualmente para confirmar el valor.',
            'Reducir la alimentación temporalmente.',
            'Consulte a nuestro **Asistente de IA**: "Mi oxígeno está bajo, ¿qué hago?"'
          ]
        };
        break;

      case 'OXYGEN_HIGH':
        details = {
          color: '#eab308', // Amarillo (Medio)
          possibleCauses: [
            'Excesiva aireación para la biomasa actual.',
            'Fotosíntesis intensa de algas (exposición al sol).',
            'Error de calibración del sensor.'
          ],
          suggestedActions: [
            'Verificar el valor con una medición manual.',
            'Reducir la intensidad de la aireación si es posible (sin bajar del mínimo).',
            'Pregunte al **Asistente de IA**: "¿Es malo el oxígeno alto?"'
          ]
        };
        break;

      case 'TEMPERATURE_HIGH':
        details = {
          color: '#ef4444', // Rojo (Alto)
          possibleCauses: [
            'Alta temperatura ambiente (confirmar con **API de Clima**).',
            'Exposición directa al sol (fallo en el sistema de sombreado).',
            'Bajo flujo o recambio de agua.',
            'Bombas de agua sumergidas transfiriendo calor.'
          ],
          suggestedActions: [
            'Verificar el sistema de sombreado (polisombra).',
            'Aumentar la aireación (ayuda a enfriar y compensa la pérdida de O2).',
            'Pregunte al **Asistente de IA**: "Mi temperatura es alta, ¿cómo la bajo?"'
          ]
        };
        break;

      case 'TEMPERATURE_LOW':
        details = {
          color: '#3b82f6', // Azul (Medio)
          possibleCauses: [
            'Baja temperatura ambiente (confirmar con **API de Clima**, especialmente en la noche).',
            'Fallo en el sistema de calefacción (si existe).',
            'Excesivo recambio de agua con agua fría de la fuente.'
          ],
          suggestedActions: [
            'Verificar el sistema de calefacción (si aplica).',
            'Reducir el recambio de agua temporalmente.',
            'Pregunte al **Asistente de IA** por el impacto de la temperatura baja en sus peces.'
          ]
        };
        break;

      case 'PH_LOW':
        details = {
          color: '#eab308', // Amarillo (Alto)
          possibleCauses: [
            'Acumulación de CO2 (mala aireación).',
            'Proceso natural de nitrificación (consume alcalinidad).',
            'Fuente de agua de entrada con pH bajo.'
          ],
          suggestedActions: [
            'Verificar y aumentar la aireación (ayuda a liberar CO2).',
            'Medir la alcalinidad (kH) del agua.',
            'Pregunte al **Asistente de IA**: "Mi pH es bajo, ¿cuánto bicarbonato debo añadir?"'
          ]
        };
        break;
      
      case 'PH_HIGH':
        details = {
          color: '#eab308', // Amarillo (Alto)
          possibleCauses: [
            'Fuente de agua de entrada con pH alto (agua dura).',
            'Fotosíntesis intensa de algas (consume CO2 y eleva el pH).',
            'Materiales en el tanque que liberan minerales (cemento, rocas).'
          ],
          suggestedActions: [
            'Verificar el pH del agua de la fuente.',
            'Si hay algas, controlar la exposición solar.',
            'Pregunte al **Asistente de IA** por métodos seguros para bajar el pH.'
          ]
        };
        break;

      default:
        // Caso por defecto (SENSOR_OFFLINE, SYSTEM_ERROR)
        break;
    }

    return details;
  }
  // V ↑↑↑ 'getAlertDetails' ACTUALIZADA CON IA Y CLIMA ↑↑↑ V


  /**
   * Retorna la plantilla maestra de HTML para los correos de alerta.
   */
  private getHtmlTemplate(): string {
    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
          .container { width: 90%; max-width: 600px; margin: 20px auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; }
          .header { padding: 20px; background-color: #f8f8f8; text-align: center; border-bottom: 1px solid #ddd; }
          .header img { max-width: 150px; }
          .content { padding: 30px; }
          .content h1 { font-size: 24px; color: #333; }
          .content p { font-size: 16px; color: #555; line-height: 1.5; }
          .alert-box { padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .alert-box p { margin: 0; }
          .details-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          .details-table th, .details-table td { padding: 12px; border: 1px solid #eee; text-align: left; }
          .details-table th { background-color: #f9f9f9; width: 40%; }
          .section { margin-top: 30px; }
          .section h2 { font-size: 20px; color: #333; border-bottom: 2px solid #eee; padding-bottom: 5px; }
          .section ul { padding-left: 20px; color: #555; }
          .section li { margin-bottom: 8px; } /* Añadido para mejor espaciado */
          .footer { padding: 30px; background-color: #f8f8f8; text-align: center; font-size: 12px; color: #aaa; border-top: 1px solid #ddd; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="cid:{{logoCid}}" alt="Logo SENA">
          </div>
          <div class="content">
            <h1>Hola {{userName}},</h1>
            <p>Se ha detectado un evento importante en uno de tus tanques. Revisa los detalles a continuación.</p>
            
            <div class="alert-box" style="background-color: {{severityColor}}20; border: 1px solid {{severityColor}};">
              <p style="font-weight: bold; font-size: 18px; color: {{severityColor}};">
                {{alertTitle}} (Severidad: {{severity}})
                </p>
            </div>

            <p style="font-weight: bold;">{{message}}</p>

            <table class="details-table">
              <tr>
                <th>Tanque</th>
                <td>{{tankName}}</td>
              </tr>
              <tr>
                <th>Sensor</th>
                <td>{{sensorName}} ({{parameter}})</td>
              </tr>
              <tr>
                <th>Valor Registrado</th>
                <td style="font-weight: bold; color: {{severityColor}};">{{value}}</td>
              </tr>
              <tr>
                <th>Umbral Superado</th>
                <td>{{threshold}}</td>
              </tr>
              <tr>
                <th>Fecha y Hora</th>
                <td>{{timestamp}}</td>
              </tr>
            </table>

            <div class="section">
              <h2>Posibles Causas</h2>
              <ul>
                {{possibleCausesHtml}}
              </ul>
            </div>

            <div class="section">
              <h2>Acciones Sugeridas</h2>
              <ul>
                {{suggestedActionsHtml}}
              </ul>
            </div>

          </div>
          <div class="footer">
            <p>© 2025 SENA - Todos los derechos reservados</p>
            <p>Desarrollado por Kevin Mariano</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}