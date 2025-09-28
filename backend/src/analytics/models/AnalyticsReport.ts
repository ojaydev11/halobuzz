import mongoose, { Document, Schema } from 'mongoose';

export interface IAnalyticsReport extends Document {
  reportId: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  period: {
    startDate: Date;
    endDate: Date;
  };
  metrics: {
    totalUsers: number;
    activeUsers: number;
    revenue: number;
    engagement: number;
    retention: number;
  };
  insights: string[];
  recommendations: string[];
  generatedAt: Date;
  generatedBy: string;
  status: 'draft' | 'published' | 'archived';
}

const analyticsReportSchema = new Schema<IAnalyticsReport>({
  reportId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String },
  type: { 
    type: String, 
    required: true, 
    enum: ['daily', 'weekly', 'monthly', 'custom'] 
  },
  period: {
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true }
  },
  metrics: {
    totalUsers: { type: Number, default: 0 },
    activeUsers: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
    engagement: { type: Number, default: 0 },
    retention: { type: Number, default: 0 }
  },
  insights: [{ type: String }],
  recommendations: [{ type: String }],
  generatedAt: { type: Date, default: Date.now },
  generatedBy: { type: String, required: true },
  status: { 
    type: String, 
    default: 'draft', 
    enum: ['draft', 'published', 'archived'] 
  }
}, {
  timestamps: true,
  collection: 'analyticsreports'
});

export const AnalyticsReport = mongoose.model<IAnalyticsReport>('AnalyticsReport', analyticsReportSchema);
