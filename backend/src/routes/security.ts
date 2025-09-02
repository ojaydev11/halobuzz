import { Router, Request, Response } from 'express';
import { authMiddleware } from '@/middleware/auth';
import { adminOnly } from '@/middleware/admin';
import { securityMonitoringService } from '@/services/securityMonitoringService';
import { setupLogger } from '@/config/logger';

const router = Router();
const logger = setupLogger();

// All security routes require admin authentication
router.use(authMiddleware);
router.use(adminOnly);

// Get security events
router.get('/events', async (req: Request, res: Response) => {
  try {
    const { limit = 100, type, severity, startDate, endDate } = req.query;
    
    let events = securityMonitoringService.getSecurityEvents(Number(limit));
    
    // Filter by type
    if (type) {
      events = events.filter(event => event.type === type);
    }
    
    // Filter by severity
    if (severity) {
      events = events.filter(event => event.severity === severity);
    }
    
    // Filter by date range
    if (startDate) {
      const start = new Date(startDate as string);
      events = events.filter(event => event.timestamp >= start);
    }
    
    if (endDate) {
      const end = new Date(endDate as string);
      events = events.filter(event => event.timestamp <= end);
    }
    
    res.json({
      events,
      count: events.length,
      total: securityMonitoringService.getSecurityEvents().length
    });
  } catch (error) {
    logger.error('Error getting security events:', error);
    res.status(500).json({ error: 'Failed to get security events' });
  }
});

// Get security alerts
router.get('/alerts', async (req: Request, res: Response) => {
  try {
    const { limit = 50, severity, resolved } = req.query;
    
    let alerts = securityMonitoringService.getSecurityAlerts(Number(limit));
    
    // Filter by severity
    if (severity) {
      alerts = alerts.filter(alert => alert.severity === severity);
    }
    
    // Filter by resolved status
    if (resolved !== undefined) {
      const isResolved = resolved === 'true';
      alerts = alerts.filter(alert => alert.resolved === isResolved);
    }
    
    res.json({
      alerts,
      count: alerts.length,
      total: securityMonitoringService.getSecurityAlerts().length
    });
  } catch (error) {
    logger.error('Error getting security alerts:', error);
    res.status(500).json({ error: 'Failed to get security alerts' });
  }
});

// Resolve security alert
router.put('/alerts/:alertId/resolve', async (req: Request, res: Response) => {
  try {
    const { alertId } = req.params;
    const { resolvedBy } = req.body;
    
    if (!resolvedBy) {
      return res.status(400).json({ error: 'resolvedBy is required' });
    }
    
    const success = await securityMonitoringService.resolveAlert(alertId, resolvedBy);
    
    if (success) {
      res.json({ message: 'Alert resolved successfully' });
    } else {
      res.status(404).json({ error: 'Alert not found' });
    }
  } catch (error) {
    logger.error('Error resolving alert:', error);
    res.status(500).json({ error: 'Failed to resolve alert' });
  }
});

// Get security metrics
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const { limit = 24 } = req.query;
    const metrics = securityMonitoringService.getSecurityMetrics(Number(limit));
    
    res.json({
      metrics,
      count: metrics.length,
      latest: securityMonitoringService.getLatestSecurityMetrics()
    });
  } catch (error) {
    logger.error('Error getting security metrics:', error);
    res.status(500).json({ error: 'Failed to get security metrics' });
  }
});

// Get security dashboard summary
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const latestMetrics = securityMonitoringService.getLatestSecurityMetrics();
    const recentAlerts = securityMonitoringService.getSecurityAlerts(10);
    const recentEvents = securityMonitoringService.getSecurityEvents(20);
    
    if (!latestMetrics) {
      return res.json({
        status: 'no_data',
        message: 'No security metrics available'
      });
    }
    
    // Calculate summary statistics
    const totalAlerts = securityMonitoringService.getSecurityAlerts().length;
    const unresolvedAlerts = recentAlerts.filter(alert => !alert.resolved).length;
    const criticalAlerts = recentAlerts.filter(alert => alert.severity === 'critical').length;
    const highAlerts = recentAlerts.filter(alert => alert.severity === 'high').length;
    
    // Calculate trends (comparing last 2 hours)
    const metrics = securityMonitoringService.getSecurityMetrics(2);
    const trend = metrics.length >= 2 ? {
      events: latestMetrics.totalEvents - metrics[0].totalEvents,
      alerts: totalAlerts - (totalAlerts - recentAlerts.length)
    } : { events: 0, alerts: 0 };
    
    res.json({
      summary: {
        totalEvents: latestMetrics.totalEvents,
        totalAlerts,
        unresolvedAlerts,
        criticalAlerts,
        highAlerts,
        blockedRequests: latestMetrics.blockedRequests,
        suspiciousLogins: latestMetrics.suspiciousLogins,
        dataAccessViolations: latestMetrics.dataAccessViolations
      },
      trends: {
        events: trend.events,
        alerts: trend.alerts
      },
      systemHealth: latestMetrics.systemHealth,
      recentAlerts: recentAlerts.slice(0, 5),
      recentEvents: recentEvents.slice(0, 10),
      topAttackSources: latestMetrics.topAttackSources.slice(0, 5),
      eventsByType: latestMetrics.eventsByType,
      eventsBySeverity: latestMetrics.eventsBySeverity,
      timestamp: latestMetrics.timestamp
    });
  } catch (error) {
    logger.error('Error getting security dashboard:', error);
    res.status(500).json({ error: 'Failed to get security dashboard' });
  }
});

// Get alert configuration
router.get('/config', async (req: Request, res: Response) => {
  try {
    const config = securityMonitoringService.getAlertConfig();
    res.json(config);
  } catch (error) {
    logger.error('Error getting security config:', error);
    res.status(500).json({ error: 'Failed to get security configuration' });
  }
});

// Update alert configuration
router.put('/config', async (req: Request, res: Response) => {
  try {
    const { criticalThreshold, highThreshold, mediumThreshold, lowThreshold, timeWindow, enabled } = req.body;
    
    const config = {
      ...(criticalThreshold !== undefined && { criticalThreshold }),
      ...(highThreshold !== undefined && { highThreshold }),
      ...(mediumThreshold !== undefined && { mediumThreshold }),
      ...(lowThreshold !== undefined && { lowThreshold }),
      ...(timeWindow !== undefined && { timeWindow }),
      ...(enabled !== undefined && { enabled })
    };
    
    securityMonitoringService.updateAlertConfig(config);
    
    logger.info('Security alert configuration updated:', config);
    res.json({ message: 'Security configuration updated successfully', config });
  } catch (error) {
    logger.error('Error updating security config:', error);
    res.status(500).json({ error: 'Failed to update security configuration' });
  }
});

// Get security event statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const { period = '24h' } = req.query;
    
    let timeWindow = 24 * 60 * 60 * 1000; // 24 hours
    if (period === '7d') timeWindow = 7 * 24 * 60 * 60 * 1000;
    if (period === '30d') timeWindow = 30 * 24 * 60 * 60 * 1000;
    
    const cutoffTime = new Date(Date.now() - timeWindow);
    const events = securityMonitoringService.getSecurityEvents().filter(e => e.timestamp > cutoffTime);
    const alerts = securityMonitoringService.getSecurityAlerts().filter(a => a.timestamp > cutoffTime);
    
    // Calculate statistics
    const eventStats = {
      total: events.length,
      byType: events.reduce((acc, event) => {
        acc[event.type] = (acc[event.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      bySeverity: events.reduce((acc, event) => {
        acc[event.severity] = (acc[event.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byHour: events.reduce((acc, event) => {
        const hour = event.timestamp.getHours();
        acc[hour] = (acc[hour] || 0) + 1;
        return acc;
      }, {} as Record<number, number>)
    };
    
    const alertStats = {
      total: alerts.length,
      resolved: alerts.filter(a => a.resolved).length,
      unresolved: alerts.filter(a => !a.resolved).length,
      bySeverity: alerts.reduce((acc, alert) => {
        acc[alert.severity] = (acc[alert.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
    
    res.json({
      period,
      timeWindow,
      events: eventStats,
      alerts: alertStats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting security stats:', error);
    res.status(500).json({ error: 'Failed to get security statistics' });
  }
});

// Export security data
router.get('/export', async (req: Request, res: Response) => {
  try {
    const { type = 'events', format = 'json', startDate, endDate } = req.query;
    
    let data: any[] = [];
    
    if (type === 'events') {
      data = securityMonitoringService.getSecurityEvents();
    } else if (type === 'alerts') {
      data = securityMonitoringService.getSecurityAlerts();
    } else if (type === 'metrics') {
      data = securityMonitoringService.getSecurityMetrics();
    }
    
    // Filter by date range
    if (startDate) {
      const start = new Date(startDate as string);
      data = data.filter(item => item.timestamp >= start);
    }
    
    if (endDate) {
      const end = new Date(endDate as string);
      data = data.filter(item => item.timestamp <= end);
    }
    
    if (format === 'csv') {
      // Convert to CSV format
      const csv = convertToCSV(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="security-${type}-${Date.now()}.csv"`);
      res.send(csv);
    } else {
      res.json({
        type,
        format,
        count: data.length,
        data,
        exportedAt: new Date().toISOString()
      });
    }
  } catch (error) {
    logger.error('Error exporting security data:', error);
    res.status(500).json({ error: 'Failed to export security data' });
  }
});

// Helper function to convert data to CSV
function convertToCSV(data: any[]): string {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];
  
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      if (typeof value === 'object') {
        return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
      }
      return `"${String(value).replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(','));
  }
  
  return csvRows.join('\n');
}

export default router;
