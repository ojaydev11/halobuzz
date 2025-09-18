export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export class EmailTemplates {
  static getWelcomeEmail(username: string, verificationLink?: string): EmailTemplate {
    return {
      subject: 'Welcome to HaloBuzz! 🎉',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to HaloBuzz</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 28px; font-weight: 300; }
            .content { padding: 40px 20px; }
            .content h2 { color: #333; margin-bottom: 20px; }
            .content p { color: #666; line-height: 1.6; margin-bottom: 20px; }
            .cta-button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; margin: 20px 0; }
            .features { display: flex; flex-wrap: wrap; margin: 30px 0; }
            .feature { flex: 1; min-width: 200px; text-align: center; padding: 20px; }
            .feature-icon { font-size: 48px; margin-bottom: 15px; }
            .footer { background-color: #f8f9fa; padding: 30px 20px; text-align: center; color: #666; }
            .social-links { margin: 20px 0; }
            .social-links a { color: #667eea; text-decoration: none; margin: 0 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Welcome to HaloBuzz!</h1>
            </div>
            <div class="content">
              <h2>Hey ${username}!</h2>
              <p>Welcome to the most exciting live streaming platform! We're thrilled to have you join our amazing community of creators and viewers.</p>
              
              <div class="features">
                <div class="feature">
                  <div class="feature-icon">📱</div>
                  <h3>Live Streaming</h3>
                  <p>Go live instantly and connect with your audience in real-time</p>
                </div>
                <div class="feature">
                  <div class="feature-icon">🎁</div>
                  <h3>Virtual Gifts</h3>
                  <p>Receive and send virtual gifts to support your favorite creators</p>
                </div>
                <div class="feature">
                  <div class="feature-icon">👑</div>
                  <h3>OG Levels</h3>
                  <p>Level up your status and unlock exclusive features</p>
                </div>
              </div>

              ${verificationLink ? `
                <p>To get started, please verify your email address:</p>
                <a href="${verificationLink}" class="cta-button">Verify Email Address</a>
              ` : ''}

              <p>Ready to start your journey? Download our mobile app and begin streaming today!</p>
              <a href="#" class="cta-button">Download Mobile App</a>
            </div>
            <div class="footer">
              <p>Thanks for joining HaloBuzz!</p>
              <div class="social-links">
                <a href="#">Twitter</a> | <a href="#">Instagram</a> | <a href="#">Discord</a>
              </div>
              <p style="font-size: 12px; margin-top: 20px;">
                This email was sent to you because you created an account on HaloBuzz.<br>
                If you didn't create this account, please ignore this email.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Welcome to HaloBuzz, ${username}!
        
        We're thrilled to have you join our amazing community of creators and viewers.
        
        Here's what you can do on HaloBuzz:
        - Go live instantly and connect with your audience in real-time
        - Receive and send virtual gifts to support your favorite creators
        - Level up your status and unlock exclusive features
        
        ${verificationLink ? `To get started, please verify your email address: ${verificationLink}` : ''}
        
        Ready to start your journey? Download our mobile app and begin streaming today!
        
        Thanks for joining HaloBuzz!
        
        This email was sent to you because you created an account on HaloBuzz.
        If you didn't create this account, please ignore this email.
      `
    };
  }

  static getPromotionalEmail(username: string, campaign: {
    title: string;
    description: string;
    ctaText: string;
    ctaLink: string;
    imageUrl?: string;
  }): EmailTemplate {
    return {
      subject: `🔥 ${campaign.title} - HaloBuzz`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${campaign.title}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
            .header { background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); padding: 40px 20px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 28px; font-weight: 300; }
            .content { padding: 40px 20px; }
            .content h2 { color: #333; margin-bottom: 20px; }
            .content p { color: #666; line-height: 1.6; margin-bottom: 20px; }
            .cta-button { display: inline-block; background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; margin: 20px 0; }
            .campaign-image { width: 100%; max-width: 500px; height: auto; border-radius: 10px; margin: 20px 0; }
            .footer { background-color: #f8f9fa; padding: 30px 20px; text-align: center; color: #666; }
            .social-links { margin: 20px 0; }
            .social-links a { color: #ff6b6b; text-decoration: none; margin: 0 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔥 ${campaign.title}</h1>
            </div>
            <div class="content">
              <h2>Hey ${username}!</h2>
              <p>${campaign.description}</p>
              
              ${campaign.imageUrl ? `<img src="${campaign.imageUrl}" alt="${campaign.title}" class="campaign-image">` : ''}
              
              <p>Don't miss out on this amazing opportunity!</p>
              <a href="${campaign.ctaLink}" class="cta-button">${campaign.ctaText}</a>
              
              <p>Best regards,<br>The HaloBuzz Team</p>
            </div>
            <div class="footer">
              <div class="social-links">
                <a href="#">Twitter</a> | <a href="#">Instagram</a> | <a href="#">Discord</a>
              </div>
              <p style="font-size: 12px; margin-top: 20px;">
                You're receiving this email because you're a valued member of HaloBuzz.<br>
                <a href="#">Unsubscribe</a> | <a href="#">Update Preferences</a>
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        ${campaign.title} - HaloBuzz
        
        Hey ${username}!
        
        ${campaign.description}
        
        Don't miss out on this amazing opportunity!
        ${campaign.ctaText}: ${campaign.ctaLink}
        
        Best regards,
        The HaloBuzz Team
        
        You're receiving this email because you're a valued member of HaloBuzz.
        Unsubscribe: [link]
      `
    };
  }

  static getEngagementEmail(username: string, type: 'inactive' | 'new_features' | 'milestone'): EmailTemplate {
    const templates = {
      inactive: {
        subject: 'We miss you on HaloBuzz! 😢',
        title: 'Come back and stream with us!',
        description: 'It\'s been a while since we\'ve seen you on HaloBuzz. Your community is waiting for you!',
        ctaText: 'Start Streaming Now',
        ctaLink: '#'
      },
      new_features: {
        subject: 'New features are here! 🚀',
        title: 'Check out what\'s new',
        description: 'We\'ve added amazing new features that will take your streaming to the next level!',
        ctaText: 'Explore New Features',
        ctaLink: '#'
      },
      milestone: {
        subject: 'Congratulations on your achievement! 🎉',
        title: 'You\'re doing amazing!',
        description: 'You\'ve reached a new milestone! Keep up the great work and continue growing your community.',
        ctaText: 'View Your Progress',
        ctaLink: '#'
      }
    };

    const template = templates[type];
    return this.getPromotionalEmail(username, template);
  }

  static getPasswordResetEmail(username: string, resetLink: string): EmailTemplate {
    return {
      subject: 'Reset your HaloBuzz password',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 28px; font-weight: 300; }
            .content { padding: 40px 20px; }
            .content h2 { color: #333; margin-bottom: 20px; }
            .content p { color: #666; line-height: 1.6; margin-bottom: 20px; }
            .cta-button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; margin: 20px 0; }
            .footer { background-color: #f8f9fa; padding: 30px 20px; text-align: center; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Password Reset</h1>
            </div>
            <div class="content">
              <h2>Hey ${username}!</h2>
              <p>We received a request to reset your password. Click the button below to create a new password:</p>
              <a href="${resetLink}" class="cta-button">Reset Password</a>
              <p>If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
              <p>This link will expire in 1 hour for security reasons.</p>
            </div>
            <div class="footer">
              <p>Thanks,<br>The HaloBuzz Team</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Password Reset - HaloBuzz
        
        Hey ${username}!
        
        We received a request to reset your password. Click the link below to create a new password:
        ${resetLink}
        
        If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
        This link will expire in 1 hour for security reasons.
        
        Thanks,
        The HaloBuzz Team
      `
    };
  }
}
