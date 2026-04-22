import { Controller, Get, Post, Body, UseGuards, Query } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { PaginationQueryDto } from '../common/dto/pagination.dto';

@Controller('finance')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('transactions')
  @Permissions('finance.index')
  async getTransactions(@Query() query: PaginationQueryDto) {
    const result = await this.financeService.getTransactions(query);
    if (result.data && result.data.length > 0) {
      const first = result.data[0];
      const last = result.data[result.data.length - 1];
      console.log(`🛠️ [DEBUG API] Order Trace: First Date=${first.colA}, ID=${first.id} | Last Date=${last.colA}, ID=${last.id} | Result Count=${result.data.length}`);
    }
    return result;
  }

  @Get('transactions/all')
  @Permissions('finance.index')
  async getAllTransactions(@Query('name') name?: string) {
    console.log('Fetching transactions for bank:', name);
    return this.financeService.getAllTransactions(name);
  }

  @Get('sales')
  @Permissions('finance.index')
  async getSales(@Query() query: PaginationQueryDto) {
    return this.financeService.getSales(query);
  }

  @Get('sales/all')
  @Permissions('finance.index')
  async getAllSales() {
    console.log('--- DEBUG: Hit getAllSales endpoint ---');
    return this.financeService.getAllSales();
  }

  @Get('ar')
  @Permissions('finance.index')
  async getAR(@Query() query: PaginationQueryDto) {
    return this.financeService.getAR(query);
  }

  @Get('ar/all')
  @Permissions('finance.index')
  async getAllAR() {
    console.log('--- DEBUG: Hit getAllAR endpoint ---');
    return this.financeService.getAllAR();
  }

  @Get('ap')
  @Permissions('finance.index')
  async getAP(@Query() query: PaginationQueryDto) {
    return this.financeService.getAP(query);
  }

  @Get('ap/all')
  @Permissions('finance.index')
  async getAllAP() {
    console.log('--- DEBUG: Hit getAllAP endpoint ---');
    return this.financeService.getAllAP();
  }

  @Get('assets')
  @Permissions('finance.index')
  async getAssets(@Query() query: PaginationQueryDto) {
    return this.financeService.getAssets(query);
  }

  @Get('pl')
  @Permissions('finance.index')
  async getPL(@Query() query: PaginationQueryDto) {
    return this.financeService.getPL(query);
  }

  @Get('pl-costs')
  @Permissions('finance.index')
  async getPLCosts(@Query() query: PaginationQueryDto) {
    return this.financeService.getPLCosts(query);
  }

  @Get('pl-summary')
  @Permissions('finance.index')
  async getPLSummary() {
    return this.financeService.getPLSummary();
  }

  @Get('balance-sheet')

  @Permissions('finance.index')
  async getBalanceSheet(@Query() query: PaginationQueryDto) {
    return this.financeService.getBalanceSheet(query);
  }

  @Get('inter-account-transfers')
  @Permissions('finance.index')
  async getInterAccountTransfers(@Query() query: PaginationQueryDto) {
    return this.financeService.getInterAccountTransfers(query);
  }
  @Post('transactions/bulk')
  @Permissions('finance.index')
  async createBulkTransactions(@Body() data: any[]) {
    return this.financeService.createBulkTransactions(data);
  }
}
