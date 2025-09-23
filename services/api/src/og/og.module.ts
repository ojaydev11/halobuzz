import { Module } from '@nestjs/common';
import { OgService } from './og.service';
import { WalletModule } from '../wallet/wallet.module';
import { OgController } from './og.controller';

@Module({
  imports: [WalletModule],
  providers: [OgService],
  exports: [OgService],
  controllers: [OgController],
})
export class OgModule {}

