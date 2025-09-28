import { logger } from '../config/logger';
import ReportGeneratorService from './ReportGeneratorService';
import { AnalyticsDailyKPI } from '../analytics/models/AnalyticsDailyKPI';
import { AnalyticsAlert } from '../analytics/models/AnalyticsAlert';
import { AnalyticsForecast } from '../analytics/models/AnalyticsForecast';
import * as fs from 'fs';
import * as path from 'path';
import * as cron from 'node-cron';

export interface ExportOptions {
  period: 'weekly' | 'monthly';
  format: 'pdf' | 'xlsx' | 'both';
  country?: string;
  appId?: string;
  includeEmpire?: boolean;
}

export interface SyncConfig {
  driveSyncDir?: string;
  shivxSyncDir?: string;
  localSyncDir?: string;
}

export class OfflineExportService {
  private reportGenerator: ReportGeneratorService;
  private syncConfig: SyncConfig;
  private exportsDir: string;

  constructor() {
    this.reportGenerator = new ReportGeneratorService();
    this.syncConfig = {
      driveSyncDir: process.env.DRIVE_SYNC_DIR,
      shivxSyncDir: process.env.SHIVX_SYNC_DIR,
      localSyncDir: process.env.LOCAL_SYNC_DIR
    };
    this.exportsDir = process.env.OFFLINE_EXPORTS_DIR || './storage/exports';
    this.ensureExportsDirectory();
  }

  private ensureExportsDirectory(): void {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const fullPath = path.join(this.exportsDir, 'empire', String(year), month);
    
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  }

  /**
   * Generate weekly offline exports for HaloBuzz and Empire
   */
  async generateWeeklyExports(): Promise<void> {
    try {
      logger.info('Starting weekly offline exports generation');

      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const weekNumber = this.getWeekNumber(now);

      // Generate HaloBuzz weekly report
      await this.generateAppReport('halobuzz', 'weekly', year, month, weekNumber);

      // Generate Empire aggregated report
      await this.generateEmpireReport('weekly', year, month, weekNumber);

      // Sync to configured directories
      await this.syncExports(year, month, weekNumber);

      logger.info('Weekly offline exports completed successfully');

    } catch (error) {
      logger.error('Failed to generate weekly offline exports:', error);
      throw error;
    }
  }

  /**
   * Generate monthly offline exports for HaloBuzz and Empire
   */
  async generateMonthlyExports(): Promise<void> {
    try {
      logger.info('Starting monthly offline exports generation');

      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');

      // Generate HaloBuzz monthly report
      await this.generateAppReport('halobuzz', 'monthly', year, month);

      // Generate Empire aggregated report
      await this.generateEmpireReport('monthly', year, month);

      // Sync to configured directories
      await this.syncExports(year, month);

      logger.info('Monthly offline exports completed successfully');

    } catch (error) {
      logger.error('Failed to generate monthly offline exports:', error);
      throw error;
    }
  }

  private async generateAppReport(appId: string, period: 'weekly' | 'monthly', year: number, month: string, weekNumber?: number): Promise<void> {
    try {
      const reportOptions = {
        period: period === 'weekly' ? 'weekly' : 'monthly',
        format: 'both' as const,
        country: 'ALL',
        userId: 'system'
      };

      // Generate PDF report
      const pdfBuffer = await this.reportGenerator.generateReport({
        ...reportOptions,
        format: 'pdf' as const,
        period: reportOptions.period as 'daily' | 'weekly' | 'monthly' | 'custom'
      });

      // Generate XLSX report
      const xlsxBuffer = await this.reportGenerator.generateReport({
        ...reportOptions,
        format: 'xlsx' as const,
        period: reportOptions.period as 'daily' | 'weekly' | 'monthly' | 'custom'
      });

      // Save files
      const filenamePrefix = weekNumber ? `${appId}-${period}-${year}-${month}-W${weekNumber}` : `${appId}-${period}-${year}-${month}`;
      
      const pdfPath = path.join(this.exportsDir, 'empire', String(year), month, `${filenamePrefix}.pdf`);
      const xlsxPath = path.join(this.exportsDir, 'empire', String(year), month, `${filenamePrefix}.xlsx`);

      fs.writeFileSync(pdfPath, pdfBuffer);
      fs.writeFileSync(xlsxPath, xlsxBuffer);

      logger.info(`Generated ${appId} ${period} report`, { pdfPath, xlsxPath });

    } catch (error) {
      logger.error(`Failed to generate ${appId} ${period} report:`, error);
      throw error;
    }
  }

  private async generateEmpireReport(period: 'weekly' | 'monthly', year: number, month: string, weekNumber?: number): Promise<void> {
    try {
      // Get Empire dashboard data
      const empireData = await this.getEmpireDashboardData(period);

      // Generate Empire PDF report
      const empirePdfBuffer = await this.generateEmpirePDFReport(empireData, period);

      // Generate Empire XLSX report
      const empireXlsxBuffer = await this.generateEmpireXLSXReport(empireData, period);

      // Save files
      const filenamePrefix = weekNumber ? `empire-${period}-${year}-${month}-W${weekNumber}` : `empire-${period}-${year}-${month}`;
      
      const pdfPath = path.join(this.exportsDir, 'empire', String(year), month, `${filenamePrefix}.pdf`);
      const xlsxPath = path.join(this.exportsDir, 'empire', String(year), month, `${filenamePrefix}.xlsx`);

      fs.writeFileSync(pdfPath, empirePdfBuffer);
      fs.writeFileSync(xlsxPath, empireXlsxBuffer);

      logger.info(`Generated Empire ${period} report`, { pdfPath, xlsxPath });

    } catch (error) {
      logger.error(`Failed to generate Empire ${period} report:`, error);
      throw error;
    }
  }

  private async getEmpireDashboardData(period: 'weekly' | 'monthly'): Promise<any> {
    const now = new Date();
    const to = new Date(now);
    to.setHours(23, 59, 59, 999);

    const from = new Date(now);
    if (period === 'weekly') {
      from.setDate(from.getDate() - 7);
    } else {
      from.setMonth(from.getMonth() - 1);
    }
    from.setHours(0, 0, 0, 0);

    // Get all unique app IDs
    const uniqueAppIds = await AnalyticsDailyKPI.distinct('appId', {
      date: { $gte: from, $lte: to }
    });

    const apps: any[] = [];
    let totalRevenue = 0;
    let totalDAU = 0;
    let totalMAU = 0;
    let totalARPU = 0;
    let totalPayerRate = 0;
    let totalAlerts = 0;
    let activeAlerts = 0;
    let totalSafetyScore = 0;
    let totalGrowthRate = 0;

    // Process each app
    for (const appId of uniqueAppIds) {
      const kpiData = await AnalyticsDailyKPI.find({
        appId,
        date: { $gte: from, $lte: to }
      }).sort({ date: 1 });

      if (kpiData.length === 0) continue;

      const appRevenue = kpiData.reduce((sum, kpi) => sum + kpi.revenue.total, 0);
      const appDAU = kpiData.reduce((sum, kpi) => sum + kpi.engagement.dau, 0);
      const appMAU = Math.max(...kpiData.map(kpi => kpi.engagement.mau));
      const appARPU = kpiData.reduce((sum, kpi) => sum + kpi.monetization.arpu, 0) / kpiData.length;
      const appPayerRate = kpiData.reduce((sum, kpi) => sum + kpi.monetization.payerRate, 0) / kpiData.length;
      const appSafetyScore = kpiData.reduce((sum, kpi) => sum + kpi.safety.safetyScore, 0) / kpiData.length;

      // Calculate growth rate
      const firstPeriodRevenue = kpiData[0]?.revenue.total || 0;
      const lastPeriodRevenue = kpiData[kpiData.length - 1]?.revenue.total || 0;
      const appGrowthRate = firstPeriodRevenue > 0 ? 
        ((lastPeriodRevenue - firstPeriodRevenue) / firstPeriodRevenue) * 100 : 0;

      // Get alert data
      const appAlerts = await AnalyticsAlert.find({
        appId,
        createdAt: { $gte: from, $lte: to }
      });
      const appActiveAlerts = appAlerts.filter(alert => alert.status === 'active').length;

      const appSummary = {
        appId,
        totalRevenue: appRevenue,
        totalDAU: appDAU,
        totalMAU: appMAU,
        avgARPU: appARPU,
        avgPayerRate: appPayerRate,
        totalAlerts: appAlerts.length,
        activeAlerts: appActiveAlerts,
        safetyScore: appSafetyScore,
        growthRate: appGrowthRate
      };

      apps.push(appSummary);

      // Accumulate totals
      totalRevenue += appRevenue;
      totalDAU += appDAU;
      totalMAU += appMAU;
      totalARPU += appARPU;
      totalPayerRate += appPayerRate;
      totalAlerts += appAlerts.length;
      activeAlerts += appActiveAlerts;
      totalSafetyScore += appSafetyScore;
      totalGrowthRate += appGrowthRate;
    }

    return {
      summary: {
        totalApps: apps.length,
        totalRevenue,
        totalDAU,
        totalMAU,
        avgARPU: apps.length > 0 ? totalARPU / apps.length : 0,
        avgPayerRate: apps.length > 0 ? totalPayerRate / apps.length : 0,
        totalAlerts,
        activeAlerts,
        avgSafetyScore: apps.length > 0 ? totalSafetyScore / apps.length : 0,
        overallGrowthRate: apps.length > 0 ? totalGrowthRate / apps.length : 0
      },
      apps,
      period: {
        from: from.toISOString().split('T')[0],
        to: to.toISOString().split('T')[0]
      },
      generatedAt: new Date().toISOString()
    };
  }

  private async generateEmpirePDFReport(empireData: any, period: string): Promise<Buffer> {
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>HaloBuzz Empire ${period.charAt(0).toUpperCase() + period.slice(1)} Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .section { margin-bottom: 30px; }
        .metric { display: inline-block; margin: 10px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .metric-value { font-size: 24px; font-weight: bold; color: #007bff; }
        .metric-label { font-size: 14px; color: #666; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>HaloBuzz Empire ${period.charAt(0).toUpperCase() + period.slice(1)} Report</h1>
        <p>Generated on ${empireData.generatedAt}</p>
        <p>Period: ${empireData.period.from} to ${empireData.period.to}</p>
    </div>

    <div class="section">
        <h2>Empire Summary</h2>
        <div class="metric">
            <div class="metric-value">${empireData.summary.totalApps}</div>
            <div class="metric-label">Total Apps</div>
        </div>
        <div class="metric">
            <div class="metric-value">${empireData.summary.totalRevenue.toLocaleString()}</div>
            <div class="metric-label">Total Revenue</div>
        </div>
        <div class="metric">
            <div class="metric-value">${empireData.summary.totalDAU.toLocaleString()}</div>
            <div class="metric-label">Total DAU</div>
        </div>
        <div class="metric">
            <div class="metric-value">${empireData.summary.totalMAU.toLocaleString()}</div>
            <div class="metric-label">Total MAU</div>
        </div>
    </div>

    <div class="section">
        <h2>App Performance</h2>
        <table>
            <tr><th>App ID</th><th>Revenue</th><th>DAU</th><th>MAU</th><th>ARPU</th><th>Payer Rate</th><th>Active Alerts</th><th>Safety Score</th><th>Growth Rate</th></tr>
            ${empireData.apps.map((app: any) => `
                <tr>
                    <td>${app.appId}</td>
                    <td>${app.totalRevenue.toLocaleString()}</td>
                    <td>${app.totalDAU.toLocaleString()}</td>
                    <td>${app.totalMAU.toLocaleString()}</td>
                    <td>${app.avgARPU.toFixed(2)}</td>
                    <td>${app.avgPayerRate.toFixed(2)}%</td>
                    <td>${app.activeAlerts}</td>
                    <td>${app.safetyScore.toFixed(1)}</td>
                    <td>${app.growthRate.toFixed(1)}%</td>
                </tr>
            `).join('')}
        </table>
    </div>
</body>
</html>
    `;

    return Buffer.from(htmlContent, 'utf8');
  }

  private async generateEmpireXLSXReport(empireData: any, period: string): Promise<Buffer> {
    const XLSX = await import('xlsx');
    const workbook = XLSX.utils.book_new();

    // Empire Summary Sheet
    const summaryData = [
      ['Empire Summary', ''],
      ['Total Apps', empireData.summary.totalApps],
      ['Total Revenue', empireData.summary.totalRevenue],
      ['Total DAU', empireData.summary.totalDAU],
      ['Total MAU', empireData.summary.totalMAU],
      ['Average ARPU', empireData.summary.avgARPU],
      ['Average Payer Rate', empireData.summary.avgPayerRate],
      ['Total Alerts', empireData.summary.totalAlerts],
      ['Active Alerts', empireData.summary.activeAlerts],
      ['Average Safety Score', empireData.summary.avgSafetyScore],
      ['Overall Growth Rate', empireData.summary.overallGrowthRate]
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Empire Summary');

    // App Performance Sheet
    const appData = [
      ['App ID', 'Revenue', 'DAU', 'MAU', 'ARPU', 'Payer Rate', 'Total Alerts', 'Active Alerts', 'Safety Score', 'Growth Rate']
    ];
    empireData.apps.forEach((app: any) => {
      appData.push([
        app.appId,
        app.totalRevenue,
        app.totalDAU,
        app.totalMAU,
        app.avgARPU,
        app.avgPayerRate,
        app.totalAlerts,
        app.activeAlerts,
        app.safetyScore,
        app.growthRate
      ]);
    });
    const appSheet = XLSX.utils.aoa_to_sheet(appData);
    XLSX.utils.book_append_sheet(workbook, appSheet, 'App Performance');

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  private async syncExports(year: number, month: string, weekNumber?: number): Promise<void> {
    const sourceDir = path.join(this.exportsDir, 'empire', String(year), month);
    
    if (!fs.existsSync(sourceDir)) {
      logger.warn('Source export directory does not exist', { sourceDir });
      return;
    }

    // Sync to Drive directory
    if (this.syncConfig.driveSyncDir) {
      await this.syncToDirectory(sourceDir, this.syncConfig.driveSyncDir, year, month, weekNumber);
    }

    // Sync to ShivX directory
    if (this.syncConfig.shivxSyncDir) {
      await this.syncToDirectory(sourceDir, this.syncConfig.shivxSyncDir, year, month, weekNumber);
    }

    // Sync to local directory
    if (this.syncConfig.localSyncDir) {
      await this.syncToDirectory(sourceDir, this.syncConfig.localSyncDir, year, month, weekNumber);
    }
  }

  private async syncToDirectory(sourceDir: string, targetDir: string, year: number, month: string, weekNumber?: number): Promise<void> {
    try {
      const targetPath = path.join(targetDir, String(year), month);
      
      if (!fs.existsSync(targetPath)) {
        fs.mkdirSync(targetPath, { recursive: true });
      }

      const files = fs.readdirSync(sourceDir);
      for (const file of files) {
        const sourceFile = path.join(sourceDir, file);
        const targetFile = path.join(targetPath, file);
        
        fs.copyFileSync(sourceFile, targetFile);
        logger.info(`Synced file to ${targetDir}`, { file, targetPath });
      }

    } catch (error) {
      logger.error(`Failed to sync to ${targetDir}:`, error);
      // Don't throw error to prevent sync failures from breaking the export process
    }
  }

  private getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  /**
   * Start the cron job for weekly exports (every Sunday at 6:00 AM Sydney time)
   */
  startWeeklyExportCron(): void {
    // Cron expression for every Sunday at 6:00 AM Sydney time
    // Note: This assumes the server is running in Sydney timezone
    const cronExpression = '0 6 * * 0'; // Every Sunday at 6:00 AM

    cron.schedule(cronExpression, async () => {
      try {
        logger.info('Starting scheduled weekly export');
        await this.generateWeeklyExports();
        logger.info('Scheduled weekly export completed');
      } catch (error) {
        logger.error('Scheduled weekly export failed:', error);
      }
    });

    logger.info('Weekly export cron job started', { cronExpression });
  }

  /**
   * Start the cron job for monthly exports (1st of every month at 7:00 AM Sydney time)
   */
  startMonthlyExportCron(): void {
    // Cron expression for 1st of every month at 7:00 AM Sydney time
    const cronExpression = '0 7 1 * *'; // 1st of every month at 7:00 AM

    cron.schedule(cronExpression, async () => {
      try {
        logger.info('Starting scheduled monthly export');
        await this.generateMonthlyExports();
        logger.info('Scheduled monthly export completed');
      } catch (error) {
        logger.error('Scheduled monthly export failed:', error);
      }
    });

    logger.info('Monthly export cron job started', { cronExpression });
  }
}

export default OfflineExportService;
