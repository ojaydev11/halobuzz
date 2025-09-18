import { logger } from '../config/logger';
import { Request, Response } from 'express';

export interface SecurityEvent {
  id: string;
  type: 'AUTH_FAILURE' | 'RATE_LIMIT_EXCEEDED' | 'SUSPICIOUS_ACTIVITY' | 'PAYMENT_FRAUD' | 'ADMIN_ACTION';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  userId?: string;
  ipAddress: string;
  userAgent?: string;
  details: Record<string, any>;
  timestamp: Date;
  resolved: boolean;
}

export class SecurityMonitoringService {
  private events: SecurityEvent[] = [];
  private alertThresholds = {
    AUTH_FAILURE: 5, // Alert after 5 failed attempts
    RATE_LIMIT_EXCEEDED: 3, // Alert after 3 rate limit violations
    SUSPICIOUS_ACTIVITY: 1, // Alert immediately
    PAYMENT_FRAUD: 1, // Alert immediately
    ADMIN_ACTION: 1 // Log all admin actions
  };

  /**
   * Log a security event
   */
  async logSecurityEvent(event: Omit<SecurityEvent, 'id' | 'timestamp' | 'resolved'>): Promise<void> {
    const securityEvent: SecurityEvent = {
      ...event,
      id: `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      resolved: false
    };

    this.events.push(securityEvent);

    // Log to console/file
    logger.warn('Security Event Detected', {
      eventId: securityEvent.id,
      type: securityEvent.type,
      severity: securityEvent.severity,
      userId: securityEvent.userId,
      ipAddress: securityEvent.ipAddress,
      details: securityEvent.details
    });

    // Check if we need to send alerts
    await this.checkAlertThresholds(securityEvent);
  }

  /**
   * Check if event count exceeds alert thresholds
   */
  private async checkAlertThresholds(event: SecurityEvent): Promise<void> {
    const recentEvents = this.events.filter(e => 
      e.type === event.type && 
      e.ipAddress === event.ipAddress &&
      (Date.now() - e.timestamp.getTime()) < 300000 // Last 5 minutes
    );

    const threshold = this.alertThresholds[event.type];
    
    if (recentEvents.length >= threshold) {
      await this.sendSecurityAlert(event, recentEvents.length);
    }
  }

  /**
   * Send security alert
   */
  private async sendSecurityAlert(event: SecurityEvent, count: number): Promise<void> {
    logger.error('SECURITY ALERT', {
      alertType: 'THRESHOLD_EXCEEDED',
      eventType: event.type,
      eventCount: count,
      ipAddress: event.ipAddress,
      userId: event.userId,
      severity: event.severity,
      timestamp: new Date()
    });

    // In production, this would send to:
    // - Email alerts
    // - Slack notifications
    // - Security dashboard
    // - Incident management system
  }

  /**
   * Get security events
   */
  async getSecurityEvents(filters?: {
    type?: string;
    severity?: string;
    userId?: string;
    ipAddress?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<SecurityEvent[]> {
    let filteredEvents = [...this.events];

    if (filters) {
      if (filters.type) {
        filteredEvents = filteredEvents.filter(e => e.type === filters.type);
      }
      if (filters.severity) {
        filteredEvents = filteredEvents.filter(e => e.severity === filters.severity);
      }
      if (filters.userId) {
        filteredEvents = filteredEvents.filter(e => e.userId === filters.userId);
      }
      if (filters.ipAddress) {
        filteredEvents = filteredEvents.filter(e => e.ipAddress === filters.ipAddress);
      }
      if (filters.startDate) {
        filteredEvents = filteredEvents.filter(e => e.timestamp >= filters.startDate!);
      }
      if (filters.endDate) {
        filteredEvents = filteredEvents.filter(e => e.timestamp <= filters.endDate!);
      }
    }

    // Sort by timestamp (newest first)
    filteredEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply limit
    if (filters?.limit) {
      filteredEvents = filteredEvents.slice(0, filters.limit);
    }

    return filteredEvents;
  }

  /**
   * Resolve a security event
   */
  async resolveSecurityEvent(eventId: string): Promise<boolean> {
    const event = this.events.find(e => e.id === eventId);
    if (event) {
      event.resolved = true;
      logger.info('Security event resolved', { eventId });
      return true;
    }
    return false;
  }

  /**
   * Get security dashboard data
   */
  async getSecurityDashboard(): Promise<{
    totalEvents: number;
    unresolvedEvents: number;
    eventsByType: Record<string, number>;
    eventsBySeverity: Record<string, number>;
    recentEvents: SecurityEvent[];
  }> {
    const unresolvedEvents = this.events.filter(e => !e.resolved);
    
    const eventsByType = this.events.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const eventsBySeverity = this.events.reduce((acc, event) => {
      acc[event.severity] = (acc[event.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const recentEvents = this.events
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);

    return {
      totalEvents: this.events.length,
      unresolvedEvents: unresolvedEvents.length,
      eventsByType,
      eventsBySeverity,
      recentEvents
    };
  }

  /**
   * Middleware to log request security events
   */
  securityMiddleware() {
    return (req: Request, res: Response, next: Function) => {
      // Log suspicious patterns
      const suspiciousPatterns = [
        /\.\.\//, // Directory traversal
        /<script/i, // XSS attempts
        /union.*select/i, // SQL injection
        /javascript:/i, // JavaScript injection
      ];

      const url = req.url;
      const userAgent = req.get('User-Agent') || '';
      
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(url) || pattern.test(userAgent)) {
          this.logSecurityEvent({
            type: 'SUSPICIOUS_ACTIVITY',
            severity: 'HIGH',
            ipAddress: req.ip || 'unknown',
            userAgent,
            details: { url, pattern: pattern.toString() }
          });
        }
      }

      next();
    };
  }
}

// Export singleton instance
export const securityMonitoring = new SecurityMonitoringService();