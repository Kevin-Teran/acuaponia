import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

interface MailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private isVerified: boolean = false;

  constructor() {
    // Verifica si las variables de entorno para SMTP están presentes
    if (!process.env.SMTP_HOST || !process.env.SMTP_PORT || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      logger.warn('⚠️  Credenciales SMTP no definidas en .env. El servicio de email estará deshabilitado.');
      return; // No intenta crear el transporter si faltan credenciales
    }

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: Number(process.env.SMTP_PORT) === 465, // true para 465, false para otros puertos
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    this.verifyConnection();
  }

  /**
   * Verifica la conexión con el servidor SMTP de forma asíncrona sin bloquear el inicio.
   */
  private verifyConnection(): void {
    if (!this.transporter) return;

    this.transporter.verify((error) => {
      if (error) {
        logger.error(`❌ Error al verificar la conexión SMTP: ${error.message}. Los correos no se enviarán.`);
        this.isVerified = false;
      } else {
        logger.info('✅ Servidor de email está listo para enviar correos.');
        this.isVerified = true;
      }
    });
  }

  /**
   * Envía un correo electrónico si el servicio está configurado y verificado.
   * @param {MailOptions} options - Opciones del correo (destinatario, asunto, etc.).
   */
  public async sendMail(options: MailOptions): Promise<void> {
    if (!this.transporter || !this.isVerified) {
      logger.error('Email no enviado: el servicio de correo no está configurado o verificado.');
      return; // Previene el envío si no hay conexión, evitando un crash.
    }

    try {
      const info = await this.transporter.sendMail({
        from: `"SENA Acuaponía" <${process.env.SMTP_USER}>`,
        ...options,
      });
      logger.info(`📧 Email enviado: ${info.messageId}`);
    } catch (error) {
      logger.error('❌ Error enviando email:', error);
      // No relanzamos el error para no detener otros procesos.
    }
  }
}

export const emailService = new EmailService();