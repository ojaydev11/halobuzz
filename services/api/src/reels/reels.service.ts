import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Reel, ReelDocument } from './reels.schema';

@Injectable()
export class ReelsService {
  constructor(@InjectModel(Reel.name) private readonly reelModel: Model<ReelDocument>) {}

  create(userId: string, videoUrl: string, caption?: string) {
    return new this.reelModel({ userId, videoUrl, caption }).save();
  }

  list(limit = 20) {
    return this.reelModel.find().sort({ createdAt: -1 }).limit(limit).exec();
  }
}

