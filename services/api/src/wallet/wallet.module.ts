import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WalletService } from './wallet.service';
import { Wallet, WalletSchema } from './wallet.schema';
import { TransactionsModule } from '../transactions/transactions.module';

@Module({
  imports: [MongooseModule.forFeature([{ name: Wallet.name, schema: WalletSchema }]), TransactionsModule],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}

