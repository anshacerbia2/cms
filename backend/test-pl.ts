import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { FinanceReportService } from './src/finance/finance-report/finance-report.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const service = app.get(FinanceReportService);
  
  const result = await service.getProfitLossStatement(2026, undefined);
  console.log("PROFIT AFTER TAX ROW:", result.tableData.find(r => r.account === 'PROFIT AFTER TAX'));
  console.log("INCOME TAX ROW:", result.tableData.find(r => r.account === 'Income Tax'));
  console.log("PROFIT BEFORE TAX ROW:", result.tableData.find(r => r.account === 'PROFIT BEFORE TAX'));
  
  await app.close();
}
bootstrap();
