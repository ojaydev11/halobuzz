import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type StreamSessionDocument = HydratedDocument<StreamSession>;

@Schema({ timestamps: true })
export class StreamSession {
  @Prop({ required: true })
  hostId: string;

  @Prop({ required: true, unique: true })
  channelId: string;

  @Prop({ default: false })
  isLive: boolean;

  @Prop()
  title?: string;

  @Prop({ type: [String], default: [] })
  tags?: string[];

  @Prop()
  countryCode?: string;

  @Prop({ default: 0 })
  concurrentViewers: number;

  @Prop({ default: 0 })
  totalViewers: number;
}

export const StreamSessionSchema = SchemaFactory.createForClass(StreamSession);

