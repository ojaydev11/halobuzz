import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { WalletModule } from '../wallet/wallet.module';
import { MongooseModule } from '@nestjs/mongoose';
import { StreamSession, StreamSessionSchema } from '../streams/streams.schema';
import { Transaction, TransactionSchema } from '../transactions/transactions.schema';

@Module({
  imports: [
    WalletModule,
    MongooseModule.forFeature([
      { name: StreamSession.name, schema: StreamSessionSchema },
      { name: Transaction.name, schema: TransactionSchema },
    ]),
  ],
  controllers: [AdminController],
})
export class AdminModule {}

