import { logger } from '../config/logger';
import KPIService from '../analytics/queries/kpis';
import { AnalyticsForecast } from '../analytics/models/AnalyticsForecast';
import { AnalyticsAlert } from '../analytics/models/AnalyticsAlert';
import { NarrativeGenerator } from '../analytics/services/narratives';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface ReportOptions {
  period: 'daily' | 'weekly' | 'monthly' | 'custom';
  format: 'pdf' | 'xlsx';
  country?: string;
  includeCharts?: boolean;
  includeComparison?: boolean;
  includeExecutiveSummary?: boolean;
  chartTypes?: string[];
  from?: string;
  to?: string;
  userId: string;
}

export interface ReportData {
  period: string;
  country: string;
  dateRange: { from: Date; to: Date };
  kpis: any;
  forecasts: any[];
  alerts: any[];
  charts?: any[];
  narratives?: {
    short: string;
    long: string;
    insights: any[];
  };
  generatedAt: Date;
  generatedBy: string;
}

export class ReportGeneratorService {
  private kpiService: KPIService;
  private narrativeGenerator: NarrativeGenerator;
  private reportsDir: string;

  constructor() {
    this.kpiService = new KPIService();
    this.narrativeGenerator = new NarrativeGenerator();
    this.reportsDir = process.env.REPORTS_STORAGE_DIR || './storage/reports';
    this.ensureReportsDirectory();
  }

  private ensureReportsDirectory(): void {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const fullPath = path.join(this.reportsDir, String(year), month);
    
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  }

  async generateReport(options: ReportOptions): Promise<Buffer> {
    try {
      logger.info('Generating report', options);

      const reportData = await this.collectReportData(options);
      
      if (options.format === 'pdf') {
        return await this.generatePDFReport(reportData, options);
      } else {
        return await this.generateXLSXReport(reportData, options);
      }

    } catch (error) {
      logger.error('Failed to generate report:', error);
      throw error;
    }
  }

  private async collectReportData(options: ReportOptions): Promise<ReportData> {
    const dateRange = this.getDateRange(options);
    
    // Collect KPIs
    const kpis = await this.kpiService.getKPIs({
      from: dateRange.from,
      to: dateRange.to,
      country: options.country || 'ALL'
    });

    // Collect KPIs for comparison (previous period)
    const comparisonDateRange = this.getComparisonDateRange(options);
    const comparisonKpis = await this.kpiService.getKPIs({
      from: comparisonDateRange.from,
      to: comparisonDateRange.to,
      country: options.country || 'ALL'
    });

    // Generate narratives
    const narrativeResult = this.narrativeGenerator.generateNarratives(kpis, comparisonKpis);
    const narratives = {
      short: narrativeResult.short,
      long: Array.isArray(narrativeResult.long) ? narrativeResult.long.join(' ') : narrativeResult.long,
      insights: narrativeResult.insights
    };

    // Collect forecasts
    const forecasts = await AnalyticsForecast.find({
      date: { $gte: dateRange.from, $lte: dateRange.to },
      country: options.country || 'ALL'
    }).sort({ date: -1 }).limit(10);

    // Collect alerts
    const alerts = await AnalyticsAlert.find({
      createdAt: { $gte: dateRange.from, $lte: dateRange.to },
      country: options.country || 'ALL'
    }).sort({ createdAt: -1 }).limit(20);

    // Generate charts if requested
    let charts: any[] = [];
    if (options.includeCharts) {
      charts = await this.generateCharts(dateRange, options.country || 'ALL');
    }

    return {
      period: options.period,
      country: options.country || 'ALL',
      dateRange,
      kpis,
      forecasts,
      alerts,
      charts,
      narratives,
      generatedAt: new Date(),
      generatedBy: options.userId
    };
  }

  private getDateRange(options: ReportOptions): { from: Date; to: Date } {
    if (options.period === 'custom') {
      return {
        from: new Date(options.from!),
        to: new Date(options.to!)
      };
    }

    const now = new Date();
    const to = new Date(now);
    to.setHours(23, 59, 59, 999);

    const from = new Date(now);

    switch (options.period) {
      case 'daily':
        from.setDate(from.getDate() - 1);
        from.setHours(0, 0, 0, 0);
        break;
      case 'weekly':
        from.setDate(from.getDate() - 7);
        from.setHours(0, 0, 0, 0);
        break;
      case 'monthly':
        from.setMonth(from.getMonth() - 1);
        from.setHours(0, 0, 0, 0);
        break;
      default:
        throw new Error(`Invalid period: ${options.period}`);
    }

    return { from, to };
  }

  private getComparisonDateRange(options: ReportOptions): { from: Date; to: Date } {
    if (options.period === 'custom') {
      const originalFrom = new Date(options.from!);
      const originalTo = new Date(options.to!);
      const duration = originalTo.getTime() - originalFrom.getTime();

      return {
        from: new Date(originalFrom.getTime() - duration),
        to: new Date(originalFrom.getTime() - 1)
      };
    }

    const now = new Date();
    const to = new Date(now);
    to.setHours(23, 59, 59, 999);

    const from = new Date(now);

    switch (options.period) {
      case 'daily':
        // Compare with previous day
        from.setDate(from.getDate() - 2);
        from.setHours(0, 0, 0, 0);
        to.setDate(to.getDate() - 1);
        to.setHours(23, 59, 59, 999);
        break;
      case 'weekly':
        // Compare with previous week
        from.setDate(from.getDate() - 14);
        from.setHours(0, 0, 0, 0);
        to.setDate(to.getDate() - 7);
        to.setHours(23, 59, 59, 999);
        break;
      case 'monthly':
        // Compare with previous month
        from.setMonth(from.getMonth() - 2);
        from.setHours(0, 0, 0, 0);
        to.setMonth(to.getMonth() - 1);
        to.setHours(23, 59, 59, 999);
        break;
      default:
        throw new Error(`Invalid period: ${options.period}`);
    }

    return { from, to };
  }

  private async generatePDFReport(data: ReportData, options: ReportOptions): Promise<Buffer> {
    try {
      // For now, we'll generate a simple HTML report and convert to PDF
      // In production, you'd use a proper PDF generation library like Puppeteer
      const htmlContent = this.generateHTMLReport(data);
      
      // Save HTML file
      const filename = `report-${options.period}-${Date.now()}.html`;
      const filepath = path.join(this.reportsDir, String(new Date().getFullYear()), 
        String(new Date().getMonth() + 1).padStart(2, '0'), filename);
      
      fs.writeFileSync(filepath, htmlContent);

      // For demo purposes, return the HTML content as Buffer
      // In production, convert HTML to PDF using Puppeteer or similar
      return Buffer.from(htmlContent, 'utf8');

    } catch (error) {
      logger.error('Failed to generate PDF report:', error);
      throw error;
    }
  }

  private async generateXLSXReport(data: ReportData, options: ReportOptions): Promise<Buffer> {
    try {
      // Import xlsx library dynamically
      const XLSX = await import('xlsx');

      // Create workbook
      const workbook = XLSX.utils.book_new();

      // Executive Summary Sheet (with narratives)
      if (data.narratives) {
        const summarySheet = this.createSummarySheet(data.narratives, XLSX);
        XLSX.utils.book_append_sheet(workbook, summarySheet, 'Executive Summary');
      }

      // KPI Summary Sheet
      const kpiSheet = this.createKPISheet(data.kpis, XLSX);
      XLSX.utils.book_append_sheet(workbook, kpiSheet, 'KPI Summary');

      // Revenue Details Sheet
      const revenueSheet = this.createRevenueSheet(data.kpis.revenue, XLSX);
      XLSX.utils.book_append_sheet(workbook, revenueSheet, 'Revenue Details');

      // Engagement Details Sheet
      const engagementSheet = this.createEngagementSheet(data.kpis.engagement, XLSX);
      XLSX.utils.book_append_sheet(workbook, engagementSheet, 'Engagement Details');

      // Forecasts Sheet
      const forecastSheet = this.createForecastSheet(data.forecasts, XLSX);
      XLSX.utils.book_append_sheet(workbook, forecastSheet, 'Forecasts');

      // Alerts Sheet
      const alertsSheet = this.createAlertsSheet(data.alerts, XLSX);
      XLSX.utils.book_append_sheet(workbook, alertsSheet, 'Alerts');

      // Generate buffer
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      // Save file
      const filename = `report-${options.period}-${Date.now()}.xlsx`;
      const filepath = path.join(this.reportsDir, String(new Date().getFullYear()),
        String(new Date().getMonth() + 1).padStart(2, '0'), filename);

      fs.writeFileSync(filepath, buffer);

      return buffer;

    } catch (error) {
      logger.error('Failed to generate XLSX report:', error);
      throw error;
    }
  }

  private createSummarySheet(narratives: any, XLSX: any): any {
    const data = [
      ['Executive Summary', ''],
      ['Short Summary', narratives.short],
      ['', ''],
      ['Detailed Summary', ''],
      ['', narratives.long],
      ['', ''],
      ['Key Insights', ''],
      ['Metric', 'Direction', 'Magnitude', 'Segment', 'Confidence', 'Description']
    ];

    // Add insights
    narratives.insights.forEach((insight: any) => {
      data.push([
        insight.metric,
        insight.direction,
        `${insight.magnitude}%`,
        insight.segment || '',
        insight.confidence,
        insight.description
      ]);
    });

    return XLSX.utils.aoa_to_sheet(data);
  }

  private createKPISheet(kpis: any, XLSX: any): any {
    const data = [
      ['Metric', 'Value', 'Growth %'],
      ['Revenue Total', kpis.revenue.total, kpis.revenue.growth],
      ['DAU', kpis.engagement.dau, kpis.engagement.growth],
      ['ARPU', kpis.monetization.arpu, kpis.monetization.growth],
      ['Payer Rate', kpis.monetization.payerRate, ''],
      ['Active Hosts', kpis.creators.activeHosts, ''],
      ['Safety Score', kpis.safety.safetyScore, ''],
      ['Games Played', kpis.gaming.gamesPlayed, ''],
      ['Total Streams', kpis.engagement.totalStreams, ''],
      ['Gift Sent', kpis.engagement.giftSent, ''],
      ['Messages Sent', kpis.engagement.messagesSent, '']
    ];

    return XLSX.utils.aoa_to_sheet(data);
  }

  private createRevenueSheet(revenue: any, XLSX: any): any {
    const data = [
      ['Revenue Breakdown', 'Amount', 'Percentage'],
      ['Total Revenue', revenue.total, '100%'],
      ['Gift Revenue', revenue.giftRevenue, `${((revenue.giftRevenue / revenue.total) * 100).toFixed(2)}%`],
      ['Coin Topups', revenue.coinTopups, `${((revenue.coinTopups / revenue.total) * 100).toFixed(2)}%`],
      ['Platform Fees', revenue.platformFees, `${((revenue.platformFees / revenue.total) * 100).toFixed(2)}%`],
      ['', '', ''],
      ['Payment Methods', 'Amount', 'Percentage'],
      ['eSewa', revenue.byPaymentMethod.esewa, `${((revenue.byPaymentMethod.esewa / revenue.total) * 100).toFixed(2)}%`],
      ['Khalti', revenue.byPaymentMethod.khalti, `${((revenue.byPaymentMethod.khalti / revenue.total) * 100).toFixed(2)}%`],
      ['Stripe', revenue.byPaymentMethod.stripe, `${((revenue.byPaymentMethod.stripe / revenue.total) * 100).toFixed(2)}%`],
      ['PayPal', revenue.byPaymentMethod.paypal, `${((revenue.byPaymentMethod.paypal / revenue.total) * 100).toFixed(2)}%`]
    ];

    return XLSX.utils.aoa_to_sheet(data);
  }

  private createEngagementSheet(engagement: any, XLSX: any): any {
    const data = [
      ['Engagement Metric', 'Value'],
      ['Daily Active Users', engagement.dau],
      ['Monthly Active Users', engagement.mau],
      ['Average Session Duration (min)', engagement.avgSessionDuration],
      ['Average Viewers per Stream', engagement.avgViewersPerStream],
      ['Total Streams', engagement.totalStreams],
      ['Total Stream Duration (min)', engagement.totalStreamDuration],
      ['Battle Participation', engagement.battleParticipation],
      ['Gifts Sent', engagement.giftSent],
      ['Messages Sent', engagement.messagesSent]
    ];

    return XLSX.utils.aoa_to_sheet(data);
  }

  private createForecastSheet(forecasts: any[], XLSX: any): any {
    const data = [
      ['Date', 'Metric', 'Forecast Value', 'Confidence', 'Trend', 'Lower Bound', 'Upper Bound']
    ];

    forecasts.forEach(forecast => {
      data.push([
        forecast.date.toISOString().split('T')[0],
        forecast.metric,
        forecast.forecast.value,
        forecast.forecast.confidence,
        forecast.forecast.trend,
        forecast.forecast.lowerBound,
        forecast.forecast.upperBound
      ]);
    });

    return XLSX.utils.aoa_to_sheet(data);
  }

  private createAlertsSheet(alerts: any[], XLSX: any): any {
    const data = [
      ['Alert ID', 'Type', 'Severity', 'Status', 'Title', 'Current Value', 'Threshold', 'Deviation %', 'Created At']
    ];

    alerts.forEach(alert => {
      data.push([
        alert.alertId,
        alert.type,
        alert.severity,
        alert.status,
        alert.title,
        alert.currentValue,
        alert.thresholdValue,
        alert.deviation,
        alert.createdAt.toISOString()
      ]);
    });

    return XLSX.utils.aoa_to_sheet(data);
  }

  private generateHTMLReport(data: ReportData): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>HaloBuzz ${data.period.charAt(0).toUpperCase() + data.period.slice(1)} Report</title>
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
        .positive { color: #28a745; }
        .negative { color: #dc3545; }
        .narrative { background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; }
        .narrative-short { font-size: 18px; font-weight: bold; margin-bottom: 15px; }
        .narrative-long { margin-bottom: 15px; }
        .insights { margin-top: 15px; }
        .insight { margin: 10px 0; padding: 10px; background-color: #e9ecef; border-radius: 3px; }
        .insight-metric { font-weight: bold; }
        .insight-direction { font-weight: bold; }
        .insight-direction.increase { color: #28a745; }
        .insight-direction.decrease { color: #dc3545; }
        .insight-direction.stable { color: #6c757d; }
    </style>
</head>
<body>
    <div class="header">
        <h1>HaloBuzz ${data.period.charAt(0).toUpperCase() + data.period.slice(1)} Report</h1>
        <p>Generated on ${data.generatedAt.toISOString()} for ${data.country}</p>
        <p>Period: ${data.dateRange.from.toISOString().split('T')[0]} to ${data.dateRange.to.toISOString().split('T')[0]}</p>
    </div>

    ${data.narratives ? `
    <div class="section">
        <h2>Executive Summary</h2>
        <div class="narrative">
            <div class="narrative-short">${data.narratives.short}</div>
            <div class="narrative-long">${data.narratives.long}</div>
            ${data.narratives.insights.length > 0 ? `
            <div class="insights">
                <h4>Key Insights:</h4>
                ${data.narratives.insights.map(insight => `
                    <div class="insight">
                        <span class="insight-metric">${insight.metric}</span>: 
                        <span class="insight-direction ${insight.direction}">${insight.direction}</span> 
                        by ${insight.magnitude}% 
                        ${insight.segment ? `(${insight.segment})` : ''}
                        - ${insight.description}
                    </div>
                `).join('')}
            </div>
            ` : ''}
        </div>
    </div>
    ` : ''}

    <div class="section">
        <h2>Key Performance Indicators</h2>
        <div class="metric">
            <div class="metric-value">${data.kpis.revenue.total.toLocaleString()}</div>
            <div class="metric-label">Total Revenue</div>
        </div>
        <div class="metric">
            <div class="metric-value">${data.kpis.engagement.dau.toLocaleString()}</div>
            <div class="metric-label">Daily Active Users</div>
        </div>
        <div class="metric">
            <div class="metric-value">${data.kpis.monetization.arpu.toFixed(2)}</div>
            <div class="metric-label">ARPU</div>
        </div>
        <div class="metric">
            <div class="metric-value">${data.kpis.engagement.totalStreams.toLocaleString()}</div>
            <div class="metric-label">Total Streams</div>
        </div>
    </div>

    <div class="section">
        <h2>Revenue Breakdown</h2>
        <table>
            <tr><th>Source</th><th>Amount</th><th>Percentage</th></tr>
            <tr><td>Gift Revenue</td><td>${data.kpis.revenue.giftRevenue.toLocaleString()}</td><td>${((data.kpis.revenue.giftRevenue / data.kpis.revenue.total) * 100).toFixed(2)}%</td></tr>
            <tr><td>Coin Topups</td><td>${data.kpis.revenue.coinTopups.toLocaleString()}</td><td>${((data.kpis.revenue.coinTopups / data.kpis.revenue.total) * 100).toFixed(2)}%</td></tr>
            <tr><td>Platform Fees</td><td>${data.kpis.revenue.platformFees.toLocaleString()}</td><td>${((data.kpis.revenue.platformFees / data.kpis.revenue.total) * 100).toFixed(2)}%</td></tr>
        </table>
    </div>

    <div class="section">
        <h2>Active Alerts</h2>
        ${data.alerts.length > 0 ? `
        <table>
            <tr><th>Type</th><th>Severity</th><th>Status</th><th>Title</th><th>Current Value</th><th>Threshold</th></tr>
            ${data.alerts.slice(0, 10).map(alert => `
                <tr>
                    <td>${alert.type}</td>
                    <td>${alert.severity}</td>
                    <td>${alert.status}</td>
                    <td>${alert.title}</td>
                    <td>${alert.currentValue}</td>
                    <td>${alert.thresholdValue}</td>
                </tr>
            `).join('')}
        </table>
        ` : '<p>No active alerts</p>'}
    </div>

    <div class="section">
        <h2>Forecasts</h2>
        ${data.forecasts.length > 0 ? `
        <table>
            <tr><th>Date</th><th>Metric</th><th>Forecast</th><th>Confidence</th><th>Trend</th></tr>
            ${data.forecasts.slice(0, 10).map(forecast => `
                <tr>
                    <td>${forecast.date.toISOString().split('T')[0]}</td>
                    <td>${forecast.metric}</td>
                    <td>${forecast.forecast.value.toFixed(2)}</td>
                    <td>${forecast.forecast.confidence}%</td>
                    <td>${forecast.forecast.trend}</td>
                </tr>
            `).join('')}
        </table>
        ` : '<p>No forecasts available</p>'}
    </div>
</body>
</html>
    `;
  }

  private async generateCharts(dateRange: { from: Date; to: Date }, country: string): Promise<any[]> {
    // This would generate chart data for the report
    // For now, return empty array
    return [];
  }

  /**
   * Validate report request parameters
   */
  validateReportRequest(request: any): void {
    const validPeriods = ['daily', 'weekly', 'monthly', 'custom'];
    const validFormats = ['pdf', 'xlsx'];

    if (!request.period || !validPeriods.includes(request.period)) {
      throw new Error('Invalid period. Must be one of: daily, weekly, monthly, custom');
    }

    if (!request.format || !validFormats.includes(request.format)) {
      throw new Error('Invalid format. Must be either pdf or xlsx');
    }

    if (!request.userId) {
      throw new Error('User ID is required');
    }

    if (request.period === 'custom') {
      if (!request.from || !request.to) {
        throw new Error('Custom period requires from and to dates');
      }

      const fromDate = new Date(request.from);
      const toDate = new Date(request.to);

      if (fromDate > toDate) {
        throw new Error('Invalid date range: from date must be before to date');
      }
    }
  }

  /**
   * Get report metadata
   */
  getReportMetadata(format: string, period: string, country: string): any {
    const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const filename = `halobuzz-report-${period}-${country}-${timestamp}.${format}`;

    const metadata = {
      filename,
      extension: `.${format}`,
      mimeType: format === 'pdf'
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };

    return metadata;
  }
}

export default ReportGeneratorService;
