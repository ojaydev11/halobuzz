import { Module } from '@nestjs/common';
import { WithdrawalsService } from './withdrawals.service';
import { WithdrawalsController } from './withdrawals.controller';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [WalletModule],
  providers: [WithdrawalsService],
  controllers: [WithdrawalsController],
})
export class WithdrawalsModule {}

