import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { AccountPayableService } from './account-payable.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@Controller('finance/account-payable')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AccountPayableController {
  constructor(private readonly accountPayableService: AccountPayableService) {}

  @Get()
  @Permissions('account-payable.index')
  async getPaginatedAccountPayables(@Query() query: any) {
    return this.accountPayableService.getPaginatedAccountPayables(query);
  }

  @Get('all')
  @Permissions('account-payable.index')
  async getAllAccountPayables(@Query('year') year?: string) {
    return this.accountPayableService.getAllAccountPayables(year ? Number(year) : undefined);
  }

  @Get('tax-ledger')
  @Permissions('account-payable.index')
  async getPaginatedTaxLedger(@Query() query: any) {
    return this.accountPayableService.getPaginatedTaxLedger(query);
  }

  @Get('tax-ledger/all')
  @Permissions('account-payable.index')
  async getAllTaxLedger(@Query() query: any) {
    return this.accountPayableService.getAllTaxLedger(query);
  }

  @Post()
  @Permissions('account-payable.create')
  async createAccountPayable(@Body() data: any) {
    return this.accountPayableService.createAccountPayable(data);
  }

  @Post('tax-ledger')
  @Permissions('account-payable.create')
  async createTaxLedger(@Body() data: any) {
    return this.accountPayableService.createTaxLedger(data);
  }

  @Post('bulk')
  @Permissions('account-payable.bulk')
  async createBulk(@Body() data: any[]) {
    return this.accountPayableService.createBulkAccountPayables(data);
  }

  @Post('tax-ledger/bulk')
  @Permissions('account-payable.bulk')
  async createBulkTax(@Body() data: any[]) {
    return this.accountPayableService.createBulkTaxLedgers(data);
  }
}
