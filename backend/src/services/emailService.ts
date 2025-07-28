import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

interface MailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Se corrige el nombre del método de 'createTransporter' a 'createTransport'
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: Number(process.env.SMTP_PORT) === 465, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    this.verifyConnection();
  }

  private verifyConnection(): void {
    this.transporter.verify((error, success) => {
      if (error) {
        logger.error('❌ Error configurando el servicio de email:', error);
      } else {
        logger.info('✅ Servidor de email está listo para enviar correos');
      }
    });
  }

  public async sendMail(options: MailOptions): Promise<void> {
    try {
      const info = await this.transporter.sendMail({
        from: `"SENA Acuaponía" <${process.env.SMTP_USER}>`,
        ...options,
      });
      logger.info(`📧 Email enviado: ${info.messageId}`);
    } catch (error) {
      logger.error('❌ Error enviando email:', error);
      throw new Error('Error al enviar el correo electrónico');
    }
  }
}

export const emailService = new EmailService();