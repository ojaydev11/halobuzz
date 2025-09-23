import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop()
  displayName?: string;

  @Prop()
  avatarUrl?: string;

  @Prop({ type: [String], default: ['user'] })
  roles: string[];

  @Prop({ default: 1, min: 1, max: 5 })
  ogLevel: number;

  @Prop({ default: 50, min: 0, max: 100 })
  reputationScore: number;

  @Prop()
  passwordHash?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

