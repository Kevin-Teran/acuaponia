import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    try {
      this.transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      logger.info('✅ Servicio de email inicializado');
    } catch (error) {
      logger.error('❌ Error inicializando servicio de email:', error);
    }
  }

  async sendEmail(to: string, subject: string, html: string) {
    if (!this.transporter) {
      logger.error('❌ Transporter de email no inicializado');
      return false;
    }

    try {
      const mailOptions = {
        from: `"Sistema SENA Acuaponía" <${process.env.SMTP_USER}>`,
        to,
        subject,
        html,
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info(`✅ Email enviado a ${to}: ${subject}`);
      return result;
    } catch (error) {
      logger.error(`❌ Error enviando email a ${to}:`, error);
      return false;
    }
  }

  async sendBulkEmail(recipients: string[], subject: string, html: string) {
    const results = [];
    
    for (const recipient of recipients) {
      const result = await this.sendEmail(recipient, subject, html);
      results.push({ recipient, success: !!result });
    }

    return results;
  }
}

export const emailService = new EmailService();
export default emailService;