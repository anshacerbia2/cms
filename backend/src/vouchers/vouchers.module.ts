import { Module } from '@nestjs/common';
import { ReceiveVouchersService } from './receive-vouchers.service';
import { ReceiveVouchersController } from './receive-vouchers.controller';
import { PaymentVouchersService } from './payment-vouchers.service';
import { PaymentVouchersController } from './payment-vouchers.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { InvoicesModule } from '../invoices/invoices.module';

@Module({
  imports: [PrismaModule, InvoicesModule],
  controllers: [ReceiveVouchersController, PaymentVouchersController],
  providers: [ReceiveVouchersService, PaymentVouchersService],
  exports: [ReceiveVouchersService, PaymentVouchersService],
})
export class VouchersModule {}
