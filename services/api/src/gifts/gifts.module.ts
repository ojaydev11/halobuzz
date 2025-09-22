import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GiftsService } from './gifts.service';
import { GiftsController } from './gifts.controller';
import { Gift, GiftSchema } from './gifts.schema';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [MongooseModule.forFeature([{ name: Gift.name, schema: GiftSchema }]), WalletModule],
  providers: [GiftsService],
  controllers: [GiftsController],
  exports: [GiftsService],
})
export class GiftsModule {}

