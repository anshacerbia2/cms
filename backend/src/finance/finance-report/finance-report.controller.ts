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
  async getPLSummary(
    @Query('year') year?: string,
    @Query('date') date?: string
  ) {
    return this.financeService.getPLSummary(
      year ? Number(year) : undefined,
      date
    );
  }

  @Get('pl-statement')
  @Permissions('finance.reports')
  async getPLStatement(
    @Query('year') year?: string,
    @Query('date') date?: string
  ) {
    return this.financeService.getProfitLossStatement(
      year ? Number(year) : undefined,
      date
    );
  }

  @Get('pl-details')
  @Permissions('finance.reports')
  async getPLDetails(
    @Query('year') year?: string,
    @Query('ledger') ledger?: string,
    @Query('date') date?: string
  ) {
    return this.financeService.getPLDetails(
      year ? Number(year) : undefined, 
      ledger,
      date
    );
  }

  @Get('depreciation-details')
  @Permissions('finance.reports')
  async getDepreciationDetails(
    @Query('year') year?: string,
    @Query('date') date?: string
  ) {
    return this.financeService.getDepreciationDetails(
      year ? Number(year) : undefined,
      date
    );
  }

  @Get('sales-cogs-details')
  @Permissions('finance.reports')
  async getSalesCogsDetails(
    @Query('year') year?: string,
    @Query('date') date?: string,
  ) {
    return this.financeService.getSalesCogsDetails(
      year ? Number(year) : undefined,
      date
    );
  }

  @Get('balance-sheet')
  @Permissions('finance.reports')
  async getBalanceSheet() {
    return this.financeService.getBalanceSheet();
  }

  @Get('inter-account-transfers')
  @Permissions('finance.reports')
  async getInterAccountTransfers(@Query() query: PaginationQueryDto) {
    return this.financeService.getInterAccountTransfers(query);
  }
}
