import { logger } from '@/config/logger';
import { Request } from 'express';

export interface SecurityEvent {
  id: string;
  timestamp: Date;
  type: 'authentication' | 'authorization' | 'injection' | 'xss' | 'csrf' | 'rate_limit' | 'suspicious_activity' | 'data_breach' | 'file_upload' | 'admin_action';
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: {
    ip: string;
    userAgent: string;
    userId?: string;
    username?: string;
  };
  details: {
    endpoint: string;
    method: string;
    payload?: any;
    error?: string;
    riskScore: number;
  };
  metadata: {
    requestId?: string;
    sessionId?: string;
    deviceId?: string;
    country?: string;
  };
}

export interface SecurityAlert {
  id: string;
  timestamp: Date;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  source: string;
  details: any;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export class SecurityMonitoringService {
  private static instance: SecurityMonitoringService;
  private events: SecurityEvent[] = [];
  private alerts: SecurityAlert[] = [];
  private suspiciousIPs: Set<string> = new Set();
  private failedLoginAttempts: Map<string, number> = new Map();
  private suspiciousPatterns: RegExp[] = [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /onload\s*=/gi,
    /onerror\s*=/gi,
    /eval\s*\(/gi,
    /document\.cookie/gi,
    /window\.location/gi,
    /\$ne\s*:\s*null/gi,
    /\$where\s*:/gi,
    /union\s+select/gi,
    /drop\s+table/gi,
    /delete\s+from/gi,
    /insert\s+into/gi,
    /update\s+set/gi
  ];

  private constructor() {}

  static getInstance(): SecurityMonitoringService {
    if (!SecurityMonitoringService.instance) {
      SecurityMonitoringService.instance = new SecurityMonitoringService();
    }
    return SecurityMonitoringService.instance;
  }

  /**
   * Logs a security event
   */
  logEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): void {
    const securityEvent: SecurityEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      ...event
    };

    this.events.push(securityEvent);

    // Log to console/file
    logger.warn('Security Event', {
      id: securityEvent.id,
      type: securityEvent.type,
      severity: securityEvent.severity,
      source: securityEvent.source,
      details: securityEvent.details,
      metadata: securityEvent.metadata
    });

    // Check for suspicious patterns
    this.analyzeEvent(securityEvent);

    // Keep only last 1000 events
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000);
    }
  }

  /**
   * Logs authentication events
   */
  logAuthenticationEvent(
    type: 'login_success' | 'login_failed' | 'logout' | 'token_expired' | 'token_invalid',
    req: Request,
    userId?: string,
    username?: string,
    error?: string
  ): void {
    const severity = type === 'login_success' ? 'low' : 'medium';
    
    this.logEvent({
      type: 'authentication',
      severity,
      source: {
        ip: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        userId,
        username
      },
      details: {
        endpoint: req.path,
        method: req.method,
        payload: this.sanitizePayload(req.body),
        error,
        riskScore: this.calculateRiskScore(req, type)
      },
      metadata: {
        requestId: req.headers['x-request-id'] as string,
        sessionId: req.headers['x-session-id'] as string,
        deviceId: req.headers['x-device-id'] as string
      }
    });

    // Track failed login attempts
    if (type === 'login_failed') {
      const ip = req.ip || 'unknown';
      const attempts = this.failedLoginAttempts.get(ip) || 0;
      this.failedLoginAttempts.set(ip, attempts + 1);

      // Mark IP as suspicious after 5 failed attempts
      if (attempts + 1 >= 5) {
        this.suspiciousIPs.add(ip);
        this.createAlert('suspicious_ip', 'high', `IP ${ip} has ${attempts + 1} failed login attempts`);
      }
    }
  }

  /**
   * Logs authorization events
   */
  logAuthorizationEvent(
    type: 'access_granted' | 'access_denied' | 'privilege_escalation' | 'unauthorized_access',
    req: Request,
    userId?: string,
    username?: string,
    resource?: string,
    error?: string
  ): void {
    const severity = type === 'access_granted' ? 'low' : 'high';
    
    this.logEvent({
      type: 'authorization',
      severity,
      source: {
        ip: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        userId,
        username
      },
      details: {
        endpoint: req.path,
        method: req.method,
        payload: this.sanitizePayload(req.body),
        error,
        riskScore: this.calculateRiskScore(req, type)
      },
      metadata: {
        requestId: req.headers['x-request-id'] as string,
        sessionId: req.headers['x-session-id'] as string,
        deviceId: req.headers['x-device-id'] as string
      }
    });

    // Create alert for unauthorized access attempts
    if (type === 'unauthorized_access' || type === 'privilege_escalation') {
      this.createAlert('unauthorized_access', 'critical', `Unauthorized access attempt by ${username || 'unknown user'} to ${resource || req.path}`);
    }
  }

  /**
   * Logs injection attempts
   */
  logInjectionEvent(
    type: 'nosql_injection' | 'sql_injection' | 'command_injection' | 'ldap_injection',
    req: Request,
    payload: any,
    userId?: string,
    username?: string
  ): void {
    this.logEvent({
      type: 'injection',
      severity: 'critical',
      source: {
        ip: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        userId,
        username
      },
      details: {
        endpoint: req.path,
        method: req.method,
        payload: this.sanitizePayload(payload),
        error: `${type} attempt detected`,
        riskScore: 100
      },
      metadata: {
        requestId: req.headers['x-request-id'] as string,
        sessionId: req.headers['x-session-id'] as string,
        deviceId: req.headers['x-device-id'] as string
      }
    });

    // Mark IP as suspicious
    if (req.ip) {
      this.suspiciousIPs.add(req.ip);
    }

    // Create critical alert
    this.createAlert('injection_attempt', 'critical', `${type} attempt detected from ${req.ip || 'unknown IP'}`);
  }

  /**
   * Logs XSS attempts
   */
  logXSSEvent(
    req: Request,
    payload: any,
    userId?: string,
    username?: string
  ): void {
    this.logEvent({
      type: 'xss',
      severity: 'high',
      source: {
        ip: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        userId,
        username
      },
      details: {
        endpoint: req.path,
        method: req.method,
        payload: this.sanitizePayload(payload),
        error: 'XSS attempt detected',
        riskScore: 90
      },
      metadata: {
        requestId: req.headers['x-request-id'] as string,
        sessionId: req.headers['x-session-id'] as string,
        deviceId: req.headers['x-device-id'] as string
      }
    });

    this.createAlert('xss_attempt', 'high', `XSS attempt detected from ${req.ip || 'unknown IP'}`);
  }

  /**
   * Logs file upload events
   */
  logFileUploadEvent(
    type: 'upload_success' | 'upload_failed' | 'malicious_file' | 'oversized_file',
    req: Request,
    fileName: string,
    fileSize: number,
    fileType: string,
    userId?: string,
    username?: string,
    error?: string
  ): void {
    const severity = type === 'upload_success' ? 'low' : 'high';
    
    this.logEvent({
      type: 'file_upload',
      severity,
      source: {
        ip: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        userId,
        username
      },
      details: {
        endpoint: req.path,
        method: req.method,
        payload: { fileName, fileSize, fileType },
        error,
        riskScore: this.calculateRiskScore(req, type)
      },
      metadata: {
        requestId: req.headers['x-request-id'] as string,
        sessionId: req.headers['x-session-id'] as string,
        deviceId: req.headers['x-device-id'] as string
      }
    });

    if (type === 'malicious_file') {
      this.createAlert('malicious_file', 'critical', `Malicious file upload attempt: ${fileName}`);
    }
  }

  /**
   * Logs admin actions
   */
  logAdminAction(
    action: string,
    resource: string,
    req: Request,
    userId: string,
    username: string,
    success: boolean,
    error?: string
  ): void {
    this.logEvent({
      type: 'admin_action',
      severity: success ? 'medium' : 'high',
      source: {
        ip: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        userId,
        username
      },
      details: {
        endpoint: req.path,
        method: req.method,
        payload: { action, resource, success },
        error,
        riskScore: this.calculateRiskScore(req, 'admin_action')
      },
      metadata: {
        requestId: req.headers['x-request-id'] as string,
        sessionId: req.headers['x-session-id'] as string,
        deviceId: req.headers['x-device-id'] as string
      }
    });
  }

  /**
   * Analyzes events for suspicious patterns
   */
  private analyzeEvent(event: SecurityEvent): void {
    // Check for suspicious patterns in payload
    if (event.details.payload) {
      const payloadStr = JSON.stringify(event.details.payload);
      
      for (const pattern of this.suspiciousPatterns) {
        if (pattern.test(payloadStr)) {
          this.createAlert('suspicious_pattern', 'medium', `Suspicious pattern detected in ${event.type} event`);
          break;
        }
      }
    }

    // Check for high risk score
    if (event.details.riskScore > 80) {
      this.createAlert('high_risk_event', 'high', `High risk event detected: ${event.type}`);
    }

    // Check for suspicious IP
    if (this.suspiciousIPs.has(event.source.ip)) {
      this.createAlert('suspicious_ip_access', 'medium', `Access from suspicious IP: ${event.source.ip}`);
    }
  }

  /**
   * Creates a security alert
   */
  private createAlert(type: string, severity: 'low' | 'medium' | 'high' | 'critical', message: string): void {
    const alert: SecurityAlert = {
      id: this.generateEventId(),
      timestamp: new Date(),
      type,
      severity,
      message,
      source: 'security_monitor',
      details: {},
      resolved: false
    };

    this.alerts.push(alert);

    // Log critical alerts
    if (severity === 'critical' || severity === 'high') {
      logger.error('Security Alert', alert);
    }

    // Keep only last 500 alerts
    if (this.alerts.length > 500) {
      this.alerts = this.alerts.slice(-500);
    }
  }

  /**
   * Calculates risk score for an event
   */
  private calculateRiskScore(req: Request, eventType: string): number {
    let score = 0;

    // Base score by event type
    const baseScores: { [key: string]: number } = {
      'login_success': 0,
      'login_failed': 20,
      'logout': 0,
      'token_expired': 10,
      'token_invalid': 30,
      'access_granted': 0,
      'access_denied': 40,
      'privilege_escalation': 90,
      'unauthorized_access': 100,
      'injection': 100,
      'xss': 90,
      'csrf': 80,
      'rate_limit': 30,
      'suspicious_activity': 70,
      'data_breach': 100,
      'file_upload': 20,
      'malicious_file': 100,
      'admin_action': 50
    };

    score += baseScores[eventType] || 0;

    // Add score for suspicious IP
    if (req.ip && this.suspiciousIPs.has(req.ip)) {
      score += 30;
    }

    // Add score for suspicious user agent
    const userAgent = req.get('User-Agent') || '';
    if (userAgent.includes('bot') || userAgent.includes('crawler') || userAgent.length < 10) {
      score += 20;
    }

    // Add score for unusual request patterns
    if (req.path.includes('..') || req.path.includes('admin') || req.path.includes('api')) {
      score += 10;
    }

    return Math.min(score, 100);
  }

  /**
   * Sanitizes payload for logging
   */
  private sanitizePayload(payload: any): any {
    if (!payload) return payload;

    const sanitized = JSON.parse(JSON.stringify(payload));
    
    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
    
    const removeSensitive = (obj: any): any => {
      if (typeof obj === 'object' && obj !== null) {
        for (const key in obj) {
          if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
            obj[key] = '[REDACTED]';
          } else if (typeof obj[key] === 'object') {
            obj[key] = removeSensitive(obj[key]);
          }
        }
      }
      return obj;
    };

    return removeSensitive(sanitized);
  }

  /**
   * Generates unique event ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Gets recent security events
   */
  getRecentEvents(limit: number = 100): SecurityEvent[] {
    return this.events.slice(-limit);
  }

  /**
   * Gets unresolved alerts
   */
  getUnresolvedAlerts(): SecurityAlert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * Gets security statistics
   */
  getSecurityStats(): any {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const events24h = this.events.filter(e => e.timestamp >= last24h);
    const events7d = this.events.filter(e => e.timestamp >= last7d);

    return {
      totalEvents: this.events.length,
      events24h: events24h.length,
      events7d: events7d.length,
      unresolvedAlerts: this.getUnresolvedAlerts().length,
      suspiciousIPs: this.suspiciousIPs.size,
      failedLoginAttempts: Array.from(this.failedLoginAttempts.entries()),
      eventTypes: this.getEventTypeStats(),
      severityDistribution: this.getSeverityDistribution()
    };
  }

  /**
   * Gets event type statistics
   */
  private getEventTypeStats(): { [key: string]: number } {
    const stats: { [key: string]: number } = {};
    this.events.forEach(event => {
      stats[event.type] = (stats[event.type] || 0) + 1;
    });
    return stats;
  }

  /**
   * Gets severity distribution
   */
  private getSeverityDistribution(): { [key: string]: number } {
    const distribution: { [key: string]: number } = {};
    this.events.forEach(event => {
      distribution[event.severity] = (distribution[event.severity] || 0) + 1;
    });
    return distribution;
  }

  /**
   * Resolves an alert
   */
  resolveAlert(alertId: string, resolvedBy: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      alert.resolvedBy = resolvedBy;
      return true;
    }
    return false;
  }

  /**
   * Clears old events and alerts
   */
  cleanup(): void {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    
    this.events = this.events.filter(e => e.timestamp >= cutoff);
    this.alerts = this.alerts.filter(a => a.timestamp >= cutoff);
    
    // Clear old failed login attempts
    this.failedLoginAttempts.clear();
  }
}

export const securityMonitoring = SecurityMonitoringService.getInstance();