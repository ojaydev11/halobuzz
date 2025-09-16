import { logger } from '../config/logger';

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
      
      // Use Twilio for SMS delivery
      const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
      const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
      const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
      
      if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
        logger.warn('Twilio credentials not configured, using fallback');
        return this.fallbackSMS(options);
      }

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            From: twilioPhoneNumber,
            To: options.to,
            Body: options.message
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Twilio API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      logger.info('SMS sent successfully', { 
        to: options.to, 
        sid: (result as any).sid,
        status: (result as any).status 
      });
      return true;
    } catch (error) {
      logger.error('Failed to send SMS', { error, options });
      return this.fallbackSMS(options);
    }
  }

  private fallbackSMS(options: SMSOptions): boolean {
    // Log SMS for development/testing purposes
    logger.info('FALLBACK SMS LOGGED', {
      to: options.to,
      message: options.message,
      timestamp: new Date().toISOString()
    });
    
    // In production, you might want to queue this for retry
    // or use an alternative SMS service
    return true;
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
