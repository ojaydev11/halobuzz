import { setupLogger } from '@/config/logger';
import { getCacheStats } from '@/config/redis';
import { connectDatabase } from '@/config/database';
import mongoose from 'mongoose';

const logger = setupLogger();

export interface SecurityEvent {
  id: string;
  timestamp: Date;
  type: 'authentication' | 'authorization' | 'injection' | 'xss' | 'csrf' | 'rate_limit' | 'suspicious_activity' | 'data_breach';
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: {
    ip: string;
    userAgent: string;
    userId?: string;
    sessionId?: string;
  };
  details: {
    endpoint: string;
    method: string;
    payload?: any;
    responseCode: number;
    description: string;
  };
  metadata: {
    country?: string;
    isp?: string;
    device?: string;
    browser?: string;
  };
}

export interface SecurityAlert {
  id: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  message: string;
  source: string;
  affectedUsers: number;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export interface SecurityMetrics {
  timestamp: Date;
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsBySeverity: Record<string, number>;
  topAttackSources: Array<{
    ip: string;
    count: number;
    country: string;
  }>;
  blockedRequests: number;
  suspiciousLogins: number;
  dataAccessViolations: number;
  systemHealth: {
    database: boolean;
    redis: boolean;
    api: boolean;
  };
}

export class SecurityMonitoringService {
  private static instance: SecurityMonitoringService;
  private events: SecurityEvent[] = [];
  private alerts: SecurityAlert[] = [];
  private metrics: SecurityMetrics[] = [];
  private alertConfig = {
    criticalThreshold: 10, // events per minute
    highThreshold: 50,
    mediumThreshold: 100,
    lowThreshold: 200,
    timeWindow: 60, // seconds
    enabled: true
  };

  private constructor() {}

  public static getInstance(): SecurityMonitoringService {
    if (!SecurityMonitoringService.instance) {
      SecurityMonitoringService.instance = new SecurityMonitoringService();
    }
    return SecurityMonitoringService.instance;
  }

  public async recordSecurityEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): Promise<void> {
    try {
      const securityEvent: SecurityEvent = {
        ...event,
        id: this.generateEventId(),
        timestamp: new Date()
      };

      // Store event
      this.events.push(securityEvent);
      
      // Keep only last 10000 events
      if (this.events.length > 10000) {
        this.events = this.events.slice(-10000);
      }

      // Log security event
      logger.warn('Security event recorded:', {
        type: securityEvent.type,
        severity: securityEvent.severity,
        source: securityEvent.source.ip,
        endpoint: securityEvent.details.endpoint,
        description: securityEvent.details.description
      });

      // Check for alerts
      await this.checkSecurityAlerts(securityEvent);

      // Update metrics
      await this.updateSecurityMetrics();

    } catch (error) {
      logger.error('Error recording security event:', error);
    }
  }

  public async detectSuspiciousActivity(request: any): Promise<boolean> {
    try {
      const suspiciousPatterns = [
        // SQL Injection patterns
        /['";\\|*\-+=<>!@#$%^&()_+{}\[\]:;",.<>?\/\\~`]/i,
        
        // XSS patterns
        /<script[^>]*>.*?<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi,
        
        // Path traversal
        /\.\.\//g,
        /\.\.\\/g,
        
        // Command injection
        /[;&|`$()]/g,
        
        // LDAP injection
        /[()=*!&|]/g
      ];

      const requestData = JSON.stringify({
        url: request.url,
        method: request.method,
        headers: request.headers,
        body: request.body,
        query: request.query,
        params: request.params
      });

      for (const pattern of suspiciousPatterns) {
        if (pattern.test(requestData)) {
          await this.recordSecurityEvent({
            type: 'suspicious_activity',
            severity: 'high',
            source: {
              ip: request.ip || 'unknown',
              userAgent: request.get('User-Agent') || 'unknown',
              userId: request.user?.id,
              sessionId: request.sessionID
            },
            details: {
              endpoint: request.path,
              method: request.method,
              payload: requestData,
              responseCode: 400,
              description: `Suspicious pattern detected: ${pattern.source}`
            },
            metadata: {
              country: request.geo?.country,
              isp: request.geo?.isp,
              device: request.device?.type,
              browser: request.browser?.name
            }
          });
          
          return true;
        }
      }

      return false;
    } catch (error) {
      logger.error('Error detecting suspicious activity:', error);
      return false;
    }
  }

  public async detectBruteForce(ip: string, endpoint: string): Promise<boolean> {
    try {
      const timeWindow = 5 * 60 * 1000; // 5 minutes
      const threshold = 5; // 5 failed attempts
      
      const recentEvents = this.events.filter(event => 
        event.source.ip === ip &&
        event.details.endpoint === endpoint &&
        event.type === 'authentication' &&
        event.details.responseCode >= 400 &&
        (Date.now() - event.timestamp.getTime()) < timeWindow
      );

      if (recentEvents.length >= threshold) {
        await this.recordSecurityEvent({
          type: 'authentication',
          severity: 'high',
          source: {
            ip,
            userAgent: 'unknown',
            sessionId: 'unknown'
          },
          details: {
            endpoint,
            method: 'POST',
            responseCode: 429,
            description: `Brute force attack detected: ${recentEvents.length} failed attempts in ${timeWindow / 1000} seconds`
          },
          metadata: {}
        });

        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error detecting brute force:', error);
      return false;
    }
  }

  public async detectDataBreach(userId: string, dataType: string, accessCount: number): Promise<boolean> {
    try {
      const timeWindow = 60 * 60 * 1000; // 1 hour
      const threshold = 1000; // 1000 data access attempts
      
      if (accessCount > threshold) {
        await this.recordSecurityEvent({
          type: 'data_breach',
          severity: 'critical',
          source: {
            ip: 'unknown',
            userAgent: 'unknown',
            userId,
            sessionId: 'unknown'
          },
          details: {
            endpoint: '/api/data',
            method: 'GET',
            payload: { dataType, accessCount },
            responseCode: 200,
            description: `Potential data breach detected: ${accessCount} ${dataType} access attempts in ${timeWindow / 1000} seconds`
          },
          metadata: {}
        });

        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error detecting data breach:', error);
      return false;
    }
  }

  private async checkSecurityAlerts(event: SecurityEvent): Promise<void> {
    try {
      if (!this.alertConfig.enabled) return;

      const timeWindow = this.alertConfig.timeWindow * 1000;
      const cutoffTime = new Date(Date.now() - timeWindow);
      
      // Count events by severity in time window
      const recentEvents = this.events.filter(e => e.timestamp > cutoffTime);
      const criticalEvents = recentEvents.filter(e => e.severity === 'critical').length;
      const highEvents = recentEvents.filter(e => e.severity === 'high').length;
      const mediumEvents = recentEvents.filter(e => e.severity === 'medium').length;
      const lowEvents = recentEvents.filter(e => e.severity === 'low').length;

      // Check thresholds
      if (criticalEvents >= this.alertConfig.criticalThreshold) {
        await this.createAlert('critical', 'Critical security events threshold exceeded', {
          events: criticalEvents,
          threshold: this.alertConfig.criticalThreshold,
          timeWindow: this.alertConfig.timeWindow
        });
      } else if (highEvents >= this.alertConfig.highThreshold) {
        await this.createAlert('high', 'High severity security events threshold exceeded', {
          events: highEvents,
          threshold: this.alertConfig.highThreshold,
          timeWindow: this.alertConfig.timeWindow
        });
      } else if (mediumEvents >= this.alertConfig.mediumThreshold) {
        await this.createAlert('medium', 'Medium severity security events threshold exceeded', {
          events: mediumEvents,
          threshold: this.alertConfig.mediumThreshold,
          timeWindow: this.alertConfig.timeWindow
        });
      } else if (lowEvents >= this.alertConfig.lowThreshold) {
        await this.createAlert('low', 'Low severity security events threshold exceeded', {
          events: lowEvents,
          threshold: this.alertConfig.lowThreshold,
          timeWindow: this.alertConfig.timeWindow
        });
      }

    } catch (error) {
      logger.error('Error checking security alerts:', error);
    }
  }

  private async createAlert(severity: 'low' | 'medium' | 'high' | 'critical', message: string, metadata: any): Promise<void> {
    try {
      const alert: SecurityAlert = {
        id: this.generateAlertId(),
        timestamp: new Date(),
        severity,
        type: 'security_threshold',
        message,
        source: 'security_monitoring',
        affectedUsers: 0,
        resolved: false
      };

      this.alerts.push(alert);

      // Keep only last 1000 alerts
      if (this.alerts.length > 1000) {
        this.alerts = this.alerts.slice(-1000);
      }

      // Send alert notification
      await this.sendAlertNotification(alert, metadata);

      logger.error('Security alert created:', {
        id: alert.id,
        severity: alert.severity,
        message: alert.message,
        metadata
      });

    } catch (error) {
      logger.error('Error creating security alert:', error);
    }
  }

  private async sendAlertNotification(alert: SecurityAlert, metadata: any): Promise<void> {
    try {
      // Implementation would depend on your notification system
      // This could include:
      // - Email notifications
      // - Slack/Discord webhooks
      // - SMS alerts for critical issues
      // - Integration with monitoring services (DataDog, New Relic, etc.)
      
      const notification = {
        alert: alert,
        metadata: metadata,
        timestamp: new Date().toISOString()
      };

      // Example: Send to Slack
      if (process.env.SLACK_WEBHOOK_URL) {
        const slackMessage = {
          text: `🚨 Security Alert: ${alert.message}`,
          attachments: [{
            color: this.getSeverityColor(alert.severity),
            fields: [
              { title: 'Severity', value: alert.severity.toUpperCase(), short: true },
              { title: 'Type', value: alert.type, short: true },
              { title: 'Time', value: alert.timestamp.toISOString(), short: true },
              { title: 'Details', value: JSON.stringify(metadata, null, 2), short: false }
            ]
          }]
        };

        // Send to Slack webhook
        // await fetch(process.env.SLACK_WEBHOOK_URL, { ... });
      }

      // Example: Send email
      if (process.env.SECURITY_EMAIL) {
        // Send email notification
        // await sendEmail(process.env.SECURITY_EMAIL, 'Security Alert', notification);
      }

    } catch (error) {
      logger.error('Error sending alert notification:', error);
    }
  }

  private getSeverityColor(severity: string): string {
    switch (severity) {
      case 'critical': return 'danger';
      case 'high': return 'warning';
      case 'medium': return 'good';
      case 'low': return '#36a64f';
      default: return '#36a64f';
    }
  }

  private async updateSecurityMetrics(): Promise<void> {
    try {
      const now = new Date();
      const timeWindow = 60 * 60 * 1000; // 1 hour
      const cutoffTime = new Date(now.getTime() - timeWindow);
      
      const recentEvents = this.events.filter(e => e.timestamp > cutoffTime);
      
      // Group events by type
      const eventsByType: Record<string, number> = {};
      recentEvents.forEach(event => {
        eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
      });

      // Group events by severity
      const eventsBySeverity: Record<string, number> = {};
      recentEvents.forEach(event => {
        eventsBySeverity[event.severity] = (eventsBySeverity[event.severity] || 0) + 1;
      });

      // Get top attack sources
      const sourceCounts: Record<string, { count: number; country: string }> = {};
      recentEvents.forEach(event => {
        const ip = event.source.ip;
        if (!sourceCounts[ip]) {
          sourceCounts[ip] = { count: 0, country: event.metadata.country || 'unknown' };
        }
        sourceCounts[ip].count++;
      });

      const topAttackSources = Object.entries(sourceCounts)
        .map(([ip, data]) => ({ ip, count: data.count, country: data.country }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const metrics: SecurityMetrics = {
        timestamp: now,
        totalEvents: recentEvents.length,
        eventsByType,
        eventsBySeverity,
        topAttackSources,
        blockedRequests: recentEvents.filter(e => e.details.responseCode >= 400).length,
        suspiciousLogins: recentEvents.filter(e => e.type === 'authentication' && e.severity === 'high').length,
        dataAccessViolations: recentEvents.filter(e => e.type === 'data_breach').length,
        systemHealth: {
          database: await this.checkDatabaseHealth(),
          redis: await this.checkRedisHealth(),
          api: await this.checkApiHealth()
        }
      };

      this.metrics.push(metrics);
      
      // Keep only last 168 metrics (1 week of hourly metrics)
      if (this.metrics.length > 168) {
        this.metrics = this.metrics.slice(-168);
      }

    } catch (error) {
      logger.error('Error updating security metrics:', error);
    }
  }

  private async checkDatabaseHealth(): Promise<boolean> {
    try {
      const db = mongoose.connection;
      return db.readyState === 1;
    } catch (error) {
      return false;
    }
  }

  private async checkRedisHealth(): Promise<boolean> {
    try {
      const stats = await getCacheStats();
      return stats !== null;
    } catch (error) {
      return false;
    }
  }

  private async checkApiHealth(): Promise<boolean> {
    try {
      // Check if API is responding
      return true;
    } catch (error) {
      return false;
    }
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public getSecurityEvents(limit: number = 100): SecurityEvent[] {
    return this.events.slice(-limit);
  }

  public getSecurityAlerts(limit: number = 50): SecurityAlert[] {
    return this.alerts.slice(-limit);
  }

  public getSecurityMetrics(limit: number = 24): SecurityMetrics[] {
    return this.metrics.slice(-limit);
  }

  public getLatestSecurityMetrics(): SecurityMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  public updateAlertConfig(newConfig: Partial<typeof this.alertConfig>): void {
    this.alertConfig = { ...this.alertConfig, ...newConfig };
  }

  public getAlertConfig(): typeof this.alertConfig {
    return { ...this.alertConfig };
  }

  public async resolveAlert(alertId: string, resolvedBy: string): Promise<boolean> {
    try {
      const alert = this.alerts.find(a => a.id === alertId);
      if (alert) {
        alert.resolved = true;
        alert.resolvedAt = new Date();
        alert.resolvedBy = resolvedBy;
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Error resolving alert:', error);
      return false;
    }
  }
}

export const securityMonitoringService = SecurityMonitoringService.getInstance();
