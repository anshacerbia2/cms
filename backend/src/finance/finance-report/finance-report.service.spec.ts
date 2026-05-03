import { Test, TestingModule } from '@nestjs/testing';
import { FinanceReportService } from './finance-report.service';

describe('FinanceReportService', () => {
  let service: FinanceReportService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FinanceReportService],
    }).compile();

    service = module.get<FinanceReportService>(FinanceReportService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
