import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ThroneDocument = HydratedDocument<Throne>;

@Schema({ timestamps: true })
export class Throne {
  @Prop({ required: true })
  userId: string;

  @Prop()
  streamId?: string;

  @Prop({ required: true })
  purchasedAt: Date;

  @Prop({ required: true })
  expiresAt: Date;
}

export const ThroneSchema = SchemaFactory.createForClass(Throne);

