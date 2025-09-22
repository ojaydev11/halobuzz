import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Throne, ThroneSchema } from './throne.schema';
import { ThroneService } from './throne.service';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [MongooseModule.forFeature([{ name: Throne.name, schema: ThroneSchema }]), WalletModule],
  providers: [ThroneService],
  exports: [ThroneService],
})
export class ThroneModule {}

