import { Router, Response } from 'express';
import { AuthenticatedRequest } from '@/middleware/auth';
import { SecurityAuditService } from '@/services/SecurityAuditService';
import { authMiddleware } from '@/middleware/auth';
import { socialLimiter } from '@/middleware/security';
import { logger } from '@/config/logger';

const router = Router();

// Apply authentication and rate limiting to all routes
router.use(authMiddleware);
router.use(socialLimiter);

/**
 * Security Routes
 * Provides security audit and monitoring endpoints
 */

// Run security audit (Admin only)
router.post('/audit/run', async (req: AuthenticatedRequest, res: Response) => {
  try {
    logger.info('Security audit requested by admin:', req.user?.email);

    const auditResults = await SecurityAuditService.runSecurityAudit();

    return res.json({
      success: true,
      message: 'Security audit completed successfully',
      data: auditResults
    });
  } catch (error) {
    logger.error('Security audit failed:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to run security audit'
    });
  }
});

// Get latest security audit results (Admin only)
router.get('/audit/results', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const auditResults = await SecurityAuditService.getLatestAuditResults();

    if (!auditResults) {
      return res.status(404).json({
        success: false,
        error: 'No security audit results found'
      });
    }

    return res.json({
      success: true,
      data: auditResults
    });
  } catch (error) {
    logger.error('Failed to get audit results:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve security audit results'
    });
  }
});

// Get security dashboard data (Admin only)
router.get('/dashboard', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const auditResults = await SecurityAuditService.getLatestAuditResults();

    if (!auditResults) {
      return res.status(404).json({
        success: false,
        error: 'No security audit data available'
      });
    }

    // Calculate vulnerability counts by severity
    const vulnerabilities = auditResults.vulnerabilities || [];
    const criticalVulns = vulnerabilities.filter(v => v.severity === 'critical').length;
    const highVulns = vulnerabilities.filter(v => v.severity === 'high').length;
    const mediumVulns = vulnerabilities.filter(v => v.severity === 'medium').length;
    const lowVulns = vulnerabilities.filter(v => v.severity === 'low').length;

    // Generate security trends (mock data for now)
    const securityTrends = [
      { date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), score: 85, vulnerabilities: 8 },
      { date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(), score: 82, vulnerabilities: 10 },
      { date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), score: 80, vulnerabilities: 12 },
      { date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), score: 78, vulnerabilities: 14 },
      { date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), score: 75, vulnerabilities: 16 },
      { date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), score: 72, vulnerabilities: 18 },
      { date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), score: 70, vulnerabilities: 20 },
      { date: auditResults.timestamp, score: auditResults.score, vulnerabilities: vulnerabilities.length }
    ];

    const dashboardData = {
      overallScore: auditResults.score,
      criticalVulnerabilities: criticalVulns,
      highVulnerabilities: highVulns,
      mediumVulnerabilities: mediumVulns,
      lowVulnerabilities: lowVulns,
      lastAuditDate: auditResults.timestamp,
      recommendations: auditResults.recommendations || [],
      securityTrends
    };

    return res.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    logger.error('Failed to get security dashboard:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve security dashboard data'
    });
  }
});

// Get security recommendations (Admin only)
router.get('/recommendations', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const recommendations = [
      {
        category: 'Authentication',
        priority: 'High',
        title: 'Enable Multi-Factor Authentication',
        description: 'Implement MFA for all admin accounts to prevent unauthorized access',
        action: 'Configure TOTP-based MFA for admin users',
        estimatedTime: '2-4 hours'
      },
      {
        category: 'Dependencies',
        priority: 'Medium',
        title: 'Update Vulnerable Dependencies',
        description: 'Update packages with known security vulnerabilities',
        action: 'Run npm audit fix and update packages manually',
        estimatedTime: '1-2 hours'
      },
      {
        category: 'Configuration',
        priority: 'High',
        title: 'Strengthen JWT Configuration',
        description: 'Use stronger JWT secrets and implement proper token rotation',
        action: 'Generate new JWT secret and implement token refresh',
        estimatedTime: '1 hour'
      },
      {
        category: 'Monitoring',
        priority: 'Medium',
        title: 'Implement Security Monitoring',
        description: 'Set up real-time security monitoring and alerting',
        action: 'Configure security event logging and alerting system',
        estimatedTime: '4-6 hours'
      },
      {
        category: 'Network',
        priority: 'High',
        title: 'Enable HTTPS Everywhere',
        description: 'Ensure all communications are encrypted with HTTPS',
        action: 'Configure SSL/TLS certificates and redirect HTTP to HTTPS',
        estimatedTime: '2-3 hours'
      },
      {
        category: 'Data Protection',
        priority: 'High',
        title: 'Implement Data Encryption',
        description: 'Encrypt sensitive data at rest and in transit',
        action: 'Configure database encryption and implement field-level encryption',
        estimatedTime: '6-8 hours'
      }
    ];

    return res.json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    logger.error('Failed to get security recommendations:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve security recommendations'
    });
  }
});

// Get security metrics (Admin only)
router.get('/metrics', async (req: AuthenticatedRequest, res: Response) => {
  try {
    // This would typically fetch from a security metrics database
    // For now, we'll return mock data
    const metrics = {
      totalUsers: 1250,
      usersWithMFA: 89,
      adminUsers: 5,
      adminUsersWithMFA: 3,
      failedLoginAttempts: 23,
      securityEvents: 156,
      lastSecurityAudit: new Date().toISOString(),
      securityScore: 78
    };

    return res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    logger.error('Failed to get security metrics:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve security metrics'
    });
  }
});

export default router;