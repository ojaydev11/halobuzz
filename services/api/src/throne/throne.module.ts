import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Throne, ThroneSchema } from './throne.schema';
import { ThroneService } from './throne.service';
import { WalletModule } from '../wallet/wallet.module';
import { ThroneController } from './throne.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: Throne.name, schema: ThroneSchema }]), WalletModule],
  providers: [ThroneService],
  exports: [ThroneService],
  controllers: [ThroneController],
})
export class ThroneModule {}

