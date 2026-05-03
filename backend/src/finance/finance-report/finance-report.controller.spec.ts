import { Test, TestingModule } from '@nestjs/testing';
import { FinanceReportController } from './finance-report.controller';

describe('FinanceReportController', () => {
  let controller: FinanceReportController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FinanceReportController],
    }).compile();

    controller = module.get<FinanceReportController>(FinanceReportController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
