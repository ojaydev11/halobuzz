import { ReportGeneratorService } from '../ReportGeneratorService';
import { AnalyticsDailyKPI } from '../../analytics/models/AnalyticsDailyKPI';
import { AnalyticsReport } from '../../analytics/models/AnalyticsReport';
import { NarrativeGenerator } from '../../analytics/services/narratives';
import { logger } from '../../config/logger';
import * as XLSX from 'xlsx';

// Mock dependencies
jest.mock('../../analytics/models/AnalyticsDailyKPI');
jest.mock('../../analytics/models/AnalyticsReport');
jest.mock('../../analytics/services/narratives');
jest.mock('../../config/logger');
jest.mock('xlsx');

describe('ReportGeneratorService', () => {
  let service: ReportGeneratorService;
  const mockNarrativeGenerator = new NarrativeGenerator() as jest.Mocked<NarrativeGenerator>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock logger methods
    (logger.info as jest.Mock).mockImplementation(() => {});
    (logger.error as jest.Mock).mockImplementation(() => {});
    (logger.debug as jest.Mock).mockImplementation(() => {});

    // Mock narrative generator
    mockNarrativeGenerator.generateNarratives.mockReturnValue({
      short: 'Revenue increased by 10%' as string,
      long: 'Detailed analysis shows revenue growth across all segments' as string,
      insights: [
        {
          metric: 'Total Revenue',
          direction: 'up' as const,
          magnitude: 10 as number,
          confidence: 'high' as string,
          description: 'Revenue increased by 10%'
        }
      ]
    });

    service = new ReportGeneratorService();
  });

  describe('generateReport', () => {
    const mockKpiData = [
      {
        date: new Date('2024-01-01'),
        revenue: { total: 1000, byCountry: { 'NP': 600, 'US': 400 } },
        engagement: { dau: 500, mau: 10000 },
        monetization: { arpu: 2, payerRate: 0.1 },
        retention: { d1: 0.6, d7: 0.3 },
        safety: { flaggedContentRate: 0.01 },
        gaming: { totalStake: 5000, totalPayout: 4500 }
      }
    ];

    beforeEach(() => {
      (AnalyticsDailyKPI.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockKpiData)
      });
      (AnalyticsReport.create as jest.Mock).mockResolvedValue({
        _id: 'report-id',
        period: 'daily',
        format: 'pdf',
        country: 'ALL',
        userId: 'test-user',
        createdAt: new Date()
      });
    });

    it('should generate a PDF report successfully', async () => {
      const reportBuffer = await service.generateReport({
        period: 'daily',
        format: 'pdf',
        country: 'ALL',
        userId: 'test-user'
      });

      expect(reportBuffer).toBeInstanceOf(Buffer);
      expect(reportBuffer.length).toBeGreaterThan(0);
      expect(AnalyticsDailyKPI.find).toHaveBeenCalled();
      expect(AnalyticsReport.create).toHaveBeenCalledWith(
        expect.objectContaining({
          period: 'daily',
          format: 'pdf',
          country: 'ALL',
          userId: 'test-user'
        })
      );
    });

    it('should generate an XLSX report successfully', async () => {
      // Mock XLSX methods
      (XLSX.utils.json_to_sheet as jest.Mock).mockReturnValue({});
      (XLSX.utils.book_new as jest.Mock).mockReturnValue({});
      (XLSX.utils.book_append_sheet as jest.Mock).mockReturnValue({});
      (XLSX.write as jest.Mock).mockReturnValue(Buffer.from('mock-xlsx-content'));

      const reportBuffer = await service.generateReport({
        period: 'weekly',
        format: 'xlsx',
        country: 'NP',
        userId: 'test-user'
      });

      expect(reportBuffer).toBeInstanceOf(Buffer);
      expect(reportBuffer.length).toBeGreaterThan(0);
      expect(XLSX.utils.json_to_sheet).toHaveBeenCalled();
      expect(XLSX.write).toHaveBeenCalled();
    });

    it('should filter data by country', async () => {
      await service.generateReport({
        period: 'daily',
        format: 'pdf',
        country: 'NP',
        userId: 'test-user'
      });

      expect(AnalyticsDailyKPI.find).toHaveBeenCalledWith(
        expect.objectContaining({
          country: 'NP'
        })
      );
    });

    it('should handle custom date range', async () => {
      await service.generateReport({
        period: 'custom',
        format: 'pdf',
        country: 'ALL',
        from: '2024-01-01',
        to: '2024-01-07',
        userId: 'test-user'
      });

      expect(AnalyticsDailyKPI.find).toHaveBeenCalledWith(
        expect.objectContaining({
          date: {
            $gte: expect.any(Date),
            $lte: expect.any(Date)
          }
        })
      );
    });

    it('should include narratives in the report', async () => {
      const reportBuffer = await service.generateReport({
        period: 'daily',
        format: 'pdf',
        country: 'ALL',
        userId: 'test-user'
      });

      expect(reportBuffer).toBeInstanceOf(Buffer);
      expect(mockNarrativeGenerator.generateNarratives).toHaveBeenCalled();
    });

    it('should handle empty data gracefully', async () => {
      (AnalyticsDailyKPI.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([])
      });

      const reportBuffer = await service.generateReport({
        period: 'daily',
        format: 'pdf',
        country: 'ALL',
        userId: 'test-user'
      });

      expect(reportBuffer).toBeInstanceOf(Buffer);
      expect(reportBuffer.length).toBeGreaterThan(0);
    });

    it('should handle database errors', async () => {
      (AnalyticsDailyKPI.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockRejectedValue(new Error('Database error'))
      });

      await expect(service.generateReport({
        period: 'daily',
        format: 'pdf',
        country: 'ALL',
        userId: 'test-user'
      })).rejects.toThrow('Database error');

      expect(logger.error).toHaveBeenCalledWith(
        'Error generating report:',
        expect.any(Error)
      );
    });

    it('should validate period parameter', async () => {
      await expect(service.generateReport({
        period: 'invalid' as any,
        format: 'pdf',
        country: 'ALL',
        userId: 'test-user'
      })).rejects.toThrow();
    });

    it('should validate format parameter', async () => {
      await expect(service.generateReport({
        period: 'daily',
        format: 'invalid' as any,
        country: 'ALL',
        userId: 'test-user'
      })).rejects.toThrow();
    });

    it('should validate date range for custom period', async () => {
      await expect(service.generateReport({
        period: 'custom',
        format: 'pdf',
        country: 'ALL',
        from: '2024-01-07',
        to: '2024-01-01', // Invalid: to is before from
        userId: 'test-user'
      })).rejects.toThrow();
    });

    it('should generate report with comparison data', async () => {
      const reportBuffer = await service.generateReport({
        period: 'daily',
        format: 'pdf',
        country: 'ALL',
        includeComparison: true,
        userId: 'test-user'
      });

      expect(reportBuffer).toBeInstanceOf(Buffer);
      expect(AnalyticsDailyKPI.find).toHaveBeenCalledTimes(2); // Current and comparison data
    });

    it('should handle different chart types in PDF reports', async () => {
      const reportBuffer = await service.generateReport({
        period: 'weekly',
        format: 'pdf',
        country: 'ALL',
        chartTypes: ['line', 'bar', 'pie'],
        userId: 'test-user'
      });

      expect(reportBuffer).toBeInstanceOf(Buffer);
      expect(reportBuffer.length).toBeGreaterThan(0);
    });

    it('should include executive summary in reports', async () => {
      const reportBuffer = await service.generateReport({
        period: 'monthly',
        format: 'pdf',
        country: 'ALL',
        includeExecutiveSummary: true,
        userId: 'test-user'
      });

      expect(reportBuffer).toBeInstanceOf(Buffer);
      expect(mockNarrativeGenerator.generateNarratives).toHaveBeenCalled();
    });
  });

  describe('getReportMetadata', () => {
    it('should return report metadata for PDF format', () => {
      const metadata = service.getReportMetadata('pdf', 'daily', 'ALL');

      expect(metadata).toHaveProperty('mimeType', 'application/pdf');
      expect(metadata).toHaveProperty('extension', '.pdf');
      expect(metadata).toHaveProperty('filename');
      expect(metadata.filename).toContain('daily');
      expect(metadata.filename).toContain('ALL');
      expect(metadata.filename).toMatch(/\.pdf$/);
    });

    it('should return report metadata for XLSX format', () => {
      const metadata = service.getReportMetadata('xlsx', 'weekly', 'NP');

      expect(metadata).toHaveProperty('mimeType', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      expect(metadata).toHaveProperty('extension', '.xlsx');
      expect(metadata).toHaveProperty('filename');
      expect(metadata.filename).toContain('weekly');
      expect(metadata.filename).toContain('NP');
      expect(metadata.filename).toMatch(/\.xlsx$/);
    });

    it('should include timestamp in filename', () => {
      const metadata = service.getReportMetadata('pdf', 'daily', 'ALL');

      expect(metadata.filename).toMatch(/\d{8}/); // YYYYMMDD format
    });
  });

  describe('validateReportRequest', () => {
    it('should validate valid report request', () => {
      const request = {
        period: 'daily' as const,
        format: 'pdf' as const,
        country: 'ALL',
        userId: 'test-user'
      };

      expect(() => service.validateReportRequest(request)).not.toThrow();
    });

    it('should throw error for invalid period', () => {
      const request = {
        period: 'invalid' as any,
        format: 'pdf' as const,
        country: 'ALL',
        userId: 'test-user'
      };

      expect(() => service.validateReportRequest(request)).toThrow('Invalid period');
    });

    it('should throw error for invalid format', () => {
      const request = {
        period: 'daily' as const,
        format: 'invalid' as any,
        country: 'ALL',
        userId: 'test-user'
      };

      expect(() => service.validateReportRequest(request)).toThrow('Invalid format');
    });

    it('should throw error for missing from/to in custom period', () => {
      const request = {
        period: 'custom' as const,
        format: 'pdf' as const,
        country: 'ALL',
        userId: 'test-user'
      };

      expect(() => service.validateReportRequest(request)).toThrow('Custom period requires from and to dates');
    });

    it('should throw error for invalid date range', () => {
      const request = {
        period: 'custom' as const,
        format: 'pdf' as const,
        country: 'ALL',
        from: '2024-01-07',
        to: '2024-01-01',
        userId: 'test-user'
      };

      expect(() => service.validateReportRequest(request)).toThrow('Invalid date range');
    });
  });
});
