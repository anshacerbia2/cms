import { Module } from '@nestjs/common';
import { FinanceReportService } from './finance-report.service';
import { FinanceReportController } from './finance-report.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { BankMutationModule } from '../bank-mutation/bank-mutation.module';

@Module({
  imports: [PrismaModule, BankMutationModule],
  providers: [FinanceReportService],
  controllers: [FinanceReportController]
})
export class FinanceReportModule {}
