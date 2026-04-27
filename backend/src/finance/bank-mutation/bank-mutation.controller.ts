import { Controller, Get, Post, Body, UseGuards, Query, ParseIntPipe, Param } from '@nestjs/common';
import { BankMutationService } from './bank-mutation.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

@Controller('bank-mutation')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BankMutationController {
  constructor(private readonly bankMutationService: BankMutationService) {}

  @Get('transactions')
  @Permissions('finance.index')
  async getTransactions(@Query() query: PaginationQueryDto & { accountId?: string, year?: string }) {
    return this.bankMutationService.getTransactions(query);
  }

  @Get('transactions/all')
  @Permissions('finance.index')
  async getAllTransactions(
    @Query('accountId') accountId?: string,
    @Query('year') year?: string
  ) {
    return this.bankMutationService.getAllTransactions(accountId, year ? Number(year) : undefined);
  }

  @Post('transactions/bulk')
  @Permissions('finance.index')
  async createBulkTransactions(@Body() body: { data: any[]; accountId: string; year: number; startingBalance?: string }) {
    return this.bankMutationService.createBulkTransactions(body.data, body.accountId, body.year, body.startingBalance);
  }

  @Get('anchor-balance/:accountId/:year')
  @Permissions('finance.anchor')
  async getAnchorBalance(
    @Param('accountId') accountId: string,
    @Param('year', ParseIntPipe) year: number
  ) {
    return this.bankMutationService.getLatestAnchor(accountId, year);
  }

  @Get('fiscal-periods')
  @Permissions('finance.index')
  async getFiscalPeriods(
    @Query('accountId') accountId: string,
    @Query('year') year?: string
  ) {
    return this.bankMutationService.getFiscalPeriods(accountId, year ? Number(year) : undefined);
  }

  @Post('recalculate')
  @Permissions('finance.recalculate')
  async recalculate(@Body() body: { accountId: string; year: number }) {
    return this.bankMutationService.recalculateLedger(body.accountId, body.year);
  }

  @Post('close-year')
  @Permissions('finance.close-year')
  async closeYear(
    @Body() body: { accountId: string; year: number; userId: string }
  ) {
    return this.bankMutationService.closeYear(body.accountId, body.year, body.userId);
  }
}
