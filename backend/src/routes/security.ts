import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { SecurityAuditService } from '@/services/SecurityAuditService';
import { logger } from '@/config/logger';

/**
 * Security Routes
 * Provides security audit and monitoring endpoints
 */

interface SecurityRequest extends FastifyRequest {
  user?: {
    userId: string;
    email: string;
    isAdmin?: boolean;
  };
}

export default async function securityRoutes(fastify: FastifyInstance) {
  // Run security audit (Admin only)
  fastify.post('/audit/run', {
    preHandler: [fastify.authenticate, fastify.requireAdmin],
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                score: { type: 'number' },
                vulnerabilities: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      type: { type: 'string' },
                      severity: { type: 'string' },
                      description: { type: 'string' },
                      recommendation: { type: 'string' },
                      status: { type: 'string' }
                    }
                  }
                },
                recommendations: {
                  type: 'array',
                  items: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  }, async (request: SecurityRequest, reply: FastifyReply) => {
    try {
      logger.info('Security audit requested by admin:', request.user?.email);

      const auditResults = await SecurityAuditService.runSecurityAudit();

      return reply.json({
        success: true,
        message: 'Security audit completed successfully',
        data: auditResults
      });
    } catch (error) {
      logger.error('Security audit failed:', error);
      return reply.status(500).json({
        success: false,
        error: 'Failed to run security audit'
      });
    }
  });

  // Get latest security audit results (Admin only)
  fastify.get('/audit/results', {
    preHandler: [fastify.authenticate, fastify.requireAdmin],
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                score: { type: 'number' },
                vulnerabilities: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      type: { type: 'string' },
                      severity: { type: 'string' },
                      description: { type: 'string' },
                      recommendation: { type: 'string' },
                      status: { type: 'string' }
                    }
                  }
                },
                recommendations: {
                  type: 'array',
                  items: { type: 'string' }
                },
                timestamp: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request: SecurityRequest, reply: FastifyReply) => {
    try {
      const auditResults = await SecurityAuditService.getLatestAuditResults();

      if (!auditResults) {
        return reply.status(404).json({
          success: false,
          error: 'No security audit results found'
        });
      }

      return reply.json({
        success: true,
        data: auditResults
      });
    } catch (error) {
      logger.error('Failed to get audit results:', error);
      return reply.status(500).json({
        success: false,
        error: 'Failed to retrieve security audit results'
      });
    }
  });

  // Get security dashboard data (Admin only)
  fastify.get('/dashboard', {
    preHandler: [fastify.authenticate, fastify.requireAdmin],
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                overallScore: { type: 'number' },
                criticalVulnerabilities: { type: 'number' },
                highVulnerabilities: { type: 'number' },
                mediumVulnerabilities: { type: 'number' },
                lowVulnerabilities: { type: 'number' },
                lastAuditDate: { type: 'string' },
                recommendations: {
                  type: 'array',
                  items: { type: 'string' }
                },
                securityTrends: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      date: { type: 'string' },
                      score: { type: 'number' },
                      vulnerabilities: { type: 'number' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, async (request: SecurityRequest, reply: FastifyReply) => {
    try {
      const auditResults = await SecurityAuditService.getLatestAuditResults();

      if (!auditResults) {
        return reply.status(404).json({
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

      return reply.json({
        success: true,
        data: dashboardData
      });
    } catch (error) {
      logger.error('Failed to get security dashboard:', error);
      return reply.status(500).json({
        success: false,
        error: 'Failed to retrieve security dashboard data'
      });
    }
  });

  // Get security recommendations (Admin only)
  fastify.get('/recommendations', {
    preHandler: [fastify.authenticate, fastify.requireAdmin],
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  category: { type: 'string' },
                  priority: { type: 'string' },
                  title: { type: 'string' },
                  description: { type: 'string' },
                  action: { type: 'string' },
                  estimatedTime: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  }, async (request: SecurityRequest, reply: FastifyReply) => {
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

      return reply.json({
        success: true,
        data: recommendations
      });
    } catch (error) {
      logger.error('Failed to get security recommendations:', error);
      return reply.status(500).json({
        success: false,
        error: 'Failed to retrieve security recommendations'
      });
    }
  });

  // Get security metrics (Admin only)
  fastify.get('/metrics', {
    preHandler: [fastify.authenticate, fastify.requireAdmin],
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                totalUsers: { type: 'number' },
                usersWithMFA: { type: 'number' },
                adminUsers: { type: 'number' },
                adminUsersWithMFA: { type: 'number' },
                failedLoginAttempts: { type: 'number' },
                securityEvents: { type: 'number' },
                lastSecurityAudit: { type: 'string' },
                securityScore: { type: 'number' }
              }
            }
          }
        }
      }
    }
  }, async (request: SecurityRequest, reply: FastifyReply) => {
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

      return reply.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      logger.error('Failed to get security metrics:', error);
      return reply.status(500).json({
        success: false,
        error: 'Failed to retrieve security metrics'
      });
    }
  });
}