import mongoose, { Document, Schema } from 'mongoose';

export interface IAnalyticsForecast extends Document {
  appId: string;
  metric: string; // 'revenue', 'churn', 'topup', 'dau', 'engagement'
  date: Date;
  horizonDays: number; // 7, 14, 30, 90
  country: string;
  segments?: {
    ogTier?: number;
    country?: string;
    platform?: string;
  };
  
  // Forecast Values
  forecast: {
    value: number;
    confidence: number; // 0-100
    lowerBound: number;
    upperBound: number;
    trend: 'up' | 'down' | 'stable';
    seasonality: number; // seasonal adjustment factor
  };
  
  // Model Information
  model: {
    type: 'ewma' | 'prophet' | 'arima' | 'linear';
    parameters: any;
    accuracy: number; // model accuracy score
    lastTrained: Date;
  };
  
  // Historical Context
  historical: {
    actualValue: number; // actual value for this date (if available)
    previousPeriod: number; // value from same period previous cycle
    growthRate: number; // percentage growth vs previous period
    volatility: number; // measure of uncertainty
  };
  
  createdAt: Date;
  updatedAt: Date;
}

const analyticsForecastSchema = new Schema<IAnalyticsForecast>({
  appId: {
    type: String,
    required: true,
    default: 'halobuzz',
    index: true
  },
  metric: {
    type: String,
    required: true,
    enum: ['revenue', 'churn', 'topup', 'dau', 'engagement', 'streams', 'gifts', 'og_conversion'],
    index: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  horizonDays: {
    type: Number,
    required: true,
    enum: [7, 14, 30, 90],
    index: true
  },
  country: {
    type: String,
    required: true,
    default: 'ALL',
    index: true
  },
  segments: {
    ogTier: { type: Number, min: 0, max: 5 },
    country: String,
    platform: String
  },
  
  forecast: {
    value: { type: Number, required: true },
    confidence: { type: Number, required: true, min: 0, max: 100 },
    lowerBound: { type: Number, required: true },
    upperBound: { type: Number, required: true },
    trend: { 
      type: String, 
      required: true, 
      enum: ['up', 'down', 'stable'] 
    },
    seasonality: { type: Number, default: 1.0 }
  },
  
  model: {
    type: { 
      type: String, 
      required: true, 
      enum: ['ewma', 'prophet', 'arima', 'linear'] 
    },
    parameters: { type: Schema.Types.Mixed },
    accuracy: { type: Number, required: true, min: 0, max: 100 },
    lastTrained: { type: Date, required: true }
  },
  
  historical: {
    actualValue: { type: Number, default: null },
    previousPeriod: { type: Number, default: null },
    growthRate: { type: Number, default: 0 },
    volatility: { type: Number, default: 0, min: 0 }
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
analyticsForecastSchema.index({ appId: 1, metric: 1, date: -1, horizonDays: 1 });
analyticsForecastSchema.index({ appId: 1, country: 1, metric: 1, date: -1 });
analyticsForecastSchema.index({ appId: 1, date: -1, confidence: -1 });
analyticsForecastSchema.index({ metric: 1, date: -1, horizonDays: 1 });
analyticsForecastSchema.index({ country: 1, metric: 1, date: -1 });
analyticsForecastSchema.index({ date: -1, confidence: -1 });

// Unique constraint to prevent duplicates
analyticsForecastSchema.index({ 
  appId: 1,
  metric: 1, 
  date: 1, 
  horizonDays: 1, 
  country: 1, 
  'segments.ogTier': 1 
}, { unique: true });

export const AnalyticsForecast = mongoose.model<IAnalyticsForecast>('AnalyticsForecast', analyticsForecastSchema);
