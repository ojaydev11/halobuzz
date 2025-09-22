import { Module } from '@nestjs/common';
import { OgService } from './og.service';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [WalletModule],
  providers: [OgService],
  exports: [OgService],
})
export class OgModule {}

