import { logger } from '../config/logger';

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  template?: string;
  data?: Record<string, any>;
}

export class EmailService {
  private static instance: EmailService;

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      logger.info('Sending email', { to: options.to, subject: options.subject });
      
      // Use SendGrid for email delivery
      const sendgridApiKey = process.env.SENDGRID_API_KEY;
      if (!sendgridApiKey) {
        logger.warn('SendGrid API key not configured, using fallback');
        return this.fallbackEmail(options);
      }

      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sendgridApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          personalizations: [
            {
              to: [{ email: options.to }],
              subject: options.subject
            }
          ],
          from: {
            email: process.env.FROM_EMAIL || 'noreply@halobuzz.com',
            name: 'HaloBuzz'
          },
          content: [
            {
              type: 'text/plain',
              value: options.text || options.html?.replace(/<[^>]*>/g, '') || ''
            },
            ...(options.html ? [{
              type: 'text/html',
              value: options.html
            }] : [])
          ]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`SendGrid API error: ${response.status} - ${errorText}`);
      }

      logger.info('Email sent successfully', { to: options.to });
      return true;
    } catch (error) {
      logger.error('Failed to send email', { error, options });
      return this.fallbackEmail(options);
    }
  }

  private fallbackEmail(options: EmailOptions): boolean {
    // Log email for development/testing purposes
    logger.info('FALLBACK EMAIL LOGGED', {
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      timestamp: new Date().toISOString()
    });
    
    // In production, you might want to queue this for retry
    // or use an alternative email service
    return true;
  }

  async sendVerificationEmail(email: string, token: string): Promise<boolean> {
    return this.sendEmail({
      to: email,
      subject: 'Verify your HaloBuzz account',
      text: `Please verify your account with this token: ${token}`,
      html: `<p>Please verify your account with this token: <strong>${token}</strong></p>`
    });
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<boolean> {
    return this.sendEmail({
      to: email,
      subject: 'Reset your HaloBuzz password',
      text: `Reset your password with this token: ${token}`,
      html: `<p>Reset your password with this token: <strong>${token}</strong></p>`
    });
  }

  static async sendWelcomeEmail(email: string, username: string): Promise<boolean> {
    const service = EmailService.getInstance();
    return service.sendEmail({
      to: email,
      subject: 'Welcome to HaloBuzz!',
      text: `Welcome to HaloBuzz, ${username}!`,
      html: `<h1>Welcome to HaloBuzz, ${username}!</h1><p>We're excited to have you join our community.</p>`
    });
  }
}
