import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StreamsService } from './streams.service';
import { StreamsController } from './streams.controller';
import { StreamSession, StreamSessionSchema } from './streams.schema';
import { LiveGateway } from './live.gateway';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [MongooseModule.forFeature([{ name: StreamSession.name, schema: StreamSessionSchema }]), AiModule],
  providers: [StreamsService, LiveGateway],
  controllers: [StreamsController],
  exports: [StreamsService],
})
export class StreamsModule {}

