import mongoose, { Document, Schema } from 'mongoose';

export interface IAuditLog extends Document {
  timestamp: Date;
  userId: string;
  userRole: string;
  method: string;
  url: string;
  userAgent?: string;
  ip: string;
  country?: string;
  requestId?: string;
  action?: string;
  resource?: string;
  outcome: 'success' | 'failure' | 'error';
  errorMessage?: string;
  responseTime?: number;
  dataAccessed?: string[];
  complianceFlags?: {
    gdprApplicable: boolean;
    dataRetentionChecked: boolean;
    piiSanitized: boolean;
  };
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>({
  timestamp: { type: Date, required: true, default: Date.now },
  userId: { type: String, required: true, index: true },
  userRole: { type: String, required: true, index: true },
  method: { type: String, required: true, enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
  url: { type: String, required: true, index: true },
  userAgent: { type: String },
  ip: { type: String, required: true },
  country: { type: String },
  requestId: { type: String, index: true },
  action: { type: String, index: true },
  resource: { type: String, index: true },
  outcome: { 
    type: String, 
    required: true, 
    enum: ['success', 'failure', 'error'],
    default: 'success',
    index: true
  },
  errorMessage: { type: String },
  responseTime: { type: Number }, // in milliseconds
  dataAccessed: [{ type: String }], // List of data types accessed
  complianceFlags: {
    gdprApplicable: { type: Boolean, default: false },
    dataRetentionChecked: { type: Boolean, default: false },
    piiSanitized: { type: Boolean, default: false }
  },
  createdAt: { type: Date, default: Date.now, index: true }
});

// Compound indexes for efficient querying
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ userRole: 1, createdAt: -1 });
auditLogSchema.index({ outcome: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, resource: 1, createdAt: -1 });

// TTL index for automatic cleanup after retention period
const retentionDays = parseInt(process.env.AUDIT_LOG_RETENTION_DAYS || '2555'); // ~7 years default
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: retentionDays * 24 * 60 * 60 });

// Pre-save middleware to set compliance flags
auditLogSchema.pre('save', function(next) {
  const businessAIRoutes = [
    '/api/v1/ai/business/kpis',
    '/api/v1/ai/business/reports',
    '/api/v1/ai/business/alerts',
    '/api/v1/ai/business/empire-dashboard',
    '/api/v1/ai/business/simulate',
    '/api/v1/ai/business/predictions',
    '/api/v1/ai/business/narratives'
  ];

  const isBusinessAIRoute = businessAIRoutes.some(route => this.url.startsWith(route));
  
  if (isBusinessAIRoute) {
    // Check if GDPR applies (EU countries or users)
    const euCountries = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'];
    this.complianceFlags = this.complianceFlags || {};
    this.complianceFlags.gdprApplicable = euCountries.includes(this.country || '');
    this.complianceFlags.dataRetentionChecked = true;
    this.complianceFlags.piiSanitized = true;

    // Set data accessed based on route
    this.dataAccessed = this.dataAccessed || [];
    if (this.url.includes('kpis')) {
      this.dataAccessed.push('KPI_DATA');
    }
    if (this.url.includes('reports')) {
      this.dataAccessed.push('REPORT_DATA');
    }
    if (this.url.includes('alerts')) {
      this.dataAccessed.push('ALERT_DATA');
    }
    if (this.url.includes('simulate')) {
      this.dataAccessed.push('SIMULATION_DATA');
    }
    if (this.url.includes('empire')) {
      this.dataAccessed.push('AGGREGATED_DATA');
    }
  }

  next();
});

// Static methods for compliance reporting
auditLogSchema.statics.getComplianceReport = async function(startDate: Date, endDate: Date) {
  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        totalRequests: { $sum: 1 },
        successfulRequests: { $sum: { $cond: [{ $eq: ['$outcome', 'success'] }, 1, 0] } },
        failedRequests: { $sum: { $cond: [{ $eq: ['$outcome', 'failure'] }, 1, 0] } },
        errorRequests: { $sum: { $cond: [{ $eq: ['$outcome', 'error'] }, 1, 0] } },
        gdprApplicableRequests: { $sum: { $cond: ['$complianceFlags.gdprApplicable', 1, 0] } },
        uniqueUsers: { $addToSet: '$userId' },
        dataTypesAccessed: { $addToSet: '$dataAccessed' },
        avgResponseTime: { $avg: '$responseTime' }
      }
    },
    {
      $project: {
        _id: 0,
        totalRequests: 1,
        successfulRequests: 1,
        failedRequests: 1,
        errorRequests: 1,
        gdprApplicableRequests: 1,
        uniqueUserCount: { $size: '$uniqueUsers' },
        dataTypesAccessed: 1,
        avgResponseTime: { $round: ['$avgResponseTime', 2] },
        successRate: { 
          $round: [
            { $multiply: [{ $divide: ['$successfulRequests', '$totalRequests'] }, 100] }, 
            2
          ] 
        }
      }
    }
  ]);
};

auditLogSchema.statics.getUserActivity = async function(userId: string, startDate: Date, endDate: Date) {
  return this.find({
    userId: userId,
    createdAt: { $gte: startDate, $lte: endDate }
  })
  .sort({ createdAt: -1 })
  .select('timestamp method url action resource outcome responseTime dataAccessed')
  .lean();
};

auditLogSchema.statics.getSecurityEvents = async function(startDate: Date, endDate: Date) {
  return this.find({
    createdAt: { $gte: startDate, $lte: endDate },
    $or: [
      { outcome: 'failure' },
      { outcome: 'error' },
      { errorMessage: { $exists: true } }
    ]
  })
  .sort({ createdAt: -1 })
  .select('timestamp userId userRole method url outcome errorMessage ip country')
  .lean();
};

auditLogSchema.statics.getComplianceReport = async function(startDate: Date, endDate: Date) {
  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        totalRequests: { $sum: 1 },
        gdprApplicableRequests: {
          $sum: {
            $cond: [{ $eq: ['$complianceFlags.gdprApplicable', true] }, 1, 0]
          }
        },
        uniqueUserCount: { $addToSet: '$userId' }
      }
    },
    {
      $project: {
        _id: 0,
        totalRequests: 1,
        gdprApplicableRequests: 1,
        uniqueUserCount: { $size: '$uniqueUserCount' }
      }
    }
  ]);
};

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
