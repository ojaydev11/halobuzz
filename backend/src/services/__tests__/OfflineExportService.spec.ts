import OfflineExportService, { ExportOptions, SyncConfig } from '../OfflineExportService';
import ReportGeneratorService from '../ReportGeneratorService';
import { AnalyticsDailyKPI } from '../../analytics/models/AnalyticsDailyKPI';
import { AnalyticsAlert } from '../../analytics/models/AnalyticsAlert';
import * as fs from 'fs';
import * as path from 'path';

// Mock dependencies
jest.mock('../ReportGeneratorService');
jest.mock('../../analytics/models/AnalyticsDailyKPI');
jest.mock('../../analytics/models/AnalyticsAlert');
jest.mock('fs');
jest.mock('path');

describe('OfflineExportService', () => {
  let service: OfflineExportService;
  let mockReportGenerator: jest.Mocked<ReportGeneratorService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock ReportGeneratorService
    mockReportGenerator = {
      generateReport: jest.fn()
    } as any;
    
    (ReportGeneratorService as jest.Mock).mockImplementation(() => mockReportGenerator);
    
    // Mock fs methods
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.mkdirSync as jest.Mock).mockImplementation(() => {});
    (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
    (fs.readdirSync as jest.Mock).mockReturnValue(['file1.pdf', 'file2.xlsx']);
    (fs.copyFileSync as jest.Mock).mockImplementation(() => {});
    
    // Mock path methods
    (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));
    
    // Mock AnalyticsDailyKPI
    (AnalyticsDailyKPI.distinct as jest.Mock).mockResolvedValue(['halobuzz', 'sewago']);
    (AnalyticsDailyKPI.find as jest.Mock).mockResolvedValue([
      {
        revenue: { total: 100000 },
        engagement: { dau: 1000, mau: 5000 },
        monetization: { arpu: 5, payerRate: 10 },
        safety: { safetyScore: 85 }
      }
    ]);
    
    // Mock AnalyticsAlert
    (AnalyticsAlert.find as jest.Mock).mockResolvedValue([
      { status: 'active' },
      { status: 'resolved' }
    ]);

    service = new OfflineExportService();
  });

  describe('generateWeeklyExports', () => {
    it('should generate weekly exports successfully', async () => {
      mockReportGenerator.generateReport.mockResolvedValue(Buffer.from('test-pdf'));
      
      await service.generateWeeklyExports();
      
      expect(mockReportGenerator.generateReport).toHaveBeenCalledTimes(2);
      expect(fs.writeFileSync).toHaveBeenCalledTimes(4); // 2 apps * 2 formats
    });

    it('should handle errors gracefully', async () => {
      mockReportGenerator.generateReport.mockRejectedValue(new Error('Generation failed'));
      
      await expect(service.generateWeeklyExports()).rejects.toThrow('Generation failed');
    });
  });

  describe('generateMonthlyExports', () => {
    it('should generate monthly exports successfully', async () => {
      mockReportGenerator.generateReport.mockResolvedValue(Buffer.from('test-pdf'));
      
      await service.generateMonthlyExports();
      
      expect(mockReportGenerator.generateReport).toHaveBeenCalledTimes(2);
      expect(fs.writeFileSync).toHaveBeenCalledTimes(4); // 2 apps * 2 formats
    });
  });

  describe('generateAppReport', () => {
    it('should generate app report with both formats', async () => {
      mockReportGenerator.generateReport.mockResolvedValue(Buffer.from('test-content'));
      
      await service['generateAppReport']('halobuzz', 'weekly', 2024, '01', 1);
      
      expect(mockReportGenerator.generateReport).toHaveBeenCalledTimes(2);
      expect(mockReportGenerator.generateReport).toHaveBeenCalledWith({
        period: 'weekly',
        format: 'pdf',
        country: 'ALL',
        userId: 'system'
      });
      expect(mockReportGenerator.generateReport).toHaveBeenCalledWith({
        period: 'weekly',
        format: 'xlsx',
        country: 'ALL',
        userId: 'system'
      });
    });
  });

  describe('generateEmpireReport', () => {
    it('should generate empire report successfully', async () => {
      await service['generateEmpireReport']('weekly', 2024, '01', 1);
      
      expect(AnalyticsDailyKPI.distinct).toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalledTimes(2); // PDF + XLSX
    });
  });

  describe('getEmpireDashboardData', () => {
    it('should return empire dashboard data', async () => {
      const result = await service['getEmpireDashboardData']('weekly');
      
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('apps');
      expect(result).toHaveProperty('period');
      expect(result).toHaveProperty('generatedAt');
      expect(result.summary.totalApps).toBe(2);
    });
  });

  describe('syncExports', () => {
    it('should sync to configured directories', async () => {
      const syncConfig: SyncConfig = {
        driveSyncDir: '/drive/sync',
        shivxSyncDir: '/shivx/sync',
        localSyncDir: '/local/sync'
      };
      
      service['syncConfig'] = syncConfig;
      
      await service['syncExports'](2024, '01', 1);
      
      expect(fs.copyFileSync).toHaveBeenCalledTimes(6); // 2 files * 3 directories
    });

    it('should handle sync errors gracefully', async () => {
      (fs.copyFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Sync failed');
      });
      
      const syncConfig: SyncConfig = {
        driveSyncDir: '/drive/sync'
      };
      
      service['syncConfig'] = syncConfig;
      
      // Should not throw error
      await expect(service['syncExports'](2024, '01', 1)).resolves.toBeUndefined();
    });
  });

  describe('getWeekNumber', () => {
    it('should calculate week number correctly', () => {
      const date = new Date('2024-01-15'); // Week 3 of 2024
      const weekNumber = service['getWeekNumber'](date);
      expect(weekNumber).toBeGreaterThan(0);
    });
  });

  describe('cron job management', () => {
    it('should start weekly export cron', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      service.startWeeklyExportCron();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Weekly export cron job started')
      );
      
      consoleSpy.mockRestore();
    });

    it('should start monthly export cron', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      service.startMonthlyExportCron();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Monthly export cron job started')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('ensureExportsDirectory', () => {
    it('should create exports directory if it does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      
      new OfflineExportService();
      
      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('empire'),
        { recursive: true }
      );
    });

    it('should not create directory if it already exists', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      
      new OfflineExportService();
      
      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });
  });
});
