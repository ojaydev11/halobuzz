import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '@/config/logger';
import { User } from '@/models/User';
import { getCache, setCache } from '@/config/redis';

const execAsync = promisify(exec);

/**
 * Security Audit Service
 * Performs comprehensive security audits and vulnerability assessments
 */
export class SecurityAuditService {
  private static readonly AUDIT_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly VULNERABILITY_THRESHOLD = 5; // Max vulnerabilities before alert

  /**
   * Run comprehensive security audit
   */
  static async runSecurityAudit(): Promise<{
    score: number;
    vulnerabilities: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
      recommendation: string;
      status: 'fixed' | 'pending' | 'ignored';
    }>;
    recommendations: string[];
  }> {
    logger.info('Starting comprehensive security audit...');

    const vulnerabilities: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
      recommendation: string;
      status: 'fixed' | 'pending' | 'ignored';
    }> = [];

    const recommendations: string[] = [];

    try {
      // 1. Dependency vulnerability check
      const dependencyAudit = await this.checkDependencyVulnerabilities();
      vulnerabilities.push(...dependencyAudit.vulnerabilities);
      recommendations.push(...dependencyAudit.recommendations);

      // 2. Configuration security check
      const configAudit = await this.checkConfigurationSecurity();
      vulnerabilities.push(...configAudit.vulnerabilities);
      recommendations.push(...configAudit.recommendations);

      // 3. Database security check
      const dbAudit = await this.checkDatabaseSecurity();
      vulnerabilities.push(...dbAudit.vulnerabilities);
      recommendations.push(...dbAudit.recommendations);

      // 4. Authentication security check
      const authAudit = await this.checkAuthenticationSecurity();
      vulnerabilities.push(...authAudit.vulnerabilities);
      recommendations.push(...authAudit.recommendations);

      // 5. API security check
      const apiAudit = await this.checkAPISecurity();
      vulnerabilities.push(...apiAudit.vulnerabilities);
      recommendations.push(...apiAudit.recommendations);

      // 6. File upload security check
      const uploadAudit = await this.checkFileUploadSecurity();
      vulnerabilities.push(...uploadAudit.vulnerabilities);
      recommendations.push(...uploadAudit.recommendations);

      // Calculate security score
      const score = this.calculateSecurityScore(vulnerabilities);

      // Store audit results
      await this.storeAuditResults({
        score,
        vulnerabilities,
        recommendations,
        timestamp: new Date()
      });

      // Alert if critical vulnerabilities found
      const criticalVulns = vulnerabilities.filter(v => v.severity === 'critical');
      if (criticalVulns.length > 0) {
        await this.sendSecurityAlert(criticalVulns);
      }

      logger.info(`Security audit completed. Score: ${score}/100`);

      return {
        score,
        vulnerabilities,
        recommendations
      };
    } catch (error) {
      logger.error('Security audit failed:', error);
      throw error;
    }
  }

  /**
   * Check for dependency vulnerabilities
   */
  private static async checkDependencyVulnerabilities(): Promise<{
    vulnerabilities: any[];
    recommendations: string[];
  }> {
    const vulnerabilities: any[] = [];
    const recommendations: string[] = [];

    try {
      // Run npm audit
      const { stdout } = await execAsync('npm audit --json');
      const auditResult = JSON.parse(stdout);

      if (auditResult.vulnerabilities) {
        Object.entries(auditResult.vulnerabilities).forEach(([packageName, vuln]: [string, any]) => {
          const severity = this.mapSeverity(vuln.severity);
          vulnerabilities.push({
            type: 'dependency_vulnerability',
            severity,
            description: `Vulnerability in ${packageName}: ${vuln.title}`,
            recommendation: `Update ${packageName} to version ${vuln.fixAvailable?.version || 'latest'}`,
            status: 'pending'
          });
        });
      }

      recommendations.push('Run "npm audit fix" to automatically fix vulnerabilities');
      recommendations.push('Consider using tools like Snyk or Dependabot for continuous monitoring');
    } catch (error) {
      logger.warn('Dependency audit failed:', error);
      vulnerabilities.push({
        type: 'audit_failure',
        severity: 'medium',
        description: 'Failed to run dependency audit',
        recommendation: 'Manually check for outdated packages',
        status: 'pending'
      });
    }

    return { vulnerabilities, recommendations };
  }

  /**
   * Check configuration security
   */
  private static async checkConfigurationSecurity(): Promise<{
    vulnerabilities: any[];
    recommendations: string[];
  }> {
    const vulnerabilities: any[] = [];
    const recommendations: string[] = [];

    // Check environment variables
    const requiredEnvVars = [
      'JWT_SECRET',
      'MONGODB_URI',
      'REDIS_URL',
      'ENCRYPTION_KEY'
    ];

    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
    if (missingEnvVars.length > 0) {
      vulnerabilities.push({
        type: 'missing_env_vars',
        severity: 'critical',
        description: `Missing required environment variables: ${missingEnvVars.join(', ')}`,
        recommendation: 'Set all required environment variables',
        status: 'pending'
      });
    }

    // Check for weak secrets
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
      vulnerabilities.push({
        type: 'weak_jwt_secret',
        severity: 'high',
        description: 'JWT secret is too short (less than 32 characters)',
        recommendation: 'Use a JWT secret with at least 32 characters',
        status: 'pending'
      });
    }

    // Check for default passwords
    const defaultPasswords = ['password', 'admin', '123456', 'secret'];
    if (process.env.JWT_SECRET && defaultPasswords.includes(process.env.JWT_SECRET)) {
      vulnerabilities.push({
        type: 'default_password',
        severity: 'critical',
        description: 'Using default/weak JWT secret',
        recommendation: 'Change JWT secret to a strong, unique value',
        status: 'pending'
      });
    }

    recommendations.push('Use strong, unique secrets for all authentication');
    recommendations.push('Enable HTTPS in production');
    recommendations.push('Use environment-specific configuration files');

    return { vulnerabilities, recommendations };
  }

  /**
   * Check database security
   */
  private static async checkDatabaseSecurity(): Promise<{
    vulnerabilities: any[];
    recommendations: string[];
  }> {
    const vulnerabilities: any[] = [];
    const recommendations: string[] = [];

    try {
      // Check for users with weak passwords
      const usersWithWeakPasswords = await User.find({
        $or: [
          { password: { $regex: /^.{1,7}$/ } }, // Less than 8 characters
          { password: { $regex: /^(password|123456|admin)$/i } } // Common passwords
        ]
      }).limit(10);

      if (usersWithWeakPasswords.length > 0) {
        vulnerabilities.push({
          type: 'weak_user_passwords',
          severity: 'high',
          description: `${usersWithWeakPasswords.length} users have weak passwords`,
          recommendation: 'Enforce strong password policies',
          status: 'pending'
        });
      }

      // Check for users without MFA
      const usersWithoutMFA = await User.countDocuments({
        mfaEnabled: { $ne: true },
        isAdmin: true // Focus on admin users
      });

      if (usersWithoutMFA > 0) {
        vulnerabilities.push({
          type: 'admin_without_mfa',
          severity: 'high',
          description: `${usersWithoutMFA} admin users don't have MFA enabled`,
          recommendation: 'Enable MFA for all admin users',
          status: 'pending'
        });
      }

      recommendations.push('Enable MongoDB authentication');
      recommendations.push('Use MongoDB connection string with authentication');
      recommendations.push('Enable MongoDB encryption at rest');
    } catch (error) {
      logger.warn('Database security check failed:', error);
    }

    return { vulnerabilities, recommendations };
  }

  /**
   * Check authentication security
   */
  private static async checkAuthenticationSecurity(): Promise<{
    vulnerabilities: any[];
    recommendations: string[];
  }> {
    const vulnerabilities: any[] = [];
    const recommendations: string[] = [];

    // Check JWT configuration
    if (!process.env.JWT_SECRET) {
      vulnerabilities.push({
        type: 'missing_jwt_secret',
        severity: 'critical',
        description: 'JWT secret is not configured',
        recommendation: 'Set JWT_SECRET environment variable',
        status: 'pending'
      });
    }

    // Check session configuration
    const sessionTimeout = parseInt(process.env.SESSION_TIMEOUT || '86400'); // 24 hours default
    if (sessionTimeout > 86400) { // More than 24 hours
      vulnerabilities.push({
        type: 'long_session_timeout',
        severity: 'medium',
        description: `Session timeout is too long: ${sessionTimeout} seconds`,
        recommendation: 'Reduce session timeout to 24 hours or less',
        status: 'pending'
      });
    }

    recommendations.push('Implement rate limiting on authentication endpoints');
    recommendations.push('Use secure session storage');
    recommendations.push('Implement account lockout after failed attempts');

    return { vulnerabilities, recommendations };
  }

  /**
   * Check API security
   */
  private static async checkAPISecurity(): Promise<{
    vulnerabilities: any[];
    recommendations: string[];
  }> {
    const vulnerabilities: any[] = [];
    const recommendations: string[] = [];

    // Check CORS configuration
    const corsOrigin = process.env.CORS_ORIGIN;
    if (corsOrigin === '*' || corsOrigin === 'true') {
      vulnerabilities.push({
        type: 'permissive_cors',
        severity: 'medium',
        description: 'CORS is configured to allow all origins',
        recommendation: 'Restrict CORS to specific domains',
        status: 'pending'
      });
    }

    // Check rate limiting
    const rateLimitEnabled = process.env.RATE_LIMIT_ENABLED === 'true';
    if (!rateLimitEnabled) {
      vulnerabilities.push({
        type: 'no_rate_limiting',
        severity: 'medium',
        description: 'Rate limiting is not enabled',
        recommendation: 'Enable rate limiting on all API endpoints',
        status: 'pending'
      });
    }

    recommendations.push('Implement API versioning');
    recommendations.push('Use HTTPS for all API communications');
    recommendations.push('Implement request/response logging');

    return { vulnerabilities, recommendations };
  }

  /**
   * Check file upload security
   */
  private static async checkFileUploadSecurity(): Promise<{
    vulnerabilities: any[];
    recommendations: string[];
  }> {
    const vulnerabilities: any[] = [];
    const recommendations: string[] = [];

    // Check file size limits
    const maxFileSize = parseInt(process.env.MAX_FILE_SIZE || '10485760'); // 10MB default
    if (maxFileSize > 50 * 1024 * 1024) { // More than 50MB
      vulnerabilities.push({
        type: 'large_file_size_limit',
        severity: 'medium',
        description: `File size limit is too large: ${maxFileSize} bytes`,
        recommendation: 'Reduce file size limit to 50MB or less',
        status: 'pending'
      });
    }

    // Check allowed file types
    const allowedFileTypes = process.env.ALLOWED_FILE_TYPES?.split(',') || ['image/jpeg', 'image/png'];
    if (allowedFileTypes.includes('*') || allowedFileTypes.includes('application/*')) {
      vulnerabilities.push({
        type: 'permissive_file_types',
        severity: 'high',
        description: 'File type restrictions are too permissive',
        recommendation: 'Restrict file types to specific image formats only',
        status: 'pending'
      });
    }

    recommendations.push('Implement virus scanning for uploaded files');
    recommendations.push('Store uploaded files outside web root');
    recommendations.push('Implement file content validation');

    return { vulnerabilities, recommendations };
  }

  /**
   * Calculate security score based on vulnerabilities
   */
  private static calculateSecurityScore(vulnerabilities: any[]): number {
    let score = 100;

    vulnerabilities.forEach(vuln => {
      switch (vuln.severity) {
        case 'critical':
          score -= 20;
          break;
        case 'high':
          score -= 15;
          break;
        case 'medium':
          score -= 10;
          break;
        case 'low':
          score -= 5;
          break;
      }
    });

    return Math.max(0, score);
  }

  /**
   * Map severity levels
   */
  private static mapSeverity(severity: string): 'low' | 'medium' | 'high' | 'critical' {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return 'critical';
      case 'high':
        return 'high';
      case 'moderate':
        return 'medium';
      case 'low':
        return 'low';
      default:
        return 'medium';
    }
  }

  /**
   * Store audit results
   */
  private static async storeAuditResults(results: any): Promise<void> {
    try {
      await setCache('security_audit_results', results, 7 * 24 * 60 * 60); // 7 days
      logger.info('Security audit results stored');
    } catch (error) {
      logger.error('Failed to store audit results:', error);
    }
  }

  /**
   * Send security alert
   */
  private static async sendSecurityAlert(vulnerabilities: any[]): Promise<void> {
    try {
      const alertData = {
        timestamp: new Date(),
        type: 'security_alert',
        vulnerabilities: vulnerabilities.map(v => ({
          type: v.type,
          severity: v.severity,
          description: v.description
        }))
      };

      // Log critical security alert
      logger.error('CRITICAL SECURITY ALERT', alertData);

      // In production, this would send notifications to security team
      // await this.sendEmailAlert(alertData);
      // await this.sendSlackAlert(alertData);
    } catch (error) {
      logger.error('Failed to send security alert:', error);
    }
  }

  /**
   * Get latest audit results
   */
  static async getLatestAuditResults(): Promise<any> {
    try {
      const results = await getCache('security_audit_results');
      return results;
    } catch (error) {
      logger.error('Failed to get audit results:', error);
      return null;
    }
  }

  /**
   * Schedule regular security audits
   */
  static scheduleSecurityAudits(): void {
    setInterval(async () => {
      try {
        await this.runSecurityAudit();
      } catch (error) {
        logger.error('Scheduled security audit failed:', error);
      }
    }, this.AUDIT_INTERVAL);

    logger.info('Security audits scheduled every 24 hours');
  }
}
