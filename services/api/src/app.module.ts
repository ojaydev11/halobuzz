import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from './config/config.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { WalletModule } from './wallet/wallet.module';
import { StreamsModule } from './streams/streams.module';
import { GiftsModule } from './gifts/gifts.module';
import { PaymentsModule } from './payments/payments.module';
import { WithdrawalsModule } from './withdrawals/withdrawals.module';
import { AdminModule } from './admin/admin.module';
import { AiModule } from './ai/ai.module';
import { TransactionsModule } from './transactions/transactions.module';
import { ThroneModule } from './throne/throne.module';
import { OgModule } from './og/og.module';
import { ReelsModule } from './reels/reels.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: () => ({
        uri: process.env.MONGODB_URI || '',
      }),
    }),
    HealthModule,
    AuthModule,
    UsersModule,
    WalletModule,
    StreamsModule,
    GiftsModule,
    PaymentsModule,
    WithdrawalsModule,
    AdminModule,
    AiModule,
    TransactionsModule,
    ThroneModule,
    OgModule,
    ReelsModule,
    RedisModule,
  ],
})
export class AppModule {}

