import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type GiftDocument = HydratedDocument<Gift>;

@Schema({ timestamps: true })
export class Gift {
  @Prop({ required: true, unique: true })
  code: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  coinCost: number;

  @Prop({ enum: ['common', 'rare', 'epic', 'legendary'], default: 'common' })
  rarity: string;

  @Prop()
  animationUrl?: string;

  @Prop({ default: false })
  isFestival?: boolean;
}

export const GiftSchema = SchemaFactory.createForClass(Gift);

