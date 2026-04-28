import { Module } from '@nestjs/common';
import { AccountPayableController } from './account-payable.controller';
import { AccountPayableService } from './account-payable.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [AccountPayableController],
  providers: [AccountPayableService, PrismaService],
  exports: [AccountPayableService],
})
export class AccountPayableModule {}
