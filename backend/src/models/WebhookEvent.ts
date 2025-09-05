import mongoose, { Document, Schema } from 'mongoose';

export interface IWebhookEvent extends Document {
  eventId: string;
  source: 'esewa' | 'khalti' | 'stripe';
  signature?: string;
  payloadHash?: string;
  processedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const webhookEventSchema = new Schema<IWebhookEvent>({
  eventId: { type: String, required: true, unique: true },
  source: { type: String, required: true, enum: ['esewa', 'khalti', 'stripe'] },
  signature: { type: String },
  payloadHash: { type: String },
  processedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Note: eventId already has unique index from schema definition

export const WebhookEvent = mongoose.model<IWebhookEvent>('WebhookEvent', webhookEventSchema);


