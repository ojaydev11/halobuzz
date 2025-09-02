import logger from '../utils/logger';

export interface SMSOptions {
  to: string;
  message: string;
}

export class SMSService {
  private static instance: SMSService;

  public static getInstance(): SMSService {
    if (!SMSService.instance) {
      SMSService.instance = new SMSService();
    }
    return SMSService.instance;
  }

  async sendSMS(options: SMSOptions): Promise<boolean> {
    try {
      logger.info('Sending SMS', { to: options.to });
      // TODO: Implement actual SMS sending logic
      return true;
    } catch (error) {
      logger.error('Failed to send SMS', { error, options });
      return false;
    }
  }

  async sendVerificationSMS(phone: string, code: string): Promise<boolean> {
    return this.sendSMS({
      to: phone,
      message: `Your HaloBuzz verification code is: ${code}`
    });
  }

  async sendPasswordResetSMS(phone: string, code: string): Promise<boolean> {
    return this.sendSMS({
      to: phone,
      message: `Your HaloBuzz password reset code is: ${code}`
    });
  }

  static async sendVerificationCode(phone: string, code: string): Promise<boolean> {
    const service = SMSService.getInstance();
    return service.sendVerificationSMS(phone, code);
  }
}
