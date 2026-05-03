import { Module } from '@nestjs/common';
import { FinanceReportService } from './finance-report.service';
import { FinanceReportController } from './finance-report.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [FinanceReportService],
  controllers: [FinanceReportController]
})
export class FinanceReportModule {}
