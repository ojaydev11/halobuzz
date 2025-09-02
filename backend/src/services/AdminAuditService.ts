import { setupLogger } from '../config/logger';

const logger = setupLogger();
import { getCache, setCache } from '../config/redis';

export interface AdminAction {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: any;
  ip: string;
  userAgent: string;
  timestamp: Date;
  success: boolean;
  error?: string;
}

export interface AdminSession {
  sessionId: string;
  adminId: string;
  adminEmail: string;
  startTime: Date;
  lastActivity: Date;
  ip: string;
  userAgent: string;
  actions: number;
  isActive: boolean;
}

export class AdminAuditService {
  private static instance: AdminAuditService;
  private activeSessions: Map<string, AdminSession> = new Map();

  public static getInstance(): AdminAuditService {
    if (!AdminAuditService.instance) {
      AdminAuditService.instance = new AdminAuditService();
    }
    return AdminAuditService.instance;
  }

  /**
   * Log an admin action
   */
  async logAction(
    adminId: string,
    adminEmail: string,
    action: string,
    resource: string,
    resourceId: string | undefined,
    details: any,
    req: any,
    success: boolean = true,
    error?: string
  ): Promise<void> {
    try {
      const actionId = `admin_action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const adminAction: AdminAction = {
        id: actionId,
        adminId,
        adminEmail,
        action,
        resource,
        resourceId,
        details,
        ip: req.ip || req.connection?.remoteAddress || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        timestamp: new Date(),
        success,
        error
      };

      // Store in Redis with 90-day retention
      const cacheKey = `admin_action:${actionId}`;
      await setCache(cacheKey, JSON.stringify(adminAction), 86400 * 90);

      // Update session activity
      this.updateSessionActivity(adminId, adminEmail, req);

      // Log to application logs
      if (success) {
        logger.info(`Admin action: ${adminEmail} performed ${action} on ${resource}${resourceId ? ` (${resourceId})` : ''}`, {
          adminId,
          action,
          resource,
          resourceId,
          ip: adminAction.ip
        });
      } else {
        logger.warn(`Admin action failed: ${adminEmail} attempted ${action} on ${resource}${resourceId ? ` (${resourceId})` : ''}`, {
          adminId,
          action,
          resource,
          resourceId,
          ip: adminAction.ip,
          error
        });
      }

    } catch (error) {
      logger.error('Failed to log admin action:', error);
    }
  }

  /**
   * Start an admin session
   */
  startSession(adminId: string, adminEmail: string, req: any): string {
    const sessionId = `admin_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const session: AdminSession = {
      sessionId,
      adminId,
      adminEmail,
      startTime: new Date(),
      lastActivity: new Date(),
      ip: req.ip || req.connection?.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown',
      actions: 0,
      isActive: true
    };

    this.activeSessions.set(sessionId, session);
    
    logger.info(`Admin session started: ${adminEmail} from IP ${session.ip}`, {
      sessionId,
      adminId,
      adminEmail,
      ip: session.ip
    });

    return sessionId;
  }

  /**
   * End an admin session
   */
  endSession(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.isActive = false;
      
      const duration = Date.now() - session.startTime.getTime();
      logger.info(`Admin session ended: ${session.adminEmail} (${Math.round(duration / 1000)}s, ${session.actions} actions)`, {
        sessionId,
        adminId: session.adminId,
        adminEmail: session.adminEmail,
        duration: Math.round(duration / 1000),
        actions: session.actions
      });

      this.activeSessions.delete(sessionId);
    }
  }

  /**
   * Update session activity
   */
  private updateSessionActivity(adminId: string, adminEmail: string, req: any): void {
    // Find active session for this admin
    const session = Array.from(this.activeSessions.values())
      .find(s => s.adminId === adminId && s.isActive);

    if (session) {
      session.lastActivity = new Date();
      session.actions++;
    }
  }

  /**
   * Get admin action history
   */
  async getActionHistory(
    adminId?: string,
    action?: string,
    resource?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<AdminAction[]> {
    try {
      // In a real implementation, this would query a database
      // For now, return empty array
      return [];
    } catch (error) {
      logger.error('Failed to get admin action history:', error);
      return [];
    }
  }

  /**
   * Get active admin sessions
   */
  getActiveSessions(): AdminSession[] {
    return Array.from(this.activeSessions.values())
      .filter(session => session.isActive);
  }

  /**
   * Get admin session statistics
   */
  getSessionStats(): {
    totalActiveSessions: number;
    totalActionsToday: number;
    mostActiveAdmin: string | null;
  } {
    const activeSessions = this.getActiveSessions();
    const totalActionsToday = activeSessions.reduce((sum, session) => sum + session.actions, 0);
    
    let mostActiveAdmin: string | null = null;
    let maxActions = 0;
    
    activeSessions.forEach(session => {
      if (session.actions > maxActions) {
        maxActions = session.actions;
        mostActiveAdmin = session.adminEmail;
      }
    });

    return {
      totalActiveSessions: activeSessions.length,
      totalActionsToday,
      mostActiveAdmin
    };
  }

  /**
   * Check for suspicious admin activity
   */
  async checkSuspiciousActivity(adminId: string, action: string, req: any): Promise<{
    suspicious: boolean;
    reason?: string;
    riskScore: number;
  }> {
    try {
      let riskScore = 0;
      const reasons: string[] = [];

      // Check for rapid actions (more than 10 actions in 1 minute)
      const recentActions = await this.getRecentActions(adminId, 60000); // 1 minute
      if (recentActions.length > 10) {
        riskScore += 30;
        reasons.push('Rapid action pattern detected');
      }

      // Check for actions from new IP
      const ip = req.ip || req.connection?.remoteAddress || 'unknown';
      const recentIPs = await this.getRecentIPs(adminId, 86400000); // 24 hours
      if (!recentIPs.includes(ip)) {
        riskScore += 20;
        reasons.push('Action from new IP address');
      }

      // Check for high-risk actions
      const highRiskActions = ['delete', 'ban', 'suspend', 'emergency_disable'];
      if (highRiskActions.includes(action.toLowerCase())) {
        riskScore += 25;
        reasons.push('High-risk action performed');
      }

      // Check for bulk operations
      if (action.toLowerCase().includes('bulk') || action.toLowerCase().includes('batch')) {
        riskScore += 15;
        reasons.push('Bulk operation detected');
      }

      return {
        suspicious: riskScore > 50,
        reason: reasons.length > 0 ? reasons.join(', ') : undefined,
        riskScore
      };
    } catch (error) {
      logger.error('Failed to check suspicious activity:', error);
      return { suspicious: false, riskScore: 0 };
    }
  }

  /**
   * Get recent actions for an admin
   */
  private async getRecentActions(adminId: string, timeWindow: number): Promise<AdminAction[]> {
    try {
      // In a real implementation, this would query Redis or database
      return [];
    } catch (error) {
      logger.error('Failed to get recent actions:', error);
      return [];
    }
  }

  /**
   * Get recent IPs for an admin
   */
  private async getRecentIPs(adminId: string, timeWindow: number): Promise<string[]> {
    try {
      // In a real implementation, this would query Redis or database
      return [];
    } catch (error) {
      logger.error('Failed to get recent IPs:', error);
      return [];
    }
  }

  /**
   * Generate admin activity report
   */
  async generateActivityReport(
    startDate: Date,
    endDate: Date,
    adminId?: string
  ): Promise<{
    totalActions: number;
    uniqueAdmins: number;
    topActions: Array<{ action: string; count: number }>;
    topAdmins: Array<{ adminEmail: string; count: number }>;
    riskEvents: number;
  }> {
    try {
      // In a real implementation, this would query the database
      return {
        totalActions: 0,
        uniqueAdmins: 0,
        topActions: [],
        topAdmins: [],
        riskEvents: 0
      };
    } catch (error) {
      logger.error('Failed to generate activity report:', error);
      throw error;
    }
  }
}

export const adminAuditService = AdminAuditService.getInstance();
