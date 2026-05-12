import { Module } from '@nestjs/common';
import { FinanceReportService } from './finance-report.service';
import { FinanceReportController } from './finance-report.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { BankMutationModule } from '../bank-mutation/bank-mutation.module';
import { EquityPropertyModule } from '../equity-property/equity-property.module';

@Module({
  imports: [PrismaModule, BankMutationModule, EquityPropertyModule],
  providers: [FinanceReportService],
  controllers: [FinanceReportController]
})
export class FinanceReportModule {}
