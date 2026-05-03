import { Controller, Get, Post, Body, UseGuards, Query } from '@nestjs/common';
import { FinanceReportService } from './finance-report.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

@Controller('finance')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FinanceReportController {
  constructor(private readonly financeService: FinanceReportService) {}



  // Depreciation endpoints are handled by DepreciationController

  @Get('revenue')
  @Permissions('finance.reports')
  async getRevenue(@Query() query: PaginationQueryDto) {
    return this.financeService.getRevenue(query);
  }

  @Post('revenue/bulk')
  @Permissions('finance.reports')
  async createBulkRevenue(@Body() data: any[]) {
    return this.financeService.createBulkRevenue(data);
  }

  @Get('expenses')
  @Permissions('finance.reports')
  async getExpenses(@Query() query: PaginationQueryDto) {
    return this.financeService.getExpenses(query);
  }

  @Post('expenses/bulk')
  @Permissions('finance.reports')
  async createBulkExpenses(@Body() data: any[]) {
    return this.financeService.createBulkExpenses(data);
  }

  @Get('pl-summary')
  @Permissions('finance.reports')
  async getPLSummary() {
    return this.financeService.getPLSummary();
  }

  @Get('balance-sheet')
  @Permissions('finance.reports')
  async getBalanceSheet(@Query() query: PaginationQueryDto) {
    return this.financeService.getBalanceSheet(query);
  }

  @Get('inter-account-transfers')
  @Permissions('finance.reports')
  async getInterAccountTransfers(@Query() query: PaginationQueryDto) {
    return this.financeService.getInterAccountTransfers(query);
  }
}
