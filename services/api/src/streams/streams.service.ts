import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { StreamSession, StreamSessionDocument } from './streams.schema';
import { v4 as uuidv4 } from 'uuid';
import { AiService } from '../ai/ai.service';

@Injectable()
export class StreamsService {
  constructor(
    @InjectModel(StreamSession.name)
    private readonly streamModel: Model<StreamSessionDocument>,
    private readonly aiService: AiService,
  ) {}

  async startStream(hostId: string, title?: string, tags?: string[], countryCode?: string) {
    if (title) {
      const moderation = await this.aiService.moderate(title);
      if (moderation.action !== 'allow') {
        throw new Error('Stream title failed moderation');
      }
    }
    const channelId = `hb_${uuidv4()}`;
    const doc = new this.streamModel({ hostId, channelId, isLive: true, title, tags, countryCode });
    return doc.save();
  }

  async endStream(channelId: string) {
    const doc = await this.streamModel.findOne({ channelId }).exec();
    if (!doc) return null;
    doc.isLive = false;
    return doc.save();
  }

  async listLive(limit = 50) {
    return this.streamModel.find({ isLive: true }).sort({ updatedAt: -1 }).limit(limit).exec();
  }

  async byChannel(channelId: string) {
    return this.streamModel.findOne({ channelId }).exec();
  }

  async incrementViewers(channelId: string) {
    await this.streamModel
      .updateOne({ channelId }, { $inc: { concurrentViewers: 1, totalViewers: 1, engagementScore: 2 } })
      .exec();
  }

  async decrementViewers(channelId: string) {
    await this.streamModel.updateOne({ channelId }, { $inc: { concurrentViewers: -1, engagementScore: 0 } }).exec();
  }
}

