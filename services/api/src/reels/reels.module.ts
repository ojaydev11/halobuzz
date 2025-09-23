import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Reel, ReelSchema } from './reels.schema';
import { ReelsService } from './reels.service';
import { ReelsController } from './reels.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: Reel.name, schema: ReelSchema }])],
  providers: [ReelsService],
  controllers: [ReelsController],
  exports: [ReelsService],
})
export class ReelsModule {}

