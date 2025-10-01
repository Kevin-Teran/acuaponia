/**
 * @file email.service.ts
 * @route backend/src/email
 * @description 
 * @author kevin mariano
 * @version 1.0.0
 * @since 1.0.0
 * @copyright SENA 2025
 */

import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import { User, Alert } from '@prisma/client';

@Injectable()
export class EmailService implements OnModuleInit {
  private transporter: Transporter;
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Se ejecuta cuando el módulo se inicializa.
   * Crea el transportador de nodemailer con las credenciales del .env.
   */
  onModuleInit() {
    try {
      this.transporter = nodemailer.createTransport({
        // CORRECCIÓN: Usar MAIL_HOST en lugar de SMTP_HOST
        host: this.configService.get('MAIL_HOST'), 
        // CORRECCIÓN: Usar MAIL_PORT en lugar de SMTP_PORT
        port: parseInt(this.configService.get('MAIL_PORT', '587')), 
        secure: false, // TLS en 587
        auth: {
          // CORRECCIÓN: Usar MAIL_USER en lugar de SMTP_USER
          user: this.configService.get('MAIL_USER'), 
          // CORRECCIÓN: Usar MAIL_PASS en lugar de SMTP_PASS
          pass: this.configService.get('MAIL_PASS'), 
        },
      });

      this.logger.log('✅ Transportador de Nodemailer inicializado correctamente.');
    } catch (error) {
      this.logger.error('❌ Error al inicializar el transportador de Nodemailer:', error);
    }
  }

  /**
   * Envía un correo con un reporte adjunto (PDF y Excel).
   * @param userEmail - El correo electrónico del destinatario.
   * @param subject - El asunto del correo.
   * @param htmlContent - El contenido HTML del cuerpo.
   * @param attachments - Array de objetos de adjuntos { filename: string, content: Buffer, contentType: string }.
   */
  async sendReportEmail(userEmail: string, subject: string, htmlContent: string, attachments: { filename: string, content: Buffer, contentType: string }[]): Promise<void> {
    if (!this.transporter) {
      this.logger.error('El transportador de correo no está inicializado. No se puede enviar el email.');
      return;
    }
    
    const mailOptions = {
      from: this.configService.get('MAIL_FROM'),
      to: userEmail,
      subject: subject,
      html: htmlContent, 
      attachments: attachments,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`📧 Correo de reporte enviado exitosamente a ${userEmail}`);
    } catch (error) {
      this.logger.error(`🚨 Fallo al enviar correo de reporte a ${userEmail}:`, error);
    }
  }

  /**
   * Envía un correo de notificación de alerta a un usuario.
   * @param user - El usuario administrador que recibirá el correo.
   * @param alert - El objeto de la alerta generada.
   */
  async sendAlertEmail(user: User, alert: Alert): Promise<void> {
    if (!this.transporter) {
      this.logger.error('El transportador de correo no está inicializado. No se puede enviar el email.');
      return;
    }
    
    const mailOptions = {
      from: this.configService.get('MAIL_FROM'),
      to: user.email,
      subject: `Alerta de Sistema Acuaponía: ${alert.severity}`,
      text: alert.message,
      html: `<p>${alert.message}</p>`, 
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`📧 Correo de alerta enviado exitosamente a ${user.email}`);
    } catch (error) {
      this.logger.error(`🚨 Fallo al enviar correo a ${user.email}:`, error);
    }
  }

  /**
   * Envía un correo de restablecimiento de contraseña.
   * @param email - El correo electrónico del destinatario.
   * @param url - La URL para restablecer la contraseña.
   */
  async sendResetPasswordEmail(email: string, url: string): Promise<void> {
    if (!this.transporter) {
      this.logger.error('El transportador de correo no está inicializado. No se puede enviar el email.');
      return;
    }

    const mailOptions = {
      from: this.configService.get('MAIL_FROM'),
      to: email,
      subject: 'Restablecimiento de Contraseña',
      text: `Para restablecer tu contraseña, haz clic en el siguiente enlace: ${url}`,
      html: `<p>Para restablecer tu contraseña, haz clic en el siguiente enlace: <a href="${url}">${url}</a></p>`,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`📧 Correo de restablecimiento de contraseña enviado a ${email}`);
    } catch (error) {
      this.logger.error(`🚨 Fallo al enviar correo de restablecimiento a ${email}:`, error);
    }
  }
}