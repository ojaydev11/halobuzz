import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WalletService } from './wallet.service';
import { Wallet, WalletSchema } from './wallet.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Wallet.name, schema: WalletSchema }])],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}

