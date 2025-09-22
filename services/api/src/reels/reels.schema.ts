import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ReelDocument = HydratedDocument<Reel>;

@Schema({ timestamps: true })
export class Reel {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  videoUrl: string;

  @Prop()
  caption?: string;

  @Prop({ default: 0 })
  likes: number;

  @Prop({ default: 0 })
  views: number;
}

export const ReelSchema = SchemaFactory.createForClass(Reel);

