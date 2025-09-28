import mongoose, { Document, Schema } from 'mongoose';

export interface IFestival extends Document {
  name: string;
  description: string;
  country: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  specialGifts: string[];
  events: string[];
  metadata?: {
    culturalSignificance?: string;
    traditions?: string[];
    colors?: string[];
    symbols?: string[];
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

const festivalSchema = new Schema<IFestival>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  country: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  specialGifts: [{
    type: String,
    trim: true
  }],
  events: [{
    type: String,
    trim: true,
    maxlength: 200
  }],
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes
festivalSchema.index({ country: 1, startDate: 1 });
festivalSchema.index({ isActive: 1, startDate: 1 });
festivalSchema.index({ endDate: 1 });

// Static methods
festivalSchema.statics.findActive = function() {
  const now = new Date();
  return this.find({
    startDate: { $lte: now },
    endDate: { $gte: now },
    isActive: true
  }).sort({ startDate: 1 });
};

festivalSchema.statics.findByCountry = function(country: string) {
  return this.find({ country, isActive: true }).sort({ startDate: 1 });
};

festivalSchema.statics.findUpcoming = function(limit: number = 10) {
  const now = new Date();
  return this.find({
    startDate: { $gt: now },
    isActive: true
  }).sort({ startDate: 1 }).limit(limit);
};

// Instance methods
festivalSchema.methods.isCurrentlyActive = function() {
  const now = new Date();
  return this.startDate <= now && this.endDate >= now && this.isActive;
};

festivalSchema.methods.daysUntilStart = function() {
  const now = new Date();
  const diffTime = this.startDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

festivalSchema.methods.daysUntilEnd = function() {
  const now = new Date();
  const diffTime = this.endDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const Festival = mongoose.model<IFestival>('Festival', festivalSchema);