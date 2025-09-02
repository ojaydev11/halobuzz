import logger from '../utils/logger';

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
      // TODO: Implement actual email sending logic
      return true;
    } catch (error) {
      logger.error('Failed to send email', { error, options });
      return false;
    }
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
