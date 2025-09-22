import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './users.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  async findByEmail(email: string) {
    return this.userModel.findOne({ email }).exec();
  }

  async createLocalUser(input: { email: string; passwordHash: string; displayName?: string }) {
    const user = new this.userModel({
      email: input.email,
      passwordHash: input.passwordHash,
      displayName: input.displayName,
      roles: ['user'],
      ogLevel: 1,
      reputationScore: 50,
    });
    return user.save();
  }
}

