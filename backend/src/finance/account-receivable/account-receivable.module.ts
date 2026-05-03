import { Module } from '@nestjs/common';
import { AccountReceivableController } from './account-receivable.controller';
import { AccountReceivableService } from './account-receivable.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [AccountReceivableController],
  providers: [AccountReceivableService, PrismaService],
  exports: [AccountReceivableService],
})
export class AccountReceivableModule {}
