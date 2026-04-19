import { BREVO_API_KEY, FROM_EMAIL, URL_FRONTEND } from '../shared/config.js';
import { logger } from '../shared/logger.js';

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

interface EmailOptions {
  to: string;
  name: string;
  subject: string;
  htmlContent: string;
}

export const EmailService = {
  isConfigured(): boolean {
    return Boolean(BREVO_API_KEY && FROM_EMAIL);
  },

  getResetPasswordUrl(token: string): string {
    return `${URL_FRONTEND}/reset-password?token=${token}`;
  },

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.isConfigured()) {
      logger.warn('Email not configured, skipping send', { to: options.to });
      return false;
    }

    try {
      const response = await fetch(BREVO_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': BREVO_API_KEY,
        },
        body: JSON.stringify({
          sender: {
            name: 'MyRacing',
            email: FROM_EMAIL,
          },
          to: [{ email: options.to, name: options.name }],
          subject: options.subject,
          htmlContent: options.htmlContent,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        logger.error('Brevo API error', { status: response.status, error: errorData });
        return false;
      }

      logger.info('Email sent successfully', { to: options.to, subject: options.subject });
      return true;
    } catch (error) {
      logger.error('Failed to send email', { error, to: options.to });
      return false;
    }
  },

  async sendPasswordResetEmail(to: string, name: string, token: string): Promise<boolean> {
    const resetUrl = this.getResetPasswordUrl(token);

    return this.sendEmail({
      to,
      name,
      subject: 'Restablecer contraseña - MyRacing',
      htmlContent: `
        <h1>Restablecer contraseña</h1>
        <p>Hola ${name},</p>
        <p>Recibiste este email porque solicitaste restablecer tu contraseña.</p>
        <p>Haz clic en el siguiente enlace para crear una nueva contraseña:</p>
        <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px;">Restablecer contraseña</a>
        <p>Este enlace expira en 30 minutos.</p>
        <p>Si no solicitaste este cambio, ignora este email.</p>
      `,
    });
  },
};